'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Swal from 'sweetalert2';
import {
  loadFaceApiModels,
  buildFaceMatcher,
  drawFaceDetectionBox,
  drawGuideViewfinder,
  playSuccessChime,
  playAlreadyPresentChime,
  speakAttendanceGreeting,
  getShortNameOrCallsign,
  cleanNameForSpeech,
  determineGender,
  cleanNameForComparison,
  stopAllSpeechAndAudio,
  getFaceFromRegistry,
  getAllRegisteredFaces,
} from '../utils/faceRecognition';
import { recordUserActivity } from '../utils/smartRatingAi';
import { formatWibTime, formatWibDate, normalizeTimeForDb } from '../utils/waktu';

const getJakartaDateKey = (date = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);

const OPTIONAL_ATTENDANCE_COLUMNS = new Set([
  'role', 'jurusan', 'id_siswa', 'id_guru', 'tanggal', 'jam_masuk', 'metode', 'device_info',
  'jam_pulang', 'tipe', 'created_at', 'rfid_uid',
]);

const getMissingAttendanceColumn = (error) => {
  const message = String(error?.message || '');
  const matches = [
    message.match(/Could not find the ['"]?([a-z0-9_]+)['"]? column of ['"]?absensi/i),
    message.match(/column ['"]?([a-z0-9_]+)['"]? of relation ['"]?absensi/i),
    message.match(/column\s+['"]?absensi\.([a-z0-9_]+)['"]?\s+does not exist/i),
  ];
  return matches.find(Boolean)?.[1]?.toLowerCase() || null;
};

async function insertAttendanceCompat(supabase, payload) {
  const insertPayload = { ...payload };
  for (let attempt = 0; attempt <= OPTIONAL_ATTENDANCE_COLUMNS.size; attempt += 1) {
    const { error } = await supabase.from('absensi').insert([insertPayload]);
    if (!error) return { ...insertPayload };

    const missingColumn = getMissingAttendanceColumn(error);
    if (!missingColumn || !OPTIONAL_ATTENDANCE_COLUMNS.has(missingColumn) || !(missingColumn in insertPayload)) {
      // Galat TIPE NILAI (mis. kolom jam_masuk bertipe TIME tetapi formatnya salah)
      // -> normalkan ulang format waktu lalu coba simpan sekali lagi.
      const message = String(error?.message || '');
      const isTimeTypeError = /invalid input syntax for type (time|date)|datetimefield/i.test(message);
      if (isTimeTypeError && attempt < 3) {
        let changed = false;
        if ('jam_masuk' in insertPayload) {
          const fixed = normalizeTimeForDb(insertPayload.jam_masuk);
          if (fixed && fixed !== insertPayload.jam_masuk) {
            insertPayload.jam_masuk = fixed;
            changed = true;
          }
        }
        if ('jam_pulang' in insertPayload) {
          const fixed = normalizeTimeForDb(insertPayload.jam_pulang);
          if (fixed && fixed !== insertPayload.jam_pulang) {
            insertPayload.jam_pulang = fixed;
            changed = true;
          }
        }
        if ('tanggal' in insertPayload) {
          const fixedDate = normalizeTimeForDb(insertPayload.tanggal);
          if (fixedDate && /^\d{4}-\d{2}-\d{2}$/.test(String(insertPayload.tanggal))) {
            insertPayload.tanggal = fixedDate;
            changed = true;
          }
        }
        if (changed) {
          // eslint-disable-next-line no-continue
          continue;
        }
      }
      throw error;
    }

    // Beberapa instalasi Supabase belum menjalankan semua migrasi kolom.
    // Buang hanya kolom opsional yang terbukti belum ada, lalu ulangi insert.
    delete insertPayload[missingColumn];
  }

  throw new Error('Skema tabel absensi belum kompatibel dengan aplikasi.');
}

export default function FaceRecognitionScanner({
  isOpen,
  onClose,
  siswaList = [],
  guruList = [],
  currentUser,
  supabase,
  onAttendanceSuccess,
  appConfig = {},
  onOpenFaceManager,
  absensiLogs = [],
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
  // ⚡ PERFORMA HUD: smooth box lerp tracking (60 FPS) & signature
  const smoothBoxRef = useRef({ x: 0, y: 0, width: 0, height: 0, active: false });
  const hudSignatureRef = useRef('');
  const lastHudSignatureRef = useRef('');
  const lastHudDrawRef = useRef(0);
  const recentAttendedSetRef = useRef(new Set());
  const submittingAttendanceRef = useRef(new Set());
  const lastSpokenMapRef = useRef(new Map()); // Map<personKey, timestamp>
  const voiceQuotaMapRef = useRef(new Map()); // Map<personKey, number> 0: belum, 1: presensi masuk, 2+: diam total
  // 🛡️ ANTI-JUMPING / ANTI-GLITCH BIOMETRIK:
  // 1. consecutiveMatchRef: Membutuhkan minimal 2 frame berturut-turut (~440ms) mengenali orang yang sama sebelum memicu presensi
  const consecutiveMatchRef = useRef({ id: null, count: 0, lastSeen: 0 });
  // 2. activePersonLockRef: Setelah seseorang terdeteksi/terkonfirmasi, kunci identitas selama 3.5 detik agar kamera tidak melompat ke nama orang lain
  const activePersonLockRef = useRef({ person: null, personId: null, timestamp: 0 });
  const toastTimeoutRef = useRef(null);
  const cameraStartTimerRef = useRef(null);
  const cameraAutoRetryRef = useRef(null);
  const cameraActiveRef = useRef(false);

  // ⚡ DUAL-PACED LIVE TRACKING & RECOGNITION (60 FPS HUD + 25 FPS Fast Tracker + Decoupled Async Recognition)
  const isTrackingRef = useRef(false);
  const isRecognizingRef = useRef(false);
  const lastTrackingTimeRef = useRef(0);
  const lastFaceSeenTimeRef = useRef(0);
  const lastKnownBoxRef = useRef(null);
  const currentLabelRef = useRef('🟢 Wajah Terdeteksi');
  const currentConfidenceRef = useRef(92);
  const recognitionCoolDownRef = useRef(0);
  const todayAttendancesRef = useRef([]);

  // --- STATES ---
  const [cameraActive, setCameraActive] = useState(false);
  // Mirror ke ref agar auto-retry kamera bisa membaca status tanpa memicu re-render.
  useEffect(() => {
    cameraActiveRef.current = cameraActive;
  }, [cameraActive]);
  const [cameraDevices, setCameraDevices] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [facingMode, setFacingMode] = useState('user'); // 'user' | 'environment'
  const [modelStatus, setModelStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [statusMessage, setStatusMessage] = useState('Memuat AI Deep Learning Face-API...');
  const [todayAttendances, setTodayAttendances] = useState([]);
  useEffect(() => {
    todayAttendancesRef.current = todayAttendances;
  }, [todayAttendances]);
  const [roleFilter, setRoleFilter] = useState('ALL'); // 'ALL' | 'Siswa' | 'Guru' | 'Pegawai'
  const [classFilter, setClassFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentToast, setCurrentToast] = useState(null); // { name, role, meta, time, status, isRepeat }
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cameraFitMode, setCameraFitMode] = useState('contain'); // 'contain' (Luas & Utuh tanpa terpotong) | 'cover' (Layar Penuh)
  // 📱 Deteksi tampilan HP (portrait & layar kecil) untuk menyesuaikan layout
  const [isMobileViewport, setIsMobileViewport] = useState(false);
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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const updateViewport = () => {
      setIsMobileViewport(
        window.innerWidth < 768 || window.innerHeight > window.innerWidth
      );
    };
    updateViewport();
    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', updateViewport);
    return () => {
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('orientationchange', updateViewport);
    };
  }, []);

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
      const matcher = buildFaceMatcher(allPeople, 0.48);
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
          faceMatcherRef.current = buildFaceMatcher(allPeople, 0.48);
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
        // Threshold 0.48 (presisi tinggi & anti-salah identifikasi orang lain, respons kilat)
        const matcher = buildFaceMatcher(allPeople, 0.48);
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
          faceMatcherRef.current = buildFaceMatcher(allPeople, 0.48);
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
      faceMatcherRef.current = buildFaceMatcher(allPeople, 0.48);
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

      // 🔁 Auto-retry: bila kamera belum aktif dalam 3,5 detik (mis. permission
      // dialog sempat tertunda di PC), coba nyalakan sekali lagi otomatis.
      const autoRetry = window.setTimeout(() => {
        if (isOpen && !cameraActiveRef.current) {
          console.warn('[FaceScanner] Kamera belum aktif, mencoba nyalakan ulang otomatis...');
          startCamera();
        }
      }, 3500);
      cameraAutoRetryRef.current = autoRetry;
    } else {
      stopCamera();
    }
    return () => {
      if (cameraAutoRetryRef.current) {
        window.clearTimeout(cameraAutoRetryRef.current);
        cameraAutoRetryRef.current = null;
      }
    };
  }, [isOpen]);

  // 🔄 1. Sinkronkan dari prop absensiLogs (data realtime induk)
  useEffect(() => {
    if (Array.isArray(absensiLogs) && absensiLogs.length > 0) {
      const todayStr = formatWibDate(new Date());
      const filtered = absensiLogs.filter((log) => {
        const d = log?.tanggal || (log?.created_at ? formatWibDate(new Date(log.created_at)) : '');
        return String(d || '').trim().slice(0, 10) === todayStr;
      });
      if (filtered.length > 0) {
        setTodayAttendances((prev) => {
          const map = new Map();
          prev.forEach((item) => {
            if (item?.id) map.set(item.id, item);
          });
          filtered.forEach((item) => {
            if (item?.id) map.set(item.id, item);
          });
          const merged = Array.from(map.values());
          todayAttendancesRef.current = merged;
          return merged;
        });
      }
    }
  }, [absensiLogs]);

  // 🔄 2. Ambil riwayat presensi hari ini dari Supabase secara realtime saat terminal dibuka
  //    + Dengarkan broadcast & postgres_changes agar scan dari PC langsung sinkron ke HP dalam hitungan milidetik
  useEffect(() => {
    if (!isOpen || !supabase) return;
    let isMounted = true;

    const fetchToday = async () => {
      try {
        const todayStr = formatWibDate(new Date());
        const { data } = await supabase
          .from('absensi')
          .select('*')
          .eq('tanggal', todayStr)
          .order('jam_masuk', { ascending: false });
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setTodayAttendances((prev) => {
            const map = new Map();
            prev.forEach((item) => { if (item?.id) map.set(item.id, item); });
            data.forEach((item) => { if (item?.id) map.set(item.id, item); });
            const merged = Array.from(map.values());
            todayAttendancesRef.current = merged;
            return merged;
          });
        }
      } catch (e) {}
    };

    fetchToday();

    // 📡 Listener Realtime Antar-Perangkat (PC <-> HP Android)
    const channel = supabase
      .channel('face-scanner-multi-device-sync')
      .on('broadcast', { event: 'face_registered' }, ({ payload }) => {
        if (!payload || !isMounted) return;
        if (payload.face_descriptor && Array.isArray(payload.face_descriptor) && payload.face_descriptor.length >= 128) {
          saveFaceToRegistry(payload.id || payload.user_id, payload.nama, payload.face_descriptor, payload.face_photo_url, {
            rawId: payload.rawId,
            isGuru: payload.role === 'guru',
            kelas: payload.kelas || '',
          });
          // Update candidate descriptor in allPeople
          const candidate = allPeople.find(
            (p) =>
              String(p.id) === String(payload.id) ||
              String(p.id) === String(payload.user_id) ||
              String(p.rawId) === String(payload.rawId) ||
              cleanNameForComparison(p.nama) === cleanNameForComparison(payload.nama)
          );
          if (candidate) {
            candidate.face_descriptor = payload.face_descriptor;
          }
          if (modelStatus === 'ready') {
            faceMatcherRef.current = buildFaceMatcher(allPeople, 0.48);
          }
        }
      })
      .on('broadcast', { event: 'attendance_logged' }, ({ payload }) => {
        if (!payload || !isMounted) return;
        setTodayAttendances((prev) => {
          const exists = prev.some((p) =>
            (payload.id && p.id === payload.id) ||
            cleanNameForComparison(p.nama) === cleanNameForComparison(payload.nama)
          );
          if (exists) return prev;
          const updated = [payload, ...prev];
          todayAttendancesRef.current = updated;
          return updated;
        });
      })
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'absensi' },
        (payload) => {
          const newRow = payload.new;
          if (!newRow || !isMounted) return;
          const todayStr = formatWibDate(new Date());
          const rowDate = newRow.tanggal || (newRow.created_at ? formatWibDate(new Date(newRow.created_at)) : '');
          if (String(rowDate).slice(0, 10) === todayStr) {
            setTodayAttendances((prev) => {
              const exists = prev.some((p) =>
                (newRow.id && p.id === newRow.id) ||
                cleanNameForComparison(p.nama) === cleanNameForComparison(newRow.nama)
              );
              if (exists) return prev;
              const updated = [newRow, ...prev];
              todayAttendancesRef.current = updated;
              return updated;
            });
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      try { supabase.removeChannel(channel); } catch (e) {}
    };
  }, [isOpen, supabase]);

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

      // 1. Percobaan Ideal (Resolusi HD 1280x720 / 30fps stabil untuk Webcam PC Logitech C270 & HP)
      try {
        const vConstraints = {
          width: { ideal: 1280, max: 1280 },
          height: { ideal: 720, max: 720 },
          frameRate: { ideal: 30, max: 30 },
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
            ? { deviceId: { exact: targetCamId }, width: { ideal: 1280 }, height: { ideal: 720 } }
            : (targetMode ? { facingMode: { ideal: targetMode }, width: { ideal: 1280 }, height: { ideal: 720 } } : true);
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
        // 🔇 Pastikan video dalam mode MUTE agar autoplay policy browser (PC/Chrome)
        // tidak menolak video.promises() -> kamera terlihat "mati" padahal stream sudah aktif.
        video.muted = true;
        video.defaultMuted = true;
        video.playsInline = true;
        video.setAttribute('playsinline', '');
        video.setAttribute('muted', '');
        video.srcObject = stream;

        let started = false;
        const triggerActive = () => {
          if (started) return;
          started = true;
          setCameraActive(true);
          startFaceDetectionLoop();
          // play() dipanggil SETELAH state aktif supaya tidak ditolak autoplay policy.
          const p = video.play();
          if (p && typeof p.catch === 'function') {
            p.catch((playErr) => {
              console.warn('[FaceScanner] video.play() ditolak, mencoba playback manual:', playErr?.name);
              try { video.play(); } catch (e) {}
            });
          }
        };

        // Semua event siap pakai memicu aktivasi (metadata/data/canplay/playing).
        video.onloadedmetadata = triggerActive;
        video.onloadeddata = triggerActive;
        video.oncanplay = triggerActive;
        video.onplaying = triggerActive;

        if (video.readyState >= 2) {
          triggerActive();
        } else {
          // Pancing playback; jika promise tidak selesai (beberapa browser desktop),
          // jaring pengaman di bawah akan mengaktifkan kamera setelah 1,2 detik.
          const p = video.play();
          if (p && typeof p.then === 'function') {
            p.then(triggerActive).catch(() => {});
          }
        }

        // ⏱️ JARING PENGAMAN: stream sudah menempel, kamera WAJIB considered aktif
        // walau browser menahan playback (autoplay policy / tab tidak fokus).
        window.clearTimeout(cameraStartTimerRef.current);
        cameraStartTimerRef.current = window.setTimeout(() => {
          if (!started) {
            console.warn('[FaceScanner] Fallback aktivasi kamera (playback belum merespons).');
            triggerActive();
          }
        }, 1200);
      }
    } catch (err) {
      console.error('Start camera error:', err);
      const errName = String(err?.name || '');
      const errMsg = String(err?.message || '');
      let petunjuk = 'Pastikan izin akses kamera telah diizinkan pada browser Anda.';
      if (/NotAllowedError|SecurityError/i.test(errName)) {
        petunjuk =
          'Izin kamera DITOLAK browser. Klik ikon kamera/kunci di sisi kiri address bar, pilih "Izinkan", lalu klik "Mulai Kamera" lagi. Di HP TWA: buka browser Chrome, masuk ke pengaturan situs, aktifkan Kamera.';
      } else if (/NotFoundError|DevicesNotFoundError/i.test(errName)) {
        petunjuk = 'Tidak ada kamera yang terdeteksi pada perangkat ini. Sambungkan webcam USB lalu pilih kamera pada daftar di atas.';
      } else if (/NotReadableError|TrackStartError/i.test(errName)) {
        petunjuk = 'Kamera sedang dipakai aplikasi lain (mis. Zoom/Meet). Tutup aplikasi tersebut lalu buka kembali kamera.';
      } else if (/OverconstrainedError/i.test(errName)) {
        petunjuk = 'Resolusi kamera tidak mendukung. Pilih kamera lain pada daftar perangkat di atas.';
      } else if (errMsg) {
        petunjuk = errMsg;
      }
      Swal.fire({
        icon: 'error',
        title: 'Kamera Tidak Dapat Dibuka di PC/HP',
        html: `<div style="text-align:left;line-height:1.5">${petunjuk}</div>`,
        confirmButtonText: 'Coba Lagi',
        showCancelButton: true,
        cancelButtonText: 'Tutup',
      }).then((result) => {
        if (result && result.value) {
          startCamera(targetCamId, targetMode);
        }
      });
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    isLoopRunningRef.current = false;
    isTrackingRef.current = false;
    isRecognizingRef.current = false;
    lastKnownBoxRef.current = null;
    smoothBoxRef.current.active = false;
    currentLabelRef.current = '🟢 Wajah Terdeteksi';
    if (cameraStartTimerRef.current) {
      window.clearTimeout(cameraStartTimerRef.current);
      cameraStartTimerRef.current = null;
    }
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

      // Canvas memakai ukuran intrinsik video (640x480) DAN video memakai
      // objectFit yang sama, sehingga keduanya ter-skala identik -> kotak wajah
      // selalu pas. Untuk mode cermin, koordinat kotak dibalik saat digambar
      // (lihat drawFaceDetectionBox) supaya tidak meleset ke sisi sebaliknya.
      if (canvas.width !== displaySize.width || canvas.height !== displaySize.height) {
        canvas.width = displaySize.width;
        canvas.height = displaySize.height;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animFrameRef.current = requestAnimationFrame(renderLoop);
        return;
      }

      // 1. Gambar Visual HUD & Kotak Wajah Terakhir di Kanvas (60 FPS Butter Smooth)
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const now = timestamp || (typeof performance !== 'undefined' ? performance.now() : Date.now());

      // 🛡️ Anti-Flicker Persistence: Wajah dianggap masih aktif jika terlihat dalam 450ms terakhir
      const isFaceActive = Boolean(
        lastKnownBoxRef.current &&
        (Date.now() - lastFaceSeenTimeRef.current < 450)
      );

      if (!isFaceActive) {
        smoothBoxRef.current.active = false;
        drawGuideViewfinder(ctx, displaySize.width, displaySize.height);
      } else {
        const targetBox = lastKnownBoxRef.current;
        if (!smoothBoxRef.current.active) {
          smoothBoxRef.current = {
            x: targetBox.x,
            y: targetBox.y,
            width: targetBox.width,
            height: targetBox.height,
            active: true,
          };
        } else {
          // Lerp smoothing (faktor 0.35 sangat mulus, responsif dan cepat mengikuti wajah tanpa lag/getar)
          const lerp = (a, b, t) => a + (b - a) * t;
          smoothBoxRef.current.x = lerp(smoothBoxRef.current.x, targetBox.x, 0.35);
          smoothBoxRef.current.y = lerp(smoothBoxRef.current.y, targetBox.y, 0.35);
          smoothBoxRef.current.width = lerp(smoothBoxRef.current.width, targetBox.width, 0.35);
          smoothBoxRef.current.height = lerp(smoothBoxRef.current.height, targetBox.height, 0.35);
        }

        drawFaceDetectionBox(ctx, smoothBoxRef.current, {
          labelText: currentLabelRef.current,
          statusColor: '#10b981',
          mirror: false, // Koordinat box sudah dihitung dengan mirror di renderBox
        }, currentConfidenceRef.current, true);
      }

      // 2. ⚡ FAST LIVE TRACKING LOOP (Deteksi Bounding Box Ultra-Cepat ~40ms / 25 FPS)
      //    HANYA menjalankan TinyFaceDetector (193 KB) TANPA ekstraksi descriptor ResNet-34.
      //    Hasil: Pelacakan kotak wajah instan 60 FPS di PC Desktop & HP seperti kamera bawaan!
      const timeSinceLastTrack = now - lastTrackingTimeRef.current;
      if (
        !isTrackingRef.current &&
        timeSinceLastTrack >= 40 &&
        typeof window !== 'undefined' &&
        window.faceapi?.nets?.tinyFaceDetector?.isLoaded
      ) {
        isTrackingRef.current = true;
        lastTrackingTimeRef.current = now;

        (async () => {
          try {
            // Parameter Sensitivitas Tinggi: inputSize 320 & scoreThreshold 0.08
            // Wajah dari jarak 1.5 - 2.5 meter langsung terdeteksi jelas tanpa perlu mendekat ke lensa!
            let fastDet = await window.faceapi.detectSingleFace(
              video,
              new window.faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.08 })
            );

            // Jika belum terdeteksi dan sudah > 500ms tanpa wajah, coba fallback inputSize 416 untuk jarak jauh
            if (!fastDet && (Date.now() - lastFaceSeenTimeRef.current > 500)) {
              try {
                fastDet = await window.faceapi.detectSingleFace(
                  video,
                  new window.faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.07 })
                );
              } catch (e416) {}
            }

            const rawBox = fastDet?.detection?.box || fastDet?.box;
            if (rawBox && rawBox.width > 15 && rawBox.height > 15) {
              lastFaceSeenTimeRef.current = Date.now();

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

              lastKnownBoxRef.current = renderBox;
              activeDetectionsRef.current = [{
                box: renderBox,
                label: currentLabelRef.current,
                confidence: currentConfidenceRef.current,
              }];

              // Picu pengenalan identitas wajah secara terpisah di latar belakang (non-blocking)
              triggerBackgroundRecognition(video);
            } else {
              // Jika wajah benar-benar tidak terdeteksi selama > 450ms, bersihkan deteksi
              if (Date.now() - lastFaceSeenTimeRef.current >= 450) {
                lastKnownBoxRef.current = null;
                activeDetectionsRef.current = [];
                currentLabelRef.current = '🟢 Wajah Terdeteksi';
                activePersonLockRef.current = { person: null, personId: null, timestamp: 0 };
              }
            }
          } catch (errTrack) {
            // Abaikan kesalahan frame sementara
          } finally {
            isTrackingRef.current = false;
          }
        })();
      }

      animFrameRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameRef.current = requestAnimationFrame(renderLoop);
  };

  // --- 🧠 PENGENALAN IDENTITAS BIOMETRIK WAJAH SECARA BACKGROUND (DECOUPLED, BEBAS LAG 60 FPS) ---
  const triggerBackgroundRecognition = (video) => {
    if (!video || isRecognizingRef.current) return;
    const nowMs = Date.now();

    // 1. Kunci Identitas Aktif (3.5 Detik): Jika seseorang baru saja terkonfirmasi,
    //    jangan buang resource GPU mengekstraksi ResNet-34 descriptor terus-menerus!
    const currentLock = activePersonLockRef.current;
    if (currentLock?.person && (nowMs - currentLock.timestamp < 3500)) {
      return;
    }

    // 2. Cooldown antar pemindaian biometrik (minimal 250ms)
    if (nowMs - recognitionCoolDownRef.current < 250) {
      return;
    }

    if (!faceMatcherRef.current || !window.faceapi?.nets?.faceRecognitionNet?.isLoaded) {
      return;
    }

    isRecognizingRef.current = true;
    recognitionCoolDownRef.current = nowMs;

    (async () => {
      try {
        const useTinyLandmark = Boolean(window.faceapi.nets.faceLandmark68TinyNet?.isLoaded);

        // Ekstraksi 128-D Biometrik (ResNet-34) dengan resolusi peka jarak (inputSize 320, scoreThreshold 0.08)
        let fullDet = null;
        try {
          fullDet = await window.faceapi
            .detectSingleFace(
              video,
              new window.faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.08 })
            )
            .withFaceLandmarks(useTinyLandmark)
            .withFaceDescriptor();
        } catch (eRec1) {
          try {
            fullDet = await window.faceapi
              .detectSingleFace(
                video,
                new window.faceapi.TinyFaceDetectorOptions({ inputSize: 256, scoreThreshold: 0.08 })
              )
              .withFaceLandmarks(useTinyLandmark)
              .withFaceDescriptor();
          } catch (eRec2) {}
        }

        if (!fullDet || !fullDet.descriptor) {
          if (!activePersonLockRef.current?.person) {
            currentLabelRef.current = '🟢 Wajah Terdeteksi (Memindai...)';
          }
          return;
        }

        const matcher = faceMatcherRef.current;
        if (!matcher) return;

        const maxThreshold = 0.48;
        const bestMatch = matcher.findBestMatch(fullDet.descriptor);

        if (bestMatch && bestMatch.label !== 'unknown' && bestMatch.distance <= maxThreshold) {
          const matchedId = bestMatch.label;
          let candidatePerson = allPeople.find(
            (p) =>
              String(p.id) === String(matchedId) ||
              String(p.rawObj?.id_siswa) === String(matchedId) ||
              String(p.rawObj?.id_guru) === String(matchedId) ||
              (p.role === 'Guru' && `GURU-${p.rawId || p.id}` === String(matchedId)) ||
              (p.role === 'Siswa' && `SISWA-${p.rawId || p.id}` === String(matchedId)) ||
              (p.rawObj?.username && String(p.rawObj.username).toLowerCase() === String(matchedId).toLowerCase()) ||
              (cleanNameForComparison(matchedId)?.length >= 3 && cleanNameForComparison(p.nama) === cleanNameForComparison(matchedId))
          );

          if (!candidatePerson) {
            const faceRegistry = getAllRegisteredFaces();
            const regEntry = faceRegistry[matchedId] || getFaceFromRegistry(matchedId);
            if (regEntry) {
              candidatePerson = {
                id: regEntry.id,
                nama: regEntry.nama,
                role: regEntry.isGuru ? 'Guru' : 'Siswa',
                kelas: regEntry.kelas || '-',
                jurusan: '-',
                gender: regEntry.gender || '',
                foto_url: regEntry.face_photo_url || '',
                face_descriptor: regEntry.descriptor,
                rawObj: regEntry,
              };
            }
          }

          // 🛡️ STRICT BIOMETRIC VALIDATION:
          // Pastikan biometrik wajah benar-benar terdaftar di database/registry!
          const candidateDesc =
            candidatePerson?.face_descriptor ||
            candidatePerson?.rawObj?.face_descriptor ||
            candidatePerson?.biodata?.face_descriptor ||
            getFaceFromRegistry(candidatePerson?.id)?.descriptor;

          const hasRegisteredBiometric = Boolean(
            Array.isArray(candidateDesc) && candidateDesc.length >= 128
          );

          // 🛡️ VERIFIKASI LANGSUNG EUCLIDEAN DISTANCE (ANTI SALAH ORANG):
          let directDistance = 999;
          if (hasRegisteredBiometric && Array.isArray(candidateDesc)) {
            let sum = 0;
            const len = Math.min(fullDet.descriptor.length, candidateDesc.length);
            for (let i = 0; i < len; i++) {
              const diff = fullDet.descriptor[i] - candidateDesc[i];
              sum += diff * diff;
            }
            directDistance = Math.sqrt(sum);
          }

          if (!candidatePerson || !hasRegisteredBiometric || directDistance > maxThreshold) {
            currentLabelRef.current = '🟡 Wajah Belum Terdaftar';
          } else {
            const candidateKey = String(candidatePerson.id || candidatePerson.rawObj?.id_siswa || candidatePerson.rawObj?.id_guru || candidatePerson.nama);
            activePersonLockRef.current = {
              person: candidatePerson,
              personId: candidateKey,
              timestamp: Date.now(),
            };

            const distance = bestMatch.distance;
            const confidencePercent = Math.max(82, Math.min(99, Math.round((1 - Math.min(distance, maxThreshold) / maxThreshold) * 17 + 82)));
            currentConfidenceRef.current = confidencePercent;

            const isAlreadyScanned = todayAttendancesRef.current.some((a) => {
              if (candidatePerson.role === 'Siswa' && a.id_siswa && candidatePerson.rawObj?.id_siswa && String(a.id_siswa) === String(candidatePerson.rawObj.id_siswa)) return true;
              if ((candidatePerson.role === 'Guru' || candidatePerson.role === 'Pegawai') && a.id_guru && candidatePerson.rawObj?.id_guru && String(a.id_guru) === String(candidatePerson.rawObj.id_guru)) return true;
              return cleanNameForComparison(a.nama) === cleanNameForComparison(candidatePerson.nama);
            });

            const callsign = getShortNameOrCallsign(candidatePerson);
            currentLabelRef.current = isAlreadyScanned ? `🟢 ${callsign} ✅ HADIR` : `🟢 ${callsign}`;

            handleRecognizedAttendance(candidatePerson, confidencePercent);
          }
        } else {
          currentLabelRef.current = '🟡 Wajah Belum Terdaftar';
        }
      } catch (errRecog) {
        console.warn('[FaceAI] Background recognition warning:', errRecog);
      } finally {
        isRecognizingRef.current = false;
      }
    })();
  };

  // --- CATAT PRESENSI OTOMATIS & ANTI-SPAM (SESUAI ATURAN MUTLAK USER: SCAN 1 = HADIR, SCAN 2 = SUDAH HADIR, SCAN 3+ = DIAM TOTAL) ---
  const handleRecognizedAttendance = async (person, confidence) => {
    const now = new Date();
    const today = formatWibDate(now);
    // ⚠️ WAJIB format "HH:MM:SS" (pakai KOLON).
    // Format id-ID "23.48.34" ditolak PostgreSQL untuk kolom bertipe TIME.
    const timeStr = formatWibTime(now, true);
    const personKey = cleanNameForComparison(person.nama) || String(person.nama || '').trim().toLowerCase();

    // 1. Debounce minimal 6 detik per evaluasi orang yang sama
    const lastSpoken = lastSpokenMapRef.current.get(personKey) || 0;
    if (Date.now() - lastSpoken < 6000) {
      return;
    }

    // 🛡️ BEDAKAN REKAM WAJAH BARU DENGAN SCANNER PRESENSI UNTUK ABSEN:
    // Jika orang ini baru saja direkam wajahnya (dalam 5 menit terakhir),
    // JANGAN langsung dibuat presensi hadir!
    const candidateId = String(person.id || person.rawId || person.rawObj?.id_siswa || person.rawObj?.id_guru || '');
    let isRecentlyEnrolled = false;
    if (typeof window !== 'undefined') {
      try {
        const t1 = Number(localStorage.getItem(`recent_face_enrollment_${personKey}`) || 0);
        const t2 = Number(localStorage.getItem(`recent_face_enrollment_${candidateId}`) || 0);
        const latestEnroll = Math.max(t1, t2);
        if (latestEnroll && (Date.now() - latestEnroll < 5 * 60 * 1000)) {
          isRecentlyEnrolled = true;
        }
      } catch (e) {}
    }

    if (isRecentlyEnrolled) {
      const callsign = getShortNameOrCallsign(person);
      currentLabelRef.current = `🟢 ${callsign} (Baru Rekam Wajah)`;
      return;
    }

    // 2. Cek apakah orang ini sudah tercatat presensi hari ini
    const isLogToday = (log) => {
      const rawDate = log?.tanggal || (log?.created_at ? formatWibDate(new Date(log.created_at)) : '');
      const cleanDate = String(rawDate || '').trim().slice(0, 10);
      return cleanDate === today;
    };

    const isMatchPerson = (log) => {
      if (!isLogToday(log)) return false;
      if (person.role === 'Siswa' && log.id_siswa && person.rawObj?.id_siswa && String(log.id_siswa) === String(person.rawObj.id_siswa)) return true;
      if ((person.role === 'Guru' || person.role === 'Pegawai') && log.id_guru && person.rawObj?.id_guru && String(log.id_guru) === String(person.rawObj.id_guru)) return true;
      return cleanNameForComparison(log.nama) === personKey;
    };

    let existingRecord = todayAttendances.find(isMatchPerson) || null;

    // 🛡️ CEK SINKRONISASI DATABASE LANGSUNG (ANTI-DUPLIKAT LINTAS PERANGKAT PC <-> HP):
    // Jika belum ada di memori lokal, periksa langsung ke Supabase
    if (!existingRecord && supabase) {
      try {
        let dbQuery = supabase.from('absensi').select('*').eq('tanggal', today);
        if (person.role === 'Siswa' && person.rawObj?.id_siswa) {
          dbQuery = dbQuery.eq('id_siswa', person.rawObj.id_siswa);
        } else if ((person.role === 'Guru' || person.role === 'Pegawai') && person.rawObj?.id_guru) {
          dbQuery = dbQuery.eq('id_guru', person.rawObj.id_guru);
        } else {
          dbQuery = dbQuery.eq('nama', person.nama);
        }
        const { data: dbRecords } = await dbQuery.limit(5);
        if (Array.isArray(dbRecords) && dbRecords.length > 0) {
          existingRecord = dbRecords[0];
        } else {
          const { data: nameRecords } = await supabase
            .from('absensi')
            .select('*')
            .eq('tanggal', today)
            .limit(25);
          if (Array.isArray(nameRecords)) {
            existingRecord = nameRecords.find(isMatchPerson) || null;
          }
        }
        if (existingRecord) {
          setTodayAttendances((prev) => {
            const exists = prev.some((p) => p.id === existingRecord.id || isMatchPerson(p));
            return exists ? prev : [existingRecord, ...prev];
          });
          todayAttendancesRef.current = [existingRecord, ...todayAttendancesRef.current];
        }
      } catch (err) {
        console.warn('Realtime database duplicate check error:', err);
      }
    }

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

    // 🔒 ATURAN 2: SCAN KE-2 (SUDAH PERNAH PRESENSI HARI INI) -> CUKUP 1X CEKRING (AI TIDAK BICARA LAGI)
    if (existingRecord || currentQuota >= 1) {
      voiceQuotaMapRef.current.set(personKey, 2); // Kunci langsung ke level 2 (diam total untuk seterusnya)
      lastSpokenMapRef.current.set(personKey, Date.now());

      stopAllSpeechAndAudio();
      // 🔊 CUKUP 1X CEKRING (playAlreadyPresentChime), AI tidak berbicara lagi!
      playAlreadyPresentChime();

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

    // 🔒 Kunci Anti-Race Condition: Jika orang ini sedang dalam proses penyimpanan, abaikan frame paralel
    if (submittingAttendanceRef.current.has(personKey)) {
      return;
    }
    submittingAttendanceRef.current.add(personKey);

    // 🔒 ATURAN 1: SCAN KE-1 (PRESENSI MASUK BARU PERTAMA KALI) -> SUARA 1X SAJA!
    voiceQuotaMapRef.current.set(personKey, 1); // Set ke level 1 (jika terdeteksi lagi nanti, akan masuk Aturan 2 lalu diam)
    lastSpokenMapRef.current.set(personKey, Date.now());

    // Batas Masuk Tepat Waktu: 07:30
    const jakartaTime = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).format(now);
    const [currentHour, currentMinute] = jakartaTime.split(':').map(Number);
    const totalMinutes = currentHour * 60 + currentMinute;
    const lateThresholdStr = appConfig.late_threshold_time || '07:30';
    const [lateH, lateM] = lateThresholdStr.split(':').map(Number);
    const lateMinutes = (lateH || 7) * 60 + (lateM || 30);

    // Guru & Pegawai: Bebas waktu (selalu Hadir). Siswa: Lewat 07:30 Terlambat
    const attendanceStatus = isGuruOrStaff ? 'Hadir' : (totalMinutes > lateMinutes ? 'Terlambat' : 'Hadir');

    const statusTitle = isGuruOrStaff
      ? 'Presensi Masuk Berhasil'
      : (attendanceStatus === 'Terlambat' ? 'Presensi Masuk (Terlambat)' : 'Presensi Masuk Tepat Waktu');

    const metaInfo = person.role === 'Siswa'
      ? `NISN: ${person.nisn || '-'} · Kelas: ${person.kelas || '-'}`
      : `${person.role || 'Guru'} · ${person.kelas || 'Guru Mapel'}`;

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

    // Simpan dahulu agar UI dan audio tidak mengklaim hadir jika database menolak.
    try {
      if (!supabase) throw new Error('Koneksi database belum tersedia.');

      // 🛡️ RE-CHECK ATOMIK TEPAT SEBELUM INSERT: Mencegah duplicate jika perangkat lain baru saja insert di detik yang sama
      let atomCheck = supabase.from('absensi').select('id, nama, jam_masuk, status').eq('tanggal', today);
      if (person.role === 'Siswa' && person.rawObj?.id_siswa) {
        atomCheck = atomCheck.eq('id_siswa', person.rawObj.id_siswa);
      } else if ((person.role === 'Guru' || person.role === 'Pegawai') && person.rawObj?.id_guru) {
        atomCheck = atomCheck.eq('id_guru', person.rawObj.id_guru);
      } else {
        atomCheck = atomCheck.eq('nama', person.nama);
      }
      const { data: atomExisting } = await atomCheck.limit(1);
      if (Array.isArray(atomExisting) && atomExisting.length > 0) {
        const alreadySaved = atomExisting[0];
        setTodayAttendances((prev) => [alreadySaved, ...prev]);
        voiceQuotaMapRef.current.set(personKey, 2);
        playAlreadyPresentChime();
        triggerToastNotification(
          person,
          timeStr,
          'Anda Sudah Presensi Hari Ini',
          true,
          formattedDisplayName,
          `Tercatat masuk pukul ${alreadySaved?.jam_masuk || timeStr} WIB · Status: ${alreadySaved?.status || 'Hadir'}`
        );
        return;
      }

      const savedRow = await insertAttendanceCompat(supabase, payload);
      setTodayAttendances((prev) => {
        const exists = prev.some((a) => cleanNameForComparison(a.nama) === cleanNameForComparison(person.nama));
        return exists ? prev : [savedRow, ...prev];
      });
      recentAttendedSetRef.current.add(personKey);
      if (onAttendanceSuccess) {
        try { onAttendanceSuccess(savedRow); } catch (callbackErr) { console.warn('Attendance UI callback failed:', callbackErr); }
      }
      try {
        supabase.channel('smk_ypk_presence_room').send({
          type: 'broadcast',
          event: 'attendance_logged',
          payload: savedRow,
        });
        supabase.channel('smk_ypk_presence_room').send({
          type: 'broadcast',
          event: 'personal_attendance_event',
          payload: {
            targetId: person.id || person.rawId || personKey,
            targetNama: person.nama,
            status: attendanceStatus,
            mode: 'masuk',
            jam: timeStr,
            motivasi: '',
            photo: person.foto_url || '',
            kelas: person.kelas || '',
            role: person.role || (isGuruOrStaff ? 'guru' : 'siswa'),
            isGuru: isGuruOrStaff,
          },
        });
      } catch (eBc) {}

      stopAllSpeechAndAudio();
      playSuccessChime();
      // 🔊 ATURAN SUARA (ATURAN USER):
      //    - SISWA → HANYA bunyi "CEKRING" (chime), TANPA suara AI.
      //    - GURU/PEGAWAI → bunyi chime + AI menyapa & MENYEBUT NAMA.
      if (isGuruOrStaff) {
        speakAttendanceGreeting(person, person.role, attendanceStatus);
      }
      recordUserActivity(person, attendanceStatus === 'Hadir' ? 'attendance_ontime' : 'attendance_late');
      triggerToastNotification(person, timeStr, statusTitle, false, formattedDisplayName, metaInfo);
    } catch (dbErr) {
      console.error('Supabase attendance save failed:', dbErr);
      voiceQuotaMapRef.current.delete(personKey);
      lastSpokenMapRef.current.delete(personKey);
      const errorMessage = String(dbErr?.message || '').trim();
      const failureReason = /row-level security|permission denied|not allowed|42501/i.test(errorMessage)
        ? 'Izin database menolak penyimpanan (RLS). Jalankan migrasi izin presensi di Supabase.'
        : /failed to fetch|network|fetch/i.test(errorMessage)
          ? 'Koneksi database tidak tersedia.'
          : (errorMessage ? errorMessage.slice(0, 120) : 'Periksa koneksi dan skema tabel absensi.');
      triggerToastNotification(person, timeStr, `Gagal menyimpan presensi: ${failureReason}`, true, formattedDisplayName, metaInfo);
    } finally {
      submittingAttendanceRef.current.delete(personKey);
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
    const today = getJakartaDateKey();
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
    const today = getJakartaDateKey();
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
          minHeight: isMobileViewport ? '52px' : '54px',
          backgroundColor: '#0f172a',
          borderBottom: '1px solid #1e293b',
          padding: isMobileViewport ? '0 8px' : '0 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '6px',
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
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <span style={{ fontWeight: '800', fontSize: isMobileViewport ? '12.5px' : '14px', color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
              Presensi Wajah AI
            </span>
          </div>
        </div>

        {/* SISI KANAN: STATUS BIOMETRIK & TOMBOL KELUAR MERAH (SELALU MENGHENTIKAN SUARA) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobileViewport ? '5px' : '8px', flexShrink: 0, minWidth: 0 }}>
          {/* Tombol Rekam Wajah Baru (Buka Face Register Manager) */}
          {onOpenFaceManager && (
            <button
              type="button"
              onClick={() => {
                stopAllSpeechAndAudio();
                stopCamera();
                onOpenFaceManager();
              }}
              style={{
                backgroundColor: '#059669',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: isMobileViewport ? '6px 8px' : '7px 12px',
                fontSize: isMobileViewport ? '10.5px' : '11.5px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 2px 8px rgba(5, 150, 105, 0.4)',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
              title="Daftarkan / Rekam Wajah Siswa atau Guru Baru"
            >
              <span>📸</span>
              {/* 📱 Di layar sempit (APK) label disembunyikan agar tidak menindih */}
              {!isMobileViewport && <span>Rekam Wajah AI</span>}
            </button>
          )}

          {/* AI Status Pill */}
          <div
            onClick={modelStatus === 'error' ? retryLoadAi : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: isMobileViewport ? '4px' : '6px',
              backgroundColor: 'rgba(15, 23, 42, 0.9)',
              padding: isMobileViewport ? '4px 7px' : '5px 10px',
              borderRadius: '6px',
              border: `1px solid ${modelStatus === 'ready' ? '#059669' : modelStatus === 'error' ? '#e11d48' : '#d97706'}`,
              fontSize: isMobileViewport ? '10px' : '11px',
              cursor: modelStatus === 'error' ? 'pointer' : 'default',
              flexShrink: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              maxWidth: isMobileViewport ? '132px' : 'none',
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
            <span style={{ color: modelStatus === 'ready' ? '#34d399' : modelStatus === 'error' ? '#fda4af' : '#fde047', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {modelStatus === 'ready'
                ? '🟢 AI Siap'
                : modelStatus === 'error'
                ? '⚠️ Gagal AI (Klik Ulang)'
                : (isMobileViewport ? '⏳ Memuat…' : (statusMessage || '⏳ Memuat AI...'))}
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
              padding: isMobileViewport ? '7px 10px' : '8px 16px',
              fontSize: isMobileViewport ? '12px' : '13px',
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
            {isMobileViewport ? '✕' : '✕ Keluar'}
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

            {/* 📱 Di HP: kontrol dipindah ke baris sendiri agar TIDAK menindih */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: isMobileViewport ? '5px' : '6px',
                flexWrap: 'wrap',
                width: isMobileViewport ? '100%' : 'auto',
              }}
            >
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
                    fontSize: isMobileViewport ? '10px' : '11px',
                    borderRadius: '8px',
                    padding: isMobileViewport ? '5px 6px' : '5px 8px',
                    outline: 'none',
                    maxWidth: isMobileViewport ? '110px' : '130px',
                    cursor: 'pointer',
                    flexShrink: 0,
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
                  padding: isMobileViewport ? '5px 7px' : '5px 9px',
                  borderRadius: '8px',
                  fontSize: isMobileViewport ? '10px' : '11px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
                title="Ganti Kamera Depan / Belakang"
              >
                🔄 {isMobileViewport
                  ? (facingMode === 'user' ? 'Belakang' : 'Depan')
                  : (facingMode === 'user' ? 'Kamera Belakang' : 'Kamera Depan')}
              </button>

              {/* Tombol Ganti Tampilan Kamera (Utuh / Full) */}
              <button
                type="button"
                onClick={() => setCameraFitMode((prev) => (prev === 'contain' ? 'cover' : 'contain'))}
                style={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  color: '#38bdf8',
                  padding: isMobileViewport ? '5px 7px' : '5px 9px',
                  borderRadius: '8px',
                  fontSize: isMobileViewport ? '10px' : '11px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  flexShrink: 0,
                }}
                title={cameraFitMode === 'contain' ? 'Mode Saat Ini: Tampilan Utuh (Tidak Terpotong). Klik untuk Mode Zoom' : 'Mode Saat Ini: Zoom Layar Penuh. Klik untuk Mode Utuh'}
              >
                <span>{cameraFitMode === 'contain'
                  ? (isMobileViewport ? '📐 Utuh' : '📐 Tampilan Utuh')
                  : (isMobileViewport ? '🔲 Zoom' : '🔲 Mode Zoom')}</span>
              </button>

              {/* Tombol Cermin Kamera (Mirror / Non-Mirror) */}
              <button
                type="button"
                onClick={toggleMirrorMode}
                style={{
                  backgroundColor: (facingMode === 'user' ? isMirrored : false) ? '#1e3a5f' : '#1e293b',
                  border: (facingMode === 'user' ? isMirrored : false) ? '1px solid #3b82f6' : '1px solid #334155',
                  color: (facingMode === 'user' ? isMirrored : false) ? '#60a5fa' : '#94a3b8',
                  padding: isMobileViewport ? '5px 7px' : '5px 9px',
                  borderRadius: '8px',
                  fontSize: isMobileViewport ? '10px' : '11px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  flexShrink: 0,
                }}
                title={(facingMode === 'user' ? isMirrored : false) ? 'Mode Cermin Aktif. Klik untuk Mode Normal' : 'Mode Normal Aktif. Klik untuk Mode Cermin'}
              >
                <span>🪞 {isMobileViewport
                  ? ((facingMode === 'user' ? isMirrored : false) ? 'Cermin' : 'Normal')
                  : ((facingMode === 'user' ? isMirrored : false) ? 'Cermin Aktif' : 'Cermin Mati')}</span>
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
                  fontSize: isMobileViewport ? '10px' : '11px',
                  borderRadius: '8px',
                  padding: isMobileViewport ? '6px 10px' : '6px 14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexShrink: 0,
                  boxShadow: cameraActive ? '0 2px 8px rgba(220, 38, 38, 0.4)' : '0 2px 8px rgba(5, 150, 105, 0.4)',
                  transition: 'all 0.2s',
                }}
              >
                {cameraActive
                  ? (isMobileViewport ? '⏹ Matikan' : '⏹ Matikan Kamera')
                  : (isMobileViewport ? '▶️ Mulai' : '▶️ Mulai Kamera')}
              </button>
            </div>
          </div>

          {/* VIEWPORT VIDEO & OVERLAY CANVAS (RESPONSIF 16:9 WEBCAM PC & KAMERA HP TANPA TERPOTONG) */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              // 📱 Di HP layar vertikal, rasio 16/9 membuat wajah terlalu kecil
              // untuk terdeteksi akurat. Pakai 4/3 (sepertirasio webcam HP) dan
              // biarkan user memilih mode zoom lewat tombol 📐.
              aspectRatio: isMobileViewport ? '4 / 3' : '16 / 9',
              minHeight: isMobileViewport ? '300px' : '260px',
              maxHeight: isMobileViewport ? '58vh' : 'none',
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
