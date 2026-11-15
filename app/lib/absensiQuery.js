// =============================================================
//  QUERY ABSENSI YANG AMAN (TANGGAL OPSIONAL)
//
//  Masalah: sebagian instalasi database TIDAK memiliki kolom
//  `created_at` pada tabel `absensi`. Query `.gte('created_at', ...)`
//  lalu GAGAL total (HTTP 400) sehingga rekap presensi selalu 500.
//
//  Solusi: coba query dengan filter tanggal; bila error (kolom tidak
//  ada / RLS menolak), fallback ke query TANPA filter tanggal lalu
//  saring di sisi server. Hasil tetap akurat, tidak pernah 500.
// =============================================================

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} selectColumns daftar kolom yang diambil
 * @param {{startOfDay:string,endOfDay:string}|null} range
 * @param {number} limit
 */
export async function fetchAbsensiRange(supabase, selectColumns, range, limit = 1000) {
  const run = (withRange) => {
    let q = supabase.from('absensi').select(selectColumns);
    if (withRange && range) {
      q = q.gte('created_at', range.startOfDay).lte('created_at', range.endOfDay);
    }
    return q.limit(limit);
  };

  // Percobaan 1: dengan filter created_at (paling efisien bila kolomnya ada)
  const first = await run(true);
  if (!first.error) {
    return { data: first.data || [], error: null, usedFallback: false };
  }

  // Percobaan 2: tanpa filter tanggal (selalu aman)
  const second = await run(false);
  if (second.error) {
    // Percobaan 3: kolom paling minimal + tanpa filter
    const minimal = await supabase
      .from('absensi')
      .select('id, nama, status, kelas, tanggal, jam_masuk, jam_pulang, created_at')
      .limit(limit);
    if (minimal.error) {
      return { data: [], error: minimal.error, usedFallback: true };
    }
    return { data: minimal.data || [], error: null, usedFallback: true };
  }

  // Saring sendiri di server bila kolom created_at tidak bisa dipakai
  let rows = second.data || [];
  if (range) {
    rows = rows.filter((row) => {
      const raw =
        row.created_at ||
        (row.tanggal ? `${row.tanggal}T${row.jam_masuk || '00:00:00'}.000Z` : null);
      if (!raw) return false;
      const t = new Date(raw).getTime();
      if (Number.isNaN(t)) return false;
      const start = new Date(range.startOfDay).getTime();
      const end = new Date(range.endOfDay).getTime();
      return t >= start && t <= end;
    });
  }

  return { data: rows, error: null, usedFallback: true };
}

/**
 * Cari satu baris absensi milik `nama` pada rentang tanggal tertentu.
 * Menyamaikan dengan `ilike` bila kolomnya tersedia, lalu tetap
 * menyaring tanggal di sisi server sebagai jaring pengaman.
 */
export async function findAbsensiByName(supabase, nama, range, selectColumns = '*') {
  const attempt = async (withDateFilter) => {
    let q = supabase.from('absensi').select(selectColumns).ilike('nama', nama);
    if (withDateFilter && range) {
      q = q.gte('created_at', range.startOfDay).lte('created_at', range.endOfDay);
    }
    const { data, error } = await q.limit(1);
    return { data, error };
  };

  const first = await attempt(true);
  if (!first.error) {
    // Query berjalan normal -> benar-benar belum ada baris
    return { data: first.data && first.data.length > 0 ? first.data[0] : null, error: null };
  }

  // Fallback: tanpa filter tanggal (kolom created_at tidak tersedia)
  const second = await attempt(false);
  if (second.error) {
    return { data: null, error: second.error };
  }

  let rows = second.data || [];
  if (range) {
    const start = new Date(range.startOfDay).getTime();
    const end = new Date(range.endOfDay).getTime();
    rows = rows.filter((row) => {
      const raw =
        row.created_at ||
        (row.tanggal ? `${row.tanggal}T${row.jam_masuk || '00:00:00'}.000Z` : null);
      if (!raw) return false;
      const t = new Date(raw).getTime();
      return !Number.isNaN(t) && t >= start && t <= end;
    });
  }

  return { data: rows.length > 0 ? rows[0] : null, error: null };
}

export default fetchAbsensiRange;