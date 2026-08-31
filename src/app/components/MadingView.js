'use client';

import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

export default function MadingView({
  schoolNewsList = [],
  onOpenNewsPublisher,
  onEditNews,
  onDeleteNews,
  currentUser,
  isMasterIqbal,
  isSiswaAdmin,
  isRestrictedGuru,
}) {
  const [activeTab, setActiveTab] = useState('berita');
  const [selectedNews, setSelectedNews] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // 🔒 HAK AKSES KHUSUS: HANYA ADMIN MASTER & GURU ADMIN YANG DAPAT MEMBUAT/MENGEDIT/MENGHAPUS BERITA & AGENDA (SISWA HANYA LIHAT)
  const isSiswaAdminUser = Boolean(
    String(currentUser?.role || '').toLowerCase().includes('siswa_admin') ||
    (String(currentUser?.id).startsWith('SISWA-') && String(currentUser?.role || '').toLowerCase().includes('admin'))
  );
  const isSiswa = Boolean(!currentUser?.isGuru || String(currentUser?.id).startsWith('SISWA-') || isSiswaAdminUser);
  const isMasterIqbalUser = Boolean(
    isMasterIqbal ||
    currentUser?.username?.toLowerCase() === 'iqbal' ||
    currentUser?.nama?.toLowerCase()?.includes('iqbal') ||
    currentUser?.role?.toLowerCase() === 'master'
  );
  const isGuruAdmin = Boolean(!isSiswa && currentUser?.isGuru && (currentUser?.role?.toLowerCase() === 'admin' || currentUser?.role?.toLowerCase() === 'master'));
  const canManageMading = !isSiswa && (isMasterIqbalUser || isGuruAdmin || (currentUser?.isGuru && !isRestrictedGuru));

  // 📅 DEFAULT AGENDA SEKOLAH (Dikosongkan secara default agar hanya agenda resmi yang terbit yang muncul)
  const DEFAULT_AGENDA = [];

  // 💾 STATE KALENDER & AGENDA (PERSISTENSI LOCALSTORAGE & REALTIME)
  const [agendaList, setAgendaList] = useState([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('smk_ypk_school_agenda');
        if (saved !== null) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setAgendaList(parsed);
          }
        }
      } catch (e) {}
    }
  }, []);

  const saveAgendaList = (newList) => {
    setAgendaList(newList);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('smk_ypk_school_agenda', JSON.stringify(newList));
      } catch (e) {}
    }
  };

  // 📝 STATE MODAL TAMBAH / EDIT AGENDA
  const [showAgendaModal, setShowAgendaModal] = useState(false);
  const [editingAgenda, setEditingAgenda] = useState(null);
  const [formEvent, setFormEvent] = useState('');
  const [formTanggal, setFormTanggal] = useState('');
  const [formTipe, setFormTipe] = useState('Ujian CBT');
  const [formStatus, setFormStatus] = useState('Terjadwal');
  const [formBadgeColor, setFormBadgeColor] = useState('#2563eb');

  const openAddAgendaModal = () => {
    setEditingAgenda(null);
    setFormEvent('');
    setFormTanggal('');
    setFormTipe('Ujian CBT');
    setFormStatus('Terjadwal');
    setFormBadgeColor('#2563eb');
    setShowAgendaModal(true);
  };

  const openEditAgendaModal = (ag) => {
    setEditingAgenda(ag);
    setFormEvent(ag.event || '');
    setFormTanggal(ag.tanggal || '');
    setFormTipe(ag.tipe || 'Ujian CBT');
    setFormStatus(ag.status || 'Terjadwal');
    setFormBadgeColor(ag.badgeColor || '#2563eb');
    setShowAgendaModal(true);
  };

  const handleSaveAgenda = (e) => {
    e.preventDefault();
    if (!formEvent.trim() || !formTanggal.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Form Belum Lengkap',
        text: 'Silakan isi nama agenda / event dan tanggal kegiatannya.',
      });
      return;
    }

    if (editingAgenda) {
      // Mode Edit
      const updated = agendaList.map((item) => {
        if (item.id === editingAgenda.id) {
          return {
            ...item,
            event: formEvent.trim(),
            tanggal: formTanggal.trim(),
            tipe: formTipe,
            status: formStatus,
            badgeColor: formBadgeColor,
          };
        }
        return item;
      });
      saveAgendaList(updated);
      setShowAgendaModal(false);
      Swal.fire({
        icon: 'success',
        title: 'Agenda Diperbarui!',
        text: `Agenda "${formEvent}" berhasil diubah.`,
        timer: 1500,
        showConfirmButton: false,
      });
    } else {
      // Mode Tambah
      const newAgenda = {
        id: `AG-${Date.now()}`,
        event: formEvent.trim(),
        tanggal: formTanggal.trim(),
        tipe: formTipe,
        status: formStatus,
        badgeColor: formBadgeColor,
      };
      const updated = [newAgenda, ...agendaList];
      saveAgendaList(updated);
      setShowAgendaModal(false);
      Swal.fire({
        icon: 'success',
        title: 'Agenda Ditambahkan!',
        text: `Agenda "${formEvent}" berhasil diterbitkan ke kalender sekolah.`,
        timer: 1500,
        showConfirmButton: false,
      });
    }
  };

  const handleDeleteAgenda = async (ag) => {
    if (!canManageMading) return;

    const result = await Swal.fire({
      title: 'Hapus Agenda Sekolah?',
      html: `<p>Agenda <b>"${ag.event}"</b> (${ag.tanggal}) akan dihapus dari kalender.</p>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus Agenda',
      cancelButtonText: 'Batal',
    });

    if (result.isConfirmed) {
      const updated = agendaList.filter((item) => item.id !== ag.id);
      saveAgendaList(updated);
      Swal.fire({
        icon: 'success',
        title: 'Agenda Dihapus!',
        text: 'Agenda telah dihapus dari kalender.',
        timer: 1500,
        showConfirmButton: false,
      });
    }
  };

  const filteredNews = schoolNewsList.filter((item) => {
    // 🔒 Filter Hak Akses Berita Berdasarkan Target Pembaca (Database Role):
    const target = String(item.targetAudience || 'Semua');
    
    // 1. Jika Target "Khusus Guru", Siswa (tb_siswa) DILARANG melihat
    if (target === 'Guru' && isSiswa && !isMasterIqbalUser) {
      return false;
    }
    // 2. Jika Target "Khusus Siswa", Guru non-admin tidak melihat (kecuali Admin/Master untuk moderasi)
    if (target === 'Siswa' && !isSiswa && !canManageMading) {
      return false;
    }
    // 3. Jika Target Jurusan Spesifik (TJKT, AKL, MPLB, PM)
    if (isSiswa && (target === 'TJKT' || target === 'AKL' || target === 'MPLB' || target === 'PM')) {
      const userKelas = String(currentUser?.kelas || '').toUpperCase();
      if (!userKelas.includes(target)) return false;
    }

    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      item.judul?.toLowerCase().includes(q) ||
      item.konten?.toLowerCase().includes(q) ||
      item.penulis?.toLowerCase().includes(q) ||
      item.kategori?.toLowerCase().includes(q)
    );
  });

  const handleDelete = async (newsItem) => {
    if (!canManageMading) return;

    const result = await Swal.fire({
      title: 'Hapus Berita Mading?',
      html: `
        <div style="font-size: 13px; text-align: left;">
          <p>Berita <b>"${newsItem.judul}"</b> akan dihapus dari Mading Digital.</p>
          <p style="color: #ef4444; font-weight: bold;">🗑️ Seluruh notifikasi terkait berita ini di lonceng siswa & guru akan otomatis terhapus!</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus & Tarik Notifikasi',
      cancelButtonText: 'Batal',
    });

    if (result.isConfirmed) {
      if (onDeleteNews) {
        onDeleteNews(newsItem.id);
      }
      if (selectedNews?.id === newsItem.id) {
        setSelectedNews(null);
      }
      Swal.fire({
        icon: 'success',
        title: 'Berita & Notifikasi Dihapus!',
        text: 'Berita telah dihapus dan notifikasinya telah dibersihkan secara otomatis.',
        timer: 1800,
        showConfirmButton: false,
      });
    }
  };

  return (
    <div style={{ padding: '4px 0 60px 0', maxWidth: '1100px', margin: '0 auto' }}>
      {/* 🌟 BANNER MADING & AGENDA DIGITAL */}
      <div
        style={{
          background: 'linear-gradient(135deg, #be123c 0%, #e11d48 50%, #f43f5e 100%)',
          borderRadius: '18px',
          padding: '20px 18px',
          color: '#ffffff',
          boxShadow: '0 8px 24px rgba(225, 29, 72, 0.25)',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <span style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.8px', backgroundColor: 'rgba(255, 255, 255, 0.2)', padding: '2px 8px', borderRadius: '12px' }}>
                📰 MADING &amp; AGENDA DIGITAL
              </span>
              <span style={{ fontSize: '10px', backgroundColor: '#10b981', color: '#ffffff', fontWeight: 'bold', padding: '2px 8px', borderRadius: '12px' }}>
                🟢 Realtime
              </span>
            </div>
            <h1 style={{ margin: '4px 0', fontSize: '19px', fontWeight: '800' }}>
              Papan Informasi &amp; Berita Resmi SMK YPK
            </h1>
            <p style={{ margin: 0, fontSize: '12px', color: '#ffe4e6', lineHeight: 1.4 }}>
              {canManageMading
                ? 'Pusat publikasi pengumuman kurikulum, jadwal agenda akademik, dan foto poster mading sekolah.'
                : 'Papan pengumuman resmi dan jadwal agenda akademik sekolah SMK YPK Medan.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* ➕ TOMBOL TAMBAH BERITA (HANYA GURU ADMIN & MASTER) */}
            {canManageMading && activeTab === 'berita' && onOpenNewsPublisher && (
              <button
                type="button"
                onClick={onOpenNewsPublisher}
                style={{
                  backgroundColor: '#ffffff',
                  color: '#be123c',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '9px 16px',
                  fontSize: '12.5px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>➕</span>
                <span>Terbitkan Berita Baru</span>
              </button>
            )}

            {/* ➕ TOMBOL TAMBAH AGENDA (HANYA GURU ADMIN & MASTER) */}
            {canManageMading && activeTab === 'agenda' && (
              <button
                type="button"
                onClick={openAddAgendaModal}
                style={{
                  backgroundColor: '#ffffff',
                  color: '#be123c',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '9px 16px',
                  fontSize: '12.5px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>➕</span>
                <span>Tambah Agenda Baru</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 📑 TABS UTAMA: BERITA & PENGUMUMAN vs KALENDER & AGENDA */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setActiveTab('berita')}
          style={{
            flex: '1 1 auto',
            minWidth: '150px',
            padding: '10px 16px',
            borderRadius: '12px',
            border: activeTab === 'berita' ? '2px solid #e11d48' : '1px solid #cbd5e1',
            backgroundColor: activeTab === 'berita' ? '#fff1f2' : '#ffffff',
            color: activeTab === 'berita' ? '#be123c' : '#475569',
            fontWeight: '800',
            fontSize: '13px',
            cursor: 'pointer',
            boxShadow: activeTab === 'berita' ? '0 2px 8px rgba(225, 29, 72, 0.15)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <span>📢</span>
          <span>Berita &amp; Pengumuman ({schoolNewsList.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('agenda')}
          style={{
            flex: '1 1 auto',
            minWidth: '150px',
            padding: '10px 16px',
            borderRadius: '12px',
            border: activeTab === 'agenda' ? '2px solid #e11d48' : '1px solid #cbd5e1',
            backgroundColor: activeTab === 'agenda' ? '#fff1f2' : '#ffffff',
            color: activeTab === 'agenda' ? '#be123c' : '#475569',
            fontWeight: '800',
            fontSize: '13px',
            cursor: 'pointer',
            boxShadow: activeTab === 'agenda' ? '0 2px 8px rgba(225, 29, 72, 0.15)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <span>📅</span>
          <span>Kalender &amp; Agenda ({agendaList.length})</span>
        </button>
      </div>

      {/* 🔍 KONTEN TAB 1: BERITA & PENGUMUMAN */}
      {activeTab === 'berita' && (
        <div>
          {/* SEARCH BAR */}
          <div style={{ marginBottom: '14px' }}>
            <input
              type="text"
              placeholder="🔍 Cari pengumuman, agenda, atau penulis..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 16px',
                borderRadius: '12px',
                border: '1.5px solid #cbd5e1',
                fontSize: '13px',
                backgroundColor: '#ffffff',
                outline: 'none',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
              }}
            />
          </div>

          {/* 🖼️ GRID KARTU MADING */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '16px' }}>
            {filteredNews.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 20px', color: '#94a3b8', gridColumn: '1 / -1', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '40px', marginBottom: '8px' }}>📭</div>
                <h4 style={{ margin: '0 0 4px 0', color: '#475569', fontSize: '15px' }}>Belum Ada Berita</h4>
                <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
                  {canManageMading ? 'Klik "+ Terbitkan Berita Baru" untuk membuat pengumuman baru.' : 'Belum ada pengumuman yang diterbitkan saat ini.'}
                </p>
              </div>
            ) : (
              filteredNews.map((item) => {
                const img = item.gambar_url || item.imageUrl || item.foto_url;
                return (
                  <div
                    key={item.id}
                    className="stardust-white-card"
                    style={{
                      borderRadius: '16px',
                      padding: '16px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
                      borderTop: `4px solid ${item.badgeColor || '#e11d48'}`,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                    }}
                  >
                    <div>
                      {img && (
                        <div
                          onClick={() => setSelectedNews(item)}
                          style={{
                            width: '100%',
                            height: '165px',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            marginBottom: '12px',
                            backgroundColor: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            cursor: 'pointer',
                            position: 'relative',
                          }}
                          title="Klik untuk memperbesar gambar &amp; baca pengumuman"
                        >
                          <img
                            src={img}
                            alt={item.judul}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          />
                          <span
                            style={{
                              position: 'absolute',
                              bottom: '6px',
                              right: '6px',
                              backgroundColor: 'rgba(0,0,0,0.65)',
                              color: '#ffffff',
                              fontSize: '9.5px',
                              padding: '2px 7px',
                              borderRadius: '6px',
                              fontWeight: 'bold',
                            }}
                          >
                            🔍 Perbesar
                          </span>
                        </div>
                      )}

                      {/* BADGE KATEGORI & TANGGAL */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span
                          style={{
                            fontSize: '10.5px',
                            fontWeight: '800',
                            backgroundColor: '#f1f5f9',
                            color: item.badgeColor || '#334155',
                            padding: '3px 9px',
                            borderRadius: '8px',
                            border: `1px solid ${item.badgeColor ? `${item.badgeColor}33` : '#cbd5e1'}`,
                          }}
                        >
                          📌 {item.kategori || 'Pengumuman'}
                        </span>
                        <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600' }}>
                          {item.tanggal || 'Hari Ini'}
                        </span>
                      </div>

                      {/* JUDUL */}
                      <h3
                        onClick={() => setSelectedNews(item)}
                        style={{
                          margin: '6px 0 8px 0',
                          fontSize: '14.5px',
                          color: '#0f172a',
                          fontWeight: '800',
                          lineHeight: '1.35',
                          cursor: 'pointer',
                        }}
                      >
                        {item.judul}
                      </h3>

                      {/* RINGKASAN */}
                      <p
                        style={{
                          margin: 0,
                          fontSize: '12px',
                          color: '#475569',
                          lineHeight: '1.5',
                          display: '-webkit-box',
                          WebkitLineClamp: img ? 2 : 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {item.ringkasan || item.konten}
                      </p>
                    </div>

                    {/* FOOTER KARTU & TOMBOL AKSI */}
                    <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>
                        ✍️ <b>{item.penulis || 'Admin SMK YPK'}</b>
                      </span>

                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {/* 🛠️ TOMBOL EDIT & HAPUS HANYA UNTUK ADMIN MASTER / GURU ADMIN */}
                        {canManageMading && (
                          <>
                            <button
                              type="button"
                              onClick={() => onEditNews && onEditNews(item)}
                              style={{
                                backgroundColor: '#f1f5f9',
                                color: '#2563eb',
                                border: '1px solid #bfdbfe',
                                borderRadius: '8px',
                                padding: '5px 8px',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                              }}
                              title="Edit Berita & Gambar"
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(item)}
                              style={{
                                backgroundColor: '#fef2f2',
                                color: '#ef4444',
                                border: '1px solid #fca5a5',
                                borderRadius: '8px',
                                padding: '5px 8px',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                              }}
                              title="Hapus Berita & Tarik Notifikasi"
                            >
                              🗑️
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={() => setSelectedNews(item)}
                          style={{
                            backgroundColor: '#e11d48',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '6px 12px',
                            fontSize: '11.5px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <span>Baca</span>
                          <span>➔</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 📅 KONTEN TAB 2: KALENDER & AGENDA AKADEMIK (GURU ADMIN BISA BUAT, EDIT & HAPUS) */}
      {activeTab === 'agenda' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '18px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
              🗓️ Agenda &amp; Kalender Akademik Resmi
            </h3>
            {canManageMading && (
              <button
                type="button"
                onClick={openAddAgendaModal}
                style={{
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '7px 14px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>➕</span>
                <span>Tambah Agenda</span>
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {agendaList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 20px', backgroundColor: '#f8fafc', borderRadius: '14px', border: '1.5px dashed #cbd5e1' }}>
                <div style={{ fontSize: '38px', marginBottom: '8px' }}>📅</div>
                <h4 style={{ margin: '0 0 6px 0', color: '#334155', fontSize: '15px', fontWeight: '800' }}>
                  Belum Ada Agenda Akademik
                </h4>
                <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b', maxWidth: '440px', margin: '0 auto', lineHeight: 1.5 }}>
                  {canManageMading
                    ? 'Kalender akademik saat ini kosong. Silakan klik tombol "+ Tambah Agenda" di atas untuk membuat jadwal kegiatan atau ujian baru.'
                    : 'Belum ada agenda kegiatan atau jadwal akademik resmi yang dijadwalkan oleh Bapak/Ibu Guru & Admin.'}
                </p>
              </div>
            ) : (
              agendaList.map((ag) => (
                <div
                  key={ag.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    borderRadius: '12px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderLeft: `5px solid ${ag.badgeColor || '#2563eb'}`,
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '10.5px', fontWeight: '800', backgroundColor: '#e2e8f0', color: '#334155', padding: '2px 8px', borderRadius: '6px', display: 'inline-block', marginBottom: '4px' }}>
                      {ag.tipe}
                    </span>
                    <h4 style={{ margin: '2px 0 4px 0', fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
                      {ag.event}
                    </h4>
                    <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '600' }}>
                      🗓️ {ag.tanggal}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        backgroundColor: ag.status === 'Segera' ? '#fee2e2' : ag.status === 'Selesai' ? '#f1f5f9' : '#f0fdf4',
                        color: ag.status === 'Segera' ? '#dc2626' : ag.status === 'Selesai' ? '#64748b' : '#16a34a',
                        fontSize: '11px',
                        fontWeight: '800',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        border: `1px solid ${ag.status === 'Segera' ? '#fca5a5' : ag.status === 'Selesai' ? '#cbd5e1' : '#bbf7d0'}`,
                      }}
                    >
                      {ag.status}
                    </span>

                    {/* 🛠️ TOMBOL EDIT & HAPUS AGENDA (HANYA GURU ADMIN & MASTER) */}
                    {canManageMading && (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => openEditAgendaModal(ag)}
                          style={{
                            backgroundColor: '#eff6ff',
                            color: '#2563eb',
                            border: '1px solid #bfdbfe',
                            borderRadius: '8px',
                            padding: '5px 8px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                          }}
                          title="Edit Agenda"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAgenda(ag)}
                          style={{
                            backgroundColor: '#fef2f2',
                            color: '#ef4444',
                            border: '1px solid #fca5a5',
                            borderRadius: '8px',
                            padding: '5px 8px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                          }}
                          title="Hapus Agenda"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 📝 MODAL TAMBAH / EDIT AGENDA SEKOLAH (GURU ADMIN & MASTER) */}
      {showAgendaModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '14px',
          }}
          onClick={() => setShowAgendaModal(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              maxWidth: '480px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px rgba(0,0,0,0.35)',
              padding: '22px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                {editingAgenda ? '✏️ Edit Agenda Sekolah' : '➕ Tambah Agenda Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setShowAgendaModal(false)}
                style={{ backgroundColor: '#f1f5f9', border: 'none', borderRadius: '8px', width: '30px', height: '30px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAgenda}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  📌 Nama Agenda / Event Kegiatan:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Ujian Penilaian Akhir Semester (PAS)"
                  value={formEvent}
                  onChange={(e) => setFormEvent(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  🗓️ Tanggal / Periode Pelaksanaan:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 1 - 6 Des 2026 atau 15 Des 2026"
                  value={formTanggal}
                  onChange={(e) => setFormTanggal(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    🏷️ Kategori / Tipe:
                  </label>
                  <select
                    value={formTipe}
                    onChange={(e) => setFormTipe(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '9px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px' }}
                  >
                    <option value="Ujian CBT">Ujian CBT</option>
                    <option value="Pelatihan Kejuruan">Pelatihan Kejuruan</option>
                    <option value="Uji Kompetensi">Uji Kompetensi</option>
                    <option value="Bazar Sekolah">Bazar Sekolah</option>
                    <option value="Libur Nasional">Libur Nasional</option>
                    <option value="Kegiatan OSIS">Kegiatan OSIS</option>
                    <option value="Rapat Guru">Rapat Dewan Guru</option>
                    <option value="Akademik">Akademik Umum</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    🚦 Status:
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '9px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px' }}
                  >
                    <option value="Terjadwal">Terjadwal</option>
                    <option value="Segera">Segera</option>
                    <option value="Selesai">Selesai</option>
                    <option value="Penting">Penting</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  🎨 Warna Label Indikator:
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[
                    { color: '#2563eb', label: 'Biru' },
                    { color: '#ef4444', label: 'Merah' },
                    { color: '#16a34a', label: 'Hijau' },
                    { color: '#7c3aed', label: 'Ungu' },
                    { color: '#ea580c', label: 'Oranye' },
                    { color: '#0f172a', label: 'Gelap' },
                  ].map((c) => (
                    <div
                      key={c.color}
                      onClick={() => setFormBadgeColor(c.color)}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: c.color,
                        cursor: 'pointer',
                        border: formBadgeColor === c.color ? '3px solid #0f172a' : '2px solid #ffffff',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                      }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
                <button
                  type="button"
                  onClick={() => setShowAgendaModal(false)}
                  style={{ backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  style={{ backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '8px 18px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  💾 Simpan Agenda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📄 MODAL DETAIL BERITA & GAMBAR POSTER (POPUP LENGKAP) */}
      {selectedNews && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '14px',
          }}
          onClick={() => setSelectedNews(null)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px rgba(0,0,0,0.35)',
              padding: '22px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal Detail */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <div>
                <span
                  style={{
                    backgroundColor: '#fee2e2',
                    color: '#e11d48',
                    fontSize: '10.5px',
                    fontWeight: '800',
                    padding: '3px 8px',
                    borderRadius: '6px',
                  }}
                >
                  📌 {selectedNews.kategori || 'Pengumuman'}
                </span>
                <h2 style={{ margin: '8px 0 4px 0', fontSize: '17px', fontWeight: '800', color: '#0f172a', lineHeight: 1.35 }}>
                  {selectedNews.judul}
                </h2>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  🗓️ {selectedNews.tanggal} {selectedNews.jam ? `• ${selectedNews.jam}` : ''} • Penulis: <b>{selectedNews.penulis}</b>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNews(null)}
                style={{
                  backgroundColor: '#f1f5f9',
                  border: 'none',
                  borderRadius: '8px',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '15px',
                }}
              >
                ✕
              </button>
            </div>

            {/* 🖼️ GAMBAR / POSTER RESOLUSI PENUH */}
            {(selectedNews.gambar_url || selectedNews.imageUrl || selectedNews.foto_url) && (
              <div style={{ borderRadius: '14px', overflow: 'hidden', marginBottom: '16px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                <img
                  src={selectedNews.gambar_url || selectedNews.imageUrl || selectedNews.foto_url}
                  alt={selectedNews.judul}
                  style={{ width: '100%', maxHeight: '350px', objectFit: 'contain', display: 'block' }}
                />
              </div>
            )}

            {/* ISI PENGUMUMAN LENGKAP */}
            <div
              style={{
                fontSize: '13px',
                lineHeight: '1.7',
                color: '#334155',
                whiteSpace: 'pre-line',
                backgroundColor: '#f8fafc',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                marginBottom: '16px',
              }}
            >
              {selectedNews.konten}
            </div>

            {/* TOMBOL AKSI BAWAH */}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              {canManageMading && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const item = selectedNews;
                      setSelectedNews(null);
                      if (onEditNews) onEditNews(item);
                    }}
                    style={{
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '9px 16px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                    }}
                  >
                    ✏️ Edit Berita
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(selectedNews)}
                    style={{
                      backgroundColor: '#ef4444',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '9px 16px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                    }}
                  >
                    🗑️ Hapus
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setSelectedNews(null)}
                style={{
                  backgroundColor: '#64748b',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '9px 18px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
