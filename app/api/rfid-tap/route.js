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

// Helper Function Kirim WA
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

    // 3. Cek Kartu Siswa di Tabel `rfid_cards`
    const { data: siswa, error: errCekSiswa } = await supabase
      .from('rfid_cards')
      .select('*')
      .eq('card_uid', cleanUid)
      .maybeSingle();

    if (errCekSiswa) {
      console.error('Error Cek Siswa (Cek RLS/Nama Tabel rfid_cards):', errCekSiswa.message);
    }

    let isNewCard = false;
    let namaSiswa = cleanUid;
    let nomorHpSiswa = null;

    if (!siswa) {
      // Jika kartu belum terdaftar, otomatis daftarkan kartu baru
      isNewCard = true;
      namaSiswa = `Siswa Baru (${cleanUid})`;
      
      const { error: errInsertCard } = await supabase.from('rfid_cards').insert([
        {
          card_uid: cleanUid,
          name: namaSiswa,
          class_name: 'Belum Diatur',
        },
      ]);

      if (errInsertCard) {
        console.error('Error Insert rfid_cards:', errInsertCard.message);
      }
    } else {
      namaSiswa = siswa.name || cleanUid;
      nomorHpSiswa = siswa.phone || null;
    }

    // 4. Catat Log ke Tabel `absensi` (TANPA manual created_at & TANPA .single())
    const { data: newLog, error: errLog } = await supabase
      .from('absensi')
      .insert([
        {
          rfid_uid: cleanUid,
          status: statusAbsen,
          pengubah: 'Mesin RFID Iqbal',
        },
      ])
      .select();

    if (errLog) {
      console.error('Error insert log absensi:', errLog.message);
      // Lempar error detail ke LCD/ESP8266 biar kelihatan di Serial Monitor
      return NextResponse.json(
        { error: 'Gagal Simpan Absensi', details: errLog.message },
        { status: 500 }
      );
    }

    // 5. Otomatis Kirim WA ke Orang Tua/Siswa jika ada nomor HP
    let waResponse = null;
    if (nomorHpSiswa) {
      const jamFormat = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      const pesanWA = `[NOTIFIKASI ABSENSI]\nSiswa a.n *${namaSiswa}* telah melakukan absensi status: *${statusAbsen.toUpperCase()}* pada pukul ${jamFormat} WIB.`;
      
      waResponse = await sendKirimiWA(nomorHpSiswa, pesanWA);
    }

    // 6. Respon Berhasil 200 OK ke ESP8266
    return NextResponse.json(
      {
        success: true,
        message: 'Absensi berhasil dicatat!',
        is_new_card: isNewCard,
        data: newLog ? newLog[0] : null,
        wa_status: waResponse,
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
