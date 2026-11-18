import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const INSIGHTFACE_SERVER_URL = process.env.INSIGHTFACE_SERVER_URL || 'http://127.0.0.1:5000';

function getPythonExecutable() {
  const customPath = 'C:\\Users\\ACER-ENTERPRICE\\AppData\\Local\\Programs\\Python\\Python311\\python.exe';
  if (fs.existsSync(customPath)) {
    return customPath;
  }
  return 'python';
}

// GET: Cek status server AI InsightFace + OpenCV
export async function GET() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);

    const res = await fetch(`${INSIGHTFACE_SERVER_URL}/health`, {
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({
        success: true,
        status: 'online',
        engine: data.engine || 'InsightFace ArcFace + OpenCV 5.1',
        model_name: data.model_name || 'buffalo_sc',
        opencv_version: data.opencv_version || '5.1.0',
        registered_people: data.registered_people_count || 0,
        uptime: data.uptime_seconds || 0,
      });
    }
  } catch (e) {
    // Server belum berjalan
  }

  return NextResponse.json({
    success: false,
    status: 'offline',
    message: 'Server AI InsightFace Python belum aktif di port 5000.',
    can_autostart: process.env.NODE_ENV !== 'production',
  });
}

// POST: Scan frame, ekstraksi biometrik wajah 512-D, pendaftaran, atau luncurkan server/terminal
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      action = 'scan',
      image,
      threshold = 0.65,
      auto_record = true,
      enable_clahe = true,
      // parameter untuk registrasi/update
      id,
      raw_id,
      rawId,
      nama,
      role,
      kelas,
      jurusan,
      descriptor,
    } = body;

    // 1. Aksi Peluncuran Server AI Latar Belakang
    if (action === 'start_server') {
      try {
        const pythonExe = getPythonExecutable();
        const scriptPath = path.join(process.cwd(), 'scripts', 'insightface_opencv_server.py');

        const proc = spawn(pythonExe, [scriptPath], {
          detached: true,
          stdio: 'ignore',
          windowsHide: true,
        });
        proc.unref();

        return NextResponse.json({
          success: true,
          message: 'Memulai Server AI InsightFace + OpenCV di latar belakang...',
        });
      } catch (errSpawn) {
        return NextResponse.json({ success: false, error: errSpawn.message }, { status: 500 });
      }
    }

    // 2. Aksi Peluncuran Terminal OpenCV Layar Penuh Kiosk
    if (action === 'launch_terminal') {
      try {
        const pythonExe = getPythonExecutable();
        const scriptPath = path.join(process.cwd(), 'scripts', 'terminal_presensi_insightface.py');

        const proc = spawn(pythonExe, [scriptPath], {
          detached: true,
          stdio: 'ignore',
          windowsHide: false,
        });
        proc.unref();

        return NextResponse.json({
          success: true,
          message: 'Jendela Terminal Presensi OpenCV 60 FPS berhasil dibuka di Desktop.',
        });
      } catch (errTerm) {
        return NextResponse.json({ success: false, error: errTerm.message }, { status: 500 });
      }
    }

    // 3. Aksi Ekstraksi Biometrik Wajah 512-D ArcFace + OpenCV CLAHE (Untuk Pendaftaran & Pembaruan Wajah)
    if (action === 'extract_face') {
      if (!image) {
        return NextResponse.json({ success: false, message: 'Parameter image wajib diisi' }, { status: 400 });
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(`${INSIGHTFACE_SERVER_URL}/api/extract_face`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image,
          enable_clahe,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        return NextResponse.json(
          { success: false, error: errJson.message || 'Gagal mengekstrak biometrik di server InsightFace' },
          { status: res.status }
        );
      }

      const extractResult = await res.json();
      return NextResponse.json(extractResult);
    }

    // 4. Aksi Pendaftaran atau Pembaruan Langsung ke Memori Server AI
    if (action === 'register_or_update') {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(`${INSIGHTFACE_SERVER_URL}/api/register_or_update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          raw_id: raw_id || rawId,
          nama,
          role,
          kelas,
          jurusan,
          descriptor,
          image,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        return NextResponse.json(
          { success: false, error: errJson.message || 'Gagal register/update di server InsightFace' },
          { status: res.status }
        );
      }

      const regResult = await res.json();
      return NextResponse.json(regResult);
    }

    // 5. Aksi Sinkronisasi Ulang / Reload Data Biometrik
    if (action === 'reload') {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(`${INSIGHTFACE_SERVER_URL}/api/reload`, {
        method: 'POST',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        return NextResponse.json({ success: false, message: 'Gagal reload data biometrik di server' }, { status: res.status });
      }

      const reloadResult = await res.json();
      return NextResponse.json(reloadResult);
    }

    // 6. Aksi Pemindaian Frame Kamera (Scanner Wajah AI)
    if (action === 'scan') {
      if (!image) {
        return NextResponse.json({ success: false, message: 'Parameter image wajib diisi' }, { status: 400 });
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      const res = await fetch(`${INSIGHTFACE_SERVER_URL}/api/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image,
          threshold,
          auto_record,
          enable_clahe,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        return NextResponse.json(
          { success: false, error: errJson.message || 'Gagal memproses frame di InsightFace' },
          { status: res.status }
        );
      }

      const scanResult = await res.json();
      return NextResponse.json(scanResult);
    }

    return NextResponse.json({ success: false, message: 'Action tidak dikenal' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message,
      is_server_down: true,
    }, { status: 500 });
  }
}
