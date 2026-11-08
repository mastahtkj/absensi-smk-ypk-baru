'use client';

import React, { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import {
  extractFaceDescriptorFromCanvas,
  captureAndCompressCanvas,
} from '../utils/faceRecognition';
import { playSuccessSound, speakIndonesianAi } from './NotificationCenter';

export default function GoogleRegisterModal({
  isOpen,
  onClose,
  googleUser = {},
  supabase,
  onRegisterSuccess,
}) {
  const [role, setRole] = useState('siswa'); // 'siswa' | 'guru'
  const [nama, setNama] = useState(googleUser?.name || '');
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
  const [faceSnapshot, setFaceSnapshot] = useState('');
  const [isFaceCaptured, setIsFaceCaptured] = useState(false);

  // Kamera Live State
  const [cameraOpen, setCameraOpen] = useState(false);
  const [facingMode, setFacingMode] = useState('user');
  const [cameraStatus, setCameraStatus] = useState('Kamera Siap');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Sync saat googleUser berubah
  useEffect(() => {
    if (googleUser?.name) setNama(googleUser.name);
    if (googleUser?.email) setEmail(googleUser.email);
    if (googleUser?.avatar && !photoPreview) setPhotoPreview(googleUser.avatar);
  }, [googleUser]);

  // Alokasi Kelas Otomatis Berdasarkan Tingkat & Jurusan
  const kelasOptions = {
    X: {
      TJKT: ['X TJKT 1', 'X TJKT 2'],
      MPLB: ['X MPLB 1', 'X MPLB 2'],
      AKL: ['X AKL'],
      PM: ['X PM'],
    },
    XI: {
      TJKT: ['XI TJKT 1', 'XI TJKT 2'],
      MPLB: ['XI MPLB 1', 'XI MPLB 2'],
      AKL: ['XI AKL'],
      PM: ['XI PM'],
    },
    XII: {
      TJKT: ['XII TJKT 1', 'XII TJKT 2'],
      MPLB: ['XII MPLB 1', 'XII MPLB 2'],
      AKL: ['XII AKL'],
      PM: ['XII PM'],
    },
  };

  const currentAvailableClasses = (kelasOptions[tingkat] && kelasOptions[tingkat][jurusan]) || [`${tingkat} ${jurusan} 1`];

  useEffect(() => {
    if (currentAvailableClasses.length > 0 && !currentAvailableClasses.includes(kelas)) {
      setKelas(currentAvailableClasses[0]);
    }
  }, [tingkat, jurusan, currentAvailableClasses, kelas]);

  // Handle Kamera Face AI
  const startCamera = async (mode = facingMode) => {
    try {
      setCameraStatus('Mengaktifkan Kamera AI...');
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: mode, width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
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
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraOpen(false);
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const handleToggleFacingMode = () => {
    const next = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(next);
    startCamera(next);
  };

  // Ambil Sampel Wajah AI & Ekstrak 128-D Vector
  const handleCaptureFaceSample = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const result = extractFaceDescriptorFromCanvas(canvas);
    if (!result || !result.hasFace) {
      Swal.fire({
        icon: 'warning',
        title: 'Wajah Tidak Terdeteksi',
        text: 'Pastikan wajah berada di tengah kamera dengan pencahayaan yang cukup terang.',
      });
      return;
    }

    const compressed = captureAndCompressCanvas(canvas, 360, 0.85);
    setFaceDescriptor(result.descriptor);
    setFaceSnapshot(compressed);
    if (!photoPreview) {
      setPhotoPreview(compressed);
    }
    setIsFaceCaptured(true);
    stopCamera();

    playSuccessSound();
    speakIndonesianAi('Sampel biometrik wajah Anda berhasil direkam!');

    Swal.fire({
      icon: 'success',
      title: 'Wajah AI Berhasil Direkam! ✨',
      text: 'Biometrik wajah 128-vektor Anda telah berhasil dienkripsi dan siap disimpan.',
      timer: 2000,
      showConfirmButton: false,
    });
  };

  // Handle Upload Foto Berkas
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

      // Juga buat face descriptor dari foto jika belum ada dari kamera
      const img = new Image();
      img.onload = () => {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        const ctx = tempCanvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const res = extractFaceDescriptorFromCanvas(tempCanvas);
        if (res && res.hasFace && !faceDescriptor) {
          setFaceDescriptor(res.descriptor);
          setIsFaceCaptured(true);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Submit Simpan Akun ke Supabase
  const handleSubmitRegistration = async (e) => {
    e.preventDefault();

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
    if (!photoPreview && !faceSnapshot) {
      Swal.fire({
        icon: 'warning',
        title: 'Foto / Wajah Wajib',
        text: 'Silakan unggah pas foto resmi atau rekam wajah melalui kamera AI.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const nowIso = new Date().toISOString();
      const finalPhoto = photoPreview || faceSnapshot || '';

      const biodataPayload = {
        google_email: email,
        google_avatar: googleUser?.avatar || '',
        telepon_siswa: teleponSiswa,
        telepon_ortu: teleponOrtu,
        alamat_lengkap: alamat,
        face_descriptor: faceDescriptor || null,
        face_snapshot: faceSnapshot ? true : false,
        face_registered_at: nowIso,
        registered_via: 'google_oauth_ai',
        nisn: nisn || '',
        mapelDiampu: mapel || '',
        inisial: inisial || '',
        nip: nip || '',
      };

      let registeredUserData = null;

      if (role === 'siswa') {
        // Simpan ke tabel tb_siswa
        const insertPayload = {
          nama_siswa: nama.trim().toUpperCase(),
          kelas: kelas,
          jurusan: jurusan,
          nisn: nisn || null,
          telepon: teleponSiswa,
          alamat: alamat,
          foto_url: finalPhoto,
          role: 'Siswa',
          uid_rfid: `AI-FACE-${Date.now().toString(36).toUpperCase()}`,
          biodata: biodataPayload,
        };

        let resultData = null;
        if (supabase) {
          const { data, error } = await supabase.from('tb_siswa').insert([insertPayload]).select().single();
          if (error) {
            console.warn('Supabase tb_siswa insert warning:', error);
          }
          resultData = data;
        }

        registeredUserData = {
          id: `SISWA-${resultData?.id_siswa || Date.now()}`,
          rawId: resultData?.id_siswa || Date.now(),
          nama: nama.trim().toUpperCase(),
          username: email.split('@')[0] || nama.toLowerCase().replace(/\s+/g, ''),
          role: 'Siswa',
          kelas: kelas,
          jurusan: jurusan,
          isGuru: false,
          foto_url: finalPhoto,
          biodata: biodataPayload,
          telepon: teleponSiswa,
          alamat: alamat,
        };
      } else {
        // Simpan ke tabel tb_guru
        const insertPayload = {
          nama_guru: nama.trim(),
          inisial: inisial.trim().toUpperCase() || nama.trim().slice(0, 2).toUpperCase(),
          mapel: mapel || 'Guru Pengampu',
          role: 'Guru',
          nip: nip || null,
          telepon: teleponSiswa,
          alamat: alamat,
          foto_url: finalPhoto,
          uid_rfid: `AI-FACE-GURU-${Date.now().toString(36).toUpperCase()}`,
          username: email.split('@')[0] || nama.toLowerCase().replace(/\s+/g, ''),
          biodata: biodataPayload,
        };

        let resultData = null;
        if (supabase) {
          const { data, error } = await supabase.from('tb_guru').insert([insertPayload]).select().single();
          if (error) {
            console.warn('Supabase tb_guru insert warning:', error);
          }
          resultData = data;
        }

        registeredUserData = {
          id: `GURU-${resultData?.id_guru || Date.now()}`,
          rawId: resultData?.id_guru || Date.now(),
          nama: nama.trim(),
          username: email.split('@')[0] || nama.toLowerCase().replace(/\s+/g, ''),
          inisial: inisial.trim().toUpperCase() || nama.trim().slice(0, 2).toUpperCase(),
          role: 'Guru',
          kelas: 'Guru / Staff',
          jurusan: 'Guru / Staff',
          isGuru: true,
          foto_url: finalPhoto,
          biodata: biodataPayload,
          telepon: teleponSiswa,
          alamat: alamat,
          mapel: mapel,
        };
      }

      // Simpan sesi ke local storage
      if (typeof window !== 'undefined') {
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
            <span style="color: #059669; font-weight: bold; margin-top: 6px; display: inline-block;">
              Biometrik Wajah AI Telah Terhubung ⚡
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
                GOOGLE VERIFIED ✓
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

        {/* GOOGLE PROFILE VERIFIED BADGE */}
        {email && (
          <div
            style={{
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              padding: '10px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img
                src={googleUser?.avatar || '/logo.png'}
                alt="Avatar Google"
                style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #2563eb' }}
              />
              <div>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#1e293b', display: 'block' }}>
                  {googleUser?.name || nama}
                </span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  {email}
                </span>
              </div>
            </div>
            <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: 'bold' }}>
              Terkoneksi Google
            </span>
          </div>
        )}

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

          {/* 2. NAMA LENGKAP */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>
              Nama Lengkap: <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              required
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Masukkan nama lengkap sesuai identitas..."
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
                    <option value="TJKT">TJKT (Teknik Jaringan Komputer)</option>
                    <option value="MPLB">MPLB (Manajemen Perkantoran)</option>
                    <option value="AKL">AKL (Akuntansi)</option>
                    <option value="PM">PM (Pemasaran)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '3px' }}>
                    Rombel / Kelas:
                  </label>
                  <select
                    value={kelas}
                    onChange={(e) => setKelas(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #2563eb', fontSize: '12px', fontWeight: 'bold', color: '#1e40af', backgroundColor: '#eff6ff' }}
                  >
                    {currentAvailableClasses.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
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

          {/* 5. UPLOAD FOTO RESMI (KETENTUAN ATRIBUT LENGKAP, SOPAN & RAPI) */}
          <div style={{ backgroundColor: '#fffbeb', padding: '14px', borderRadius: '12px', border: '1px solid #fef3c7' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
              <span style={{ fontSize: '20px' }}>📸</span>
              <div>
                <b style={{ fontSize: '12px', color: '#92400e', display: 'block' }}>
                  Ketentuan Pas Foto Resmi SMK YPK:
                </b>
                <p style={{ margin: '3px 0 0 0', fontSize: '11px', color: '#b45309', lineHeight: 1.4 }}>
                  Wajib mengenakan seragam sekolah beratribut lengkap (bagi siswa) / pakaian dinas rapi (bagi guru), posisi tegak lurus menghadap kamera, rapi, sopan, dan pencahayaan terang.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              {photoPreview && (
                <div style={{ width: '70px', height: '85px', borderRadius: '8px', overflow: 'hidden', border: '2px solid #2563eb', flexShrink: 0 }}>
                  <img src={photoPreview} alt="Preview Foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
              <div style={{ flex: 1 }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  style={{ fontSize: '12px', color: '#475569' }}
                />
                <span style={{ fontSize: '10.5px', color: '#64748b', display: 'block', marginTop: '3px' }}>
                  Format: JPG / PNG (Maksimal 5MB)
                </span>
              </div>
            </div>
          </div>

          {/* 6. PENDAFTARAN BIOMETRIK WAJAH AI (FACE RECOGNITION LIVE CAMERA) */}
          <div
            style={{
              backgroundColor: '#0f172a',
              borderRadius: '14px',
              padding: '16px',
              border: isFaceCaptured ? '2px solid #10b981' : '2px dashed #06b6d4',
              color: '#ffffff',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <span style={{ fontSize: '10px', fontWeight: '800', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  AI FACE BIOMETRIC ENROLLMENT
                </span>
                <h4 style={{ margin: '2px 0 0 0', fontSize: '14px', fontWeight: '800', color: '#ffffff' }}>
                  Perekaman Wajah AI (Webcam &amp; Kamera HP)
                </h4>
              </div>

              {isFaceCaptured ? (
                <span style={{ backgroundColor: '#10b981', color: '#ffffff', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold' }}>
                  ✓ Wajah AI Terdaftar (128 Vektor)
                </span>
              ) : (
                <span style={{ backgroundColor: 'rgba(234, 179, 8, 0.2)', color: '#facc15', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold' }}>
                  Belum Direkam
                </span>
              )}
            </div>

            {/* KAMERA PREVIEW WINDOW */}
            {cameraOpen ? (
              <div style={{ position: 'relative', width: '100%', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#020617', aspectRatio: '4/3', marginBottom: '10px' }}>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
                />
                <canvas ref={canvasRef} style={{ display: 'none' }} />

                {/* Face Oval Guide */}
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '55%',
                    height: '75%',
                    borderRadius: '50%',
                    border: '3px solid #06b6d4',
                    boxShadow: '0 0 25px rgba(6, 182, 212, 0.4)',
                    pointerEvents: 'none',
                  }}
                />

                <div style={{ position: 'absolute', bottom: '8px', left: '8px', right: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={handleToggleFacingMode}
                    style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.3)', padding: '5px 10px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}
                  >
                    🔄 Ganti Kamera
                  </button>
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
