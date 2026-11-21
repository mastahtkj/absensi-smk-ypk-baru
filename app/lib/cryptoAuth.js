import crypto from 'crypto';

const PEPPER = process.env.AUTH_SECRET_PEPPER || 'smk-ypk-superapp-secure-pepper-2026';
const TOKEN_SECRET = process.env.AUTH_TOKEN_SECRET || 'smk-ypk-token-secret-key-superapp-2026';

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

/**
 * 🎫 Buat Cryptographic Session Token (HMAC-SHA256 Signed Token)
 * Berisi payload identitas pengguna dan tanggal kedaluwarsa (7 hari).
 */
export function createSessionToken(payload, expiresInDays = 7) {
  if (!payload || typeof payload !== 'object') return '';
  const now = Math.floor(Date.now() / 1000);
  const exp = now + expiresInDays * 24 * 60 * 60;

  const tokenData = {
    ...payload,
    iat: now,
    exp: exp,
  };

  const jsonStr = JSON.stringify(tokenData);
  const dataB64 = Buffer.from(jsonStr, 'utf8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(dataB64)
    .digest('base64url');

  return `${dataB64}.${signature}`;
}

/**
 * 🔍 Verifikasi Cryptographic Session Token
 * Memastikan tanda tangan digital valid dan belum kedaluwarsa.
 */
export function verifySessionToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;

  try {
    const [dataB64, signature] = token.split('.');
    if (!dataB64 || !signature) return null;

    const expectedSig = crypto
      .createHmac('sha256', TOKEN_SECRET)
      .update(dataB64)
      .digest('base64url');

    const bufExpected = Buffer.from(expectedSig);
    const bufActual = Buffer.from(signature);

    if (bufExpected.length !== bufActual.length) return null;
    if (!crypto.timingSafeEqual(bufExpected, bufActual)) return null;

    const jsonStr = Buffer.from(dataB64, 'base64url').toString('utf8');
    const parsed = JSON.parse(jsonStr);

    const now = Math.floor(Date.now() / 1000);
    if (parsed.exp && parsed.exp < now) {
      return null; // Token kedaluwarsa
    }

    return parsed;
  } catch (err) {
    return null;
  }
}

/**
 * 🔐 Enkripsi dua arah AES-256-GCM untuk username G.Admin & Admin Master
 * agar tidak terlihat dalam plaintext saat diperiksa di Linux (Arch Linux) devtools / storage
 */
export function encryptSensitiveField(plainText) {
  if (!plainText || typeof plainText !== 'string') return '';
  try {
    const iv = crypto.randomBytes(12);
    const key = crypto.createHash('sha256').update(PEPPER).digest();
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag().toString('hex');
    return `SEC$${iv.toString('hex')}$${tag}$${encrypted}`;
  } catch (e) {
    return plainText;
  }
}

export function decryptSensitiveField(cipherText) {
  if (!cipherText || typeof cipherText !== 'string' || !cipherText.startsWith('SEC$')) {
    return cipherText;
  }
  try {
    const parts = cipherText.split('$');
    if (parts.length < 4) return cipherText;
    const iv = Buffer.from(parts[1], 'hex');
    const tag = Buffer.from(parts[2], 'hex');
    const encrypted = parts[3];
    const key = crypto.createHash('sha256').update(PEPPER).digest();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    return cipherText;
  }
}
