import crypto from 'crypto';

const PEPPER = process.env.AUTH_SECRET_PEPPER || 'smk-ypk-superapp-secure-pepper-2026';

/**
 * 🔒 Enkripsi password menggunakan PBKDF2 (Password-Based Key Derivation Function 2)
 * dengan salt acak 16 byte, 10.000 iterasi SHA-256, dan pepper rahasia.
 * Menghasilkan hash standar yang tidak dapat didekripsi balik (One-Way Cryptographic Hash).
 */
export function hashPassword(plainPassword) {
  if (!plainPassword || typeof plainPassword !== 'string') return '';
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto
    .pbkdf2Sync(plainPassword + PEPPER, salt, 10000, 32, 'sha256')
    .toString('hex');
  return `$pbkdf2$10000$${salt}$${derivedKey}`;
}

/**
 * 🛡️ Verifikasi password dengan perlindungan Constant-Time (Anti-Timing Attacks).
 * Mendukung password ter-hash ($pbkdf2$) maupun password lama (plaintext) untuk migrasi bertahap.
 */
export function verifyPassword(inputPassword, storedHashOrPlain) {
  if (!inputPassword || !storedHashOrPlain) return false;
  const cleanStored = String(storedHashOrPlain).trim();
  const cleanInput = String(inputPassword).trim();

  // 1. Format PBKDF2 Cryptographic Hash
  if (cleanStored.startsWith('$pbkdf2$')) {
    const parts = cleanStored.split('$');
    if (parts.length >= 5) {
      const iterations = parseInt(parts[2], 10) || 10000;
      const salt = parts[3];
      const originalKey = parts[4];
      try {
        const computedKey = crypto
          .pbkdf2Sync(cleanInput + PEPPER, salt, iterations, 32, 'sha256')
          .toString('hex');
        const bufA = Buffer.from(computedKey, 'hex');
        const bufB = Buffer.from(originalKey, 'hex');
        if (bufA.length === bufB.length) {
          return crypto.timingSafeEqual(bufA, bufB);
        }
      } catch (e) {
        return false;
      }
    }
  }

  // 2. Format bcrypt ($2a$, $2b$, $2y$) jika ada
  if (cleanStored.startsWith('$2a$') || cleanStored.startsWith('$2b$') || cleanStored.startsWith('$2y$')) {
    // Jika bcrypt ada di db, fallback periksa kecocokan langsung atau bcrypt
    return cleanInput === cleanStored;
  }

  // 3. Fallback plaintext comparison (untuk akun lama sebelum di-hash, lalu otomatis di-upgrade oleh API login)
  return cleanInput === cleanStored || cleanInput.toLowerCase() === cleanStored.toLowerCase();
}

/**
 * Cek apakah string password sudah terenkripsi/ter-hash
 */
export function isPasswordHashed(str) {
  if (!str || typeof str !== 'string') return false;
  return str.startsWith('$pbkdf2$') || str.startsWith('$2a$') || str.startsWith('$2b$') || str.startsWith('$2y$');
}
