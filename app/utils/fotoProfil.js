// =============================================================
//  PENYIMPANAN FOTO PROFIL / ID CARD YANG ANTI HILANG
// =============================================================
//
//  MASALAH LAMA: "Saat upload foto di ID Card selalu hilang".
//  PENYEBAB:
//   1. Satu statement UPDATE berisi banyak kolom. PostgREST membatalkan
//      SELURUH statement kalau SATU kolom tidak ada di database
//      (mis. `biodata` atau `foto_updated_at`), sehingga foto tidak pernah
//      tersimpan - padahal UI tetap menampilkan "Berhasil".
//   2. Error hanya di-log ke console, tidak pernah diminta izin ke user.
//   3. Tidak ada salinan cadangan di browser => setelah refresh foto hilang.
//
//  SOLUSI (file ini):
//   - Simpan dengan "progressive fallback": coba payload lengkap, bila
//     gagal buang kolom yang tidak tersedia, coba lagi, dst.
//   - Kembalikan status detail supaya UI bisa jujur ke user.
//   - Selalu simpan salinan lokal (localStorage) sebagai cadangan.
// =============================================================

const PHOTO_LOCAL_PREFIX = 'user_photo_';

/** Hitung kunci localStorage foto yang terisolasi per role + id. */
export function buildPhotoKeys({ rawId, username, isGuru }) {
  const rolePrefix = isGuru ? 'GURU-' : 'SISWA-';
  const digits = String(rawId || '').replace(/\D/g, '');
  const keys = [];
  if (digits) keys.push(`${PHOTO_LOCAL_PREFIX}${rolePrefix}${digits}`);
  if (username) keys.push(`${PHOTO_LOCAL_PREFIX}${rolePrefix}${username}`);
  return keys;
}

/** Simpan salinan foto ke localStorage (cadangan anti-hilang). */
export function cachePhotoLocally(photoDataUrl, { rawId, username, isGuru }) {
  if (typeof window === 'undefined' || !photoDataUrl) return [];
  const saved = [];
  try {
    const keys = buildPhotoKeys({ rawId, username, isGuru });
    keys.forEach((k) => {
      localStorage.setItem(k, photoDataUrl);
      saved.push(k);
    });
    // Hapus marker "foto dihapus" agar foto baru tidak ikut terhapus
    keys.forEach((k) => localStorage.removeItem(`user_photo_deleted_${k}`));
  } catch (e) {
    /* storage penuh / private mode -> abaikan */
  }
  return saved;
}

/** Ambil salinan foto dari localStorage. */
export function getCachedPhoto({ rawId, username, isGuru }) {
  if (typeof window === 'undefined') return '';
  try {
    const keys = buildPhotoKeys({ rawId, username, isGuru });
    for (const k of keys) {
      const v = localStorage.getItem(k);
      if (v && v.length > 50) return v;
    }
  } catch (e) {}
  return '';
}

/**
 * Simpan foto ke database dengan progressive fallback.
 *
 * @param {object} supabase  Klien Supabase
 * @param {object} params
 * @param {string} params.table        'tb_siswa' / 'tb_guru'
 * @param {string} params.idColumn     'id_siswa' / 'id_guru'
 * @param {string|number} params.idValue
 * @param {string} params.photoDataUrl
 * @param {object} params.biodata      objek biodata (JSONB)
 * @param {string} params.nowIso
 */
export async function savePhotoToDatabase(supabase, {
  table,
  idColumn,
  idValue,
  photoDataUrl,
  biodata = {},
  nowIso = new Date().toISOString(),
}) {
  if (!supabase || !idValue) {
    return { ok: false, savedColumns: [], error: new Error('ID pengguna tidak valid'), strategy: 'none' };
  }

  const fullPayload = {
    foto_url: photoDataUrl,
    foto_updated_at: nowIso,
    biodata,
  };

  // Urutan percobaan: lengkap -> tanpa biodata -> tanpa foto_updated_at -> hanya foto_url
  const attempts = [
    { name: 'lengkap', payload: { ...fullPayload } },
    { name: 'tanpa-biodata', payload: { foto_url: photoDataUrl, foto_updated_at: nowIso } },
    { name: 'tanpa-foto_updated_at', payload: { foto_url: photoDataUrl, biodata } },
    { name: 'hanya-foto_url', payload: { foto_url: photoDataUrl } },
    {
      name: 'hanya-biodata',
      payload: { biodata: { ...biodata, foto_url: photoDataUrl, foto_resmi: photoDataUrl } },
    },
  ];

  let lastError = null;

  for (const attempt of attempts) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const { error } = await supabase
        .from(table)
        .update(attempt.payload)
        .eq(idColumn, idValue);

      if (!error) {
        return {
          ok: true,
          savedColumns: Object.keys(attempt.payload),
          error: null,
          strategy: attempt.name,
        };
      }
      lastError = error;
    } catch (e) {
      lastError = e;
    }
  }

  return {
    ok: false,
    savedColumns: [],
    error: lastError || new Error('Gagal menyimpan foto ke database'),
    strategy: 'gagal',
  };
}

export default savePhotoToDatabase;