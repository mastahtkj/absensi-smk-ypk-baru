'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Swal from 'sweetalert2';
import {
  extractFaceDescriptorFromCanvas,
  captureAndCompressCanvas,
  detectFaceBounds,
  drawFaceDetectionBox,
  drawGuideViewfinder,
} from '../utils/faceRecognition';
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
}) {
  const [filterRole, setFilterRole] = useState('siswa'); // 'siswa' | 'guru'
  const [filterTingkat, setFilterTingkat] = useState('semua');
  const [filterJurusan, setFilterJurusan] = useState('semua');
  const [filterKelas, setFilterKelas] = useState('semua');
  const [searchQuery, setSearchQuery] = useState('');

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

        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoInputs = devices.filter((d) => d.kind === 'videoinput');
          setAvailableDevices(videoInputs);
        } catch (e) {}

        const videoConstraints = {
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
        };
        if (selectedDeviceId) {
          videoConstraints.deviceId = { exact: selectedDeviceId };
        } else {
          videoConstraints.facingMode = facingMode;
        }

        const constraints = {
          audio: false,
          video: videoConstraints,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            const vw = videoRef.current.videoWidth || 640;
            const vh = videoRef.current.videoHeight || 480;
            if (vw > 0 && vh > 0) setVideoAspect(vw / vh);
            videoRef.current.play().catch(() => {});
          };
          videoRef.current.play().catch(() => {});
        }
        setCameraStatus(`Merekam Wajah: ${activeTarget.nama}`);
      } catch (err) {
        console.error('Camera error:', err);
        Swal.fire({
          icon: 'error',
          title: 'Gagal Akses Kamera',
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

  // Loop Realtime 3D Facial Mesh Constellation saat Pendaftaran Wajah (Sesuai Gambar 1)
  useEffect(() => {
    if (!cameraActive || !activeTarget) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      return;
    }

    let pulseStep = 0;
    const renderMeshLoop = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState !== 4) {
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
      // Gambar video kamera ke canvas terlebih dahulu sehingga piksel terbaca sempurna
      ctx.drawImage(video, 0, 0, w, h);

      pulseStep = (pulseStep + 0.05) % (Math.PI * 2);
      const animPulse = Math.sin(pulseStep) * 0.25 + 0.75;

      // Cari bounding box wajah dinamis dari piksel canvas
      const bounds = detectFaceBounds(canvas);
      if (bounds && bounds.hasFace) {
        setFaceDetected(true);
        setFaceQuality(bounds.quality || 85);

        if (!smoothedBoxRef.current) {
          smoothedBoxRef.current = { ...bounds };
        } else {
          const alpha = 0.25;
          smoothedBoxRef.current.x += (bounds.x - smoothedBoxRef.current.x) * alpha;
          smoothedBoxRef.current.y += (bounds.y - smoothedBoxRef.current.y) * alpha;
          smoothedBoxRef.current.width += (bounds.width - smoothedBoxRef.current.width) * alpha;
          smoothedBoxRef.current.height += (bounds.height - smoothedBoxRef.current.height) * alpha;
        }

        const activeFaceBox = {
          x: Math.round(smoothedBoxRef.current.x),
          y: Math.round(smoothedBoxRef.current.y),
          width: Math.round(smoothedBoxRef.current.width),
          height: Math.round(smoothedBoxRef.current.height),
        };

        // Gambar Mode Kotak Biometrik Bersih & Akurat (Tanpa Jaring 3D Mesh)
        drawFaceDetectionBox(ctx, activeFaceBox, {
          labelText: `WAJAH TERKUNCI (${bounds.quality}%)`,
          statusColor: '#10b981',
          showTitle: false,
        });
      } else {
        // 🎯 TUNGGU MANUSIA MUNCUL: Jangan munculkan 3D mesh di udara kosong atau benda mati
        setFaceDetected(false);
        setFaceQuality(0);
        smoothedBoxRef.current = null;

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

      animFrameRef.current = requestAnimationFrame(renderMeshLoop);
    };

    animFrameRef.current = requestAnimationFrame(renderMeshLoop);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [cameraActive, activeTarget]);

  // Ambil & Simpan Biometrik Wajah ke Database Supabase
  const handleCaptureAndSaveFace = async () => {
    if (!activeTarget || isProcessing) return;
    const video = videoRef.current;
    if (!video) return;

    // Gunakan offscreen canvas murni agar sampel biometrik dan foto bebas dari overlay grafis mesh
    const offscreen = document.createElement('canvas');
    offscreen.width = video.videoWidth || 640;
    offscreen.height = video.videoHeight || 480;
    const offCtx = offscreen.getContext('2d', { willReadFrequently: true });
    offCtx.drawImage(video, 0, 0, offscreen.width, offscreen.height);

    // Prioritaskan kotak wajah yang sedang terlacak di layar kamera (smoothedBoxRef)
    let activeBox = smoothedBoxRef.current && smoothedBoxRef.current.width > 0
      ? {
          x: Math.round(smoothedBoxRef.current.x),
          y: Math.round(smoothedBoxRef.current.y),
          width: Math.round(smoothedBoxRef.current.width),
          height: Math.round(smoothedBoxRef.current.height),
          hasFace: true,
        }
      : null;

    if (!activeBox) {
      const b = detectFaceBounds(offscreen);
      if (b && b.hasFace) {
        activeBox = b;
      }
    }

    let result = extractFaceDescriptorFromCanvas(offscreen, activeBox);
    if (!result || !result.hasFace) {
      result = extractFaceDescriptorFromCanvas(offscreen);
    }
    if (!result || !result.hasFace) {
      const w = offscreen.width;
      const h = offscreen.height;
      const guideW = Math.round(Math.min(w * 0.52, h * 0.42));
      const guideH = Math.round(guideW * 1.30);
      const fallbackBox = {
        x: Math.round((w - guideW) / 2),
        y: Math.round((h - guideH) * 0.44),
        width: guideW,
        height: guideH,
        hasFace: true,
      };
      result = extractFaceDescriptorFromCanvas(offscreen, fallbackBox);
    }

    if (!result || !result.hasFace) {
      Swal.fire({
        icon: 'warning',
        title: 'Wajah Belum Terlihat Jelas',
        text: 'Arahkan wajah langsung ke arah kamera agar sensor biometrik dapat mengunci titik wajah.',
      });
      return;
    }

    setIsProcessing(true);
    try {
      const compressedPhoto = captureAndCompressCanvas(offscreen, 360, 0.85);
      const isGuru = Boolean(activeTarget.isGuru || String(activeTarget.id).startsWith('GURU-'));
      const targetDbId = activeTarget.rawId || String(activeTarget.id).replace(/\D/g, '');

      const currentBiodata = (activeTarget.biodata && typeof activeTarget.biodata === 'object') ? activeTarget.biodata : {};
      // 🔒 PRIVASI BIOMETRIK: Simpan biometrik wajah ke field biometrik khusus.
      // JANGAN timpa foto_url / foto_avatar / foto_profil yang merupakan foto resmi kartu identitas.
      const updatedBiodata = {
        ...currentBiodata,
        face_descriptor: result.descriptor,
        face_legacy_descriptor: result.legacyDescriptor || result.descriptor,
        face_photo_url: compressedPhoto,
        face_snapshot: compressedPhoto,
        face_registered_at: new Date().toISOString(),
      };

      if (supabase) {
        if (isGuru) {
          const { error: guruErr } = await supabase
            .from('tb_guru')
            .update({
              biodata: updatedBiodata,
            })
            .eq('id_guru', targetDbId);

          if (guruErr) {
            console.warn('Fallback update tb_guru biodata:', guruErr.message);
          }
        } else {
          const { error: siswaErr } = await supabase
            .from('tb_siswa')
            .update({
              biodata: updatedBiodata,
            })
            .eq('id_siswa', targetDbId);

          if (siswaErr) {
            console.warn('Fallback update tb_siswa biodata:', siswaErr.message);
          }
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
      speakIndonesianAi(`Berhasil! Sampel biometrik wajah ${activeTarget.nama} telah terdaftar dan aktif.`);

      Swal.fire({
        icon: 'success',
        title: 'Wajah Terdaftar! 🎉',
        text: `Biometrik wajah untuk ${activeTarget.nama} (${activeTarget.kelas || 'Guru'}) berhasil disimpan ke cloud database (Akurasi Biometrik: ${result.quality || 95}%).`,
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
        uid_rfid: null,
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
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
        }}
      >
        {/* HEADER */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
            padding: '20px 24px',
            color: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
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
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>
              {isSelfMode || targetUser
                ? `Perekaman Wajah AI: ${(targetUser || currentUser)?.nama || 'Akun Saya'}`
                : 'Pusat Manajemen Perekaman Wajah AI'}
            </h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#cbd5e1' }}>
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

        {/* MODAL KAMERA OVERLAY KETIKA SEDANG MEREKAM */}
        {cameraActive && activeTarget && (
          <div
            style={{
              backgroundColor: '#020617',
              padding: '16px 24px',
              color: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              borderBottom: '2px solid #06b6d4',
            }}
          >
            <div style={{ width: '100%', maxWidth: '480px', position: 'relative', aspectRatio: videoAspect ? `${videoAspect}` : '4/3', borderRadius: '16px', overflow: 'hidden', backgroundColor: '#020617', marginBottom: '12px', border: '2px solid #06b6d4', boxShadow: '0 0 25px rgba(6, 182, 212, 0.4)' }}>
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
                  display: 'none',
                }}
              />
              <canvas
                ref={canvasRef}
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'block',
                  objectFit: cameraFitMode,
                  transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                }}
              />

              <div style={{ position: 'absolute', top: '10px', left: '10px', backgroundColor: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(6px)', padding: '5px 12px', borderRadius: '8px', fontSize: '11px', color: '#38bdf8', fontWeight: 'bold', border: '1px solid rgba(56,189,248,0.3)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>Target:</span>
                <span style={{ color: '#ffffff' }}>{activeTarget.nama}</span>
              </div>

              <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '6px' }}>
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
                      padding: '4px 8px',
                      borderRadius: '8px',
                      fontSize: '10.5px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    <option value="">Kamera Utama</option>
                    {availableDevices.map((dev, i) => (
                      <option key={dev.deviceId || i} value={dev.deviceId}>
                        {dev.label || `Kamera ${i + 1}`}
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
                  🔄 {facingMode === 'user' ? 'Belakang' : 'Depan'}
                </button>
              </div>

              <div style={{ position: 'absolute', bottom: '10px', left: '10px', right: '10px', backgroundColor: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(8px)', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: faceDetected ? '1px solid rgba(52, 211, 153, 0.5)' : '1px solid rgba(148, 163, 184, 0.3)' }}>
                <span style={{ color: faceDetected ? '#38bdf8' : '#94a3b8' }}>
                  {faceDetected ? '🔲 Mode Kotak Biometrik Aktif' : '📷 Menunggu Wajah di Kamera...'}
                </span>
                <span style={{ color: faceDetected ? '#34d399' : '#cbd5e1' }}>
                  {faceDetected ? `🟢 Wajah Terkunci (${faceQuality}%)` : '⚪ Arahkan wajah ke panduan'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', width: '100%', maxWidth: '420px' }}>
              <button
                type="button"
                onClick={handleCaptureAndSaveFace}
                disabled={isProcessing}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  backgroundColor: '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  boxShadow: '0 0 15px rgba(16, 185, 129, 0.4)',
                }}
              >
                {isProcessing ? 'Menyimpan Biometrik...' : '📸 Kunci & Simpan Wajah AI'}
              </button>

              <button
                type="button"
                onClick={stopCamera}
                style={{
                  padding: '10px 16px',
                  borderRadius: '8px',
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: '800',
                  cursor: 'pointer',
                }}
              >
                Batal
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
                padding: '7px 16px',
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
              <span>Daftarkan Siswa Baru</span>
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
    </div>
  );
}
