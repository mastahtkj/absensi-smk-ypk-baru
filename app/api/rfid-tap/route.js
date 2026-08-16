import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

const KIRIMI_USER_CODE = 'KMQZ4Y0826';
const KIRIMI_SECRET_KEY = '0a2eae1b7a76fb9709f691fa0ebcff536c86aa1b3247f45eee8ab05e53aae3b1';
const KIRIMI_DEVICE_ID = 'D-H7IJQ';

// Helper Format Nomor WhatsApp ke Standar Internasional Kirimi.id (628...)
function formatPhoneKirimi(phone) {
  if (!phone) return '';
  let cleaned = phone.toString().replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (cleaned.startsWith('8')) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
}

// Helper Kirim WA via Kirimi.id di Sisi Server (Bypass CORS)
async function sendKirimiWA(phone, message) {
  try {
    if (!phone) {
      console.warn('⚠️ [WA SKIPPED] Nomor WhatsApp tidak ditemukan di database.');
      return false;
    }

    const cleanPhone = formatPhoneKirimi(phone);
    if (!cleanPhone) return false;

    console.log(`📱 [WA SENDING] Mengirim pesan ke: ${cleanPhone}`);

    const response = await fetch('https://dash.kirimi.id/api/v2/send-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Code': KIRIMI_USER_CODE,
        'Secret-Key': KIRIMI_SECRET_KEY,
        'Device-Id': KIRIMI_DEVICE_ID,
        'Device': KIRIMI_DEVICE_ID
      },
      body: JSON.stringify({
        device: KIRIMI_DEVICE_ID,
        device_id: KIRIMI_DEVICE_ID,
        phone: cleanPhone,
        message: message
      })
    });

    const resData = await response.json();
    console.log('📩 [WA RESPONSE KIRIMI]:', JSON.stringify(resData));

    // Validasi response dari Kirimi.id
    const isSuccess = response.ok && (
      resData.status === true || 
      resData.status === 'success' || 
      resData.code === 200 || 
      resData.status_code === 200
    );
    return isSuccess;
  } catch (err) {
    console.error('❌ [WA EXCEPTION ERROR]:', err);
    return false;
  }
}

export async function POST(request) {
  try {
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ success: false, message: 'Supabase Env Variable Belum Diset' }, { status: 500 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, message: 'Invalid JSON Payload' }, { status: 400 });
    }

    const rawUid = body.rfid_uid || body.uid;
    if (!rawUid) {
      return NextResponse.json({ success: false, message: 'UID RFID Kosong' }, { status: 400 });
    }

    const cleanUid = rawUid.toString().trim().toUpperCase();
    const statusBody = body.status || 'Hadir';
    const waktuTap = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });

    // 1. CEK KARTU DI TABEL GURU
    const { data: guruData, error: errGuru } = await supabase
      .from('guru')
      .select('*')
      .or(`rfid_uid.eq.${cleanUid},uid.eq.${cleanUid}`)
      .maybeSingle();

    if (errGuru) console.error("Error query guru:", errGuru);

    if (guruData) {
      const namaKelas = guruData.role === 'admin' ? "MASTER'K" : 'Guru / Staff';
      const phoneNoGuru = guruData.no_wa || guruData.no_hp || guruData.telepon;
      let waStatus = false;

      if (phoneNoGuru) {
        const msgGuru = `*PRESENSI GURU / STAFF SMK YPK MEDAN*\n\n` +
          `Yth. Bapak/Ibu *${guruData.nama}*,\n` +
          `Presensi kehadiran Anda telah berhasil dicatat:\n\n` +
          `⏰ Waktu Tap: ${waktuTap} WIB\n` +
          `📌 Status Presensi: ${statusBody}\n\n` +
          `Terima kasih. Selamat bertugas!`;
        
        waStatus = await sendKirimiWA(phoneNoGuru, msgGuru);
      }

      const { data: logAbsenGuru } = await supabase
        .from('absensi')
        .insert([{
          rfid_uid: cleanUid,
          nama: guruData.nama,
          kelas: namaKelas,
          status: statusBody,
          wa_sent: waStatus,
          created_at: new Date().toISOString()
        }])
        .select()
        .maybeSingle();

      // Update scan terakhir
      await supabase.from('latest_scan').upsert({ id: 1, uid: cleanUid, nama: guruData.nama, wa_sent: waStatus, updated_at: new Date().toISOString() });

      return NextResponse.json({
        success: true,
        role: 'guru',
        nama: guruData.nama,
        wa_sent: waStatus,
        message: 'Absensi Guru Berhasil Recorded',
        data: logAbsenGuru
      }, { status: 200 });
    }

    // 2. CEK KARTU DI TABEL rfid_cards (SISWA)
    const { data: siswaData, error: errSiswa } = await supabase
      .from('rfid_cards')
      .select('*')
      .or(`rfid_uid.eq.${cleanUid},uid.eq.${cleanUid}`)
      .maybeSingle();

    if (errSiswa) console.error("Error query siswa:", errSiswa);

    if (siswaData) {
      const phoneNoSiswa = siswaData.no_hp_ortu || siswaData.no_wa || siswaData.no_hp || siswaData.telepon;
      let waStatus = false;

      if (phoneNoSiswa) {
        const msgSiswa = `*PRESENSI DIGITAL SMK YPK MEDAN*\n\n` +
          `Yth. Bapak/Ibu Orang Tua/Wali,\n` +
          `Pemberitahuan presensi kehadiran putra/putri Anda:\n\n` +
          `👤 Nama Siswa: ${siswaData.nama}\n` +
          `🏫 Kelas: ${siswaData.kelas || '-'}\n` +
          `⏰ Waktu Tap: ${waktuTap} WIB\n` +
          `📌 Status Presensi: ${statusBody}\n\n` +
          `Terima kasih. Pesan ini dikirim otomatis oleh sistem presensi RFID sekolah.`;

        waStatus = await sendKirimiWA(phoneNoSiswa, msgSiswa);
      }

      const { data: logAbsen } = await supabase
        .from('absensi')
        .insert([{
          rfid_uid: cleanUid,
          nama: siswaData.nama,
          kelas: siswaData.kelas,
          status: statusBody,
          wa_sent: waStatus,
          created_at: new Date().toISOString()
        }])
        .select()
        .maybeSingle();

      // Update scan terakhir
      await supabase.from('latest_scan').upsert({ id: 1, uid: cleanUid, nama: siswaData.nama, wa_sent: waStatus, updated_at: new Date().toISOString() });

      return NextResponse.json({
        success: true,
        role: 'siswa',
        nama: siswaData.nama,
        wa_sent: waStatus,
        message: 'Absensi Siswa Berhasil Recorded',
        data: logAbsen
      }, { status: 200 });
    }

    // 3. KARTU BELUM TERDAFTAR
    await supabase.from('latest_scan').upsert({ id: 1, uid: cleanUid, wa_sent: false, updated_at: new Date().toISOString() });

    return NextResponse.json({
      success: true,
      is_new_card: true,
      uid: cleanUid,
      message: 'Kartu RFID belum terikat ke Siswa/Guru'
    }, { status: 200 });

  } catch (err) {
    console.error("Internal Server Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
