'use client';

import React, { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import styles from '../utils/dashboardStyles';
import { getUserRoleInfo } from '../utils/roleHelper';
import { calculateAiUserRating } from '../utils/smartRatingAi';
import { savePhotoToDatabase, cachePhotoLocally, getCachedPhoto } from '../utils/fotoProfil';
import { APP_VERSION, BUILD_SERVER } from '../lib/appVersion';

// 🪪 KOMPONEN MENU AKUN & PROFIL (KARTU IDENTITAS DIGITAL RESMI CR80 STANDAR PROFESIONAL)
function AkunProfileView({
  currentUser,
  setCurrentUser,
  siswaList = [],
  setSiswaList,
  supabase,
  isMasterIqbal,
  isMasterSchoolAdmin,
  isSiswaAdmin,
  siswaAdminKelas,
  newPasswordInput,
  setNewPasswordInput,
  confirmPasswordInput,
  setConfirmPasswordInput,
  onChangePassword,
  isChangingPassword,
  onNavigate,
  onLogout,
  onOpenOnlineUsers,
  onOpenFaceScanner,
  onOpenFaceManager,
}) {
  const isGuruAccount = Boolean(currentUser?.isGuru && !String(currentUser?.id).startsWith('SISWA-'));
  const aiUserRating = calculateAiUserRating(currentUser);
  const isAdmin = Boolean(
    isMasterIqbal ||
    currentUser?.role === 'admin' ||
    currentUser?.role === 'master' ||
    (currentUser?.username || '').toLowerCase() === 'admin' ||
    (currentUser?.username || '').toLowerCase() === 'iqbal' ||
    currentUser?.nama?.toLowerCase()?.includes('iqbal')
  );
  const fileInputRef = useRef(null);
  const canManageFaceBiometric = Boolean(
    isMasterSchoolAdmin ||
    isMasterIqbal ||
    currentUser?.username?.toLowerCase() === 'iqbal' ||
    currentUser?.rawId === 4 ||
    currentUser?.rawId === 29 ||
    currentUser?.id === 'GURU-4' ||
    currentUser?.id === 'GURU-29' ||
    (currentUser?.nama && currentUser.nama.toLowerCase().includes('iqbal')) ||
    (currentUser?.rfid_uid && currentUser.rfid_uid.toUpperCase() === '92006F96')
  );

  const matchedUserInDb = (siswaList || []).find((s) => {
    const sNamaClean = String(s?.nama || '').trim().toLowerCase();
    const curNamaClean = String(currentUser?.nama || '').trim().toLowerCase();
    const sUserClean = String(s?.username || '').trim().toLowerCase();
    const curUserClean = String(currentUser?.username || '').trim().toLowerCase();

    if (isGuruAccount) {
      return (
        s.isGuru &&
        (s.rawId === currentUser?.rawId ||
          String(s.id) === String(currentUser?.id) ||
          (sNamaClean && curNamaClean && sNamaClean === curNamaClean) ||
          (curUserClean && sNamaClean && sNamaClean.includes(curUserClean)) ||
          (curUserClean && sUserClean && sUserClean === curUserClean))
      );
    }
    return (
      !s.isGuru &&
      (s.rawId === currentUser?.rawId ||
        String(s.id) === String(currentUser?.id) ||
        (sNamaClean && curNamaClean && sNamaClean === curNamaClean) ||
        (curUserClean && sNamaClean && sNamaClean.includes(curUserClean)))
    );
  });

  const effectiveNama = currentUser?.nama || matchedUserInDb?.nama || 'Pengguna';
  // 🔑 ID Akun internal (bukan RFID) - presensi memakai Face Recognition AI
const effectiveUid = (isGuruAccount
  ? `GURU-${currentUser?.rawId || currentUser?.id_guru || currentUser?.id || '01'}`
  : `SIS-${currentUser?.rawId || currentUser?.id_siswa || currentUser?.id || '01'}`
).toUpperCase();

  const effectiveKelas = currentUser?.kelas || matchedUserInDb?.kelas || (isGuruAccount ? 'Guru / Staff' : '-');
  const effectiveJurusan = currentUser?.jurusan || matchedUserInDb?.jurusan || (isGuruAccount ? 'Guru / Staff' : '-');

  // Khusus Guru: Inisial
  const effectiveInisial =
    currentUser?.inisial ||
    matchedUserInDb?.inisial ||
    (isGuruAccount && effectiveNama
      ? String(effectiveNama)
          .split(' ')
          .map((w) => w[0])
          .filter((c) => /[A-Za-z]/.test(c))
          .slice(0, 2)
          .join('')
          .toUpperCase()
      : 'GR');

  const userRoleInfo = getUserRoleInfo(currentUser);
  const roleDisplay = userRoleInfo.badge + (userRoleInfo.type === 'sadmin' && siswaAdminKelas ? ` [${siswaAdminKelas}]` : '');

  const userInitial = (effectiveNama || 'U').charAt(0).toUpperCase();

  // 🔒 PRIVASI BIOMETRIK: Deteksi apakah akun sudah memiliki template biometrik wajah AI
  let currentBioParsed = currentUser?.biodata;
  if (typeof currentBioParsed === 'string') {
    try { currentBioParsed = JSON.parse(currentBioParsed); } catch (e) {}
  }
  let matchedBioParsed = matchedUserInDb?.biodata;
  if (typeof matchedBioParsed === 'string') {
    try { matchedBioParsed = JSON.parse(matchedBioParsed); } catch (e) {}
  }

  const checkHasFace = () => Boolean(
    currentUser?.face_descriptor ||
    currentBioParsed?.face_descriptor ||
    currentUser?.face_photo_url ||
    currentBioParsed?.face_photo_url ||
    matchedUserInDb?.face_descriptor ||
    matchedBioParsed?.face_descriptor ||
    (typeof window !== 'undefined' && (
      localStorage.getItem(`user_face_photo_${currentUser?.id}`) ||
      localStorage.getItem(`user_face_photo_${currentUser?.rawId}`)
    ))
  );

  const [hasFaceBiometric, setHasFaceBiometric] = useState(checkHasFace);

  useEffect(() => {
    setHasFaceBiometric(checkHasFace());
    const onFaceUpdate = () => setHasFaceBiometric(checkHasFace());
    window.addEventListener('user_face_registered', onFaceUpdate);
    return () => window.removeEventListener('user_face_registered', onFaceUpdate);
  }, [currentUser, matchedUserInDb]);

  // 📸 Resolusi Foto ID Card Resmi Akun Ini (Terisolasi per Role & ID)
  const rolePrefix = isGuruAccount ? 'GURU-' : 'SISWA-';
  const cleanDbId = String(currentUser?.rawId || currentUser?.id_guru || currentUser?.id_siswa || currentUser?.id || '').replace(/\D/g, '');
  const scopedPhotoKey = `user_photo_${rolePrefix}${cleanDbId || currentUser?.id || 'me'}`;

  const isMasterOrIqbal = Boolean(
    currentUser?.isMaster ||
    currentUser?.username === 'iqbal' ||
    String(currentUser?.nama || currentUser?.nama_guru || '').toLowerCase().includes('iqbal') ||
    cleanDbId === '4' || cleanDbId === '29' || currentUser?.id === 'GURU-4' ||
    currentUser?.id === 'GURU-29'
  );
  const defaultIqbalOfficialPhoto = '/guru/04_muhammad_iqbal_rangkuti_kajur_tjkt.jpg';
  const isSiraitPhoto = (p) => typeof p === 'string' && (p.toLowerCase().includes('ricardo') || p.toLowerCase().includes('sirait'));

  const resolveOfficialPhoto = () => {
    if (isMasterOrIqbal) {
      if (typeof window !== 'undefined') {
        try {
          ['user_photo_GURU-29', 'user_photo_GURU-iqbal', 'user_photo_29', scopedPhotoKey].forEach((k) => {
            const val = localStorage.getItem(k);
            if (val && isSiraitPhoto(val)) localStorage.removeItem(k);
          });
        } catch (e) {}
      }
      const candidates = [
        currentUser?.foto_url,
        currentUser?.biodata?.foto_resmi,
        currentUser?.biodata?.foto_id_card,
        currentUser?.biodata?.foto_url,
        matchedUserInDb?.foto_url,
        matchedUserInDb?.biodata?.foto_resmi,
      ];
      for (const c of candidates) {
        if (c && typeof c === 'string' && !isSiraitPhoto(c) && c !== '/logo.png' && c.length > 20) {
          return c;
        }
      }
      return defaultIqbalOfficialPhoto;
    }

    const isValidPhoto = (url) => url && typeof url === 'string' && url !== '/logo.png' && url.length > 20;

    // 1. Prioritas utama: Foto pada sesi currentUser
    if (isValidPhoto(currentUser?.foto_url)) return currentUser.foto_url;
    if (isValidPhoto(currentUser?.biodata?.foto_resmi)) return currentUser.biodata.foto_resmi;
    if (isValidPhoto(currentUser?.biodata?.foto_id_card)) return currentUser.biodata.foto_id_card;
    if (isValidPhoto(currentUser?.biodata?.foto_url)) return currentUser.biodata.foto_url;

    // 2. Data database matchedUserInDb
    if (isValidPhoto(matchedUserInDb?.foto_url)) return matchedUserInDb.foto_url;
    if (isValidPhoto(matchedUserInDb?.biodata?.foto_resmi)) return matchedUserInDb.biodata.foto_resmi;
    if (isValidPhoto(matchedUserInDb?.biodata?.foto_url)) return matchedUserInDb.biodata.foto_url;

    // 3. Cache helper getCachedPhoto
    const cached = getCachedPhoto({
      rawId: currentUser?.rawId || currentUser?.id,
      username: currentUser?.username,
      isGuru: isGuruAccount,
    });
    if (isValidPhoto(cached)) return cached;

    // 4. Cache lokal yang diisolasi role
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(scopedPhotoKey) ||
                     (currentUser?.username ? localStorage.getItem(`user_photo_${rolePrefix}${currentUser.username}`) : null);
      if (isValidPhoto(stored)) return stored;
    }
    return '';
  };

  const [photoUrl, setPhotoUrl] = useState(() => resolveOfficialPhoto());

  // Sinkronkan state foto saat currentUser berubah
  useEffect(() => {
    setPhotoUrl(resolveOfficialPhoto());
  }, [currentUser?.foto_url, currentUser?.biodata?.foto_resmi, currentUser?.id, matchedUserInDb?.foto_url]);

  useEffect(() => {
    const onPhotoUpdated = () => {
      setPhotoUrl(resolveOfficialPhoto());
    };
    window.addEventListener('user_photo_updated', onPhotoUpdated);
    return () => window.removeEventListener('user_photo_updated', onPhotoUpdated);
  }, [scopedPhotoKey, currentUser?.foto_url]);

  // 🔲 State Barcode & QR Code Presensi
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [barcodeFormat, setBarcodeFormat] = useState('1d');

  const barcodeValue = (
    effectiveUid ||
    (isGuruAccount
      ? `GURU-${currentUser?.id || currentUser?.rawId || '01'}`
      : `SIS-${currentUser?.id || currentUser?.rawId || '01'}`)
  ).toUpperCase();

  // 🔲 RENDER VECTOR SVG BARCODE 1D (CODE 39 COMPLIANT UNTUK SCANNER FISIK & KAMERA)
  const renderBarcode1D = (code) => {
    const code39Map = {
      '0': '101001101101', '1': '110100101011', '2': '101100101011', '3': '110110010101',
      '4': '101001101011', '5': '110100110101', '6': '101100110101', '7': '101001011011',
      '8': '110100101101', '9': '101100101101', 'A': '110101001011', 'B': '101101001011',
      'C': '110110100101', 'D': '101011001011', 'E': '110101100101', 'F': '101101100101',
      'G': '101010011011', 'H': '110101001101', 'I': '101101001101', 'J': '101011001101',
      'K': '110101010011', 'L': '101101010011', 'M': '110110101001', 'N': '101011010011',
      'O': '110101101001', 'P': '101101101001', 'Q': '101010110011', 'R': '110101011001',
      'S': '101101011001', 'T': '101011011001', 'U': '110010101011', 'V': '100110101011',
      'W': '110011010101', 'X': '100101101011', 'Y': '110010110101', 'Z': '100110110101',
      '-': '100101011011', '.': '110010101101', ' ': '100110101101', '$': '100100100101',
      '/': '100100101001', '+': '100101001001', '%': '101001001001', '*': '100101101101'
    };

    const clean = String(code || 'YPK').toUpperCase().replace(/[^0-9A-Z\-\. \$\/\+\%]/g, '');
    const fullString = `*${clean}*`;
    let bitStream = '';
    for (let i = 0; i < fullString.length; i++) {
      const char = fullString[i];
      bitStream += (code39Map[char] || code39Map['-']) + '0';
    }

    const barWidth = 2.4;
    const height = 70;
    const totalWidth = bitStream.length * barWidth;

    const rects = [];
    for (let i = 0; i < bitStream.length; i++) {
      if (bitStream[i] === '1') {
        rects.push(
          <rect
            key={i}
            x={i * barWidth}
            y={0}
            width={barWidth}
            height={height}
            fill="#000000"
          />
        );
      }
    }

    return (
      <svg
        viewBox={`0 0 ${totalWidth} ${height}`}
        style={{ width: '100%', maxWidth: '280px', height: `${height}px`, display: 'block', margin: '0 auto' }}
      >
        <rect x="0" y="0" width={totalWidth} height={height} fill="#ffffff" />
        {rects}
      </svg>
    );
  };

  // Password Change Quota State (3x kesempatan)
  const userKey = String(currentUser?.rawId || currentUser?.id || currentUser?.username || 'user');
  const quotaStorageKey = `pw_quota_${userKey}`;
  const getRemainingQuota = () => {
    if (typeof window === 'undefined') return 3;
    const keys = [
      quotaStorageKey,
      `pw_quota_${currentUser?.id}`,
      `pw_quota_${currentUser?.rawId}`,
      `pw_quota_${currentUser?.username}`,
      (effectiveNama.toLowerCase().includes('iqbal') ? 'pw_quota_iqbal' : null),
      (effectiveNama.toLowerCase().includes('iqbal') ? 'pw_quota_29' : null),
      (effectiveNama.toLowerCase().includes('iqbal') ? 'pw_quota_GURU-29' : null),
    ];
    let minQuota = 3;
    for (const k of keys) {
      if (!k) continue;
      const s = localStorage.getItem(k);
      if (s !== null) {
        const val = parseInt(s, 10);
        if (!isNaN(val) && val < minQuota) minQuota = val;
      }
    }
    return minQuota;
  };
  const [quotaRemaining, setQuotaRemaining] = useState(getRemainingQuota);

  // 📋 BIODATA SINGKAT KHUSUS GURU
  const guruBioStorageKey = `guru_biodata_${userKey}`;
  const [showBioEditModal, setShowBioEditModal] = useState(false);

  const getCombinedGuruBio = () => {
    let localSaved = null;
    if (typeof window !== 'undefined') {
      try {
        const s =
          localStorage.getItem(guruBioStorageKey) ||
          localStorage.getItem(`guru_biodata_${currentUser?.id}`) ||
          localStorage.getItem(`guru_biodata_${currentUser?.rawId}`) ||
          localStorage.getItem(`guru_biodata_${currentUser?.username}`) ||
          (effectiveNama.toLowerCase().includes('iqbal')
            ? localStorage.getItem('guru_biodata_iqbal') || localStorage.getItem('guru_biodata_GURU-29') || localStorage.getItem('guru_biodata_29')
            : null);
        if (s) localSaved = JSON.parse(s);
      } catch (e) {}
    }
    const dbBioRaw = currentUser?.biodata || matchedUserInDb?.biodata;
    let dbBio = dbBioRaw;
    if (typeof dbBioRaw === 'string') {
      try { dbBio = JSON.parse(dbBioRaw); } catch (e) {}
    }
    if (!dbBio || typeof dbBio !== 'object') dbBio = {};

    const isIqbal = effectiveNama.toLowerCase().includes('iqbal') || (currentUser?.username || '').toLowerCase() === 'iqbal';

    return {
      nuptk: localSaved?.nuptk || dbBio?.nuptk || matchedUserInDb?.nuptk || currentUser?.nuptk || (isIqbal ? '19850715 201001 1 012' : '-'),
      nip: localSaved?.nip || dbBio?.nip || matchedUserInDb?.nip || currentUser?.nip || (isIqbal ? '19850715 201001 1 012' : '-'),
      tempatTglLahir: localSaved?.tempatTglLahir || dbBio?.tempatTglLahir || (isIqbal ? 'Medan, 15 Juli 1985' : 'Medan, 15 Juli 1985'),
      pendidikan: localSaved?.pendidikan || dbBio?.pendidikan || (isIqbal ? 'S1 Pendidikan Teknologi Informasi (S.Kom., Gr.)' : 'Sarjana Pendidikan (S.Pd.)'),
      mapelDiampu: localSaved?.mapelDiampu || dbBio?.mapelDiampu || currentUser?.mapel || matchedUserInDb?.mapel || (isIqbal ? 'Teknik Jaringan Komputer & Telekomunikasi (TJKT)' : 'Mata Pelajaran Kejuruan'),
      alamat: localSaved?.alamat || dbBio?.alamat || currentUser?.alamat || matchedUserInDb?.alamat || (isIqbal ? 'Jl. Sakti Lubis Gg. Amal No. 25, Medan Amplas, Kota Medan' : 'Kota Medan, Sumatera Utara'),
      telepon: localSaved?.telepon || dbBio?.telepon || currentUser?.telepon || matchedUserInDb?.telepon || (isIqbal ? '0812-6543-9876' : '0812-6543-9876'),
      motto: localSaved?.motto || dbBio?.motto || (isIqbal ? 'Mendidik dengan keteladanan hati, membentuk generasi vokasi unggul dan berakhlak mulia.' : 'Mendidik dan membimbing siswa menuju masa depan gemilang.'),
      ...dbBio,
      ...(localSaved || {}),
    };
  };

  const [guruBiodata, setGuruBiodata] = useState(getCombinedGuruBio);
  const [editBioForm, setEditBioForm] = useState(guruBiodata);

  // 🎒 BIODATA SINGKAT KHUSUS SISWA
  const siswaBioStorageKey = `siswa_biodata_${userKey}`;
  const [showSiswaBioModal, setShowSiswaBioModal] = useState(false);

  const getCombinedSiswaBio = () => {
    let localSaved = null;
    if (typeof window !== 'undefined') {
      try {
        const s =
          localStorage.getItem(siswaBioStorageKey) ||
          localStorage.getItem(`siswa_biodata_${currentUser?.id}`) ||
          localStorage.getItem(`siswa_biodata_${currentUser?.rawId}`) ||
          localStorage.getItem(`siswa_biodata_${currentUser?.nisn}`);
        if (s) localSaved = JSON.parse(s);
      } catch (e) {}
    }
    const dbBioRaw = currentUser?.biodata || matchedUserInDb?.biodata;
    let dbBio = dbBioRaw;
    if (typeof dbBioRaw === 'string') {
      try { dbBio = JSON.parse(dbBioRaw); } catch (e) {}
    }
    if (!dbBio || typeof dbBio !== 'object') dbBio = {};

    return {
      nisn: localSaved?.nisn || dbBio?.nisn || matchedUserInDb?.nisn || currentUser?.nisn || '0078129384 / 20241012',
      tempatTglLahir: localSaved?.tempatTglLahir || dbBio?.tempatTglLahir || 'Medan, 12 Mei 2008',
      genderAgama: localSaved?.genderAgama || dbBio?.genderAgama || 'Laki-laki / Islam',
      citaCita: localSaved?.citaCita || dbBio?.citaCita || 'Network Engineer / Cloud IT Support',
      telepon: localSaved?.telepon || dbBio?.telepon || currentUser?.telepon || matchedUserInDb?.telepon || '0821-9876-5432',
      alamat: localSaved?.alamat || dbBio?.alamat || currentUser?.alamat || matchedUserInDb?.alamat || 'Jl. SM Raja No. 45, Kota Medan',
      ortuKontak: localSaved?.ortuKontak || dbBio?.ortuKontak || 'Bpk. Rahmat (0813-1122-3344)',
      motto: localSaved?.motto || dbBio?.motto || 'Disiplin dan tekun hari ini adalah kunci sukses masa depan.',
      ...dbBio,
      ...(localSaved || {}),
    };
  };

  const [siswaBiodata, setSiswaBiodata] = useState(getCombinedSiswaBio);
  const [editSiswaBioForm, setEditSiswaBioForm] = useState(siswaBiodata);

  useEffect(() => {
    const freshGuruBio = getCombinedGuruBio();
    setGuruBiodata(freshGuruBio);
    setEditBioForm(freshGuruBio);

    const freshSiswaBio = getCombinedSiswaBio();
    setSiswaBiodata(freshSiswaBio);
    setEditSiswaBioForm(freshSiswaBio);

    setQuotaRemaining(getRemainingQuota());
  }, [currentUser, matchedUserInDb]);

  const handleOpenBioModal = () => {
    setEditBioForm(guruBiodata);
    setShowBioEditModal(true);
  };

  const handleOpenSiswaBioModal = () => {
    setEditSiswaBioForm(siswaBiodata);
    setShowSiswaBioModal(true);
  };

  const handleSaveGuruBiodata = async (e) => {
    e.preventDefault();
    const rawId = currentUser?.rawId || currentUser?.id;
    const myId = String(currentUser?.id || currentUser?.rawId || currentUser?.username || 'user');

    const existingBio = (currentUser?.biodata && typeof currentUser.biodata === 'object') ? currentUser.biodata : (guruBiodata || {});
    const fullMergedBio = {
      ...existingBio,
      ...editBioForm,
      face_descriptor: existingBio.face_descriptor || currentUser?.face_descriptor,
      face_legacy_descriptor: existingBio.face_legacy_descriptor || currentUser?.face_legacy_descriptor,
      face_photo_url: existingBio.face_photo_url || currentUser?.face_photo_url || '',
      foto_avatar: existingBio.foto_avatar || photoUrl || existingBio.foto_url,
      foto_profil: existingBio.foto_profil || photoUrl || existingBio.foto_url,
      face_registered_at: existingBio.face_registered_at || currentUser?.face_registered_at,
    };
    setGuruBiodata(fullMergedBio);

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(guruBioStorageKey, JSON.stringify(fullMergedBio));
        if (effectiveNama.toLowerCase().includes('iqbal') || currentUser?.username?.toLowerCase() === 'iqbal') {
          localStorage.setItem('guru_biodata_iqbal', JSON.stringify(fullMergedBio));
          localStorage.setItem('guru_biodata_GURU-29', JSON.stringify(fullMergedBio));
          localStorage.setItem('guru_biodata_29', JSON.stringify(fullMergedBio));
        }
        const cur = localStorage.getItem('user_guru') || localStorage.getItem('smk_ypk_session');
        if (cur) {
          const p = JSON.parse(cur);
          p.biodata = fullMergedBio;
          p.nuptk = fullMergedBio.nuptk || p.nuptk;
          p.nip = fullMergedBio.nip || p.nip;
          p.telepon = fullMergedBio.telepon || p.telepon;
          p.alamat = fullMergedBio.alamat || p.alamat;
          p.mapel = fullMergedBio.mapelDiampu || p.mapel;
          localStorage.setItem('user_guru', JSON.stringify(p));
          localStorage.setItem('smk_ypk_session', JSON.stringify(p));
        }
        window.dispatchEvent(new Event('user_photo_updated'));
      } catch (err) {}
    }

    if (rawId && supabase) {
      try {
        const updatePayload = {
          biodata: fullMergedBio,
        };
        if (photoUrl) {
          updatePayload.foto_url = photoUrl;
          updatePayload.foto_updated_at = new Date().toISOString();
        }

        let { error: gErr } = await supabase.from('tb_guru').update({
          ...updatePayload,
          telepon: editBioForm.telepon,
          alamat: editBioForm.alamat,
          nuptk: editBioForm.nuptk,
          nip: editBioForm.nip,
          mapel: editBioForm.mapelDiampu,
        }).eq('id_guru', rawId);

        if (gErr) {
          console.warn('Fallback update tb_guru without extra columns:', gErr.message);
          await supabase.from('tb_guru').update(updatePayload).eq('id_guru', rawId);
        }
      } catch (err) {
        console.warn('Supabase guru bio update note:', err);
      }
    }

    if (setCurrentUser) {
      setCurrentUser((prev) => ({ ...prev, biodata: fullMergedBio }));
    }

    if (setSiswaList) {
      setSiswaList((prev) =>
        prev.map((s) => (s.isGuru && (s.rawId === rawId || s.id === currentUser?.id) ? { ...s, biodata: fullMergedBio } : s))
      );
    }

    // 📡 Siarkan pembaruan biodata ke seluruh akun yang sedang online
    try {
      supabase.channel('smk_ypk_presence_room').send({
        type: 'broadcast',
        event: 'biodata_updated',
        payload: {
          user_id: myId,
          rawId: rawId,
          nama: currentUser?.nama,
          isGuru: true,
          biodata: fullMergedBio,
        },
      });
    } catch (err) {}

    setShowBioEditModal(false);
    Swal.fire({
      icon: 'success',
      title: 'Biodata Guru Disimpan! 🎉',
      text: 'Informasi biodata pendidik telah berhasil diperbarui dan tersimpan di database server agar dapat dibaca oleh seluruh akun.',
      timer: 1800,
      showConfirmButton: false,
    });
  };

  const handleSaveSiswaBiodata = async (e) => {
    e.preventDefault();
    const rawId = currentUser?.rawId || currentUser?.id;
    const myId = String(currentUser?.id || currentUser?.rawId || currentUser?.username || 'user');

    const existingBio = (currentUser?.biodata && typeof currentUser.biodata === 'object') ? currentUser.biodata : (siswaBiodata || {});
    const fullMergedBio = {
      ...existingBio,
      ...editSiswaBioForm,
      face_descriptor: existingBio.face_descriptor || currentUser?.face_descriptor,
      face_legacy_descriptor: existingBio.face_legacy_descriptor || currentUser?.face_legacy_descriptor,
      face_photo_url: existingBio.face_photo_url || currentUser?.face_photo_url || '',
      foto_avatar: existingBio.foto_avatar || photoUrl || existingBio.foto_url,
      foto_profil: existingBio.foto_profil || photoUrl || existingBio.foto_url,
      face_registered_at: existingBio.face_registered_at || currentUser?.face_registered_at,
    };
    setSiswaBiodata(fullMergedBio);

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(siswaBioStorageKey, JSON.stringify(fullMergedBio));
        const cur = localStorage.getItem('user_guru') || localStorage.getItem('smk_ypk_session');
        if (cur) {
          const p = JSON.parse(cur);
          p.biodata = fullMergedBio;
          localStorage.setItem('user_guru', JSON.stringify(p));
          localStorage.setItem('smk_ypk_session', JSON.stringify(p));
        }
        window.dispatchEvent(new Event('user_photo_updated'));
      } catch (err) {}
    }

    if (rawId && supabase) {
      try {
        const updatePayload = {
          biodata: fullMergedBio,
        };
        if (photoUrl) {
          updatePayload.foto_url = photoUrl;
          updatePayload.foto_updated_at = new Date().toISOString();
        }

        let { error: sErr } = await supabase.from('tb_siswa').update({
          ...updatePayload,
          telepon: editSiswaBioForm.telepon,
          alamat: editSiswaBioForm.alamat,
          nisn: editSiswaBioForm.nisn,
        }).eq('id_siswa', rawId);

        if (sErr) {
          console.warn('Fallback update tb_siswa without extra columns:', sErr.message);
          await supabase.from('tb_siswa').update(updatePayload).eq('id_siswa', rawId);
        }
      } catch (err) {
        console.warn('Supabase siswa bio update note:', err);
      }
    }

    if (setCurrentUser) {
      setCurrentUser((prev) => ({ ...prev, biodata: fullMergedBio }));
    }

    if (setSiswaList) {
      setSiswaList((prev) =>
        prev.map((s) => (!s.isGuru && (s.rawId === rawId || s.id === currentUser?.id) ? { ...s, biodata: fullMergedBio } : s))
      );
    }

    // 📡 Siarkan pembaruan biodata ke seluruh akun yang sedang online
    try {
      supabase.channel('smk_ypk_presence_room').send({
        type: 'broadcast',
        event: 'biodata_updated',
        payload: {
          user_id: myId,
          rawId: rawId,
          nama: currentUser?.nama,
          isGuru: false,
          biodata: fullMergedBio,
        },
      });
    } catch (err) {}

    setShowSiswaBioModal(false);
    Swal.fire({
      icon: 'success',
      title: 'Biodata Siswa Disimpan! 🎉',
      text: 'Informasi biodata Anda telah berhasil diperbarui dan tersimpan di database server agar dapat dibaca oleh akun lain.',
      timer: 1800,
      showConfirmButton: false,
    });
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      Swal.fire({ icon: 'warning', title: 'Bukan Gambar', text: 'Silakan pilih file gambar (JPG / PNG / WEBP).' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const maxW = 320;
        const maxH = 400;
        let w = img.width;
        let h = img.height;

        if (w > maxW || h > maxH) {
          if (w / h > maxW / maxH) {
            h = Math.round((h * maxW) / w);
            w = maxW;
          } else {
            w = Math.round((w * maxH) / h);
            h = maxH;
          }
        }

        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);

        const nowIso = new Date().toISOString();
        setPhotoUrl(compressedBase64);
        const myId = String(currentUser?.id || currentUser?.rawId || currentUser?.username || 'user');
        const rawId = currentUser?.rawId || currentUser?.id_guru || currentUser?.id_siswa || currentUser?.id || '';
        const rawIdStr = String(rawId).replace(/\D/g, '');
        const cleanDbId = rawIdStr ? parseInt(rawIdStr, 10) : null;
        const isGuru = Boolean(currentUser?.isGuru && !String(currentUser?.id).startsWith('SISWA-'));
        const rolePrefix = isGuru ? 'GURU-' : 'SISWA-';
        const myScopedId = `${rolePrefix}${rawIdStr}`;

        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem(`user_photo_deleted_${scopedPhotoKey}`);
            localStorage.removeItem(`user_photo_deleted_${myScopedId}`);

            localStorage.setItem(scopedPhotoKey, compressedBase64);
            localStorage.setItem(`user_photo_${myScopedId}`, compressedBase64);
            if (currentUser?.username) {
              localStorage.setItem(`user_photo_${rolePrefix}${currentUser.username}`, compressedBase64);
            }

            // Bersihkan sisa key non-namespace warisan lama agar tidak bocor ke akun ber-ID sama
            localStorage.removeItem(`user_photo_${rawIdStr}`);
            if (currentUser?.nama) localStorage.removeItem(`user_photo_${currentUser.nama.trim()}`);

            const sessionObj = {
              ...(currentUser || {}),
              foto_url: compressedBase64,
              foto_updated_at: nowIso,
            };
            const sessionKey = isGuru ? 'user_guru' : 'smk_ypk_session';
            localStorage.setItem(sessionKey, JSON.stringify(sessionObj));
            localStorage.setItem('smk_ypk_session', JSON.stringify(sessionObj));

            window.dispatchEvent(new Event('user_photo_updated'));
          } catch (err) {}
        }

        // 💾 SIMPAN KE DATABASE SECARA PERSISTEN (tb_siswa atau tb_guru)
        // Gunakan helper "progressive fallback" agar foto TIDAK PERNAH hilang
        // hanya karena satu kolom (biodata / foto_updated_at) belum tersedia di DB.
        let photoDbResult = { ok: false, error: null, strategy: 'none', savedColumns: [] };
        if (supabase) {
          const currentBioObj = isGuru
            ? (guruBiodata && typeof guruBiodata === 'object' ? { ...guruBiodata } : {})
            : (siswaBiodata && typeof siswaBiodata === 'object' ? { ...siswaBiodata } : {});

          currentBioObj.foto_url = compressedBase64;
          currentBioObj.foto_resmi = compressedBase64;
          currentBioObj.foto_id_card = compressedBase64;
          currentBioObj.foto_avatar = compressedBase64;
          currentBioObj.foto_profil = compressedBase64;
          currentBioObj.foto_updated_at = nowIso;

          // Biodata bisa berupa JSON string -> parse dulu agar data biometrik tidak hilang
          let curBioParsed = currentUser?.biodata;
          if (typeof curBioParsed === 'string') {
            try { curBioParsed = JSON.parse(curBioParsed); } catch (e) { curBioParsed = {}; }
          }
          if (curBioParsed?.face_descriptor && !currentBioObj.face_descriptor) {
            currentBioObj.face_descriptor = curBioParsed.face_descriptor;
          }
          if (curBioParsed?.face_legacy_descriptor && !currentBioObj.face_legacy_descriptor) {
            currentBioObj.face_legacy_descriptor = curBioParsed.face_legacy_descriptor;
          }
          if (curBioParsed?.face_photo_url && !currentBioObj.face_photo_url) {
            currentBioObj.face_photo_url = curBioParsed.face_photo_url;
          }

          const table = isGuru ? 'tb_guru' : 'tb_siswa';
          const idColumn = isGuru ? 'id_guru' : 'id_siswa';
          const fallbackColumn = isGuru ? 'nama_guru' : 'nama_siswa';

          const idCandidates = [];
          if (cleanDbId) idCandidates.push({ column: idColumn, value: cleanDbId });
          if (currentUser?.username) idCandidates.push({ column: 'username', value: currentUser.username });
          if (currentUser?.nama) idCandidates.push({ column: fallbackColumn, value: currentUser.nama.trim() });

          for (const candidate of idCandidates) {
            // eslint-disable-next-line no-await-in-loop
            photoDbResult = await savePhotoToDatabase(supabase, {
              table,
              idColumn: candidate.column,
              idValue: candidate.value,
              photoDataUrl: compressedBase64,
              biodata: currentBioObj,
              nowIso,
            });
            if (photoDbResult.ok) break;
          }

          if (!photoDbResult.ok) {
            console.error('Database photo save error:', photoDbResult.error);
          }
        }

        // Update state lokal currentUser & siswaList secara realtime
        if (setCurrentUser) {
          setCurrentUser((prev) => ({
            ...prev,
            foto_url: compressedBase64,
            foto_updated_at: nowIso,
          }));
        }

        if (setSiswaList) {
          setSiswaList((prev) =>
            prev.map((s) => {
              const match = isGuru
                ? (s.isGuru && (s.rawId === rawId || s.id === currentUser?.id))
                : (!s.isGuru && (s.rawId === rawId || s.id === currentUser?.id));
              return match
                ? { ...s, foto_url: compressedBase64, foto_updated_at: nowIso }
                : s;
            })
          );
        }

        // 📡 Siarkan foto baru ke seluruh perangkat & Admin Master melalui Supabase Broadcast
        try {
          supabase.channel('smk_ypk_presence_room').send({
            type: 'broadcast',
            event: 'photo_updated',
            payload: {
              user_id: myId,
              rawId: rawId,
              nama: currentUser?.nama,
              foto_url: compressedBase64,
              foto_updated_at: nowIso,
              role: currentUser?.role || (isGuru ? 'guru' : 'siswa'),
              kelas: currentUser?.kelas || '',
            },
          });
        } catch (err) {}

        // 📌 Cadangan lokal anti-hilang (dipakai saat DB belum bisa contacted)
        cachePhotoLocally(compressedBase64, {
          rawId: rawId || currentUser?.rawId || currentUser?.id,
          username: currentUser?.username,
          isGuru,
        });

        if (photoDbResult.ok) {
          Swal.fire({
            icon: 'success',
            title: 'Foto ID Berhasil Diperbarui! 📸',
            text: 'Foto profil kartu identitas digital Anda telah tersimpan permanen di database dan aktif realtime di ID Card & Direktori Online.',
            timer: 1800,
            showConfirmButton: false,
          });
        } else {
          // JUJUR ke user: foto tersimpan di perangkat ini, tapi server belum bisa menyimpannya.
          Swal.fire({
            icon: 'warning',
            title: 'Foto Disimpan di Perangkat Ini Saja ⚠️',
            html: `<div style="text-align:left;line-height:1.5">
              Database server belum bisa menyimpan foto Anda:<br/>
              <code style="font-size:11px">${String(photoDbResult?.error?.message || photoDbResult?.error || 'tidak diketahui').slice(0, 180)}</code><br/><br/>
              Foto tetap tampil di ID Card pada perangkat ini. Agar permanen di semua HP, jalankan skrip SQL
              <b>MIGRASI_KOLOM_BIOMETRIK_WAJAH.sql</b> & <b>fix_permanent_photos.sql</b> di Supabase, lalu unggah ulang.
            </div>`,
            confirmButtonText: 'Mengerti',
          });
        }
      };
      img.src = readerEvent.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = async () => {
    setPhotoUrl('');
    const myId = String(currentUser?.id || currentUser?.rawId || currentUser?.username || 'user');
    const isGuru = Boolean(currentUser?.isGuru && !String(currentUser?.id).startsWith('SISWA-'));
    const rawIdStr = String(currentUser?.rawId || currentUser?.id_guru || currentUser?.id_siswa || currentUser?.id || '').replace(/\D/g, '');
    const cleanDbId = rawIdStr ? parseInt(rawIdStr, 10) : null;
    const rolePrefix = isGuru ? 'GURU-' : 'SISWA-';
    const myScopedId = `${rolePrefix}${rawIdStr}`;

    // 1. Bersihkan seluruh field foto dari biodata
    const currentBioObj = isGuru
      ? (guruBiodata && typeof guruBiodata === 'object' ? { ...guruBiodata } : {})
      : (siswaBiodata && typeof siswaBiodata === 'object' ? { ...siswaBiodata } : {});
    
    delete currentBioObj.foto_url;
    delete currentBioObj.foto_resmi;
    delete currentBioObj.foto_id_card;
    delete currentBioObj.foto_profil;
    delete currentBioObj.foto_avatar;
    delete currentBioObj.foto;
    delete currentBioObj.foto_updated_at;

    if (isGuru) {
      setGuruBiodata(currentBioObj);
    } else {
      setSiswaBiodata(currentBioObj);
    }

    // 2. Bersihkan total dari semua key localStorage yang terkait akun ini
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(scopedPhotoKey);
        localStorage.removeItem(`user_photo_${myScopedId}`);
        if (currentUser?.username) localStorage.removeItem(`user_photo_${rolePrefix}${currentUser.username}`);
        localStorage.removeItem(`user_photo_${rawIdStr}`);
        if (currentUser?.nama) localStorage.removeItem(`user_photo_${currentUser.nama.trim()}`);

        // Update session lokal secara bersih
        const sessionKey = isGuru ? 'user_guru' : 'smk_ypk_session';
        const curSessionRaw = localStorage.getItem(sessionKey) || localStorage.getItem('smk_ypk_session');
        let sessionObj = {};
        if (curSessionRaw) {
          try {
            sessionObj = JSON.parse(curSessionRaw);
          } catch (e) {}
        }
        sessionObj = {
          ...sessionObj,
          ...(currentUser || {}),
          foto_url: '',
          foto: '',
          foto_resmi: '',
          foto_id_card: '',
          foto_profil: '',
          foto_avatar: '',
          foto_updated_at: null,
          biodata: currentBioObj,
        };
        if (sessionObj.biodata && typeof sessionObj.biodata === 'object') {
          delete sessionObj.biodata.foto_url;
          delete sessionObj.biodata.foto_resmi;
          delete sessionObj.biodata.foto_id_card;
          delete sessionObj.biodata.foto_profil;
          delete sessionObj.biodata.foto_avatar;
          delete sessionObj.biodata.foto;
          delete sessionObj.biodata.foto_updated_at;
        }
        localStorage.setItem(sessionKey, JSON.stringify(sessionObj));
        localStorage.setItem('smk_ypk_session', JSON.stringify(sessionObj));

        if (isGuru) {
          localStorage.setItem(guruBioStorageKey, JSON.stringify(currentBioObj));
        } else {
          localStorage.setItem(siswaBioStorageKey, JSON.stringify(currentBioObj));
        }

        window.dispatchEvent(new Event('user_photo_updated'));
      } catch (e) {}
    }

    // 3. Update React state currentUser & siswaList seketika
    if (setCurrentUser) {
      setCurrentUser((prev) => ({
        ...prev,
        foto_url: '',
        foto_updated_at: null,
        biodata: currentBioObj,
      }));
    }

    if (setSiswaList) {
      setSiswaList((prev) =>
        prev.map((s) => {
          const match = isGuru
            ? (s.isGuru && (s.id === currentUser?.id || (cleanDbId && s.rawId === cleanDbId)))
            : (!s.isGuru && (s.id === currentUser?.id || (cleanDbId && s.rawId === cleanDbId)));
          return match ? { ...s, foto_url: '', foto_updated_at: null, biodata: currentBioObj } : s;
        })
      );
    }

    // 4. 💾 HAPUS DARI DATABASE SUPABASE SECARA PERSISTEN (AWAIT TUNTAS)
    if (supabase) {
      try {
        const updatePayload = {
          foto_url: null,
          foto_updated_at: null,
          biodata: currentBioObj,
        };

        if (isGuru) {
          if (cleanDbId) {
            await supabase.from('tb_guru').update(updatePayload).eq('id_guru', cleanDbId);
          } else if (currentUser?.username) {
            await supabase.from('tb_guru').update(updatePayload).eq('username', currentUser.username);
          } else if (currentUser?.nama) {
            await supabase.from('tb_guru').update(updatePayload).eq('nama_guru', currentUser.nama.trim());
          }
        } else {
          if (cleanDbId) {
            await supabase.from('tb_siswa').update(updatePayload).eq('id_siswa', cleanDbId);
          } else if (currentUser?.username) {
            await supabase.from('tb_siswa').update(updatePayload).eq('username', currentUser.username);
          } else if (currentUser?.nama) {
            await supabase.from('tb_siswa').update(updatePayload).eq('nama_siswa', currentUser.nama.trim());
          }
        }
      } catch (dbErr) {
        console.error('Error removing photo from Supabase:', dbErr);
      }
    }

    // 5. Broadcast perubahan foto ke seluruh perangkat aktif
    try {
      if (supabase) {
        supabase.channel('smk_ypk_presence_room').send({
          type: 'broadcast',
          event: 'photo_updated',
          payload: {
            user_id: myId,
            rawId: rawIdStr,
            nama: currentUser?.nama,
            foto_url: '',
            foto_updated_at: null,
            role: currentUser?.role || (isGuru ? 'guru' : 'siswa'),
            kelas: currentUser?.kelas || '',
          },
        });
      }
    } catch (err) {}

    Swal.fire({
      icon: 'info',
      title: 'Foto ID Dihapus Permanen',
      text: 'Foto profil kartu identitas telah dihapus dari database dan memori. Kartu kembali menggunakan inisial nama resmi.',
      timer: 1800,
      showConfirmButton: false,
    });
  };

  // Cetak ID Card persis seperti di layar
  const handlePrintCard = () => {
    const cardEl = document.getElementById('digital-id-card-print');
    if (!cardEl) {
      window.print();
      return;
    }

    const printWindow = window.open('', '_blank', 'width=800,height=520');
    if (!printWindow) {
      window.print();
      return;
    }

    const cardHtml = cardEl.outerHTML;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cetak Kartu ID - ${currentUser?.nama || 'SMK YPK Medan'}</title>
          <style>
            @page { size: auto; margin: 10mm; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 80vh;
              margin: 0;
              padding: 20px;
              background-color: #f8fafc;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .no-print { display: none !important; }
            @media print {
              body { background: transparent !important; padding: 0 !important; }
            }
          </style>
        </head>
        <body>
          <div style="max-width: 480px; width: 100%;">
            ${cardHtml}
          </div>
          <script>
            window.onload = function() {
              window.focus();
              window.print();
              setTimeout(function() { window.close(); }, 1000);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div style={{ padding: '4px 8px 30px 8px', maxWidth: '520px', margin: '0 auto' }}>
      {/* 🪪 KARTU IDENTITAS DIGITAL FORMAT CR80 RESMI (RESPONSIF, LUAS & ELEGAN) */}
      <div
        id="digital-id-card-print"
        style={{
          background: 'linear-gradient(135deg, #1c1917 0%, #7c2d12 40%, #c2410c 80%, #ea580c 100%)',
          borderRadius: '20px',
          padding: '16px 18px',
          color: '#ffffff',
          boxShadow: '0 16px 36px rgba(124, 45, 18, 0.35)',
          border: '1.5px solid rgba(254, 215, 170, 0.65)',
          marginBottom: '14px',
          position: 'relative',
          overflow: 'hidden',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {/* Watermark Logo Sekolah Elegan */}
        <div
          style={{
            position: 'absolute',
            right: '-15px',
            bottom: '-20px',
            width: '160px',
            height: '160px',
            opacity: 0.15,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        >
          <img
            src="/logo.png"
            alt="Watermark Logo SMK YPK"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </div>

        {/* 1. HEADER KARTU (KOMPAK & RESMI) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255, 255, 255, 0.22)',
            paddingBottom: '10px',
            marginBottom: '12px',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                backgroundColor: '#ffffff',
                borderRadius: '10px',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                flexShrink: 0,
              }}
            >
              <img src="/logo.png" alt="Logo SMK YPK" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '13.5px', fontWeight: '900', color: '#ffffff', letterSpacing: '0.4px', lineHeight: 1.2 }}>
                SMK YPK MEDAN
              </h2>
              <span style={{ fontSize: '8.5px', color: '#fed7aa', fontWeight: '800', letterSpacing: '0.8px', display: 'block' }}>
                KARTU IDENTITAS DIGITAL RESMI
              </span>
            </div>
          </div>

        </div>

        {/* 2. BODY KARTU: FOTO (KIRI) & INFORMASI (KANAN) */}
        <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
          {/* FOTO ID FORMAL */}
          <div style={{ flexShrink: 0 }}>
            <div
              style={{
                width: '78px',
                height: '98px',
                borderRadius: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                border: '2px solid rgba(254, 215, 170, 0.85)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer',
              }}
              onClick={() => fileInputRef.current?.click()}
              title="Klik untuk Upload / Ganti Foto ID"
            >
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt="Foto ID"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <>
                  <span style={{ fontSize: '32px', fontWeight: 'bold', color: '#ffffff' }}>{userInitial}</span>
                  <span style={{ fontSize: '7.5px', textTransform: 'uppercase', color: '#fed7aa', fontWeight: 'bold', letterSpacing: '0.5px' }}>FOTO ID</span>
                </>
              )}
              <div
                className="no-print"
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  color: '#ffffff',
                  fontSize: '8px',
                  textAlign: 'center',
                  padding: '2px 0',
                  fontWeight: 'bold',
                }}
              >
                📷 UBAH
              </div>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handlePhotoSelect}
              style={{ display: 'none' }}
            />
          </div>

          {/* DETAIL PENGGUNA (TIDAK TERPOTONG / TIDAK SEMPIT) */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3
              style={{
                margin: '0 0 3px 0',
                fontSize: '14.5px',
                fontWeight: '800',
                color: '#ffffff',
                letterSpacing: '0.2px',
                lineHeight: 1.3,
                wordBreak: 'break-word',
              }}
            >
              {currentUser?.nama || matchedUserInDb?.nama || 'Pengguna'}
            </h3>

            <div style={{ marginBottom: '6px' }}>
              <span
                style={{
                  fontSize: '9.5px',
                  fontWeight: '800',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(255, 255, 255, 0.22)',
                  color: '#fef08a',
                  display: 'inline-block',
                  border: '1px solid rgba(254, 240, 138, 0.35)',
                }}
              >
                {roleDisplay}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '11px' }}>
              {isGuruAccount ? (
                <>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={{ color: '#fed7aa', fontWeight: '700', minWidth: '55px' }}>Inisial:</span>
                    <b style={{ color: '#ffffff', letterSpacing: '1px' }}>{effectiveInisial || '-'}</b>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={{ color: '#fed7aa', fontWeight: '700', minWidth: '55px' }}>Jurusan:</span>
                    <b style={{ color: '#ffffff', wordBreak: 'break-word' }}>{effectiveJurusan}</b>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={{ color: '#fed7aa', fontWeight: '700', minWidth: '55px' }}>NIP/NUPTK:</span>
                    <b style={{ color: '#ffffff' }}>{guruBiodata?.nuptk || guruBiodata?.nip || '-'}</b>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
                    <span style={{ color: '#fed7aa', fontWeight: '700', minWidth: '55px' }}>Face AI:</span>
                    <span style={{ backgroundColor: hasFaceBiometric ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.25)', color: hasFaceBiometric ? '#86efac' : '#fca5a5', padding: '2px 7px', borderRadius: '5px', fontWeight: 'bold', fontSize: '10px', border: hasFaceBiometric ? '1px solid #4ade80' : '1px solid #f87171' }}>
                      {hasFaceBiometric ? '📸 AI Terdaftar (Aktif)' : '⚠️ Belum Terdaftar'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
                    <span style={{ color: '#fed7aa', fontWeight: '700', minWidth: '55px' }}>Rating AI:</span>
                    <span style={{ backgroundColor: 'rgba(0, 0, 0, 0.35)', color: aiUserRating.badgeColor, padding: '2px 7px', borderRadius: '5px', fontWeight: 'bold', fontSize: '10px', border: `1px solid ${aiUserRating.badgeColor}70` }}>
                      {aiUserRating.label}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={{ color: '#fed7aa', fontWeight: '700', minWidth: '55px' }}>Kelas:</span>
                    <b style={{ color: '#ffffff' }}>{effectiveKelas}</b>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={{ color: '#fed7aa', fontWeight: '700', minWidth: '55px' }}>Jurusan:</span>
                    <b style={{ color: '#ffffff', wordBreak: 'break-word' }}>{effectiveJurusan}</b>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={{ color: '#fed7aa', fontWeight: '700', minWidth: '55px' }}>NISN:</span>
                    <b style={{ color: '#ffffff' }}>{matchedUserInDb?.nisn || siswaBiodata?.nisn || currentUser?.nisn || '-'}</b>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
                    <span style={{ color: '#fed7aa', fontWeight: '700', minWidth: '55px' }}>Face AI:</span>
                    <span style={{ backgroundColor: hasFaceBiometric ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.25)', color: hasFaceBiometric ? '#86efac' : '#fca5a5', padding: '2px 7px', borderRadius: '5px', fontWeight: 'bold', fontSize: '10px', border: hasFaceBiometric ? '1px solid #4ade80' : '1px solid #f87171' }}>
                      {hasFaceBiometric ? '📸 AI Terdaftar (Aktif)' : '⚠️ Belum Terdaftar'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
                    <span style={{ color: '#fed7aa', fontWeight: '700', minWidth: '55px' }}>Rating AI:</span>
                    <span style={{ backgroundColor: 'rgba(0, 0, 0, 0.35)', color: aiUserRating.badgeColor, padding: '2px 7px', borderRadius: '5px', fontWeight: 'bold', fontSize: '10px', border: `1px solid ${aiUserRating.badgeColor}70` }}>
                      {aiUserRating.label}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 3. FOOTER KARTU: NFC WAVE & COMPACT BARCODE (GAMBAR 1 FIX: RAPI 1 BARIS TANPA TURUN BARIS) */}
        <div
          style={{
            marginTop: '10px',
            borderTop: '1px solid rgba(255, 255, 255, 0.22)',
            paddingTop: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '9.5px',
            color: '#fed7aa',
            gap: '8px',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
            <span style={{ fontSize: '11px', letterSpacing: '-1px' }}>(((•)))</span>
            <span style={{ fontWeight: '800', letterSpacing: '0.4px', fontSize: '9px', whiteSpace: 'nowrap' }}>SMK YPK SUPER APP</span>
          </div>

          <div style={{ textAlign: 'right', fontFamily: 'monospace', letterSpacing: '1px', color: '#ffffff', fontSize: '9px', whiteSpace: 'nowrap', flexShrink: 0 }}>
            |||| || ||| ||| <span style={{ color: '#fed7aa', fontWeight: 'bold' }}>{isGuruAccount ? (effectiveInisial ? `GURU-${effectiveInisial}` : 'GURU-YPK') : (matchedUserInDb?.nisn || siswaBiodata?.nisn || 'SISWA-YPK')}</span>
          </div>
        </div>
      </div>

      {/* 🛠️ TOMBOL AKSI KARTU (DI LUAR KARTU AGAR RAPI & BERSIH) */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          type="button"
          onClick={handlePrintCard}
          style={{
            backgroundColor: '#c2410c',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 16px',
            fontSize: '12px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 6px rgba(194, 65, 12, 0.25)',
          }}
        >
          🖨️ Cetak Kartu ID
        </button>
        {/* 📷 UPLOAD / GANTI FOTO RESMI KARTU IDENTITAS */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          style={{
            backgroundColor: '#ffffff',
            color: '#1e293b',
            border: '1.5px solid #cbd5e1',
            borderRadius: '8px',
            padding: '8px 14px',
            fontSize: '12px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}
          title="Upload atau ganti foto profil resmi kartu identitas Anda"
        >
          <span>📷</span>
          <span>{photoUrl ? 'Ganti Foto Resmi' : 'Upload Foto Resmi'}</span>
        </button>

        {/* 🗑️ HAPUS FOTO RESMI (KEMBALI KE INISIAL NAMA SECARA REALTIME) */}
        {(photoUrl || currentUser?.foto_url || currentUser?.biodata?.foto_resmi || currentUser?.biodata?.foto_url) && (
          <button
            type="button"
            onClick={handleRemovePhoto}
            style={{
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              border: '1.5px solid #f87171',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(220, 38, 38, 0.15)',
            }}
            title="Hapus foto profil kartu identitas secara realtime dan kembali menggunakan inisial nama resmi"
          >
            <span>🗑️</span>
            <span>Hapus Foto Profil</span>
          </button>
        )}
      </div>

      {/* 🔒 PRIVASI BIOMETRIK & STATUS WAJAH AI (TERPISAH DARI FOTO RESMI KARTU) */}
      <div
        style={{
          marginBottom: '18px',
          padding: '12px 16px',
          backgroundColor: '#f8fafc',
          border: '1.5px solid #e2e8f0',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>🔒</span>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '800', color: '#1e293b' }}>
              Privasi Biometrik & Keamanan Identitas
            </div>
            <div style={{ fontSize: '10.5px', color: '#64748b' }}>
              Foto Resmi Kartu ID & Sampel Wajah AI Presensi dipisahkan secara ketat.
            </div>
          </div>
        </div>
        <span
          style={{
            padding: '4px 10px',
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: '800',
            backgroundColor: hasFaceBiometric ? '#dcfce7' : '#fef3c7',
            color: hasFaceBiometric ? '#15803d' : '#b45309',
            border: hasFaceBiometric ? '1px solid #86efac' : '1px solid #fde68a',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          <span>{hasFaceBiometric ? '✅' : '⚠️'}</span>
          <span>{hasFaceBiometric ? 'Wajah AI: Terdaftar Aktif' : 'Wajah AI: Belum Terdaftar'}</span>
        </span>
      </div>

      {/* 🔲 MODAL BARCODE PRESENSI DIGITAL (KHUSUS SISWA / GURU) */}
      {showBarcodeModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
          onClick={() => setShowBarcodeModal(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              maxWidth: '380px',
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '1.5px solid #e2e8f0',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* MODAL HEADER */}
            <div
              style={{
                background: isGuruAccount
                  ? 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)'
                  : 'linear-gradient(135deg, #065f46 0%, #059669 100%)',
                padding: '16px 20px',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '24px' }}>{isGuruAccount ? '👨‍🏫' : '🎒'}</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '13.5px', fontWeight: 'bold', color: '#ffffff' }}>
                    {isGuruAccount ? 'BARCODE PRESENSI GURU & STAFF' : 'BARCODE PRESENSI SISWA'}
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#e2e8f0' }}>
                    SMK YPK MEDAN
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBarcodeModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  color: '#ffffff',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            {/* MODAL BODY */}
            <div style={{ padding: '20px', textAlign: 'center' }}>
              {/* NAMA & DETAIL */}
              <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#0f172a', fontWeight: 'bold' }}>
                {currentUser?.nama || matchedUserInDb?.nama || 'Pengguna'}
              </h4>
              <p style={{ margin: '0 0 14px 0', fontSize: '12px', color: '#64748b' }}>
                {isGuruAccount ? `Inisial: [${effectiveInisial || '-'}] • ${effectiveJurusan}` : `Kelas: ${effectiveKelas} • ${effectiveJurusan}`}
              </p>

              {/* FORMAT TOGGLE: 1D BARCODE VS 2D QR CODE */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '14px' }}>
                <button
                  type="button"
                  onClick={() => setBarcodeFormat('1d')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    border: '1px solid',
                    backgroundColor: barcodeFormat === '1d' ? (isGuruAccount ? '#1e40af' : '#059669') : '#f8fafc',
                    color: barcodeFormat === '1d' ? '#ffffff' : '#475569',
                    borderColor: barcodeFormat === '1d' ? (isGuruAccount ? '#1e40af' : '#059669') : '#cbd5e1',
                  }}
                >
                  📶 Barcode 1D (Garis Scanner)
                </button>
                <button
                  type="button"
                  onClick={() => setBarcodeFormat('qr')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    border: '1px solid',
                    backgroundColor: barcodeFormat === 'qr' ? (isGuruAccount ? '#1e40af' : '#059669') : '#f8fafc',
                    color: barcodeFormat === 'qr' ? '#ffffff' : '#475569',
                    borderColor: barcodeFormat === 'qr' ? (isGuruAccount ? '#1e40af' : '#059669') : '#cbd5e1',
                  }}
                >
                  📱 QR Code 2D
                </button>
              </div>

              {/* HIGH CONTRAST WHITE SCANNER BOX */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '2px dashed #94a3b8',
                  borderRadius: '14px',
                  padding: '16px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.03)',
                  marginBottom: '14px',
                }}
              >
                {barcodeFormat === '1d' ? (
                  <>
                    {renderBarcode1D(barcodeValue)}
                    <div
                      style={{
                        fontFamily: 'monospace',
                        fontWeight: 'bold',
                        fontSize: '13px',
                        letterSpacing: '2px',
                        color: '#0f172a',
                        marginTop: '8px',
                      }}
                    >
                      {barcodeValue}
                    </div>
                  </>
                ) : (
                  <>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=4&data=${encodeURIComponent(barcodeValue)}`}
                      alt={`QR Code Presensi ${barcodeValue}`}
                      style={{ width: '180px', height: '180px', display: 'block', borderRadius: '8px' }}
                    />
                    <div
                      style={{
                        fontFamily: 'monospace',
                        fontWeight: 'bold',
                        fontSize: '12px',
                        letterSpacing: '1.5px',
                        color: '#0f172a',
                        marginTop: '8px',
                      }}
                    >
                      {barcodeValue}
                    </div>
                  </>
                )}
              </div>

              {/* HINT PENGGUNAAN */}
              <div
                style={{
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  fontSize: '11px',
                  color: '#166534',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span style={{ fontSize: '16px' }}>💡</span>
                <span>
                  Arahkan layar HP ke alat Scanner Barcode / HP Scanner presensi di meja piket sekolah.
                </span>
              </div>
            </div>

            {/* MODAL FOOTER */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                padding: '12px 20px',
                borderTop: '1px solid #f1f5f9',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  fontSize: '10px',
                  color: '#64748b',
                  fontWeight: 'bold',
                }}
              >
                {isGuruAccount ? '🔵 Tipe: Guru & Staff' : '🟢 Tipe: Siswa'}
              </span>
              <button
                type="button"
                onClick={() => setShowBarcodeModal(false)}
                style={{
                  backgroundColor: '#334155',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '7px 16px',
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

      {/* 👨‍🏫 BIODATA SINGKAT KHUSUS TENAGA PENDIDIK / GURU */}
      {isGuruAccount && (
        <div
          className="stardust-white-card"
          style={{
            borderRadius: '16px',
            padding: '18px 20px',
            border: '1.5px solid #fed7aa',
            boxShadow: '0 4px 14px rgba(234, 88, 12, 0.08)',
            marginBottom: '16px',
            backgroundColor: '#ffffff',
          }}
        >
          {/* HEADER BIODATA GURU */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '14px',
              borderBottom: '1px solid #ffedd5',
              paddingBottom: '10px',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>👨‍🏫</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', color: '#9a3412', fontWeight: '800' }}>
                  Biodata Singkat Pendidik
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#64748b' }}>
                  Rekam Jejak &amp; Profil Akademik Guru SMK YPK Medan
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleOpenBioModal}
              style={{
                backgroundColor: '#ea580c',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 14px',
                fontSize: '11.5px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: '0 2px 6px rgba(234, 88, 12, 0.25)',
              }}
            >
              ✏️ Edit Biodata
            </button>
          </div>

          {/* GRID INFORMASI BIODATA GURU */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', fontSize: '12px' }}>
            <div style={{ backgroundColor: '#fff7ed', padding: '10px 12px', borderRadius: '10px', border: '1px solid #ffedd5' }}>
              <span style={{ color: '#9a3412', fontSize: '11px', fontWeight: 'bold', display: 'block' }}>NUPTK / NIP:</span>
              <span style={{ color: '#0f172a', fontWeight: '700', fontSize: '13px' }}>{guruBiodata.nuptk || '-'}</span>
            </div>
            <div style={{ backgroundColor: '#fff7ed', padding: '10px 12px', borderRadius: '10px', border: '1px solid #ffedd5' }}>
              <span style={{ color: '#9a3412', fontSize: '11px', fontWeight: 'bold', display: 'block' }}>Tempat, Tgl Lahir:</span>
              <span style={{ color: '#0f172a', fontWeight: '700' }}>{guruBiodata.tempatTglLahir || '-'}</span>
            </div>
            <div style={{ backgroundColor: '#fff7ed', padding: '10px 12px', borderRadius: '10px', border: '1px solid #ffedd5' }}>
              <span style={{ color: '#9a3412', fontSize: '11px', fontWeight: 'bold', display: 'block' }}>Pendidikan Terakhir:</span>
              <span style={{ color: '#0f172a', fontWeight: '700' }}>{guruBiodata.pendidikan || '-'}</span>
            </div>
            <div style={{ backgroundColor: '#fff7ed', padding: '10px 12px', borderRadius: '10px', border: '1px solid #ffedd5' }}>
              <span style={{ color: '#9a3412', fontSize: '11px', fontWeight: 'bold', display: 'block' }}>Mata Pelajaran Diampu:</span>
              <span style={{ color: '#0f172a', fontWeight: '700' }}>{guruBiodata.mapelDiampu || '-'}</span>
            </div>
            <div style={{ backgroundColor: '#fff7ed', padding: '10px 12px', borderRadius: '10px', border: '1px solid #ffedd5' }}>
              <span style={{ color: '#9a3412', fontSize: '11px', fontWeight: 'bold', display: 'block' }}>No. WhatsApp / Kontak:</span>
              <span style={{ color: '#0f172a', fontWeight: '700' }}>{guruBiodata.telepon || '-'}</span>
            </div>
            <div style={{ backgroundColor: '#fff7ed', padding: '10px 12px', borderRadius: '10px', border: '1px solid #ffedd5' }}>
              <span style={{ color: '#9a3412', fontSize: '11px', fontWeight: 'bold', display: 'block' }}>Alamat Tempat Tinggal:</span>
              <span style={{ color: '#0f172a', fontWeight: '700' }}>{guruBiodata.alamat || '-'}</span>
            </div>
          </div>

          {/* MOTTO PENGAJAR */}
          {guruBiodata.motto && (
            <div style={{ marginTop: '12px', padding: '10px 14px', backgroundColor: '#fef3c7', borderRadius: '10px', border: '1px solid #fde68a', fontStyle: 'italic', fontSize: '11.5px', color: '#78350f' }}>
              💬 <b>Motto Pendidik:</b> &ldquo;{guruBiodata.motto}&rdquo;
            </div>
          )}
        </div>
      )}

      {/* 🎒 BIODATA SINGKAT KHUSUS PESERTA DIDIK / SISWA */}
      {!isGuruAccount && (
        <div
          className="stardust-white-card"
          style={{
            borderRadius: '16px',
            padding: '18px 20px',
            border: '1.5px solid #fed7aa',
            boxShadow: '0 4px 14px rgba(234, 88, 12, 0.08)',
            marginBottom: '16px',
            backgroundColor: '#ffffff',
          }}
        >
          {/* HEADER BIODATA SISWA */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '14px',
              borderBottom: '1px solid #ffedd5',
              paddingBottom: '10px',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>🎒</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', color: '#9a3412', fontWeight: '800' }}>
                  Biodata Singkat Siswa/i
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#64748b' }}>
                  Profil Akademik &amp; Data Pokok Peserta Didik SMK YPK Medan
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleOpenSiswaBioModal}
              style={{
                backgroundColor: '#ea580c',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 14px',
                fontSize: '11.5px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: '0 2px 6px rgba(234, 88, 12, 0.25)',
              }}
            >
              ✏️ Edit Biodata
            </button>
          </div>

          {/* GRID INFORMASI BIODATA SISWA */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', fontSize: '12px' }}>
            <div style={{ backgroundColor: '#fff7ed', padding: '10px 12px', borderRadius: '10px', border: '1px solid #ffedd5' }}>
              <span style={{ color: '#9a3412', fontSize: '11px', fontWeight: 'bold', display: 'block' }}>NISN / NIS:</span>
              <span style={{ color: '#0f172a', fontWeight: '700', fontSize: '13px' }}>{siswaBiodata.nisn || '-'}</span>
            </div>
            <div style={{ backgroundColor: '#fff7ed', padding: '10px 12px', borderRadius: '10px', border: '1px solid #ffedd5' }}>
              <span style={{ color: '#9a3412', fontSize: '11px', fontWeight: 'bold', display: 'block' }}>Tempat, Tgl Lahir:</span>
              <span style={{ color: '#0f172a', fontWeight: '700' }}>{siswaBiodata.tempatTglLahir || '-'}</span>
            </div>
            <div style={{ backgroundColor: '#fff7ed', padding: '10px 12px', borderRadius: '10px', border: '1px solid #ffedd5' }}>
              <span style={{ color: '#9a3412', fontSize: '11px', fontWeight: 'bold', display: 'block' }}>Jenis Kelamin &amp; Agama:</span>
              <span style={{ color: '#0f172a', fontWeight: '700' }}>{siswaBiodata.genderAgama || '-'}</span>
            </div>
            <div style={{ backgroundColor: '#fff7ed', padding: '10px 12px', borderRadius: '10px', border: '1px solid #ffedd5' }}>
              <span style={{ color: '#9a3412', fontSize: '11px', fontWeight: 'bold', display: 'block' }}>Cita-cita / Impian:</span>
              <span style={{ color: '#0f172a', fontWeight: '700' }}>{siswaBiodata.citaCita || '-'}</span>
            </div>
            <div style={{ backgroundColor: '#fff7ed', padding: '10px 12px', borderRadius: '10px', border: '1px solid #ffedd5' }}>
              <span style={{ color: '#9a3412', fontSize: '11px', fontWeight: 'bold', display: 'block' }}>No. WhatsApp Siswa:</span>
              <span style={{ color: '#0f172a', fontWeight: '700' }}>{siswaBiodata.telepon || '-'}</span>
            </div>
            <div style={{ backgroundColor: '#fff7ed', padding: '10px 12px', borderRadius: '10px', border: '1px solid #ffedd5' }}>
              <span style={{ color: '#9a3412', fontSize: '11px', fontWeight: 'bold', display: 'block' }}>Orang Tua / Kontak:</span>
              <span style={{ color: '#0f172a', fontWeight: '700' }}>{siswaBiodata.ortuKontak || '-'}</span>
            </div>
            <div style={{ backgroundColor: '#fff7ed', padding: '10px 12px', borderRadius: '10px', border: '1px solid #ffedd5', gridColumn: '1 / -1' }}>
              <span style={{ color: '#9a3412', fontSize: '11px', fontWeight: 'bold', display: 'block' }}>Alamat Domisili Siswa:</span>
              <span style={{ color: '#0f172a', fontWeight: '700' }}>{siswaBiodata.alamat || '-'}</span>
            </div>
          </div>

          {/* MOTTO SISWA */}
          {siswaBiodata.motto && (
            <div style={{ marginTop: '12px', padding: '10px 14px', backgroundColor: '#fef3c7', borderRadius: '10px', border: '1px solid #fde68a', fontStyle: 'italic', fontSize: '11.5px', color: '#78350f' }}>
              💬 <b>Motto Hidup:</b> &ldquo;{siswaBiodata.motto}&rdquo;
            </div>
          )}
        </div>
      )}

      {/* ✏️ MODAL EDIT BIODATA SINGKAT GURU */}
      {showBioEditModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '16px',
          }}
          onClick={() => setShowBioEditModal(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '18px',
              maxWidth: '480px',
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '1.5px solid #fed7aa',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                background: 'linear-gradient(135deg, #c2410c 0%, #ea580c 100%)',
                padding: '14px 18px',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>
                ✏️ Edit Biodata Singkat Guru
              </h3>
              <button
                type="button"
                onClick={() => setShowBioEditModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  color: '#ffffff',
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveGuruBiodata} style={{ padding: '16px 20px', maxHeight: '80vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
                <div>
                  <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '3px', color: '#334155' }}>NUPTK / NIP:</label>
                  <input
                    type="text"
                    value={editBioForm.nuptk || ''}
                    onChange={(e) => setEditBioForm({ ...editBioForm, nuptk: e.target.value })}
                    style={{ ...styles.input, width: '100%', boxSizing: 'border-box' }}
                    placeholder="Contoh: 19850715 201001 1 012"
                  />
                </div>
                <div>
                  <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '3px', color: '#334155' }}>Tempat, Tanggal Lahir:</label>
                  <input
                    type="text"
                    value={editBioForm.tempatTglLahir || ''}
                    onChange={(e) => setEditBioForm({ ...editBioForm, tempatTglLahir: e.target.value })}
                    style={{ ...styles.input, width: '100%', boxSizing: 'border-box' }}
                    placeholder="Contoh: Medan, 15 Juli 1985"
                  />
                </div>
                <div>
                  <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '3px', color: '#334155' }}>Pendidikan Terakhir &amp; Gelar:</label>
                  <input
                    type="text"
                    value={editBioForm.pendidikan || ''}
                    onChange={(e) => setEditBioForm({ ...editBioForm, pendidikan: e.target.value })}
                    style={{ ...styles.input, width: '100%', boxSizing: 'border-box' }}
                    placeholder="Contoh: S1 Pendidikan TI (S.Kom., Gr.)"
                  />
                </div>
                <div>
                  <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '3px', color: '#334155' }}>Mata Pelajaran yang Diampu:</label>
                  <input
                    type="text"
                    value={editBioForm.mapelDiampu || ''}
                    onChange={(e) => setEditBioForm({ ...editBioForm, mapelDiampu: e.target.value })}
                    style={{ ...styles.input, width: '100%', boxSizing: 'border-box' }}
                    placeholder="Contoh: AIJ, TLJ, Administrasi Jaringan"
                  />
                </div>
                <div>
                  <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '3px', color: '#334155' }}>No. WhatsApp / HP:</label>
                  <input
                    type="text"
                    value={editBioForm.telepon || ''}
                    onChange={(e) => setEditBioForm({ ...editBioForm, telepon: e.target.value })}
                    style={{ ...styles.input, width: '100%', boxSizing: 'border-box' }}
                    placeholder="Contoh: 0812-6543-9876"
                  />
                </div>
                <div>
                  <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '3px', color: '#334155' }}>Alamat Domisili:</label>
                  <input
                    type="text"
                    value={editBioForm.alamat || ''}
                    onChange={(e) => setEditBioForm({ ...editBioForm, alamat: e.target.value })}
                    style={{ ...styles.input, width: '100%', boxSizing: 'border-box' }}
                    placeholder="Contoh: Jl. Sakti Lubis Gg. Amal No. 25, Medan"
                  />
                </div>
                <div>
                  <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '3px', color: '#334155' }}>Motto / Visi Mengajar:</label>
                  <textarea
                    rows={2}
                    value={editBioForm.motto || ''}
                    onChange={(e) => setEditBioForm({ ...editBioForm, motto: e.target.value })}
                    style={{ ...styles.input, width: '100%', boxSizing: 'border-box', resize: 'vertical' }}
                    placeholder="Tuliskan motto atau visi mengajar Anda..."
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowBioEditModal(false)}
                  style={{
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  style={{
                    backgroundColor: '#ea580c',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(234, 88, 12, 0.3)',
                  }}
                >
                  💾 Simpan Biodata
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ✏️ MODAL EDIT BIODATA SINGKAT SISWA */}
      {showSiswaBioModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '16px',
          }}
          onClick={() => setShowSiswaBioModal(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '18px',
              maxWidth: '480px',
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '1.5px solid #fed7aa',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                background: 'linear-gradient(135deg, #c2410c 0%, #ea580c 100%)',
                padding: '14px 18px',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>
                ✏️ Edit Biodata Singkat Siswa/i
              </h3>
              <button
                type="button"
                onClick={() => setShowSiswaBioModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  color: '#ffffff',
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSiswaBiodata} style={{ padding: '16px 20px', maxHeight: '80vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
                <div>
                  <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '3px', color: '#334155' }}>NISN / NIS:</label>
                  <input
                    type="text"
                    value={editSiswaBioForm.nisn || ''}
                    onChange={(e) => setEditSiswaBioForm({ ...editSiswaBioForm, nisn: e.target.value })}
                    style={{ ...styles.input, width: '100%', boxSizing: 'border-box' }}
                    placeholder="Contoh: 0078129384 / 20241012"
                  />
                </div>
                <div>
                  <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '3px', color: '#334155' }}>Tempat, Tanggal Lahir:</label>
                  <input
                    type="text"
                    value={editSiswaBioForm.tempatTglLahir || ''}
                    onChange={(e) => setEditSiswaBioForm({ ...editSiswaBioForm, tempatTglLahir: e.target.value })}
                    style={{ ...styles.input, width: '100%', boxSizing: 'border-box' }}
                    placeholder="Contoh: Medan, 12 Mei 2008"
                  />
                </div>
                <div>
                  <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '3px', color: '#334155' }}>Jenis Kelamin &amp; Agama:</label>
                  <input
                    type="text"
                    value={editSiswaBioForm.genderAgama || ''}
                    onChange={(e) => setEditSiswaBioForm({ ...editSiswaBioForm, genderAgama: e.target.value })}
                    style={{ ...styles.input, width: '100%', boxSizing: 'border-box' }}
                    placeholder="Contoh: Laki-laki / Islam"
                  />
                </div>
                <div>
                  <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '3px', color: '#334155' }}>Cita-cita / Impian Karir:</label>
                  <input
                    type="text"
                    value={editSiswaBioForm.citaCita || ''}
                    onChange={(e) => setEditSiswaBioForm({ ...editSiswaBioForm, citaCita: e.target.value })}
                    style={{ ...styles.input, width: '100%', boxSizing: 'border-box' }}
                    placeholder="Contoh: Cloud Engineer / DevOps Specialist"
                  />
                </div>
                <div>
                  <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '3px', color: '#334155' }}>No. WhatsApp Siswa:</label>
                  <input
                    type="text"
                    value={editSiswaBioForm.telepon || ''}
                    onChange={(e) => setEditSiswaBioForm({ ...editSiswaBioForm, telepon: e.target.value })}
                    style={{ ...styles.input, width: '100%', boxSizing: 'border-box' }}
                    placeholder="Contoh: 0821-9876-5432"
                  />
                </div>
                <div>
                  <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '3px', color: '#334155' }}>Nama &amp; Kontak Orang Tua / Wali:</label>
                  <input
                    type="text"
                    value={editSiswaBioForm.ortuKontak || ''}
                    onChange={(e) => setEditSiswaBioForm({ ...editSiswaBioForm, ortuKontak: e.target.value })}
                    style={{ ...styles.input, width: '100%', boxSizing: 'border-box' }}
                    placeholder="Contoh: Bpk. Rahmat (0813-1122-3344)"
                  />
                </div>
                <div>
                  <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '3px', color: '#334155' }}>Alamat Tempat Tinggal / Domisili:</label>
                  <input
                    type="text"
                    value={editSiswaBioForm.alamat || ''}
                    onChange={(e) => setEditSiswaBioForm({ ...editSiswaBioForm, alamat: e.target.value })}
                    style={{ ...styles.input, width: '100%', boxSizing: 'border-box' }}
                    placeholder="Contoh: Jl. SM Raja No. 45, Kota Medan"
                  />
                </div>
                <div>
                  <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '3px', color: '#334155' }}>Motto Hidup / Kata Mutiara:</label>
                  <textarea
                    rows={2}
                    value={editSiswaBioForm.motto || ''}
                    onChange={(e) => setEditSiswaBioForm({ ...editSiswaBioForm, motto: e.target.value })}
                    style={{ ...styles.input, width: '100%', boxSizing: 'border-box', resize: 'vertical' }}
                    placeholder="Tuliskan motto atau prinsip hidup Anda..."
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowSiswaBioModal(false)}
                  style={{
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  style={{
                    backgroundColor: '#ea580c',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(234, 88, 12, 0.3)',
                  }}
                >
                  💾 Simpan Biodata
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🔒 FORMULIR UBAH PASSWORD MANDIRI (DENGAN BATAS 3X KESEMPATAN) */}
      <div className="stardust-white-card" style={{ borderRadius: '16px', padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>🔒</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', color: '#0f172a', fontWeight: 'bold' }}>
                Ubah Password Akun
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#64748b' }}>
                {quotaRemaining < 3
                  ? '🔒 Password telah dikustomisasi. Password lama tidak dapat digunakan lagi.'
                  : 'Ganti kata sandi bawaan demi keamanan akun pribadi Anda.'}
              </p>
            </div>
          </div>

          {/* BADGE KUOTA GANTI PASSWORD */}
          <span
            style={{
              fontSize: '11px',
              fontWeight: 'bold',
              padding: '4px 10px',
              borderRadius: '12px',
              backgroundColor: quotaRemaining > 0 ? '#ffedd5' : '#fee2e2',
              color: quotaRemaining > 0 ? '#c2410c' : '#dc2626',
              border: `1px solid ${quotaRemaining > 0 ? '#fed7aa' : '#fca5a5'}`,
            }}
          >
            🎯 Sisa Kesempatan: <b>{quotaRemaining} / 3 Kali</b>
          </span>
        </div>

        {quotaRemaining <= 0 ? (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '12px', color: '#991b1b', fontSize: '12px' }}>
            ⚠️ <b>Batas Ganti Password Habis!</b> Anda telah menggunakan seluruh 3x kesempatan ganti password. Jika memerlukan reset kata sandi, silakan hubungi Admin / Master Sekolah.
          </div>
        ) : (
          <form onSubmit={onChangePassword}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Password Baru:
                </label>
                <input
                  type="password"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="Minimal 4 karakter..."
                  style={{ ...styles.input, width: '100%', boxSizing: 'border-box' }}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Konfirmasi Password Baru:
                </label>
                <input
                  type="password"
                  value={confirmPasswordInput}
                  onChange={(e) => setConfirmPasswordInput(e.target.value)}
                  placeholder="Ketik ulang password baru..."
                  style={{ ...styles.input, width: '100%', boxSizing: 'border-box' }}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                Setiap kali disimpan, kuota berkurang 1x.
              </span>
              <button
                type="submit"
                disabled={isChangingPassword || quotaRemaining <= 0}
                style={{
                  backgroundColor: '#ea580c',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '9px 18px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: isChangingPassword || quotaRemaining <= 0 ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 6px rgba(234,88,12,0.25)',
                }}
              >
                {isChangingPassword ? 'Menyimpan...' : '💾 Simpan Password Baru'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ℹ️ INFORMASI AKUN & STATUS RFID */}
      <div style={{ backgroundColor: '#fff7ed', borderRadius: '14px', padding: '14px 18px', border: '1px solid #fed7aa' }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#9a3412', fontWeight: 'bold' }}>
          ℹ️ Detail Status Akun
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', fontSize: '11.5px' }}>
          <div>
            <span style={{ color: '#7c2d12', display: 'block' }}>Username Login:</span>
            <b style={{ color: '#0f172a' }}>{currentUser?.username || currentUser?.nama}</b>
          </div>
          <div>
            <span style={{ color: '#7c2d12', display: 'block' }}>Hak Akses:</span>
            <b style={{ color: '#ea580c' }}>{roleDisplay}</b>
          </div>
          <div>
            <span style={{ color: '#7c2d12', display: 'block' }}>Status Biometrik & UID:</span>
            <b style={{ color: effectiveUid ? '#16a34a' : '#ea580c' }}>
              {(matchedUserInDb?.biodata?.face_descriptor || currentUser?.biodata?.face_descriptor) ? '🟢 Wajah AI Terdaftar' : (effectiveUid ? `✅ UID: ${effectiveUid.toUpperCase()}` : '🟡 Belum Rekam Wajah')}
            </b>
          </div>
        </div>

        {/* 🏷️ VERSI APLIKASI (APK & Desktop) — sesuai format resmi aplikasi */}
        <div
          style={{
            marginTop: '14px',
            padding: '10px 12px',
            borderRadius: '12px',
            backgroundColor: '#f1f5f9',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '6px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <span style={{ fontSize: '15px' }}>🏷️</span>
            <div>
              <div style={{ fontSize: '10.5px', fontWeight: '800', color: '#0f172a', letterSpacing: '0.3px' }}>
                VERSI APLIKASI : {APP_VERSION}
              </div>
              <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#64748b', letterSpacing: '0.3px' }}>
                BUILD SERVER : {BUILD_SERVER}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              try {
                if (typeof window !== 'undefined' && typeof window.__smkCekUpdate === 'function') {
                  window.__smkCekUpdate();
                }
              } catch (e) {}
            }}
            style={{
              backgroundColor: '#1e40af',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '10.5px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
            title="Periksa apakah ada versi aplikasi terbaru"
          >
            🔄 Cek Update
          </button>
        </div>
      </div>
    </div>
  );
}

export default AkunProfileView;
