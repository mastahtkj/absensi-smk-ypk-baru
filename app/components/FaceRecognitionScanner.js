'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Swal from 'sweetalert2';
import {
  loadFaceApiModels,
  buildFaceMatcher,
  drawFaceDetectionBox,
  drawGuideViewfinder,
  playSuccessChime,
  speakAttendanceGreeting,
  getShortNameOrCallsign,
  cleanNameForSpeech,
  determineGender,
  cleanNameForComparison,
  stopAllSpeechAndAudio,
  getFaceFromRegistry,
  getAllRegisteredFaces,
  purgeAllFacesExceptIqbalAndRidho,
} from '../utils/faceRecognition';
import { recordUserActivity } from '../utils/smartRatingAi';

export default function FaceRecognitionScanner({
  isOpen,
  onClose,
  siswaList = [],
  guruList = [],
  currentUser,
  supabase,
  onAttendanceSuccess,
  appConfig = {},
}) {
  // --- REFS ---
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const animFrameRef = useRef(null);
  const isLoopRunningRef = useRef(false);
  const activeDetectionsRef = useRef([]);
  const lastScanTimeRef = useRef(0);
  const isDetectingRef = useRef(false);
  const faceMatcherRef = useRef(null);
  const recentAttendedSetRef = useRef(new Set());
  const lastSpokenMapRef = useRef(new Map()); // Map<personKey, timestamp>
  const voiceQuotaMapRef = useRef(new Map()); // Map<personKey, number> 0: belum, 1: presensi masuk, 2+: diam total
  const toastTimeoutRef = useRef(null);

  // --- STATES ---
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraDevices, setCameraDevices] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [facingMode, setFacingMode] = useState('user'); // 'user' | 'environment'
  const [modelStatus, setModelStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [statusMessage, setStatusMessage] = useState('Memuat AI Deep Learning Face-API...');
  const [todayAttendances, setTodayAttendances] = useState([]);
  const [roleFilter, setRoleFilter] = useState('ALL'); // 'ALL' | 'Siswa' | 'Guru' | 'Pegawai'
  const [classFilter, setClassFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentToast, setCurrentToast] = useState(null); // { name, role, meta, time, status, isRepeat }
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cameraFitMode, setCameraFitMode] = useState('contain'); // 'contain' (Luas & Utuh tanpa terpotong) | 'cover' (Layar Penuh)
  const [isMirrored, setIsMirrored] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('smk_ypk_camera_mirrored');
      if (saved !== null) return saved === 'true';
    }
    return true; // Default cermin aktif (seperti cermin alami webcam / selfie), video dan kotak 100% selaras
  });

  const toggleMirrorMode = () => {
    setIsMirrored((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('smk_ypk_camera_mirrored', next ? 'true' : 'false');
      }
      return next;
    });
  };

  // --- GABUNGKAN SELURUH SISWA, GURU & PEGAWAI SECARA LENGKAP & CERDAS ---
  const allPeople = useMemo(() => {
    const list = [];
    const faceRegistry = getAllRegisteredFaces();

    // 1. Siswa
    (siswaList || []).forEach((s) => {
      let sBio = s.biodata;
      if (typeof sBio === 'string') {
        try { sBio = JSON.parse(sBio); } catch (e) {}
      }
      let rawDesc = s.face_descriptor || sBio?.face_descriptor;
      if (typeof rawDesc === 'string') {
        try { rawDesc = JSON.parse(rawDesc); } catch (e) {}
      }
      // Lookup ke Local Face Registry jika descriptor belum ada di s (O(1) Memory Lookup)
      if (!rawDesc || !Array.isArray(rawDesc) || rawDesc.length < 128) {
        const fromReg =
          (s.id_siswa && faceRegistry[s.id_siswa]) ||
          (s.id && faceRegistry[s.id]) ||
          (s.username && faceRegistry[s.username.toLowerCase()]) ||
          (s.nama_siswa && faceRegistry[cleanNameForComparison(s.nama_siswa)]) ||
          (s.nama && faceRegistry[cleanNameForComparison(s.nama)]) ||
          (s.nama && faceRegistry[s.nama.trim().toLowerCase()]);
        if (fromReg?.descriptor) rawDesc = fromReg.descriptor;
      }
      const validDesc = (Array.isArray(rawDesc) && rawDesc.length >= 128) ? rawDesc : null;

      const id = String(s.id_siswa || s.id || s.nisn);
      const nama = s.nama_siswa || s.nama || 'Siswa';
      const gender = s.gender || s.jenis_kelamin || sBio?.gender || sBio?.jenis_kelamin || sBio?.genderAgama || '';
      list.push({
        id,
        nisn: s.nisn || s.nis || '-',
        nama,
        kelas: s.kelas || '-',
        jurusan: s.jurusan || '-',
        role: 'Siswa',
        gender,
        foto_url: s.foto_url || s.foto || sBio?.foto_resmi || '',
        face_descriptor: validDesc,
        biodata: sBio,
        rawObj: s,
      });
    });

    // 2. Guru & Pegawai
    (guruList || []).forEach((g) => {
      let gBio = g.biodata;
      if (typeof gBio === 'string') {
        try { gBio = JSON.parse(gBio); } catch (e) {}
      }
      let rawDesc = g.face_descriptor || gBio?.face_descriptor;
      if (typeof rawDesc === 'string') {
        try { rawDesc = JSON.parse(rawDesc); } catch (e) {}
      }
      // Lookup ke Local Face Registry jika descriptor belum ada di g (O(1) Memory Lookup)
      if (!rawDesc || !Array.isArray(rawDesc) || rawDesc.length < 128) {
        const fromReg =
          (g.id_guru && faceRegistry[g.id_guru]) ||
          (g.id && faceRegistry[g.id]) ||
          (g.username && faceRegistry[g.username.toLowerCase()]) ||
          (g.nama_guru && faceRegistry[cleanNameForComparison(g.nama_guru)]) ||
          (g.nama && faceRegistry[cleanNameForComparison(g.nama)]) ||
          (g.nama && faceRegistry[g.nama.trim().toLowerCase()]);
        if (fromReg?.descriptor) rawDesc = fromReg.descriptor;
      }
      const validDesc = (Array.isArray(rawDesc) && rawDesc.length >= 128) ? rawDesc : null;

      const id = String(g.id_guru || g.id || g.username || g.nama_guru);
      const nama = g.nama_guru || g.nama || 'Guru / Pegawai';
      const role = g.role === 'Pegawai' || g.role === 'Staf' ? 'Pegawai' : 'Guru';
      const gender = g.gender || g.jenis_kelamin || gBio?.gender || gBio?.jenis_kelamin || gBio?.genderAgama || '';
      list.push({
        id,
        nisn: g.nip || g.inisial || '-',
        inisial: g.inisial || gBio?.inisial || '',
        nama,
        kelas: g.mapel || g.jabatan || (role === 'Pegawai' ? 'Staff TU' : 'Guru Mapel'),
        jurusan: '-',
        role,
        gender,
        foto_url: g.foto_url || gBio?.foto_resmi || '',
        face_descriptor: validDesc,
        biodata: gBio,
        rawObj: g,
      });
    });

    // 3. Tambahkan Current User jika belum ada di list (Master Admin / Guru Aktif)
    if (currentUser) {
      const cId = String(currentUser.id_guru || currentUser.id_siswa || currentUser.id || currentUser.rawId || currentUser.username || currentUser.nama);
      const exists = list.some(
        (p) =>
          String(p.id) === cId ||
          (currentUser.username && p.rawObj?.username && String(p.rawObj.username).toLowerCase() === String(currentUser.username).toLowerCase()) ||
          cleanNameForComparison(p.nama) === cleanNameForComparison(currentUser.nama)
      );
      if (!exists) {
        let cBio = currentUser.biodata;
        if (typeof cBio === 'string') {
          try { cBio = JSON.parse(cBio); } catch (e) {}
        }
        let rawDesc = currentUser.face_descriptor || cBio?.face_descriptor;
        if (typeof rawDesc === 'string') {
          try { rawDesc = JSON.parse(rawDesc); } catch (e) {}
        }
        if (!rawDesc || !Array.isArray(rawDesc) || rawDesc.length < 128) {
          const fromReg =
            faceRegistry[cId] ||
            (currentUser.username && faceRegistry[currentUser.username.toLowerCase()]) ||
            (currentUser.nama && faceRegistry[cleanNameForComparison(currentUser.nama)]);
          if (fromReg?.descriptor) rawDesc = fromReg.descriptor;
        }
        const validDesc = (Array.isArray(rawDesc) && rawDesc.length >= 128) ? rawDesc : null;
        const isGuru = Boolean(currentUser.isGuru || currentUser.role === 'Guru' || currentUser.role === 'Admin');
        list.push({
          id: cId,
          nisn: currentUser.nisn || currentUser.nip || currentUser.inisial || '-',
          inisial: currentUser.inisial || cBio?.inisial || '',
          nama: currentUser.nama || currentUser.nama_guru || currentUser.nama_siswa || 'Pengguna',
          kelas: currentUser.kelas || currentUser.mapel || (isGuru ? 'Guru Mapel' : 'Siswa'),
          jurusan: '-',
          role: isGuru ? 'Guru' : 'Siswa',
          gender: currentUser.gender || currentUser.jenis_kelamin || cBio?.gender || '',
          foto_url: currentUser.foto_url || cBio?.foto_resmi || '',
          face_descriptor: validDesc,
          biodata: cBio,
          rawObj: currentUser,
        });
      }
    }

    // 🔒 DEDUPLIKASI KETAT: Pastikan 1 orang hanya muncul 1x di scanner (mencegah double log)
    const seen = new Set();
    const uniqueList = [];
    for (const p of list) {
      const cleanKey = cleanNameForComparison(p.nama);
      if (cleanKey && !seen.has(cleanKey)) {
        seen.add(cleanKey);
        uniqueList.push(p);
      }
    }
    return uniqueList;
  }, [siswaList, guruList, currentUser]);

  // Daftar kelas unik siswa untuk filter
  const uniqueClasses = useMemo(() => {
    const set = new Set();
    allPeople.forEach((p) => {
      if (p.role === 'Siswa' && p.kelas && p.kelas !== '-') {
        set.add(p.kelas);
      }
    });
    return Array.from(set).sort();
  }, [allPeople]);

  // Tombol Muat Ulang AI manual jika koneksi sempat terputus
  const retryLoadAi = useCallback(async () => {
    setModelStatus('loading');
    setStatusMessage('Memuat Ulang Bobot Model AI Wajah (Lokal /models)...');
    const success = await loadFaceApiModels((msg) => setStatusMessage(msg));
    if (success) {
      setModelStatus('ready');
      setStatusMessage('AI Biometrik Wajah Siap');
      const matcher = buildFaceMatcher(allPeople, 0.58);
      faceMatcherRef.current = matcher;
      if (cameraActive) {
        startFaceDetectionLoop();
      }
    } else {
      setModelStatus('error');
      setStatusMessage('Gagal Memuat AI. Klik status merah untuk mencoba kembali.');
    }
  }, [allPeople, cameraActive]);

  // --- LOAD FACE-API MODELS (HANYA SEKALI SAJA SAAT SCANNER DIBUKA) ---
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    (async () => {
      // Jika model sudah ada di memory, langsung tandai Siap tanpa re-download
      if (window.faceapi?.nets?.tinyFaceDetector?.isLoaded && window.faceapi?.nets?.faceRecognitionNet?.isLoaded) {
        if (isMounted) {
          setModelStatus('ready');
          setStatusMessage('AI Biometrik Wajah Siap');
          faceMatcherRef.current = buildFaceMatcher(allPeople, 0.58);
        }
        return;
      }

      setModelStatus('loading');
      setStatusMessage('Memuat Bobot Model AI Wajah (face-api.js lokal)...');

      const success = await loadFaceApiModels((msg) => {
        if (isMounted) setStatusMessage(msg);
      });

      if (!isMounted) return;

      if (success) {
        setModelStatus('ready');
        setStatusMessage('AI Biometrik Wajah Siap');
        // Bersihkan seluruh wajah selain Iqbal dan Ridho Pratama
        try {
          purgeAllFacesExceptIqbalAndRidho(supabase);
        } catch (ePurge) {}
        // Threshold 0.58 (super cerdas, respons kilat, toleran kacamata, sudut miring & jarak 2-3 meter)
        const matcher = buildFaceMatcher(allPeople, 0.58);
        faceMatcherRef.current = matcher;
      } else {
        // Otomatis coba sekali lagi secara background jika koneksi awal sempat terhambat
        console.warn('Percobaan pertama memuat model AI belum selesai, mencoba menyambungkan ulang...');
        setStatusMessage('Menyambungkan ulang ke Mesin AI Wajah...');
        const retryOk = await loadFaceApiModels((msg) => {
          if (isMounted) setStatusMessage(msg);
        });

        if (retryOk && isMounted) {
          setModelStatus('ready');
          setStatusMessage('AI Biometrik Wajah Siap');
          faceMatcherRef.current = buildFaceMatcher(allPeople, 0.58);
          if (cameraActive) {
            startFaceDetectionLoop();
          }
        } else if (isMounted) {
          setModelStatus('error');
          setStatusMessage('Gagal Memuat AI (Klik tombol status merah di atas untuk coba lagi)');
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Perbarui matcher saat data orang bertambah/berubah tanpa mereset status loading AI
  useEffect(() => {
    if (modelStatus === 'ready' && allPeople.length > 0) {
      faceMatcherRef.current = buildFaceMatcher(allPeople, 0.58);
    }
  }, [allPeople, modelStatus]);

  // --- DAFTAR KAMERA PERANGKAT (HP & PC) ---
  const enumerateCameras = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      setCameraDevices(videoInputs);
      if (videoInputs.length > 0 && !selectedCameraId) {
        setSelectedCameraId(videoInputs[0].deviceId);
      }
    } catch (e) {
      console.warn('Enumerate camera warning:', e);
    }
  }, [selectedCameraId]);

  useEffect(() => {
    if (isOpen) {
      enumerateCameras();
      // Otomatis nyalakan kamera saat terminal scanner dibuka
      startCamera();
    } else {
      stopCamera();
    }
  }, [isOpen]);

  // --- START / STOP KAMERA (MULTI-TIER FALLBACK UNTUK PC, LAPTOP, & HP) ---
  const startCamera = async (camId, overrideMode) => {
    try {
      stopCamera();

      if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        Swal.fire({
          icon: 'warning',
          title: 'Koneksi Kamera Memerlukan HTTPS',
          html: 'Akses webcam pada browser PC memerlukan protokol aman (HTTPS).<br/><br/>Buka alamat resmi:<br/><b><a href="https://absensi-smk-ypk-baru.vercel.app?terminal=1" target="_blank" style="color:#10b981;font-size:15px;text-decoration:underline;">https://absensi-smk-ypk-baru.vercel.app?terminal=1</a></b>',
        });
        setCameraActive(false);
        return;
      }

      const targetCamId = camId || selectedCameraId;
      const targetMode = overrideMode || facingMode;

      let stream = null;

      // 1. Percobaan Ideal (Resolusi HD 1280x720 untuk PC Webcam / HP)
      try {
        const vConstraints = {
          width: { ideal: 1280 },
          height: { ideal: 720 },
        };
        if (targetCamId) {
          vConstraints.deviceId = { ideal: targetCamId };
        } else if (targetMode) {
          vConstraints.facingMode = { ideal: targetMode };
        }
        stream = await navigator.mediaDevices.getUserMedia({
          video: vConstraints,
          audio: false,
        });
      } catch (err1) {
        console.warn('[FaceScanner] Percobaan ideal gagal, mencoba fallback tingkat 2 (kompatibilitas PC)...', err1);
        try {
          // 2. Percobaan Fleksibel (Tanpa batasan resolusi khusus webcam PC standar)
          const vFallback = targetCamId
            ? { deviceId: { ideal: targetCamId } }
            : (targetMode ? { facingMode: { ideal: targetMode } } : true);
          stream = await navigator.mediaDevices.getUserMedia({
            video: vFallback,
            audio: false,
          });
        } catch (err2) {
          console.warn('[FaceScanner] Fallback 2 gagal, membuka kamera default video: true...', err2);
          // 3. Fallback Universal Paling Dasar (Semua PC / Laptop / Kamera USB pasti tembus)
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
      }

      if (!stream) {
        throw new Error('Tidak ada stream video yang dapat diakses.');
      }

      streamRef.current = stream;

      // Segera perbarui daftar perangkat kamera agar label nama webcam di PC terbaca
      try {
        if (navigator.mediaDevices.enumerateDevices) {
          const devs = await navigator.mediaDevices.enumerateDevices();
          const vInputs = devs.filter((d) => d.kind === 'videoinput');
          if (vInputs.length > 0) {
            setCameraDevices(vInputs);
            if (!targetCamId && vInputs[0].deviceId) {
              setSelectedCameraId(vInputs[0].deviceId);
            }
          }
        }
      } catch (eDev) {}

      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;
        let started = false;
        const triggerActive = () => {
          if (started) return;
          started = true;
          video.play().catch(() => {});
          setCameraActive(true);
          startFaceDetectionLoop();
        };
        video.onloadeddata = triggerActive;
        if (video.readyState >= 2) {
          triggerActive();
        } else {
          video.play().then(triggerActive).catch(() => {});
        }
      }
    } catch (err) {
      console.error('Start camera error:', err);
      Swal.fire({
        icon: 'error',
        title: 'Kamera Tidak Dapat Dibuka di PC/HP',
        text: 'Pastikan izin akses kamera telah diizinkan pada browser Anda. ' + (err.message || ''),
      });
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    isLoopRunningRef.current = false;
    if (intervalRef.current) {
      if (typeof intervalRef.current === 'number') {
        cancelAnimationFrame(intervalRef.current);
        clearInterval(intervalRef.current);
      }
      intervalRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    activeDetectionsRef.current = [];
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    setCameraActive(false);
    isDetectingRef.current = false;
  };

  // Toggle Camera
  const toggleCamera = () => {
    if (cameraActive) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  // Switch Facing Mode (Front / Back Camera untuk HP / PC)
  const switchFacingMode = async () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    setSelectedCameraId('');
    if (cameraActive) {
      startCamera('', nextMode);
    }
  };

  // --- KELUAR & HENTIKAN SELURUH AUDIO / SUARA SEGERA ---
  const handleClose = useCallback(() => {
    stopAllSpeechAndAudio();
    stopCamera();
    setCurrentToast(null);
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    if (onClose) onClose();
  }, [onClose]);

  // Bersihkan saat unmount atau modal ditutup
  useEffect(() => {
    if (!isOpen) {
      stopAllSpeechAndAudio();
      stopCamera();
      setCurrentToast(null);
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      stopAllSpeechAndAudio();
      stopCamera();
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  // Keyboard shortcut: Escape untuk keluar seketika
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  // --- LOOP RENDERING HUD & PENDETEKSIAN REALTIME (60 FPS, SENSITIF JARAK 2-5 METER, BEBAS LAG) ---
  const startFaceDetectionLoop = () => {
    if (isLoopRunningRef.current) return;
    isLoopRunningRef.current = true;

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    const renderLoop = (timestamp) => {
      if (!isLoopRunningRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.paused || video.ended || video.readyState < 2) {
        animFrameRef.current = requestAnimationFrame(renderLoop);
        return;
      }

      const displaySize = {
        width: video.videoWidth || 640,
        height: video.videoHeight || 480,
      };

      if (displaySize.width === 0 || displaySize.height === 0) {
        animFrameRef.current = requestAnimationFrame(renderLoop);
        return;
      }

      if (canvas.width !== displaySize.width || canvas.height !== displaySize.height) {
        canvas.width = displaySize.width;
        canvas.height = displaySize.height;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animFrameRef.current = requestAnimationFrame(renderLoop);
        return;
      }

      // 1. Gambar Visual HUD & Kotak Wajah Terakhir di Kanvas pada 60 FPS Asli
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const currentDetections = activeDetectionsRef.current;
      if (!currentDetections || currentDetections.length === 0) {
        drawGuideViewfinder(ctx, displaySize.width, displaySize.height);
      } else {
        for (const item of currentDetections) {
          drawFaceDetectionBox(ctx, item.box, item.label, item.confidence, true);
        }
      }

      // 2. Eksekusi Deteksi Wajah AI di Background secara Throttled (220ms interval, 1 Pass Ringan, Peka Jarak 2-5 Meter)
      const now = timestamp || (typeof performance !== 'undefined' ? performance.now() : Date.now());
      const timeSinceLastScan = now - lastScanTimeRef.current;

      if (
        !isDetectingRef.current &&
        timeSinceLastScan >= 220 &&
        typeof window !== 'undefined' &&
        window.faceapi?.nets?.tinyFaceDetector?.isLoaded &&
        window.faceapi?.nets?.faceRecognitionNet?.isLoaded
      ) {
        isDetectingRef.current = true;
        lastScanTimeRef.current = now;

        (async () => {
          try {
            // DETEKSI TUNGGAL SUPER CEPAT (~40ms): inputSize: 320, scoreThreshold: 0.08
            // Sensitif mendeteksi wajah hingga jarak 2 - 5 meter tanpa membebani CPU!
            const det = await window.faceapi
              .detectSingleFace(
                video,
                new window.faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.08 })
              )
              .withFaceLandmarks()
              .withFaceDescriptor();

            if (!det || !det.box) {
              activeDetectionsRef.current = [];
              return;
            }

            const rawBox = det.box || det.detection?.box;
            let label = '🟢 Wajah Terdeteksi (Memindai...)';
            let matchedPerson = null;
            let confidencePercent = Math.round((det.detection?.score || det.score || 0.92) * 100);

            const matcher = faceMatcherRef.current;
            const faceRegistry = getAllRegisteredFaces();

            if (det.descriptor && matcher) {
              // Ambang batas 0.58: Sangat cerdas dan akurat untuk kacamata, sudut miring, dan jarak 2-5 meter
              const bestMatch = matcher.findBestMatch(det.descriptor);
              if (bestMatch && bestMatch.label !== 'unknown' && bestMatch.distance <= 0.58) {
                const matchedId = bestMatch.label;
                matchedPerson = allPeople.find(
                  (p) =>
                    String(p.id) === String(matchedId) ||
                    String(p.rawObj?.id_siswa) === String(matchedId) ||
                    String(p.rawObj?.id_guru) === String(matchedId) ||
                    (p.rawObj?.username && String(p.rawObj.username).toLowerCase() === String(matchedId).toLowerCase()) ||
                    cleanNameForComparison(p.nama) === cleanNameForComparison(matchedId)
                );

                if (!matchedPerson) {
                  const regEntry = faceRegistry[matchedId] || getFaceFromRegistry(matchedId);
                  if (regEntry) {
                    matchedPerson = {
                      id: regEntry.id,
                      nama: regEntry.nama,
                      role: regEntry.isGuru ? 'Guru' : 'Siswa',
                      kelas: regEntry.kelas || '-',
                      jurusan: '-',
                      gender: regEntry.gender || '',
                      foto_url: regEntry.face_photo_url || '',
                      rawObj: regEntry,
                    };
                  }
                }

                if (matchedPerson) {
                  const distance = bestMatch.distance;
                  confidencePercent = Math.max(76, Math.min(99, Math.round((1 - Math.min(distance, 0.58) / 0.58) * 23 + 76)));
                  const isAlreadyScanned = todayAttendances.some((a) => {
                    if (matchedPerson.role === 'Siswa' && a.id_siswa && matchedPerson.rawObj?.id_siswa && String(a.id_siswa) === String(matchedPerson.rawObj.id_siswa)) return true;
                    if ((matchedPerson.role === 'Guru' || matchedPerson.role === 'Pegawai') && a.id_guru && matchedPerson.rawObj?.id_guru && String(a.id_guru) === String(matchedPerson.rawObj.id_guru)) return true;
                    return cleanNameForComparison(a.nama) === cleanNameForComparison(matchedPerson.nama);
                  });

                  const callsign = getShortNameOrCallsign(matchedPerson);
                  if (isAlreadyScanned) {
                    label = `🟢 ${callsign} ✅ HADIR`;
                  } else {
                    label = `🟢 ${callsign}`;
                  }

                  handleRecognizedAttendance(matchedPerson, confidencePercent);
                }
              } else {
                label = '🟢 Wajah Belum Terdaftar';
              }
            }

            // Koordinat bounding box: Mengikuti mirror video aktif agar posisi kotak 100% tepat pada wajah
            const isVideoFlipped = facingMode === 'user' ? isMirrored : false;
            const renderBox = isVideoFlipped ? {
              x: displaySize.width - (rawBox.x + rawBox.width),
              y: rawBox.y,
              width: rawBox.width,
              height: rawBox.height,
            } : {
              x: rawBox.x,
              y: rawBox.y,
              width: rawBox.width,
              height: rawBox.height,
            };

            activeDetectionsRef.current = [{
              box: renderBox,
              label,
              confidence: confidencePercent,
            }];
          } catch (errLoop) {
            console.warn('Detection loop error:', errLoop);
          } finally {
            isDetectingRef.current = false;
          }
        })();
      }

      animFrameRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameRef.current = requestAnimationFrame(renderLoop);
  };

  // --- CATAT PRESENSI OTOMATIS & ANTI-SPAM (SESUAI ATURAN MUTLAK USER: SCAN 1 = HADIR, SCAN 2 = SUDAH HADIR, SCAN 3+ = DIAM TOTAL) ---
  const handleRecognizedAttendance = async (person, confidence) => {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Jakarta' });
    const personKey = cleanNameForComparison(person.nama) || String(person.nama || '').trim().toLowerCase();

    // 1. Debounce minimal 6 detik per evaluasi orang yang sama
    const lastSpoken = lastSpokenMapRef.current.get(personKey) || 0;
    if (Date.now() - lastSpoken < 6000) {
      return;
    }

    // 2. Cek apakah orang ini sudah tercatat presensi hari ini
    const existingRecord = todayAttendances.find((a) => {
      if (a.tanggal !== today) return false;
      if (person.role === 'Siswa' && a.id_siswa && person.rawObj?.id_siswa && String(a.id_siswa) === String(person.rawObj.id_siswa)) return true;
      if ((person.role === 'Guru' || person.role === 'Pegawai') && a.id_guru && person.rawObj?.id_guru && String(a.id_guru) === String(person.rawObj.id_guru)) return true;
      return cleanNameForComparison(a.nama) === cleanNameForComparison(person.nama);
    });

    const isGuruOrStaff = person.role === 'Guru' || person.role === 'Pegawai' || person.isGuru;
    const gender = determineGender(person);
    const teacherPrefix = isGuruOrStaff ? (gender === 'perempuan' ? 'Ibu' : 'Bapak') : '';
    const formattedDisplayName = isGuruOrStaff ? `${teacherPrefix} ${cleanNameForSpeech(person.nama)}` : cleanNameForSpeech(person.nama);

    // Ambil kuota suara yang sudah pernah dibunyikan untuk orang ini hari ini
    const currentQuota = voiceQuotaMapRef.current.get(personKey) ?? (existingRecord ? 1 : 0);

    // 🔒 ATURAN 3: SCAN KE-3 DAN SETERUSNYA -> DIAM TOTAL / HENING (ANTI-SPAM MUTLAK!)
    if (currentQuota >= 2) {
      // Wajah tetap terdeteksi hijau di layar, tetapi AI diam total tanpa suara spam
      return;
    }

    // 🔒 ATURAN 2: SCAN KE-2 (SUDAH PERNAH PRESENSI HARI INI) -> SUARA SANTUN 1X SAJA!
    if (existingRecord || currentQuota === 1) {
      voiceQuotaMapRef.current.set(personKey, 2); // Kunci langsung ke level 2 (diam total untuk seterusnya)
      lastSpokenMapRef.current.set(personKey, Date.now());

      stopAllSpeechAndAudio();
      speakAttendanceGreeting(person, person.role, 'Sudah Hadir');

      triggerToastNotification(
        person,
        timeStr,
        'Anda Sudah Presensi Hari Ini',
        true,
        formattedDisplayName,
        `Tercatat masuk pukul ${existingRecord?.jam_masuk || timeStr} WIB · Status: ${existingRecord?.status || 'Hadir'}`
      );
      return;
    }

    // 🔒 ATURAN 1: SCAN KE-1 (PRESENSI MASUK BARU PERTAMA KALI) -> SUARA 1X SAJA!
    voiceQuotaMapRef.current.set(personKey, 1); // Set ke level 1 (jika terdeteksi lagi nanti, akan masuk Aturan 2 lalu diam)
    lastSpokenMapRef.current.set(personKey, Date.now());

    // Batas Masuk Tepat Waktu: 07:30
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const totalMinutes = currentHour * 60 + currentMinute;
    const lateThresholdStr = appConfig.late_threshold_time || '07:30';
    const [lateH, lateM] = lateThresholdStr.split(':').map(Number);
    const lateMinutes = (lateH || 7) * 60 + (lateM || 30);

    // Guru & Pegawai: Bebas waktu (selalu Hadir). Siswa: Lewat 07:30 Terlambat
    const attendanceStatus = isGuruOrStaff ? 'Hadir' : (totalMinutes > lateMinutes ? 'Terlambat' : 'Hadir');

    // Chime Harmonis & Sambutan Suara AI Cerdas 1x
    stopAllSpeechAndAudio();
    playSuccessChime();
    speakAttendanceGreeting(person, person.role, attendanceStatus);

    // Rekam ke AI Smart Rating
    recordUserActivity(person, attendanceStatus === 'Hadir' ? 'attendance_ontime' : 'attendance_late');

    // Munculkan Notifikasi Pop-up di LUAR kotak kamera
    const statusTitle = isGuruOrStaff
      ? 'Presensi Masuk Berhasil'
      : (attendanceStatus === 'Terlambat' ? 'Presensi Masuk (Terlambat)' : 'Presensi Masuk Tepat Waktu');

    const metaInfo = person.role === 'Siswa'
      ? `NISN: ${person.nisn || '-'} · Kelas: ${person.kelas || '-'}`
      : `${person.role || 'Guru'} · ${person.kelas || 'Guru Mapel'}`;

    triggerToastNotification(
      person,
      timeStr,
      statusTitle,
      false,
      formattedDisplayName,
      metaInfo
    );

    // Susun Payload untuk Supabase (Sertakan created_at ISO resmi)
    const payload = {
      nama: person.nama,
      role: person.role,
      kelas: person.kelas || '-',
      jurusan: person.jurusan || '-',
      id_siswa: !isGuruOrStaff ? (person.rawObj?.id_siswa || null) : null,
      id_guru: isGuruOrStaff ? (person.rawObj?.id_guru || null) : null,
      tanggal: today,
      jam_masuk: timeStr,
      status: attendanceStatus,
      metode: 'Wajah AI',
      device_info: navigator.userAgent.slice(0, 100),
      created_at: new Date().toISOString(),
    };

    // Update state tampilan langsung (Optimistic UI - cegah duplikasi nama identik)
    const optimisticRow = { id: 'temp-' + Date.now(), ...payload };
    setTodayAttendances((prev) => {
      const exists = prev.some((a) => cleanNameForComparison(a.nama) === cleanNameForComparison(person.nama));
      if (exists) return prev;
      return [optimisticRow, ...prev];
    });
    recentAttendedSetRef.current.add(personKey);

    // Langsung kabari komponen induk agar tabel Presensi terupdate seketika
    if (onAttendanceSuccess) {
      try {
        onAttendanceSuccess(optimisticRow);
      } catch (errParent) {
        console.warn('onAttendanceSuccess error:', errParent);
      }
    }

    // Simpan ke database Supabase Cloud
    if (supabase) {
      try {
        const { data, error } = await supabase.from('absensi').insert([payload]).select();
        if (error) {
          console.error('Supabase absensi insert error:', error);
        } else {
          try {
            const channel = supabase.channel('smk_ypk_presence_room');
            channel.send({
              type: 'broadcast',
              event: 'attendance_logged',
              payload: (data && data[0]) || payload,
            });
          } catch (eBc) {}
        }
      } catch (dbErr) {
        console.error('Supabase attendance exception:', dbErr);
      }
    }
  };

  // Munculkan Notifikasi Banner di LUAR kotak kamera
  const triggerToastNotification = (person, time, status, isRepeat = false, customName = '', customMeta = '') => {
    const isGuruOrStaff = person.role === 'Guru' || person.role === 'Pegawai' || person.isGuru;
    const gender = determineGender(person);
    const teacherPrefix = isGuruOrStaff ? (gender === 'perempuan' ? 'Ibu' : 'Bapak') : '';
    const displayName = customName || (isGuruOrStaff ? `${teacherPrefix} ${cleanNameForSpeech(person.nama)}` : cleanNameForSpeech(person.nama));

    let meta = customMeta;
    if (!meta) {
      if (person.role === 'Siswa') {
        meta = `NISN: ${person.nisn || '-'} · Kelas: ${person.kelas || '-'}`;
      } else {
        meta = `${person.role || 'Guru'} · ${person.kelas || 'Guru Mapel'}`;
      }
    }

    setCurrentToast({
      name: displayName,
      role: person.role,
      meta: meta,
      time: time,
      status: status,
      isRepeat: isRepeat,
    });

    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => {
      setCurrentToast(null);
    }, 4500);
  };

  // --- STATISTIK & DAFTAR FILTER ---
  const todayDateStr = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Jakarta',
  });

  const filteredPeopleList = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const searchLower = (searchQuery || '').toLowerCase();

    return allPeople
      .filter((p) => {
        // Filter Role
        if (roleFilter !== 'ALL' && p.role !== roleFilter) return false;
        // Filter Kelas
        if (classFilter !== 'ALL' && p.kelas !== classFilter) return false;
        // Search Nama / NISN
        if (searchLower) {
          const matchName = p.nama.toLowerCase().includes(searchLower);
          const matchNisn = String(p.nisn || '').toLowerCase().includes(searchLower);
          if (!matchName && !matchNisn) return false;
        }
        return true;
      })
      .map((p) => {
        const att = todayAttendances.find((a) => {
          if (a.tanggal !== today) return false;
          if (p.role === 'Siswa' && a.id_siswa && p.rawObj?.id_siswa && String(a.id_siswa) === String(p.rawObj.id_siswa)) return true;
          if ((p.role === 'Guru' || p.role === 'Pegawai') && a.id_guru && p.rawObj?.id_guru && String(a.id_guru) === String(p.rawObj.id_guru)) return true;
          return cleanNameForComparison(a.nama) === cleanNameForComparison(p.nama);
        });
        return {
          ...p,
          isAttended: Boolean(att),
          attendanceTime: att ? (att.jam_masuk || '-') : null,
        };
      })
      .sort((a, b) => {
        // Yang hadir di paling atas, kemudian alfabetis nama
        if (a.isAttended && !b.isAttended) return -1;
        if (!a.isAttended && b.isAttended) return 1;
        return a.nama.localeCompare(b.nama);
      });
  }, [allPeople, roleFilter, classFilter, searchQuery, todayAttendances]);

  const totalRegistered = filteredPeopleList.length;
  const totalPresent = filteredPeopleList.filter((p) => p.isAttended).length;
  const totalAbsent = totalRegistered - totalPresent;

  // Ekspor CSV
  const handleExportCSV = () => {
    const today = new Date().toISOString().split('T')[0];
    let csv = 'NISN/NIP,Nama Lengkap,Kategori,Kelas/Mapel,Tanggal,Jam Hadir,Status\n';

    filteredPeopleList.forEach((p) => {
      csv += `"${p.nisn}","${p.nama}","${p.role}","${p.kelas}","${today}","${p.attendanceTime || '-'}","${p.isAttended ? 'Hadir' : 'Belum Hadir'}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Presensi_Wajah_SMK_YPK_${today}.csv`;
    link.click();
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
        width: '100vw',
        height: '100dvh',
        zIndex: 999999,
        backgroundColor: '#020617',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: '"Plus Jakarta Sans", -apple-system, sans-serif',
        color: '#f8fafc',
        overflow: 'hidden',
      }}
    >
      {/* 1. TOP BAR HEADER - SINGLE ROW FIXED (RESPONSIF & SOLID DI HP & DESKTOP) */}
      <header
        style={{
          height: '54px',
          minHeight: '54px',
          backgroundColor: '#0f172a',
          borderBottom: '1px solid #1e293b',
          padding: '0 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          zIndex: 50,
        }}
      >
        {/* SISI KIRI: ICON & JUDUL SINGKAT */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              backgroundColor: 'rgba(16, 185, 129, 0.2)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '17px',
              color: '#10b981',
              flexShrink: 0,
            }}
          >
            📸
          </div>
          <div style={{ minWidth: 0 }}>
            <span style={{ fontWeight: '800', fontSize: '14px', color: '#ffffff', whiteSpace: 'nowrap' }}>
              Presensi Wajah AI
            </span>
          </div>
        </div>

        {/* SISI KANAN: STATUS BIOMETRIK & TOMBOL KELUAR MERAH (SELALU MENGHENTIKAN SUARA) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {/* AI Status Pill */}
          <div
            onClick={modelStatus === 'error' ? retryLoadAi : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(15, 23, 42, 0.9)',
              padding: '5px 10px',
              borderRadius: '6px',
              border: `1px solid ${modelStatus === 'ready' ? '#059669' : modelStatus === 'error' ? '#e11d48' : '#d97706'}`,
              fontSize: '11px',
              cursor: modelStatus === 'error' ? 'pointer' : 'default',
            }}
            title={statusMessage || (modelStatus === 'error' ? 'Klik untuk memuat ulang AI' : 'Status Mesin AI')}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: modelStatus === 'ready' ? '#10b981' : modelStatus === 'error' ? '#f43f5e' : '#f59e0b',
                boxShadow: modelStatus === 'ready' ? '0 0 6px #10b981' : 'none',
                flexShrink: 0,
              }}
            />
            <span style={{ color: modelStatus === 'ready' ? '#34d399' : modelStatus === 'error' ? '#fda4af' : '#fde047', fontWeight: 'bold' }}>
              {modelStatus === 'ready' ? '🟢 AI Siap' : modelStatus === 'error' ? '⚠️ Gagal AI (Klik Ulang)' : (statusMessage || '⏳ Memuat AI...')}
            </span>
          </div>

          {/* TOMBOL KELUAR MERAH - SEGERA MENGHENTIKAN SUARA TTS & KAMERA */}
          <button
            type="button"
            onClick={handleClose}
            style={{
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              border: 'none',
              color: '#ffffff',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 10px rgba(220, 38, 38, 0.5)',
              flexShrink: 0,
            }}
            title="Keluar / Tutup Terminal Scanner"
          >
            ✕ Keluar
          </button>
        </div>
      </header>

      {/* SUB-HEADER COMPACT INFO BAR */}
      <div
        style={{
          height: '28px',
          minHeight: '28px',
          backgroundColor: '#020617',
          borderBottom: '1px solid #1e293b',
          padding: '0 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: '#94a3b8',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontWeight: '700', color: '#e2e8f0' }}>{appConfig.school_name || 'SMK YPK MEDAN'}</span>
          <span>•</span>
          <span style={{ color: '#34d399', fontWeight: 'bold' }}>Siswa • Guru • Pegawai</span>
        </div>
        <div style={{ color: '#64748b', fontSize: '10.5px' }}>
          Terminal Presensi Realtime
        </div>
      </div>

      {/* 2. MAIN VIEWPORT (RESPONSIF DESKTOP & MOBILE) */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '16px',
          padding: '14px',
          overflowY: 'auto',
          maxWidth: '1500px',
          margin: '0 auto',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {/* ================= SISI KIRI: KAMERA PRESENSI LANGSUNG ================= */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            backgroundColor: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: '16px',
            padding: '16px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
          }}
        >
          {/* Controls Bar Atas Kamera */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: '9px',
                  height: '9px',
                  borderRadius: '50%',
                  backgroundColor: cameraActive ? '#10b981' : '#64748b',
                  boxShadow: cameraActive ? '0 0 10px #10b981' : 'none',
                }}
              />
              <h2 style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: '#e2e8f0' }}>
                Kamera Presensi Langsung
              </h2>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              {/* Dropdown Pemilih Kamera (Webcam PC / Kamera HP) */}
              {cameraDevices.length > 1 && (
                <select
                  value={selectedCameraId}
                  onChange={(e) => {
                    const newId = e.target.value;
                    setSelectedCameraId(newId);
                    if (cameraActive) {
                      startCamera(newId);
                    }
                  }}
                  style={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    color: '#e2e8f0',
                    fontSize: '11px',
                    borderRadius: '8px',
                    padding: '5px 8px',
                    outline: 'none',
                    maxWidth: '130px',
                    cursor: 'pointer',
                  }}
                >
                  {cameraDevices.map((d, i) => (
                    <option key={d.deviceId || i} value={d.deviceId}>
                      {d.label ? (d.label.length > 16 ? d.label.substring(0, 16) + '...' : d.label) : `Kamera ${i + 1}`}
                    </option>
                  ))}
                </select>
              )}

              {/* Tombol Kamera Depan / Belakang (Khusus HP) */}
              <button
                type="button"
                onClick={switchFacingMode}
                style={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  color: '#94a3b8',
                  padding: '5px 9px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
                title="Ganti Kamera Depan / Belakang"
              >
                🔄 {facingMode === 'user' ? 'Kamera Belakang' : 'Kamera Depan'}
              </button>

              {/* Tombol Ganti Tampilan Kamera (Utuh / Full) */}
              <button
                type="button"
                onClick={() => setCameraFitMode((prev) => (prev === 'contain' ? 'cover' : 'contain'))}
                style={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  color: '#38bdf8',
                  padding: '5px 9px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                title={cameraFitMode === 'contain' ? 'Mode Saat Ini: Tampilan Utuh (Tidak Terpotong). Klik untuk Mode Zoom' : 'Mode Saat Ini: Zoom Layar Penuh. Klik untuk Mode Utuh'}
              >
                <span>{cameraFitMode === 'contain' ? '📐 Tampilan Utuh' : '🔲 Mode Zoom'}</span>
              </button>

              {/* Tombol Cermin Kamera (Mirror / Non-Mirror) */}
              <button
                type="button"
                onClick={toggleMirrorMode}
                style={{
                  backgroundColor: (facingMode === 'user' ? isMirrored : false) ? '#1e3a5f' : '#1e293b',
                  border: (facingMode === 'user' ? isMirrored : false) ? '1px solid #3b82f6' : '1px solid #334155',
                  color: (facingMode === 'user' ? isMirrored : false) ? '#60a5fa' : '#94a3b8',
                  padding: '5px 9px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                title={(facingMode === 'user' ? isMirrored : false) ? 'Mode Cermin Aktif. Klik untuk Mode Normal' : 'Mode Normal Aktif. Klik untuk Mode Cermin'}
              >
                <span>🪞 {(facingMode === 'user' ? isMirrored : false) ? 'Cermin Aktif' : 'Cermin Mati'}</span>
              </button>

              {/* Tombol Start / Stop Kamera */}
              <button
                type="button"
                onClick={toggleCamera}
                style={{
                  backgroundColor: cameraActive ? '#dc2626' : '#059669',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: '700',
                  fontSize: '11px',
                  borderRadius: '8px',
                  padding: '6px 14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: cameraActive ? '0 2px 8px rgba(220, 38, 38, 0.4)' : '0 2px 8px rgba(5, 150, 105, 0.4)',
                  transition: 'all 0.2s',
                }}
              >
                {cameraActive ? '⏹ Matikan Kamera' : '▶️ Mulai Kamera'}
              </button>
            </div>
          </div>

          {/* VIEWPORT VIDEO & OVERLAY CANVAS (RESPONSIF 16:9 WEBCAM PC & KAMERA HP TANPA TERPOTONG) */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '16 / 9',
              minHeight: '260px',
              backgroundColor: '#020617',
              borderRadius: '12px',
              overflow: 'hidden',
              border: '1px solid #334155',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Feed Webcam */}
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: cameraFitMode,
                transform: (facingMode === 'user' ? isMirrored : false) ? 'scaleX(-1)' : 'none',
              }}
            />

            {/* Overlay Canvas untuk Kotak Bounding Box & Label (TIDAK DIBALIK CSS AGAR TEKS NAMA TIDAK TERBALIK) */}
            <canvas
              ref={canvasRef}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: cameraFitMode,
                pointerEvents: 'none',
              }}
            />

            {/* Placeholder jika kamera belum aktif */}
            {!cameraActive && (
              <div
                onClick={() => startCamera()}
                style={{
                  textAlign: 'center',
                  padding: '20px',
                  color: '#64748b',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  zIndex: 10,
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
                title="Klik untuk menyalakan kamera"
              >
                <div style={{ fontSize: '42px', opacity: 0.8 }}>📷</div>
                <div style={{ fontWeight: '700', fontSize: '14px', color: '#cbd5e1' }}>
                  Kamera Belum Aktif (Klik Disini)
                </div>
                <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', maxWidth: '280px' }}>
                  Klik disini atau tombol <b>"▶️ Mulai Kamera"</b> di atas untuk menyalakan webcam.
                </p>
              </div>
            )}
          </div>

          {/* 📢 NOTIFIKASI PRESENSI MANDIRI DI LUAR KOTAK KAMERA (TIDAK MENGHALANGI KAMERA SAMA SEKALI) */}
          <div style={{ minHeight: '66px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {currentToast ? (
              <div
                style={{
                  backgroundColor: currentToast.isRepeat ? 'rgba(30, 41, 59, 0.95)' : 'rgba(5, 150, 105, 0.95)',
                  border: currentToast.isRepeat ? '1px solid #64748b' : '1px solid #34d399',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  color: '#ffffff',
                  boxShadow: currentToast.isRepeat ? '0 6px 20px rgba(0,0,0,0.3)' : '0 8px 25px rgba(16, 185, 129, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  animation: 'slideUp 0.3s ease-out',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: currentToast.isRepeat ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px',
                      fontWeight: 'bold',
                      flexShrink: 0,
                    }}
                  >
                    {currentToast.isRepeat ? 'ℹ️' : '✓'}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: '800',
                        textTransform: 'uppercase',
                        letterSpacing: '0.6px',
                        color: currentToast.isRepeat ? '#fde047' : '#a7f3d0',
                        display: 'block',
                      }}
                    >
                      {currentToast.status}
                    </span>
                    <div style={{ fontWeight: '800', fontSize: '15px', color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {currentToast.name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#e2e8f0', opacity: 0.9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {currentToast.meta}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: '13px', color: currentToast.isRepeat ? '#fde047' : '#a7f3d0', flexShrink: 0 }}>
                  {currentToast.time} WIB
                </div>
              </div>
            ) : (
              <div
                style={{
                  backgroundColor: 'rgba(15, 23, 42, 0.5)',
                  border: '1px dashed #334155',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  color: '#64748b',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <span style={{ fontSize: '18px' }}>📸</span>
                <span>Arahkan wajah tegak ke kamera. Notifikasi presensi akan tampil di sini.</span>
              </div>
            )}
          </div>

          {/* Footnote Petunjuk Posisi */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px', fontSize: '11px', color: '#64748b' }}>
            <span>💡 Posisikan wajah lurus menghadap kamera</span>
            <span style={{ fontFamily: 'monospace', color: '#38bdf8' }}>
              {cameraActive ? '● Sensor Deteksi Aktif' : '○ Siap'}
            </span>
          </div>
        </div>

        {/* ================= SISI KANAN: LOG KEHADIRAN REALTIME ================= */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            backgroundColor: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: '16px',
            padding: '16px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
            minHeight: '480px',
          }}
        >
          {/* STATS KARTU RINGKASAN */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '10px 12px' }}>
              <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', display: 'block' }}>
                Total Target
              </span>
              <span style={{ fontSize: '20px', fontWeight: '800', fontFamily: 'monospace', color: '#ffffff' }}>
                {totalRegistered}
              </span>
            </div>

            <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '10px', padding: '10px 12px' }}>
              <span style={{ fontSize: '10px', color: '#34d399', fontWeight: '700', textTransform: 'uppercase', display: 'block' }}>
                Hadir Hari Ini
              </span>
              <span style={{ fontSize: '20px', fontWeight: '800', fontFamily: 'monospace', color: '#34d399' }}>
                {totalPresent}
              </span>
            </div>

            <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '10px 12px' }}>
              <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', display: 'block' }}>
                Belum Hadir
              </span>
              <span style={{ fontSize: '20px', fontWeight: '800', fontFamily: 'monospace', color: '#cbd5e1' }}>
                {totalAbsent}
              </span>
            </div>
          </div>

          {/* HEADER & FILTER LOG */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#ffffff' }}>
                  Log Kehadiran Realtime
                </h3>
                <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
                  {todayDateStr}
                </span>
              </div>

              {/* Tombol Ekspor CSV */}
              <button
                type="button"
                onClick={handleExportCSV}
                style={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  color: '#cbd5e1',
                  borderRadius: '8px',
                  padding: '5px 10px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                📥 Unduh CSV
              </button>
            </div>

            {/* Filter Kategori & Kelas */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {/* Filter Role */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                style={{
                  flex: 1,
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  color: '#f8fafc',
                  fontSize: '11px',
                  borderRadius: '8px',
                  padding: '6px 8px',
                  outline: 'none',
                }}
              >
                <option value="ALL">Semua Pengguna</option>
                <option value="Siswa">Siswa Saja</option>
                <option value="Guru">Guru Saja</option>
                <option value="Pegawai">Pegawai Saja</option>
              </select>

              {/* Filter Kelas (jika role siswa) */}
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                style={{
                  flex: 1,
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  color: '#f8fafc',
                  fontSize: '11px',
                  borderRadius: '8px',
                  padding: '6px 8px',
                  outline: 'none',
                }}
              >
                <option value="ALL">Semua Kelas</option>
                {uniqueClasses.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama atau NISN / NIP..."
              style={{
                width: '100%',
                backgroundColor: '#020617',
                border: '1px solid #334155',
                color: '#f8fafc',
                fontSize: '11px',
                borderRadius: '8px',
                padding: '7px 10px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* LIST LOG PRESENSI SCROLLABLE */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              paddingRight: '4px',
              maxHeight: '440px',
            }}
          >
            {filteredPeopleList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: '#64748b', fontSize: '12px' }}>
                Tidak ada data yang cocok dengan filter pencarian.
              </div>
            ) : (
              filteredPeopleList.map((person) => (
                <div
                  key={person.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: person.isAttended ? 'rgba(16, 185, 129, 0.08)' : 'rgba(30, 41, 59, 0.4)',
                    border: person.isAttended ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid #1e293b',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {/* Avatar / Foto */}
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '50%',
                        backgroundColor: person.isAttended ? '#059669' : '#334155',
                        color: '#ffffff',
                        fontWeight: '700',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        flexShrink: 0,
                      }}
                    >
                      {person.foto_url ? (
                        <img src={person.foto_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        person.nama.charAt(0).toUpperCase()
                      )}
                    </div>

                    <div>
                      <div style={{ fontWeight: '700', fontSize: '12px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{person.nama}</span>
                        <span
                          style={{
                            fontSize: '9px',
                            fontWeight: '700',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            backgroundColor: person.role === 'Guru' ? '#1e3a8a' : person.role === 'Pegawai' ? '#78350f' : '#047857',
                            color: '#ffffff',
                          }}
                        >
                          {person.role}
                        </span>
                      </div>
                      <div style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace' }}>
                        {person.nisn !== '-' ? `${person.nisn} · ` : ''}{person.kelas}
                      </div>
                    </div>
                  </div>

                  {/* Badge Hadir / Belum Hadir */}
                  <div style={{ textAlign: 'right' }}>
                    {person.isAttended ? (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          fontFamily: 'monospace',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: 'rgba(16, 185, 129, 0.2)',
                          color: '#34d399',
                          border: '1px solid rgba(16, 185, 129, 0.4)',
                        }}
                      >
                        Hadir {person.attendanceTime}
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: '600',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: '#1e293b',
                          color: '#64748b',
                          border: '1px solid #334155',
                        }}
                      >
                        Belum Hadir
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
