'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Swal from 'sweetalert2';
import {
  extractFaceDescriptorFromCanvas,
  findBestFaceMatch,
  captureAndCompressCanvas,
  detectMultipleFaceBounds,
  drawFaceDetectionBox,
  drawFaceMeshConstellation,
  drawGuideViewfinder,
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

function getTodayDateWIB() {
  const options = { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' };
  const parts = new Intl.DateTimeFormat('id-ID', options).format(new Date()).split('/');
  // id-ID format: DD/MM/YYYY
  return `${parts[0]}/${parts[1]}/${parts[2]}`;
}

export default function FaceRecognitionScanner({
  isOpen,
  onClose,
  siswaList = [],
  currentUser,
  supabase,
  onAttendanceSuccess,
  appConfig = {},
  onOpenFaceManager,
  absensiLogs = [],
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const streamRef = useRef(null);
  const isProcessingRef = useRef(false);
  const alreadyScannedSetRef = useRef(new Set());
  const timeoutAlreadyRef = useRef(null);
  const lastDetectedBoxesRef = useRef([]);

  // State Kamera & Sensitivitas Deteksi
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState('user'); // 'user' | 'environment'
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [availableDevices, setAvailableDevices] = useState([]);
  const [cameraFitMode, setCameraFitMode] = useState('contain');
  const [videoAspect, setVideoAspect] = useState(16 / 9);

  // Slider Pengaturan Ketelitian Deteksi (Sesuai Video)
  // Rentang: 0.28 (Lebih Longgar / presisi toleran) s/d 0.44 (Lebih Cepat / sulit terdeteksi)
  // Default: 0.36 (~70% kecocokan biometrik)
  const [sensitivityThreshold, setSensitivityThreshold] = useState(0.36);

  // Mode Presensi
  const [attendanceMode, setAttendanceMode] = useState('masuk'); // 'masuk' | 'pulang'
  const [scanStatus, setScanStatus] = useState('Mempersiapkan Sensor Kamera AI...');
  const [detectedUser, setDetectedUser] = useState(null);
  const [alreadyAttendedUser, setAlreadyAttendedUser] = useState(null);
  const [confidence, setConfidence] = useState(0);
  const [cameraError, setCameraError] = useState('');

  // Filter & Log Kehadiran Realtime Sesuai Video
  const [selectedClassFilter, setSelectedClassFilter] = useState('semua');
  const [searchStudentQuery, setSearchStudentQuery] = useState('');
  const [todayAttendanceMap, setTodayAttendanceMap] = useState({}); // { [nama_lower]: { status, jam, id } }
  const [recentFlashUser, setRecentFlashUser] = useState(null); // Efek kilat hijau ketika terdeteksi

  // Hitung jumlah siswa & guru yang sudah rekam wajah biometrik
  const registeredCount = useMemo(() => {
    return siswaList.filter((s) => {
      const desc = s.face_descriptor || s.biodata?.face_descriptor;
      return Boolean(desc);
    }).length;
  }, [siswaList]);

  // Daftar kelas unik dari database
  const classList = useMemo(() => {
    const set = new Set();
    siswaList.forEach((s) => {
      if (!s.isGuru && s.kelas && s.kelas !== '-') {
        set.add(s.kelas);
      }
    });
    return Array.from(set).sort();
  }, [siswaList]);

  // Sinkronisasi data presensi hari ini dari database Supabase
  const refreshTodayAttendance = useCallback(async () => {
    if (!supabase) return;
    try {
      const now = new Date();
      const options = { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' };
      const formatter = new Intl.DateTimeFormat('en-CA', options);
      const tanggalWib = formatter.format(now);
      const startOfDay = new Date(`${tanggalWib}T00:00:00.000+07:00`).toISOString();
      const endOfDay = new Date(`${tanggalWib}T23:59:59.999+07:00`).toISOString();

      const { data, error } = await supabase
        .from('absensi')
        .select('*')
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay);

      if (!error && data) {
        const map = {};
        data.forEach((row) => {
          if (row.nama) {
            const key = String(row.nama).trim().toLowerCase();
            const jamDisplay = row.jam_masuk || (row.created_at ? new Date(row.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }) : '-');
            map[key] = {
              id: row.id,
              status: row.status || 'Hadir',
              jam: jamDisplay,
              tipe: row.tipe,
            };
            // Masukkan ke set scanned agar tidak dobel suara
            alreadyScannedSetRef.current.add(`${key}_${attendanceMode}_${tanggalWib}`);
          }
        });
        setTodayAttendanceMap(map);
      }
    } catch (e) {
      console.warn('Sync today attendance note:', e);
    }
  }, [supabase, attendanceMode]);

  // Panggil refresh saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      refreshTodayAttendance();
    }
  }, [isOpen, refreshTodayAttendance]);

  // 1. Inisialisasi & Start Kamera
  const startCamera = useCallback(async (mode = facingMode, deviceId = selectedDeviceId) => {
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

      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        setAvailableDevices(videoInputs);
      } catch (e) {}

      const videoConstraints = {
        width: { ideal: 1280, min: 640 },
        height: { ideal: 720, min: 480 },
      };

      if (deviceId) {
        videoConstraints.deviceId = { exact: deviceId };
      } else if (mode) {
        videoConstraints.facingMode = mode;
      }

      const constraints = {
        audio: false,
        video: videoConstraints,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          const vw = videoRef.current.videoWidth || 640;
          const vh = videoRef.current.videoHeight || 480;
          if (vw > 0 && vh > 0) {
            setVideoAspect(vw / vh);
          }
          videoRef.current.play().catch(() => {});
          setCameraActive(true);
          setScanStatus('Mendeteksi Wajah Pintar (Multi-Person)...');
        };
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setCameraError(err.message || 'Izin kamera ditolak atau sedang digunakan aplikasi lain.');
      setScanStatus('Kamera Tidak Tersedia');
    }
  }, [facingMode, selectedDeviceId]);

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

  // Lifecycle modal
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
    setSelectedDeviceId('');
    startCamera(nextMode, '');
  };

  // 3. Loop Realtime Face Tracking & Recognition
  useEffect(() => {
    if (!cameraActive || !isOpen) return;

    let scanInterval = 0;
    let pulseStep = 0;

    const processFrame = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) {
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
      pulseStep = (pulseStep + 0.05) % (Math.PI * 2);
      const animPulse = Math.sin(pulseStep) * 0.25 + 0.75;

      // Ekstraksi AI setiap 6 frame
      if (Math.floor(scanInterval) % 6 === 0 && !isProcessingRef.current) {
        const detectedFaces = detectMultipleFaceBounds(canvas);
        const confirmedHumanFaces = [];
        const activeMatches = [];

        if (detectedFaces && detectedFaces.length > 0) {
          for (const faceBox of detectedFaces) {
            const faceDesc = extractFaceDescriptorFromCanvas(canvas, faceBox);
            if (faceDesc && faceDesc.hasFace) {
              confirmedHumanFaces.push(faceBox);
              const match = findBestFaceMatch(faceDesc, siswaList, sensitivityThreshold);
              if (match && match.user) {
                activeMatches.push({
                  box: faceBox,
                  user: match.user,
                  confidence: match.confidencePercent,
                });
                handleAttendanceCheck(match.user, match.confidencePercent, canvas);
              } else {
                activeMatches.push({
                  box: faceBox,
                  user: null,
                  confidence: match?.closestConfidence || 0,
                });
              }
            }
          }
        }

        if (confirmedHumanFaces.length > 0) {
          lastDetectedBoxesRef.current = confirmedHumanFaces;
          const confirmedUsers = activeMatches.filter((m) => m.user);
          if (confirmedUsers.length > 0) {
            setDetectedUser(confirmedUsers[0].user);
            setConfidence(confirmedUsers[0].confidence);
            setScanStatus(`✅ Wajah Terkonfirmasi: ${confirmedUsers[0].user.nama} (${confirmedUsers[0].confidence}%)`);
          } else {
            const topClosest = Math.max(...activeMatches.map((m) => m.confidence), 0);
            setDetectedUser(null);
            setConfidence(topClosest);
            if (topClosest > 0) {
              setScanStatus(`⚠️ Wajah Terdeteksi (Akurasi: ${topClosest}% • Menyelaraskan...)`);
            } else {
              setScanStatus(`👤 Wajah Terdeteksi (Arahkan Wajah ke Kamera)`);
            }
          }
        } else {
          lastDetectedBoxesRef.current = [];
          setScanStatus('Arahkan Wajah ke Dalam Kamera (Menunggu Siswa...)');
          setDetectedUser(null);
          setAlreadyAttendedUser(null);
          setConfidence(0);
        }
      }

      // Render Visual Box
      const currentBoxes = lastDetectedBoxesRef.current;
      if (currentBoxes && currentBoxes.length > 0) {
        currentBoxes.forEach((targetBox, idx) => {
          let labelText = `Wajah #${idx + 1}`;
          let boxColor = '#38bdf8';

          if (detectedUser) {
            labelText = `✅ ${detectedUser.nama} (${confidence}%)`;
            boxColor = '#22c55e';
          } else if (alreadyAttendedUser) {
            labelText = `✓ Sudah Presensi - ${alreadyAttendedUser.nama}`;
            boxColor = '#06b6d4';
          } else if (confidence >= 30) {
            labelText = `🔍 Menyelaraskan (${confidence}%)`;
            boxColor = '#f59e0b';
          }

          drawFaceDetectionBox(ctx, targetBox, {
            labelText,
            statusColor: boxColor,
            showTitle: idx === 0,
          });
        });
      } else {
        const guideW = Math.round(Math.min(w * 0.52, h * 0.42));
        const guideH = Math.round(guideW * 1.30);
        const guideBox = {
          x: Math.round((w - guideW) / 2),
          y: Math.round((h - guideH) * 0.44),
          width: guideW,
          height: guideH,
        };
        drawGuideViewfinder(ctx, guideBox, animPulse);
      }

      animFrameRef.current = requestAnimationFrame(processFrame);
    };

    animFrameRef.current = requestAnimationFrame(processFrame);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [cameraActive, isOpen, siswaList, attendanceMode, sensitivityThreshold, detectedUser, alreadyAttendedUser, confidence]);

  // 4. Pengecekan Presensi
  const handleAttendanceCheck = (user, matchConfidence, canvas) => {
    const userNamaKey = String(user.nama || '').trim().toLowerCase();
    const todayWib = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
    const attendanceKey = `${userNamaKey}_${attendanceMode}_${todayWib}`;

    // Cek apakah sudah tercatat hari ini
    if (alreadyScannedSetRef.current.has(attendanceKey) || todayAttendanceMap[userNamaKey]?.status === 'Hadir') {
      setAlreadyAttendedUser(user);
      setDetectedUser(null);
      setScanStatus(`ℹ️ Sudah Presensi ${attendanceMode.toUpperCase()}: ${user.nama}`);

      if (timeoutAlreadyRef.current) clearTimeout(timeoutAlreadyRef.current);
      timeoutAlreadyRef.current = setTimeout(() => {
        setAlreadyAttendedUser(null);
      }, 3000);
      return;
    }

    handleAttendanceRecord(user, matchConfidence, canvas, attendanceKey);
  };

  // 5. Catat Presensi Resmi ke Supabase & Update Tabel Realtime
  const handleAttendanceRecord = async (user, matchConfidence, canvas, attendanceKey) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      alreadyScannedSetRef.current.add(attendanceKey);
      playPresensiSound();
      setDetectedUser(user);
      setAlreadyAttendedUser(null);
      setConfidence(matchConfidence);
      setRecentFlashUser(user.nama);

      const now = new Date();
      const jamStr = now.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'Asia/Jakarta',
      });

      const wibStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
      const wibDate = new Date(wibStr);
      const wibMinutes = wibDate.getHours() * 60 + wibDate.getMinutes();
      const isGuru = Boolean(user.isGuru || String(user.id).startsWith('GURU-') || user.role === 'guru' || user.role === 'admin');

      let finalStatus = 'Hadir';
      if (!isGuru && attendanceMode === 'masuk') {
        if (wibMinutes > 450) { // Lewat 07:30 WIB
          finalStatus = 'Telat';
        }
      }
      if (attendanceMode === 'pulang') {
        finalStatus = 'Pulang';
      }

      // Optimistic update pada tabel realtime di sebelah kanan
      const userKey = String(user.nama).trim().toLowerCase();
      setTodayAttendanceMap((prev) => ({
        ...prev,
        [userKey]: {
          status: finalStatus,
          jam: jamStr,
          tipe: attendanceMode,
        },
      }));

      // Kirim ke database Supabase
      if (supabase) {
        const payload = {
          nama: user.nama,
          kelas: user.kelas || (isGuru ? 'Guru / Staff' : 'Siswa'),
          status: finalStatus,
          tipe: attendanceMode === 'pulang' ? 'pulang_selesai' : 'masuk',
          jam_masuk: attendanceMode === 'masuk' ? jamStr : undefined,
          jam_pulang: attendanceMode === 'pulang' ? jamStr : undefined,
          created_at: new Date().toISOString(),
          rfid_uid: null, // RFID dikosongkan sesuai instruksi
        };

        const { error: insErr } = await supabase.from('absensi').insert([payload]);
        if (insErr) {
          console.warn('Fallback absensi insert note:', insErr.message);
        }
      }

      // Voice greeting ramah
      const sapaan = now.getHours() < 11 ? 'pagi' : (now.getHours() < 15 ? 'siang' : 'sore');
      const statusKet = finalStatus === 'Telat' ? 'tercatat telat' : 'berhasil';
      const greetingMsg =
        attendanceMode === 'masuk'
          ? `Selamat ${sapaan}, ${user.nama}. Presensi masuk ${statusKet}!`
          : `Terima kasih, ${user.nama}. Presensi pulang berhasil dicatat. Hati-hati di jalan!`;
      speakIndonesianAi(greetingMsg);

      if (onAttendanceSuccess) {
        onAttendanceSuccess({
          nama: user.nama,
          kelas: user.kelas,
          status: finalStatus,
          jam: jamStr,
        });
      }

      playSuccessSound();
    } catch (err) {
      console.error('Error recording attendance:', err);
    } finally {
      setTimeout(() => {
        isProcessingRef.current = false;
        setDetectedUser(null);
      }, 3200);
      setTimeout(() => {
        setRecentFlashUser(null);
      }, 4000);
    }
  };

  // 6. Manual Status Override oleh Guru/Admin (Klik H / I / S / A pada tabel)
  const handleManualStatusToggle = async (student, newStatus) => {
    if (!supabase || !student) return;
    const userKey = String(student.nama).trim().toLowerCase();
    const now = new Date();
    const jamStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });

    setTodayAttendanceMap((prev) => ({
      ...prev,
      [userKey]: {
        status: newStatus,
        jam: jamStr,
      },
    }));

    try {
      const payload = {
        nama: student.nama,
        kelas: student.kelas || 'Siswa',
        status: newStatus,
        tipe: 'manual',
        jam_masuk: jamStr,
        created_at: now.toISOString(),
        rfid_uid: null,
      };
      await supabase.from('absensi').insert([payload]);
      playSuccessSound();
    } catch (e) {
      console.warn('Manual status update note:', e);
    }
  };

  // Filter daftar siswa untuk tabel di kolom kanan
  const displayedStudents = useMemo(() => {
    return siswaList.filter((item) => {
      if (item.isGuru || String(item.id).startsWith('GURU-')) return false;
      if (selectedClassFilter !== 'semua' && item.kelas !== selectedClassFilter) return false;
      if (searchStudentQuery.trim()) {
        const q = searchStudentQuery.toLowerCase();
        const mNama = (item.nama || '').toLowerCase().includes(q);
        const mKelas = (item.kelas || '').toLowerCase().includes(q);
        if (!mNama && !mKelas) return false;
      }
      return true;
    });
  }, [siswaList, selectedClassFilter, searchStudentQuery]);

  // Statistik Realtime untuk Panel Kanan
  const stats = useMemo(() => {
    let hadir = 0;
    let izin = 0;
    let sakit = 0;
    let alpa = 0;

    displayedStudents.forEach((s) => {
      const key = String(s.nama).trim().toLowerCase();
      const st = todayAttendanceMap[key]?.status;
      if (st === 'Hadir' || st === 'Telat' || st === 'Pulang') hadir++;
      else if (st === 'Izin') izin++;
      else if (st === 'Sakit') sakit++;
      else alpa++;
    });

    return { hadir, izin, sakit, alpa, total: displayedStudents.length };
  }, [displayedStudents, todayAttendanceMap]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(11, 19, 38, 0.98)',
        backdropFilter: 'blur(16px)',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: '12px 14px',
        overflowY: 'auto',
        color: '#ffffff',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* 🚀 TOP BAR TERMINAL (Sesuai Video) */}
      <div
        style={{
          width: '100%',
          maxWidth: '1440px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          borderRadius: '16px',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          marginBottom: '12px',
          flexWrap: 'wrap',
          gap: '10px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* IDENTITAS SEKOLAH */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              backgroundColor: 'rgba(6, 182, 212, 0.15)',
              border: '2px solid #06b6d4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              boxShadow: '0 0 15px rgba(6, 182, 212, 0.4)',
            }}
          >
            📸
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ margin: 0, fontSize: '17px', fontWeight: '900', color: '#38bdf8', letterSpacing: '0.4px' }}>
                AI Face Recognition Terminal
              </h1>
              <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '12px', backgroundColor: '#059669', color: '#ffffff', fontWeight: '800' }}>
                LIVE ACTIVE
              </span>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: '#94a3b8' }}>
              SMK YPK MEDAN • Terminal Biometrik Wajah Cerdas Otomatis
            </p>
          </div>
        </div>

        {/* AKSI TOMBOL ATAS SESUAI TAMPILAN SMART TV / VIDEO */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* TOMBOL KELOLA DATA SISWA (ADMIN) */}
          <button
            type="button"
            onClick={() => {
              if (onOpenFaceManager) onOpenFaceManager();
            }}
            style={{
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: '1px solid #38bdf8',
              borderRadius: '10px',
              padding: '7px 14px',
              fontSize: '12px',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 10px rgba(2, 132, 199, 0.35)',
            }}
            title="Daftarkan nama siswa baru dan rekam sampel wajah AI"
          >
            <span>👥</span>
            <span>Kelola Data Siswa</span>
          </button>

          {/* TOMBOL MULAI / MATIKAN KAMERA */}
          <button
            type="button"
            onClick={() => {
              if (cameraActive) stopCamera();
              else startCamera();
            }}
            style={{
              backgroundColor: cameraActive ? '#ef4444' : '#10b981',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '7px 14px',
              fontSize: '12px',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: cameraActive ? '0 2px 10px rgba(239, 68, 68, 0.35)' : '0 2px 10px rgba(16, 185, 129, 0.35)',
            }}
          >
            <span>{cameraActive ? '⏹️' : '▶️'}</span>
            <span>{cameraActive ? 'Matikan Kamera' : 'Mulai Absensi'}</span>
          </button>

          {/* TOGGLE GANTI KAMERA */}
          <button
            type="button"
            onClick={handleToggleCamera}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              color: '#e2e8f0',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '10px',
              padding: '7px 12px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
            title="Ganti Lensa Kamera"
          >
            🔄 {facingMode === 'user' ? 'Kamera Belakang' : 'Kamera Depan'}
          </button>

          {/* KODE RUANG SESUAI VIDEO (GSFVXP) */}
          <div
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid #38bdf8',
              borderRadius: '8px',
              padding: '5px 10px',
              fontSize: '11px',
              fontFamily: 'monospace',
              color: '#7dd3fc',
              fontWeight: '800',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
            title="Kode Sesi Terminal Presensi"
          >
            <span>ROOM:</span>
            <b style={{ color: '#ffffff' }}>GSFVXP</b>
          </div>

          {/* TOMBOL TUTUP */}
          <button
            type="button"
            onClick={onClose}
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              color: '#f87171',
              border: '1px solid #ef4444',
              borderRadius: '10px',
              padding: '7px 14px',
              fontSize: '12px',
              fontWeight: '800',
              cursor: 'pointer',
            }}
          >
            ✕ Tutup
          </button>
        </div>
      </div>

      {/* 🖥️ KONTEN UTAMA: 2 KOLOM SPLIT SCREEN (SESUAI VIDEO PERSIS) */}
      <div
        style={{
          width: '100%',
          maxWidth: '1440px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '14px',
          alignItems: 'start',
        }}
      >
        {/* ========================================================
            KOLOM KIRI: KAMERA SENSOR BIOMETRIK & PENGATURAN DETEKSI
            ======================================================== */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          {/* PILIHAN MODE MASUK vs PULANG */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => {
                setAttendanceMode('masuk');
                setDetectedUser(null);
                setAlreadyAttendedUser(null);
              }}
              style={{
                flex: 1,
                padding: '9px 12px',
                borderRadius: '10px',
                border: attendanceMode === 'masuk' ? '2px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)',
                fontSize: '12.5px',
                fontWeight: '800',
                cursor: 'pointer',
                backgroundColor: attendanceMode === 'masuk' ? '#0284c7' : 'rgba(15, 23, 42, 0.6)',
                color: '#ffffff',
                boxShadow: attendanceMode === 'masuk' ? '0 0 16px rgba(2, 132, 199, 0.4)' : 'none',
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
                padding: '9px 12px',
                borderRadius: '10px',
                border: attendanceMode === 'pulang' ? '2px solid #34d399' : '1px solid rgba(255,255,255,0.1)',
                fontSize: '12.5px',
                fontWeight: '800',
                cursor: 'pointer',
                backgroundColor: attendanceMode === 'pulang' ? '#059669' : 'rgba(15, 23, 42, 0.6)',
                color: '#ffffff',
                boxShadow: attendanceMode === 'pulang' ? '0 0 16px rgba(5, 150, 105, 0.4)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              🏠 Presensi Pulang
            </button>
          </div>

          {/* VIEWFINDER KAMERA BIOMETRIK */}
          <div
            style={{
              width: '100%',
              aspectRatio: videoAspect ? `${videoAspect}` : '16 / 9',
              minHeight: '340px',
              maxHeight: '480px',
              position: 'relative',
              borderRadius: '18px',
              overflow: 'hidden',
              backgroundColor: '#020617',
              border: recentFlashUser ? '3px solid #22c55e' : '2.5px solid #06b6d4',
              boxShadow: recentFlashUser
                ? '0 0 45px rgba(34, 197, 94, 0.6), inset 0 0 25px rgba(34, 197, 94, 0.2)'
                : '0 0 30px rgba(6, 182, 212, 0.3), inset 0 0 20px rgba(6, 182, 212, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'border 0.2s, box-shadow 0.2s',
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
                objectFit: cameraFitMode,
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
                objectFit: cameraFitMode,
                transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
              }}
            />

            {/* STATUS HUD OVERLAY */}
            <div
              style={{
                position: 'absolute',
                bottom: '10px',
                left: '10px',
                right: '10px',
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                backdropFilter: 'blur(10px)',
                borderRadius: '12px',
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                fontSize: '12px',
                flexWrap: 'wrap',
                gap: '6px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: '9px',
                    height: '9px',
                    borderRadius: '50%',
                    backgroundColor: detectedUser ? '#22c55e' : (alreadyAttendedUser ? '#38bdf8' : '#06b6d4'),
                    boxShadow: detectedUser ? '0 0 10px #22c55e' : '0 0 8px #06b6d4',
                  }}
                />
                <span style={{ fontWeight: '700', color: detectedUser ? '#4ade80' : '#f1f5f9' }}>
                  {scanStatus}
                </span>
              </div>
              <span style={{ color: '#94a3b8', fontSize: '11px' }}>
                Database Wajah: <b style={{ color: '#38bdf8' }}>{registeredCount} Siswa</b>
              </span>
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
                  maxWidth: '85%',
                }}
              >
                <div style={{ fontSize: '32px', marginBottom: '6px' }}>🚫</div>
                <b style={{ color: '#ffffff' }}>Gagal Mengakses Sensor Kamera</b>
                <p style={{ margin: '6px 0 12px 0', fontSize: '12px', color: '#cbd5e1' }}>{cameraError}</p>
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

          {/* BADGE DETEKSI WAJAH ASLI & PENGATURAN KETELITIAN DETEKSI (PERSIS SESUAI VIDEO) */}
          <div
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.85)',
              borderRadius: '14px',
              padding: '12px 16px',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            {/* BADGE: DETEKSI WAJAH ASLI */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid #10b981',
                  borderRadius: '20px',
                  padding: '4px 12px',
                  fontSize: '12px',
                  color: '#34d399',
                  fontWeight: '800',
                }}
              >
                <span style={{ fontSize: '14px' }}>🛡️</span>
                <span>Deteksi Wajah Asli</span>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 8px #10b981' }} />
              </div>

              {/* TOGGLE FIT MODE */}
              <button
                type="button"
                onClick={() => setCameraFitMode((prev) => (prev === 'contain' ? 'cover' : 'contain'))}
                style={{
                  background: 'none',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#94a3b8',
                  padding: '4px 10px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                📐 {cameraFitMode === 'contain' ? 'Rasio Alami' : 'Layar Penuh'}
              </button>
            </div>

            {/* SLIDER: PENGATURAN KETELITIAN DETEKSI (SESUAI VIDEO) */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: '800', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>⚙️</span> Pengaturan Ketelitian Deteksi
                </span>
                <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: '800', backgroundColor: 'rgba(56, 189, 248, 0.15)', padding: '2px 8px', borderRadius: '6px' }}>
                  Sensitivitas: {Math.round((0.50 - sensitivityThreshold) * 350 + 40)}%
                </span>
              </div>

              <input
                type="range"
                min="0.26"
                max="0.46"
                step="0.02"
                value={sensitivityThreshold}
                onChange={(e) => setSensitivityThreshold(parseFloat(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: '#0284c7',
                  cursor: 'pointer',
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: '#64748b', marginTop: '4px' }}>
                <span>Lebih Cepat (sulit terdeteksi)</span>
                <span>Lebih Longgar (presisi toleran)</span>
              </div>
            </div>
          </div>

          {/* POPUP SEMENTARA KETIKA BERHASIL TERDETEKSI */}
          {detectedUser && (
            <div
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.18)',
                border: '1.5px solid #10b981',
                borderRadius: '12px',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                  ✓
                </div>
                <div>
                  <span style={{ fontSize: '10px', color: '#86efac', fontWeight: '800', textTransform: 'uppercase' }}>
                    PRESENSI {attendanceMode.toUpperCase()} BERHASIL
                  </span>
                  <h4 style={{ margin: 0, fontSize: '15px', color: '#ffffff', fontWeight: '800' }}>
                    {detectedUser.nama}
                  </h4>
                  <span style={{ fontSize: '11px', color: '#cbd5e1' }}>
                    {detectedUser.kelas || 'Siswa'} • Akurasi AI: <b style={{ color: '#38bdf8' }}>{confidence}%</b>
                  </span>
                </div>
              </div>
              <span style={{ fontSize: '11px', backgroundColor: '#10b981', color: '#ffffff', padding: '4px 10px', borderRadius: '8px', fontWeight: '800' }}>
                Hadir
              </span>
            </div>
          )}
        </div>

        {/* ========================================================
            KOLOM KANAN: 📋 LOG KEHADIRAN SISWA REALTIME (SESUAI VIDEO)
            ======================================================== */}
        <div
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.88)',
            borderRadius: '18px',
            border: '1.5px solid rgba(56, 189, 248, 0.3)',
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
            maxHeight: '85vh',
            overflow: 'hidden',
          }}
        >
          {/* HEADER LOG KEHADIRAN SESUAI VIDEO */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>📋</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '900', color: '#ffffff' }}>
                  Log Kehadiran Realtime
                </h3>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  Presensi otomatis via deteksi wajah kamera
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* TANGGAL HARI INI */}
              <div
                style={{
                  backgroundColor: 'rgba(2, 132, 199, 0.2)',
                  border: '1px solid #0284c7',
                  borderRadius: '8px',
                  padding: '4px 10px',
                  fontSize: '11.5px',
                  color: '#38bdf8',
                  fontWeight: '800',
                  fontFamily: 'monospace',
                }}
              >
                📅 {getTodayDateWIB()}
              </div>

              {/* BADGE STATUS AKTIF (SESUAI VIDEO: KODING DAN KECERDASAN AKTIF) */}
              <div
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.2)',
                  border: '1px solid #10b981',
                  borderRadius: '8px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  color: '#34d399',
                  fontWeight: '800',
                  letterSpacing: '0.4px',
                  textTransform: 'uppercase',
                }}
              >
                KODING DAN KECERDASAN AKTIF
              </div>
            </div>
          </div>

          {/* BARIS KONTROL: FILTER KELAS & CARI NAMA */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {/* PILIH KELAS (Dropdown 7B / X TJKT / XI TJKT dll) */}
            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              style={{
                backgroundColor: 'rgba(30, 41, 59, 0.9)',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="semua">Semua Kelas ({siswaList.filter((s) => !s.isGuru).length})</option>
              {classList.map((cls) => (
                <option key={cls} value={cls}>
                  Kelas {cls} ({siswaList.filter((s) => !s.isGuru && s.kelas === cls).length})
                </option>
              ))}
            </select>

            {/* PENCARIAN SISWA CEPAT */}
            <input
              type="text"
              placeholder="🔍 Cari nama siswa..."
              value={searchStudentQuery}
              onChange={(e) => setSearchStudentQuery(e.target.value)}
              style={{
                flex: 1,
                minWidth: '140px',
                backgroundColor: 'rgba(30, 41, 59, 0.9)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '12px',
                outline: 'none',
              }}
            />

            {/* TOMBOL REFRESH DATA */}
            <button
              type="button"
              onClick={refreshTodayAttendance}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                borderRadius: '8px',
                padding: '6px 10px',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
              title="Perbarui Sinkronisasi Log Kehadiran Hari Ini"
            >
              🔄
            </button>
          </div>

          {/* STATISTIK COUNTER PILLS (SESUAI VIDEO) */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '70px', backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', borderRadius: '8px', padding: '6px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: '#86efac', fontWeight: '800' }}>HADIR (H)</div>
              <div style={{ fontSize: '15px', fontWeight: '900', color: '#ffffff' }}>{stats.hadir}</div>
            </div>
            <div style={{ flex: 1, minWidth: '70px', backgroundColor: 'rgba(234, 179, 8, 0.15)', border: '1px solid #eab308', borderRadius: '8px', padding: '6px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: '#fde047', fontWeight: '800' }}>IZIN (I)</div>
              <div style={{ fontSize: '15px', fontWeight: '900', color: '#ffffff' }}>{stats.izin}</div>
            </div>
            <div style={{ flex: 1, minWidth: '70px', backgroundColor: 'rgba(59, 130, 246, 0.15)', border: '1px solid #3b82f6', borderRadius: '8px', padding: '6px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: '#93c5fd', fontWeight: '800' }}>SAKIT (S)</div>
              <div style={{ fontSize: '15px', fontWeight: '900', color: '#ffffff' }}>{stats.sakit}</div>
            </div>
            <div style={{ flex: 1, minWidth: '70px', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: '8px', padding: '6px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: '#fca5a5', fontWeight: '800' }}>ALPA (A)</div>
              <div style={{ fontSize: '15px', fontWeight: '900', color: '#ffffff' }}>{stats.alpa}</div>
            </div>
          </div>

          {/* TABEL INTERAKTIF REALTIME SISWA (SESUAI VIDEO) */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backgroundColor: 'rgba(15, 23, 42, 0.5)',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead>
                <tr style={{ backgroundColor: 'rgba(30, 41, 59, 0.9)', color: '#94a3b8', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <th style={{ padding: '8px 10px', width: '36px', textAlign: 'center' }}>NO</th>
                  <th style={{ padding: '8px 10px' }}>NAMA SISWA</th>
                  <th style={{ padding: '8px 10px', width: '80px' }}>KELAS</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', width: '140px' }}>STATUS</th>
                  <th style={{ padding: '8px 10px', width: '70px', textAlign: 'right' }}>JAM</th>
                </tr>
              </thead>
              <tbody>
                {displayedStudents.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                      Tidak ada siswa ditemukan pada kelas ini.
                    </td>
                  </tr>
                ) : (
                  displayedStudents.map((s, index) => {
                    const sKey = String(s.nama).trim().toLowerCase();
                    const attendance = todayAttendanceMap[sKey];
                    const currentStatus = attendance?.status || 'Alpa';
                    const isPresent = currentStatus === 'Hadir' || currentStatus === 'Telat' || currentStatus === 'Pulang';
                    const isFlashing = recentFlashUser && String(recentFlashUser).trim().toLowerCase() === sKey;

                    return (
                      <tr
                        key={s.id || index}
                        style={{
                          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                          backgroundColor: isFlashing
                            ? 'rgba(34, 197, 94, 0.3)'
                            : isPresent
                            ? 'rgba(16, 185, 129, 0.07)'
                            : 'transparent',
                          transition: 'background-color 0.3s ease',
                        }}
                      >
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: '#64748b', fontWeight: 'bold' }}>
                          {index + 1}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: '800', color: isPresent ? '#ffffff' : '#cbd5e1' }}>
                              {s.nama}
                            </span>
                            {/* INDIKATOR REKAM WAJAH */}
                            {Boolean(s.face_descriptor || s.biodata?.face_descriptor) && (
                              <span style={{ fontSize: '10px', color: '#38bdf8' }} title="Wajah Biometrik Sudah Terdaftar">
                                📸
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '8px 10px', color: '#94a3b8', fontSize: '11px' }}>
                          {s.kelas || '-'}
                        </td>
                        {/* 4 PILL STATUS INTERAKTIF: [H] [I] [S] [A] (SESUAI VIDEO) */}
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: '4px', backgroundColor: 'rgba(0,0,0,0.3)', padding: '2px 4px', borderRadius: '14px' }}>
                            {/* TOMBOL HADIR (H) */}
                            <button
                              type="button"
                              onClick={() => handleManualStatusToggle(s, 'Hadir')}
                              style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                border: 'none',
                                fontSize: '10.5px',
                                fontWeight: '900',
                                cursor: 'pointer',
                                backgroundColor: isPresent ? '#10b981' : 'transparent',
                                color: isPresent ? '#ffffff' : '#64748b',
                                boxShadow: isPresent ? '0 0 8px #10b981' : 'none',
                                transition: 'all 0.15s',
                              }}
                              title="Tandai Hadir"
                            >
                              H
                            </button>

                            {/* TOMBOL IZIN (I) */}
                            <button
                              type="button"
                              onClick={() => handleManualStatusToggle(s, 'Izin')}
                              style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                border: 'none',
                                fontSize: '10.5px',
                                fontWeight: '900',
                                cursor: 'pointer',
                                backgroundColor: currentStatus === 'Izin' ? '#eab308' : 'transparent',
                                color: currentStatus === 'Izin' ? '#000000' : '#64748b',
                                boxShadow: currentStatus === 'Izin' ? '0 0 8px #eab308' : 'none',
                                transition: 'all 0.15s',
                              }}
                              title="Tandai Izin"
                            >
                              I
                            </button>

                            {/* TOMBOL SAKIT (S) */}
                            <button
                              type="button"
                              onClick={() => handleManualStatusToggle(s, 'Sakit')}
                              style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                border: 'none',
                                fontSize: '10.5px',
                                fontWeight: '900',
                                cursor: 'pointer',
                                backgroundColor: currentStatus === 'Sakit' ? '#3b82f6' : 'transparent',
                                color: currentStatus === 'Sakit' ? '#ffffff' : '#64748b',
                                boxShadow: currentStatus === 'Sakit' ? '0 0 8px #3b82f6' : 'none',
                                transition: 'all 0.15s',
                              }}
                              title="Tandai Sakit"
                            >
                              S
                            </button>

                            {/* TOMBOL ALPA (A) */}
                            <button
                              type="button"
                              onClick={() => handleManualStatusToggle(s, 'Alpa')}
                              style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                border: 'none',
                                fontSize: '10.5px',
                                fontWeight: '900',
                                cursor: 'pointer',
                                backgroundColor: currentStatus === 'Alpa' ? '#ef4444' : 'transparent',
                                color: currentStatus === 'Alpa' ? '#ffffff' : '#64748b',
                                boxShadow: currentStatus === 'Alpa' ? '0 0 8px #ef4444' : 'none',
                                transition: 'all 0.15s',
                              }}
                              title="Tandai Alpa / Belum Hadir"
                            >
                              A
                            </button>
                          </div>
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: isPresent ? '#38bdf8' : '#64748b', fontFamily: 'monospace', fontSize: '11px' }}>
                          {attendance?.jam || '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
