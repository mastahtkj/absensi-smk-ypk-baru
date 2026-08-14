import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// =======================================================
// KONFIGURASI KIRIMI.ID
// =======================================================
const KIRIMI_SECRET = '0a2eae1b7a76fb9709f691fa0ebcff536c86aa1b3247f45eee8ab05e53aae3b1';
const KIRIMI_DEVICE_ID = 'D-H7IJQ';
const FALLBACK_PHONE = '6285188467407'; 

export async function POST(request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase Key belum terpasang di Vercel' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const body = await request.json();
    const { rfid_uid, status = 'Hadir' } = body;

    if (!rfid_uid) {
      return NextResponse.json({ error: 'RFID UID tidak ditemukan' }, { status: 400 });
    }

    // =======================================================
    // 1. CEK APAPAKAH KARTU SUDAH TERDAFTAR SEBAGAI GURU
    // =======================================================
    const { data: guruData } = await supabase
      .from('guru')
      .select('*')
      .eq('rfid_uid', rfid_uid)
      .maybeSingle();

    if (guruData) {
      // Simpan absensi guru
      await supabase
        .from('absensi')
        .insert([{ nama: guruData.nama, kelas: 'GURU', rfid_uid, status }]);

      return NextResponse.json({
        success: true,
        is_guru: true,
        message: `Absensi Guru Berhasil! Selamat Datang, ${guruData.nama}`
      }, { status: 200 });
    }

    // =======================================================
    // 2. CEK APAKAH KARTU SUDAH TERDAFTAR SEBAGAI SISWA
    // =======================================================
    const { data: siswaData } = await supabase
      .from('rfid_cards')
      .select('*')
      .eq('uid', rfid_uid)
      .maybeSingle();

    if (siswaData) {
      const namaSiswa = siswaData.nama || 'Siswa';
      const kelasSiswa = siswaData.kelas || '-';
      let targetPhone = FALLBACK_PHONE;

      const rawPhone = siswaData.no_wa || siswaData.telepon || siswaData.no_hp;
      if (rawPhone) {
        let cleaned = String(rawPhone).replace(/[^0-9]/g, '');
        if (cleaned.startsWith('0')) cleaned = '62' + cleaned.substring(1);
        targetPhone = cleaned;
      }

      await supabase
        .from('absensi')
        .insert([{ nama: namaSiswa, kelas: kelasSiswa, rfid_uid, status }]);

      const waktuWIB = new Date().toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        dateStyle: 'full',
        timeStyle: 'medium'
      });

      const pesanWa = `*PEMBERITAHUAN PRESENSI SISWA*\n` +
                      `*SMK YPK MEDAN*\n` +
                      `----------------------------------------\n` +
                      `Yth. Bpk/Ibu Orang Tua dari:\n` +
                      `Nama   : *${namaSiswa}*\n` +
                      `Kelas  : *${kelasSiswa}*\n` +
                      `Status : *${status}*\n` +
                      `Waktu  : *${waktuWIB} WIB*\n` +
                      `----------------------------------------\n` +
                      `_Pesan otomatis via Sistem Absensi Digital SMK YPK Medan._`;

      const responseKirimi = await fetch('https://kirimi.id/api/v2/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${KIRIMI_SECRET}`,
        },
        body: JSON.stringify({
          device_id: KIRIMI_DEVICE_ID,
          phone: targetPhone,
          message: pesanWa
        }),
      });

      const resultKirimi = await responseKirimi.json();

      return NextResponse.json({
        success: true,
        is_guru: false,
        message: "Absensi tersimpan & WA terkirim",
        target_wa: targetPhone,
        kirimi_response: resultKirimi
      }, { status: 200 });
    }

    // =======================================================
    // 3. JIKA KARTU BARU (BELUM ADA DI GURU / SISWA)
    // =======================================================
    // A. Cari guru berurut dari No. 1 - 29 yang 'rfid_uid'-nya masih KOSONG
    const { data: guruKosong } = await supabase
      .from('guru')
      .select('*')
      .is('rfid_uid', null)
      .order('id', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (guruKosong) {
      // Pasangkan RFID UID ke guru tersebut secara otomatis!
      await supabase
        .from('guru')
        .update({ rfid_uid: rfid_uid })
        .eq('id', guruKosong.id);

      return NextResponse.json({
        success: true,
        is_guru: true,
        is_new_card: true,
        message: `Kartu Terhubung ke Guru No. ${guruKosong.id}: ${guruKosong.nama}`,
        guru: guruKosong
      }, { status: 200 });
    }

    // B. Jika ke-29 Guru SUDAH punya kartu, simpan ke tabel siswa (rfid_cards)
    const { data: kartuSiswaBaru } = await supabase
      .from('rfid_cards')
      .insert([{ 
        uid: rfid_uid, 
        nama: 'BELUM DIISI', 
        kelas: 'BELUM DIISI' 
      }])
      .select()
      .single();

    return NextResponse.json({
      success: true,
      is_guru: false,
      is_new_card: true,
      message: `Kartu Siswa Baru (UID: ${rfid_uid}) Otomatis Terdaftar di Supabase!`,
      data: kartuSiswaBaru
    }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
