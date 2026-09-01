'use client';

import React, { useState, useEffect, useRef } from 'react';

// 🔔 AUDIO SYNTHESIZER UTILITY (SMK YPK SUPER APP)
// 100% Web Audio API + SpeechSynthesis API (Zero Dependencies, Offline Ready, 60fps)
let notificationAudioCtx = null;

const getNotificationAudioCtx = () => {
  if (typeof window === 'undefined') return null;
  try {
    const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtxClass) return null;
    if (!notificationAudioCtx) {
      notificationAudioCtx = new AudioCtxClass();
    }
    if (notificationAudioCtx.state === 'suspended') {
      notificationAudioCtx.resume().catch(() => {});
    }
    return notificationAudioCtx;
  } catch (e) {
    return null;
  }
};

// 🔘 1. SUARA KLIK MENU KHAS (CRISP ULTRA-MODERN SOFT POP / TICK)
export const playMenuClickSound = () => {
  try {
    const ctx = getNotificationAudioCtx();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Nada pop modern 680Hz -> 320Hz cepat (0.045 detik)
    osc.type = 'sine';
    osc.frequency.setValueAtTime(680, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.04);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.045);
  } catch (e) {
    // Non-blocking
  }
};

// 📑 2. SUARA PERPINDAHAN TAB / SUB-MENU (GENTLE MICRO-CHIME)
export const playTabSwitchSound = () => {
  try {
    const ctx = getNotificationAudioCtx();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(540, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.06);

    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.065);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.065);
  } catch (e) {
    // Non-blocking
  }
};

// ✨ 3. SUARA AKSI BERHASIL / POSITIVE CHIME
export const playSuccessSound = () => {
  try {
    const ctx = getNotificationAudioCtx();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [
      { freq: 523.25, delay: 0.0, dur: 0.12 },
      { freq: 659.25, delay: 0.06, dur: 0.14 },
      { freq: 783.99, delay: 0.12, dur: 0.16 },
      { freq: 1046.50, delay: 0.18, dur: 0.35 },
    ];

    notes.forEach(({ freq, delay, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + delay);

      gain.gain.setValueAtTime(0.18, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + delay);
      osc.stop(now + delay + dur);
    });
  } catch (e) {
    // Non-blocking
  }
};

// 🔔 4. SUARA BEL NOTIFIKASI LONCENG KRISTAL MEWAH
export const playNotificationChime = () => {
  try {
    const ctx = getNotificationAudioCtx();
    if (!ctx) return;

    const playHarmonics = () => {
      const now = ctx.currentTime;
      // 4 Nada Harmonis Kristal Mewah (E6, G#6, B6, E7)
      const tones = [
        { freq: 1318.51, delay: 0.0, gain: 0.28, duration: 0.55 },
        { freq: 1661.22, delay: 0.07, gain: 0.32, duration: 0.65 },
        { freq: 1975.53, delay: 0.14, gain: 0.35, duration: 0.8 },
        { freq: 2637.02, delay: 0.21, gain: 0.38, duration: 1.0 },
      ];

      tones.forEach(({ freq, delay, gain, duration }) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + delay);

        gainNode.gain.setValueAtTime(0, now + delay);
        gainNode.gain.linearRampToValueAtTime(gain, now + delay + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + delay + duration);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start(now + delay);
        osc.stop(now + delay + duration);
      });
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(playHarmonics).catch(() => {});
    } else {
      playHarmonics();
    }
  } catch (e) {
    console.warn('Audio chime failed to play:', e);
  }
};

// 🏫 5. SUARA AUDIO ASLI BEL SEKOLAH (FOLDER BEL JAM PELAJARAN V4)
export const playSchoolBellAudio = (audioKeyOrType = 'les-1', callback) => {
  if (typeof window === 'undefined') {
    if (callback) callback();
    return;
  }

  try {
    const key = String(audioKeyOrType || 'les-1').toLowerCase();
    const audioUrl = `/api/bel?type=${encodeURIComponent(key)}`;
    const audio = new Audio(audioUrl);
    audio.volume = 1.0;

    let hasCalledBack = false;
    const finishCallback = () => {
      if (!hasCalledBack) {
        hasCalledBack = true;
        if (callback) callback();
      }
    };

    audio.onended = finishCallback;
    audio.onerror = () => {
      // Fallback aman jika audio error
      playSchoolBellMelody(finishCallback);
    };

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Fallback jika browser memblokir autoplay HTML5 audio
        playSchoolBellMelody(finishCallback);
      });
    }
  } catch (e) {
    playSchoolBellMelody(callback);
  }
};

// 🏫 5b. SUARA MELODI LONCENG BACKUP (WESTMINSTER CHIME MELODY)
export const playSchoolBellMelody = (callback) => {
  try {
    const ctx = getNotificationAudioCtx();
    if (!ctx) {
      if (callback) callback();
      return;
    }

    const now = ctx.currentTime;
    const bellNotes = [
      { freq: 329.63, time: 0.0, dur: 0.65 },
      { freq: 261.63, time: 0.55, dur: 0.65 },
      { freq: 293.66, time: 1.1, dur: 0.65 },
      { freq: 196.00, time: 1.65, dur: 1.2 },
    ];

    bellNotes.forEach(({ freq, time, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + time);
      gain.gain.setValueAtTime(0, now + time);
      gain.gain.linearRampToValueAtTime(0.4, now + time + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + time);
      osc.stop(now + time + dur);
    });

    if (callback) {
      setTimeout(callback, 2800);
    }
  } catch (e) {
    if (callback) callback();
  }
};

// ⏰ 7. JADWAL RESMI BEL JAM PELAJARAN V4 (SESUAI ROSTER SENIN - JUMAT HINGGA LES 11)
export const SCHOOL_BELL_SCHEDULE = [
  { time: '07:15', slot: '5 Menit Awal', audioKey: '5-menit-awal', label: '5 Menit Awal Jam Pelajaran Ke-1 (07:15 WIB)', file: '5 Menit Awal Jam Pelajaran ke 1 (IND - ENG).mp3' },
  { time: '07:20', slot: 'Les 1', audioKey: 'les-1', label: 'Pelajaran Ke-1 Dimulai (07:20 - 08:00 WIB)', file: 'Pelajaran ke 1 Dimulai V4 (IND - ENG).mp3' },
  { time: '08:00', slot: 'Les 2', audioKey: 'les-2', label: 'Pelajaran Ke-2 Dimulai (08:00 - 08:40 WIB)', file: 'Pelajaran ke 2 Dimulai V4 (IND - ENG).mp3' },
  { time: '08:40', slot: 'Les 3', audioKey: 'les-3', label: 'Pelajaran Ke-3 Dimulai (08:40 - 09:20 WIB)', file: 'Pelajaran ke 3 Dimulai V4 (IND - ENG).mp3' },
  { time: '09:20', slot: 'Les 4', audioKey: 'les-4', label: 'Pelajaran Ke-4 Dimulai (09:20 - 10:00 WIB)', file: 'Pelajaran ke 4 Dimulai V4 (IND - ENG).mp3' },
  { time: '10:00', slot: 'Istirahat 1', audioKey: 'istirahat-1', label: 'Istirahat Pertama (10:00 - 10:20 WIB)', file: 'Istirahat Pertama (IND - ENG).mp3' },
  { time: '10:20', slot: 'Les 5', audioKey: 'les-5', label: 'Pelajaran Ke-5 Dimulai (10:20 - 11:00 WIB)', file: 'Pelajaran ke 5 Dimulai V4 (IND - ENG).mp3' },
  { time: '11:00', slot: 'Les 6', audioKey: 'les-6', label: 'Pelajaran Ke-6 Dimulai (11:00 - 11:40 WIB)', file: 'Pelajaran ke 6 Dimulai V4 (IND - ENG).mp3' },
  { time: '11:40', slot: 'Les 7', audioKey: 'les-7', label: 'Pelajaran Ke-7 Dimulai (11:40 - 12:20 WIB)', file: 'Pelajaran ke 7 Dimulai V4 (IND - ENG).mp3' },
  { time: '12:20', slot: 'Istirahat 2', audioKey: 'istirahat-2', label: 'Istirahat Kedua & ISOMA (12:20 - 13:00 WIB)', file: 'Istirahat Kedua (IND - ENG).mp3' },
  { time: '13:00', slot: 'Les 8', audioKey: 'les-8', label: 'Pelajaran Ke-8 Dimulai (13:00 - 13:40 WIB)', file: 'Pelajaran ke 8 Dimulai V4 (IND - ENG).mp3' },
  { time: '13:40', slot: 'Les 9', audioKey: 'les-9', label: 'Pelajaran Ke-9 Dimulai (13:40 - 14:20 WIB)', file: 'Pelajaran ke 9 Dimulai V4 (IND - ENG).mp3' },
  { time: '14:20', slot: 'Les 10', audioKey: 'les-10', label: 'Pelajaran Ke-10 Dimulai (14:20 - 15:00 WIB)', file: 'Pelajaran ke 10 Dimulai V4 (IND - ENG).mp3' },
  { time: '15:00', slot: 'Les 11', audioKey: 'les-11', label: 'Pelajaran Ke-11 Dimulai (15:00 - 15:40 WIB)', file: 'Pelajaran ke 11 Dimulai V4 (IND - ENG).mp3' },
  { time: '15:40', slot: 'Akhir Pelajaran', audioKey: 'pulang', label: 'Akhir Pelajaran KBM (15:40 WIB)', file: 'Akhir Pelajaran V4 (IND - ENG).mp3' },
  { time: '11:35', slot: 'Sholat Jumat', audioKey: 'sholat-jumat', label: 'Kegiatan Ibadah Sholat Jumat Dimulai (11:35 WIB)', file: 'Kegiatan Ibadah Sholat Jumat Dimulai V4 (IND - ENG).mp3' },
];

// 📱 8. PEMICU NOTIFIKASI SISTEM & GETAR HP (GOOGLE CHROME PWA & WEB LINK)
export const triggerSystemNotification = (title, body, tag = 'smk-ypk-notif', data = { url: '/' }) => {
  if (typeof window === 'undefined') return;

  // 📳 1. Getar HP Android (Vibration API)
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate([300, 100, 300, 100, 300]);
    } catch (e) {}
  }

  // 🔔 2. Pop-up Notifikasi Sistem Android / Windows (Service Worker / Notification API)
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready
          .then((reg) => {
            if (reg && typeof reg.showNotification === 'function') {
              return reg.showNotification(title || 'SMK YPK MEDAN', {
                body: body || 'Pemberitahuan baru dari SMK YPK Super App',
                icon: '/logo.png',
                badge: '/logo.png',
                tag: tag || `notif-${Date.now()}`,
                renotify: true,
                vibrate: [300, 100, 300, 100, 300],
                data: data,
              });
            }
          })
          .catch((err) => {
            console.warn('SW notification error:', err);
          });
      } else {
        try {
          new Notification(title || 'SMK YPK MEDAN', {
            body: body,
            icon: '/logo.png',
            badge: '/logo.png',
            tag: tag,
          });
        } catch (err) {}
      }
    }
  } catch (e) {
    console.warn('System notification dispatch notice:', e);
  }
};

// 🔊 9. FUNGSI UTAMA: BUNYIKAN SUARA BEL DARI FOLDER BEL JAM PELAJARAN V4 & NOTIFIKASI SISTEM
export const triggerSchoolBellAnnouncement = (scheduleItem, onComplete) => {
  const audioKey = scheduleItem?.audioKey || scheduleItem?.slot || scheduleItem?.period || 'les-1';
  playSchoolBellAudio(audioKey, onComplete);
  triggerSystemNotification(
    `🔔 ${scheduleItem?.label || 'Bel Jam Pelajaran SMK YPK'}`,
    'Waktu pergantian jam KBM / istirahat resmi sekolah.',
    `bell-${audioKey}-${Date.now()}`
  );
};

export default function NotificationCenter({
  isOpen,
  onClose,
  notifications = [],
  onMarkItemRead,
  onMarkAllRead,
  onClearAllNotifications,
  onOpenNewsDetail,
  onNavigate,
  currentUser,
  isMasterIqbal,
  isAdmin,
}) {
  const [filterType, setFilterType] = useState('semua'); // 'semua' | 'presensi' | 'roster' | 'inval' | 'berita' | 'bel'

  const isMasterAdmin = Boolean(
    isMasterIqbal ||
    isAdmin ||
    currentUser?.role?.toLowerCase() === 'admin' ||
    currentUser?.role?.toLowerCase() === 'master' ||
    currentUser?.username?.toLowerCase() === 'iqbal' ||
    currentUser?.username?.toLowerCase() === 'admin'
  );

  // 👑 FITUR ADMIN MASTER: HAPUS SEMUA NOTIFIKASI SISWA & GURU (1 TOMBOL)
  const handleMasterClearAll = () => {
    playMenuClickSound();
    if (typeof window !== 'undefined' && window.Swal) {
      window.Swal.fire({
        title: 'Hapus Semua Notifikasi?',
        text: '👑 Tindakan Admin Master: Seluruh riwayat notifikasi Guru & Siswa akan dihapus bersih dalam 1 kali klik.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Ya, Bersihkan Semua!',
        cancelButtonText: 'Batal',
        reverseButtons: true,
      }).then((result) => {
        if (result.isConfirmed) {
          if (onClearAllNotifications) {
            onClearAllNotifications();
          }
          window.Swal.fire({
            title: 'Berhasil Dikosongkan!',
            text: 'Semua notifikasi sekolah telah dibersihkan oleh Admin Master.',
            icon: 'success',
            timer: 1800,
            showConfirmButton: false,
          });
        }
      });
    } else {
      if (window.confirm('👑 Konfirmasi Admin Master: Hapus seluruh notifikasi Siswa dan Guru sekarang?')) {
        if (onClearAllNotifications) {
          onClearAllNotifications();
        }
      }
    }
  };

  // Keyboard Escape listener untuk menutup modal dengan mudah
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Jika bukan Master Admin tetapi filterType berada di 'bel', reset ke 'semua'
  useEffect(() => {
    if (filterType === 'bel' && !isMasterAdmin) {
      setFilterType('semua');
    }
  }, [filterType, isMasterAdmin]);

  // ⏰ Filter otomatis: Hanya tampilkan notifikasi yang berusia < 24 Jam
  // 🔒 FILTER PRIVASI NOTIFIKASI KETAT:
  // 1. Notifikasi Pembaruan Foto Profil (foto_profil) HANYA BISA DILIHAT OLEH MASTER ADMIN.
  // 2. Notifikasi Tap Presensi (presensi_tap) HANYA BISA DILIHAT OLEH AKUN PEMILIK (Tidak spam ke akun lain).
  // 3. Notifikasi Tugas Inval (inval_tugas / inval_info) HANYA BISA DILIHAT OLEH GURU TERKAIT.
  // 4. Berita Mading & Roster KBM bersifat umum.
  const isNotificationForThisUser = (item) => {
    if (!item) return false;

    // 🔒 1. NOTIFIKASI FOTO PROFIL: HANYA MASTER ADMIN YANG DAPAT NOTIF (Siswa & Guru Biasa Jangan!)
    if (item.type === 'foto_profil') {
      return Boolean(isMasterAdmin);
    }

    // 🔒 2. NOTIFIKASI TAP RFID: HANYA UNTUK PEMILIK KARTU/AKUN YANG LOGIN
    if (item.type === 'presensi_tap') {
      const curNama = String(currentUser?.nama || '').toLowerCase().trim();
      const itemNama = String(item.nama || '').toLowerCase().trim();
      const curUid = String(currentUser?.uid_rfid || currentUser?.rfid_uid || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      const itemUid = String(item.uid || item.rfid_uid || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();

      const cleanCurNama = curNama.replace(/[^a-z0-9]/g, '');
      const cleanItemNama = itemNama.replace(/[^a-z0-9]/g, '');

      // Inisial Guru match
      const curInisial = String(currentUser?.inisial || '').toUpperCase().trim();
      const itemInisial = String(item.inisial || '').toUpperCase().trim();
      const matchInisial = Boolean(curInisial && itemInisial && curInisial === itemInisial);

      const matchNama = Boolean(
        cleanCurNama && cleanItemNama &&
        (cleanCurNama === cleanItemNama || cleanItemNama.includes(cleanCurNama) || cleanCurNama.includes(cleanItemNama))
      );
      const matchUid = Boolean(curUid && itemUid && curUid !== '-' && itemUid !== '-' && curUid === itemUid);
      return matchNama || matchUid || matchInisial;
    }

    // 🔒 3. NOTIFIKASI TUGAS INVAL: HANYA UNTUK GURU TERKAIT
    if (item.type === 'inval_tugas' || item.type === 'inval_info') {
      const curNama = String(currentUser?.nama || '').toLowerCase().trim();
      const guruInval = String(item.guru_inval || '').toLowerCase().trim();
      const guruUtama = String(item.guru_utama || '').toLowerCase().trim();
      return Boolean(curNama && (curNama === guruInval || curNama === guruUtama));
    }

    // 🔒 4. NOTIFIKASI JADWAL ROSTER KBM: HANYA TAMPIL SESUAI JADWAL GURU/SISWA BERSANGKUTAN
    if (item.kategori === 'Jadwal Roster KBM' || item.type === 'pergantian_les') {
      const isGuruAccount = Boolean(
        currentUser?.isGuru ||
        isMasterIqbal ||
        currentUser?.role?.toLowerCase() === 'admin' ||
        currentUser?.role?.toLowerCase() === 'guru' ||
        currentUser?.role?.toLowerCase() === 'master'
      ) && !String(currentUser?.id).startsWith('SISWA-');

      if (item.targetGuru) {
        if (!isGuruAccount) return false;
        const curNama = String(currentUser?.nama || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
        const targetGuru = String(item.targetGuru).toLowerCase().trim().replace(/[^a-z0-9]/g, '');
        return Boolean(curNama && targetGuru && (curNama === targetGuru || targetGuru.includes(curNama) || curNama.includes(targetGuru)));
      }

      if (item.targetKelas) {
        if (isGuruAccount) return false;
        const userKelas = String(currentUser?.kelas || '').toUpperCase().trim();
        const targetKelas = String(item.targetKelas).toUpperCase().trim();
        return Boolean(userKelas && targetKelas && (userKelas === targetKelas || targetKelas.includes(userKelas) || userKelas.includes(targetKelas)));
      }
    }

    return true;
  };

  const now = Date.now();
  const valid24hNotifications = notifications.filter(
    (item) => (!item.timestamp || now - item.timestamp < 24 * 60 * 60 * 1000) && isNotificationForThisUser(item)
  );

  const filteredList = valid24hNotifications.filter((item) => {
    if (filterType === 'inval') return item.type === 'inval_tugas' || item.type === 'inval_info';
    if (filterType === 'presensi') return item.type === 'presensi_tap';
    if (filterType === 'roster') return item.type === 'pergantian_les' || item.type === 'kepulangan_otomatis' || item.type === 'istirahat' || item.kategori === 'Jadwal Roster KBM';
    if (filterType === 'berita') return item.type === 'berita_sekolah' || item.type === 'foto_profil';
    return true;
  });

  const unreadCount = valid24hNotifications.filter((n) => !n.isRead).length;

  const availableTabs = [
    { id: 'semua', label: 'Semua', icon: '✨' },
    { id: 'presensi', label: 'Tap RFID', icon: '📡' },
    { id: 'roster', label: 'Roster KBM', icon: '📚' },
    { id: 'inval', label: 'Inval Guru', icon: '🧑‍🏫' },
    { id: 'berita', label: 'Info & Berita', icon: '📢' },
    ...(isMasterAdmin ? [{ id: 'bel', label: 'Bel Jam Pelajaran V4', icon: '🔔' }] : []),
  ];

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 999999,
        display: 'flex',
        justifyContent: 'flex-end',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          height: '100%',
          backgroundColor: '#ffffff',
          boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'slideLeft 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER DRAWER NOTIFIKASI */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)',
            color: '#ffffff',
            padding: '16px 18px',
            paddingTop: 'max(16px, env(safe-area-inset-top, 16px))',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                flexShrink: 0,
              }}
            >
              🔔
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', letterSpacing: '0.3px' }}>
                  Pusat Notifikasi
                </h3>
                {unreadCount > 0 && (
                  <span
                    style={{
                      fontSize: '10px',
                      backgroundColor: '#ef4444',
                      color: '#ffffff',
                      fontWeight: '800',
                      padding: '2px 7px',
                      borderRadius: '10px',
                    }}
                  >
                    {unreadCount} Baru
                  </span>
                )}
              </div>
              <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#94a3b8' }}>
                Otomatis diperbarui &bull; Bersih per 24 Jam
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {/* 🟢 TOMBOL BACA SEMUA (TANDAI SEMUA TERBACA) */}
            <button
              type="button"
              onClick={() => {
                playMenuClickSound();
                if (onMarkAllRead) {
                  onMarkAllRead();
                } else if (onMarkItemRead) {
                  valid24hNotifications.forEach((n) => onMarkItemRead(n.id));
                }
              }}
              style={{
                backgroundColor: unreadCount > 0 ? '#16a34a' : 'rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                border: unreadCount > 0 ? '1px solid #22c55e' : '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '16px',
                padding: '5px 11px',
                fontSize: '11px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.2s',
                touchAction: 'manipulation',
                boxShadow: unreadCount > 0 ? '0 2px 8px rgba(22, 163, 74, 0.35)' : 'none',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#15803d';
                e.currentTarget.style.transform = 'scale(1.03)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = unreadCount > 0 ? '#16a34a' : 'rgba(255, 255, 255, 0.15)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
              title="Tandai Semua Notifikasi Sebagai Sudah Dibaca"
            >
              <span>✓✓</span>
              <span>Baca Semua</span>
            </button>

            {/* 👑 TOMBOL HAPUS SEMUA NOTIFIKASI (KHUSUS ADMIN MASTER) */}
            {isMasterAdmin && (
              <button
                type="button"
                onClick={handleMasterClearAll}
                style={{
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  border: '1px solid #ef4444',
                  borderRadius: '16px',
                  padding: '5px 11px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.2s',
                  touchAction: 'manipulation',
                  boxShadow: '0 2px 8px rgba(220, 38, 38, 0.35)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#b91c1c';
                  e.currentTarget.style.transform = 'scale(1.03)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#dc2626';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                title="👑 Khusus Admin Master: Hapus Seluruh Notifikasi Guru & Siswa Sekali Klik"
              >
                <span>🗑️</span>
                <span>Hapus Semua</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                color: '#ffffff',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                touchAction: 'manipulation',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#ef4444')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)')}
              title="Tutup Notifikasi"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 👑 MASTER ADMIN CONTROL BANNER */}
        {isMasterAdmin && (
          <div
            style={{
              backgroundColor: '#fef2f2',
              borderBottom: '1px solid #fee2e2',
              padding: '8px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#991b1b', fontWeight: '800' }}>
              <span>👑</span>
              <span>Panel Master: {valid24hNotifications.length} Notifikasi Aktif</span>
            </div>
            <button
              type="button"
              onClick={handleMasterClearAll}
              style={{
                backgroundColor: '#dc2626',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '4px 10px',
                fontSize: '10.5px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 1px 4px rgba(220, 38, 38, 0.25)',
                transition: 'all 0.15s ease',
              }}
              title="Hapus Seluruh Notifikasi Guru & Siswa Sekali Klik"
            >
              <span>🗑️</span>
              <span>Kosongkan Semua (1-Klik)</span>
            </button>
          </div>
        )}

        {/* TAB FILTER KATEGORI NOTIFIKASI & ACTION BAR */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              overflowX: 'auto',
              flex: 1,
            }}
          >
            {availableTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
              onClick={() => {
                playTabSwitchSound();
                setFilterType(tab.id);
              }}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: filterType === tab.id ? '1px solid #2563eb' : '1px solid #cbd5e1',
                backgroundColor: filterType === tab.id ? '#2563eb' : '#ffffff',
                color: filterType === tab.id ? '#ffffff' : '#475569',
                fontSize: '11px',
                fontWeight: filterType === tab.id ? 'bold' : '600',
                cursor: 'pointer',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                whiteSpace: 'nowrap',
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
          </div>
        </div>

        {/* DAFTAR NOTIFIKASI ATAU JADWAL BEL SEKOLAH */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '14px',
            backgroundColor: '#f1f5f9',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          {/* TAB KHUSUS: BEL SEKOLAH OTOMATIS V4 */}
          {filterType === 'bel' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ backgroundColor: '#eff6ff', borderRadius: '12px', padding: '12px 14px', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '13px', color: '#1e40af', fontWeight: '800' }}>
                    🔔 Bel Otomatis Jam Pelajaran V4 (IND - ENG)
                  </h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#3b82f6' }}>
                    Berbunyi otomatis di setiap pergantian les (Senin - Jumat hingga Les 11)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    playMenuClickSound();
                    triggerSchoolBellAnnouncement({
                      audioKey: 'les-1',
                      label: 'Uji Coba Bel Pelajaran Ke-1',
                    });
                  }}
                  style={{ backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  🔊 Tes Bel Sekarang
                </button>
              </div>

              {SCHOOL_BELL_SCHEDULE.map((sch, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                      <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: '#f1f5f9', color: '#2563eb', padding: '2px 7px', borderRadius: '6px', border: '1px solid #dbeafe' }}>
                        ⏰ {sch.time} WIB
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: '#0f172a' }}>
                        {sch.slot}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '11px', color: '#64748b', lineHeight: 1.3 }}>
                      {sch.label}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      playMenuClickSound();
                      triggerSchoolBellAnnouncement(sch);
                    }}
                    style={{
                      backgroundColor: '#f8fafc',
                      color: '#0f172a',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '6px 10px',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      whiteSpace: 'nowrap',
                    }}
                    title="Dengarkan Suara Bel & AI"
                  >
                    <span>🔊</span>
                    <span>Bunyikan</span>
                  </button>
                </div>
              ))}
            </div>
          ) : filteredList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔔</div>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#475569', fontWeight: 'bold' }}>
                Tidak Ada Notifikasi Baru
              </h4>
              <p style={{ margin: 0, fontSize: '12px', lineHeight: '1.5' }}>
                Notifikasi tap presensi & motivasi Anda dalam 24 jam terakhir akan tampil otomatis di sini.
              </p>
            </div>
          ) : (
            filteredList.map((item) => {
              const isInval = item.type === 'inval_tugas' || item.type === 'inval_info';
              const isPresensi = item.type === 'presensi_tap';
              const isRoster = item.type === 'pergantian_les' || item.type === 'kepulangan_otomatis' || item.type === 'istirahat' || item.kategori === 'Jadwal Roster KBM';
              const statusClean = String(item.status || '').toLowerCase();
              const isPulang = statusClean.includes('pulang') || Boolean(item.jam_pulang);
              const isTelat = statusClean.includes('telat') || statusClean.includes('terlambat');
              const isSakit = statusClean.includes('sakit');
              const isIzin = statusClean.includes('izin');
              const isAlpa = statusClean.includes('alpa') || statusClean.includes('alpha');

              const handleItemClick = () => {
                if (onMarkItemRead) {
                  onMarkItemRead(item.id);
                }
                if (item.type === 'berita_sekolah' && onOpenNewsDetail) {
                  onClose();
                  onOpenNewsDetail(item.newsData);
                } else if (item.type === 'inval_tugas' || item.type === 'inval_info') {
                  if (onNavigate) {
                    onClose();
                    onNavigate('presensi');
                  }
                } else if (item.type === 'presensi_tap') {
                  if (onNavigate) {
                    onClose();
                    onNavigate('presensi');
                  }
                } else if (isRoster) {
                  if (onNavigate) {
                    onClose();
                    onNavigate('portal');
                  }
                }
              };

              return (
                <div
                  key={item.id}
                  onClick={handleItemClick}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '14px',
                    padding: '14px 16px',
                    border: item.isRead ? '1px solid #e2e8f0' : '1px solid #93c5fd',
                    boxShadow: item.isRead ? '0 1px 4px rgba(0,0,0,0.03)' : '0 4px 14px rgba(37, 99, 235, 0.08)',
                    cursor: 'pointer',
                    position: 'relative',
                    borderLeft: isInval
                      ? '5px solid #7c3aed'
                      : isRoster
                      ? '5px solid #2563eb'
                      : isPresensi
                      ? isPulang
                        ? '5px solid #2563eb'
                        : isTelat
                        ? '5px solid #ea580c'
                        : isSakit
                        ? '5px solid #9333ea'
                        : isIzin
                        ? '5px solid #0284c7'
                        : isAlpa
                        ? '5px solid #dc2626'
                        : '5px solid #16a34a'
                      : '5px solid #0284c7',
                    transition: 'all 0.15s ease',
                    opacity: item.isRead ? 0.88 : 1,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                >
                  {/* UNREAD BADGE DOT / READ STATUS */}
                  {!item.isRead ? (
                    <span
                      style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        width: '9px',
                        height: '9px',
                        borderRadius: '50%',
                        backgroundColor: isInval ? '#7c3aed' : isPulang ? '#2563eb' : isTelat ? '#ea580c' : '#16a34a',
                        boxShadow: '0 0 0 2px #ffffff',
                      }}
                      title="Belum dibaca (Klik untuk tandai terbaca)"
                    />
                  ) : (
                    <span
                      style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        fontSize: '11px',
                        color: '#94a3b8',
                        fontWeight: '600',
                      }}
                    >
                      ✓ Terbaca
                    </span>
                  )}

                  {/* KONTEN INVAL GURU */}
                  {isInval && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 'bold',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            backgroundColor: item.type === 'inval_tugas' ? '#f5f3ff' : '#eff6ff',
                            color: item.type === 'inval_tugas' ? '#6d28d9' : '#1e40af',
                            border: item.type === 'inval_tugas' ? '1px solid #ddd6fe' : '1px solid #bfdbfe',
                          }}
                        >
                          {item.type === 'inval_tugas' ? '🧑‍🏫 TUGAS GURU INVAL' : '📋 INFO INVAL GURU'}
                        </span>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>{item.tanggal || 'Hari Ini'}</span>
                      </div>

                      <h4 style={{ margin: '4px 0 3px 0', fontSize: '14px', color: '#0f172a', fontWeight: 'bold' }}>
                        {item.judul}
                      </h4>
                      <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: '1.4' }}>
                        {item.ringkasan}
                      </p>

                      <div style={{ marginTop: '8px', fontSize: '11px', color: '#64748b' }}>
                        Kelas: <b>{item.kelas}</b> (Jam ke-{item.jam_ke})
                      </div>
                    </div>
                  )}

                  {/* KONTEN PRESENSI TAP (LENGKAP: JAM, KELAS, NAMA, JURUSAN / INISIAL & KATA MOTIVASI) */}
                  {isPresensi && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: '800',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            backgroundColor: isPulang ? '#dbeafe' : isTelat ? '#ffedd5' : isSakit ? '#f3e8ff' : isIzin ? '#e0f2fe' : isAlpa ? '#fee2e2' : '#dcfce7',
                            color: isPulang ? '#1e40af' : isTelat ? '#c2410c' : isSakit ? '#7e22ce' : isIzin ? '#0369a1' : isAlpa ? '#dc2626' : '#166534',
                            border: `1px solid ${isPulang ? '#bfdbfe' : isTelat ? '#fed7aa' : isSakit ? '#e9d5ff' : isIzin ? '#bae6fd' : isAlpa ? '#fecaca' : '#bbf7d0'}`,
                            letterSpacing: '0.3px',
                          }}
                        >
                          {isPulang ? '🏠 TAP PULANG' : isTelat ? '⏰ TERLAMBAT' : isSakit ? '🟣 SAKIT' : isIzin ? '🔵 IZIN' : isAlpa ? '🔴 ALPA' : '🟢 HADIR TEPAT WAKTU'}
                        </span>
                        <span
                          style={{
                            fontSize: '10.5px',
                            color: '#1e3a8a',
                            fontWeight: 'bold',
                            backgroundColor: '#eff6ff',
                            padding: '2px 8px',
                            borderRadius: '8px',
                            border: '1px solid #bfdbfe',
                          }}
                        >
                          ⏰ {item.waktu || 'Hari Ini'}
                        </span>
                      </div>

                      <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#0f172a', fontWeight: '800', lineHeight: 1.3 }}>
                        {item.title || (isPulang ? `Tap Pulang: ${item.nama}` : `Presensi: ${item.nama}`)}
                      </h4>

                      {/* RINCIAN DATA: JAM, KELAS, NAMA, JURUSAN / INISIAL */}
                      <div
                        style={{
                          backgroundColor: '#f8fafc',
                          borderRadius: '10px',
                          padding: '8px 12px',
                          border: '1px solid #e2e8f0',
                          marginBottom: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          fontSize: '11.5px',
                        }}
                      >
                        {item.role === 'guru' || item.isGuru || String(item.kelas || '').includes('GURU') || String(item.kelas || '').includes('STAFF') ? (
                          <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ color: '#64748b', fontWeight: '600', minWidth: '65px' }}>👨‍🏫 Nama:</span>
                              <b style={{ color: '#0f172a' }}>{item.nama}</b>
                              {item.inisial && (
                                <span style={{ backgroundColor: '#dbeafe', color: '#1e40af', padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                                  [{item.inisial}]
                                </span>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ color: '#64748b', fontWeight: '600', minWidth: '65px' }}>📚 Mapel:</span>
                              <span style={{ color: '#334155', fontWeight: '600' }}>{item.mapel || item.kelas || 'Guru SMK YPK'}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ color: '#64748b', fontWeight: '600', minWidth: '65px' }}>⏰ Waktu:</span>
                              <span style={{ color: '#16a34a', fontWeight: 'bold' }}>{item.waktu || item.jam_masuk}</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ color: '#64748b', fontWeight: '600', minWidth: '65px' }}>👤 Nama:</span>
                              <b style={{ color: '#0f172a' }}>{item.nama}</b>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ color: '#64748b', fontWeight: '600', minWidth: '65px' }}>🎒 Kelas:</span>
                              <span style={{ color: '#0f172a', fontWeight: '700' }}>{item.kelas || '-'}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ color: '#64748b', fontWeight: '600', minWidth: '65px' }}>💻 Jurusan:</span>
                              <span style={{ color: '#2563eb', fontWeight: '600' }}>{item.jurusan || item.infoJurusan || 'Kejuruan SMK YPK'}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ color: '#64748b', fontWeight: '600', minWidth: '65px' }}>⏰ Jam Tap:</span>
                              <span style={{ color: '#16a34a', fontWeight: 'bold' }}>{item.waktu || item.jam_masuk}</span>
                            </div>
                          </>
                        )}
                      </div>

                      {/* 💡 KOTAK KATA MOTIVASI HARIAN */}
                      {(item.motivasi || item.pesan) && (
                        <div
                          style={{
                            background: 'linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)',
                            borderRadius: '10px',
                            padding: '9px 12px',
                            border: '1px solid #fef08a',
                            boxShadow: '0 1px 3px rgba(202, 138, 4, 0.08)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px' }}>
                            <span style={{ fontSize: '13px' }}>💡</span>
                            <span style={{ fontSize: '10.5px', fontWeight: '800', color: '#854d0e', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                              Kata Motivasi Hari Ini
                            </span>
                          </div>
                          <p style={{ margin: 0, fontSize: '11.5px', color: '#713f12', fontStyle: 'italic', lineHeight: '1.45', fontWeight: '500' }}>
                            {item.motivasi || item.pesan}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* KONTEN FOTO PROFIL (KHUSUS MASTER ADMIN) */}
                  {item.type === 'foto_profil' && (
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      {item.foto_url && (
                        <img
                          src={item.foto_url}
                          alt="Foto Profil"
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '2px solid #3b82f6',
                            flexShrink: 0,
                          }}
                        />
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 'bold',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              backgroundColor: '#fef3c7',
                              color: '#b45309',
                              border: '1px solid #fde68a',
                            }}
                          >
                            📸 PEMBARUAN FOTO
                          </span>
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>{item.waktu || 'Hari Ini'}</span>
                        </div>
                        <h4 style={{ margin: '4px 0 4px 0', fontSize: '14px', color: '#0f172a', fontWeight: 'bold', lineHeight: '1.4' }}>
                          {item.judul}
                        </h4>
                        <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: '1.4' }}>
                          {item.ringkasan}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* KONTEN ROSTER KBM (SESUAI GAMBAR 4: BADGE JADWAL ROSTER KBM, TITLE, SUBTITLE & DOT HIJAU) */}
                  {isRoster && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              fontSize: '10.5px',
                              fontWeight: '800',
                              padding: '3px 10px',
                              borderRadius: '12px',
                              backgroundColor: '#eff6ff',
                              color: '#1d4ed8',
                              border: '1px solid #bfdbfe',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span>📢</span>
                            <span>Jadwal Roster KBM</span>
                          </span>
                          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
                            {item.tanggal || item.waktu || 'Hari Ini'}
                          </span>
                        </div>
                        <span
                          style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            backgroundColor: '#16a34a',
                            display: 'inline-block',
                            boxShadow: '0 0 0 2px rgba(22, 163, 74, 0.2)',
                          }}
                          title="Jadwal Aktif Hari Ini"
                        />
                      </div>

                      <h4 style={{ margin: '4px 0 3px 0', fontSize: '15px', color: '#0f172a', fontWeight: '800', lineHeight: '1.3' }}>
                        {item.judul}
                      </h4>

                      <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: '600', lineHeight: '1.4' }}>
                        {item.ringkasan || item.konten || item.pesan}
                      </p>

                      {item.konten && item.konten !== item.ringkasan && (
                        <div style={{ marginTop: '6px', fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>
                          {item.konten}
                        </div>
                      )}
                    </div>
                  )}

                  {/* KONTEN BERITA SEKOLAH & PENGUMUMAN */}
                  {!isInval && !isPresensi && !isRoster && item.type !== 'foto_profil' && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 'bold',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            backgroundColor: '#eff6ff',
                            color: '#1e40af',
                          }}
                        >
                          📢 {item.kategori || 'PENGUMUMAN'}
                        </span>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>{item.tanggal || 'Hari Ini'}</span>
                      </div>

                      <h4 style={{ margin: '4px 0 4px 0', fontSize: '14px', color: '#0f172a', fontWeight: 'bold', lineHeight: '1.4' }}>
                        {item.judul}
                      </h4>
                      <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {item.ringkasan || item.konten}
                      </p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* FOOTER INFORMASI STATUS REALTIME & TOMBOL TUTUP */}
        <div style={{ backgroundColor: '#ffffff', borderTop: '1px solid #e2e8f0', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#16a34a', fontWeight: 'bold' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
            <span>Realtime Aktif &bull; Bersih /24 Jam</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              backgroundColor: '#f1f5f9',
              color: '#475569',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            ✕ Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
