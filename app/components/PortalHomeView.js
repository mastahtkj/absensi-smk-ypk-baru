'use client';

import React, { useState, useEffect, useMemo } from 'react';
import HomeBannerSlider from './HomeBannerSlider';
import TeacherRosterCard, { TB_GURU_MAPPING } from './TeacherRosterCard';
import StudentRosterCard from './StudentRosterCard';
import { getCachedPhoto } from '../utils/fotoProfil';
import { playMenuClickSound } from './NotificationCenter';

// 🏠 KOMPONEN BERANDA PORTAL MENU APLIKASI SEKOLAH (SMK YPK SUPER APP)
function PortalHomeView({
  isBannerVideoActive = true,
  currentUser,
  siswaList = [],
  isMasterIqbal,
  isMasterSchoolAdmin,
  isMasterAdmin,
  appConfig = {},
  isAdminGuru,
  isSiswaAdmin,
  siswaAdminKelas,
  isRestrictedGuru,
  statsCount,
  invalList,
  schoolNewsList = [],
  onOpenNewsPublisher,
  onOpenNewsDetail,
  onOpenNotifications,
  onOpenOnlineUsers,
  onOpenChatAll,
  onOpenBackgroundSettings,
  unreadNotifCount = 0,
  userReadNotifIds = new Set(),
  absensiLogs = [],
  onNavigate,
  onOpenInval,

  onOpenBulk,
  onLogout,
}) {
  const isGuruAccount = Boolean(
    isMasterIqbal ||
    isMasterSchoolAdmin ||
    isMasterAdmin ||
    currentUser?.isMaster ||
    currentUser?.isGuru ||
    String(currentUser?.id || '').toUpperCase().startsWith('GURU-') ||
    String(currentUser?.role || '').toLowerCase().includes('guru') ||
    String(currentUser?.role || '').toLowerCase().includes('admin') ||
    String(currentUser?.role || '').toLowerCase().includes('master') ||
    String(currentUser?.role || '').toLowerCase().includes('staff') ||
    String(currentUser?.role || '').toLowerCase().includes('pegawai') ||
    (currentUser?.username || '').toLowerCase() === 'admin' ||
    (currentUser?.username || '').toLowerCase() === 'iqbal' ||
    currentUser?.rawId === 29 ||
    String(currentUser?.id || '').includes('29')
  ) && !String(currentUser?.id || '').toUpperCase().startsWith('SISWA-') && !isSiswaAdmin;
  const isDirectAdmin = Boolean(
    isMasterIqbal ||
    isAdminGuru ||
    currentUser?.role === 'admin' ||
    currentUser?.role === 'master' ||
    (currentUser?.username || '').toLowerCase() === 'admin' ||
    (currentUser?.username || '').toLowerCase() === 'iqbal'
  );
  const isSiswaAdminUser = Boolean(
    isSiswaAdmin ||
    Boolean(currentUser?.isSiswaAdmin) ||
    String(currentUser?.role || '').toLowerCase().includes('siswa_admin') ||
    (String(currentUser?.id).startsWith('SISWA-') && String(currentUser?.role || '').toLowerCase().includes('admin'))
  );

  // 🔒 HAK AKSES RUANG CHAT ALL: SEMUA PENGGUNA TERDAFTAR DAPAT MEMBACA PESAN DARI GURU
  const canAccessChatAll = Boolean(currentUser);

  const matchedUserInDb = (siswaList || []).find((s) => {
    const sNamaClean = String(s?.nama || '').trim().toLowerCase();
    const curNamaClean = String(currentUser?.nama || '').trim().toLowerCase();
    const sUserClean = String(s?.username || '').trim().toLowerCase();
    const curUserClean = String(currentUser?.username || '').trim().toLowerCase();

    if (isGuruAccount) {
      return (
        s.isGuru &&
        (s.rawId === currentUser?.rawId ||
          String(s.id) === String(currentUser?.id) ||
          (sNamaClean && curNamaClean && sNamaClean === curNamaClean) ||
          (curUserClean && sNamaClean && sNamaClean.includes(curUserClean)) ||
          (curUserClean && sUserClean && sUserClean === curUserClean))
      );
    }
    return (
      !s.isGuru &&
      (s.rawId === currentUser?.rawId ||
        String(s.id) === String(currentUser?.id) ||
        (sNamaClean && curNamaClean && sNamaClean === curNamaClean) ||
        (curUserClean && sNamaClean && sNamaClean.includes(curUserClean)))
    );
  });

  const isStudentAdmin = Boolean(
    String(currentUser?.role || '').toLowerCase().includes('siswa_admin') ||
    (String(currentUser?.id).startsWith('SISWA-') && String(currentUser?.role || '').toLowerCase().includes('admin'))
  );

  const roleLabel = isStudentAdmin
    ? `Siswa/i Admin (${currentUser?.kelas || 'XI TJKT'})`
    : isGuruAccount
    ? (currentUser?.role === 'master' || currentUser?.isMaster || isMasterSchoolAdmin || currentUser?.username?.toLowerCase() === 'iqbal' ? 'Admin / Master' : 'Guru Pengajar')
    : `Kelas ${currentUser?.kelas || matchedUserInDb?.kelas || 'XI TJKT'} • Jurusan ${currentUser?.jurusan || 'TJKT'}`;

  // 📰 FILTER BERITA TERBARU DI BERANDA SESUAI TARGET DATABASE (SISWA / GURU / JURUSAN)
  const isMasterIqbalPortal = Boolean(
    isMasterIqbal ||
    isMasterSchoolAdmin ||
    currentUser?.isMaster ||
    currentUser?.username?.toLowerCase() === 'iqbal' ||
    currentUser?.nama?.toLowerCase()?.includes('iqbal') ||
    currentUser?.role?.toLowerCase() === 'master'
  );
  const isGuruAdminPortal = Boolean(
    isAdminGuru ||
    (!String(currentUser?.id).startsWith('SISWA-') && currentUser?.isGuru === true && (currentUser?.role?.toLowerCase() === 'admin' || currentUser?.role?.toLowerCase() === 'master'))
  );
  const userRoleIsGuru = Boolean(currentUser?.isGuru && !String(currentUser?.id).startsWith('SISWA-'));
  const userKelasUpper = String(currentUser?.kelas || matchedUserInDb?.kelas || '').toUpperCase();

  const targetedNewsList = (schoolNewsList || []).filter((news) => {
    if (!news) return false;
    // Bersihkan data dummy jika ada
    if (news.id === 'news-pts-2026' || news.id === 'news-pkl-2026') return false;
    if (String(news.judul || '').includes('Penilaian Tengah Semester (PTS) Berbasis CBT')) return false;
    if (String(news.judul || '').includes('Praktik Kerja Lapangan (PKL) Industri Gelombang II')) return false;

    // Master Iqbal & Guru Admin dapat melihat seluruh berita untuk moderasi/monitoring
    if (isMasterIqbalPortal || isGuruAdminPortal) return true;

    const audience = String(news.targetAudience || 'Semua');
    if (audience === 'Semua') return true;
    if (audience === 'Guru') return userRoleIsGuru;
    if (audience === 'Siswa') return !userRoleIsGuru;
    if (!userRoleIsGuru && (audience === 'TJKT' || audience === 'AKL' || audience === 'MPLB' || audience === 'PM')) {
      return userKelasUpper.includes(audience);
    }
    if (!userRoleIsGuru && userKelasUpper.includes(audience.toUpperCase())) {
      return true;
    }
    return false;
  });

  const latestNews = targetedNewsList[0];

  // 📸 FOTO PROFIL DARI ID CARD (GURU / SISWA) - Sinkron 100% dengan ID Card & Database
  const getStoredPhoto = () => {
    const isSirait = (p) => typeof p === 'string' && (p.toLowerCase().includes('ricardo') || p.toLowerCase().includes('sirait'));
    const defaultIqbalPhoto = '/guru/04_muhammad_iqbal_rangkuti_kajur_tjkt.jpg';
    const isIqbalUserOnly = Boolean(
      currentUser?.username?.toLowerCase() === 'iqbal' ||
      currentUser?.nama?.toLowerCase()?.includes('iqbal') ||
      currentUser?.rawId === 4 ||
      currentUser?.rawId === 29 ||
      currentUser?.id === 'GURU-4'
    );

    if (isIqbalUserOnly) {
      const uPhoto = currentUser?.foto_url || currentUser?.biodata?.foto_resmi || currentUser?.biodata?.foto_url;
      if (uPhoto && typeof uPhoto === 'string' && !isSirait(uPhoto) && uPhoto.length > 20) return uPhoto;
      return defaultIqbalPhoto;
    }

    const isValidPhoto = (url) => url && typeof url === 'string' && url !== '/logo.png' && url.length > 20;

    // 1. Dari currentUser state
    const userPhoto =
      currentUser?.foto_url ||
      currentUser?.biodata?.foto_resmi ||
      currentUser?.biodata?.foto_id_card ||
      currentUser?.biodata?.foto_url ||
      currentUser?.foto;
    if (isValidPhoto(userPhoto)) return userPhoto;

    // 2. Dari matchedUserInDb
    const dbPhoto =
      matchedUserInDb?.foto_url ||
      matchedUserInDb?.biodata?.foto_resmi ||
      matchedUserInDb?.biodata?.foto_id_card ||
      matchedUserInDb?.biodata?.foto_url ||
      matchedUserInDb?.foto;
    if (isValidPhoto(dbPhoto)) return dbPhoto;

    // 3. Dari local cache helper & localStorage
    if (typeof window !== 'undefined') {
      const rawId = currentUser?.rawId || currentUser?.id;
      const isGuru = Boolean(currentUser?.isGuru && !String(currentUser?.id).startsWith('SISWA-'));
      const cached = getCachedPhoto({ rawId, username: currentUser?.username, isGuru });
      if (isValidPhoto(cached)) return cached;

      const rolePrefix = isGuru ? 'GURU-' : 'SISWA-';
      const cleanId = String(rawId || '').replace(/\D/g, '');
      const scopedKey = cleanId ? `user_photo_${rolePrefix}${cleanId}` : '';
      const k1 = `user_photo_${currentUser?.id || currentUser?.username || 'me'}`;
      const k2 = cleanId ? `user_photo_${cleanId}` : '';
      const k3 = currentUser?.username ? `user_photo_${currentUser.username}` : '';
      const k4 = currentUser?.nama ? `user_photo_${currentUser.nama.trim()}` : '';

      const localCandidate =
        (scopedKey ? localStorage.getItem(scopedKey) : '') ||
        localStorage.getItem(k1) ||
        (k2 ? localStorage.getItem(k2) : '') ||
        (k3 ? localStorage.getItem(k3) : '') ||
        (k4 ? localStorage.getItem(k4) : '');

      if (isValidPhoto(localCandidate)) return localCandidate;
    }

    return '';
  };

  const [profilePhoto, setProfilePhoto] = useState(getStoredPhoto);

  useEffect(() => {
    setProfilePhoto(getStoredPhoto());
    const handlePhotoChange = () => setProfilePhoto(getStoredPhoto());
    window.addEventListener('user_photo_updated', handlePhotoChange);
    window.addEventListener('storage', handlePhotoChange);
    return () => {
      window.removeEventListener('user_photo_updated', handlePhotoChange);
      window.removeEventListener('storage', handlePhotoChange);
    };
  }, [currentUser, matchedUserInDb]);

  const userInitial = (currentUser?.nama || matchedUserInDb?.nama || 'U').charAt(0).toUpperCase();


  return (
    <div style={{ padding: '4px 0 50px 0', maxWidth: '1080px', margin: '0 auto' }}>
      {/* 📢 1. RUNNING NEWS / PENGUMUMAN TERBARU (TETAP DI PALING ATAS BERANDA) */}
      {latestNews && (
        <div
          onClick={() => onOpenNewsDetail && onOpenNewsDetail(latestNews)}
          style={{
            backgroundColor: '#eff6ff',
            border: '1.5px solid #bfdbfe',
            borderRadius: '14px',
            padding: '8px 12px',
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.08)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            overflow: 'hidden',
            position: 'relative',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 14px rgba(37, 99, 235, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(37, 99, 235, 0.08)';
          }}
          title="Klik untuk membaca pengumuman lengkap"
        >
          {/* 📢 IKON TEROMPET KEDAP-KEDIP & PULSE */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              flexShrink: 0,
              animation: 'megaphonePulseBlink 1.4s infinite ease-in-out',
              userSelect: 'none',
            }}
          >
            📢
          </div>

          {/* 🏷️ BADGE TERKINI */}
          <span
            style={{
              backgroundColor: '#2563eb',
              color: '#ffffff',
              fontSize: '9.5px',
              fontWeight: '900',
              padding: '2.5px 7px',
              borderRadius: '6px',
              letterSpacing: '0.4px',
              flexShrink: 0,
              boxShadow: '0 1px 4px rgba(37, 99, 235, 0.3)',
              userSelect: 'none',
            }}
          >
            TERKINI
          </span>

          {/* 📜 TEKS RUNNING MARQUEE BERJALAN SEPERTI ALAMAT DI BERANDA */}
          <div
            style={{
              flex: 1,
              overflow: 'hidden',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              height: '22px',
              minWidth: 0,
            }}
          >
            <div className="portal-news-marquee">
              {latestNews.judul} {latestNews.ringkasan ? `• ${latestNews.ringkasan}` : ''} • {latestNews.penulis ? `(Penulis: ${latestNews.penulis})` : 'SMK YPK MEDAN'}
            </div>
          </div>

          {/* ➡️ TOMBOL BACA */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              fontSize: '11px',
              color: '#2563eb',
              fontWeight: '800',
              flexShrink: 0,
              backgroundColor: '#dbeafe',
              padding: '3px 8px',
              borderRadius: '8px',
              border: '1px solid rgba(37, 99, 235, 0.25)',
              userSelect: 'none',
            }}
          >
            <span>Baca</span>
            <span style={{ fontSize: '11px' }}>➔</span>
          </div>
        </div>
      )}

      {/* 📸 5 SLIDE GAMBAR BANNER / BROSUR BERANDA (PERSIS SEPERTI DI GAMBAR CONTOH) */}
      <div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 16px auto' }}>
        <HomeBannerSlider
          isActive={isBannerVideoActive}
          banners={appConfig?.home_banners || appConfig?.teacher_slides || null}
          primaryColor={appConfig?.theme_primary_color || '#1e40af'}
          accentColor={appConfig?.theme_accent_color || '#3b82f6'}
          isMasterAdmin={isMasterAdmin}
          onOpenMasterControl={() => {
            playMenuClickSound();
            if (onNavigate) onNavigate('master_control');
          }}
        />
      </div>

      {/* 👤 2. HERO GREETING BANNER RESMI DENGAN ANIMASI FLUID GRADIENT & AMBIENT GLOW */}
      <div
        className="animated-hero-card"
        style={{
          borderRadius: '18px',
          padding: '16px 20px',
          color: '#ffffff',
          marginBottom: '16px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* AVATAR FOTO PROFILE ID CARD GURU / SISWA */}
            <div
              onClick={() => onNavigate && onNavigate('akun')}
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '14px',
                backgroundColor: '#ffffff',
                padding: '2px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                cursor: 'pointer',
                overflow: 'hidden',
                border: '2.5px solid rgba(255, 255, 255, 0.85)',
                transition: 'transform 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              title="Klik untuk membuka Profil & ID Card"
            >
              {profilePhoto ? (
                <img
                  src={profilePhoto}
                  alt={currentUser?.nama || 'Foto Profil ID Card'}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: '10px',
                  }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    if (e.currentTarget.nextElementSibling) {
                      e.currentTarget.nextElementSibling.style.display = 'flex';
                    }
                  }}
                />
              ) : null}
              <div
                style={{
                  display: profilePhoto ? 'none' : 'flex',
                  width: '100%',
                  height: '100%',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
                  color: '#ffffff',
                  fontWeight: '900',
                  fontSize: '22px',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {userInitial}
              </div>
            </div>

            {/* GREETING TEXT & BRANDING */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '3px' }}>
                <span style={{ fontSize: '11.5px', fontWeight: '900', letterSpacing: '0.4px', color: '#ffffff' }}>
                  SMK YPK MEDAN
                </span>
                <span
                  style={{
                    fontSize: '9.5px',
                    fontWeight: '800',
                    background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.88) 0%, rgba(30, 41, 59, 0.95) 100%)',
                    border: '1.5px solid #eab308',
                    padding: '2px 9px',
                    borderRadius: '20px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.28), inset 0 1px 1px rgba(254, 240, 138, 0.3)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span style={{ fontSize: '11px', color: '#facc15', filter: 'drop-shadow(0 0 4px rgba(250, 204, 21, 0.8))' }}>⭐</span>
                  <span style={{ color: '#fde047', fontWeight: '900', letterSpacing: '0.4px', textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>AKREDITASI A</span>
                </span>
              </div>
              <h1 style={{ margin: '2px 0 3px 0', fontSize: '16.5px', fontWeight: '800', color: '#ffffff' }}>
                Halo, {currentUser?.nama || 'Pengguna'}! 👋
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '10.5px', backgroundColor: 'rgba(255, 255, 255, 0.18)', color: '#ffffff', padding: '2px 8px', borderRadius: '6px', fontWeight: '600' }}>
                  {roleLabel}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 📅 3. JADWAL & ROSTER BERDASARKAN PERAN AKUN */}
      {/* 👨‍🏫 A. JADWAL GURU: HANYA DITAMPILKAN KEPADA AKUN GURU/ADMIN */}
      {isGuruAccount ? (
        <TeacherRosterCard currentUser={currentUser} siswaList={siswaList} />
      ) : (
        /* 🧑‍🎓 B. JADWAL SISWA: HANYA DITAMPILKAN KEPADA AKUN SISWA SESUAI KELAS & JURUSAN */
        <StudentRosterCard currentUser={currentUser} siswaList={siswaList} />
      )}

      {/* ⚡ 4. MENU LAYANAN SEKOLAH (MENU UTAMA ESENSIAL & KOORDINASI RESMI SMK YPK) */}
      <div style={{ marginTop: '6px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <h2
            style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
            onClick={() => {
              try { playMenuClickSound(); } catch (e) {}
              if (typeof onNavigate === 'function') {
                onNavigate('elearning', isGuruAccount ? 'rekap_inval' : 'materi_jurusan');
              }
            }}
            title="Klik untuk membuka Layanan Sekolah (Inval & Bahan Ajar)"
          >
            <span>🗂️</span> Menu Layanan Sekolah
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', backgroundColor: '#f1f5f9', padding: '3px 8px', borderRadius: '6px' }}>
              {canAccessChatAll ? 'Layanan Terpadu Guru & Staff' : 'Layanan Utama Siswa'}
            </span>
            <button
              type="button"
              onClick={() => {
                try { playMenuClickSound(); } catch (e) {}
                if (typeof onNavigate === 'function') {
                  onNavigate('elearning', isGuruAccount ? 'rekap_inval' : 'materi_jurusan');
                }
              }}
              style={{
                fontSize: '11px',
                color: '#1d4ed8',
                fontWeight: '700',
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                padding: '3px 10px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.15s ease',
              }}
              title="Buka Layanan Sekolah (Inval & Bahan Ajar)"
            >
              <span>📚</span>
              <span>Buka Layanan ➡️</span>
            </button>
          </div>
        </div>

        {/* MENU MATRIX GRID RESPONSIVE & EXECUTIVE BENTO SUITE */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))',
            gap: '12px',
          }}
        >
          {/* 1. PRESENSI */}
          <div
            className="service-menu-card"
            onClick={() => {
              playMenuClickSound();
              onNavigate('presensi');
            }}
          >
            <div
              className="service-icon-box"
              style={{
                background: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)',
                boxShadow: '0 8px 18px rgba(22, 163, 74, 0.35)',
                border: '1.5px solid rgba(255, 255, 255, 0.4)',
                animationDelay: '0s',
              }}
            >
              📋
            </div>
            <span style={{ fontSize: '12px', fontWeight: '800', color: '#1e293b', lineHeight: 1.2 }}>
              Presensi
            </span>
            <span style={{ fontSize: '9.5px', color: '#64748b', marginTop: '2px' }}>
              Presensi Digital &amp; Rekap
            </span>
          </div>

          {/* 2. ID CARD & BIODATA SINGKAT GURU */}
          <div
            className="service-menu-card"
            onClick={() => {
              playMenuClickSound();
              onNavigate('akun');
            }}
          >
            <div
              className="service-icon-box"
              style={{
                background: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
                boxShadow: '0 8px 18px rgba(234, 88, 12, 0.35)',
                border: '1.5px solid rgba(255, 255, 255, 0.4)',
                animationDelay: '0.3s',
              }}
            >
              🪪
            </div>
            <span style={{ fontSize: '12px', fontWeight: '800', color: '#1e293b', lineHeight: 1.2 }}>
              ID Card {isGuruAccount ? '& Biodata' : ''}
            </span>
            <span style={{ fontSize: '9.5px', color: '#64748b', marginTop: '2px' }}>
              {isGuruAccount ? 'Kartu & Biodata Guru' : 'Kartu Digital Siswa'}
            </span>
          </div>

          {/* 3. LAYANAN INVAL GURU & BAHAN AJAR (MENU LAYANAN SEKOLAH) */}
          <div
            className="service-menu-card"
            role="button"
            tabIndex={0}
            style={{ cursor: 'pointer', touchAction: 'manipulation', userSelect: 'none' }}
            onClick={() => {
              try { playMenuClickSound(); } catch (e) {}
              if (typeof onNavigate === 'function') {
                onNavigate('elearning', isGuruAccount ? 'rekap_inval' : 'materi_jurusan');
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                try { playMenuClickSound(); } catch (e) {}
                if (typeof onNavigate === 'function') {
                  onNavigate('elearning', isGuruAccount ? 'rekap_inval' : 'materi_jurusan');
                }
              }
            }}
            title="Layanan Sekolah: Inval Guru & Bahan Ajar"
          >
            <div
              className="service-icon-box"
              style={{
                background: 'linear-gradient(135deg, #2563eb 0%, #38bdf8 100%)',
                boxShadow: '0 8px 18px rgba(37, 99, 235, 0.35)',
                border: '1.5px solid rgba(255, 255, 255, 0.4)',
                animationDelay: '0.6s',
              }}
            >
              📚
            </div>
            <span style={{ fontSize: '12px', fontWeight: '800', color: '#1e293b', lineHeight: 1.2 }}>
              Layanan Sekolah
            </span>
            <span style={{ fontSize: '9.5px', color: '#64748b', marginTop: '2px' }}>
              {isGuruAccount ? 'Inval & Modul Ajar' : 'Guru Inval & Bahan Ajar'}
            </span>
          </div>

          {/* 4. MADING & PUSAT INFO */}
          <div
            className="service-menu-card"
            onClick={() => {
              playMenuClickSound();
              onNavigate('mading');
            }}
          >
            <div
              className="service-icon-box"
              style={{
                background: 'linear-gradient(135deg, #e11d48 0%, #f43f5e 100%)',
                boxShadow: '0 8px 18px rgba(225, 29, 72, 0.35)',
                border: '1.5px solid rgba(255, 255, 255, 0.4)',
                animationDelay: '0.9s',
              }}
            >
              📢
            </div>
            <span style={{ fontSize: '12px', fontWeight: '800', color: '#1e293b', lineHeight: 1.2 }}>
              Mading &amp; Info
            </span>
            <span style={{ fontSize: '9.5px', color: '#64748b', marginTop: '2px' }}>
              Pusat Pengumuman
            </span>
          </div>

          {/* 5. PERPUSTAKAAN DIGITAL GURU & SISWA */}
          <div
            className="service-menu-card"
            onClick={() => {
              playMenuClickSound();
              onNavigate('library');
            }}
          >
            <div
              className="service-icon-box"
              style={{
                background: 'linear-gradient(135deg, #d97706 0%, #fbbf24 100%)',
                boxShadow: '0 8px 18px rgba(217, 119, 6, 0.35)',
                border: '1.5px solid rgba(255, 255, 255, 0.4)',
                animationDelay: '1.2s',
              }}
            >
              📖
            </div>
            <span style={{ fontSize: '12px', fontWeight: '800', color: '#1e293b', lineHeight: 1.2 }}>
              Perpustakaan
            </span>
            <span style={{ fontSize: '9.5px', color: '#64748b', marginTop: '2px' }}>
              PDF E-Book Reader
            </span>
          </div>

          {/* 6. UJIAN CBT ONLINE */}
          <div
            className="service-menu-card"
            onClick={() => {
              playMenuClickSound();
              onNavigate('ujian');
            }}
          >
            <div
              className="service-icon-box"
              style={{
                background: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',
                boxShadow: '0 8px 18px rgba(8, 145, 178, 0.35)',
                border: '1.5px solid rgba(255, 255, 255, 0.4)',
                animationDelay: '1.5s',
              }}
            >
              📝
            </div>
            <span style={{ fontSize: '12px', fontWeight: '800', color: '#1e293b', lineHeight: 1.2 }}>
              Ujian CBT
            </span>
            <span style={{ fontSize: '9.5px', color: '#64748b', marginTop: '2px' }}>
              Fullscreen Anti-Cheat
            </span>
          </div>

          {/* 7. 🟢 GURU & SISWA/I ONLINE (REALTIME PRESENCE DENGAN RADAR BLINK) */}
          <div
            className="service-menu-card"
            style={{ borderColor: '#bbf7d0' }}
            onClick={() => {
              playMenuClickSound();
              if (onOpenOnlineUsers) onOpenOnlineUsers();
            }}
          >
            <div
              className="service-icon-box"
              style={{
                background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                boxShadow: '0 8px 18px rgba(5, 150, 105, 0.35)',
                border: '1.5px solid rgba(255, 255, 255, 0.4)',
                animationDelay: '1.8s',
              }}
            >
              👥
            </div>
            <span style={{ fontSize: '12px', fontWeight: '800', color: '#065f46', lineHeight: 1.2 }}>
              Guru &amp; Siswa Online
            </span>
            <span style={{ fontSize: '9.5px', color: '#059669', marginTop: '2px', fontWeight: 'bold' }}>
              🟢 Live Radar Detik
            </span>
          </div>

          {/* 8. 👨‍🏫 DIREKTORI PROFIL & RATING GURU AI */}
          <div
            className="service-menu-card"
            style={{ borderColor: '#bae6fd' }}
            onClick={() => {
              playMenuClickSound();
              onNavigate('guru_directory');
            }}
          >
            <div
              className="service-icon-box"
              style={{
                background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
                boxShadow: '0 8px 18px rgba(30, 58, 138, 0.35)',
                border: '1.5px solid rgba(255, 255, 255, 0.4)',
                animationDelay: '1.9s',
              }}
            >
              👨‍🏫
            </div>
            <span style={{ fontSize: '12px', fontWeight: '800', color: '#1e3a8a', lineHeight: 1.2 }}>
              Profil &amp; Rating Guru
            </span>
            <span style={{ fontSize: '9.5px', color: '#2563eb', marginTop: '2px', fontWeight: 'bold' }}>
              Direktori &amp; Ulasan AI
            </span>
          </div>

          {/* 8. 💬 RUANG CHAT ALL (HANYA KHUSUS GURU, ADMIN & SISWA ADMIN - SISWA BIASA DITUTUP) */}
          {canAccessChatAll && (
            <div
              className="service-menu-card"
              style={{ borderColor: '#bfdbfe', touchAction: 'manipulation', cursor: 'pointer' }}
              onClick={() => {
                playMenuClickSound();
                if (onOpenChatAll) onOpenChatAll();
              }}
            >
              <div
                className="service-icon-box"
                style={{
                  background: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
                  boxShadow: '0 8px 18px rgba(29, 78, 216, 0.35)',
                  border: '1.5px solid rgba(255, 255, 255, 0.4)',
                  animationDelay: '2.1s',
                }}
              >
                💬
              </div>
              <span style={{ fontSize: '12px', fontWeight: '800', color: '#1e3a8a', lineHeight: 1.2 }}>
                Ruang Chat All
              </span>
              <span style={{ fontSize: '9.5px', color: '#2563eb', marginTop: '2px', fontWeight: 'bold' }}>
                {isSiswaAdminUser ? 'Siswa/i Admin' : 'Guru & Admin'}
              </span>
            </div>
          )}

          {/* 9. ⚡ IZIN LATAR BELAKANG & LAYAR TETAP NYALA (UNTUK SEMUA PENGGUNA HP/DESKTOP) */}
          <div
            className="service-menu-card"
            style={{ borderColor: '#fef08a', touchAction: 'manipulation', cursor: 'pointer' }}
            onClick={() => {
              playMenuClickSound();
              if (onOpenBackgroundSettings) onOpenBackgroundSettings();
            }}
          >
            <div
              className="service-icon-box"
              style={{
                background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
                boxShadow: '0 8px 18px rgba(234, 179, 8, 0.35)',
                border: '1.5px solid rgba(255, 255, 255, 0.4)',
                animationDelay: '2.4s',
              }}
            >
              ⚡
            </div>
            <span style={{ fontSize: '12px', fontWeight: '800', color: '#854d0e', lineHeight: 1.2 }}>
              Latar Belakang &amp; Layar
            </span>
            <span style={{ fontSize: '9.5px', color: '#ca8a04', marginTop: '2px', fontWeight: 'bold' }}>
              💡 Layar Nyala &amp; Izin HP
            </span>
          </div>

          {/* 👑 10. PUSAT KENDALI ADMIN MASTER (KHUSUS MASTER ADMIN MUHAMMAD IQBAL) */}
          {isMasterSchoolAdmin && (
            <div
              className="service-menu-card"
              style={{
                borderColor: '#f59e0b',
                backgroundColor: '#fffbeb',
                touchAction: 'manipulation',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.18)',
              }}
              onClick={() => {
                playMenuClickSound();
                onNavigate('master_control');
              }}
            >
              <div
                className="service-icon-box"
                style={{
                  background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
                  boxShadow: '0 8px 18px rgba(217, 119, 6, 0.4)',
                  border: '1.5px solid #ffffff',
                  animationDelay: '0.2s',
                }}
              >
                👑
              </div>
              <span style={{ fontSize: '12px', fontWeight: '900', color: '#b45309', lineHeight: 1.2 }}>
                Pusat Kendali Master
              </span>
              <span style={{ fontSize: '9.5px', color: '#d97706', marginTop: '2px', fontWeight: 'bold' }}>
                ⭐ Super Admin Panel
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PortalHomeView;
