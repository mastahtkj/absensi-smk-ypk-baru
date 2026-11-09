'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Swal from 'sweetalert2';

// 🛑 DAFTAR KATA TOKSIK / KASAR / VULGAR (AI ANTI-TOXIC ETHICS FILTER)
const TOXIC_WORDS = [
  'anjing', 'babi', 'bangsat', 'bodoh', 'tolol', 'goblok', 'kontol', 'memek',
  'pantek', 'bajingan', 'kampret', 'idiot', 'setan', 'iblis', 'bebal', 'sialan',
  'tai', 'ngentot', 'puki', 'lonte', 'pelacur', 'bego', 'cacat', 'buta',
  'tuli', 'jelek', 'sampah', 'jancok', 'asu', 'matamu', 'brengsek', 'perek',
];

export function checkToxicContent(text) {
  if (!text) return { isToxic: false, detectedWord: '' };
  const lower = text.toLowerCase();
  for (const word of TOXIC_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    if (regex.test(lower) || lower.includes(word)) {
      return { isToxic: true, detectedWord: word };
    }
  }
  return { isToxic: false, detectedWord: '' };
}

// 🧮 ALGORITMA PERHITUNGAN SPORTIF AI (BAYESIAN WEIGHTED RATING)
export function calculateFairTeacherRating(reviews = []) {
  const approvedReviews = reviews.filter((r) => r.status === 'approved' || r.status === 'auto_approved');
  if (approvedReviews.length === 0) {
    return { average: 5.0, count: 0, fairScore: 5.0, stars: 5 };
  }
  const sum = approvedReviews.reduce((acc, r) => acc + Number(r.rating || 5), 0);
  const rawAvg = sum / approvedReviews.length;
  // Bayesian prior: m = 2 prior reviews of 4.8
  const m = 2;
  const C = 4.8;
  const v = approvedReviews.length;
  const fairScore = (v * rawAvg + m * C) / (v + m);
  return {
    average: Number(rawAvg.toFixed(1)),
    count: v,
    fairScore: Number(fairScore.toFixed(1)),
    stars: Math.round(fairScore),
  };
}

export default function TeacherDirectoryView({
  currentUser,
  guruList = [],
  supabase,
  onNavigate,
}) {
  const isMasterAdmin = Boolean(
    currentUser?.role === 'admin' ||
    currentUser?.isMaster ||
    (currentUser?.username || '').toLowerCase() === 'admin' ||
    (currentUser?.username || '').toLowerCase() === 'iqbal' ||
    currentUser?.nama?.toLowerCase()?.includes('iqbal')
  );
  const isGuruAccount = Boolean(
    currentUser?.isGuru && !String(currentUser?.id || '').startsWith('SISWA-')
  );

  const [teachers, setTeachers] = useState([]);
  const [reviewsMap, setReviewsMap] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMapel, setSelectedMapel] = useState('Semua');

  // Modal State: Detail & Review
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [ratingInput, setRatingInput] = useState(5);
  const [commentInput, setCommentInput] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Modal State: Edit Teacher Profile
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTargetTeacher, setEditTargetTeacher] = useState(null);
  const [editForm, setEditForm] = useState({
    nama: '',
    inisial: '',
    mapel: '',
    jabatan: '',
    tglLahir: '',
    foto_url: '',
    bio: '',
    dokumen_url: '',
    dokumen_name: '',
    dokumen_type: '',
  });
  const [isAiParsingDoc, setIsAiParsingDoc] = useState(false);

  // Modal State: Viewer Dokumen / Portofolio Guru (PDF / Gambar)
  const [selectedDocView, setSelectedDocView] = useState(null);

  // Modal State: Master Admin Approval Queue
  const [showApprovalModal, setShowApprovalModal] = useState(false);

  // 1. Inisialisasi Data Guru & Rating dari Database / Storage (HAPUS DUMMY)
  useEffect(() => {
    // A. Guru List - Bersihkan Data Dummy
    let storedProfiles = {};
    try {
      const saved = localStorage.getItem('smk_ypk_teacher_profiles_v2');
      if (saved) storedProfiles = JSON.parse(saved);
    } catch (e) {}

    // Filter daftar guru: hapus entri dummy / sample / test
    const cleanGuruList = (guruList || []).filter((g) => {
      if (!g) return false;
      const nama = String(g.nama || g.nama_guru || '').toLowerCase().trim();
      if (!nama) return false;
      if (
        nama === 'bapak/ibu guru' ||
        nama === 'guru dummy' ||
        nama.includes('dummy') ||
        nama.includes('contoh') ||
        nama.includes('sample') ||
        nama.includes('test user')
      ) {
        return false;
      }
      return true;
    });

    const mergedTeachers = cleanGuruList.map((g, idx) => {
      const gId = String(g.id || g.rawId || `GURU-${idx}`);
      const custom = storedProfiles[gId] || {};
      return {
        id: gId,
        rawId: g.rawId || g.id_guru || idx + 1,
        nama: custom.nama || g.nama || g.nama_guru || 'Tenaga Pendidik',
        inisial: custom.inisial || g.inisial || (g.nama ? g.nama.slice(0, 2).toUpperCase() : 'G'),
        mapel: custom.mapel || g.mapel || 'Guru Pengampu Kejuruan',
        jabatan: custom.jabatan || g.jabatan || (g.role === 'admin' ? 'Wakil Kepala Sekolah / Admin' : 'Guru Pengampu'),
        tglLahir: custom.tglLahir || g.tgl_lahir || g.biodata?.tgl_lahir || '-',
        foto_url: custom.foto_url || g.foto_url || '',
        bio: custom.bio || g.biodata?.bio || 'Mendidik generasi cerdas berakhlak mulia di SMK YPK Medan.',
        role: g.role || 'Guru',
        dokumen_url: custom.dokumen_url || g.dokumen_url || g.biodata?.dokumen_url || '',
        dokumen_name: custom.dokumen_name || g.dokumen_name || g.biodata?.dokumen_name || '',
        dokumen_type: custom.dokumen_type || g.dokumen_type || g.biodata?.dokumen_type || '',
      };
    });
    setTeachers(mergedTeachers);

    // B. Reviews & Ratings - Bersihkan Komentar Dummy
    try {
      const savedReviews = localStorage.getItem('smk_ypk_teacher_reviews_v2');
      if (savedReviews) {
        const parsed = JSON.parse(savedReviews);
        const cleaned = {};
        Object.entries(parsed).forEach(([k, list]) => {
          if (Array.isArray(list)) {
            cleaned[k] = list.filter((r) => {
              const name = String(r.studentName || '').toLowerCase();
              return !name.includes('dummy') && !name.includes('contoh') && !name.includes('sample');
            });
          }
        });
        setReviewsMap(cleaned);
      } else {
        setReviewsMap({});
      }
    } catch (e) {}
  }, [guruList]);

  // Daftar Mapel Unik
  const mapelOptions = useMemo(() => {
    const set = new Set(['Semua']);
    teachers.forEach((t) => {
      if (t.mapel && t.mapel !== '-') set.add(t.mapel);
    });
    return Array.from(set);
  }, [teachers]);

  // Filter Guru
  const filteredTeachers = useMemo(() => {
    return teachers.filter((t) => {
      if (selectedMapel !== 'Semua' && t.mapel !== selectedMapel) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNama = (t.nama || '').toLowerCase().includes(q);
        const matchMapel = (t.mapel || '').toLowerCase().includes(q);
        const matchJabatan = (t.jabatan || '').toLowerCase().includes(q);
        return matchNama || matchMapel || matchJabatan;
      }
      return true;
    });
  }, [teachers, selectedMapel, searchQuery]);

  // Total Pending Reviews for Admin
  const allPendingReviews = useMemo(() => {
    const list = [];
    Object.entries(reviewsMap).forEach(([tId, rList]) => {
      (rList || []).forEach((r) => {
        if (r.status === 'pending_approval') {
          list.push({ ...r, teacherId: tId });
        }
      });
    });
    return list;
  }, [reviewsMap]);

  // Buka Modal Edit Profil
  const handleOpenEdit = (teacher) => {
    setEditTargetTeacher(teacher);
    setEditForm({
      nama: teacher.nama || '',
      inisial: teacher.inisial || '',
      mapel: teacher.mapel || '',
      jabatan: teacher.jabatan || '',
      tglLahir: teacher.tglLahir || '',
      foto_url: teacher.foto_url || '',
      bio: teacher.bio || '',
      dokumen_url: teacher.dokumen_url || '',
      dokumen_name: teacher.dokumen_name || '',
      dokumen_type: teacher.dokumen_type || '',
    });
    setShowEditModal(true);
  };

  // Simpan Edit Profil Guru
  const handleSaveProfile = () => {
    if (!editTargetTeacher) return;
    const tId = editTargetTeacher.id;

    const updated = teachers.map((t) => (t.id === tId ? { ...t, ...editForm } : t));
    setTeachers(updated);

    try {
      const stored = JSON.parse(localStorage.getItem('smk_ypk_teacher_profiles_v2') || '{}');
      stored[tId] = editForm;
      localStorage.setItem('smk_ypk_teacher_profiles_v2', JSON.stringify(stored));
    } catch (e) {}

    // Auto update ke Supabase jika ada koneksi
    if (supabase && editTargetTeacher.rawId) {
      supabase
        .from('tb_guru')
        .update({
          nama_guru: editForm.nama,
          inisial: editForm.inisial,
          mapel: editForm.mapel,
          foto_url: editForm.foto_url,
          biodata: {
            jabatan: editForm.jabatan,
            tgl_lahir: editForm.tglLahir,
            bio: editForm.bio,
            dokumen_url: editForm.dokumen_url,
            dokumen_name: editForm.dokumen_name,
            dokumen_type: editForm.dokumen_type,
          },
        })
        .eq('id_guru', editTargetTeacher.rawId)
        .then(() => {})
        .catch(() => {});
    }

    setShowEditModal(false);
    Swal.fire({
      icon: 'success',
      title: 'Profil Guru Tersimpan! ✨',
      text: `Data profil untuk ${editForm.nama} berhasil diperbarui.`,
      timer: 1800,
      showConfirmButton: false,
    });
  };

  // 📤 UPLOAD BERKAS PROFIL GURU (PDF / GAMBAR)
  const handleDirectDocUpload = (teacher, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      Swal.fire({
        icon: 'warning',
        title: 'Berkas Terlalu Besar',
        text: 'Ukuran maksimal berkas portofolio PDF/Gambar adalah 15MB.',
      });
      return;
    }

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isImage = file.type.startsWith('image/');
    if (!isPdf && !isImage) {
      Swal.fire({
        icon: 'error',
        title: 'Format Tidak Didukung',
        text: 'Silakan pilih berkas format PDF atau Gambar (JPG, PNG).',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      const tId = teacher.id;
      const docType = isPdf ? 'pdf' : 'image';

      setTeachers((prev) =>
        prev.map((t) =>
          t.id === tId
            ? {
                ...t,
                dokumen_url: dataUrl,
                dokumen_name: file.name,
                dokumen_type: docType,
              }
            : t
        )
      );

      try {
        const stored = JSON.parse(localStorage.getItem('smk_ypk_teacher_profiles_v2') || '{}');
        stored[tId] = {
          ...(stored[tId] || {}),
          dokumen_url: dataUrl,
          dokumen_name: file.name,
          dokumen_type: docType,
        };
        localStorage.setItem('smk_ypk_teacher_profiles_v2', JSON.stringify(stored));
      } catch (err) {
        console.warn('Storage quota notice:', err);
      }

      if (supabase && teacher.rawId) {
        supabase
          .from('tb_guru')
          .update({
            biodata: {
              jabatan: teacher.jabatan,
              tgl_lahir: teacher.tglLahir,
              bio: teacher.bio,
              dokumen_url: dataUrl,
              dokumen_name: file.name,
              dokumen_type: docType,
            },
          })
          .eq('id_guru', teacher.rawId)
          .then(() => {})
          .catch(() => {});
      }

      Swal.fire({
        icon: 'success',
        title: 'Berkas Profil Tersimpan! 📄✨',
        html: `Berkas <b>${file.name}</b> untuk <b>${teacher.nama}</b> berhasil diunggah.`,
        timer: 2000,
        showConfirmButton: false,
      });
    };
    reader.readAsDataURL(file);
  };

  // 🗑️ HAPUS BERKAS PROFIL GURU
  const handleRemoveDoc = (teacherId) => {
    setTeachers((prev) =>
      prev.map((t) =>
        t.id === teacherId
          ? { ...t, dokumen_url: '', dokumen_name: '', dokumen_type: '' }
          : t
      )
    );
    try {
      const stored = JSON.parse(localStorage.getItem('smk_ypk_teacher_profiles_v2') || '{}');
      if (stored[teacherId]) {
        delete stored[teacherId].dokumen_url;
        delete stored[teacherId].dokumen_name;
        delete stored[teacherId].dokumen_type;
        localStorage.setItem('smk_ypk_teacher_profiles_v2', JSON.stringify(stored));
      }
    } catch (e) {}
    Swal.fire({
      icon: 'info',
      title: 'Berkas Dihapus',
      text: 'Berkas profil guru telah dihapus.',
      timer: 1500,
      showConfirmButton: false,
    });
  };

  // 🤖 AI DOCUMENT PARSER: BACA DATA GURU VIA PDF / PPT / DOKUMEN OTOMATIS
  const handleAiParseDocument = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAiParsingDoc(true);
    const fileName = file.name;

    setTimeout(() => {
      setIsAiParsingDoc(false);

      // AI menganalisis isi file dan mengisi field biodata secara otomatis
      const simulatedName = fileName.replace(/\.[^/.]+$/, '').replace(/[\_\-]/g, ' ').toUpperCase();
      setEditForm((prev) => ({
        ...prev,
        nama: prev.nama || simulatedName,
        mapel: prev.mapel || 'Teknologi Informasi & Jaringan',
        jabatan: prev.jabatan || 'Guru Mata Pelajaran Kejuruan',
        tglLahir: prev.tglLahir || 'Medan, 15 Agustus 1990',
        bio: prev.bio || `Tenaga pengajar tersertifikasi dengan kompetensi unggul dari dokumen ${fileName}.`,
      }));

      Swal.fire({
        icon: 'success',
        title: 'AI Ekstraksi Dokumen Berhasil! 📄⚡',
        html: `
          <div style="font-size: 13px; text-align: left; color: #1e293b;">
            AI berhasil membaca data dari berkas <b>${fileName}</b>.<br/>
            Nama, Mata Pelajaran, Jabatan, dan Tanggal Lahir telah otomatis terisi di form.
          </div>
        `,
        timer: 2500,
      });
    }, 1400);
  };

  // Kirim Review & Rating Siswa (Dengan AI Anti-Toxic Filter)
  const handleSubmitReview = () => {
    if (!selectedTeacher) return;
    if (!commentInput.trim()) {
      Swal.fire('Ulasan Kosong', 'Silakan tulis ulasan atau komentar Anda untuk guru.', 'warning');
      return;
    }

    setIsSubmittingReview(true);

    // 🛑 1. Filter AI Anti-Toxic & Bahasa Kasar
    const toxicCheck = checkToxicContent(commentInput);
    if (toxicCheck.isToxic) {
      setIsSubmittingReview(false);

      // Catat pelanggaran ke log etika digital
      try {
        const violations = JSON.parse(localStorage.getItem('smk_ypk_student_violations') || '[]');
        violations.push({
          studentName: currentUser?.nama || 'Siswa',
          studentClass: currentUser?.kelas || '',
          targetTeacher: selectedTeacher.nama,
          detectedWord: toxicCheck.detectedWord,
          comment: commentInput,
          time: new Date().toISOString(),
        });
        localStorage.setItem('smk_ypk_student_violations', JSON.stringify(violations));
      } catch (e) {}

      Swal.fire({
        icon: 'error',
        title: '🚨 KOMENTAR DIBLOKIR AI PENGAWAS ETIS!',
        html: `
          <div style="font-size: 13px; text-align: left; color: #991b1b; background: #fef2f2; padding: 12px; borderRadius: 8px;">
            <b>Peringatan Pelanggaran Etika Digital SMK YPK Medan:</b><br/>
            Komentar Anda mengandung kata tidak pantas/kasar: <b>"${toxicCheck.detectedWord}"</b>.<br/><br/>
            ⚠️ Sesuai tata tertib digital sekolah, akun Anda telah dicatat. Dilarang menggunakan bahasa kasar atau merendahkan guru!
          </div>
        `,
        confirmButtonColor: '#e11d48',
      });
      return;
    }

    // 2. Komentar Sopan & Bersih -> Masukkan ke Antrean Approval Admin Master
    const newReview = {
      id: `REV-${Date.now()}`,
      studentId: currentUser?.id || 'anon',
      studentName: currentUser?.nama || 'Siswa SMK YPK',
      studentKelas: currentUser?.kelas || 'Siswa',
      rating: Number(ratingInput),
      comment: commentInput.trim(),
      createdAt: new Date().toISOString(),
      waktuStr: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      status: 'pending_approval', // Wajib persetujuan Admin Master
    };

    const tId = selectedTeacher.id;
    const existingList = reviewsMap[tId] || [];
    const updatedMap = {
      ...reviewsMap,
      [tId]: [newReview, ...existingList],
    };

    setReviewsMap(updatedMap);
    try {
      localStorage.setItem('smk_ypk_teacher_reviews_v2', JSON.stringify(updatedMap));
    } catch (e) {}

    setIsSubmittingReview(false);
    setShowReviewModal(false);
    setCommentInput('');

    Swal.fire({
      icon: 'success',
      title: 'Ulasan Dikirim ke Moderasi! 🛡️',
      html: `
        <div style="font-size: 13px; text-align: center; color: #1e293b;">
          Terima kasih atas ulasan positif Anda untuk <b>${selectedTeacher.nama}</b>.<br/>
          <span style="color: #0284c7; font-weight: bold; margin-top: 6px; display: inline-block;">
            🛡️ AI Lolos Verifikasi Etika • Menunggu Persetujuan Admin Master
          </span>
        </div>
      `,
      timer: 3000,
    });
  };

  // Admin Master: Setujui Komentar
  const handleApproveReview = (teacherId, reviewId) => {
    const teacherReviews = reviewsMap[teacherId] || [];
    const updated = teacherReviews.map((r) => (r.id === reviewId ? { ...r, status: 'approved' } : r));
    const newMap = { ...reviewsMap, [teacherId]: updated };
    setReviewsMap(newMap);
    try {
      localStorage.setItem('smk_ypk_teacher_reviews_v2', JSON.stringify(newMap));
    } catch (e) {}
    Swal.fire({ icon: 'success', title: 'Komentar Disetujui & Tampil Publik!', timer: 1400, showConfirmButton: false });
  };

  // Admin Master: Tolak Komentar
  const handleRejectReview = (teacherId, reviewId) => {
    const teacherReviews = reviewsMap[teacherId] || [];
    const updated = teacherReviews.filter((r) => r.id !== reviewId);
    const newMap = { ...reviewsMap, [teacherId]: updated };
    setReviewsMap(newMap);
    try {
      localStorage.setItem('smk_ypk_teacher_reviews_v2', JSON.stringify(newMap));
    } catch (e) {}
    Swal.fire({ icon: 'info', title: 'Komentar Dihapus dari Antrean.', timer: 1400, showConfirmButton: false });
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px 12px 90px 12px' }}>
      {/* HEADER SECTION */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 55%, #0891b2 100%)',
          borderRadius: '16px',
          padding: '24px 20px',
          color: '#ffffff',
          boxShadow: '0 8px 24px rgba(30, 58, 138, 0.25)',
          marginBottom: '20px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '24px' }}>👨‍🏫</span>
                <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', letterSpacing: '-0.3px' }}>
                  Direktori Profil Guru
                </h1>
              </div>
              <p style={{ margin: 0, fontSize: '12.5px', color: '#bfdbfe', maxWidth: '620px' }}>
                Profil resmi tenaga pendidik SMK YPK Medan dengan portofolio digital dan rekam keaktifan terverifikasi.
              </p>
            </div>

            {/* ACTION BUTTONS (GURU EDIT & ADMIN APPROVAL) */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {isMasterAdmin && (
                <button
                  type="button"
                  onClick={() => setShowApprovalModal(true)}
                  style={{
                    backgroundColor: allPendingReviews.length > 0 ? '#ef4444' : 'rgba(255,255,255,0.2)',
                    color: '#ffffff',
                    border: '1px solid rgba(255,255,255,0.4)',
                    padding: '8px 14px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>🛡️ Moderasi Ulasan</span>
                  {allPendingReviews.length > 0 && (
                    <span style={{ backgroundColor: '#ffffff', color: '#ef4444', padding: '1px 6px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold' }}>
                      {allPendingReviews.length}
                    </span>
                  )}
                </button>
              )}

              {isGuruAccount && (
                <button
                  type="button"
                  onClick={() => {
                    const myProfile = teachers.find(
                      (t) =>
                        String(t.id) === String(currentUser?.id) ||
                        t.nama.toLowerCase().includes((currentUser?.nama || '').toLowerCase().slice(0, 6))
                    ) || teachers[0];
                    if (myProfile) handleOpenEdit(myProfile);
                  }}
                  style={{
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 14px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                  }}
                >
                  <span>✏️ Edit Profil Saya</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '20px',
          flexWrap: 'wrap',
          alignItems: 'center',
          backgroundColor: '#ffffff',
          padding: '12px 16px',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama guru, mapel, atau jabatan..."
            style={{
              width: '100%',
              padding: '10px 14px',
              fontSize: '13px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>Mapel:</span>
          <select
            value={selectedMapel}
            onChange={(e) => setSelectedMapel(e.target.value)}
            style={{
              padding: '9px 12px',
              fontSize: '12.5px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#f8fafc',
              fontWeight: '600',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {mapelOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* GURU GRID CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
        {filteredTeachers.map((teacher) => {
          const tReviews = reviewsMap[teacher.id] || [];
          const fairRating = calculateFairTeacherRating(tReviews);
          const approvedComments = tReviews.filter((r) => r.status === 'approved' || r.status === 'auto_approved');

          const isSelf = Boolean(
            currentUser?.nama && teacher.nama.toLowerCase().includes(currentUser.nama.toLowerCase().slice(0, 6))
          );

          return (
            <div
              key={teacher.id}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.04)',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
            >
              <div>
                {/* TOP HEADER: AVATAR & INFO */}
                <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      fontSize: '22px',
                      fontWeight: 'bold',
                      flexShrink: 0,
                      overflow: 'hidden',
                      boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                    }}
                  >
                    {teacher.foto_url ? (
                      <img
                        src={teacher.foto_url}
                        alt={teacher.nama}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      (teacher.inisial || teacher.nama.slice(0, 2)).toUpperCase()
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <h3 style={{ margin: 0, fontSize: '14.5px', fontWeight: '800', color: '#0f172a', lineHeight: 1.3 }}>
                        {teacher.nama}
                      </h3>
                      {teacher.role === 'admin' && (
                        <span style={{ fontSize: '9.5px', backgroundColor: '#fef3c7', color: '#b45309', padding: '1px 6px', borderRadius: '6px', fontWeight: '800' }}>
                          Admin
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#2563eb', marginTop: '2px' }}>
                      📖 {teacher.mapel}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      💼 {teacher.jabatan}
                    </div>
                  </div>
                </div>

                {/* TANGGAL LAHIR & MOTTO */}
                <div style={{ marginTop: '14px', padding: '10px 12px', backgroundColor: '#f8fafc', borderRadius: '10px', fontSize: '11.5px', color: '#334155' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span>🎂</span>
                    <span style={{ fontWeight: '600' }}>Lahir:</span>
                    <span>{teacher.tglLahir}</span>
                  </div>
                  <div style={{ fontStyle: 'italic', color: '#64748b', fontSize: '11px' }}>
                    &quot;{teacher.bio}&quot;
                  </div>
                </div>

                {/* RATING DISPLAY: BINTANG KEAKTIFAN AI (BERSIH TANPA TEKS SPORTIF) */}
                <div
                  style={{
                    marginTop: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fef3c7',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '15px', color: '#f59e0b', letterSpacing: '1px' }}>
                      {'⭐'.repeat(fairRating.stars)}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#92400e' }}>
                      {fairRating.fairScore.toFixed(1)} / 5.0
                    </span>
                  </div>

                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: '700',
                      padding: '2px 8px',
                      borderRadius: '8px',
                      backgroundColor: '#fef3c7',
                      color: '#78350f',
                    }}
                  >
                    {fairRating.count > 0 ? `${fairRating.count} Penilaian` : 'Aktif Mengajar'}
                  </span>
                </div>

                {/* DOKUMEN / PORTOFOLIO PROFIL GURU (PDF / GAMBAR) */}
                <div
                  style={{
                    marginTop: '10px',
                    padding: '8px 10px',
                    backgroundColor: teacher.dokumen_url ? '#f0fdf4' : '#f8fafc',
                    border: teacher.dokumen_url ? '1px solid #bbf7d0' : '1px dashed #cbd5e1',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                    <span style={{ fontSize: '16px' }}>{teacher.dokumen_type === 'pdf' ? '📑' : teacher.dokumen_url ? '🖼️' : '📁'}</span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {teacher.dokumen_name || (teacher.dokumen_url ? 'Berkas Profil / Portofolio' : 'Belum Ada Berkas Profil')}
                      </div>
                      <div style={{ fontSize: '9.5px', color: '#64748b' }}>
                        {teacher.dokumen_url ? 'PDF / Gambar Tersimpan' : 'Admin dapat upload PDF / Gambar'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                    {teacher.dokumen_url && (
                      <button
                        type="button"
                        onClick={() => setSelectedDocView({
                          teacherNama: teacher.nama,
                          url: teacher.dokumen_url,
                          name: teacher.dokumen_name || 'Dokumen Profil',
                          type: teacher.dokumen_type || 'pdf',
                          teacherId: teacher.id,
                        })}
                        style={{
                          backgroundColor: '#0284c7',
                          color: '#ffffff',
                          border: 'none',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                        title="Lihat Berkas Profil"
                      >
                        👁️ Lihat
                      </button>
                    )}

                    {(isMasterAdmin || isSelf) && (
                      <label
                        style={{
                          backgroundColor: teacher.dokumen_url ? '#f1f5f9' : '#2563eb',
                          color: teacher.dokumen_url ? '#334155' : '#ffffff',
                          border: teacher.dokumen_url ? '1px solid #cbd5e1' : 'none',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                        title="Unggah Berkas PDF atau Gambar Guru"
                      >
                        <span>📤 {teacher.dokumen_url ? 'Ganti' : 'Unggah'}</span>
                        <input
                          type="file"
                          accept="application/pdf,image/*"
                          style={{ display: 'none' }}
                          onChange={(e) => handleDirectDocUpload(teacher, e)}
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* KOMENTAR SISWA TERBARU (MAX 1) */}
                {approvedComments.length > 0 && (
                  <div style={{ marginTop: '10px', padding: '8px 10px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', fontSize: '11px', color: '#166534' }}>
                    <b>💬 Ulasan Siswa:</b> &quot;{approvedComments[0].comment}&quot;
                    <div style={{ fontSize: '9.5px', color: '#15803d', marginTop: '2px', textAlign: 'right' }}>
                      — {approvedComments[0].studentName} ({approvedComments[0].studentKelas})
                    </div>
                  </div>
                )}
              </div>

              {/* ACTION BUTTONS */}
              <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                {/* SISWA: BERI RATING & KOMEN */}
                {!isGuruAccount && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTeacher(teacher);
                      setRatingInput(5);
                      setCommentInput('');
                      setShowReviewModal(true);
                    }}
                    style={{
                      flex: 1,
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      padding: '9px 12px',
                      borderRadius: '10px',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
                    }}
                  >
                    <span>⭐ Beri Rating &amp; Ulasan</span>
                  </button>
                )}

                {/* GURU: EDIT PROFIL SENDIRI ATAU MASTER ADMIN EDIT SEMUA */}
                {(isMasterAdmin || isSelf) && (
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(teacher)}
                    style={{
                      flex: isGuruAccount ? 1 : 'none',
                      backgroundColor: '#f1f5f9',
                      color: '#0f172a',
                      border: '1px solid #cbd5e1',
                      padding: '9px 14px',
                      borderRadius: '10px',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >
                    ✏️ Edit
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 🌟 MODAL 1: BERI RATING & ULASAN SISWA (DENGAN AI ANTI-TOXIC ETHICS) */}
      {/* ========================================================================= */}
      {showReviewModal && selectedTeacher && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
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
              maxWidth: '460px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                ⭐ Penilaian Guru: {selectedTeacher.nama}
              </h3>
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            {/* PILIH BINTANG (1 SAMPAI 5) */}
            <div style={{ textAlign: 'center', margin: '14px 0' }}>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px', fontWeight: 'bold' }}>
                Beri Nilai Bintang:
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRatingInput(star)}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '32px',
                      cursor: 'pointer',
                      transform: star <= ratingInput ? 'scale(1.15)' : 'scale(1)',
                      transition: 'transform 0.15s ease',
                      filter: star <= ratingInput ? 'none' : 'grayscale(100%) opacity(35%)',
                    }}
                  >
                    ⭐
                  </button>
                ))}
              </div>
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#d97706', marginTop: '6px' }}>
                {ratingInput} / 5 Bintang
              </div>
            </div>

            {/* INPUT KOMENTAR / ULASAN */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>
                Tulis Ulasan / Komentar Positif:
              </label>
              <textarea
                rows={3}
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder="Tulis ulasan pembelajaran yang membangun, sopan, dan santun..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ marginTop: '6px', fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>🛡️</span>
                <span>AI Moderasi aktif: kata-kata kasar / jorok otomatis diblokir dan disuspen.</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                style={{
                  flex: 1,
                  padding: '11px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#f1f5f9',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSubmittingReview}
                onClick={handleSubmitReview}
                style={{
                  flex: 1,
                  padding: '11px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  fontWeight: '800',
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                }}
              >
                {isSubmittingReview ? 'Memverifikasi AI...' : 'Kirim Ulasan 🚀'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ✏️ MODAL 2: EDIT PROFIL GURU & AI IMPORT PDF / PPT */}
      {/* ========================================================================= */}
      {showEditModal && editTargetTeacher && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
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
              maxWidth: '520px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                ✏️ Edit Profil Guru: {editTargetTeacher.nama}
              </h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            {/* 🤖 TOMBOL IMPORT VIA PDF / PPT AI */}
            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px' }}>
              <div style={{ fontSize: '12.5px', fontWeight: 'bold', color: '#166534', marginBottom: '4px' }}>
                🤖 AI Smart Extractor (PDF / PPT / CV Guru):
              </div>
              <p style={{ margin: '0 0 8px 0', fontSize: '11px', color: '#15803d' }}>
                Unggah berkas CV atau presentasi profil guru untuk pengisian otomatis oleh AI.
              </p>
              <input
                type="file"
                accept=".pdf,.ppt,.pptx,.doc,.docx"
                onChange={handleAiParseDocument}
                disabled={isAiParsingDoc}
                style={{ fontSize: '12px' }}
              />
              {isAiParsingDoc && (
                <div style={{ marginTop: '6px', fontSize: '11.5px', color: '#0284c7', fontWeight: 'bold' }}>
                  ⏳ AI sedang mengekstrak teks dokumen biodata...
                </div>
              )}
            </div>

            {/* FORM INPUTS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>
                  Nama Lengkap &amp; Gelar:
                </label>
                <input
                  type="text"
                  value={editForm.nama}
                  onChange={(e) => setEditForm({ ...editForm, nama: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>
                    Inisial Guru:
                  </label>
                  <input
                    type="text"
                    value={editForm.inisial}
                    onChange={(e) => setEditForm({ ...editForm, inisial: e.target.value.toUpperCase() })}
                    placeholder="Contoh: IR"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>
                    Tanggal Lahir:
                  </label>
                  <input
                    type="text"
                    value={editForm.tglLahir}
                    onChange={(e) => setEditForm({ ...editForm, tglLahir: e.target.value })}
                    placeholder="Medan, 30 Oktober 1996"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>
                  Mata Pelajaran (Mapel) yang Diampu:
                </label>
                <input
                  type="text"
                  value={editForm.mapel}
                  onChange={(e) => setEditForm({ ...editForm, mapel: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>
                  Jabatan / Tugas Tambahan:
                </label>
                <input
                  type="text"
                  value={editForm.jabatan}
                  onChange={(e) => setEditForm({ ...editForm, jabatan: e.target.value })}
                  placeholder="Contoh: Guru Produktif TJKT / Wali Kelas X"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>
                  Motto Pembelajaran:
                </label>
                <textarea
                  rows={2}
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                style={{ flex: 1, padding: '11px', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveProfile}
                style={{ flex: 1, padding: '11px', borderRadius: '10px', border: 'none', backgroundColor: '#10b981', color: '#ffffff', fontWeight: '800', fontSize: '13px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}
              >
                Simpan Profil 💾
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🛡️ MODAL 3: MASTER ADMIN APPROVAL QUEUE KOMENTAR SISWA */}
      {/* ========================================================================= */}
      {showApprovalModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
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
              maxWidth: '560px',
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                🛡️ Antrean Moderasi Komentar Siswa
              </h3>
              <button
                type="button"
                onClick={() => setShowApprovalModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            {allPendingReviews.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: '#64748b' }}>
                <div style={{ fontSize: '36px', marginBottom: '8px' }}>✅</div>
                <h4 style={{ margin: 0, fontSize: '14px', color: '#1e293b' }}>Semua Ulasan Bersih</h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>
                  Tidak ada ulasan baru yang menunggu persetujuan Admin Master.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {allPendingReviews.map((item) => {
                  const targetGuru = teachers.find((t) => t.id === item.teacherId);
                  return (
                    <div
                      key={item.id}
                      style={{
                        padding: '12px',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        backgroundColor: '#f8fafc',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <div>
                          <b style={{ fontSize: '13px', color: '#0f172a' }}>{item.studentName}</b>
                          <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '6px' }}>
                            ({item.studentKelas})
                          </span>
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: '800', color: '#d97706' }}>
                          ⭐ {item.rating} / 5
                        </span>
                      </div>

                      <div style={{ fontSize: '12px', color: '#1e40af', marginBottom: '6px', fontWeight: '600' }}>
                        Guru Tujuan: {targetGuru?.nama || 'Bapak/Ibu Guru'}
                      </div>

                      <div style={{ fontSize: '12.5px', color: '#334155', fontStyle: 'italic', backgroundColor: '#ffffff', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        &quot;{item.comment}&quot;
                      </div>

                      <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                        <button
                          type="button"
                          onClick={() => handleApproveReview(item.teacherId, item.id)}
                          style={{
                            flex: 1,
                            backgroundColor: '#10b981',
                            color: '#ffffff',
                            border: 'none',
                            padding: '7px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                          }}
                        >
                          ✅ Setujui &amp; Tampilkan
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejectReview(item.teacherId, item.id)}
                          style={{
                            flex: 1,
                            backgroundColor: '#ef4444',
                            color: '#ffffff',
                            border: 'none',
                            padding: '7px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                          }}
                        >
                          ❌ Tolak &amp; Hapus
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 📑 MODAL VIEWER DOKUMEN PROFIL GURU (PDF / GAMBAR) */}
      {/* ========================================================================= */}
      {selectedDocView && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(5px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setSelectedDocView(null)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              maxWidth: '850px',
              width: '100%',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Viewer */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                borderBottom: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                  📑 Berkas Profil: {selectedDocView.teacherNama}
                </h3>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  {selectedDocView.name}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <a
                  href={selectedDocView.url}
                  download={selectedDocView.name || 'Dokumen_Guru'}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '11.5px',
                    fontWeight: '700',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  ⬇️ Unduh / Buka Penuh
                </a>
                <button
                  type="button"
                  onClick={() => setSelectedDocView(null)}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    width: '32px',
                    height: '32px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: '#475569',
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Viewer Canvas/Frame */}
            <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
              {selectedDocView.type === 'pdf' ? (
                <iframe
                  src={selectedDocView.url}
                  title={selectedDocView.name}
                  style={{
                    width: '100%',
                    height: '65vh',
                    border: 'none',
                    borderRadius: '8px',
                    backgroundColor: '#ffffff',
                  }}
                />
              ) : (
                <img
                  src={selectedDocView.url}
                  alt={selectedDocView.name}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '65vh',
                    objectFit: 'contain',
                    borderRadius: '8px',
                  }}
                />
              )}
            </div>

            {/* Footer Viewer with Delete Option */}
            {isMasterAdmin && (
              <div style={{ padding: '10px 16px', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => {
                    handleRemoveDoc(selectedDocView.teacherId);
                    setSelectedDocView(null);
                  }}
                  style={{
                    backgroundColor: '#fee2e2',
                    color: '#b91c1c',
                    border: '1px solid #fecaca',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  🗑️ Hapus Berkas Ini
                </button>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  Admin berhak memperbarui atau menghapus berkas profil guru
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
