// =============================================================
//  UTILITAS WAKTU WIB (Indonesia Barat) - SATU-SATUNYA SUMBER
// =============================================================
//
//  ⚠️ MASALAH SERIUS YANG PERNAH MENYEBABKAN PRESENSI GAGAL DISIMPAN:
//  PostgreSQL kolom `jam_masuk` / `jam_pulang` bertipe TIME.
//  Nilai yang dikirim sebelumnya memakai `toLocaleTimeString('id-ID')`
//  yang menghasilkan format "23.48.34" (pakai TITIK).
//  PostgreSQL hanya menerima "23:48:34" (pakai KOLON) =>
//  error: invalid input syntax for type time: "23.48.34"
//
//  Semua penulisan waktu ke database WAJIB memakai helper di file ini.
// =============================================================

export const WIB_TIMEZONE = 'Asia/Jakarta';

/**
 * Format waktu WIB 24 jam dengan pemisah KOLON.
 * Contoh: "23:48:34" (dengan detik) atau "23:48" (tanpa detik).
 * Aman untuk kolom PostgreSQL bertipe TIME maupun VARCHAR.
 */
export function formatWibTime(date = new Date(), withSeconds = true) {
  const d = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: WIB_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d);

  const pick = (type) => parts.find((p) => p.type === type)?.value || '00';
  const hh = pick('hour');
  const mm = pick('minute');
  const ss = pick('second');

  return withSeconds ? `${hh}:${mm}:${ss}` : `${hh}:${mm}`;
}

/**
 * Format tanggal WIB menjadi "YYYY-MM-DD" (format DATE PostgreSQL).
 */
export function formatWibDate(date = new Date()) {
  const d = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: WIB_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/**
 * Tanggal + waktu WIB sekaligus: "2026-11-15 23:48:34".
 */
export function formatWibDateTime(date = new Date(), withSeconds = true) {
  return `${formatWibDate(date)} ${formatWibTime(date, withSeconds)}`;
}

/**
 * Tanggal WIB versi panjang Indonesia (untuk tampilan, bukan database).
 */
export function formatWibDateLong(date = new Date()) {
  const d = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: WIB_TIMEZONE,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
}

/**
 * Ubah sembarang string waktu ("23.48.34", "23:48", "23:48:34")
 * menjadi format TIME PostgreSQL: "HH:MM:SS".
 * Mengembalikan null bila tidak bisa diparse.
 */
export function normalizeTimeForDb(value) {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return formatWibTime(value, true);

  const raw = String(value).trim();
  if (!raw) return null;

  // Buang sufiks WIB / label lain
  const cleaned = raw.replace(/\s*(wib|wita|wit|utc)$/i, '').trim();

  // Format "HH:MM:SS" / "HH.MM.SS" / "HH:MM" / "HH.MM"
  const m = cleaned.match(/^(\d{1,2})[:.](\d{1,2})(?:[:.](\d{1,2}))?$/);
  if (m) {
    const hh = String(Math.min(23, Number(m[1]))).padStart(2, '0');
    const mm = String(Math.min(59, Number(m[2]))).padStart(2, '0');
    const ss = String(Math.min(59, Number(m[3] || 0))).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }

  return null;
}

/**
 * Hitung menit-menit sejak tengah malam WIB (untuk logika terlambat).
 */
export function getWibMinutes(date = new Date()) {
  const hhmm = formatWibTime(date, false);
  const [hh, mm] = hhmm.split(':').map(Number);
  return (hh || 0) * 60 + (mm || 0);
}

/**
 * Parse "HH:MM" dari konfigurasi aplikasi (mis. "07:30") menjadi menit.
 */
export function parseHourMinuteToMinutes(value, fallback = 0) {
  const m = String(value || '').match(/^(\d{1,2})[:.](\d{1,2})$/);
  if (!m) return fallback;
  return Number(m[1]) * 60 + Number(m[2]);
}

export default {
  WIB_TIMEZONE,
  formatWibTime,
  formatWibDate,
  formatWibDateTime,
  formatWibDateLong,
  normalizeTimeForDb,
  getWibMinutes,
  parseHourMinuteToMinutes,
};