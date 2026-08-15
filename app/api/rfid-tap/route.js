import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

// Konfigurasi Kirimi.id WhatsApp API
const KIRIMI_TOKEN = process.env.KIRIMI_TOKEN || "ce587a87163c4eb3a1b72a42b0bbff5a643ef082ed6efdf5c9078129ca66a5e1.51aa1197";
const KIRIMI_DEVICE_ID = process.env.KIRIMI_DEVICE_ID || "698c9497e8ec8e0ef31df251";

/**
 * Fungsi Pengiriman Pesan WhatsApp via Kirimi.id API
 */
async function sendKirimiWA(phone, message) {
  try {
    if (!phone) {
      console.log('❌ Nomor telepon kosong, tidak mengirim WA');
      return false;
    }

    // Format nomor HP ke standar 62...
    let cleanPhone = phone.toString().replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1);
    }

    console.log(`📤 Mengirim WhatsApp ke ${cleanPhone}...`);

    const response = await fetch('https://api.kirimi.id/v1/send-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${KIRIMI_TOKEN}`
      },
      body: JSON.stringify({
        device_id: KIRIMI_DEVICE_ID,
        phone: cleanPhone,
        message: message
      })
    });

    const resJson = await response.json();
    console.log('📩 Respon Kirimi.id:', resJson);
    return resJson;
  } catch (error) {
    console.error('❌ Error kirim WhatsApp via Kirimi.id:', error);
    return false;
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    console.log("📥 Payload Diterima dari ESP8266:", body);

    const rawUid = body.rfid_uid || body.uid;
    const statusBody = body.status || 'Hadir'; // 'Hadir' / 'Telat' / 'Hadir (TEST)'

    if (!rawUid) {
      return NextResponse.json({ error: 'UID RFID tidak ditemukan dalam payload' }, { status: 400 });
    }

    const cleanUid = rawUid.toString().trim().toUpperCase();

    // =========================================================
    // 1. CARI DATA SISWA DI TABEL rfid_cards
    // Kompatibel untuk kolom 'uid' maupun 'rfid_uid'
    // =========================================================
    const { data: siswa, error: findError } = await supabase
      .from('rfid_cards')
      .select('*')
      .or(`uid.eq.${cleanUid},rfid_uid.eq.${cleanUid}`)
      .maybeSingle();

    if (findError) {
      console.error('❌ Error database pencarian siswa:', findError);
    }

    // =========================================================
    // 2. JIKA KARTU BELUM TERDAFTAR (KARTU BARU)
    // =========================================================
    if (!siswa) {
      console.log(`⚠️ Kartu Baru Terdeteksi: ${cleanUid}. Mendaftarkan ke rfid_cards...`);

      const { data: newCard, error: insertCardError } = await supabase
        .from('rfid_cards')
        .insert([{
          uid: cleanUid,
          rfid_uid: cleanUid,
          nama: 'Kartu Baru (Belum Ditentukan)',
          status_kartu: 'Unassigned',
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (insertCardError) {
        console.error('❌ Gagal merestruktur kartu baru:', insertCardError);
      }

      // Kirim WA Notifikasi Kartu Baru ke Admin/Petugas (Opsional)
      const adminPhone = "6289650058914"; 
      const messageAdmin = `🔔 *DETEKSI KARTU RFID BARU*\n\nADA KARTU RFID BARU TER-TAP PADA ALAT!\n- *UID RFID:* ${cleanUid}\n- *WAKTU:* ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n\nSilakan daftarkan nama siswa pemilik kartu ini di dashboard Supabase/Web Admin.`;
      
      sendKirimiWA(adminPhone, messageAdmin);

      return NextResponse.json({
        success: true,
        is_new_card: true,
        message: 'Kartu baru berhasil didaftarkan sebagai Unassigned.',
        uid: cleanUid
      }, { status: 200 });
    }

    // =========================================================
    // 3. JIKA KARTU SUDAH TERDAFTAR (PROSES ABSENSI)
    // =========================================================
    
    // Tentukan Status Absensi (Hadir vs Telat)
    // Menggunakan penentuan waktu lokal Indonesia (WIB)
    const nowWib = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const jam = nowWib.getHours();
    const menit = nowWib.getMinutes();
    
    let finalStatus = statusBody;

    // Jika dari mode resmi (bukan TEST), otomatis hitung status terlambat jika lewat jam 07:00
    if (!statusBody.includes('(TEST)')) {
      if (jam > 7 || (jam === 7 && menit > 0)) {
        finalStatus = 'Telat';
      } else {
        finalStatus = 'Hadir';
      }
    }

    const waktuStr = nowWib.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const tanggalStr = nowWib.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // Insert ke tabel log Absensi
    const { data: logAbsen, error: insertAbsenError } = await supabase
      .from('absensi')
      .insert([{
        rfid_uid: cleanUid,
        nama: siswa.nama || 'Siswa',
        kelas: siswa.kelas || '-',
        status: finalStatus,
        waktu: waktuStr,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (insertAbsenError) {
      console.error('❌ Gagal mencatat absensi ke database:', insertAbsenError);
      return NextResponse.json({ error: 'Gagal mencatat absensi', details: insertAbsenError }, { status: 500 });
    }

    console.log('✅ Berhasil mencatat absensi:', logAbsen);

    // =========================================================
    // 4. KIRIM NOTIFIKASI WHATSAPP KE ORANG TUA / SISWA
    // =========================================================
    const phoneTarget = siswa.no_hp || siswa.phone || siswa.whatsapp;

    if (phoneTarget) {
      let waMessage = "";

      if (finalStatus.includes('Telat')) {
        waMessage = `⚠️ *NOTIFIKASI KETERLAMBATAN SISWA*\n\n` +
                    `Yth. Bapak/Ibu Orang Tua/Wali dari:\n` +
                    `👤 *Nama:* ${siswa.nama}\n` +
                    `🏫 *Kelas:* ${siswa.kelas || '-'}\n` +
                    `⏰ *Waktu Tap:* ${waktuStr} WIB\n` +
                    `📅 *Tanggal:* ${tanggalStr}\n` +
                    `📌 *Status:* TERLAMBAT\n\n` +
                    `Anak Anda tercatat tiba di sekolah melebihi batas waktu toleransi (07:00 WIB). Mohon perhatiannya agar siswa dapat hadir lebih awal. Terima kasih.\n\n` +
                    `_SMK YPK MEDAN - Presensi Digital_`;
      } else {
        waMessage = `✅ *NOTIFIKASI KEHADIRAN SISWA*\n\n` +
                    `Yth. Bapak/Ibu Orang Tua/Wali dari:\n` +
                    `👤 *Nama:* ${siswa.nama}\n` +
                    `🏫 *Kelas:* ${siswa.kelas || '-'}\n` +
                    `⏰ *Waktu Tap:* ${waktuStr} WIB\n` +
                    `📅 *Tanggal:* ${tanggalStr}\n` +
                    `📌 *Status:* HADIR (Tepat Waktu)\n\n` +
                    `Anak Anda telah tiba di sekolah dan melakukan presensi dengan selamat. Terima kasih.\n\n` +
                    `_SMK YPK MEDAN - Presensi Digital_`;
      }

      // Jalankan pengiriman WA secara background
      sendKirimiWA(phoneTarget, waMessage);
    } else {
      console.log(`⚠️ Nomor HP untuk ${siswa.nama} tidak ditemukan di database rfid_cards.`);
    }

    return NextResponse.json({
      success: true,
      is_new_card: false,
      message: 'Absensi berhasil dicatat dan WA terkirim.',
      data: logAbsen
    }, { status: 200 });

  } catch (err) {
    console.error('❌ Server Internal Error:', err);
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}
