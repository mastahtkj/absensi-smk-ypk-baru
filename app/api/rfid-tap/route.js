import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

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

// Fungsi Ekstraksi Jurusan dari String Kelas
function parseJurusanFromKelas(kelasStr) {
  if (!kelasStr) return "UMUM";
  const str = kelasStr.toUpperCase();
  if (str.includes("TJKT") || str.includes("TKJ")) return "TJKT";
  if (str.includes("AKL") || str.includes("AK")) return "AKL";
  if (str.includes("MPLB") || str.includes("OTP")) return "MPLB";
  if (str.includes("BR") || str.includes("BDP") || str.includes("PM")) return "PEMASARAN";
  return "UMUM";
}

async function sendKirimiWABackground(phone, message) {
  try {
    if (!phone) return;
    let formattedPhone = phone.toString().trim().replace(/[^0-9]/g, '');
    if (formattedPhone.startsWith('0')) formattedPhone = '62' + formattedPhone.slice(1);
    else if (formattedPhone.startsWith('8')) formattedPhone = '62' + formattedPhone;

    const userCode = process.env.KIRIMI_USER_CODE || "KMQZ4Y0826";
    const deviceId = process.env.KIRIMI_DEVICE_ID || "D-H7IJQ";
    const secretKey = process.env.KIRIMI_SECRET_KEY || "0a2eae1b7a76fb9709f691fa0ebcff536c86aa1b3247f45eee8ab05e53aae3b1";

    fetch("https://api.kirimi.id/v1/send-message", {
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
      })
    }).catch(e => console.error("WA Background Async Error:", e.message));
  } catch (err) {
    console.error("[Kirimi.id Exception]:", err.message);
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

    // Fire-and-forget update scan terakhir
    supabase.from('latest_scan').upsert({ id: 1, uid: cleanUid, updated_at: new Date().toISOString() }).then(() => {});

    const timeInfo = getFormattedWibTime();
    const nowWib = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const yyyy = nowWib.getFullYear();
    const mm = String(nowWib.getMonth() + 1).padStart(2, '0');
    const dd = String(nowWib.getDate()).padStart(2, '0');
    const startOfDayWib = `${yyyy}-${mm}-${dd}T00:00:00+07:00`;

    // Query Paralel Cepat
    const [studentRes, guruRes, existingAbsensi] = await Promise.all([
      supabase.from('rfid_cards').select('nama, kelas, jurusan, no_hp_ortu, no_wa, no_hp').eq('rfid_uid', cleanUid).maybeSingle(),
      supabase.from('guru').select('nama, no_wa, no_hp').eq('rfid_uid', cleanUid).maybeSingle(),
      supabase.from('absensi').select('id, status').eq('rfid_uid', cleanUid).gte('created_at', startOfDayWib).limit(1).maybeSingle()
    ]);

    let namaUser = "";
    let kelasUser = "";
    let jurusanUser = "";
    let noWaTarget = null;
    let isGuru = false;

    if (studentRes.data) {
      namaUser = studentRes.data.nama;
      kelasUser = studentRes.data.kelas || "-";
      jurusanUser = studentRes.data.jurusan || parseJurusanFromKelas(studentRes.data.kelas);
      noWaTarget = studentRes.data.no_hp_ortu || studentRes.data.no_wa || studentRes.data.no_hp;
    } else if (guruRes.data) {
      namaUser = guruRes.data.nama;
      kelasUser = "Guru / Staff";
      jurusanUser = "GURU";
      noWaTarget = guruRes.data.no_wa || guruRes.data.no_hp;
      isGuru = true;
    } else {
      return NextResponse.json({ success: false, message: "KARTU BELUM TERDAFTAR", uid: cleanUid }, { status: 200 });
    }

    const isAlreadyScanned = !!existingAbsensi.data;
    let autoStatus = "Hadir";
    if (timeInfo.jam > BATAS_JAM || (timeInfo.jam === BATAS_JAM && timeInfo.menit > BATAS_MENIT)) {
      autoStatus = "Telat";
    }

    // Insert asinkron tanpa menahan return JSON
    if (!isAlreadyScanned) {
      supabase.from('absensi').insert([{ 
        rfid_uid: cleanUid, 
        nama: namaUser, 
        kelas: kelasUser, 
        status: autoStatus,
        wa_sent: false 
      }]).then(() => {});
    }

    // Trigger WA tanpa Await (Latar Belakang Total)
    if (noWaTarget) {
      const currentStatus = isAlreadyScanned ? (existingAbsensi.data?.status || autoStatus) : autoStatus;
      const labelJabatan = isGuru ? "Jabatan" : "Kelas";
      const pesanWA = !isAlreadyScanned 
        ? `*PRESENSI DIGITAL SMK YPK MEDAN*\n\n👤 *Nama:* ${namaUser}\n🏫 *${labelJabatan}:* ${kelasUser}\n⏰ *Waktu Tap:* ${timeInfo.fullFormatted}\n📌 *Status:* *${currentStatus.toUpperCase()}*\n\n_Pesan otomatis sistem RFID SMK YPK MEDAN._`
        : `*PRESENSI DIGITAL SMK YPK MEDAN*\n\n⚠️ *PRESENSI GANDA*\n\n👤 *Nama:* ${namaUser}\n🏫 *${labelJabatan}:* ${kelasUser}\n⏰ *Waktu Tap:* ${timeInfo.fullFormatted}\n📌 *Status:* *SUDAH ABSEN HARI INI (${currentStatus.toUpperCase()})*\n\n_Sudah melakukan presensi sebelumnya hari ini._`;

      sendKirimiWABackground(noWaTarget, pesanWA);
    }

    // Response Instan (<50ms)
    return NextResponse.json({
      success: true,
      message: isAlreadyScanned ? "SUDAH ABSEN HARI INI" : `ABSENSI BERHASIL (${autoStatus.toUpperCase()})`,
      uid: cleanUid,
      nama: namaUser,
      kelas: isGuru ? "" : kelasUser,
      jabatan: isGuru ? "Guru / Staff" : "",
      jurusan: jurusanUser,
      status: autoStatus
    }, { status: 200 });

  } catch (err) {
    console.error("API Tap Error:", err);
    return NextResponse.json({ success: false, message: "SERVER ERROR" }, { status: 500 });
  }
}
