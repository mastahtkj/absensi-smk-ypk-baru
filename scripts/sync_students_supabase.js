const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://wpyfwkcevgdhkazeesdq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_m_6VQvv9JT7FimMwws341w_NA_tukF6';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const ADMIN_SISWA_PATTERNS = [
  'ira ulandari',
  'alzalika',
  'alzalikha',
  'aisha',
  'rizky arka',
  'indira',
  'aini',
  'tajie',
  'ahmadiniz',
  'ahmadized',
  'nazwa syifa',
  'cut razki',
];

// Generator panggilan akrab
function extractCallName(fullName) {
  let cleaned = fullName.replace(/[,.]/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
  let parts = cleaned.split(' ').filter(p => p.length > 0);
  
  const PREFIXES = ['MUHAMMAD', 'MHD', 'M', 'MHAD', 'MOCHAMMAD', 'MUH', 'SITI'];
  let callName = '';
  
  if (parts.length > 1 && PREFIXES.includes(parts[0])) {
    if ((parts[1] === 'AL' || parts[1] === 'EL') && parts.length > 2) {
      callName = parts[1] + parts[2];
    } else {
      callName = parts[1];
    }
  } else {
    callName = parts[0];
  }
  
  return callName.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function generateRandomPassword() {
  const digits = Math.floor(1000 + Math.random() * 9000); // 1000 s/d 9999
  return `ypk${digits}`;
}

async function run() {
  console.log('=== 1. MEMBACA DATA SISWA RESMI ===');
  const siswaFilePath = path.join(__dirname, '..', 'app', 'data', 'siswaData.js');
  const rawContent = fs.readFileSync(siswaFilePath, 'utf8');
  const arrayMatch = rawContent.match(/export const OFFICIAL_SMK_YPK_STUDENTS = (\[[\s\S]*?\]);\s*$/);
  if (!arrayMatch) {
    throw new Error('Gagal parse OFFICIAL_SMK_YPK_STUDENTS dari siswaData.js');
  }
  const originalStudents = eval(arrayMatch[1]);
  console.log(`Ditemukan ${originalStudents.length} siswa resmi.`);

  console.log('\n=== 2. MEN-GENERATE USERNAME NAMA PANGGILAN & PASSWORD ACAK ===');
  const usedUsernames = new Set();
  const processedStudents = [];

  for (const s of originalStudents) {
    const rawNama = s.nama || s.nama_siswa || '';
    let baseNick = extractCallName(rawNama);
    if (!baseNick || baseNick.length < 3) {
      baseNick = (rawNama.split(/\s+/)[0] || 'siswa').toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    let candidate = baseNick;
    let counter = 1;

    // Jika terjadi duplikasi panggilan, pakai kombinasi nama belakang
    if (usedUsernames.has(candidate)) {
      const parts = rawNama.replace(/[^a-zA-Z\s]/g, ' ').trim().split(/\s+/);
      if (parts.length > 1) {
        const lastWord = parts[parts.length - 1].toLowerCase().replace(/[^a-z0-9]/g, '');
        candidate = `${baseNick}.${lastWord}`;
      }
      while (usedUsernames.has(candidate)) {
        counter++;
        candidate = `${baseNick}${counter}`;
      }
    }

    usedUsernames.add(candidate);
    const password = generateRandomPassword();

    const nameLower = rawNama.toLowerCase();
    const isAdmin = ADMIN_SISWA_PATTERNS.some(p => nameLower.includes(p));
    const role = isAdmin ? 'Admin' : (s.role || 'Siswa');

    processedStudents.push({
      id: s.id,
      rawId: s.rawId || s.id,
      nama: rawNama,
      nama_siswa: rawNama,
      username: candidate,
      password: password,
      kelas: s.kelas || '-',
      jurusan: s.jurusan || '',
      role: role,
      isGuru: false,
      foto_url: '',
      face_descriptor: null,
      biodata: {
        username: candidate,
        nama_siswa: rawNama,
        password: password,
        role: role,
        kelas: s.kelas || '-',
        jurusan: s.jurusan || '',
        face_descriptor: null,
        face_photo_url: null
      }
    });
  }

  console.log(`Berhasil membuat ${processedStudents.length} akun. Seluruh ${usedUsernames.size} username unik!`);

  console.log('\n=== 3. MENGOSONGKAN DATA LAMA DI SUPABASE tb_siswa ===');
  // Hapus semua data lama di tb_siswa
  const { error: delErr } = await supabase.from('tb_siswa').delete().neq('id_siswa', 0);
  if (delErr) {
    console.error('Peringatan saat delete tb_siswa:', delErr);
  } else {
    console.log('Tabel tb_siswa lama berhasil dikosongkan.');
  }

  console.log('\n=== 4. MENGUNGGAH 204 SISWA KE SUPABASE tb_siswa SECARA BERTAHAP ===');
  const batchSize = 25;
  for (let i = 0; i < processedStudents.length; i += batchSize) {
    const chunk = processedStudents.slice(i, i + batchSize);
    const rowsToInsert = chunk.map(s => ({
      id_siswa: s.id,
      nama_siswa: s.nama,
      username: s.username,
      password: s.password,
      kelas: s.kelas,
      jurusan: s.jurusan,
      role: s.role,
      face_descriptor: null,
      foto_url: null,
      biodata: s.biodata,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { data, error } = await supabase.from('tb_siswa').insert(rowsToInsert);
    if (error) {
      console.error(`Gagal insert batch ${i} - ${i + chunk.length}:`, error);
      throw error;
    }
    console.log(`✓ Terunggah ${Math.min(i + batchSize, processedStudents.length)} / ${processedStudents.length} siswa ke Supabase.`);
  }

  console.log('\n=== 5. RESET BIOMETRIK WAJAH GURU DI tb_guru ===');
  const { error: guruErr } = await supabase.from('tb_guru').update({
    face_descriptor: null
  }).neq('id_guru', 0);
  if (guruErr) {
    console.warn('Peringatan saat reset guru face:', guruErr);
  } else {
    console.log('✓ Biometrik wajah guru berhasil direset di tb_guru.');
  }

  console.log('\n=== 6. VERIFIKASI DATA DI SUPABASE ===');
  const { count: finalCount, error: countErr } = await supabase.from('tb_siswa').select('*', { count: 'exact', head: true });
  console.log(`Jumlah baris tb_siswa di Supabase saat ini: ${finalCount} (Error: ${countErr ? countErr.message : 'none'})`);

  console.log('\n=== 7. MENULIS ULANG app/data/siswaData.js ===');
  const newJsContent = `// 🎓 DATA RESMI MASTER SISWA SMK YPK MEDAN LENGKAP DARI SELURUH KELAS
// X TJKT, XI TJKT, X AKL, XI AKL, X MPLB, XI MPLB, X PM, XI PM
// Total: ${processedStudents.length} Siswa (Username Nama Panggilan + Password Acak)

export const OFFICIAL_SMK_YPK_STUDENTS = ${JSON.stringify(processedStudents, null, 2)};
`;
  fs.writeFileSync(siswaFilePath, newJsContent, 'utf8');
  console.log('✓ app/data/siswaData.js berhasil diperbarui.');

  console.log('\n=== 8. MEMBUAT REKAP EXPORT (CSV, TXT, JSON) ===');
  const publicDir = path.join(__dirname, '..', 'public');
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

  // Format CSV
  let csv = 'No,ID Siswa,Nama Lengkap Siswa,Kelas,Jurusan,Username (Nama Panggilan),Password Acak,Role Akses\n';
  processedStudents.forEach((s, idx) => {
    csv += `${idx + 1},${s.id},"${s.nama}","${s.kelas}","${s.jurusan}","${s.username}","${s.password}","${s.role}"\n`;
  });
  const csvPath = path.join(publicDir, 'DATA_LOGIN_SISWA_SMK_YPK.csv');
  fs.writeFileSync(csvPath, csv, 'utf8');
  console.log(`✓ CSV rekap disimpan di: ${csvPath}`);

  // Format TXT Ringkas
  let txt = `========================================================================================\n`;
  txt += `       DAFTAR RESMI AKUN LOGIN SISWA SMK YPK MEDAN (204 SISWA)\n`;
  txt += `       Username Berdasarkan Nama Panggilan & Kata Sandi Unik Acak\n`;
  txt += `========================================================================================\n\n`;
  
  const byClass = {};
  processedStudents.forEach(s => {
    if (!byClass[s.kelas]) byClass[s.kelas] = [];
    byClass[s.kelas].push(s);
  });

  Object.keys(byClass).sort().forEach(k => {
    txt += `----------------------------------------------------------------------------------------\n`;
    txt += `KELAS: ${k} (${byClass[k].length} Siswa)\n`;
    txt += `----------------------------------------------------------------------------------------\n`;
    txt += `NO  | NAMA LENGKAP                   | USERNAME         | PASSWORD   | ROLE\n`;
    txt += `----+--------------------------------+------------------+------------+----------\n`;
    byClass[k].forEach((s, i) => {
      const no = String(i + 1).padEnd(3);
      const nama = s.nama.padEnd(30).slice(0, 30);
      const user = s.username.padEnd(16).slice(0, 16);
      const pw = s.password.padEnd(10);
      const role = s.role;
      txt += `${no} | ${nama} | ${user} | ${pw} | ${role}\n`;
    });
    txt += `\n`;
  });

  const txtPath = path.join(publicDir, 'DATA_LOGIN_SISWA_SMK_YPK.txt');
  fs.writeFileSync(txtPath, txt, 'utf8');
  console.log(`✓ TXT rekap disimpan di: ${txtPath}`);

  console.log('\n=======================================================');
  console.log('🎉 SELURUH PROSES SELESAI DENGAN SUKSES 100%!');
  console.log('=======================================================');
}

run().catch(err => {
  console.error('Fatal Error:', err);
  process.exit(1);
});
