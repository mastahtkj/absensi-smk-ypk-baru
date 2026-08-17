import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

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
      signal: AbortSignal.timeout(3000)
    });

    const resData = await res.json();
    return res.ok && (resData.status === 'success' || resData.success === true || resData.status === 200);
  } catch (err) {
    console.error("[Kirimi.id] Error:", err.message);
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

    // Waktu mulai hari ini jam 00:00:00 (WIB)
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    // 1. Cek User & Cek Apakah Sudah Absen Hari Ini (Secara Paralel)
    const [studentRes, guruRes, existingAbsensi] = await Promise.all([
      supabase.from('rfid_cards').select('nama, kelas, no_hp_ortu, no_wa').eq('rfid_uid', rfidCode).maybeSingle(),
      supabase.from('guru').select('nama, role, no_wa').eq('rfid_uid', rfidCode).maybeSingle(),
      supabase.from('absensi')
        .select('id')
        .eq('rfid_uid', rfidCode)
        .gte('created_at', todayStart)
        .maybeSingle()
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

    // 2. Jika SUDAH ABSEN HARI INI -> Batasi Tap & Jangan Kirim WA Lagi
    if (existingAbsensi.data) {
      return NextResponse.json({
        success: true,
        nama: namaUser,
        kelas: kelasUser,
        status: "SUDAH ABSEN HARI INI"
      }, { status: 200 });
    }

    // 3. Jika BELUM ABSEN -> Simpan Absen & Kirim WA
    const finalStatus = "Hadir";

    (async () => {
      try {
        const [absensiRes] = await Promise.all([
          supabase.from('absensi').insert([{ rfid_uid: rfidCode, nama: namaUser, kelas: kelasUser, status: finalStatus }]).select('id').single(),
          supabase.from('latest_scan').upsert({ id: 1, uid: rfidCode, updated_at: new Date().toISOString() })
        ]);

        if (noWaTarget) {
          const waktuTap = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
          const pesanWA = `*PRESENSI DIGITAL SMK YPK MEDAN*\n\n` +
            `Pemberitahuan presensi kehadiran:\n\n` +
            `👤 *Nama:* ${namaUser}\n` +
            `🏫 *Kelas/Jabatan:* ${kelasUser}\n` +
            `⏰ *Waktu Tap:* ${waktuTap} WIB\n` +
            `📌 *Status Presensi:* *${finalStatus.toUpperCase()}*\n\n` +
            `_Pesan ini dikirim otomatis oleh sistem presensi RFID sekolah._`;

          const isSent = await sendKirimiWA(noWaTarget, pesanWA);
          if (isSent && absensiRes.data?.id) {
            await supabase.from('absensi').update({ wa_sent: true }).eq('id', absensiRes.data.id);
          }
        }
      } catch (bgErr) {
        console.error("[Background Process Error]:", bgErr);
      }
    })();

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
