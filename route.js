import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const preferredRegion = ['sin1']; // ⚡ Region Singapura (Terdekat dengan Medan / Indonesia)
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

function getTodayBoundaryWIB() {
  const now = new Date();
  const options = { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' };
  const formatter = new Intl.DateTimeFormat('en-CA', options);
  const tanggalWib = formatter.format(now);

  const startOfDay = new Date(`${tanggalWib}T00:00:00.000+07:00`).toISOString();
  const endOfDay = new Date(`${tanggalWib}T23:59:59.999+07:00`).toISOString();

  return { startOfDay, endOfDay, tanggalWib };
}

// 🕒 ATURAN WAKTU PRESENSI:
// 1. SISWA: 06.30 - 07.30 WIB = HADIR, > 07.30 WIB = TELAT (Tetap bisa tap & kirim WA Telat)
// 2. GURU: TIDAK ADA KATA TELAT, SEMUA HADIR BEBAS JAM
function calculateWibAttendanceStatus(isGuru = false, incomingStatus = '') {
  if (isGuru) {
    return 'Hadir';
  }

  if (incomingStatus && incomingStatus !== 'Hadir' && incomingStatus !== 'Hadir (Test Mode)' && !incomingStatus.includes('Terlalu Cepat')) {
    return incomingStatus;
  }

  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Jakarta',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });
  const [hourStr, minStr] = timeStr.split(':');
  const totalMinutes = parseInt(hourStr, 10) * 60 + parseInt(minStr, 10);

  const limit0730 = 7 * 60 + 30; // 07:30 WIB = 450 menit

  if (totalMinutes > limit0730) {
    return 'Telat';
  }
  return 'Hadir';
}

// ==========================================
// 1. HANDLER GET (REKAP REALTIME & POLLING UID)
// ==========================================
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Polling UID untuk registrasi kartu di web
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

    // Rekap Absensi Hari Ini
    const { startOfDay, endOfDay } = getTodayBoundaryWIB();

    const [
      { data: absensiHariIni, error: errorAbsensi },
      { data: totalSiswaData },
      { data: listGuruData }
    ] = await Promise.all([
      supabase
        .from('absensi')
        .select('status, rfid_uid, kelas, nama, jam_masuk, jam_pulang, tipe')
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay),
      supabase.from('tb_siswa').select('uid_rfid'),
      supabase.from('tb_guru').select('uid_rfid')
    ]);

    if (errorAbsensi) {
      return NextResponse.json({ success: false, message: 'Gagal mengambil data absensi' }, { status: 500 });
    }

    const guruUidSet = new Set(
      (listGuruData || [])
        .filter((g) => g.uid_rfid)
        .map((g) => String(g.uid_rfid).trim().toUpperCase())
    );

    let hadir = 0, telat = 0, sakit = 0, izin = 0, alpa = 0, pulangCount = 0;

    if (absensiHariIni && absensiHariIni.length > 0) {
      absensiHariIni.forEach((row) => {
        const rowUid = String(row.rfid_uid || '').trim().toUpperCase();
        const rowKelas = String(row.kelas || '').toLowerCase();

        const isGuru =
          guruUidSet.has(rowUid) ||
          rowKelas.includes('guru') ||
          rowKelas.includes('staff') ||
          rowKelas.includes('admin') ||
          rowKelas.includes('master');

        if (isGuru) return;

        const st = String(row.status || '').toLowerCase().trim();
        if (st.includes('telat')) telat++;
        else if (st.includes('hadir') || st.includes('tanpa kartu')) hadir++;
        else if (st.includes('sakit')) sakit++;
        else if (st.includes('izin')) izin++;
        else if (st.includes('alpa') || st.includes('alpha')) alpa++;

        if (row.jam_pulang || row.tipe === 'pulang_selesai') pulangCount++;
      });
    }

    return NextResponse.json({
      success: true,
      hadir,
      telat,
      sakit,
      izin,
      alpa,
      pulang: pulangCount,
      total_siswa: totalSiswaData ? totalSiswaData.length : 0,
      updated_at: new Date().toISOString()
    }, { status: 200 });

  } catch (err) {
    return NextResponse.json({ success: false, message: 'Server Internal Error' }, { status: 500 });
  }
}

// ==========================================
// 2. HANDLER POST (UNTUK TAP RFID / NFC: MASUK & PULANG)
// ==========================================
export async function POST(request) {
  try {
    const body = await request.json();
    const rawUid = body.rfid_uid || body.uid_rfid || body.uid;
    const clientStatus = body.status || 'Hadir';

    if (!rawUid) {
      return NextResponse.json({ success: false, message: 'UID RFID tidak ditemukan' }, { status: 400 });
    }

    const cleanUid = String(rawUid).trim().toUpperCase();
    const rawAlphaUid = cleanUid.replace(/[^A-Za-z0-9]/g, '');
    const spacedUid = rawAlphaUid.match(/.{1,2}/g)?.join(' ') || cleanUid;
    const colonUid = rawAlphaUid.match(/.{1,2}/g)?.join(':') || cleanUid;
    const hyphenUid = rawAlphaUid.match(/.{1,2}/g)?.join('-') || cleanUid;

    const jamWibSingkat = new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jakarta',
    });

    const { startOfDay, endOfDay } = getTodayBoundaryWIB();

    // ⚡ 1. FAST MULTI-VARIANT TARGETED LOOKUP: Cari Siswa, Guru, dan Log Hari Ini
    const [
      { data: siswaDataList },
      { data: guruDataList },
      { data: logsHariIniList }
    ] = await Promise.all([
      supabase
        .from('tb_siswa')
        .select('id_siswa, nama_siswa, kelas, jurusan, uid_rfid')
        .or(`uid_rfid.ilike.%${cleanUid}%,uid_rfid.ilike.%${rawAlphaUid}%,uid_rfid.ilike.%${spacedUid}%,uid_rfid.ilike.%${colonUid}%,uid_rfid.ilike.%${hyphenUid}%`)
        .limit(5),
      supabase
        .from('tb_guru')
        .select('id_guru, nama_guru, inisial, role, uid_rfid, username')
        .or(`uid_rfid.ilike.%${cleanUid}%,uid_rfid.ilike.%${rawAlphaUid}%,uid_rfid.ilike.%${spacedUid}%,uid_rfid.ilike.%${colonUid}%,uid_rfid.ilike.%${hyphenUid}%`)
        .limit(5),
      supabase
        .from('absensi')
        .select('*')
        .or(`rfid_uid.eq.${cleanUid},rfid_uid.ilike.%${cleanUid}%,rfid_uid.ilike.%${rawAlphaUid}%`)
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
        .order('created_at', { ascending: false })
        .limit(10)
    ]);

    let siswa = siswaDataList?.find((s) => {
      const dbUid = String(s.uid_rfid || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      return dbUid === rawAlphaUid || (rawAlphaUid.length >= 4 && dbUid.includes(rawAlphaUid)) || (dbUid.length >= 4 && rawAlphaUid.includes(dbUid));
    }) || (siswaDataList && siswaDataList.length > 0 ? siswaDataList[0] : null);

    let guru = guruDataList?.find((g) => {
      const dbUid = String(g.uid_rfid || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      return dbUid === rawAlphaUid || (rawAlphaUid.length >= 4 && dbUid.includes(rawAlphaUid)) || (dbUid.length >= 4 && rawAlphaUid.includes(dbUid));
    }) || (guruDataList && guruDataList.length > 0 ? guruDataList[0] : null);

    // 🔍 Fallback pencarian fuzzy ke seluruh tabel jika belum ketemu (misal format spasi/hex tidak terduga)
    if (!siswa && !guru) {
      const [{ data: allSiswa }, { data: allGuru }] = await Promise.all([
        supabase.from('tb_siswa').select('id_siswa, nama_siswa, kelas, jurusan, uid_rfid').not('uid_rfid', 'is', null),
        supabase.from('tb_guru').select('id_guru, nama_guru, inisial, role, uid_rfid, username').not('uid_rfid', 'is', null)
      ]);

      if (allSiswa && allSiswa.length > 0) {
        siswa = allSiswa.find((s) => {
          const dbClean = String(s.uid_rfid || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
          return dbClean && (dbClean === rawAlphaUid || (rawAlphaUid.length >= 4 && (dbClean.includes(rawAlphaUid) || rawAlphaUid.includes(dbClean))));
        }) || null;
      }

      if (!siswa && allGuru && allGuru.length > 0) {
        guru = allGuru.find((g) => {
          const dbClean = String(g.uid_rfid || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
          return dbClean && (dbClean === rawAlphaUid || (rawAlphaUid.length >= 4 && (dbClean.includes(rawAlphaUid) || rawAlphaUid.includes(dbClean))));
        }) || null;
      }

      // Hardcoded fallback khusus bila ada UID legacy
      if (!siswa && !guru) {
        if (cleanUid === 'DB1FD705' || rawAlphaUid === 'DB1FD705') {
          const { data: gYenni } = await supabase.from('tb_guru').select('id_guru, nama_guru, inisial, role, uid_rfid, username').ilike('nama_guru', '%yenni%').limit(1).maybeSingle();
          if (gYenni) guru = gYenni;
        } else if (cleanUid === 'D916D905' || rawAlphaUid === 'D916D905') {
          const { data: gDede } = await supabase.from('tb_guru').select('id_guru, nama_guru, inisial, role, uid_rfid, username').ilike('nama_guru', '%dede%').limit(1).maybeSingle();
          if (gDede) guru = gDede;
        }
      }
    }

    // 🛡️ Prioritaskan Guru jika terdeteksi di tb_guru agar pesan selalu masuk ke Grup Guru
    if (guru) {
      siswa = null;
    }

    // 🎯 Cari Log Presensi Hari Ini yang benar-benar cocok dengan Siswa/Guru tersebut
    const logHariIni = logsHariIniList?.find((l) => {
      const lUid = String(l.rfid_uid || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      if (lUid && rawAlphaUid && (lUid === rawAlphaUid || lUid.includes(rawAlphaUid) || rawAlphaUid.includes(lUid))) {
        return true;
      }
      if (siswa && l.nama && l.nama.trim().toLowerCase() === siswa.nama_siswa?.trim().toLowerCase()) {
        return true;
      }
      if (guru && l.nama && l.nama.trim().toLowerCase() === guru.nama_guru?.trim().toLowerCase()) {
        return true;
      }
      return false;
    }) || null;

    // ==============================================================
    // 👨‍🏫 A. JIKA KARTU TERDAFTAR SEBAGAI GURU / STAFF
    // ==============================================================
    if (guru) {
      const namaGuru = (guru.nama_guru || 'Guru / Staff').trim().replace(/\s+/g, ' ');
      const jabatan = guru.role === 'admin' ? "MASTER / ADMIN" : 'GURU / STAFF';
      const inisialGuru = (guru.inisial && guru.inisial.trim() !== '') ? guru.inisial.trim().toUpperCase() : namaGuru.split(' ')[0].toUpperCase();

      const isLogAlreadyRealMasuk = Boolean(
        logHariIni &&
        (logHariIni.tipe === 'masuk' || logHariIni.tipe === 'pulang_selesai' || logHariIni.jam_pulang || (logHariIni.jam_masuk && !['alpa', 'alpha', 'sakit', 'izin', 'belum hadir'].includes(String(logHariIni.status || '').toLowerCase().trim())))
      );

      if (logHariIni && isLogAlreadyRealMasuk) {
        // TAP 3+ : JIKA SUDAH TAP PULANG SEBELUMNYA
        if (logHariIni.jam_pulang || logHariIni.tipe === 'pulang_selesai' || String(logHariIni.status || '').toLowerCase().includes('pulang')) {
          return NextResponse.json({
            success: false,
            already_tapped: true,
            already_pulang: true,
            message: 'Bapak/Ibu Guru sudah presensi Masuk dan Pulang hari ini!',
            type: 'guru',
            nama: namaGuru,
            kelas: jabatan,
            jurusan: 'GURU/STAFF',
            inisial: inisialGuru,
            jam_masuk: logHariIni.jam_masuk || '-',
            jam_pulang: logHariIni.jam_pulang,
            info: 'Sudah Tap Masuk & Pulang',
          }, { status: 200 });
        }

        // 🟡 PROTEKSI TAP CEPAT (< 5 MENIT SEJAK TAP MASUK) -> Mencegah double tap tidak sengaja
        let minutesSinceMasuk = 999;
        if (logHariIni.created_at) {
          const masukTime = new Date(logHariIni.created_at).getTime();
          const nowTime = new Date().getTime();
          minutesSinceMasuk = (nowTime - masukTime) / (1000 * 60);
        }

        if (minutesSinceMasuk < 5) {
          await supabase.from('latest_scan').upsert([{ id: 1, uid: cleanUid, updated_at: new Date().toISOString() }]);

          return NextResponse.json({
            success: true,
            already_presensi: true,
            action: 'sudah_presensi',
            type: 'guru',
            nama: namaGuru,
            kelas: jabatan,
            role: jabatan,
            jurusan: 'GURU/STAFF',
            inisial: inisialGuru,
            status: logHariIni.status || 'Hadir',
            jam_masuk: logHariIni.jam_masuk || '-',
            message: 'Bapak/Ibu Guru sudah presensi Masuk!',
            info: 'Anda Sudah Presensi',
          }, { status: 200 });
        }

        // 🏠 TAP 2 : TAP PULANG GURU (SETELAH > 5 MENIT / SAAT MAU PULANG)
        await Promise.all([
          supabase.from('absensi').update({
            status: 'Pulang',
            jam_pulang: jamWibSingkat,
            tipe: 'pulang_selesai',
            updated_at: new Date().toISOString(),
          }).eq('id', logHariIni.id),
          supabase.from('latest_scan').upsert([{ id: 1, uid: cleanUid, updated_at: new Date().toISOString() }]),
        ]);

        return NextResponse.json({
          success: true,
          action: 'pulang',
          type: 'guru',
          nama: namaGuru,
          kelas: jabatan,
          role: jabatan,
          jurusan: 'GURU/STAFF',
          info: `Pulang: ${jamWibSingkat} WIB`,
          inisial: inisialGuru,
          status: 'Pulang',
          jam_masuk: logHariIni.jam_masuk || '-',
          jam_pulang: jamWibSingkat,
        }, { status: 200 });
      }

      // 👨‍🏫 TAP 1 : PROSES TAP MASUK GURU (SELALU HADIR)
      if (logHariIni) {
        await Promise.all([
          supabase.from('absensi').update({
            rfid_uid: cleanUid,
            nama: namaGuru,
            kelas: jabatan,
            status: 'Hadir',
            tipe: 'masuk',
            jam_masuk: jamWibSingkat,
            updated_at: new Date().toISOString(),
          }).eq('id', logHariIni.id),
          supabase.from('latest_scan').upsert([{ id: 1, uid: cleanUid, updated_at: new Date().toISOString() }]),
        ]);
      } else {
        await Promise.all([
          supabase.from('absensi').insert([{
            rfid_uid: cleanUid,
            nama: namaGuru,
            kelas: jabatan,
            status: 'Hadir',
            tipe: 'masuk',
            jam_masuk: jamWibSingkat,
            created_at: new Date().toISOString(),
          }]),
          supabase.from('latest_scan').upsert([{ id: 1, uid: cleanUid, updated_at: new Date().toISOString() }]),
        ]);
      }

      return NextResponse.json({
        success: true,
        action: 'masuk',
        type: 'guru',
        nama: namaGuru,
        kelas: jabatan,
        role: jabatan,
        jurusan: 'GURU/STAFF',
        info: jabatan,
        inisial: inisialGuru,
        status: 'Hadir',
        jam_masuk: jamWibSingkat,
      }, { status: 200 });
    }

    // ==============================================================
    // 🎒 B. JIKA KARTU TERDAFTAR SEBAGAI SISWA
    // ==============================================================
    if (siswa) {
      const namaSiswa = (siswa.nama_siswa || 'Siswa').trim();
      const kelasSiswa = siswa.kelas || '-';
      const jurusanSiswa = siswa.jurusan || '-';
      const inisialSiswa = namaSiswa.split(' ')[0];

      const isLogAlreadyRealMasuk = Boolean(
        logHariIni &&
        (logHariIni.tipe === 'masuk' || logHariIni.tipe === 'pulang_selesai' || logHariIni.jam_pulang || (logHariIni.jam_masuk && !['alpa', 'alpha', 'sakit', 'izin', 'belum hadir'].includes(String(logHariIni.status || '').toLowerCase().trim())))
      );

      if (logHariIni && isLogAlreadyRealMasuk) {
        // TAP 4+ : JIKA SUDAH TAP PULANG SEBELUMNYA
        if (logHariIni.jam_pulang || logHariIni.tipe === 'pulang_selesai') {
          return NextResponse.json({
            success: false,
            already_tapped: true,
            already_pulang: true,
            message: 'Anda sudah presensi Masuk dan Pulang hari ini!',
            type: 'siswa',
            nama: namaSiswa,
            kelas: kelasSiswa,
            jurusan: jurusanSiswa,
            inisial: inisialSiswa,
            jam_masuk: logHariIni.jam_masuk || '-',
            jam_pulang: logHariIni.jam_pulang,
            info: 'Sudah Tap Masuk & Pulang',
          }, { status: 200 });
        }

        // 🟡 TAP 2 / TAP SEBELUM JAM PULANG : JIKA BELUM MEMASUKI JAM 16.38 WIB
        const nowWib = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
        const currentHour = nowWib.getHours();
        const currentMinute = nowWib.getMinutes();
        const totalMinutes = currentHour * 60 + currentMinute;
        // 16.38 WIB = 16 * 60 + 38 = 998 menit
        const isWaktuPulangSiswa = totalMinutes >= 998;

        // JIKA SISWA TAP SEBELUM JAM 16.38 WIB:
        if (!isWaktuPulangSiswa) {
          await Promise.all([
            supabase.from('absensi').update({
              tipe: 'sudah_presensi',
              updated_at: new Date().toISOString(),
            }).eq('id', logHariIni.id),
            supabase.from('latest_scan').upsert([{ id: 1, uid: cleanUid, updated_at: new Date().toISOString() }])
          ]);

          return NextResponse.json({
            success: true,
            already_presensi: true,
            action: 'sudah_presensi',
            type: 'siswa',
            nama: namaSiswa,
            kelas: kelasSiswa,
            jurusan: jurusanSiswa,
            inisial: inisialSiswa,
            status: logHariIni.status || 'Hadir',
            jam_masuk: logHariIni.jam_masuk || '-',
            message: 'ANDA SUDAH PRESENSI! JADWAL PULANG: 16.40 WIB',
            info: 'PULANG: 16.40 WIB',
          }, { status: 200 });
        }

        // 🏠 TAP 3 : JIKA SUDAH MEMASUKI JAM 16.38 / 16.40 WIB KE ATAS
        await Promise.all([
          supabase.from('absensi').update({
            status: 'Pulang',
            jam_pulang: jamWibSingkat,
            tipe: 'pulang_selesai',
            updated_at: new Date().toISOString(),
          }).eq('id', logHariIni.id),
          supabase.from('latest_scan').upsert([{ id: 1, uid: cleanUid, updated_at: new Date().toISOString() }]),
        ]);

        return NextResponse.json({
          success: true,
          action: 'pulang',
          type: 'siswa',
          nama: namaSiswa,
          kelas: kelasSiswa,
          jurusan: jurusanSiswa,
          inisial: inisialSiswa,
          status: 'Pulang',
          jam_masuk: logHariIni.jam_masuk || '-',
          jam_pulang: jamWibSingkat,
          info: `Pulang: ${jamWibSingkat} WIB`,
        }, { status: 200 });
      }

      // 🎒 TAP 1 : PROSES TAP MASUK SISWA (06.30 - 07.30 = Hadir, > 07.30 = Telat)
      const statusSiswa = calculateWibAttendanceStatus(false, clientStatus);

      if (logHariIni) {
        await Promise.all([
          supabase.from('absensi').update({
            rfid_uid: cleanUid,
            nama: namaSiswa,
            kelas: kelasSiswa,
            status: statusSiswa,
            tipe: 'masuk',
            jam_masuk: jamWibSingkat,
            updated_at: new Date().toISOString(),
          }).eq('id', logHariIni.id),
          supabase.from('latest_scan').upsert([{ id: 1, uid: cleanUid, updated_at: new Date().toISOString() }]),
        ]);
      } else {
        await Promise.all([
          supabase.from('absensi').insert([{
            rfid_uid: cleanUid,
            nama: namaSiswa,
            kelas: kelasSiswa,
            status: statusSiswa,
            tipe: 'masuk',
            jam_masuk: jamWibSingkat,
            created_at: new Date().toISOString(),
          }]),
          supabase.from('latest_scan').upsert([{ id: 1, uid: cleanUid, updated_at: new Date().toISOString() }]),
        ]);
      }

      return NextResponse.json({
        success: true,
        action: 'masuk',
        type: 'siswa',
        nama: namaSiswa,
        kelas: kelasSiswa,
        jurusan: jurusanSiswa,
        inisial: inisialSiswa,
        status: statusSiswa,
        jam_masuk: jamWibSingkat,
        info: `${kelasSiswa} ${jurusanSiswa}`,
      }, { status: 200 });
    }

    // ==============================================================
    // ❌ C. JIKA BELUM TERDAFTAR (KARTU BARU)
    // ==============================================================
    await supabase.from('latest_scan').upsert([{ id: 1, uid: cleanUid, updated_at: new Date().toISOString() }]);

    return NextResponse.json({
      success: false,
      not_registered: true,
      message: 'Kartu RFID Belum Terdaftar!',
      uid: cleanUid,
    }, { status: 200 });

  } catch (err) {
    console.error('[Route POST Exception]:', err);
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
    const jamWibSingkat = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });

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
          tipe: 'masuk',
          jam_masuk: jamWibSingkat,
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
