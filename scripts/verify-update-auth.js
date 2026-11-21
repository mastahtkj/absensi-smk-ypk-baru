const { execSync } = require('child_process');
const readline = require('readline');

const AUTH_EMAIL = 'smkypkmedan@gmail.com';
const REQUIRED_CODES = ['301020', 'iqbal900'];

function getGitEmail() {
  try {
    return execSync('git config user.email', { encoding: 'utf8' }).trim();
  } catch (e) {
    return '';
  }
}

async function verifyAuth() {
  // If running in automated deployment (Vercel, GitHub Actions)
  if (process.env.VERCEL || process.env.CI || (process.env.UPDATE_AUTH_CODE && REQUIRED_CODES.includes(process.env.UPDATE_AUTH_CODE.trim()))) {
    return true;
  }

  const currentEmail = getGitEmail();
  if (currentEmail.toLowerCase() === AUTH_EMAIL.toLowerCase()) {
    return true;
  }

  console.log('\n===================================================================');
  console.log(' [KEAMANAN SISTEM SMK YPK MEDAN - PROTEKSI PEMILIK RESMI]');
  console.log('===================================================================');
  console.log(` Email Git terdeteksi : "${currentEmail}"`);
  console.log(` Status               : BUKAN EMAIL PENGEMBANG UTAMA (${AUTH_EMAIL})`);
  console.log('-------------------------------------------------------------------');
  console.log(' PERINGATAN: Project ini dilindungi hak cipta & lisensi SMK YPK.');
  console.log(' Masukkan Kode Konfirmasi Pemilik untuk melanjutkan update.');
  console.log('===================================================================\n');

  // If not a TTY (cannot prompt)
  if (!process.stdin.isTTY) {
    console.error('[AKSES DITOLAK] Diperlukan kode konfirmasi update. Akses ditolak.\n');
    process.exit(1);
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('Masukkan Kode Konfirmasi Update: ', (answer) => {
      rl.close();
      if (answer && REQUIRED_CODES.includes(answer.trim())) {
        console.log('\n[TERVERIFIKASI] Kode konfirmasi valid. Melanjutkan proses...\n');
        resolve(true);
      } else {
        console.error('\n[AKSES DITOLAK] Kode konfirmasi salah! Anda tidak memiliki izin untuk mengupdate project ini.\n');
        process.exit(1);
      }
    });
  });
}

if (require.main === module) {
  verifyAuth();
}

module.exports = { verifyAuth };
