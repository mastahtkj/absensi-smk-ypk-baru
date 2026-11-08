'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Swal from 'sweetalert2';
import {
  extractFaceDescriptorFromCanvas,
  findBestFaceMatch,
  captureAndCompressCanvas,
} from '../utils/faceRecognition';
import {
  playPresensiSound,
  playSuccessSound,
  speakIndonesianAi,
} from './NotificationCenter';

export default function FaceRecognitionScanner({
  isOpen,
  onClose,
  siswaList = [],
  currentUser,
  supabase,
  onAttendanceSuccess,
  appConfig = {},
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const streamRef = useRef(null);
  const isProcessingRef = useRef(false);
  const lastScannedTimeRef = useRef({});

  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState('user'); // 'user' (depan/selfie) | 'environment' (belakang)
  const [attendanceMode, setAttendanceMode] = useState('masuk'); // 'masuk' | 'pulang'
  const [scanStatus, setScanStatus] = useState('Mempersiapkan Kamera AI...');
  const [detectedUser, setDetectedUser] = useState(null);
  const [confidence, setConfidence] = useState(0);
  const [recentScans, setRecentScans] = useState([]);
  const [hasCameraPermission, setHasCameraPermission] = useState(true);
  const [cameraError, setCameraError] = useState('');

  // Hitung jumlah siswa & guru yang sudah rekam wajah
  const registeredCount = siswaList.filter((s) => {
    const desc = s.face_descriptor || s.biodata?.face_descriptor;
    return Boolean(desc);
  }).length;

  // 1. Inisialisasi & Start Kamera
  const startCamera = useCallback(async (mode = facingMode) => {
    try {
      setCameraError('');
      setScanStatus('Mengakses Sensor Kamera...');

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Browser Anda tidak mendukung akses kamera HTML5.');
      }

      const constraints = {
        audio: false,
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().catch(() => {});
          setCameraActive(true);
          setScanStatus('Mendeteksi Wajah...');
        };
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setHasCameraPermission(false);
      setCameraError(err.message || 'Izin kamera ditolak atau kamera sedang digunakan aplikasi lain.');
      setScanStatus('Kamera Tidak Tersedia');
    }
  }, [facingMode]);

  // Hentikan Kamera
  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  // 2. Lifecycle buka/tutup scanner
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, startCamera, stopCamera]);

  // Ganti Kamera Depan / Belakang
  const handleToggleCamera = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // 3. Loop Realtime AI Face Tracking & Recognition
  useEffect(() => {
    if (!cameraActive || !isOpen) return;

    let scanInterval = 0;

    const processFrame = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState !== 4) {
        animFrameRef.current = requestAnimationFrame(processFrame);
        return;
      }

      const w = video.videoWidth || 640;
      const h = video.videoHeight || 480;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(video, 0, 0, w, h);

      // Gambar HUD Cyber Face Tracker
      const ovalW = Math.round(w * 0.46);
      const ovalH = Math.round(h * 0.62);
      const ovalX = Math.round((w - ovalW) / 2);
      const ovalY = Math.round((h - ovalH) / 2);

      // Target Corner Brackets
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      const cornerLen = 28;

      // Kiri Atas
      ctx.beginPath();
      ctx.moveTo(ovalX, ovalY + cornerLen);
      ctx.lineTo(ovalX, ovalY);
      ctx.lineTo(ovalX + cornerLen, ovalY);
      ctx.stroke();

      // Kanan Atas
      ctx.beginPath();
      ctx.moveTo(ovalX + ovalW - cornerLen, ovalY);
      ctx.lineTo(ovalX + ovalW, ovalY);
      ctx.lineTo(ovalX + ovalW, ovalY + cornerLen);
      ctx.stroke();

      // Kiri Bawah
      ctx.beginPath();
      ctx.moveTo(ovalX, ovalY + ovalH - cornerLen);
      ctx.lineTo(ovalX, ovalY + ovalH);
      ctx.lineTo(ovalX + cornerLen, ovalY + ovalH);
      ctx.stroke();

      // Kanan Bawah
      ctx.beginPath();
      ctx.moveTo(ovalX + ovalW - cornerLen, ovalY + ovalH);
      ctx.lineTo(ovalX + ovalW, ovalY + ovalH);
      ctx.lineTo(ovalX + ovalW, ovalY + ovalH - cornerLen);
      ctx.stroke();

      // Laser Scanner Animation Line
      scanInterval = (scanInterval + 3) % ovalH;
      const scanY = ovalY + scanInterval;
      const grad = ctx.createLinearGradient(ovalX, scanY, ovalX + ovalW, scanY);
      grad.addColorStop(0, 'rgba(6, 182, 212, 0)');
      grad.addColorStop(0.5, 'rgba(6, 182, 212, 0.85)');
      grad.addColorStop(1, 'rgba(6, 182, 212, 0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(ovalX + 4, scanY);
      ctx.lineTo(ovalX + ovalW - 4, scanY);
      ctx.stroke();

      // Setiap 12 frame (~200ms) lakukan ekstraksi AI & matching
      if (scanInterval % 15 === 0 && !isProcessingRef.current) {
        const result = extractFaceDescriptorFromCanvas(canvas);
        if (result && result.hasFace) {
          setScanStatus('Memvalidasi Wajah...');

          const match = findBestFaceMatch(result.descriptor, siswaList, 0.76);
          if (match && match.user) {
            const userId = match.user.id || match.user.nama;
            const now = Date.now();
            const lastTime = lastScannedTimeRef.current[userId] || 0;

            // Anti-spam cooldown 4 detik per orang
            if (now - lastTime > 4000) {
              lastScannedTimeRef.current[userId] = now;
              handleAttendanceRecord(match.user, match.confidencePercent, canvas);
            }
          } else {
            setConfidence(Math.round(result.skinRatio * 100));
            setScanStatus('Wajah Terdeteksi (Belum Terdaftar / Tidak Cocok)');
          }
        } else {
          setScanStatus('Arahkan Wajah ke Dalam Kotak');
          setDetectedUser(null);
          setConfidence(0);
        }
      }

      animFrameRef.current = requestAnimationFrame(processFrame);
    };

    animFrameRef.current = requestAnimationFrame(processFrame);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [cameraActive, isOpen, siswaList]);

  // 4. Catat Presensi ke Supabase & Sistem
  const handleAttendanceRecord = async (user, matchConfidence, canvas) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      playPresensiSound();
      setDetectedUser(user);
      setConfidence(matchConfidence);
      setScanStatus(`✅ Wajah Terkonfirmasi: ${user.nama} (${matchConfidence}%)`);

      const now = new Date();
      const jamStr = now.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'Asia/Jakarta',
      });
      const tglWib = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });

      // Hitung status: Siswa lewat 07:30 = Telat, Guru selalu Hadir
      let finalStatus = 'Hadir';
      const isGuru = Boolean(user.isGuru || String(user.id).startsWith('GURU-'));

      if (!isGuru && attendanceMode === 'masuk') {
        const curMin = now.getHours() * 60 + now.getMinutes();
        if (curMin > 450) {
          // Lewat 07:30 WIB
          finalStatus = 'Telat';
        }
      }

      if (attendanceMode === 'pulang') {
        finalStatus = 'Pulang';
      }

      // Ambil snapshot bukti scan wajah
      const snapshotUrl = captureAndCompressCanvas(canvas, 320, 0.7);

      // Simpan langsung ke database Supabase tabel 'absensi'
      if (supabase) {
        const payload = {
          nama: user.nama,
          kelas: user.kelas || 'Siswa',
          status: finalStatus,
          tipe: attendanceMode === 'pulang' ? 'pulang_selesai' : 'masuk',
          jam_masuk: attendanceMode === 'masuk' ? jamStr : undefined,
          jam_pulang: attendanceMode === 'pulang' ? jamStr : undefined,
          rfid_uid: `FACE-AI-${user.id || user.rawId || 'OK'}`,
          created_at: new Date().toISOString(),
        };

        await supabase.from('absensi').insert([payload]);
      }

      // Voice greeting AI
      const greetingMsg =
        attendanceMode === 'masuk'
          ? `Selamat ${now.getHours() < 11 ? 'pagi' : 'siang'}, ${user.nama}. Presensi masuk berhasil dicatat!`
          : `Terima kasih, ${user.nama}. Presensi pulang berhasil dicatat. Hati-hati di jalan!`;
      speakIndonesianAi(greetingMsg);

      // Tambahkan ke log terkini
      const logEntry = {
        id: Date.now(),
        nama: user.nama,
        kelas: user.kelas,
        status: finalStatus,
        jam: jamStr,
        mode: attendanceMode,
        confidence: matchConfidence,
        photo: snapshotUrl || user.foto_url,
      };

      setRecentScans((prev) => [logEntry, ...prev.slice(0, 9)]);

      if (onAttendanceSuccess) {
        onAttendanceSuccess(logEntry);
      }

      playSuccessSound();
    } catch (err) {
      console.error('Error recording attendance:', err);
    } finally {
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 2500);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.96)',
        backdropFilter: 'blur(10px)',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: '16px',
        overflowY: 'auto',
      }}
    >
      {/* TOP BAR SCANNER */}
      <div
        style={{
          width: '100%',
          maxWidth: '720px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '14px',
          color: '#ffffff',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: 'rgba(6, 182, 212, 0.15)',
              border: '1.5px solid #06b6d4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
            }}
          >
            📸
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '800', letterSpacing: '0.3px', color: '#38bdf8' }}>
              AI Face Recognition Attendance
            </h2>
            <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>
              SMK YPK MEDAN • Digitalisasi Presensi Biometrik Wajah
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={handleToggleCamera}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
            title="Ganti Kamera Depan / Belakang"
          >
            🔄 {facingMode === 'user' ? 'Kamera Belakang' : 'Kamera Depan'}
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              backgroundColor: '#ef4444',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: '13px',
              fontWeight: '800',
              cursor: 'pointer',
            }}
          >
            ✕ Tutup
          </button>
        </div>
      </div>

      {/* MODE SELECTOR (MASUK vs PULANG) */}
      <div
        style={{
          width: '100%',
          maxWidth: '720px',
          display: 'flex',
          gap: '8px',
          marginBottom: '12px',
        }}
      >
        <button
          type="button"
          onClick={() => setAttendanceMode('masuk')}
          style={{
            flex: 1,
            padding: '10px 12px',
            borderRadius: '10px',
            border: 'none',
            fontSize: '13px',
            fontWeight: '800',
            cursor: 'pointer',
            backgroundColor: attendanceMode === 'masuk' ? '#2563eb' : 'rgba(255, 255, 255, 0.08)',
            color: attendanceMode === 'masuk' ? '#ffffff' : '#94a3b8',
            boxShadow: attendanceMode === 'masuk' ? '0 4px 14px rgba(37, 99, 235, 0.4)' : 'none',
            transition: 'all 0.2s',
          }}
        >
          🌅 Presensi Masuk (06.30 - 07.30)
        </button>
        <button
          type="button"
          onClick={() => setAttendanceMode('pulang')}
          style={{
            flex: 1,
            padding: '10px 12px',
            borderRadius: '10px',
            border: 'none',
            fontSize: '13px',
            fontWeight: '800',
            cursor: 'pointer',
            backgroundColor: attendanceMode === 'pulang' ? '#059669' : 'rgba(255, 255, 255, 0.08)',
            color: attendanceMode === 'pulang' ? '#ffffff' : '#94a3b8',
            boxShadow: attendanceMode === 'pulang' ? '0 4px 14px rgba(5, 150, 105, 0.4)' : 'none',
            transition: 'all 0.2s',
          }}
        >
          🏠 Presensi Pulang
        </button>
      </div>

      {/* VIEWFINDER KAMERA & HUD */}
      <div
        style={{
          width: '100%',
          maxWidth: '720px',
          position: 'relative',
          borderRadius: '18px',
          overflow: 'hidden',
          backgroundColor: '#020617',
          border: '2px solid rgba(6, 182, 212, 0.35)',
          boxShadow: '0 0 35px rgba(6, 182, 212, 0.2)',
          aspectRatio: '4 / 3',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
          }}
        />

        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
          }}
        />

        {/* STATUS HUD OVERLAY */}
        <div
          style={{
            position: 'absolute',
            bottom: '14px',
            left: '14px',
            right: '14px',
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(8px)',
            borderRadius: '12px',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#ffffff',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: detectedUser ? '#10b981' : '#06b6d4',
                boxShadow: detectedUser ? '0 0 10px #10b981' : '0 0 8px #06b6d4',
                animation: 'pulse 1.5s infinite',
              }}
            />
            <span style={{ fontSize: '13px', fontWeight: '700' }}>
              {scanStatus}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#94a3b8' }}>
            <span>Database Wajah: <b style={{ color: '#38bdf8' }}>{registeredCount} Orang</b></span>
          </div>
        </div>

        {/* NOTIFIKASI ERROR KAMERA JIKA DITOLAK */}
        {cameraError && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'rgba(15, 23, 42, 0.95)',
              padding: '20px',
              borderRadius: '14px',
              border: '1px solid #ef4444',
              textAlign: 'center',
              color: '#f87171',
              maxWidth: '85%',
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🚫</div>
            <b style={{ fontSize: '15px', color: '#ffffff' }}>Gagal Mengakses Kamera</b>
            <p style={{ margin: '6px 0 14px 0', fontSize: '12px', color: '#cbd5e1' }}>
              {cameraError}
            </p>
            <button
              type="button"
              onClick={() => startCamera()}
              style={{
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              Coba Lagi
            </button>
          </div>
        )}
      </div>

      {/* POPUP TERAKHIR KETIKA WAJAH TERDETEKSI */}
      {detectedUser && (
        <div
          style={{
            width: '100%',
            maxWidth: '720px',
            backgroundColor: '#0f172a',
            border: '2px solid #10b981',
            borderRadius: '14px',
            padding: '14px 18px',
            marginTop: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.25)',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                backgroundColor: '#10b981',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
              }}
            >
              ✓
            </div>
            <div>
              <span style={{ fontSize: '10px', color: '#10b981', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                PRESENSI {attendanceMode.toUpperCase()} BERHASIL
              </span>
              <h3 style={{ margin: '2px 0', fontSize: '17px', color: '#ffffff', fontWeight: '800' }}>
                {detectedUser.nama}
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
                Kelas: <b>{detectedUser.kelas || 'Guru / Staff'}</b> • Akurasi AI: <b style={{ color: '#38bdf8' }}>{confidence}%</b>
              </p>
            </div>
          </div>

          <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', padding: '6px 14px', borderRadius: '8px', border: '1px solid #10b981' }}>
            <span style={{ fontSize: '12px', fontWeight: '800', color: '#34d399' }}>
              Tercatat Sukses
            </span>
          </div>
        </div>
      )}

      {/* LOG RIWAYAT SCAN HARI INI */}
      {recentScans.length > 0 && (
        <div
          style={{
            width: '100%',
            maxWidth: '720px',
            marginTop: '14px',
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            borderRadius: '12px',
            padding: '12px 16px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Riwayat Scan Sesi Ini ({recentScans.length})
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {recentScans.map((scan) => (
              <div
                key={scan.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#ffffff',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span>
                  <span style={{ fontWeight: '700' }}>{scan.nama}</span>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>({scan.kelas})</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#38bdf8' }}>{scan.jam} WIB</span>
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: scan.status === 'Telat' ? '#ef4444' : '#10b981',
                      color: '#ffffff',
                      fontWeight: '800',
                    }}
                  >
                    {scan.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
