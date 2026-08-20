import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { processWAAttendance } from '@/lib/whatsapp';

// Inisialisasi Supabase Client (Server-side)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req) {
  try {
    const { uid_rfid, status } = await req.json();

    if (!uid_rfid) {
      return NextResponse.json(
        { success: false, message: 'UID RFID tidak boleh kosong' },
        { status: 400 }
      );
    }

    const cleanUid = String(uid_rfid).trim().toUpperCase();
    const finalStatus = status || 'Hadir';

    // 1. Cari data pemilik RFID (Cek di tb_siswa dahulu, lalu tb_guru)
    let namaUser = 'Tidak Diketahui';
    let kelasUser = '-';

    const { data: siswa } = await supabase
      .from('tb_siswa')
      .select('nama_siswa, kelas')
      .eq('uid_rfid', cleanUid)
      .maybeSingle();

    if (siswa) {
      namaUser = siswa.nama_siswa;
      kelasUser = siswa.kelas;
    } else {
      const { data: guru } = await supabase
        .from('tb_guru')
        .select('nama_guru, role')
        .eq('uid_rfid', cleanUid)
        .maybeSingle();

      if (guru) {
        namaUser = guru.nama_guru;
        kelasUser = guru.role || 'Guru / Staff';
      }
    }

    // 2. Simpan Log Presensi ke Tabel 'absensi'
    const { data: logInserted, error: insertError } = await supabase
      .from('absensi')
      .insert([
        {
          rfid_uid: cleanUid,
          nama: namaUser,
          kelas: kelasUser,
          status: finalStatus,
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (insertError) {
      console.error('Gagal menyimpan log presensi:', insertError);
      return NextResponse.json(
        { success: false, message: 'Gagal menyimpan log presensi ke database' },
        { status: 500 }
      );
    }

    // 3. Update Tabel 'latest_scan' untuk memicu polling/registrasi cepat di Frontend
    await supabase
      .from('latest_scan')
      .upsert({ id: 1, uid: cleanUid, updated_at: new Date().toISOString() });

    // 4. PANGGIL HELPER WHATSAPP AUTOMATION
    // Helper ini akan mencari nomor WA target & orang tua lalu mengirim pesan notifikasi
    let waResult = null;
    try {
      waResult = await processWAAttendance(cleanUid, finalStatus);
    } catch (waError) {
      console.error('Error saat memproses notifikasi WhatsApp:', waError);
    }

    // 5. Kembalikan Response
    return NextResponse.json({
      success: true,
      message: 'Presensi RFID Berhasil Terproses',
      data: logInserted,
      waStatus: waResult
    });

  } catch (err) {
    console.error('Internal Error RFID Tap Route:', err);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan internal pada server', error: err.message },
      { status: 500 }
    );
  }
}
