import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { verifySessionToken } from '../../../lib/cryptoAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 🔒 SECURE ADMIN DOWNLOAD CREDENTIALS API
 * Hanya melayani unduhan berkas kredensial siswa bagi sesi Admin Master yang terotentikasi sah.
 * Wajib memiliki token sesi JWT/HMAC valid dengan role Admin/Master.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const format = String(searchParams.get('format') || 'csv').toLowerCase();

    // 🔒 Verifikasi otentikasi kriptografis sesi Admin Master melalui Cookie atau Header
    const cookieToken = request.cookies.get('smk_ypk_auth_token')?.value;
    const authHeader = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    const token = cookieToken || authHeader;

    const session = verifySessionToken(token);
    if (!session || (!session.isMaster && session.role !== 'admin')) {
      return NextResponse.json(
        { success: false, message: 'Akses ditolak. Fitur ini memerlukan sesi login Admin Master yang sah.' },
        { status: 401 }
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
