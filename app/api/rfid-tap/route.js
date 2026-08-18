import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Konfigurasi API Kirimi.id berdasarkan gambar
const KIRIMI_USER_CODE = 'KMQZ4Y0826';
const KIRIMI_SECRET = '0a2eae1b7a76fb9709f691fa0ebcf2536c86aa1b3247f45eee8ab05e53aae3b1';
const KIRIMI_DEVICE_ID = 'D-H7IJQ';
const KIRIMI_API_URL = 'https://api.kirimi.id/v1/send-message';

// Helper Function: Format Nomor WA ke format Internasional (misal 0812 -> 62812)
function formatPhoneNumber(phone) {
  if (!phone) return null;
  let cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  }
  return cleaned;
}

// Helper Function: Kirim WhatsApp via Kirimi.id
async function sendWhatsAppMessage(targetNumber, messageText) {
  const formattedNumber = formatPhoneNumber(targetNumber);
  if (!formattedNumber) return false;

  try {
    const response = await fetch(KIRIMI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_code: KIRIMI_USER_CODE,
        secret: KIRIMI_SECRET,
        device_id: KIRIMI_DEVICE_ID,
        to: formattedNumber,
        message: messageText,
      }),
    });

    const result = await response.json();
    return response.ok;
  } catch (err) {
    console.error('Gagal mengirim WhatsApp:', err);
    return false;
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const rawUid = body.rfid_uid || body.uid_rfid;
    const statusTap = body.status || 'Hadir';

    if (!rawUid) {
      return NextResponse.json(
        { success: false, message: 'UID RFID tidak ditemukan' },
        { status: 400 }
      );
    }

    const cleanUid = String(rawUid).trim().toUpperCase();

    // 1. CARI DATA DI TABEL tb_siswa
    const { data: siswa } = await supabase
      .from('tb_siswa')
      .select('*')
      .eq('uid_rfid', cleanUid)
      .maybeSingle();

    if (siswa) {
      // Catat ke log absensi
      await supabase.from('absensi').insert([
        {
          rfid_uid: cleanUid,
          nama: siswa.nama_siswa,
          kelas: siswa.kelas,
          status: statusTap,
          created_at: new Date().toISOString(),
        },
      ]);

      // Update UID di latest_scan untuk mode pairing/registrasi
      await supabase.from('latest_scan').upsert([{ id: 1, uid: cleanUid }]);

      // Format Pesan WhatsApp Orang Tua & Siswa
      const waktuWib = new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta',
      });

      const pesanWa = 
`*PRESENSI DIGITAL SMK YPK MEDAN*
-----------------------------------------
Yth. Bapak/Ibu Orang Tua/Wali,

Pemberitahuan bahwa siswa berikut:
👤 *Nama:* ${siswa.nama_siswa}
🏫 *Kelas:* ${siswa.kelas}
📚 *Jurusan:* ${siswa.jurusan}
⏰ *Waktu:* ${waktuWib} WIB
📌 *Status:* ${statusTap}

Telah berhasil melakukan presensi di sekolah.
Terima Kasih.`;

      // Kirim WA Paralel ke Ortu dan Pribadi (jika ada)
      if (siswa.no_wa_ortu) {
        sendWhatsAppMessage(siswa.no_wa_ortu, pesanWa);
      }
      if (siswa.no_wa_pribadi) {
        sendWhatsAppMessage(siswa.no_wa_pribadi, pesanWa);
      }

      return NextResponse.json(
        {
          success: true,
          type: 'siswa',
          nama: siswa.nama_siswa,
          kelas: siswa.kelas,
          jurusan: siswa.jurusan,
          status: statusTap,
        },
        { status: 200 }
      );
    }

    // 2. CARI DATA DI TABEL tb_guru (JIKA SISWA TIDAK DITEMUKAN)
    const { data: guru } = await supabase
      .from('tb_guru')
      .select('*')
      .eq('uid_rfid', cleanUid)
      .maybeSingle();

    if (guru) {
      await supabase.from('absensi').insert([
        {
          rfid_uid: cleanUid,
          nama: guru.nama_guru,
          kelas: guru.role === 'admin' ? "MASTER'K" : 'Guru / Staff',
          status: statusTap,
          created_at: new Date().toISOString(),
        },
      ]);

      await supabase.from('latest_scan').upsert([{ id: 1, uid: cleanUid }]);

      return NextResponse.json(
        {
          success: true,
          type: 'guru',
          nama: guru.nama_guru,
          inisial: guru.inisial || '-',
          role: guru.role || 'Guru',
          status: statusTap,
        },
        { status: 200 }
      );
    }

    // 3. JIKA CARD BELUM TERDAFTAR (UNTUK REGISTRASI KARTU BARU)
    await supabase.from('latest_scan').upsert([{ id: 1, uid: cleanUid }]);

    return NextResponse.json(
      {
        success: false,
        message: 'Kartu RFID Belum Terdaftar!',
        uid: cleanUid,
      },
      { status: 404 }
    );
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}
