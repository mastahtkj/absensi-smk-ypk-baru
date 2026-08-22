import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const KIRIMI_USER_CODE = process.env.KIRIMI_USER_CODE || 'KMQZ4Y0826';
const KIRIMI_SECRET = process.env.KIRIMI_SECRET_KEY || process.env.KIRIMI_SECRET || 'b764c93a42e511076a8ddd201717e4a4967ca8271ae1581c3ae33641d9f18e80';
const KIRIMI_DEVICE_ID = process.env.KIRIMI_DEVICE_ID || 'D-QYXDB';
const KIRIMI_API_URL = 'https://api.kirimi.id/v1/send-message';

// PEMISAHAN GRUP SISWA DAN GURU
const KIRIMI_GROUP_SISWA = process.env.KIRIMI_GROUP_SISWA || '120363428398080899@g.us';
const KIRIMI_GROUP_GURU = process.env.KIRIMI_GROUP_GURU || '120363428231610054@g.us';

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

// ==========================================
// 1. HANDLER GET (UNTUK REKAP REALTIME ESP8266)
// ==========================================
export async function GET() {
  try {
    const { startOfDay, endOfDay } = getTodayBoundaryWIB();

    // Ambil data presensi hari ini
    const { data: absensiHariIni, error: errorAbsensi } = await supabase
      .from('absensi')
      .select('status, rfid_uid')
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay);

    if (errorAbsensi) {
      console.error('[Supabase Error - Absensi]:', errorAbsensi.message);
      return NextResponse.json({ success: false, message: 'Gagal mengambil data absensi' }, { status: 500 });
    }

    // Ambil total siswa terdaftar
    const { data: totalSiswa, error: errorSiswa } = await supabase
      .from('tb_siswa')
      .select('uid_rfid');

    if (errorSiswa) {
      console.error('[Supabase Error - Siswa]:', errorSiswa.message);
    }

    let hadir = 0;
    let sakit = 0;
    let izin = 0;
    let alphaManual = 0;

    if (absensiHariIni && absensiHariIni.length > 0) {
      absensiHariIni.forEach((row) => {
        const st = String(row.status || '').toLowerCase().trim();
        if (st.includes('hadir')) {
          hadir++;
        } else if (st.includes('sakit')) {
          sakit++;
        } else if (st.includes('izin')) {
          izin++;
        } else if (st.includes('alpha') || st.includes('alpa')) {
          alphaManual++;
        }
      });
    }

    const totalSiswaTerdaftar = totalSiswa ? totalSiswa.length : 0;
    
    // Hitung Alpha (Murni dari Database jika ada, atau 0 jika belum ada yang di-Alpha)
    const alphaFinal = alphaManual; 

    return NextResponse.json({
      success: true,
      hadir: hadir,
      sakit: sakit,
      izin: izin,
      alpha: alphaFinal,
      alpa: alphaFinal, // kompatibilitas jika ESP8266 membaca 'alpa'
      total_siswa: totalSiswaTerdaftar,
      updated_at: new Date().toISOString()
    }, { status: 200 });

  } catch (err) {
    console.error('[API Rekap Error]:', err);
    return NextResponse.json({ success: false, message: 'Server Internal Error' }, { status: 500 });
  }
}

// ==========================================
// 2. HANDLER POST (UNTUK TAP RFID / NFC)
// ==========================================
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

    // --- CEK SISWA ---
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

      const pesanWaSiswa = `🎒 *[ NOTIFIKASI PRESENSI SISWA ]* 🎒
━━━━━━━━━━━━━━━━━━━━

🎓 *NAMA* : *${namaSiswa.toUpperCase()}*
🏫 *KELAS* : \`${kelasSiswa}\`
🛠️ *JURUSAN* : \`${jurusanSiswa}\`

⏰ *WAKTU TAP* : ${waktuWib} WIB
✅ *STATUS* : *${statusTap.toUpperCase()}*

━━━━━━━━━━━━━━━━━━━━
_Siswa/i telah hadir dan siap mengikuti pembelajaran._`;

      sendWhatsAppMessage(KIRIMI_GROUP_SISWA, pesanWaSiswa).catch((err) =>
        console.error('[BG WA Error Siswa]:', err)
      );

      return NextResponse.json({
        success: true,
        type: 'siswa',
        nama: namaSiswa,
        kelas: kelasSiswa,
        jurusan: jurusanSiswa,
        inisial: inisialSiswa,
        info: `${kelasSiswa} ${jurusanSiswa}`,
        target_nomor: KIRIMI_GROUP_SISWA,
      }, { status: 200 });
    }

    // --- CEK GURU ---
    const { data: guru, error: errorGuru } = await supabase
      .from('tb_guru')
      .select('*')
      .eq('uid_rfid', cleanUid)
      .maybeSingle();

    if (errorGuru) console.error('[Supabase Error - Guru]:', errorGuru.message);

    if (guru) {
      const namaGuru = guru.nama_guru;
      const jabatan = guru.role === 'admin' ? "MASTER / ADMIN" : 'GURU / STAFF';
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

      const pesanWaGuru = `👨‍🏫 *[ NOTIFIKASI PRESENSI GURU & STAFF ]* 👨‍🏫
════════════════════

⭐ *NAMA* : *${namaGuru.toUpperCase()}*
🏷️ *INISIAL* : \`${inisialGuru}\`
💼 *JABATAN* : \`${jabatan}\`

🕒 *JAM MASUK* : ${waktuWib} WIB
📌 *KETERANGAN* : *${statusTap.toUpperCase()}*

════════════════════
_Selamat bertugas dan mengajar di SMK YPK Medan._`;

      sendWhatsAppMessage(KIRIMI_GROUP_GURU, pesanWaGuru).catch((err) =>
        console.error('[BG WA Error Guru]:', err)
      );

      return NextResponse.json({
        success: true,
        type: 'guru',
        nama: namaGuru,
        kelas: jabatan,
        jurusan: 'GURU/STAFF',
        info: jabatan,
        inisial: inisialGuru,
        target_nomor: KIRIMI_GROUP_GURU,
      }, { status: 200 });
    }

    // --- KARTU TIDAK TERDAFTAR ---
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
