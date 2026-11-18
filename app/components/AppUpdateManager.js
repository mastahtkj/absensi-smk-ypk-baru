'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Swal from 'sweetalert2';
import { APP_VERSION, BUILD_SERVER, BUILD_ID } from '../lib/appVersion';

/**
 * 🔄 MANAGER PEMBARUAN APLIKASI (WEB + APK TANPA UNINSTALL)
 *
 * Fitur Utama:
 *  1. Banner Notifikasi Update Melayang: Muncul di atas layar saat versi baru terdeteksi.
 *  2. Dialog SweetAlert2 Interaktif dengan changelog lengkap.
 *  3. Tombol Cek Update Manual (window.__smkCekUpdate).
 *  4. Event 'smk_update_available' untuk memicu badge berkedip di header.
 *  5. Toast konfirmasi sukses setelah reload ke versi terbaru.
 */

const LOCAL_BUILD_ID = BUILD_ID;
const CHECK_INTERVAL_MS = 45 * 1000;
const STORAGE_KEY = 'smk_ypk_last_seen_build';
const VIEW_STORAGE_KEY = 'smk_ypk_restore_view';

export default function AppUpdateManager() {
  const [updateReady, setUpdateReady] = useState(false);
  const [updateData, setUpdateData] = useState(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const reloadingRef = useRef(false);
  const promptedRef = useRef(false);

  // 🏷️ Tampilkan pemberitahuan otomatis saat aplikasi baru selesai diperbarui / dibuka di versi baru
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const lastSeenVer = localStorage.getItem('smk_ypk_current_version');
      if (lastSeenVer && lastSeenVer !== APP_VERSION) {
        Swal.fire({
          icon: 'success',
          title: '🎉 Pembaruan Berhasil!',
          html: `<div style="text-align:left;line-height:1.7;font-size:13px;">
            Aplikasi telah berhasil diperbarui ke rilis terbaru.<br/>
            <div style="margin-top:8px;padding:8px 10px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;font-size:12px;color:#166534">
              <b>VERSI APLIKASI : v${APP_VERSION}</b><br/>
              <b>BUILD SERVER : ${BUILD_SERVER}</b>
            </div>
            <div style="margin-top:8px;font-size:11.5px;color:#334155;">
              ✓ <b>Menu Layanan Sekolah Desktop Aktif:</b> Navigasi desktop 100% responsif &amp; lancar dibuka.<br/>
              ✓ <b>Kamera AI Anti-Lag &amp; Patah-patah:</b> Isolasi memori GPU WebGL &amp; multi-frame averaging 60 FPS.<br/>
              ✓ <b>Presensi Digital Cepat &amp; Akurat:</b> Sistem rekapitulasi kehadiran instan tanpa lag.<br/>
              ✓ <b>Pemberitahuan Otomatis:</b> Deteksi update instan tanpa perlu install ulang APK.
            </div>
          </div>`,
          timer: 6000,
          showConfirmButton: false,
          toast: true,
          position: 'top-end',
        });
      }
      localStorage.setItem('smk_ypk_current_version', APP_VERSION);
    } catch (e) {}
  }, []);

  // 💾 Simpan posisi menu (view) supaya setelah reload user TIDAK terlempar ke portal
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
      const serverVersion = data?.appVersion || data?.apk?.versionName || APP_VERSION;
      const isApkAvailable = Boolean(data?.apk?.url);

      Swal.fire({
        icon: 'info',
        title: '✨ Versi Baru Tersedia!',
        html: `<div style="text-align:left;line-height:1.6">
          Aplikasi <b>SMK YPK SUPER APP</b> versi baru telah tersedia di server.<br/>
          <div style="margin-top:8px;padding:8px 10px;background:#f1f5f9;border-radius:8px;font-size:12px;line-height:1.7;color:#1e293b">
            <b>VERSI SERVER TERBARU : v${serverVersion}</b><br/>
            <b>VERSI PERANGKAT ANDA : v${APP_VERSION}</b><br/>
            <b>BUILD SERVER : ${data?.buildServer || BUILD_SERVER}</b>
          </div>
          <div style="margin-top:8px;font-size:11.5px;color:#475569;">
            <b>🚀 Patch v2.0.49:</b> Penghapusan Total &amp; Menyeluruh Scanner Wajah, Pendaftaran Wajah, Modul Face Recognition, serta Penyesuaian Database.
          </div>
          <br/>
          Pilih <b>Muat Ulang</b> untuk memperbarui tampilan seketika (1 detik).<br/>
          ${isApkAvailable ? '<span style="font-size:11px;color:#64748b">Atau tekan <b>Unduh APK Baru</b> jika Anda ingin menginstal berkas .apk versi ' + (data?.apk?.versionName || serverVersion) + ' di HP.</span>' : ''}
        </div>`,
        showCancelButton: true,
        showDenyButton: isApkAvailable,
        confirmButtonText: '🚀 Muat Ulang Sekarang',
        denyButtonText: '📥 Unduh APK Baru',
        cancelButtonText: 'Nanti Saja',
        confirmButtonColor: '#10b981',
        denyButtonColor: '#3b82f6',
        cancelButtonColor: '#64748b',
        allowOutsideClick: false,
      }).then((result) => {
        if (result.isConfirmed) {
          try {
            sessionStorage.setItem('smk_ypk_last_reloaded_build', data?.buildId || '');
            sessionStorage.setItem('smk_ypk_last_reload_time', String(Date.now()));
            localStorage.setItem(STORAGE_KEY, data?.buildId || '');
          } catch (e) {}
          forceReload();
        } else if (result.isDenied) {
          try {
            const link = document.createElement('a');
            link.href = data?.apk?.url || '/apk/SMK_YPK_SUPER_APP.apk';
            link.download = 'SMK_YPK_SUPER_APP.apk';
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          } catch (e) {
            window.open(data?.apk?.url || '/apk/SMK_YPK_SUPER_APP.apk', '_blank');
          }
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
        const res = await fetch(`/api/app-version?_t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
        });
        if (!res.ok) return null;
        const data = await res.json();

        const isNewVersion = Boolean(
          (data?.appVersion && data.appVersion !== APP_VERSION) ||
          (data?.apk?.versionName && data.apk.versionName !== APP_VERSION)
        );
        const isNewBuild = Boolean(
          data?.buildId &&
          data.buildId !== 'dev' &&
          LOCAL_BUILD_ID !== 'dev' &&
          data.buildId !== LOCAL_BUILD_ID
        );

        if (!isNewBuild && !isNewVersion) {
          try { if (data?.buildId) localStorage.setItem(STORAGE_KEY, data.buildId); } catch (e) {}
          return data;
        }

        // Terdapat versi baru!
        setUpdateReady(true);
        setUpdateData(data);
        if (typeof window !== 'undefined') {
          window.__smkHasUpdate = true;
          window.__smkUpdateData = data;
          window.dispatchEvent(new CustomEvent('smk_update_available', { detail: data }));
        }

        // Anti-loop protection:
        try {
          const lastReloadedBuild = sessionStorage.getItem('smk_ypk_last_reloaded_build');
          const lastReloadTime = Number(sessionStorage.getItem('smk_ypk_last_reload_time') || 0);
          if (lastReloadedBuild === data.buildId && Date.now() - lastReloadTime < 120000) {
            return data;
          }

          const dismissedBuild = sessionStorage.getItem('smk_ypk_dismissed_build');
          if (dismissedBuild === data.buildId && silent) {
            return data;
          }
        } catch (e) {}

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

  // 🔌 Daftarkan Service Worker
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return undefined;

    const registerSW = async () => {
      try {
        const reg = await navigator.serviceWorker.register(`/sw.js?v=${APP_VERSION}`, { updateViaCache: 'none' });
        try { reg.update(); } catch (e) {}

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateReady(true);
                if (typeof window !== 'undefined') {
                  window.__smkHasUpdate = true;
                  window.dispatchEvent(new CustomEvent('smk_update_available', { detail: { appVersion: APP_VERSION } }));
                }
              }
            });
          }
        });
      } catch (e) {}
    };

    registerSW();

    const onControllerChange = () => {};
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

    // Jalankan segera saat pertama kali buka
    const initial = setTimeout(() => checkUpdate(true), 1500);
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
      Swal.fire({
        title: 'Memeriksa Pembaruan...',
        text: 'Menghubungkan ke server SMK YPK...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      const data = await checkUpdate(false);
      if (!data) {
        Swal.fire({
          icon: 'error',
          title: 'Gagal Memeriksa Versi',
          text: 'Tidak bisa menghubungi server. Periksa koneksi internet Anda.',
        });
        return null;
      }

      const isNew = Boolean(
        (data?.appVersion && data.appVersion !== APP_VERSION) ||
        (data?.apk?.versionName && data.apk.versionName !== APP_VERSION) ||
        (data?.buildId && data.buildId !== 'dev' && LOCAL_BUILD_ID !== 'dev' && data.buildId !== LOCAL_BUILD_ID)
      );

      if (isNew) {
        showUpdatePrompt(data);
      } else {
        Swal.fire({
          icon: 'success',
          title: 'Aplikasi Sudah Versi Terbaru! ✅',
          html: `<div style="text-align:left;line-height:1.7">
            <b>VERSI PERANGKAT : v${APP_VERSION} (PATCH TERBARU)</b><br/>
            <b>VERSI SERVER : v${data?.appVersion || APP_VERSION}</b><br/>
            <b>BUILD SERVER : ${data?.buildServer || BUILD_SERVER}</b>
            <div style="margin-top:10px;font-size:12px;color:#166534;background:#f0fdf4;padding:10px 12px;border-radius:8px;border:1px solid #bbf7d0;line-height:1.5;">
              <b>✅ Patch v2.0.47 Aktif &amp; Tersinkronisasi:</b><br/>
              &bull; Menu Scanner Layar Penuh (SPA) &amp; Perekaman Wajah AI Resmi Dihapus Total.<br/>
              &bull; Tampilan Beranda &amp; ID Card Bersih, Ringan, dan Rapi Bebas Tombol Tak Perlu.<br/>
              &bull; Tabel Presensi Difokuskan pada Kehadiran Bersih (Nama, Kelas, Jam Masuk, Jam Pulang, Status, Aksi).<br/>
              &bull; Navigasi Desktop &amp; Mobile Super Cepat Tanpa Lag.
            </div>
          </div>`,
          showCancelButton: true,
          confirmButtonText: 'Tutup',
          cancelButtonText: '📥 Unduh File APK',
          confirmButtonColor: '#10b981',
          cancelButtonColor: '#3b82f6',
        }).then((res) => {
          if (res.dismiss === Swal.DismissReason.cancel) {
            window.open(data?.apk?.url || '/apk/SMK_YPK_SUPER_APP.apk', '_blank');
          }
        });
      }
      return data;
    };

    window.__smkAppVersion = APP_VERSION;
    window.__smkBuildServer = BUILD_SERVER;
    window.__smkBuildId = LOCAL_BUILD_ID;
    window.__smkBuildTime = process.env.NEXT_PUBLIC_BUILD_TIME || '';
  }, [checkUpdate, showUpdatePrompt]);

  // 🚀 BANNER MELAYANG PEMBERITAHUAN UPDATE (PROMINENT TOP BANNER)
  if (updateReady && !bannerDismissed) {
    const targetVer = updateData?.appVersion || updateData?.apk?.versionName || 'Terbaru';
    return (
      <aside
        role="alert"
        aria-label="Pemberitahuan pembaruan aplikasi"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 999999,
          background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 55%, #059669 100%)',
          color: '#ffffff',
          padding: '8px 14px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          fontSize: '12px',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', minWidth: 0 }}>
          <span style={{ fontSize: '16px' }}>🚀</span>
          <span style={{ fontWeight: '800', letterSpacing: '0.2px' }}>
            Pembaruan Tersedia: <b>v{targetVer}</b>
          </span>
          <span style={{ fontSize: '11px', opacity: 0.9, backgroundColor: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '10px' }}>
            Perbaikan Menu Desktop Layanan Sekolah &amp; AI Camera
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <button
            type="button"
            onClick={forceReload}
            style={{
              backgroundColor: '#10b981',
              color: '#ffffff',
              border: 'none',
              borderRadius: '7px',
              padding: '5px 12px',
              fontSize: '11.5px',
              fontWeight: '800',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>🔄</span>
            <span>Muat Ulang</span>
          </button>
          <button
            type="button"
            onClick={() => setBannerDismissed(true)}
            style={{
              backgroundColor: 'rgba(255,255,255,0.15)',
              color: '#ffffff',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '6px',
              padding: '4px 8px',
              fontSize: '11px',
              cursor: 'pointer',
            }}
            title="Tutup pemberitahuan"
          >
            ✕
          </button>
        </div>
      </aside>
    );
  }

  return null;
}
