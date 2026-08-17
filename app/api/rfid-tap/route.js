import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 1. Inisialisasi Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// 2. Variabel Konfigurasi Kirimi.id v2
const KIRIMI_USER_CODE = process.env.KIRIMI_USER_CODE || process.env.NEXT_PUBLIC_KIRIMI_USER_CODE;
const KIRIMI_SECRET_KEY = process.env.KIRIMI_SECRET_KEY || process.env.NEXT_PUBLIC_KIRIMI_SECRET_KEY;
const KIRIMI_DEVICE_ID = process.env.KIRIMI_DEVICE_ID || process.env.NEXT_PUBLIC_KIRIMI_DEVICE_ID;

// 3. Fungsi Khusus Pengirim WhatsApp (Anti 405 Redirect & Valid Endpoints)
async function sendKirimiWA(phone, message) {
  if (!phone) {
    console.error('⚠️ Nomor telepon kosong / tidak ditemukan.');
    return false;
  }

  const userCode = (KIRIMI_USER_CODE || '').trim();
  const secretKey = (KIRIMI_SECRET_KEY || '').trim();
  const deviceId = (KIRIMI_DEVICE_ID || '').trim();

  if (!userCode || !secretKey || !deviceId) {
    console.error('⚠️ Variabel Kirimi.id belum diatur di Vercel Environment Variables.');
    return false;
  }

  // Format nomor HP (wajib berawalan 62)
  let formattedPhone = String(phone).replace(/[^0-9]/g, '');
  if (formattedPhone.startsWith('0')) formattedPhone = '62' + formattedPhone.slice(1);
  else if (formattedPhone.startsWith('8')) formattedPhone = '62' + formattedPhone;

  // Daftar variasi endpoint Kirimi.id yang valid untuk diuji
  const targetUrls = [
    'https://dash.kirimi.id/api/v2/send-message',
    'https://dash.kirimi.id/api/v2/send-message/',
    'https://kirimi.id/api/v2/send-message',
    'https://kirimi.id/api/v2/send-message/'
  ];

  const payload = JSON.stringify({
    device: deviceId,
    phone: formattedPhone,
    message: message
  });

  for (const url of targetUrls) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Code': userCode,
          'Secret-Key': secretKey,
          'Device-Id': deviceId,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        body: payload,
        redirect: 'follow'
      });

      const responseText = await res.text();
      console.log(`Kirimi API [${url}] Status ${res.status}:`, responseText);

      // Jika berhasil (200 OK / Response JSON Valid)
      if (res.ok && res.status === 200) {
        try {
          const resData = JSON.parse(responseText);
          if (resData.status === true || resData.status === 'success' || resData.code === 200) {
            return true;
          }
        } catch (e) {
          // Tetap kembalikan true jika HTTP status 200 OK
          return true;
        }
      }
    } catch (err) {
      console.error(`Gagal koneksi ke ${url}:`, err.message);
    }
  }

  return false;
}

// 4. FUNGSI UTAMA (API Endpoint untuk Arduino)
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawUid = body.uid || body.rfid_uid;
    const deviceTimeStatus = body.status || 'Hadir';

    if (!rawUid) {
      return NextResponse.json({ success: false, message: 'UID RFID tidak valid' }, { status: 400 });
    }

    const cleanUid = rawUid.toString().trim().toUpperCase();

    // Update real-time modal pendaftaran kartu di frontend
    await supabase.from('latest_scan').upsert({ id: 1, uid: cleanUid, updated_at: new Date().toISOString() });

    let namaUser = 'Tidak Dikenal';
    let kelasUser = '-';
    let noWaTarget = null;
    let isKnown = false;
    let finalStatus = 'Hadir';

    // Cek apakah UID milik Guru
    const { data: guru } = await supabase.from('guru').select('*').eq('rfid_uid', cleanUid).maybeSingle();

    if (guru) {
      isKnown = true;
      namaUser = guru.nama;
      kelasUser = guru.role === 'admin' ? "MASTER'K" : 'Guru / Staff';
      noWaTarget = guru.no_wa || guru.no_hp || guru.no_telepon || guru.telepon || guru.whatsapp;
      finalStatus = 'Hadir';
    } else {
      // Jika bukan Guru, Cek apakah UID milik Siswa
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

    // Insert Riwayat Absensi ke Supabase
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

    // Proses Kirim WA jika ada nomor tujuan
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
    } else {
      console.warn(`⚠️ User ${namaUser} (${cleanUid}) tidak memiliki nomor WA di database.`);
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
