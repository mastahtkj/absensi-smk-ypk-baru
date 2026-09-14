'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';

// 5 SLIDE BANNER RESMI BERDASARKAN BROSUR SPMB & DOKUMENTASI SEKOLAH SMK YPK MEDAN
export const DEFAULT_BANNER_SLIDES = [
  {
    id: 1,
    title: 'SPMB SMK YPK MEDAN 2025/2026',
    subtitle: 'Sistem Penerimaan Murid Baru • Akreditasi A',
    image_url: '/api/roster-image?type=banner1',
    caption: 'Yayasan Pendidikan Keluarga SMKS YPK Medan - Percayakan Pendidikan Putra Putri Anda Pada Kami (Gratis Biaya Pendaftaran)',
    active: true,
  },
  {
    id: 2,
    title: 'Tenaga Pendidik & Kependidikan SMK YPK',
    subtitle: 'Dewan Guru Berdedikasi & Profesional',
    image_url: '/api/roster-image?type=banner1',
    caption: 'Bersama Kepala Sekolah Hartati Patiwael, S.Si & Ketua Yayasan Hj. Darmawati, S.Pd., M.Pd mendidik putra-putri bangsa.',
    active: true,
  },
  {
    id: 3,
    title: 'Gedung & Fasilitas Kampus Terpadu',
    subtitle: 'Laboratorium Bahasa, Komputer, Perpustakaan, UKS & Lapangan Olahraga',
    image_url: '/gedung.png',
    caption: 'Fasilitas pembelajaran modern dan representatif untuk mendukung kompetensi vokasi kejuruan.',
    active: true,
  },
  {
    id: 4,
    title: '4 Kompetensi Keahlian Unggulan',
    subtitle: 'TJKT • AKL • MPLB • Pemasaran (PM)',
    image_url: '/api/roster-image?type=banner1',
    caption: 'Teknik Jaringan Komputer & Telekomunikasi, Akuntansi Keuangan, Manajemen Perkantoran, dan Pemasaran Bisnis.',
    active: true,
  },
  {
    id: 5,
    title: 'Ekstrakurikuler & Pembinaan Bakat Siswa',
    subtitle: 'Pramuka, Paskibra, Futsal, Voli, Tahsin, Marching Band & Pemrograman',
    image_url: '/api/roster-image?type=banner1',
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
  // Parsing banners dari database Supabase
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
      list = DEFAULT_BANNER_SLIDES;
    }

    const valid = list.filter((s) => s && s.active !== false);
    return valid.length > 0 ? valid : DEFAULT_BANNER_SLIDES;
  }, [banners]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // Auto-advance timer setiap 5 detik
  useEffect(() => {
    if (isPaused || activeSlides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeSlides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isPaused, activeSlides.length]);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % activeSlides.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + activeSlides.length) % activeSlides.length);
  };

  // Touch Swipe Handling untuk Layar HP
  const handleTouchStart = (e) => {
    setIsPaused(true);
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    setIsPaused(false);
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

  return (
    <div
      style={{
        marginBottom: '18px',
        position: 'relative',
        width: '100%',
        userSelect: 'none',
      }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 🖼️ KOTAK BANNER UTAMA (RASIO LANDSCAPE RESPONSIF SEPERTI DI BROSUR SPMB) */}
      <div
        style={{
          position: 'relative',
          borderRadius: '18px',
          overflow: 'hidden',
          backgroundColor: '#0f172a',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.16), 0 2px 8px rgba(0,0,0,0.08)',
          border: '1.5px solid rgba(226, 232, 240, 0.8)',
          aspectRatio: '16 / 8.5',
          maxHeight: '380px',
          minHeight: '190px',
          cursor: 'pointer',
        }}
        onClick={() => setLightboxImage(currentBanner.image_url || '/api/roster-image?type=banner1')}
        title="Klik untuk melihat brosur / banner layar penuh"
      >
        {/* GAMBAR BANNER UTAMA */}
        <img
          key={currentIndex}
          src={currentBanner.image_url || '/api/roster-image?type=banner1'}
          alt={currentBanner.title || 'Banner SMK YPK Medan'}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            objectPosition: 'center',
            backgroundColor: '#0f172a',
            transition: 'opacity 0.3s ease-in-out',
          }}
          onError={(e) => {
            // Fallback ke banner default jika link gambar error
            if (e.currentTarget.src.indexOf('type=banner1') === -1) {
              e.currentTarget.src = '/api/roster-image?type=banner1';
            }
          }}
        />

        {/* 🏷️ PITA ATAS: SLIDE COUNTER & TOMBOL MASTER */}
        <div
          style={{
            position: 'absolute',
            top: '10px',
            left: '12px',
            right: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: 2,
            pointerEvents: 'none',
          }}
        >
          <span
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.75)',
              backdropFilter: 'blur(6px)',
              color: '#f8fafc',
              fontSize: '11px',
              fontWeight: '800',
              padding: '4px 10px',
              borderRadius: '20px',
              border: '1px solid rgba(255,255,255,0.2)',
              letterSpacing: '0.4px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            📸 Slide {currentIndex + 1} / {activeSlides.length}
          </span>

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
                padding: '4px 10px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: '900',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)',
              }}
              title="Kelola 5 Slide Banner Gambar (Admin Master)"
            >
              <span>👑</span>
              <span>Ubah Banner</span>
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
            background: 'linear-gradient(to top, rgba(15, 23, 42, 0.92) 0%, rgba(15, 23, 42, 0.6) 65%, transparent 100%)',
            padding: '24px 14px 10px 14px',
            color: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            gap: '10px',
            zIndex: 2,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            {currentBanner.subtitle && (
              <span
                style={{
                  fontSize: '9.5px',
                  fontWeight: '800',
                  color: '#fde047',
                  backgroundColor: 'rgba(234, 179, 8, 0.25)',
                  border: '1px solid rgba(250, 204, 21, 0.4)',
                  padding: '2px 7px',
                  borderRadius: '6px',
                  display: 'inline-block',
                  marginBottom: '3px',
                  letterSpacing: '0.4px',
                }}
              >
                {currentBanner.subtitle}
              </span>
            )}
            <h3
              style={{
                margin: '2px 0 0 0',
                fontSize: '14px',
                fontWeight: '900',
                lineHeight: 1.25,
                color: '#ffffff',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                textShadow: '0 1px 3px rgba(0,0,0,0.8)',
              }}
            >
              {currentBanner.title || 'SMK YPK MEDAN'}
            </h3>
          </div>

          <div
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(4px)',
              padding: '3px 8px',
              borderRadius: '8px',
              fontSize: '10px',
              fontWeight: '700',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              flexShrink: 0,
            }}
          >
            <span>🔍</span>
            <span>Perbesar</span>
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
            left: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 3,
            transition: 'background-color 0.2s',
          }}
          title="Banner Sebelumnya"
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
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 3,
            transition: 'background-color 0.2s',
          }}
          title="Banner Selanjutnya"
        >
          ❯
        </button>
      </div>

      {/* ⚪ ⚫ ⚪ ⚪ ⚪ TITIK INDIKATOR PAGINASI (PERSIS SEPERTI DI GAMBAR CONTOH USER) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px',
          marginTop: '10px',
        }}
      >
        {activeSlides.map((_, idx) => {
          const isSelected = idx === currentIndex;
          return (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              style={{
                width: isSelected ? '26px' : '9px',
                height: '9px',
                borderRadius: '5px',
                backgroundColor: isSelected ? primaryColor : '#cbd5e1',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                padding: 0,
                boxShadow: isSelected ? `0 2px 6px ${primaryColor}60` : 'none',
              }}
              title={`Buka Slide ${idx + 1}`}
            />
          );
        })}
      </div>

      {/* 🔍 LIGHTBOX MODAL: PREVIEW BANNER LAYAR PENUH JIKA DIKETUK */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.88)',
            backdropFilter: 'blur(8px)',
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
              maxWidth: '96vw',
              maxHeight: '90vh',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 20px 50px rgba(0,0,0,0.7)',
              backgroundColor: '#0f172a',
            }}
          >
            <button
              onClick={() => setLightboxImage(null)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                backgroundColor: 'rgba(0,0,0,0.7)',
                color: '#ffffff',
                border: '1.5px solid rgba(255,255,255,0.4)',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
              }}
            >
              ✕
            </button>
            <img
              src={lightboxImage}
              alt="Brosur Layar Penuh"
              style={{
                width: '100%',
                height: '100%',
                maxHeight: '88vh',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </div>
          <span style={{ color: '#cbd5e1', fontSize: '12px', marginTop: '10px' }}>
            Ketuk di luar gambar atau tombol ✕ untuk menutup
          </span>
        </div>
      )}
    </div>
  );
}
