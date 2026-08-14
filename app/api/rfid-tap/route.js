import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Paksa Next.js agar API tidak di-cache (selalu dinamis)
export const dynamic = 'force-dynamic';

// --- CONFIG SUPABASE ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// --- CONFIG KIRIMI.ID (Diambil dari screenshot kamu) ---
const KIRIMI_USER_CODE = process.env.KIRIMI_USER_CODE || 'KMQZ4Y0826';
const KIRIMI_SECRET_KEY = process.env.KIRIMI_SECRET_KEY || '0a2eae1b7a76fb9709f691fa0ebcff536c86aa1b3247f45eee8ab05e53aae3b1';

// Helper Function untuk Kirim WA via Kirimi.id
async function sendKirimiWA(phone, message) {
  if (!phone) return null;

  // Format nomor hp ke standar 628xxx
  let formattedPhone = phone.replace(/[^0-9]/g, '');
  if (formattedPhone.startsWith('0')) {
    formattedPhone = '62' + formattedPhone.slice(1);
  }

  try {
    const res = await fetch('https://dash.kirimi.id/api/v1/send-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'user-code': KIRIMI_USER_CODE,
        'secret-key': KIRIMI_SECRET_KEY,
      },
      body: JSON.stringify({
        phone: formattedPhone,
        message: message,
      }),
    });

    const data = await res.json();
    return data;
  } catch (err) {
    console.error('❌ Gagal Kirim WA via Kirimi.id:', err.message);
    return null;
  }
}

// ==========================================
// MAIN HANDLER METHOD POST
// ==========================================
export async function POST(request) {
  try {
    // 1. Validasi Supabase Config
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Environment variables Supabase belum terpasang!');
      return NextResponse.json({ error: 'Server Config Error' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // 2. Baca Body JSON dari Request (Bisa dari Arduino ATAU dari Web Admin Iqbal)
    const body = await request.json();
    const { rfid_uid, status, action, target, message } = body;

    // A. FITUR KHUSUS: Kirim WA Manual/Test dari Frontend Dashboard
    if (action === 'SEND_WA_ONLY') {
      if (!target || !message) {
        return NextResponse.json({ error: 'Target dan Message wajib diisi!' }, { status: 400 });
      }
      const waResult = await sendKirimiWA(target, message);
      return NextResponse.json({ success: true, wa_result: waResult }, { status: 200 });
    }

    // B. FITUR ABSENSI RFID (TAP RFID DARI ARDUINO / SIMULASI)
    if (!rfid_uid) {
      return NextResponse.json({ error: 'rfid_uid wajib diisi!' }, { status: 400 });
    }

    const cleanUid = rfid_uid.toUpperCase().trim();
    const statusAbsen = status || 'Hadir';

    // 3. Cek Kartu Siswa di Tabel `rfid_cards`
    const { data: siswa } = await supabase
      .from('rfid_cards')
      .select('*')
      .eq('card_uid', cleanUid)
      .maybeSingle();

    let isNewCard = false;
    let namaSiswa = cleanUid;
    let nomorHpSiswa = null;

    if (!siswa) {
      // Jika kartu belum terdaftar, otomatis daftarkan kartu baru
      isNewCard = true;
      namaSiswa = `Siswa Baru (${cleanUid})`;
      await supabase.from('rfid_cards').insert([
        {
          card_uid: cleanUid,
          name: namaSiswa,
          class_name: 'Belum Diatur',
        },
      ]);
    } else {
      namaSiswa = siswa.name;
      nomorHpSiswa = siswa.phone; // Ambil nomor WA dari database siswa
    }

    // 4. Catat Log ke Tabel `absensi`
    const { data: newLog, error: errLog } = await supabase
      .from('absensi')
      .insert([
        {
          rfid_uid: cleanUid,
          status: statusAbsen,
          pengubah: 'Mesin RFID Iqbal',
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (errLog) {
      console.error('Error insert log absensi:', errLog.message);
      return NextResponse.json({ error: errLog.message }, { status: 500 });
    }

    // 5. Otomatis Kirim WA ke Orang Tua/Siswa (Jika nomor HP terdaftar)
    let waResponse = null;
    if (nomorHpSiswa) {
      const jamFormat = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      const pesanWA = `[NOTIFIKASI ABSENSI]\nSiswa a.n *${namaSiswa}* telah melakukan absensi status: *${statusAbsen.toUpperCase()}* pada pukul ${jamFormat} WIB.`;
      
      waResponse = await sendKirimiWA(nomorHpSiswa, pesanWA);
    }

    // 6. Respon HTTP 200 ke ESP8266 / Web
    return NextResponse.json(
      {
        success: true,
        message: 'Absensi berhasil dicatat!',
        is_new_card: isNewCard,
        data: newLog,
        wa_status: waResponse,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('API Error:', error.message);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
