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
  const isDetectingRef = useRef(false);
  const faceMatcherRef = useRef(null);
  const recentAttendedSetRef = useRef(new Set());
  const lastSpokenMapRef = useRef(new Map()); // Map<personKey, timestamp>
  const alreadyNotifiedTodaySetRef = useRef(new Set()); // Anti-spam: orang yang sudah diberitahu bahwa ia sudah presensi
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

  // --- GABUNGKAN SELURUH SISWA, GURU & PEGAWAI SECARA LENGKAP & CERDAS ---
  const allPeople = useMemo(() => {
    const list = [];

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

    return list;
  }, [siswaList, guruList]);

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

  // --- AMBIL LOG PRESENSI HARI INI DARI SUPABASE ---
  const fetchTodayAttendances = useCallback(async () => {
    if (!supabase) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('absensi')
        .select('*')
        .eq('tanggal', today)
        .order('jam_masuk', { ascending: false });

      if (!error && data) {
        setTodayAttendances(data);
        data.forEach((row) => {
          const key = String(row.nama || '').trim().toLowerCase();
          recentAttendedSetRef.current.add(key);
        });
      }
    } catch (err) {
      console.warn('Fetch today attendance warning:', err);
    }
  }, [supabase]);

  // --- SUPABASE REALTIME LISTENER ---
  useEffect(() => {
    if (!isOpen || !supabase) return;

    fetchTodayAttendances();

    const channel = supabase
      .channel('realtime:face_attendance_scanner')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'absensi' },
        (payload) => {
          if (payload.new) {
            const newRow = payload.new;
            setTodayAttendances((prev) => {
              if (prev.some((p) => p.id === newRow.id)) return prev;
              return [newRow, ...prev];
            });
            if (newRow.nama) {
              recentAttendedSetRef.current.add(String(newRow.nama).trim().toLowerCase());
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, supabase, fetchTodayAttendances]);

  // --- LOAD FACE-API MODELS & BUILD MATCHER ---
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    (async () => {
      setModelStatus('loading');
      setStatusMessage('Memuat Bobot Model AI Wajah (face-api.js)...');

      const success = await loadFaceApiModels((msg) => {
        if (isMounted) setStatusMessage(msg);
      });

      if (!isMounted) return;

      if (success) {
        setModelStatus('ready');
        setStatusMessage('AI Biometrik Wajah Siap');
        // Threshold ketat 0.42 agar presisi dan tidak ada salah kenal
        const matcher = buildFaceMatcher(allPeople, 0.42);
        faceMatcherRef.current = matcher;
      } else {
        setModelStatus('error');
        setStatusMessage('Gagal Memuat AI (Periksa Koneksi Internet)');
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [isOpen, allPeople]);

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
    }
  }, [isOpen, enumerateCameras]);

  // --- START / STOP KAMERA ---
  const startCamera = async () => {
    try {
      stopCamera();

      const constraints = {
        video: selectedCameraId
          ? { deviceId: { exact: selectedCameraId } }
          : {
              facingMode: facingMode,
              width: { ideal: 640 },
              height: { ideal: 480 },
            },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setCameraActive(true);
          startFaceDetectionLoop();
        };
      }
    } catch (err) {
      console.error('Start camera error:', err);
      Swal.fire({
        icon: 'error',
        title: 'Kamera Tidak Dapat Dibuka',
        text: 'Pastikan izin akses kamera telah diizinkan pada browser Anda. ' + (err.message || ''),
      });
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
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

  // Switch Facing Mode (Front / Back Camera untuk HP)
  const switchFacingMode = async () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    setSelectedCameraId('');
    if (cameraActive) {
      setTimeout(() => startCamera(), 200);
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

  // --- LOOP PENDETEKSIAN REALTIME (350ms) ---
  const startFaceDetectionLoop = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.paused || video.ended || isDetectingRef.current) return;
      if (typeof window === 'undefined' || !window.faceapi) return;

      const displaySize = {
        width: video.videoWidth || 640,
        height: video.videoHeight || 480,
      };

      if (displaySize.width === 0 || displaySize.height === 0) return;

      canvas.width = displaySize.width;
      canvas.height = displaySize.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      isDetectingRef.current = true;

      try {
        const detections = await window.faceapi
          .detectAllFaces(
            video,
            new window.faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.45 })
          )
          .withFaceLandmarks()
          .withFaceDescriptors();

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (!detections || detections.length === 0) {
          isDetectingRef.current = false;
          return;
        }

        const matcher = faceMatcherRef.current;

        for (const det of detections) {
          const rawBox = det.detection.box;
          let label = 'Wajah Terdeteksi';
          let matchedPerson = null;
          let confidencePercent = Math.round(det.detection.score * 100);

          if (matcher && det.descriptor) {
            const bestMatch = matcher.findBestMatch(det.descriptor);
            if (bestMatch && bestMatch.label !== 'unknown' && bestMatch.distance <= 0.42) {
              const matchedId = bestMatch.label;
              matchedPerson = allPeople.find(
                (p) => String(p.id) === String(matchedId) || String(p.rawObj?.id_siswa) === String(matchedId) || String(p.rawObj?.id_guru) === String(matchedId)
              );

              if (matchedPerson) {
                const distance = bestMatch.distance;
                confidencePercent = Math.max(65, Math.min(99, Math.round((1 - distance / 0.42) * 34 + 65)));
                const isAlreadyScanned = todayAttendances.some((a) => {
                  if (matchedPerson.role === 'Siswa' && a.id_siswa && matchedPerson.rawObj?.id_siswa && String(a.id_siswa) === String(matchedPerson.rawObj.id_siswa)) return true;
                  if ((matchedPerson.role === 'Guru' || matchedPerson.role === 'Pegawai') && a.id_guru && matchedPerson.rawObj?.id_guru && String(a.id_guru) === String(matchedPerson.rawObj.id_guru)) return true;
                  return cleanNameForComparison(a.nama) === cleanNameForComparison(matchedPerson.nama);
                });

                // Cerdas: Guru -> "Bapak [Nama]" (pria) / "Ibu [Nama]" (wanita) (BUKAN BPK!)
                // Siswa -> Langsung nama siswa tanpa embel-embel Bapak/Ibu!
                const callsign = getShortNameOrCallsign(matchedPerson);
                if (isAlreadyScanned) {
                  label = `${callsign} ✅ HADIR`;
                } else {
                  label = `${callsign}`;
                }
                handleRecognizedAttendance(matchedPerson, confidencePercent);
              }
            } else {
              label = 'Belum Terdaftar';
            }
          }

          // Posisi Bounding Box: Jika kamera depan (user), koordinat di-mirror secara matematis ke kanvas
          // sehingga bounding box tepat di wajah DAN teks nama TETAP DIBACA DARI KIRI KE KANAN (TIDAK TERBALIK!)
          const renderBox = facingMode === 'user' ? {
            x: displaySize.width - (rawBox.x + rawBox.width),
            y: rawBox.y,
            width: rawBox.width,
            height: rawBox.height,
          } : rawBox;

          drawFaceDetectionBox(ctx, renderBox, label, confidencePercent, Boolean(matchedPerson));
        }
      } catch (err) {
        console.warn('Detection loop error:', err);
      } finally {
        isDetectingRef.current = false;
      }
    }, 360);
  };

  // --- CATAT PRESENSI OTOMATIS & ANTI-SPAM (SESUAI ATURAN PRESENSI 1X SAJA) ---
  const handleRecognizedAttendance = async (person, confidence) => {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Jakarta' });
    const personKey = String(person.nama || '').trim().toLowerCase();

    // 1. Debounce minimal 8 detik antar respon per orang
    const lastSpoken = lastSpokenMapRef.current.get(personKey) || 0;
    if (Date.now() - lastSpoken < 8000) {
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

    // KASUS 1: ORANG INI SUDAH PERNAH PRESENSI HARI INI
    // 🔒 Aturan Mutlak: Cukup 1x saja! Jika lewat 1x -> beritahu "Anda sudah presensi hari ini" 1x, lalu STOP total suara dan notif pintar!
    if (existingRecord) {
      if (!alreadyNotifiedTodaySetRef.current.has(personKey)) {
        alreadyNotifiedTodaySetRef.current.add(personKey);
        lastSpokenMapRef.current.set(personKey, Date.now());

        // Hentikan suara sebelumnya sebelum berbicara santun 1x
        stopAllSpeechAndAudio();
        speakAttendanceGreeting(person, person.role, 'Sudah Hadir');

        triggerToastNotification(
          person,
          timeStr,
          'Anda Sudah Presensi Hari Ini',
          true,
          formattedDisplayName,
          `Tercatat masuk pukul ${existingRecord.jam_masuk || timeStr} WIB · Status: ${existingRecord.status || 'Hadir'}`
        );
      }
      // Jika sudah pernah diberitahu: STOP total suara dan notif pintar!
      return;
    }

    // KASUS 2: PRESENSI MASUK BARU (HANYA 1X SAJA)
    lastSpokenMapRef.current.set(personKey, Date.now());
    alreadyNotifiedTodaySetRef.current.add(personKey); // 🔒 Kunci seketika agar tidak berulang!

    // Batas Masuk Tepat Waktu: 07:30
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const totalMinutes = currentHour * 60 + currentMinute;
    const lateThresholdStr = appConfig.late_threshold_time || '07:30';
    const [lateH, lateM] = lateThresholdStr.split(':').map(Number);
    const lateMinutes = (lateH || 7) * 60 + (lateM || 30);

    // Guru & Pegawai: Bebas waktu (selalu Hadir). Siswa: Lewat 07:30 Terlambat
    const attendanceStatus = isGuruOrStaff ? 'Hadir' : (totalMinutes > lateMinutes ? 'Terlambat' : 'Hadir');

    // Chime Harmonis & Sambutan Suara AI Cerdas
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

    // Susun Payload untuk Supabase
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
    };

    // Update state tampilan langsung (Optimistic UI)
    const optimisticRow = { id: 'temp-' + Date.now(), ...payload };
    setTodayAttendances((prev) => [optimisticRow, ...prev]);
    recentAttendedSetRef.current.add(personKey);

    // Simpan ke database Supabase Cloud
    if (supabase) {
      try {
        const { error } = await supabase.from('absensi').insert([payload]);
        if (error) {
          console.error('Supabase absensi insert error:', error);
        } else if (onAttendanceSuccess) {
          onAttendanceSuccess(payload);
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
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              backgroundColor: 'rgba(15, 23, 42, 0.9)',
              padding: '4px 8px',
              borderRadius: '6px',
              border: '1px solid #334155',
              fontSize: '11px',
            }}
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
            <span style={{ color: modelStatus === 'ready' ? '#34d399' : '#cbd5e1', fontWeight: 'bold' }}>
              {modelStatus === 'ready' ? 'AI Siap' : 'Loading'}
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
                    setSelectedCameraId(e.target.value);
                    if (cameraActive) setTimeout(() => startCamera(), 150);
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

          {/* VIEWPORT VIDEO & OVERLAY CANVAS (100% BERSIH - TIDAK ADA NOTIFIKASI DI DALAM KOTAK INI) */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '4 / 3',
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
                objectFit: 'cover',
                transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
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
                objectFit: 'cover',
                pointerEvents: 'none',
              }}
            />

            {/* Placeholder jika kamera belum aktif */}
            {!cameraActive && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '20px',
                  color: '#64748b',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  zIndex: 10,
                }}
              >
                <div style={{ fontSize: '42px', opacity: 0.6 }}>📷</div>
                <div style={{ fontWeight: '700', fontSize: '14px', color: '#cbd5e1' }}>
                  Kamera Belum Aktif
                </div>
                <p style={{ margin: 0, fontSize: '11px', color: '#64748b', maxWidth: '280px' }}>
                  Klik tombol <b>"Mulai Kamera"</b> di atas untuk memindai kehadiran siswa, guru, dan pegawai.
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
