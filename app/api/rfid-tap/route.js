import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 1. Inisialisasi Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// 2. Variabel Konfigurasi Kirimi.id
const KIRIMI_USER_CODE = process.env.KIRIMI_USER_CODE || process.env.NEXT_PUBLIC_KIRIMI_USER_CODE || 'KMQZ4Y0826';
const KIRIMI_SECRET_KEY = process.env.KIRIMI_SECRET_KEY || process.env.NEXT_PUBLIC_KIRIMI_SECRET_KEY;
const KIRIMI_DEVICE_ID = process.env.KIRIMI_DEVICE_ID || process.env.NEXT_PUBLIC_KIRIMI_DEVICE_ID || 'D-H7IJQ';

// 3. Fungsi Khusus Pengirim WhatsApp Kirimi.id v1
async function sendKirimiWA(phone, message) {
  if (!phone) return false;

  const userCode = (KIRIMI_USER_CODE || '').trim();
  const secretKey = (KIRIMI_SECRET_KEY || '').trim();
  const deviceId = (KIRIMI_DEVICE_ID || '').trim();

  if (!userCode || !secretKey || !deviceId) {
    console.error('⚠️ Variabel Kirimi.id belum lengkap di Vercel Environment Variables.');
    return false;
  }

  // Format nomor HP (wajib diawali 62)
  let formattedPhone = String(phone).replace(/[^0-9]/g, '');
  if (formattedPhone.startsWith('0')) formattedPhone = '62' + formattedPhone.slice(1);
  else if (formattedPhone.startsWith('8')) formattedPhone = '62' + formattedPhone;

  const endpointUrl = 'https://api.kirimi.id/v1/send-message';

  const payload = JSON.stringify({
    user_code: userCode,
    secret: secretKey,
    device_id: deviceId,
    device: deviceId,
    phone: formattedPhone,
    message: message
  });

  try {
    const res = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Code': userCode,
        'Secret-Key': secretKey,
        'Device-Id': deviceId
      },
      body: payload
    });

    const responseText = await res.text();
    console.log(`Kirimi API Response [Status ${res.status}]:`, responseText);

    if (res.ok) {
      try {
        const resData = JSON.parse(responseText);
        if (resData.status === true || resData.status === 'success' || resData.code === 200) {
          return true;
        }
      } catch (e) {
        return true;
      }
    }
  } catch (err) {
    console.error('Error saat menghubungi Kirimi API:', err.message);
  }

  return false;
}

// 4. Endpoint Utama API RFID
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawUid = body.uid || body.rfid_uid;
    const deviceTimeStatus = body.status || 'Hadir';

    if (!rawUid) {
      return NextResponse.json({ success: false, message: 'UID RFID tidak valid' }, { status: 400 });
    }

    const cleanUid = rawUid.toString().trim().toUpperCase();

    // Simpan UID terakhir yang di-tap untuk modal pendaftaran kartu
    await supabase.from('latest_scan').upsert({ id: 1, uid: cleanUid, updated_at: new Date().toISOString() });

    let namaUser = 'Tidak Dikenal';
    let kelasUser = '-';
    let noWaTarget = null;
    let isKnown = false;
    let finalStatus = 'Hadir';

    // 1. Cek Data Guru
    const { data: guru } = await supabase.from('guru').select('*').eq('rfid_uid', cleanUid).maybeSingle();

    if (guru) {
      isKnown = true;
      namaUser = guru.nama;
      kelasUser = guru.role === 'admin' ? "MASTER'K" : 'Guru / Staff';
      noWaTarget = guru.no_wa || guru.no_hp || guru.no_telepon || guru.telepon || guru.whatsapp;
      finalStatus = 'Hadir';
    } else {
      // 2. Cek Data Siswa
      const { data: siswa } = await supabase.from('rfid_cards').select('*').eq('rfid_uid', cleanUid).maybeSingle();
      if (siswa) {
        isKnown = true;
        namaUser = siswa.nama;
        kelasUser = siswa.kelas;
        noWaTarget = siswa.no_hp_ortu || siswa.no_wa || siswa.no_hp || siswa.no_telepon || siswa.telepon || siswa.hp_ortu;
        finalStatus = deviceTimeStatus;
      }
    }

    if (!isKnown) {
      return NextResponse.json({ success: false, message: 'KARTU TIDAK TERDAFTAR' }, { status: 404 });
    }

    // Catat Riwayat Kehadiran ke Database
    const { data: absensiLog } = await supabase
      .from('absensi')
      .insert({
        rfid_uid: cleanUid,
        nama: namaUser,
        kelas: kelasUser,
        status: finalStatus,
        created_at: new Date().toISOString(),
        wa_sent: false
      })
      .select()
      .single();

    let waSentStatus = false;

    // Kirim Notifikasi WhatsApp
    if (noWaTarget) {
      const waktuTap = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
      const pesanWA = `*PRESENSI DIGITAL SMK YPK MEDAN*\n\n` +
        `Pemberitahuan presensi kehadiran:\n\n` +
        `👤 *Nama:* ${namaUser}\n` +
        `🏫 *Kelas/Jabatan:* ${kelasUser}\n` +
        `⏰ *Waktu Tap:* ${waktuTap} WIB\n` +
        `📌 *Status Presensi:* *${finalStatus.toUpperCase()}*\n\n` +
        `_Pesan ini dikirim otomatis oleh sistem presensi RFID sekolah._`;

      waSentStatus = await sendKirimiWA(noWaTarget, pesanWA);

      if (waSentStatus && absensiLog?.id) {
        await supabase.from('absensi').update({ wa_sent: true }).eq('id', absensiLog.id);
      }
    }

    return NextResponse.json({
      success: true,
      nama: namaUser,
      kelas: kelasUser,
      status: finalStatus,
      wa_sent: waSentStatus
    }, { status: 200 });

  } catch (err) {
    console.error('Server Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
