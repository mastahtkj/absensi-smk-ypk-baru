import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Integrasi Fonnte / WA Gateway
async function sendWaNotification(noHp, nama, status, waktu) {
  const token = process.env.FONNTE_TOKEN;
  if (!token || !noHp) return;

  const message = `*PRESENSI SISWA SMK YPK MEDAN*\n\nNama: *${nama}*\nStatus: *${status}*\nWaktu: ${waktu} WIB\n\nTerima kasih.`;

  try {
    await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target: noHp,
        message: message,
      }),
    });
  } catch (err) {
    console.error('Gagal kirim WA:', err);
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const rawUid = body.uid || body.rfid_uid;

    if (!rawUid) {
      return NextResponse.json({ success: false, message: 'UID tidak terdeteksi' }, { status: 400 });
    }

    const cleanUid = String(rawUid).trim().toUpperCase();

    // 1. Simpan ke latest_scan agar mode registrasi/polling bekerja
    await supabase.from('latest_scan').upsert({ id: 1, uid: cleanUid });

    // 2. Cari pemilik kartu di database rfid_cards atau guru
    let nama = 'Siswa/Guru Baru';
    let kelas = '-';
    let noHp = null;

    const { data: siswa } = await supabase.from('rfid_cards').select('*').ilike('rfid_uid', cleanUid).maybeSingle();
    if (siswa) {
      nama = siswa.nama;
      kelas = siswa.kelas;
      noHp = siswa.no_hp || siswa.no_wa;
    } else {
      const { data: guru } = await supabase.from('guru').select('*').ilike('rfid_uid', cleanUid).maybeSingle();
      if (guru) {
        nama = guru.nama;
        kelas = guru.role === 'admin' ? "MASTER'K" : 'Guru / Staff';
        noHp = guru.no_hp || guru.no_wa;
      }
    }

    // 3. Tentukan status (Hadir/Telat)
    const now = new Date();
    const jam = now.getHours();
    const menit = now.getMinutes();
    const isTelat = jam > 7 || (jam === 7 && menit > 30);
    const status = isTelat ? 'Telat' : 'Hadir';
    const waktuFormatted = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });

    // 4. Insert log absensi ke database
    const { data: inserted, error } = await supabase.from('absensi').insert([{
      rfid_uid: cleanUid,
      nama,
      kelas,
      status,
      wa_sent: true
    }]).select().single();

    if (error) throw error;

    // 5. Kirim Notifikasi WhatsApp
    if (noHp) {
      await sendWaNotification(noHp, nama, status, waktuFormatted);
    }

    return NextResponse.json({
      success: true,
      message: `Presensi berhasil recorded untuk ${nama}`,
      data: inserted
    });

  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
