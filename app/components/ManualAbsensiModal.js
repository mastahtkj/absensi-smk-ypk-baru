'use client';

import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import styles from '../utils/dashboardStyles';
import {
  toUnicodeBold,
  getJakartaDateString,
  formatWaktuLengkap,
} from '../utils/dashboardHelpers';
import { getUserRoleInfo } from '../utils/roleHelper';

// ⚡ MODAL DETAIL & EDIT STATUS MANUAL (TERISOLASI PENUH: 0ms LAG SAAT KETIK ALASAN)
export default function ManualAbsensiModal({
  detailSiswa,
  absensiLogs,
  currentUser,
  guruList = [],
  isSiswaAdmin,
  siswaAdminKelas,
  onClose,
  onSave,
  onSendWa,
  isUpdating,
}) {
  const [manualStatus, setManualStatus] = useState('Hadir');
  const [alasanIzin, setAlasanIzin] = useState('');
  const [keteranganMateri, setKeteranganMateri] = useState('');
  const [suratFileName, setSuratFileName] = useState('');
  const [materiFileName, setMateriFileName] = useState('');
  const [suratDataUrl, setSuratDataUrl] = useState('');
  const [materiDataUrl, setMateriDataUrl] = useState('');

  // 📋 State Penugasan Inval Guru Multi-Session (1 s/d 11 Jam Sekaligus)
  const [assignInval, setAssignInval] = useState(false);
  const [defaultGuruInval, setDefaultGuruInval] = useState('');
  const [invalSessions, setInvalSessions] = useState([
    { id: 1, jam_ke: '1', kelas: '', mapel: '', guru_inval: '' }
  ]);

  const handleAddInvalSession = () => {
    setInvalSessions((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        jam_ke: String(prev.length + 1),
        kelas: prev[prev.length - 1]?.kelas || '',
        mapel: prev[prev.length - 1]?.mapel || '',
        guru_inval: defaultGuruInval || prev[prev.length - 1]?.guru_inval || '',
      }
    ]);
  };

  const handlePresetInvalHours = (count) => {
    const newSessions = [];
    for (let i = 1; i <= count; i++) {
      newSessions.push({
        id: Date.now() + i,
        jam_ke: `Jam ke-${i}`,
        kelas: invalSessions[0]?.kelas || '',
        mapel: invalSessions[0]?.mapel || '',
        guru_inval: defaultGuruInval || invalSessions[0]?.guru_inval || '',
      });
    }
    setInvalSessions(newSessions);
  };

  const handleUpdateInvalSession = (index, field, value) => {
    setInvalSessions((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleRemoveInvalSession = (index) => {
    if (invalSessions.length <= 1) return;
    setInvalSessions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleApplyDefaultGuruToAll = (selectedTeacher) => {
    setDefaultGuruInval(selectedTeacher);
    if (!selectedTeacher) return;
    setInvalSessions((prev) =>
      prev.map((s) => ({ ...s, guru_inval: selectedTeacher }))
    );
  };

  const todayJakarta = getJakartaDateString(new Date());
  const currentLog = absensiLogs.find((l) => {
    if (getJakartaDateString(l.created_at) !== todayJakarta) return false;
    return l.nama && l.nama.trim().toLowerCase() === detailSiswa?.nama?.trim().toLowerCase();
  });

  useEffect(() => {
    if (currentLog?.status) {
      const s = String(currentLog.status).toLowerCase();
      if (s.includes('pulang') || currentLog.jam_pulang || currentLog.tipe === 'pulang_selesai') {
        setManualStatus('Pulang');
      } else if (s.includes('sakit')) {
        setManualStatus('Sakit');
      } else if (s.includes('izin')) {
        setManualStatus('Izin');
      } else if (s.includes('alpa')) {
        setManualStatus('Alpa');
      } else {
        setManualStatus('Hadir');
      }
    }
  }, [currentLog]);

  const callerRoleInfo = getUserRoleInfo(currentUser);
  const isMasterUser = Boolean(callerRoleInfo.type === 'master' || currentUser?.username?.toLowerCase() === 'iqbal');
  const isGadminUser = Boolean(callerRoleInfo.type === 'gadmin');
  const isPadminUser = Boolean(callerRoleInfo.type === 'padmin');
  const isSadminUser = Boolean(callerRoleInfo.type === 'sadmin' || isSiswaAdmin);
  const isGuruAccount = Boolean(
    currentUser?.isGuru && !String(currentUser?.id).startsWith('SISWA-')
  );

  const isSelf = Boolean(
    currentUser &&
    (
      (detailSiswa?.rawId && currentUser?.rawId && String(detailSiswa.rawId) === String(currentUser.rawId)) ||
      (detailSiswa?.id && currentUser?.id && String(detailSiswa.id) === String(currentUser.id)) ||
      (detailSiswa?.nama && currentUser?.nama && detailSiswa.nama.trim().toLowerCase() === currentUser.nama.trim().toLowerCase())
    )
  );

  const isTargetGuru =
    Boolean(detailSiswa?.isGuru) ||
    String(detailSiswa?.id).startsWith('GURU-') ||
    detailSiswa?.tipe === 'guru' ||
    detailSiswa?.role?.toLowerCase() === 'guru' ||
    detailSiswa?.role?.toLowerCase() === 'staff' ||
    detailSiswa?.role?.toLowerCase() === 'admin' ||
    (detailSiswa?.kelas && (
      detailSiswa.kelas.toLowerCase().includes('guru') ||
      detailSiswa.kelas.toLowerCase().includes('staff') ||
      detailSiswa.kelas.toLowerCase().includes('wali')
    ));

  const isMasterOrGuru = Boolean(
    isMasterUser ||
    isGadminUser ||
    isPadminUser ||
    (isGuruAccount && !String(currentUser?.id).startsWith('SISWA-'))
  );

  const canViewMedical = Boolean(isMasterOrGuru || isSadminUser || isSelf);

  let canEditStatus = false;
  if (isMasterUser) {
    canEditStatus = true;
  } else if (isGadminUser || isGuruAccount) {
    if (isTargetGuru) {
      canEditStatus = isSelf || isGadminUser;
    } else {
      canEditStatus = true;
    }
  } else if (isPadminUser) {
    canEditStatus = !isTargetGuru || isSelf;
  } else if (isSadminUser) {
    if (!isTargetGuru && detailSiswa?.kelas) {
      const normK = (k) => String(k || '').toLowerCase().replace(/[\s\-_]/g, '');
      const myKelas = normK(siswaAdminKelas || currentUser?.kelas || '');
      const targetKelas = normK(detailSiswa.kelas || '');
      if (myKelas && (targetKelas === myKelas || targetKelas.includes(myKelas) || myKelas.includes(targetKelas))) {
        canEditStatus = true;
      }
    }
  } else {
    canEditStatus = false;
  }

  const hasPulangStatus = Boolean(
    currentLog?.jam_pulang ||
    String(currentLog?.status).toLowerCase().includes('pulang') ||
    currentLog?.tipe === 'pulang_selesai'
  );

  const handleResetPresensi = async () => {
    if (!canEditStatus) return;
    const confirm = await Swal.fire({
      title: 'Hapus Status Presensi Hari Ini?',
      html: `
        <div style="font-size: 13px; text-align: left;">
          Apakah Anda yakin ingin menghapus data presensi hari ini untuk <b>${detailSiswa.nama}</b> (${detailSiswa.kelas || '-'})?<br/><br/>
          <div style="background-color: #fee2e2; border: 1px solid #fca5a5; padding: 8px 10px; border-radius: 6px; color: #991b1b; font-size: 12px;">
            ⚠️ <b>Perhatian:</b> Data presensi hari ini akan dihapus dari sistem sehingga status siswa/guru kembali menjadi <b>Belum Presensi</b>. Gunakan fitur ini jika ada kesalahan membuat status atau kesalahan input data.
          </div>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: '🗑️ Ya, Hapus Status Hari Ini',
      cancelButtonText: 'Batal',
    });

    if (confirm.isConfirmed) {
      onSave({
        manualStatus: 'Hapus Presensi',
        alasanIzin: '',
        suratFileName: '',
        suratDataUrl: '',
        materiFileName: '',
        materiDataUrl: '',
        keteranganMateri: '',
        assignInval: false,
      });
    }
  };

  const handleResetPulang = async () => {
    if (!canEditStatus) return;
    const confirm = await Swal.fire({
      title: 'Hapus Status Pulang?',
      html: `
        <div style="font-size: 13px; text-align: left;">
          Apakah Anda yakin ingin menghapus/membatalkan status kepulangan untuk <b>${detailSiswa.nama}</b>?<br/><br/>
          <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; padding: 8px 10px; border-radius: 6px; color: #1e40af; font-size: 12px;">
            ℹ️ Jam pulang <b>(${currentLog?.jam_pulang || 'Selesai'})</b> akan dihapus dan status siswa kembali menjadi <b>Hadir</b>.
          </div>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#64748b',
      confirmButtonText: '↩️ Ya, Hapus Status Pulang',
      cancelButtonText: 'Batal',
    });

    if (confirm.isConfirmed) {
      onSave({
        manualStatus: 'Hapus Pulang',
        alasanIzin: '',
        suratFileName: '',
        suratDataUrl: '',
        materiFileName: '',
        materiDataUrl: '',
        keteranganMateri: '',
        assignInval: false,
      });
    }
  };

  const handleTriggerSave = () => {
    if (!canEditStatus) {
      return;
    }
    if ((manualStatus === 'Sakit' || manualStatus === 'Izin') && !alasanIzin.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Alasan Wajib Diisi',
        text: `Mohon tuliskan alasan ${manualStatus.toLowerCase()} siswa/siswi terlebih dahulu.`,
      });
      return;
    }
    onSave({
      manualStatus,
      alasanIzin,
      suratFileName,
      suratDataUrl,
      materiFileName,
      materiDataUrl,
      keteranganMateri,
      assignInval,
      invalSessions,
      selectedGuruInval: defaultGuruInval || invalSessions[0]?.guru_inval || '',
      invalKelas: invalSessions[0]?.kelas || '',
      invalMapel: invalSessions[0]?.mapel || '',
      invalJamKe: invalSessions[0]?.jam_ke || '',
    });
  };

  return (
    <div style={styles.modalOverlay}>
      <div style={{ ...styles.modalContent, maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={styles.modalHeader}>
          <h3 style={{ margin: 0, color: '#1d4ed8', fontWeight: 'bold' }}>👤 Status &amp; Presensi</h3>
          <button onClick={onClose} style={styles.btnCloseModal}>
            ✕
          </button>
        </div>

        <div style={{ marginTop: '12px' }}>
          <div style={styles.detailCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
              <div>
                <h4 style={{ margin: '0 0 2px 0', fontSize: '15px', color: '#0f172a' }}>{detailSiswa.nama}</h4>
                <p style={{ margin: '2px 0', fontSize: '12px', color: '#64748b' }}>Kelas/Jabatan: <b>{detailSiswa.kelas || '-'}</b></p>
                {currentLog && (
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>
                    Status Hari Ini: <b>{currentLog.status}</b> ({currentLog.jam_masuk || formatWaktuLengkap(currentLog.created_at)})
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 🏠 KARTU STATUS PULANG & TOMBOL HAPUS PULANG CEPAT */}
          {hasPulangStatus && canEditStatus && (
            <div style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', padding: '10px 12px', marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#0369a1' }}>🏠 Status Pulang Tercatat: {currentLog?.jam_pulang || 'Selesai'}</span>
                <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#64748b' }}>Batalkan atau hapus jam pulang jika ada kesalahan presensi pulang pada siswa.</p>
              </div>
              <button
                type="button"
                onClick={handleResetPulang}
                disabled={isUpdating}
                style={{ backgroundColor: '#0284c7', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '7px 12px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                ↩️ Hapus Status Pulang
              </button>
            </div>
          )}

          {/* 🗑️ KARTU HAPUS STATUS PRESENSI JIKA ADA KESALAHAN INPUT STATUS */}
          {currentLog && canEditStatus && (
            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 12px', marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#b91c1c' }}>🗑️ Koreksi Kesalahan Status Presensi</span>
                <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#64748b' }}>Hapus status hari ini (<b>{currentLog.status}</b>) agar kembali menjadi <b>Belum Presensi</b>.</p>
              </div>
              <button
                type="button"
                onClick={handleResetPresensi}
                disabled={isUpdating}
                style={{ backgroundColor: '#ef4444', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '7px 12px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                🗑️ Hapus Status Presensi
              </button>
            </div>
          )}

          {/* 🔒 TAMPILAN DETAIL BAHAN AJAR / ALASAN SESUAI HAK AKSES */}
          {currentLog && (currentLog.status?.includes('Sakit') || currentLog.status?.includes('Izin') || currentLog.materi_nama || currentLog.keterangan_materi) && (
            <div style={{ marginTop: '10px' }}>
              {canViewMedical ? (
                <div style={{ backgroundColor: '#fef3c7', padding: '10px', borderRadius: '8px', border: '1px solid #fde68a' }}>
                  <p style={{ margin: 0, fontSize: '11px', fontWeight: 'bold', color: '#92400e' }}>🩺 DATA IZIN / SAKIT (Akses Admin &amp; Pribadi):</p>
                  {currentLog.alasan && (
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#78350f' }}>
                      📝 <b>Alasan:</b> {currentLog.alasan}
                    </p>
                  )}
                  {currentLog.surat_nama && (
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#78350f' }}>
                      📄 <b>Bukti Surat:</b> {currentLog.surat_nama}
                      {currentLog.surat_url && (
                        <a href={currentLog.surat_url} target="_blank" rel="noreferrer" style={{ marginLeft: '6px', color: '#2563eb', textDecoration: 'underline', fontWeight: 'bold' }}>
                          [Buka Lampiran]
                        </a>
                      )}
                    </p>
                  )}
                  {isTargetGuru && currentLog.materi_nama && (
                    <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#1e40af' }}>
                      📚 <b>Bahan Ajar / Tugas:</b> {currentLog.materi_nama}
                      {currentLog.materi_url && (
                        <a href={currentLog.materi_url} target="_blank" rel="noreferrer" style={{ marginLeft: '6px', color: '#2563eb', textDecoration: 'underline', fontWeight: 'bold' }}>
                          [Download File]
                        </a>
                      )}
                    </p>
                  )}
                  {isTargetGuru && currentLog.keterangan_materi && (
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#1e40af' }}>
                      ✍️ <b>Petunjuk Tugas Siswa:</b> {currentLog.keterangan_materi}
                    </p>
                  )}
                </div>
              ) : (
                <div style={{ backgroundColor: '#eff6ff', padding: '10px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                  <p style={{ margin: 0, fontSize: '11px', fontWeight: 'bold', color: '#1e40af' }}>📚 {isTargetGuru ? 'BAHAN AJAR & PETUNJUK TUGAS:' : 'STATUS IZIN / SAKIT:'}</p>
                  <p style={{ margin: '4px 0', fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>
                    🔒 <i>Alasan dan bukti surat sakit bersifat rahasia (hanya dapat dilihat oleh Admin &amp; Guru bersangkutan).</i>
                  </p>
                  {isTargetGuru && (
                    <>
                      {currentLog.materi_nama ? (
                        <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#1e40af' }}>
                          📚 <b>Lampiran Tugas:</b> {currentLog.materi_nama}
                          {currentLog.materi_url && (
                            <a href={currentLog.materi_url} target="_blank" rel="noreferrer" style={{ marginLeft: '6px', color: '#2563eb', textDecoration: 'underline', fontWeight: 'bold' }}>
                              [Download Tugas]
                            </a>
                          )}
                        </p>
                      ) : (
                        <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#64748b' }}>Tidak ada lampiran file materi.</p>
                      )}
                      {currentLog.keterangan_materi && (
                        <div style={{ marginTop: '6px', backgroundColor: '#ffffff', padding: '8px', borderRadius: '6px', border: '1px solid #dbeafe' }}>
                          <b style={{ fontSize: '11px', color: '#1e40af' }}>✍️ Instruksi / Keterangan Tugas:</b>
                          <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#1e293b' }}>{currentLog.keterangan_materi}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 🔒 JIKA TIDAK MEMILIKI HAK AKSES UBAH STATUS (SISWA BIASA) */}
          {!canEditStatus ? (
            <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #cbd5e1', marginTop: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: '26px', marginBottom: '4px' }}>🔒</div>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 'bold', color: '#1e293b' }}>
                Hak Akses Terbatas (Mode Hanya Lihat)
              </h4>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: '1.4' }}>
                Perubahan status kehadiran siswa/guru hanya dapat dilakukan oleh <b>Bapak/Ibu Guru</b>, <b>Admin Sekolah</b>, atau <b>Siswa/i Admin</b> kelas.<br/>
                Siswa/i biasa hanya memiliki akses untuk melihat status kehadiran.
              </p>
              <div style={{ marginTop: '14px' }}>
                <button onClick={onClose} style={{ ...styles.btnCancelModal, width: '100%' }}>
                  ✕ Tutup
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* FORM PERUBAHAN STATUS MANUAL */}
              <div style={{ marginTop: '12px' }}>
                <label style={styles.label}>Pilih Status Kehadiran:</label>
                <select
                  value={manualStatus}
                  onChange={(e) => setManualStatus(e.target.value)}
                  style={styles.selectInput}
                >
                  {isSadminUser ? (
                    <>
                      <option value="Hadir">🟢 Hadir</option>
                      <option value="Izin">🟣 Izin (Wajib Alasan &amp; Bukti Surat)</option>
                      <option value="Sakit">🟡 Sakit (Wajib Alasan &amp; Bukti Surat)</option>
                    </>
                  ) : (
                    <>
                      <option value="Hadir">🟢 Hadir</option>
                      <option value="Pulang">🏠 Pulang (Selesai)</option>
                      {hasPulangStatus && (
                        <option value="Hapus Pulang">↩️ Hapus Status Pulang (Kembali Hadir)</option>
                      )}
                      <option value="Sakit">🟡 Sakit</option>
                      <option value="Izin">🟣 Izin</option>
                      <option value="Alpa">🔴 Alpa</option>
                      {currentLog && (
                        <option value="Hapus Presensi">🗑️ Hapus Status Presensi (Reset Belum Presensi)</option>
                      )}
                    </>
                  )}
                </select>
              </div>

              {/* FIELD KHUSUS SAAT SAKIT / IZIN */}
              {(manualStatus === 'Sakit' || manualStatus === 'Izin') && (
                <div style={{ marginTop: '10px' }}>
                  {/* Alasan & Bukti Surat (Dapat Diisi oleh Siswa Admin, Guru & Admin) */}
                  <div style={{ backgroundColor: '#fffbeb', padding: '12px', borderRadius: '10px', border: '1.5px solid #fde68a', marginBottom: '10px' }}>
                    <label style={{ ...styles.label, color: '#92400e', fontWeight: '800' }}>
                      📝 Alasan Izin / Sakit <span style={{ color: '#dc2626' }}>*</span>:
                    </label>
                    <input
                      type="text"
                      value={alasanIzin}
                      onChange={(e) => setAlasanIzin(e.target.value)}
                      placeholder={isTargetGuru ? "Contoh: Sakit demam / Keperluan dinas..." : "Contoh: Sakit demam tinggi / Izin keperluan keluarga..."}
                      style={{ ...styles.input, backgroundColor: '#ffffff', border: '1px solid #d97706' }}
                    />

                    <div style={{ marginTop: '10px' }}>
                      <label style={{ ...styles.label, color: '#92400e', fontWeight: '800' }}>
                        📎 Upload Bukti Surat Dokter / Surat Izin (Disimpan di Database):
                      </label>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setSuratFileName(file.name);
                            if (file.type.startsWith('image/')) {
                              try {
                                const reader = new FileReader();
                                reader.onload = (evt) => {
                                  const img = new Image();
                                  img.onload = () => {
                                    const maxDim = 1200;
                                    let w = img.width;
                                    let h = img.height;
                                    if (w > maxDim || h > maxDim) {
                                      if (w > h) {
                                        h = Math.round((h * maxDim) / w);
                                        w = maxDim;
                                      } else {
                                        w = Math.round((w * maxDim) / h);
                                        h = maxDim;
                                      }
                                    }
                                    const canvas = document.createElement('canvas');
                                    canvas.width = w;
                                    canvas.height = h;
                                    const ctx = canvas.getContext('2d');
                                    ctx.drawImage(img, 0, 0, w, h);
                                    setSuratDataUrl(canvas.toDataURL('image/jpeg', 0.8));
                                  };
                                  img.src = evt.target.result;
                                };
                                reader.readAsDataURL(file);
                              } catch (err) {
                                const reader = new FileReader();
                                reader.onload = (evt) => setSuratDataUrl(evt.target.result);
                                reader.readAsDataURL(file);
                              }
                            } else {
                              const reader = new FileReader();
                              reader.onload = (evt) => setSuratDataUrl(evt.target.result);
                              reader.readAsDataURL(file);
                            }
                          }
                        }}
                        style={{ ...styles.input, fontSize: '11px', backgroundColor: '#ffffff' }}
                      />
                      {suratFileName && (
                        <div style={{ marginTop: '6px', padding: '6px 10px', backgroundColor: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 'bold' }}>
                            ✅ Surat Terpilih: {suratFileName}
                          </span>
                        </div>
                      )}
                      {suratDataUrl && suratDataUrl.startsWith('data:image/') && (
                        <div style={{ marginTop: '8px', textAlign: 'center' }}>
                          <img src={suratDataUrl} alt="Preview Bukti" style={{ maxHeight: '140px', maxWidth: '100%', borderRadius: '8px', border: '1px solid #cbd5e1', objectFit: 'contain' }} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bahan Ajar & Keterangan Tugas (HANYA UNTUK GURU / STAFF) */}
                  {isTargetGuru && (
                    <div style={{ backgroundColor: '#eff6ff', padding: '10px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                      <label style={{ ...styles.label, color: '#1e40af' }}>📚 Upload Bahan Ajar / Tugas Mandiri (Untuk Siswa):</label>
                      <input
                        type="file"
                        accept="*/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setMateriFileName(file.name);
                            const reader = new FileReader();
                            reader.onload = (evt) => setMateriDataUrl(evt.target.result);
                            reader.readAsDataURL(file);
                          }
                        }}
                        style={{ ...styles.input, fontSize: '11px', backgroundColor: '#ffffff' }}
                      />
                      {materiFileName && (
                        <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: 'bold', display: 'block', marginTop: '3px' }}>
                          📘 File Tugas Terpilih: {materiFileName}
                        </span>
                      )}

                      <div style={{ marginTop: '8px' }}>
                        <label style={{ ...styles.label, color: '#1e40af' }}>✍️ Detail / Keterangan Tugas yang Mau Dikerjakan:</label>
                        <textarea
                          rows={3}
                          value={keteranganMateri}
                          onChange={(e) => setKeteranganMateri(e.target.value)}
                          placeholder="Contoh: Kerjakan Bab 3 Halaman 45-50 di buku tugas, kumpulkan di meja piket."
                          style={{ ...styles.input, fontSize: '11px', backgroundColor: '#ffffff' }}
                        />
                      </div>
                    </div>
                  )}

                  {/* 📋 PENUGASAN INVAL GURU MULTI-SESSION (BISA HINGGA 11 JAM DALAM 1 KALI INPUT) */}
                  {isTargetGuru && (
                    <div style={{ backgroundColor: '#f0fdf4', padding: '12px 14px', borderRadius: '10px', border: '1px solid #bbf7d0', marginTop: '12px' }}>
                      <label style={{ ...styles.label, color: '#166534', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 'bold', margin: 0, fontSize: '12px' }}>
                        <input
                          type="checkbox"
                          checked={assignInval}
                          onChange={(e) => setAssignInval(e.target.checked)}
                          style={{ width: '16px', height: '16px', accentColor: '#16a34a' }}
                        />
                        📋 Tugaskan Guru Inval (Guru Pengganti) ke Kelas? (Bisa Multi-Jam)
                      </label>

                      {assignInval && (
                        <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed #86efac' }}>
                          {/* PILIH GURU DEFAULT & PRESET CEPAT */}
                          <div style={{ backgroundColor: '#ffffff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #86efac', marginBottom: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#166534' }}>
                                ⭐ Guru Pengganti Utama:
                              </label>
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                <button
                                  type="button"
                                  onClick={handleAddInvalSession}
                                  style={{ padding: '3px 8px', fontSize: '10px', fontWeight: 'bold', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                >
                                  ➕ Tambah 1 Jam
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handlePresetInvalHours(4)}
                                  style={{ padding: '3px 6px', fontSize: '10px', fontWeight: 'bold', backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: '4px', cursor: 'pointer' }}
                                  title="Buat 4 Jam Pelajaran sekaligus"
                                >
                                  ⚡ 4 Jam
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handlePresetInvalHours(11)}
                                  style={{ padding: '3px 6px', fontSize: '10px', fontWeight: 'bold', backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', borderRadius: '4px', cursor: 'pointer' }}
                                  title="Buat 11 Jam Pelajaran penuh sekaligus"
                                >
                                  ⚡ 11 Jam Penuh
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const empty11 = [];
                                    for (let i = 1; i <= 11; i++) {
                                      empty11.push({
                                        id: Date.now() + i,
                                        jam_ke: `${i}`,
                                        kelas: '-',
                                        mapel: '-',
                                        guru_inval: '-',
                                      });
                                    }
                                    setInvalSessions(empty11);
                                  }}
                                  style={{ padding: '3px 6px', fontSize: '10px', fontWeight: 'bold', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}
                                  title="Isi 11 jam sebagai jam kosong (-)"
                                >
                                  ☕ 11 Jam Kosong (-)
                                </button>
                              </div>
                            </div>

                            <select
                              value={defaultGuruInval}
                              onChange={(e) => handleApplyDefaultGuruToAll(e.target.value)}
                              style={{ ...styles.selectInput, width: '100%', fontSize: '12px', backgroundColor: '#f8fafc', borderColor: '#86efac' }}
                            >
                              <option value="">-- Pilih Guru Pengganti (Terapkan ke Semua Jam) --</option>
                              <option value="-">➖ - (Jam Kosong / Bebas)</option>
                              {guruList
                                .filter((g) => g.nama?.trim().toLowerCase() !== detailSiswa.nama?.trim().toLowerCase())
                                .map((g) => (
                                  <option key={g.id} value={g.nama}>
                                    👨‍🏫 {g.inisial ? `[${toUnicodeBold(g.inisial)}] ` : ''}{g.nama}
                                  </option>
                                ))}
                            </select>
                          </div>

                          {/* DAFTAR BARIS JAM / KELAS PENUGASAN (1 s/d 11 JAM) */}
                          <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {invalSessions.map((session, index) => {
                              const isJamKosong = session.guru_inval === '-' || session.kelas === '-';
                              return (
                                <div
                                  key={session.id}
                                  style={{
                                    backgroundColor: isJamKosong ? '#f8fafc' : '#ffffff',
                                    padding: '8px 10px',
                                    borderRadius: '8px',
                                    border: isJamKosong ? '1px dashed #cbd5e1' : '1px solid #dcfce7',
                                    boxShadow: isJamKosong ? 'none' : '0 1px 2px rgba(0,0,0,0.04)',
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '4px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span style={{ fontSize: '11px', fontWeight: 'bold', color: isJamKosong ? '#64748b' : '#166534', backgroundColor: isJamKosong ? '#e2e8f0' : '#dcfce7', padding: '1px 8px', borderRadius: '10px' }}>
                                        📌 Sesi #{index + 1}
                                      </span>
                                      {isJamKosong && (
                                        <span style={{ fontSize: '10px', color: '#64748b', fontStyle: 'italic', fontWeight: 'bold' }}>
                                          ☕ (Jam Kosong)
                                        </span>
                                      )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                      {index > 0 && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const prev = invalSessions[index - 1];
                                            handleUpdateInvalSession(index, 'kelas', prev.kelas || '');
                                            handleUpdateInvalSession(index, 'mapel', prev.mapel || '');
                                            handleUpdateInvalSession(index, 'guru_inval', prev.guru_inval || '');
                                          }}
                                          style={{ backgroundColor: '#f0fdf4', color: '#15803d', border: '1px solid #86efac', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', cursor: 'pointer', fontWeight: 'bold' }}
                                          title={`Samakan dengan Sesi #${index}`}
                                        >
                                          📋 Samakan #{index}
                                        </button>
                                      )}
                                      {isJamKosong ? (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            handleUpdateInvalSession(index, 'kelas', '');
                                            handleUpdateInvalSession(index, 'mapel', '');
                                            handleUpdateInvalSession(index, 'guru_inval', defaultGuruInval || '');
                                          }}
                                          style={{ backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', cursor: 'pointer', fontWeight: 'bold' }}
                                        >
                                          ↩️ Ada Kelas
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            handleUpdateInvalSession(index, 'kelas', '-');
                                            handleUpdateInvalSession(index, 'mapel', '-');
                                            handleUpdateInvalSession(index, 'guru_inval', '-');
                                          }}
                                          style={{ backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', cursor: 'pointer', fontWeight: 'bold' }}
                                          title="Set baris ini jadi Jam Kosong (-)"
                                        >
                                          ☕ Set Kosong
                                        </button>
                                      )}
                                      {invalSessions.length > 1 && (
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveInvalSession(index)}
                                          style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', cursor: 'pointer' }}
                                          title="Hapus baris ini"
                                        >
                                          ✕ Hapus
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: '8px', marginBottom: '6px' }}>
                                    <div>
                                      <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '2px' }}>Jam (JP):</label>
                                      <input
                                        type="text"
                                        value={session.jam_ke}
                                        onChange={(e) => handleUpdateInvalSession(index, 'jam_ke', e.target.value)}
                                        placeholder="1 / 2"
                                        style={{ ...styles.input, fontSize: '11px', padding: '5px 6px', textAlign: 'center' }}
                                      />
                                    </div>
                                    <div>
                                      <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '2px' }}>Kelas Inval:</label>
                                      <select
                                        value={session.kelas}
                                        onChange={(e) => handleUpdateInvalSession(index, 'kelas', e.target.value)}
                                        style={{ ...styles.selectInput, width: '100%', fontSize: '11px', padding: '5px 6px' }}
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
                                      <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '2px' }}>Mata Pelajaran:</label>
                                      <input
                                        type="text"
                                        value={session.mapel}
                                        onChange={(e) => handleUpdateInvalSession(index, 'mapel', e.target.value)}
                                        placeholder="AKL / TKJ / -"
                                        style={{ ...styles.input, fontSize: '11px', padding: '5px 6px' }}
                                      />
                                    </div>
                                  </div>

                                  <div>
                                    <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#166534', display: 'block', marginBottom: '2px' }}>Guru Pengganti:</label>
                                    <select
                                      value={session.guru_inval}
                                      onChange={(e) => handleUpdateInvalSession(index, 'guru_inval', e.target.value)}
                                      style={{ ...styles.selectInput, width: '100%', fontSize: '11px', padding: '5px 6px' }}
                                    >
                                      <option value="">-- Pilih Guru Inval Sesi Ini --</option>
                                      <option value="-">➖ - (Jam Kosong / Tidak Ada Guru Pengganti)</option>
                                      {guruList
                                        .filter((g) => g.nama?.trim().toLowerCase() !== detailSiswa.nama?.trim().toLowerCase())
                                        .map((g) => (
                                          <option key={g.id} value={g.nama}>
                                            ⭐ {g.inisial ? `[${toUnicodeBold(g.inisial)}] ` : ''}{g.nama}
                                          </option>
                                        ))}
                                    </select>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                <button onClick={handleTriggerSave} disabled={isUpdating} style={{ ...styles.btnSaveModal, flex: '1 1 auto' }}>
                  {isUpdating ? 'Menyimpan...' : `💾 Simpan Status ${assignInval ? `& Inval (${invalSessions.length} Jam)` : ''}`}
                </button>

                {hasPulangStatus && canEditStatus && (
                  <button
                    type="button"
                    onClick={handleResetPulang}
                    disabled={isUpdating}
                    style={{ backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: '8px', padding: '9px 14px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    title="Batalkan/hapus status pulang"
                  >
                    ↩️ Hapus Pulang
                  </button>
                )}

                {currentLog && canEditStatus && (
                  <button
                    type="button"
                    onClick={handleResetPresensi}
                    disabled={isUpdating}
                    style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '8px', padding: '9px 14px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    title="Hapus data status presensi hari ini jika salah input"
                  >
                    🗑️ Hapus Status
                  </button>
                )}

                <button onClick={onClose} style={styles.btnCancelModal}>
                  Batal
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
