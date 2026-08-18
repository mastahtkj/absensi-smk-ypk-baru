import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Gunakan Service Role Key untuk bypass RLS di API Server
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

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
      body: JSON.stringify({ target: noHp, message }),
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
    let nama = 'Belum Terdaftar';
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

    // Hitung Waktu WIB secara akurat
    const now = new Date();
    const wibTimeString = now.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour12: false, hour: '2-digit', minute: '2-digit' });
    const [jamStr, menitStr] = wibTimeString.split(':');
    const jam = parseInt(jamStr, 10);
    const menit = parseInt(menitStr, 10);

    const isTelat = jam > 7 || (jam === 7 && menit > 30);
    const status = isTelat ? 'Telat' : 'Hadir';

    // 3. Antispam / Cegah Double Tap dalam waktu 3 menit terakhir
    const threeMinutesAgo = new Date(now.getTime() - 3 * 60 * 1000).toISOString();
    const { data: recentScan } = await supabase
      .from('absensi')
      .select('id')
      .eq('rfid_uid', cleanUid)
      .gte('created_at', threeMinutesAgo)
      .maybeSingle();

    if (recentScan) {
      return NextResponse.json({ success: true, message: 'Kartu baru saja di-tap, abaikan duplikat.' });
    }

    // 4. Insert log absensi ke database
    const { data: inserted, error } = await supabase.from('absensi').insert([{
      rfid_uid: cleanUid,
      nama,
      kelas,
      status,
      wa_sent: Boolean(noHp)
    }]).select().single();

    if (error) throw error;

    // 5. Kirim Notifikasi WA jika terdaftar
    if (noHp) {
      await sendWaNotification(noHp, nama, status, wibTimeString);
    }

    return NextResponse.json({
      success: true,
      message: `Presensi berhasil direkam untuk ${nama}`,
      data: inserted
    });

  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
