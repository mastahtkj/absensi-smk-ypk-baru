'use client';

import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { playSuccessSound } from './NotificationCenter';

export default function GoogleRegisterModal({
  isOpen,
  onClose,
  googleUser = {},
  supabase,
  onRegisterSuccess,
  siswaList = [],
}) {
  const [role, setRole] = useState('siswa'); // 'siswa' | 'guru'
  const [nama, setNama] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [tingkat, setTingkat] = useState('X');
  const [jurusan, setJurusan] = useState('TJKT');
  const [kelas, setKelas] = useState('X TJKT');
  const [nisn, setNisn] = useState('');
  const [alamat, setAlamat] = useState('');
  const [teleponSiswa, setTeleponSiswa] = useState('');
  const [teleponOrtu, setTeleponOrtu] = useState('');

  // Form Khusus Guru
  const [mapel, setMapel] = useState('');
  const [inisial, setInisial] = useState('');
  const [nip, setNip] = useState('');

  // Foto Profil
  const [photoPreview, setPhotoPreview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync saat googleUser berubah
  useEffect(() => {
    if (googleUser?.name) setNama(googleUser.name);
    if (googleUser?.email) {
      setEmail(googleUser.email);
      setUsername(googleUser.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, ''));
    }
    if (googleUser?.avatar) setPhotoPreview(googleUser.avatar);
  }, [googleUser]);

  useEffect(() => {
    setKelas(`${tingkat} ${jurusan}`);
  }, [tingkat, jurusan]);

  const handleCustomPhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      Swal.fire({ icon: 'warning', title: 'Ukuran Terlalu Besar', text: 'Maksimal ukuran foto adalah 5 MB.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const cleanU = (username || '').trim().toLowerCase().replace(/\s+/g, '');
    const cleanP = (password || '').trim();

    if (!cleanU || cleanU.length < 3) {
      Swal.fire({ icon: 'warning', title: 'Username Tidak Valid', text: 'Username minimal 3 karakter tanpa spasi.' });
      return;
    }

    const isDuplicate = (siswaList || []).some((u) => {
      const existingU = (u.username || u.biodata?.username || '').toLowerCase().trim();
      return existingU && existingU === cleanU;
    });

    if (isDuplicate) {
      Swal.fire({ icon: 'warning', title: 'Username Terpakai', text: `Username "${cleanU}" telah digunakan. Silakan pilih username lain.` });
      return;
    }

    if (!cleanP || cleanP.length < 4) {
      Swal.fire({ icon: 'warning', title: 'Kata Sandi Minimal 4 Karakter', text: 'Silakan isi kata sandi minimal 4 karakter.' });
      return;
    }

    if (cleanP !== (confirmPassword || '').trim()) {
      Swal.fire({ icon: 'warning', title: 'Kata Sandi Tidak Cocok', text: 'Konfirmasi kata sandi tidak cocok.' });
      return;
    }

    if (!nama.trim()) {
      Swal.fire({ icon: 'warning', title: 'Nama Wajib Diisi', text: 'Silakan isi nama lengkap.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const nowIso = new Date().toISOString();
      const finalPhoto = photoPreview || googleUser?.avatar || '/logo.png';

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
        foto_url: finalPhoto,
        foto_profil: finalPhoto,
        nisn: nisn || '',
        mapelDiampu: mapel || '',
        inisial: inisial || '',
        nip: nip || '',
      };

      let registeredUser = null;

      if (role === 'siswa') {
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
          role: 'Siswa',
          biodata: biodataPayload,
        };

        if (supabase) {
          const { data, error } = await supabase
            .from('tb_siswa')
            .insert([insertPayload])
            .select()
            .single();

          if (!error && data) {
            registeredUser = {
              id: `SISWA-${data.id_siswa}`,
              rawId: data.id_siswa,
              nama: data.nama_siswa,
              username: cleanU,
              kelas: data.kelas,
              jurusan: data.jurusan,
              role: 'Siswa',
              isGuru: false,
              foto_url: finalPhoto,
              biodata: biodataPayload,
            };
          }
        }

        if (!registeredUser) {
          registeredUser = {
            id: `SISWA-${Date.now()}`,
            rawId: Date.now(),
            nama: nama.trim().toUpperCase(),
            username: cleanU,
            kelas: kelas,
            jurusan: jurusan,
            role: 'Siswa',
            isGuru: false,
            foto_url: finalPhoto,
            biodata: biodataPayload,
          };
        }
      } else {
        const insertPayload = {
          nama_guru: nama.trim(),
          username: cleanU,
          password: cleanP,
          role: 'Guru',
          mapel: mapel || 'Mata Pelajaran Umum',
          inisial: inisial ? inisial.toUpperCase() : 'GR',
          nip: nip || '-',
          telepon: teleponSiswa,
          alamat: alamat,
          foto_url: finalPhoto,
          biodata: biodataPayload,
        };

        if (supabase) {
          const { data, error } = await supabase
            .from('tb_guru')
            .insert([insertPayload])
            .select()
            .single();

          if (!error && data) {
            registeredUser = {
              id: `GURU-${data.id_guru}`,
              rawId: data.id_guru,
              nama: data.nama_guru,
              username: cleanU,
              role: 'Guru',
              isGuru: true,
              foto_url: finalPhoto,
              mapel: data.mapel,
              inisial: data.inisial,
              biodata: biodataPayload,
            };
          }
        }

        if (!registeredUser) {
          registeredUser = {
            id: `GURU-${Date.now()}`,
            rawId: Date.now(),
            nama: nama.trim(),
            username: cleanU,
            role: 'Guru',
            isGuru: true,
            foto_url: finalPhoto,
            mapel: mapel || 'Mata Pelajaran Umum',
            inisial: inisial ? inisial.toUpperCase() : 'GR',
            biodata: biodataPayload,
          };
        }
      }

      playSuccessSound();
      await Swal.fire({
        icon: 'success',
        title: 'Pendaftaran Berhasil! 🎉',
        html: `Akun <b>${registeredUser.nama}</b> berhasil didaftarkan.<br/>Selamat datang di SMK YPK SUPER APP!`,
        timer: 2000,
        showConfirmButton: false,
      });

      if (onRegisterSuccess) onRegisterSuccess(registeredUser);
      if (onClose) onClose();
    } catch (err) {
      console.error('Registration error:', err);
      Swal.fire({ icon: 'error', title: 'Pendaftaran Gagal', text: err.message || 'Terjadi kesalahan sistem.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
        }}
      >
        {/* HEADER */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)',
            padding: '20px 24px',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>
              👤 Pendaftaran Akun Google
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#bfdbfe' }}>
              Lengkapi identitas untuk mengaktifkan akun SMK YPK Anda
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              color: '#ffffff',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              fontSize: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* FORM BODY */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', maxHeight: '80vh', overflowY: 'auto' }}>
          {/* PILIH ROLE */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>
              Daftar Sebagai:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setRole('siswa')}
                style={{
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: role === 'siswa' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                  backgroundColor: role === 'siswa' ? '#eff6ff' : '#ffffff',
                  color: role === 'siswa' ? '#1d4ed8' : '#64748b',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                🎒 Siswa / Siswi
              </button>
              <button
                type="button"
                onClick={() => setRole('guru')}
                style={{
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: role === 'guru' ? '2px solid #16a34a' : '1px solid #cbd5e1',
                  backgroundColor: role === 'guru' ? '#f0fdf4' : '#ffffff',
                  color: role === 'guru' ? '#15803d' : '#64748b',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                👨‍🏫 Guru / Pegawai
              </button>
            </div>
          </div>

          {/* FOTO PROFIL */}
          <div style={{ marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '14px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
            <img
              src={photoPreview || '/logo.png'}
              alt="Avatar"
              style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #2563eb' }}
            />
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#1e293b', display: 'block' }}>Foto Profil</span>
              <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '6px' }}>Terhubung dari akun Google Anda</span>
              <label style={{ display: 'inline-block', fontSize: '11px', color: '#2563eb', fontWeight: '700', cursor: 'pointer', textDecoration: 'underline' }}>
                Ganti Foto
                <input type="file" accept="image/*" onChange={handleCustomPhotoSelect} style={{ display: 'none' }} />
              </label>
            </div>
          </div>

          {/* NAMA LENGKAP */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
              Nama Lengkap:
            </label>
            <input
              type="text"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              required
              style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
            />
          </div>

          {/* USERNAME & PASSWORD */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                Username:
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                required
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                Kata Sandi:
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 4 karakter"
                required
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
              Konfirmasi Kata Sandi:
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ulangi kata sandi"
              required
              style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
            />
          </div>

          {/* FIELD KHUSUS SISWA */}
          {role === 'siswa' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Tingkat Kelas:
                  </label>
                  <select
                    value={tingkat}
                    onChange={(e) => setTingkat(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff' }}
                  >
                    <option value="X">Kelas X</option>
                    <option value="XI">Kelas XI</option>
                    <option value="XII">Kelas XII</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Jurusan:
                  </label>
                  <select
                    value={jurusan}
                    onChange={(e) => setJurusan(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff' }}
                  >
                    <option value="TJKT">Teknik Komputer &amp; Jaringan (TJKT)</option>
                    <option value="AKL">Akuntansi (AKL)</option>
                    <option value="MPLB">Manajemen Perkantoran (MPLB)</option>
                    <option value="PM">Pemasaran (PM)</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  NISN (Opsional):
                </label>
                <input
                  type="text"
                  value={nisn}
                  onChange={(e) => setNisn(e.target.value)}
                  placeholder="Nomor Induk Siswa Nasional"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    No. WhatsApp Siswa:
                  </label>
                  <input
                    type="tel"
                    value={teleponSiswa}
                    onChange={(e) => setTeleponSiswa(e.target.value)}
                    placeholder="08xxxxxxxxxx"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    No. WhatsApp Orang Tua:
                  </label>
                  <input
                    type="tel"
                    value={teleponOrtu}
                    onChange={(e) => setTeleponOrtu(e.target.value)}
                    placeholder="08xxxxxxxxxx"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                  />
                </div>
              </div>
            </>
          )}

          {/* FIELD KHUSUS GURU */}
          {role === 'guru' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Mata Pelajaran Diampu:
                  </label>
                  <input
                    type="text"
                    value={mapel}
                    onChange={(e) => setMapel(e.target.value)}
                    placeholder="Contoh: Matematika"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Inisial Guru:
                  </label>
                  <input
                    type="text"
                    value={inisial}
                    onChange={(e) => setInisial(e.target.value.toUpperCase())}
                    placeholder="Contoh: IR"
                    maxLength={4}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  No. WhatsApp Guru:
                </label>
                <input
                  type="tel"
                  value={teleponSiswa}
                  onChange={(e) => setTeleponSiswa(e.target.value)}
                  placeholder="08xxxxxxxxxx"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                />
              </div>
            </>
          )}

          {/* ALAMAT */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
              Alamat Lengkap:
            </label>
            <textarea
              rows={2}
              value={alamat}
              onChange={(e) => setAlamat(e.target.value)}
              placeholder="Alamat tempat tinggal..."
              style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', resize: 'vertical' }}
            />
          </div>

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: '13px',
              backgroundColor: '#1e40af',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: '800',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.7 : 1,
              boxShadow: '0 4px 12px rgba(30, 64, 175, 0.25)',
            }}
          >
            {isSubmitting ? 'Mendaftarkan Akun...' : '🚀 Selesaikan Pendaftaran & Masuk'}
          </button>
        </form>
      </div>
    </div>
  );
}
