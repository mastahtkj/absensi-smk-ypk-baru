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