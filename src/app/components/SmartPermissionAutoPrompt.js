'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';

// 📱 HELPER GLOBAL: EKSEKUSI PEMINTAAN SELURUH IZIN SISTEM (NOTIFIKASI, GPS, KAMERA)
// Dirancang khusus untuk Google Chrome (Android & PC) dan PWA SMK YPK
export async function requestAllSmartPermissions({ silent = false, onProgress } = {}) {
  const results = {
    notification: 'unknown',
    geolocation: 'unknown',
    camera: 'unknown',
  };

  // 1. 🔔 IZIN NOTIFIKASI
  try {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (onProgress) onProgress('Meminta Izin Notifikasi Lonceng...');
      const notifPerm = await Notification.requestPermission();
      results.notification = notifPerm;
      if (notifPerm === 'granted' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([150, 80, 150]);
        } catch (e) {}
      }
    } else {
      results.notification = 'unsupported';
    }
  } catch (err) {
    console.warn('Notification permission request error:', err);
    results.notification = 'denied';
  }

  // 2. 📍 IZIN GPS / GEOLOKASI (UNTUK GEOFENCE PRESENSI HP)
  try {
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      if (onProgress) onProgress('Meminta Izin Lokasi GPS Presensi...');
      await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            results.geolocation = 'granted';
            try {
              localStorage.setItem('smk_ypk_last_coords', JSON.stringify({
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                timestamp: Date.now(),
              }));
            } catch (e) {}
            resolve(pos);
          },
          (geoErr) => {
            console.warn('Geolocation permission error / timeout:', geoErr);
            results.geolocation = geoErr.code === 1 ? 'denied' : 'granted'; // 1 = PERMISSION_DENIED
            resolve(null);
          },
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
        );
      });
    } else {
      results.geolocation = 'unsupported';
    }
  } catch (err) {
    console.warn('Geolocation request error:', err);
    results.geolocation = 'denied';
  }

  // 3. 📷 IZIN KAMERA (UNTUK FOTO KARTU ID, SCANNER, DAN VERIFIKASI PRESENSI)
  try {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      if (onProgress) onProgress('Meminta Izin Kamera ID Card...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });

      results.camera = 'granted';
      // 🔒 LANGSUNG MATIKAN STREAM AGAR LAMPU KAMERA TIDAK MENYALA
      if (stream) {
        stream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch (e) {}
        });
      }
    } else {
      results.camera = 'unsupported';
    }
  } catch (err) {
    console.warn('Camera request notice/denied:', err);
    results.camera = err.name === 'NotAllowedError' ? 'denied' : 'granted';
  }

  // Simpan hasil ke cache lokal
  try {
    localStorage.setItem('smk_ypk_smart_permissions_status', JSON.stringify(results));
    localStorage.setItem('smk_ypk_permissions_prompted', 'true');
  } catch (e) {}

  if (!silent) {
    const isAllGranted =
      (results.notification === 'granted' || results.notification === 'unsupported') &&
      (results.geolocation === 'granted' || results.geolocation === 'unsupported') &&
      (results.camera === 'granted' || results.camera === 'unsupported');

    if (isAllGranted) {
      Swal.fire({
        icon: 'success',
        title: 'Izin Fitur Berhasil Aktif! 🚀',
        html: `
          <div style="font-size: 13px; text-align: left; line-height: 1.6; color: #334155;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
              <span>🔔</span> <b>Notifikasi Lonceng:</b> <span style="color: #16a34a; font-weight: bold;">Aktif</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
              <span>📍</span> <b>Lokasi GPS Presensi:</b> <span style="color: #16a34a; font-weight: bold;">Aktif</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span>📷</span> <b>Kamera ID Card:</b> <span style="color: #16a34a; font-weight: bold;">Aktif</span>
            </div>
          </div>
        `,
        confirmButtonColor: '#2563eb',
        confirmButtonText: 'Selesai & Lanjutkan',
        timer: 3000,
      });
    }
  }

  return results;
}

export default function SmartPermissionAutoPrompt({ currentUser }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [permStates, setPermStates] = useState({
    notification: 'default',
    geolocation: 'prompt',
    camera: 'prompt',
  });

  const checkStatus = useCallback(async () => {
    if (typeof window === 'undefined') return;

    let notif = 'default';
    let geo = 'prompt';
    let cam = 'prompt';

    // 1. Notifikasi
    if ('Notification' in window) {
      notif = Notification.permission;
    }

    // 2. Geolocation Permissions API
    if ('permissions' in navigator && navigator.permissions.query) {
      try {
        const geoQuery = await navigator.permissions.query({ name: 'geolocation' });
        geo = geoQuery.state;
      } catch (e) {}

      try {
        const camQuery = await navigator.permissions.query({ name: 'camera' });
        cam = camQuery.state;
      } catch (e) {}
    }

    setPermStates({ notification: notif, geolocation: geo, camera: cam });

    // Cek apakah ada izin yang belum diberikan
    const needsSetup = notif !== 'granted' || geo !== 'granted' || cam !== 'granted';
    const isDismissed = sessionStorage.getItem('smk_ypk_permission_banner_dismissed') === 'true';

    if (needsSetup && !isDismissed) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();

    // 📱 EVENT 1: KETIKA APLIKASI DIINSTAL DARI CHROME ANDROID ATAU PC (appinstalled)
    const handleAppInstalled = () => {
      console.log('App successfully installed from Chrome!');
      setIsVisible(true);
      // Otomatis picu perizinan
      requestAllSmartPermissions({
        silent: false,
        onProgress: (msg) => setProgressText(msg),
      }).then(() => {
        checkStatus();
      });
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // 📱 EVENT 2: KETIKA PWA DIBUKA DALAM MODE STANDALONE (DARI HOME SCREEN)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (isStandalone) {
      const alreadyAutoPrompted = sessionStorage.getItem('pwa_auto_prompted');
      if (!alreadyAutoPrompted) {
        sessionStorage.setItem('pwa_auto_prompted', 'true');
        setTimeout(() => {
          checkStatus();
        }, 1200);
      }
    }

    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [checkStatus]);

  // Eksekusi Pemicu Izin saat Siswa Menekan Tombol
  const handleActivateAll = async () => {
    setIsProcessing(true);
    setProgressText('Menghubungkan ke peramban...');
    try {
      await requestAllSmartPermissions({
        silent: false,
        onProgress: (msg) => setProgressText(msg),
      });
      await checkStatus();
    } finally {
      setIsProcessing(false);
      setProgressText('');
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    try {
      sessionStorage.setItem('smk_ypk_permission_banner_dismissed', 'true');
    } catch (e) {}
  };

  if (!isVisible) return null;

  return (
    <aside
      role="region"
      aria-label="Panduan Izin Fitur SMK YPK"
      style={{
        position: 'fixed',
        bottom: '68px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 24px)',
        maxWidth: '520px',
        backgroundColor: '#0f172a',
        color: '#ffffff',
        padding: '14px 16px',
        borderRadius: '16px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(59, 130, 246, 0.4)',
        zIndex: 9999,
        animation: 'slideUpNotif 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #2563eb, #38bdf8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)',
            }}
          >
            ⚡
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: '#ffffff', letterSpacing: '0.2px' }}>
              Aktifkan Izin Fitur SMK YPK
            </h4>
            <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#94a3b8', lineHeight: 1.35 }}>
              Izinkan <b>Notifikasi Lonceng</b>, <b>GPS Presensi</b>, &amp; <b>Kamera</b> agar otomatis aktif di Chrome HP &amp; PC.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          style={{
            background: 'none',
            border: 'none',
            color: '#64748b',
            fontSize: '18px',
            cursor: 'pointer',
            padding: '2px 6px',
            borderRadius: '6px',
            lineHeight: 1,
          }}
          title="Tutup banner"
        >
          ✕
        </button>
      </div>

      {/* INDIKATOR STATUS 3 FITUR */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '6px',
          margin: '10px 0 12px',
          backgroundColor: 'rgba(255, 255, 255, 0.06)',
          padding: '8px',
          borderRadius: '10px',
        }}
      >
        <div style={{ textAlign: 'center', fontSize: '10px' }}>
          <div style={{ fontSize: '14px' }}>🔔</div>
          <div style={{ fontWeight: '700', marginTop: '2px' }}>Notifikasi</div>
          <div style={{ color: permStates.notification === 'granted' ? '#4ade80' : '#facc15', fontSize: '9px', fontWeight: 'bold' }}>
            {permStates.notification === 'granted' ? '✓ Aktif' : 'Perlu Izin'}
          </div>
        </div>

        <div style={{ textAlign: 'center', fontSize: '10px' }}>
          <div style={{ fontSize: '14px' }}>📍</div>
          <div style={{ fontWeight: '700', marginTop: '2px' }}>GPS Lokasi</div>
          <div style={{ color: permStates.geolocation === 'granted' ? '#4ade80' : '#facc15', fontSize: '9px', fontWeight: 'bold' }}>
            {permStates.geolocation === 'granted' ? '✓ Aktif' : 'Perlu Izin'}
          </div>
        </div>

        <div style={{ textAlign: 'center', fontSize: '10px' }}>
          <div style={{ fontSize: '14px' }}>📷</div>
          <div style={{ fontWeight: '700', marginTop: '2px' }}>Kamera</div>
          <div style={{ color: permStates.camera === 'granted' ? '#4ade80' : '#facc15', fontSize: '9px', fontWeight: 'bold' }}>
            {permStates.camera === 'granted' ? '✓ Aktif' : 'Perlu Izin'}
          </div>
        </div>
      </div>

      {/* TOMBOL AKSI 1-KLIK */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          type="button"
          onClick={handleActivateAll}
          disabled={isProcessing}
          style={{
            flex: 1,
            backgroundColor: '#2563eb',
            color: '#ffffff',
            border: 'none',
            borderRadius: '10px',
            padding: '9px 14px',
            fontSize: '12px',
            fontWeight: '800',
            cursor: isProcessing ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px rgba(37, 99, 235, 0.45)',
            transition: 'all 0.15s ease',
          }}
        >
          {isProcessing ? (
            <>
              <span style={{ display: 'inline-block', animation: 'spin 1s infinite linear' }}>⏳</span>
              <span>{progressText || 'Memproses Izin...'}</span>
            </>
          ) : (
            <>
              <span>⚡</span>
              <span>Izinkan Semua Sekarang (1-Klik)</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleDismiss}
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            color: '#cbd5e1',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '10px',
            padding: '9px 12px',
            fontSize: '11px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          Nanti Saja
        </button>
      </div>

      <style>{`
        @keyframes slideUpNotif {
          from { opacity: 0; transform: translate(-50%, 20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </aside>
  );
}
