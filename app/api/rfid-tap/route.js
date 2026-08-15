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

    let isNewCard = false;
    let namaUser = '';
    let kelasUser = '';
    let nomorHpUser = null;
    let isExemptFromTimeLimit = false; // Tanpa batas waktu presensi

    // 3. STEP 1: Cek di Tabel Siswa (`rfid_cards`)
    const { data: siswa } = await supabase
      .from('rfid_cards')
      .select('*')
      .eq('uid', cleanUid)
      .maybeSingle();

    if (siswa) {
      // Data Ditemukan di Tabel Siswa
      namaUser = siswa.nama || cleanUid;
      kelasUser = siswa.kelas || 'Siswa';
      nomorHpUser = siswa.no_wa || null;
      
      // Jika terdaftar sebagai MASTER'K di tabel siswa
      if (siswa.kelas && siswa.kelas.toUpperCase().includes('MASTER')) {
        isExemptFromTimeLimit = true;
      }
    } else {
      // 4. STEP 2: Jika bukan Siswa, Cek di Tabel Guru (`guru`)
      const { data: guru } = await supabase
        .from('guru')
        .select('*')
        .eq('rfid_uid', cleanUid)
        .maybeSingle();

      if (guru) {
        // Data Ditemukan di Tabel Guru / Staff / Master
        namaUser = guru.nama || `Guru (${guru.username})`;
        kelasUser = guru.role === 'admin' ? 'MASTER\'K' : 'GURU / STAFF';
        nomorHpUser = null;
        isExemptFromTimeLimit = true; // Guru & Master Admin bebas batas waktu
      } else {
        // 5. STEP 3: Jika TIDAK ADA di Siswa maupun Guru, Daftarkan Kartu Baru!
        isNewCard = true;
        namaUser = `Siswa Baru (${cleanUid})`;
        kelasUser = 'Belum Diatur';

        await supabase.from('rfid_cards').insert([
          {
            uid: cleanUid,
            nama: namaUser,
            kelas: kelasUser,
          },
        ]);
      }
    }

    // --- LOGIKA BATAS WAKTU ABSENSI ---
    let finalStatus = status || 'Hadir';

    // Pengecekan jam HANYA untuk Siswa biasa (Bukan Guru & Bukan MASTER'K)
    if (!isExemptFromTimeLimit) {
      const now = new Date();
      const jamSekarang = parseInt(now.toLocaleTimeString('id-ID', { hour: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' }), 10);
      const menitSekarang = parseInt(now.toLocaleTimeString('id-ID', { minute: '2-digit', timeZone: 'Asia/Jakarta' }), 10);

      const BATAS_JAM = 7;
      const BATAS_MENIT = 0;

      const totalMenitSekarang = jamSekarang * 60 + menitSekarang;
      const totalMenitBatas = BATAS_JAM * 60 + BATAS_MENIT;

      if (totalMenitSekarang > totalMenitBatas) {
        finalStatus = 'Telat';
      }
    }

    // 6. Catat Log ke Tabel `absensi`
    const { data: newLog, error: errLog } = await supabase
      .from('absensi')
      .insert([
        {
          rfid_uid: cleanUid,
          nama: namaUser,
          kelas: kelasUser,
          status: finalStatus,
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

    // 7. Kirim WA secara Background Async (Khusus Siswa)
    if (nomorHpUser && !isExemptFromTimeLimit) {
      const jamFormat = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
      const pesanWA = `[NOTIFIKASI ABSENSI SMK YPK]\nSiswa a.n *${namaUser}* (${kelasUser}) telah melakukan absensi status: *${finalStatus.toUpperCase()}* pada pukul ${jamFormat} WIB.`;
      
      sendKirimiWA(nomorHpUser, pesanWA).catch((err) =>
        console.error('Background WA Error:', err)
      );
    }

    // 8. Respon Berhasil 200 OK ke ESP8266
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
