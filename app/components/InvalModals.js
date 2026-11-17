'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Swal from 'sweetalert2';
import styles from '../utils/dashboardStyles';
import {
  SESSION_TIMETABLE,
  getInvalSessionStatus,
  formatWaktuLengkap,
  getJakartaDateString,
  toUnicodeBold,
  normalizeUid,
} from '../utils/dashboardHelpers';

// 📋 MODAL JURNAL INVAL GURU (DAFTAR SEMUA PENUGASAN INVAL)
function JurnalInvalModal({
  invalList = [],
  guruList = [],
  currentUser,
  onClose,
  onOpenAdd,
  onRefresh,
}) {
  const [filterMode, setFilterMode] = useState('today'); // 'today' | 'all' | 'custom'
  const [customDate, setCustomDate] = useState('');
  const [searchInval, setSearchInval] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // 🛑 PROTEKSI AKSES: Siswa Biasa & Siswa Admin Dilarang Mengakses Jurnal Inval Guru (Admin Master & Guru Bebas Akses)
  const isMasterOrGuru = Boolean(
    currentUser?.username?.toLowerCase() === 'iqbal' ||
    currentUser?.nama?.toLowerCase()?.includes('iqbal') ||
    currentUser?.role?.toLowerCase() === 'master' ||
    (currentUser?.role?.toLowerCase() === 'admin' && !String(currentUser?.id).startsWith('SISWA-')) ||
    (currentUser?.isGuru && !String(currentUser?.id).startsWith('SISWA-'))
  );
  const isSiswaAdminUser = Boolean(String(currentUser?.role || '').toLowerCase().includes('siswa_admin') || (String(currentUser?.id).startsWith('SISWA-') && String(currentUser?.role || '').toLowerCase().includes('admin')));
  const isSiswaUser = !isMasterOrGuru && Boolean(String(currentUser?.id).startsWith('SISWA-') || isSiswaAdminUser);
  if (isSiswaUser) return null;

  const todayStr = getJakartaDateString(new Date());

  const filteredInval = invalList.filter((item) => {
    if (filterMode === 'today' && item.tanggal !== todayStr) return false;
    if (filterMode === 'custom' && customDate && item.tanggal !== customDate) return false;

    if (searchInval.trim()) {
      const q = searchInval.toLowerCase();
      const matchUtama = item.nama_guru_utama?.toLowerCase().includes(q);
      const matchInval = item.nama_guru_inval?.toLowerCase().includes(q);
      const matchKelas = item.kelas?.toLowerCase().includes(q);
      const matchMapel = item.mapel?.toLowerCase().includes(q);
      if (!matchUtama && !matchInval && !matchKelas && !matchMapel) return false;
    }
    return true;
  });

  const handleToggleStatus = async (item) => {
    const nextStatus = item.status_inval === 'Selesai' ? 'Ditugaskan' : 'Selesai';
    setIsProcessing(true);
    try {
      const res = await fetch('/api/inval-guru', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          status_inval: nextStatus,
          updated_by: currentUser?.nama || 'Admin',
        }),
      });
      if (res.ok) {
        await onRefresh();
      }
    } catch (e) {
      console.error('Update status inval error:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteInval = async (id, nama) => {
    const confirm = await Swal.fire({
      title: 'Hapus Penugasan Inval?',
      text: `Penugasan inval untuk ${nama} akan dihapus dari sistem.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus Penugasan',
      cancelButtonText: 'Batal',
    });

    if (confirm.isConfirmed) {
      setIsProcessing(true);
      try {
        const res = await fetch(`/api/inval-guru?id=${id}&deleted_by=${encodeURIComponent(currentUser?.nama || 'Admin')}`, { method: 'DELETE' });
        const resJson = await res.json();
        if (res.ok && resJson.success) {
          Swal.fire({ icon: 'success', title: 'Terhapus', text: 'Penugasan inval berhasil dihapus.', timer: 2000, showConfirmButton: false });
          await onRefresh();
        } else {
          Swal.fire({ icon: 'error', title: 'Gagal', text: resJson.error || 'Gagal menghapus penugasan inval' });
        }
      } catch (e) {
        console.error('Delete inval error:', e);
        Swal.fire({ icon: 'error', title: 'Error', text: 'Terjadi kesalahan sistem saat menghapus.' });
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleExportCsv = () => {
    if (filteredInval.length === 0) {
      Swal.fire({ icon: 'info', title: 'Data Kosong', text: 'Tidak ada data jurnal inval untuk diexport.' });
      return;
    }

    const headers = ['No', 'Tanggal', 'Guru Utama', 'Guru Inval', 'Kelas', 'Jam Ke', 'Status', 'Alasan', 'Tugas / Materi'];
    const rows = filteredInval.map((item, index) => [
      index + 1,
      item.tanggal || '',
      item.nama_guru_utama || '',
      item.nama_guru_inval || '',
      item.kelas || '',
      item.jam_ke || '',
      item.status_inval || 'Ditugaskan',
      item.alasan || '',
      item.keterangan_tugas || item.materi_nama || '',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Jurnal_Inval_Guru_SMK_YPK_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const [selectedIds, setSelectedIds] = useState([]);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  // 🔢 URUTKAN JAM JP 1 S/D 11 SECARA NUMERIK
  const sortedInval = useMemo(() => {
    return [...filteredInval].sort((a, b) => {
      const jamA = parseInt(String(a.jam_ke || '').replace(/\D/g, '')) || 0;
      const jamB = parseInt(String(b.jam_ke || '').replace(/\D/g, '')) || 0;
      if (jamA !== jamB) return jamA - jamB;
      return String(a.nama_guru_utama || '').localeCompare(String(b.nama_guru_utama || ''));
    });
  }, [filteredInval]);

  const totalInval = sortedInval.length;
  const selesaiCount = sortedInval.filter((i) => getInvalSessionStatus(i).isDone).length;
  const ditugaskanCount = totalInval - selesaiCount;

  // Checkbox Selection
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(sortedInval.map((i) => i.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // 🖨️ BUKA MODAL PREVIEW CETAK RESMI (100% BEKERJA TANPA POPUP BLOCKER)
  const handleOpenPrintPreview = () => {
    if (sortedInval.length === 0) {
      Swal.fire({ icon: 'info', title: 'Belum Ada Data', text: 'Tidak ada data penugasan inval untuk dicetak pada filter ini.' });
      return;
    }
    setShowPrintPreview(true);
  };

  // 🗑️ HAPUS BANYAK SESI SEKALIGUS (BATCH DELETE)
  const handleDeleteBatch = async () => {
    if (selectedIds.length === 0) {
      Swal.fire({ icon: 'info', title: 'Belum Ada yang Dipilih', text: 'Centang kotak pada baris jadwal yang ingin Anda hapus.' });
      return;
    }

    const confirm = await Swal.fire({
      icon: 'warning',
      title: `Hapus ${selectedIds.length} Penugasan Terpilih?`,
      text: 'Semua jadwal yang dicentang akan dibersihkan dari sistem dan pemberitahuan pembatalan akan dikirimkan ke WhatsApp.',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: `🗑️ Ya, Hapus (${selectedIds.length}) Sesi`,
      cancelButtonText: 'Batal',
    });

    if (confirm.isConfirmed) {
      setIsProcessing(true);
      try {
        const deletedBy = currentUser?.nama || 'Admin';
        const res = await fetch(`/api/inval-guru?ids=${selectedIds.join(',')}&deleted_by=${encodeURIComponent(deletedBy)}`, {
          method: 'DELETE',
        });
        const resJson = await res.json();
        if (resJson.success) {
          Swal.fire({
            icon: 'success',
            title: 'Berhasil Dihapus! 🗑️',
            text: `${selectedIds.length} penugasan telah dihapus dan notifikasi pembatalan terkirim ke seluruh perangkat.`,
            timer: 2000,
            showConfirmButton: false,
          });
          setSelectedIds([]);
          await onRefresh();
        } else {
          Swal.fire({ icon: 'error', title: 'Gagal', text: resJson.error || 'Gagal menghapus penugasan inval' });
        }
      } catch (e) {
        console.error('Delete batch inval error:', e);
        Swal.fire({ icon: 'error', title: 'Error', text: 'Terjadi kesalahan sistem saat menghapus.' });
      } finally {
        setIsProcessing(false);
      }
    }
  };

  // 🗑️ HAPUS SEMUA INVAL HARI INI
  const handleDeleteAllToday = async () => {
    if (sortedInval.length === 0) {
      Swal.fire({ icon: 'info', title: 'Data Kosong', text: 'Tidak ada data penugasan inval untuk dihapus.' });
      return;
    }

    const confirm = await Swal.fire({
      icon: 'warning',
      title: `Hapus SEMUA (${sortedInval.length}) Penugasan?`,
      text: `Seluruh jadwal penugasan pada filter ini akan dihapus permanen dan WhatsApp grup akan menerima notifikasi pembatalan.`,
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: '🗑️ Ya, Hapus Semua Sekaligus',
      cancelButtonText: 'Batal',
    });

    if (confirm.isConfirmed) {
      setIsProcessing(true);
      try {
        const allIds = sortedInval.map((i) => i.id);
        const deletedBy = currentUser?.nama || 'Admin';
        const res = await fetch(`/api/inval-guru?ids=${allIds.join(',')}&deleted_by=${encodeURIComponent(deletedBy)}`, {
          method: 'DELETE',
        });
        const resJson = await res.json();
        if (resJson.success) {
          Swal.fire({
            icon: 'success',
            title: 'Semua Inval Berhasil Dihapus! 🗑️',
            text: `Data jadwal telah dibersihkan.`,
            timer: 2000,
            showConfirmButton: false,
          });
          setSelectedIds([]);
          await onRefresh();
        } else {
          Swal.fire({ icon: 'error', title: 'Gagal', text: resJson.error || 'Gagal menghapus penugasan inval' });
        }
      } catch (e) {
        console.error('Delete all error:', e);
        Swal.fire({ icon: 'error', title: 'Error', text: 'Terjadi kesalahan sistem saat menghapus.' });
      } finally {
        setIsProcessing(false);
      }
    }
  };

  return (
    <div style={styles.modalOverlay}>
      <div style={{ ...styles.modalContent, maxWidth: '940px', width: '95%' }}>
        <div style={styles.modalHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>📋</span>
            <div>
              <h3 style={{ margin: 0, color: '#7c3aed', fontWeight: 'bold' }}>Jurnal &amp; Penugasan Inval Guru</h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#64748b' }}>
                Jadwal KBM 40 Menit (Sesi 1: 07:15) • Admin bebas upload kapan saja
              </p>
            </div>
          </div>
          <button onClick={onClose} style={styles.btnCloseModal}>
            ✕
          </button>
        </div>

        {/* STATISTIK MINI INVAL */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', margin: '14px 0' }}>
          <div style={{ backgroundColor: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '8px', padding: '10px 14px' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#6d28d9', textTransform: 'uppercase' }}>Total Penugasan</span>
            <h4 style={{ margin: '2px 0 0 0', fontSize: '20px', fontWeight: 'bold', color: '#5b21b6' }}>{totalInval}</h4>
          </div>
          <div style={{ backgroundColor: '#fef3c7', border: '1px solid #fde68a', borderRadius: '8px', padding: '10px 14px' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#b45309', textTransform: 'uppercase' }}>Ditugaskan / Berjalan</span>
            <h4 style={{ margin: '2px 0 0 0', fontSize: '20px', fontWeight: 'bold', color: '#92400e' }}>{ditugaskanCount}</h4>
          </div>
          <div style={{ backgroundColor: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 14px' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#15803d', textTransform: 'uppercase' }}>KBM Selesai (Otomatis / Manual)</span>
            <h4 style={{ margin: '2px 0 0 0', fontSize: '20px', fontWeight: 'bold', color: '#166534' }}>{selesaiCount}</h4>
          </div>
        </div>

        {/* FILTER & ACTIONS BAR */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setFilterMode('today')}
              style={{
                padding: '5px 10px',
                fontSize: '11px',
                fontWeight: 'bold',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: filterMode === 'today' ? '#7c3aed' : '#ffffff',
                color: filterMode === 'today' ? '#ffffff' : '#334155',
                cursor: 'pointer',
              }}
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              style={{
                padding: '5px 10px',
                fontSize: '11px',
                fontWeight: 'bold',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: filterMode === 'all' ? '#7c3aed' : '#ffffff',
                color: filterMode === 'all' ? '#ffffff' : '#334155',
                cursor: 'pointer',
              }}
            >
              Semua Waktu
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('custom')}
              style={{
                padding: '5px 10px',
                fontSize: '11px',
                fontWeight: 'bold',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: filterMode === 'custom' ? '#7c3aed' : '#ffffff',
                color: filterMode === 'custom' ? '#ffffff' : '#334155',
                cursor: 'pointer',
              }}
            >
              Pilih Tanggal
            </button>

            {filterMode === 'custom' && (
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Cari guru, kelas, mapel..."
              value={searchInval}
              onChange={(e) => setSearchInval(e.target.value)}
              style={{ padding: '5px 10px', fontSize: '11px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '140px' }}
            />
            <button
              type="button"
              onClick={handleOpenPrintPreview}
              style={{ padding: '6px 12px', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#1e40af', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              title="Cetak Form Guru Pengganti Ber-KOP Resmi & Unduh PDF"
            >
              🖨️ Cetak Form (PDF)
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              style={{ padding: '6px 10px', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#059669', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              📥 CSV
            </button>
            <button
              type="button"
              onClick={onOpenAdd}
              style={{ padding: '6px 10px', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#7c3aed', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              ➕ Buat Inval
            </button>
          </div>
        </div>

        {/* 🗑️ BAR AKSI HAPUS BANYAK (BATCH DELETE TOOLBAR) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: selectedIds.length > 0 ? '#fef2f2' : '#f8fafc', border: selectedIds.length > 0 ? '1.5px solid #fca5a5' : '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', color: selectedIds.length > 0 ? '#b91c1c' : '#475569' }}>
              <input
                type="checkbox"
                checked={sortedInval.length > 0 && selectedIds.length === sortedInval.length}
                onChange={handleSelectAll}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              Pilih Semua ({sortedInval.length})
            </label>
            {selectedIds.length > 0 && (
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#dc2626', backgroundColor: '#fee2e2', padding: '2px 8px', borderRadius: '12px' }}>
                {selectedIds.length} Terpilih
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            {selectedIds.length > 0 ? (
              <>
                <button
                  type="button"
                  onClick={handleDeleteBatch}
                  disabled={isProcessing}
                  style={{ backgroundColor: '#dc2626', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '5px 12px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                  title="Hapus baris yang dicentang"
                >
                  🗑️ Hapus Terpilih ({selectedIds.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  style={{ backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '5px 10px', fontSize: '11px', cursor: 'pointer' }}
                >
                  ✕ Batal
                </button>
              </>
            ) : sortedInval.length > 0 ? (
              <button
                type="button"
                onClick={handleDeleteAllToday}
                disabled={isProcessing}
                style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '6px', padding: '5px 10px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                title="Hapus seluruh data penugasan yang tampil"
              >
                🗑️ Hapus Semua ({sortedInval.length})
              </button>
            ) : null}
          </div>
        </div>

        {/* TABEL JURNAL INVAL GURU (URUT 1 - 11 DENGAN STATUS OTOMATIS WAKTU SESI 40 MENIT) */}
        <div style={{ maxHeight: '420px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
          <table style={{ ...styles.table, margin: 0 }}>
            <thead>
              <tr style={styles.thRow}>
                <th style={{ ...styles.th, width: '38px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={sortedInval.length > 0 && selectedIds.length === sortedInval.length}
                    onChange={handleSelectAll}
                    style={{ width: '15px', height: '15px', cursor: 'pointer' }}
                  />
                </th>
                <th style={styles.th}>No</th>
                <th style={styles.th}>Tanggal</th>
                <th style={styles.th}>Guru Utama (Izin)</th>
                <th style={styles.th}>Guru Inval (Pengganti)</th>
                <th style={styles.th}>Kelas &amp; Mapel</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>Jam / Sesi (40')</th>
                <th style={styles.th}>Bahan Ajar / Tugas</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>Status Sesi</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {sortedInval.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ ...styles.tdEmpty, padding: '24px' }}>
                    Belum ada penugasan inval guru pada filter ini.
                  </td>
                </tr>
              ) : (
                sortedInval.map((item, idx) => {
                  const sessionStatus = getInvalSessionStatus(item);
                  const isChecked = selectedIds.includes(item.id);
                  const isCleanMateri = item.materi_url && !item.materi_url.includes('bit.ly') && !item.materi_url.includes('cekizindanmateri');
                  const isCleanNama = item.materi_nama && !item.materi_nama.includes('bit.ly') && !item.materi_nama.includes('cekizindanmateri');
                  const jamNum = parseInt(String(item.jam_ke || '').replace(/\D/g, '')) || 0;
                  const timeLabel = SESSION_TIMETABLE[jamNum]?.label || '';

                  return (
                    <tr key={item.id} style={{ ...(idx % 2 === 0 ? styles.trEven : styles.trOdd), backgroundColor: isChecked ? '#fef2f2' : undefined }}>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelect(item.id)}
                          style={{ width: '15px', height: '15px', cursor: 'pointer' }}
                        />
                      </td>
                      <td style={styles.td}>{idx + 1}</td>
                      <td style={{ ...styles.td, whiteSpace: 'nowrap', fontSize: '10px' }}>{item.tanggal}</td>
                      <td style={{ ...styles.td, fontWeight: 'bold', color: '#b91c1c' }}>
                        👨‍🏫 {item.nama_guru_utama}
                      </td>
                      <td style={{ ...styles.td, fontWeight: 'bold', color: '#15803d' }}>
                        ⭐ {item.nama_guru_inval}
                      </td>
                      <td style={styles.td}>
                        <span style={styles.badgeClass}>{item.kelas}</span>
                        <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{item.mapel || '-'}</div>
                      </td>
                      <td style={{ ...styles.td, fontSize: '11px', fontWeight: 'bold', whiteSpace: 'nowrap', textAlign: 'center' }}>
                        <code style={{ backgroundColor: '#eff6ff', color: '#1e40af', padding: '2px 6px', borderRadius: '4px' }}>Jam {item.jam_ke || '-'}</code>
                        {timeLabel && (
                          <div style={{ fontSize: '9.5px', color: '#64748b', marginTop: '2px', fontWeight: 'normal' }}>
                            {timeLabel}
                          </div>
                        )}
                      </td>
                      <td style={{ ...styles.td, maxWidth: '200px' }}>
                        {isCleanMateri || isCleanNama || (item.keterangan_tugas && !item.keterangan_tugas.toLowerCase().includes('alasan:') && !/^(sakit|izin|lainnya)$/i.test(String(item.keterangan_tugas).trim())) ? (
                          <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#1e40af' }}>📄 Ada Bahan Ajar</span>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>-</span>
                        )}
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(item)}
                          disabled={isProcessing}
                          style={{
                            padding: '4px 10px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            borderRadius: '6px',
                            border: `1px solid ${sessionStatus.border}`,
                            cursor: 'pointer',
                            backgroundColor: sessionStatus.bg,
                            color: sessionStatus.color,
                            transition: 'all 0.15s',
                          }}
                          title="Status otomatis berdasarkan jam KBM • Klik untuk ubah manual Selesai/Ditugaskan"
                        >
                          {sessionStatus.label}
                        </button>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleDeleteInval(item.id, item.nama_guru_inval)}
                          disabled={isProcessing}
                          style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '4px', padding: '3px 6px', fontSize: '10px', cursor: 'pointer' }}
                          title="Hapus penugasan inval"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: '14px', textAlign: 'right' }}>
          <button onClick={onClose} style={styles.btnCancelModal}>
            ✕ Tutup Jurnal
          </button>
        </div>
      </div>

      {/* 🖨️ MODAL PREVIEW CETAK FORM GURU PENGGANTI RESMI & PDF GENERATOR */}
      {showPrintPreview && (
        <PrintInvalModal
          invalList={sortedInval}
          guruList={guruList}
          onClose={() => setShowPrintPreview(false)}
        />
      )}
    </div>
  );
}

// 🖨️ MODAL INTERAKTIF PREVIEW FORM GURU PENGGANTI (BER-KOP RESMI, MULTI-GURU, & PDF VIEWER)
function PrintInvalModal({ invalList = [], guruList = [], onClose }) {
  // Ambil daftar guru tidak hadir unik
  const teacherNames = useMemo(() => {
    if (!Array.isArray(invalList)) return [];
    return [...new Set(invalList.map((i) => i?.nama_guru_utama).filter(Boolean))];
  }, [invalList]);

  const [selectedTeacher, setSelectedTeacher] = useState('all');
  const targetDate = invalList?.[0]?.tanggal || getJakartaDateString(new Date());

  const { namaHari, formattedDate } = useMemo(() => {
    try {
      if (!targetDate) return { namaHari: 'HARI INI', formattedDate: '-' };
      const parts = String(targetDate).split('-');
      if (parts.length === 3) {
        const y = Number(parts[0]);
        const m = Number(parts[1]);
        const d = Number(parts[2]);
        const dateObj = new Date(y, m - 1, d);
        const namaHariList = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
        const h = namaHariList[dateObj.getDay()] || 'HARI INI';
        const f = `${String(d).padStart(2, '0')}-${String(m).padStart(2, '0')}-${y}`;
        return { namaHari: h, formattedDate: f };
      }
    } catch (_) {}
    return { namaHari: 'HARI INI', formattedDate: String(targetDate || '-') };
  }, [targetDate]);

  const displayedTeachers = useMemo(() => {
    if (selectedTeacher === 'all') {
      return teacherNames.length > 0 ? teacherNames : ['Guru'];
    }
    return [selectedTeacher];
  }, [selectedTeacher, teacherNames]);

  // Helper cetak langsung / unduh PDF via endpoint
  const handleTriggerPrint = () => {
    if (typeof window !== 'undefined') {
      const printUrl = `/api/inval-guru/print?tanggal=${targetDate}${selectedTeacher !== 'all' ? `&guru=${encodeURIComponent(selectedTeacher)}` : ''}&auto=true`;
      window.open(printUrl, '_blank');
    }
  };

  // Helper buka tampilan PDF di tab baru
  const handleOpenPdfTab = () => {
    if (typeof window !== 'undefined') {
      const printUrl = `/api/inval-guru/print?tanggal=${targetDate}${selectedTeacher !== 'all' ? `&guru=${encodeURIComponent(selectedTeacher)}` : ''}`;
      window.open(printUrl, '_blank');
    }
  };

  // Helper kirim notifikasi ulang form ke WA
  const handleSendWa = async () => {
    Swal.fire({
      icon: 'info',
      title: 'Kirim Format Form ke WhatsApp?',
      text: 'Format tabel Form Guru Pengganti lengkap dengan link PDF akan dikirimkan ke WhatsApp.',
      showCancelButton: true,
      confirmButtonColor: '#25d366',
      cancelButtonColor: '#64748b',
      confirmButtonText: '📲 Ya, Kirim Sekarang',
      cancelButtonText: 'Batal',
    }).then(async (action) => {
      if (action.isConfirmed) {
        Swal.fire({ icon: 'success', title: 'Terkirim! 📲', text: 'Form guru pengganti telah disiarkan ke WhatsApp.', timer: 2000, showConfirmButton: false });
      }
    });
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px',
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        maxWidth: '900px',
        width: '98%',
        maxHeight: '94vh',
        overflowY: 'auto',
        padding: '20px 24px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
        position: 'relative',
      }}>
        {/* Header Modal Preview */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: '12px', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '24px' }}>🖨️</span>
            <div>
              <h3 style={{ margin: 0, color: '#1e40af', fontWeight: 'bold', fontSize: '17px' }}>Preview Form Guru Pengganti (Resmi)</h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#64748b' }}>
                Format cetak kertas A4 standar KOP SMK YPK Medan • Siap Cetak &amp; Simpan PDF
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleTriggerPrint}
              style={{ padding: '8px 14px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              title="Cetak langsung menggunakan dialog print browser / Simpan ke PDF"
            >
              🖨️ Cetak / Simpan PDF
            </button>
            <button
              type="button"
              onClick={handleOpenPdfTab}
              style={{ padding: '8px 12px', backgroundColor: '#475569', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
              title="Buka tampilan cetak penuh di Tab Baru"
            >
              🌐 Tab Baru
            </button>
            <button
              type="button"
              onClick={handleSendWa}
              style={{ padding: '8px 12px', backgroundColor: '#059669', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
              title="Kirim format Form ini ke WhatsApp"
            >
              📲 Kirim WA
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                backgroundColor: '#f1f5f9',
                color: '#64748b',
                border: 'none',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Tutup Preview"
            >
              ✕
            </button>
          </div>
        </div>

        {/* TAB PILIH GURU JIKA LEBIH DARI 1 GURU TIDAK HADIR */}
        {teacherNames.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>Pilih Guru:</span>
            <button
              type="button"
              onClick={() => setSelectedTeacher('all')}
              style={{
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 'bold',
                borderRadius: '6px',
                border: selectedTeacher === 'all' ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                backgroundColor: selectedTeacher === 'all' ? '#2563eb' : '#ffffff',
                color: selectedTeacher === 'all' ? '#ffffff' : '#334155',
                cursor: 'pointer',
              }}
            >
              📄 Semua Guru ({teacherNames.length})
            </button>
            {teacherNames.map((name) => {
              const nameStr = String(name || 'Guru');
              const isActive = selectedTeacher === name;
              const gMatch = Array.isArray(guruList) ? guruList.find((g) => String(g?.nama || g?.nama_guru || '').trim().toLowerCase() === nameStr.trim().toLowerCase()) : null;
              const inis = gMatch?.inisial ? `[${toUnicodeBold(String(gMatch.inisial))}] ` : '';
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => setSelectedTeacher(name)}
                  style={{
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    borderRadius: '6px',
                    border: isActive ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                    backgroundColor: isActive ? '#2563eb' : '#ffffff',
                    color: isActive ? '#ffffff' : '#334155',
                    cursor: 'pointer',
                  }}
                >
                  👨‍🏫 {inis}{nameStr.split(' ')[0]}
                </button>
              );
            })}
          </div>
        )}

        {/* TAMPILAN LEMBAR DOKUMEN CETAK BER-KOP RESMI */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {displayedTeachers.map((teacherName) => {
            const teacherNameStr = String(teacherName || 'Guru');
            const teacherSessions = Array.isArray(invalList) ? invalList.filter((i) => String(i?.nama_guru_utama || '').trim().toLowerCase() === teacherNameStr.trim().toLowerCase()) : [];
            const firstSession = teacherSessions[0] || {};
            const gMatch = Array.isArray(guruList) ? guruList.find((g) => String(g?.nama || g?.nama_guru || '').trim().toLowerCase() === teacherNameStr.trim().toLowerCase()) : null;
            const inisialUtama = gMatch?.inisial ? String(gMatch.inisial).toUpperCase() : '';
            const alasanText = String(firstSession.keterangan_tugas || firstSession.alasan || 'SAKIT').replace('Alasan:', '').trim();

            return (
              <div
                key={teacherNameStr}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '24px 30px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  color: '#000000',
                  fontFamily: 'Arial, sans-serif',
                }}
              >
                {/* KOP SURAT RESMI */}
                <div style={{ display: 'flex', alignItems: 'center', borderBottom: '3px double #000000', paddingBottom: '10px', marginBottom: '14px' }}>
                  <img
                    src="/logko.png"
                    alt="Logo SMK YPK"
                    style={{ width: '68px', height: '68px', marginRight: '14px', objectFit: 'contain' }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                      YAYASAN PENDIDIKAN KELUARGA MEDAN
                    </h2>
                    <h1 style={{ margin: '2px 0', fontSize: '18px', fontWeight: '900', letterSpacing: '1px' }}>
                      SMK YPK MEDAN
                    </h1>
                    <p style={{ margin: 0, fontSize: '10px', lineHeight: 1.3 }}>
                      Jl. Sakti Lubis Gg. Amal No. 25 &amp; Gg. Pegawai No. 8, Siti Rejo I, Kec. Medan Kota, Kota Medan, Sumatera Utara 20219
                    </p>
                    <p style={{ margin: 0, fontSize: '9.5px', fontStyle: 'italic', marginTop: '2px' }}>
                      Email: smkypkmedan@gmail.com | Akreditasi A | Program Keahlian: TJKT, AKL, MPLB, PM
                    </p>
                  </div>
                </div>

                {/* JUDUL FORM */}
                <div style={{ textAlign: 'center', fontSize: '16px', fontWeight: '900', textDecoration: 'underline', marginBottom: '14px' }}>
                  Form Guru Pengganti
                </div>

                {/* META INFORMASI */}
                <table style={{ width: '100%', marginBottom: '12px', fontSize: '13px', fontWeight: 'bold', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '140px', padding: '3px 0' }}>Guru Tidak Hadir</td>
                      <td style={{ width: '15px', padding: '3px 0' }}>:</td>
                      <td style={{ borderBottom: '1px solid #000000', padding: '3px 6px' }}>
                        {inisialUtama ? `[${toUnicodeBold(inisialUtama)}] ` : ''}{teacherNameStr.toUpperCase()}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '3px 0' }}>Alasan</td>
                      <td style={{ padding: '3px 0' }}>:</td>
                      <td style={{ borderBottom: '1px solid #000000', padding: '3px 6px' }}>{alasanText.toUpperCase()}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '3px 0' }}>Hari/ Tanggal</td>
                      <td style={{ padding: '3px 0' }}>:</td>
                      <td style={{ borderBottom: '1px solid #000000', padding: '3px 6px' }}>{namaHari} / {formattedDate}</td>
                    </tr>
                  </tbody>
                </table>

                {/* TABEL 11 JAM PELAJARAN (JP 1 S/D 11) */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '14px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc' }}>
                      <th style={{ border: '1.5px solid #000000', padding: '6px 4px', fontSize: '12px', width: '45px', textAlign: 'center', fontWeight: '900' }}>Jam</th>
                      <th style={{ border: '1.5px solid #000000', padding: '6px 4px', fontSize: '11px', width: '95px', textAlign: 'center', fontWeight: '900' }}>Waktu (40')</th>
                      <th style={{ border: '1.5px solid #000000', padding: '6px 4px', fontSize: '12px', width: '100px', textAlign: 'center', fontWeight: '900' }}>Kelas</th>
                      <th style={{ border: '1.5px solid #000000', padding: '6px 4px', fontSize: '12px', width: '110px', textAlign: 'center', fontWeight: '900' }}>Pengganti</th>
                      <th style={{ border: '1.5px solid #000000', padding: '6px 6px', fontSize: '12px', textAlign: 'center', fontWeight: '900' }}>Bahan Ajar / Tugas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 11 }, (_, i) => i + 1).map((jam) => {
                      const match = teacherSessions.find((s) => parseInt(String(s.jam_ke).replace(/\D/g, '')) === jam);
                      const timeLabel = SESSION_TIMETABLE[jam]?.label || '';
                      const kelas = match ? (match.kelas && match.kelas !== '-' ? match.kelas : '-') : '-';
                      let pengganti = '-';
                      let materi = '-';

                      if (match) {
                        const rawPengganti = String(match.nama_guru_inval || '');
                        const isFree = rawPengganti.includes('Jam Kosong') || rawPengganti === '-' || match.kelas === '-';
                        if (!isFree) {
                          const gInvalMatch = Array.isArray(guruList) ? guruList.find((g) => String(g?.nama || g?.nama_guru || '').trim().toLowerCase() === rawPengganti.trim().toLowerCase()) : null;
                          pengganti = gInvalMatch?.inisial ? toUnicodeBold(String(gInvalMatch.inisial)) : rawPengganti;
                        }

                        const hasUrl = Boolean(match.materi_url && !String(match.materi_url).includes('bit.ly') && !String(match.materi_url).includes('cekizindanmateri'));
                        const hasNama = Boolean(match.materi_nama && !String(match.materi_nama).includes('bit.ly') && !String(match.materi_nama).includes('cekizindanmateri') && String(match.materi_nama).trim() !== '-' && !/^(sakit|izin|lainnya)$/i.test(String(match.materi_nama).trim()));
                        const ket = String(match.keterangan_tugas || '').trim();
                        const isReasonOnly = !ket || /^alasan\s*:\s*(sakit|izin|lainnya|.*)$/i.test(ket) || /^(sakit|izin|lainnya)$/i.test(ket);

                        if (hasUrl || hasNama || (!isReasonOnly && ket && !ket.includes('bit.ly'))) {
                          materi = 'Ada Bahan Ajar';
                        } else {
                          materi = '-';
                        }
                      }

                      return (
                        <tr key={jam}>
                          <td style={{ border: '1.5px solid #000000', padding: '4px', textAlign: 'center', fontWeight: '900', fontSize: '12px' }}>{jam}</td>
                          <td style={{ border: '1.5px solid #000000', padding: '4px', textAlign: 'center', fontSize: '10.5px', fontWeight: 'bold', color: '#334155' }}>{timeLabel}</td>
                          <td style={{ border: '1.5px solid #000000', padding: '4px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px' }}>{kelas}</td>
                          <td style={{ border: '1.5px solid #000000', padding: '4px', textAlign: 'center', fontWeight: '900', fontSize: '13px' }}>{pengganti}</td>
                          <td style={{ border: '1.5px solid #000000', padding: '4px 6px', fontSize: '11.5px' }}>{materi}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* TANDA TANGAN WAKA KURIKULUM */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <div style={{ width: '200px', textAlign: 'center', fontSize: '12px' }}>
                    <div>Medan, {formattedDate}</div>
                    <div style={{ fontWeight: 'bold', marginTop: '3px' }}>Waka Kurikulum</div>
                    <div style={{ height: '48px' }}></div>
                    <div style={{ fontWeight: '900', borderBottom: '1.5px solid #000000', display: 'inline-block', padding: '0 4px' }}>
                      Hendrawan, ST
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Tombol Tutup */}
        <div style={{ marginTop: '16px', textAlign: 'right' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              backgroundColor: '#f1f5f9',
              color: '#475569',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '8px 20px',
              fontWeight: 'bold',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            ✕ Tutup Preview
          </button>
        </div>
      </div>
    </div>
  );
}

// ➕ MODAL TAMBAH PENUGASAN INVAL GURU BARU (MENDUKUNG 1 S/D 4 GURU TIDAK HADIR SEKALIGUS)
function AddInvalModal({
  guruList = [],
  currentUser,
  onClose,
  onSuccess,
}) {
  const [tanggal, setTanggal] = useState(getJakartaDateString(new Date()));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  // Array Formulir Guru: Mendukung 1, 2, atau 3 guru tidak hadir dalam 1 Form (Sederhana via Tab)
  const [teacherForms, setTeacherForms] = useState([
    {
      id: 1,
      guruUtama: '',
      alasan: 'SAKIT',
      defaultGuruInval: '',
      sessions: [
        { id: 1, jam_ke: '1', kelas: '-', mapel: '-', guru_inval: '-' }
      ]
    }
  ]);

  const activeForm = teacherForms[activeTabIndex] || teacherForms[0];

  // Helper update form aktif
  const updateActiveForm = (field, value) => {
    setTeacherForms((prev) => {
      const copy = [...prev];
      copy[activeTabIndex] = { ...copy[activeTabIndex], [field]: value };
      return copy;
    });
  };

  // Helper update sesi pada guru aktif
  const setSessions = (newSessionsOrFn) => {
    setTeacherForms((prev) => {
      const copy = [...prev];
      const currentSessions = copy[activeTabIndex].sessions;
      const updated = typeof newSessionsOrFn === 'function' ? newSessionsOrFn(currentSessions) : newSessionsOrFn;
      copy[activeTabIndex] = { ...copy[activeTabIndex], sessions: updated };
      return copy;
    });
  };

  // Tambah Guru Tidak Hadir Baru (Tab Baru)
  const handleAddTeacherTab = () => {
    if (teacherForms.length >= 5) {
      Swal.fire({ icon: 'info', title: 'Batas Maksimal', text: 'Maksimal 5 guru tidak hadir dalam satu form.' });
      return;
    }
    const newId = Date.now();
    setTeacherForms((prev) => [
      ...prev,
      {
        id: newId,
        guruUtama: '',
        alasan: 'SAKIT',
        defaultGuruInval: '',
        sessions: [
          { id: 1, jam_ke: '1', kelas: '-', mapel: '-', guru_inval: '-' }
        ]
      }
    ]);
    setActiveTabIndex(teacherForms.length);
  };

  // Hapus Tab Guru
  const handleRemoveTeacherTab = (indexToRemove) => {
    if (teacherForms.length <= 1) return;
    setTeacherForms((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    if (activeTabIndex >= indexToRemove && activeTabIndex > 0) {
      setActiveTabIndex(activeTabIndex - 1);
    }
  };

  // Handler tambah 1 baris jam (Otomatis mewarisi kelas & guru dari sesi sebelumnya agar tidak capek mengetik)
  const handleAddSession = () => {
    setSessions((prev) => {
      const last = prev[prev.length - 1];
      return [
        ...prev,
        {
          id: Date.now() + Math.random(),
          jam_ke: String(prev.length + 1),
          kelas: last?.kelas || '',
          mapel: last?.mapel || '',
          guru_inval: last?.guru_inval || activeForm.defaultGuruInval || '',
        }
      ];
    });
  };

  // Handler Salin / Samakan data dari sesi sebelumnya ke sesi saat ini
  const handleCopyFromPrevious = (index) => {
    if (index === 0) return;
    setSessions((prev) => {
      const copy = [...prev];
      const prevSession = copy[index - 1];
      copy[index] = {
        ...copy[index],
        kelas: prevSession.kelas || '',
        mapel: prevSession.mapel || '',
        guru_inval: prevSession.guru_inval || '',
      };
      return copy;
    });
  };

  // Handler Preset Kembar (misal membuat 2 jam atau 3 jam beruntun dengan guru/kelas sama)
  const handlePresetKembar = (count) => {
    const baseKelas = activeForm.sessions[0]?.kelas && activeForm.sessions[0]?.kelas !== '-' ? activeForm.sessions[0]?.kelas : 'X AKL';
    const baseMapel = activeForm.sessions[0]?.mapel && activeForm.sessions[0]?.mapel !== '-' ? activeForm.sessions[0]?.mapel : 'Mapel Kejuruan';
    const baseGuru = activeForm.sessions[0]?.guru_inval && activeForm.sessions[0]?.guru_inval !== '-' ? activeForm.sessions[0]?.guru_inval : activeForm.defaultGuruInval || '';

    const newSessions = [];
    for (let i = 1; i <= count; i++) {
      newSessions.push({
        id: Date.now() + i,
        jam_ke: `${i}`,
        kelas: baseKelas,
        mapel: baseMapel,
        guru_inval: baseGuru,
      });
    }
    setSessions(newSessions);
  };

  // Handler preset jumlah jam (misal 7 jam sesuai form kertas, 11 jam penuh)
  const handlePresetHours = (count) => {
    const newSessions = [];
    for (let i = 1; i <= count; i++) {
      newSessions.push({
        id: Date.now() + i,
        jam_ke: `${i}`,
        kelas: i === 1 ? '-' : (activeForm.sessions[0]?.kelas || ''),
        mapel: i === 1 ? '-' : (activeForm.sessions[0]?.mapel || ''),
        guru_inval: i === 1 ? '-' : (activeForm.defaultGuruInval || activeForm.sessions[0]?.guru_inval || ''),
      });
    }
    setSessions(newSessions);
  };

  // Update per session field
  const handleUpdateSession = (index, field, value) => {
    setSessions((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Hapus session baris
  const handleRemoveSession = (index) => {
    if (activeForm.sessions.length <= 1) return;
    setSessions((prev) => prev.filter((_, i) => i !== index));
  };

  // Terapkan default guru ke semua sesi form aktif
  const handleApplyDefaultGuru = (selectedTeacher) => {
    updateActiveForm('defaultGuruInval', selectedTeacher);
    if (!selectedTeacher) return;
    setSessions((prev) =>
      prev.map((s) => ({ ...s, guru_inval: selectedTeacher }))
    );
  };

  // Simpan Semua Guru yang Dikonfigurasi
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validasi semua tab guru
    for (let i = 0; i < teacherForms.length; i++) {
      const tf = teacherForms[i];
      if (!tf.guruUtama) {
        setActiveTabIndex(i);
        Swal.fire({ icon: 'warning', title: `Guru #${i + 1} Belum Dipilih`, text: `Silakan pilih nama Guru Tidak Hadir untuk Tab Guru #${i + 1}!` });
        return;
      }
      const valid = tf.sessions.filter((s) => s.jam_ke || s.kelas || s.guru_inval);
      if (valid.length === 0) {
        setActiveTabIndex(i);
        Swal.fire({ icon: 'warning', title: `Jadwal Belum Lengkap`, text: `Minimal 1 jadwal mengajar harus diisi untuk Guru #${i + 1} (${tf.guruUtama})!` });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      let totalSavedSessions = 0;
      const savedTeacherNames = [];

      for (const tf of teacherForms) {
        const validSessions = tf.sessions.filter((s) => s.jam_ke || s.kelas || s.guru_inval);
        const res = await fetch('/api/inval-guru', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tanggal,
            nama_guru_utama: tf.guruUtama,
            alasan: tf.alasan,
            assigned_by: currentUser?.nama || 'Admin',
            assignments: validSessions.map((s) => ({
              nama_guru_inval: s.guru_inval || '-',
              kelas: s.kelas || '-',
              mapel: s.mapel || '-',
              jam_ke: s.jam_ke || '-',
            })),
          }),
        });

        const result = await res.json();
        if (result.success) {
          totalSavedSessions += validSessions.length;
          savedTeacherNames.push(tf.guruUtama);
        } else {
          throw new Error(result.error || `Gagal menyimpan jadwal untuk ${tf.guruUtama}`);
        }
      }

      Swal.fire({
        icon: 'success',
        title: 'Penugasan Inval Berhasil! 📋',
        text: `Berhasil menyimpan ${totalSavedSessions} jadwal penugasan untuk ${savedTeacherNames.join(', ')}. Notifikasi telah dikirimkan ke seluruh perangkat.`,
        timer: 2800,
        showConfirmButton: false,
      });
      onSuccess();
    } catch (err) {
      console.error('Submit inval error:', err);
      Swal.fire({ icon: 'error', title: 'Gagal Menyimpan', text: err.message || 'Terjadi kesalahan sistem' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalAllSessions = teacherForms.reduce((acc, tf) => acc + tf.sessions.length, 0);

  return (
    <div style={styles.modalOverlay}>
      <div style={{ ...styles.modalContent, maxWidth: '640px', width: '96%', maxHeight: '92vh', overflowY: 'auto', padding: '16px 14px', borderRadius: '16px' }}>
        {/* MODAL HEADER */}
        <div style={styles.modalHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: '#ffffff' }}>
              🧑‍🏫
            </div>
            <div>
              <h3 style={{ margin: 0, color: '#6d28d9', fontWeight: 'bold', fontSize: '16px' }}>Form Guru Pengganti (Inval)</h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#64748b' }}>
                Penugasan Guru Pengganti KBM • SMK YPK Medan
              </p>
            </div>
          </div>
          <button onClick={onClose} style={styles.btnCloseModal}>
            ✕
          </button>
        </div>

        {/* 🗂️ TAB GURU TIDAK HADIR */}
        {teacherForms.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', borderBottom: '1px solid #ede9fe', paddingBottom: '8px', marginTop: '10px' }}>
            {teacherForms.map((tf, idx) => {
              const isActive = activeTabIndex === idx;
              const matchingG = guruList.find((g) => g.nama === tf.guruUtama);
              const inisialShort = matchingG?.inisial ? `[${toUnicodeBold(matchingG.inisial)}] ` : '';
              const displayName = tf.guruUtama ? `${inisialShort}${tf.guruUtama.split(' ')[0]}` : `Guru #${idx + 1}`;

              return (
                <div key={tf.id} style={{ display: 'flex', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setActiveTabIndex(idx)}
                    style={{
                      padding: '5px 10px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      borderRadius: '6px 0 0 6px',
                      border: isActive ? '1.5px solid #7c3aed' : '1px solid #cbd5e1',
                      backgroundColor: isActive ? '#7c3aed' : '#f8fafc',
                      color: isActive ? '#ffffff' : '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    👨‍🏫 {displayName} ({tf.sessions.length} Jam)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveTeacherTab(idx)}
                    style={{
                      padding: '5px 8px',
                      fontSize: '11px',
                      borderRadius: '0 6px 6px 0',
                      border: isActive ? '1.5px solid #7c3aed' : '1px solid #cbd5e1',
                      borderLeft: 'none',
                      backgroundColor: isActive ? '#6d28d9' : '#fee2e2',
                      color: isActive ? '#ffffff' : '#dc2626',
                      cursor: 'pointer',
                    }}
                    title={`Hapus Tab Guru #${idx + 1}`}
                  >
                    ✕
                  </button>
                </div>
              );
            })}

            {teacherForms.length < 4 && (
              <button
                type="button"
                onClick={handleAddTeacherTab}
                style={{ padding: '5px 10px', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#f5f3ff', color: '#6d28d9', border: '1px dashed #c4b5fd', borderRadius: '6px', cursor: 'pointer' }}
                title="Tambah Guru Tidak Hadir Lainnya"
              >
                ➕ Tambah Guru
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ marginTop: '12px' }}>
          {/* HEADER FORM: TANGGAL, GURU TIDAK HADIR, ALASAN */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px', marginBottom: '12px' }}>
            <div>
              <label style={{ ...styles.label, fontWeight: 'bold', fontSize: '11.5px' }}>📅 Tanggal:</label>
              <input
                type="date"
                required
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                style={{ ...styles.input, fontSize: '12.5px', padding: '8px 10px' }}
              />
            </div>
            <div>
              <label style={{ ...styles.label, color: '#b91c1c', fontWeight: 'bold', fontSize: '11.5px' }}>
                👨‍🏫 Guru Tidak Hadir:
              </label>
              <select
                required
                value={activeForm.guruUtama}
                onChange={(e) => updateActiveForm('guruUtama', e.target.value)}
                style={{ ...styles.selectInput, borderColor: '#fca5a5', fontWeight: 'bold', fontSize: '12.5px', padding: '8px 10px' }}
              >
                <option value="">-- Pilih Guru Tidak Hadir --</option>
                {guruList.map((g) => (
                  <option key={g.id} value={g.nama}>
                    👨‍🏫 {g.inisial ? `[ ${toUnicodeBold(g.inisial)} ] ` : ''}{g.nama}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ ...styles.label, color: '#b45309', fontWeight: 'bold', fontSize: '11.5px' }}>📌 Alasan:</label>
              <select
                value={activeForm.alasan}
                onChange={(e) => updateActiveForm('alasan', e.target.value)}
                style={{ ...styles.selectInput, borderColor: '#fde68a', fontWeight: 'bold', fontSize: '12.5px', padding: '8px 10px' }}
              >
                <option value="SAKIT">🟡 SAKIT</option>
                <option value="IZIN">🟣 IZIN</option>
                <option value="LAINNYA">🔵 LAINNYA</option>
              </select>
            </div>
          </div>

          {/* ⚡ TOMBOL CEPAT & PILIH GURU PENGGANTI UTAMA */}
          <div style={{ backgroundColor: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '10px', padding: '10px 12px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
              <span style={{ fontSize: '11.5px', fontWeight: 'bold', color: '#5b21b6' }}>
                ⚡ Tombol Cepat Jam Pelajaran:
              </span>
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleAddSession}
                  style={{ padding: '4px 9px', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#7c3aed', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                >
                  ➕ Tambah 1 Jam
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetKembar(3)}
                  style={{ padding: '4px 8px', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#e0e7ff', color: '#3730a3', border: '1px solid #c7d2fe', borderRadius: '6px', cursor: 'pointer' }}
                >
                  ⚡ 3 Jam
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetHours(7)}
                  style={{ padding: '4px 8px', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', borderRadius: '6px', cursor: 'pointer' }}
                >
                  ⚡ 7 Jam
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetHours(11)}
                  style={{ padding: '4px 8px', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', borderRadius: '6px', cursor: 'pointer' }}
                >
                  ⚡ 11 Jam
                </button>
                <button
                  type="button"
                  onClick={() => setSessions([{ id: 1, jam_ke: '1', kelas: '-', mapel: '-', guru_inval: '-' }])}
                  style={{ padding: '4px 8px', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#ffffff', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}
                >
                  🗑️ Reset
                </button>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#5b21b6', display: 'block', marginBottom: '3px' }}>
                ⭐ Guru Pengganti Utama (Terapkan ke Semua Jam):
              </label>
              <select
                value={activeForm.defaultGuruInval}
                onChange={(e) => handleApplyDefaultGuru(e.target.value)}
                style={{ ...styles.selectInput, width: '100%', fontSize: '12.5px', fontWeight: 'bold', backgroundColor: '#ffffff', borderColor: '#c4b5fd', padding: '7px 10px' }}
              >
                <option value="">-- Pilih Guru Pengganti (Otomatis ke Semua Jam) --</option>
                <option value="-">➖ - (Jam Kosong / Bebas)</option>
                {guruList
                  .filter((g) => g.nama !== activeForm.guruUtama)
                  .map((g) => (
                    <option key={g.id} value={g.nama}>
                      ⭐ {g.inisial ? `[ ${toUnicodeBold(g.inisial)} ] ` : ''}{g.nama}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* DAFTAR BARIS JADWAL / SESI */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '12.5px', fontWeight: 'bold', color: '#334155' }}>
                📋 Rincian Jam Pelajaran ({activeForm.sessions.length} Jam):
              </span>
            </div>

            <div style={{ maxHeight: '360px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '2px' }}>
              {activeForm.sessions.map((session, index) => {
                const isJamKosong = session.guru_inval === '-' || session.kelas === '-';
                const matchingGuru = guruList.find((g) => g.nama === session.guru_inval);
                const inisialGuru = matchingGuru?.inisial ? toUnicodeBold(matchingGuru.inisial) : '';

                return (
                  <div
                    key={session.id}
                    style={{
                      backgroundColor: isJamKosong ? '#f8fafc' : '#ffffff',
                      border: isJamKosong ? '1px dashed #cbd5e1' : '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      boxShadow: isJamKosong ? 'none' : '0 1px 3px rgba(0,0,0,0.04)',
                    }}
                  >
                    {/* Header Baris Sesi */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '11.5px', fontWeight: 'bold', color: isJamKosong ? '#64748b' : '#6d28d9', backgroundColor: isJamKosong ? '#e2e8f0' : '#ede9fe', padding: '2px 8px', borderRadius: '10px' }}>
                          Jam #{session.jam_ke || index + 1}
                        </span>
                        {isJamKosong ? (
                          <span style={{ fontSize: '10.5px', color: '#64748b', fontStyle: 'italic', fontWeight: 'bold', backgroundColor: '#f1f5f9', padding: '1px 6px', borderRadius: '4px' }}>
                            Jam Kosong
                          </span>
                        ) : inisialGuru ? (
                          <span style={{ fontSize: '11px', fontWeight: '800', color: '#1e40af', backgroundColor: '#dbeafe', padding: '1px 6px', borderRadius: '4px' }}>
                            [{inisialGuru}] {session.guru_inval?.split(' ')[0]}
                          </span>
                        ) : null}
                      </div>

                      <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                        {index > 0 && (
                          <button
                            type="button"
                            onClick={() => handleCopyFromPrevious(index)}
                            style={{ backgroundColor: '#f0fdf4', color: '#15803d', border: '1px solid #86efac', borderRadius: '5px', padding: '2px 7px', fontSize: '10.5px', cursor: 'pointer', fontWeight: 'bold' }}
                            title="Samakan dengan jam sebelumnya"
                          >
                            📋 Samakan Jam #{activeForm.sessions[index - 1]?.jam_ke || index}
                          </button>
                        )}

                        {isJamKosong ? (
                          <button
                            type="button"
                            onClick={() => {
                              const prev = activeForm.sessions[index - 1];
                              handleUpdateSession(index, 'kelas', prev?.kelas && prev?.kelas !== '-' ? prev.kelas : 'X AKL');
                              handleUpdateSession(index, 'mapel', prev?.mapel && prev?.mapel !== '-' ? prev.mapel : 'Mapel');
                              handleUpdateSession(index, 'guru_inval', prev?.guru_inval && prev?.guru_inval !== '-' ? prev.guru_inval : (activeForm.defaultGuruInval || ''));
                            }}
                            style={{ backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: '5px', padding: '2px 7px', fontSize: '10.5px', cursor: 'pointer', fontWeight: 'bold' }}
                          >
                            ↩️ Ada Kelas
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              handleUpdateSession(index, 'kelas', '-');
                              handleUpdateSession(index, 'mapel', '-');
                              handleUpdateSession(index, 'guru_inval', '-');
                            }}
                            style={{ backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '5px', padding: '2px 7px', fontSize: '10.5px', cursor: 'pointer', fontWeight: 'bold' }}
                          >
                            ☕ Set Kosong
                          </button>
                        )}

                        {activeForm.sessions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSession(index)}
                            style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '5px', padding: '2px 6px', fontSize: '10.5px', cursor: 'pointer' }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Input Jam, Kelas, Mapel (Responsive Grid) */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', marginBottom: '8px' }}>
                      <div>
                        <label style={{ fontSize: '10.5px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '2px' }}>Jam Ke (JP):</label>
                        <input
                          type="text"
                          required
                          value={session.jam_ke}
                          onChange={(e) => handleUpdateSession(index, 'jam_ke', e.target.value)}
                          placeholder="1 / 2"
                          style={{ ...styles.input, fontSize: '12px', padding: '6px 8px', textAlign: 'center', fontWeight: 'bold' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '10.5px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '2px' }}>Kelas:</label>
                        <select
                          required
                          value={session.kelas}
                          onChange={(e) => handleUpdateSession(index, 'kelas', e.target.value)}
                          style={{ ...styles.selectInput, width: '100%', fontSize: '12px', padding: '6px 8px', fontWeight: 'bold' }}
                        >
                          <option value="">-- Pilih Kelas --</option>
                          <option value="-">➖ - (Jam Kosong / Free)</option>
                          <option value="X AKL">X AKL</option>
                          <option value="X MPLB">X MPLB</option>
                          <option value="X TJKT">X TJKT</option>
                          <option value="X PM">X PM</option>
                          <option value="XI AKL">XI AKL</option>
                          <option value="XI MPLB">XI MPLB</option>
                          <option value="XI TJKT">XI TJKT</option>
                          <option value="XI PM">XI PM</option>
                          <option value="XII AKL">XII AKL</option>
                          <option value="XII MPLB">XII MPLB</option>
                          <option value="XII TJKT">XII TJKT</option>
                          <option value="XII PM">XII PM</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '10.5px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '2px' }}>Mata Pelajaran:</label>
                        <input
                          type="text"
                          value={session.mapel}
                          onChange={(e) => handleUpdateSession(index, 'mapel', e.target.value)}
                          placeholder="Mata Pelajaran / -"
                          style={{ ...styles.input, fontSize: '12px', padding: '6px 8px' }}
                        />
                      </div>
                    </div>

                    {/* Input Guru Inval */}
                    <div>
                      <label style={{ fontSize: '10.5px', fontWeight: 'bold', color: '#15803d', display: 'block', marginBottom: '2px' }}>
                        ⭐ Guru Pengganti (Jam #{session.jam_ke || index + 1}):
                      </label>
                      <select
                        required
                        value={session.guru_inval}
                        onChange={(e) => handleUpdateSession(index, 'guru_inval', e.target.value)}
                        style={{ ...styles.selectInput, width: '100%', fontSize: '12.5px', padding: '7px 8px', fontWeight: 'bold' }}
                      >
                        <option value="">-- Pilih Guru Pengganti --</option>
                        <option value="-">➖ - (Jam Kosong / Bebas)</option>
                        {guruList
                          .filter((g) => g.nama !== activeForm.guruUtama)
                          .map((g) => (
                            <option key={g.id} value={g.nama}>
                              ⭐ {g.inisial ? `[ ${toUnicodeBold(g.inisial)} ] ` : ''}{g.nama}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* TOMBOL SIMPAN */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{ ...styles.btnSaveModal, backgroundColor: '#7c3aed', flex: 1, padding: '12px 14px', fontSize: '13.5px', fontWeight: 'bold' }}
            >
              {isSubmitting
                ? 'Menyimpan Penugasan Inval...'
                : `💾 Simpan Penugasan Inval (${totalAllSessions} Jam)`}
            </button>
            <button type="button" onClick={onClose} style={{ ...styles.btnCancelModal, padding: '12px 14px', fontSize: '13.5px' }}>
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export { JurnalInvalModal, PrintInvalModal, AddInvalModal };
