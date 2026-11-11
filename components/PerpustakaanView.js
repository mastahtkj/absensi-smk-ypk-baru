'use client';

import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { calculateAiUserRating, recordUserActivity } from '../utils/smartRatingAi';

export default function PerpustakaanView({ currentUser }) {
  const [activeCategory, setActiveCategory] = useState('Semua');
  const [searchBook, setSearchBook] = useState('');
  const [readingBook, setReadingBook] = useState(null);
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [readerFontSize, setReaderFontSize] = useState(14); // 13, 14, 16, 18

  // 🔒 HAK AKSES UPLOAD: ADMIN MASTER, ADMIN GURU, DAN SELURUH GURU
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
  const canManageLibrary = !isSiswa || isMasterIqbalUser;
  const aiRating = calculateAiUserRating(currentUser);

  // 📚 KOLEKSI BUKU DIGITAL RESMI SMK YPK (BERSIH DARI DATA DUMMY AI)
  const DEFAULT_BOOKS = [];

  // 💾 STATE KOLEKSI BUKU (DARI LOCALSTORAGE / DATABASE RESMI GURU)
  const [bookList, setBookList] = useState(DEFAULT_BOOKS);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('smk_ypk_digital_library_books');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            // Bersihkan seluruh data dummy bawaan AI terdahulu
            const realBooks = parsed.filter(
              (b) =>
                !String(b.id || '').startsWith('B-TJKT-') &&
                !String(b.id || '').startsWith('B-AKL-') &&
                !String(b.id || '').startsWith('B-MPLB-') &&
                !String(b.id || '').startsWith('B-PM-') &&
                !String(b.id || '').startsWith('B-UMUM-') &&
                !String(b.id || '').startsWith('B-') &&
                !String(b.judul || '').includes('Dasar-Dasar Teknik Jaringan') &&
                !String(b.judul || '').includes('Kurikulum Merdeka 2026')
            );
            setBookList(realBooks);
            localStorage.setItem('smk_ypk_digital_library_books', JSON.stringify(realBooks));
            return;
          }
        }
        setBookList([]);
        localStorage.setItem('smk_ypk_digital_library_books', JSON.stringify([]));
      } catch (e) {
        setBookList([]);
      }
    }
  }, []);

  const saveBooksToStorage = (newList) => {
    setBookList(newList);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('smk_ypk_digital_library_books', JSON.stringify(newList));
      } catch (e) {}
    }
  };

  // 📝 STATE MODAL UPLOAD / EDIT BUKU (ADMIN & GURU)
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [formJudul, setFormJudul] = useState('');
  const [formPenulis, setFormPenulis] = useState('');
  const [formKategori, setFormKategori] = useState('TJKT');
  const [formHalaman, setFormHalaman] = useState('150');
  const [formRingkasan, setFormRingkasan] = useState('');
  const [formBab1, setFormBab1] = useState('');
  const [formBab2, setFormBab2] = useState('');
  const [formBab3, setFormBab3] = useState('');
  const [formThemeColor, setFormThemeColor] = useState('#2563eb');
  const [formPdfBase64, setFormPdfBase64] = useState('');
  const [formPdfName, setFormPdfName] = useState('');
  const [formPdfUrl, setFormPdfUrl] = useState('');
  const [formFileType, setFormFileType] = useState('pdf'); // 'pdf' | 'image' | 'ppt' | 'doc' | 'xls'
  const [formFileName, setFormFileName] = useState('');

  const [readerMode, setReaderMode] = useState('pdf'); // 'pdf' | 'text'

  const openAddBookModal = () => {
    setEditingBook(null);
    setFormJudul('');
    setFormPenulis(currentUser?.nama || 'Guru SMK YPK');
    setFormKategori(activeCategory === 'Semua' ? 'TJKT' : activeCategory);
    setFormHalaman('150');
    setFormRingkasan('');
    setFormBab1('');
    setFormBab2('');
    setFormBab3('');
    setFormThemeColor('#2563eb');
    setFormPdfBase64('');
    setFormPdfName('');
    setFormPdfUrl('');
    setFormFileType('pdf');
    setFormFileName('');
    setShowUploadModal(true);
  };

  const openEditBookModal = (b) => {
    setEditingBook(b);
    setFormJudul(b.judul || '');
    setFormPenulis(b.penulis || '');
    setFormKategori(b.kategori || 'TJKT');
    setFormHalaman(String(b.halaman || '150'));
    setFormRingkasan(b.ringkasan || '');
    setFormBab1(b.babList?.[0]?.konten || '');
    setFormBab2(b.babList?.[1]?.konten || '');
    setFormBab3(b.babList?.[2]?.konten || '');
    setFormThemeColor(b.themeColor || '#2563eb');
    setFormPdfBase64(b.fileUrl || b.pdfUrl || '');
    setFormPdfName(b.fileName || b.pdfName || '');
    setFormPdfUrl(b.pdfLink || '');
    setFormFileType(b.fileType || 'pdf');
    setFormFileName(b.fileName || b.pdfName || '');
    setShowUploadModal(true);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 30 * 1024 * 1024) {
      Swal.fire('File Terlalu Besar', 'Maksimal ukuran file berkas adalah 30 MB.', 'warning');
      return;
    }

    const name = file.name;
    const ext = name.split('.').pop().toLowerCase();
    let fType = 'other';
    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) || file.type.startsWith('image/')) fType = 'image';
    else if (ext === 'pdf' || file.type.includes('pdf')) fType = 'pdf';
    else if (['doc', 'docx'].includes(ext)) fType = 'doc';
    else if (['ppt', 'pptx'].includes(ext)) fType = 'ppt';
    else if (['xls', 'xlsx'].includes(ext)) fType = 'xls';

    setFormFileName(name);
    setFormPdfName(name);
    setFormFileType(fType);

    const reader = new FileReader();
    reader.onload = () => {
      setFormPdfBase64(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBook = (e) => {
    e.preventDefault();
    if (!formJudul.trim() || !formPenulis.trim() || !formRingkasan.trim()) {
      Swal.fire('Form Belum Lengkap', 'Silakan lengkapi Judul, Penulis/Penerbit, dan Ringkasan buku.', 'warning');
      return;
    }

    const babList = [
      {
        bab: 'BAB I: Pengantar & Capaian Pembelajaran',
        konten: formBab1.trim() || `Modul pembelajaran resmi mata pelajaran ${formJudul} untuk kompetensi keahlian ${formKategori} SMK YPK Medan. Disusun untuk mendukung ketercapaian capaian pembelajaran Kurikulum Merdeka.`,
      },
      {
        bab: 'BAB II: Teori Inti & Konsep Kejuruan',
        konten: formBab2.trim() || `Pembahasan materi pokok dan konsep teoritis mendalam mengenai ${formJudul}. Diharapkan peserta didik dapat memahami materi ini secara komprehensif.`,
      },
      {
        bab: 'BAB III: Praktikum, Studi Kasus & Evaluasi Mandiri',
        konten: formBab3.trim() || `Langkah kerja praktikum mandiri dan panduan lembar kerja peserta didik (LKPD). Kerjakan latihan pemahaman di akhir bab untuk mengukur kompetensi keahlian!`,
      },
    ];

    // Warna gradient cover otomatis berdasarkan kategori & pilihan
    let coverBg = 'linear-gradient(135deg, #1e3a8a, #2563eb)';
    if (formKategori === 'AKL') coverBg = 'linear-gradient(135deg, #065f46, #10b981)';
    else if (formKategori === 'MPLB') coverBg = 'linear-gradient(135deg, #701a75, #d946ef)';
    else if (formKategori === 'PM') coverBg = 'linear-gradient(135deg, #9a3412, #f97316)';
    else if (formKategori === 'Umum') coverBg = 'linear-gradient(135deg, #991b1b, #ef4444)';

    const effectivePdf = formPdfBase64 || formPdfUrl || '';

    if (editingBook) {
      // Update Buku
      const updated = bookList.map((item) => {
        if (item.id === editingBook.id) {
          return {
            ...item,
            judul: formJudul.trim(),
            penulis: formPenulis.trim(),
            kategori: formKategori,
            halaman: parseInt(formHalaman, 10) || 150,
            ringkasan: formRingkasan.trim(),
            coverBg: coverBg,
            themeColor: formThemeColor,
            pdfUrl: effectivePdf,
            pdfName: formFileName || formPdfName || item.pdfName || '',
            fileUrl: effectivePdf,
            fileName: formFileName || formPdfName || item.fileName || '',
            fileType: formFileType || item.fileType || 'pdf',
            babList: babList,
          };
        }
        return item;
      });
      saveBooksToStorage(updated);
      setShowUploadModal(false);
      Swal.fire({
        icon: 'success',
        title: 'Buku Diperbarui!',
        text: `Buku "${formJudul}" berhasil diupdate.`,
        timer: 1500,
        showConfirmButton: false,
      });
    } else {
      // Tambah Buku / Jurnal / Materi Baru
      const isAutoApproved = Boolean(
        isMasterIqbalUser ||
        currentUser?.role?.toLowerCase() === 'master' ||
        currentUser?.role?.toLowerCase() === 'admin'
      );
      const itemStatus = isAutoApproved ? 'approved' : 'pending';

      const uploaderAiRating = calculateAiUserRating(currentUser);
      const newBook = {
        id: `B-${formKategori}-${Date.now()}`,
        judul: formJudul.trim(),
        penulis: formPenulis.trim(),
        kategori: formKategori,
        halaman: parseInt(formHalaman, 10) || (formFileType === 'image' ? 1 : 150),
        bahasa: 'Indonesia',
        coverBg: coverBg,
        themeColor: formThemeColor,
        ringkasan: formRingkasan.trim(),
        pdfUrl: effectivePdf,
        pdfName: formFileName || formPdfName || `${formJudul}.${formFileType}`,
        fileUrl: effectivePdf,
        fileName: formFileName || formPdfName || `${formJudul}.${formFileType}`,
        fileType: formFileType,
        babList: babList,
        status: itemStatus,
        uploaderId: currentUser?.id || currentUser?.rawId || 'unknown',
        uploaderNama: currentUser?.nama || formPenulis || 'Pengguna',
        uploaderRole: isSiswa ? 'Siswa' : 'Guru',
        uploaderKelas: currentUser?.kelas || '',
        uploaderRating: `${uploaderAiRating.tier} (${uploaderAiRating.stars.toFixed(1)} ⭐)`,
        viewsCount: 0,
        createdAt: new Date().toISOString(),
      };
      const updated = [newBook, ...bookList];
      saveBooksToStorage(updated);
      setShowUploadModal(false);

      // 🧠 Catat Aktivitas Upload Buku untuk Rating AI Akun
      recordUserActivity(currentUser, 'upload_book');
      const updatedRating = calculateAiUserRating(currentUser);

      if (isAutoApproved) {
        Swal.fire({
          icon: 'success',
          title: 'Materi Berhasil Diterbitkan! 🎉',
          html: `
            <div style="text-align: left; font-size: 13px; line-height: 1.6; color: #334155;">
              "${formJudul}" (${formFileName || formFileType.toUpperCase()}) telah ditambahkan dan siap dibaca online.<br/>
              <div style="margin-top: 8px; padding: 6px 10px; background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; color: #065f46; font-weight: bold;">
                💎 Poin AI Bertambah! Rating Akun: <b>${updatedRating.tier}</b> (${updatedRating.stars.toFixed(1)} ⭐ · ${updatedRating.score} Poin)
              </div>
            </div>
          `,
          timer: 2600,
          showConfirmButton: false,
        });
      } else {
        Swal.fire({
          icon: 'info',
          title: 'Unggahan Menunggu Persetujuan Admin! ⏳',
          html: `
            <div style="text-align: left; font-size: 13px; color: #334155; line-height: 1.6;">
              Berkas <b>"${formJudul}"</b> (${formFileName || formFileType.toUpperCase()}) telah berhasil dikirimkan ke perpustakaan.<br/>
              <div style="margin-top: 10px; padding: 10px; background-color: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; color: #92400e;">
                ⚠️ <b>Pemberitahuan:</b> Berkas sedang menunggu persetujuan dari <b>Admin Master</b> sebelum dipublikasikan ke seluruh siswa &amp; guru.
              </div>
            </div>
          `,
          confirmButtonColor: '#2563eb',
        });
      }
    }
  };

  const handleOpenReader = (book) => {
    const updatedViews = (book.viewsCount || 0) + 1;
    const updated = bookList.map((b) => (b.id === book.id ? { ...b, viewsCount: updatedViews } : b));
    setBookList(updated);
    saveBooksToStorage(updated);
    setReadingBook({ ...book, viewsCount: updatedViews });
    setActiveChapterIndex(0);
    recordUserActivity(currentUser, 'read_book');
  };

  const handleApproveBook = (bookId) => {
    const updated = bookList.map((b) => (b.id === bookId ? { ...b, status: 'approved' } : b));
    saveBooksToStorage(updated);
    Swal.fire({
      icon: 'success',
      title: 'Materi Disetujui & Dipublikasikan! ✅',
      timer: 1500,
      showConfirmButton: false,
    });
  };

  const handleRejectBook = (bookId) => {
    const updated = bookList.filter((b) => b.id !== bookId);
    saveBooksToStorage(updated);
    Swal.fire({
      icon: 'info',
      title: 'Materi Telah Ditolak / Dihapus',
      timer: 1500,
      showConfirmButton: false,
    });
  };

  const handleDeleteBook = async (book) => {
    if (!canManageLibrary) return;

    const result = await Swal.fire({
      title: 'Hapus Buku Perpustakaan?',
      html: `<p>Buku <b>"${book.judul}"</b> (${book.kategori}) akan dihapus dari koleksi E-Library.</p>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus Buku',
      cancelButtonText: 'Batal',
    });

    if (result.isConfirmed) {
      const updated = bookList.filter((b) => b.id !== book.id);
      saveBooksToStorage(updated);
      if (readingBook?.id === book.id) setReadingBook(null);
      Swal.fire({
        icon: 'success',
        title: 'Buku Dihapus!',
        text: 'Buku telah dihapus dari perpustakaan.',
        timer: 1500,
        showConfirmButton: false,
      });
    }
  };

  // 🔍 FILTERING BUKU & PERIZINAN MODERASI MASTER
  const isMasterUser = Boolean(
    isMasterIqbalUser ||
    currentUser?.role?.toLowerCase() === 'master' ||
    currentUser?.role?.toLowerCase() === 'admin'
  );

  const pendingBooks = bookList.filter((b) => b.status === 'pending');

  const visibleBooks = bookList.filter((b) => {
    if (b.status === 'pending') {
      if (isMasterUser) return true;
      if (currentUser?.nama && b.uploaderNama === currentUser.nama) return true;
      if (currentUser?.id && b.uploaderId === currentUser.id) return true;
      return false;
    }
    return true;
  });

  const filteredBooks = visibleBooks.filter((b) => {
    const matchCat = activeCategory === 'Semua' || b.kategori === activeCategory;
    const matchSearch =
      b.judul.toLowerCase().includes(searchBook.toLowerCase()) ||
      b.penulis.toLowerCase().includes(searchBook.toLowerCase()) ||
      b.kategori.toLowerCase().includes(searchBook.toLowerCase()) ||
      b.ringkasan.toLowerCase().includes(searchBook.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div style={{ padding: '4px 0 30px 0', maxWidth: '1150px', margin: '0 auto' }}>
      {/* 🌟 BANNER PERPUSTAKAAN DIGITAL SMK YPK MEDAN */}
      <div
        style={{
          background: 'linear-gradient(135deg, #b45309 0%, #d97706 50%, #f59e0b 100%)',
          borderRadius: '18px',
          padding: '22px 20px',
          color: '#ffffff',
          boxShadow: '0 8px 24px rgba(217, 119, 6, 0.25)',
          marginBottom: '18px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <span style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.8px', backgroundColor: 'rgba(255, 255, 255, 0.2)', padding: '2px 8px', borderRadius: '12px' }}>
                📖 E-LIBRARY SMK YPK MEDAN
              </span>
              <span style={{ fontSize: '10px', backgroundColor: '#10b981', color: '#ffffff', fontWeight: 'bold', padding: '2px 8px', borderRadius: '12px' }}>
                ⭐ Kurikulum Merdeka 2026
              </span>
            </div>
            <h1 style={{ margin: '4px 0', fontSize: '20px', fontWeight: '800' }}>
              Perpustakaan Digital &amp; Buku Pegangan Siswa
            </h1>
            <p style={{ margin: 0, fontSize: '12.5px', color: '#fef3c7', lineHeight: 1.4 }}>
              {canManageLibrary
                ? 'Pusat repositori e-book kejuruan, modul ajar interaktif, dan panduan praktikum industri untuk semua jurusan.'
                : 'Akses ribuan halaman e-book kejuruan & umum terlengkap secara gratis untuk seluruh siswa SMK YPK Medan.'}
            </p>

            <div style={{ marginTop: '10px', display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(0, 0, 0, 0.22)', padding: '5px 12px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
              <span style={{ fontSize: '11px', color: '#fde047' }}>🧠 Rating AI Anda:</span>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#ffffff' }}>{aiRating.label}</span>
              <span style={{ fontSize: '10.5px', color: '#d1fae5', backgroundColor: 'rgba(16, 185, 129, 0.3)', padding: '1px 6px', borderRadius: '6px' }}>+{aiRating.bookUploads} Upload · +{aiRating.booksRead} Dibaca</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* ➕ TOMBOL UPLOAD BUKU / JURNAL / MATERI (TERBUKA UNTUK SELURUH SISWA & GURU DENGAN PERIZINAN MASTER) */}
            <button
              type="button"
              onClick={openAddBookModal}
              style={{
                backgroundColor: '#ffffff',
                color: '#b45309',
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
                transition: 'all 0.15s ease',
              }}
            >
              <span>➕</span>
              <span>Unggah Jurnal / Buku / Materi</span>
            </button>

            <div style={{ backgroundColor: 'rgba(255,255,255,0.18)', padding: '8px 16px', borderRadius: '10px', textAlign: 'center', backdropFilter: 'blur(4px)' }}>
              <span style={{ fontSize: '10.5px', color: '#fef08a', display: 'block', fontWeight: '600' }}>Total Koleksi</span>
              <span style={{ fontSize: '20px', fontWeight: '800', color: '#ffffff' }}>{bookList.length} Judul</span>
            </div>
          </div>
        </div>
      </div>

      {/* 🏷️ FILTER KATEGORI JURUSAN & SEARCH BAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { key: 'Semua', label: '📚 Semua Koleksi', count: bookList.length },
            { key: 'TJKT', label: '🌐 TJKT', count: bookList.filter((b) => b.kategori === 'TJKT').length },
            { key: 'AKL', label: '📊 AKL', count: bookList.filter((b) => b.kategori === 'AKL').length },
            { key: 'MPLB', label: '📂 MPLB', count: bookList.filter((b) => b.kategori === 'MPLB').length },
            { key: 'PM', label: '🛍️ PM', count: bookList.filter((b) => b.kategori === 'PM').length },
            { key: 'Umum', label: '📖 Umum', count: bookList.filter((b) => b.kategori === 'Umum').length },
          ].map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setActiveCategory(cat.key)}
              style={{
                padding: '6px 13px',
                borderRadius: '20px',
                border: activeCategory === cat.key ? '2px solid #d97706' : '1px solid #cbd5e1',
                backgroundColor: activeCategory === cat.key ? '#d97706' : '#ffffff',
                color: activeCategory === cat.key ? '#ffffff' : '#475569',
                fontWeight: '700',
                fontSize: '12px',
                cursor: 'pointer',
                boxShadow: activeCategory === cat.key ? '0 2px 6px rgba(217, 119, 6, 0.25)' : 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{cat.label}</span>
              <span style={{ fontSize: '10px', opacity: 0.85, backgroundColor: activeCategory === cat.key ? 'rgba(255,255,255,0.25)' : '#f1f5f9', padding: '1px 5px', borderRadius: '10px' }}>
                {cat.count}
              </span>
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="🔍 Cari judul, materi, atau penulis..."
          value={searchBook}
          onChange={(e) => setSearchBook(e.target.value)}
          style={{
            padding: '8px 14px',
            borderRadius: '10px',
            border: '1.5px solid #cbd5e1',
            fontSize: '12.5px',
            width: '260px',
            outline: 'none',
            backgroundColor: '#ffffff',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
          }}
        />
      </div>

      {/* 📋 KOTAK MODERASI & PERIZINAN UNGGAHAN BUKU/JURNAL OLEH MASTER */}
      {isMasterUser && pendingBooks.length > 0 && (
        <div
          style={{
            marginBottom: '20px',
            backgroundColor: '#fffbeb',
            border: '2px solid #f59e0b',
            borderRadius: '16px',
            padding: '16px 20px',
            boxShadow: '0 4px 16px rgba(245, 158, 11, 0.15)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>⏳</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', color: '#92400e', fontWeight: '800' }}>
                  Perizinan Unggahan Siswa / Guru ({pendingBooks.length} Menunggu Persetujuan)
                </h3>
                <p style={{ margin: 0, fontSize: '11.5px', color: '#b45309' }}>
                  Cek berkas yang diunggah siswa/guru sebelum dipublikasikan ke seluruh warga sekolah.
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {pendingBooks.map((pb) => (
              <div
                key={pb.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#ffffff',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: '1px solid #fed7aa',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ backgroundColor: '#fef3c7', color: '#b45309', fontSize: '10px', fontWeight: '800', padding: '2px 6px', borderRadius: '4px' }}>
                      {pb.kategori}
                    </span>
                    <b style={{ fontSize: '13.5px', color: '#1e293b' }}>{pb.judul}</b>
                  </div>
                  <p style={{ margin: '3px 0 0', fontSize: '11.5px', color: '#64748b' }}>
                    Oleh: <b>{pb.penulis}</b> ({pb.uploaderRole || 'Siswa'}) • {pb.pdfName || 'Dokumen PDF'}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      recordUserActivity(currentUser, 'read_book');
                      setReadingBook(pb);
                    }}
                    style={{ backgroundColor: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', padding: '6px 12px', borderRadius: '8px', fontSize: '11.5px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    👁️ Cek Isi
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApproveBook(pb.id)}
                    style={{ backgroundColor: '#059669', color: '#ffffff', border: 'none', padding: '6px 14px', borderRadius: '8px', fontSize: '11.5px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 6px rgba(5,150,105,0.3)' }}
                  >
                    ✅ Setujui & Publikasikan
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRejectBook(pb.id)}
                    style={{ backgroundColor: '#ef4444', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '11.5px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    ❌ Tolak
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 📚 GRID DAFTAR BUKU PELAJARAN LENGKAP */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '16px' }}>
        {filteredBooks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8', gridColumn: '1 / -1', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>📚</div>
            <h4 style={{ margin: '0 0 6px 0', color: '#1e293b', fontSize: '16px', fontWeight: 'bold' }}>Perpustakaan Digital Masih Kosong</h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b', maxWidth: '440px', marginInline: 'auto' }}>
              Belum ada buku atau modul pembelajaran yang diunggah. Guru dan admin dapat menambahkan buku teks atau modul PDF baru melalui tombol &quot;➕ Tambah / Upload Buku&quot;.
            </p>
          </div>
        ) : (
          filteredBooks.map((book) => {
            const fType = book.fileType || 'pdf';
            const typeBadge =
              fType === 'image' ? '🖼️ GAMBAR' :
              fType === 'ppt' ? '📽️ PPT' :
              fType === 'doc' ? '📑 DOC' :
              fType === 'xls' ? '📊 XLS' : '📄 PDF';

            return (
              <div
                key={book.id}
                className="stardust-white-card"
                style={{
                  borderRadius: '14px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                }}
              >
                {/* COVER BUKU ELEGAN */}
                <div
                  style={{
                    background: book.coverBg,
                    padding: '20px 18px',
                    color: '#ffffff',
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '9.5px', fontWeight: '800', backgroundColor: 'rgba(255,255,255,0.25)', padding: '2px 8px', borderRadius: '10px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      {book.kategori === 'Umum' ? 'Mata Pelajaran Umum' : `Jurusan ${book.kategori}`}
                    </span>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <span style={{ fontSize: '9.5px', fontWeight: '800', backgroundColor: 'rgba(0,0,0,0.3)', color: '#ffffff', padding: '2px 7px', borderRadius: '8px' }}>
                        {typeBadge}
                      </span>
                      <span style={{ fontSize: '10px', color: '#fef3c7', fontWeight: '700' }}>
                        📄 {book.halaman} Hal
                      </span>
                    </div>
                  </div>
                  <h3 style={{ margin: '6px 0 4px 0', fontSize: '14.5px', fontWeight: '800', lineHeight: '1.35', color: '#ffffff' }}>
                    {book.judul}
                  </h3>
                  <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.9)' }}>
                    ✍️ {book.penulis}
                  </p>
                </div>

                {/* DETAIL & SARI MATERI BUKU */}
                <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#475569', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {book.ringkasan}
                  </p>

                  {/* IDENTITAS PENGUNGGAH, RATING AI & MATA VIEWS COUNTER */}
                  <div style={{ marginTop: 'auto', marginBottom: '10px', borderTop: '1px dashed #e2e8f0', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '11px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                      <span style={{ color: '#475569' }}>
                        ✍️ <b>{book.uploaderNama || book.penulis}</b> ({book.uploaderRole || 'Guru'}{book.uploaderKelas ? ` · ${book.uploaderKelas}` : ''})
                      </span>
                      <span style={{ color: '#0284c7', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '3px', backgroundColor: '#e0f2fe', padding: '2px 6px', borderRadius: '6px' }}>
                        <span>👁️</span> <span>{book.viewsCount || 0}x dibaca</span>
                      </span>
                    </div>
                    {book.uploaderRating && (
                      <div style={{ fontSize: '10.5px', color: '#b45309', fontWeight: 'bold' }}>
                        ⭐ Rating AI: {book.uploaderRating}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '10px', flexWrap: 'wrap', gap: '6px' }}>
                    {/* TOMBOL EDIT / HAPUS BUKU KHUSUS GURU & ADMIN */}
                    {canManageLibrary ? (
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button
                          type="button"
                          onClick={() => openEditBookModal(book)}
                          style={{
                            backgroundColor: '#eff6ff',
                            color: '#2563eb',
                            border: '1px solid #bfdbfe',
                            borderRadius: '6px',
                            padding: '5px 8px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                          }}
                          title="Edit Buku"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteBook(book)}
                          style={{
                            backgroundColor: '#fef2f2',
                            color: '#ef4444',
                            border: '1px solid #fca5a5',
                            borderRadius: '6px',
                            padding: '5px 8px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                          }}
                          title="Hapus Buku"
                        >
                          🗑️
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
                        🟢 Siap Dibaca
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => handleOpenReader(book)}
                      style={{
                        backgroundColor: '#d97706',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '6px 14px',
                        fontSize: '11.5px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        boxShadow: '0 2px 6px rgba(217, 119, 6, 0.3)',
                      }}
                    >
                      <span>📖</span>
                      <span>Baca / Buka Berkas</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 📝 MODAL UPLOAD / EDIT BUKU (ADMIN & GURU) */}
      {showUploadModal && (
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
          onClick={() => setShowUploadModal(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              maxWidth: '560px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px rgba(0,0,0,0.35)',
              padding: '22px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                  {editingBook ? '✏️ Edit Buku Perpustakaan' : '➕ Upload / Tambah Buku Baru'}
                </h3>
                <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                  Guru bebas menentukan target jurusan atau untuk semua jurusan
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                style={{ backgroundColor: '#f1f5f9', border: 'none', borderRadius: '8px', width: '30px', height: '30px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBook}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  📚 Judul Buku Pelajaran / E-Book:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Administrasi Sistem Jaringan Komputer"
                  value={formJudul}
                  onChange={(e) => setFormJudul(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    ✍️ Penulis / Pengarang / Tim:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nama Guru / Pengarang"
                    value={formPenulis}
                    onChange={(e) => setFormPenulis(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    🎯 Target Jurusan:
                  </label>
                  <select
                    value={formKategori}
                    onChange={(e) => setFormKategori(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '9px 10px', borderRadius: '8px', border: '1.5px solid #2563eb', fontSize: '12.5px', fontWeight: 'bold' }}
                  >
                    <option value="TJKT">🌐 TJKT (Teknik Jaringan Komputer Dan Telekomunikasi)</option>
                    <option value="MPLB">📂 MPLB (Manajemen Perkantoran Dan Layanan Bisnis)</option>
                    <option value="AKL">📊 AKL (Akuntansi Dan Keuangan Lembaga)</option>
                    <option value="PM">🛍️ PM (Pemasaran)</option>
                    <option value="Umum">📖 Mata Pelajaran Umum (Semua Jurusan)</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  📄 Estimasi Tebal Halaman:
                </label>
                <input
                  type="number"
                  placeholder="Contoh: 180"
                  value={formHalaman}
                  onChange={(e) => setFormHalaman(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  📝 Ringkasan &amp; Sinopsis Buku:
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Jelaskan ringkasan materi dan tujuan pembelajaran buku ini..."
                  value={formRingkasan}
                  onChange={(e) => setFormRingkasan(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', resize: 'vertical' }}
                />
              </div>

              {/* 📤 UPLOAD FILE MATERI BEBAS (GURU & SISWA: GAMBAR, PDF, PPT, DOC, XLS) */}
              <div style={{ marginBottom: '14px', backgroundColor: '#eff6ff', border: '1.5px dashed #3b82f6', borderRadius: '12px', padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '16px' }}>📂</span>
                  <label style={{ fontSize: '12.5px', fontWeight: '800', color: '#1e40af' }}>
                    Upload Berkas Mandiri (Bebas: Gambar, PDF, PPT, DOC, XLS):
                  </label>
                </div>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,image/*"
                  onChange={handleFileUpload}
                  style={{ width: '100%', fontSize: '12px', marginBottom: '6px' }}
                />
                {formFileName && (
                  <div style={{ fontSize: '11.5px', color: '#166534', fontWeight: 'bold', backgroundColor: '#dcfce7', padding: '4px 8px', borderRadius: '6px', marginBottom: '6px' }}>
                    ✅ Berkas Terpilih ({formFileType?.toUpperCase()}): {formFileName}
                  </div>
                )}
                <div style={{ marginTop: '6px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Atau masukkan URL / Link Berkas Cloud:</span>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/... atau link dokumen langsung"
                    value={formPdfUrl}
                    onChange={(e) => setFormPdfUrl(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', marginTop: '4px', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>
              </div>

              {/* MATERI BAB BUKU (OPSIONAL / JIKA TIDAK MEMAKAI PDF) */}
              <div style={{ marginBottom: '12px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a', display: 'block', marginBottom: '6px' }}>
                  📖 Rangkuman Bab Pembelajaran (Opsional / Pelengkap PDF):
                </span>

                <div style={{ marginBottom: '8px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '2px' }}>
                    BAB I: Capaian &amp; Pengantar
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Uraikan materi Bab 1..."
                    value={formBab1}
                    onChange={(e) => setFormBab1(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>

                <div style={{ marginBottom: '8px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '2px' }}>
                    BAB II: Teori &amp; Konsep Kejuruan
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Uraikan materi Bab 2..."
                    value={formBab2}
                    onChange={(e) => setFormBab2(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '2px' }}>
                    BAB III: Praktikum &amp; Langkah Kerja
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Uraikan langkah praktikum Bab 3..."
                    value={formBab3}
                    onChange={(e) => setFormBab3(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  style={{ backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  style={{ backgroundColor: '#d97706', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '8px 18px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  💾 Terbitkan Berkas Perpustakaan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📖 MODAL E-READER ONLINE LENGKAP DENGAN VIEWER & NAVIGASI BAB */}
      {readingBook && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.88)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setReadingBook(null)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              maxWidth: '960px',
              width: '100%',
              height: '92vh',
              overflow: 'hidden',
              boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* HEADER E-READER */}
            <div style={{ background: 'linear-gradient(90deg, #92400e, #d97706)', color: '#ffffff', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <span style={{ fontSize: '10.5px', fontWeight: '800', backgroundColor: 'rgba(255,255,255,0.22)', color: '#ffffff', padding: '2px 8px', borderRadius: '6px', textTransform: 'uppercase' }}>
                  {readingBook.kategori === 'Umum' ? 'Mata Pelajaran Umum' : `Jurusan ${readingBook.kategori}`}
                </span>
                <h2 style={{ margin: '4px 0 2px 0', fontSize: '17px', fontWeight: '800', color: '#ffffff', lineHeight: 1.35 }}>
                  {readingBook.judul}
                </h2>
                <div style={{ fontSize: '11.5px', color: '#fef3c7' }}>
                  ✍️ Penulis/Pengunggah: <b>{readingBook.penulis || readingBook.uploaderNama}</b> • 📄 {readingBook.halaman} Hal / Berkas
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* TOGGLE ANTARA FILE VIEWER & BAB */}
                {(readingBook.fileUrl || readingBook.pdfUrl) && (
                  <div style={{ display: 'flex', backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: '8px', padding: '2px' }}>
                    <button
                      type="button"
                      onClick={() => setReaderMode('pdf')}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: readerMode === 'pdf' ? '#ffffff' : 'transparent',
                        color: readerMode === 'pdf' ? '#92400e' : '#ffffff',
                        fontSize: '11.5px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                      }}
                    >
                      {readingBook.fileType === 'image' ? '🖼️ Foto / Gambar' : ['ppt', 'doc', 'xls'].includes(readingBook.fileType) ? `📂 Berkas ${readingBook.fileType.toUpperCase()}` : '📄 File PDF'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setReaderMode('text')}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: readerMode === 'text' ? '#ffffff' : 'transparent',
                        color: readerMode === 'text' ? '#92400e' : '#ffffff',
                        fontSize: '11.5px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                      }}
                    >
                      📖 Rangkuman / Bab
                    </button>
                  </div>
                )}

                {/* UKURAN FONT BACA (JIKA MODE TEKS) */}
                {readerMode === 'text' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(255,255,255,0.2)', padding: '4px 8px', borderRadius: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setReaderFontSize((prev) => Math.max(12, prev - 1))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', color: '#ffffff' }}
                      title="Kecilkan Teks"
                    >
                      A-
                    </button>
                    <span style={{ fontSize: '11px', color: '#ffffff', fontWeight: 'bold' }}>{readerFontSize}px</span>
                    <button
                      type="button"
                      onClick={() => setReaderFontSize((prev) => Math.min(20, prev + 1))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', color: '#ffffff' }}
                      title="Besarkan Teks"
                    >
                      A+
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setReadingBook(null)}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.25)',
                    border: 'none',
                    borderRadius: '8px',
                    width: '32px',
                    height: '32px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '16px',
                    color: '#ffffff',
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* AREA BACAAN: PDF, GAMBAR, OFFICE (PPT, DOC, XLS), ATAU TEXT READER */}
            <div style={{ flex: 1, backgroundColor: '#f1f5f9', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {(readingBook.fileUrl || readingBook.pdfUrl) && readerMode === 'pdf' ? (
                readingBook.fileType === 'image' ? (
                  <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a' }}>
                    <img
                      src={readingBook.fileUrl || readingBook.pdfUrl}
                      alt={readingBook.judul}
                      style={{ maxWidth: '100%', maxHeight: '78vh', objectFit: 'contain', borderRadius: '10px', boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}
                    />
                  </div>
                ) : ['doc', 'ppt', 'xls'].includes(readingBook.fileType) ? (
                  <div style={{ flex: 1, padding: '36px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', backgroundColor: '#ffffff' }}>
                    <div style={{ fontSize: '64px', marginBottom: '14px' }}>
                      {readingBook.fileType === 'ppt' ? '📽️' : readingBook.fileType === 'doc' ? '📑' : '📊'}
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: '800', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '3px 10px', borderRadius: '6px', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Dokumen Microsoft {readingBook.fileType.toUpperCase()}
                    </span>
                    <h3 style={{ margin: '0 0 10px 0', color: '#0f172a', fontSize: '19px', fontWeight: '800', maxWidth: '600px' }}>
                      {readingBook.judul}
                    </h3>
                    <p style={{ color: '#64748b', fontSize: '13px', maxWidth: '500px', margin: '0 0 24px 0', lineHeight: 1.5 }}>
                      Berkas <b>{readingBook.fileName || readingBook.pdfName || 'Dokumen'}</b> siap diunduh dan dipelajari langsung di perangkat Anda.
                    </p>
                    <a
                      href={readingBook.fileUrl || readingBook.pdfUrl}
                      download={readingBook.fileName || readingBook.pdfName || `${readingBook.judul}.${readingBook.fileType}`}
                      style={{
                        backgroundColor: '#2563eb',
                        color: '#ffffff',
                        padding: '12px 26px',
                        borderRadius: '12px',
                        fontWeight: '800',
                        fontSize: '13.5px',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 14px rgba(37,99,235,0.35)',
                      }}
                    >
                      <span>⬇️</span>
                      <span>Unduh &amp; Buka Berkas ({readingBook.fileType.toUpperCase()})</span>
                    </a>
                  </div>
                ) : (
                  <iframe
                    src={readingBook.fileUrl || readingBook.pdfUrl}
                    title={readingBook.judul}
                    style={{ width: '100%', height: '100%', border: 'none' }}
                  />
                )
              ) : (
                <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
                  {/* NAVIGASI PILIHAN BAB (TABS) */}
                  {readingBook.babList && readingBook.babList.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '14px' }}>
                      {readingBook.babList.map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActiveChapterIndex(idx)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            border: activeChapterIndex === idx ? '1.5px solid #d97706' : '1px solid #cbd5e1',
                            backgroundColor: activeChapterIndex === idx ? '#fef3c7' : '#ffffff',
                            color: activeChapterIndex === idx ? '#b45309' : '#475569',
                            fontSize: '11.5px',
                            fontWeight: activeChapterIndex === idx ? '800' : '600',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {item.bab.split(':')[0]}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* AREA MEMBACA TEKS LENGKAP */}
                  <div
                    style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '14px',
                      padding: '24px',
                      lineHeight: '1.75',
                      color: '#1e293b',
                      fontSize: `${readerFontSize}px`,
                      whiteSpace: 'pre-line',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                    }}
                  >
                    {readingBook.babList && readingBook.babList[activeChapterIndex] ? (
                      <div>
                        <h3 style={{ margin: '0 0 12px 0', color: '#b45309', fontSize: `${readerFontSize + 2}px`, borderBottom: '1.5px solid #fef3c7', paddingBottom: '8px' }}>
                          {readingBook.babList[activeChapterIndex].bab}
                        </h3>
                        <p style={{ margin: 0 }}>
                          {readingBook.babList[activeChapterIndex].konten}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <h3 style={{ margin: '0 0 10px 0', color: '#b45309' }}>PENDAHULUAN &amp; SARI MATERI</h3>
                        <p>{readingBook.ringkasan}</p>
                      </div>
                    )}

                    {/* KOTAK CATATAN GURU */}
                    <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '12px 14px', marginTop: '20px', fontSize: `${readerFontSize - 1}px`, color: '#92400e' }}>
                      💡 <b>Petunjuk Belajar Siswa:</b> Bacalah materi buku ini dengan cermat untuk memperdalam kompetensi keahlian Anda di SMK YPK Medan.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* FOOTER MODAL E-READER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderTop: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                {readerMode === 'text' && readingBook.babList && activeChapterIndex > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveChapterIndex((prev) => prev - 1)}
                    style={{ backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '7px 14px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                  >
                    ⬅️ Bab Sebelumnya
                  </button>
                )}
                {readerMode === 'text' && readingBook.babList && activeChapterIndex < readingBook.babList.length - 1 && (
                  <button
                    type="button"
                    onClick={() => setActiveChapterIndex((prev) => prev + 1)}
                    style={{ backgroundColor: '#d97706', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '7px 14px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                  >
                    Bab Selanjutnya ➔
                  </button>
                )}
                {(readingBook.fileUrl || readingBook.pdfUrl) && (
                  <a
                    href={readingBook.fileUrl || readingBook.pdfUrl}
                    download={readingBook.fileName || readingBook.pdfName || `${readingBook.judul}.${readingBook.fileType || 'pdf'}`}
                    style={{ backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '7px 14px', fontSize: '12px', fontWeight: '700', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    ⬇️ Download Berkas ({readingBook.fileType ? readingBook.fileType.toUpperCase() : 'PDF'})
                  </a>
                )}
              </div>

              <button
                type="button"
                onClick={() => setReadingBook(null)}
                style={{ backgroundColor: '#64748b', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '7px 16px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Tutup Pembaca
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
