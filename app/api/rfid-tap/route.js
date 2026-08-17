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
    console.error("Kirimi.id Error:", err);
    return false;
  }
}

export async function POST(req) {
  try {
    let rawText = "";
    let rfidCode = null;

    // 1. Parsing Body (Mendukung rfid_uid dari ESP)
    try {
      rawText = await req.text();
      console.log("Payload Masuk Dari ESP8266:", rawText);

      if (rawText) {
        try {
          const jsonBody = JSON.parse(rawText);
          rfidCode = jsonBody.rfid_uid || jsonBody.uid || jsonBody.card_id || jsonBody.rfid;
        } catch {
          rfidCode = rawText.trim().replace(/['"]/g, '');
        }
      }
    } catch (readErr) {
      console.error("Gagal membaca payload:", readErr);
    }

    if (!rfidCode) {
      console.error("UID Kosong/Tidak Ditemukan. Data yang diterima:", rawText);
      return NextResponse.json({ 
        success: false, 
        message: "UID kartu tidak ditemukan dalam request." 
      }, { status: 400 });
    }

    // Update realtime monitoring pada tabel latest_scan
    await supabase
      .from('latest_scan')
      .upsert({ id: 1, uid: rfidCode, updated_at: new Date().toISOString() });

    let namaUser = "";
    let kelasUser = "";
    let noWaTarget = null;
    let isFound = false;

    // 2. Cari di tabel rfid_cards (Siswa)
    const { data: studentCard } = await supabase
      .from('rfid_cards')
      .select('*')
      .eq('rfid_uid', rfidCode)
      .maybeSingle();

    if (studentCard) {
      isFound = true;
      namaUser = studentCard.nama;
      kelasUser = studentCard.kelas;
      noWaTarget = studentCard.no_hp_ortu || studentCard.no_wa;
    } else {
      // 3. Jika tidak ada di rfid_cards, cari di tabel guru
      const { data: guruCard } = await supabase
        .from('guru')
        .select('*')
        .eq('rfid_uid', rfidCode)
        .maybeSingle();

      if (guruCard) {
        isFound = true;
        namaUser = guruCard.nama;
        kelasUser = guruCard.role || "Guru";
        noWaTarget = guruCard.no_wa;
      }
    }

    if (!isFound) {
      console.warn(`Kartu tidak terdaftar: ${rfidCode}`);
      return NextResponse.json({ 
        success: false, 
        message: "KARTU TIDAK TERDAFTAR" 
      }, { status: 200 });
    }

    const finalStatus = "Hadir";

    // 4. Catat ke tabel absensi
    const { data: absensiLog, error: absensiErr } = await supabase
      .from('absensi')
      .insert([{ rfid_uid: rfidCode, nama: namaUser, kelas: kelasUser, status: finalStatus }])
      .select()
      .single();

    if (absensiErr) {
      console.error("Error Simpan Absensi:", absensiErr);
    }

    // 5. Pengiriman WA Asynchronous (Background)
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
      }).catch(err => console.error("WA Background Fail:", err));
    }

    return NextResponse.json({
      success: true,
      nama: namaUser,
      kelas: kelasUser,
      status: finalStatus
    }, { status: 200 });

  } catch (err) {
    console.error("FATAL API ERROR:", err);
    return NextResponse.json({ 
      success: false, 
      error: err.message || "Internal Server Error" 
    }, { status: 500 });
  }
}
