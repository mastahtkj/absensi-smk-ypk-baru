import React from 'react';
import styles from './dashboardStyles';

export const normalizeUid = (uid) => (uid ? String(uid).replace(/[^A-Za-z0-9]/g, '').toUpperCase() : '');

export const toUnicodeBold = (text = '') => {
  const boldMap = {
    'A': '𝗔', 'B': '𝗕', 'C': '𝗖', 'D': '𝗗', 'E': '𝗘', 'F': '𝗙', 'G': '𝗚', 'H': '𝗛', 'I': '𝗜', 'J': '𝗝',
    'K': '𝗞', 'L': '𝗟', 'M': '𝗠', 'N': '𝗡', 'O': '𝗢', 'P': '𝗣', 'Q': '𝗤', 'R': '𝗥', 'S': '𝗦', 'T': '𝗧',
    'U': '𝗨', 'V': '𝗩', 'W': '𝗪', 'X': '𝗫', 'Y': '𝗬', 'Z': '𝗭',
    'a': '𝗮', 'b': '𝗯', 'c': '𝗰', 'd': '𝗱', 'e': '𝗲', 'f': '𝗳', 'g': '𝗴', 'h': '𝗵', 'i': '𝗶', 'j': '𝗷',
    'k': '𝗸', 'l': '𝗹', 'm': '𝗺', 'n': '𝗻', 'o': '𝗼', 'p': '𝗽', 'q': '𝗾', 'r': '𝗿', 's': '𝘀', 't': '𝘁',
    'u': '𝘂', 'v': '𝘃', 'w': '𝘄', 'x': '𝘅', 'y': '𝘆', 'z': '𝘇',
    '0': '𝟬', '1': '𝟭', '2': '𝟮', '3': '𝟯', '4': '𝟰', '5': '𝟱', '6': '𝟲', '7': '𝟳', '8': '𝟴', '9': '𝟵'
  };
  return String(text).split('').map((c) => boldMap[c] || c).join('');
};

export const getJakartaDateString = (dateInput = new Date()) => {
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
  } catch (e) {
    return '';
  }
};

export const getOrCreateStudentDeviceId = () => {
  if (typeof window === 'undefined') return 'SERVER_NODE';
  try {
    let devId = localStorage.getItem('smk_ypk_student_device_id');
    if (!devId) {
      devId = 'DEV_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
      localStorage.setItem('smk_ypk_student_device_id', devId);
    }
    return devId;
  } catch (e) {
    return 'DEV_FALLBACK_' + Date.now();
  }
};

export const getStudentDeviceLabel = () => {
  if (typeof window === 'undefined') return 'Perangkat Browser';
  try {
    const ua = navigator.userAgent || '';
    let os = 'Perangkat';
    if (/android/i.test(ua)) os = 'HP Android';
    else if (/iphone|ipad|ipod/i.test(ua)) os = 'iPhone / iPad';
    else if (/windows/i.test(ua)) os = 'Laptop / PC Windows';
    else if (/macintosh|mac os x/i.test(ua)) os = 'MacBook / iMac';
    else if (/linux/i.test(ua)) os = 'Linux OS';

    let browser = 'Web App';
    if (/chrome|crios/i.test(ua)) browser = 'Chrome';
    else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
    else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
    else if (/edg/i.test(ua)) browser = 'Edge';
    else if (/opr|opera/i.test(ua)) browser = 'Opera';

    return `${os} (${browser})`;
  } catch (e) {
    return 'Perangkat Siswa';
  }
};

export const SESSION_TIMETABLE = {
  1: { start: '07:15', end: '07:55', label: '07:15 - 07:55' },
  2: { start: '07:55', end: '08:35', label: '07:55 - 08:35' },
  3: { start: '08:35', end: '09:15', label: '08:35 - 09:15' },
  4: { start: '09:15', end: '09:55', label: '09:15 - 09:55' },
  5: { start: '10:15', end: '10:55', label: '10:15 - 10:55' },
  6: { start: '10:55', end: '11:35', label: '10:55 - 11:35' },
  7: { start: '11:35', end: '12:15', label: '11:35 - 12:15' },
  8: { start: '13:00', end: '13:40', label: '13:00 - 13:40' },
  9: { start: '13:40', end: '14:20', label: '13:40 - 14:20' },
  10: { start: '14:20', end: '15:00', label: '14:20 - 15:00' },
  11: { start: '15:00', end: '15:40', label: '15:00 - 15:40' },
};

export const getInvalSessionStatus = (item) => {
  if (!item) return { status: 'Ditugaskan', label: '⏳ Ditugaskan', isDone: false, color: '#92400e', bg: '#fef3c7', border: '#fde68a' };
  if (item.status_inval === 'Selesai') {
    return { status: 'Selesai', label: '✅ Selesai', isDone: true, color: '#166534', bg: '#dcfce7', border: '#86efac' };
  }
  const isFree = item.nama_guru_inval?.includes('Jam Kosong') || item.nama_guru_inval === '-' || item.kelas === '-';
  if (isFree) {
    return { status: 'Selesai', label: '☕ Jam Bebas', isDone: true, color: '#475569', bg: '#f1f5f9', border: '#cbd5e1' };
  }

  const now = new Date();
  const todayStr = getJakartaDateString(now);
  const itemDate = item.tanggal;
  const jamNum = parseInt(String(item.jam_ke || '').replace(/\D/g, '')) || 0;
  const sessionInfo = SESSION_TIMETABLE[jamNum];

  if (itemDate && itemDate < todayStr) {
    return { status: 'Selesai', label: '✅ Selesai', isDone: true, color: '#166534', bg: '#dcfce7', border: '#86efac' };
  }

  if (itemDate === todayStr && sessionInfo) {
    const curHH = String(now.getHours()).padStart(2, '0');
    const curMM = String(now.getMinutes()).padStart(2, '0');
    const curTime = `${curHH}:${curMM}`;

    if (curTime >= sessionInfo.end) {
      return { status: 'Selesai', label: '✅ Selesai', isDone: true, color: '#166534', bg: '#dcfce7', border: '#86efac' };
    }
    if (curTime >= sessionInfo.start && curTime < sessionInfo.end) {
      return { status: 'Berjalan', label: '🟡 Berlangsung', isDone: false, color: '#0369a1', bg: '#e0f2fe', border: '#7dd3fc' };
    }
  }

  return { status: 'Ditugaskan', label: '⏳ Ditugaskan', isDone: false, color: '#92400e', bg: '#fef3c7', border: '#fde68a' };
};

export const formatWaktuLengkap = (dateInput) => {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '-';

  const hari = d.toLocaleDateString('id-ID', { weekday: 'long', timeZone: 'Asia/Jakarta' });
  const tgl = String(d.getDate()).padStart(2, '0');
  const bln = String(d.getMonth() + 1).padStart(2, '0');
  const thn = d.getFullYear();

  const jam = String(d.getHours()).padStart(2, '0');
  const menit = String(d.getMinutes()).padStart(2, '0');
  const detik = String(d.getSeconds()).padStart(2, '0');

  return `${hari}, ${tgl}/${bln}/${thn} - ${jam}.${menit}.${detik} WIB`;
};

let sharedAudioCtx = null;

export const getSharedAudioContext = () => {
  if (typeof window === 'undefined') return null;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!sharedAudioCtx) {
      sharedAudioCtx = new AudioContextClass();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume();
    }
    return sharedAudioCtx;
  } catch (e) {
    return null;
  }
};

export const playWebNotificationSound = (isTelat = false) => {
  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;

    const runPlayback = () => {
      const now = ctx.currentTime;
      if (isTelat) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(850, now);
        osc.frequency.exponentialRampToValueAtTime(450, now + 0.35);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else {
        const notes = [1046.5, 1318.5, 1567.98, 2093.0];
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.08);
          gain.gain.setValueAtTime(0, now + i * 0.08);
          gain.gain.linearRampToValueAtTime(0.3, now + i * 0.08 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.3);
          osc.start(now + i * 0.08);
          osc.stop(now + i * 0.08 + 0.3);
        });
      }
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(runPlayback).catch(() => {});
    } else {
      runPlayback();
    }
  } catch (e) {
    console.error('Audio exception:', e);
  }
};

export const renderStatusBadge = (status = 'Hadir', tipe = 'masuk', jamPulang = '', invalInfo = '') => {
  const s = String(status || 'Hadir').toUpperCase();
  if (s.includes('SAKIT')) return <span style={styles.badgeSakit}>🟡 {status} {invalInfo ? `• ${invalInfo}` : ''}</span>;
  if (s.includes('IZIN')) return <span style={styles.badgeIzin}>🟣 {status} {invalInfo ? `• ${invalInfo}` : ''}</span>;
  if (s.includes('ALPA')) return <span style={styles.badgeAlpha}>🔴 {status}</span>;
  if (s.includes('PULANG') || tipe === 'pulang_selesai' || (jamPulang && jamPulang !== '-')) {
    return <span style={styles.badgePulang}>🏠 Pulang ({jamPulang || 'Selesai'})</span>;
  }
  if (s.includes('TELAT')) return <span style={styles.badgeTelat}>⏰ {status}</span>;
  if (s.includes('TANPA KARTU')) return <span style={styles.badgeTanpaKartu}>🟢 {status}</span>;
  return <span style={styles.badgeHadir}>✅ {status}</span>;
};

export const getJurusanFullName = (rawJurusan, rawKelas) => {
  const combined = `${rawJurusan || ''} ${rawKelas || ''}`.toUpperCase();
  if (combined.includes('TJKT') || combined.includes('TKJ') || combined.includes('JARINGAN') || combined.includes('KOMPUTER')) {
    return 'Teknik Jaringan Komputer Dan Telekomunikasi (TJKT)';
  }
  if (combined.includes('AKL') || combined.includes('AKUNTANSI') || combined.includes('AK')) {
    return 'Akuntansi Dan Keuangan Lembaga (AKL)';
  }
  if (combined.includes('MPLB') || combined.includes('OTKP') || combined.includes('PERKANTORAN') || combined.includes('AP')) {
    return 'Manajemen Perkantoran Dan Layanan Bisnis (MPLB)';
  }
  if (combined.includes('PM') || combined.includes('PEMASARAN') || combined.includes('BDP') || combined.includes('BISNIS')) {
    return 'Pemasaran (PM)';
  }
  return rawJurusan || rawKelas || 'Kejuruan SMK YPK';
};

export const generatePersonalizedTapNotification = (latestTap, currentUser) => {
  const nama = (latestTap.nama || currentUser?.nama || 'Pengguna').trim();
  const waktu = latestTap.jam || latestTap.jam_masuk || latestTap.jam_pulang || new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }) + ' WIB';
  const status = String(latestTap.status || 'Hadir').toLowerCase();

  const isGuru = Boolean(
    latestTap.isGuru ||
    latestTap.role?.toLowerCase() === 'guru' ||
    latestTap.role?.toLowerCase() === 'staff' ||
    String(latestTap.id).startsWith('GURU-')
  );

  const rawKelas = latestTap.kelas || currentUser?.kelas || '';
  const kelas = isGuru ? 'Guru Pengajar SMK YPK' : (rawKelas || 'Siswa SMK YPK');
  const jurusan = getJurusanFullName(latestTap.jurusan || latestTap.matchedUser?.jurusan, rawKelas);

  const words = nama.split(/\s+/).filter(Boolean);
  const initials = words.length >= 2
    ? (words[0][0] + words[1][0]).toUpperCase()
    : (words[0] ? words[0].slice(0, 2).toUpperCase() : 'YP');

  let title = 'Presensi Berhasil';
  let badgeColor = '#10b981';
  let icon = '✅';

  if (status.includes('pulang')) {
    title = 'Presensi Pulang Berhasil';
    badgeColor = '#0ea5e9';
    icon = '🏠';
  } else if (status.includes('telat')) {
    title = 'Presensi Masuk (Terlambat)';
    badgeColor = '#f59e0b';
    icon = '⏰';
  } else if (status.includes('sakit')) {
    title = 'Keterangan Sakit Dicatat';
    badgeColor = '#eab308';
    icon = '🟡';
  } else if (status.includes('izin')) {
    title = 'Keterangan Izin Dicatat';
    badgeColor = '#a855f7';
    icon = '🟣';
  } else if (status.includes('alpa')) {
    title = 'Status Alpa Dicatat';
    badgeColor = '#ef4444';
    icon = '🔴';
  }

  const quotes = [
    'Sukses dimulai dari disiplin setiap pagi!',
    'Belajar hari ini untuk memimpin masa depan.',
    'Keahlian TJKT, AKL, MPLB & PM siap bersaing!',
    'Karakter unggul adalah kunci keberhasilan sejati.',
    'Selamat berkarya dan tuntaskan target hari ini!',
  ];
  const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];

  return {
    nama,
    kelas,
    jurusan,
    waktu,
    initials,
    title,
    badgeColor,
    icon,
    quote: randomQuote,
    foto_url: latestTap.foto_url || latestTap.matchedUser?.foto_url || null,
  };
};

export const cleanNameForComparison = (name) => {
  if (!name) return '';
  return String(name)
    .toLowerCase()
    .split(',')[0]
    .replace(/\b(drs|dra|prof|dr|ir|hj|h|bpk|pak|ibu)\b\.?/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
};
