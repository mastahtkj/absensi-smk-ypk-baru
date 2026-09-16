'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';

// Helper: Deteksi ID YouTube dari berbagai macam format URL
export function getYouTubeId(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
  const match = trimmed.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

// Helper: Cek apakah slide berupa video (YouTube atau file video MP4/WebM)
export function isVideoMedia(slide) {
  if (!slide) return false;
  if (slide.media_type === 'video') return true;
  const url = String(slide.video_url || slide.image_url || '').trim();
  if (getYouTubeId(url)) return true;
  if (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url)) return true;
  if (url.startsWith('data:video/')) return true;
  return false;
}

// 5 SLIDE BANNER RESMI BERDASARKAN BROSUR SPMB & DOKUMENTASI SEKOLAH SMK YPK MEDAN
export const DEFAULT_BANNER_SLIDES = [
  {
    id: 1,
    title: 'SPMB SMK YPK MEDAN 2025/2026',
    subtitle: 'Sistem Penerimaan Murid Baru • Akreditasi A',
    image_url: '/api/roster-image?type=banner1',
    media_type: 'image',
    caption: 'Yayasan Pendidikan Keluarga SMKS YPK Medan - Percayakan Pendidikan Putra Putri Anda Pada Kami (Gratis Biaya Pendaftaran)',
    active: true,
  },
  {
    id: 2,
    title: 'Tenaga Pendidik & Kependidikan SMK YPK',
    subtitle: 'Dewan Guru Berdedikasi & Profesional',
    image_url: '/api/roster-image?type=banner1',
    media_type: 'image',
    caption: 'Bersama Kepala Sekolah Hartati Patiwael, S.Si & Ketua Yayasan Hj. Darmawati, S.Pd., M.Pd mendidik putra-putri bangsa.',
    active: true,
  },
  {
    id: 3,
    title: 'Gedung & Fasilitas Kampus Terpadu',
    subtitle: 'Laboratorium Bahasa, Komputer, Perpustakaan, UKS & Lapangan Olahraga',
    image_url: '/gedung.png',
    media_type: 'image',
    caption: 'Fasilitas pembelajaran modern dan representatif untuk mendukung kompetensi vokasi kejuruan.',
    active: true,
  },
  {
    id: 4,
    title: '4 Kompetensi Keahlian Unggulan',
    subtitle: 'TJKT • AKL • MPLB • Pemasaran (PM)',
    image_url: '/api/roster-image?type=banner1',
    media_type: 'image',
    caption: 'Teknik Jaringan Komputer & Telekomunikasi, Akuntansi Keuangan, Manajemen Perkantoran, dan Pemasaran Bisnis.',
    active: true,
  },
  {
    id: 5,
    title: 'Ekstrakurikuler & Pembinaan Bakat Siswa',
    subtitle: 'Pramuka, Paskibra, Futsal, Voli, Tahsin, Marching Band & Pemrograman',
    image_url: '/api/roster-image?type=banner1',
    media_type: 'image',
    caption: 'Mengembangkan potensi minat, bakat, karakter disiplin, religius, serta kepemimpinan siswa.',
    active: true,
  },
];

export default function HomeBannerSlider({
  banners = [],
  primaryColor = '#1e40af',
  accentColor = '#3b82f6',
  isMasterAdmin = false,
  onOpenMasterControl,
}) {
  // Parsing banners dari database Supabase dengan fallback cache lokal
  const activeSlides = useMemo(() => {
    let list = banners;
    if (typeof list === 'string') {
      try {
        list = JSON.parse(list);
      } catch (e) {
        list = [];
      }
    }
    if (!Array.isArray(list) || list.length === 0) {
      if (typeof window !== 'undefined') {
        try {
          const cached = localStorage.getItem('smk_ypk_home_banners');
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) list = parsed;
          }
        } catch (e) {}
      }
    }
    if (!Array.isArray(list) || list.length === 0) {
      list = DEFAULT_BANNER_SLIDES;
    } else {
      if (typeof window !== 'undefined' && Array.isArray(list) && list.length > 0) {
        try {
          localStorage.setItem('smk_ypk_home_banners', JSON.stringify(list));
        } catch (e) {}
      }
    }

    const valid = list.filter((s) => s && s.active !== false);
    return valid.length > 0 ? valid : DEFAULT_BANNER_SLIDES;
  }, [banners]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [lightboxMedia, setLightboxMedia] = useState(null); // { type: 'image' | 'video', url: '', ytId?: '' }
  const [fitMode, setFitMode] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('smk_ypk_banner_fit_mode');
        if (saved === 'contain' || saved === 'cover') return saved;
      } catch (e) {}
    }
    return 'cover';
  });
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const toggleFitMode = (e) => {
    e.stopPropagation();
    setFitMode((prev) => {
      const next = prev === 'cover' ? 'contain' : 'cover';
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('smk_ypk_banner_fit_mode', next);
        } catch (err) {}
      }
      return next;
    });
  };

  // Auto-advance timer SETIAP 5 DETIK TANPA MACET PADA HOVER MOUSE PC
  useEffect(() => {
    if (activeSlides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeSlides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [currentIndex, activeSlides.length]);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % activeSlides.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + activeSlides.length) % activeSlides.length);
  };

  // Touch Swipe Handling untuk Layar HP
  const handleTouchStart = (e) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
  };

  const currentBanner = activeSlides[currentIndex] || activeSlides[0];
  const isVideo = isVideoMedia(currentBanner);
  const mediaUrl = currentBanner.video_url || currentBanner.image_url || '/api/roster-image?type=banner1';
  const ytId = isVideo ? getYouTubeId(mediaUrl) : null;

  // Gambar background ambient blur
  const ambientBgImage = isVideo
    ? (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : (currentBanner.image_url || '/api/roster-image?type=banner1'))
    : (currentBanner.image_url || '/api/roster-image?type=banner1');

  const openLightbox = () => {
    setLightboxMedia({
      type: isVideo ? 'video' : 'image',
      url: mediaUrl,
      ytId,
      title: currentBanner.title,
      caption: currentBanner.caption,
    });
  };

  return (
    <div
      className="home-banner-outer-wrap"
      style={{
        position: 'relative',
        width: '100%',
        userSelect: 'none',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 🎨 CSS RESPONSIVE: DI PC BREAKOUT 100VW (FULL WIDTH ZERO CELAH), DI HP KOTAK RESPONSIF */}
      <style>{`
        @keyframes bannerProgressLine {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        @media (min-width: 768px) {
          .home-banner-outer-wrap {
            width: 100vw !important;
            position: relative !important;
            left: 50% !important;
            right: 50% !important;
            margin-left: -50vw !important;
            margin-right: -50vw !important;
            margin-bottom: 20px !important;
          }
          .home-banner-card {
            border-radius: 0px !important;
            border-left: none !important;
            border-right: none !important;
            aspect-ratio: 21 / 8 !important;
            max-height: 480px !important;
            min-height: 300px !important;
          }
        }
        @media (max-width: 767px) {
          .home-banner-outer-wrap {
            width: 100% !important;
            margin-bottom: 16px !important;
          }
          .home-banner-card {
            border-radius: 16px !important;
            aspect-ratio: 16 / 7.6 !important;
            max-height: 390px !important;
            min-height: 210px !important;
          }
        }
      `}</style>

      {/* 🖼️ KOTAK BANNER UTAMA */}
      <div
        className="home-banner-card"
        style={{
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: '#0a0f1d',
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.22), 0 2px 8px rgba(0,0,0,0.12)',
          border: '1.5px solid rgba(226, 232, 240, 0.8)',
          cursor: 'pointer',
        }}
        onClick={openLightbox}
        title={isVideo ? 'Klik untuk memutar video layar penuh & suara' : 'Klik untuk melihat brosur / banner layar penuh'}
      >
        {/* ✨ AMBIENT GLOW BACKDROP BLUR (MENGHILANGKAN AREA HITAM KOSONG DI PC/MONITOR) */}
        <div
          style={{
            position: 'absolute',
            inset: '-10%',
            width: '120%',
            height: '120%',
            backgroundImage: `url(${ambientBgImage})`,
            backgroundPosition: 'center',
            backgroundSize: 'cover',
            filter: 'blur(30px) brightness(0.38) saturate(1.4)',
            opacity: 0.85,
            zIndex: 0,
            transform: 'scale(1.1)',
            pointerEvents: 'none',
          }}
        />

        {/* 🎬 / 🖼️ MEDIA UTAMA (DUKUNGAN GAMBAR ATAU VIDEO RESMI) */}
        {isVideo ? (
          ytId ? (
            <div
              style={{
                position: 'relative',
                zIndex: 1,
                width: '100%',
                height: '100%',
                overflow: 'hidden',
                backgroundColor: '#000000',
              }}
            >
              <iframe
                key={`${currentIndex}_${ytId}`}
                src={`https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}&controls=0&showinfo=0&rel=0&modestbranding=1&enablejsapi=1`}
                title={currentBanner.title || 'Video SMK YPK Medan'}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: '100%',
                  height: '100%',
                  minWidth: '100%',
                  minHeight: '100%',
                  transform: 'translate(-50%, -50%) scale(1.15)',
                  border: 'none',
                  pointerEvents: 'none', // Klik tetap membuka lightbox dengan audio aktif
                }}
              />
            </div>
          ) : (
            <video
              key={`${currentIndex}_${mediaUrl}`}
              src={mediaUrl}
              autoPlay
              muted
              loop
              playsInline
              style={{
                position: 'relative',
                zIndex: 1,
                width: '100%',
                height: '100%',
                objectFit: fitMode,
                objectPosition: 'center',
                display: 'block',
              }}
            />
          )
        ) : (
          <img
            key={`${currentIndex}_${fitMode}`}
            src={currentBanner.image_url || '/api/roster-image?type=banner1'}
            alt={currentBanner.title || 'Banner SMK YPK Medan'}
            style={{
              position: 'relative',
              zIndex: 1,
              width: '100%',
              height: '100%',
              objectFit: fitMode,
              objectPosition:
                fitMode === 'cover' &&
                (currentBanner.image_url?.includes('type=banner') || currentBanner.image_url?.includes('banner-spmb'))
                  ? 'center 46%'
                  : 'center',
              transition: 'opacity 0.3s ease-in-out',
            }}
            onError={(e) => {
              if (e.currentTarget.src.indexOf('type=banner1') === -1) {
                e.currentTarget.src = '/api/roster-image?type=banner1';
              }
            }}
          />
        )}

        {/* ⏱️ INDIKATOR TIMER 5 DETIK BERJALAN (PROGRESS BAR ELEGAN) */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '3.5px',
            backgroundColor: 'rgba(255, 255, 255, 0.25)',
            zIndex: 4,
            overflow: 'hidden',
          }}
        >
          <div
            key={`progress_bar_${currentIndex}`}
            style={{
              height: '100%',
              backgroundColor: '#38bdf8',
              boxShadow: '0 0 10px #38bdf8',
              animation: 'bannerProgressLine 5s linear forwards',
            }}
          />
        </div>

        {/* 🏷️ PITA ATAS: SLIDE COUNTER, FIT MODE & TOMBOL MASTER */}
        <div
          style={{
            position: 'absolute',
            top: '12px',
            left: '14px',
            right: '14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: 3,
            pointerEvents: 'none',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', pointerEvents: 'auto', flexWrap: 'wrap' }}>
            <span
              style={{
                backgroundColor: isVideo ? 'rgba(220, 38, 38, 0.88)' : 'rgba(15, 23, 42, 0.82)',
                backdropFilter: 'blur(6px)',
                color: '#f8fafc',
                fontSize: '11px',
                fontWeight: '800',
                padding: '4px 11px',
                borderRadius: '20px',
                border: '1px solid rgba(255,255,255,0.25)',
                letterSpacing: '0.4px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <span>{isVideo ? '🎬 Video Slide' : '📸 Slide'}</span>
              <span>{currentIndex + 1} / {activeSlides.length}</span>
            </span>

            {/* 🔄 TOMBOL TOGGLE MODE PENUH / PAS (UNTUK GAMBAR) */}
            {!isVideo && (
              <button
                type="button"
                onClick={toggleFitMode}
                style={{
                  backgroundColor: 'rgba(15, 23, 42, 0.82)',
                  backdropFilter: 'blur(6px)',
                  color: '#f8fafc',
                  border: '1px solid rgba(255,255,255,0.25)',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  transition: 'all 0.2s',
                }}
                title={fitMode === 'cover' ? 'Ubah ke Mode Pas (Tampil Utuh)' : 'Ubah ke Mode Penuh (Rata Layar)'}
              >
                <span>{fitMode === 'cover' ? '🖼️ Mode Penuh' : '🔍 Mode Pas'}</span>
              </button>
            )}

            {/* 🔊 TOMBOL SUARA & PUTAR PENUH UNTUK SLIDE VIDEO */}
            {isVideo && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openLightbox();
                }}
                style={{
                  backgroundColor: 'rgba(37, 99, 235, 0.88)',
                  backdropFilter: 'blur(6px)',
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.3)',
                  padding: '4px 11px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.4)',
                }}
                title="Buka pemutar video layar penuh dengan audio lengkap"
              >
                <span>🔊</span>
                <span>Putar Bersuara</span>
              </button>
            )}
          </div>

          {isMasterAdmin && onOpenMasterControl && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenMasterControl();
              }}
              style={{
                pointerEvents: 'auto',
                backgroundColor: '#f59e0b',
                color: '#78350f',
                border: '1.5px solid #ffffff',
                padding: '4px 12px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: '900',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)',
                flexShrink: 0,
              }}
              title="Kelola Slide Gambar & Video Beranda (Admin Master)"
            >
              <span>👑</span>
              <span>Kelola Slide</span>
            </button>
          )}
        </div>

        {/* 📜 GRADIENT OVERLAY DI BAGIAN BAWAH DENGAN JUDUL & KETERANGAN */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(to top, rgba(15, 23, 42, 0.94) 0%, rgba(15, 23, 42, 0.65) 60%, transparent 100%)',
            padding: '28px 16px 14px 16px',
            color: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            gap: '12px',
            zIndex: 2,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            {currentBanner.subtitle && (
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: '800',
                  color: '#fde047',
                  backgroundColor: 'rgba(234, 179, 8, 0.28)',
                  border: '1px solid rgba(250, 204, 21, 0.45)',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  display: 'inline-block',
                  marginBottom: '4px',
                  letterSpacing: '0.4px',
                }}
              >
                {currentBanner.subtitle}
              </span>
            )}
            <h3
              style={{
                margin: '2px 0 0 0',
                fontSize: '15px',
                fontWeight: '900',
                lineHeight: 1.3,
                color: '#ffffff',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                textShadow: '0 1px 4px rgba(0,0,0,0.85)',
              }}
            >
              {currentBanner.title || 'SMK YPK MEDAN'}
            </h3>
          </div>

          <div
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.22)',
              backdropFilter: 'blur(5px)',
              padding: '4px 10px',
              borderRadius: '8px',
              fontSize: '10.5px',
              fontWeight: '700',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            }}
          >
            <span>{isVideo ? '▶️' : '🔍'}</span>
            <span>{isVideo ? 'Layar Penuh' : 'Perbesar'}</span>
          </div>
        </div>

        {/* ⬅️ TOMBOL PREVIOUS (PANAH KIRI MELAYANG) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handlePrev();
          }}
          style={{
            position: 'absolute',
            left: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(255, 255, 255, 0.35)',
            color: '#ffffff',
            fontSize: '15px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 3,
            transition: 'background-color 0.2s',
          }}
          title="Slide Sebelumnya"
        >
          ❮
        </button>

        {/* ➡️ TOMBOL NEXT (PANAH KANAN MELAYANG) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
          style={{
            position: 'absolute',
            right: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(255, 255, 255, 0.35)',
            color: '#ffffff',
            fontSize: '15px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 3,
            transition: 'background-color 0.2s',
          }}
          title="Slide Selanjutnya"
        >
          ❯
        </button>
      </div>

      {/* ⚪ ⚫ ⚪ ⚪ ⚪ TITIK INDIKATOR PAGINASI */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px',
          marginTop: '12px',
        }}
      >
        {activeSlides.map((s, idx) => {
          const isSelected = idx === currentIndex;
          const isItemVideo = isVideoMedia(s);
          return (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              style={{
                width: isSelected ? '28px' : '9px',
                height: '9px',
                borderRadius: '5px',
                backgroundColor: isSelected ? (isItemVideo ? '#ef4444' : primaryColor) : '#cbd5e1',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                padding: 0,
                boxShadow: isSelected ? `0 2px 6px ${isItemVideo ? '#ef444460' : primaryColor + '60'}` : 'none',
              }}
              title={`Buka Slide ${idx + 1} (${isItemVideo ? 'Video' : 'Gambar'})`}
            />
          );
        })}
      </div>

      {/* 🔍 LIGHTBOX MODAL: PREVIEW GAMBAR ATAU PEMUTAR VIDEO LAYAR PENUH */}
      {lightboxMedia && (
        <div
          onClick={() => setLightboxMedia(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.92)',
            backdropFilter: 'blur(10px)',
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              width: lightboxMedia.type === 'video' ? 'min(92vw, 980px)' : 'auto',
              maxWidth: '96vw',
              maxHeight: '90vh',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 20px 50px rgba(0,0,0,0.85)',
              backgroundColor: '#0f172a',
            }}
          >
            {/* Tombol Tutup */}
            <button
              onClick={() => setLightboxMedia(null)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                backgroundColor: 'rgba(0,0,0,0.75)',
                color: '#ffffff',
                border: '1.5px solid rgba(255,255,255,0.4)',
                borderRadius: '50%',
                width: '38px',
                height: '38px',
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 15,
              }}
              title="Tutup Pratinjau Layar Penuh"
            >
              ✕
            </button>

            {lightboxMedia.type === 'video' ? (
              lightboxMedia.ytId ? (
                <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', height: 0 }}>
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${lightboxMedia.ytId}?autoplay=1&controls=1&rel=0`}
                    title="Pemutar Video Layar Penuh"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      border: 'none',
                    }}
                  />
                </div>
              ) : (
                <video
                  src={lightboxMedia.url}
                  controls
                  autoPlay
                  playsInline
                  style={{
                    width: '100%',
                    maxHeight: '86vh',
                    display: 'block',
                    backgroundColor: '#000000',
                  }}
                />
              )
            ) : (
              <img
                src={lightboxMedia.url}
                alt={lightboxMedia.title || 'Brosur Layar Penuh'}
                style={{
                  width: '100%',
                  height: '100%',
                  maxHeight: '88vh',
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
            )}

            {/* Keterangan di bawah media jika ada */}
            {(lightboxMedia.title || lightboxMedia.caption) && (
              <div style={{ padding: '14px 18px', backgroundColor: '#0f172a', borderTop: '1px solid #1e293b' }}>
                <h4 style={{ margin: '0 0 4px 0', color: '#ffffff', fontSize: '15px', fontWeight: '800' }}>
                  {lightboxMedia.title}
                </h4>
                {lightboxMedia.caption && (
                  <p style={{ margin: 0, color: '#94a3b8', fontSize: '12px', lineHeight: 1.4 }}>
                    {lightboxMedia.caption}
                  </p>
                )}
              </div>
            )}
          </div>
          <span style={{ color: '#cbd5e1', fontSize: '12px', marginTop: '10px' }}>
            Ketuk di luar area atau tombol ✕ untuk menutup
          </span>
        </div>
      )}
    </div>
  );
}
