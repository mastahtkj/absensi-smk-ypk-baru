'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Swal from 'sweetalert2';
import { APP_VERSION, BUILD_SERVER, BUILD_ID, getPatchInfo } from '../lib/appVersion';

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

function isCurrentUserAdminMaster() {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem('smk_ypk_current_user') || localStorage.getItem('user_guru') || localStorage.getItem('smk_ypk_session');
    if (!raw) return false;
    const u = JSON.parse(raw);
    return Boolean(
      u.isMaster === true ||
      u.role === 'master' ||
      (u.role === 'admin' && (u.rawId === 4 || u.id === 'GURU-4')) ||
      String(u.nama || '').toLowerCase().includes('iqbal')
    );
  } catch (e) {
    return false;
  }
}

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
        const isMaster = isCurrentUserAdminMaster();
        const currentPatch = getPatchInfo(APP_VERSION);
        const postUpdateBody = isMaster
          ? `<div>${currentPatch.summary || 'Aplikasi siap digunakan dengan patch pembaruan terbaru.'}</div>`
          : `<div style="font-size:12px;color:#334155;line-height:1.6;">
               <div>Versi Patch: <b>v${APP_VERSION}</b></div>
               <div>Versi Server: <b>v${APP_VERSION}</b></div>
               <div>Build Server: <b style="color:#10b981;">${BUILD_SERVER}</b></div>
             </div>`;
        Swal.fire({
          icon: 'success',
          title: `SMK YPK v${APP_VERSION} Aktif ✨`,
          html: `<div style="font-size:12px;text-align:left;">
            ${postUpdateBody}
            <div style="margin-top:8px;padding:5px 8px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;font-size:10.5px;color:#166534;font-weight:bold;display:flex;align-items:center;gap:6px;">
              <span>🛡️</span><span>BLOCKCHAIN SECURITY</span>
            </div>
          </div>`,
          timer: 4500,
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
      let view = url.searchParams.get('view');
      if (!view && typeof window !== 'undefined') {
        view = localStorage.getItem('smk_ypk_last_active_view');
      }
      if (view) {
        sessionStorage.setItem(VIEW_STORAGE_KEY, view);
        localStorage.setItem('smk_ypk_last_active_view', view);
      }
    } catch (e) {}
  }, []);

  const forceReload = useCallback(async () => {
    if (reloadingRef.current) return;
    reloadingRef.current = true;
    persistCurrentView();

    try {
      // 1. Bersihkan semua cache storage lokal KECUALI model AI biometrik agar siap pakai tanpa download ulang
      if (typeof window !== 'undefined' && 'caches' in window) {
        const keys = await caches.keys();
        await Promise.all(
          keys.filter((k) => k !== 'smk-ypk-ai-models-v1').map((k) => caches.delete(k))
        );
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

      // Ambil informasi patch dinamis (dari payload server atau lookup versi otomatis)
      const patchInfo = (data?.patchNotes && data?.patchNotes.length > 0)
        ? { title: data.patchTitle || `Patch v${serverVersion}`, items: data.patchNotes, summary: data.patchSummary }
        : getPatchInfo(serverVersion);

      const patchItemsHtml = patchInfo.items && patchInfo.items.length > 0
        ? patchInfo.items.map((it) => `<div style="display:flex;align-items:flex-start;gap:6px;margin-top:3px;"><span style="color:#2563eb;font-weight:bold;">•</span><span>${it}</span></div>`).join('')
        : `• ${patchInfo.summary || 'Pembaruan sistem dan perbaikan fitur aplikasi.'}`;

      const isMaster = isCurrentUserAdminMaster();

      // Rincian pembaruan: Khusus Admin Master melihat changelog lengkap.
      // Siswa dan Guru cukup mengetahui versi patch, versi server, dan build server.
      const updateDetailsHtml = isMaster
        ? `
          Pembaruan versi <b>v${serverVersion}</b> siap dimuat.<br/>
          <div style="margin-top:6px;padding:6px 10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;font-size:11.5px;color:#334155;">
            <b>${patchInfo.title}</b><br/>
            ${patchInfo.summary || 'Pembaruan sistem dan perbaikan fitur.'}
          </div>
          <div style="margin-top:6px;font-size:11.5px;">
            ${patchItemsHtml}
          </div>
        `
        : `
          <div style="margin-top:6px;padding:10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;color:#334155;line-height:1.7;">
            <div style="display:flex;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding-bottom:5px;">
              <span style="color:#64748b;">Versi Patch:</span>
              <b style="color:#1e40af;">v${serverVersion}</b>
            </div>
            <div style="display:flex;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding:5px 0;">
              <span style="color:#64748b;">Versi Server:</span>
              <b style="color:#1e40af;">v${serverVersion}</b>
            </div>
            <div style="display:flex;justify-content:space-between;padding-top:5px;">
              <span style="color:#64748b;">Build Server:</span>
              <b style="color:#10b981;">${BUILD_SERVER}</b>
            </div>
          </div>
          <div style="margin-top:8px;font-size:11.5px;color:#475569;">
            Pembaruan sistem resmi telah tersedia dan siap dimuat ulang.
          </div>
        `;

      Swal.fire({
        icon: 'info',
        title: `Pembaruan v${serverVersion} Tersedia ✨`,
        html: `<div style="text-align:left;line-height:1.5;font-size:12.5px;">
          ${updateDetailsHtml}
          <div style="margin-top:8px;padding:6px 10px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;font-size:11px;color:#166534;font-weight:bold;display:flex;align-items:center;gap:6px;">
            <span>🛡️</span><span>BLOCKCHAIN SECURITY</span>
          </div>
        </div>`,
        showCancelButton: true,
        showDenyButton: isApkAvailable,
        confirmButtonText: '🚀 Muat Ulang (1 dtk)',
        denyButtonText: '📥 Unduh APK',
        cancelButtonText: 'Nanti',
        confirmButtonColor: '#10b981',
        denyButtonColor: '#3b82f6',
        cancelButtonColor: '#64748b',
        allowOutsideClick: true,
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
        const isMaster = isCurrentUserAdminMaster();
        const currentPatch = getPatchInfo(APP_VERSION);
        const patchItemsHtml = currentPatch.items && currentPatch.items.length > 0
          ? currentPatch.items.map((it) => `<div style="display:flex;align-items:flex-start;gap:6px;margin-top:3px;"><span style="color:#15803d;font-weight:bold;">•</span><span>${it}</span></div>`).join('')
          : `• ${currentPatch.summary || 'Pembaruan sistem dan perbaikan fitur aplikasi.'}`;

        const masterChangelogHtml = isMaster
          ? `<div style="margin-top:10px;font-size:12px;color:#166534;background:#f0fdf4;padding:10px 12px;border-radius:8px;border:1px solid #bbf7d0;line-height:1.5;">
              <b style="display:block;margin-bottom:4px;">✅ ${currentPatch.title} Aktif &amp; Tersinkronisasi:</b>
              ${patchItemsHtml}
            </div>`
          : `<div style="margin-top:8px;font-size:11.5px;color:#15803d;background:#f0fdf4;padding:8px 10px;border-radius:6px;border:1px solid #bbf7d0;">
              ✅ Seluruh modul sistem telah tersinkronisasi dan berjalan stabil.
            </div>`;

        Swal.fire({
          icon: 'success',
          title: 'Aplikasi Sudah Versi Terbaru! ✅',
          html: `<div style="text-align:left;line-height:1.7">
            <b>VERSI PATCH : v${APP_VERSION} (PATCH TERBARU)</b><br/>
            <b>VERSI SERVER : v${data?.appVersion || APP_VERSION}</b><br/>
            <b>BUILD SERVER : ${data?.buildServer || BUILD_SERVER}</b>
            ${masterChangelogHtml}
            <div style="margin-top:8px;padding:6px 10px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;font-size:11px;color:#1e40af;font-weight:bold;display:flex;align-items:center;gap:6px;">
              <span>🛡️</span><span>BLOCKCHAIN SECURITY</span>
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

  // 🚀 FLOATING PILL PEMBERITAHUAN UPDATE (COMPACT BOTTOM-RIGHT TO PREVENT BLOCKING UI)
  if (updateReady && !bannerDismissed) {
    const targetVer = updateData?.appVersion || updateData?.apk?.versionName || 'Terbaru';
    return (
      <aside
        role="alert"
        aria-label="Pemberitahuan pembaruan aplikasi"
        style={{
          position: 'fixed',
          bottom: '18px',
          right: '18px',
          maxWidth: '340px',
          zIndex: 99999,
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(59, 130, 246, 0.5)',
          color: '#ffffff',
          padding: '8px 12px',
          borderRadius: '14px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          fontSize: '12px',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <span style={{ fontSize: '15px' }}>🚀</span>
          <span style={{ fontWeight: '700', whiteSpace: 'nowrap', fontSize: '12px' }}>
            Update v{targetVer}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <button
            type="button"
            onClick={forceReload}
            style={{
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(37,99,235,0.4)',
            }}
          >
            Perbarui
          </button>
          <button
            type="button"
            onClick={() => setBannerDismissed(true)}
            style={{
              backgroundColor: 'transparent',
              color: '#94a3b8',
              border: 'none',
              borderRadius: '4px',
              padding: '3px 6px',
              fontSize: '12px',
              cursor: 'pointer',
              lineHeight: 1,
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
