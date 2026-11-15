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
  try {
    // PENTING: pakai select('*') supaya TIDAK PERNAH gagal hanya karena
    // satu nama kolom tidak ada di database (mis. 'tipe' / 'rfid_uid').
    // Penyaringan tanggal dilakukan di sisi server.
    const { data, error } = await supabase
      .from('absensi')
      .select('*')
      .order('id', { ascending: false })
      .limit(limit);

    if (error) {
      return { data: [], error, usedFallback: true };
    }

    let rows = data || [];
    if (range) {
      const start = new Date(range.startOfDay).getTime();
      const end = new Date(range.endOfDay).getTime();
      rows = rows.filter((row) => {
        const raw = getRowTimestamp(row);
        if (!raw) return false;
        const t = new Date(raw).getTime();
        return !Number.isNaN(t) && t >= start && t <= end;
      });
    }

    return { data: rows, error: null, usedFallback: true };
  } catch (e) {
    return { data: [], error: e, usedFallback: true };
  }
}

/**
 * Ambil timestamp sebuah baris absensi, kompatibel dengan beberapa
 * variasi skema database (created_at / tanggal+jam_masuk).
 */
export function getRowTimestamp(row) {
  if (!row) return null;
  if (row.created_at) return row.created_at;
  if (row.tanggal) {
    const time = row.jam_masuk || '00:00:00';
    return `${row.tanggal}T${time}${String(time).length === 8 ? '.999' : ''}Z`;
  }
  return null;
}

/**
 * Cari log absensi milik seorang (berdasarkan UID RFID) pada rentang
 * tanggal tertentu. Tidak bergantung pada kolom `created_at` maupun
 * `rfid_uid` supaya aman untuk semua variasi skema database.
 */
export async function findAbsensiByUid(supabase, uidVariants, range, limit = 50) {
  try {
    const { data, error } = await supabase
      .from('absensi')
      .select('*')
      .order('id', { ascending: false })
      .limit(limit);

    if (error) {
      return { data: [], error };
    }

    const variants = (uidVariants || [])
      .filter(Boolean)
      .map((v) => String(v).replace(/[^A-Za-z0-9]/g, '').toUpperCase())
      .filter((v) => v.length >= 4);

    let rows = data || [];

    // Filter berdasarkan UID RFID (bila kolomnya tersedia di baris)
    if (variants.length > 0) {
      rows = rows.filter((row) => {
        const rawUid = String(row.rfid_uid || row.uid_rfid || '')
          .replace(/[^A-Za-z0-9]/g, '')
          .toUpperCase();
        if (!rawUid) return false;
        return variants.some((v) => rawUid === v || rawUid.includes(v) || v.includes(rawUid));
      });
    }

    // Filter berdasarkan tanggal
    if (range) {
      const start = new Date(range.startOfDay).getTime();
      const end = new Date(range.endOfDay).getTime();
      rows = rows.filter((row) => {
        const raw = getRowTimestamp(row);
        if (!raw) return false;
        const t = new Date(raw).getTime();
        return !Number.isNaN(t) && t >= start && t <= end;
      });
    }

    return { data: rows, error: null };
  } catch (e) {
    return { data: [], error: e };
  }
}

/**
 * Cari satu baris absensi milik `nama` pada rentang tanggal tertentu.
 * Menyamaikan dengan `ilike` bila kolomnya tersedia, lalu tetap
 * menyaring tanggal di sisi server sebagai jaring pengaman.
 */
export async function findAbsensiByName(supabase, nama, range, selectColumns = '*') {
  try {
    const { data, error } = await supabase
      .from('absensi')
      .select('*')
      .ilike('nama', nama)
      .order('id', { ascending: false })
      .limit(50);

    if (error) {
      return { data: null, error };
    }

    let rows = data || [];
    if (range) {
      const start = new Date(range.startOfDay).getTime();
      const end = new Date(range.endOfDay).getTime();
      rows = rows.filter((row) => {
        const raw = getRowTimestamp(row);
        if (!raw) return false;
        const t = new Date(raw).getTime();
        return !Number.isNaN(t) && t >= start && t <= end;
      });
    }

    return { data: rows.length > 0 ? rows[0] : null, error: null };
  } catch (e) {
    return { data: null, error: e };
  }
}

export default fetchAbsensiRange;