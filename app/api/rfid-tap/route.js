import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

const KIRIMI_USER_CODE = 'KMQZ4Y0826';
const KIRIMI_SECRET_KEY = '0a2eae1b7a76fb9709f691fa0ebcff536c86aa1b3247f45eee8ab05e53aae3b1';

// Helper Server-Side Kirim WA Kirimi.id (Bypass CORS sepenuhnya)
async function sendKirimiWA(phone, message) {
  try {
    if (!phone) {
      console.warn('⚠️ [WA SKIPPED] Nomor HP/WA kosong.');
      return false;
    }

    // Format Nomor HP ke 628xxx
    let cleanPhone = phone.toString().replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1);
    } else if (cleanPhone.startsWith('+62')) {
      cleanPhone = cleanPhone.slice(1);
    }

    console.log(`📱 [SENDING WA SERVER] Kirim ke: ${cleanPhone}`);

    // Menggunakan URL URLSearchParams / JSON payload standar Kirimi.id
    const response = await fetch('https://dash.kirimi.id/api/v2/send-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Code': KIRIMI_USER_CODE,
        'Secret-Key': KIRIMI_SECRET_KEY
      },
      body: JSON.stringify({
        phone: cleanPhone,
        message: message
      })
    });

    const resData = await response.json();
    console.log('📩 [KIRIMI RESPONSE]:', resData);

    return response.ok && (resData.status === true || resData.status === 'success' || resData.code === 200);
  } catch (err) {
    console.error('❌ [WA ERROR]:', err);
    return false;
  }
}

// Endpoint POST untuk Alat ESP8266 & Manual Update
export async function POST(request) {
  try {
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ success: false, message: 'Env Supabase Belum Diset' }, { status: 500 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, message: 'Invalid JSON' }, { status: 400 });
    }

    // A. JIKA REQUEST BERASAL DARI FRONTEND DENGAN ACTION "SEND_WA_DIRECT"
    if (body.action === 'SEND_WA_DIRECT') {
      const { phone, message } = body;
      const sent = await sendKirimiWA(phone, message);
      return NextResponse.json({ success: sent });
    }

    // B. REQUEST ALAT TAP RFID ESP8266
    const rawUid = body.rfid_uid || body.uid;
    if (!rawUid) {
      return NextResponse.json({ success: false, message: 'UID RFID Kosong' }, { status: 400 });
    }

    const cleanUid = rawUid.toString().trim().toUpperCase();
    const statusBody = body.status || 'Hadir';
    const waktuTap = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });

    // 1. CEK TABEL GURU
    const { data: guruData } = await supabase
      .from('guru')
      .select('id, nama, no_wa, role')
      .eq('rfid_uid', cleanUid)
      .maybeSingle();

    if (guruData) {
      const namaKelas = guruData.role === 'admin' ? "MASTER'K" : 'Guru / Staff';
      let waSent = false;

      if (guruData.no_wa) {
        const msg = `*PRESENSI GURU / STAFF SMK YPK MEDAN*\n\n` +
          `Yth. Bapak/Ibu *${guruData.nama}*,\n` +
          `Presensi kehadiran Anda berhasil dicatat:\n\n` +
          `⏰ Waktu Tap: ${waktuTap} WIB\n` +
          `📌 Status: ${statusBody}\n\n` +
          `Selamat bertugas!`;
        waSent = await sendKirimiWA(guruData.no_wa, msg);
      }

      const { data: logAbsen } = await supabase
        .from('absensi')
        .insert([{
          rfid_uid: cleanUid,
          nama: guruData.nama,
          kelas: namaKelas,
          status: statusBody,
          created_at: new Date().toISOString()
        }])
        .select()
        .maybeSingle();

      await supabase.from('latest_scan').upsert({ id: 1, uid: cleanUid, updated_at: new Date().toISOString() });

      return NextResponse.json({ success: true, role: 'guru', nama: guruData.nama, wa_sent: waSent, data: logAbsen });
    }

    // 2. CEK TABEL SISWA (rfid_cards)
    const { data: siswaData } = await supabase
      .from('rfid_cards')
      .select('id, nama, kelas, no_hp_ortu, no_wa')
      .eq('rfid_uid', cleanUid)
      .maybeSingle();

    if (siswaData) {
      const targetPhone = siswaData.no_hp_ortu || siswaData.no_wa;
      let waSent = false;

      if (targetPhone) {
        const msg = `*PRESENSI DIGITAL SMK YPK MEDAN*\n\n` +
          `Yth. Bapak/Ibu Orang Tua/Wali,\n` +
          `Pemberitahuan presensi kehadiran siswa:\n\n` +
          `👤 Nama: ${siswaData.nama}\n` +
          `🏫 Kelas: ${siswaData.kelas || '-'}\n` +
          `⏰ Waktu Tap: ${waktuTap} WIB\n` +
          `📌 Status: ${statusBody}\n\n` +
          `Pesan dikirim otomatis oleh sistem presensi RFID sekolah.`;

        waSent = await sendKirimiWA(targetPhone, msg);
      }

      const { data: logAbsen } = await supabase
        .from('absensi')
        .insert([{
          rfid_uid: cleanUid,
          nama: siswaData.nama,
          kelas: siswaData.kelas,
          status: statusBody,
          created_at: new Date().toISOString()
        }])
        .select()
        .maybeSingle();

      await supabase.from('latest_scan').upsert({ id: 1, uid: cleanUid, updated_at: new Date().toISOString() });

      return NextResponse.json({ success: true, role: 'siswa', nama: siswaData.nama, wa_sent: waSent, data: logAbsen });
    }

    // 3. KARTU UNKNOWN
    await supabase.from('latest_scan').upsert({ id: 1, uid: cleanUid, updated_at: new Date().toISOString() });
    return NextResponse.json({ success: true, is_new_card: true, uid: cleanUid, message: 'Kartu belum terdaftar' });

  } catch (err) {
    console.error("Internal Server Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
