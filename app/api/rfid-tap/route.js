import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Konfigurasi Kirimi.id
const KIRIMI_USER_CODE = 'KMQZ4Y0826';
const KIRIMI_SECRET = '0a2eae1b7a76fb9709f691fa0ebcf2536c86aa1b3247f45eee8ab05e53aae3b1';
const KIRIMI_DEVICE_ID = 'D-H7IJQ';
const KIRIMI_API_URL = 'https://api.kirimi.id/v1/send-message';

// Helper: Format Nomor ke Standar Internasional (misal 0812 -> 62812)
function formatPhoneNumber(phone) {
  if (!phone) return null;
  let cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  }
  return cleaned;
}

// Helper: Kirim Pesan via Kirimi.id
async function sendWhatsAppMessage(targetNumber, messageText) {
  const formattedNumber = formatPhoneNumber(targetNumber);
  if (!formattedNumber) return false;

  try {
    const res = await fetch(KIRIMI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_code: KIRIMI_USER_CODE,
        secret: KIRIMI_SECRET,
        device_id: KIRIMI_DEVICE_ID,
        device: KIRIMI_DEVICE_ID,
        to: formattedNumber,
        message: messageText,
      }),
    });

    const resData = await res.json().catch(() => ({}));
    console.log(`[Kirimi.id] Response (${formattedNumber}):`, resData);
    return res.ok;
  } catch (err) {
    console.error('[Kirimi.id] Error:', err);
    return false;
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const rawUid = body.rfid_uid || body.uid_rfid || body.uid;
    const statusTap = body.status || 'Hadir';

    if (!rawUid) {
      return NextResponse.json(
        { success: false, message: 'UID RFID tidak ditemukan' },
        { status: 400 }
      );
    }

    const cleanUid = String(rawUid).trim().toUpperCase();

    // 1. CEK TABEL SISWA
    const { data: siswa } = await supabase
      .from('tb_siswa')
      .select('*')
      .eq('uid_rfid', cleanUid)
      .maybeSingle();

    if (siswa) {
      const waktuWib = new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta',
      });

      // Insert Log Absensi & Update Scan Terakhir secara Paralel
      await Promise.all([
        supabase.from('absensi').insert([
          {
            rfid_uid: cleanUid,
            nama: siswa.nama_siswa,
            kelas: siswa.kelas,
            status: statusTap,
            created_at: new Date().toISOString(),
          },
        ]),
        supabase.from('latest_scan').upsert([{ id: 1, uid: cleanUid }]),
      ]);

      // Format Pesan WA dengan Emoji UTF-8 Valid
      const pesanWa = 
`*PRESENSI DIGITAL SMK YPK MEDAN*
-----------------------------------------
Yth. Bapak/Ibu Orang Tua/Wali,

Pemberitahuan presensi siswa:
👤 *Nama:* ${siswa.nama_siswa}
🏫 *Kelas:* ${siswa.kelas}
📚 *Jurusan:* ${siswa.jurusan || '-'}
⏰ *Waktu:* ${waktuWib} WIB
📌 *Status:* ${statusTap}

Telah berhasil melakukan presensi di sekolah.
Terima Kasih.`;

      // Kumpulkan Tugas Kirim WA
      const waTasks = [];
      if (siswa.no_wa_ortu) waTasks.push(sendWhatsAppMessage(siswa.no_wa_ortu, pesanWa));
      if (siswa.no_wa_pribadi) waTasks.push(sendWhatsAppMessage(siswa.no_wa_pribadi, pesanWa));

      // Wajib AWAIIT agar Vercel Serverless tidak mematikan request di tengah jalan
      if (waTasks.length > 0) {
        await Promise.allSettled(waTasks);
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

    // 2. CEK TABEL GURU
    const { data: guru } = await supabase
      .from('tb_guru')
      .select('*')
      .eq('uid_rfid', cleanUid)
      .maybeSingle();

    if (guru) {
      await Promise.all([
        supabase.from('absensi').insert([
          {
            rfid_uid: cleanUid,
            nama: guru.nama_guru,
            kelas: guru.role === 'admin' ? "MASTER'K" : 'Guru / Staff',
            status: statusTap,
            created_at: new Date().toISOString(),
          },
        ]),
        supabase.from('latest_scan').upsert([{ id: 1, uid: cleanUid }]),
      ]);

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

    // 3. JIKA KARTU BELUM TERDAFTAR (UNREGISTERED)
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
