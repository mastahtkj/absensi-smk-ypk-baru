import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Inisialisasi Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function WA Kirimi.id
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
    // 1. Parsing Body Fleksibel (Mendukung JSON berbagai key & Plain Text)
    let rawText = "";
    let rfidCode = null;

    try {
      rawText = await req.text();
      console.log(" Payload Masuk Dari ESP8266:", rawText);

      if (rawText) {
        try {
          const jsonBody = JSON.parse(rawText);
          // Deteksi otomatis berbagai kemungkinan nama field dari kodingan Arduino/ESP
          rfidCode = jsonBody.uid || jsonBody.card_id || jsonBody.rfid || jsonBody.card_number || jsonBody.code || jsonBody.id;
        } catch {
          // Jika ESP mengirimkan UID string polos (bukan format JSON)
          rfidCode = rawText.trim().replace(/['"]/g, '');
        }
      }
    } catch (readErr) {
      console.error(" Gagal membaca payload:", readErr);
    }

    // Jika UID tetap tidak terdeteksi
    if (!rfidCode) {
      console.error(" UID Kosong/Tidak Ditemukan. Data yang diterima:", rawText);
      return NextResponse.json({ 
        success: false, 
        message: "UID kartu tidak ditemukan dalam request." 
      }, { status: 400 });
    }

    // 2. Cari Kartu di Database Supabase
    const { data: cardData, error: cardError } = await supabase
      .from('rfid_cards')
      .select('*, guru(*)')
      .eq('card_number', rfidCode)
      .single();

    if (cardError || !cardData) {
      console.warn(` Kartu tidak terdaftar: ${rfidCode}`);
      return NextResponse.json({ 
        success: false, 
        message: "KARTU TIDAK TERDAFTAR" 
      }, { status: 200 }); // Status 200 agar LCD alat tidak mendeteksi error jaringan
    }

    const namaUser = cardData.guru?.nama || "Guru/Staf";
    const kelasUser = cardData.guru?.jabatan || "Staf";
    const noWaTarget = cardData.guru?.no_hp || null;
    const finalStatus = "Hadir";

    // 3. Simpan ke Tabel Absensi
    const { data: absensiLog, error: absensiErr } = await supabase
      .from('absensi')
      .insert([{ nama: namaUser, status: finalStatus, rfid_code: rfidCode }])
      .select()
      .single();

    if (absensiErr) {
      console.error(" Error Simpan Absensi:", absensiErr);
    }

    // 4. Pengiriman WA Asynchronous (Background Process)
    if (noWaTarget) {
      const waktuTap = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
      const pesanWA = `*PRESENSI DIGITAL SMK YPK MEDAN*\n\n` +
        `Pemberitahuan presensi kehadiran:\n\n` +
        `👤 *Nama:* ${namaUser}\n` +
        `🏫 *Kelas/Jabatan:* ${kelasUser}\n` +
        `⏰ *Waktu Tap:* ${waktuTap} WIB\n` +
        `📌 *Status Presensi:* *${finalStatus.toUpperCase()}*\n\n` +
        `_Pesan ini dikirim otomatis oleh sistem presensi RFID sekolah._`;

      sendKirimiWA(noWaTarget, pesanWA).then(async (isSent) => {
        if (isSent && absensiLog?.id) {
          await supabase.from('absensi').update({ wa_sent: true }).eq('id', absensiLog.id);
        }
      }).catch(err => console.error(" WA Background Fail:", err));
    }

    // 5. Kembalikan Respon Sukses ke ESP8266
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
