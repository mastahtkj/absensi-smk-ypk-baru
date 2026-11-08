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

function formatPhoneNumber(phone) {
  if (!phone) return null;
  let cleaned = String(phone).trim();
  
  if (cleaned.endsWith('@g.us')) return cleaned;

  cleaned = cleaned.replace(/\D/g, '');
  if (cleaned.startsWith('0')) cleaned = '62' + cleaned.slice(1);
  else if (cleaned.startsWith('8')) cleaned = '62' + cleaned;
  
  return cleaned.length >= 10 ? cleaned : null;
}

async function sendWhatsAppMessage(targetNumber, messageText) {
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
  } catch (err) {
    console.error('[Kirimi.id Exception]:', err.message);
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
// 1. HANDLER GET (REKAP REALTIME & POLLING UID)
// ==========================================
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Menerima permintaan polling UID kartu terbaru untuk registrasi kartu di web
    if (action === 'get_latest_scan') {
      const { data: latest } = await supabase
        .from('latest_scan')
        .select('uid, updated_at')
        .eq('id', 1)
        .maybeSingle();

      return NextResponse.json({
        success: true,
        uid: latest?.uid || null,
        updated_at: latest?.updated_at || null
      }, { status: 200 });
    }

    // Default: Rekap Absensi Khusus SISWA untuk Tampilan LCD & Web
    const { startOfDay, endOfDay } = getTodayBoundaryWIB();

    const [
      { data: absensiHariIni, error: errorAbsensi },
      { data: totalSiswaData },
      { data: listGuruData }
    ] = await Promise.all([
      supabase
        .from('absensi')
        .select('status, rfid_uid, kelas, nama')
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay),
      supabase.from('tb_siswa').select('uid_rfid'),
      supabase.from('tb_guru').select('uid_rfid')
    ]);

    if (errorAbsensi) {
      return NextResponse.json({ success: false, message: 'Gagal mengambil data absensi' }, { status: 500 });
    }

    // Buat daftar UID Guru agar TIDAK masuk ke perhitungan siswa
    const guruUidSet = new Set(
      (listGuruData || [])
        .filter((g) => g.uid_rfid)
        .map((g) => String(g.uid_rfid).trim().toUpperCase())
    );

    let hadir = 0, sakit = 0, izin = 0, alphaManual = 0;

    if (absensiHariIni && absensiHariIni.length > 0) {
      absensiHariIni.forEach((row) => {
        const rowUid = String(row.rfid_uid || '').trim().toUpperCase();
        const rowKelas = String(row.kelas || '').toLowerCase();

        // FILTER: Jangan hitung jika yang absen adalah Guru / Staff!
        const isGuru =
          guruUidSet.has(rowUid) ||
          rowKelas.includes('guru') ||
          rowKelas.includes('staff') ||
          rowKelas.includes('admin') ||
          rowKelas.includes('master');

        if (isGuru) return; // Lewati guru, hanya hitung siswa!

        const st = String(row.status || '').toLowerCase().trim();
        if (st.includes('hadir') || st.includes('telat') || st.includes('tanpa kartu')) hadir++;
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
      total_siswa: totalSiswaData ? totalSiswaData.length : 0,
      updated_at: new Date().toISOString()
    }, { status: 200 });

  } catch (err) {
    return NextResponse.json({ success: false, message: 'Server Internal Error' }, { status: 500 });
  }
}

// ==========================================
// 2. HANDLER POST (UNTUK TAP RFID / NFC KILAT)
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

    // 1. CEK SISWA (Pencarian fleksibel & cepat)
    const { data: siswa } = await supabase
      .from('tb_siswa')
      .select('*')
      .or(`uid_rfid.ilike.${cleanUid},uid_rfid.ilike.%${cleanUid}%`)
      .maybeSingle();

    if (siswa) {
      const namaSiswa = siswa.nama_siswa || 'Siswa';
      const kelasSiswa = siswa.kelas || '-';
      const jurusanSiswa = siswa.jurusan || '-';
      const inisialSiswa = namaSiswa.trim().split(' ')[0];

      // Cek apakah sudah absen hari ini
      const { data: sudahAbsen } = await supabase
        .from('absensi')
        .select('id')
        .or(`rfid_uid.ilike.${cleanUid},rfid_uid.ilike.%${cleanUid}%`)
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

      // Catat presensi dan update buffer latest_scan secara paralel
      Promise.allSettled([
        supabase.from('absensi').insert([{
          rfid_uid: cleanUid,
          nama: namaSiswa,
          kelas: kelasSiswa,
          status: statusTap,
          created_at: new Date().toISOString(),
        }]),
        supabase.from('latest_scan').upsert([{ id: 1, uid: cleanUid, updated_at: new Date().toISOString() }])
      ]);

      // Kirim WhatsApp secara non-blocking di background (tidak menahan respon alat)
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

    // 2. CEK GURU (Pencarian fleksibel)
    const { data: guru } = await supabase
      .from('tb_guru')
      .select('*')
      .or(`uid_rfid.ilike.${cleanUid},uid_rfid.ilike.%${cleanUid}%`)
      .maybeSingle();

    if (guru) {
      const namaGuru = guru.nama_guru;
      const jabatan = guru.role === 'admin' ? "MASTER / ADMIN" : 'GURU / STAFF';
      const inisialGuru = guru.inisial || namaGuru.trim().split(' ')[0];

      // Cek apakah guru sudah absen hari ini
      const { data: sudahAbsenGuru } = await supabase
        .from('absensi')
        .select('id')
        .or(`rfid_uid.ilike.${cleanUid},rfid_uid.ilike.%${cleanUid}%`)
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

      // Catat presensi guru
      Promise.allSettled([
        supabase.from('absensi').insert([{
          rfid_uid: cleanUid,
          nama: namaGuru,
          kelas: jabatan,
          status: statusTap,
          created_at: new Date().toISOString(),
        }]),
        supabase.from('latest_scan').upsert([{ id: 1, uid: cleanUid, updated_at: new Date().toISOString() }])
      ]);

      // Kirim WhatsApp Guru
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

    // 3. JIKA BELUM TERDAFTAR: Tetap simpan ke latest_scan agar bisa langsung didaftarkan di web
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
// 3. HANDLER PUT / PATCH (UPDATE STATUS MANUAL)
// ==========================================
export async function PUT(request) {
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

      await supabase
        .from('absensi')
        .update({
          status: new_status,
          updated_by: admin_name,
          updated_at: nowIso
        })
        .eq('id', existingAbsensi.id);
    } else {
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

  } catch (err) {
    console.error('[API Update Status Error]:', err);
    return NextResponse.json({ success: false, message: 'Server Internal Error' }, { status: 500 });
  }
}

// ==========================================
// 4. HANDLER DELETE (KOSONGKAN BUFFER LATEST_SCAN)
// ==========================================
export async function DELETE() {
  try {
    await supabase.from('latest_scan').upsert([{ id: 1, uid: null, updated_at: new Date().toISOString() }]);

    return NextResponse.json({
      success: true,
      message: 'Buffer scan berhasil dikosongkan'
    }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ success: false, message: 'Gagal mereset buffer scan' }, { status: 500 });
  }
}
