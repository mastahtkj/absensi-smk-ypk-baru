import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper Format Waktu Presisi (Contoh: Selasa-18/8/2026, 01.47.51 WIB)
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

// Helper WA Kirimi.id
async function sendKirimiWA(phone, message) {
  try {
    let formattedPhone = phone.toString().trim().replace(/[^0-9]/g, '');
    if (formattedPhone.startsWith('0')) formattedPhone = '62' + formattedPhone.slice(1);

    const secretKey = process.env.KIRIMI_SECRET_KEY || "0a2eae1b7a76fb9709f691fa0ebcff536c86aa1b3247f45eee8ab05e53aae3b1";

    const payload = {
      user_code: "KMQZ4Y0826",
      device_id: "D-H7IJQ",
      secret: secretKey,
      phone: formattedPhone,
      message: message
    };

    const res = await fetch("https://api.kirimi.id/v1/send-message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${secretKey}`
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(4000)
    });

    const resData = await res.json();
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

    const todayWibStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
    const startOfDayWib = `${todayWibStr}T00:00:00+07:00`;

    // 1. Query Siswa (rfid_cards) & Guru
    const [studentRes, guruRes, existingAbsensi] = await Promise.all([
      supabase.from('rfid_cards').select('nama, kelas, jurusan, no_hp_ortu, no_wa').eq('rfid_uid', rfidCode).maybeSingle(),
      supabase.from('guru').select('nama, inisial, role, no_wa').eq('rfid_uid', rfidCode).maybeSingle(),
      supabase.from('absensi').select('id').eq('rfid_uid', rfidCode).gte('created_at', startOfDayWib).limit(1).maybeSingle()
    ]);

    let userType = ""; 
    let namaUser = "";
    let kelasUser = "";
    let jurusanUser = "";
    let inisialUser = "";
    let roleUser = "";
    let noWaTarget = null;

    if (studentRes.data) {
      userType = "siswa";
      namaUser = studentRes.data.nama;
      kelasUser = studentRes.data.kelas;
      jurusanUser = studentRes.data.jurusan || "-";
      noWaTarget = studentRes.data.no_hp_ortu || studentRes.data.no_wa;
    } else if (guruRes.data) {
      userType = "guru";
      namaUser = guruRes.data.nama;
      inisialUser = guruRes.data.inisial || "-";
      roleUser = guruRes.data.role || "Guru";
      noWaTarget = guruRes.data.no_wa;
    } else {
      return NextResponse.json({ success: false, message: "KARTU TIDAK TERDAFTAR" }, { status: 200 });
    }

    const isAlreadyScanned = !!existingAbsensi.data;
    const finalStatus = isAlreadyScanned ? "Sudah Absen" : "Hadir";

    // 2. Update Realtime Scan
    await supabase.from('latest_scan').upsert({ id: 1, uid: rfidCode, updated_at: new Date().toISOString() });

    let absensiId = null;

    if (!isAlreadyScanned) {
      const { data: inserted } = await supabase
        .from('absensi')
        .insert([{ rfid_uid: rfidCode, nama: namaUser, kelas: userType === 'siswa' ? kelasUser : roleUser, status: "Hadir" }])
        .select('id')
        .single();
      absensiId = inserted?.id;
    }

    // 3. Kirim WA (Template Disesuaikan Persis Sesuai Tangkapan Layar)
    if (noWaTarget) {
      const waktuTap = getFormattedWibTime();
      let pesanWA = "";

      if (!isAlreadyScanned) {
        pesanWA = `*PRESENSI DIGITAL SMK YPK MEDAN*\n\n` +
          `Pemberitahuan presensi kehadiran:\n\n` +
          `👤 *Nama:* ${namaUser}\n` +
          `🏫 *${userType === 'siswa' ? 'Kelas' : 'Kelas/Jabatan'}:* ${userType === 'siswa' ? kelasUser : roleUser}\n` +
          `⏰ *Waktu Tap:* ${waktuTap}\n` +
          `📌 *Status Presensi:* *HADIR*\n\n` +
          `_Pesan ini dikirim otomatis oleh sistem presensi RFID smk ypk medan._`;
      } else {
        pesanWA = `*PRESENSI DIGITAL SMK YPK MEDAN*\n\n` +
          `⚠️ *PERINGATAN PRESENSI GANDA*\n\n` +
          `👤 *Nama:* ${namaUser}\n` +
          `🏫 *${userType === 'siswa' ? 'Jabatan' : 'Jabatan'}:* ${userType === 'siswa' ? kelasUser : roleUser}\n` +
          `⏰ *Waktu Tap:* ${waktuTap}\n` +
          `📌 *Status:* *SUDAH ABSEN HARI INI*\n\n` +
          `_Sudah melakukan presensi sebelumnya hari ini di smk ypk medan._`;
      }

      const isSent = await sendKirimiWA(noWaTarget, pesanWA);
      if (isSent && absensiId) {
        await supabase.from('absensi').update({ wa_sent: true }).eq('id', absensiId);
      }
    }

    // 4. Respon JSON
    return NextResponse.json({
      success: true,
      type: userType,
      nama: namaUser,
      kelas: kelasUser,
      jurusan: jurusanUser,
      inisial: inisialUser,
      role: roleUser,
      status: finalStatus
    }, { status: 200 });

  } catch (err) {
    console.error("FATAL ERROR:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
