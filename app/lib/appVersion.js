// =============================================================
// 🏷️ IDENTITAS APLIKASI SMK YPK SUPER APP (SATU-SUMBER KEBENARAN)
// =============================================================
// File ini dipakai BOTH oleh CLIENT (AppUpdateManager, SuperAppNav)
// dan SERVER (route /api/app-version) agar teks versi yang tampil
// di Desktop maupun APK SELALU KONSISTEN (tidak boleh berbeda).
//
// Nilai environment variable di-inject oleh next.config.js
// pada saat build, dan punya fallback yang sama persis di sini
// supaya tidak pernah tampil "undefined".
// =============================================================

export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || '2.0.5';

export const BUILD_SERVER = process.env.NEXT_PUBLIC_BUILD_SERVER || 'MASTAH TJKT';

export const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID || 'dev';

export const BUILD_TIME = process.env.NEXT_PUBLIC_BUILD_TIME || '';

// 🏷️ Teks versi resmi yang dipakai di dialog pembaruan APK & Desktop.
export const APP_VERSION_LABEL = `VERSI APLIKASI : ${APP_VERSION}`;
export const BUILD_SERVER_LABEL = `BUILD SERVER : ${BUILD_SERVER}`;
