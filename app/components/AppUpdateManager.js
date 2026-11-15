'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Swal from 'sweetalert2';

/**
 * 🔄 MANAGER PEMBARUAN APLIKASI (WEB + APK TANPA UNINSTALL)
 *
 * Masalah lama: "Perubahan tidak efek, harus uninstall APK lama".
 * Penyebab:
 *  1. Service worker menahan versi lama tanpa ada pemeriksaan versi.
 *  2. Tidak ada BUILD ID yang bisa dibandingkan antar-deploy.
 *  3. APK di-cache browser sehingga unduhan ulang bisa jadi APK lama.
 *
 * Solusi di file ini:
 *  - Daftarkan SW dengan `updateViaCache: 'none'` + paksa `reg.update()`.
 *  - Bandingkan BUILD ID perangkat vs BUILD ID server (API /api/app-version).
 *  - Tampilkan prompt "Versi Baru Tersedia" -> reload otomatis.
 */

const LOCAL_BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID || 'dev';
const LOCAL_BUILD_TIME = process.env.NEXT_PUBLIC_BUILD_TIME || '';
const LOCAL_APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || '2.0.0';

const CHECK_INTERVAL_MS = 60 * 1000;
const STORAGE_KEY = 'smk_ypk_last_seen_build';

export default function AppUpdateManager() {
  const [updateReady, setUpdateReady] = useState(false);
  const reloadingRef = useRef(false);
  const promptedRef = useRef(false);

  const forceReload = useCallback(() => {
    if (reloadingRef.current) return;
    reloadingRef.current = true;
    try {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((regs) => {
          regs.forEach((r) => {
            try { r.update(); } catch (e) {}
          });
        });
      }
    } catch (e) {}
    window.location.reload();
  }, []);

  const showUpdatePrompt = useCallback(
    (data) => {
      Swal.fire({
        icon: 'info',
        title: '✨ Versi Baru Tersedia!',
        html: `<div style="text-align:left;line-height:1.6">
          Aplikasi <b>SMK YPK SUPER APP</b> sudah diperbarui di server.<br/>
          <span style="font-size:12px;color:#64748b">Versi aplikasi: <b>${LOCAL_APP_VERSION}</b> · Build server: <b>${String(data?.buildId || '').slice(-6)}</b></span><br/><br/>
          Tekan <b>Muat Ulang</b> untuk memakai versi terbaru.<br/>
          <span style="font-size:11px;color:#94a3b8">Tidak perlu uninstall APK. Tampilan berubah dalam 1 detik.</span>
        </div>`,
        showCancelButton: true,
        confirmButtonText: '🚀 Muat Ulang Sekarang',
        cancelButtonText: 'Nanti Saja',
        allowOutsideClick: false,
      }).then((result) => {
        if (result.isConfirmed) {
          try { localStorage.setItem(STORAGE_KEY, data?.buildId || ''); } catch (e) {}
          forceReload();
        } else {
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

  // 🔌 Daftarkan Service Worker + paksa update
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return undefined;

    const registerSW = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js?v=40', { updateViaCache: 'none' });
        try { reg.update(); } catch (e) {}
      } catch (e) {}
    };

    registerSW();

    let refreshing = false;
    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
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
          html: `Versi <b>${LOCAL_APP_VERSION}</b><br/><span style="font-size:11px;color:#64748b">Build: ${String(data.buildId).slice(-6)}</span>`,
        });
      }
      return data;
    };

    window.__smkAppVersion = LOCAL_APP_VERSION;
    window.__smkBuildId = LOCAL_BUILD_ID;
    window.__smkBuildTime = LOCAL_BUILD_TIME;
  }, [checkUpdate, updateReady]);

  return null;
}