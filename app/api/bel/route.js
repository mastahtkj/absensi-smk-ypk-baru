import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const BELL_FILE_MAP = {
  '5-menit-awal': '5 Menit Awal Jam Pelajaran ke 1 (IND - ENG).mp3',
  'apel': '5 Menit Awal Jam Pelajaran ke 1 (IND - ENG).mp3',
  'les-1': 'Pelajaran ke 1 Dimulai V4 (IND - ENG).mp3',
  '1': 'Pelajaran ke 1 Dimulai V4 (IND - ENG).mp3',
  'les-2': 'Pelajaran ke 2 Dimulai V4 (IND - ENG).mp3',
  '2': 'Pelajaran ke 2 Dimulai V4 (IND - ENG).mp3',
  'les-3': 'Pelajaran ke 3 Dimulai V4 (IND - ENG).mp3',
  '3': 'Pelajaran ke 3 Dimulai V4 (IND - ENG).mp3',
  'les-4': 'Pelajaran ke 4 Dimulai V4 (IND - ENG).mp3',
  '4': 'Pelajaran ke 4 Dimulai V4 (IND - ENG).mp3',
  'istirahat-1': 'Istirahat Pertama (IND - ENG).mp3',
  'les-5': 'Pelajaran ke 5 Dimulai V4 (IND - ENG).mp3',
  '5': 'Pelajaran ke 5 Dimulai V4 (IND - ENG).mp3',
  'les-6': 'Pelajaran ke 6 Dimulai V4 (IND - ENG).mp3',
  '6': 'Pelajaran ke 6 Dimulai V4 (IND - ENG).mp3',
  'les-7': 'Pelajaran ke 7 Dimulai V4 (IND - ENG).mp3',
  '7': 'Pelajaran ke 7 Dimulai V4 (IND - ENG).mp3',
  'istirahat-2': 'Istirahat Kedua (IND - ENG).mp3',
  'les-8': 'Pelajaran ke 8 Dimulai V4 (IND - ENG).mp3',
  '8': 'Pelajaran ke 8 Dimulai V4 (IND - ENG).mp3',
  'les-9': 'Pelajaran ke 9 Dimulai V4 (IND - ENG).mp3',
  '9': 'Pelajaran ke 9 Dimulai V4 (IND - ENG).mp3',
  'les-10': 'Pelajaran ke 10 Dimulai V4 (IND - ENG).mp3',
  '10': 'Pelajaran ke 10 Dimulai V4 (IND - ENG).mp3',
  'les-11': 'Pelajaran ke 11 Dimulai V4 (IND - ENG).mp3',
  '11': 'Pelajaran ke 11 Dimulai V4 (IND - ENG).mp3',
  'pulang': 'Akhir Pelajaran V4 (IND - ENG).mp3',
  'akhir': 'Akhir Pelajaran V4 (IND - ENG).mp3',
  'jumat': 'Kegiatan Ibadah Sholat Jumat Dimulai V4 (IND - ENG).mp3',
  'sholat-jumat': 'Kegiatan Ibadah Sholat Jumat Dimulai V4 (IND - ENG).mp3',
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = (searchParams.get('type') || searchParams.get('slot') || searchParams.get('file') || '1').toLowerCase();

    let targetFilename = BELL_FILE_MAP[key] || searchParams.get('file') || 'Pelajaran ke 1 Dimulai V4 (IND - ENG).mp3';

    // Cari file di direktori 'Bel Jam Pelajaran V4' atau 'public/bel'
    const projectRoot = process.cwd();
    const primaryPath = path.join(projectRoot, 'Bel Jam Pelajaran V4', targetFilename);
    const fallbackPath = path.join(projectRoot, 'public', 'bel', targetFilename);

    let filePath = '';
    if (fs.existsSync(primaryPath)) {
      filePath = primaryPath;
    } else if (fs.existsSync(fallbackPath)) {
      filePath = fallbackPath;
    } else {
      const folderPath = path.join(projectRoot, 'Bel Jam Pelajaran V4');
      if (fs.existsSync(folderPath)) {
        const files = fs.readdirSync(folderPath);
        const match = files.find((f) => f.toLowerCase().includes(key) || key.includes(f.toLowerCase().slice(0, 5)));
        if (match) {
          filePath = path.join(folderPath, match);
        }
      }
    }

    if (!filePath || !fs.existsSync(filePath)) {
      return new Response(JSON.stringify({ error: 'Audio file not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const fileBuffer = fs.readFileSync(filePath);
    return new Response(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Accept-Ranges': 'bytes',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
