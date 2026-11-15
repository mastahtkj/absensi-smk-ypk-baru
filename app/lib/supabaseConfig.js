// =============================================================
//  KONFIGURASI SUPABASE TERPUSAT (WAJIB DIPAKAI SEMUA MODUL)
//  - Prioritas: localStorage (diisi admin lewat Master Control)
//  - Fallback   : env NEXT_PUBLIC_* (di-inject Vercel)
//  - Default   : project resmi SMK YPK Medan
// =============================================================

export const DEFAULT_SUPABASE_URL = 'https://wpyfwkcevgdhkazeesdq.supabase.co';

const isValidUrl = (value) =>
  typeof value === 'string' && value.trim().startsWith('http');

const isValidKey = (value) =>
  typeof value === 'string' && value.trim().length > 20;

/**
 * Ambil konfigurasi Supabase aktif.
 * Aman dipanggil di server (tanpa window) maupun di browser.
 */
export function getSupabaseConfig() {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  let key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (typeof window !== 'undefined') {
    try {
      const storedUrl = localStorage.getItem('smk_ypk_supabase_url');
      const storedKey = localStorage.getItem('smk_ypk_supabase_anon_key');
      if (isValidUrl(storedUrl)) url = storedUrl.trim();
      if (isValidKey(storedKey)) key = storedKey.trim();
    } catch (e) {
      /* localStorage tidak tersedia (SSR / privacy mode) */
    }
  }

  return { url: url || DEFAULT_SUPABASE_URL, key: key || 'placeholder' };
}

export default getSupabaseConfig;