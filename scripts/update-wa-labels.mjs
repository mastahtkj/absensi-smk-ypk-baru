// =============================================================
//  Ganti label "WhatsApp / WA" di UI menjadi "Notifikasi Aplikasi"
//  (gateway Kirimi.id sudah dihapus, notifikasi kini realtime in-app)
// =============================================================
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const report = [];

function edit(relPath, fn) {
  const p = path.join(root, relPath);
  if (!fs.existsSync(p)) {
    report.push(`LEWAT (file tidak ada): ${relPath}`);
    return;
  }
  const before = fs.readFileSync(p, 'utf8');
  const after = fn(before);
  fs.writeFileSync(p, after, 'utf8');
  report.push(`DIPROSES: ${relPath} (${before.length} -> ${after.length} karakter)`);
}

edit('app/page.js', (src) => {
  let s = src;
  const before = s.length;

  const reps = [
    [
      'title: \'Rekap Rangkuman Siswa Terkirim! 🎉\'',
      'title: \'Rekap Rangkuman Siswa Terkirim! 🎉\'',
    ],
    [
      'html: `Rekapitulasi <b>${sortedLogs.length} Siswa</b> berhasil dikirim ke Grup WhatsApp dalam 1 pesan resmi yang rapi &amp; aman.`',
      'html: `Rekapitulasi <b>${sortedLogs.length} Siswa</b> berhasil dikirim ke seluruh perangkat aplikasi secara realtime.`',
    ],
    [
      "text: data.message || 'Terjadi kesalahan pada gateway WhatsApp.',",
      "text: data.message || 'Terjadi kesalahan pada layanan notifikasi aplikasi.',",
    ],
    [
      "title: 'Notifikasi WA Terkirim! 🎉',",
      "title: 'Notifikasi Terkirim! 🎉',",
    ],
    [
      "html: `Status presensi untuk <b>{namaSiswa}</b> (<i>{statusSiswa}</i>) berhasil dikirim ke Grup WhatsApp.`",
      "html: `Status presensi untuk <b>{namaSiswa}</b> (<i>{statusSiswa}</i>) berhasil dikirim ke seluruh perangkat aplikasi secara realtime.`",
    ],
    [
      "title: 'Gagal Mengirim WA',",
      "title: 'Gagal Mengirim Notifikasi',",
    ],
  ];

  reps.forEach(([from, to]) => {
    if (from !== to && s.includes(from)) {
      s = s.split(from).join(to);
      report.push(`  DIUBAH: ${from.slice(0, 60)}...`);
    } else if (from === to) {
      report.push(`  (sama): ${from.slice(0, 60)}...`);
    } else {
      report.push(`  LEWAT: ${from.slice(0, 60)}...`);
    }
  });

  report.push(`  Total perubahan: ${before - s.length} karakter`);
  return s;
});

console.log('=== Laporan update label notifikasi ===');
report.forEach((r) => console.log(' - ' + r));
console.log('Selesai.');