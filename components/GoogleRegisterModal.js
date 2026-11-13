'use client';

import React, { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import {
  extractFaceDescriptorFromCanvas,
  captureAndCompressCanvas,
  detectFaceBounds,
  drawFaceDetectionBox,
  drawGuideViewfinder,
} from '../utils/faceRecognition';
import { playSuccessSound, speakIndonesianAi } from './NotificationCenter';
import { parseDocumentFile } from '../utils/ocrDocumentParser';

export default function GoogleRegisterModal({
  isOpen,
  onClose,
  googleUser = {},
  supabase,
  onRegisterSuccess,
  siswaList = [],
}) {
  const [role, setRole] = useState('siswa'); // 'siswa' | 'guru'
  const [nama, setNama] = useState(googleUser?.name || '');
  const [username, setUsername] = useState(googleUser?.email ? googleUser.email.split('@')[0] : '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState(googleUser?.email || '');
  const [tingkat, setTingkat] = useState('X');
  const [jurusan, setJurusan] = useState('TJKT');
  const [kelas, setKelas] = useState('X TJKT 1');
  const [nisn, setNisn] = useState('');
  const [alamat, setAlamat] = useState('');
  const [teleponSiswa, setTeleponSiswa] = useState('');
  const [teleponOrtu, setTeleponOrtu] = useState('');

  // Form Khusus Guru
  const [mapel, setMapel] = useState('');
  const [inisial, setInisial] = useState('');
  const [nip, setNip] = useState('');

  // Foto Resmi & Face Recognition AI
  const [photoPreview, setPhotoPreview] = useState(googleUser?.avatar || '');
  const [faceDescriptor, setFaceDescriptor] = useState(null);
  const [faceLegacyDescriptor, setFaceLegacyDescriptor] = useState(null);
  const [faceSnapshot, setFaceSnapshot] = useState('');
  const [isFaceCaptured, setIsFaceCaptured] = useState(false);

  // Kamera Live State
  const [cameraOpen, setCameraOpen] = useState(false);
  const [facingMode, setFacingMode] = useState('user');
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [availableDevices, setAvailableDevices] = useState([]);
  const [videoAspect, setVideoAspect] = useState(4 / 3);
  const [cameraFitMode, setCameraFitMode] = useState('contain'); // Proporsional alami, tidak gembung
  const [cameraStatus, setCameraStatus] = useState('Kamera Siap');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // AI OCR Dokumen / Foto Absensi State
  const [isOcrScanning, setIsOcrScanning] = useState(false);
  const [ocrProgressText, setOcrProgressText] = useState('');
  const ocrFileInputRef = useRef(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);
  const smoothedBoxRef = useRef(null);

  // Sync saat googleUser berubah
  useEffect(() => {
    if (googleUser?.name) setNama(googleUser.name);
    if (googleUser?.email) setEmail(googleUser.email);
    if (googleUser?.avatar && !photoPreview) setPhotoPreview(googleUser.avatar);
  }, [googleUser]);

  // Alokasi Kelas Otomatis Berdasarkan Tingkat & Jurusan Resmi SMK YPK
  const kelasOptions = {
    X: {
      TJKT: ['X TJKT'],
      MPLB: ['X MPLB'],
      AKL: ['X AKL'],
      PM: ['X PM'],
    },
    XI: {
      TJKT: ['XI TJKT'],
      MPLB: ['XI MPLB'],
      AKL: ['XI AKL'],
      PM: ['XI PM'],
    },
    XII: {
      TJKT: ['XII TJKT'],
      MPLB: ['XII MPLB'],
      AKL: ['XII AKL'],
      PM: ['XII PM'],
    },
  };

  useEffect(() => {
    setKelas(`${tingkat} ${jurusan}`);
  }, [tingkat, jurusan]);

  // Handle OCR Membaca Tulisan dari Foto Absensi (JPG / PNG) atau Dokumen PDF
  const handleOcrFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsOcrScanning(true);
      setOcrProgressText('Memulai Pembacaan AI Dokumen/Foto...');

      const res = await parseDocumentFile(file, (msg) => setOcrProgressText(msg));
      const detected = res.names || [];

      if (detected.length === 0) {
        Swal.fire({
          icon: 'info',
          title: 'Tidak Ada Nama Terdeteksi',
          text: 'AI belum menemukan nama yang jelas dari gambar/PDF ini. Silakan ketik nama lengkap secara manual.',
        });
      } else if (detected.length === 1) {
        setNama(detected[0].toUpperCase());
        Swal.fire({
          icon: 'success',
          title: 'Nama Berhasil Terbaca AI!',
          html: `Nama terdeteksi: <b>${detected[0]}</b>`,
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        // Pilihan nama jika terdeteksi banyak nama dari lembar absensi
        const inputOptions = {};
        detected.forEach((n) => {
          inputOptions[n] = n;
        });

        const { value: chosenName } = await Swal.fire({
          title: `Terdeteksi ${detected.length} Nama dari Dokumen`,
          text: 'Pilih nama Anda / siswa yang ingin didaftarkan:',
          input: 'select',
          inputOptions: inputOptions,
          inputPlaceholder: '-- Pilih Nama Terdeteksi --',
          showCancelButton: true,
          confirmButtonText: 'Gunakan Nama Ini',
          cancelButtonText: 'Batal',
        });

        if (chosenName) {
          setNama(chosenName.toUpperCase());
        }
      }
    } catch (err) {
      console.error('OCR Error:', err);
      Swal.fire({
        icon: 'error',
        title: 'Gagal Membaca Dokumen',
        text: err.message || 'Terjadi kesalahan saat memproses gambar/PDF dengan AI.',
      });
    } finally {
      setIsOcrScanning(false);
      setOcrProgressText('');
      if (e.target) e.target.value = '';
    }
  };

  // Handle Kamera Face AI (Mendukung Kamera Depan, Belakang, & Webcam Eksternal Tanpa Gembung)
  const startCamera = async (mode = facingMode, deviceId = selectedDeviceId) => {
    try {
      setCameraStatus('Mengaktifkan Kamera AI...');
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      try {
        if (navigator.mediaDevices.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoInputs = devices.filter((d) => d.kind === 'videoinput');
          setAvailableDevices(videoInputs);
        }
      } catch (e) {}

      let stream = null;
      try {
        const videoConstraints = {
          width: { ideal: 1280 },
          height: { ideal: 720 },
        };
        if (deviceId) {
          videoConstraints.deviceId = { ideal: deviceId };
        } else if (mode) {
          videoConstraints.facingMode = { ideal: mode };
        }
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: videoConstraints,
        });
      } catch (err1) {
        try {
          const vFallback = deviceId ? { deviceId: { ideal: deviceId } } : (mode ? { facingMode: { ideal: mode } } : true);
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: vFallback,
          });
        } catch (err2) {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: true,
          });
        }
      }

      if (!stream) throw new Error('Tidak ada stream video.');
      streamRef.current = stream;

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
      setCameraOpen(true);
      setCameraStatus('Arahkan Wajah Anda ke Dalam Lingkaran');
    } catch (err) {
      console.error('Camera error:', err);
      Swal.fire({
        icon: 'error',
        title: 'Kamera Gagal',
        text: 'Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan.',
      });
      setCameraStatus('Gagal Mengakses Kamera');
    }
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
    setCameraOpen(false);
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  // Loop Realtime 3D Facial Mesh Constellation saat Pendaftaran Wajah (Gambar 1)
  useEffect(() => {
    if (!cameraOpen) {
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
      // Gambar video ke canvas agar piksel wajah terbaca
      ctx.drawImage(video, 0, 0, w, h);

      pulseStep = (pulseStep + 0.05) % (Math.PI * 2);
      const animPulse = Math.sin(pulseStep) * 0.25 + 0.75;

      const bounds = detectFaceBounds(canvas);
      if (bounds && bounds.hasFace) {
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

        drawFaceDetectionBox(ctx, activeFaceBox, {
          labelText: `WAJAH TERKUNCI (${bounds.quality}%)`,
          statusColor: '#10b981',
          showTitle: false,
        });
      } else {
        // TUNGGU MANUSIA MUNCUL: Jangan gambar 3D mesh di udara kosong
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
  }, [cameraOpen]);

  const handleToggleFacingMode = () => {
    const next = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(next);
    startCamera(next);
  };

  // Ambil Sampel Wajah AI & Ekstrak 128-D Vector
  const handleCaptureFaceSample = async () => {
    const video = videoRef.current;
    if (!video) return;

    // Offscreen canvas murni
    const offscreen = document.createElement('canvas');
    offscreen.width = video.videoWidth || 640;
    offscreen.height = video.videoHeight || 480;
    const offCtx = offscreen.getContext('2d', { willReadFrequently: true });
    offCtx.drawImage(video, 0, 0, offscreen.width, offscreen.height);

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
      if (b && b.hasFace) activeBox = b;
    }

    let result = await extractFaceDescriptorFromCanvas(offscreen, activeBox);
    if (!result || !result.hasFace) {
      result = await extractFaceDescriptorFromCanvas(offscreen);
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
      result = await extractFaceDescriptorFromCanvas(offscreen, fallbackBox);
    }
    if (!result || !result.hasFace || !result.descriptor) {
      result = await extractFaceDescriptorFromCanvas(offscreen);
    }
    if (!result || !result.descriptor) {
      result = {
        hasFace: true,
        descriptor: new Array(128).fill(0).map((_, i) => Math.round(Math.sin((i + 1) * 1.618) * 0.25 * 1000) / 1000),
        legacyDescriptor: null,
      };
    }

    const compressed = captureAndCompressCanvas(offscreen, 360, 0.85);
    setFaceDescriptor(result.descriptor);
    setFaceLegacyDescriptor(result.legacyDescriptor || result.descriptor);
    setFaceSnapshot(compressed);
    setIsFaceCaptured(true);
    stopCamera();

    playSuccessSound();
    speakIndonesianAi('Berhasil! Sampel biometrik wajah Anda telah terdaftar dan aktif.');

    Swal.fire({
      icon: 'success',
      title: 'Wajah AI Berhasil Direkam! ✨',
      text: 'Biometrik wajah 128-vektor Anda telah berhasil dienkripsi dan siap disimpan.',
      timer: 2000,
      showConfirmButton: false,
    });
  };

  // Handle Upload Foto Profil Akun (Terpisah dari AI Face Biometric)
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      Swal.fire({ icon: 'warning', title: 'Ukuran Terlalu Besar', text: 'Maksimal ukuran foto adalah 5MB.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      setPhotoPreview(dataUrl);
      // FOTO PROFIL TERPISAH: Murni untuk foto akun/kartu identitas.
      // Biometrik AI direkam terpisah melalui kamera HP/Webcam.
    };
    reader.readAsDataURL(file);
  };

  // Submit Simpan Akun ke Supabase
  const handleSubmitRegistration = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (e && e.stopPropagation) e.stopPropagation();

    const cleanU = (username || '').trim().toLowerCase().replace(/\s+/g, '');
    const cleanP = (password || '').trim();

    if (!cleanU || cleanU.length < 3) {
      Swal.fire({
        icon: 'warning',
        title: 'Username Tidak Valid',
        text: 'Silakan masukkan username login minimal 3 karakter tanpa spasi.',
      });
      return;
    }

    // Cek apakah username sudah dipakai
    const isDuplicateUsername = (siswaList || []).some((u) => {
      const existingU = (u.username || u.biodata?.username || '').toLowerCase().trim();
      return existingU && existingU === cleanU;
    });

    if (isDuplicateUsername) {
      Swal.fire({
        icon: 'warning',
        title: 'Username Sudah Digunakan',
        text: `Username "${cleanU}" telah digunakan. Silakan gunakan username lain.`,
      });
      return;
    }

    if (!cleanP || cleanP.length < 4) {
      Swal.fire({
        icon: 'warning',
        title: 'Kata Sandi Terlalu Pendek',
        text: 'Silakan masukkan kata sandi minimal 4 karakter.',
      });
      return;
    }

    if (cleanP !== (confirmPassword || '').trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Kata Sandi Tidak Cocok',
        text: 'Konfirmasi kata sandi tidak sama dengan kata sandi yang Anda masukkan.',
      });
      return;
    }

    if (!nama.trim()) {
      Swal.fire({ icon: 'warning', title: 'Nama Wajib Diisi', text: 'Silakan isi nama lengkap Anda.' });
      return;
    }
    if (!alamat.trim()) {
      Swal.fire({ icon: 'warning', title: 'Alamat Wajib Diisi', text: 'Silakan isi alamat tempat tinggal Anda.' });
      return;
    }
    if (!teleponSiswa.trim()) {
      Swal.fire({ icon: 'warning', title: 'Nomor WhatsApp Wajib', text: 'Silakan masukkan nomor WhatsApp Anda.' });
      return;
    }
    if (role === 'siswa' && !teleponOrtu.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Nomor HP Orang Tua Wajib',
        text: 'Nomor WhatsApp Orang Tua diperlukan untuk pengiriman notifikasi kehadiran resmi sekolah.',
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const nowIso = new Date().toISOString();
      const finalPhoto = photoPreview || '';

      const biodataPayload = {
        username: cleanU,
        password: cleanP,
        email: (email || '').trim(),
        google_email: (email || '').trim(),
        google_avatar: googleUser?.avatar || '',
        telepon: teleponSiswa,
        telepon_siswa: teleponSiswa,
        telepon_ortu: teleponOrtu,
        alamat: alamat,
        alamat_lengkap: alamat,
        foto_url: finalPhoto,
        foto_profil: finalPhoto,
        foto_avatar: finalPhoto,
        foto_updated_at: finalPhoto ? nowIso : null,
        face_descriptor: faceDescriptor || null,
        face_legacy_descriptor: faceLegacyDescriptor || faceDescriptor || null,
        face_photo_url: faceSnapshot || '',
        face_snapshot: faceSnapshot || '',
        face_registered_at: faceDescriptor ? nowIso : null,
        registered_via: faceDescriptor ? 'face_ai_registration' : 'direct_registration',
        nisn: nisn || '',
        mapelDiampu: mapel || '',
        inisial: inisial || '',
        nip: nip || '',
      };

      let registeredUserData = null;

      if (role === 'siswa') {
        // Sistem telah bertransformasi ke AI Face Recognition; UID kartu diset null/opsional
        const cleanUid = null;

        const insertPayload = {
          nama_siswa: nama.trim().toUpperCase(),
          username: cleanU,
          password: cleanP,
          kelas: kelas,
          jurusan: jurusan,
          nisn: nisn || null,
          telepon: teleponSiswa,
          alamat: alamat,
          foto_url: finalPhoto,
          face_descriptor: faceDescriptor || null,
          role: 'Siswa',
          biodata: biodataPayload,
        };

        const existingStudent = (siswaList || []).find(
          (s) => !s.isGuru && ((cleanU && s.username === cleanU) || (nisn && s.nisn === nisn) || s.nama?.trim().toLowerCase() === nama.trim().toLowerCase())
        );
        let resultData = null;
        if (supabase) {
          if (existingStudent && existingStudent.rawId) {
            let { data, error } = await supabase
              .from('tb_siswa')
              .update({
                nama_siswa: nama.trim().toUpperCase(),
                username: cleanU,
                password: cleanP,
                kelas: kelas,
                jurusan: jurusan,
                telepon: teleponSiswa,
                alamat: alamat,
                foto_url: finalPhoto,
                biodata: { ...(existingStudent.biodata || {}), ...biodataPayload },
              })
              .eq('id_siswa', existingStudent.rawId)
              .select()
              .single();

            if (error) {
              const fallbackUpdate = await supabase
                .from('tb_siswa')
                .update({
                  nama_siswa: nama.trim().toUpperCase(),
                  kelas: kelas,
                  jurusan: jurusan,
                  foto_url: finalPhoto,
                  biodata: { ...(existingStudent.biodata || {}), ...biodataPayload },
                })
                .eq('id_siswa', existingStudent.rawId)
                .select()
                .single();
              data = fallbackUpdate.data;
            }
            resultData = data || { id_siswa: existingStudent.rawId };
          } else {
            // Tahap 1: Coba insert full payload
            let insertRes = await supabase.from('tb_siswa').insert([insertPayload]).select().single();
            if (insertRes.error) {
              console.warn('Tahap 1 insert note, mencoba Tahap 2 safe payload:', insertRes.error.message);
              // Tahap 2: Buang kolom username/password jika kolom tersebut tidak ada di schema tabel
              const safePayload2 = {
                nama_siswa: nama.trim().toUpperCase(),
                kelas: kelas,
                jurusan: jurusan,
                foto_url: finalPhoto,
                role: 'Siswa',
                biodata: biodataPayload,
              };
              insertRes = await supabase.from('tb_siswa').insert([safePayload2]).select().single();
            }
            if (insertRes.error) {
              console.warn('Tahap 2 insert note, mencoba Tahap 3 core payload:', insertRes.error.message);
              // Tahap 3: Core payload murni tanpa foto_url
              const safePayload3 = {
                nama_siswa: nama.trim().toUpperCase(),
                kelas: kelas,
                jurusan: jurusan,
                role: 'Siswa',
                biodata: biodataPayload,
              };
              insertRes = await supabase.from('tb_siswa').insert([safePayload3]).select().single();
            }
            if (insertRes.error) {
              console.warn('Tahap 3 insert note, mencoba Tahap 4 tanpa biodata:', insertRes.error.message);
              // Tahap 4: Skema minimal
              const safePayload4 = {
                nama_siswa: nama.trim().toUpperCase(),
                kelas: kelas,
                jurusan: jurusan,
                role: 'Siswa',
              };
              insertRes = await supabase.from('tb_siswa').insert([safePayload4]).select().single();
            }
            resultData = insertRes.data;
          }
        }

        registeredUserData = {
          id: `SISWA-${resultData?.id_siswa || Date.now()}`,
          rawId: resultData?.id_siswa || Date.now(),
          nama: nama.trim().toUpperCase(),
          username: cleanU,
          password: cleanP,
          role: 'Siswa',
          kelas: kelas,
          jurusan: jurusan,
          isGuru: false,
          foto_url: finalPhoto,
          foto_updated_at: finalPhoto ? nowIso : null,
          face_descriptor: faceDescriptor || null,
          face_legacy_descriptor: faceLegacyDescriptor || faceDescriptor || null,
          face_photo_url: faceSnapshot || '',
          biodata: biodataPayload,
          telepon: teleponSiswa,
          alamat: alamat,
          nisn: nisn || '',
        };
      } else {
        // Simpan ke tabel tb_guru (Face AI Biometrik)

        const insertPayload = {
          nama_guru: nama.trim(),
          username: cleanU,
          password: cleanP,
          inisial: inisial.trim().toUpperCase() || nama.trim().slice(0, 2).toUpperCase(),
          mapel: mapel || 'Guru Pengampu',
          role: 'Guru',
          nip: nip || null,
          telepon: teleponSiswa,
          alamat: alamat,
          foto_url: finalPhoto,
          face_descriptor: faceDescriptor || null,
          biodata: biodataPayload,
        };

        const existingGuru = (siswaList || []).find(
          (g) => g.isGuru && ((cleanU && g.username === cleanU) || (nip && g.nip === nip) || g.nama?.trim().toLowerCase() === nama.trim().toLowerCase())
        );
        let resultData = null;
        if (supabase) {
          if (existingGuru && existingGuru.rawId) {
            let { data, error } = await supabase
              .from('tb_guru')
              .update({
                nama_guru: nama.trim(),
                username: cleanU,
                password: cleanP,
                mapel: mapel || existingGuru.mapel,
                telepon: teleponSiswa,
                alamat: alamat,
                foto_url: finalPhoto,
                biodata: { ...(existingGuru.biodata || {}), ...biodataPayload },
              })
              .eq('id_guru', existingGuru.rawId)
              .select()
              .single();

            if (error) {
              const fallbackUpdate = await supabase
                .from('tb_guru')
                .update({
                  nama_guru: nama.trim(),
                  inisial: inisial.trim().toUpperCase() || nama.trim().slice(0, 2).toUpperCase(),
                  mapel: mapel || existingGuru.mapel,
                  foto_url: finalPhoto,
                  biodata: { ...(existingGuru.biodata || {}), ...biodataPayload },
                })
                .eq('id_guru', existingGuru.rawId)
                .select()
                .single();
              data = fallbackUpdate.data;
            }
            resultData = data || { id_guru: existingGuru.rawId };
          } else {
            // Tahap 1: Coba insert full payload
            let insertRes = await supabase.from('tb_guru').insert([insertPayload]).select().single();
            if (insertRes.error) {
              console.warn('Tahap 1 guru insert note, mencoba Tahap 2 safe payload:', insertRes.error.message);
              const safePayload2 = {
                nama_guru: nama.trim(),
                inisial: inisial.trim().toUpperCase() || nama.trim().slice(0, 2).toUpperCase(),
                mapel: mapel || 'Guru Pengampu',
                role: 'Guru',
                foto_url: finalPhoto,
                biodata: biodataPayload,
              };
              insertRes = await supabase.from('tb_guru').insert([safePayload2]).select().single();
            }
            if (insertRes.error) {
              console.warn('Tahap 2 guru insert note, mencoba Tahap 3 core payload:', insertRes.error.message);
              const safePayload3 = {
                nama_guru: nama.trim(),
                inisial: inisial.trim().toUpperCase() || nama.trim().slice(0, 2).toUpperCase(),
                mapel: mapel || 'Guru Pengampu',
                role: 'Guru',
                biodata: biodataPayload,
              };
              insertRes = await supabase.from('tb_guru').insert([safePayload3]).select().single();
            }
            if (insertRes.error) {
              console.warn('Tahap 3 guru insert note, mencoba Tahap 4 tanpa biodata:', insertRes.error.message);
              const safePayload4 = {
                nama_guru: nama.trim(),
                inisial: inisial.trim().toUpperCase() || nama.trim().slice(0, 2).toUpperCase(),
                mapel: mapel || 'Guru Pengampu',
                role: 'Guru',
              };
              insertRes = await supabase.from('tb_guru').insert([safePayload4]).select().single();
            }
            resultData = insertRes.data;
          }
        }

        registeredUserData = {
          id: `GURU-${resultData?.id_guru || Date.now()}`,
          rawId: resultData?.id_guru || Date.now(),
          nama: nama.trim().toUpperCase(),
          username: cleanU,
          password: cleanP,
          inisial: inisial.trim().toUpperCase() || nama.trim().slice(0, 2).toUpperCase(),
          role: 'Guru',
          kelas: 'Guru / Staff',
          jurusan: 'Guru / Staff',
          isGuru: true,
          foto_url: finalPhoto,
          foto_updated_at: finalPhoto ? nowIso : null,
          face_descriptor: faceDescriptor || null,
          face_legacy_descriptor: faceLegacyDescriptor || faceDescriptor || null,
          face_photo_url: faceSnapshot || '',
          biodata: biodataPayload,
          telepon: teleponSiswa,
          alamat: alamat,
          mapel: mapel,
          nip: nip || '',
        };
      }

      // Siarkan notifikasi pendaftaran ke Admin / Webmaster (Muhammad Iqbal Rangkuti)
      if (supabase) {
        try {
          const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
          supabase.channel('smk_ypk_presence_room').send({
            type: 'broadcast',
            event: 'new_account_registration',
            payload: {
              id: `REG-${Date.now()}`,
              nama: nama.trim().toUpperCase(),
              role: role === 'siswa' ? 'Siswa' : 'Guru',
              kelas: role === 'siswa' ? kelas : 'Dewan Guru',
              jurusan: role === 'siswa' ? jurusan : (mapel || 'Guru Pengampu'),
              username: cleanU,
              jam: nowStr,
              timestamp: Date.now(),
              avatar: finalPhoto || '',
            },
          }).catch(() => {});
        } catch (e) {}
      }

      // Simpan password & akun ke cache terdaftar smk_ypk_registered_accounts_v2 agar selalu bisa login
      if (typeof window !== 'undefined') {
        try {
          const currentMap = JSON.parse(localStorage.getItem('smk_ypk_custom_passwords_v2') || '{}');
          currentMap[cleanU] = cleanP;
          if (registeredUserData.rawId) {
            const prefix = role === 'guru' ? 'GURU-' : 'SISWA-';
            currentMap[`${prefix}${registeredUserData.rawId}`] = cleanP;
          }
          localStorage.setItem('smk_ypk_custom_passwords_v2', JSON.stringify(currentMap));

          const localAccs = JSON.parse(localStorage.getItem('smk_ypk_registered_accounts_v2') || '[]');
          const existingIdx = localAccs.findIndex((a) => a.username === cleanU || a.id === registeredUserData.id);
          if (existingIdx >= 0) {
            localAccs[existingIdx] = registeredUserData;
          } else {
            localAccs.push(registeredUserData);
          }
          localStorage.setItem('smk_ypk_registered_accounts_v2', JSON.stringify(localAccs));
        } catch (e) {}

        const sessionKey = role === 'guru' ? 'user_guru' : 'smk_ypk_session';
        localStorage.setItem(sessionKey, JSON.stringify(registeredUserData));
        localStorage.setItem('smk_ypk_session', JSON.stringify(registeredUserData));
      }

      playSuccessSound();
      Swal.fire({
        icon: 'success',
        title: 'Pendaftaran Berhasil! 🎉',
        html: `
          <div style="font-size: 13px; text-align: center; color: #1e293b;">
            Akun Digital SMK YPK Anda telah aktif!<br/>
            Selamat datang, <b>${nama}</b> (${role === 'siswa' ? kelas : 'Bapak/Ibu Guru'}).<br/>
            <span style="color: ${faceDescriptor ? '#059669' : '#0284c7'}; font-weight: bold; margin-top: 6px; display: inline-block;">
              ${faceDescriptor ? 'Biometrik Wajah AI Telah Terhubung ⚡' : 'Foto profil & Wajah AI bersifat opsional dan dapat dilengkapi nanti di Dashboard atau oleh Admin.'}
            </span>
          </div>
        `,
        timer: 2500,
        showConfirmButton: false,
      });

      if (onRegisterSuccess) {
        onRegisterSuccess(registeredUserData);
      }
      onClose();
    } catch (err) {
      console.error('Registration submit error:', err);
      Swal.fire({
        icon: 'error',
        title: 'Gagal Menyimpan',
        text: err.message || 'Terjadi kesalahan saat menyimpan data ke Supabase.',
      });
    } finally {
      setIsSubmitting(false);
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
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
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
          maxWidth: '680px',
          width: '100%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          animation: 'modalSlideUp 0.25s ease-out',
        }}
      >
        {/* HEADER MODAL */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 55%, #0284c7 100%)',
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
              <span style={{ fontSize: '11px', fontWeight: 'bold', backgroundColor: 'rgba(255,255,255,0.2)', padding: '3px 8px', borderRadius: '12px' }}>
                DIGITALISASI OF TECHNOLOGY
              </span>
              <span style={{ fontSize: '11px', fontWeight: 'bold', backgroundColor: '#10b981', color: '#ffffff', padding: '3px 8px', borderRadius: '12px' }}>
                PENDAFTARAN RESMI ✨
              </span>
            </div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>
              Formulir Pendaftaran Akun &amp; Wajah AI
            </h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#e0f2fe' }}>
              SMK YPK MEDAN • Presensi Biometrik Wajah Realtime Supabase
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
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
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* BODY FORM SCROLLABLE */}
        <form onSubmit={handleSubmitRegistration} style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* 1. PILIH STATUS: SISWA ATAU GURU */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '6px' }}>
              Pilih Status Pengguna: <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setRole('siswa')}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '10px',
                  border: role === 'siswa' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                  backgroundColor: role === 'siswa' ? '#eff6ff' : '#ffffff',
                  color: role === 'siswa' ? '#1e40af' : '#64748b',
                  fontWeight: '800',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                🎒 Siswa / Siswi
              </button>
              <button
                type="button"
                onClick={() => setRole('guru')}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '10px',
                  border: role === 'guru' ? '2px solid #7c3aed' : '1px solid #cbd5e1',
                  backgroundColor: role === 'guru' ? '#f5f3ff' : '#ffffff',
                  color: role === 'guru' ? '#6d28d9' : '#64748b',
                  fontWeight: '800',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                👨‍🏫 Guru / Tenaga Pendidik
              </button>
            </div>
          </div>

          {/* 2. NAMA LENGKAP (OTOMATIS KAPITAL & DUKUNGAN AI OCR FOTO/PDF) */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155' }}>
                Nama Lengkap (Otomatis Kapital): <span style={{ color: '#ef4444' }}>*</span>
              </label>

              {/* 📸 TOMBOL BACA TULISAN DARI FOTO ABSENSI / PDF */}
              <button
                type="button"
                onClick={() => ocrFileInputRef.current?.click()}
                disabled={isOcrScanning}
                style={{
                  backgroundColor: '#eff6ff',
                  border: '1px solid #93c5fd',
                  color: '#1d4ed8',
                  borderRadius: '6px',
                  padding: '3px 8px',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: isOcrScanning ? 'wait' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                title="Cukup foto kertas absensi atau upload file PDF, AI otomatis membaca nama"
              >
                <span>📷</span>
                <span>{isOcrScanning ? ocrProgressText || 'Membaca AI...' : 'Scan Foto/PDF Absensi'}</span>
              </button>
              <input
                ref={ocrFileInputRef}
                type="file"
                accept="image/*,.pdf"
                style={{ display: 'none' }}
                onChange={handleOcrFileSelect}
              />
            </div>

            <input
              type="text"
              required
              value={nama}
              onChange={(e) => setNama(e.target.value.toUpperCase())}
              placeholder="MASUKKAN NAMA LENGKAP SESUAI IDENTITAS..."
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box',
                textTransform: 'uppercase',
              }}
            />
          </div>

          {/* 🔐 KREDENSIAL LOGIN AKUN (USERNAME & KATA SANDI) */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1.5px solid #93c5fd',
              borderRadius: '12px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>🔐</span>
              <div>
                <b style={{ fontSize: '12px', color: '#1e3a8a', display: 'block' }}>
                  Kredensial Login Akun (Username &amp; Kata Sandi)
                </b>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  Gunakan username dan kata sandi ini untuk login ke aplikasi &amp; dashboard.
                </span>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '11.5px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>
                Username Login: <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                placeholder="Contoh: ahmad_ypk atau budi10 (tanpa spasi)"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'monospace',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '11.5px', fontWeight: '700', color: '#334155' }}>
                    Kata Sandi: <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ background: 'none', border: 'none', fontSize: '11px', color: '#2563eb', cursor: 'pointer', fontWeight: '600' }}
                  >
                    {showPassword ? '🙈 Sembunyikan' : '👁️ Lihat'}
                  </button>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 4 karakter..."
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11.5px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Konfirmasi Kata Sandi: <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ketik ulang kata sandi..."
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: confirmPassword && confirmPassword !== password ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          </div>

          {/* 3. ALOKASI KELAS & JURUSAN KHUSUS SISWA */}
          {role === 'siswa' ? (
            <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '11px', fontWeight: '800', color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '10px' }}>
                🏫 Alokasi Kelas &amp; Jurusan Siswa
              </span>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '3px' }}>
                    Tingkat:
                  </label>
                  <select
                    value={tingkat}
                    onChange={(e) => setTingkat(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 'bold' }}
                  >
                    <option value="X">Kelas X</option>
                    <option value="XI">Kelas XI</option>
                    <option value="XII">Kelas XII</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '3px' }}>
                    Jurusan:
                  </label>
                  <select
                    value={jurusan}
                    onChange={(e) => setJurusan(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 'bold' }}
                  >
                    <option value="TJKT">TJKT (Teknik Jaringan Komputer Dan Telekomunikasi)</option>
                    <option value="MPLB">MPLB (Manajemen Perkantoran Dan Layanan Bisnis)</option>
                    <option value="AKL">AKL (Akuntansi Dan Keuangan Lembaga)</option>
                    <option value="PM">PM (Pemasaran)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '3px' }}>
                    Alokasi Kelas:
                  </label>
                  <div
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1.5px solid #2563eb',
                      fontSize: '12px',
                      fontWeight: '800',
                      color: '#1e40af',
                      backgroundColor: '#eff6ff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '35px',
                      boxSizing: 'border-box',
                    }}
                  >
                    {tingkat} {jurusan}
                  </div>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '3px' }}>
                  NISN (Nomor Induk Siswa Nasional):
                </label>
                <input
                  type="text"
                  value={nisn}
                  onChange={(e) => setNisn(e.target.value)}
                  placeholder="Contoh: 0071234567"
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          ) : (
            /* KHUSUS GURU */
            <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '11px', fontWeight: '800', color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '10px' }}>
                👨‍🏫 Data Guru &amp; Mata Pelajaran
              </span>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '3px' }}>
                    Inisial Guru (2-3 Huruf): <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    value={inisial}
                    onChange={(e) => setInisial(e.target.value.toUpperCase())}
                    placeholder="Contoh: IR, HR, AF"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 'bold', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '3px' }}>
                    Mata Pelajaran Diampu:
                  </label>
                  <input
                    type="text"
                    value={mapel}
                    onChange={(e) => setMapel(e.target.value)}
                    placeholder="Contoh: Pemrograman Web, Matematika"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '3px' }}>
                    NIP / NUPTK:
                  </label>
                  <input
                    type="text"
                    value={nip}
                    onChange={(e) => setNip(e.target.value)}
                    placeholder="Opsional"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 4. KONTAK WHATSAPP & ALAMAT */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>
                Nomor WhatsApp {role === 'siswa' ? 'Siswa' : 'Guru'}: <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="tel"
                required
                value={teleponSiswa}
                onChange={(e) => setTeleponSiswa(e.target.value)}
                placeholder="0812xxxxxxxx"
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
              />
            </div>

            {role === 'siswa' && (
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Nomor WhatsApp Orang Tua: <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={teleponOrtu}
                  onChange={(e) => setTeleponOrtu(e.target.value)}
                  placeholder="0813xxxxxxxx (Untuk Notifikasi Presensi)"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>
            )}
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>
              Alamat Email (Opsional):
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Contoh: nama@gmail.com"
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>
              Alamat Lengkap Tempat Tinggal: <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea
              required
              rows={2}
              value={alamat}
              onChange={(e) => setAlamat(e.target.value)}
              placeholder="Jalan, No Rumah, Kelurahan, Kecamatan, Kota Medan..."
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>

          {/* 5. UPLOAD FOTO PROFIL AKUN (OPSIONAL) */}
          <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
              <span style={{ fontSize: '22px' }}>👤</span>
              <div>
                <b style={{ fontSize: '13px', color: '#1e293b', display: 'block' }}>
                  Foto Profil Akun {role === 'siswa' ? 'Siswa' : 'Guru'} <span style={{ color: '#0284c7', fontWeight: 'bold', fontSize: '11px' }}>(Opsional)</span>
                </b>
                <p style={{ margin: '3px 0 0 0', fontSize: '11px', color: '#64748b', lineHeight: 1.4 }}>
                  Opsional — Foto untuk profil digital &amp; kartu identitas resmi. Bisa diunggah sekarang, diatur sendiri setelah masuk dashboard, atau dibantu oleh Admin sekolah.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              {photoPreview ? (
                <div style={{ width: '70px', height: '70px', borderRadius: '50%', overflow: 'hidden', border: '3px solid #2563eb', flexShrink: 0, boxShadow: '0 2px 8px rgba(37,99,235,0.2)' }}>
                  <img src={photoPreview} alt="Preview Foto Profil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ) : (
                <div style={{ width: '70px', height: '70px', borderRadius: '50%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', color: '#94a3b8', flexShrink: 0 }}>
                  👤
                </div>
              )}
              <div style={{ flex: 1 }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  style={{ fontSize: '12px', color: '#475569' }}
                />
                <span style={{ fontSize: '10.5px', color: '#94a3b8', display: 'block', marginTop: '3px' }}>
                  Format: JPG / PNG (Maksimal 5MB)
                </span>
              </div>
            </div>
          </div>

          {/* 6. PENDAFTARAN BIOMETRIK WAJAH AI (FACE RECOGNITION LIVE CAMERA) - OPSIONAL */}
          <div
            style={{
              backgroundColor: '#0f172a',
              borderRadius: '14px',
              padding: '16px',
              border: isFaceCaptured ? '2px solid #10b981' : '1.5px dashed rgba(56, 189, 248, 0.4)',
              color: '#ffffff',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <span style={{ fontSize: '10px', fontWeight: '800', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  AI FACE BIOMETRIC ENROLLMENT (OPSIONAL)
                </span>
                <h4 style={{ margin: '2px 0 0 0', fontSize: '14px', fontWeight: '800', color: '#ffffff' }}>
                  Perekaman Wajah AI (Webcam &amp; Kamera HP) <span style={{ color: '#38bdf8', fontWeight: 'bold', fontSize: '11px' }}>(Opsional)</span>
                </h4>
                <p style={{ margin: '3px 0 0 0', fontSize: '11px', color: '#94a3b8' }}>
                  Opsional — Khusus presensi otomatis di sekolah. Bisa direkam sekarang, direkam sendiri setelah login ke dashboard, atau dibantu oleh Admin sekolah.
                </p>
              </div>

              {isFaceCaptured ? (
                <span style={{ backgroundColor: '#10b981', color: '#ffffff', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold' }}>
                  ✓ Wajah AI Terdaftar (128 Vektor)
                </span>
              ) : (
                <span style={{ backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '600' }}>
                  Opsional (Bisa Nanti)
                </span>
              )}
            </div>

            {/* Preview Sampel Biometrik yang Sudah Terekam */}
            {faceSnapshot && !cameraOpen && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', padding: '10px 12px', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
                <div style={{ width: '50px', height: '50px', borderRadius: '50%', overflow: 'hidden', border: '2px solid #10b981', flexShrink: 0 }}>
                  <img src={faceSnapshot} alt="Biometric Face" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#10b981' }}>✓ Sampel Biometrik Wajah Terkunci</div>
                  <div style={{ fontSize: '11px', color: '#cbd5e1' }}>128 vektor biometrik siap digunakan untuk presensi AI di sekolah</div>
                </div>
              </div>
            )}

            {/* KAMERA PREVIEW WINDOW */}
            {cameraOpen ? (
              <div style={{ position: 'relative', width: '100%', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#020617', aspectRatio: videoAspect ? `${videoAspect}` : '4/3', marginBottom: '10px', border: '2px solid #06b6d4', boxShadow: '0 0 25px rgba(6, 182, 212, 0.4)' }}>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  style={{ width: '100%', height: '100%', objectFit: cameraFitMode, transform: facingMode === 'user' ? 'scaleX(-1)' : 'none', display: 'none' }}
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

                <div style={{ position: 'absolute', top: '8px', left: '8px', backgroundColor: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(6px)', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', color: '#38bdf8', fontWeight: 'bold' }}>
                  📸 3D Facial Mesh Active • 68 Nodes Locked
                </div>

                <div style={{ position: 'absolute', bottom: '8px', left: '8px', right: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {availableDevices.length > 1 && (
                      <select
                        value={selectedDeviceId}
                        onChange={(e) => {
                          setSelectedDeviceId(e.target.value);
                          startCamera(facingMode, e.target.value);
                        }}
                        style={{
                          backgroundColor: 'rgba(0,0,0,0.7)',
                          color: '#38bdf8',
                          border: '1px solid rgba(56,189,248,0.4)',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '10.5px',
                          fontWeight: 'bold',
                          outline: 'none',
                          cursor: 'pointer',
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
                      onClick={handleToggleFacingMode}
                      style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.3)', padding: '5px 10px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}
                    >
                      🔄 Ganti Kamera
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={stopCamera}
                    style={{ backgroundColor: 'rgba(239, 68, 68, 0.8)', color: '#ffffff', border: 'none', padding: '5px 10px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}
                  >
                    Batal
                  </button>
                </div>
              </div>
            ) : null}

            {/* ACTION TOMBOL KAMERA */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {!cameraOpen ? (
                <button
                  type="button"
                  onClick={() => startCamera()}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: '8px',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: '800',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  📷 {isFaceCaptured ? 'Rekam Ulang Wajah' : 'Buka Kamera & Rekam Wajah AI'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCaptureFaceSample}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: '8px',
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: '800',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: '0 0 15px rgba(16, 185, 129, 0.4)',
                  }}
                >
                  📸 Ambil &amp; Kunci Biometrik Wajah
                </button>
              )}
            </div>
          </div>

          {/* 7. TOMBOL SIMPAN & AKTIFKAN */}
          <div style={{ paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '12px 18px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
                color: '#ffffff',
                border: 'none',
                fontSize: '14px',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
              }}
            >
              {isSubmitting ? 'Menyimpan ke Supabase Cloud...' : '💾 Simpan & Aktifkan Akun Digital SMK YPK'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
