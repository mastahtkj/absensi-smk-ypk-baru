'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';

// DATA DEFAULT 5 FOTO & PROFIL DEWAN GURU SMK YPK MEDAN
export const DEFAULT_TEACHER_SLIDES = [
  {
    id: 1,
    nama: 'Hartati Patiwael, S.Si',
    jabatan: 'Kepala Sekolah SMK YPK Medan',
    mapel: 'Manajemen & Kepemimpinan Sekolah',
    foto_url: '',
    quote: 'Membangun generasi cerdas, berdisiplin tinggi, berkarakter mulia, dan siap bersaing di era digital global.',
    badge: 'Kepala Sekolah',
    active: true,
  },
  {
    id: 2,
    nama: 'Ahmad Fauzi, S.Kom., Gr.',
    jabatan: 'Guru Produktif TJKT & Komputer',
    mapel: 'Teknik Jaringan Komputer & Telekomunikasi',
    foto_url: '',
    quote: 'Teknologi adalah jembatan kreativitas dan kemandirian masa depan. Terus belajar dan pantang menyerah!',
    badge: 'Guru Produktif TJKT',
    active: true,
  },
  {
    id: 3,
    nama: 'Dede Dermawan Lenar, S.Pd., Gr.',
    jabatan: 'Guru & Pembina Kesiswaan',
    mapel: 'Pendidikan Karakter & Kedisiplinan',
    foto_url: '',
    quote: 'Disiplin hari ini adalah kunci kehormatan dan kesuksesan di masa depan. Kejujuran di atas segalanya.',
    badge: 'Pembina Siswa',
    active: true,
  },
  {
    id: 4,
    nama: 'Y E N N I, SE',
    jabatan: 'Guru Bidang Bisnis & Manajemen',
    mapel: 'Ekonomi & Kewirausahaan Digital',
    foto_url: '',
    quote: 'Kemandirian finansial dan etika profesional dimulai dari ketekunan belajar di bangku sekolah.',
    badge: 'Guru Kejuruan',
    active: true,
  },
  {
    id: 5,
    nama: 'Hendrawan, ST',
    jabatan: 'Guru Produktif Teknologi Rekayasa',
    mapel: 'Teknologi Rekayasa & Praktik Industri',
    foto_url: '',
    quote: 'Keahlian vokasi sejati lahir dari konsistensi praktik nyata, ketelitian, dan inovasi tanpa henti.',
    badge: 'Guru Produktif',
    active: true,
  },
];

export default function TeacherPhotoSlider({
  slides = [],
  guruList = [],
  primaryColor = '#1e40af',
  accentColor = '#3b82f6',
  isMasterAdmin = false,
  onOpenMasterControl,
}) {
  // Parsing slides jika tersimpan dalam bentuk string JSON atau array
  const activeSlides = useMemo(() => {
    let list = slides;
    if (typeof list === 'string') {
      try {
        list = JSON.parse(list);
      } catch (e) {
        list = [];
      }
    }
    if (!Array.isArray(list) || list.length === 0) {
      list = DEFAULT_TEACHER_SLIDES;
    }

    // Pastikan tepat 5 slide (atau minimal 1)
    const valid = list.filter((s) => s && s.active !== false);
    return valid.length > 0 ? valid : DEFAULT_TEACHER_SLIDES;
  }, [slides]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // Auto-advance timer setiap 5 detik (pause saat di-hover/di-sentuh)
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

  // Touch Swipe Handling untuk Layar HP Smartphone
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
    if (Math.abs(diff) > 45) {
      if (diff > 0) {
        handleNext(); // Geser ke kiri -> Next
      } else {
        handlePrev(); // Geser ke kanan -> Prev
      }
    }
  };

  const currentSlide = activeSlides[currentIndex] || activeSlides[0];

  // Cari foto alternatif dari guruList jika foto_url di slide masih kosong
  const effectivePhoto = useMemo(() => {
    if (currentSlide?.foto_url && currentSlide.foto_url.trim().length > 4) {
      return currentSlide.foto_url.trim();
    }
    if (Array.isArray(guruList) && guruList.length > 0 && currentSlide?.nama) {
      const match = guruList.find((g) => {
        const gNama = (g.nama || g.nama_guru || '').toLowerCase();
        const sNama = currentSlide.nama.toLowerCase();
        return gNama.includes(sNama) || sNama.includes(gNama);
      });
      if (match?.foto_url) return match.foto_url;
    }
    return '';
  }, [currentSlide, guruList]);

  const initials = useMemo(() => {
    if (!currentSlide?.nama) return 'YP';
    const words = currentSlide.nama.trim().split(' ').filter(Boolean);
    if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toUpperCase();
    return (words[0] || 'YP').substring(0, 2).toUpperCase();
  }, [currentSlide?.nama]);

  return (
    <div
      style={{
        marginBottom: '16px',
        position: 'relative',
        borderRadius: '18px',
        overflow: 'hidden',
        boxShadow: '0 8px 24px rgba(30, 64, 175, 0.12), 0 2px 8px rgba(0,0,0,0.06)',
        border: '1.5px solid rgba(226, 232, 240, 0.9)',
        background: '#ffffff',
      }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 🏷️ HEADER PITA SLIDER GURU */}
      <div
        style={{
          background: `linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%)`,
          padding: '7px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#ffffff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '15px' }}>👨‍🏫</span>
          <span style={{ fontSize: '12px', fontWeight: '800', letterSpacing: '0.4px' }}>
            DEWAN GURU &amp; TENAGA PENDIDIK
          </span>
          <span
            style={{
              fontSize: '10px',
              backgroundColor: 'rgba(255, 255, 255, 0.22)',
              padding: '1.5px 7px',
              borderRadius: '10px',
              fontWeight: '700',
            }}
          >
            Slide {currentIndex + 1} / {activeSlides.length}
          </span>
        </div>

        {/* TOMBOL EDIT KHUSUS MASTER ADMIN */}
        {isMasterAdmin && onOpenMasterControl && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenMasterControl();
            }}
            title="Kelola 5 Slide Foto Guru (Hanya Admin Master)"
            style={{
              backgroundColor: '#fef08a',
              color: '#854d0e',
              border: 'none',
              padding: '3px 8px',
              borderRadius: '8px',
              fontSize: '10.5px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            }}
          >
            <span>👑</span>
            <span>Ubah Slide</span>
          </button>
        )}
      </div>

      {/* 🖼️ KONTEN KARTU SLIDE GURU (RESPONSIF MOBILE & DESKTOP) */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: '16px',
          padding: '14px 16px',
          background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
          minHeight: '140px',
        }}
      >
        {/* 📸 FOTO GURU ATAU AVATAR INISIAL MEWAH */}
        <div
          style={{
            width: '90px',
            height: '90px',
            flexShrink: 0,
            borderRadius: '18px',
            overflow: 'hidden',
            border: `2.5px solid ${accentColor}`,
            boxShadow: `0 6px 16px ${primaryColor}30`,
            backgroundColor: '#f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          {effectivePhoto ? (
            <img
              src={effectivePhoto}
              alt={currentSlide.nama}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'top center',
              }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const fallback = e.currentTarget.nextSibling;
                if (fallback) fallback.style.display = 'flex';
              }}
            />
          ) : null}

          {/* FALLBACK AVATAR DENGAN INISIAL JIKA FOTO TIDAK TERSEDIA */}
          <div
            style={{
              display: effectivePhoto ? 'none' : 'flex',
              width: '100%',
              height: '100%',
              background: `linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%)`,
              color: '#ffffff',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '900',
              fontSize: '24px',
              letterSpacing: '1px',
              textShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}
          >
            {initials}
          </div>

          {/* BADGE DI ATAS FOTO */}
          <span
            style={{
              position: 'absolute',
              bottom: '3px',
              left: '3px',
              right: '3px',
              backgroundColor: 'rgba(15, 23, 42, 0.85)',
              color: '#fef08a',
              fontSize: '8.5px',
              fontWeight: 'bold',
              textAlign: 'center',
              padding: '1.5px 2px',
              borderRadius: '5px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              backdropFilter: 'blur(2px)',
            }}
          >
            ⭐ YPK
          </span>
        </div>

        {/* 📝 DESKRIPSI, NAMA & BIOGRAFI GURU */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '3px' }}>
            <span
              style={{
                fontSize: '10px',
                fontWeight: '800',
                backgroundColor: `${primaryColor}15`,
                color: primaryColor,
                padding: '2px 8px',
                borderRadius: '6px',
                border: `1px solid ${primaryColor}30`,
              }}
            >
              {currentSlide.badge || 'Dewan Guru'}
            </span>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>•</span>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
              {currentSlide.jabatan || 'Tenaga Pendidik SMK YPK'}
            </span>
          </div>

          <h3
            style={{
              margin: '2px 0 4px 0',
              fontSize: '15.5px',
              fontWeight: '900',
              color: '#0f172a',
              lineHeight: 1.25,
            }}
          >
            {currentSlide.nama}
          </h3>

          {currentSlide.mapel && (
            <div style={{ fontSize: '11.5px', color: '#0369a1', fontWeight: '700', marginBottom: '5px' }}>
              📚 {currentSlide.mapel}
            </div>
          )}

          {currentSlide.quote && (
            <p
              style={{
                margin: 0,
                fontSize: '11px',
                color: '#475569',
                fontStyle: 'italic',
                lineHeight: 1.4,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              &ldquo;{currentSlide.quote}&rdquo;
            </p>
          )}
        </div>
      </div>

      {/* 🧭 FOOTER NAVIGASI: TOMBOL PREV/NEXT & 5 TITIK PAGINASI */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 14px',
          backgroundColor: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
        }}
      >
        <button
          onClick={handlePrev}
          style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            color: '#475569',
            borderRadius: '8px',
            width: '28px',
            height: '28px',
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
          }}
          title="Slide Sebelumnya"
        >
          ❮
        </button>

        {/* 5 TITIK INDIKATOR */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {activeSlides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              style={{
                width: idx === currentIndex ? '22px' : '8px',
                height: '8px',
                borderRadius: '4px',
                backgroundColor: idx === currentIndex ? primaryColor : '#cbd5e1',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                padding: 0,
              }}
              title={`Buka Slide ${idx + 1}`}
            />
          ))}
        </div>

        <button
          onClick={handleNext}
          style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            color: '#475569',
            borderRadius: '8px',
            width: '28px',
            height: '28px',
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
          }}
          title="Slide Selanjutnya"
        >
          ❯
        </button>
      </div>
    </div>
  );
}
