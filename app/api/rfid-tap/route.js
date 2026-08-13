import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// ==========================================
// KREDENSIAL API KIRIMI.ID (Sesuai Gambar)
// ==========================================
const KIRIMI_USER_CODE = 'KMQZ4Y0826';
const KIRIMI_SECRET    = '0a2eae1b7a76fb9709f691fa0ebcff536c86aa1b3247f45eee8ab05e53aae3b1'; // Isikan Secret dari Dashboard Kirimi
const KIRIMI_DEVICE_ID = 'D-H7IJQ'; // Device ID dari gambar Anda (D-H7IJQ — absensi)

// Target Nomor HP Tujuan (Gunakan format 628xxx)
const TARGET_PHONE     = '6285183163010'; // Ganti dengan nomor WA tujuan / testing

export async function POST(request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase Key belum terpasang di Vercel' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const body = await request.json();
    const { nama, kelas, rfid_uid, status } = body;

    // 1. Simpan Data Absensi ke Supabase
    const { data, error } = await supabase
      .from('absensi')
      .insert([{ nama, kelas, rfid_uid, status }]);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // 2. Format Pesan WhatsApp
    const sekarang = new Date();
    const waktuWIB = sekarang.toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      dateStyle: 'full',
      timeStyle: 'medium'
    });

    const pesanWA = `*ABSENSI DIGITAL SMK YPK MEDAN*\n` +
                    `----------------------------------------\n` +
                    `Nama   : *${nama}*\n` +
                    `Kelas  : *${kelas}*\n` +
                    `Status : *${status}*\n` +
                    `Waktu  : *${waktuWIB} WIB*\n` +
                    `----------------------------------------\n` +
                    `_Pesan Otomatis Server Kirimi.id Absensi YPK_`;

    // 3. Kirim Pesan ke API Kirimi.id
    try {
      const payloadKirimi = {
        user_code: KIRIMI_USER_CODE,
        secret: KIRIMI_SECRET,
        device_id: KIRIMI_DEVICE_ID,
        phone_number: TARGET_PHONE, // atau 'to'
        message: pesanWA
      };

      const kirimiRes = await fetch('https://api.kirimi.id/v1/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payloadKirimi)
      });

      const kirimiResult = await kirimiRes.json();
      console.log('Kirimi.id Result:', kirimiResult);
    } catch (waErr) {
      console.error('Gagal Kirim Kirimi.id WA:', waErr.message);
    }

    return NextResponse.json({ success: true, data }, { status: 200 });

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
