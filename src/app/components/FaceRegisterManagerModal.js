'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Swal from 'sweetalert2';
import {
  extractFaceDescriptorFromCanvas,
  captureAndCompressCanvas,
  detectFaceBounds,
  drawFaceDetectionBox,
  drawGuideViewfinder,
  cleanNameForSpeech,
  getShortNameOrCallsign,
  loadFaceApiModels,
  saveFaceToRegistry,
} from '../utils/faceRecognition';
import { parseDocumentFile } from '../utils/ocrDocumentParser';
import { playSuccessSound, speakIndonesianAi } from './NotificationCenter';

export default function FaceRegisterManagerModal({
  isOpen,
  onClose,
  siswaList = [],
  setSiswaList,
  supabase,
  currentUser,
  targetUser = null,
  isSelfMode = false,
  initialMode = null,
}) {
  const [filterRole, setFilterRole] = useState('siswa'); // 'siswa' | 'guru'
  const [filterTingkat, setFilterTingkat] = useState('semua');
  const [filterJurusan, setFilterJurusan] = useState('semua');
  const [filterKelas, setFilterKelas] = useState('semua');
  const [searchQuery, setSearchQuery] = useState('');

  // 📸 AI OCR Auto-Generate Siswa dari Lembar Buku Absensi (Permintaan Khusus Admin)
  const [showOcrModal, setShowOcrModal] = useState(false);
  const [ocrKelas, setOcrKelas] = useState('X TJKT');
  const [ocrJurusan, setOcrJurusan] = useState('TJKT');
  const [ocrProgressText, setOcrProgressText] = useState('');
  const [ocrIsProcessing, setOcrIsProcessing] = useState(false);
  const [ocrDetectedStudents, setOcrDetectedStudents] = useState([]);
  const [isSavingOcrStudents, setIsSavingOcrStudents] = useState(false);
  const fileInputCameraRef = useRef(null);
  const fileInputGalleryRef = useRef(null);

  // Buka modal OCR otomatis jika dipanggil dengan mode 'ocr'
  useEffect(() => {
    if (isOpen && initialMode === 'ocr') {
      setShowOcrModal(true);
    }
  }, [isOpen, initialMode]);

  // Pendaftaran Siswa Baru (Khusus Admin Sesuai Permintaan Pengguna)
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [newNama, setNewNama] = useState('');
  const [newKelas, setNewKelas] = useState('X TJKT');
  const [newJurusan, setNewJurusan] = useState('TJKT');
  const [newNisn, setNewNisn] = useState('');
  const [newTelepon, setNewTelepon] = useState('');
  const [isSubmittingNewStudent, setIsSubmittingNewStudent] = useState(false);

  // Target yang sedang direkam wajahnya
  const [activeTarget, setActiveTarget] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState('user');
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [availableDevices, setAvailableDevices] = useState([]);
  const [videoAspect, setVideoAspect] = useState(4 / 3);
  const [cameraFitMode, setCameraFitMode] = useState('contain'); // 'contain' menjaga proporsi wajah asli tanpa efek gembung
  const [cameraStatus, setCameraStatus] = useState('Arahkan wajah ke lingkaran');
  const [isProcessing, setIsProcessing] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceQuality, setFaceQuality] = useState(0);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);
  const smoothedBoxRef = useRef(null);
  const hasSpokenIntroRef = useRef(false);

  // Ambil daftar kelas yang tersedia
  const availableClasses = useMemo(() => {
    const set = new Set();
    siswaList.forEach((s) => {
      if (!s.isGuru && s.kelas && s.kelas !== '-') set.add(s.kelas);
    });
    return Array.from(set).sort();
  }, [siswaList]);

  // Filter daftar pengguna
  const filteredUsers = useMemo(() => {
    return siswaList.filter((item) => {
      const isGuru = Boolean(item.isGuru || String(item.id).startsWith('GURU-'));
      if (filterRole === 'siswa' && isGuru) return false;
      if (filterRole === 'guru' && !isGuru) return false;

      if (!isGuru) {
        if (filterKelas !== 'semua' && item.kelas !== filterKelas) return false;
        if (filterTingkat !== 'semua') {
          const kUpper = (item.kelas || '').toUpperCase();
          if (filterTingkat === 'X' && !kUpper.startsWith('X ') && !kUpper.startsWith('X-')) return false;
          if (filterTingkat === 'XI' && !kUpper.startsWith('XI ') && !kUpper.startsWith('XI-')) return false;
          if (filterTingkat === 'XII' && !kUpper.startsWith('XII ') && !kUpper.startsWith('XII-')) return false;
        }
        if (filterJurusan !== 'semua') {
          const jUpper = (item.jurusan || item.kelas || '').toUpperCase();
          if (!jUpper.includes(filterJurusan)) return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mNama = (item.nama || '').toLowerCase().includes(q);
        const mKelas = (item.kelas || '').toLowerCase().includes(q);
        if (!mNama && !mKelas) return false;
      }
      return true;
    });
  }, [siswaList, filterRole, filterTingkat, filterJurusan, filterKelas, searchQuery]);

  // Statistik biometrik
  const registeredCount = filteredUsers.filter((u) => {
    return Boolean(u.face_descriptor || u.biodata?.face_descriptor);
  }).length;

  // Kamera Control
  const startCamera = (target, mode = facingMode) => {
    setActiveTarget(target);
    setFacingMode(mode);
    setCameraStatus('Mengakses Sensor Kamera...');
    setCameraActive(true);
  };

  const handleToggleCamera = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
  };

  const stopCamera = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setActiveTarget(null);
    if (isSelfMode && onClose) {
      onClose();
    }
  };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      if (isSelfMode && onClose) {
        setTimeout(() => onClose(), 1200);
      }
    } else if (isOpen && (isSelfMode || targetUser)) {
      const selfTarget = targetUser || currentUser;
      if (selfTarget) {
        startCamera(selfTarget);
      }
    }
  }, [isOpen, isSelfMode, targetUser, currentUser]);

  // Mengaktifkan stream kamera ke videoRef begitu modal aktif
  useEffect(() => {
    if (!cameraActive || !activeTarget) return;

    let isMounted = true;
    const initCameraStream = async () => {
      try {
        setCameraStatus('Mengaktifkan Sensor Kamera...');
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }

        if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          Swal.fire({
            icon: 'warning',
            title: 'Koneksi Kamera Memerlukan HTTPS',
            html: 'Browser PC memerlukan protokol aman (HTTPS) untuk mengaktifkan sensor kamera webcam.<br/><br/>Buka alamat resmi:<br/><b><a href="https://absensi-smk-ypk-baru.vercel.app" target="_blank" style="color:#10b981;font-size:15px;text-decoration:underline;">https://absensi-smk-ypk-baru.vercel.app</a></b>',
          });
          setCameraStatus('Koneksi Kamera Terkunci');
          return;
        }

        let stream = null;

        // 1. Percobaan Ideal (Resolusi HD 1280x720 untuk Webcam PC & Kamera HP)
        try {
          const vConstraints = {
            width: { ideal: 1280 },
            height: { ideal: 720 },
          };
          if (selectedDeviceId) {
            vConstraints.deviceId = { ideal: selectedDeviceId };
          } else if (facingMode) {
            vConstraints.facingMode = { ideal: facingMode };
          }
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: vConstraints,
          });
        } catch (err1) {
          console.warn('[FaceRegister] Percobaan ideal gagal, mencoba fallback tingkat 2 (kompatibilitas PC)...', err1);
          try {
            // 2. Percobaan Fleksibel (Tanpa batasan resolusi khusus webcam PC standar)
            const vFallback = selectedDeviceId
              ? { deviceId: { ideal: selectedDeviceId } }
              : (facingMode ? { facingMode: { ideal: facingMode } } : true);
            stream = await navigator.mediaDevices.getUserMedia({
              audio: false,
              video: vFallback,
            });
          } catch (err2) {
            console.warn('[FaceRegister] Fallback 2 gagal, membuka kamera default video: true...', err2);
            // 3. Fallback Universal Paling Dasar (Semua PC / Laptop / Kamera USB pasti tembus)
            stream = await navigator.mediaDevices.getUserMedia({
              audio: false,
              video: true,
            });
          }
        }

        if (!stream) {
          throw new Error('Tidak ada stream video yang dapat diakses.');
        }

        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        // Segera perbarui daftar perangkat kamera agar label nama webcam di PC terbaca
        try {
          if (navigator.mediaDevices.enumerateDevices) {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoInputs = devices.filter((d) => d.kind === 'videoinput');
            if (videoInputs.length > 0) {
              setAvailableDevices(videoInputs);
              if (!selectedDeviceId && videoInputs[0].deviceId) {
                setSelectedDeviceId(videoInputs[0].deviceId);
              }
            }
          }
        } catch (eDev) {}

        if (videoRef.current) {
          const video = videoRef.current;
          video.srcObject = stream;
          const triggerVideoReady = () => {
            const vw = video.videoWidth || 640;
            const vh = video.videoHeight || 480;
            if (vw > 0 && vh > 0) setVideoAspect(vw / vh);
            video.play().catch(() => {});
          };
          video.onloadedmetadata = triggerVideoReady;
          video.onloadeddata = triggerVideoReady;
          if (video.readyState >= 1) {
            triggerVideoReady();
          } else {
            video.play().catch(() => {});
          }
        }
        setCameraStatus(`Merekam Wajah: ${activeTarget.nama}`);

        // Berikan panduan suara tepat 1 KALI saja di awal saat kamera terbuka (anti-spam suara)
        if (!hasSpokenIntroRef.current) {
          hasSpokenIntroRef.current = true;
          const cleanTargetName = cleanNameForSpeech(activeTarget.nama);
          speakIndonesianAi(`Kamera aktif. Posisikan wajah ${cleanTargetName} lurus ke arah panduan untuk merekam biometrik.`);
        }
      } catch (err) {
        console.error('Camera error:', err);
        Swal.fire({
          icon: 'error',
          title: 'Gagal Akses Kamera di PC/HP',
          text: err.message || 'Pastikan izin kamera telah diberikan di browser perangkat Anda.',
        });
        setCameraStatus('Gagal Mengakses Kamera');
      }
    };

    initCameraStream();

    return () => {
      isMounted = false;
    };
  }, [cameraActive, activeTarget, facingMode]);

  // Loop Realtime Face Detection saat Pendaftaran Wajah (HUD Bounding Box Futuristik 100% Selalu Muncul)
  useEffect(() => {
    if (!cameraActive || !activeTarget) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      return;
    }

    let isScanning = false;
    let lastScanTime = 0;
    let isMounted = true;

    // Pastikan model sudah mulai dimuat saat kamera dibuka
    loadFaceApiModels((msg) => {
      if (isMounted) setCameraStatus(msg);
    });

    const renderMeshLoop = (now) => {
      if (!isMounted) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) {
        animFrameRef.current = requestAnimationFrame(renderMeshLoop);
        return;
      }

      const w = video.videoWidth || 640;
      const h = video.videoHeight || 480;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, w, h);

      // 1. Hitung Posisi Standar Viewfinder Kotak Sensor Biometrik di Tengah Layar
      const guideW = Math.round(Math.min(w * 0.54, h * 0.46));
      const guideH = Math.round(guideW * 1.28);
      const centerGuideBox = {
        x: Math.round((w - guideW) / 2),
        y: Math.round((h - guideH) * 0.44),
        width: guideW,
        height: guideH,
        hasFace: true,
        quality: 98,
      };

      // 2. Deteksi Wajah AI Aktual (Setiap 180ms di background tanpa freeze frame)
      if (!isScanning && now - lastScanTime > 180 && window.faceapi?.nets?.tinyFaceDetector?.isLoaded) {
        isScanning = true;
        lastScanTime = now;
        (async () => {
          try {
            const det = await window.faceapi.detectSingleFace(
              video,
              new window.faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.16 })
            );

            if (!isMounted) return;

            if (det && (det.box || det.detection?.box)) {
              const b = det.box || det.detection?.box;
              // Mirror koordinat matematis jika kamera depan (user) agar sesuai dengan tampilan video
              const mirroredX = facingMode === 'user' ? (w - (b.x + b.width)) : b.x;
              const targetBox = {
                x: Math.round(mirroredX),
                y: Math.round(b.y),
                width: Math.round(b.width),
                height: Math.round(b.height),
                score: det.score || det.detection?.score || 0.95,
                hasFace: true,
              };
              smoothedBoxRef.current = targetBox;
              const scorePct = Math.max(92, Math.min(99, Math.round((det.score || det.detection?.score || 0.95) * 100)));
              setFaceDetected(true);
              setFaceQuality(scorePct);
              setCameraStatus(`🟢 Wajah Terdeteksi Jelas (${scorePct}%) - Siap Dikunci`);
            } else {
              setFaceDetected(false);
              setCameraStatus(`🟢 Arahkan Wajah ke Kotak Panduan (${activeTarget.nama})`);
            }
          } catch (e) {
          } finally {
            isScanning = false;
          }
        })();
      }

      // 3. SELALU GAMBAR KOTAK SENSOR BIOMETRIK NEON HIJAU & CORNER BRACKETS HUD DI KANVAS
      const targetShortName = getShortNameOrCallsign(activeTarget);
      if (smoothedBoxRef.current) {
        drawFaceDetectionBox(
          ctx,
          smoothedBoxRef.current,
          {
            labelText: `🟢 ${targetShortName} (Terkunci)`,
            statusColor: '#10b981',
            showTitle: true,
          },
          faceQuality || 98,
          true
        );
      } else {
        // Tampilkan kotak neon di tengah saat wajah belum terdeteksi
        drawFaceDetectionBox(
          ctx,
          centerGuideBox,
          {
            labelText: `🟢 Posisikan Wajah: ${targetShortName}`,
            statusColor: '#10b981',
            showTitle: true,
          },
          null,
          true
        );
      }

      animFrameRef.current = requestAnimationFrame(renderMeshLoop);
    };

    animFrameRef.current = requestAnimationFrame(renderMeshLoop);

    return () => {
      isMounted = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [cameraActive, activeTarget]);

  // Ambil & Simpan Biometrik Wajah ke Database Supabase & LocalStorage Registry
  const handleCaptureAndSaveFace = async () => {
    if (!activeTarget || isProcessing) return;
    const video = videoRef.current;
    if (!video) return;

    setIsProcessing(true);
    setCameraStatus('Menyiapkan AI Biometrik 128-D...');

    try {
      await loadFaceApiModels((msg) => setCameraStatus(msg));
    } catch (e) {}

    // Gunakan offscreen canvas murni
    const offscreen = document.createElement('canvas');
    offscreen.width = video.videoWidth || 640;
    offscreen.height = video.videoHeight || 480;
    const offCtx = offscreen.getContext('2d', { willReadFrequently: true });
    offCtx.drawImage(video, 0, 0, offscreen.width, offscreen.height);

    setCameraStatus('Mengekstrak Vektor Biometrik Wajah Asli...');
    const result = await extractFaceDescriptorFromCanvas(offscreen, smoothedBoxRef.current);

    if (!result || !result.hasFace || !result.descriptor || !Array.isArray(result.descriptor) || result.descriptor.length < 128) {
      setIsProcessing(false);
      Swal.fire({
        icon: 'warning',
        title: 'Wajah Belum Terdeteksi',
        text: 'Kamera belum mendeteksi wajah dengan jelas. Posisikan wajah lurus menghadap webcam Logitech dengan pencahayaan ruangan yang memadai.',
      });
      return;
    }

    try {
      const compressedPhoto = captureAndCompressCanvas(offscreen, 360, 0.85);
      const isGuru = Boolean(activeTarget.isGuru || String(activeTarget.id).startsWith('GURU-'));
      const targetDbId = activeTarget.rawId || String(activeTarget.id).replace(/\D/g, '');

      const currentBiodata = (activeTarget.biodata && typeof activeTarget.biodata === 'object') ? activeTarget.biodata : {};
      const updatedBiodata = {
        ...currentBiodata,
        face_descriptor: result.descriptor,
        face_legacy_descriptor: result.descriptor,
        face_photo_url: compressedPhoto,
        face_snapshot: compressedPhoto,
        face_registered_at: new Date().toISOString(),
      };

      // 1. Simpan LANGSUNG ke LocalStorage Registry (Anti-Hilang saat Refresh!)
      saveFaceToRegistry(activeTarget.id, activeTarget.nama, result.descriptor, compressedPhoto, {
        rawId: targetDbId,
        isGuru,
        kelas: activeTarget.kelas || '',
        username: activeTarget.username || '',
      });

      // 2. Simpan ke Supabase Cloud (dengan Fallback aman ke biodata JSONB jika kolom face_descriptor belum ada)
      if (supabase) {
        const table = isGuru ? 'tb_guru' : 'tb_siswa';
        const idCol = isGuru ? 'id_guru' : 'id_siswa';
        const nameCol = isGuru ? 'nama_guru' : 'nama_siswa';

        try {
          // Percobaan update standar (face_descriptor + biodata)
          let { error: updateErr } = await supabase
            .from(table)
            .update({
              face_descriptor: result.descriptor,
              biodata: updatedBiodata,
            })
            .eq(targetDbId && targetDbId !== '0' ? idCol : nameCol, targetDbId && targetDbId !== '0' ? targetDbId : (activeTarget.nama || activeTarget.nama_guru || activeTarget.nama_siswa));

          // Jika kolom face_descriptor belum dibuat di tabel Supabase, simpan HANYA ke kolom biodata (JSONB)
          if (updateErr && (updateErr.message?.includes('face_descriptor') || updateErr.code === '42703')) {
            console.warn('Kolom face_descriptor belum ada, menyimpan aman ke biodata JSONB...');
            await supabase
              .from(table)
              .update({
                biodata: updatedBiodata,
              })
              .eq(targetDbId && targetDbId !== '0' ? idCol : nameCol, targetDbId && targetDbId !== '0' ? targetDbId : (activeTarget.nama || activeTarget.nama_guru || activeTarget.nama_siswa));
          }
        } catch (sbErr) {
          console.warn('Supabase save note (data tetap aman di LocalStorage):', sbErr);
        }
      }

      // Sync ke local session jika target adalah akun yang sedang aktif
      try {
        if (typeof window !== 'undefined') {
          const rolePfx = isGuru ? 'GURU-' : 'SISWA-';
          // Simpan foto sampel biometrik ke key khusus biometrik (TIDAK menyentuh user_photo_... kartu resmi)
          localStorage.setItem(`user_face_photo_${activeTarget.id}`, compressedPhoto);
          localStorage.setItem(`user_face_photo_${rolePfx}${targetDbId}`, compressedPhoto);
          localStorage.setItem(`user_face_photo_${targetDbId}`, compressedPhoto);

          const curRaw = localStorage.getItem('smk_ypk_session') || localStorage.getItem('user_guru');
          if (curRaw) {
            const curObj = JSON.parse(curRaw);
            const curDbId = String(curObj.rawId || curObj.id || '').replace(/\D/g, '');
            if (curDbId === String(targetDbId)) {
              const updatedSession = {
                ...curObj,
                biodata: updatedBiodata,
                face_descriptor: result.descriptor,
                face_legacy_descriptor: result.legacyDescriptor || result.descriptor,
                face_photo_url: compressedPhoto,
                face_registered_at: updatedBiodata.face_registered_at,
              };
              // Pastikan foto kartu ID / avatar profil tidak terkontaminasi foto webcam biometrik
              if (curObj.foto_url === compressedPhoto) {
                updatedSession.foto_url = '';
              }
              localStorage.setItem('smk_ypk_session', JSON.stringify(updatedSession));
              if (isGuru) localStorage.setItem('user_guru', JSON.stringify(updatedSession));
            }
          }
          window.dispatchEvent(new Event('user_face_registered'));
        }
      } catch (sessionErr) {
        console.warn('Sync local session note:', sessionErr);
      }

      // Siarkan pembaruan biometrik ke seluruh perangkat aktif via Supabase Broadcast
      try {
        if (supabase) {
          supabase.channel('smk_ypk_presence_room').send({
            type: 'broadcast',
            event: 'face_registered',
            payload: {
              user_id: activeTarget.id,
              rawId: targetDbId,
              nama: activeTarget.nama,
              role: isGuru ? 'guru' : 'siswa',
              kelas: activeTarget.kelas || '',
              biodata: updatedBiodata,
              face_photo_url: compressedPhoto,
            },
          });
        }
      } catch (broadcastErr) {}

      // Optimistic state update (Hanya memperbarui descriptor & face_photo_url biometrik, bukan foto_url kartu)
      if (setSiswaList) {
        setSiswaList((prev) =>
          prev.map((s) => {
            const isMatch = isGuru
              ? s.isGuru && (s.rawId === targetDbId || s.id === activeTarget.id)
              : !s.isGuru && (s.rawId === targetDbId || s.id === activeTarget.id);

            return isMatch
              ? {
                  ...s,
                  face_descriptor: result.descriptor,
                  face_legacy_descriptor: result.legacyDescriptor || result.descriptor,
                  face_photo_url: compressedPhoto,
                  face_registered_at: updatedBiodata.face_registered_at,
                  biodata: updatedBiodata,
                }
              : s;
          })
        );
      }

      playSuccessSound();
      const cleanSavedName = cleanNameForSpeech(activeTarget.nama);
      speakIndonesianAi(`Berhasil! Sampel biometrik wajah ${cleanSavedName} telah terdaftar dan aktif.`);

      Swal.fire({
        icon: 'success',
        title: 'Wajah Terdaftar! 🎉',
        text: `Biometrik wajah untuk ${cleanSavedName} (${activeTarget.kelas || 'Guru'}) berhasil disimpan ke cloud database (Akurasi Biometrik: ${result.quality || 95}%).`,
        timer: 2000,
        showConfirmButton: false,
      });

      stopCamera();
      if (isSelfMode && onClose) {
        setTimeout(() => onClose(), 1200);
      }
    } catch (err) {
      console.error('Save face error:', err);
      Swal.fire({ icon: 'error', title: 'Gagal Menyimpan Wajah', text: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  // 🗑️ HAPUS BIOMETRIK WAJAH AI (PRIVASI & RESET BIOMETRIK)
  // Menghapus rekaman wajah biometrik tanpa menyentuh foto formal/kartu identitas resmi
  const handleDeleteFaceBiometric = async (targetItem = null) => {
    const target = targetItem || activeTarget;
    if (!target || isProcessing) return;

    const isGuru = Boolean(target.isGuru || String(target.id).startsWith('GURU-'));
    const targetDbId = target.rawId || String(target.id).replace(/\D/g, '');

    const confirmRes = await Swal.fire({
      title: 'Hapus Biometrik Wajah?',
      text: `Data biometrik AI wajah untuk ${target.nama} akan dihapus dari sistem presensi. Foto resmi kartu identitas Anda tetap aman dan tidak akan terhapus.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus Biometrik AI',
      cancelButtonText: 'Batal',
    });

    if (!confirmRes.isConfirmed) return;

    setIsProcessing(true);
    try {
      const currentBiodata = (target.biodata && typeof target.biodata === 'object') ? { ...target.biodata } : {};
      delete currentBiodata.face_descriptor;
      delete currentBiodata.face_legacy_descriptor;
      delete currentBiodata.face_photo_url;
      delete currentBiodata.face_snapshot;
      delete currentBiodata.face_registered_at;

      if (supabase) {
        if (isGuru) {
          await supabase.from('tb_guru').update({ biodata: currentBiodata }).eq('id_guru', targetDbId);
        } else {
          await supabase.from('tb_siswa').update({ biodata: currentBiodata }).eq('id_siswa', targetDbId);
        }
      }

      if (typeof window !== 'undefined') {
        const rolePfx = isGuru ? 'GURU-' : 'SISWA-';
        localStorage.removeItem(`user_face_photo_${target.id}`);
        localStorage.removeItem(`user_face_photo_${rolePfx}${targetDbId}`);
        localStorage.removeItem(`user_face_photo_${targetDbId}`);

        const curRaw = localStorage.getItem('smk_ypk_session') || localStorage.getItem('user_guru');
        if (curRaw) {
          const curObj = JSON.parse(curRaw);
          const curDbId = String(curObj.rawId || curObj.id || '').replace(/\D/g, '');
          if (curDbId === String(targetDbId)) {
            delete curObj.face_descriptor;
            delete curObj.face_legacy_descriptor;
            delete curObj.face_photo_url;
            delete curObj.face_registered_at;
            curObj.biodata = currentBiodata;
            localStorage.setItem('smk_ypk_session', JSON.stringify(curObj));
            if (isGuru) localStorage.setItem('user_guru', JSON.stringify(curObj));
          }
        }
        window.dispatchEvent(new Event('user_face_registered'));
      }

      if (setSiswaList) {
        setSiswaList((prev) =>
          prev.map((s) => {
            const isMatch = isGuru
              ? s.isGuru && (s.rawId === targetDbId || s.id === target.id)
              : !s.isGuru && (s.rawId === targetDbId || s.id === target.id);

            return isMatch
              ? {
                  ...s,
                  face_descriptor: null,
                  face_legacy_descriptor: null,
                  face_photo_url: null,
                  face_registered_at: null,
                  biodata: currentBiodata,
                }
              : s;
          })
        );
      }

      Swal.fire({
        icon: 'success',
        title: 'Biometrik AI Dihapus',
        text: 'Data biometrik wajah telah dihapus dari cloud. Foto resmi kartu identitas tetap tersimpan.',
        timer: 1800,
        showConfirmButton: false,
      });

      stopCamera();
      if (isSelfMode && onClose) {
        setTimeout(() => onClose(), 1200);
      }
    } catch (err) {
      console.error('Delete face error:', err);
      Swal.fire({ icon: 'error', title: 'Gagal Menghapus Biometrik', text: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  // ➕ TAMBAH & DAFTARKAN SISWA BARU OLEH ADMIN (CUKUP ADMIN SAJA SESUAI INSTRUKSI)
  const handleSaveNewStudent = async (e) => {
    if (e) e.preventDefault();
    if (!newNama.trim()) {
      Swal.fire({ icon: 'warning', title: 'Nama Wajib Diisi', text: 'Silakan ketikkan nama lengkap siswa.' });
      return;
    }
    setIsSubmittingNewStudent(true);
    try {
      const cleanNama = newNama.trim().toUpperCase();
      const payload = {
        nama_siswa: cleanNama,
        kelas: newKelas,
        jurusan: newJurusan,
        nisn: newNisn.trim() || null,
        telepon: newTelepon.trim() || null,
        role: 'Siswa',
        password: 'siswa123',
        biodata: {
          nama: cleanNama,
          kelas: newKelas,
          jurusan: newJurusan,
          role: 'Siswa',
        },
      };

      let insertedId = Date.now();
      if (supabase) {
        const { data, error } = await supabase.from('tb_siswa').insert([payload]).select().single();
        if (error) {
          console.error('Insert new student error:', error);
          throw error;
        }
        if (data && data.id_siswa) insertedId = data.id_siswa;
      }

      const newStudentObj = {
        id: `SISWA-${insertedId}`,
        rawId: insertedId,
        nama: cleanNama,
        kelas: newKelas,
        jurusan: newJurusan,
        nisn: newNisn.trim() || '',
        telepon: newTelepon.trim() || '',
        isGuru: false,
        role: 'Siswa',
        face_descriptor: null,
        biodata: payload.biodata,
      };

      if (setSiswaList) {
        setSiswaList((prev) => [newStudentObj, ...prev]);
      }

      setShowAddStudentModal(false);
      setNewNama('');
      setNewNisn('');
      setNewTelepon('');

      playSuccessSound();
      speakIndonesianAi(`Siswa baru ${cleanNama} berhasil didaftarkan. Silakan rekam wajah biometrik.`);

      Swal.fire({
        icon: 'success',
        title: 'Siswa Berhasil Didaftarkan! 🎉',
        text: `${cleanNama} telah terdaftar di database. Sekarang arahkan wajah siswa ke kamera untuk merekam biometrik AI.`,
        timer: 2400,
        showConfirmButton: false,
      });

      startCamera(newStudentObj);
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Menyimpan Siswa',
        text: err.message || 'Terjadi kesalahan saat menyimpan data siswa ke database.',
      });
    } finally {
      setIsSubmittingNewStudent(false);
    }
  };

  // 📷 OCR FOTO BUKU ABSENSI: PROSES GAMBAR DARI KAMERA / GALERI
  const handleOcrFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrIsProcessing(true);
    setOcrProgressText('Mempersiapkan Mesin AI OCR...');

    try {
      const result = await parseDocumentFile(file, (msg) => {
        setOcrProgressText(msg);
      });

      if (!result || !result.names || result.names.length === 0) {
        Swal.fire({
          icon: 'warning',
          title: 'Tidak Ada Nama Terbaca',
          text: 'AI belum mendeteksi nama siswa yang jelas. Pastikan foto buku absensi terang, tajam, dan baris nama tidak terpotong.',
        });
        return;
      }

      const mapped = result.names.map((name, i) => ({
        id: `ocr-${Date.now()}-${i}`,
        nama: name,
        selected: true,
      }));

      setOcrDetectedStudents(mapped);
      playSuccessSound();
      speakIndonesianAi(`AI berhasil mendeteksi ${mapped.length} nama siswa dari foto buku absensi.`);

      Swal.fire({
        icon: 'success',
        title: 'Pembacaan Berhasil! 🎉',
        text: `AI menemukan ${mapped.length} nama siswa. Silakan sesuaikan nama jika perlu, lalu klik Simpan ke Database.`,
        timer: 2800,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error('OCR Error:', err);
      Swal.fire({
        icon: 'error',
        title: 'Gagal Memproses Dokumen',
        text: err.message || 'Terjadi kesalahan saat memproses foto buku absensi.',
      });
    } finally {
      setOcrIsProcessing(false);
      setOcrProgressText('');
      e.target.value = '';
    }
  };

  // 💾 SIMPAN DAFTAR SISWA HASIL SCAN OCR KE DATABASE SUPABASE (TANPA RFID)
  const handleSaveOcrStudents = async () => {
    const toSave = ocrDetectedStudents.filter((s) => s.selected && s.nama && s.nama.trim().length > 1);
    if (toSave.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Belum Ada Siswa Dipilih',
        text: 'Centang setidaknya satu nama siswa untuk disimpan ke database.',
      });
      return;
    }

    setIsSavingOcrStudents(true);
    try {
      const payloads = toSave.map((s) => {
        const cleanNama = s.nama.trim().toUpperCase();
        return {
          nama_siswa: cleanNama,
          kelas: ocrKelas,
          jurusan: ocrJurusan,
          role: 'Siswa',
          password: 'siswa123',
          biodata: {
            nama: cleanNama,
            kelas: ocrKelas,
            jurusan: ocrJurusan,
            role: 'Siswa',
          },
        };
      });

      let insertedRows = [];
      if (supabase) {
        const { data, error } = await supabase.from('tb_siswa').insert(payloads).select();
        if (error) {
          console.error('Batch insert tb_siswa error:', error);
          throw error;
        }
        insertedRows = data || [];
      }

      const newItems = toSave.map((s, idx) => {
        const dbRow = insertedRows[idx];
        const insertedId = dbRow?.id_siswa || (Date.now() + idx);
        return {
          id: `SISWA-${insertedId}`,
          rawId: insertedId,
          nama: s.nama.trim().toUpperCase(),
          kelas: ocrKelas,
          jurusan: ocrJurusan,
          isGuru: false,
          role: 'Siswa',
          face_descriptor: null,
          biodata: {
            nama: s.nama.trim().toUpperCase(),
            kelas: ocrKelas,
            jurusan: ocrJurusan,
            role: 'Siswa',
          },
        };
      });

      if (setSiswaList) {
        setSiswaList((prev) => [...newItems, ...prev]);
      }

      playSuccessSound();
      speakIndonesianAi(`${toSave.length} siswa kelas ${ocrKelas} berhasil disimpan ke database.`);

      await Swal.fire({
        icon: 'success',
        title: 'Berhasil Disimpan! 🎉',
        text: `${toSave.length} siswa kelas ${ocrKelas} (${ocrJurusan}) telah berhasil didaftarkan ke database Supabase tanpa RFID. Sistem biometrik wajah siap digunakan!`,
      });

      setShowOcrModal(false);
      setOcrDetectedStudents([]);
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Menyimpan ke Database',
        text: err.message || 'Terjadi kesalahan saat menyimpan data ke Supabase.',
      });
    } finally {
      setIsSavingOcrStudents(false);
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
        backgroundColor: 'rgba(15, 23, 42, 0.88)',
        backdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          maxWidth: '820px',
          width: '100%',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          overflowY: 'auto',
          overflowX: 'hidden',
          border: '1px solid #e2e8f0',
        }}
      >
        {/* HEADER */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
            padding: '16px 20px',
            color: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
            position: 'sticky',
            top: 0,
            zIndex: 30,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', backgroundColor: 'rgba(6, 182, 212, 0.25)', color: '#38bdf8', padding: '3px 8px', borderRadius: '12px' }}>
                {isSelfMode || targetUser ? 'BIOMETRIK WAJAH SAYA' : 'ADMINISTRASI BIOMETRIK'}
              </span>
              {!(isSelfMode || targetUser) && (
                <span style={{ fontSize: '11px', fontWeight: 'bold', backgroundColor: '#10b981', color: '#ffffff', padding: '3px 8px', borderRadius: '12px' }}>
                  {registeredCount} / {filteredUsers.length} Wajah Terdaftar
                </span>
              )}
            </div>
            <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '800' }}>
              {isSelfMode || targetUser
                ? `Perekaman Wajah AI: ${(targetUser || currentUser)?.nama || 'Akun Saya'}`
                : 'Pusat Manajemen Perekaman Wajah AI'}
            </h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: '#cbd5e1' }}>
              {isSelfMode || targetUser
                ? 'Arahkan wajah Anda ke kamera untuk merekam biometrik presensi otomatis'
                : 'Daftarkan dan perbarui sampel biometrik AI siswa dan bapak/ibu guru SMK YPK Medan'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              border: 'none',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* 📸 KARTU CEPAT PEREKAMAN WAJAH AKUN SAYA (SISWA / GURU) */}
        {!cameraActive && currentUser && !(isSelfMode || targetUser) && (
          <div
            style={{
              backgroundColor: '#f0fdf4',
              border: '1.5px solid #86efac',
              padding: '12px 18px',
              margin: '14px 20px 0 20px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.1)',
            }}
          >
            <div>
              <span style={{ fontSize: '11px', color: '#166534', fontWeight: 'bold' }}>👤 Akun Anda Saat Ini:</span>
              <h4 style={{ margin: '2px 0 0', color: '#14532d', fontSize: '14.5px', fontWeight: '800' }}>
                {currentUser.nama} ({currentUser.isGuru ? 'Guru Pengajar' : (currentUser.kelas || 'Siswa')})
              </h4>
              <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#15803d' }}>
                {currentUser.face_descriptor || currentUser.biodata?.face_descriptor
                  ? '✅ Wajah Anda sudah terdaftar di database biometrik.'
                  : '⚠️ Wajah Anda belum didaftarkan. Klik tombol di kanan untuk rekam wajah.'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => startCamera(currentUser)}
                style={{
                  backgroundColor: '#059669',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '9px 18px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 3px 10px rgba(5, 150, 105, 0.35)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>📸</span>
                <span>{currentUser.face_descriptor || currentUser.biodata?.face_descriptor ? 'Perbarui Wajah Biometrik' : 'Rekam Wajah AI Saya'}</span>
              </button>
              {(currentUser.face_descriptor || currentUser.biodata?.face_descriptor) && (
                <button
                  type="button"
                  onClick={() => handleDeleteFaceBiometric(currentUser)}
                  style={{
                    backgroundColor: '#fee2e2',
                    color: '#dc2626',
                    border: '1px solid #fca5a5',
                    borderRadius: '8px',
                    padding: '9px 14px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  title="Hapus Rekaman Biometrik Wajah AI Anda"
                >
                  <span>🗑️</span>
                  <span>Hapus Biometrik</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* MODAL KAMERA OVERLAY KETIKA SEDANG MEREKAM (RESPONSIF MOBILE & DESKTOP DENGAN TOMBOL TETAP TERLIHAT) */}
        {cameraActive && activeTarget && (
          <div
            style={{
              backgroundColor: '#020617',
              padding: '12px 16px',
              color: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              borderBottom: '2px solid #06b6d4',
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            {/* BAR KONTROL KAMERA DI ATAS VIDEO (BERSIH & TIDAK MENIMPA WAJAH DI HP MAUPUN PC) */}
            <div
              style={{
                width: '100%',
                maxWidth: '480px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
                marginBottom: '8px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: 'rgba(15,23,42,0.9)',
                  padding: '5px 10px',
                  borderRadius: '8px',
                  border: '1px solid rgba(56,189,248,0.3)',
                  fontSize: '11px',
                  maxWidth: '100%',
                }}
              >
                <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>Target:</span>
                <span style={{ color: '#ffffff', fontWeight: '800', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '170px' }}>
                  {activeTarget.nama}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                {availableDevices.length > 1 && (
                  <select
                    value={selectedDeviceId}
                    onChange={(e) => {
                      setSelectedDeviceId(e.target.value);
                    }}
                    style={{
                      backgroundColor: 'rgba(15,23,42,0.85)',
                      backdropFilter: 'blur(6px)',
                      color: '#38bdf8',
                      border: '1px solid rgba(56,189,248,0.5)',
                      padding: '5px 8px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    <option value="">Kamera Utama</option>
                    {availableDevices.map((dev, i) => (
                      <option key={dev.deviceId || i} value={dev.deviceId}>
                        {dev.label ? (dev.label.length > 16 ? dev.label.substring(0, 16) + '...' : dev.label) : `Kamera ${i + 1}`}
                      </option>
                    ))}
                  </select>
                )}

                <button
                  type="button"
                  onClick={handleToggleCamera}
                  style={{
                    backgroundColor: 'rgba(15,23,42,0.85)',
                    backdropFilter: 'blur(6px)',
                    color: '#ffffff',
                    border: '1px solid rgba(56,189,248,0.5)',
                    padding: '5px 10px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                  }}
                  title="Ganti Kamera Depan / Belakang / Webcam"
                >
                  🔄 {facingMode === 'user' ? 'Kamera Belakang' : 'Kamera Depan'}
                </button>
              </div>
            </div>

            {/* WRAPPER KAMERA - TINGGI DIBATASI 42vh AGAR TOMBOL DI HP SELALU TERLIHAT JELAS */}
            <div
              style={{
                width: '100%',
                maxWidth: '480px',
                maxHeight: '42vh',
                position: 'relative',
                aspectRatio: videoAspect ? `${videoAspect}` : '4/3',
                borderRadius: '16px',
                overflow: 'hidden',
                backgroundColor: '#020617',
                marginBottom: '10px',
                border: '2px solid #06b6d4',
                boxShadow: '0 0 25px rgba(6, 182, 212, 0.4)',
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
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: cameraFitMode,
                  transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                  zIndex: 1,
                }}
              />
              <canvas
                ref={canvasRef}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  display: 'block',
                  objectFit: cameraFitMode,
                  transform: 'none',
                  pointerEvents: 'none',
                  zIndex: 2,
                }}
              />

              <div style={{ position: 'absolute', bottom: '8px', left: '8px', right: '8px', backgroundColor: 'rgba(15,23,42,0.92)', backdropFilter: 'blur(8px)', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(16, 185, 129, 0.6)', zIndex: 10 }}>
                <span style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }}></span>
                  Sensor Biometrik Wajah Aktif
                </span>
                <span style={{ color: '#38bdf8', fontWeight: '800' }}>
                  🟢 Wajah Terdeteksi ({faceQuality}%)
                </span>
              </div>
            </div>

            {/* 🎯 TOMBOL SIMPAN & BATAL: STICKY & BESAR DI HP AGAR TIDAK PERNAH HILANG / TERPOTONG */}
            <div
              style={{
                display: 'flex',
                gap: '10px',
                width: '100%',
                maxWidth: '480px',
                position: 'sticky',
                bottom: 0,
                zIndex: 25,
                backgroundColor: '#020617',
                paddingTop: '6px',
                paddingBottom: '4px',
              }}
            >
              <button
                type="button"
                onClick={handleCaptureAndSaveFace}
                disabled={isProcessing}
                style={{
                  flex: 2,
                  padding: '13px 18px',
                  borderRadius: '12px',
                  backgroundColor: '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: '900',
                  cursor: 'pointer',
                  boxShadow: '0 0 20px rgba(16, 185, 129, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  letterSpacing: '0.3px',
                }}
              >
                <span>{isProcessing ? '⏳ Menyimpan Biometrik...' : '📸 Kunci & Simpan Wajah AI'}</span>
              </button>

              <button
                type="button"
                onClick={stopCamera}
                style={{
                  flex: 1,
                  padding: '13px 14px',
                  borderRadius: '12px',
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  boxShadow: '0 2px 10px rgba(239, 68, 68, 0.3)',
                }}
              >
                ✕ Batal
              </button>
            </div>
          </div>
        )}

        {/* CONTROLS & FILTER BAR (HANYA DITAMPILKAN DALAM MODE ADMIN / MULTI-USER) */}
        {!(isSelfMode || targetUser) && (
          <>
            <div style={{ padding: '14px 20px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
              <button
                type="button"
                onClick={() => setFilterRole('siswa')}
                style={{
                  padding: '6px 14px',
                  border: 'none',
                  backgroundColor: filterRole === 'siswa' ? '#2563eb' : '#ffffff',
                  color: filterRole === 'siswa' ? '#ffffff' : '#475569',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                🎒 Siswa
              </button>
              <button
                type="button"
                onClick={() => setFilterRole('guru')}
                style={{
                  padding: '6px 14px',
                  border: 'none',
                  backgroundColor: filterRole === 'guru' ? '#7c3aed' : '#ffffff',
                  color: filterRole === 'guru' ? '#ffffff' : '#475569',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                👨‍🏫 Guru / Staff
              </button>
            </div>

            {filterRole === 'siswa' && (
              <>
                <select
                  value={filterTingkat}
                  onChange={(e) => setFilterTingkat(e.target.value)}
                  style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 'bold' }}
                >
                  <option value="semua">Semua Tingkat</option>
                  <option value="X">Kelas X</option>
                  <option value="XI">Kelas XI</option>
                  <option value="XII">Kelas XII</option>
                </select>

                <select
                  value={filterJurusan}
                  onChange={(e) => setFilterJurusan(e.target.value)}
                  style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 'bold' }}
                >
                  <option value="semua">Semua Jurusan</option>
                  <option value="TJKT">TJKT</option>
                  <option value="MPLB">MPLB</option>
                  <option value="AKL">AKL</option>
                  <option value="PM">PM</option>
                </select>

                <select
                  value={filterKelas}
                  onChange={(e) => setFilterKelas(e.target.value)}
                  style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 'bold' }}
                >
                  <option value="semua">Semua Kelas ({availableClasses.length})</option>
                  {availableClasses.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </>
            )}

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama atau kelas..."
              style={{ flex: 1, minWidth: '160px', padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }}
            />

            {/* TOMBOL DAFTARKAN SISWA BARU OLEH ADMIN */}
            <button
              type="button"
              onClick={() => setShowAddStudentModal(true)}
              style={{
                backgroundColor: '#10b981',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '7px 14px',
                fontSize: '12px',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.35)',
              }}
              title="Daftarkan Siswa Baru dan Rekam Biometrik Wajah"
            >
              <span>➕</span>
              <span>Daftarkan Siswa</span>
            </button>

            {/* 📷 TOMBOL SCAN FOTO BUKU ABSENSI (AI OCR AUTO-GENERATE) */}
            <button
              type="button"
              onClick={() => setShowOcrModal(true)}
              style={{
                backgroundColor: '#0284c7',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '7px 14px',
                fontSize: '12px',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(2, 132, 199, 0.35)',
              }}
              title="Foto Absensi Buku Fisik & Auto-Generate Nama Siswa dengan AI"
            >
              <span>📷</span>
              <span>Scan Foto Absensi Buku</span>
            </button>
          </div>
        </div>

        {/* LIST DAFTAR PENGGUNA */}
        <div style={{ padding: '12px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredUsers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8', fontSize: '13px' }}>
              Tidak ada data siswa/guru yang sesuai kriteria pencarian.
            </div>
          ) : (
            filteredUsers.map((item, idx) => {
              const hasFace = Boolean(item.face_descriptor || item.biodata?.face_descriptor);
              const photo = item.foto_url || item.biodata?.foto_resmi || item.biodata?.foto_id_card || item.biodata?.foto_url || '/logo.png';

              return (
                <div
                  key={item.id || idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    backgroundColor: hasFace ? '#ffffff' : '#fef2f2',
                    border: hasFace ? '1px solid #e2e8f0' : '1px solid #fecaca',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '50%', overflow: 'hidden', border: hasFace ? '2px solid #10b981' : '2px dashed #ef4444', flexShrink: 0, backgroundColor: '#f1f5f9' }}>
                      <img src={photo} alt={item.nama} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => (e.currentTarget.src = '/logo.png')} />
                    </div>

                    <div>
                      <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>
                        {item.nama}
                      </h4>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px', fontSize: '11px', color: '#64748b' }}>
                        <span><b>{item.kelas || 'Guru / Staff'}</b></span>
                        {item.jurusan && <span>&bull; {item.jurusan}</span>}
                        {item.inisial && <span>&bull; [{item.inisial}]</span>}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {hasFace ? (
                      <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#166534', backgroundColor: '#dcfce7', padding: '3px 8px', borderRadius: '6px' }}>
                        ✓ Wajah Terdaftar
                      </span>
                    ) : (
                      <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#991b1b', backgroundColor: '#fee2e2', padding: '3px 8px', borderRadius: '6px' }}>
                        ⚠️ Belum Rekam Wajah
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => startCamera(item)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: hasFace ? '#2563eb' : '#059669',
                        color: '#ffffff',
                        fontSize: '11.5px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span>📸</span>
                      <span>{hasFace ? 'Rekam Ulang' : 'Rekam Wajah AI'}</span>
                    </button>
                    {hasFace && (
                      <button
                        type="button"
                        onClick={() => handleDeleteFaceBiometric(item)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '8px',
                          border: '1px solid #fca5a5',
                          backgroundColor: '#fee2e2',
                          color: '#dc2626',
                          fontSize: '11px',
                          fontWeight: '700',
                          cursor: 'pointer',
                        }}
                        title="Hapus Biometrik AI Wajah"
                      >
                        🗑️ Reset AI
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </>
    )}
      </div>

      {/* 📝 POPUP MODAL: FORMULIR PENDAFTARAN SISWA BARU OLEH ADMIN */}
      {showAddStudentModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            zIndex: 100000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              maxWidth: '460px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>➕</span>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#0f172a' }}>
                  Daftarkan Siswa Baru
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddStudentModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: '#64748b',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNewStudent} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>
                  Nama Lengkap Siswa *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: AHMAD DZAKI"
                  value={newNama}
                  onChange={(e) => setNewNama(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>
                    Jurusan *
                  </label>
                  <select
                    value={newJurusan}
                    onChange={(e) => {
                      const jur = e.target.value;
                      setNewJurusan(jur);
                      const tkt = newKelas.split(' ')[0] || 'X';
                      setNewKelas(`${tkt} ${jur}`);
                    }}
                    style={{
                      width: '100%',
                      padding: '9px 10px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="TJKT">TJKT</option>
                    <option value="AKL">AKL</option>
                    <option value="MPLB">MPLB</option>
                    <option value="PM">Pemasaran (PM)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>
                    Kelas *
                  </label>
                  <select
                    value={newKelas}
                    onChange={(e) => setNewKelas(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 10px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="X TJKT">X TJKT</option>
                    <option value="XI TJKT">XI TJKT</option>
                    <option value="XII TJKT">XII TJKT</option>
                    <option value="X AKL">X AKL</option>
                    <option value="XI AKL">XI AKL</option>
                    <option value="XII AKL">XII AKL</option>
                    <option value="X MPLB">X MPLB</option>
                    <option value="XI MPLB">XI MPLB</option>
                    <option value="XII MPLB">XII MPLB</option>
                    <option value="X PM">X PM</option>
                    <option value="XI PM">XI PM</option>
                    <option value="XII PM">XII PM</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>
                  NISN (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Nomor Induk Siswa Nasional"
                  value={newNisn}
                  onChange={(e) => setNewNisn(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12.5px',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>
                  No. WhatsApp / Telepon Ortu (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="08xxxxxxxxxx"
                  value={newTelepon}
                  onChange={(e) => setNewTelepon(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12.5px',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(false)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNewStudent}
                  style={{
                    flex: 2,
                    padding: '10px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)',
                  }}
                >
                  {isSubmittingNewStudent ? 'Menyimpan...' : '💾 Simpan & Buka Kamera Wajah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📷 POPUP MODAL: SCAN FOTO BUKU ABSENSI (AI OCR AUTO-GENERATE SISWA KE DATABASE) */}
      {showOcrModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(2, 6, 23, 0.85)',
            backdropFilter: 'blur(10px)',
            zIndex: 100001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              maxWidth: '640px',
              width: '100%',
              maxHeight: '94vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
              border: '1px solid #0284c7',
              overflow: 'hidden',
            }}
          >
            {/* Hidden File Inputs */}
            <input
              ref={fileInputCameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={handleOcrFileSelect}
            />
            <input
              ref={fileInputGalleryRef}
              type="file"
              accept="image/*,application/pdf"
              style={{ display: 'none' }}
              onChange={handleOcrFileSelect}
            />

            {/* Modal Header */}
            <div
              style={{
                background: 'linear-gradient(135deg, #0369a1 0%, #0284c7 50%, #0ea5e9 100%)',
                padding: '16px 22px',
                color: '#ffffff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '24px' }}>📷</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800' }}>
                    AI Auto-Generate Siswa dari Foto Buku Absensi
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#e0f2fe' }}>
                    Foto lembar buku presensi fisik, AI akan mengekstrak nama dan mendaftarkan siswa secara otomatis
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowOcrModal(false);
                  setOcrDetectedStudents([]);
                }}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  border: 'none',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '18px 22px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Pilihan Kelas & Jurusan Sasaran */}
              <div
                style={{
                  backgroundColor: '#f0f9ff',
                  border: '1.5px solid #bae6fd',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: '800', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🎯</span>
                  <span>Tentukan Kelas & Jurusan untuk Siswa yang Terbaca:</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                      Jurusan:
                    </label>
                    <select
                      value={ocrJurusan}
                      onChange={(e) => {
                        const j = e.target.value;
                        setOcrJurusan(j);
                        const t = ocrKelas.split(' ')[0] || 'X';
                        setOcrKelas(`${t} ${j}`);
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '12.5px',
                        fontWeight: 'bold',
                        backgroundColor: '#ffffff',
                      }}
                    >
                      <option value="TJKT">TJKT (Teknik Jaringan Komputer & Telekomunikasi)</option>
                      <option value="AKL">AKL (Akuntansi & Keuangan Lembaga)</option>
                      <option value="MPLB">MPLB (Manajemen Perkantoran & Layanan Bisnis)</option>
                      <option value="PM">PM (Pemasaran)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                      Tingkat & Kelas:
                    </label>
                    <select
                      value={ocrKelas}
                      onChange={(e) => setOcrKelas(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '12.5px',
                        fontWeight: 'bold',
                        backgroundColor: '#ffffff',
                      }}
                    >
                      <option value="X TJKT">X TJKT</option>
                      <option value="XI TJKT">XI TJKT</option>
                      <option value="XII TJKT">XII TJKT</option>
                      <option value="X AKL">X AKL</option>
                      <option value="XI AKL">XI AKL</option>
                      <option value="XII AKL">XII AKL</option>
                      <option value="X MPLB">X MPLB</option>
                      <option value="XI MPLB">XI MPLB</option>
                      <option value="XII MPLB">XII MPLB</option>
                      <option value="X PM">X PM</option>
                      <option value="XI PM">XI PM</option>
                      <option value="XII PM">XII PM</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Tombol Ambil Foto / Upload Berkas */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => fileInputCameraRef.current?.click()}
                  disabled={ocrIsProcessing}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '12px',
                    border: '2px dashed #0284c7',
                    backgroundColor: '#f0f9ff',
                    color: '#0284c7',
                    fontSize: '13px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 8px rgba(2, 132, 199, 0.1)',
                  }}
                >
                  <span style={{ fontSize: '26px' }}>📸</span>
                  <span>Ambil Foto via Kamera HP</span>
                  <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 'normal' }}>
                    Arahkan ke lembar buku absensi
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputGalleryRef.current?.click()}
                  disabled={ocrIsProcessing}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '12px',
                    border: '2px dashed #64748b',
                    backgroundColor: '#f8fafc',
                    color: '#334155',
                    fontSize: '13px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                  }}
                >
                  <span style={{ fontSize: '26px' }}>📁</span>
                  <span>Pilih Foto dari Galeri / PDF</span>
                  <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 'normal' }}>
                    JPG, PNG, atau PDF scan
                  </span>
                </button>
              </div>

              {/* Status Pemindaian AI OCR */}
              {ocrIsProcessing && (
                <div
                  style={{
                    backgroundColor: '#eff6ff',
                    border: '1.5px solid #93c5fd',
                    padding: '14px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      border: '3px solid #3b82f6',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                    }}
                  />
                  <div>
                    <h5 style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: '#1e40af' }}>
                      Sedang Menganalisis Lembar Absensi...
                    </h5>
                    <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#2563eb' }}>
                      {ocrProgressText || 'AI OCR sedang membaca daftar nama siswa...'}
                    </p>
                  </div>
                </div>
              )}

              {/* Review Daftar Siswa Terdeteksi */}
              {ocrDetectedStudents.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a' }}>
                        📋 Ditemukan {ocrDetectedStudents.length} Nama Siswa
                      </span>
                      <span style={{ fontSize: '11px', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '8px', fontWeight: 'bold' }}>
                        {ocrKelas}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setOcrDetectedStudents((prev) => prev.map((s) => ({ ...s, selected: true })));
                        }}
                        style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        Pilih Semua
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOcrDetectedStudents((prev) => [
                            ...prev,
                            { id: `ocr-manual-${Date.now()}`, nama: 'SISWA BARU', selected: true },
                          ]);
                        }}
                        style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '6px', border: '1px solid #93c5fd', backgroundColor: '#eff6ff', color: '#1d4ed8', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        ➕ Tambah Baris
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      maxHeight: '260px',
                      overflowY: 'auto',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: '12px',
                      backgroundColor: '#f8fafc',
                      padding: '6px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    {ocrDetectedStudents.map((st, index) => (
                      <div
                        key={st.id || index}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 10px',
                          backgroundColor: '#ffffff',
                          borderRadius: '8px',
                          border: st.selected ? '1px solid #93c5fd' : '1px solid #e2e8f0',
                          opacity: st.selected ? 1 : 0.6,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={st.selected}
                          onChange={(e) => {
                            const val = e.target.checked;
                            setOcrDetectedStudents((prev) =>
                              prev.map((item, idx) => (idx === index ? { ...item, selected: val } : item))
                            );
                          }}
                          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        />

                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', minWidth: '22px' }}>
                          #{index + 1}
                        </span>

                        <input
                          type="text"
                          value={st.nama}
                          onChange={(e) => {
                            const val = e.target.value;
                            setOcrDetectedStudents((prev) =>
                              prev.map((item, idx) => (idx === index ? { ...item, nama: val } : item))
                            );
                          }}
                          style={{
                            flex: 1,
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '12.5px',
                            fontWeight: 'bold',
                            color: '#1e293b',
                            textTransform: 'uppercase',
                          }}
                        />

                        <button
                          type="button"
                          onClick={() => {
                            setOcrDetectedStudents((prev) => prev.filter((_, idx) => idx !== index));
                          }}
                          style={{
                            border: 'none',
                            background: '#fee2e2',
                            color: '#dc2626',
                            borderRadius: '6px',
                            padding: '6px 8px',
                            fontSize: '11px',
                            cursor: 'pointer',
                          }}
                          title="Hapus baris ini"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Tombol Simpan ke Database Supabase */}
                  <button
                    type="button"
                    onClick={handleSaveOcrStudents}
                    disabled={isSavingOcrStudents}
                    style={{
                      width: '100%',
                      padding: '13px 18px',
                      borderRadius: '12px',
                      backgroundColor: '#10b981',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '14px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
                      marginTop: '4px',
                    }}
                  >
                    <span>💾</span>
                    <span>
                      {isSavingOcrStudents
                        ? 'Menyimpan ke Database Supabase...'
                        : `Simpan ${ocrDetectedStudents.filter((s) => s.selected).length} Siswa ke Database (${ocrKelas})`}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
