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
export const triggerSystemNotification = (title, body, tag = 'smk-ypk-notif') => {
  if (typeof window === 'undefined') return;

  // 📳 1. Getar HP Android (Vibration API)
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate([200, 100, 200]);
    } catch (e) {}
  }

  // 🔔 2. Pop-up Notifikasi Sistem Android / Windows (Service Worker / Notification API)
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SHOW_NOTIFICATION',
          title: title || 'SMK YPK MEDAN',
          body: body || '',
          icon: '/logo.png',
          badge: '/logo.png',
          tag: tag,
          data: { url: '/' },
        });
      } else {
        new Notification(title || 'SMK YPK MEDAN', {
          body: body,
          icon: '/logo.png',
          badge: '/logo.png',
          tag: tag,
        });
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
  onOpenNewsDetail,
  currentUser,
  isMasterIqbal,
  isAdmin,
}) {
  const [filterType, setFilterType] = useState('semua'); // 'semua' | 'inval' | 'presensi' | 'berita' | 'bel'

  const isMasterAdmin = Boolean(
    isMasterIqbal ||
    isAdmin ||
    currentUser?.role?.toLowerCase() === 'admin' ||
    currentUser?.role?.toLowerCase() === 'master' ||
    currentUser?.username?.toLowerCase() === 'iqbal' ||
    currentUser?.username?.toLowerCase() === 'admin'
  );

  // Jika bukan Master Admin tetapi filterType berada di 'bel', reset ke 'semua'
  useEffect(() => {
    if (filterType === 'bel' && !isMasterAdmin) {
      setFilterType('semua');
    }
  }, [filterType, isMasterAdmin]);

  // ⏰ Filter otomatis: Hanya tampilkan notifikasi yang berusia < 24 Jam
  // 🔒 FILTER PRIVASI NOTIFIKASI:
  // 1. Notifikasi Tap Presensi (presensi_tap) HANYA BISA DILIHAT OLEH AKUN PEMILIK (Kecuali Master Admin Iqbal).
  // 2. Notifikasi Tugas Inval (inval_tugas / inval_info) HANYA BISA DILIHAT OLEH GURU TERKAIT (Kecuali Master Admin Iqbal).
  // 3. Berita Mading & Roster KBM bersifat umum.
  const isNotificationForThisUser = (item) => {
    if (!item) return false;
    if (isMasterAdmin) return true;

    if (item.type === 'presensi_tap') {
      const curNama = String(currentUser?.nama || '').toLowerCase().trim();
      const itemNama = String(item.nama || '').toLowerCase().trim();
      const curUid = String(currentUser?.uid_rfid || currentUser?.rfid_uid || '').toUpperCase().trim();
      const itemUid = String(item.uid || item.rfid_uid || '').toUpperCase().trim();

      const matchNama = Boolean(curNama && itemNama && (curNama === itemNama || itemNama.includes(curNama) || curNama.includes(itemNama)));
      const matchUid = Boolean(curUid && itemUid && curUid !== '-' && itemUid !== '-' && curUid === itemUid);
      return matchNama || matchUid;
    }

    if (item.type === 'inval_tugas' || item.type === 'inval_info') {
      const curNama = String(currentUser?.nama || '').toLowerCase().trim();
      const guruInval = String(item.guru_inval || '').toLowerCase().trim();
      const guruUtama = String(item.guru_utama || '').toLowerCase().trim();
      return Boolean(curNama && (curNama === guruInval || curNama === guruUtama));
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
    if (filterType === 'berita') return item.type === 'berita_sekolah';
    return true;
  });

  const unreadCount = valid24hNotifications.filter((n) => !n.isRead).length;

  const availableTabs = [
    { id: 'semua', label: 'Semua', icon: '✨' },
    { id: 'presensi', label: 'Tap RFID', icon: '📡' },
    { id: 'inval', label: 'Inval Guru', icon: '🧑‍🏫' },
    { id: 'berita', label: 'Info & Berita', icon: '📢' },
    ...(isMasterAdmin ? [{ id: 'bel', label: 'Bel Jam Pelajaran V4', icon: '🔔' }] : []),
  ];

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        zIndex: 99999,
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
          boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideLeft 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER DRAWER NOTIFIKASI */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)',
            color: '#ffffff',
            padding: '18px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
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
              }}
            >
              🔔
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', letterSpacing: '0.3px' }}>
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
                Otomatis diperbarui • Bersih per 24 Jam
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              color: '#ffffff',
              fontSize: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.8)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)')}
          >
            ✕
          </button>
        </div>

        {/* TAB FILTER KATEGORI NOTIFIKASI */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            overflowX: 'auto',
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
              const statusClean = String(item.status || '').toLowerCase();
              const isPulang = statusClean.includes('pulang') || Boolean(item.jam_pulang);
              const isTelat = statusClean.includes('telat') || statusClean.includes('terlambat');
              const isSakit = statusClean.includes('sakit');
              const isIzin = statusClean.includes('izin');
              const isAlpa = statusClean.includes('alpa') || statusClean.includes('alpha');

              const handleItemClick = () => {
                // 🌟 KLIK KARTU LANGSUNG MENANDAI TERBACA (TANPA PINDAH / BUKA PRESENSI)
                if (onMarkItemRead) {
                  onMarkItemRead(item.id);
                }
                if (item.type === 'berita_sekolah' && onOpenNewsDetail) {
                  onOpenNewsDetail(item.newsData);
                }
              };

              return (
                <div
                  key={item.id}
                  onClick={handleItemClick}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    padding: '14px',
                    border: item.isRead ? '1px solid #e2e8f0' : '1px solid #93c5fd',
                    boxShadow: item.isRead ? '0 1px 4px rgba(0,0,0,0.03)' : '0 4px 12px rgba(37, 99, 235, 0.08)',
                    cursor: 'pointer',
                    position: 'relative',
                    borderLeft: isInval
                      ? '5px solid #7c3aed'
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
                      : '5px solid #2563eb',
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

                  {/* KONTEN PRESENSI TAP (DENGAN MOTIVASI & PESAN MENARIK RANDOM) */}
                  {isPresensi && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 'bold',
                            padding: '3px 9px',
                            borderRadius: '12px',
                            backgroundColor: isPulang ? '#dbeafe' : isTelat ? '#ffedd5' : isSakit ? '#f3e8ff' : isIzin ? '#e0f2fe' : isAlpa ? '#fee2e2' : '#dcfce7',
                            color: isPulang ? '#1e40af' : isTelat ? '#c2410c' : isSakit ? '#7e22ce' : isIzin ? '#0369a1' : isAlpa ? '#dc2626' : '#166534',
                            border: `1px solid ${isPulang ? '#bfdbfe' : isTelat ? '#fed7aa' : isSakit ? '#e9d5ff' : isIzin ? '#bae6fd' : isAlpa ? '#fecaca' : '#bbf7d0'}`,
                          }}
                        >
                          {isPulang ? '🏠 TAP PULANG' : isTelat ? '⏰ TERLAMBAT' : isSakit ? '🟣 SAKIT' : isIzin ? '🔵 IZIN' : isAlpa ? '🔴 ALPA' : '🟢 HADIR TEPAT WAKTU'}
                        </span>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>{item.waktu || 'Hari Ini'}</span>
                      </div>

                      <h4 style={{ margin: '2px 0 4px 0', fontSize: '14px', color: '#0f172a', fontWeight: 'bold' }}>
                        {item.title || (isPulang ? `Tap Pulang: ${item.nama}` : `Presensi: ${item.nama}`)}
                      </h4>
                      
                      {item.pesan ? (
                        <p style={{ margin: '0 0 6px 0', fontSize: '12px', color: '#334155', lineHeight: '1.45', whiteSpace: 'pre-line' }}>
                          {item.pesan}
                        </p>
                      ) : (
                        <p style={{ margin: '0 0 6px 0', fontSize: '12px', color: '#475569' }}>
                          {item.role === 'guru' || String(item.kelas || '').includes('GURU') || String(item.kelas || '').includes('ADMIN')
                            ? `👨‍🏫 ${item.kelas || 'Guru / Staff'}`
                            : `🎒 Siswa: ${item.kelas || 'SMK YPK'}`}
                        </p>
                      )}

                      <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', fontSize: '11px', color: '#64748b' }}>
                        <span>
                          {item.jam_masuk ? `Masuk: ${item.jam_masuk} WIB` : ''}
                          {item.jam_pulang ? ` • Pulang: ${item.jam_pulang} WIB` : ''}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* KONTEN BERITA SEKOLAH */}
                  {!isInval && !isPresensi && (
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

        {/* FOOTER INFORMASI STATUS REALTIME */}
        <div style={{ backgroundColor: '#ffffff', borderTop: '1px solid #e2e8f0', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#16a34a', fontWeight: 'bold' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', animation: 'pulse 1.5s infinite' }} />
            <span>Realtime Aktif • Notifikasi /24 Jam Otomatis Dibersihkan</span>
          </div>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>SMK YPK Medan</span>
        </div>
      </div>
    </div>
  );
}
