import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { waitUntil } from '@vercel/functions';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper Kirim WA Kirimi.id (Timeout longgar 15 detik untuk background process)
async function sendKirimiWA(phone, message) {
  try {
    let formattedPhone = phone.toString().trim().replace(/[^0-9]/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '62' + formattedPhone.slice(1);
    }

    const secretKey = process.env.KIRIMI_SECRET_KEY || "0a2eae1b7a76fb9709f691fa0ebcff536c86aa1b3247f45eee8ab05e53aae3b1";

    const payload = {
      user_code: "KMQZ4Y0826",
      device_id: "D-H7IJQ",
      secret: secretKey,
      phone: formattedPhone,
      message: message
    };

    console.log(`[Kirimi.id] Memulai kirim WA ke ${formattedPhone}...`);

    const res = await fetch("https://api.kirimi.id/v1/send-message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${secretKey}`
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000)
    });

    const resData = await res.json();
    console.log("[Kirimi.id] Respon API:", resData);
    return res.ok && (resData.status === 'success' || resData.success === true || resData.status === 200);
  } catch (err) {
    console.error("[Kirimi.id] Error Kirim WA:", err.message);
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

    // Tanggal awal hari ini WIB (Asia/Jakarta)
    const todayWibStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
    const startOfDayWib = `${todayWibStr}T00:00:00+07:00`;

    // 1. Cek User & Cek Riwayat Absen Hari Ini Secara Paralel
    const [studentRes, guruRes, existingAbsensi] = await Promise.all([
      supabase.from('rfid_cards').select('nama, kelas, no_hp_ortu, no_wa').eq('rfid_uid', rfidCode).maybeSingle(),
      supabase.from('guru').select('nama, role, no_wa').eq('rfid_uid', rfidCode).maybeSingle(),
      supabase.from('absensi').select('id').eq('rfid_uid', rfidCode).gte('created_at', startOfDayWib).limit(1).maybeSingle()
    ]);

    let namaUser = "";
    let kelasUser = "";
    let noWaTarget = null;
    let isFound = false;

    if (studentRes.data) {
      isFound = true;
      namaUser = studentRes.data.nama;
      kelasUser = studentRes.data.kelas;
      noWaTarget = studentRes.data.no_hp_ortu || studentRes.data.no_wa;
    } else if (guruRes.data) {
      isFound = true;
      namaUser = guruRes.data.nama;
      kelasUser = guruRes.data.role || "Guru";
      noWaTarget = guruRes.data.no_wa;
    }

    if (!isFound) {
      return NextResponse.json({ success: false, message: "KARTU TIDAK TERDAFTAR" }, { status: 200 });
    }

    const isAlreadyScanned = !!existingAbsensi.data;
    const finalStatus = isAlreadyScanned ? "Sudah Absen" : "Hadir";

    // 2. Simpan status scan terakhir
    await supabase.from('latest_scan').upsert({ id: 1, uid: rfidCode, updated_at: new Date().toISOString() });

    let absensiId = null;

    // Simpan ke tabel absensi HANYA jika belum pernah absen hari ini
    if (!isAlreadyScanned) {
      const { data: inserted } = await supabase
        .from('absensi')
        .insert([{ rfid_uid: rfidCode, nama: namaUser, kelas: kelasUser, status: "Hadir" }])
        .select('id')
        .single();
      absensiId = inserted?.id;
    }

    // 3. Jalankan Pengiriman WA di Background (Non-Blocking untuk ESP8266)
    if (noWaTarget) {
      const waktuTap = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
      let pesanWA = "";

      if (!isAlreadyScanned) {
        pesanWA = `*PRESENSI DIGITAL SMK YPK MEDAN*\n\n` +
          `Pemberitahuan Presensi Kehadiran:\n\n` +
          `👤 *Nama:* ${namaUser}\n` +
          `🏫 *Kelas/Jabatan:* ${kelasUser}\n` +
          `⏰ *Waktu Tap:* ${waktuTap} WIB\n` +
          `📌 *Status:* *BERHASIL PRESENSI (HADIR)*\n\n` +
          `_Pesan otomatis dari sistem presensi RFID sekolah._`;
      } else {
        pesanWA = `*PRESENSI DIGITAL SMK YPK MEDAN*\n\n` +
          `⚠️ *PERINGATAN PRESENSI GANDA*\n\n` +
          `👤 *Nama:* ${namaUser}\n` +
          `🏫 *Kelas/Jabatan:* ${kelasUser}\n` +
          `⏰ *Waktu Tap:* ${waktuTap} WIB\n` +
          `📌 *Status:* *SUDAH ABSEN HARI INI*\n\n` +
          `_Siswa/Guru ini sudah melakukan presensi sebelumnya hari ini._`;
      }

      // Vercel waitUntil menjaga proses kirim WA tetap berjalan setelah respon dikirim ke alat
      waitUntil(
        sendKirimiWA(noWaTarget, pesanWA).then(async (isSent) => {
          if (isSent && absensiId) {
            await supabase.from('absensi').update({ wa_sent: true }).eq('id', absensiId);
          }
        })
      );
    }

    // 4. Langsung kembalikan respon HTTP 200 ke ESP8266 (< 0.2 detik)
    return NextResponse.json({
      success: true,
      nama: namaUser,
      kelas: kelasUser,
      status: finalStatus
    }, { status: 200 });

  } catch (err) {
    console.error("FATAL ERROR:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
