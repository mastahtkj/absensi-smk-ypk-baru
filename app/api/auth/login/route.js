import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../lib/supabaseServer';
import { hashPassword, verifyPassword, isPasswordHashed, createSessionToken } from '../../../lib/cryptoAuth';
import { OFFICIAL_SMK_YPK_TEACHERS } from '../../../data/guruData';
import { OFFICIAL_SMK_YPK_STUDENTS } from '../../../data/siswaData';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const inputU = String(body.identifier || body.username || '').trim().toLowerCase();
    const inputP = String(body.password || '').trim();

    if (!inputU || !inputP) {
      return NextResponse.json(
        { success: false, message: 'Username / NISN / NIP dan Kata Sandi wajib diisi.' },
        { status: 400 }
      );
    }

    const cleanInput = inputU.replace(/[\s-]/g, '');

    // 👑 1. PRIORITAS UTAMA: MASTER ADMIN SEKOLAH (MUHAMMAD IQBAL RANGKUTI, S.Kom., Gr.)
    const isMasterIdentifier =
      inputU === 'iqbal' ||
      inputU === 'admin' ||
      cleanInput === 'iqbalrangkuti' ||
      inputU === 'muhammad iqbal rangkuti,s.kom., gr.' ||
      inputU === 'muhammad iqbal rangkuti';

    if (isMasterIdentifier) {
      let masterDbRecord = null;
      try {
        const { data } = await supabaseServer
          .from('tb_guru')
          .select('*')
          .or('username.eq.iqbal,id_guru.eq.4')
          .maybeSingle();
        masterDbRecord = data;
      } catch (e) {}

      const dbMasterPass = masterDbRecord?.password || '';
      const isMasterPassValid = dbMasterPass
        ? verifyPassword(inputP, dbMasterPass)
        : (inputP === '301020' || inputP === 'guru123' || inputP === 'admin123' || inputP === 'iqbal123' || inputP === '123456');

      if (isMasterPassValid) {
        // Enkripsi otomatis jika password master di database masih plaintext
        if (masterDbRecord && !isPasswordHashed(dbMasterPass)) {
          try {
            const hashed = hashPassword(inputP);
            await supabaseServer
              .from('tb_guru')
              .update({ password: hashed })
              .eq('id_guru', masterDbRecord?.id_guru || 4);
          } catch (e) {}
        }

        const masterUser = {
          id: 'GURU-4',
          rawId: 4,
          nama: 'MUHAMMAD IQBAL RANGKUTI,S.KOM., Gr.',
          username: 'iqbal',
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

        return response;
      }
    }

    // 👨‍🏫 2. CEK LOGIN GURU / STAFF / PEGAWAI / GADMIN (Targeted Query)
    try {
      let matchedGuru = null;
      const { data: dbGuru } = await supabaseServer
        .from('tb_guru')
        .select('*')
        .or(`username.ilike.${inputU},nip.eq.${inputU},nama_guru.ilike.${inputU}`)
        .maybeSingle();

      if (dbGuru) {
        matchedGuru = dbGuru;
      } else {
        // Fallback ke data statis guru resmi SMK YPK jika belum tersimpan di DB
        matchedGuru = (OFFICIAL_SMK_YPK_TEACHERS || []).find((og) => {
          const ogUser = (og.username || og.nama || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          const ogNama = (og.nama || '').toLowerCase().trim();
          const cleanOGNama = ogNama.replace(/[\s-]/g, '');
          return (
            ogUser === inputU ||
            ogNama === inputU ||
            cleanOGNama === cleanInput ||
            (og.nip && og.nip === inputU) ||
            ((inputU === 'hartati' || inputU === 'hartaty' || inputU === 'patiwael') && (og.rawId === 1 || ogNama.includes('hartati'))) ||
            ((inputU === 'hendrawan' || cleanInput === 'hendrawanst') && (og.rawId === 2 || ogNama.includes('hendrawan')))
          );
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
            gUserNorm.includes('iqbal') ||
            gUserNorm.includes('hartat') ||
            gUserNorm.includes('patiwael') ||
            gUserNorm.includes('hendrawan') ||
            gNameNorm.includes('iqbal') ||
            gNameNorm.includes('hartati') ||
            gNameNorm.includes('hartaty') ||
            gNameNorm.includes('patiwael') ||
            gNameNorm.includes('hendrawan') ||
            matchedGuru.id_guru === 1 ||
            matchedGuru.id_guru === 2 ||
            matchedGuru.id_guru === 4 ||
            matchedGuru.id_guru === 29;

          const cleanUser = {
            id: `GURU-${matchedGuru.id_guru || matchedGuru.rawId || matchedGuru.id}`,
            rawId: matchedGuru.id_guru || matchedGuru.rawId || matchedGuru.id,
            nama: (matchedGuru.nama_guru || matchedGuru.nama || matchedGuru.username).trim().replace(/\s+/g, ' '),
            username: matchedGuru.username || matchedGuru.nama_guru,
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

          return response;
        }
      }
    } catch (err) {
      console.warn('Login Guru query note:', err);
    }

    // 🎒 3. CEK LOGIN SISWA / SISWA ADMIN (Targeted Query)
    try {
      let matchedSiswa = null;

      // Query spesifik database: username, NISN, NIS, atau Nama Lengkap persis
      const { data: dbSiswa } = await supabaseServer
        .from('tb_siswa')
        .select('*')
        .or(`username.ilike.${inputU},nisn.eq.${inputU},nis.eq.${inputU},nama_siswa.ilike.${inputU}`)
        .maybeSingle();

      if (dbSiswa) {
        matchedSiswa = dbSiswa;
      } else {
        // Fallback ke daftar resmi siswa jika database belum terhubung
        matchedSiswa = (OFFICIAL_SMK_YPK_STUDENTS || []).find((os) => {
          const osUser = String(os.username || '').toLowerCase();
          const osNama = String(os.nama || os.nama_siswa || '').toLowerCase().trim();
          const cleanOSNama = osNama.replace(/[\s-]/g, '');
          return (
            osUser === inputU ||
            osNama === inputU ||
            cleanOSNama === cleanInput ||
            (os.nisn && String(os.nisn).trim() === inputU) ||
            (os.nis && String(os.nis).trim() === inputU)
          );
        });
      }

      if (matchedSiswa) {
        const dbPass = String(matchedSiswa.password || matchedSiswa.biodata?.password || '').trim();
        const isPassValid = dbPass
          ? verifyPassword(inputP, dbPass)
          : (inputP === 'siswa123' || inputP === '123456' || inputP === 'admin123');

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
            role: isSiswaAdminRole ? 'sadmin' : (matchedSiswa.role || 'siswa'),
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

          return response;
        }
      }
    } catch (err) {
      console.warn('Login Siswa query note:', err);
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Nama/Username/NISN atau kata sandi tidak cocok. Silakan periksa kembali data akun Anda.',
      },
      { status: 401 }
    );
  } catch (err) {
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan sistem autentikasi.' },
      { status: 500 }
    );
  }
}
