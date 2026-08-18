import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper format nomor telepon ke standar internasional (62xxx)
function formatPhoneNumber(phone) {
  if (!phone) return null;
  let cleaned = String(phone).replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  }
  return cleaned;
}

// Pengiriman WhatsApp Kirimi.id secara Asynchronous (Non-Blocking)
async function sendWaAsync(phone, message) {
  if (!phone) return;
  try {
    await fetch('https://api.kirimi.id/v1/send-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_code: process.env.KIRIMI_USER_CODE || 'KMQZ4Y826',
        secret: process.env.KIRIMI_SECRET || '0a2eae1b7a76fb9709f691fa0ebcff536c86aa1b3247f45eee8ab05e53aae3b1',
        device_id: process.env.KIRIMI_DEVICE_ID || 'D-H7IJQ',
        to: phone,
        number: phone,
        message: message,
      }),
    });
  } catch (err) {
    console.error('Gagal mengirim WhatsApp Kirimi.id:', err);
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const rawUid = body.uid || body.rfid_uid;

    if (!rawUid) {
      return NextResponse.json({ success: false, message: 'UID RFID tidak terdeteksi' }, { status: 400 });
    }

    const cleanUid = String(rawUid).trim().toUpperCase();

    // 1. Simpan UID ke latest_scan secara simultan untuk mode registrasi
    supabase.from('latest_scan').upsert({ id: 1, uid: cleanUid, updated_at: new Date().toISOString() }).then();

    // 2. Cari pemilik kartu di tabel rfid_cards dan guru
    const [{ data: siswa }, { data: guru }] = await Promise.all([
      supabase.from('rfid_cards').select('*').ilike('rfid_uid', cleanUid).maybeSingle(),
      supabase.from('guru').select('*').ilike('rfid_uid', cleanUid).maybeSingle(),
    ]);

    let nama = 'Belum Terdaftar';
    let kelas = '-';
    let targetWa = null;

    if (siswa) {
      nama = siswa.nama;
      kelas = siswa.kelas;
      targetWa = formatPhoneNumber(siswa.no_hp_ortu || siswa.no_wa);
    } else if (guru) {
      nama = guru.nama;
      kelas = guru.role === 'admin' ? "MASTER'K" : 'Guru / Staff';
      targetWa = formatPhoneNumber(guru.no_wa);
    }

    // 3. Hitung Waktu dan Jam Masuk WIB
    const now = new Date();
    const wibOffset = 7 * 60 * 60 * 1000;
    const wibDate = new Date(now.getTime() + wibOffset);
    const jam = wibDate.getUTCHours();
    const menit = wibDate.getUTCMinutes();
    const waktuWib = `${String(jam).padStart(2, '0')}:${String(menit).padStart(2, '0')}`;

    const isTelat = jam > 7 || (jam === 7 && menit > 30);
    const status = nama === 'Belum Terdaftar' ? 'Tanpa Kartu' : isTelat ? 'Telat' : 'Hadir';

    // 4. Anti-Spam Tap (Cegah Tap berulang dalam rentang 3 menit)
    const threeMinutesAgo = new Date(now.getTime() - 3 * 60 * 1000).toISOString();
    const { data: recentScan } = await supabase
      .from('absensi')
      .select('id')
      .eq('rfid_uid', cleanUid)
      .gte('created_at', threeMinutesAgo)
      .maybeSingle();

    if (recentScan) {
      return NextResponse.json({
        success: true,
        message: 'Tap kartu baru saja dicatat, mengabaikan duplikat.',
      });
    }

    // 5. Simpan log absensi ke database
    const { data: inserted, error } = await supabase
      .from('absensi')
      .insert([
        {
          rfid_uid: cleanUid,
          nama,
          kelas,
          status,
          wa_sent: Boolean(targetWa),
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // 6. Jalankan Notifikasi WA di background (Agar Tap RFID Terasa Sangat Cepat)
    if (targetWa && nama !== 'Belum Terdaftar') {
      const waMsg = `*PRESENSI DIGITAL SMK YPK MEDAN*\n\n` +
        `Nama: *${nama}*\n` +
        `Kelas/Jabatan: *${kelas}*\n` +
        `Status: *${status.toUpperCase()}*\n` +
        `Waktu Tap: *${waktuWib} WIB*\n\n` +
        `_Notifikasi otomatis Sistem Presensi SMK YPK Medan_`;
      
      sendWaAsync(targetWa, waMsg);
    }

    return NextResponse.json({
      success: true,
      message: `Presensi ${nama} berhasil dicatat`,
      data: inserted,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
