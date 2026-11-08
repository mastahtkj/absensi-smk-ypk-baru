'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Swal from 'sweetalert2';
import {
  extractFaceDescriptorFromCanvas,
  captureAndCompressCanvas,
} from '../utils/faceRecognition';
import { playSuccessSound, speakIndonesianAi } from './NotificationCenter';

export default function FaceRegisterManagerModal({
  isOpen,
  onClose,
  siswaList = [],
  setSiswaList,
  supabase,
  currentUser,
}) {
  const [filterRole, setFilterRole] = useState('siswa'); // 'siswa' | 'guru'
  const [filterTingkat, setFilterTingkat] = useState('semua');
  const [filterJurusan, setFilterJurusan] = useState('semua');
  const [filterKelas, setFilterKelas] = useState('semua');
  const [searchQuery, setSearchQuery] = useState('');

  // Target yang sedang direkam wajahnya
  const [activeTarget, setActiveTarget] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState('user');
  const [cameraStatus, setCameraStatus] = useState('Arahkan wajah ke lingkaran');
  const [isProcessing, setIsProcessing] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

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
  const startCamera = async (target, mode = facingMode) => {
    setActiveTarget(target);
    setCameraStatus('Mengakses Kamera...');
    try {
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
      setCameraActive(true);
      setCameraStatus(`Merekam Wajah: ${target.nama}`);
    } catch (err) {
      console.error('Camera error:', err);
      Swal.fire({ icon: 'error', title: 'Gagal Akses Kamera', text: err.message });
      setCameraStatus('Gagal Mengakses Kamera');
      setActiveTarget(null);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setActiveTarget(null);
  };

  useEffect(() => {
    if (!isOpen) stopCamera();
  }, [isOpen]);

  // Ambil & Simpan Biometrik Wajah ke Database Supabase
  const handleCaptureAndSaveFace = async () => {
    if (!activeTarget || isProcessing) return;
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
        text: 'Pastikan wajah berada di tengah lingkaran dengan pencahayaan yang cukup.',
      });
      return;
    }

    setIsProcessing(true);
    try {
      const compressedPhoto = captureAndCompressCanvas(canvas, 360, 0.85);
      const isGuru = Boolean(activeTarget.isGuru || String(activeTarget.id).startsWith('GURU-'));
      const targetDbId = activeTarget.rawId || String(activeTarget.id).replace(/\D/g, '');

      const currentBiodata = activeTarget.biodata || {};
      const updatedBiodata = {
        ...currentBiodata,
        face_descriptor: result.descriptor,
        face_photo_url: compressedPhoto,
        face_registered_at: new Date().toISOString(),
      };

      if (supabase) {
        if (isGuru) {
          await supabase
            .from('tb_guru')
            .update({
              foto_url: compressedPhoto,
              biodata: updatedBiodata,
              foto_updated_at: new Date().toISOString(),
            })
            .eq('id_guru', targetDbId);
        } else {
          await supabase
            .from('tb_siswa')
            .update({
              foto_url: compressedPhoto,
              biodata: updatedBiodata,
              foto_updated_at: new Date().toISOString(),
            })
            .eq('id_siswa', targetDbId);
        }
      }

      // Optimistic state update
      if (setSiswaList) {
        setSiswaList((prev) =>
          prev.map((s) => {
            const isMatch = isGuru
              ? s.isGuru && (s.rawId === targetDbId || s.id === activeTarget.id)
              : !s.isGuru && (s.rawId === targetDbId || s.id === activeTarget.id);

            return isMatch
              ? {
                  ...s,
                  foto_url: compressedPhoto,
                  face_descriptor: result.descriptor,
                  biodata: updatedBiodata,
                }
              : s;
          })
        );
      }

      playSuccessSound();
      speakIndonesianAi(`Wajah ${activeTarget.nama} berhasil didaftarkan!`);

      Swal.fire({
        icon: 'success',
        title: 'Wajah Terdaftar! 🎉',
        text: `Biometrik wajah untuk ${activeTarget.nama} (${activeTarget.kelas || 'Guru'}) berhasil disimpan ke cloud database.`,
        timer: 2000,
        showConfirmButton: false,
      });

      stopCamera();
    } catch (err) {
      console.error('Save face error:', err);
      Swal.fire({ icon: 'error', title: 'Gagal Menyimpan Wajah', text: err.message });
    } finally {
      setIsProcessing(false);
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
                ADMINISTRASI BIOMETRIK
              </span>
              <span style={{ fontSize: '11px', fontWeight: 'bold', backgroundColor: '#10b981', color: '#ffffff', padding: '3px 8px', borderRadius: '12px' }}>
                {registeredCount} / {filteredUsers.length} Wajah Terdaftar
              </span>
            </div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>
              Pusat Manajemen Perekaman Wajah AI
            </h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#cbd5e1' }}>
              Daftarkan dan perbarui sampel biometrik AI siswa dan bapak/ibu guru SMK YPK Medan
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
        {!cameraActive && currentUser && (
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
              <span>Rekam / Perbarui Wajah Saya</span>
            </button>
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
            <div style={{ width: '100%', maxWidth: '420px', position: 'relative', aspectRatio: '4/3', borderRadius: '14px', overflow: 'hidden', backgroundColor: '#000000', marginBottom: '10px' }}>
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />

              {/* OVAL GUIDE */}
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '56%',
                  height: '76%',
                  borderRadius: '50%',
                  border: '3px solid #06b6d4',
                  boxShadow: '0 0 25px rgba(6, 182, 212, 0.45)',
                  pointerEvents: 'none',
                }}
              />

              <div style={{ position: 'absolute', top: '10px', left: '10px', backgroundColor: 'rgba(0,0,0,0.6)', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', color: '#38bdf8', fontWeight: 'bold' }}>
                Target: {activeTarget.nama}
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

        {/* CONTROLS & FILTER BAR */}
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
              const photo = item.foto_url || item.biodata?.face_photo_url || '/logo.png';

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
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
