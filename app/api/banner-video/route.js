import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

// 🎬 STREAMING VIDEO BANNER DENGAN DUKUNGAN HTTP 206 (PARTIAL CONTENT / BYTE RANGE)
// Wajib untuk iPhone Safari, iPad, dan Android Chrome agar video berputar lancar tanpa layar hitam/stuck.
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const slide = searchParams.get('slide') || '1';
    const fileParam = searchParams.get('file');

    let filePath = null;
    const pubDir = path.join(process.cwd(), 'public');

    if (fileParam) {
      const cleanName = path.basename(fileParam);
      const cand = path.join(pubDir, cleanName);
      if (fs.existsSync(cand)) filePath = cand;
    }

    if (!filePath) {
      const candidates = [
        path.join(pubDir, `banner-video-${slide}.mp4`),
        path.join(pubDir, `banner-video-${slide}.webm`),
        path.join(pubDir, `banner-video-1.mp4`),
        path.join(pubDir, `banner-video-1.webm`),
        path.join(process.cwd(), `banner-video-${slide}.mp4`),
        path.join(process.cwd(), `banner-video-1.mp4`),
      ];
      for (const c of candidates) {
        if (fs.existsSync(c)) {
          filePath = c;
          break;
        }
      }
    }

    if (!filePath || !fs.existsSync(filePath)) {
      return new Response('Video banner tidak ditemukan di server.', { status: 404 });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = request.headers.get('range');

    const ext = path.extname(filePath).toLowerCase();
    const contentType = ext === '.webm' ? 'video/webm' : 'video/mp4';

    if (range) {
      // 📱 iOS Safari & Android Chrome Range Request (HTTP 206 Partial Content)
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;

      const fileStream = fs.createReadStream(filePath, { start, end });
      const stream = new ReadableStream({
        start(controller) {
          fileStream.on('data', (chunk) => controller.enqueue(chunk));
          fileStream.on('end', () => controller.close());
          fileStream.on('error', (err) => controller.error(err));
        },
      });

      return new Response(stream, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': String(chunksize),
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600',
        },
      });
    } else {
      const fileStream = fs.createReadStream(filePath);
      const stream = new ReadableStream({
        start(controller) {
          fileStream.on('data', (chunk) => controller.enqueue(chunk));
          fileStream.on('end', () => controller.close());
          fileStream.on('error', (err) => controller.error(err));
        },
      });

      return new Response(stream, {
        status: 200,
        headers: {
          'Content-Length': String(fileSize),
          'Accept-Ranges': 'bytes',
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }
  } catch (error) {
    console.error('Banner video streaming error:', error);
    return new Response('Terjadi kesalahan saat memutar video banner.', { status: 500 });
  }
}
