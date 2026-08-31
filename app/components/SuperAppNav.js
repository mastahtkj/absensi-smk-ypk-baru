'use client';

import React, { useState, useEffect } from 'react';
import { playMenuClickSound } from './NotificationCenter';

export default function SuperAppNav({
  currentView,
  activeSubMenu,
  onNavigate,
  onSubMenuChange,
  currentUser,
  isMasterIqbal,
  isSiswaAdmin,
  siswaAdminKelas,
  isRestrictedGuru,
  invalList = [],
  unreadNotifCount = 0,
  onlineCount = 1,
  onOpenNotifications,
  onOpenNewsPublisher,
  onOpenOnlineUsers,
  onLogout,
}) {
  const handleNavClick = (viewId) => {
    playMenuClickSound();
    if (onNavigate) onNavigate(viewId);
  };
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZone: 'Asia/Jakarta',
        }) + ' WIB'
      );
      setDateStr(
        now.toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          timeZone: 'Asia/Jakarta',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // 📸 Foto Profil dari ID Card
  const getNavPhoto = () => {
    if (typeof window === 'undefined') return currentUser?.foto_url || currentUser?.foto || '';
    const isGuru = Boolean(currentUser?.isGuru && !String(currentUser?.id).startsWith('SISWA-'));
    const rolePrefix = isGuru ? 'GURU-' : 'SISWA-';
    const k1 = `user_photo_${rolePrefix}${currentUser?.rawId || currentUser?.id}`;
    const k2 = `user_photo_${currentUser?.id || currentUser?.username || 'me'}`;
    const k3 = currentUser?.nama ? `user_photo_${currentUser.nama}` : '';
    return (
      localStorage.getItem(k1) ||
      localStorage.getItem(k2) ||
      (k3 && localStorage.getItem(k3)) ||
      currentUser?.foto_url ||
      currentUser?.foto ||
      ''
    );
  };

  const [navPhoto, setNavPhoto] = useState(getNavPhoto);

  useEffect(() => {
    setNavPhoto(getNavPhoto());
    const handlePhotoChange = () => setNavPhoto(getNavPhoto());
    window.addEventListener('user_photo_updated', handlePhotoChange);
    window.addEventListener('storage', handlePhotoChange);
    return () => {
      window.removeEventListener('user_photo_updated', handlePhotoChange);
      window.removeEventListener('storage', handlePhotoChange);
    };
  }, [currentUser]);

  const isStudentRole = Boolean(
    !currentUser?.isGuru ||
    String(currentUser?.id).startsWith('SISWA-') ||
    isSiswaAdmin ||
    currentUser?.role?.toLowerCase() === 'siswa' ||
    currentUser?.role?.toLowerCase() === 'siswa_admin'
  );

  const isTeacherOrAdminRole = Boolean(
    isMasterIqbal ||
    (!isStudentRole && (currentUser?.isGuru || currentUser?.role?.toLowerCase() === 'admin' || currentUser?.role?.toLowerCase() === 'master' || currentUser?.role?.toLowerCase() === 'guru'))
  );

  const isAdminOrTeacher = isMasterIqbal || (!isRestrictedGuru && !isSiswaAdmin);

  // Definisi Menu Utama (Untuk Desktop Navigation Bar)
  const mainMenus = [
    { id: 'portal', label: 'Beranda', icon: '🏠', color: '#2563eb' },
    { id: 'presensi', label: 'Presensi', icon: '📋', color: '#16a34a' },
    { id: 'elearning', label: 'Perangkat Ajar', icon: '📘', color: '#2563eb' },
    { id: 'akun', label: 'ID Card', icon: '🪪', color: '#ea580c' },
    { id: 'ujian', label: 'Ujian CBT', icon: '📝', badge: isTeacherOrAdminRole ? 'Buat & Koreksi' : 'Ruang Ujian', color: '#0891b2' },
    { id: 'library', label: 'Perpustakaan', icon: '📖', color: '#d97706' },
    { id: 'mading', label: 'Mading & Info', icon: '📢', color: '#e11d48' },
    ...(isAdminOrTeacher ? [{ id: 'admin_tools', label: 'Admin Tools', icon: '⚙️', color: '#475569' }] : []),
  ];

  // Sub-Menu per Kategori Menu Utama (Presensi dikosongkan agar tidak ada top bar berlebih)
  const subMenuMap = {
    presensi: [],
    ujian: isTeacherOrAdminRole
      ? [
          { id: 'buat_ujian', label: 'Buat Soal (30 PG + 5 Essay)', icon: '🛠️' },
          { id: 'koreksi_essay', label: 'Koreksi Essay & Nilai', icon: '💯' },
        ]
      : [
          { id: 'ruang_ujian', label: 'Ruang Ujian Siswa/i', icon: '✍️' },
        ],
    elearning: [],
    library: [
      { id: 'katalog_buku', label: 'Katalog E-Book', icon: '📚' },
      { id: 'buku_kejuruan', label: 'Buku Kejuruan', icon: '💻' },
    ],
    mading: [
      { id: 'mading_sekolah', label: 'Pengumuman Sekolah', icon: '📰' },
      { id: 'kalender_agenda', label: 'Agenda Akademik', icon: '📅' },
    ],
    akun: [
      { id: 'id_card', label: 'Kartu ID Digital', icon: '🪪' },
      { id: 'keamanan', label: 'Ganti Kata Sandi', icon: '🔒' },
    ],
    admin_tools: [
      { id: 'registrasi_rfid', label: 'Registrasi Kartu RFID', icon: '💳' },
      { id: 'input_massal', label: 'Input Siswa/i Massal', icon: '📥' },
    ],
  };

  const activeSubMenus = subMenuMap[currentView] || [];

  return (
    <>
      <style>{`
        /* RESPONSIVE NAVIGATION STYLING (OPTIMIZED FOR ANDROID & DESKTOP 60 FPS) */
        .super-top-header {
          background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 55%, #1d4ed8 100%) !important;
          color: #ffffff;
          padding: 8px 12px;
          position: sticky;
          top: 0;
          z-index: 1000;
          box-shadow: 0 4px 16px rgba(37, 99, 235, 0.25), 0 2px 6px rgba(0, 0, 0, 0.15);
          width: 100%;
          max-width: 100vw;
          box-sizing: border-box;
          overflow: hidden;
          border-bottom: 1px solid rgba(255, 255, 255, 0.2);
          transform: translateZ(0);
          -webkit-transform: translateZ(0);
          -webkit-tap-highlight-color: transparent;
        }

        .header-desktop-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          gap: 12px;
          box-sizing: border-box;
          position: relative;
          z-index: 2;
        }

        .header-mobile-wrapper {
          display: none;
          flex-direction: column;
          gap: 5px;
          width: 100%;
          box-sizing: border-box;
          overflow-x: hidden;
          position: relative;
          z-index: 2;
        }

        .header-mobile-top-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          box-sizing: border-box;
        }

        @keyframes liveRadarBlink {
          0%, 100% {
            transform: scale(0.9);
            opacity: 0.7;
          }
          50% {
            transform: scale(1.2);
            opacity: 1;
          }
        }

        @keyframes headerRunningText {
          0% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(-100%);
          }
        }

        .header-running-marquee {
          display: inline-block;
          white-space: nowrap;
          animation: headerRunningText 28s linear infinite;
          font-size: 8px;
          color: #bfdbfe;
          font-weight: 600;
          letter-spacing: 0.3px;
          transform: translateZ(0);
          will-change: transform;
        }

        .header-running-marquee:hover {
          animation-play-state: paused;
        }

        .header-mobile-bottom-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 6px;
          padding: 3px 6px;
          gap: 6px;
          box-sizing: border-box;
          overflow: hidden;
          position: relative;
          height: 23px;
        }

        .desktop-only-flex {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .desktop-menu-bar {
          background-color: #ffffff;
          padding: 8px 16px;
          overflow-x: auto;
          white-space: nowrap;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          gap: 6px;
          align-items: center;
          box-sizing: border-box;
        }

        .mobile-bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          width: 100%;
          max-width: 100vw;
          box-sizing: border-box;
          background-color: rgba(255, 255, 255, 0.98);
          -webkit-backdrop-filter: blur(8px);
          backdrop-filter: blur(8px);
          border-top: 1px solid rgba(226, 232, 240, 0.9);
          padding: 5px 6px 7px 6px;
          display: flex;
          justify-content: space-around;
          align-items: center;
          z-index: 9999;
          box-shadow: 0 -4px 16px rgba(37, 99, 235, 0.08);
          overflow-x: hidden;
          transform: translateZ(0);
          -webkit-transform: translateZ(0);
          touch-action: manipulation;
        }

        .mobile-bottom-nav button {
          transition: transform 0.15s ease;
          -webkit-tap-highlight-color: transparent;
        }
        .mobile-bottom-nav button:active {
          transform: scale(0.92);
        }

        /* MEDIA QUERIES FOR SCREEN SIZES */
        @media (max-width: 768px) {
          .header-desktop-row {
            display: none !important;
          }
          .header-mobile-wrapper {
            display: flex !important;
          }
          .desktop-menu-bar {
            display: none !important;
          }
          .mobile-bottom-nav {
            display: flex !important;
          }
          .super-top-header {
            padding: 6px 10px !important;
          }
        }

        @media (min-width: 769px) {
          .header-desktop-row {
            display: flex !important;
          }
          .header-mobile-wrapper {
            display: none !important;
          }
          .mobile-bottom-nav {
            display: none !important;
          }
          .desktop-menu-bar {
            display: flex !important;
          }
        }
      `}</style>

      {/* 🌟 1. TOP HEADER (CLEAN HIGH-PERFORMANCE BAR) */}
      <header className="super-top-header">
        {/* ============================================================== */}
        {/* 💻 A. TAMPILAN KHUSUS DESKTOP & TABLET LEBAR (>= 769px) */}
        {/* ============================================================== */}
        <div className="header-desktop-row">
          {/* BRAND & LOGO */}
          <div
            onClick={() => handleNavClick('portal')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', minWidth: 0, flexShrink: 1 }}
            title="SMK YPK MEDAN"
          >
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                backgroundColor: '#ffffff',
                padding: '1px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
                flexShrink: 0,
                overflow: 'hidden',
              }}
            >
              <img
                src="/logo.png"
                alt="Logo SMK YPK"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                onError={(e) => {
                  e.currentTarget.src = '/api/roster-image?type=logo3d';
                }}
              />
            </div>
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap' }}>
                <span style={{ fontSize: '13px', fontWeight: '900', letterSpacing: '0.2px', color: '#ffffff', whiteSpace: 'nowrap' }}>
                  SMK YPK MEDAN
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '9.5px', color: '#bfdbfe', whiteSpace: 'nowrap' }}>
                📍 Jl. Sakti Lubis Gg. Amal No. 25 &amp; Gg. Pegawai No. 8 Medan
              </p>
            </div>
          </div>

          {/* ACTION TOOLS DESKTOP */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            {/* WAKTU LIVE WIB (DIGESER KE KIRI SEDIKIT) */}
            <div style={{ textAlign: 'right', marginRight: '14px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#fef08a', whiteSpace: 'nowrap' }}>
                🕒 {timeStr || 'Memuat...'}
              </div>
              <div style={{ fontSize: '9px', color: '#cbd5e1', whiteSpace: 'nowrap' }}>{dateStr}</div>
            </div>

            {/* 📢 TOMBOL UPLOAD BERITA (ADMIN / GURU) */}
            {isAdminOrTeacher && onOpenNewsPublisher && (
              <button
                type="button"
                onClick={onOpenNewsPublisher}
                style={{
                  backgroundColor: '#7c3aed',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                title="Terbitkan Berita Sekolah"
              >
                <span>📢</span>
                <span>Upload Berita</span>
              </button>
            )}

            {/* 🟢 TOMBOL WARGA SEKOLAH AKTIF (UNTUK SEMUA SISWA & GURU) */}
            {onOpenOnlineUsers && (
              <button
                type="button"
                onClick={onOpenOnlineUsers}
                style={{
                  backgroundColor: 'rgba(34, 197, 94, 0.22)',
                  color: '#86efac',
                  border: '1px solid rgba(74, 222, 128, 0.45)',
                  borderRadius: '20px',
                  padding: '5px 12px',
                  fontSize: '11px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(34, 197, 94, 0.25)',
                }}
                title="Guru & Siswa/i yang Sedang Online"
              >
                <span style={{ display: 'inline-block', animation: 'liveRadarBlink 1.6s infinite ease-in-out', fontSize: '9px' }}>🟢</span>
                <span>Guru &amp; Siswa Online</span>
                <span style={{ backgroundColor: '#22c55e', color: '#052e16', borderRadius: '10px', padding: '1px 6px', fontSize: '10px', fontWeight: '900' }}>
                  {onlineCount || 1}
                </span>
              </button>
            )}

            {/* 🔔 TOMBOL LONCENG NOTIFIKASI */}
            <button
              type="button"
              onClick={onOpenNotifications}
              style={{
                position: 'relative',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                borderRadius: '8px',
                width: '34px',
                height: '34px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                cursor: 'pointer',
                color: '#ffffff',
                flexShrink: 0,
              }}
              title="Pusat Notifikasi"
            >
              🔔
              {unreadNotifCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    backgroundColor: '#ef4444',
                    color: '#ffffff',
                    borderRadius: '10px',
                    fontSize: '9px',
                    fontWeight: '800',
                    minWidth: '16px',
                    height: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 3px',
                    border: '1.5px solid #ffffff',
                    boxShadow: '0 1px 4px rgba(239, 68, 68, 0.6)',
                  }}
                >
                  {unreadNotifCount > 99 ? '99+' : unreadNotifCount}
                </span>
              )}
            </button>

            {/* USER AVATAR BADGE */}
            <div
              onClick={() => handleNavClick('akun')}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                padding: '3px 8px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.25)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)')}
              title="Lihat Profil / ID Card Akun"
            >
              {getNavPhoto() ? (
                <img
                  src={getNavPhoto()}
                  alt="Profil"
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '1.5px solid #ffffff',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
                    color: '#ffffff',
                    fontWeight: 'bold',
                    fontSize: '11px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {(currentUser?.nama || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <div style={{ textAlign: 'left', lineHeight: 1.1 }}>
                <span style={{ fontSize: '11.5px', fontWeight: 'bold', color: '#ffffff', display: 'block' }}>
                  {currentUser?.nama?.split(' ')[0] || 'Akun'}
                </span>
                <span style={{ fontSize: '9px', color: '#bfdbfe' }}>
                  {currentUser?.isGuru ? 'Guru/Staff' : currentUser?.role || 'Siswa'}
                </span>
              </div>
            </div>

            {/* QUICK LOGOUT BUTTON */}
            <button
              type="button"
              onClick={onLogout}
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.85)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                width: '32px',
                height: '32px',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Keluar Akun"
            >
              🚪
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 📱 B. TAMPILAN KHUSUS MOBILE / HP (< 769px) - RAPI & ELEGAN */}
        {/* ============================================================== */}
        <div className="header-mobile-wrapper">
          {/* BARIS 1: LOGO, NAMA SEKOLAH, BADGE & ACTION BUTTONS */}
          <div className="header-mobile-top-row">
            <div
              onClick={() => handleNavClick('portal')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', minWidth: 0, flexShrink: 0 }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                  flexShrink: 0,
                  overflow: 'hidden',
                  padding: '2px',
                }}
              >
                <img
                  src="/logo.png"
                  alt="SMK YPK"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                  }}
                  onError={(e) => {
                    e.currentTarget.src = '/api/roster-image?type=logo3d';
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, justifyContent: 'center' }}>
                <span style={{ fontSize: '12.5px', fontWeight: '900', color: '#ffffff', whiteSpace: 'nowrap', lineHeight: 1.2 }}>
                  SMK YPK MEDAN
                </span>
              </div>
            </div>

            {/* ACTION ICONS DI HP */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              {/* TOMBOL WARGA SEKOLAH AKTIF (UNTUK SEMUA SISWA & GURU) */}
              {onOpenOnlineUsers && (
                <button
                  type="button"
                  onClick={onOpenOnlineUsers}
                  style={{
                    backgroundColor: 'rgba(34, 197, 94, 0.28)',
                    color: '#86efac',
                    border: '1px solid rgba(74, 222, 128, 0.6)',
                    borderRadius: '16px',
                    padding: '3px 8px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 2px 6px rgba(34, 197, 94, 0.3)',
                  }}
                  title="Guru & Siswa/i yang Online"
                >
                  <span style={{ display: 'inline-block', animation: 'liveRadarBlink 1.6s infinite ease-in-out', fontSize: '9px' }}>🟢</span>
                  <span style={{ fontSize: '10.5px', fontWeight: '900', color: '#ffffff', backgroundColor: '#22c55e', borderRadius: '8px', padding: '0 5px' }}>
                    {onlineCount || 1}
                  </span>
                </button>
              )}

              {/* TOMBOL TERBITKAN BERITA MADING */}
              {isMasterIqbal && onOpenNewsPublisher && (
                <button
                  type="button"
                  onClick={onOpenNewsPublisher}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.18)',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '8px',
                    padding: '4px 8px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  ✍️
                </button>
              )}

              {/* LONCENG NOTIFIKASI REALTIME HP */}
              <button
                type="button"
                onClick={onOpenNotifications}
                style={{
                  position: 'relative',
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                🔔
                {unreadNotifCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-4px',
                      backgroundColor: '#ef4444',
                      color: '#ffffff',
                      borderRadius: '10px',
                      fontSize: '9px',
                      fontWeight: '800',
                      minWidth: '16px',
                      height: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 3px',
                      border: '1px solid #ffffff',
                    }}
                  >
                    {unreadNotifCount > 99 ? '99+' : unreadNotifCount}
                  </span>
                )}
              </button>

              {/* AVATAR PROFIL */}
              <div
                onClick={() => handleNavClick('akun')}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
                  color: '#ffffff',
                  fontWeight: 'bold',
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  border: '1.5px solid rgba(255, 255, 255, 0.8)',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
                title="Profil Saya"
              >
                {navPhoto ? (
                  <img
                    src={navPhoto}
                    alt="Avatar"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  (currentUser?.nama || 'U').charAt(0).toUpperCase()
                )}
              </div>

              {/* LOGOUT */}
              <button
                type="button"
                onClick={onLogout}
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.85)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '7px',
                  width: '28px',
                  height: '28px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                }}
                title="Keluar Akun"
              >
                🚪
              </button>
            </div>
          </div>

          {/* BARIS 2: ALAMAT SEKOLAH LENGKAP & WAKTU LIVE JAM WIB (RUNNING TEKS KANAN KE KIRI) */}
          <div className="header-mobile-bottom-row">
            <div style={{ flex: 1, overflow: 'hidden', position: 'relative', height: '100%', display: 'flex', alignItems: 'center' }}>
              <div className="header-running-marquee">
                📍 SMK YPK MEDAN • Jl. Sakti Lubis Gg. Amal No. 25 &amp; Gg. Pegawai No. 8, Medan • Akreditasi A • 🕒 {timeStr || 'Memuat...'} WIB • {dateStr} • Sistem Presensi RFID Digital &amp; Smart School
              </div>
            </div>
            <div
              style={{
                fontSize: '8px',
                fontWeight: '800',
                color: '#fef08a',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                flexShrink: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.85)',
                border: '1px solid rgba(254, 240, 138, 0.35)',
                padding: '1px 5px',
                borderRadius: '4px',
                zIndex: 2,
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              }}
            >
              <span>🕒 {timeStr || 'WIB'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* 📑 3. SUB-MENU BAR (HANYA JIKA VIEW BUKAN PORTAL/BERANDA DAN MEMILIKI SUB-MENU) */}
      {currentView !== 'portal' && activeSubMenus.length > 1 && (
        <div
          style={{
            padding: '6px 12px',
            overflowX: 'auto',
            whiteSpace: 'nowrap',
            display: 'flex',
            gap: '6px',
            alignItems: 'center',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            scrollbarWidth: 'none',
          }}
        >
          {activeSubMenus.map((sub) => {
            const isSubActive = activeSubMenu === sub.id;
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => {
                  playMenuClickSound();
                  if (onSubMenuChange) onSubMenuChange(sub.id);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                  borderRadius: '14px',
                  border: isSubActive ? '1px solid #2563eb' : '1px solid #e2e8f0',
                  backgroundColor: isSubActive ? '#2563eb' : '#f8fafc',
                  color: isSubActive ? '#ffffff' : '#64748b',
                  fontWeight: isSubActive ? '700' : '500',
                  fontSize: '11px',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <span>{sub.icon}</span>
                <span>{sub.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* 📱 4. FIXED BOTTOM NAVIGATION BAR KHUSUS LAYAR HP (APK STYLE) */}
      <nav className="mobile-bottom-nav">
        {[
          { id: 'portal', label: 'Beranda', icon: '🏠', color: '#2563eb' },
          { id: 'presensi', label: 'Presensi', icon: '📋', color: '#16a34a' },
          { id: 'elearning', label: 'Perangkat Ajar', icon: '📘', color: '#2563eb' },
          { id: 'akun', label: 'ID Card', icon: '🪪', color: '#ea580c' },
          { id: 'ujian', label: 'Ujian CBT', icon: '📝', color: '#0891b2' },
        ].map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                handleNavClick(item.id);
                const defaultSub = subMenuMap[item.id]?.[0]?.id || '';
                if (onSubMenuChange) onSubMenuChange(defaultSub);
              }}
              style={{
                background: 'none',
                border: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                padding: '2px 8px',
                borderRadius: '10px',
                color: isActive ? item.color : '#64748b',
                cursor: 'pointer',
                flex: 1,
              }}
            >
              <div
                style={{
                  fontSize: '18px',
                  backgroundColor: isActive ? `${item.color}15` : 'transparent',
                  padding: '2px 10px',
                  borderRadius: '10px',
                  transition: 'all 0.15s',
                }}
              >
                {item.icon}
              </div>
              <span style={{ fontSize: '10px', fontWeight: isActive ? '800' : '600', color: isActive ? item.color : '#64748b' }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
