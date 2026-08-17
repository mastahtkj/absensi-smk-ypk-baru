import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 1. Inisialisasi Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// 2. Variabel Konfigurasi Kirimi.id v2
const KIRIMI_USER_CODE = process.env.KIRIMI_USER_CODE || process.env.NEXT_PUBLIC_KIRIMI_USER_CODE;
const KIRIMI_SECRET_KEY = process.env.KIRIMI_SECRET_KEY || process.env.NEXT_PUBLIC_KIRIMI_SECRET_KEY;
const KIRIMI_DEVICE_ID = process.env.KIRIMI_DEVICE_ID || process.env.NEXT_PUBLIC_KIRIMI_DEVICE_ID;

// 3. Fungsi Khusus Pengirim WhatsApp (Diperbarui untuk mencegah HTTP 405)
async function sendKirimiWA(phone, message) {
  if (!phone) {
    console.error('⚠️ Nomor telepon kosong / tidak ditemukan.');
    return false;
  }

  if (!KIRIMI_USER_CODE || !KIRIMI_SECRET_KEY || !KIRIMI_DEVICE_ID) {
    console.error('⚠️ Variabel Kirimi.id belum diatur di Vercel Environment Variables.');
    return false;
  }

  // Format nomor HP agar selalu berawalan 62
  let formattedPhone = String(phone).replace(/[^0-9]/g, '');
  if (formattedPhone.startsWith('0')) formattedPhone = '62' + formattedPhone.slice(1);
  else if (formattedPhone.startsWith('8')) formattedPhone = '62' + formattedPhone;

  try {
    // Endpoint resmi Kirimi.id v2
    const res = await fetch('https://dash.kirimi.id/api/v2/send-message', {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Code': KIRIMI_USER_CODE.trim(),
        'Secret-Key': KIRIMI_SECRET_KEY.trim(),
        'Device-Id': KIRIMI_DEVICE_ID.trim()
      },
      body: JSON.stringify({
        device: KIRIMI_DEVICE_ID.trim(),
        phone: formattedPhone,
        message: message
      })
    });

    const resData = await res.json().catch(() => ({}));
    console.log('Kirimi API Response Status:', res.status, resData);

    return res.ok && (resData.status === true || resData.status === 'success' || res.status === 200 || res.status === 201);
  } catch (err) {
    console.error('Error Kirimi API:', err);
    return false;
  }
}

// 4. FUNGSI UTAMA (API Endpoint untuk Arduino)
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawUid = body.uid || body.rfid_uid;
    const deviceTimeStatus = body.status || 'Hadir'; // Menerima status Hadir/Telat dari Arduino

    if (!rawUid) {
      return NextResponse.json({ success: false, message: 'UID RFID tidak valid' }, { status: 400 });
    }

    const cleanUid = rawUid.toString().trim().toUpperCase();

    // Update real-time modal pendaftaran kartu di frontend
    await supabase.from('latest_scan').upsert({ id: 1, uid: cleanUid, updated_at: new Date().toISOString() });

    let namaUser = 'Tidak Dikenal';
    let kelasUser = '-';
    let noWaTarget = null;
    let isKnown = false;
    let finalStatus = 'Hadir';

    // Cek apakah UID milik Guru
    const { data: guru } = await supabase.from('guru').select('*').eq('rfid_uid', cleanUid).maybeSingle();

    if (guru) {
      isKnown = true;
      namaUser = guru.nama;
      kelasUser = guru.role === 'admin' ? "MASTER'K" : 'Guru / Staff';
      // Multiple Fallback Nama Kolom No WA / HP Guru
      noWaTarget = guru.no_wa || guru.no_hp || guru.no_telepon || guru.telepon || guru.whatsapp;
      finalStatus = 'Hadir'; // GURU BEBAS JAM ABSEN
    } else {
      // Jika bukan Guru, Cek apakah UID milik Siswa
      const { data: siswa } = await supabase.from('rfid_cards').select('*').eq('rfid_uid', cleanUid).maybeSingle();
      if (siswa) {
        isKnown = true;
        namaUser = siswa.nama;
        kelasUser = siswa.kelas;
        // Multiple Fallback Nama Kolom No WA / HP Siswa / Ortu
        noWaTarget = siswa.no_hp_ortu || siswa.no_wa || siswa.no_hp || siswa.no_telepon || siswa.telepon || siswa.hp_ortu;
        finalStatus = deviceTimeStatus; // SISWA MENGIKUTI JAM ARDUINO (06:45 - 07:25)
      }
    }

    if (!isKnown) {
      return NextResponse.json({ success: false, message: 'KARTU TIDAK TERDAFTAR' }, { status: 404 });
    }

    // Insert Riwayat Absensi ke Supabase
    const { data: absensiLog, error: absensiErr } = await supabase
      .from('absensi')
      .insert({
        rfid_uid: cleanUid,
        nama: namaUser,
        kelas: kelasUser,
        status: finalStatus,
        created_at: new Date().toISOString(),
        wa_sent: false
      })
      .select()
      .single();

    let waSentStatus = false;

    // Proses Kirim WA jika ada nomor tujuan
    if (noWaTarget) {
      const waktuTap = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
      const pesanWA = `*PRESENSI DIGITAL SMK YPK MEDAN*\n\n` +
        `Pemberitahuan presensi kehadiran:\n\n` +
        `👤 *Nama:* ${namaUser}\n` +
        `🏫 *Kelas/Jabatan:* ${kelasUser}\n` +
        `⏰ *Waktu Tap:* ${waktuTap} WIB\n` +
        `📌 *Status Presensi:* *${finalStatus.toUpperCase()}*\n\n` +
        `_Pesan ini dikirim otomatis oleh sistem presensi RFID sekolah._`;

      waSentStatus = await sendKirimiWA(noWaTarget, pesanWA);

      // Jika sukses kirim WA, update status wa_sent di database
      if (waSentStatus && absensiLog?.id) {
        await supabase.from('absensi').update({ wa_sent: true }).eq('id', absensiLog.id);
      }
    } else {
      console.warn(`⚠️ User ${namaUser} (${cleanUid}) tidak memiliki nomor WA di database.`);
    }

    // Balasan sukses ke Arduino
    return NextResponse.json({
      success: true,
      nama: namaUser,
      kelas: kelasUser,
      status: finalStatus,
      wa_sent: waSentStatus
    }, { status: 200 });

  } catch (err) {
    console.error('Server Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
