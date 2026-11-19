import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { APP_VERSION, BUILD_SERVER, BUILD_ID, getPatchInfo } from '../../lib/appVersion';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * API informasi versi aplikasi.
 *
 * Dipakai oleh:
 *  - AppUpdateManager (cek versi baru -> muat ulang otomatis)
 *  - Halaman unduh APK (menampilkan nomor versi APK terbaru)
 *
 * Nilai BUILD ID di-inject oleh next.config.js saat build,
 * sehingga setiap deploy Vercel otomatis menghasilkan ID baru.
 */
export async function GET() {
  // ✅ BUILD ID sekarang berasal dari content-hash source (konsisten antara
  //    bundle CLIENT & route SERVER). Sebelumnya `Date.now()` per-evaluasi
  //    config menyebabkan ID berbeda → dialog "Muat Ulang" muncul terus.
  //    Catatan: `env` di next.config.js di-inline ke bundle server saat build,
  //    jadi nilai ini konsisten dengan yang dipakai client.
  const buildId = BUILD_ID || process.env.NEXT_PUBLIC_BUILD_ID || 'dev';
  const buildTime = process.env.NEXT_PUBLIC_BUILD_TIME || new Date().toISOString();

  let apkInfo = null;
  try {
    const apkMetaPath = path.join(process.cwd(), 'public', 'apk', 'version.json');
    if (fs.existsSync(apkMetaPath)) {
      apkInfo = JSON.parse(fs.readFileSync(apkMetaPath, 'utf8'));
    }
  } catch (e) {
    apkInfo = null;
  }

  let apkFile = null;
  try {
    const apkPath = path.join(process.cwd(), 'public', 'apk', 'SMK_YPK_SUPER_APP.apk');
    if (fs.existsSync(apkPath)) {
      const stat = fs.statSync(apkPath);
      apkFile = {
        size: stat.size,
        sizeMb: Number((stat.size / (1024 * 1024)).toFixed(2)),
        updatedAt: stat.mtime.toISOString(),
      };
    }
  } catch (e) {
    apkFile = null;
  }

  const patchInfo = getPatchInfo(APP_VERSION);

  return NextResponse.json(
    {
      success: true,
      buildId,
      buildTime,
      appVersion: APP_VERSION,
      buildServer: BUILD_SERVER,
      patchTitle: patchInfo.title,
      patchSummary: patchInfo.summary,
      patchNotes: patchInfo.items,
      apk: {
        url: '/apk/SMK_YPK_SUPER_APP.apk',
        version: apkInfo?.versionCode || 1,
        versionName: apkInfo?.versionName || '1.0.0',
        builtAt: apkInfo?.builtAt || null,
        file: apkFile,
      },
      serverTime: new Date().toISOString(),
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
}