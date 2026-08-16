// app/api/tap/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const KIRIMI_USER_CODE = process.env.KIRIMI_USER_CODE || process.env.NEXT_PUBLIC_KIRIMI_USER_CODE;
const KIRIMI_SECRET_KEY = process.env.KIRIMI_SECRET_KEY || process.env.NEXT_PUBLIC_KIRIMI_SECRET_KEY;
const KIRIMI_DEVICE_ID = process.env.KIRIMI_DEVICE_ID || process.env.NEXT_PUBLIC_KIRIMI_DEVICE_ID;

// Helper format nomor WA ke standar internasional 62xxx
function formatPhoneNumber(phone) {
  if (!phone) return null;
  let clean = phone.toString().replace(/[^0-9]/g, '');
  if (clean.startsWith('0')) {
    clean = '62' + clean.slice(1);
  } else if (clean.startsWith('8')) {
    clean = '62' + clean;
  }
  return clean;
}

// Fungsi helper kirim WA via Server-side (Bebas CORS)
async function sendKirimiWA(phone, message) {
  if (!KIRIMI_USER_CODE || !KIRIMI_SECRET_KEY || !KIRIMI_DEVICE_ID) {
    console.error('⚠️ [WA ERROR] Kredensial Kirimi.id belum diatur di Vercel Environment Variables');
    return false;
  }

  const formattedPhone = formatPhoneNumber(phone);
  if (!formattedPhone) return false;

  try {
    const res = await fetch('https://dash.kirimi.id/api/v2/send-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Code': KIRIMI_USER_CODE,
        'Secret-Key': KIRIMI_SECRET_KEY,
        'Device-Id': KIRIMI_DEVICE_ID,
        'Device': KIRIMI_DEVICE_ID
      },
      body: JSON.stringify({
        device: KIRIMI_DEVICE_ID,
        device_id: KIRIMI_DEVICE_ID,
        phone: formattedPhone,
        message: message
      })
    });

    const resJson = await res.json().catch(() => ({}));
    console.log('📌 Response Kirimi.id:', resJson);
    return res.ok || resJson.status === true || resJson.code === 200;
  } catch (err) {
    console.error('❌ Error sending WA Kirimi:', err);
    return false;
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const rawUid = body.uid || body.rfid_uid;

    if (!rawUid) {
      return NextResponse.json({ success: false, message: 'UID kartu tidak ditemukan' }, { status: 400 });
    }

    const cleanUid = rawUid.toString().trim().toUpperCase();

    // 1. Update Latest Scan untuk mode Registrasi Card
    await supabase.from('latest_scan').upsert({ id: 1, uid: cleanUid, updated_at: new Date().toISOString() });

    // 2. Cari Data Pengguna (Cek Guru dulu, lalu Siswa) - Case Insensitive Look Up (.ilike)
    let namaUser = 'Tidak Dikenal';
    let kelasUser = 'Umum';
    let noWaTarget = null;
    let targetRole = 'Orang Tua / Wali';

    const { data: guru } = await supabase
      .from('guru')
      .select('nama, no_wa, role')
      .ilike('rfid_uid', cleanUid)
      .maybeSingle();

    if (guru) {
      namaUser = guru.nama;
      kelasUser = guru.role === 'admin' ? "MASTER'K" : 'Guru / Staff';
      noWaTarget = guru.no_wa;
      targetRole = 'Guru / Staff';
    } else {
      const { data: siswa } = await supabase
        .from('rfid_cards')
        .select('nama, kelas, no_wa, no_hp_ortu')
        .ilike('rfid_uid', cleanUid)
        .maybeSingle();

      if (siswa) {
        namaUser = siswa.nama;
        kelasUser = siswa.kelas;
        noWaTarget = siswa.no_hp_ortu || siswa.no_wa;
        targetRole = 'Orang Tua / Wali';
      }
    }

    // 3. Tentukan Status Kehadiran Berdasarkan Waktu Tap
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    let statusPresensi = 'Hadir';

    if (hours > 7 || (hours === 7 && minutes > 30)) {
      statusPresensi = 'Telat';
    }

    // 4. Simpan Log Presensi ke Supabase
    const { data: absensiLog, error: absensiErr } = await supabase
      .from('absensi')
      .insert({
        rfid_uid: cleanUid,
        nama: namaUser,
        kelas: kelasUser,
        status: statusPresensi,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (absensiErr) {
      console.error('Gagal simpan absensi:', absensiErr);
    }

    // 5. Kirim Notifikasi WhatsApp dari Server
    let waSentStatus = false;
    if (noWaTarget) {
      const waktuTap = now.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta'
      });

      const pesanWA = `*PRESENSI DIGITAL SMK YPK MEDAN*\n\n` +
        `Yth. Bapak/Ibu ${targetRole},\n` +
        `Pemberitahuan presensi kehadiran:\n\n` +
        `👤 *Nama:* ${namaUser}\n` +
        `🏫 *Kelas/Jabatan:* ${kelasUser}\n` +
        `⏰ *Waktu Tap:* ${waktuTap} WIB\n` +
        `📌 *Status Presensi:* ${statusPresensi}\n\n` +
        `Terima kasih. Pesan ini dikirim otomatis oleh sistem presensi RFID sekolah.`;

      waSentStatus = await sendKirimiWA(noWaTarget, pesanWA);

      // Update flag wa_sent jika berhasil terkirim
      if (waSentStatus && absensiLog?.id) {
        await supabase.from('absensi').update({ wa_sent: true }).eq('id', absensiLog.id);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Presensi berhasil dicatat',
      nama: namaUser,
      kelas: kelasUser,
      data: {
        uid: cleanUid,
        nama: namaUser,
        kelas: kelasUser,
        status: statusPresensi,
        wa_sent: waSentStatus
      }
    });

  } catch (err) {
    console.error('Server error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
