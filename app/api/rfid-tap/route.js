import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase'; // Sesuaikan path supabase client Anda

export async function POST(req) {
  try {
    // 1. Parsing JSON secara aman
    let body;
    try {
      body = await req.json();
    } catch (parseErr) {
      console.error("Error parsing JSON body from ESP:", parseErr);
      return NextResponse.json({ success: false, message: "Invalid JSON format" }, { status: 400 });
    }

    const { uid, card_id } = body; 
    const rfidCode = uid || card_id; // Mengambil UID dari ESP

    if (!rfidCode) {
      return NextResponse.json({ success: false, message: "UID kartu tidak dikirim" }, { status: 400 });
    }

    // 2. Query ke Supabase dengan null check
    const { data: cardData, error: cardError } = await supabase
      .from('rfid_cards')
      .select('*, guru(*)')
      .eq('card_number', rfidCode)
      .single();

    if (cardError || !cardData) {
      console.warn(`Kartu tidak terdaftar: ${rfidCode}`);
      return NextResponse.json({ success: false, message: "KARTU TIDAK TERDAFTAR" }, { status: 200 }); // Retun 200 agar LCD ESP tidak bilang 'Gagal Koneksi'
    }

    const namaUser = cardData.guru?.nama || "Guru/Staf";
    const kelasUser = cardData.guru?.jabatan || "Staf";
    const noWaTarget = cardData.guru?.no_hp || null;
    const finalStatus = "Hadir";

    // 3. Simpan ke tabel Absensi
    const { data: absensiLog, error: absensiErr } = await supabase
      .from('absensi')
      .insert([{ nama: namaUser, status: finalStatus, rfid_code: rfidCode }])
      .select()
      .single();

    if (absensiErr) {
      console.error("Error Simpan Absensi:", absensiErr);
    }

    // 4. Pengiriman WA secara Asynchronous (Background Process)
    if (noWaTarget && typeof sendKirimiWA === 'function') {
      const pesanWA = `*PRESENSI DIGITAL SMK YPK MEDAN*\n\n` +
        `👤 *Nama:* ${namaUser}\n` +
        `📌 *Status:* ${finalStatus.toUpperCase()}`;

      // Jangan gunakan await agar ESP langsung dapat respon kilat
      sendKirimiWA(noWaTarget, pesanWA).catch(err => console.error("Error WA Background:", err));
    }

    // 5. Kirim respon sukses 200 OK ke ESP8266
    return NextResponse.json({
      success: true,
      nama: namaUser,
      kelas: kelasUser,
      status: finalStatus
    }, { status: 200 });

  } catch (err) {
    // Menangkap semua fatal error agar Vercel Log menampilkan detail baris yang rusak
    console.error("FATAL API ROUTE ERROR:", err);
    return NextResponse.json({ 
      success: false, 
      error: err.message || "Internal Server Error" 
    }, { status: 500 });
  }
}
