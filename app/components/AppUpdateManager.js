'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Swal from 'sweetalert2';
import { APP_VERSION, BUILD_SERVER, BUILD_ID } from '../lib/appVersion';

/**
 * 🔄 MANAGER PEMBARUAN APLIKASI (WEB + APK TANPA UNINSTALL)
 *
 * Masalah lama:
 *  - "Perubahan tidak efek, harus uninstall APK lama".
 *  - Dialog "Muat Ulang Sekarang" muncul TERUS-MENERUS & aplikasi
 *    restart ke HALAMAN UTAMA setiap kali ditekan.
 *
 * Penyebab & perbaikannya:
 *  1. BUILD ID dibuat dari `Date.now()` di next.config.js → nilainya
 *     BERBEDA antara build CLIENT & build SERVER (Next.js 14 evaluate
 *     config per worker) sehingga perbandingan selalu false & dialog
 *     tidak pernah hilang.  → Sekarang BUILD ID = content hash
 *     (konsisten client & server).
 *  2. `window.location.reload()` membuang state React → user selalu
 *     kembali ke halaman utama (portal).  → Sekarang posisi menu
 *     disimpan di sessionStorage & dipulihkan setelah reload.
 *  3. Service worker didaftarkan 2x (layout.js + component ini) dan
 *     `controllerchange` memicu reload otomatis → restart tak terduga.
 *     → Reload otomatis DIMATIKAN; reload hanya lewat dialog.
 */

const LOCAL_BUILD_ID = BUILD_ID;

const CHECK_INTERVAL_MS = 60 * 1000;
const STORAGE_KEY = 'smk_ypk_last_seen_build';
const VIEW_STORAGE_KEY = 'smk_ypk_restore_view';

export default function AppUpdateManager() {
  const [updateReady, setUpdateReady] = useState(false);
  const reloadingRef = useRef(false);
  const promptedRef = useRef(false);

  // 💾 Simpan posisi menu (view) supaya setelah reload user TIDAK
  //    terlempar balik ke halaman utama.
  const persistCurrentView = useCallback(() => {
    try {
      const url = new URL(window.location.href);
      const view = url.searchParams.get('view');
      if (view) sessionStorage.setItem(VIEW_STORAGE_KEY, view);
    } catch (e) {}
  }, []);

  const forceReload = useCallback(async () => {
    if (reloadingRef.current) return;
    reloadingRef.current = true;
    persistCurrentView();

    try {
      // 1. Bersihkan semua cache storage lokal agar bundle browser pasti segar
      if (typeof window !== 'undefined' && 'caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch (e) {}

    try {
      // 2. Segarkan service worker
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.update().catch(() => {})));
      }
    } catch (e) {}

    // 3. Muat ulang halaman dengan parameter anti-cache
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('_v', Date.now().toString(36));
      window.location.replace(url.toString());
    } catch (e) {
      window.location.reload();
    }
  }, [persistCurrentView]);

  const showUpdatePrompt = useCallback(
    (data) => {
      Swal.fire({
        icon: 'info',
        title: '✨ Versi Baru Tersedia!',
        html: `<div style="text-align:left;line-height:1.6">
          Aplikasi <b>SMK YPK SUPER APP</b> sudah diperbarui di server.<br/>
          <div style="margin-top:8px;padding:8px 10px;background:#f1f5f9;border-radius:8px;font-size:12px;line-height:1.7">
            <b>VERSI APLIKASI : ${APP_VERSION}</b><br/>
            <b>BUILD SERVER : ${BUILD_SERVER}</b>
          </div>
          <br/>
          Tekan <b>Muat Ulang</b> untuk memakai versi terbaru.<br/>
          <span style="font-size:11px;color:#94a3b8">Tidak perlu uninstall APK. Tampilan berubah dalam 1 detik.</span>
        </div>`,
        showCancelButton: true,
        confirmButtonText: '🚀 Muat Ulang Sekarang',
        cancelButtonText: 'Nanti Saja',
        allowOutsideClick: false,
      }).then((result) => {
        if (result.isConfirmed) {
          try {
            sessionStorage.setItem('smk_ypk_last_reloaded_build', data?.buildId || '');
            sessionStorage.setItem('smk_ypk_last_reload_time', String(Date.now()));
            localStorage.setItem(STORAGE_KEY, data?.buildId || '');
          } catch (e) {}
          forceReload();
        } else {
          try {
            sessionStorage.setItem('smk_ypk_dismissed_build', data?.buildId || '');
          } catch (e) {}
          promptedRef.current = false;
        }
      });
    },
    [forceReload]
  );

  const checkUpdate = useCallback(
    async (silent = true) => {
      try {
        const res = await fetch('/api/app-version', {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        });
        if (!res.ok) return null;
        const data = await res.json();

        if (!data?.buildId || data.buildId === 'dev') return data;
        if (data.buildId === LOCAL_BUILD_ID) {
          try { localStorage.setItem(STORAGE_KEY, data.buildId); } catch (e) {}
          return data;
        }

        // 🛡️ ANTI-LOOP PROTECTION:
        // Jika user baru saja menekan "Muat Ulang" untuk buildId ini dalam 2 menit terakhir,
        // JANGAN munculkan dialog lagi! Ini mencegah bug "tekan muat ulang muncul lagi terus-menerus".
        try {
          const lastReloadedBuild = sessionStorage.getItem('smk_ypk_last_reloaded_build');
          const lastReloadTime = Number(sessionStorage.getItem('smk_ypk_last_reload_time') || 0);
          if (lastReloadedBuild === data.buildId && Date.now() - lastReloadTime < 120000) {
            console.log('[AppUpdateManager] Anti-loop: build sudah dimuat ulang, mencegah dialog berulang.');
            return data;
          }

          // Cek jika user memilih "Nanti Saja" dalam sesi ini
          const dismissedBuild = sessionStorage.getItem('smk_ypk_dismissed_build');
          if (dismissedBuild === data.buildId && silent) {
            return data;
          }
        } catch (e) {}

        setUpdateReady(true);
        if (!promptedRef.current) {
          promptedRef.current = true;
          showUpdatePrompt(data);
        }
        return data;
      } catch (e) {
        return null;
      }
    },
    [showUpdatePrompt]
  );

  // 🔌 Daftarkan Service Worker (hanya di SATU tempat).
  //    Reload otomatis saat controller berganti DIMATIKAN supaya user
  //    tidak terlempar ke halaman utama secara diam-diam.
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return undefined;

    const registerSW = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js?v=41', { updateViaCache: 'none' });
        try { reg.update(); } catch (e) {}
      } catch (e) {}
    };

    registerSW();

    const onControllerChange = () => {
      // Sengaja DIAM: reload cukup dilakukan lewat dialog "Muat Ulang".
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  // 🔄 Cek versi berkala + saat tab kembali aktif
  useEffect(() => {
    let timer = null;

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        checkUpdate(true);
      }
    };

    const initial = setTimeout(() => checkUpdate(true), 4000);
    timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        checkUpdate(true);
      }
    }, CHECK_INTERVAL_MS);

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);

    return () => {
      clearTimeout(initial);
      if (timer) clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [checkUpdate]);

  // 🌐 Expose tombol "Cek Update" manual di seluruh aplikasi
  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.__smkCekUpdate = async () => {
      const data = await checkUpdate(false);
      if (!data) {
        Swal.fire({
          icon: 'error',
          title: 'Gagal Memeriksa Versi',
          text: 'Tidak bisa menghubungi server. Periksa koneksi internet Anda.',
        });
        return null;
      }
      if (!updateReady && data.buildId === LOCAL_BUILD_ID) {
        Swal.fire({
          icon: 'success',
          title: 'Aplikasi Sudah Terbaru ✅',
          html: `<div style="text-align:left;line-height:1.7">
            <b>VERSI APLIKASI : ${APP_VERSION}</b><br/>
            <b>BUILD SERVER : ${BUILD_SERVER}</b>
          </div>`,
        });
      }
      return data;
    };

    window.__smkAppVersion = APP_VERSION;
    window.__smkBuildServer = BUILD_SERVER;
    window.__smkBuildId = LOCAL_BUILD_ID;
    window.__smkBuildTime = process.env.NEXT_PUBLIC_BUILD_TIME || '';
  }, [checkUpdate, updateReady]);

  return null;
}