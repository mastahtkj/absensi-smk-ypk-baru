import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(req) {
  try {
    const body = await req.json();
    const { rfid_uid, nama, kelas, status, waktu } = body;

    // 1. Cari Nomor WhatsApp Penerima dari Tabel Siswa atau Guru
    let phoneNo = null;
    const { data: siswa } = await supabase
      .from('rfid_cards')
      .select('no_wa_ortu')
      .eq('rfid_uid', rfid_uid)
      .maybeSingle();

    if (siswa?.no_wa_ortu) {
      phoneNo = siswa.no_wa_ortu;
    } else {
      const { data: guru } = await supabase
        .from('guru')
        .select('no_wa')
        .eq('rfid_uid', rfid_uid)
        .maybeSingle();
      if (guru?.no_wa) phoneNo = guru.no_wa;
    }

    if (!phoneNo) {
      return NextResponse.json({ success: false, message: 'Nomor WA tidak ditemukan' });
    }

    // 2. Format Pesan WhatsApp
    const message = `*PRESENSI DIGITAL SMK YPK MEDAN*\n\n` +
      `Nama: *${nama}*\n` +
      `Kelas/Jabatan: *${kelas}*\n` +
      `Status: *${status}*\n` +
      `Waktu: ${waktu} WIB\n\n` +
      `_Pesan ini dikirim otomatis oleh sistem presensi IoT._`;

    // 3. Kirim via Kirimi.id API
    const response = await fetch('https://api.kirimi.id/v1/send-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.KIRIMI_ID_API_KEY}`
      },
      body: JSON.stringify({
        to: phoneNo,
        message: message
      })
    });

    const resData = await response.json();

    // 4. Update flag wa_sent di Supabase
    await supabase
      .from('absensi')
      .update({ wa_sent: true })
      .eq('rfid_uid', rfid_uid)
      .order('created_at', { ascending: false })
      .limit(1);

    return NextResponse.json({ success: true, data: resData });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
