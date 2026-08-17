import { NextResponse, after } from 'next/server';
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
      body: JSON.stringify(payload)
    });

    const resData = await res.json();
    console.log("[Kirimi.id] Respon API:", JSON.stringify(resData));
    return res.ok && (resData.status === 'success' || resData.success === true || resData.status === 200);
  } catch (err) {
    console.error("[Kirimi.id] Fetch Error:", err);
    return false;
  }
}

export async function POST(req) {
  try {
    let rawText = "";
    let rfidCode = null;

    // 1. Parsing Body cepat
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

    // 2. Query Supabase
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

    // 3. Catat Kehadiran & Update Realtime Log
    const [absensiRes] = await Promise.all([
      supabase.from('absensi').insert([{ rfid_uid: rfidCode, nama: namaUser, kelas: kelasUser, status: finalStatus }]).select().single(),
      supabase.from('latest_scan').upsert({ id: 1, uid: rfidCode, updated_at: new Date().toISOString() })
    ]);

    const absensiLog = absensiRes.data;

    // 4. Pengiriman WA di Background (Tanpa Menahan Respon LCD ESP)
    if (noWaTarget) {
      const waktuTap = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
      const pesanWA = `*PRESENSI DIGITAL SMK YPK MEDAN*\n\n` +
        `Pemberitahuan presensi kehadiran:\n\n` +
        `👤 *Nama:* ${namaUser}\n` +
        `🏫 *Kelas/Jabatan:* ${kelasUser}\n` +
        `⏰ *Waktu Tap:* ${waktuTap} WIB\n` +
        `📌 *Status Presensi:* *${finalStatus.toUpperCase()}*\n\n` +
        `_Pesan ini dikirim otomatis oleh sistem presensi RFID sekolah._`;

      // Fungsi after() memastikan WA dikirim setelah respon HTTP selesai dikirim ke ESP
      after(async () => {
        const isSent = await sendKirimiWA(noWaTarget, pesanWA);
        if (isSent && absensiLog?.id) {
          await supabase.from('absensi').update({ wa_sent: true }).eq('id', absensiLog.id);
        }
      });
    }

    // 5. Langsung kembalikan respon HTTP 200 ke ESP8266
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
