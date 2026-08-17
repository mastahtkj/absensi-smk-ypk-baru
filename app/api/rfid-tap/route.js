import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Inisialisasi Supabase Client secara langsung
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function untuk pengiriman WA via Kirimi.id
async function sendKirimiWA(phone, message) {
  try {
    const payload = {
      user_code: "KMQZ4Y0826",
      device_id: "D-H7IJQ",
      phone: phone,
      message: message
    };

    const res = await fetch("https://api.kirimi.id/v1/send-message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.KIRIMI_SECRET_KEY || ''}`
      },
      body: JSON.stringify(payload)
    });

    const resData = await res.json();
    return res.ok && resData.status === 'success';
  } catch (err) {
    console.error(" Kirimi.id Error:", err);
    return false;
  }
}

export async function POST(req) {
  try {
    // 1. Safe JSON Parsing dari ESP8266
    let body;
    try {
      body = await req.json();
    } catch (parseErr) {
      console.error(" Error parsing JSON body:", parseErr);
      return NextResponse.json({ success: false, message: "Invalid JSON format" }, { status: 400 });
    }

    const { uid, card_id } = body;
    const rfidCode = uid || card_id;

    if (!rfidCode) {
      return NextResponse.json({ success: false, message: "UID kartu tidak ditemukan" }, { status: 400 });
    }

    // 2. Cari Kartu di Database
    const { data: cardData, error: cardError } = await supabase
      .from('rfid_cards')
      .select('*, guru(*)')
      .eq('card_number', rfidCode)
      .single();

    if (cardError || !cardData) {
      console.warn(` Kartu tidak terdaftar: ${rfidCode}`);
      // Mengembalikan HTTP 200 agar LCD ESP tidak muncul 'Gagal Koneksi'
      return NextResponse.json({ 
        success: false, 
        message: "KARTU TIDAK TERDAFTAR" 
      }, { status: 200 });
    }

    const namaUser = cardData.guru?.nama || "Guru/Staf";
    const kelasUser = cardData.guru?.jabatan || "Staf";
    const noWaTarget = cardData.guru?.no_hp || null;
    const finalStatus = "Hadir";

    // 3. Catat Absensi Ke Database
    const { data: absensiLog, error: absensiErr } = await supabase
      .from('absensi')
      .insert([{ nama: namaUser, status: finalStatus, rfid_code: rfidCode }])
      .select()
      .single();

    if (absensiErr) {
      console.error(" Error Simpan Absensi:", absensiErr);
    }

    // 4. Pengiriman WhatsApp Asynchronous (Background Process)
    if (noWaTarget) {
      const waktuTap = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
      const pesanWA = `*PRESENSI DIGITAL SMK YPK MEDAN*\n\n` +
        `Pemberitahuan presensi kehadiran:\n\n` +
        `👤 *Nama:* ${namaUser}\n` +
        `🏫 *Kelas/Jabatan:* ${kelasUser}\n` +
        `⏰ *Waktu Tap:* ${waktuTap} WIB\n` +
        `📌 *Status Presensi:* *${finalStatus.toUpperCase()}*\n\n` +
        `_Pesan ini dikirim otomatis oleh sistem presensi RFID sekolah._`;

      // Tanpa 'await' agar HTTP Response langsung dibalas seketika ke ESP8266
      sendKirimiWA(noWaTarget, pesanWA).then(async (isSent) => {
        if (isSent && absensiLog?.id) {
          await supabase.from('absensi').update({ wa_sent: true }).eq('id', absensiLog.id);
        }
      }).catch(err => console.error(" Background WA Fail:", err));
    }

    // 5. Kembalikan Response Sukses ke ESP8266
    return NextResponse.json({
      success: true,
      nama: namaUser,
      kelas: kelasUser,
      status: finalStatus
    }, { status: 200 });

  } catch (err) {
    console.error(" FATAL API ERROR:", err);
    return NextResponse.json({ 
      success: false, 
      error: err.message || "Internal Server Error" 
    }, { status: 500 });
  }
}
