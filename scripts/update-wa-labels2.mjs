// =============================================================
//  Lanjutan: hapus sisa label "WhatsApp / WA" di UI page.js
// =============================================================
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const pagePath = path.join(root, 'app', 'page.js');
let src = fs.readFileSync(pagePath, 'utf8');
const report = [];

const reps = [
  [
    'Guru berhasil dikirim ke Grup WhatsApp.<br/>',
    'Guru berhasil dikirim ke seluruh perangkat aplikasi secara realtime.<br/>',
  ],
  [
    'berisi seluruh daftar siswa hadir (A-Z) ke Grup WhatsApp Siswa.<br/>',
    'berisi seluruh daftar siswa hadir (A-Z) ke seluruh perangkat aplikasi secara realtime.<br/>',
  ],
  ["text: 'Menyusun dan mengirim pesan ke Grup WhatsApp...',", "text: 'Menyusun dan mengirim notifikasi realtime ke seluruh perangkat...',"],
  [
    '🎯 <b>Tujuan:</b> Grup WhatsApp ${isGuru ? \'Dewan Guru\' : \'Presensi Siswa\'}',
    '🎯 <b>Tujuan:</b> Notifikasi realtime ke seluruh perangkat ${isGuru ? \'guru\' : \'siswa\'}',
  ],
  ["confirmButtonText: '🚀 Kirim Notifikasi WA',", "confirmButtonText: '🚀 Kirim Notifikasi',"],
  [
 'berhasil dikirim ke Grup WhatsApp.`',
 'berhasil dikirim ke seluruh perangkat aplikasi secara realtime.`',
  ],
  [
    'notifikasi WA pembatalan terkirim.',
    'notifikasi pembatalan terkirim ke seluruh perangkat.',
  ],
  [
    'Notifikasi WA telah dikirimkan.',
    'Notifikasi telah dikirimkan ke seluruh perangkat.',
  ],
];

reps.forEach(([from, to]) => {
  if (src.includes(from)) {
    src = src.split(from).join(to);
    report.push(`DIUBAH: ${from.slice(0, 70)}`);
  } else {
    report.push(`LEWAT : ${from.slice(0, 70)}`);
  }
});

fs.writeFileSync(pagePath, src, 'utf8');
console.log('=== Laporan ===');
report.forEach((r) => console.log(' - ' + r));
const sisa = (src.match(/Grup WhatsApp/g) || []).length;
console.log(`\nSisa "Grup WhatsApp" di page.js: ${sisa}`);