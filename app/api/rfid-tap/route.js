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

    // 1. CARI KARTU DI DATABASE SUPABASE
    const { data: siswa } = await supabase
      .from('rfid_cards')
      .select('*')
      .eq('uid', rfid_uid)
      .maybeSingle();

    // 2. JIKA KARTU BELUM TERDAFTAR -> AUTO-REGISTER KE rfid_cards
    if (!siswa) {
      const { data: kartuBaru, error: insertError } = await supabase
        .from('rfid_cards')
        .insert([{ 
          uid: rfid_uid, 
          nama: 'BELUM DIISI', 
          kelas: 'BELUM DIISI' 
        }])
        .select()
        .single();

      if (insertError) {
        return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
      }

      console.log(`[AUTO-REGISTER] Kartu Baru Terdaftar! UID: ${rfid_uid}`);

      return NextResponse.json({
        success: true,
        is_new_card: true,
        message: `Kartu Baru (UID: ${rfid_uid}) Otomatis Terdaftar di Supabase! Silakan lengkapi data Nama & Kelas.`,
        data: kartuBaru
      }, { status: 200 });
    }

    // 3. JIKA KARTU SUDAH TERDAFTAR -> PROSES ABSENSI & WA
    const namaSiswa = siswa.nama || 'Siswa';
    const kelasSiswa = siswa.kelas || '-';
    let targetPhone = FALLBACK_PHONE;

    const rawPhone = siswa.no_wa || siswa.telepon || siswa.no_hp;
    if (rawPhone) {
      let cleaned = String(rawPhone).replace(/[^0-9]/g, '');
      if (cleaned.startsWith('0')) {
        cleaned = '62' + cleaned.substring(1);
      }
      targetPhone = cleaned;
    }

    // Simpan Histori Absensi
    await supabase
      .from('absensi')
      .insert([{ nama: namaSiswa, kelas: kelasSiswa, rfid_uid, status }]);

    // Buat & Kirim Pesan WhatsApp
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
      is_new_card: false,
      message: "Absensi tersimpan & WA terkirim",
      target_wa: targetPhone,
      kirimi_response: resultKirimi
    }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
