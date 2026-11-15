// =============================================================
//  Script satu kali: hapus seluruh UI & logika RFID dari app/page.js
//  (Presensi resmi sekarang HANYA Face Recognition AI)
// =============================================================
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const pagePath = path.join(root, 'app', 'page.js');

let src = fs.readFileSync(pagePath, 'utf8');
const originalLength = src.length;
const report = [];

function removeBetween(label, startRe, endRe) {
  const startMatch = src.match(startRe);
  if (!startMatch) {
    report.push(`LEWAT (start tidak ditemukan): ${label}`);
    return false;
  }
  const start = startMatch.index;
  const after = src.slice(start + startMatch[0].length);
  const endMatch = after.match(endRe);
  if (!endMatch) {
    report.push(`LEWAT (end tidak ditemukan): ${label}`);
    return false;
  }
  const cutEnd = start + startMatch[0].length + endMatch.index;
  src = src.slice(0, start) + src.slice(cutEnd);
  report.push(`DIHAPUS: ${label}`);
  return true;
}

function removeBetweenText(label, startText, endText) {
  const start = src.indexOf(startText);
  if (start === -1) {
    report.push(`LEWAT (start tidak ditemukan): ${label}`);
    return false;
  }
  // Mundur ke awal baris komentar pembuka
  let lineStart = src.lastIndexOf('\n', start) + 1;
  // Mundur lagi satu baris (baris komentar "=====" di atasnya)
  const prevLineStart = src.lastIndexOf('\n', lineStart - 1) + 1;
  const blockStart = src.slice(prevLineStart, lineStart).includes('{/*') ? prevLineStart : lineStart;

  const end = src.indexOf(endText, start);
  if (end === -1) {
    report.push(`LEWAT (end tidak ditemukan): ${label}`);
    return false;
  }
  src = src.slice(0, blockStart) + src.slice(end);
  report.push(`DIHAPUS: ${label}`);
  return true;
}

function replaceRe(label, re, to) {
  if (!re.test(src)) {
    report.push(`LEWAT (pola tidak ditemukan): ${label}`);
    return false;
  }
  const before = src.length;
  src = src.replace(re, to);
  report.push(`DIUBAH: ${label} (${before - src.length} karakter)`);
  return true;
}

// ------------------------------------------------------------------
// 1. Hapus modal "Registrasi Kartu RFID" (seluruh blok JSX)
// ------------------------------------------------------------------
removeBetweenText(
  'Modal Registrasi Kartu RFID',
  'MODAL REGISTRASI KARTU RFID',
  '        {/* MODAL EDIT MASTER DATA */}'
);

// ------------------------------------------------------------------
// 2. Hapus 2 efek polling RFID (latest_scan + USB keyboard wedge)
// ------------------------------------------------------------------
removeBetween(
  'Efek polling RFID latest_scan + USB keyboard wedge',
  /\/\/ \uD83D\uDCE1 Realtime & Polling listener untuk Latest Scan[^\n]*\n/,
  /\/\/ \uD83D\uDCF1 GESTURE SWIPE KANAN & KIRI/
);

// ------------------------------------------------------------------
// 3. Hapus kolom UID/RFID dari payload master data
// ------------------------------------------------------------------
replaceRe(
  'Payload broadcast user_data_updated (hapus uid_rfid/rfid_uid)',
  /[ \t]*uid_rfid:\s*editRfid,\r?\n[ \t]*rfid_uid:\s*editRfid,\r?\n/g,
  ''
);

replaceRe(
  'Payload session sendiri (hapus rfid_uid/uid_rfid)',
  /[ \t]*rfid_uid:\s*editRfid,\r?\n[ \t]*uid_rfid:\s*editRfid,\r?\n/g,
  ''
);

replaceRe(
  'Sisa kolom editRfid di payload update master',
  /[ \t]*(rfid_uid|uid_rfid):\s*editRfid,\r?\n/g,
  ''
);

// ------------------------------------------------------------------
// 4. Ganti label "UID RFID" -> "ID Akun"
// ------------------------------------------------------------------
replaceRe(
  'Label UID RFID pada kartu target',
  /UID RFID: <code>\{target\.rfid_uid \|\| 'Belum Terdaftar'\}<\/code>/g,
  "ID Akun: <code>{target.id || 'GURU/SISWA'}</code>"
);

// ------------------------------------------------------------------
// 5. effectiveUid -> ID Akun internal (bukan RFID)
// ------------------------------------------------------------------
replaceRe(
  'effectiveUid berbasis ID Akun internal',
  /const effectiveUid =\r?\n(?:[ \t]*[^\n]*\|\|\r?\n)*[ \t]*'';/,
  [
    '// \u{1F511} ID Akun internal (bukan RFID) - presensi memakai Face Recognition AI',
    'const effectiveUid = (isGuruAccount',
    "  ? `GURU-${currentUser?.rawId || currentUser?.id_guru || currentUser?.id || '01'}`",
    "  : `SIS-${currentUser?.rawId || currentUser?.id_siswa || currentUser?.id || '01'}`",
    ').toUpperCase();',
  ].join('\n')
);

// ------------------------------------------------------------------
// 6. Teks bantuan AI: buang referensi RFID
// ------------------------------------------------------------------
replaceRe(
  'Teks sapaan asisten AI',
  /sistem kartu RFID, perangkat &/g,
  'sistem biometrik wajah AI, perangkat &'
);

replaceRe(
  'Balasan AI tentang RFID',
  /q\.includes\('kartu'\) \|\| q\.includes\('rfid'\)/g,
  "q.includes('kartu')"
);

replaceRe(
  'Daftar topik asisten AI (hapus Cara Pakai RFID)',
  /[ \t]*'\uD83D\uDCB3 Cara Pakai RFID',\r?\n/g,
  ''
);

replaceRe(
  'Penjelasan sistem presensi (tegaskan 100% Face AI)',
  /100% menggunakan Biometrik Face Recognition AI \(kartu RFID telah digantikan\)\./g,
  '100% menggunakan Biometrik Face Recognition AI (sistem RFID kartu sudah sepenuhnya dihapus).'
);

// ------------------------------------------------------------------
// 7. Status "Hadir (Tanpa Kartu)" -> "Hadir"
// ------------------------------------------------------------------
replaceRe(
  'Status hadir tanpa kartu',
  /\(rfidUid \? 'Hadir' : 'Hadir \(Tanpa Kartu\)'\)/g,
  "'Hadir'"
);

fs.writeFileSync(pagePath, src, 'utf8');

console.log('=== Laporan penghapusan RFID (app/page.js) ===');
report.forEach((r) => console.log(' - ' + r));

const leftovers = (src.match(/MODAL REGISTRASI KARTU RFID/g) || []).length;
console.log(`\nSisa "MODAL REGISTRASI KARTU RFID": ${leftovers}`);
console.log(`Ukuran file: ${originalLength} -> ${src.length} karakter`);
console.log('Selesai.');