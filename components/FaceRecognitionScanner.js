'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Swal from 'sweetalert2';
import {
  extractFaceDescriptorFromCanvas,
  findBestFaceMatch,
  captureAndCompressCanvas,
  detectFaceBounds,
  drawFaceDetectionBox,
} from '../utils/faceRecognition';
import {
  playPresensiSound,
  playSuccessSound,
  speakIndonesianAi,
} from './NotificationCenter';

function extractJurusan(kelas) {
  if (!kelas) return '';
  const k = String(kelas).toUpperCase();
  if (k.includes('TJKT') || k.includes('TKJ')) return 'TJKT';
  if (k.includes('AKL') || k.includes('AK')) return 'AKL';
  if (k.includes('MPLB') || k.includes('AP') || k.includes('OTKP')) return 'MPLB';
  if (k.includes('PM') || k.includes('BD') || k.includes('BDP')) return 'Pemasaran';
  return '';
}

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
  // Set untuk mencatat siapa saja yang SUDAH presensi sesi ini agar 1x saja & tidak spam audio
  const alreadyScannedSetRef = useRef(new Set());
  const timeoutAlreadyRef = useRef(null);
  const lastDetectedBoxRef = useRef(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState('user'); // 'user' (depan/selfie) | 'environment' (belakang)
  const [attendanceMode, setAttendanceMode] = useState('masuk'); // 'masuk' | 'pulang'
  const [scanStatus, setScanStatus] = useState('Mempersiapkan Kamera AI...');
  const [detectedUser, setDetectedUser] = useState(null);
  const [alreadyAttendedUser, setAlreadyAttendedUser] = useState(null);
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
        throw new Error('Browser Anda tidak mendukung akses kamera biometrik HTML5.');
      }

      const constraints = {
        audio: false,
        video: {
          facingMode: mode,
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
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

  // 3. Loop Realtime AI Face Tracking & Recognition dengan Efek Grid Holografik Garis-Garis
  useEffect(() => {
    if (!cameraActive || !isOpen) return;

    let scanInterval = 0;
    let pulseStep = 0;

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

      scanInterval = (scanInterval + 1) % 1000;

      // 1. Ekstraksi AI & Matching setiap 8 frame (~150ms)
      if (Math.floor(scanInterval) % 8 === 0 && !isProcessingRef.current) {
        const result = extractFaceDescriptorFromCanvas(canvas);
        if (result && result.hasFace) {
          lastDetectedBoxRef.current = result.faceBox;
          const match = findBestFaceMatch(result, siswaList, 0.58);
          if (match && match.user) {
            handleAttendanceCheck(match.user, match.confidencePercent, canvas);
          } else {
            // WAJAH TIDAK COCOK / BELUM TERDAFTAR DI SISTEM
            setDetectedUser(null);
            setAlreadyAttendedUser(null);
            const closest = match?.closestConfidence || 0;
            if (closest > 0) {
              setConfidence(closest);
              setScanStatus(`⚠️ Wajah Tidak Cocok (Akurasi: ${closest}% • Butuh ≥58%)`);
            } else {
              setConfidence(0);
              setScanStatus('⚠️ Wajah Belum Terdaftar di Sistem');
            }
          }
        } else {
          lastDetectedBoxRef.current = null;
          setScanStatus('Arahkan Wajah ke Dalam Kamera');
          setDetectedUser(null);
          setAlreadyAttendedUser(null);
          setConfidence(0);
        }
      }

      // 2. Gambar Tampilan Kotak Hijau + Titik Landmark Persis Sesuai Gambar 2 (Face Detection Result)
      const activeBox = lastDetectedBoxRef.current || {
        x: Math.round(w * 0.26),
        y: Math.round(h * 0.16),
        width: Math.round(w * 0.48),
        height: Math.round(h * 0.64),
      };

      // Tentukan teks label tag dan warna kotak
      let labelText = 'face';
      let boxColor = '#22c55e'; // Hijau terang Gambar 2

      if (detectedUser) {
        labelText = `face: ${detectedUser.nama} (${confidence}%)`;
        boxColor = '#22c55e';
      } else if (alreadyAttendedUser) {
        labelText = `face: Sudah Presensi - ${alreadyAttendedUser.nama}`;
        boxColor = '#06b6d4';
      } else if (confidence > 0) {
        labelText = `face [Tidak Cocok: ${confidence}%]`;
        boxColor = '#f59e0b';
      }

      drawFaceDetectionBox(ctx, activeBox, {
        labelText,
        statusColor: boxColor,
        showTitle: true,
      });

      animFrameRef.current = requestAnimationFrame(processFrame);
    };

    animFrameRef.current = requestAnimationFrame(processFrame);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [cameraActive, isOpen, siswaList, attendanceMode]);

  // 4. Pengecekan Presensi (1x Deteksi Masuk Presensi, Jika Sudah Maka Tanpa Suara & Tampil Tulisan)
  const handleAttendanceCheck = (user, matchConfidence, canvas) => {
    const userId = String(user.id || user.rawId || user.nama).trim();
    const todayWib = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
    const attendanceKey = `${userId}_${attendanceMode}_${todayWib}`;

    // Cek apakah orang ini SUDAH tercatat pada sesi ini
    if (alreadyScannedSetRef.current.has(attendanceKey)) {
      // Wajah muncul lagi: TIDAK ADA SUARA, TIDAK ADA INSERT ULANG, CUKUP TULISAN SUDAH PRESENSI
      setAlreadyAttendedUser(user);
      setDetectedUser(null);
      setScanStatus(`ℹ️ Sudah Presensi ${attendanceMode.toUpperCase()}: ${user.nama}`);

      if (timeoutAlreadyRef.current) clearTimeout(timeoutAlreadyRef.current);
      timeoutAlreadyRef.current = setTimeout(() => {
        setAlreadyAttendedUser(null);
      }, 3500);
      return;
    }

    // Jika belum pernah scan pada sesi ini: Eksekusi 1x Presensi Resmi
    handleAttendanceRecord(user, matchConfidence, canvas, attendanceKey);
  };

  // 5. Catat Presensi Resmi ke Supabase & Sistem (Cukup 1x Saja)
  const handleAttendanceRecord = async (user, matchConfidence, canvas, attendanceKey) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      // Tandai langsung di Set agar tidak bisa dobel
      alreadyScannedSetRef.current.add(attendanceKey);

      // Suara & status sukses 1x
      playPresensiSound();
      setDetectedUser(user);
      setAlreadyAttendedUser(null);
      setConfidence(matchConfidence);
      setScanStatus(`✅ Wajah Terkonfirmasi: ${user.nama} (${matchConfidence}%)`);

      const now = new Date();
      const jamStr = now.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'Asia/Jakarta',
      });

      // Hitung keterlambatan berdasarkan WIB:
      // Siswa lewat 07:30 WIB = Telat
      // Guru bebas waktunya presensi masuk dan pulang (selalu Hadir / Pulang tanpa denda telat)
      const wibStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
      const wibDate = new Date(wibStr);
      const wibMinutes = wibDate.getHours() * 60 + wibDate.getMinutes();

      const isGuru = Boolean(user.isGuru || String(user.id).startsWith('GURU-') || user.role === 'guru' || user.role === 'admin');

      let finalStatus = 'Hadir';
      if (!isGuru && attendanceMode === 'masuk') {
        // 07:30 WIB = 7*60 + 30 = 450 menit
        if (wibMinutes > 450) {
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
          kelas: user.kelas || (isGuru ? 'Guru' : 'Siswa'),
          status: finalStatus,
          tipe: attendanceMode === 'pulang' ? 'pulang_selesai' : 'masuk',
          jam_masuk: attendanceMode === 'masuk' ? jamStr : undefined,
          jam_pulang: attendanceMode === 'pulang' ? jamStr : undefined,
          created_at: new Date().toISOString(),
        };

        await supabase.from('absensi').insert([payload]);
      }

      // Voice greeting AI ramah
      const sapaan = now.getHours() < 11 ? 'pagi' : (now.getHours() < 15 ? 'siang' : 'sore');
      const statusKet = finalStatus === 'Telat' ? 'tercatat telat' : 'berhasil';
      const greetingMsg =
        attendanceMode === 'masuk'
          ? `Selamat ${sapaan}, ${user.nama}. Presensi masuk ${statusKet}!`
          : `Terima kasih, ${user.nama}. Presensi pulang berhasil dicatat. Hati-hati di jalan!`;
      speakIndonesianAi(greetingMsg);

      // Tambahkan ke log riwayat scan sesi ini
      const logEntry = {
        id: Date.now(),
        nama: user.nama,
        isGuru: isGuru,
        kelas: user.kelas || '',
        jurusan: user.jurusan || extractJurusan(user.kelas),
        inisial: user.inisial || user.kode_guru || '',
        status: finalStatus,
        jam: jamStr,
        mode: attendanceMode,
        confidence: matchConfidence,
        photo: snapshotUrl || user.foto_url,
      };

      setRecentScans((prev) => [logEntry, ...prev.slice(0, 19)]);

      if (onAttendanceSuccess) {
        onAttendanceSuccess(logEntry);
      }

      playSuccessSound();
    } catch (err) {
      console.error('Error recording attendance:', err);
    } finally {
      setTimeout(() => {
        isProcessingRef.current = false;
        // Bersihkan notifikasi popup sukses setelah 3.5 detik agar siap menscan orang berikutnya
        setDetectedUser(null);
      }, 3500);
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
        backgroundColor: 'rgba(11, 19, 38, 0.97)',
        backdropFilter: 'blur(14px)',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: '16px 12px 28px 12px',
        overflowY: 'auto',
      }}
    >
      {/* TOP BAR SCANNER */}
      <div
        style={{
          width: '100%',
          maxWidth: '780px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
          color: '#ffffff',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              backgroundColor: 'rgba(6, 182, 212, 0.15)',
              border: '1.5px solid #06b6d4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              boxShadow: '0 0 12px rgba(6, 182, 212, 0.3)',
            }}
          >
            📸
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', letterSpacing: '0.3px', color: '#38bdf8' }}>
              AI Face Recognition Terminal
            </h2>
            <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>
              SMK YPK MEDAN • Terminal Biometrik Wajah Presensi
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
              padding: '7px 12px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
            title="Ganti Kamera Depan / Belakang / Webcam"
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
              padding: '7px 14px',
              fontSize: '13px',
              fontWeight: '800',
              cursor: 'pointer',
              boxShadow: '0 2px 10px rgba(239, 68, 68, 0.35)',
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
          maxWidth: '780px',
          display: 'flex',
          gap: '10px',
          marginBottom: '12px',
        }}
      >
        <button
          type="button"
          onClick={() => {
            setAttendanceMode('masuk');
            setDetectedUser(null);
            setAlreadyAttendedUser(null);
          }}
          style={{
            flex: 1,
            padding: '11px 14px',
            borderRadius: '12px',
            border: attendanceMode === 'masuk' ? '1.5px solid #60a5fa' : '1px solid rgba(255,255,255,0.1)',
            fontSize: '13px',
            fontWeight: '800',
            cursor: 'pointer',
            backgroundColor: attendanceMode === 'masuk' ? '#2563eb' : 'rgba(255, 255, 255, 0.06)',
            color: attendanceMode === 'masuk' ? '#ffffff' : '#94a3b8',
            boxShadow: attendanceMode === 'masuk' ? '0 4px 16px rgba(37, 99, 235, 0.45)' : 'none',
            transition: 'all 0.2s',
          }}
        >
          🌅 Presensi Masuk (06.30 - 07.30)
        </button>
        <button
          type="button"
          onClick={() => {
            setAttendanceMode('pulang');
            setDetectedUser(null);
            setAlreadyAttendedUser(null);
          }}
          style={{
            flex: 1,
            padding: '11px 14px',
            borderRadius: '12px',
            border: attendanceMode === 'pulang' ? '1.5px solid #34d399' : '1px solid rgba(255,255,255,0.1)',
            fontSize: '13px',
            fontWeight: '800',
            cursor: 'pointer',
            backgroundColor: attendanceMode === 'pulang' ? '#059669' : 'rgba(255, 255, 255, 0.06)',
            color: attendanceMode === 'pulang' ? '#ffffff' : '#94a3b8',
            boxShadow: attendanceMode === 'pulang' ? '0 4px 16px rgba(5, 150, 105, 0.45)' : 'none',
            transition: 'all 0.2s',
          }}
        >
          🏠 Presensi Pulang
        </button>
      </div>

      {/* BINGKAI VIEWFINDER KAMERA (DIPERLEBAR & DIPERBESAR - TIDAK LONJONG) */}
      <div
        style={{
          width: '100%',
          maxWidth: '780px',
          minHeight: '340px',
          maxHeight: '56vh',
          aspectRatio: '16 / 10',
          position: 'relative',
          borderRadius: '20px',
          overflow: 'hidden',
          backgroundColor: '#020617',
          border: '2.5px solid #06b6d4',
          boxShadow: '0 0 35px rgba(6, 182, 212, 0.3), inset 0 0 25px rgba(6, 182, 212, 0.1)',
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
            bottom: '12px',
            left: '12px',
            right: '12px',
            backgroundColor: 'rgba(15, 23, 42, 0.88)',
            backdropFilter: 'blur(10px)',
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
                backgroundColor: detectedUser ? '#10b981' : (alreadyAttendedUser ? '#38bdf8' : '#06b6d4'),
                boxShadow: detectedUser ? '0 0 10px #10b981' : '0 0 8px #06b6d4',
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

        {/* NOTIFIKASI ERROR KAMERA */}
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

      {/* POPUP: KETIKA WAJAH SUDAH PRESENSI (TANPA SUARA, CUKUP TULISAN RESMI) */}
      {alreadyAttendedUser && !detectedUser && (
        <div
          style={{
            width: '100%',
            maxWidth: '780px',
            backgroundColor: '#0f172a',
            border: '2px solid #38bdf8',
            borderRadius: '14px',
            padding: '12px 18px',
            marginTop: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 6px 20px rgba(56, 189, 248, 0.2)',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                backgroundColor: 'rgba(56, 189, 248, 0.2)',
                color: '#38bdf8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                border: '1.5px solid #38bdf8',
              }}
            >
              ℹ️
            </div>
            <div>
              <span style={{ fontSize: '10.5px', color: '#38bdf8', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                SUDAH MELAKUKAN PRESENSI {attendanceMode.toUpperCase()}
              </span>
              <h3 style={{ margin: '2px 0', fontSize: '16px', color: '#ffffff', fontWeight: '800' }}>
                {alreadyAttendedUser.nama}
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
                {alreadyAttendedUser.isGuru || String(alreadyAttendedUser.id).startsWith('GURU-')
                  ? `Guru Pengajar • Inisial: ${alreadyAttendedUser.inisial || '-'}`
                  : `Kelas: ${alreadyAttendedUser.kelas || '-'} • Jurusan: ${alreadyAttendedUser.jurusan || extractJurusan(alreadyAttendedUser.kelas)}`}
              </p>
            </div>
          </div>

          <div style={{ backgroundColor: 'rgba(56, 189, 248, 0.15)', padding: '6px 14px', borderRadius: '8px', border: '1px solid #38bdf8' }}>
            <span style={{ fontSize: '12px', fontWeight: '800', color: '#7dd3fc' }}>
              Sudah Presensi
            </span>
          </div>
        </div>
      )}

      {/* POPUP: KETIKA WAJAH PERTAMA KALI TERDETEKSI & BERHASIL DICATAT */}
      {detectedUser && (
        <div
          style={{
            width: '100%',
            maxWidth: '780px',
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
                PRESENSI {attendanceMode.toUpperCase()} BERHASIL DICATAT
              </span>
              <h3 style={{ margin: '2px 0', fontSize: '17px', color: '#ffffff', fontWeight: '800' }}>
                {detectedUser.nama}
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
                {detectedUser.isGuru || String(detectedUser.id).startsWith('GURU-')
                  ? <>Guru Pengajar • Inisial: <b style={{ color: '#38bdf8' }}>{detectedUser.inisial || '-'}</b></>
                  : <>Kelas: <b>{detectedUser.kelas || '-'}</b> • Jurusan: <b>{detectedUser.jurusan || extractJurusan(detectedUser.kelas)}</b></>}
                {' '}• Akurasi AI: <b style={{ color: '#38bdf8' }}>{confidence}%</b>
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

      {/* LOG RIWAYAT SCAN SESI INI (SISWA: NAMA, KELAS, JURUSAN, WAKTU | GURU: NAMA, INISIAL, WAKTU) */}
      {recentScans.length > 0 && (
        <div
          style={{
            width: '100%',
            maxWidth: '780px',
            marginTop: '14px',
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            borderRadius: '14px',
            padding: '14px 16px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              Riwayat Scan Sesi Ini ({recentScans.length})
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recentScans.map((scan) => (
              <div
                key={scan.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  borderRadius: '10px',
                  fontSize: '12.5px',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  flexWrap: 'wrap',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: scan.status === 'Telat' ? '#f59e0b' : '#10b981', fontWeight: 'bold', fontSize: '14px' }}>
                    {scan.status === 'Telat' ? '⚠️' : '✓'}
                  </span>
                  <div>
                    <span style={{ fontWeight: '800', color: '#f8fafc' }}>{scan.nama}</span>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                      {scan.isGuru ? (
                        <span>Guru Pengajar • Inisial: <b style={{ color: '#38bdf8' }}>{scan.inisial || '-'}</b></span>
                      ) : (
                        <span>Kelas: <b style={{ color: '#cbd5e1' }}>{scan.kelas || '-'}</b> • Jurusan: <b style={{ color: '#38bdf8' }}>{scan.jurusan || extractJurusan(scan.kelas)}</b></span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#38bdf8', fontFamily: 'monospace', fontWeight: '700' }}>
                    {scan.jam} WIB
                  </span>
                  <span
                    style={{
                      fontSize: '10.5px',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      backgroundColor:
                        scan.status === 'Telat'
                          ? '#ef4444'
                          : scan.status === 'Pulang'
                          ? '#059669'
                          : '#10b981',
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
