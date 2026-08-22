import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const KIRIMI_USER_CODE = process.env.KIRIMI_USER_CODE || 'KMQZ4Y0826';
const KIRIMI_SECRET = process.env.KIRIMI_SECRET_KEY || process.env.KIRIMI_SECRET || 'b764c93a42e511076a8ddd201717e4a4967ca8271ae1581c3ae33641d9f18e80';
const KIRIMI_DEVICE_ID = process.env.KIRIMI_DEVICE_ID || 'D-QYXDB';
const KIRIMI_API_URL = 'https://api.kirimi.id/v1/send-message';

const KIRIMI_GROUP_SISWA = process.env.KIRIMI_GROUP_SISWA || '120363428398080899@g.us';
const KIRIMI_GROUP_GURU = process.env.KIRIMI_GROUP_GURU || '120363428231610054@g.us';

function formatPhoneNumber(phone: string | null) {
  if (!phone) return null;
  let cleaned = String(phone).trim();
  
  if (cleaned.endsWith('@g.us')) return cleaned;

  cleaned = cleaned.replace(/\D/g, '');
  if (cleaned.startsWith('0')) cleaned = '62' + cleaned.slice(1);
  else if (cleaned.startsWith('8')) cleaned = '62' + cleaned;
  
  return cleaned.length >= 10 ? cleaned : null;
}

async function sendWhatsAppMessage(targetNumber: string, messageText: string) {
  const formattedTarget = formatPhoneNumber(targetNumber);
  if (!formattedTarget) return false;

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
    return response.ok && result.success === true;
  } catch (err: any) {
    console.error(`[Kirimi.id Exception]:`, err.message);
    return false;
  }
}

function getTodayBoundaryWIB() {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' };
  const formatter = new Intl.DateTimeFormat('en-CA', options);
  const tanggalWib = formatter.format(now);

  const startOfDay = new Date(`${tanggalWib}T00:00:00.000+07:00`).toISOString();
  const endOfDay = new Date(`${tanggalWib}T23:59:59.999+07:00`).toISOString();

  return { startOfDay, endOfDay };
}

// ==========================================
// 1. HANDLER GET (UNTUK REKAP REALTIME)
// ==========================================
export async function GET() {
  try {
    const { startOfDay, endOfDay } = getTodayBoundaryWIB();

    const { data: absensiHariIni, error: errorAbsensi } = await supabase
      .from('absensi')
      .select('status, rfid_uid, updated_by, updated_at')
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay);

    if (errorAbsensi) {
      return NextResponse.json({ success: false, message: 'Gagal mengambil data absensi' }, { status: 500 });
    }

    const { data: totalSiswa } = await supabase.from('tb_siswa').select('uid_rfid');

    let hadir = 0, sakit = 0, izin = 0, alphaManual = 0;

    if (absensiHariIni && absensiHariIni.length > 0) {
      absensiHariIni.forEach((row) => {
        const st = String(row.status || '').toLowerCase().trim();
        if (st.includes('hadir')) hadir++;
        else if (st.includes('sakit')) sakit++;
        else if (st.includes('izin')) izin++;
        else if (st.includes('alpha') || st.includes('alpa')) alphaManual++;
      });
    }

    return NextResponse.json({
      success: true,
      hadir,
      sakit,
      izin,
      alpha: alphaManual,
      alpa: alphaManual,
      total_siswa: totalSiswa ? totalSiswa.length : 0,
      updated_at: new Date().toISOString()
    }, { status: 200 });

  } catch (err) {
    return NextResponse.json({ success: false, message: 'Server Internal Error' }, { status: 500 });
  }
}

// ==========================================
// 2. HANDLER POST (UNTUK TAP RFID / NFC)
// ==========================================
export async function POST(request: Request) {
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

    // CEK SISWA
    const { data: siswa } = await supabase
      .from('tb_siswa')
      .select('*')
      .eq('uid_rfid', cleanUid)
      .maybeSingle();

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
━━━━━━━━━━━━━━━━━━━━`;

      sendWhatsAppMessage(KIRIMI_GROUP_SISWA, pesanWaSiswa);

      return NextResponse.json({
        success: true,
        type: 'siswa',
        nama: namaSiswa,
        kelas: kelasSiswa,
        jurusan: jurusanSiswa,
        inisial: inisialSiswa,
        info: `${kelasSiswa} ${jurusanSiswa}`,
      }, { status: 200 });
    }

    // CEK GURU
    const { data: guru } = await supabase
      .from('tb_guru')
      .select('*')
      .eq('uid_rfid', cleanUid)
      .maybeSingle();

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
════════════════════`;

      sendWhatsAppMessage(KIRIMI_GROUP_GURU, pesanWaGuru);

      return NextResponse.json({
        success: true,
        type: 'guru',
        nama: namaGuru,
        kelas: jabatan,
        jurusan: 'GURU/STAFF',
        info: jabatan,
        inisial: inisialGuru,
      }, { status: 200 });
    }

    await supabase.from('latest_scan').upsert([{ id: 1, uid: cleanUid, updated_at: new Date().toISOString() }]);

    return NextResponse.json({
      success: false,
      message: 'Kartu RFID Belum Terdaftar!',
      uid: cleanUid,
    }, { status: 404 });

  } catch (err) {
    return NextResponse.json({ success: false, message: 'Server Internal Error' }, { status: 500 });
  }
}

// ==========================================
// 3. HANDLER PUT / PATCH (UPDATE STATUS MANUAL ADMIN & AUDIT LOG)
// ==========================================
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { rfid_uid, new_status, admin_name } = body;

    if (!rfid_uid || !new_status || !admin_name) {
      return NextResponse.json({ 
        success: false, 
        message: 'Data rfid_uid, new_status, dan admin_name wajib diisi' 
      }, { status: 400 });
    }

    const { startOfDay, endOfDay } = getTodayBoundaryWIB();
    const nowIso = new Date().toISOString();

    // Cari data absensi hari ini
    const { data: existingAbsensi } = await supabase
      .from('absensi')
      .select('*')
      .eq('rfid_uid', rfid_uid)
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)
      .maybeSingle();

    let oldStatus = 'Belum Ada';
    let absensiId = null;

    if (existingAbsensi) {
      oldStatus = existingAbsensi.status;
      absensiId = existingAbsensi.id;

      // Update data di tabel absensi
      await supabase
        .from('absensi')
        .update({
          status: new_status,
          updated_by: admin_name,
          updated_at: nowIso
        })
        .eq('id', existingAbsensi.id);
    } else {
      // Jika belum ada record absensi hari ini, buat baru
      let namaPengguna = 'Unknown';
      let kelasPengguna = '-';

      const { data: siswa } = await supabase.from('tb_siswa').select('nama_siswa, kelas').eq('uid_rfid', rfid_uid).maybeSingle();
      if (siswa) {
        namaPengguna = siswa.nama_siswa;
        kelasPengguna = siswa.kelas;
      } else {
        const { data: guru } = await supabase.from('tb_guru').select('nama_guru, role').eq('uid_rfid', rfid_uid).maybeSingle();
        if (guru) {
          namaPengguna = guru.nama_guru;
          kelasPengguna = guru.role === 'admin' ? "MASTER / ADMIN" : 'GURU / STAFF';
        }
      }

      const { data: inserted } = await supabase
        .from('absensi')
        .insert([{
          rfid_uid: rfid_uid,
          nama: namaPengguna,
          kelas: kelasPengguna,
          status: new_status,
          created_at: nowIso,
          updated_by: admin_name,
          updated_at: nowIso
        }])
        .select()
        .single();

      if (inserted) {
        absensiId = inserted.id;
      }
    }

    // Catat ke audit log
    await supabase.from('audit_log_presensi').insert([{
      absensi_id: absensiId,
      rfid_uid: rfid_uid,
      status_lama: oldStatus,
      status_baru: new_status,
      admin_nama: admin_name,
      created_at: nowIso
    }]);

    return NextResponse.json({
      success: true,
      message: 'Status berhasil diperbarui',
      data: {
        rfid_uid,
        status: new_status,
        updated_by: admin_name,
        updated_at: nowIso
      }
    }, { status: 200 });

  } catch (err: any) {
    console.error('[API Update Status Error]:', err);
    return NextResponse.json({ success: false, message: 'Server Internal Error' }, { status: 500 });
  }
}
