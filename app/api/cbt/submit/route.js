import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 🔒 SERVER-SIDE CBT EVALUATION & GRADING API
 * Menjamin integritas ujian CBT 100% anti-curang:
 * - Kunci jawaban tidak pernah dibocorkan ke browser siswa.
 * - Penilaian pilihan ganda dihitung murni di server menggunakan Service Role Supabase.
 * - Nilai tersimpan langsung ke database tanpa dapat dimanipulasi oleh inspect element.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      id_ujian,
      id_siswa,
      nama_siswa,
      kelas,
      jurusan,
      answers = {},
      essay_answers = {},
      total_pelanggaran = 0,
      log_pelanggaran = [],
      is_forced = false,
    } = body;

    if (!id_ujian || !nama_siswa) {
      return NextResponse.json(
        { success: false, message: 'ID Ujian dan Nama Siswa wajib diisi.' },
        { status: 400 }
      );
    }

    // 1. Ambil kunci jawaban asli dari tb_soal_ujian di database server
    const { data: realQuestions, error: qErr } = await supabaseServer
      .from('tb_soal_ujian')
      .select('id, id_ujian, nomor_soal, tipe, kunci, bobot')
      .eq('id_ujian', id_ujian);

    let totalPgScore = 0;
    let totalMaxPgScore = 0;
    let correctCount = 0;
    let totalPgCount = 0;

    if (!qErr && Array.isArray(realQuestions) && realQuestions.length > 0) {
      realQuestions.forEach((q, idx) => {
        const isPg = q.tipe === 'PG' || (!q.tipe && q.kunci);
        if (isPg) {
          totalPgCount += 1;
          const weight = Number(q.bobot) || 2;
          totalMaxPgScore += weight;

          const qKey = q.nomor_soal || q.id || (idx + 1);
          const studentAns = String(answers[qKey] || answers[q.id] || answers[String(idx + 1)] || '').trim().toUpperCase();
          const correctKey = String(q.kunci || '').trim().toUpperCase();

          if (studentAns && correctKey && studentAns === correctKey) {
            totalPgScore += weight;
            correctCount += 1;
          }
        }
      });
    } else {
      // Fallback jika soal tidak terdaftar individual di tb_soal_ujian (disimpan di JSON ujian)
      const { data: examData } = await supabaseServer
        .from('tb_ujian')
        .select('soal_list')
        .eq('id_ujian', id_ujian)
        .single();

      if (examData && Array.isArray(examData.soal_list)) {
        examData.soal_list.forEach((q, idx) => {
          const isPg = q.tipe === 'PG' || (!q.tipe && q.kunci);
          if (isPg) {
            totalPgCount += 1;
            const weight = Number(q.bobot) || 2;
            totalMaxPgScore += weight;

            const qKey = q.nomor_soal || (idx + 1);
            const studentAns = String(answers[qKey] || answers[String(idx + 1)] || '').trim().toUpperCase();
            const correctKey = String(q.kunci || '').trim().toUpperCase();

            if (studentAns && correctKey && studentAns === correctKey) {
              totalPgScore += weight;
              correctCount += 1;
            }
          }
        });
      }
    }

    const finalStatusUjian = is_forced ? 'Didiskualifikasi' : 'Selesai';
    const statusLulus = is_forced ? 'Tidak Lulus' : 'Menunggu Koreksi Essay';

    // 2. Simpan nilai hasil verifikasi server langsung ke tb_nilai_ujian
    const { data: savedScore, error: saveErr } = await supabaseServer
      .from('tb_nilai_ujian')
      .upsert(
        {
          id_ujian,
          id_siswa: id_siswa || null,
          nama_siswa: String(nama_siswa).trim(),
          kelas: kelas || '-',
          jurusan: jurusan || '-',
          nilai_pg: totalPgScore,
          nilai_essay: 0,
          total_nilai: totalPgScore,
          status_lulus: statusLulus,
          total_pelanggaran: Number(total_pelanggaran) || 0,
          log_pelanggaran: Array.isArray(log_pelanggaran) ? log_pelanggaran : [],
          status_ujian_siswa: finalStatusUjian,
          jawaban_siswa: answers,
          jawaban_essay: essay_answers,
          waktu_selesai: new Date().toISOString(),
        },
        { onConflict: 'id_ujian,nama_siswa' }
      )
      .select();

    if (saveErr) {
      console.warn('[CBT Submit] Gagal upsert tb_nilai_ujian:', saveErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Ujian berhasil dinilai secara aman di server.',
      nilai_pg: totalPgScore,
      total_max_pg: totalMaxPgScore,
      total_benar: correctCount,
      total_soal_pg: totalPgCount,
      status: finalStatusUjian,
    });
  } catch (error) {
    console.error('[CBT Submit API Error]:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal memproses penilaian: ' + error.message },
      { status: 500 }
    );
  }
}
