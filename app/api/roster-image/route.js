import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'guru'; // 'guru' or 'kelas'
    const rawPage = searchParams.get('page') || '1';

    // Serve logo if requested
    if (type === 'logo' || type === 'logo3d') {
      const logoCandidates = [
        path.join(process.cwd(), 'public', 'logo.png'),
        path.join(process.cwd(), 'logo.png'),
        path.join(process.cwd(), 'public', 'logko.png'),
        path.join(process.cwd(), 'logko.png'),
      ];
      for (const lp of logoCandidates) {
        if (fs.existsSync(lp)) {
          const logoBuf = fs.readFileSync(lp);
          return new Response(logoBuf, {
            status: 200,
            headers: {
              'Content-Type': 'image/png',
              'Cache-Control': 'public, max-age=86400',
            },
          });
        }
      }
    }
    
    // Format nomor halaman: e.g. 1 -> 0001, 14 -> 0014
    const pageNum = parseInt(String(rawPage).replace(/\D/g, ''), 10) || 1;
    const pageStr = String(pageNum).padStart(4, '0');

    const projectRoot = process.cwd();
    let filename = '';

    if (type === 'kelas') {
      filename = `Roster Kelas SMK YPK MEDAN T.P 2026-2027 update 30-07-2026_page-${pageStr}.jpg`;
    } else {
      filename = `Roster Guru SMK YPK MEDAN T.P 2026-2027 update 30-07-2026_page-${pageStr}.jpg`;
    }

    const candidatePaths = [
      path.join(projectRoot, 'public', type === 'kelas' ? 'roster-kelas' : 'roster-guru', filename),
      path.join(projectRoot, 'public', filename),
      path.join(projectRoot, filename),
      path.join(projectRoot, '..', filename),
      path.join(projectRoot, '..', 'public', filename),
    ];

    let filePath = '';
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        filePath = p;
        break;
      }
    }

    if (!filePath) {
      console.warn('Roster image not found across paths:', candidatePaths);
      return new NextResponse('Roster image not found', { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);

    return new Response(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    });
  } catch (err) {
    console.error('Error serving roster image:', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
