import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function getFormattedWibTime() {
  const now = new Date();
  const wibDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  
  const dayName = days[wibDate.getDay()];
  const d = wibDate.getDate();
  const m = wibDate.getMonth() + 1;
  const y = wibDate.getFullYear();
  const hh = String(wibDate.getHours()).padStart(2, '0');
  const mm = String(wibDate.getMinutes()).padStart(2, '0');
  const ss = String(wibDate.getSeconds()).padStart(2, '0');

  return `${dayName}-${d}/${m}/${y}, ${hh}.${mm}.${ss} WIB`;
}

async function sendKirimiWA(phone, message) {
  try {
    let formattedPhone = phone.toString().trim().replace(/[^0-9]/g, '');
    if (formattedPhone.startsWith('0')) formattedPhone = '62' + formattedPhone.slice(1);
    else if (formattedPhone.startsWith('8')) formattedPhone = '62' + formattedPhone;

    const userCode = process.env.KIRIMI_USER_CODE || process.env.NEXT_PUBLIC_KIRIMI_USER_CODE || "KMQZ4Y0826";
    const deviceId = process.env.KIRIMI_DEVICE_ID || process.env.NEXT_PUBLIC_KIRIMI_DEVICE_ID || "D-H7IJQ";
    const secretKey = process.env.KIRIMI_SECRET_KEY || process.env.NEXT_PUBLIC_KIRIMI_SECRET_KEY || "0a2eae1b7a76fb9709f691fa0ebcff536c86aa1b3247f45eee8ab05e53aae3b1";

    const payload = {
      user_code: userCode,
      device_id: deviceId,
      secret: secretKey,
      phone: formattedPhone,
      message: message
    };

    const res = await fetch("https://dash.kirimi.id/api/v2/send-message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Code": userCode,
        "Secret-Key": secretKey,
        "Device-Id": deviceId
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000)
    });

    const resData = await res.json().catch(() => ({}));
    return res.ok && (resData.status === 'success' || resData.success === true || resData.status === 200 || resData.code === 200);
  } catch (err) {
    console.error("[Kirimi.id] Error/Timeout:", err.message);
    return false;
  }
}

export async function POST(req) {
  try {
    const rawText = await req.text();
    let rfidCode = null;

    if (rawText) {
      try {
        const jsonBody = JSON.parse(rawText);
        rfidCode = jsonBody.rfid_uid || jsonBody.uid || jsonBody.card_id || jsonBody.rfid;
      } catch {
        rfidCode = rawText.trim().replace(/['"]/g, '');
      }
    }

    if (!rfidCode) {
      return NextResponse.json({ success: false, message: "UID TIDAK ADA" }, { status: 400 });
    }

    const cleanUid = rfidCode.toString().trim().toUpperCase();

    // 1. UPDATE LATEST SCAN TERLEBIH DAHULU (Agar UID langsung muncul di modal registrasi frontend)
    await supabase.from('latest_scan').upsert({ id: 1, uid: cleanUid, updated_at: new Date().toISOString() });

    const todayWibStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
    const startOfDayWib = `${todayWibStr}T00:00:00+07:00`;

    // 2. Query Data Siswa, Guru, dan Riwayat Absensi Hari Ini
    const [studentRes, guruRes, existingAbsensi] = await Promise.all([
      supabase.from('rfid_cards').select('nama, kelas, jurusan, no_hp_ortu, no_wa').eq('rfid_uid', cleanUid).maybeSingle(),
      supabase.from('guru').select('nama, inisial, role, no_wa').eq('rfid_uid', cleanUid).maybeSingle(),
      supabase.from('absensi').select('id, status').eq('rfid_uid', cleanUid).gte('created_at', startOfDayWib).limit(1).maybeSingle()
    ]);

    let userType = ""; 
    let namaUser = "";
    let kelasUser = "";
    let noWaTarget = null;

    if (studentRes.data) {
      userType = "siswa";
      namaUser = studentRes.data.nama;
      kelasUser = studentRes.data.kelas;
      noWaTarget = studentRes.data.no_hp_ortu || studentRes.data.no_wa;
    } else if (guruRes.data) {
      userType = "guru";
      namaUser = guruRes.data.nama;
      kelasUser = guruRes.data.role === 'admin' ? "MASTER'K" : "Guru / Staff";
      noWaTarget = guruRes.data.no_wa;
    } else {
      // Kartu belum terdaftar, tetap kembalikan UID ke frontend
      return NextResponse.json({ 
        success: false, 
        message: "KARTU TIDAK TERDAFTAR", 
        uid: cleanUid 
      }, { status: 200 });
    }

    const isAlreadyScanned = !!existingAbsensi.data;
    let absensiId = null;
    let waSentStatus = false;

    // 3. Catat Absensi Jika Belum Absen Hari Ini
    if (!isAlreadyScanned) {
      const { data: inserted } = await supabase
        .from('absensi')
        .insert([{ 
          rfid_uid: cleanUid, 
          nama: namaUser, 
          kelas: kelasUser, 
          status: "Hadir",
          wa_sent: false 
        }])
        .select('id')
        .single();
      
      absensiId = inserted?.id;
    }

    // 4. Kirim Notifikasi WA Kirimi.id
    if (noWaTarget) {
      const waktuTap = getFormattedWibTime();
      let pesanWA = "";

      if (!isAlreadyScanned) {
        pesanWA = `*PRESENSI DIGITAL SMK YPK MEDAN*\n\n` +
          `Pemberitahuan presensi kehadiran:\n\n` +
          `👤 *Nama:* ${namaUser}\n` +
          `🏫 *${userType === 'siswa' ? 'Kelas' : 'Kelas/Jabatan'}:* ${kelasUser}\n` +
          `⏰ *Waktu Tap:* ${waktuTap}\n` +
          `📌 *Status Presensi:* *HADIR*\n\n` +
          `_Pesan ini dikirim otomatis oleh sistem presensi RFID SMK YPK MEDAN._`;
      } else {
        pesanWA = `*PRESENSI DIGITAL SMK YPK MEDAN*\n\n` +
          `⚠️ *PERINGATAN PRESENSI GANDA*\n\n` +
          `👤 *Nama:* ${namaUser}\n` +
          `🏫 *${userType === 'siswa' ? 'Kelas' : 'Kelas/Jabatan'}:* ${kelasUser}\n` +
          `⏰ *Waktu Tap:* ${waktuTap}\n` +
          `📌 *Status:* *SUDAH ABSEN HARI INI*\n\n` +
          `_Sudah melakukan presensi sebelumnya hari ini di SMK YPK MEDAN._`;
      }

      waSentStatus = await sendKirimiWA(noWaTarget, pesanWA);

      if (waSentStatus && absensiId) {
        await supabase.from('absensi').update({ wa_sent: true }).eq('id', absensiId);
      }
    }

    return NextResponse.json({
      success: true,
      message: isAlreadyScanned ? "SUDAH ABSEN HARI INI" : "ABSENSI BERHASIL",
      uid: cleanUid,
      nama: namaUser,
      kelas: kelasUser,
      wa_sent: waSentStatus
    }, { status: 200 });

  } catch (err) {
    console.error("API Tap Exception:", err);
    return NextResponse.json({ success: false, message: "SERVER ERROR" }, { status: 500 });
  }
}
