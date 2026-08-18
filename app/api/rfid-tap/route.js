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

async function sendWhatsAppMessage(targetNumber, messageText) {
  const formattedNumber = formatPhoneNumber(targetNumber);
  if (!formattedNumber) return false;

  try {
    const res = await fetch(KIRIMI_API_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        user_code: KIRIMI_USER_CODE,
        secret: KIRIMI_SECRET,
        device_id: KIRIMI_DEVICE_ID,
        device: KIRIMI_DEVICE_ID,
        to: formattedNumber,
        phone_no: formattedNumber,
        phone: formattedNumber,
        message: messageText,
        text: messageText,
      }),
    });

    const resData = await res.json().catch(() => ({}));
    console.log(`[Kirimi.id] Response HTTP ${res.status} ke ${formattedNumber}:`, resData);
    return res.ok;
  } catch (err) {
    console.error('[Kirimi.id Exception]:', err);
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

    // 1. CARI DATA SISWA
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

      // Simpan log absensi & update latest_scan secara paralel
      await Promise.allSettled([
        supabase.from('absensi').insert([{
          rfid_uid: cleanUid,
          nama: siswa.nama_siswa || siswa.nama,
          kelas: siswa.kelas,
          status: statusTap,
          created_at: new Date().toISOString(),
        }]),
        supabase.from('latest_scan').upsert([{ id: 1, uid: cleanUid }])
      ]);

      const pesanWa = `*PRESENSI DIGITAL SMK YPK MEDAN*\n-----------------------------------------\nYth. Bapak/Ibu Orang Tua/Wali,\n\nPemberitahuan presensi siswa:\n👤 *Nama:* ${siswa.nama_siswa || siswa.nama}\n🏫 *Kelas:* ${siswa.kelas}\n📚 *Jurusan:* ${siswa.jurusan || '-'}\n⏰ *Waktu:* ${waktuWib} WIB\n📌 *Status:* ${statusTap}\n\nTelah berhasil melakukan presensi di sekolah.\nTerima Kasih.`;

      // OTOMATIS CARI SEMUA KOLOM YANG BERISI NOMOR TELEPON/WA DI TABEL SISWA
      const detectedNumbers = Object.entries(siswa)
        .filter(([key, val]) => {
          if (!val) return false;
          const k = key.toLowerCase();
          return (k.includes('wa') || k.includes('hp') || k.includes('phone') || k.includes('telp') || k.includes('ortu')) && String(val).replace(/\D/g, '').length >= 9;
        })
        .map(([_, val]) => String(val));

      // Hapus duplikat nomor
      const uniqueNumbers = [...new Set(detectedNumbers)];

      console.log(`[Tap Result] Siswa: ${siswa.nama_siswa || siswa.nama} | Nomor terdeteksi:`, uniqueNumbers);

      let waResults = [];
      if (uniqueNumbers.length > 0) {
        const promises = uniqueNumbers.map(num => sendWhatsAppMessage(num, pesanWa));
        waResults = await Promise.allSettled(promises);
      }

      return NextResponse.json({
        success: true,
        type: 'siswa',
        nama: siswa.nama_siswa || siswa.nama,
        kelas: siswa.kelas,
        status: statusTap,
        target_nomor_ditemukan: uniqueNumbers,
        pesan: uniqueNumbers.length === 0 ? 'TIDAK ADA NOMOR WA DI DATABASE SISWA INI! Periksa Supabase.' : 'WA dikirim'
      }, { status: 200 });
    }

    // 2. CARI DATA GURU
    const { data: guru } = await supabase
      .from('tb_guru')
      .select('*')
      .eq('uid_rfid', cleanUid)
      .maybeSingle();

    if (guru) {
      await Promise.allSettled([
        supabase.from('absensi').insert([{
          rfid_uid: cleanUid,
          nama: guru.nama_guru || guru.nama,
          kelas: guru.role === 'admin' ? "MASTER'K" : 'Guru / Staff',
          status: statusTap,
          created_at: new Date().toISOString(),
        }]),
        supabase.from('latest_scan').upsert([{ id: 1, uid: cleanUid }])
      ]);

      return NextResponse.json({
        success: true,
        type: 'guru',
        nama: guru.nama_guru || guru.nama,
        status: statusTap,
      }, { status: 200 });
    }

    // 3. KARTU BELUM TERDAFTAR
    await supabase.from('latest_scan').upsert([{ id: 1, uid: cleanUid }]);

    return NextResponse.json({
      success: false,
      message: 'Kartu RFID Belum Terdaftar!',
      uid: cleanUid,
    }, { status: 404 });

  } catch (err) {
    console.error('[API Exception]:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
