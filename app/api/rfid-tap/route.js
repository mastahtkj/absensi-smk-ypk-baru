import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Batas Jam Masuk Sekolah (07:15 WIB)
const BATAS_JAM = 7;
const BATAS_MENIT = 15;

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

  return {
    fullFormatted: `${dayName}, ${d}/${m}/${y} Pukul ${hh}:${mm}:${ss} WIB`,
    jam: wibDate.getHours(),
    menit: wibDate.getMinutes()
  };
}

// Fungsi Pengiriman WA Kirimi.id (Diperbarui sesuai Dokumentasi Resmi)
async function sendKirimiWA(phone, message) {
  try {
    if (!phone) {
      console.log("[Kirimi.id] Nomor telepon kosong.");
      return false;
    }
    
    // Sanitasi nomor ke format 628xxx
    let formattedPhone = phone.toString().trim().replace(/[^0-9]/g, '');
    if (formattedPhone.startsWith('0')) formattedPhone = '62' + formattedPhone.slice(1);
    else if (formattedPhone.startsWith('8')) formattedPhone = '62' + formattedPhone;

    const userCode = process.env.KIRIMI_USER_CODE || "KMQZ4Y0826";
    const deviceId = process.env.KIRIMI_DEVICE_ID || "D-H7IJQ";
    const secretKey = process.env.KIRIMI_SECRET_KEY || "0a2eae1b7a76fb9709f691fa0ebcff536c86aa1b3247f45eee8ab05e53aae3b1";

    console.log(`[Kirimi.id] Mengirim WA ke: ${formattedPhone}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    // Endpoint resmi sesuai Playground API Kirimi.id
    const res = await fetch("https://api.kirimi.id/v1/send-message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
      },
      body: JSON.stringify({
        user_code: userCode,
        device_id: deviceId,
        secret: secretKey,
        phone: formattedPhone,
        message: message
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const resText = await res.text();
    console.log(`[Kirimi.id Response Status]: ${res.status} | Body: ${resText}`);

    let resData = {};
    try { resData = JSON.parse(resText); } catch {}

    return res.ok && (resData.status === 'success' || resData.success === true || resData.code === 200);
  } catch (err) {
    console.error("[Kirimi.id Exception]:", err.message);
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
      return NextResponse.json({ success: false, message: "UID TIDAK TERBACA" }, { status: 400 });
    }

    const cleanUid = rfidCode.toString().trim().toUpperCase();

    // 1. Update Scan Terakhir untuk Dashboard
    await supabase.from('latest_scan').upsert({ id: 1, uid: cleanUid, updated_at: new Date().toISOString() });

    const timeInfo = getFormattedWibTime();
    const nowWib = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const yyyy = nowWib.getFullYear();
    const mm = String(nowWib.getMonth() + 1).padStart(2, '0');
    const dd = String(nowWib.getDate()).padStart(2, '0');
    const startOfDayWib = `${yyyy}-${mm}-${dd}T00:00:00+07:00`;

    // 2. Pencarian Paralel (Siswa, Guru, dan Absensi Hari Ini)
    const [studentRes, guruRes, existingAbsensi] = await Promise.all([
      supabase.from('rfid_cards').select('*').eq('rfid_uid', cleanUid).maybeSingle(),
      supabase.from('guru').select('*').eq('rfid_uid', cleanUid).maybeSingle(),
      supabase.from('absensi').select('id, status').eq('rfid_uid', cleanUid).gte('created_at', startOfDayWib).order('id', { ascending: false }).limit(1).maybeSingle()
    ]);

    let namaUser = "";
    let kelasUser = "";
    let noWaTarget = null;

    if (studentRes.data) {
      namaUser = studentRes.data.nama;
      kelasUser = studentRes.data.kelas || "-";
      noWaTarget = studentRes.data.no_hp_ortu || studentRes.data.no_wa || studentRes.data.no_hp;
    } else if (guruRes.data) {
      namaUser = guruRes.data.nama;
      kelasUser = "Guru / Staff";
      noWaTarget = guruRes.data.no_wa || guruRes.data.no_hp;
    } else {
      return NextResponse.json({ success: false, message: "KARTU BELUM TERDAFTAR", uid: cleanUid }, { status: 200 });
    }

    const isAlreadyScanned = !!existingAbsensi.data;
    let absensiId = existingAbsensi.data?.id || null;

    // 3. Status Presensi Otomatis
    let autoStatus = "Hadir";
    if (timeInfo.jam > BATAS_JAM || (timeInfo.jam === BATAS_JAM && timeInfo.menit > BATAS_MENIT)) {
      autoStatus = "Telat";
    }

    // 4. Simpan ke Tabel Absensi jika belum pernah tap hari ini
    if (!isAlreadyScanned) {
      const { data: inserted } = await supabase
        .from('absensi')
        .insert([{ 
          rfid_uid: cleanUid, 
          nama: namaUser, 
          kelas: kelasUser, 
          status: autoStatus,
          wa_sent: false 
        }])
        .select('id')
        .single();
      
      if (inserted) absensiId = inserted.id;
    }

    // 5. Kirim WA & Tunggu Selesai (AWAIT)
    let isWaSent = false;
    if (noWaTarget) {
      const currentStatus = isAlreadyScanned ? (existingAbsensi.data?.status || autoStatus) : autoStatus;
      const statusLabel = currentStatus.toUpperCase();

      const pesanWA = !isAlreadyScanned 
        ? `*PRESENSI DIGITAL SMK YPK MEDAN*\n\n👤 *Nama:* ${namaUser}\n🏫 *Kelas/Jabatan:* ${kelasUser}\n⏰ *Waktu Tap:* ${timeInfo.fullFormatted}\n📌 *Status:* *${statusLabel}*\n\n_Pesan otomatis sistem RFID SMK YPK MEDAN._`
        : `*PRESENSI DIGITAL SMK YPK MEDAN*\n\n⚠️ *PRESENSI GANDA*\n\n👤 *Nama:* ${namaUser}\n🏫 *Kelas/Jabatan:* ${kelasUser}\n⏰ *Waktu Tap:* ${timeInfo.fullFormatted}\n📌 *Status:* *SUDAH ABSEN HARI INI (${statusLabel})*\n\n_Sudah melakukan presensi sebelumnya hari ini._`;

      // Menggunakan await agar fungsi tidak terputus di Vercel
      isWaSent = await sendKirimiWA(noWaTarget, pesanWA);

      if (isWaSent && absensiId) {
        await supabase.from('absensi').update({ wa_sent: true }).eq('id', absensiId);
      }
    }

    return NextResponse.json({
      success: true,
      message: isAlreadyScanned ? "SUDAH ABSEN HARI INI" : `ABSENSI BERHASIL (${autoStatus.toUpperCase()})`,
      uid: cleanUid,
      nama: namaUser,
      kelas: kelasUser,
      status: autoStatus,
      wa_sent: isWaSent
    }, { status: 200 });

  } catch (err) {
    console.error("API Tap Error:", err);
    return NextResponse.json({ success: false, message: "SERVER ERROR" }, { status: 500 });
  }
}
