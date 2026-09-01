'use client';

import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

export default function BackgroundSettingsModal({ isOpen, onClose }) {
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [wakeLockSupported, setWakeLockSupported] = useState(false);
  const [notifPermission, setNotifPermission] = useState('default');
  const [selectedBrand, setSelectedBrand] = useState('xiaomi');
  const [wakeLockSentinel, setWakeLockSentinel] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Cek dukungan WakeLock API
      setWakeLockSupported('wakeLock' in navigator);
      
      // Cek status izin notifikasi
      if ('Notification' in window) {
        setNotifPermission(Notification.permission);
      }
    }
  }, [isOpen]);

  // 💡 FUNGSI TOGGLE SCREEN WAKELOCK (LAYAR TETAP NYALA)
  const toggleWakeLock = async () => {
    if (!('wakeLock' in navigator)) {
      Swal.fire({
        icon: 'info',
        title: 'Fitur Belum Didukung',
        text: 'Browser di perangkat ini belum mendukung Screen WakeLock API. Harap gunakan Google Chrome terbaru.',
      });
      return;
    }

    try {
      if (wakeLockActive && wakeLockSentinel) {
        await wakeLockSentinel.release();
        setWakeLockSentinel(null);
        setWakeLockActive(false);
        Swal.fire({
          icon: 'info',
          title: 'Layar Normal',
          text: 'Waktu mati layar HP kini mengikuti setelan bawaan perangkat Anda.',
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        const sentinel = await navigator.wakeLock.request('screen');
        setWakeLockSentinel(sentinel);
        setWakeLockActive(true);

        sentinel.addEventListener('release', () => {
          setWakeLockActive(false);
          setWakeLockSentinel(null);
        });

        Swal.fire({
          icon: 'success',
          title: 'Layar Tetap Nyala Aktif! 💡',
          text: 'Layar HP Anda sekarang akan tetap menyala dan tidak akan tertidur selama aplikasi terbuka.',
          timer: 2000,
          showConfirmButton: false,
        });
      }
    } catch (err) {
      console.warn('Wake lock error:', err);
      Swal.fire({
        icon: 'error',
        title: 'Gagal Mengaktifkan',
        text: 'Tidak dapat mengunci layar agar tetap nyala: ' + err.message,
      });
    }
  };

  // 🔔 FUNGSI MEMINTA IZIN NOTIFIKASI SISTEM & GETAR HP
  const requestNotificationPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      Swal.fire({
        icon: 'info',
        title: 'Notifikasi Belum Didukung',
        text: 'Browser ini tidak mendukung notifikasi sistem.',
      });
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotifPermission(permission);
      if (permission === 'granted') {
        // Coba getar HP
        if ('vibrate' in navigator) {
          navigator.vibrate([200, 100, 200]);
        }
        Swal.fire({
          icon: 'success',
          title: 'Notifikasi Berhasil Diizinkan! 🔔',
          text: 'Notifikasi presensi kartu tap, jadwal roster, dan pengumuman mading akan muncul langsung di layar dan status bar HP.',
          timer: 2200,
          showConfirmButton: false,
        });
      } else {
        Swal.fire({
          icon: 'warning',
          title: 'Izin Belum Diberikan',
          text: 'Anda memilih untuk tidak mengizinkan notifikasi. Anda dapat mengaktifkannya melalui Setelan Situs Browser.',
        });
      }
    } catch (e) {
      console.warn('Error requesting notif permission:', e);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          maxWidth: '520px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* HEADER MODAL */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #2563eb 100%)',
            padding: '18px 20px',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
              }}
            >
              ⚡
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800' }}>
                Izin Latar Belakang & Layar HP
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: '#93c5fd' }}>
                Pastikan aplikasi tetap aktif & notifikasi presensi langsung masuk
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              color: '#ffffff',
              fontSize: '15px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* ISI KONTEN (SCROLLABLE) */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {/* KARTU 1: KUNCI LAYAR TETAP NYALA (SCREEN WAKE LOCK) */}
          <div
            style={{
              backgroundColor: wakeLockActive ? '#f0fdf4' : '#f8fafc',
              border: wakeLockActive ? '1.5px solid #86efac' : '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '14px 16px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                <span style={{ fontSize: '16px' }}>💡</span>
                <b style={{ fontSize: '13.5px', color: wakeLockActive ? '#15803d' : '#0f172a' }}>
                  Layar HP Tetap Menyala (WakeLock)
                </b>
              </div>
              <p style={{ margin: 0, fontSize: '11px', color: '#64748b', lineHeight: 1.4 }}>
                Mencegah layar HP mati/tertidur secara otomatis saat Anda membuka dan memantau aplikasi.
              </p>
            </div>

            <button
              type="button"
              onClick={toggleWakeLock}
              style={{
                backgroundColor: wakeLockActive ? '#16a34a' : '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '8px 14px',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                whiteSpace: 'nowrap',
                boxShadow: wakeLockActive ? '0 2px 8px rgba(22, 163, 74, 0.35)' : '0 2px 8px rgba(37, 99, 235, 0.35)',
              }}
            >
              <span>{wakeLockActive ? '🟢 Nyala' : '⚡ Aktifkan'}</span>
            </button>
          </div>

          {/* KARTU 2: NOTIFIKASI SISTEM & GETAR */}
          <div
            style={{
              backgroundColor: notifPermission === 'granted' ? '#f0fdf4' : '#fef2f2',
              border: notifPermission === 'granted' ? '1.5px solid #86efac' : '1px solid #fecaca',
              borderRadius: '14px',
              padding: '14px 16px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                <span style={{ fontSize: '16px' }}>🔔</span>
                <b style={{ fontSize: '13.5px', color: notifPermission === 'granted' ? '#15803d' : '#991b1b' }}>
                  Notifikasi Sistem & Getar HP
                </b>
              </div>
              <p style={{ margin: 0, fontSize: '11px', color: '#64748b', lineHeight: 1.4 }}>
                {notifPermission === 'granted'
                  ? '✅ Sudah Aktif: Notifikasi kartu tap RFID dan info sekolah akan muncul di bilah status HP.'
                  : '⚠️ Belum Aktif: Ketuk tombol di samping untuk mengizinkan notifikasi & getar di HP.'}
              </p>
            </div>

            <button
              type="button"
              onClick={requestNotificationPermission}
              disabled={notifPermission === 'granted'}
              style={{
                backgroundColor: notifPermission === 'granted' ? '#16a34a' : '#dc2626',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '8px 14px',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: notifPermission === 'granted' ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                whiteSpace: 'nowrap',
                boxShadow: notifPermission === 'granted' ? 'none' : '0 2px 8px rgba(220, 38, 38, 0.35)',
              }}
            >
              <span>{notifPermission === 'granted' ? '✓ Diizinkan' : '🔔 Izinkan'}</span>
            </button>
          </div>

          {/* PANDUAN IZIN LATAR BELAKANG PER MEREK HP */}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
              <span style={{ fontSize: '15px' }}>📱</span>
              <h4 style={{ margin: 0, fontSize: '13.5px', color: '#0f172a', fontWeight: '800' }}>
                Cara Agar Aplikasi Tetap Nyala di Latar Belakang (Per Merek HP):
              </h4>
            </div>

            {/* TAB SELECTOR MEREK HP */}
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '10px' }}>
              {[
                { id: 'xiaomi', label: 'Xiaomi / Redmi / Poco' },
                { id: 'samsung', label: 'Samsung' },
                { id: 'oppo_vivo', label: 'Oppo / Vivo / Realme' },
                { id: 'iphone', label: 'iPhone / iOS' },
                { id: 'gembok', label: '🔒 Kunci di Recent Apps' },
              ].map((brand) => (
                <button
                  key={brand.id}
                  type="button"
                  onClick={() => setSelectedBrand(brand.id)}
                  style={{
                    backgroundColor: selectedBrand === brand.id ? '#2563eb' : '#f1f5f9',
                    color: selectedBrand === brand.id ? '#ffffff' : '#475569',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '6px 11px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {brand.label}
                </button>
              ))}
            </div>

            {/* DETAIL PANDUAN BERDASARKAN MEREK */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                borderRadius: '12px',
                padding: '14px',
                border: '1px solid #e2e8f0',
                fontSize: '11.5px',
                color: '#334155',
                lineHeight: 1.6,
              }}
            >
              {selectedBrand === 'xiaomi' && (
                <div>
                  <b style={{ color: '#0f172a', display: 'block', marginBottom: '4px' }}>
                    📱 Pengaturan di HP Xiaomi, Redmi, dan Poco (MIUI / HyperOS):
                  </b>
                  <ol style={{ margin: '0 0 0 18px', padding: 0 }}>
                    <li>Buka <b>Setelan (Settings)</b> &gt; <b>Aplikasi</b> &gt; <b>Kelola Aplikasi</b>.</li>
                    <li>Cari browser <b>Chrome</b> atau aplikasi <b>SMK YPK</b>.</li>
                    <li>Aktifkan <b>Mulai Otomatis (Autostart)</b> &gt; Pilih Izinkan.</li>
                    <li>Ketuk <b>Penghemat Baterai</b> &gt; Pilih <b>Tidak ada pembatasan (No restrictions)</b>.</li>
                    <li>Aplikasi kini tidak akan pernah dimatikan oleh sistem saat diminimalkan.</li>
                  </ol>
                </div>
              )}

              {selectedBrand === 'samsung' && (
                <div>
                  <b style={{ color: '#0f172a', display: 'block', marginBottom: '4px' }}>
                    📱 Pengaturan di HP Samsung (One UI):
                  </b>
                  <ol style={{ margin: '0 0 0 18px', padding: 0 }}>
                    <li>Buka <b>Pengaturan</b> &gt; <b>Aplikasi</b> &gt; Pilih <b>Chrome / SMK YPK</b>.</li>
                    <li>Ketuk menu <b>Baterai</b>.</li>
                    <li>Ubah setelan dari 'Optimal' menjadi <b>Tidak Dibatasi (Unrestricted)</b>.</li>
                    <li>Masuk ke <b>Izin</b> &gt; Izinkan <b>Notifikasi</b> &amp; <b>Aktivitas Latar Belakang</b>.</li>
                  </ol>
                </div>
              )}

              {selectedBrand === 'oppo_vivo' && (
                <div>
                  <b style={{ color: '#0f172a', display: 'block', marginBottom: '4px' }}>
                    📱 Pengaturan di HP Oppo, Realme, dan Vivo (ColorOS / Funtouch):
                  </b>
                  <ol style={{ margin: '0 0 0 18px', padding: 0 }}>
                    <li>Buka <b>Pengaturan</b> &gt; <b>Manajemen Aplikasi</b> &gt; Pilih aplikasi.</li>
                    <li>Pilih <b>Penggunaan Baterai</b> &gt; Aktifkan <b>Izinkan Aktivitas Latar Belakang</b>.</li>
                    <li>Aktifkan opsi <b>Mulai Otomatis di Latar Belakang</b>.</li>
                  </ol>
                </div>
              )}

              {selectedBrand === 'iphone' && (
                <div>
                  <b style={{ color: '#0f172a', display: 'block', marginBottom: '4px' }}>
                    🍎 Pengaturan di iPhone / iPad (iOS Safari):
                  </b>
                  <ol style={{ margin: '0 0 0 18px', padding: 0 }}>
                    <li>Buka aplikasi SMK YPK di browser <b>Safari</b>.</li>
                    <li>Ketuk tombol <b>Bagikan (Share / Ikon Kotak Panah ke Atas)</b> di bagian bawah.</li>
                    <li>Pilih <b>Tambahkan ke Layar Utama (Add to Home Screen)</b>.</li>
                    <li>Buka aplikasi dari ikon di layar depan iPhone agar Web Push Notifikasi aktif penuh.</li>
                  </ol>
                </div>
              )}

              {selectedBrand === 'gembok' && (
                <div>
                  <b style={{ color: '#0f172a', display: 'block', marginBottom: '4px' }}>
                    🔒 Trik Kunci Aplikasi di Recent Apps (Semua Android):
                  </b>
                  <ol style={{ margin: '0 0 0 18px', padding: 0 }}>
                    <li>Buka jendela aplikasi yang sedang berjalan (<b>Recent Apps</b> / tombol garis 3 di bawah).</li>
                    <li>Tekan dan tahan jendela <b>SMK YPK Super App</b>.</li>
                    <li>Ketuk ikon <b>🔒 Gembok</b>.</li>
                    <li>Setelah digembok, sistem HP tidak akan membersihkan/menutup aplikasi saat Anda menekan tombol 'Bersihkan Ram'.</li>
                  </ol>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FOOTER MODAL */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '10px',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              backgroundColor: '#0f172a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '9px 18px',
              fontSize: '12.5px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(15, 23, 42, 0.2)',
            }}
          >
            Selesai &amp; Mengerti
          </button>
        </div>
      </div>
    </div>
  );
}
