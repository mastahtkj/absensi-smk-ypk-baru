// ==============================================================================
// 🛡️ BRUTE FORCE DEFENSE SYSTEM & RATE LIMITER (SMK YPK MEDAN)
// ==============================================================================
// Melindungi endpoint autentikasi (/api/auth/login) dari serangan brute force,
// credential stuffing, dan dictionary attacks.
// Membatasi percobaan per-IP dan per-Username dengan exponential backoff.
// ==============================================================================

const MAX_FAILED_ATTEMPTS = 5;       // Maksimal 5x gagal
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // Dikunci 15 menit jika melebihi batas
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;   // Jendela waktu 15 menit

// Penyimpanan in-memory global di server Node.js
// Map key -> { count: number, firstAttempt: number, lastAttempt: number, lockedUntil: number }
const attemptsStore = new Map();

// Bersihkan record yang sudah kadaluarsa secara berkala setiap 5 menit
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of attemptsStore.entries()) {
    if (now > (data.lockedUntil || (data.lastAttempt + ATTEMPT_WINDOW_MS))) {
      attemptsStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Ekstrak IP client asli dari request Next.js (mendukung Vercel, Cloudflare, Nginx proxy)
 */
export function getClientIp(request) {
  try {
    const xff = request.headers.get('x-forwarded-for');
    if (xff) {
      const ips = xff.split(',').map(s => s.trim());
      if (ips[0]) return ips[0];
    }
    const realIp = request.headers.get('x-real-ip');
    if (realIp) return realIp.trim();
    const cfIp = request.headers.get('cf-connecting-ip');
    if (cfIp) return cfIp.trim();
  } catch (_) {}
  return '127.0.0.1';
}

/**
 * 🔒 Periksa apakah IP atau Username sedang diblokir karena terlalu banyak gagal login.
 * Mengembalikan:
 * - isBlocked: true jika sedang dalam masa hukuman lockout
 * - remainingAttempts: sisa percobaan sebelum terkunci
 * - retryAfterSeconds: sisa detik sampai kunci terbuka
 */
export function checkBruteForceLimit(identifier, ip) {
  const now = Date.now();
  const cleanId = String(identifier || '').trim().toLowerCase();
  const cleanIp = String(ip || '').trim();

  const ipKey = `ip:${cleanIp}`;
  const userKey = cleanId ? `user:${cleanId}` : null;

  const ipData = attemptsStore.get(ipKey);
  const userData = userKey ? attemptsStore.get(userKey) : null;

  // 1. Cek apakah IP sedang terkunci
  if (ipData && ipData.lockedUntil && now < ipData.lockedUntil) {
    const retrySec = Math.ceil((ipData.lockedUntil - now) / 1000);
    return {
      isBlocked: true,
      remainingAttempts: 0,
      retryAfterSeconds: retrySec,
      message: `Terlalu banyak percobaan login gagal dari perangkat/IP Anda. Demi keamanan sistem, akses diblokir sementara selama ${Math.ceil(retrySec / 60)} menit lagi.`
    };
  }

  // 2. Cek apakah Akun/Username sedang terkunci
  if (userData && userData.lockedUntil && now < userData.lockedUntil) {
    const retrySec = Math.ceil((userData.lockedUntil - now) / 1000);
    return {
      isBlocked: true,
      remainingAttempts: 0,
      retryAfterSeconds: retrySec,
      message: `Akun "${cleanId}" telah dikunci sementara karena mendeteksi ${MAX_FAILED_ATTEMPTS} kali percobaan kata sandi salah berturut-turut. Coba lagi dalam ${Math.ceil(retrySec / 60)} menit.`
    };
  }

  // Hitung sisa percobaan
  const ipAttempts = (ipData && (now - ipData.firstAttempt < ATTEMPT_WINDOW_MS)) ? ipData.count : 0;
  const userAttempts = (userData && (now - userData.firstAttempt < ATTEMPT_WINDOW_MS)) ? userData.count : 0;
  const worstCount = Math.max(ipAttempts, userAttempts);
  const remaining = Math.max(0, MAX_FAILED_ATTEMPTS - worstCount);

  return {
    isBlocked: false,
    remainingAttempts: remaining,
    retryAfterSeconds: 0,
    currentFailures: worstCount
  };
}

/**
 * ⚠️ Catat percobaan login yang gagal untuk IP & Username.
 * Menerapkan delay progresif (exponential throttle) untuk memperlambat serangan otomatis.
 */
export async function recordFailedLogin(identifier, ip) {
  const now = Date.now();
  const cleanId = String(identifier || '').trim().toLowerCase();
  const cleanIp = String(ip || '').trim();

  function updateRecord(key) {
    let data = attemptsStore.get(key);
    if (!data || (now - data.firstAttempt > ATTEMPT_WINDOW_MS)) {
      data = { count: 1, firstAttempt: now, lastAttempt: now, lockedUntil: 0 };
    } else {
      data.count += 1;
      data.lastAttempt = now;
      if (data.count >= MAX_FAILED_ATTEMPTS) {
        data.lockedUntil = now + LOCKOUT_DURATION_MS;
      }
    }
    attemptsStore.set(key, data);
    return data;
  }

  const ipRecord = updateRecord(`ip:${cleanIp}`);
  let userRecord = null;
  if (cleanId) {
    userRecord = updateRecord(`user:${cleanId}`);
  }

  const worstFailures = Math.max(ipRecord.count, userRecord?.count || 0);

  // Progressive throttle delay (1 detik setelah 2x gagal, 2 detik setelah 3x gagal, 3 detik setelah 4x gagal)
  if (worstFailures >= 2) {
    const delayMs = Math.min(3000, (worstFailures - 1) * 1000);
    await new Promise(r => setTimeout(r, delayMs));
  }

  const isNowLocked = (ipRecord.lockedUntil > 0) || (userRecord?.lockedUntil > 0);
  const remaining = Math.max(0, MAX_FAILED_ATTEMPTS - worstFailures);

  return {
    isNowLocked,
    remainingAttempts: remaining,
    lockoutDurationMinutes: Math.round(LOCKOUT_DURATION_MS / 60000)
  };
}

/**
 * ✅ Bersihkan rekam jejak gagal setelah pengguna berhasil login.
 */
export function recordSuccessfulLogin(identifier, ip) {
  const cleanId = String(identifier || '').trim().toLowerCase();
  const cleanIp = String(ip || '').trim();
  attemptsStore.delete(`ip:${cleanIp}`);
  if (cleanId) {
    attemptsStore.delete(`user:${cleanId}`);
  }
}
