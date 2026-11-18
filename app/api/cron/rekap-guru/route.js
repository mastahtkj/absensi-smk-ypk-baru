import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchAbsensiRange } from '../../../lib/absensiQuery';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wpyfwkcevgdhkazeesdq.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseAnonKey);


// 🇮🇩 DETEKSI HARI LIBUR NASIONAL & TANGGAL MERAH INDONESIA
async function checkIsHariLibur(dateJakarta) {
  const dayOfWeek = dateJakarta.getDay(); // 0: Minggu, 6: Sabtu
  if (dayOfWeek === 0) return { isLibur: true, alasan: 'Hari Minggu (Akhir Pekan)' };
  if (dayOfWeek === 6) return { isLibur: true, alasan: 'Hari Sabtu (Akhir Pekan)' };

  const yyyy = dateJakarta.getFullYear();
  const mm = String(dateJakarta.getMonth() + 1).padStart(2, '0');
  const dd = String(dateJakarta.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}-${mm}-${dd}`;
  const shortDateStr = `${mm}-${dd}`;

  // 1. Tanggal Libur Nasional Tetap Indonesia
  const fixedHolidays = {
    '01-01': 'Tahun Baru Masehi',
    '05-01': 'Hari Buruh Internasional',
    '06-01': 'Hari Lahir Pancasila',
    '08-17': 'Hari Kemerdekaan Republik Indonesia (HUT RI)',
    '12-25': 'Hari Raya Natal',
  };

  if (fixedHolidays[shortDateStr]) {
    return { isLibur: true, alasan: fixedHolidays[shortDateStr] };
  }

  // 2. Cek API Kalender Libur Nasional Indonesia Online
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`https://dayoffapi.vercel.app/api?month=${dateJakarta.getMonth() + 1}&year=${yyyy}`, {
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        const found = data.find((h) => h.tanggal === dateStr || h.tanggal === `${yyyy}-${Number(mm)}-${Number(dd)}`);
        if (found && (found.is_cuti === true || found.keterangan)) {
          return { isLibur: true, alasan: found.keterangan || 'Libur Nasional / Cuti Bersama' };
        }
      }
    }
  } catch (err) {
    console.log('[Info] Cek API Libur Nasional offline, menggunakan kalender lokal.');
  }

  return { isLibur: false, alasan: 'Hari Kerja Normal' };
}

function formatPhoneNumber(phone) {
  if (!phone) return null;
  let cleaned = String(phone).trim();
  if (cleaned.endsWith('@g.us')) return cleaned;
  cleaned = cleaned.replace(/\D/g, '');
  if (cleaned.startsWith('0')) cleaned = '62' + cleaned.slice(1);
  else if (cleaned.startsWith('8')) cleaned = '62' + cleaned;
  return cleaned.length >= 10 ? cleaned : null;
}


async function generateAndSendTeacherRecap(force = false, providedGuruList = null, providedLogs = null) {
  const now = new Date();
  const options = { timeZone: 'Asia/Jakarta' };
  const jakartaDateStr = now.toLocaleDateString('en-CA', options); // YYYY-MM-DD
  const jakartaTimeStr = now.toLocaleTimeString('id-ID', { ...options, hour: '2-digit', minute: '2-digit' });
  const jakartaDateObj = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));

  // Cek Apakah Hari Libur / Tanggal Merah
  const holidayCheck = await checkIsHariLibur(jakartaDateObj);
  if (!force && holidayCheck.isLibur) {
    return {
      success: true,
      skipped: true,
      reason: `Pengiriman dilewati karena hari ini: ${holidayCheck.alasan}`,
      date: jakartaDateStr,
    };
  }

  // 1. Ambil Master Data Guru (Prioritas: Body Request > tb_guru > tb_siswa)
  let guruMasterList = Array.isArray(providedGuruList) && providedGuruList.length > 0 ? providedGuruList : null;

  if (!guruMasterList) {
    try {
      const { data: guruData } = await supabase.from('tb_guru').select('*').order('nama_guru', { ascending: true });
      if (Array.isArray(guruData) && guruData.length > 0) {
        guruMasterList = guruData.map((g) => ({
          id_guru: g.id_guru,
          nama: g.nama_guru || g.nama,
          jabatan: g.jabatan || 'Guru',
        }));
      }
    } catch (e) {
      console.log('tb_guru fetch error:', e);
    }
  }

  if (!guruMasterList) {
    try {
      const { data: siswaData } = await supabase.from('tb_siswa').select('*');
      if (Array.isArray(siswaData)) {
        const teachers = siswaData.filter(
          (s) =>
            (s.role && s.role.toLowerCase().includes('guru')) ||
            (s.kelas && (s.kelas.toLowerCase().includes('guru') || s.kelas.toLowerCase().includes('staff')))
        );
        if (teachers.length > 0) {
          guruMasterList = teachers.map((g) => ({
            id_guru: g.id_guru || g.id,
            nama: g.nama_siswa || g.nama,
            jabatan: g.kelas || 'Guru',
          }));
        }
      }
    } catch (e) {
      console.log('tb_siswa teacher fallback error:', e);
    }
  }

  if (!guruMasterList || guruMasterList.length === 0) {
    return { success: false, message: 'Data master guru tidak ditemukan di sistem.' };
  }

  // 2. Ambil Log Presensi Hari Ini
  let logs = Array.isArray(providedLogs) ? providedLogs : null;
  if (!logs) {
    const startOfDay = `${jakartaDateStr}T00:00:00.000+07:00`;
    const endOfDay = `${jakartaDateStr}T23:59:59.999+07:00`;

    const { data: absensiHariIni } = await fetchAbsensiRange(
      supabase,
      '*',
      { startOfDay, endOfDay }
    );

    logs = absensiHariIni || [];
  }

  // 3. Klasifikasikan Kehadiran Tiap Guru
  let countHadir = 0;
  let countTelat = 0;
  let countSakit = 0;
  let countIzin = 0;
  let countAlpa = 0;

  const teacherSummary = guruMasterList.map((guru) => {
    const guruNama = String(guru.nama || guru.nama_guru || '').trim().toLowerCase();

    const log = logs.find((l) => {
      const matchId = (guru.id_guru && l.id_guru && String(l.id_guru) === String(guru.id_guru));
      const matchNama = l.nama && l.nama.trim().toLowerCase() === guruNama;
      return matchId || matchNama;
    });

    let status = 'Alpa (Belum Hadir)';
    let jamMasuk = '-';
    let jamPulang = '-';
    let detailKeterangan = '';

    if (log) {
      status = log.status || 'Hadir';
      jamMasuk = log.jam_masuk || '-';
      jamPulang = log.jam_pulang || '-';

      if (log.materi_nama) detailKeterangan += ` [Materi: ${log.materi_nama}]`;
      if (log.keterangan_materi) detailKeterangan += ` [Tugas: ${log.keterangan_materi}]`;
    }

    const stUpper = status.toUpperCase();
    if (stUpper.includes('TELAT')) countTelat++;
    else if (stUpper.includes('SAKIT')) countSakit++;
    else if (stUpper.includes('IZIN')) countIzin++;
    else if (stUpper.includes('HADIR')) countHadir++;
    else countAlpa++;

    return {
      nama: guru.nama || guru.nama_guru,
      jabatan: guru.jabatan || 'Guru',
      status,
      jamMasuk,
      jamPulang,
      detailKeterangan,
    };
  });
  teacherSummary.sort((a, b) => (a.nama || '').localeCompare(b.nama || '', 'id', { sensitivity: 'base' }));

  const totalGuru = guruMasterList.length;
  const totalHadirKeseluruhan = countHadir + countTelat;
  const persentase = totalGuru > 0 ? Math.round((totalHadirKeseluruhan / totalGuru) * 100) : 0;

  const tanggalFormatIndo = jakartaDateObj.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // 4. Susun Pesan Rekap WhatsApp Resmi
  let waMessage = `📊 *REKAPITULASI PRESENSI HARIAN GURU & STAFF*\n`;
  waMessage += `🏫 *SMK YPK MEDAN*\n`;
  waMessage += `📅 Hari/Tanggal: *${tanggalFormatIndo}*\n`;
  waMessage += `⏰ Waktu Kirim: *${jakartaTimeStr} WIB*\n`;
  waMessage += `═════════════════════════\n\n`;

  waMessage += `📈 *RINGKASAN STATISTIK KEHADIRAN:*\n`;
  waMessage += `👥 Total Guru Terdata: *${totalGuru} Orang*\n`;
  waMessage += `🟢 Hadir Tepat Waktu: *${countHadir}*\n`;
  waMessage += `🟠 Hadir Telat: *${countTelat}*\n`;
  waMessage += `🟡 Sakit: *${countSakit}*\n`;
  waMessage += `🟣 Izin: *${countIzin}*\n`;
  waMessage += `🔴 Tanpa Keterangan / Alpa: *${countAlpa}*\n`;
  waMessage += `📊 Persentase Kehadiran: *${persentase}%*\n\n`;
  waMessage += `═════════════════════════\n`;
  waMessage += `📋 *DAFTAR RINCIAN PRESENSI GURU:*\n\n`;

  teacherSummary.forEach((g, idx) => {
    let iconStatus = '🔴';
    const s = g.status.toUpperCase();
    if (s.includes('HADIR') && !s.includes('TELAT')) iconStatus = '🟢';
    else if (s.includes('TELAT')) iconStatus = '🟠';
    else if (s.includes('SAKIT')) iconStatus = '🟡';
    else if (s.includes('IZIN')) iconStatus = '🟣';

    waMessage += `${idx + 1}. ${iconStatus} *${g.nama}*\n`;
    waMessage += `   • Status: ${g.status}\n`;
    waMessage += `   • Masuk: ${g.jamMasuk} | Pulang: ${g.jamPulang}\n`;
    if (g.detailKeterangan) {
      waMessage += `   • Ket: ${g.detailKeterangan}\n`;
    }
    waMessage += `\n`;
  });

  waMessage += `═════════════════════════\n`;
  waMessage += `_Laporan ini dihasilkan otomatis oleh Sistem Presensi Digital SMK YPK Medan pada jam 20.00 WIB._\n`;
  waMessage += `_Salam, TJKT Project's SMK YPK Medan_ ✨`;

  // 5. Kirim Rekap ke APLIKASI (realtime broadcast, tanpa WhatsApp/Kirimi)
  let broadcastSuccess = false;
  try {
    await supabase.channel('smk_ypk_global_notifications_sync').send({
      type: 'broadcast',
      event: 'rekap_guru',
      payload: {
        type: 'rekap_guru',
        judul: `Rekap Presensi Guru & Staff - ${jakartaDateStr}`,
        ringkasan: waMessage,
        tanggal: jakartaDateStr,
        waktu: `${jakartaTimeStr} WIB`,
        totalGuru,
        countHadir,
        countTelat,
        countSakit,
        countIzin,
        countAlpa,
        persentase,
        created_at: new Date().toISOString(),
      },
    });
    broadcastSuccess = true;
  } catch (e) {
    console.warn('[Rekap Guru] Broadcast realtime gagal:', e?.message);
  }

  return {
    success: true,
    sentToWa: broadcastSuccess,
    broadcast: broadcastSuccess,
    targetGroup: 'Aplikasi Super App (realtime)',
    date: jakartaDateStr,
    totalGuru,
    countHadir,
    countTelat,
    countSakit,
    countIzin,
    countAlpa,
    persentase,
  };
}

// ENDPOINT CRON (GET / POST)
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const force = searchParams.get('force') === 'true' || searchParams.get('test') === 'true';

    const result = await generateAndSendTeacherRecap(force);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const force = body.force === true;
    const providedGuruList = body.guruList || null;
    const providedLogs = body.absensiLogs || null;

    const result = await generateAndSendTeacherRecap(force, providedGuruList, providedLogs);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
