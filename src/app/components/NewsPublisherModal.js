'use client';

import React, { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';

export default function NewsPublisherModal({
  isOpen,
  onClose,
  currentUser,
  onPublishNews,
  onUpdateNews,
  editNewsData = null,
}) {
  const [judul, setJudul] = useState('');
  const [kategori, setKategori] = useState('Penting');
  const [targetAudience, setTargetAudience] = useState('Semua');
  const [ringkasan, setRingkasan] = useState('');
  const [konten, setKonten] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [sendNotification, setSendNotification] = useState(true);
  const fileInputRef = useRef(null);

  // Keyboard Escape listener untuk menutup modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    if (editNewsData) {
      setJudul(editNewsData.judul || '');
      setKategori(editNewsData.kategori || 'Penting');
      setTargetAudience(editNewsData.targetAudience || 'Semua');
      setRingkasan(editNewsData.ringkasan || '');
      setKonten(editNewsData.konten || '');
      setImageUrl(editNewsData.gambar_url || editNewsData.imageUrl || '');
      setSendNotification(true);
    } else {
      setJudul('');
      setKategori('Penting');
      setTargetAudience('Semua');
      setRingkasan('');
      setKonten('');
      setImageUrl('');
      setSendNotification(true);
    }
  }, [editNewsData, isOpen]);

  // 🛑 PROTEKSI AKSES: Siswa Biasa & Siswa Admin Dilarang Membuka Editor Berita
  const isSiswaAdminUser = Boolean(
    String(currentUser?.role || '').toLowerCase().includes('siswa_admin') ||
    (String(currentUser?.id).startsWith('SISWA-') && String(currentUser?.role || '').toLowerCase().includes('admin'))
  );
  const isSiswa = Boolean(!currentUser?.isGuru || String(currentUser?.id).startsWith('SISWA-') || isSiswaAdminUser);
  const isMasterIqbalUser = Boolean(
    currentUser?.username?.toLowerCase() === 'iqbal' ||
    currentUser?.nama?.toLowerCase()?.includes('iqbal') ||
    currentUser?.role?.toLowerCase() === 'master'
  );

  // Render check setelah seluruh React Hooks terpanggil secara konsisten
  if (!isOpen || (isSiswa && !isMasterIqbalUser)) return null;

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      Swal.fire('File Terlalu Besar', 'Ukuran gambar maksimal 4 MB.', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!judul.trim() || !konten.trim()) {
      Swal.fire('Form Belum Lengkap', 'Harap isi Judul dan Isi Pengumuman!', 'warning');
      return;
    }

    const badgeColor =
      kategori === 'Penting'
        ? '#ef4444'
        : kategori === 'Akademik'
        ? '#2563eb'
        : kategori === 'Kesiswaan'
        ? '#16a34a'
        : kategori === 'Info Libur'
        ? '#ea580c'
        : '#7c3aed';

    const shouldNotify = Boolean(sendNotification);

    if (editNewsData) {
      const nowIso = new Date().toISOString();
      const todayStr = new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Jakarta',
      });
      const timeStr = new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta',
      }) + ' WIB';

      const updated = {
        ...editNewsData,
        judul: judul.trim(),
        kategori,
        targetAudience,
        ringkasan: ringkasan.trim() || konten.trim().substring(0, 120) + '...',
        konten: konten.trim(),
        gambar_url: imageUrl,
        badgeColor,
        sendNotification: shouldNotify,
        // Jika opsi notifikasi/upload ulang dicentang, segarkan tanggal & jam ke saat ini
        ...(shouldNotify
          ? {
              tanggal: todayStr,
              jam: timeStr,
              created_at: nowIso,
            }
          : {}),
        updated_at: nowIso,
      };

      if (onUpdateNews) onUpdateNews(updated);
      Swal.fire({
        icon: 'success',
        title: shouldNotify ? 'Berita Berhasil Di-Upload Ulang!' : 'Berita Berhasil Diperbarui!',
        text: shouldNotify
          ? `Pengumuman "${updated.judul}" telah di-upload ulang ke puncak beranda dan notifikasi telah dikirimkan ke seluruh ${targetAudience === 'Semua' ? 'siswa & guru' : targetAudience}.`
          : `Pengumuman "${updated.judul}" telah berhasil diperbarui.`,
        timer: 2000,
        showConfirmButton: false,
      });
    } else {
      const newsId = `NEWS-${Date.now()}`;
      const newNews = {
        id: newsId,
        judul: judul.trim(),
        kategori,
        targetAudience,
        ringkasan: ringkasan.trim() || konten.trim().substring(0, 120) + '...',
        konten: konten.trim(),
        gambar_url: imageUrl,
        penulis: currentUser?.nama || 'Admin Master SMK YPK',
        tanggal: new Date().toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          timeZone: 'Asia/Jakarta',
        }),
        jam: new Date().toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Jakarta',
        }) + ' WIB',
        sendNotification: shouldNotify,
        badgeColor,
        created_at: new Date().toISOString(),
      };

      onPublishNews(newNews);
      Swal.fire({
        icon: 'success',
        title: 'Berita Berhasil Diterbitkan!',
        html: `
          <div style="font-size: 13px; text-align: left;">
            <p><b>Judul:</b> ${newNews.judul}</p>
            <p><b>Target:</b> ${newNews.targetAudience}</p>
            ${imageUrl ? '<p style="color: #2563eb; font-weight: bold;">🖼️ Gambar / Poster berhasil disematkan!</p>' : ''}
            <p style="color: #16a34a; font-weight: bold;">🔔 Notifikasi siaran otomatis dikirimkan ke seluruh akun siswa & guru!</p>
          </div>
        `,
      });
    }

    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        overflowY: 'auto',
        padding: 'calc(env(safe-area-inset-top, 0px) + 16px) 12px 24px 12px',
        boxSizing: 'border-box',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          maxWidth: '650px',
          width: '100%',
          maxHeight: 'calc(100dvh - 36px)',
          margin: 'auto 0',
          overflowY: 'auto',
          boxShadow: '0 25px 50px rgba(0,0,0,0.35)',
          border: '1px solid #e2e8f0',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER MODAL */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
            color: '#ffffff',
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>📢</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
                {editNewsData ? 'Edit Berita & Pengumuman Mading' : 'Terbitkan Berita & Mading Digital'}
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#bfdbfe' }}>
                {editNewsData
                  ? 'Perbarui isi berita, gambar poster, atau kategori informasi'
                  : 'Otomatis kirim notifikasi realtime ke lonceng seluruh akun siswa & guru'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.25)',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              color: '#ffffff',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
              touchAction: 'manipulation',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#ef4444')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.25)')}
            title="Tutup Modal"
          >
            ✕
          </button>
        </div>

        {/* FORM BODY */}
        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* JUDUL */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155', display: 'block', marginBottom: '4px' }}>
                Judul Berita / Pengumuman: *
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Jadwal Ujian Penilaian Tengah Semester (PTS) 2026..."
                value={judul}
                onChange={(e) => setJudul(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>

            {/* KATEGORI & TARGET PEMBACA (RESPONSIF MOBILE / DESKTOP) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Kategori Berita:
                </label>
                <select
                  value={kategori}
                  onChange={(e) => setKategori(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    backgroundColor: '#ffffff',
                  }}
                >
                  <option value="Penting">🚨 Penting / Utama</option>
                  <option value="Akademik">📚 Akademik & Kurikulum</option>
                  <option value="Kesiswaan">🎒 Kesiswaan & Ekstra</option>
                  <option value="Info Libur">🏖️ Info Libur / Kalender</option>
                  <option value="Prestasi">🏆 Prestasi & Kejuaraan</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Target Pembaca:
                </label>
                <select
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    backgroundColor: '#ffffff',
                  }}
                >
                  <option value="Semua">🌐 Seluruh Siswa & Guru</option>
                  <option value="Siswa">🧑‍🎓 Khusus Siswa (tb_siswa)</option>
                  <option value="Guru">👨‍🏫 Khusus Guru & Staff (tb_guru)</option>
                  <option value="TJKT">💻 Siswa Jurusan TJKT</option>
                  <option value="AKL">📊 Siswa Jurusan AKL</option>
                  <option value="MPLB">📁 Siswa Jurusan MPLB</option>
                  <option value="PM">🛒 Siswa Jurusan PM</option>
                </select>
              </div>
            </div>

            {/* 🖼️ FITUR UPLOAD / GANTI / HAPUS GAMBAR POSTER MADING */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155', display: 'block', marginBottom: '4px' }}>
                🖼️ Gambar Poster / Foto Berita (Opsional):
              </label>

              {imageUrl ? (
                <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1.5px solid #cbd5e1', marginBottom: '8px', maxHeight: '220px', backgroundColor: '#f8fafc' }}>
                  <img
                    src={imageUrl}
                    alt="Preview Poster"
                    style={{ width: '100%', maxHeight: '220px', objectFit: 'contain', display: 'block' }}
                  />
                  <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        backgroundColor: '#2563eb',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '5px 10px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                      }}
                    >
                      📷 Ganti Gambar
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      style={{
                        backgroundColor: '#ef4444',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '5px 10px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                      }}
                    >
                      🗑️ Hapus
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed #cbd5e1',
                    borderRadius: '12px',
                    padding: '20px',
                    textAlign: 'center',
                    backgroundColor: '#f8fafc',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s ease',
                  }}
                >
                  <span style={{ fontSize: '28px', display: 'block', marginBottom: '4px' }}>📷</span>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#2563eb' }}>
                    Klik untuk Unggah Gambar / Poster Mading
                  </span>
                  <span style={{ fontSize: '10.5px', color: '#94a3b8', display: 'block', marginTop: '2px' }}>
                    Format PNG, JPG, JPEG (Maks. 4 MB)
                  </span>
                </div>
              )}

              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleImageSelect}
                style={{ display: 'none' }}
              />
            </div>

            {/* RINGKASAN */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155', display: 'block', marginBottom: '4px' }}>
                Ringkasan Singkat (Muncul di Kartu Depan):
              </label>
              <input
                type="text"
                placeholder="Ringkasan 1 - 2 kalimat pengumuman..."
                value={ringkasan}
                onChange={(e) => setRingkasan(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '12.5px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* ISI PENGUMUMAN LENGKAP */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155', display: 'block', marginBottom: '4px' }}>
                Isi Pengumuman / Berita Lengkap: *
              </label>
              <textarea
                required
                rows={5}
                placeholder="Tuliskan isi pengumuman lengkap, rincian jadwal, atau instruksi kegiatan..."
                value={konten}
                onChange={(e) => setKonten(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '12.5px',
                  boxSizing: 'border-box',
                  lineHeight: '1.5',
                }}
              />
            </div>

            {/* 🔔 OPSI NOTIFIKASI SIARAN / UPLOAD ULANG */}
            <div
              style={{
                backgroundColor: editNewsData ? '#eff6ff' : '#f8fafc',
                padding: '12px 14px',
                borderRadius: '12px',
                border: editNewsData ? '1.5px solid #bfdbfe' : '1px solid #e2e8f0',
              }}
            >
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#1e3a8a', cursor: 'pointer', margin: 0 }}>
                <input
                  type="checkbox"
                  checked={sendNotification}
                  onChange={(e) => setSendNotification(e.target.checked)}
                  style={{ width: '17px', height: '17px', accentColor: '#2563eb', cursor: 'pointer' }}
                />
                <span style={{ fontWeight: '800' }}>
                  {editNewsData
                    ? '📢 Upload Ulang & Kirim Notifikasi Siaran Baru ke HP Siswa & Guru'
                    : '🔔 Kirim Notifikasi Siaran Instan ke Seluruh Siswa & Guru'}
                </span>
              </label>
              <p style={{ margin: '4px 0 0 25px', fontSize: '11px', color: '#64748b', lineHeight: 1.4 }}>
                {editNewsData
                  ? 'Centang opsi ini untuk menyegarkan tanggal ke hari ini, memindahkan berita ini kembali ke puncak beranda (TERKINI), serta membunyikan nada dan mengirim notifikasi siaran baru ke HP seluruh penerima.'
                  : 'Berita akan langsung memicu notifikasi siaran instan dan bunyi lonceng di perangkat siswa & guru yang dituju.'}
              </p>
            </div>

            {/* ACTIONS */}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px 16px',
                  fontSize: '12.5px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                Batal
              </button>

              {editNewsData ? (
                <>
                  <button
                    type="submit"
                    onClick={() => setSendNotification(false)}
                    style={{
                      backgroundColor: '#f8fafc',
                      color: '#2563eb',
                      border: '1.5px solid #bfdbfe',
                      borderRadius: '10px',
                      padding: '10px 18px',
                      fontSize: '12.5px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                    }}
                    title="Simpan perubahan tanpa membunyikan notifikasi baru"
                  >
                    💾 Simpan Saja
                  </button>
                  <button
                    type="submit"
                    onClick={() => setSendNotification(true)}
                    style={{
                      background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '10px 22px',
                      fontSize: '12.5px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(124, 58, 237, 0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                    title="Upload ulang berita ke puncak beranda & kirim notifikasi siaran baru ke seluruh siswa/guru"
                  >
                    <span>🔁</span>
                    <span>Upload Ulang &amp; Siarkan</span>
                  </button>
                </>
              ) : (
                <button
                  type="submit"
                  style={{
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '10px 22px',
                    fontSize: '12.5px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>📢</span>
                  <span>Terbitkan &amp; Siarkan Sekarang</span>
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
