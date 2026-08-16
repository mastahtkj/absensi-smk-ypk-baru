import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const KIRIMI_USER_CODE = process.env.NEXT_PUBLIC_KIRIMI_USER_CODE || process.env.KIRIMI_USER_CODE || '';
const KIRIMI_SECRET_KEY = process.env.NEXT_PUBLIC_KIRIMI_SECRET_KEY || process.env.KIRIMI_SECRET_KEY || '';
const KIRIMI_DEVICE_ID = process.env.NEXT_PUBLIC_KIRIMI_DEVICE_ID || process.env.KIRIMI_DEVICE_ID || '';

async function kirimWA(phone, message) {
  if (!KIRIMI_USER_CODE || !KIRIMI_SECRET_KEY || !KIRIMI_DEVICE_ID) return false;

  let cleanPhone = phone.toString().replace(/[^0-9]/g, '');
  if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.slice(1);
  else if (cleanPhone.startsWith('8')) cleanPhone = '62' + cleanPhone;

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
        phone: cleanPhone,
        message: message
      })
    });
    return res.ok;
  } catch (err) {
    return false;
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const cleanUid = (body.rfid_uid || body.uid || '').toString().trim().toUpperCase();

    if (!cleanUid) {
      return NextResponse.json({ success: false, message: 'UID tidak valid' }, { status: 400 });
    }

    // Update scanner real-time
    await supabase.from('latest_scan').upsert({ id: 1, uid: cleanUid, updated_at: new Date().toISOString() });

    let nama = '';
    let kelas = '';
    let noWa = '';
    let targetRole = '';
    let isNewCard = false;

    // Cek Data Guru
    const { data: guru } = await supabase.from('guru').select('nama, no_wa, role').eq('rfid_uid', cleanUid).maybeSingle();

    if (guru) {
      nama = guru.nama;
      kelas = guru.role === 'admin' ? "MASTER'K" : 'Guru / Staff';
      noWa = guru.no_wa;
      targetRole = 'Guru / Staff';
    } else {
      // Cek Data Siswa
      const { data: siswa } = await supabase.from('rfid_cards').select('nama, kelas, no_wa, no_hp_ortu').eq('rfid_uid', cleanUid).maybeSingle();
      if (siswa) {
        nama = siswa.nama;
        kelas = siswa.kelas;
        noWa = siswa.no_hp_ortu || siswa.no_wa;
        targetRole = 'Orang Tua / Wali';
      } else {
        isNewCard = true;
        nama = 'KARTU BELUM TERDAFTAR';
        kelas = '-';
      }
    }

    const statusAbsen = body.status || 'Hadir';

    // Insert ke tabel Absensi
    const { data: insertedRecord } = await supabase.from('absensi').insert({
      rfid_uid: cleanUid,
      nama: nama,
      kelas: kelas,
      status: statusAbsen,
      created_at: new Date().toISOString()
    }).select().single();

    let isWaSent = false;
    if (!isNewCard && noWa) {
      const jam = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
      const pesan = `*PRESENSI DIGITAL SMK YPK MEDAN*\n\n` +
        `Yth. Bapak/Ibu ${targetRole},\n` +
        `Pemberitahuan presensi kehadiran:\n\n` +
        `👤 *Nama:* ${nama}\n` +
        `🏫 *Kelas/Jabatan:* ${kelas}\n` +
        `⏰ *Waktu Tap:* ${jam} WIB\n` +
        `📌 *Status Presensi:* ${statusAbsen}\n\n` +
        `Terima kasih. Pesan ini dikirim otomatis oleh sistem presensi RFID sekolah.`;

      isWaSent = await kirimWA(noWa, pesan);

      if (isWaSent && insertedRecord?.id) {
        await supabase.from('absensi').update({ wa_sent: true }).eq('id', insertedRecord.id);
      }
    }

    return NextResponse.json({
      success: true,
      is_new_card: isNewCard,
      nama: nama,
      kelas: kelas,
      wa_sent: isWaSent
    }, { status: 200 });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
