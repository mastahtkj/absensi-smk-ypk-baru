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
    title: 'PROFIL & SPMB SMK YPK MEDAN',
    subtitle: 'Video Resmi Sekolah • Akreditasi A',
    image_url: '/banner-spmb-ypk.png',
    video_url: '/banner-video-1.mp4',
    media_type: 'video',
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

    let valid = list.filter((s) => s && s.active !== false);
    if (!valid.length) valid = DEFAULT_BANNER_SLIDES;

    // Pastikan Slide 1 SPMB selalu memiliki video profil jika belum ada video_url
    if (valid.length > 0 && valid[0] && !valid[0].video_url && (!valid[0].media_type || valid[0].media_type === 'image') && (valid[0].id === 1 || valid[0].image_url === '/brosur-spmb-1.jpg' || valid[0].image_url === '/banner-spmb-ypk.png')) {
      valid = [
        {
          ...valid[0],
          media_type: 'video',
          video_url: '/banner-video-1.mp4',
          auto_slide_seconds: valid[0].auto_slide_seconds || 7,
        },
        ...valid.slice(1),
      ];
    }
    return valid;
  }, [banners]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [lightboxMedia, setLightboxMedia] = useState(null); // { type: 'image' | 'video', url: '', ytId?: '' }
  const [isVideoPaused, setIsVideoPaused] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(true); // 🔊 Default muted di awal agar 100% langsung autoplay di HP tanpa jeda/blokir
  const [videoLoadError, setVideoLoadError] = useState(false);
  const videoPlayerRef = useRef(null);

  // Mode Pas (contain) default untuk video agar tajam 100% HD tanpa zoom/crop buram
  const [videoFitMode, setVideoFitMode] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('smk_ypk_banner_video_fit_mode');
        if (saved === 'contain' || saved === 'cover') return saved;
      } catch (e) {}
    }
    return 'contain'; // Default Tajam HD 100% Utuh
  });

  // Mode Penuh (cover) default untuk banner foto brosur
  const [imageFitMode, setImageFitMode] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('smk_ypk_banner_image_fit_mode');
        if (saved === 'contain' || saved === 'cover') return saved;
      } catch (e) {}
    }
    return 'cover';
  });

  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // Auto-advance timer SETIAP 7 DETIK (Disesuaikan sesuai permintaan)
  useEffect(() => {
    if (activeSlides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeSlides.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [currentIndex, activeSlides.length]);

  // 🔊 SINKRONISASI SUARA OTOMATIS: Video langsung berputar di HP, dan begitu ada sentuhan pertama / scroll layar, suara otomatis aktif!
  useEffect(() => {
    setVideoLoadError(false);
    const currentBanner = activeSlides[currentIndex] || activeSlides[0];
    const isVid = isVideoMedia(currentBanner);
    if (!isVid) return;

    const unmuteAudio = () => {
      if (videoPlayerRef.current) {
        try {
          videoPlayerRef.current.muted = false;
          videoPlayerRef.current.volume = 1.0;
          setIsAudioMuted(false);
        } catch (e) {}
      }
      cleanup();
    };

    const cleanup = () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('touchstart', unmuteAudio);
        window.removeEventListener('click', unmuteAudio);
        window.removeEventListener('scroll', unmuteAudio);
        window.removeEventListener('pointerdown', unmuteAudio);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('touchstart', unmuteAudio, { once: true, passive: true });
      window.addEventListener('click', unmuteAudio, { once: true, passive: true });
      window.addEventListener('scroll', unmuteAudio, { once: true, passive: true });
      window.addEventListener('pointerdown', unmuteAudio, { once: true, passive: true });

      // Coba langsung aktifkan suara jika browser mengizinkan
      if (videoPlayerRef.current) {
        videoPlayerRef.current.muted = false;
        videoPlayerRef.current.volume = 1.0;
        videoPlayerRef.current.play().then(() => {
          setIsAudioMuted(false);
        }).catch(() => {
          // Jika kebijakan browser (misal Chrome Android belum ada sentuhan pengguna) memblokir unmuted autoplay,
          // segera putar dalam mode muted agar 100% langsung berputar tanpa terhenti/layar hitam!
          if (videoPlayerRef.current) {
            videoPlayerRef.current.muted = true;
            videoPlayerRef.current.play().catch(() => {});
          }
          setIsAudioMuted(true);
        });
      }
    }

    return cleanup;
  }, [currentIndex, activeSlides]);

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

  // Mode Pas (contain) untuk video agar 100% tajam tidak terpotong / buram, mode cover untuk banner gambar
  const effectiveFit = isVideo ? videoFitMode : imageFitMode;

  const toggleFitMode = (e) => {
    e.stopPropagation();
    if (isVideo) {
      setVideoFitMode((prev) => {
        const next = prev === 'contain' ? 'cover' : 'contain';
        if (typeof window !== 'undefined') {
          try { localStorage.setItem('smk_ypk_banner_video_fit_mode', next); } catch (err) {}
        }
        return next;
      });
    } else {
      setImageFitMode((prev) => {
        const next = prev === 'cover' ? 'contain' : 'cover';
        if (typeof window !== 'undefined') {
          try { localStorage.setItem('smk_ypk_banner_image_fit_mode', next); } catch (err) {}
        }
        return next;
      });
    }
  };

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
      {/* 🎨 CSS RESPONSIVE: DI PC ZERO CELAH RAPI 100%, DI HP KOTAK ELEGAN */}
      <style>{`
        @keyframes bannerProgressLine {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        @media (min-width: 768px) {
          .home-banner-outer-wrap {
            width: 100% !important;
            margin-bottom: 20px !important;
          }
          .home-banner-card {
            border-radius: 18px !important;
            border: 1.5px solid rgba(226, 232, 240, 0.8) !important;
            aspect-ratio: ${isVideo ? '16 / 9' : '16 / 7.2'} !important;
            max-height: ${isVideo ? '480px' : '420px'} !important;
            min-height: 280px !important;
          }
        }
        @media (max-width: 640px) {
          .banner-fit-btn {
            display: none !important;
          }
          .banner-sound-text {
            display: none !important;
          }
          .banner-admin-text {
            display: none !important;
          }
        }
        @media (min-width: 641px) {
          .banner-fit-btn {
            display: inline-flex !important;
          }
        }
        @media (max-width: 767px) {
          .home-banner-outer-wrap {
            width: 100% !important;
            margin-bottom: 16px !important;
          }
          .home-banner-card {
            border-radius: 16px !important;
            aspect-ratio: ${isVideo ? '16 / 9' : '16 / 7.6'} !important;
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
                src={`https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&mute=0&controls=1&loop=1&playlist=${ytId}&modestbranding=1&enablejsapi=1`}
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
                  transform: 'translate(-50%, -50%)',
                  border: 'none',
                  pointerEvents: 'none', // Klik tetap membuka lightbox dengan audio aktif
                }}
              />
            </div>
          ) : (
            <div style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%', overflow: 'hidden' }}>
              {videoLoadError ? (
                <img
                  key={`video_fallback_${currentIndex}`}
                  src={currentBanner.image_url || '/banner-spmb-ypk.png'}
                  alt={currentBanner.title || 'Banner SMK YPK Medan'}
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    width: '100%',
                    height: '100%',
                    objectFit: effectiveFit,
                    objectPosition: 'center',
                    display: 'block',
                  }}
                  onError={(e) => {
                    if (e.currentTarget.src.indexOf('banner-spmb-ypk.png') === -1) {
                      e.currentTarget.src = '/banner-spmb-ypk.png';
                    }
                  }}
                />
              ) : (
                <video
                  ref={(el) => {
                    videoPlayerRef.current = el;
                    if (el) {
                      el.muted = isAudioMuted;
                      el.volume = 1.0;
                      el.playsInline = true;
                      el.setAttribute('playsinline', 'true');
                      el.setAttribute('webkit-playsinline', 'true');
                      const playPromise = el.play();
                      if (playPromise !== undefined) {
                        playPromise.catch(() => {
                          el.muted = true;
                          setIsAudioMuted(true);
                          el.play().catch(() => {});
                        });
                      }
                    }
                  }}
                  key={`${currentIndex}_${mediaUrl}`}
                  src={mediaUrl}
                  poster={currentBanner.image_url || '/banner-spmb-ypk.png'}
                  autoPlay
                  muted={isAudioMuted}
                  loop
                  playsInline
                  preload="auto"
                  onError={() => {
                    setVideoLoadError(true);
                  }}
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    width: '100%',
                    height: '100%',
                    objectFit: effectiveFit,
                    objectPosition: 'center',
                    display: 'block',
                    backgroundColor: 'transparent',
                    imageRendering: '-webkit-optimize-contrast',
                    transform: 'translateZ(0)',
                    backfaceVisibility: 'hidden',
                  }}
                />
              )}
            </div>
          )
        ) : (
          <img
            key={`${currentIndex}_${effectiveFit}`}
            src={currentBanner.image_url || '/api/roster-image?type=banner1'}
            alt={currentBanner.title || 'Banner SMK YPK Medan'}
            style={{
              position: 'relative',
              zIndex: 1,
              width: '100%',
              height: '100%',
              objectFit: effectiveFit,
              objectPosition:
                effectiveFit === 'cover' &&
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

        {/* ⏱️ INDIKATOR TIMER 7 DETIK BERJALAN (PROGRESS BAR ELEGAN) */}
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
              animation: 'bannerProgressLine 7s linear forwards',
            }}
          />
        </div>

        {/* 🏷️ PITA ATAS: SLIDE COUNTER, FIT MODE & TOMBOL MASTER */}
        <div
          style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            right: '10px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: 3,
            pointerEvents: 'none',
            gap: '6px',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', pointerEvents: 'auto', flexWrap: 'nowrap' }}>
            <span
              style={{
                backgroundColor: isVideo ? 'rgba(220, 38, 38, 0.9)' : 'rgba(15, 23, 42, 0.82)',
                backdropFilter: 'blur(6px)',
                color: '#f8fafc',
                fontSize: '11px',
                fontWeight: '800',
                padding: '4px 10px',
                borderRadius: '20px',
                border: '1px solid rgba(255,255,255,0.25)',
                letterSpacing: '0.4px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                whiteSpace: 'nowrap',
              }}
            >
              <span>{isVideo ? '🎬' : '📸'}</span>
              <span>{currentIndex + 1} / {activeSlides.length}</span>
            </span>

            {/* 🔊 TOMBOL SUARA OTOMATIS & TOGGLE AUDIO (COMPACT & SLEEK) */}
            {isVideo && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (videoPlayerRef.current) {
                    const next = !videoPlayerRef.current.muted;
                    videoPlayerRef.current.muted = next;
                    videoPlayerRef.current.volume = 1.0;
                    setIsAudioMuted(next);
                  } else {
                    setIsAudioMuted((prev) => !prev);
                  }
                }}
                style={{
                  backgroundColor: isAudioMuted ? 'rgba(15, 23, 42, 0.85)' : 'rgba(22, 163, 74, 0.92)',
                  backdropFilter: 'blur(6px)',
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.35)',
                  padding: '4px 9px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: isAudioMuted ? '0 2px 6px rgba(0,0,0,0.3)' : '0 2px 8px rgba(22, 163, 74, 0.4)',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                }}
                title={isAudioMuted ? 'Ketuk untuk Menyalakan Suara Video' : 'Suara Aktif (Ketuk untuk Membisukan)'}
              >
                <span>{isAudioMuted ? '🔇' : '🔊'}</span>
                <span className="banner-sound-text">{isAudioMuted ? 'Mute' : 'Suara'}</span>
              </button>
            )}

            {/* 🔄 TOMBOL TOGGLE MODE PAS TAJAM HD / MODE PENUH (Tampil di Tablet/PC) */}
            <button
              type="button"
              className="banner-fit-btn"
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
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              }}
              title={effectiveFit === 'contain' ? 'Ubah ke Mode Penuh (Rata Layar)' : 'Ubah ke Mode Pas (Tampil Utuh HD)'}
            >
              <span>{effectiveFit === 'contain' ? '🔍 Mode Pas' : '🖼️ Mode Penuh'}</span>
            </button>
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
                padding: '4px 9px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: '900',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)',
                flexShrink: 0,
                whiteSpace: 'nowrap',
                maxWidth: 'calc(100% - 110px)',
              }}
              title="Kelola Slide Gambar & Video Beranda (Admin Master)"
            >
              <span>👑</span>
              <span className="banner-admin-text">Kelola</span>
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
