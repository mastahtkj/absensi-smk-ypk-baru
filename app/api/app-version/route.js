import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
  const buildId = process.env.NEXT_PUBLIC_BUILD_ID || 'dev';
  const buildTime = process.env.NEXT_PUBLIC_BUILD_TIME || new Date().toISOString();
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || '2.0.0';

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

  return NextResponse.json(
    {
      success: true,
      buildId,
      buildTime,
      appVersion,
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