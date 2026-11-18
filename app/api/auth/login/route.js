import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../lib/supabaseServer';
import { hashPassword, verifyPassword, isPasswordHashed } from '../../../lib/cryptoAuth';
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
        { success: false, message: 'Username / Nama dan Kata Sandi wajib diisi.' },
        { status: 400 }
      );
    }

    const cleanInput = inputU.replace(/[\s-]/g, '');

    // 👑 1. PRIORITAS UTAMA: MASTER ADMIN SEKOLAH (MUHAMMAD IQBAL RANGKUTI, S.Kom., Gr.)
    const isMasterIdentifier =
      inputU === 'iqbal' ||
      inputU === 'admin' ||
      inputU === '92006f96' ||
      cleanInput === 'iqbalrangkuti' ||
      inputU.includes('iqbal rangkuti');

    if (isMasterIdentifier) {
      let masterDbRecord = null;
      try {
        const { data } = await supabaseServer
          .from('tb_guru')
          .select('*')
          .or('username.eq.iqbal,id_guru.eq.29')
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
              .eq('id_guru', masterDbRecord.id_guru || 29);
          } catch (e) {}
        }

        const masterUser = {
          id: 'GURU-29',
          rawId: 29,
          nama: 'MUHAMMAD IQBAL RANGKUTI,S.KOM., Gr.',
          username: 'iqbal',
          role: 'admin',
          isMaster: true,
          kelas: 'Admin / Master',
          jurusan: 'Guru / Staff',
          inisial: 'IR',
          uid_rfid: '92006F96',
          rfid_uid: '92006F96',
          isGuru: true,
          foto_url: masterDbRecord?.foto_url || '/logo.png',
        };

        return NextResponse.json({
          success: true,
          user: masterUser,
          role: 'admin',
          isMaster: true,
        });
      }
    }

    // 👨‍🏫 2. CEK LOGIN GURU / STAFF / PEGAWAI / GADMIN
    try {
      const { data: guruList } = await supabaseServer
        .from('tb_guru')
        .select('*');

      const allGurus = Array.isArray(guruList) ? [...guruList] : [];

      (OFFICIAL_SMK_YPK_TEACHERS || []).forEach((og) => {
        const ogRawId = String(og.rawId || og.id || '').replace(/\D/g, '');
        const ogUser = (og.username || og.nama || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!allGurus.some((g) => g && (String(g.id_guru || g.rawId || '').replace(/\D/g, '') === ogRawId || String(g.username || '').toLowerCase() === ogUser))) {
          allGurus.push({
            id_guru: og.rawId || og.id,
            nama_guru: og.nama,
            username: og.username || ogUser,
            inisial: og.inisial || '',
            role: og.role || 'Guru',
            mapel: og.mapel || '',
            kelas: og.inisial ? `Inisial: ${og.inisial}` : 'Guru / Staff',
            jurusan: 'Guru / Staff',
            foto_url: og.foto_url || '/logo.png',
            password: 'guru123',
          });
        }
      });

      const matchedGuru = allGurus.find((g) => {
        if (!g) return false;
        const gUser = String(g.username || '').toLowerCase().trim();
        const gNama = String(g.nama_guru || '').toLowerCase().trim();
        const cleanGNama = gNama.replace(/[\s-]/g, '');
        const gUid = String(g.uid_rfid || g.rfid_uid || g.rfid || '').trim().toLowerCase();

        const isUserMatch =
          gUser === inputU ||
          gNama === inputU ||
          cleanGNama === cleanInput ||
          (cleanInput.length >= 4 && cleanGNama.includes(cleanInput)) ||
          (gUid && gUid === inputU);

        if (!isUserMatch) return false;

        const dbPass = String(g.password || g.biodata?.password || '').trim();
        const isPassValid = dbPass
          ? verifyPassword(inputP, dbPass)
          : (inputP === 'guru123' || inputP === 'admin123' || inputP === '123456');

        return isPassValid;
      });

      if (matchedGuru) {
        if (matchedGuru.id_guru && matchedGuru.password && !isPasswordHashed(matchedGuru.password)) {
          try {
            const hashed = hashPassword(inputP);
            await supabaseServer
              .from('tb_guru')
              .update({ password: hashed })
              .eq('id_guru', matchedGuru.id_guru);
          } catch (e) {}
        }

        const isMaster =
          matchedGuru.username === 'iqbal' ||
          matchedGuru.username === 'admin' ||
          String(matchedGuru.nama_guru || '').toLowerCase().includes('iqbal') ||
          matchedGuru.id_guru === 29;

        const cleanUser = {
          id: `GURU-${matchedGuru.id_guru}`,
          rawId: matchedGuru.id_guru,
          nama: (matchedGuru.nama_guru || matchedGuru.username).trim().replace(/\s+/g, ' '),
          username: matchedGuru.username || matchedGuru.nama_guru,
          role: isMaster ? 'admin' : (matchedGuru.role || 'Guru'),
          isMaster: isMaster,
          kelas: matchedGuru.kelas || (matchedGuru.inisial ? `Inisial: ${matchedGuru.inisial}` : 'Guru / Staff'),
          jurusan: matchedGuru.jurusan || 'Guru / Staff',
          inisial: matchedGuru.inisial || '',
          uid_rfid: matchedGuru.uid_rfid || '',
          rfid_uid: matchedGuru.uid_rfid || '',
          isGuru: true,
          foto_url: matchedGuru.foto_url || '',
          biodata: matchedGuru.biodata || null,
        };

        if (cleanUser.biodata && typeof cleanUser.biodata === 'object') {
          delete cleanUser.biodata.password;
        }

        return NextResponse.json({
          success: true,
          user: cleanUser,
          role: cleanUser.role,
        });
      }
    } catch (err) {
      console.warn('Login Guru check note:', err);
    }

    // 🎒 3. CEK LOGIN SISWA / SISWA ADMIN (SADMIN)
    try {
      const { data: siswaList } = await supabaseServer
        .from('tb_siswa')
        .select('*');

      const allSiswa = Array.isArray(siswaList) ? [...siswaList] : [];

      (OFFICIAL_SMK_YPK_STUDENTS || []).forEach((os) => {
        const osRawId = String(os.rawId || os.id || '').replace(/\D/g, '');
        const osUser = String(os.username || '').toLowerCase();
        if (!allSiswa.some((s) => s && (String(s.id_siswa || s.rawId || '').replace(/\D/g, '') === osRawId || String(s.username || '').toLowerCase() === osUser))) {
          allSiswa.push({
            id_siswa: os.rawId || os.id,
            nama_siswa: os.nama,
            username: os.username || osUser,
            kelas: os.kelas || '-',
            jurusan: os.jurusan || '',
            role: os.role || 'Siswa',
            password: 'siswa123',
          });
        }
      });

      // 1. Prioritas Utama Siswa: Username Persis
      let matchedSiswa = allSiswa.find((s) => {
        if (!s) return false;
        const sUser = String(s.username || '').toLowerCase().trim();
        const cleanSUser = sUser.replace(/[\s-]/g, '');
        if (sUser !== inputU && cleanSUser !== cleanInput) return false;

        const dbPass = String(s.password || s.biodata?.password || '').trim();
        return dbPass
          ? verifyPassword(inputP, dbPass)
          : (inputP === 'siswa123' || inputP === '123456' || inputP === 'admin123');
      });

      // 2. Prioritas Kedua Siswa: Nama Lengkap / NISN / UID RFID / Kata Pertama Nama
      if (!matchedSiswa) {
        matchedSiswa = allSiswa.find((s) => {
          if (!s) return false;
          const sNama = String(s.nama_siswa || s.nama || '').toLowerCase().trim();
          const cleanSNama = sNama.replace(/[\s-]/g, '');
          const sUser = String(s.username || '').toLowerCase().trim();
          const cleanSUser = sUser.replace(/[\s-]/g, '');
          const sUid = String(s.uid_rfid || s.rfid_uid || s.rfid || '').trim().toLowerCase();
          const sNisn = String(s.nisn || '').trim().toLowerCase();
          const sNis = String(s.nis || '').trim().toLowerCase();

          const sNamaWords = sNama.split(/\s+/).filter(Boolean);

          const isUserMatch =
            (cleanSNama && (cleanSNama === cleanInput || sNama === inputU)) ||
            (sNamaWords.length > 0 && sNamaWords[0] === inputU) ||
            (cleanInput.length >= 3 && (sNama.includes(inputU) || cleanSNama.includes(cleanInput))) ||
            (sUser && (sUser === inputU || cleanSUser === cleanInput)) ||
            (sNis && (sNis === inputU || sNis === cleanInput)) ||
            (sNisn && (sNisn === inputU || sNisn === cleanInput)) ||
            (sUid && sUid === inputU) ||
            (cleanInput.includes('alzalik') && sNama.includes('alzalik'));

          if (!isUserMatch) return false;

          const dbPass = String(s.password || s.biodata?.password || '').trim();
          return dbPass
            ? verifyPassword(inputP, dbPass)
            : (inputP === 'siswa123' || inputP === '123456' || inputP === 'admin123');
        });
      }

      if (matchedSiswa) {
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
          role: isSiswaAdminRole ? 'siswa_admin' : (matchedSiswa.role || 'siswa'),
          kelas: matchedSiswa.kelas || '-',
          jurusan: derivedJurusan,
          uid_rfid: matchedSiswa.uid_rfid || matchedSiswa.rfid_uid || '',
          rfid_uid: matchedSiswa.uid_rfid || matchedSiswa.rfid_uid || '',
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

        return NextResponse.json({
          success: true,
          user: cleanUser,
          role: cleanUser.role,
        });
      }
    } catch (err) {
      console.warn('Login Siswa check note:', err);
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Nama/Username atau kata sandi tidak cocok. Silakan periksa kembali data akun Anda.',
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
