const { createClient } = require('../node_modules/@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const supabase = createClient(
  'https://wpyfwkcevgdhkazeesdq.supabase.co',
  'sb_publishable_m_6VQvv9JT7FimMwws341w_NA_tukF6'
);

async function generate() {
  console.log('Mengambil data Guru & Siswa dari database cloud...');

  // 1. Ambil seluruh data guru
  const { data: gurus, error: errGuru } = await supabase
    .from('tb_guru')
    .select('*')
    .order('id_guru', { ascending: true });

  if (errGuru) {
    console.error('Error fetching guru:', errGuru);
    return;
  }

  // 2. Ambil seluruh data siswa
  const { data: siswas, error: errSiswa } = await supabase
    .from('tb_siswa')
    .select('*')
    .order('kelas', { ascending: true })
    .order('nama_siswa', { ascending: true });

  if (errSiswa) {
    console.error('Error fetching siswa:', errSiswa);
    return;
  }

  console.log(`Ditemukan ${gurus.length} Guru dan ${siswas.length} Siswa.`);

  const dateNow = new Date().toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'full',
    timeStyle: 'medium',
  });

  // UTF-8 BOM untuk memastikan Notepad Windows membaca karakter dengan sempurna
  let out = '\uFEFF';
  out += '========================================================================================================\r\n';
  out += '                      SMK YPK MEDAN - DAFTAR RESMI USERNAME & KATA SANDI LOGIN                          \r\n';
  out += '                 APLIKASI SISTEM INFORMASI PRESENSI & SUPER APP KESISWAAN/GURU                          \r\n';
  out += '========================================================================================================\r\n';
  out += `Tanggal Ekspor : ${dateNow} WIB\r\n`;
  out += 'Alamat Web App : https://absensi-smk-ypk-baru.vercel.app\r\n';
  out += 'Unduh APK      : https://absensi-smk-ypk-baru.vercel.app/apk/SMK_YPK_SUPER_APP.apk\r\n';
  out += '--------------------------------------------------------------------------------------------------------\r\n';
  out += 'PETUNJUK MASUK / LOGIN KE APLIKASI:\r\n';
  out += '1. Buka aplikasi di Browser atau di HP Android (APK SMK YPK SUPER APP).\r\n';
  out += '2. Masukkan USERNAME atau NAMA LENGKAP siswa/guru sesuai daftar di bawah ini.\r\n';
  out += '3. Masukkan KATA SANDI (PASSWORD) sesuai kolom kata sandi.\r\n';
  out += '4. Klik tombol "Masuk ke Sistem".\r\n';
  out += '5. Catatan: Password default sistem jika lupa: "guru123" (Guru) / "siswa123" (Siswa).\r\n';
  out += '========================================================================================================\r\n\r\n';

  // =====================================================================
  // BAGIAN 1: ADMIN MASTER SEKOLAH (3 AKUN)
  // =====================================================================
  out += '########################################################################################################\r\n';
  out += '                                 BAGIAN 1: AKUN ADMIN MASTER SEKOLAH                                    \r\n';
  out += '         (Akses Penuh: Master Control, Presensi Wajah AI, Saklar Fitur, dan Pemberi Hak Akses)         \r\n';
  out += '########################################################################################################\r\n\r\n';
  out += String('NO').padEnd(4) +
         String('NAMA LENGKAP').padEnd(44) +
         String('JABATAN RESMI').padEnd(36) +
         String('USERNAME').padEnd(20) +
         String('KATA SANDI (PASSWORD)').padEnd(24) +
         '\r\n';
  out += '-'.repeat(128) + '\r\n';

  const masterList = [
    {
      nama: 'MUHAMMAD IQBAL RANGKUTI, S.Kom., Gr.',
      jabatan: '[MASTER] Kajur TJKT / Admin Master',
      username: 'iqbal',
      sandi: '301020 / guru123',
    },
    {
      nama: 'Hartati Patiwael, S.Si',
      jabatan: '[MASTER] Kepala Sekolah SMK YPK',
      username: 'hartati',
      sandi: 'guru123',
    },
    {
      nama: 'Hendrawan, ST',
      jabatan: '[MASTER] Wakakurikulum SMK YPK',
      username: 'hendrawan',
      sandi: 'guru123',
    },
  ];

  masterList.forEach((m, idx) => {
    out += String(idx + 1).padEnd(4) +
           String(m.nama).padEnd(44) +
           String(m.jabatan).padEnd(36) +
           String(m.username).padEnd(20) +
           String(m.sandi).padEnd(24) +
           '\r\n';
  });
  out += '\r\n\r\n';

  // =====================================================================
  // BAGIAN 2: DEWAN GURU & STAFF PENGAJAR (SELURUH GURU)
  // =====================================================================
  out += '########################################################################################################\r\n';
  out += '                                 BAGIAN 2: AKUN DEWAN GURU & STAFF                                      \r\n';
  out += '            (Login menggunakan Username atau Nama Lengkap - Presensi, Jurnal & Pembelajaran)           \r\n';
  out += '########################################################################################################\r\n\r\n';
  out += String('NO').padEnd(4) +
         String('NAMA DEWAN GURU / STAFF').padEnd(44) +
         String('MATA PELAJARAN / TUGAS').padEnd(32) +
         String('USERNAME').padEnd(24) +
         String('KATA SANDI').padEnd(16) +
         String('HAK AKSES').padEnd(14) +
         '\r\n';
  out += '-'.repeat(134) + '\r\n';

  gurus.forEach((g, idx) => {
    const isMaster = g.id_guru === 1 || g.id_guru === 2 || g.id_guru === 4 || g.id_guru === 29 || String(g.role || '').toLowerCase() === 'master';
    const isGadmin = String(g.role || '').toLowerCase() === 'gadmin' || String(g.role || '').toLowerCase() === 'admin';
    const roleLabel = isMaster ? '[MASTER]' : isGadmin ? '[G.ADMIN]' : `[${String(g.role || 'GURU').toUpperCase()}]`;
    const uName = (g.username || (g.nama_guru || '').toLowerCase().replace(/[^a-z0-9]/g, '')) || '-';
    const pass = g.password || 'guru123';
    const mapel = (g.mapel || g.kelas || 'Guru Pengajar').replace('Inisial: ', 'Inisial ');

    out += String(idx + 1).padEnd(4) +
           String(g.nama_guru || '-').slice(0, 42).padEnd(44) +
           String(mapel).slice(0, 30).padEnd(32) +
           String(uName).slice(0, 22).padEnd(24) +
           String(pass).slice(0, 14).padEnd(16) +
           String(roleLabel).padEnd(14) +
           '\r\n';
  });
  out += '\r\n\r\n';

  // =====================================================================
  // BAGIAN 3: AKUN SISWA / SISWI SMK YPK MEDAN (DIKELOMPOKKAN PER KELAS)
  // =====================================================================
  out += '########################################################################################################\r\n';
  out += '                             BAGIAN 3: AKUN SISWA / SISWI PER KELAS                                     \r\n';
  out += '      (Login Siswa dapat menggunakan Username ATAU Nama Lengkap langsung - Password Tertera di Bawah)   \r\n';
  out += '########################################################################################################\r\n\r\n';

  // Kelompokkan siswa per kelas
  const kelasMap = new Map();
  siswas.forEach(s => {
    const k = (s.kelas || 'Umum').trim();
    if (!kelasMap.has(k)) kelasMap.set(k, []);
    kelasMap.get(k).push(s);
  });

  const sortedClasses = Array.from(kelasMap.keys()).sort();

  let globalSiswaIdx = 0;
  sortedClasses.forEach(kelasName => {
    const listSiswaKelas = kelasMap.get(kelasName);
    out += `\r\n========================================================================================================\r\n`;
    out += `  KELAS : ${kelasName}  (Jumlah: ${listSiswaKelas.length} Siswa)\r\n`;
    out += `========================================================================================================\r\n`;
    out += String('NO').padEnd(5) +
           String('NAMA LENGKAP SISWA').padEnd(40) +
           String('NISN / NIS').padEnd(14) +
           String('USERNAME LOGIN').padEnd(22) +
           String('KATA SANDI').padEnd(16) +
           String('ROLE AKSES').padEnd(14) +
           '\r\n';
    out += '-'.repeat(111) + '\r\n';

    listSiswaKelas.forEach((s, kIdx) => {
      globalSiswaIdx++;
      const isSadmin = String(s.role || '').toLowerCase().includes('admin') || String(s.role || '').toLowerCase() === 'sadmin';
      const roleLabel = isSadmin ? '[S.ADMIN]' : '[SISWA]';
      const uName = (s.username || (s.nama_siswa || '').toLowerCase().replace(/[^a-z0-9]/g, '')) || '-';
      const nisStr = s.nisn || s.nis || '-';
      const pass = s.password || 'siswa123';

      out += String(kIdx + 1).padEnd(5) +
             String(s.nama_siswa || '-').slice(0, 38).padEnd(40) +
             String(nisStr).slice(0, 12).padEnd(14) +
             String(uName).slice(0, 20).padEnd(22) +
             String(pass).slice(0, 14).padEnd(16) +
             String(roleLabel).padEnd(14) +
             '\r\n';
    });
  });

  out += '\r\n\r\n';
  out += '========================================================================================================\r\n';
  out += `TOTAL KESELURUHAN DATA: ${gurus.length} Dewan Guru & Staff | ${siswas.length} Siswa/Siswi Terdaftar\r\n`;
  out += 'DOKUMEN RESMI SMK YPK MEDAN - SIMPAN DAN JAGA KERAHASIAAN KATA SANDI MASING-MASING PENGGUNA.\r\n';
  out += '========================================================================================================\r\n';

  // Simpan ke Desktop pengguna
  const userProfile = process.env.USERPROFILE || 'C:\\Users\\ACER-ENTERPRICE';
  const desktopFilePath = path.join(userProfile, 'Desktop', 'AKUN_LOGIN_GURU_DAN_SISWA_SMK_YPK.txt');
  fs.writeFileSync(desktopFilePath, out, 'utf8');
  console.log('Berhasil disimpan di Desktop:', desktopFilePath);

  // Simpan juga salinan di folder project
  const projectFilePath = path.join(__dirname, '..', 'AKUN_LOGIN_GURU_DAN_SISWA_SMK_YPK.txt');
  fs.writeFileSync(projectFilePath, out, 'utf8');
  console.log('Berhasil disimpan di Project:', projectFilePath);

  // Buka langsung file di Notepad
  exec(`notepad.exe "${desktopFilePath}"`, (err) => {
    if (err) {
      console.warn('Catatan buka notepad:', err.message);
    } else {
      console.log('Notepad berhasil diluncurkan di layar pengguna!');
    }
  });
}

generate();
