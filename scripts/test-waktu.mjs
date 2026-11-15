// =============================================================
//  Uji format waktu (penyebab utama "GAGAL MENYIMPAN PRESENSI")
// =============================================================
import { formatWibTime, formatWibDate, normalizeTimeForDb } from '../app/utils/waktu.js';

let gagal = 0;
const cek = (label, hasil, harapan) => {
  const ok = hasil === harapan;
  if (!ok) gagal += 1;
  console.log(`${ok ? 'OK  ' : 'X   '} ${label} -> "${hasil}" (harapan: "${harapan}")`);
};

const d = new Date('2026-11-15T16:48:34.000Z'); // 23:48:34 WIB

cek('formatWibTime (dengan detik)', formatWibTime(d, true), '23:48:34');
cek('formatWibTime (tanpa detik)', formatWibTime(d, false), '23:48');
cek('formatWibDate', formatWibDate(d), '2026-11-15');

// Nilai lama yang dulu menyebabkan error database
cek('normalize "23.48.34"', normalizeTimeForDb('23.48.34'), '23:48:34');
cek('normalize "23:48"', normalizeTimeForDb('23:48'), '23:48:00');
cek('normalize "07:15"', normalizeTimeForDb('07:15'), '07:15:00');
cek('normalize "23.48"', normalizeTimeForDb('23.48'), '23:48:00');
cek('normalize tidak valid', normalizeTimeForDb('bukan jam'), null);

// Validasi pola TIME PostgreSQL
const polaTime = /^\d{2}:\d{2}:\d{2}$/;
const contoh = ['23:48:34', '07:15:00', '00:00:00', '14:35:09'];
contoh.forEach((t) => {
  const ok = polaTime.test(t);
  if (!ok) gagal += 1;
  console.log(`${ok ? 'OK  ' : 'X   '} pola PostgreSQL TIME: "${t}"`);
});

console.log(gagal === 0 ? '\n✅ SEMUA UJI FORMAT WAKTU LULUS' : `\n❌ ${gagal} UJI GAGAL`);
process.exit(gagal === 0 ? 0 : 1);