'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Swal from 'sweetalert2';

// 📚 DAFTAR KELAS RESMI SMK YPK MEDAN
const DAFTAR_KELAS_RESMI = [
  'Semua Kelas',
  'X TJKT', 'X AKL', 'X MPLB', 'X PM',
  'XI TJKT', 'XI AKL', 'XI MPLB', 'XI PM',
  'XII TJKT', 'XII AKL', 'XII MPLB', 'XII PM'
];

// ⏰ DAFTAR LES / JAM PELAJARAN RESMI
const DAFTAR_JAM_PELAJARAN = [
  { jam: 'Jam 1 - 2 (07:15 - 08:35 WIB)', val: '1 - 2' },
  { jam: 'Jam 3 - 4 (08:35 - 09:55 WIB)', val: '3 - 4' },
  { jam: 'Jam 5 (09:55 - 10:35 WIB)', val: '5' },
  { jam: 'Jam 6 - 7 (10:55 - 12:15 WIB)', val: '6 - 7' },
  { jam: 'Jam 8 - 9 (13:00 - 14:20 WIB)', val: '8 - 9' },
  { jam: 'Jam 10 - 11 (14:20 - 15:40 WIB)', val: '10 - 11' },
  { jam: 'Jam 1 (07:15 - 07:55 WIB)', val: '1' },
  { jam: 'Jam 2 (07:55 - 08:35 WIB)', val: '2' },
  { jam: 'Jam 3 (08:35 - 09:15 WIB)', val: '3' },
  { jam: 'Jam 4 (09:15 - 09:55 WIB)', val: '4' },
  { jam: 'Jam 6 (10:55 - 11:35 WIB)', val: '6' },
  { jam: 'Jam 7 (11:35 - 12:15 WIB)', val: '7' },
  { jam: 'Jam 8 (13:00 - 13:40 WIB)', val: '8' },
  { jam: 'Jam 9 (13:40 - 14:20 WIB)', val: '9' },
  { jam: 'Jam 10 (14:20 - 15:00 WIB)', val: '10' },
  { jam: 'Jam 11 (15:00 - 15:40 WIB)', val: '11' },
  { jam: 'Seharian Penuh (Full Day)', val: '1 - 11' },
];

export default function BahanAjarView({
  currentUser,
  isMasterIqbal,
  isSiswaAdmin,
  siswaAdminKelas,
  guruList = [],
  siswaList = [],
  invalList = [],
  setInvalList,
  onInvalAdded,
  onPushNotification,
  activeSubMenu = 'rekap_inval',
  onSubMenuChange,
}) {
  const isGuruAccount = Boolean(currentUser?.isGuru && !String(currentUser?.id).startsWith('SISWA-'));
  const isDirectAdmin = Boolean(
    isMasterIqbal ||
    currentUser?.role === 'admin' ||
    currentUser?.role === 'master' ||
    (currentUser?.username || '').toLowerCase() === 'admin' ||
    (currentUser?.username || '').toLowerCase() === 'iqbal'
  );

  const canManageInval = Boolean(isDirectAdmin || isGuruAccount || currentUser?.role === 'guru');

  // Sub Tab Navigation: 'rekap_inval' | 'materi_jurusan'
  const [activeTab, setActiveTab] = useState(activeSubMenu || 'rekap_inval');

  useEffect(() => {
    if (activeSubMenu) {
      setActiveTab(activeSubMenu);
    }
  }, [activeSubMenu]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (onSubMenuChange) onSubMenuChange(tabId);
  };

  // State Inval Data
  const [localInvalList, setLocalInvalList] = useState([]);
  const [loadingInval, setLoadingInval] = useState(false);
  const [filterKelasInval, setFilterKelasInval] = useState('Semua Kelas');
  const [searchInval, setSearchInval] = useState('');
  const [showAddInvalModal, setShowAddInvalModal] = useState(false);

  // Form Penugasan Inval Baru
  const [formGuruUtama, setFormGuruUtama] = useState('');
  const [formAlasan, setFormAlasan] = useState('SAKIT');
  const [formJamKe, setFormJamKe] = useState('1 - 2');
  const [formGuruInval, setFormGuruInval] = useState('');
  const [formKelasInval, setFormKelasInval] = useState('XI TJKT');
  const [formMapelInval, setFormMapelInval] = useState('');
  const [formMateriJudul, setFormMateriJudul] = useState('');
  const [formMateriFileBase64, setFormMateriFileBase64] = useState('');
  const [formMateriFileName, setFormMateriFileName] = useState('');
  const [formMateriFileType, setFormMateriFileType] = useState(''); // 'PDF' | 'JPG' | 'PNG'
  const [formKirimNotif, setFormKirimNotif] = useState(true);
  const [submittingInval, setSubmittingInval] = useState(false);

  // State Bahan Ajar / Modul KBM
  const [documents, setDocuments] = useState([]);
  const [showUploadDocModal, setShowUploadDocModal] = useState(false);
  const [filterKelasDoc, setFilterKelasDoc] = useState('Semua Kelas');
  const [filterJurusanDoc, setFilterJurusanDoc] = useState('Semua');
  const [searchDocQuery, setSearchDocQuery] = useState('');

  // Reader Modal (PDF & Image Viewer)
  const [activeViewerDoc, setActiveViewerDoc] = useState(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  // Form Upload Dokumen Modul
  const [docJudul, setDocJudul] = useState('');
  const [docMapel, setDocMapel] = useState('');
  const [docKelas, setDocKelas] = useState('XI TJKT');
  const [docJurusan, setDocJurusan] = useState('TJKT');
  const [docKategori, setDocKategori] = useState('Modul Ajar');
  const [docRingkasan, setDocRingkasan] = useState('');
  const [docFileBase64, setDocFileBase64] = useState('');
  const [docFileName, setDocFileName] = useState('');
  const [docFileType, setDocFileType] = useState('PDF');

  // Load Inval List from API
  const fetchInvalData = async () => {
    setLoadingInval(true);
    try {
      const res = await fetch('/api/inval-guru?tanggal=all');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setLocalInvalList(json.data);
        if (setInvalList) setInvalList(json.data);
      } else if (Array.isArray(invalList) && invalList.length > 0) {
        setLocalInvalList(invalList);
      }
    } catch (e) {
      if (Array.isArray(invalList)) setLocalInvalList(invalList);
    } finally {
      setLoadingInval(false);
    }
  };

  useEffect(() => {
    fetchInvalData();
  }, []);

  // Sinkronkan jika parent mengirim invalList update
  useEffect(() => {
    if (Array.isArray(invalList) && invalList.length > 0) {
      setLocalInvalList(invalList);
    }
  }, [invalList]);

  // Load Dokumen Bahan Ajar dari LocalStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('smk_ypk_perangkat_ajar_docs');
      if (stored) {
        setDocuments(JSON.parse(stored));
      } else {
        setDocuments([]);
      }
    } catch (e) {}
  }, []);

  // Save Dokumen Bahan Ajar ke LocalStorage
  const saveDocumentsToStorage = (newDocs) => {
    setDocuments(newDocs);
    try {
      localStorage.setItem('smk_ypk_perangkat_ajar_docs', JSON.stringify(newDocs));
    } catch (e) {}
  };

  // Handle File Upload for Inval Form
  const handleInvalFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileType = file.name.toLowerCase().endsWith('.pdf')
      ? 'PDF'
      : file.type.includes('image') || file.name.match(/\.(jpg|jpeg|png)$/i)
      ? 'JPG'
      : 'FILE';

    if (file.size > 8 * 1024 * 1024) {
      Swal.fire({
        icon: 'warning',
        title: 'Ukuran Terlalu Besar',
        text: 'Ukuran file maksimal adalah 8 MB.',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      setFormMateriFileBase64(uploadEvent.target.result);
      setFormMateriFileName(file.name);
      setFormMateriFileType(fileType);
    };
    reader.readAsDataURL(file);
  };

  // Handle File Upload for General Module
  const handleDocFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileType = file.name.toLowerCase().endsWith('.pdf')
      ? 'PDF'
      : file.type.includes('image') || file.name.match(/\.(jpg|jpeg|png)$/i)
      ? 'JPG'
      : 'FILE';

    if (file.size > 8 * 1024 * 1024) {
      Swal.fire({
        icon: 'warning',
        title: 'Ukuran Terlalu Besar',
        text: 'Ukuran file maksimal adalah 8 MB.',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      setDocFileBase64(uploadEvent.target.result);
      setDocFileName(file.name);
      setDocFileType(fileType);
    };
    reader.readAsDataURL(file);
  };

  // Submit Penugasan Inval Baru
  const handleSaveInval = async (e) => {
    e.preventDefault();
    if (!formGuruUtama || !formGuruInval || !formKelasInval || !formJamKe) {
      Swal.fire({
        icon: 'warning',
        title: 'Data Belum Lengkap',
        text: 'Mohon pilih Guru yang Tidak Hadir, Guru Pengganti, Kelas, dan Jam Pelajaran.',
      });
      return;
    }

    setSubmittingInval(true);

    const payload = {
      tanggal: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }),
      nama_guru_utama: formGuruUtama,
      alasan: formAlasan,
      nama_guru_inval: formGuruInval,
      kelas: formKelasInval,
      mapel: formMapelInval || 'Mata Pelajaran KBM',
      jam_ke: formJamKe,
      assigned_by: currentUser?.nama || 'Admin Guru',
      materi_nama: formMateriJudul || (formMateriFileName ? `Bahan Ajar Inval (${formKelasInval})` : ''),
      materi_file_base64: formMateriFileBase64 || '',
      materi_file_name: formMateriFileName || '',
      materi_file_type: formMateriFileType || '',
    };

    try {
      const res = await fetch('/api/inval-guru', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resJson = await res.json();

      // Tambahkan Bahan Ajar ke Modul Pembelajaran jika ada file
      if (formMateriFileBase64 && formMateriFileName) {
        const newDocItem = {
          id: `INVAL-DOC-${Date.now()}`,
          kategori: 'Tugas Inval',
          judul: formMateriJudul || `Tugas Inval: ${formMapelInval || 'KBM'} (${formKelasInval})`,
          mapel: formMapelInval || 'Tugas Mandiri',
          kelas_target: formKelasInval,
          jurusan: formKelasInval.split(' ')[1] || 'Umum',
          guru_pengunggah: `${formGuruUtama} (Diinval: ${formGuruInval})`,
          tipe_file: formMateriFileType || 'PDF',
          file_name: formMateriFileName,
          file_url: formMateriFileBase64,
          ringkasan: `Bahan Ajar & Tugas Kelas ${formKelasInval} untuk Jam Ke-${formJamKe}. Guru Pengganti: ${formGuruInval}.`,
          created_at: new Date().toISOString(),
        };
        const updatedDocs = [newDocItem, ...documents];
        saveDocumentsToStorage(updatedDocs);
      }

      // 🔔 KIRIM NOTIFIKASI LONCENG OTOMATIS
      if (formKirimNotif) {
        // 1. Notifikasi untuk Guru Pengganti
        const notifGuruInval = {
          id: `NOTIF-INVAL-GURU-${Date.now()}`,
          type: 'inval_tugas',
          judul: `🚨 Tugas Inval: Kelas ${formKelasInval} (Jam ${formJamKe})`,
          ringkasan: `Anda ditugaskan menginval kelas ${formKelasInval} jam ke-${formJamKe} menggantikan ${formGuruUtama} (Mapel: ${formMapelInval || '-'}).`,
          targetAudience: 'Guru',
          guru_inval: formGuruInval,
          targetGuru: formGuruInval,
          waktu: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          tanggal: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
          isRead: false,
        };

        // 2. Notifikasi untuk Siswa di Kelas Terkait
        const notifSiswaKelas = {
          id: `NOTIF-INVAL-SISWA-${Date.now()}`,
          type: 'inval_info',
          judul: `📚 Info Guru Inval: Jam Ke-${formJamKe} (${formKelasInval})`,
          ringkasan: `Jam pelajaran ke-${formJamKe} (${formMapelInval || 'KBM'}) akan diampu oleh Bapak/Ibu ${formGuruInval} menggantikan ${formGuruUtama}. Silakan cek bahan ajar yang terlampir.`,
          targetAudience: 'Siswa',
          targetKelas: formKelasInval,
          waktu: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          tanggal: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
          isRead: false,
        };

        if (onPushNotification) {
          onPushNotification(notifGuruInval);
          onPushNotification(notifSiswaKelas);
        }
      }

      Swal.fire({
        icon: 'success',
        title: 'Penugasan Inval Berhasil Diterbitkan!',
        html: `Guru <b>${formGuruInval}</b> telah ditugaskan masuk di kelas <b>${formKelasInval}</b> pada <b>Jam Ke-${formJamKe}</b>.<br><br><span style="color:#16a34a;font-size:12px;">✅ Notifikasi lonceng otomatis dikirim ke Guru Inval dan Siswa kelas terkait.</span>`,
        confirmButtonColor: '#2563eb',
      });

      // Reset Form & Tutup Modal
      setShowAddInvalModal(false);
      setFormGuruUtama('');
      setFormGuruInval('');
      setFormMapelInval('');
      setFormMateriJudul('');
      setFormMateriFileBase64('');
      setFormMateriFileName('');
      setFormMateriFileType('');

      fetchInvalData();
      if (onInvalAdded) onInvalAdded();
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Menyimpan Inval',
        text: err.message || 'Terjadi kesalahan saat menyimpan penugasan.',
      });
    } finally {
      setSubmittingInval(false);
    }
  };

  // Handle Hapus Penugasan Inval
  const handleDeleteInval = async (invalItem) => {
    if (!canManageInval) {
      Swal.fire({ icon: 'error', title: 'Akses Ditolak', text: 'Hanya Admin dan Guru yang berwenang menghapus penugasan Inval.' });
      return;
    }

    const confirmRes = await Swal.fire({
      title: 'Hapus Penugasan Inval?',
      html: `Apakah Anda yakin ingin membatalkan penugasan inval kelas <b>${invalItem.kelas}</b> (Jam: <b>${invalItem.jam_ke}</b>) oleh <b>${invalItem.nama_guru_inval || invalItem.guru_inval}</b>?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus Sekarang',
      cancelButtonText: 'Batal',
    });

    if (!confirmRes.isConfirmed) return;

    try {
      const res = await fetch('/api/inval-guru', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: [invalItem.id],
          tanggal: invalItem.tanggal,
          deleted_by: currentUser?.nama || 'Admin Guru',
        }),
      });

      const resJson = await res.json();
      if (resJson.success) {
        setLocalInvalList((prev) => prev.filter((item) => item.id !== invalItem.id));
        if (setInvalList) {
          setInvalList((prev) => prev.filter((item) => item.id !== invalItem.id));
        }

        Swal.fire({
          icon: 'success',
          title: 'Penugasan Inval Dihapus',
          text: 'Data penugasan inval telah dihapus dari database.',
          timer: 1800,
          showConfirmButton: false,
        });
      } else {
        throw new Error(resJson.error || 'Gagal menghapus');
      }
    } catch (err) {
      // Fallback local remove
      setLocalInvalList((prev) => prev.filter((item) => item.id !== invalItem.id));
      Swal.fire({
        icon: 'info',
        title: 'Dihapus dari Tampilan',
        text: 'Penugasan inval telah diperbarui.',
        timer: 1500,
        showConfirmButton: false,
      });
    }
  };

  // Submit Upload Dokumen Modul KBM
  const handleSaveDoc = (e) => {
    e.preventDefault();
    if (!docJudul || !docMapel || !docKelas) {
      Swal.fire({ icon: 'warning', title: 'Data Belum Lengkap', text: 'Mohon lengkapi judul, mapel, dan kelas target.' });
      return;
    }

    const newDoc = {
      id: `DOC-${Date.now()}`,
      kategori: docKategori,
      judul: docJudul,
      mapel: docMapel,
      tingkat: docKelas.split(' ')[0] || 'XI',
      kelas_target: docKelas,
      jurusan: docJurusan,
      guru_pengunggah: currentUser?.nama || 'Bapak/Ibu Guru',
      tipe_file: docFileType || 'PDF',
      file_name: docFileName || `${docJudul.replace(/\s+/g, '_')}.${docFileType === 'JPG' ? 'jpg' : 'pdf'}`,
      file_url: docFileBase64 || '',
      ringkasan: docRingkasan || `Modul bahan ajar mata pelajaran ${docMapel} untuk kelas ${docKelas}.`,
      created_at: new Date().toISOString(),
    };

    const updated = [newDoc, ...documents];
    saveDocumentsToStorage(updated);

    Swal.fire({
      icon: 'success',
      title: 'Bahan Ajar Berhasil Diunggah!',
      text: `Materi untuk kelas ${docKelas} siap diakses oleh siswa dan guru.`,
      confirmButtonColor: '#2563eb',
    });

    setShowUploadDocModal(false);
    setDocJudul('');
    setDocMapel('');
    setDocRingkasan('');
    setDocFileBase64('');
    setDocFileName('');
    setDocFileType('PDF');
  };

  // Handle Hapus Dokumen Bahan Ajar
  const handleDeleteDoc = (docId) => {
    Swal.fire({
      title: 'Hapus Bahan Ajar Ini?',
      text: 'Dokumen ini tidak akan dapat diakses lagi oleh siswa di kelas terkait.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
    }).then((res) => {
      if (res.isConfirmed) {
        const updated = documents.filter((d) => d.id !== docId);
        saveDocumentsToStorage(updated);
        Swal.fire({ icon: 'success', title: 'Berhasil Dihapus', timer: 1500, showConfirmButton: false });
      }
    });
  };

  // Open Document Viewer (PDF or Image)
  const handleOpenViewer = (doc) => {
    setActiveViewerDoc(doc);
    setIsViewerOpen(true);
  };

  // Filtered Inval List
  const filteredInvalList = useMemo(() => {
    const studentKelas = (currentUser?.kelas || siswaAdminKelas || '').toUpperCase().trim();

    return (localInvalList || []).filter((inv) => {
      // Siswa hanya melihat jadwal inval kelasnya sendiri (kecuali Siswa Admin)
      if (!isGuruAccount && !isDirectAdmin && studentKelas) {
        const invK = String(inv.kelas || '').toUpperCase().trim();
        if (invK !== studentKelas && !invK.includes(studentKelas) && !studentKelas.includes(invK)) {
          return false;
        }
      }

      // Filter Dropdown Kelas
      if (filterKelasInval !== 'Semua Kelas') {
        const invK = String(inv.kelas || '').toUpperCase().trim();
        if (invK !== filterKelasInval.toUpperCase().trim()) return false;
      }

      // Filter Pencarian
      if (searchInval.trim()) {
        const q = searchInval.toLowerCase();
        const guruUtama = String(inv.nama_guru_utama || '').toLowerCase();
        const guruInval = String(inv.nama_guru_inval || inv.guru_inval || '').toLowerCase();
        const kelas = String(inv.kelas || '').toLowerCase();
        const mapel = String(inv.mapel || '').toLowerCase();
        return guruUtama.includes(q) || guruInval.includes(q) || kelas.includes(q) || mapel.includes(q);
      }

      return true;
    });
  }, [localInvalList, filterKelasInval, searchInval, currentUser, siswaAdminKelas, isGuruAccount, isDirectAdmin]);

  // Filtered Documents List
  const filteredDocList = useMemo(() => {
    const studentKelas = (currentUser?.kelas || siswaAdminKelas || '').toUpperCase().trim();
    const studentJurusan = (currentUser?.jurusan || '').toUpperCase().trim();

    return (documents || []).filter((doc) => {
      // Siswa hanya melihat bahan ajar kelasnya / jurusannya
      if (!canManageInval && studentKelas) {
        const targetK = String(doc.kelas_target || '').toUpperCase().trim();
        const targetJ = String(doc.jurusan || '').toUpperCase().trim();

        const matchK = targetK === 'SEMUA KELAS' || targetK === 'SEMUA' || targetK === studentKelas || studentKelas.includes(targetK) || targetK.includes(studentKelas);
        const matchJ = targetJ === 'SEMUA' || targetJ === 'SEMUA JURUSAN' || (studentJurusan && targetJ === studentJurusan) || studentKelas.includes(targetJ);

        if (!matchK && !matchJ) return false;
      }

      // Filter Kelas
      if (filterKelasDoc !== 'Semua Kelas') {
        if (doc.kelas_target !== filterKelasDoc && doc.kelas_target !== 'Semua Kelas') return false;
      }

      // Filter Jurusan
      if (filterJurusanDoc !== 'Semua') {
        if (doc.jurusan !== filterJurusanDoc && doc.jurusan !== 'Semua') return false;
      }

      // Search Query
      if (searchDocQuery.trim()) {
        const q = searchDocQuery.toLowerCase();
        return (
          String(doc.judul || '').toLowerCase().includes(q) ||
          String(doc.mapel || '').toLowerCase().includes(q) ||
          String(doc.guru_pengunggah || '').toLowerCase().includes(q) ||
          String(doc.kelas_target || '').toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [documents, filterKelasDoc, filterJurusanDoc, searchDocQuery, canManageInval, currentUser, siswaAdminKelas]);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px 12px 60px' }}>
      
      {/* 🌟 HEADER UTAMA LAYANAN INVAL & BAHAN AJAR */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 60%, #3b82f6 100%)',
          borderRadius: '18px',
          padding: '22px 20px',
          color: '#ffffff',
          marginBottom: '20px',
          boxShadow: '0 8px 24px rgba(37, 99, 235, 0.25)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '24px' }}>👨‍🏫</span>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', letterSpacing: '-0.3px' }}>
              Layanan Inval & Bahan Ajar KBM
            </h1>
            <span
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                padding: '3px 10px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: '700',
              }}
            >
              SMK YPK MEDAN
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '13px', opacity: 0.92, maxWidth: '650px', lineHeight: 1.45 }}>
            Pusat pengelolaan Guru Pengganti (Inval), distribusi jadwal les pergantian KBM, dan pengunggahan modul/tugas format PDF & JPG terintegrasi database.
          </p>
        </div>

        {/* TOMBOL AKSI CEPAT (UNTUK GURU & ADMIN) */}
        {canManageInval && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => {
                const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
                window.open(`/api/inval-guru/print?tanggal=${today}`, '_blank');
              }}
              style={{
                backgroundColor: '#ffffff',
                color: '#15803d',
                border: 'none',
                padding: '10px 16px',
                borderRadius: '12px',
                fontWeight: '800',
                fontSize: '12.5px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                transition: 'transform 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <span>🖨️</span>
              <span>Cetak Form Inval (PDF)</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddInvalModal(true)}
              style={{
                backgroundColor: '#ffffff',
                color: '#1e3a8a',
                border: 'none',
                padding: '10px 16px',
                borderRadius: '12px',
                fontWeight: '800',
                fontSize: '12.5px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                transition: 'transform 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <span>➕</span>
              <span>Penugasan Inval Baru</span>
            </button>

            <button
              type="button"
              onClick={() => setShowUploadDocModal(true)}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                border: '1.5px solid rgba(255, 255, 255, 0.4)',
                padding: '10px 14px',
                borderRadius: '12px',
                fontWeight: '700',
                fontSize: '12.5px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backdropFilter: 'blur(6px)',
              }}
            >
              <span>📤</span>
              <span>Unggah Bahan Ajar</span>
            </button>
          </div>
        )}
      </div>

      {/* 🗂️ SUB-TAB NAVIGATION BAR */}
      <div
        style={{
          display: 'flex',
          gap: '10px',
          marginBottom: '18px',
          borderBottom: '2px solid #e2e8f0',
          paddingBottom: '8px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        <button
          type="button"
          onClick={() => handleTabChange('rekap_inval')}
          style={{
            padding: '9px 18px',
            borderRadius: '12px',
            border: 'none',
            backgroundColor: activeTab === 'rekap_inval' ? '#2563eb' : '#f1f5f9',
            color: activeTab === 'rekap_inval' ? '#ffffff' : '#475569',
            fontWeight: activeTab === 'rekap_inval' ? '800' : '600',
            fontSize: '13px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s',
            flexShrink: 0,
          }}
        >
          <span>📋</span>
          <span>Jadwal & Rekap Inval Guru</span>
          <span
            style={{
              backgroundColor: activeTab === 'rekap_inval' ? '#ffffff' : '#cbd5e1',
              color: activeTab === 'rekap_inval' ? '#2563eb' : '#334155',
              padding: '2px 7px',
              borderRadius: '10px',
              fontSize: '11px',
              fontWeight: '800',
            }}
          >
            {filteredInvalList.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('materi_jurusan')}
          style={{
            padding: '9px 18px',
            borderRadius: '12px',
            border: 'none',
            backgroundColor: activeTab === 'materi_jurusan' ? '#2563eb' : '#f1f5f9',
            color: activeTab === 'materi_jurusan' ? '#ffffff' : '#475569',
            fontWeight: activeTab === 'materi_jurusan' ? '800' : '600',
            fontSize: '13px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s',
            flexShrink: 0,
          }}
        >
          <span>📂</span>
          <span>Bahan Ajar & Modul KBM</span>
          <span
            style={{
              backgroundColor: activeTab === 'materi_jurusan' ? '#ffffff' : '#cbd5e1',
              color: activeTab === 'materi_jurusan' ? '#2563eb' : '#334155',
              padding: '2px 7px',
              borderRadius: '10px',
              fontSize: '11px',
              fontWeight: '800',
            }}
          >
            {filteredDocList.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 📋 TAB 1: JADWAL & REKAP INVAL GURU */}
      {/* ========================================================================= */}
      {activeTab === 'rekap_inval' && (
        <div>
          {/* BAR PENCARIAN & FILTER KELAS */}
          <div
            style={{
              display: 'flex',
              gap: '10px',
              marginBottom: '16px',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', gap: '10px', flex: '1 1 320px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="🔍 Cari Guru Utama, Guru Inval, Kelas, atau Mapel..."
                value={searchInval}
                onChange={(e) => setSearchInval(e.target.value)}
                style={{
                  flex: '1 1 200px',
                  padding: '9px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />

              <select
                value={filterKelasInval}
                onChange={(e) => setFilterKelasInval(e.target.value)}
                style={{
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '13px',
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  fontWeight: '600',
                }}
              >
                {DAFTAR_KELAS_RESMI.map((k) => (
                  <option key={k} value={k}>
                    {k === 'Semua Kelas' ? '🏫 Semua Kelas' : `Kelas ${k}`}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={fetchInvalData}
              style={{
                backgroundColor: '#f8fafc',
                border: '1.5px solid #cbd5e1',
                padding: '9px 14px',
                borderRadius: '10px',
                fontSize: '12.5px',
                fontWeight: '700',
                color: '#334155',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>🔄</span>
              <span>Refresh Inval</span>
            </button>
          </div>

          {/* DAFTAR PENUGASAN INVAL */}
          {loadingInval ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>⏳</div>
              <div style={{ fontWeight: '700', fontSize: '14px' }}>Memuat Data Penugasan Inval Guru...</div>
            </div>
          ) : filteredInvalList.length === 0 ? (
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                border: '1.5px dashed #cbd5e1',
                padding: '45px 20px',
                textAlign: 'center',
                color: '#64748b',
              }}
            >
              <div style={{ fontSize: '42px', marginBottom: '10px' }}>🏖️</div>
              <h3 style={{ margin: '0 0 6px', color: '#1e293b', fontSize: '16px', fontWeight: '800' }}>
                Tidak Ada Jadwal Inval Aktif
              </h3>
              <p style={{ margin: '0 0 16px', fontSize: '13px', maxWidth: '420px', marginInline: 'auto' }}>
                Seluruh Bapak/Ibu Guru hadir sesuai jadwal KBM normal atau belum ada penugasan guru pengganti untuk filter kelas ini.
              </p>
              {canManageInval && (
                <button
                  type="button"
                  onClick={() => setShowAddInvalModal(true)}
                  style={{
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    padding: '9px 16px',
                    borderRadius: '10px',
                    fontWeight: '700',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  ➕ Buat Penugasan Inval Baru
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '14px' }}>
              {filteredInvalList.map((inv) => {
                const isFree = String(inv.nama_guru_inval || inv.guru_inval || '').includes('Jam Kosong') || inv.nama_guru_inval === '-';
                const hasFile = Boolean(inv.materi_file_base64 || inv.materi_url || inv.bahan_ajar_url);
                const isCurrentUserInval =
                  currentUser?.nama &&
                  String(inv.nama_guru_inval || inv.guru_inval || '').toLowerCase().trim() === currentUser.nama.toLowerCase().trim();

                return (
                  <div
                    key={inv.id || Math.random()}
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '14px',
                      border: isCurrentUserInval ? '2px solid #2563eb' : '1.5px solid #e2e8f0',
                      boxShadow: isCurrentUserInval
                        ? '0 6px 18px rgba(37, 99, 235, 0.15)'
                        : '0 2px 8px rgba(0, 0, 0, 0.04)',
                      padding: '16px',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}
                  >
                    {/* TOP INFO: TANGGAL & STATUS */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span
                          style={{
                            backgroundColor: '#eff6ff',
                            color: '#1d4ed8',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '11.5px',
                            fontWeight: '800',
                          }}
                        >
                          🏫 Kelas {inv.kelas || '-'}
                        </span>

                        <span
                          style={{
                            backgroundColor: isFree ? '#fef3c7' : '#dcfce7',
                            color: isFree ? '#b45309' : '#15803d',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '11.5px',
                            fontWeight: '800',
                          }}
                        >
                          {isFree ? '⏳ Jam Kosong' : '✅ ' + (inv.status_inval || 'Ditugaskan')}
                        </span>
                      </div>

                      {/* JAM PELAJARAN / LES */}
                      <div
                        style={{
                          backgroundColor: '#f8fafc',
                          padding: '6px 10px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: '700',
                          color: '#334155',
                          marginBottom: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span>⏰</span>
                        <span>Jam Pelajaran (Les): <b>{inv.jam_ke || '-'}</b></span>
                      </div>

                      {/* DETAIL GURU UTAMA VS GURU PENGGANTI */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                        <div>
                          <span style={{ color: '#64748b', fontSize: '11.5px', display: 'block' }}>Guru yang Tidak Hadir:</span>
                          <div style={{ fontWeight: '800', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>👨‍🏫</span>
                            <span>{inv.nama_guru_utama || 'Guru Utama'}</span>
                            {inv.alasan && (
                              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>
                                ({inv.alasan})
                              </span>
                            )}
                          </div>
                        </div>

                        <div>
                          <span style={{ color: '#64748b', fontSize: '11.5px', display: 'block' }}>Guru Pengganti (Inval):</span>
                          <div style={{ fontWeight: '800', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>🔄</span>
                            <span>{inv.nama_guru_inval || inv.guru_inval || '-'}</span>
                          </div>
                        </div>

                        <div>
                          <span style={{ color: '#64748b', fontSize: '11.5px', display: 'block' }}>Mata Pelajaran (Mapel):</span>
                          <div style={{ fontWeight: '700', color: '#1e293b' }}>
                            📚 {inv.mapel || 'KBM Reguler'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* BOTTOM ACTION BUTTONS: LIHAT BAHAN AJAR / HAPUS */}
                    <div
                      style={{
                        display: 'flex',
                        gap: '8px',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingTop: '10px',
                        borderTop: '1px solid #f1f5f9',
                      }}
                    >
                      {hasFile ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleOpenViewer({
                              judul: inv.materi_nama || `Bahan Ajar Inval (${inv.kelas})`,
                              file_url: inv.materi_file_base64 || inv.materi_url || inv.bahan_ajar_url,
                              file_name: inv.materi_file_name || 'Bahan_Ajar.pdf',
                              tipe_file: inv.materi_file_type || 'PDF',
                              mapel: inv.mapel,
                              guru_pengunggah: inv.nama_guru_utama,
                            })
                          }
                          style={{
                            backgroundColor: '#eff6ff',
                            color: '#2563eb',
                            border: '1px solid #bfdbfe',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <span>📄</span>
                          <span>Buka Bahan Ajar / Tugas</span>
                        </button>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>
                          Tidak ada lampiran file
                        </span>
                      )}

                      {/* TOMBOL HAPUS (GURU & ADMIN) */}
                      {canManageInval && (
                        <button
                          type="button"
                          onClick={() => handleDeleteInval(inv)}
                          title="Hapus Penugasan Inval"
                          style={{
                            backgroundColor: '#fee2e2',
                            color: '#dc2626',
                            border: 'none',
                            padding: '6px 10px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <span>🗑️</span>
                          <span>Hapus</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 📂 TAB 2: BAHAN AJAR & MODUL KBM DIGITAL */}
      {/* ========================================================================= */}
      {activeTab === 'materi_jurusan' && (
        <div>
          {/* BAR PENCARIAN & FILTER KELAS & JURUSAN */}
          <div
            style={{
              display: 'flex',
              gap: '10px',
              marginBottom: '16px',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', gap: '10px', flex: '1 1 360px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="🔍 Cari Judul Materi, Mapel, atau Guru..."
                value={searchDocQuery}
                onChange={(e) => setSearchDocQuery(e.target.value)}
                style={{
                  flex: '1 1 200px',
                  padding: '9px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />

              <select
                value={filterKelasDoc}
                onChange={(e) => setFilterKelasDoc(e.target.value)}
                style={{
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '13px',
                  backgroundColor: '#ffffff',
                  fontWeight: '600',
                }}
              >
                {DAFTAR_KELAS_RESMI.map((k) => (
                  <option key={k} value={k}>
                    {k === 'Semua Kelas' ? '🏫 Semua Kelas' : `Kelas ${k}`}
                  </option>
                ))}
              </select>

              <select
                value={filterJurusanDoc}
                onChange={(e) => setFilterJurusanDoc(e.target.value)}
                style={{
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '13px',
                  backgroundColor: '#ffffff',
                  fontWeight: '600',
                }}
              >
                <option value="Semua">🌐 Semua Jurusan</option>
                <option value="TJKT">💻 TJKT</option>
                <option value="AKL">📊 AKL</option>
                <option value="MPLB">📁 MPLB</option>
                <option value="PM">🛒 PM</option>
              </select>
            </div>

            {canManageInval && (
              <button
                type="button"
                onClick={() => setShowUploadDocModal(true)}
                style={{
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  padding: '9px 16px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>➕</span>
                <span>Unggah Materi Baru</span>
              </button>
            )}
          </div>

          {/* GRID KARTU DOKUMEN BAHAN AJAR */}
          {filteredDocList.length === 0 ? (
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                border: '1.5px dashed #cbd5e1',
                padding: '45px 20px',
                textAlign: 'center',
                color: '#64748b',
              }}
            >
              <div style={{ fontSize: '42px', marginBottom: '10px' }}>📚</div>
              <h3 style={{ margin: '0 0 6px', color: '#1e293b', fontSize: '16px', fontWeight: '800' }}>
                Belum Ada Bahan Ajar / Modul
              </h3>
              <p style={{ margin: '0 0 16px', fontSize: '13px', maxWidth: '420px', marginInline: 'auto' }}>
                Silakan pilih filter kelas yang berbeda atau unggah modul materi pelajaran baru dalam format PDF / JPG.
              </p>
              {canManageInval && (
                <button
                  type="button"
                  onClick={() => setShowUploadDocModal(true)}
                  style={{
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    padding: '9px 16px',
                    borderRadius: '10px',
                    fontWeight: '700',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  ➕ Unggah Bahan Ajar Sekarang
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '14px' }}>
              {filteredDocList.map((doc) => {
                const isPdf = doc.tipe_file === 'PDF' || String(doc.file_name || '').endsWith('.pdf');
                return (
                  <div
                    key={doc.id}
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '14px',
                      border: '1.5px solid #e2e8f0',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}
                  >
                    <div>
                      {/* HEADER KARTU */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span
                          style={{
                            backgroundColor: isPdf ? '#fee2e2' : '#fef3c7',
                            color: isPdf ? '#dc2626' : '#d97706',
                            padding: '3px 8px',
                            borderRadius: '8px',
                            fontSize: '11px',
                            fontWeight: '800',
                          }}
                        >
                          {isPdf ? '📕 PDF' : '🖼️ JPG / GAMBAR'}
                        </span>

                        <span
                          style={{
                            backgroundColor: '#eff6ff',
                            color: '#1d4ed8',
                            padding: '3px 8px',
                            borderRadius: '8px',
                            fontSize: '11px',
                            fontWeight: '800',
                          }}
                        >
                          🎯 {doc.kelas_target || 'Semua Kelas'}
                        </span>
                      </div>

                      {/* JUDUL MATERI */}
                      <h4 style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: '800', color: '#0f172a', lineHeight: 1.4 }}>
                        {doc.judul}
                      </h4>

                      <div style={{ fontSize: '12px', color: '#2563eb', fontWeight: '700', marginBottom: '6px' }}>
                        📚 Mapel: {doc.mapel}
                      </div>

                      <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: 1.45 }}>
                        {doc.ringkasan}
                      </p>
                    </div>

                    {/* PENGUNGGAH & AKSI */}
                    <div>
                      <div style={{ fontSize: '11.5px', color: '#475569', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>👨‍🏫</span>
                        <span>Oleh: <b>{doc.guru_pengunggah}</b></span>
                      </div>

                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'space-between' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenViewer(doc)}
                          style={{
                            flex: 1,
                            backgroundColor: '#2563eb',
                            color: '#ffffff',
                            border: 'none',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                          }}
                        >
                          <span>👁️</span>
                          <span>Buka Materi</span>
                        </button>

                        {canManageInval && (
                          <button
                            type="button"
                            onClick={() => handleDeleteDoc(doc.id)}
                            title="Hapus Dokumen"
                            style={{
                              backgroundColor: '#fee2e2',
                              color: '#dc2626',
                              border: 'none',
                              padding: '8px 10px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              cursor: 'pointer',
                            }}
                          >
                            <span>🗑️</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ➕ MODAL 1: TAMBAH PENUGASAN INVAL GURU BARU */}
      {/* ========================================================================= */}
      {showAddInvalModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '560px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
              padding: '24px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '24px' }}>👨‍🏫</span>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#1e293b' }}>
                  Form Penugasan Inval Guru
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddInvalModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#64748b',
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveInval} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* 1. PILIH GURU YANG TIDAK HADIR (DATABASE TB_GURU) */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155', display: 'block', marginBottom: '4px' }}>
                  👨‍🏫 Guru yang Tidak Hadir / Izin / Sakit:
                </label>
                <select
                  required
                  value={formGuruUtama}
                  onChange={(e) => setFormGuruUtama(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13px',
                    backgroundColor: '#ffffff',
                  }}
                >
                  <option value="">-- Pilih Guru dari Database tb_guru --</option>
                  {guruList.map((g) => (
                    <option key={g.id || g.nama_guru} value={g.nama_guru || g.nama}>
                      {g.nama_guru || g.nama} {g.inisial ? `[${g.inisial}]` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. ALASAN KETIDAKHADIRAN */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Alasan Tidak Hadir:
                  </label>
                  <select
                    value={formAlasan}
                    onChange={(e) => setFormAlasan(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '13px',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    <option value="SAKIT">🟡 Sakit (Sakit Surat/Klinik)</option>
                    <option value="IZIN">🟣 Izin / Keperluan Mendesak</option>
                    <option value="DINAS LUAR">🔵 Dinas Luar / Pelatihan</option>
                    <option value="CUTI">🟢 Cuti Resmi</option>
                  </select>
                </div>

                {/* 3. JAM PELAJARAN / LES KEBERAPA */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155', display: 'block', marginBottom: '4px' }}>
                    ⏰ Les / Jam Pelajaran:
                  </label>
                  <select
                    value={formJamKe}
                    onChange={(e) => setFormJamKe(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '13px',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    {DAFTAR_JAM_PELAJARAN.map((j) => (
                      <option key={j.val} value={j.val}>
                        {j.jam}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 4. PILIH GURU PENGGANTI (INVAL) DARI TB_GURU */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155', display: 'block', marginBottom: '4px' }}>
                  🔄 Guru Pengganti (Inval yang Masuk Mengajar):
                </label>
                <select
                  required
                  value={formGuruInval}
                  onChange={(e) => setFormGuruInval(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13px',
                    backgroundColor: '#ffffff',
                  }}
                >
                  <option value="">-- Pilih Guru Pengganti dari tb_guru --</option>
                  {guruList.map((g) => (
                    <option key={g.id || g.nama_guru} value={g.nama_guru || g.nama}>
                      {g.nama_guru || g.nama} {g.inisial ? `[${g.inisial}]` : ''}
                    </option>
                  ))}
                  <option value="Guru Piket Harian">🚨 Guru Piket Harian</option>
                  <option value="Jam Kosong Terbimbing">⏳ Jam Kosong Terbimbing (Tugas Mandiri)</option>
                </select>
              </div>

              {/* 5. KELAS & JURUSAN DARI DATABASE */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155', display: 'block', marginBottom: '4px' }}>
                    🏫 Kelas & Jurusan:
                  </label>
                  <select
                    value={formKelasInval}
                    onChange={(e) => setFormKelasInval(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '13px',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    {DAFTAR_KELAS_RESMI.filter((k) => k !== 'Semua Kelas').map((k) => (
                      <option key={k} value={k}>
                        Kelas {k}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155', display: 'block', marginBottom: '4px' }}>
                    📚 Mata Pelajaran (Mapel):
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: AIJ, Akuntansi, IPAS..."
                    value={formMapelInval}
                    onChange={(e) => setFormMapelInval(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* 6. UNGGAH BAHAN AJAR / TUGAS KELAS (PDF / JPG / PNG) */}
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  borderRadius: '12px',
                  border: '1.5px dashed #cbd5e1',
                  padding: '14px',
                }}
              >
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155', display: 'block', marginBottom: '4px' }}>
                  📎 Lampirkan Bahan Ajar / Tugas Siswa (PDF / JPG / PNG):
                </label>

                <input
                  type="text"
                  placeholder="Keterangan / Judul Tugas (Opsional)"
                  value={formMateriJudul}
                  onChange={(e) => setFormMateriJudul(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12.5px',
                    marginBottom: '8px',
                    boxSizing: 'border-box',
                  }}
                />

                <input
                  type="file"
                  accept=".pdf,image/png,image/jpeg,image/jpg"
                  onChange={handleInvalFileUpload}
                  style={{ fontSize: '12px', width: '100%' }}
                />

                {formMateriFileName && (
                  <div
                    style={{
                      marginTop: '8px',
                      fontSize: '12px',
                      color: '#16a34a',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>✅ File Terlampir: {formMateriFileName} ({formMateriFileType})</span>
                  </div>
                )}
              </div>

              {/* 7. CHECKBOX KIRIM NOTIFIKASI LONCENG OTOMATIS */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '12.5px',
                  color: '#334155',
                  cursor: 'pointer',
                  fontWeight: '600',
                }}
              >
                <input
                  type="checkbox"
                  checked={formKirimNotif}
                  onChange={(e) => setFormKirimNotif(e.target.checked)}
                  style={{ width: '16px', height: '16px' }}
                />
                <span>🔔 Otomatis kirim notifikasi lonceng ke Guru Inval & Siswa kelas {formKelasInval}</span>
              </label>

              {/* BUTTON SUBMIT */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddInvalModal(false)}
                  style={{
                    flex: 1,
                    backgroundColor: '#f1f5f9',
                    border: 'none',
                    padding: '11px',
                    borderRadius: '10px',
                    fontWeight: '700',
                    fontSize: '13px',
                    color: '#64748b',
                    cursor: 'pointer',
                  }}
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={submittingInval}
                  style={{
                    flex: 2,
                    backgroundColor: '#2563eb',
                    border: 'none',
                    padding: '11px',
                    borderRadius: '10px',
                    fontWeight: '800',
                    fontSize: '13px',
                    color: '#ffffff',
                    cursor: submittingInval ? 'not-allowed' : 'pointer',
                  }}
                >
                  {submittingInval ? '⏳ Menyimpan...' : '🚀 Terbitkan Penugasan Inval'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 📤 MODAL 2: UNGGAH BAHAN AJAR / MODUL KBM BARU */}
      {/* ========================================================================= */}
      {showUploadDocModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '540px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
              padding: '24px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '24px' }}>📤</span>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#1e293b' }}>
                  Unggah Bahan Ajar & Modul KBM
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowUploadDocModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDoc} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Judul Bahan Ajar / Modul:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Modul Praktikum Routing Mikrotik Fase F"
                  value={docJudul}
                  onChange={(e) => setDocJudul(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Mata Pelajaran (Mapel):
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: AIJ, Akuntansi, IPAS..."
                    value={docMapel}
                    onChange={(e) => setDocMapel(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Kelas Target:
                  </label>
                  <select
                    value={docKelas}
                    onChange={(e) => {
                      setDocKelas(e.target.value);
                      const parts = e.target.value.split(' ');
                      if (parts[1]) setDocJurusan(parts[1]);
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '13px',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    {DAFTAR_KELAS_RESMI.map((k) => (
                      <option key={k} value={k}>
                        {k === 'Semua Kelas' ? '🌐 Semua Kelas' : `Kelas ${k}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Ringkasan / Petunjuk Belajar:
                </label>
                <textarea
                  rows="3"
                  placeholder="Tuliskan petunjuk pengerjaan tugas atau ringkasan kompetensi modul..."
                  value={docRingkasan}
                  onChange={(e) => setDocRingkasan(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* UPLOAD FILE PDF / JPG */}
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  borderRadius: '12px',
                  border: '1.5px dashed #cbd5e1',
                  padding: '14px',
                }}
              >
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Pilih File Modul (Format PDF / JPG / PNG Maksimal 8MB):
                </label>
                <input
                  type="file"
                  accept=".pdf,image/png,image/jpeg,image/jpg"
                  onChange={handleDocFileUpload}
                  style={{ fontSize: '12px', width: '100%' }}
                />

                {docFileName && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#16a34a', fontWeight: '700' }}>
                    ✅ File Siap Diunggah: {docFileName} ({docFileType})
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowUploadDocModal(false)}
                  style={{
                    flex: 1,
                    backgroundColor: '#f1f5f9',
                    border: 'none',
                    padding: '11px',
                    borderRadius: '10px',
                    fontWeight: '700',
                    fontSize: '13px',
                    color: '#64748b',
                    cursor: 'pointer',
                  }}
                >
                  Batal
                </button>

                <button
                  type="submit"
                  style={{
                    flex: 2,
                    backgroundColor: '#2563eb',
                    border: 'none',
                    padding: '11px',
                    borderRadius: '10px',
                    fontWeight: '800',
                    fontSize: '13px',
                    color: '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  📤 Simpan & Terbitkan Bahan Ajar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 👁️ MODAL 3: PEMBACA DOKUMEN & IMAGE VIEWER (PDF / JPG) */}
      {/* ========================================================================= */}
      {isViewerOpen && activeViewerDoc && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(6px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '12px',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '18px',
              width: '100%',
              maxWidth: '900px',
              height: '92vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.35)',
              overflow: 'hidden',
            }}
          >
            {/* VIEWER HEADER */}
            <div
              style={{
                backgroundColor: '#1e293b',
                color: '#ffffff',
                padding: '14px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800' }}>
                  {activeViewerDoc.judul}
                </h4>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                  {activeViewerDoc.mapel || 'Bahan Ajar KBM'} • {activeViewerDoc.guru_pengunggah || 'Guru SMK YPK'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {activeViewerDoc.file_url && (
                  <a
                    href={activeViewerDoc.file_url}
                    download={activeViewerDoc.file_name || 'Bahan_Ajar.pdf'}
                    style={{
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      textDecoration: 'none',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: '700',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>📥</span>
                    <span>Unduh</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => setIsViewerOpen(false)}
                  style={{
                    background: '#334155',
                    border: 'none',
                    color: '#ffffff',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  ✕ Tutup
                </button>
              </div>
            </div>

            {/* VIEWER BODY (IFRAME FOR PDF / IMG FOR JPG) */}
            <div style={{ flex: 1, backgroundColor: '#f8fafc', overflowY: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {activeViewerDoc.file_url ? (
                activeViewerDoc.tipe_file === 'JPG' ||
                activeViewerDoc.tipe_file === 'PNG' ||
                String(activeViewerDoc.file_name || '').match(/\.(jpg|jpeg|png)$/i) ? (
                  <div style={{ padding: '20px', textAlign: 'center' }}>
                    <img
                      src={activeViewerDoc.file_url}
                      alt={activeViewerDoc.judul}
                      style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                  </div>
                ) : (
                  <iframe
                    src={activeViewerDoc.file_url}
                    title={activeViewerDoc.judul}
                    style={{ width: '100%', height: '100%', border: 'none' }}
                  />
                )
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                  <div style={{ fontSize: '36px', marginBottom: '8px' }}>📄</div>
                  <h4 style={{ margin: '0 0 4px', color: '#1e293b' }}>Pratinjau Dokumen Siap</h4>
                  <p style={{ margin: 0, fontSize: '13px' }}>
                    Modul ini terdaftar di kurikulum KBM SMK YPK Medan.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
