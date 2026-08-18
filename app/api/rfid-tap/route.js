import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const KIRIMI_USER_CODE = 'KMQZ4Y0826';
const KIRIMI_SECRET = '0a2eae1b7a76fb9709f691fa0ebcf2536c86aa1b3247f45eee8ab05e53aae3b1';
const KIRIMI_DEVICE_ID = 'D-H7IJQ';
const KIRIMI_API_URL = 'https://api.kirimi.id/v1/send-message';

function formatPhoneNumber(phone) {
  if (!phone) return null;
  let cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  }
  return cleaned.length >= 10 ? cleaned : null;
}

// Fungsi Kirim WA Tanpa AbortController (Bebas Timeout)
async function sendWhatsAppMessage(targetNumber, messageText) {
  const formattedNumber = formatPhoneNumber(targetNumber);
  if (!formattedNumber) return false;

  try {
    const response = await fetch(KIRIMI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        user_code: KIRIMI_USER_CODE,
        secret: KIRIMI_SECRET,
        device_id: KIRIMI_DEVICE_ID,
        to: formattedNumber,
        message: messageText,
      }),
      cache: 'no-store',
    });

    const result = await response.json().catch(() => ({}));
    console.log(`[Kirimi.id Logs] ${response.status} -> ${formattedNumber}:`, result);
    return response.ok;
  } catch (err) {
    console.error(`[Kirimi.id Error] ${formattedNumber}:`, err.message);
    return false;
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const rawUid = body.rfid_uid || body.uid_rfid || body.uid;
    const statusTap = body.status || 'Hadir';

    if (!rawUid) {
      return NextResponse.json({ success: false, message: 'UID RFID tidak ditemukan' }, { status: 400 });
    }

    const cleanUid = String(rawUid).trim().toUpperCase();

    // 1. CARI SISWA
    const { data: siswa } = await supabase
      .from('tb_siswa')
      .select('id_siswa, uid_rfid, nama_siswa, kelas, jurusan, no_wa_pribadi, no_wa_ortu')
      .eq('uid_rfid', cleanUid)
      .maybeSingle();

    if (siswa) {
      const waktuWib = new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta',
      });

      await Promise.allSettled([
        supabase.from('absensi').insert([{
          rfid_uid: cleanUid,
          nama: siswa.nama_siswa,
          kelas: siswa.kelas,
          status: statusTap,
          created_at: new Date().toISOString(),
        }]),
        supabase.from('latest_scan').upsert([{ id: 1, uid: cleanUid, updated_at: new Date().toISOString() }])
      ]);

      const pesanWa = `*PRESENSI DIGITAL SMK YPK MEDAN*\n-----------------------------------------\nYth. Bapak/Ibu Orang Tua/Wali,\n\nPemberitahuan presensi siswa:\n- *Nama:* ${siswa.nama_siswa}\n- *Kelas:* ${siswa.kelas}\n- *Jurusan:* ${siswa.jurusan}\n- *Waktu:* ${waktuWib} WIB\n- *Status:* ${statusTap}\n\nTelah berhasil melakukan presensi di sekolah.\nTerima Kasih.`;

      const listNomor = [siswa.no_wa_ortu, siswa.no_wa_pribadi].filter(Boolean);

      // Jalankan pengiriman WA di latar belakang (Background Process)
      listNomor.forEach((nomor) => sendWhatsAppMessage(nomor, pesanWa));

      return NextResponse.json({
        success: true,
        type: 'siswa',
        nama: siswa.nama_siswa,
        kelas: siswa.kelas,
        status: statusTap,
        info: 'Proses pengiriman WA dipicu di latar belakang',
      }, { status: 200 });
    }

    // 2. CARI GURU
    const { data: guru } = await supabase
      .from('tb_guru')
      .select('id_guru, uid_rfid, nama_guru, inisial, role, no_wa_pribadi')
      .eq('uid_rfid', cleanUid)
      .maybeSingle();

    if (guru) {
      const waktuWib = new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta',
      });

      const jabatan = guru.role === 'admin' ? "MASTER'K" : 'Guru / Staff';

      await Promise.allSettled([
        supabase.from('absensi').insert([{
          rfid_uid: cleanUid,
          nama: guru.nama_guru,
          kelas: jabatan,
          status: statusTap,
          created_at: new Date().toISOString(),
        }]),
        supabase.from('latest_scan').upsert([{ id: 1, uid: cleanUid, updated_at: new Date().toISOString() }])
      ]);

      const pesanWaGuru = `*PRESENSI KEHADIRAN GURU / STAFF*\n*SMK YPK MEDAN*\n-----------------------------------------\nYth. ${guru.nama_guru},\n\nPemberitahuan presensi:\n- *Nama:* ${guru.nama_guru}\n- *Inisial:* ${guru.inisial || '-'}\n- *Peran:* ${guru.role || 'Guru'}\n- *Waktu:* ${waktuWib} WIB\n- *Status:* ${statusTap}\n\nPresensi Anda telah berhasil dicatat.\nSelamat bertugas!`;

      // Jalankan pengiriman WA guru di latar belakang
      if (guru.no_wa_pribadi) {
        sendWhatsAppMessage(guru.no_wa_pribadi, pesanWaGuru);
      }

      return NextResponse.json({
        success: true,
        type: 'guru',
        nama: guru.nama_guru,
        status: statusTap,
        info: 'Proses pengiriman WA dipicu di latar belakang',
      }, { status: 200 });
    }

    // 3. KARTU UNREGISTERED
    await supabase.from('latest_scan').upsert([{ id: 1, uid: cleanUid, updated_at: new Date().toISOString() }]);

    return NextResponse.json({
      success: false,
      message: 'Kartu RFID Belum Terdaftar!',
      uid: cleanUid,
    }, { status: 404 });

  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
