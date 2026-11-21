'use client';

import React, { useEffect } from 'react';

// 📱 HELPER GLOBAL: EKSEKUSI PEMINTAAN IZIN SISTEM OTOMATIS (NOTIFIKASI & GPS TERAKHIR TEREKAM, KAMERA TIDAK DIMINTA OTOMATIS)
// Berjalan langsung di latar belakang tanpa menanyakan atau mengganggu pengguna (Zero Prompting)
export async function requestAllSmartPermissions({ silent = true, onProgress } = {}) {
  const results = {
    notification: 'unknown',
    geolocation: 'unknown',
    camera: 'skipped',
  };

  // 1. 🔔 IZIN NOTIFIKASI OTOMATIS
  try {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (onProgress) onProgress('Mengaktifkan Notifikasi Lonceng...');
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
    console.warn('Notification permission error:', err);
    results.notification = 'denied';
  }

  // 2. 📍 IZIN GPS / GEOLOKASI (LOKASI TERAKHIR TEREKAM OTOMATIS)
  try {
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      if (onProgress) onProgress('Merekam Lokasi GPS Terakhir...');
      await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            results.geolocation = 'granted';
            try {
              const coordsPayload = {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                timestamp: Date.now(),
              };
              localStorage.setItem('smk_ypk_last_coords', JSON.stringify(coordsPayload));
              const rawUser = typeof window !== 'undefined' ? localStorage.getItem('smk_ypk_current_user') : null;
              if (rawUser) {
                const u = JSON.parse(rawUser);
                fetch('/api/user/coords', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    userId: u.id,
                    rawId: u.rawId,
                    role: u.role,
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                  }),
                }).catch(() => {});
              }
            } catch (e) {}
            resolve(pos);
          },
          (geoErr) => {
            console.warn('Geolocation notice / timeout:', geoErr);
            results.geolocation = geoErr.code === 1 ? 'denied' : 'granted';
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

  // 3. 📷 KAMERA TIDAK DIMINTA OTOMATIS (Sesuai instruksi: "kamera tidak usah")
  results.camera = 'skipped';

  // Simpan status ke cache lokal
  try {
    localStorage.setItem('smk_ypk_smart_permissions_status', JSON.stringify(results));
    localStorage.setItem('smk_ypk_permissions_prompted', 'true');
  } catch (e) {}

  return results;
}

export default function SmartPermissionAutoPrompt({ currentUser }) {
  useEffect(() => {
    // 🚀 LANGSUNG OTOMATIS AKTIFKAN NOTIFIKASI & GPS TERAKHIR TANPA MENANYAKAN USER
    requestAllSmartPermissions({ silent: true });

    const handleAppInstalled = () => {
      requestAllSmartPermissions({ silent: true });
    };

    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Tidak menampilkan dialog/modal pop-up yang mengganggu user (silent background activation)
  return null;
}
