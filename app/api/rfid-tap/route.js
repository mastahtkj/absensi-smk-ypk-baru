import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const KIRIMI_USER_CODE = process.env.KIRIMI_USER_CODE || 'KMQZ4Y0826';
const KIRIMI_SECRET = process.env.KIRIMI_SECRET_KEY || process.env.KIRIMI_SECRET || 'b764c93a42e511076a8ddd201717e4a4967ca8271ae1581c3ae33641d9f18e80';
const KIRIMI_DEVICE_ID = process.env.KIRIMI_DEVICE_ID || 'D-QYXDB';
const KIRIMI_API_URL = 'https://api.kirimi.id/v1/send-message';

function formatPhoneNumber(phone) {
  if (!phone) return null;
  let cleaned = String(phone).replace(/\D/g, '');
  
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (cleaned.startsWith('8')) {
    cleaned = '62' + cleaned;
  }
  
  return cleaned.length >= 10 ? cleaned : null;
}

async function sendWhatsAppMessage(targetNumber, messageText) {
  const formattedNumber = formatPhoneNumber(targetNumber);
  if (!formattedNumber) {
    console.error(`[Kirimi.id Error] Nomor WhatsApp tidak valid: ${targetNumber}`);
    return false;
  }

  try {
    const response = await fetch(KIRIMI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${KIRIMI_SECRET}`,
      },
      body: JSON.stringify({
        user_code: KIRIMI_USER_CODE,
        secret: KIRIMI_SECRET, // <--- MENAMBAHKAN PARAMETER INI
        device_id: KIRIMI_DEVICE_ID,
        receiver: formattedNumber,
        message: messageText,
      }),
      cache: 'no-store',
    });

    const result = await response.json().catch(() => ({}));
    console.log(`[Kirimi.id Response] Status ${response.status} to ${formattedNumber}:`, result);
    return response.ok && result.success === true;
  } catch (err) {
    console.error(`[Kirimi.id Exception] Failed to send to ${formattedNumber}:`, err.message);
    return false;
  }
}

// Fungsi pembantu untuk mendapatkan rentang awal dan akhir hari ini (WIB) dalam UTC ISO String
function getTodayBoundaryWIB() {
  const now = new Date();
  
  // Konversi waktu saat ini ke string tanggal format YYYY-MM-DD di zona Asia/Jakarta
  const options = { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' };
  const formatter = new Intl.DateTimeFormat('en-CA', options);
  const tanggalWib = formatter.format(now); // Output: "YYYY-MM-DD"

  // Rentang 00:00:00.000 sampai 23:59:59.999 dalam waktu WIB (UTC+7)
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

    // Hitung batas waktu awal dan akhir hari ini
    const { startOfDay, endOfDay } = getTodayBoundaryWIB();

    // ==========================================
    // 1. CEK SISWA
    // ==========================================
    const { data: siswa, error: errorSiswa } = await supabase
      .from('tb_siswa')
      .select('*')
      .eq('uid_rfid', cleanUid)
      .maybeSingle();

    if (errorSiswa) {
      console.error('[Supabase Error - Siswa]:', errorSiswa.message);
    }

    if (siswa) {
      const namaSiswa = siswa.nama_siswa || siswa.nama || 'Siswa';
      const kelasSiswa = siswa.kelas || siswa.nama_kelas || siswa.tingkat || '-';
      const jurusanSiswa = siswa.jurusan || siswa.nama_jurusan || siswa.proli || '-';
      const inisialSiswa = namaSiswa.trim().split(' ')[0];

      // --- CEK APAKAH SUDAH PRESENSI HARI INI ---
      const { data: sudahAbsen } = await supabase
        .from('absensi')
        .select('id')
        .eq('rfid_uid', cleanUid)
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
        .maybeSingle();

      if (sudahAbsen) {
        console.warn(`[Anti-Spam] Siswa ${namaSiswa} (${cleanUid}) sudah tap hari ini.`);
        return NextResponse.json({
          success: false,
          already_tapped: true,
          message: 'Anda sudah presensi hari ini!',
          type: 'siswa',
          nama: namaSiswa,
          nama_siswa: namaSiswa,
          kelas: kelasSiswa,
          jurusan: jurusanSiswa,
          inisial: inisialSiswa,
          info: 'Sudah Absen Hari Ini',
        }, { status: 200 }); // Tetap return HTTP 200 agar ESP/LCD bisa membaca pesan tanpa throw error
      }

      // --- JIKA BELUM PRESENSI: SIMPAN DATA & KIRIM WA ---
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

      const rawOrtu = siswa.no_wa_ortu || siswa.no_hp_ortu || siswa.hp_ortu || siswa.no_ortu;
      const rawPribadi = siswa.no_wa_pribadi || siswa.no_hp || siswa.no_wa || siswa.hp;

      const listNomor = [rawOrtu, rawPribadi].filter(Boolean);

      if (listNomor.length > 0) {
        for (const nomor of listNomor) {
          await sendWhatsAppMessage(nomor, pesanWa);
        }
      }

      return NextResponse.json({
        success: true,
        type: 'siswa',
        nama: namaSiswa,
        nama_siswa: namaSiswa,
        kelas: kelasSiswa,
        jurusan: jurusanSiswa,
        inisial: inisialSiswa,
        info: `${kelasSiswa} ${jurusanSiswa}`,
        target_nomor: listNomor,
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

    if (errorGuru) {
      console.error('[Supabase Error - Guru]:', errorGuru.message);
    }

    if (guru) {
      const namaGuru = guru.nama_guru || guru.nama;
      const jabatan = guru.role === 'admin' ? "MASTER'K" : (guru.jabatan || 'Guru / Staff');
      const inisialGuru = guru.inisial || namaGuru.trim().split(' ')[0];

      // --- CEK APAKAH SUDAH PRESENSI HARI INI ---
      const { data: sudahAbsenGuru } = await supabase
        .from('absensi')
        .select('id')
        .eq('rfid_uid', cleanUid)
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
        .maybeSingle();

      if (sudahAbsenGuru) {
        console.warn(`[Anti-Spam] Guru ${namaGuru} (${cleanUid}) sudah tap hari ini.`);
        return NextResponse.json({
          success: false,
          already_tapped: true,
          message: 'Anda sudah presensi hari ini!',
          type: 'guru',
          nama: namaGuru,
          nama_guru: namaGuru,
          kelas: jabatan,
          jurusan: 'GURU/STAFF',
          inisial: inisialGuru,
          info: 'Sudah Absen Hari Ini',
        }, { status: 200 });
      }

      // --- JIKA BELUM PRESENSI: SIMPAN DATA & KIRIM WA ---
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

      const nomorGuru = guru.no_wa_pribadi || guru.no_hp || guru.no_wa;

      if (nomorGuru) {
        await sendWhatsAppMessage(nomorGuru, pesanWaGuru);
      }

      return NextResponse.json({
        success: true,
        type: 'guru',
        nama: namaGuru,
        nama_guru: namaGuru,
        kelas: jabatan,
        jurusan: 'GURU/STAFF',
        info: jabatan,
        inisial: inisialGuru,
        target_nomor: nomorGuru || 'TIDAK ADA NOMOR',
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
      kelas: '-',
      jurusan: '-',
    }, { status: 404 });

  } catch (err) {
    console.error('[API Error]:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
