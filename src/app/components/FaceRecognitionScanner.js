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
} from '../utils/faceRecognition';

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
  const [currentToast, setCurrentToast] = useState(null); // { name, role, meta, time, status }
  const [isFullscreen, setIsFullscreen] = useState(false);

  // --- GABUNGKAN SELURUH SISWA, GURU & PEGAWAI ---
  const allPeople = useMemo(() => {
    const list = [];

    // 1. Siswa
    (siswaList || []).forEach((s) => {
      const id = String(s.id_siswa || s.id || s.nisn);
      const nama = s.nama_siswa || s.nama || 'Siswa';
      const desc = s.face_descriptor || s.biodata?.face_descriptor;
      list.push({
        id,
        nisn: s.nisn || s.nis || '-',
        nama,
        kelas: s.kelas || '-',
        jurusan: s.jurusan || '-',
        role: 'Siswa',
        foto_url: s.foto_url || s.foto || '',
        face_descriptor: desc,
        rawObj: s,
      });
    });

    // 2. Guru & Pegawai
    (guruList || []).forEach((g) => {
      const id = String(g.id_guru || g.id || g.username || g.nama_guru);
      const nama = g.nama_guru || g.nama || 'Guru / Pegawai';
      const role = g.role === 'Pegawai' || g.role === 'Staf' ? 'Pegawai' : 'Guru';
      const desc = g.face_descriptor || g.biodata?.face_descriptor;
      list.push({
        id,
        nisn: g.nip || g.inisial || '-',
        nama,
        kelas: g.mapel || g.jabatan || (role === 'Pegawai' ? 'Staff TU' : 'Guru Mapel'),
        jurusan: '-',
        role,
        foto_url: g.foto_url || '',
        face_descriptor: desc,
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
        // Tandai orang yang sudah absen agar tidak ganda
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
        // Bangun FaceMatcher dari seluruh orang yang memiliki face_descriptor
        const matcher = buildFaceMatcher(allPeople, 0.52);
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

  // Bersihkan saat unmount atau modal ditutup
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
    }
  }, [isOpen]);

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
          const box = det.detection.box;
          let label = 'Wajah Terdeteksi';
          let matchedPerson = null;
          let confidencePercent = Math.round(det.detection.score * 100);

          if (matcher && det.descriptor) {
            const bestMatch = matcher.findBestMatch(det.descriptor);
            if (bestMatch && bestMatch.label !== 'unknown') {
              const matchedId = bestMatch.label;
              matchedPerson = allPeople.find(
                (p) => String(p.id) === String(matchedId) || String(p.rawObj?.id_siswa) === String(matchedId) || String(p.rawObj?.id_guru) === String(matchedId)
              );

              if (matchedPerson) {
                const distance = bestMatch.distance;
                confidencePercent = Math.max(50, Math.min(99, Math.round((1 - distance / 0.6) * 100)));
                label = `${matchedPerson.nama} [${matchedPerson.role}]`;
                handleRecognizedAttendance(matchedPerson, confidencePercent);
              }
            } else {
              label = 'Belum Terdaftar';
            }
          }

          drawFaceDetectionBox(ctx, box, label, confidencePercent, Boolean(matchedPerson));
        }
      } catch (err) {
        console.warn('Detection loop error:', err);
      } finally {
        isDetectingRef.current = false;
      }
    }, 360);
  };

  // --- CATAT PRESENSI OTOMATIS & ANTI-SPAM ---
  const handleRecognizedAttendance = async (person, confidence) => {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Jakarta' });
    const personKey = String(person.nama || '').trim().toLowerCase();

    // 1. Debounce spamming (minimal jeda 12 detik antar sambutan)
    const lastSpoken = lastSpokenMapRef.current.get(personKey) || 0;
    if (Date.now() - lastSpoken < 12000) {
      return;
    }

    lastSpokenMapRef.current.set(personKey, Date.now());

    // 2. Cek apakah orang ini sudah tercatat hadir hari ini di state lokal
    const alreadyAttended = todayAttendances.some(
      (a) => String(a.nama || '').trim().toLowerCase() === personKey && a.tanggal === today
    );

    if (alreadyAttended) {
      triggerToastNotification(person, timeStr, 'Sudah Hadir Hari Ini', true);
      return;
    }

    // 3. Mainkan Chime Audio Harmonis & Sambutan Suara AI
    playSuccessChime();
    speakAttendanceGreeting(person.nama, person.role);

    // 4. Munculkan Toast Pop-up Visual Hijau
    triggerToastNotification(person, timeStr, 'Presensi Berhasil');

    // 5. Susun Payload untuk Supabase
    const isGuruOrStaff = person.role === 'Guru' || person.role === 'Pegawai';
    const payload = {
      nama: person.nama,
      role: person.role,
      kelas: person.kelas || '-',
      jurusan: person.jurusan || '-',
      id_siswa: !isGuruOrStaff ? (person.rawObj?.id_siswa || null) : null,
      id_guru: isGuruOrStaff ? (person.rawObj?.id_guru || null) : null,
      tanggal: today,
      jam_masuk: timeStr,
      status: 'Hadir',
      metode: 'Wajah AI',
      device_info: navigator.userAgent.slice(0, 100),
    };

    // Update state tampilan langsung seketika (Optimistic UI)
    const optimisticRow = { id: 'temp-' + Date.now(), ...payload };
    setTodayAttendances((prev) => [optimisticRow, ...prev]);
    recentAttendedSetRef.current.add(personKey);

    // 6. Simpan ke database Supabase Cloud
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

  // Munculkan Toast Banner Sukses
  const triggerToastNotification = (person, time, status, isRepeat = false) => {
    setCurrentToast({
      name: person.nama,
      role: person.role,
      meta: person.role === 'Siswa' ? `NISN: ${person.nisn} · Kelas: ${person.kelas}` : `${person.role} · ${person.kelas}`,
      time: time,
      status: status,
      isRepeat: isRepeat,
    });

    setTimeout(() => {
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
        const pKey = String(p.nama || '').trim().toLowerCase();
        const att = todayAttendances.find(
          (a) => String(a.nama || '').trim().toLowerCase() === pKey && a.tanggal === today
        );
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
        inset: 0,
        zIndex: 99999,
        backgroundColor: 'rgba(2, 6, 23, 0.95)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: '"Plus Jakarta Sans", -apple-system, sans-serif',
        color: '#f8fafc',
        overflow: 'hidden',
      }}
    >
      {/* 1. TOP BAR HEADER */}
      <header
        style={{
          height: '64px',
          borderBottom: '1px solid #1e293b',
          backgroundColor: '#0f172a',
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10b981',
              fontSize: '18px',
            }}
          >
            📸
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: '800', fontSize: '15px', color: '#ffffff' }}>
                Presensi Wajah AI Realtime
              </span>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: '700',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(16, 185, 129, 0.2)',
                  color: '#34d399',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                }}
              >
                Siswa • Guru • Pegawai
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>
              {appConfig.school_name || 'SMK YPK MEDAN'} • Terminal Presensi Pos Piket &amp; Kelas
            </p>
          </div>
        </div>

        {/* Status Indicators & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* AI Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: modelStatus === 'ready' ? '#10b981' : modelStatus === 'error' ? '#f43f5e' : '#f59e0b',
                boxShadow: modelStatus === 'ready' ? '0 0 8px #10b981' : 'none',
              }}
            />
            <span style={{ color: modelStatus === 'ready' ? '#34d399' : '#cbd5e1' }}>
              {statusMessage}
            </span>
          </div>

          {/* Fullscreen & Close Button */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              color: '#cbd5e1',
              borderRadius: '8px',
              padding: '6px 10px',
              fontSize: '12px',
              cursor: 'pointer',
            }}
            title="Layar Penuh"
          >
            {isFullscreen ? '⤢ Normal' : '⤢ Fullscreen'}
          </button>

          <button
            onClick={onClose}
            style={{
              background: '#dc2626',
              border: 'none',
              color: '#ffffff',
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            ✕ Tutup
          </button>
        </div>
      </header>

      {/* 2. MAIN VIEWPORT (SPLIT SCREEN SESUAI YOUTUBE / RESPONSIVE HP) */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '16px',
          padding: '16px',
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                    maxWidth: '140px',
                  }}
                >
                  {cameraDevices.map((d, i) => (
                    <option key={d.deviceId || i} value={d.deviceId}>
                      {d.label || `Kamera ${i + 1}`}
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
                }}
                title="Ganti Kamera Depan / Belakang"
              >
                🔄 Kamera HP
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

          {/* VIEWPORT VIDEO & OVERLAY CANVAS */}
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

            {/* Overlay Canvas untuk Kotak Bounding Box & Label */}
            <canvas
              ref={canvasRef}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                pointerEvents: 'none',
                transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
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

            {/* TOAST POP-UP SUKSES PRESENSI (PERSIS SEPERTI DI VIDEO YOUTUBE) */}
            {currentToast && (
              <div
                style={{
                  position: 'absolute',
                  top: '12px',
                  left: '12px',
                  right: '12px',
                  backgroundColor: currentToast.isRepeat ? 'rgba(30, 41, 59, 0.95)' : 'rgba(5, 150, 105, 0.95)',
                  border: currentToast.isRepeat ? '1px solid #475569' : '1px solid #34d399',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  color: '#ffffff',
                  boxShadow: '0 12px 28px rgba(0,0,0,0.45)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backdropFilter: 'blur(10px)',
                  zIndex: 30,
                  animation: 'slideDown 0.3s ease-out',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px',
                      fontWeight: 'bold',
                    }}
                  >
                    {currentToast.isRepeat ? 'ℹ️' : '✓'}
                  </div>
                  <div>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: '0.8px',
                        color: currentToast.isRepeat ? '#cbd5e1' : '#a7f3d0',
                        display: 'block',
                      }}
                    >
                      {currentToast.status}
                    </span>
                    <div style={{ fontWeight: '800', fontSize: '15px', color: '#ffffff' }}>
                      {currentToast.name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#e2e8f0', opacity: 0.9 }}>
                      {currentToast.meta}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: '13px', color: '#a7f3d0' }}>
                  {currentToast.time} WIB
                </div>
              </div>
            )}
          </div>

          {/* Footnote Petunjuk Posisi */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#64748b' }}>
            <span>💡 Posisikan wajah lurus menghadap kamera dengan pencahayaan memadai</span>
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
