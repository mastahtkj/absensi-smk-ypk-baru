import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// ==========================================
// KONFIGURASI FONNTE
// ==========================================
const FONNTE_TOKEN = 'wFizUtSUvtscbn4fpb7Y'; // Token Fonnte Anda

// CATATAN TARGET:
// Karena Fonnte Anda paket FREE, gunakan NOMOR HP PERORANGAN (diawali 62).
// Jangan gunakan ID Grup (@g.us) karena Fonnte Free menolak pengiriman ke grup.
const TARGET_WA = '6281234567890'; // <-- GANTI DENGAN NOMOR HP TUJUAN ANDA

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

    // 1. SIMPAN DATA ABSENSI KE SUPABASE
    const { data, error } = await supabase
      .from('absensi')
      .insert([{ nama, kelas, rfid_uid, status }]);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // 2. KIRIM NOTIFIKASI WHATSAPP VIA FONNTE
    try {
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
                      `_Pesan Otomatis Server Absensi SMK YPK_`;

      const formData = new URLSearchParams();
      formData.append('target', TARGET_WA);
      formData.append('message', pesanWA);

      await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: {
          'Authorization': FONNTE_TOKEN,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData
      });
    } catch (waErr) {
      console.error('Gagal mengirim WhatsApp Fonnte:', waErr.message);
    }

    return NextResponse.json({ success: true, data }, { status: 200 });

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
