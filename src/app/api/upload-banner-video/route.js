import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const slideIndex = formData.get('slideIndex') || '0';

    if (!file || typeof file === 'string') {
      return NextResponse.json({ success: false, message: 'Tidak ada file yang diunggah' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Deteksi ekstensi file
    const mimeType = file.type || '';
    let ext = 'mp4';
    if (mimeType.includes('webm')) ext = 'webm';
    else if (mimeType.includes('png')) ext = 'png';
    else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = 'jpg';
    else if (mimeType.includes('webp')) ext = 'webp';
    else {
      const origName = file.name || '';
      const dotIdx = origName.lastIndexOf('.');
      if (dotIdx !== -1) {
        ext = origName.substring(dotIdx + 1).toLowerCase();
      }
    }

    const slideNum = parseInt(String(slideIndex), 10) + 1;
    const isVid = ext === 'mp4' || ext === 'webm' || mimeType.startsWith('video/');
    const filename = isVid ? `banner-video-${slideNum}.${ext}` : `banner-slide-${slideNum}.${ext}`;

    // Target direktori: public/
    const pubDir = path.join(process.cwd(), 'public');
    if (!fs.existsSync(pubDir)) {
      fs.mkdirSync(pubDir, { recursive: true });
    }

    const targetPath = path.join(pubDir, filename);
    fs.writeFileSync(targetPath, buffer);

    // URL publik: untuk video gunakan endpoint streaming /api/banner-video dengan dukungan HTTP 206 (Byte Range)
    const publicUrl = isVid
      ? `/api/banner-video?slide=${slideNum}&file=${filename}&v=${Date.now()}`
      : `/${filename}?v=${Date.now()}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename,
      size: buffer.length,
      media_type: isVid ? 'video' : 'image',
    });
  } catch (error) {
    console.error('Upload banner video error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal menyimpan file banner video' },
      { status: 500 }
    );
  }
}
