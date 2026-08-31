'use client';

import React, { useState, useEffect, useMemo, Component } from 'react';
import Swal from 'sweetalert2';

// 📚 DAFTAR KELAS RESMI SMK YPK MEDAN
const DAFTAR_KELAS_RESMI = [
  'Semua Kelas',
  'X TJKT', 'X AKL', 'X MPLB', 'X PM',
  'XI TJKT', 'XI AKL', 'XI MPLB', 'XI PM',
  'XII TJKT', 'XII AKL', 'XII MPLB', 'XII PM'
];

// ⏰ DAFTAR LES / JAM PELAJARAN RESMI (JAM 1 S.D. 11)
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
  { jam: 'Seharian Penuh (Jam 1 - 11)', val: '1 - 11' },
];

const getSafeTodayStr = () => {
  try {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (e) {
    return '2026-09-01';
  }
};

class BahanAjarErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, errorMsg: String(error?.message || 'Error loading view') };
  }
  componentDidCatch(error, errorInfo) {
    console.error('BahanAjar Catch:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ maxWidth: '800px', margin: '30px auto', padding: '24px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1.5px solid #e2e8f0', textAlign: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: '36px', marginBottom: '10px' }}>👨‍🏫</div>
          <h3 style={{ margin: '0 0 8px', color: '#1e293b', fontSize: '18px', fontWeight: '800' }}>Layanan Inval & Bahan Ajar SMK YPK</h3>
          <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '16px' }}>{this.state.errorMsg}</p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, errorMsg: '' })}
            style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}
          >
            🔄 Muat Ulang Modul Inval
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function BahanAjarContent({
  currentUser = {},
  isMasterIqbal = false,
  isSiswaAdmin = false,
  siswaAdminKelas = '',
  guruList = [],
  siswaList = [],
  invalList = [],
  setInvalList,
  onInvalAdded,
  onPushNotification,
  activeSubMenu = 'rekap_inval',
  onSubMenuChange,
}) {
  const safeUser = currentUser || {};

  // 🛑 DETEKSI STATUS SISWA (SISWA BIASA & SISWA ADMIN)
  const isSiswaUser = Boolean(
    String(safeUser?.id || '').startsWith('SISWA-') ||
    safeUser?.kelas ||
    safeUser?.nisn ||
    safeUser?.nis ||
    isSiswaAdmin ||
    String(safeUser?.role || '').toLowerCase().includes('siswa')
  );

  // 🔒 HAK AKSES MANAJEMEN: HANYA GURU RESMI & MASTER IQBAL YANG DAPAT MENGUBAH/MENAMBAH/MENGHAPUS (SISWA HANYA READ ONLY)
  const isRealGuruOrMaster = Boolean(
    !isSiswaUser && (
      isMasterIqbal ||
      String(safeUser?.username || '').toLowerCase() === 'iqbal' ||
      String(safeUser?.nama || '').toLowerCase().includes('iqbal') ||
      safeUser?.role?.toLowerCase() === 'master' ||
      (safeUser?.isGuru && !String(safeUser?.id || '').startsWith('SISWA-')) ||
      (safeUser?.role?.toLowerCase() === 'admin' && !String(safeUser?.id || '').startsWith('SISWA-') && !safeUser?.kelas)
    )
  );

  const canManageInval = isRealGuruOrMaster;

  // Sub Tab Navigation: 'rekap_inval' | 'materi_jurusan'
  const [activeTab, setActiveTab] = useState(activeSubMenu || (isSiswaUser ? 'materi_jurusan' : 'rekap_inval'));

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
  const [localInvalList, setLocalInvalList] = useState(Array.isArray(invalList) ? invalList : []);
  const [loadingInval, setLoadingInval] = useState(false);
  const [filterKelasInval, setFilterKelasInval] = useState('Semua Kelas');
  const [searchInval, setSearchInval] = useState('');
  const [showAddInvalModal, setShowAddInvalModal] = useState(false);

  // 📝 STATE FORM PENUGASAN MULTI-JAM INVAL GURU
  const [formGuruUtama, setFormGuruUtama] = useState('');
  const [formAlasan, setFormAlasan] = useState('SAKIT');
  const [formTanggal, setFormTanggal] = useState(getSafeTodayStr());
  const [formGlobalMateriNama, setFormGlobalMateriNama] = useState('');
  const [formGlobalFileBase64, setFormGlobalFileBase64] = useState('');
  const [formGlobalFileName, setFormGlobalFileName] = useState('');
  const [formGlobalFileType, setFormGlobalFileType] = useState('PDF');
  const [formKirimNotif, setFormKirimNotif] = useState(true);
  const [submittingInval, setSubmittingInval] = useState(false);

  // Sesi jam KBM
  const [invalSessions, setInvalSessions] = useState([
    {
      id: 1,
      jam_ke: '1 - 2',
      kelas: 'XI TJKT',
      guru_inval: '',
      mapel: '',
      materi_nama: '',
    },
    {
      id: 2,
      jam_ke: '3 - 4',
      kelas: 'X AKL',
      guru_inval: '',
      mapel: '',
      materi_nama: '',
    },
  ]);

  // Handler Tambah Baris Sesi Jam KBM
  const handleAddSession = () => {
    if (!canManageInval) return;
    if (invalSessions.length >= 11) {
      Swal.fire({
        icon: 'info',
        title: 'Batas Maksimal Jam',
        text: 'Maksimal 11 sesi jam pelajaran KBM dalam 1 hari.',
      });
      return;
    }
    const nextId = Date.now() + Math.random();
    const nextJamVal = `${invalSessions.length + 1}`;
    setInvalSessions((prev) => [
      ...prev,
      {
        id: nextId,
        jam_ke: nextJamVal,
        kelas: 'XI TJKT',
        guru_inval: '',
        mapel: '',
        materi_nama: '',
      },
    ]);
  };

  // Handler Hapus Baris Sesi Jam KBM
  const handleRemoveSession = (idToRemove) => {
    if (!canManageInval) return;
    if (invalSessions.length <= 1) {
      Swal.fire({
        icon: 'warning',
        title: 'Minimal 1 Jam',
        text: 'Minimal harus ada 1 sesi jam pelajaran dalam form penugasan.',
      });
      return;
    }
    setInvalSessions((prev) => prev.filter((s) => s.id !== idToRemove));
  };

  // Handler Update Baris Sesi
  const handleUpdateSession = (idToUpdate, field, value) => {
    if (!canManageInval) return;
    setInvalSessions((prev) =>
      prev.map((s) => (s.id === idToUpdate ? { ...s, [field]: value } : s))
    );
  };

  // Handler Isi Cepat Preset Jam 1 s.d 11
  const handleFillAllHours = () => {
    if (!canManageInval) return;
    const hours = [
      { id: 1, jam_ke: '1 - 2', kelas: 'XI TJKT', guru_inval: '', mapel: '', materi_nama: '' },
      { id: 2, jam_ke: '3 - 4', kelas: 'X AKL', guru_inval: '', mapel: '', materi_nama: '' },
      { id: 3, jam_ke: '5', kelas: 'XI MPLB', guru_inval: '', mapel: '', materi_nama: '' },
      { id: 4, jam_ke: '6 - 7', kelas: 'XII PM', guru_inval: '', mapel: '', materi_nama: '' },
      { id: 5, jam_ke: '8 - 9', kelas: 'X TJKT', guru_inval: '', mapel: '', materi_nama: '' },
      { id: 6, jam_ke: '10 - 11', kelas: 'XI AKL', guru_inval: '', mapel: '', materi_nama: '' },
    ];
    setInvalSessions(hours);
  };

  // State Dokumen Bahan Ajar / Modul KBM
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
      if (json && json.success && Array.isArray(json.data)) {
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

  useEffect(() => {
    if (Array.isArray(invalList) && invalList.length > 0) {
      setLocalInvalList(invalList);
    }
  }, [invalList]);

  // Load Dokumen Bahan Ajar dari LocalStorage
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('smk_ypk_perangkat_ajar_docs');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) setDocuments(parsed);
        }
      }
    } catch (e) {}
  }, []);

  const saveDocumentsToStorage = (newDocs) => {
    setDocuments(newDocs);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('smk_ypk_perangkat_ajar_docs', JSON.stringify(newDocs));
      }
    } catch (e) {}
  };

  // Handle Global File Upload for Inval Form
  const handleGlobalInvalFileUpload = (e) => {
    if (!canManageInval) return;
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
      setFormGlobalFileBase64(uploadEvent.target.result);
      setFormGlobalFileName(file.name);
      setFormGlobalFileType(fileType);
    };
    reader.readAsDataURL(file);
  };

  // Handle File Upload for General Module
  const handleDocFileUpload = (e) => {
    if (!canManageInval) return;
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

  // Submit Penugasan Inval Multi-Jam Baru
  const handleSaveMultiInval = async (e) => {
    e.preventDefault();
    if (!canManageInval) {
      Swal.fire({ icon: 'error', title: 'Akses Ditolak', text: 'Siswa hanya memiliki hak akses melihat bahan ajar.' });
      return;
    }

    if (!formGuruUtama) {
      Swal.fire({
        icon: 'warning',
        title: 'Pilih Guru',
        text: 'Mohon pilih Guru yang Tidak Hadir / Berhalangan terlebih dahulu.',
      });
      return;
    }

    const validSessions = invalSessions.filter((s) => s.jam_ke && (s.guru_inval || s.kelas));
    if (validSessions.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Jadwal Kosong',
        text: 'Mohon lengkapi minimal 1 sesi jam pelajaran dan guru pengganti.',
      });
      return;
    }

    setSubmittingInval(true);

    const assignmentsPayload = validSessions.map((s) => ({
      jam_ke: s.jam_ke,
      kelas: s.kelas || 'XI TJKT',
      nama_guru_inval: s.guru_inval || 'Guru Piket Harian',
      mapel: s.mapel || 'KBM Reguler',
      materi_nama: s.materi_nama || formGlobalMateriNama || (formGlobalFileName ? `Bahan Ajar (${s.kelas})` : ''),
      materi_file_base64: formGlobalFileBase64 || '',
      materi_file_name: formGlobalFileName || '',
      materi_file_type: formGlobalFileType || 'PDF',
      alasan: formAlasan,
    }));

    const payload = {
      tanggal: formTanggal || getSafeTodayStr(),
      nama_guru_utama: formGuruUtama,
      alasan: formAlasan,
      assigned_by: safeUser?.nama || 'Admin Guru',
      materi_file_base64: formGlobalFileBase64 || '',
      materi_file_name: formGlobalFileName || '',
      materi_file_type: formGlobalFileType || 'PDF',
      assignments: assignmentsPayload,
    };

    try {
      const res = await fetch('/api/inval-guru', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resJson = await res.json();
      if (!resJson.success) {
        throw new Error(resJson.error || 'Gagal menyimpan data inval');
      }

      // Simpan dokumen tugas jika ada file lampiran
      if (formGlobalFileBase64 && formGlobalFileName) {
        validSessions.forEach((s) => {
          const newDocItem = {
            id: `INVAL-DOC-${Date.now()}-${s.id}`,
            kategori: 'Tugas Inval',
            judul: s.materi_nama || formGlobalMateriNama || `Tugas Inval: ${s.mapel || 'KBM'} (${s.kelas})`,
            mapel: s.mapel || 'Tugas Mandiri',
            kelas_target: s.kelas,
            jurusan: s.kelas.split(' ')[1] || 'Umum',
            guru_pengunggah: `${formGuruUtama} (Inval: ${s.guru_inval || 'Pengganti'})`,
            tipe_file: formGlobalFileType || 'PDF',
            file_name: formGlobalFileName,
            file_url: formGlobalFileBase64,
            ringkasan: `Bahan Ajar & Tugas Kelas ${s.kelas} untuk Jam Ke-${s.jam_ke}. Guru Pengganti: ${s.guru_inval}.`,
            created_at: new Date().toISOString(),
          };
          saveDocumentsToStorage([newDocItem, ...documents]);
        });
      }

      // 🔔 KIRIM NOTIFIKASI LONCENG OTOMATIS
      if (formKirimNotif && onPushNotification) {
        validSessions.forEach((s) => {
          if (s.guru_inval && !s.guru_inval.includes('Kosong')) {
            onPushNotification({
              id: `NOTIF-INVAL-GURU-${Date.now()}-${s.id}`,
              type: 'inval_tugas',
              judul: `🚨 Tugas Inval: Kelas ${s.kelas} (Jam ${s.jam_ke})`,
              ringkasan: `Anda ditugaskan menginval kelas ${s.kelas} jam ke-${s.jam_ke} menggantikan ${formGuruUtama} (Mapel: ${s.mapel || '-'}).`,
              targetAudience: 'Guru',
              guru_inval: s.guru_inval,
              targetGuru: s.guru_inval,
              waktu: 'Sekarang',
              tanggal: formTanggal || getSafeTodayStr(),
              isRead: false,
            });
          }

          onPushNotification({
            id: `NOTIF-INVAL-SISWA-${Date.now()}-${s.id}`,
            type: 'inval_info',
            judul: `📚 Info Guru Inval: Jam Ke-${s.jam_ke} (${s.kelas})`,
            ringkasan: `Jam pelajaran ke-${s.jam_ke} (${s.mapel || 'KBM'}) akan diampu oleh Bapak/Ibu ${s.guru_inval || 'Guru Pengganti'} menggantikan ${formGuruUtama}. Silakan cek bahan ajar yang terlampir.`,
            targetAudience: 'Siswa',
            targetKelas: s.kelas,
            waktu: 'Sekarang',
            tanggal: formTanggal || getSafeTodayStr(),
            isRead: false,
          });
        });
      }

      Swal.fire({
        icon: 'success',
        title: 'Penugasan Inval Berhasil Diterbitkan!',
        html: `Sebanyak <b>${validSessions.length} sesi jam KBM</b> untuk menggantikan <b>${formGuruUtama}</b> telah tersimpan di database dan siap dicetak/dilihat.<br><br><span style="color:#16a34a;font-size:12px;">✅ Notifikasi lonceng otomatis dikirim ke Guru Inval dan Siswa kelas terkait.</span>`,
        confirmButtonColor: '#2563eb',
      });

      setShowAddInvalModal(false);
      setFormGuruUtama('');
      setFormGlobalMateriNama('');
      setFormGlobalFileBase64('');
      setFormGlobalFileName('');
      setInvalSessions([
        { id: 1, jam_ke: '1 - 2', kelas: 'XI TJKT', guru_inval: '', mapel: '', materi_nama: '' },
      ]);

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
      Swal.fire({ icon: 'error', title: 'Akses Ditolak', text: 'Siswa hanya dapat melihat bahan ajar dan tidak memiliki izin menghapus.' });
      return;
    }

    const confirmRes = await Swal.fire({
      title: 'Hapus Penugasan Inval?',
      html: `Apakah Anda yakin ingin membatalkan penugasan inval kelas <b>${invalItem?.kelas || '-'}</b> (Jam: <b>${invalItem?.jam_ke || '-'}</b>) oleh <b>${invalItem?.nama_guru_inval || invalItem?.guru_inval || '-'}</b>?`,
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
          deleted_by: safeUser?.nama || 'Admin Guru',
        }),
      });

      const resJson = await res.json();
      if (resJson.success) {
        setLocalInvalList((prev) => (Array.isArray(prev) ? prev.filter((item) => item?.id !== invalItem.id) : []));
        if (setInvalList) {
          setInvalList((prev) => (Array.isArray(prev) ? prev.filter((item) => item?.id !== invalItem.id) : []));
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
      setLocalInvalList((prev) => (Array.isArray(prev) ? prev.filter((item) => item?.id !== invalItem.id) : []));
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
    if (!canManageInval) {
      Swal.fire({ icon: 'error', title: 'Akses Ditolak', text: 'Siswa hanya dapat melihat bahan ajar dan tidak memiliki izin mengunggah.' });
      return;
    }

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
      guru_pengunggah: safeUser?.nama || 'Bapak/Ibu Guru',
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
    if (!canManageInval) {
      Swal.fire({ icon: 'error', title: 'Akses Ditolak', text: 'Siswa tidak memiliki izin menghapus bahan ajar.' });
      return;
    }

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
        const updated = documents.filter((d) => d && d.id !== docId);
        saveDocumentsToStorage(updated);
        Swal.fire({ icon: 'success', title: 'Berhasil Dihapus', timer: 1500, showConfirmButton: false });
      }
    });
  };

  const handleOpenViewer = (doc) => {
    setActiveViewerDoc(doc);
    setIsViewerOpen(true);
  };

  // Filtered Inval List
  const filteredInvalList = useMemo(() => {
    const studentKelas = String(safeUser.kelas || siswaAdminKelas || '').toUpperCase().trim();
    const safeList = Array.isArray(localInvalList) ? localInvalList : [];

    return safeList.filter((inv) => {
      if (!inv || typeof inv !== 'object') return false;

      if (isSiswaUser && studentKelas) {
        const invK = String(inv.kelas || '').toUpperCase().trim();
        if (invK !== studentKelas && !invK.includes(studentKelas) && !studentKelas.includes(invK)) {
          return false;
        }
      }

      if (filterKelasInval !== 'Semua Kelas') {
        const invK = String(inv.kelas || '').toUpperCase().trim();
        if (invK !== filterKelasInval.toUpperCase().trim()) return false;
      }

      if (searchInval && searchInval.trim()) {
        const q = searchInval.toLowerCase();
        const guruUtama = String(inv.nama_guru_utama || '').toLowerCase();
        const guruInval = String(inv.nama_guru_inval || inv.guru_inval || '').toLowerCase();
        const kelas = String(inv.kelas || '').toLowerCase();
        const mapel = String(inv.mapel || '').toLowerCase();
        return guruUtama.includes(q) || guruInval.includes(q) || kelas.includes(q) || mapel.includes(q);
      }

      return true;
    });
  }, [localInvalList, filterKelasInval, searchInval, safeUser, siswaAdminKelas, isSiswaUser]);

  // Filtered Documents List
  const filteredDocList = useMemo(() => {
    const studentKelas = String(safeUser.kelas || siswaAdminKelas || '').toUpperCase().trim();
    const studentJurusan = String(safeUser.jurusan || '').toUpperCase().trim();
    const safeDocs = Array.isArray(documents) ? documents : [];

    return safeDocs.filter((doc) => {
      if (!doc || typeof doc !== 'object') return false;

      if (isSiswaUser && studentKelas) {
        const targetK = String(doc.kelas_target || '').toUpperCase().trim();
        const targetJ = String(doc.jurusan || '').toUpperCase().trim();

        const matchK = targetK === 'SEMUA KELAS' || targetK === 'SEMUA' || targetK === studentKelas || studentKelas.includes(targetK) || targetK.includes(studentKelas);
        const matchJ = targetJ === 'SEMUA' || targetJ === 'SEMUA JURUSAN' || (studentJurusan && targetJ === studentJurusan) || studentKelas.includes(targetJ);

        if (!matchK && !matchJ) return false;
      }

      if (filterKelasDoc !== 'Semua Kelas') {
        if (doc.kelas_target !== filterKelasDoc && doc.kelas_target !== 'Semua Kelas') return false;
      }

      if (filterJurusanDoc !== 'Semua') {
        if (doc.jurusan !== filterJurusanDoc && doc.jurusan !== 'Semua') return false;
      }

      if (searchDocQuery && searchDocQuery.trim()) {
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
  }, [documents, filterKelasDoc, filterJurusanDoc, searchDocQuery, isSiswaUser, safeUser, siswaAdminKelas]);

  const safeGuruList = Array.isArray(guruList) ? guruList : [];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px 12px 60px' }}>
      
      {/* 🌟 HEADER UTAMA LAYANAN INVAL & BAHAN AJAR */}
      <div
        style={{
          background: isSiswaUser
            ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)'
            : 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 60%, #3b82f6 100%)',
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
            <span style={{ fontSize: '24px' }}>{isSiswaUser ? '📚' : '👨‍🏫'}</span>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', letterSpacing: '-0.3px' }}>
              {isSiswaUser ? 'Bahan Ajar & Jadwal Inval Siswa' : 'Layanan Inval & Bahan Ajar KBM'}
            </h1>
            <span
              style={{
                backgroundColor: isSiswaUser ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                padding: '3px 10px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: '700',
              }}
            >
              {isSiswaUser ? `SISWA - KELAS ${safeUser?.kelas || siswaAdminKelas || 'SMK YPK'}` : 'SMK YPK MEDAN'}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '13px', opacity: 0.92, maxWidth: '650px', lineHeight: 1.45 }}>
            {isSiswaUser
              ? 'Akses modul bahan ajar resmi guru (PDF & JPG), materi tugas, serta pantau jadwal guru pengganti (Inval) kelas Anda.'
              : 'Pengelolaan Guru Pengganti (Inval) multi-jam (Les 1 s.d 11), rekap cetak Form resmi dengan inisial guru & TTD Hendrawan, serta distribusi materi format PDF & JPG.'}
          </p>
        </div>

        {/* TOMBOL AKSI CEPAT (HANYA MUNCUL UNTUK GURU & ADMIN MASTER) */}
        {canManageInval && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => {
                const today = getSafeTodayStr();
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
              }}
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
              }}
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
          <span>{isSiswaUser ? 'Jadwal Inval Kelas Saya' : 'Jadwal & Rekap Inval Guru'}</span>
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
      </div>

      {/* 📂 TAB 1 (UTAMA SISWA): BAHAN AJAR & MODUL KBM DIGITAL */}
      {activeTab === 'materi_jurusan' && (
        <div>
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

              {!isSiswaUser && (
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
              )}

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

            {/* TOMBOL UNGGAH HANYA UNTUK GURU / ADMIN */}
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
                {isSiswaUser
                  ? 'Bapak/Ibu Guru belum mengunggah bahan ajar atau modul digital untuk kelas Anda saat ini.'
                  : 'Silakan unggah modul bahan ajar baru dalam format PDF atau JPG untuk dibagikan ke siswa.'}
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
              {filteredDocList.map((doc) => {
                const isPdf = doc?.tipe_file === 'PDF' || String(doc?.file_name || '').endsWith('.pdf');
                return (
                  <div
                    key={doc?.id || Math.random()}
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
                          🎯 {doc?.kelas_target || 'Semua Kelas'}
                        </span>
                      </div>

                      <h4 style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: '800', color: '#0f172a', lineHeight: 1.4 }}>
                        {doc?.judul}
                      </h4>

                      <div style={{ fontSize: '12px', color: '#2563eb', fontWeight: '700', marginBottom: '6px' }}>
                        📚 Mapel: {doc?.mapel}
                      </div>

                      <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: 1.45 }}>
                        {doc?.ringkasan}
                      </p>
                    </div>

                    <div>
                      <div style={{ fontSize: '11.5px', color: '#475569', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>👨‍🏫</span>
                        <span>Oleh: <b>{doc?.guru_pengunggah}</b></span>
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
                          <span>Buka & Baca Materi</span>
                        </button>

                        {/* TOMBOL HAPUS DOKUMEN HANYA UNTUK GURU/ADMIN */}
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

      {/* 📋 TAB 2: JADWAL & REKAP INVAL GURU */}
      {activeTab === 'rekap_inval' && (
        <div>
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

              {!isSiswaUser && (
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
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {canManageInval && (
                <button
                  type="button"
                  onClick={() => {
                    const today = getSafeTodayStr();
                    window.open(`/api/inval-guru/print?tanggal=${today}`, '_blank');
                  }}
                  style={{
                    backgroundColor: '#15803d',
                    color: '#ffffff',
                    border: 'none',
                    padding: '9px 14px',
                    borderRadius: '10px',
                    fontSize: '12.5px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>🖨️</span>
                  <span>Print Form Hari Ini</span>
                </button>
              )}

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
                <span>Refresh</span>
              </button>
            </div>
          </div>

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
                Tidak Ada Jadwal Inval
              </h3>
              <p style={{ margin: '0 0 16px', fontSize: '13px', maxWidth: '420px', marginInline: 'auto' }}>
                {isSiswaUser
                  ? 'Seluruh Bapak/Ibu Guru hadir sesuai jadwal KBM normal di kelas Anda.'
                  : 'Seluruh Bapak/Ibu Guru hadir sesuai jadwal KBM normal atau belum ada penugasan guru pengganti.'}
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
              {filteredInvalList.map((inv, idx) => {
                const isFree = String(inv?.nama_guru_inval || inv?.guru_inval || '').includes('Jam Kosong') || inv?.nama_guru_inval === '-';
                const hasFile = Boolean(inv?.materi_file_base64 || inv?.materi_url || inv?.bahan_ajar_url);
                const isCurrentUserInval =
                  safeUser?.nama &&
                  String(inv?.nama_guru_inval || inv?.guru_inval || '').toLowerCase().trim() === String(safeUser.nama).toLowerCase().trim();

                return (
                  <div
                    key={inv?.id || idx}
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
                          🏫 Kelas {inv?.kelas || '-'}
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
                          {isFree ? '⏳ Jam Kosong' : '✅ ' + (inv?.status_inval || 'Ditugaskan')}
                        </span>
                      </div>

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
                        <span>Jam Pelajaran (Les): <b>{inv?.jam_ke || '-'}</b></span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                        <div>
                          <span style={{ color: '#64748b', fontSize: '11.5px', display: 'block' }}>Guru yang Tidak Hadir:</span>
                          <div style={{ fontWeight: '800', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>👨‍🏫</span>
                            <span>{inv?.nama_guru_utama || 'Guru Utama'}</span>
                            {inv?.alasan && (
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
                            <span>{inv?.nama_guru_inval || inv?.guru_inval || '-'}</span>
                          </div>
                        </div>

                        <div>
                          <span style={{ color: '#64748b', fontSize: '11.5px', display: 'block' }}>Mata Pelajaran (Mapel):</span>
                          <div style={{ fontWeight: '700', color: '#1e293b' }}>
                            📚 {inv?.mapel || 'KBM Reguler'}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        gap: '8px',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingTop: '10px',
                        borderTop: '1px solid #f1f5f9',
                        flexWrap: 'wrap',
                      }}
                    >
                      {hasFile ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleOpenViewer({
                              judul: inv?.materi_nama || `Bahan Ajar Inval (${inv?.kelas || '-'})`,
                              file_url: inv?.materi_file_base64 || inv?.materi_url || inv?.bahan_ajar_url,
                              file_name: inv?.materi_file_name || 'Bahan_Ajar.pdf',
                              tipe_file: inv?.materi_file_type || 'PDF',
                              mapel: inv?.mapel,
                              guru_pengunggah: inv?.nama_guru_utama,
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
                          <span>Buka Materi</span>
                        </button>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>
                          Tidak ada lampiran file
                        </span>
                      )}

                      {/* AKSI CETAK & HAPUS HANYA UNTUK GURU & ADMIN */}
                      {canManageInval && (
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={() => {
                              window.open(`/api/inval-guru/print?tanggal=${inv?.tanggal || getSafeTodayStr()}&guru=${encodeURIComponent(inv?.nama_guru_utama || '')}`, '_blank');
                            }}
                            title="Cetak Form Guru Ini"
                            style={{
                              backgroundColor: '#f1f5f9',
                              color: '#15803d',
                              border: '1px solid #cbd5e1',
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
                            <span>🖨️</span>
                            <span>Form</span>
                          </button>

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
                          </button>
                        </div>
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
      {/* ➕ MODAL 1: FORM PENUGASAN MULTI-JAM INVAL GURU (JAM 1 S.D 11) */}
      {/* ========================================================================= */}
      {showAddInvalModal && canManageInval && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(5px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '12px',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '680px',
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
              padding: '20px',
              boxSizing: 'border-box',
            }}
          >
            {/* MODAL HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '26px' }}>👨‍🏫</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#1e293b' }}>
                    Form Penugasan Inval Guru
                  </h3>
                  <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                    Atur jadwal les (Jam 1 - 11) & guru pengganti berbeda di tiap jam
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddInvalModal(false)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  fontSize: '18px',
                  cursor: 'pointer',
                  color: '#64748b',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMultiInval} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* 1. GURU UTAMA & ALASAN */}
              <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ marginBottom: '10px' }}>
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
                      fontWeight: '600',
                    }}
                  >
                    <option value="">-- Pilih Guru dari Database tb_guru --</option>
                    {safeGuruList.map((g, idx) => (
                      <option key={g?.id || g?.nama_guru || idx} value={g?.nama_guru || g?.nama || ''}>
                        {g?.inisial ? `[${g.inisial}] ` : ''}{g?.nama_guru || g?.nama || 'Guru'}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155', display: 'block', marginBottom: '4px' }}>
                      Alasan Tidak Hadir:
                    </label>
                    <select
                      value={formAlasan}
                      onChange={(e) => setFormAlasan(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 10px',
                        borderRadius: '10px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '12.5px',
                        backgroundColor: '#ffffff',
                      }}
                    >
                      <option value="SAKIT">🟡 Sakit (Sakit Surat/Klinik)</option>
                      <option value="IZIN">🟣 Izin / Keperluan Mendesak</option>
                      <option value="DINAS LUAR">🔵 Dinas Luar / Pelatihan</option>
                      <option value="CUTI">🟢 Cuti Resmi</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155', display: 'block', marginBottom: '4px' }}>
                      📅 Tanggal Inval:
                    </label>
                    <input
                      type="date"
                      value={formTanggal}
                      onChange={(e) => setFormTanggal(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 10px',
                        borderRadius: '10px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '12.5px',
                        backgroundColor: '#ffffff',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* 2. DAFTAR SESI JAM KBM */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>⏰</span>
                    <span>Jadwal Les & Guru Pengganti (Inval Tiap Jam)</span>
                    <span style={{ backgroundColor: '#2563eb', color: '#ffffff', fontSize: '11px', padding: '1px 7px', borderRadius: '10px' }}>
                      {invalSessions.length} Jam/Sesi
                    </span>
                  </label>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={handleFillAllHours}
                      style={{
                        backgroundColor: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        color: '#334155',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '11.5px',
                        fontWeight: '700',
                        cursor: 'pointer',
                      }}
                    >
                      ⚡ Isi Cepat Jam 1-11
                    </button>

                    <button
                      type="button"
                      onClick={handleAddSession}
                      style={{
                        backgroundColor: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        color: '#2563eb',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '11.5px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span>➕</span>
                      <span>Tambah Jam</span>
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {invalSessions.map((session, index) => (
                    <div
                      key={session.id}
                      style={{
                        backgroundColor: '#ffffff',
                        border: '1.5px solid #cbd5e1',
                        borderRadius: '12px',
                        padding: '12px',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        position: 'relative',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '800', color: '#2563eb' }}>
                          📌 Sesi #{index + 1}
                        </span>

                        {invalSessions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSession(session.id)}
                            style={{
                              backgroundColor: '#fee2e2',
                              color: '#dc2626',
                              border: 'none',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: '700',
                              cursor: 'pointer',
                            }}
                          >
                            🗑️ Hapus Sesi
                          </button>
                        )}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                          <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '2px' }}>
                            ⏰ Jam Pelajaran (Les):
                          </label>
                          <select
                            value={session.jam_ke}
                            onChange={(e) => handleUpdateSession(session.id, 'jam_ke', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '8px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              fontSize: '12px',
                              backgroundColor: '#f8fafc',
                              fontWeight: '600',
                            }}
                          >
                            {DAFTAR_JAM_PELAJARAN.map((j) => (
                              <option key={j.val} value={j.val}>
                                {j.jam}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '2px' }}>
                            🏫 Kelas:
                          </label>
                          <select
                            value={session.kelas}
                            onChange={(e) => handleUpdateSession(session.id, 'kelas', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '8px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              fontSize: '12px',
                              backgroundColor: '#f8fafc',
                              fontWeight: '600',
                            }}
                          >
                            {DAFTAR_KELAS_RESMI.filter((k) => k !== 'Semua Kelas').map((k) => (
                              <option key={k} value={k}>
                                Kelas {k}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '8px' }}>
                        <div>
                          <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '2px' }}>
                            🔄 Guru Pengganti (Inval Jam Ini):
                          </label>
                          <select
                            value={session.guru_inval}
                            onChange={(e) => handleUpdateSession(session.id, 'guru_inval', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '8px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              fontSize: '12px',
                              backgroundColor: '#ffffff',
                              fontWeight: '700',
                              color: '#15803d',
                            }}
                          >
                            <option value="">-- Pilih Guru Pengganti (tb_guru) --</option>
                            {safeGuruList.map((g, idx) => (
                              <option key={g?.id || g?.nama_guru || idx} value={g?.nama_guru || g?.nama || ''}>
                                {g?.inisial ? `[${g.inisial}] ` : ''}{g?.nama_guru || g?.nama || 'Guru'}
                              </option>
                            ))}
                            <option value="Guru Piket Harian">🚨 Guru Piket Harian</option>
                            <option value="Jam Kosong Terbimbing">⏳ Jam Kosong Terbimbing (Tugas Mandiri)</option>
                          </select>
                        </div>

                        <div>
                          <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '2px' }}>
                            📚 Mata Pelajaran:
                          </label>
                          <input
                            type="text"
                            placeholder="Contoh: AIJ, IPAS..."
                            value={session.mapel}
                            onChange={(e) => handleUpdateSession(session.id, 'mapel', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '8px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              fontSize: '12px',
                              boxSizing: 'border-box',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddSession}
                  style={{
                    width: '100%',
                    marginTop: '8px',
                    padding: '8px',
                    borderRadius: '10px',
                    border: '1.5px dashed #3b82f6',
                    backgroundColor: '#eff6ff',
                    color: '#2563eb',
                    fontWeight: '800',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  ➕ Tambah Jam / Les Pelajaran Lainnya
                </button>
              </div>

              {/* 3. LAMPIRAN BAHAN AJAR / TUGAS GLOBAL */}
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  borderRadius: '12px',
                  border: '1.5px dashed #cbd5e1',
                  padding: '12px',
                }}
              >
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155', display: 'block', marginBottom: '4px' }}>
                  📎 Lampirkan Bahan Ajar / Modul / Tugas Siswa (PDF / JPG / PNG):
                </label>

                <input
                  type="text"
                  placeholder="Keterangan / Judul Tugas (misal: Modul AIJ Hal. 24)"
                  value={formGlobalMateriNama}
                  onChange={(e) => setFormGlobalMateriNama(e.target.value)}
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
                  onChange={handleGlobalInvalFileUpload}
                  style={{ fontSize: '12px', width: '100%' }}
                />

                {formGlobalFileName && (
                  <div
                    style={{
                      marginTop: '6px',
                      fontSize: '12px',
                      color: '#16a34a',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>✅ File Terlampir: {formGlobalFileName} ({formGlobalFileType})</span>
                  </div>
                )}
              </div>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '12px',
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
                <span>🔔 Otomatis kirim notifikasi lonceng ke seluruh Guru Pengganti & Siswa di kelas terkait</span>
              </label>

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
                    boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
                  }}
                >
                  {submittingInval ? '⏳ Menyimpan...' : `🚀 Terbitkan Seluruh Penugasan (${invalSessions.length} Jam)`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 📤 MODAL 2: UNGGAH BAHAN AJAR / MODUL KBM BARU */}
      {/* ========================================================================= */}
      {showUploadDocModal && canManageInval && (
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
                  {activeViewerDoc?.judul}
                </h4>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                  {activeViewerDoc?.mapel || 'Bahan Ajar KBM'} • {activeViewerDoc?.guru_pengunggah || 'Guru SMK YPK'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {activeViewerDoc?.file_url && (
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

            <div style={{ flex: 1, backgroundColor: '#f8fafc', overflowY: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {activeViewerDoc?.file_url ? (
                activeViewerDoc.tipe_file === 'JPG' ||
                activeViewerDoc.tipe_file === 'PNG' ||
                String(activeViewerDoc.file_name || '').match(/\.(jpg|jpeg|png)$/i) ? (
                  <div style={{ padding: '20px', textAlign: 'center' }}>
                    <img
                      src={activeViewerDoc.file_url}
                      alt={activeViewerDoc?.judul || 'Bahan Ajar'}
                      style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                  </div>
                ) : (
                  <iframe
                    src={activeViewerDoc.file_url}
                    title={activeViewerDoc?.judul || 'Bahan Ajar'}
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

export default function BahanAjarView(props) {
  return (
    <BahanAjarErrorBoundary>
      <BahanAjarContent {...props} />
    </BahanAjarErrorBoundary>
  );
}
