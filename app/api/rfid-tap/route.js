// app/api/tap/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const KIRIMI_USER_CODE = process.env.KIRIMI_USER_CODE || process.env.NEXT_PUBLIC_KIRIMI_USER_CODE;
const KIRIMI_SECRET_KEY = process.env.KIRIMI_SECRET_KEY || process.env.NEXT_PUBLIC_KIRIMI_SECRET_KEY;
const KIRIMI_DEVICE_ID = process.env.KIRIMI_DEVICE_ID || process.env.NEXT_PUBLIC_KIRIMI_DEVICE_ID;

// Helper Kirim WA Server-Side (Aman dari CORS)
async function sendKirimiWA(phone, message) {
  if (!KIRIMI_USER_CODE || !KIRIMI_SECRET_KEY || !KIRIMI_DEVICE_ID) {
    console.error('⚠️ Kredensial Kirimi.id belum lengkap di Vercel Environment Variables');
    return false;
  }

  let formattedPhone = phone.toString().replace(/[^0-9]/g, '');
  if (formattedPhone.startsWith('0')) {
    formattedPhone = '62' + formattedPhone.slice(1);
  } else if (formattedPhone.startsWith('8')) {
    formattedPhone = '62' + formattedPhone;
  }

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
    console.log('Response Kirimi.id:', resJson);
    return res.ok || resJson.status === true || resJson.status === 'success';
  } catch (err) {
    console.error('Error sending WA Kirimi:', err);
    return false;
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawUid = body.uid || body.rfid_uid;

    if (!rawUid) {
      return NextResponse.json({ success: false, message: 'UID kartu tidak ditemukan' }, { status: 400 });
    }

    const cleanUid = rawUid.toString().trim().toUpperCase();

    // 1. Update Latest Scan
    await supabase.from('latest_scan').upsert({ id: 1, uid: cleanUid, updated_at: new Date().toISOString() });

    // 2. Cari Data Pengguna (Guru / Siswa)
    let namaUser = 'Tidak Dikenal';
    let kelasUser = 'Umum';
    let noWaTarget = null;
    let targetRole = 'Orang Tua / Wali';

    const { data: guru } = await supabase
      .from('guru')
      .select('nama, no_wa, role')
      .eq('rfid_uid', cleanUid)
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
        .eq('rfid_uid', cleanUid)
        .maybeSingle();

      if (siswa) {
        namaUser = siswa.nama;
        kelasUser = siswa.kelas;
        noWaTarget = siswa.no_hp_ortu || siswa.no_wa;
        targetRole = 'Orang Tua / Wali';
      }
    }

    // 3. Status Presensi Berdasarkan Jam (Asia/Jakarta)
    const now = new Date();
    const jakartaTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
    const hours = jakartaTime.getHours();
    const minutes = jakartaTime.getMinutes();
    let statusPresensi = 'Hadir';

    if (hours > 7 || (hours === 7 && minutes > 30)) {
      statusPresensi = 'Telat';
    }

    // 4. Simpan Log Absensi
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

    // 5. Kirim WhatsApp Notifikasi
    let waSentStatus = false;
    if (noWaTarget) {
      const waktuTap = jakartaTime.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit'
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

      if (waSentStatus && absensiLog?.id) {
        await supabase.from('absensi').update({ wa_sent: true }).eq('id', absensiLog.id);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Presensi berhasil dicatat',
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
