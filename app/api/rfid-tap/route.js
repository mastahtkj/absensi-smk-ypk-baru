import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const KIRIMI_USER_CODE = process.env.KIRIMI_USER_CODE || 'KMQZ4Y0826';
const KIRIMI_SECRET = process.env.KIRIMI_SECRET_KEY || process.env.KIRIMI_SECRET || 'b764c93a42e511076a8ddd201717e4a4967ca8271ae1581c3ae33641d9f18e80';
const KIRIMI_DEVICE_ID = process.env.KIRIMI_DEVICE_ID || 'D-QYXDB';
const KIRIMI_API_URL = 'https://api.kirimi.id/v1/send-message';

// TARGET NOMOR UNTUK SEMUA NOTIFIKASI
const TARGET_DEFAULT_WA = '6285183163010';

function formatPhoneNumber(phone) {
  if (!phone) return null;
  let cleaned = String(phone).trim();
  
  if (cleaned.endsWith('@g.us')) {
    return cleaned;
  }

  cleaned = cleaned.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (cleaned.startsWith('8')) {
    cleaned = '62' + cleaned;
  }
  
  return cleaned.length >= 10 ? cleaned : null;
}

async function sendWhatsAppMessage(targetNumber, messageText) {
  const formattedTarget = formatPhoneNumber(targetNumber);
  if (!formattedTarget) {
    console.error(`[Kirimi.id Error] Nomor/Group WA tidak valid: ${targetNumber}`);
    return false;
  }

  try {
    const payload = {
      user_code: KIRIMI_USER_CODE,
      secret: KIRIMI_SECRET,
      device_id: KIRIMI_DEVICE_ID,
      phone: formattedTarget,
      message: messageText,
    };

    const response = await fetch(KIRIMI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${KIRIMI_SECRET}`,
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    const result = await response.json().catch(() => ({}));
    console.log(`[Kirimi.id Response] Status ${response.status} to ${formattedTarget}:`, result);
    return response.ok && result.success === true;
  } catch (err) {
    console.error(`[Kirimi.id Exception] Failed to send to ${formattedTarget}:`, err.message);
    return false;
  }
}

function getTodayBoundaryWIB() {
  const now = new Date();
  const options = { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' };
  const formatter = new Intl.DateTimeFormat('en-CA', options);
  const tanggalWib = formatter.format(now);

  const startOfDay = new Date(`${tanggalWib}T00:00:00.000+07:00`).toISOString();
  const endOfDay = new Date(`${tanggalWib}T23:59:59.999+07:00`).toISOString();

  return { startOfDay, endOfDay };
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
    const waktuWib = new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jakarta',
    });

    const { startOfDay, endOfDay } = getTodayBoundaryWIB();

    // ==========================================
    // 1. CEK SISWA
    // ==========================================
    const { data: siswa, error: errorSiswa } = await supabase
      .from('tb_siswa')
      .select('*')
      .eq('uid_rfid', cleanUid)
      .maybeSingle();

    if (errorSiswa) console.error('[Supabase Error - Siswa]:', errorSiswa.message);

    if (siswa) {
      const namaSiswa = siswa.nama_siswa || 'Siswa';
      const kelasSiswa = siswa.kelas || '-';
      const jurusanSiswa = siswa.jurusan || '-';
      const inisialSiswa = namaSiswa.trim().split(' ')[0];

      const { data: sudahAbsen } = await supabase
        .from('absensi')
        .select('id')
        .eq('rfid_uid', cleanUid)
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
        .maybeSingle();

      if (sudahAbsen) {
        return NextResponse.json({
          success: false,
          already_tapped: true,
          message: 'Anda sudah presensi hari ini!',
          type: 'siswa',
          nama: namaSiswa,
          kelas: kelasSiswa,
          jurusan: jurusanSiswa,
          inisial: inisialSiswa,
          info: 'Sudah Absen Hari Ini',
        }, { status: 200 });
      }

      await Promise.allSettled([
        supabase.from('absensi').insert([{
          rfid_uid: cleanUid,
          nama: namaSiswa,
          kelas: kelasSiswa,
          status: statusTap,
          created_at: new Date().toISOString(),
        }]),
        supabase.from('latest_scan').upsert([{ id: 1, uid: cleanUid, updated_at: new Date().toISOString() }])
      ]);

      const pesanWa = `*PRESENSI DIGITAL SMK YPK MEDAN*\n\n📢 *PEMBERITAHUAN PRESENSI SISWA*\n\n👤 *Nama:* ${namaSiswa}\n🏫 *Kelas:* ${kelasSiswa}\n📚 *Jurusan:* ${jurusanSiswa}\n⏰ *Waktu:* ${waktuWib} WIB\n📌 *Status:* ${statusTap}\n\n_Telah berhasil melakukan presensi di sekolah._`;

      // Pengiriman pesan diarahkan ke nomor 6285183163010
      await sendWhatsAppMessage(TARGET_DEFAULT_WA, pesanWa);

      return NextResponse.json({
        success: true,
        type: 'siswa',
        nama: namaSiswa,
        kelas: kelasSiswa,
        jurusan: jurusanSiswa,
        inisial: inisialSiswa,
        info: `${kelasSiswa} ${jurusanSiswa}`,
        target_nomor: TARGET_DEFAULT_WA,
      }, { status: 200 });
    }

    // ==========================================
    // 2. CEK GURU
    // ==========================================
    const { data: guru, error: errorGuru } = await supabase
      .from('tb_guru')
      .select('*')
      .eq('uid_rfid', cleanUid)
      .maybeSingle();

    if (errorGuru) console.error('[Supabase Error - Guru]:', errorGuru.message);

    if (guru) {
      const namaGuru = guru.nama_guru;
      const jabatan = guru.role === 'admin' ? "MASTER'K" : 'Guru / Staff';
      const inisialGuru = guru.inisial || namaGuru.trim().split(' ')[0];

      const { data: sudahAbsenGuru } = await supabase
        .from('absensi')
        .select('id')
        .eq('rfid_uid', cleanUid)
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
        .maybeSingle();

      if (sudahAbsenGuru) {
        return NextResponse.json({
          success: false,
          already_tapped: true,
          message: 'Anda sudah presensi hari ini!',
          type: 'guru',
          nama: namaGuru,
          kelas: jabatan,
          jurusan: 'GURU/STAFF',
          inisial: inisialGuru,
          info: 'Sudah Absen Hari Ini',
        }, { status: 200 });
      }

      await Promise.allSettled([
        supabase.from('absensi').insert([{
          rfid_uid: cleanUid,
          nama: namaGuru,
          kelas: jabatan,
          status: statusTap,
          created_at: new Date().toISOString(),
        }]),
        supabase.from('latest_scan').upsert([{ id: 1, uid: cleanUid, updated_at: new Date().toISOString() }])
      ]);

      const pesanWaGuru = `*PRESENSI DIGITAL SMK YPK MEDAN*\n\n👨‍🏫 *PRESENSI KEHADIRAN GURU / STAFF*\n\n👤 *Nama:* ${namaGuru}\n🏷️ *Inisial:* ${guru.inisial || '-'}\n🏫 *Jabatan:* ${guru.role || 'Guru'}\n⏰ *Waktu Tap:* ${waktuWib} WIB\n📌 *Status:* ${statusTap}\n\n_Presensi Anda telah berhasil dicatat._`;

      // Pengiriman pesan guru diarahkan ke nomor 6285183163010
      await sendWhatsAppMessage(TARGET_DEFAULT_WA, pesanWaGuru);

      return NextResponse.json({
        success: true,
        type: 'guru',
        nama: namaGuru,
        kelas: jabatan,
        jurusan: 'GURU/STAFF',
        info: jabatan,
        inisial: inisialGuru,
        target_nomor: TARGET_DEFAULT_WA,
      }, { status: 200 });
    }

    // ==========================================
    // 3. KARTU TIDAK TERDAFTAR
    // ==========================================
    await supabase.from('latest_scan').upsert([{ id: 1, uid: cleanUid, updated_at: new Date().toISOString() }]);

    return NextResponse.json({
      success: false,
      message: 'Kartu RFID Belum Terdaftar!',
      uid: cleanUid,
    }, { status: 404 });

  } catch (err) {
    console.error('[API Error]:', err);
    return NextResponse.json({ success: false, message: 'Server Internal Error' }, { status: 500 });
  }
}
