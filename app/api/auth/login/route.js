import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../lib/supabaseServer';
import { hashPassword, verifyPassword, isPasswordHashed, createSessionToken, encryptSensitiveField } from '../../../lib/cryptoAuth';
import { OFFICIAL_SMK_YPK_TEACHERS } from '../../../data/guruData';
import { OFFICIAL_SMK_YPK_STUDENTS } from '../../../data/siswaData';
import { getClientIp, checkBruteForceLimit, recordFailedLogin, recordSuccessfulLogin } from '../../../lib/bruteForceGuard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const inputU = String(body.identifier || body.username || '').trim().toLowerCase();
    const inputP = String(body.password || '').trim();

    if (!inputU || !inputP) {
      return NextResponse.json(
        { success: false, message: 'Username dan Kata Sandi wajib diisi.' },
        { status: 400 }
      );
    }

    const clientIp = getClientIp(request);

    // 🛡️ 0. PERIKSA SISTEM BRUTE FORCE DEFENSE (IP & USERNAME LOCKOUT)
    const bruteStatus = checkBruteForceLimit(inputU, clientIp);
    if (bruteStatus.isBlocked) {
      return NextResponse.json(
        {
          success: false,
          isBlocked: true,
          retryAfterSeconds: bruteStatus.retryAfterSeconds,
          message: bruteStatus.message
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(bruteStatus.retryAfterSeconds),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Limit': '5'
          }
        }
      );
    }

    const cleanInput = inputU.replace(/[\s-]/g, '');

    // 👑 1. PRIORITAS UTAMA: MASTER ADMIN SEKOLAH (MUHAMMAD IQBAL RANGKUTI, S.Kom., Gr.)
    // 🔒 Username resmi HANYA 1: 'iqbal'. Seluruh username lain dihapus!
    const isMasterIdentifier = inputU === 'iqbal';

    if (isMasterIdentifier) {
      let masterDbRecord = null;
      try {
        const { data } = await supabaseServer
          .from('tb_guru')
          .select('*')
          .or('username.eq.iqbal,id_guru.eq.4')
          .limit(1)
          .maybeSingle();
        masterDbRecord = data;
      } catch (e) {}

      const dbMasterPass = masterDbRecord?.password || '';
      // Password resmi Admin Master adalah iqbal900 atau 301020 (atau hash di DB)
      const isMasterPassValid =
        inputP === 'iqbal900' ||
        inputP === '301020' ||
        (dbMasterPass && verifyPassword(inputP, dbMasterPass));

      if (isMasterPassValid) {
        // Enkripsi dan update otomatis password master di database Supabase ke PBKDF2 hash
        if ((inputP === 'iqbal900' || inputP === '301020') && masterDbRecord) {
          try {
            const hashed = hashPassword(inputP);
            await supabaseServer
              .from('tb_guru')
              .update({ password: hashed, username: 'iqbal', role: 'master' })
              .eq('id_guru', masterDbRecord?.id_guru || 4);
          } catch (e) {}
        }

        const masterUser = {
          id: 'GURU-4',
          rawId: 4,
          nama: 'MUHAMMAD IQBAL RANGKUTI,S.KOM., Gr.',
          username: 'iqbal',
          username_enc: encryptSensitiveField('iqbal'),
          security_badge: 'BLOCKCHAIN SECURITY ACTIVE',
          role: 'admin',
          isMaster: true,
          kelas: 'Admin / Master',
          jurusan: 'Guru / Staff',
          inisial: 'IR',
          isGuru: true,
          foto_url: masterDbRecord?.foto_url || '/guru/04_muhammad_iqbal_rangkuti_kajur_tjkt.jpg',
        };

        const token = createSessionToken({
          id: masterUser.id,
          rawId: masterUser.rawId,
          username: masterUser.username,
          nama: masterUser.nama,
          role: 'admin',
          isMaster: true,
          isGuru: true,
        });

        const response = NextResponse.json({
          success: true,
          token,
          user: masterUser,
          role: 'admin',
          isMaster: true,
        });

        response.cookies.set('smk_ypk_auth_token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60,
          path: '/',
        });

        recordSuccessfulLogin(inputU, clientIp);
        return response;
      }
    }

    // 👨‍🏫 2. CEK LOGIN GURU / STAFF / PEGAWAI / GADMIN (Targeted Username Query ONLY)
    // 🔒 HANYA 1 USERNAME RESMI - TIDAK ADA ALIAS, NAMA LENGKAP, ATAU NIP!
    try {
      let matchedGuru = null;
      // 1. Cari via username persis di Supabase
      const { data: dbGuruUser } = await supabaseServer
        .from('tb_guru')
        .select('*')
        .ilike('username', inputU)
        .maybeSingle();

      if (dbGuruUser) {
        matchedGuru = dbGuruUser;
      } else {
        // Fallback ke data statis guru resmi HANYA via username persis
        matchedGuru = (OFFICIAL_SMK_YPK_TEACHERS || []).find((og) => {
          if (og.rawId === 4 || (og.nama || '').toLowerCase().includes('iqbal')) {
            return false;
          }
          const ogUser = String(og.username || '').toLowerCase().trim();
          return ogUser === inputU;
        });
      }

      if (matchedGuru) {
        const dbPass = String(matchedGuru.password || matchedGuru.biodata?.password || '').trim();
        const isPassValid = dbPass
          ? verifyPassword(inputP, dbPass)
          : (inputP === 'guru123' || inputP === 'admin123' || inputP === '123456');

        if (isPassValid) {
          if (matchedGuru.id_guru && matchedGuru.password && !isPasswordHashed(matchedGuru.password)) {
            try {
              const hashed = hashPassword(inputP);
              await supabaseServer
                .from('tb_guru')
                .update({ password: hashed })
                .eq('id_guru', matchedGuru.id_guru);
            } catch (e) {}
          }

          const gNameNorm = String(matchedGuru.nama_guru || matchedGuru.nama || '').toLowerCase();
          const gUserNorm = String(matchedGuru.username || '').toLowerCase();
          const isMaster =
            matchedGuru.role?.toLowerCase() === 'master' ||
            gUserNorm === 'iqbal' ||
            gUserNorm === 'hartati' ||
            gUserNorm === 'hendrawan' ||
            gUserNorm.includes('hartat') ||
            gUserNorm.includes('patiwael') ||
            gUserNorm.includes('hendrawan') ||
            gNameNorm.includes('hartati') ||
            gNameNorm.includes('hartaty') ||
            gNameNorm.includes('patiwael') ||
            gNameNorm.includes('hendrawan') ||
            matchedGuru.id_guru === 1 ||
            matchedGuru.id_guru === 2;

          const cleanUser = {
            id: `GURU-${matchedGuru.id_guru || matchedGuru.rawId || matchedGuru.id}`,
            rawId: matchedGuru.id_guru || matchedGuru.rawId || matchedGuru.id,
            nama: (matchedGuru.nama_guru || matchedGuru.nama || matchedGuru.username).trim().replace(/\s+/g, ' '),
            username: matchedGuru.username || matchedGuru.nama_guru,
            username_enc: encryptSensitiveField(matchedGuru.username || matchedGuru.nama_guru),
            security_badge: 'BLOCKCHAIN SECURITY ACTIVE',
            role: isMaster ? 'master' : (matchedGuru.role || 'Guru'),
            isMaster: isMaster,
            kelas: isMaster ? 'Admin / Master' : (matchedGuru.kelas || (matchedGuru.inisial ? `Inisial: ${matchedGuru.inisial}` : 'Guru / Staff')),
            jurusan: matchedGuru.jurusan || 'Guru / Staff',
            inisial: matchedGuru.inisial || '',
            isGuru: true,
            foto_url: matchedGuru.foto_url || '',
            biodata: matchedGuru.biodata || null,
          };

          if (cleanUser.biodata && typeof cleanUser.biodata === 'object') {
            delete cleanUser.biodata.password;
          }

          const token = createSessionToken({
            id: cleanUser.id,
            rawId: cleanUser.rawId,
            username: cleanUser.username,
            nama: cleanUser.nama,
            role: cleanUser.role,
            isMaster: isMaster,
            isGuru: true,
          });

          const response = NextResponse.json({
            success: true,
            token,
            user: cleanUser,
            role: cleanUser.role,
          });

          response.cookies.set('smk_ypk_auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60,
            path: '/',
          });

          recordSuccessfulLogin(inputU, clientIp);
          return response;
        }
      }
    } catch (err) {
      console.warn('Login Guru query note:', err);
    }

    // 🎒 3. CEK LOGIN SISWA / SISWA ADMIN (Targeted Username Query ONLY)
    // 🔒 HANYA 1 USERNAME RESMI - TIDAK ADA ALIAS, NAMA LENGKAP, ATAU NISN!
    try {
      let matchedSiswa = null;

      // 1. Cari persis via username di Supabase
      const { data: byUser } = await supabaseServer
        .from('tb_siswa')
        .select('*')
        .ilike('username', inputU)
        .maybeSingle();

      if (byUser) {
        matchedSiswa = byUser;
      } else {
        // Fallback ke daftar resmi siswa HANYA via username persis
        matchedSiswa = (OFFICIAL_SMK_YPK_STUDENTS || []).find((os) => {
          const osUser = String(os.username || '').toLowerCase().trim();
          return osUser === inputU;
        });
      }

      if (matchedSiswa) {
        // 🔑 Cari password resmi default dari daftar master notepad
        const sStatic = (OFFICIAL_SMK_YPK_STUDENTS || []).find((os) =>
          String(os.id_siswa) === String(matchedSiswa.id_siswa) ||
          String(os.username).toLowerCase() === String(matchedSiswa.username).toLowerCase() ||
          String(os.nama || os.nama_siswa || '').toLowerCase() === String(matchedSiswa.nama_siswa || matchedSiswa.nama || '').toLowerCase()
        );
        const staticPass = sStatic?.password;

        const dbPass = String(matchedSiswa.password || matchedSiswa.biodata?.password || '').trim();
        const isPassValid = dbPass
          ? verifyPassword(inputP, dbPass)
          : (Boolean(staticPass && inputP === staticPass) || inputP === 'siswa123' || inputP === '123456');

        if (isPassValid) {
          if (matchedSiswa.id_siswa && matchedSiswa.password && !isPasswordHashed(matchedSiswa.password)) {
            try {
              const hashed = hashPassword(inputP);
              await supabaseServer
                .from('tb_siswa')
                .update({ password: hashed })
                .eq('id_siswa', matchedSiswa.id_siswa);
            } catch (e) {}
          }

          const studentRawId = String(matchedSiswa.id_siswa || matchedSiswa.rawId || matchedSiswa.id || '').replace(/\D/g, '') || String(Date.now()).slice(-6);
          const sNameLower = String(matchedSiswa.nama_siswa || matchedSiswa.nama || '').toLowerCase();
          const isSiswaAdminRole =
            matchedSiswa.role?.toLowerCase()?.includes('admin') ||
            matchedSiswa.role?.toLowerCase()?.includes('sadmin') ||
            matchedSiswa.role?.toLowerCase()?.includes('siswa_admin') ||
            [
              'ira ulandari',
              'alzalika',
              'aisha',
              'rizky arka',
              'indira',
              'aini',
              'tajie',
              'ahmadiniz',
              'nazwa syifa',
              'cut razki',
            ].some((pattern) => sNameLower.includes(pattern));

          const rawK = String(matchedSiswa.kelas || '').toUpperCase().trim();
          let derivedJurusan = matchedSiswa.jurusan || 'TJKT';
          if (!matchedSiswa.jurusan) {
            if (rawK.includes('MPLB') || rawK.includes('OTKP') || rawK.includes('AP')) derivedJurusan = 'MPLB';
            else if (rawK.includes('AKL') || rawK.includes('AK')) derivedJurusan = 'AKL';
            else if (rawK.includes('PM') || rawK.includes('BDP') || rawK.includes('PJ')) derivedJurusan = 'PM';
            else if (rawK.includes('TJKT') || rawK.includes('TKJ')) derivedJurusan = 'TJKT';
          }

          const cleanUser = {
            id: `SISWA-${studentRawId}`,
            rawId: parseInt(studentRawId, 10) || studentRawId,
            id_siswa: parseInt(studentRawId, 10) || studentRawId,
            nama: (matchedSiswa.nama_siswa || matchedSiswa.nama || 'Siswa YPK').trim(),
            username: matchedSiswa.username || matchedSiswa.nama_siswa || matchedSiswa.nama,
            role: isSiswaAdminRole ? 'sadmin' : 'siswa',
            kelas: matchedSiswa.kelas || '-',
            jurusan: derivedJurusan,
            isGuru: false,
            nisn: matchedSiswa.nisn || '',
            telepon: matchedSiswa.telepon || '',
            alamat: matchedSiswa.alamat || '',
            foto_url: matchedSiswa.foto_url || '',
            biodata: matchedSiswa.biodata || null,
          };

          if (cleanUser.biodata && typeof cleanUser.biodata === 'object') {
            delete cleanUser.biodata.password;
          }

          const token = createSessionToken({
            id: cleanUser.id,
            rawId: cleanUser.rawId,
            username: cleanUser.username,
            nama: cleanUser.nama,
            role: cleanUser.role,
            isMaster: false,
            isGuru: false,
          });

          const response = NextResponse.json({
            success: true,
            token,
            user: cleanUser,
            role: cleanUser.role,
          });

          response.cookies.set('smk_ypk_auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60,
            path: '/',
          });

          recordSuccessfulLogin(inputU, clientIp);
          return response;
        }
      }
    } catch (err) {
      console.warn('Login Siswa query note:', err);
    }

    const failedResult = await recordFailedLogin(inputU, clientIp);
    const remainingText = failedResult.isNowLocked
      ? ` 🚨 Terlalu banyak percobaan gagal! Akun/perangkat ini telah DIBLOKIR sementara selama ${failedResult.lockoutDurationMinutes} menit demi keamanan sistem.`
      : ` (Sisa percobaan aman: ${failedResult.remainingAttempts}x lagi).`;

    return NextResponse.json(
      {
        success: false,
        message: `Username atau kata sandi tidak cocok.${remainingText}`,
        remainingAttempts: failedResult.remainingAttempts,
        isLocked: failedResult.isNowLocked
      },
      { status: failedResult.isNowLocked ? 429 : 401 }
    );
  } catch (err) {
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan sistem autentikasi.' },
      { status: 500 }
    );
  }
}
