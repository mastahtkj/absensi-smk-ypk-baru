import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Paksa Next.js agar API tidak di-cache (selalu dinamis)
export const dynamic = 'force-dynamic';

// --- CONFIG SUPABASE ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// --- CONFIG KIRIMI.ID ---
const KIRIMI_USER_CODE = process.env.KIRIMI_USER_CODE || 'KMQZ4Y0826';
const KIRIMI_SECRET_KEY = process.env.KIRIMI_SECRET_KEY || '0a2eae1b7a76fb9709f691fa0ebcff536c86aa1b3247f45eee8ab05e53aae3b1';

// Helper Function Kirim WA via Kirimi.id
async function sendKirimiWA(phone, message) {
  if (!phone) return null;

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

    return await res.json();
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
      return NextResponse.json({ error: 'Server Config Error: URL/Key Supabase Kosong' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // 2. Baca Body JSON dari Request
    const body = await request.json().catch(() => ({}));
    const { rfid_uid, status, action, target, message } = body;

    // A. FITUR KHUSUS: Kirim WA Manual/Test dari Web Dashboard
    if (action === 'SEND_WA_ONLY') {
      if (!target || !message) {
        return NextResponse.json({ error: 'Target dan Message wajib diisi!' }, { status: 400 });
      }
      const waResult = await sendKirimiWA(target, message);
      return NextResponse.json({ success: true, wa_result: waResult }, { status: 200 });
    }

    // B. FITUR ABSENSI RFID (DARI ARDUINO / ESP8266)
    if (!rfid_uid) {
      return NextResponse.json({ error: 'rfid_uid wajib diisi!' }, { status: 400 });
    }

    const cleanUid = String(rfid_uid).toUpperCase().trim();
    const statusAbsen = status || 'Hadir';

    // 3. Cek Kartu Siswa di Tabel `rfid_cards` (Menggunakan kolom 'uid')
    const { data: siswa, error: errCekSiswa } = await supabase
      .from('rfid_cards')
      .select('*')
      .eq('uid', cleanUid) // ✅ Diset ke kolom 'uid' sesuai screenshot
      .maybeSingle();

    if (errCekSiswa) {
      console.error('Error Cek Siswa:', errCekSiswa.message);
    }

    let isNewCard = false;
    let namaSiswa = cleanUid;
    let kelasSiswa = 'Belum Diatur';
    let nomorHpSiswa = null;

    if (!siswa) {
      // Jika kartu belum terdaftar, otomatis daftarkan kartu baru
      isNewCard = true;
      namaSiswa = `Siswa Baru (${cleanUid})`;
      
      const { error: errInsertCard } = await supabase.from('rfid_cards').insert([
        {
          uid: cleanUid,        // ✅ Menggunakan kolom 'uid'
          nama: namaSiswa,      // ✅ Menggunakan kolom 'nama'
          kelas: kelasSiswa,    // ✅ Menggunakan kolom 'kelas'
        },
      ]);

      if (errInsertCard) {
        console.error('Error Insert rfid_cards:', errInsertCard.message);
      }
    } else {
      namaSiswa = siswa.nama || cleanUid;
      kelasSiswa = siswa.kelas || 'Belum Diatur';
      nomorHpSiswa = siswa.no_wa || null; // ✅ Membaca nomor WA dari kolom 'no_wa'
    }

    // 4. Catat Log ke Tabel `absensi`
    const { data: newLog, error: errLog } = await supabase
      .from('absensi')
      .insert([
        {
          rfid_uid: cleanUid,
          nama: namaSiswa,
          kelas: kelasSiswa,
          status: statusAbsen,
        },
      ])
      .select();

    if (errLog) {
      console.error('Error insert log absensi:', errLog.message);
      return NextResponse.json(
        { error: 'Gagal Simpan Absensi', details: errLog.message },
        { status: 500 }
      );
    }

    // 5. Kirim WA secara Background Async (Tanpa await agar ESP8266 tidak Timeout)
    if (nomorHpSiswa) {
      const jamFormat = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      const pesanWA = `[NOTIFIKASI ABSENSI SMK YPK]\nSiswa a.n *${namaSiswa}* (${kelasSiswa}) telah melakukan absensi status: *${statusAbsen.toUpperCase()}* pada pukul ${jamFormat} WIB.`;
      
      sendKirimiWA(nomorHpSiswa, pesanWA).catch((err) =>
        console.error('Background WA Error:', err)
      );
    }

    // 6. Respon Berhasil 200 OK ke ESP8266
    return NextResponse.json(
      {
        success: true,
        message: 'Absensi berhasil dicatat!',
        is_new_card: isNewCard,
        data: newLog ? newLog[0] : null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('API Crash Error:', error.message);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
