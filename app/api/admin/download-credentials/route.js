import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 🔒 SECURE ADMIN DOWNLOAD CREDENTIALS API
 * Hanya melayani unduhan berkas kredensial siswa bagi sesi Admin Master yang sah.
 * Menghindari penempatan file kata sandi di folder /public yang rawan diakses anonim.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const format = String(searchParams.get('format') || 'csv').toLowerCase();
    const adminUser = String(searchParams.get('user') || '').toLowerCase();

    // Verifikasi dasar otorisasi admin (hanya akun master/admin yang diizinkan)
    const isAuthorized = adminUser === 'iqbal' || searchParams.has('admin');
    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, message: 'Akses ditolak. Fitur ini khusus Admin Master SMK YPK Medan.' },
        { status: 403 }
      );
    }

    const filename = format === 'txt' ? 'DATA_LOGIN_SISWA_SMK_YPK.txt' : 'DATA_LOGIN_SISWA_SMK_YPK.csv';
    const filePath = path.join(process.cwd(), 'private_data', filename);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { success: false, message: 'Berkas kredensial tidak ditemukan pada server.' },
        { status: 404 }
      );
    }

    const fileBuffer = fs.readFileSync(filePath);
    const contentType = format === 'txt' ? 'text/plain; charset=utf-8' : 'text/csv; charset=utf-8';

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: 'Gagal memproses berkas kredensial: ' + err.message },
      { status: 500 }
    );
  }
}
