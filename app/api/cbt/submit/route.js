import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      examId,
      studentId,
      studentName,
      studentKelas,
      studentJurusan,
      answers = {},
      violationCount = 0,
      violationLogs = [],
    } = body || {};

    if (!examId || !studentName) {
      return NextResponse.json(
        { success: false, message: 'ID Ujian dan Nama Siswa wajib diisi.' },
        { status: 400 }
      );
    }

    const numericExamId = typeof examId === 'number'
      ? examId
      : parseInt(String(examId).replace(/\D/g, ''), 10);

    // 1. Ambil daftar butir soal resmi beserta kunci jawaban dari database server
    let questions = [];
    if (supabaseServer && numericExamId) {
      const { data, error } = await supabaseServer
        .from('tb_soal_ujian')
        .select('*')
        .eq('id_ujian', numericExamId)
        .order('nomor_soal', { ascending: true });

      if (!error && Array.isArray(data) && data.length > 0) {
        questions = data;
      }
    }

    // 2. Koreksi & Penghitungan Skor Pilihan Ganda (PG) di Sisi Server
    let correctPgCount = 0;
    let totalPgScore = 0;
    let totalMaxPgScore = 0;
    let totalPgQuestions = 0;
    let totalEssayQuestions = 0;
    let answeredEssayCount = 0;

    const answerRecords = [];

    questions.forEach((q) => {
      const num = q.nomor_soal || q.nomor_urut;
      const qType = String(q.tipe_soal || 'PG').toUpperCase();
      const studentAns = String(answers[num] || answers[String(num)] || '').trim();

      if (qType === 'PG' || qType === 'PILIHAN_GANDA') {
        totalPgQuestions++;
        const weight = Number(q.bobot_poin) || 2;
        totalMaxPgScore += weight;

        const officialKey = String(q.kunci_jawaban || '').trim().toUpperCase();
        const cleanStudentAns = studentAns.toUpperCase();

        const isCorrect = Boolean(officialKey && cleanStudentAns === officialKey);
        if (isCorrect) {
          correctPgCount++;
          totalPgScore += weight;
        }

        answerRecords.push({
          id_ujian: numericExamId,
          id_siswa: studentId || null,
          nama_siswa: studentName,
          kelas: studentKelas || '-',
          jurusan: studentJurusan || '-',
          nomor_soal: num,
          tipe_soal: 'PG',
          jawaban_siswa: cleanStudentAns,
          is_benar: isCorrect,
          poin_diperoleh: isCorrect ? weight : 0,
          updated_at: new Date().toISOString(),
        });
      } else {
        totalEssayQuestions++;
        if (studentAns.length > 0) answeredEssayCount++;

        answerRecords.push({
          id_ujian: numericExamId,
          id_siswa: studentId || null,
          nama_siswa: studentName,
          kelas: studentKelas || '-',
          jurusan: studentJurusan || '-',
          nomor_soal: num,
          tipe_soal: 'Essay',
          jawaban_siswa: studentAns,
          is_benar: null, // Menunggu koreksi guru
          poin_diperoleh: 0,
          updated_at: new Date().toISOString(),
        });
      }
    });

    // 3. Simpan Jawaban Siswa ke Database Supabase
    if (supabaseServer && answerRecords.length > 0) {
      try {
        await supabaseServer.from('tb_jawaban_siswa').upsert(answerRecords, {
          onConflict: 'id_ujian,nama_siswa,nomor_soal',
        });
      } catch (errSaveAnswers) {
        console.warn('Gagal menyimpan detail tb_jawaban_siswa:', errSaveAnswers?.message);
      }
    }

    // 4. Simpan Nilai Akhir & Log Pelanggaran ke tb_nilai_ujian
    const submissionId = `SUB-${Date.now()}`;
    const resultSummary = {
      id: submissionId,
      id_ujian: numericExamId,
      id_siswa: studentId || null,
      nama_siswa: studentName,
      kelas: studentKelas || '-',
      jurusan: studentJurusan || '-',
      nilai_pg: totalPgScore,
      total_max_pg: totalMaxPgScore || 60,
      correct_pg: correctPgCount,
      total_pg: totalPgQuestions || 30,
      essay_answered: answeredEssayCount,
      total_essay: totalEssayQuestions || 5,
      skor_akhir: totalPgScore, // Nilai PG sementara, akan bertambah saat guru menilai essay
      total_pelanggaran: Number(violationCount) || 0,
      log_pelanggaran: Array.isArray(violationLogs) ? violationLogs : [],
      status_ujian_siswa: 'Selesai',
      waktu_selesai: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    if (supabaseServer && numericExamId) {
      try {
        await supabaseServer.from('tb_nilai_ujian').upsert(
          {
            id_ujian: numericExamId,
            id_siswa: studentId || null,
            nama_siswa: studentName,
            kelas: studentKelas || '-',
            jurusan: studentJurusan || '-',
            skor_akhir: totalPgScore,
            status_ujian_siswa: 'Selesai',
            total_pelanggaran: Number(violationCount) || 0,
            log_pelanggaran: Array.isArray(violationLogs) ? violationLogs : [],
            catatan_guru: `Terselesaikan pada ${new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB. PG: ${correctPgCount}/${totalPgQuestions}.`,
            created_at: new Date().toISOString(),
          },
          { onConflict: 'id_ujian,nama_siswa' }
        );
      } catch (errSaveScore) {
        console.warn('Gagal menyimpan tb_nilai_ujian:', errSaveScore?.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Ujian berhasil dikoreksi dan dikumpulkan secara aman di server.',
      result: resultSummary,
    });
  } catch (error) {
    console.error('CBT submit error:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Terjadi kesalahan sistem saat memproses ujian.' },
      { status: 500 }
    );
  }
}
