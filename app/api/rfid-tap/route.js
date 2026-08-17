import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function pengiriman WA Kirimi.id
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

    console.log(`[Kirimi.id] Mengirim WA ke ${formattedPhone}...`);

    const res = await fetch("https://api.kirimi.id/v1/send-message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${secretKey}`
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(4000) // Timeout 4 detik agar tidak menggantung
    });

    const resData = await res.json();
    console.log("[Kirimi.id] Respon API:", JSON.stringify(resData));
    return res.ok && (resData.status === 'success' || resData.success === true || resData.status === 200);
  } catch (err) {
    console.error("[Kirimi.id] Error Kirim WA:", err.message);
    return false;
  }
}

export async function POST(req) {
  try {
    let rawText = "";
    let rfidCode = null;

    // 1. Parsing Body dari ESP8266
    try {
      rawText = await req.text();
      if (rawText) {
        try {
          const jsonBody = JSON.parse(rawText);
          rfidCode = jsonBody.rfid_uid || jsonBody.uid || jsonBody.card_id || jsonBody.rfid;
        } catch {
          rfidCode = rawText.trim().replace(/['"]/g, '');
        }
      }
    } catch (readErr) {
      console.error("[ESP8266] Gagal membaca payload:", readErr);
    }

    if (!rfidCode) {
      return NextResponse.json({ success: false, message: "UID tidak ditemukan" }, { status: 400 });
    }

    // 2. Cari Data Siswa / Guru di Supabase
    let namaUser = "";
    let kelasUser = "";
    let noWaTarget = null;
    let isFound = false;

    const { data: studentCard } = await supabase.from('rfid_cards').select('*').eq('rfid_uid', rfidCode).maybeSingle();

    if (studentCard) {
      isFound = true;
      namaUser = studentCard.nama;
      kelasUser = studentCard.kelas;
      noWaTarget = studentCard.no_hp_ortu || studentCard.no_wa;
    } else {
      const { data: guruCard } = await supabase.from('guru').select('*').eq('rfid_uid', rfidCode).maybeSingle();
      if (guruCard) {
        isFound = true;
        namaUser = guruCard.nama;
        kelasUser = guruCard.role || "Guru";
        noWaTarget = guruCard.no_wa;
      }
    }

    if (!isFound) {
      return NextResponse.json({ success: false, message: "KARTU TIDAK TERDAFTAR" }, { status: 200 });
    }

    const finalStatus = "Hadir";

    // 3. Catat Kehadiran ke Database & Update Log Realtime Paralel
    const [absensiRes] = await Promise.all([
      supabase.from('absensi').insert([{ rfid_uid: rfidCode, nama: namaUser, kelas: kelasUser, status: finalStatus }]).select().single(),
      supabase.from('latest_scan').upsert({ id: 1, uid: rfidCode, updated_at: new Date().toISOString() })
    ]);

    const absensiLog = absensiRes.data;

    // 4. Trigger Pengiriman WA Asinkron (Non-blocking)
    if (noWaTarget) {
      const waktuTap = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
      const pesanWA = `*PRESENSI DIGITAL SMK YPK MEDAN*\n\n` +
        `Pemberitahuan presensi kehadiran:\n\n` +
        `👤 *Nama:* ${namaUser}\n` +
        `🏫 *Kelas/Jabatan:* ${kelasUser}\n` +
        `⏰ *Waktu Tap:* ${waktuTap} WIB\n` +
        `📌 *Status Presensi:* *${finalStatus.toUpperCase()}*\n\n` +
        `_Pesan ini dikirim otomatis oleh sistem presensi RFID sekolah._`;

      // Eksekusi WA tanpa await
      sendKirimiWA(noWaTarget, pesanWA).then(async (isSent) => {
        if (isSent && absensiLog?.id) {
          await supabase.from('absensi').update({ wa_sent: true }).eq('id', absensiLog.id);
        }
      }).catch(err => console.error("[WA Async Error]:", err));
    }

    // 5. Kirimkan respon 200 OK langsung ke alat RFID ESP8266
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
