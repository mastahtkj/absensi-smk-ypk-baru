'use client';

import React, { useState, useRef } from 'react';

export default function PublicProfileModal({
  isOpen,
  onClose,
  targetUser,
  siswaList = [],
  currentUser,
  onlineUsersMap = {},
}) {
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [barcodeFormat, setBarcodeFormat] = useState('1d');

  // Keyboard Escape listener untuk menutup modal
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !targetUser) return null;

  const isGuruAccount = Boolean(
    targetUser.isGuru ||
    String(targetUser.id || '').startsWith('GURU-') ||
    targetUser.role === 'guru' ||
    targetUser.role === 'admin'
  );

  // Cari data lengkap di master list siswaList
  const matchedUserInDb = (siswaList || []).find((s) => {
    if (isGuruAccount) {
      return (
        s.isGuru &&
        (s.rawId === targetUser.rawId ||
          String(s.id) === String(targetUser.id) ||
          s.nama?.trim().toLowerCase() === targetUser.nama?.trim().toLowerCase())
      );
    }
    return (
      !s.isGuru &&
      (s.rawId === targetUser.rawId ||
        String(s.id) === String(targetUser.id) ||
        s.nama?.trim().toLowerCase() === targetUser.nama?.trim().toLowerCase())
    );
  });

  const effectiveNama = targetUser.nama || matchedUserInDb?.nama || 'Pengguna';
  const effectiveUid =
    targetUser.rfid_uid ||
    targetUser.uid_rfid ||
    targetUser.rfid ||
    matchedUserInDb?.rfid_uid ||
    matchedUserInDb?.uid_rfid ||
    '';

  const effectiveKelas = targetUser.kelas || matchedUserInDb?.kelas || (isGuruAccount ? 'Guru / Staff' : '-');
  const effectiveJurusan = targetUser.jurusan || matchedUserInDb?.jurusan || (isGuruAccount ? 'Guru / Staff' : '-');

  const effectiveInisial =
    targetUser.inisial ||
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

  const isStudentAdmin = Boolean(
    String(targetUser.role || '').toLowerCase().includes('siswa_admin') ||
    (String(targetUser.id).startsWith('SISWA-') && String(targetUser.role || '').toLowerCase().includes('admin'))
  );

  const roleDisplay = isStudentAdmin
    ? `Siswa/i Admin [${effectiveKelas}]`
    : targetUser.role === 'master' || targetUser.username?.toLowerCase() === 'iqbal' || effectiveNama.toLowerCase().includes('iqbal')
    ? 'Admin / Master Sekolah'
    : isGuruAccount
    ? 'Guru / Tenaga Pengajar'
    : 'Siswa/i SMK YPK';

  const userInitial = effectiveNama.charAt(0).toUpperCase();

  // 📸 Resolusi Foto (Database + LocalStorage Cache)
  const userPrefix = isGuruAccount ? 'GURU-' : 'SISWA-';
  const myScopedId = `${userPrefix}${targetUser.rawId || targetUser.id}`;
  const cachedPhoto =
    typeof window !== 'undefined'
      ? localStorage.getItem(`user_photo_${myScopedId}`) ||
        localStorage.getItem(`user_photo_${targetUser.id}`) ||
        localStorage.getItem(`user_photo_${effectiveNama.trim()}`) ||
        ''
      : '';

  // 📋 Resolusi Biodata Terkini dari Database
  const dbBiodata = targetUser.biodata || matchedUserInDb?.biodata;
  let parsedBio = {};
  if (dbBiodata && typeof dbBiodata === 'object') {
    parsedBio = dbBiodata;
  } else if (typeof dbBiodata === 'string') {
    try {
      parsedBio = JSON.parse(dbBiodata);
    } catch (e) {}
  }

  // Cek cache localStorage jika belum ada di database
  if (Object.keys(parsedBio).length === 0 && typeof window !== 'undefined') {
    const userKey = String(targetUser.rawId || targetUser.id || targetUser.username || 'user');
    const localKey = isGuruAccount ? `guru_biodata_${userKey}` : `siswa_biodata_${userKey}`;
    try {
      const saved = localStorage.getItem(localKey);
      if (saved) parsedBio = JSON.parse(saved);
    } catch (e) {}
  }

  const photoUrl = targetUser.foto_url || matchedUserInDb?.foto_url || parsedBio.foto_url || cachedPhoto || '';

  // Default Biodata Guru (Lengkap & Realtime)
  const guruBio = {
    nuptk: parsedBio.nuptk || matchedUserInDb?.nuptk || targetUser.nuptk || (effectiveNama.toLowerCase().includes('iqbal') ? '19850715 201001 1 012' : '-'),
    nip: parsedBio.nip || matchedUserInDb?.nip || targetUser.nip || (effectiveNama.toLowerCase().includes('iqbal') ? '19850715 201001 1 012' : '-'),
    tempatTglLahir: parsedBio.tempatTglLahir || (effectiveNama.toLowerCase().includes('iqbal') ? 'Medan, 15 Juli 1985' : '-'),
    pendidikan: parsedBio.pendidikan || (effectiveNama.toLowerCase().includes('iqbal') ? 'S1 Pendidikan Teknologi Informasi (S.Kom., Gr.)' : 'Sarjana Pendidikan (S.Pd.)'),
    mapelDiampu: parsedBio.mapelDiampu || matchedUserInDb?.mapel || targetUser.mapel || (effectiveNama.toLowerCase().includes('iqbal') ? 'Administrasi Infrastruktur Jaringan (AIJ), TLJ, PKK' : 'Mata Pelajaran Kejuruan'),
    telepon: parsedBio.telepon || matchedUserInDb?.telepon || targetUser.telepon || (effectiveNama.toLowerCase().includes('iqbal') ? '0812-6543-9876' : '-'),
    alamat: parsedBio.alamat || matchedUserInDb?.alamat || targetUser.alamat || (effectiveNama.toLowerCase().includes('iqbal') ? 'Jl. Sakti Lubis Gg. Amal No. 25, Medan Amplas, Kota Medan' : 'Kota Medan, Sumatera Utara'),
    motto: parsedBio.motto || (effectiveNama.toLowerCase().includes('iqbal') ? 'Mendidik dengan keteladanan hati, membentuk generasi vokasi unggul dan berakhlak mulia.' : 'Mendidik dan membimbing siswa menuju masa depan gemilang.'),
  };

  // Default Biodata Siswa (Lengkap & Realtime)
  const siswaBio = {
    nisn: parsedBio.nisn || matchedUserInDb?.nisn || targetUser.nisn || '0078129384 / 20241012',
    tempatTglLahir: parsedBio.tempatTglLahir || 'Medan, 12 Mei 2008',
    genderAgama: parsedBio.genderAgama || 'Laki-laki / Islam',
    citaCita: parsedBio.citaCita || 'Network Engineer / Cloud IT Support',
    telepon: parsedBio.telepon || matchedUserInDb?.telepon || targetUser.telepon || '0821-9876-5432',
    alamat: parsedBio.alamat || matchedUserInDb?.alamat || targetUser.alamat || 'Jl. SM Raja No. 45, Kota Medan',
    ortuKontak: parsedBio.ortuKontak || 'Bpk. Rahmat (0813-1122-3344)',
    motto: parsedBio.motto || 'Disiplin dan tekun hari ini adalah kunci sukses masa depan.',
  };

  // Status Online
  const isOnline = Boolean(targetUser.isOnline);
  const preciseStatus = targetUser.lastSeen || (isOnline ? '🟢 Aktif sekarang' : '⚪ Offline');
  const onlineDurationText = targetUser.onlineDurationText || '';
  const onlineActivity = targetUser.activity || (isOnline ? '🌐 Aktif di Portal' : 'Offline');

  // Vector Barcode 1D
  const barcodeValue = (
    effectiveUid ||
    (isGuruAccount ? `GURU-${targetUser.id || '01'}` : `SIS-${targetUser.id || '01'}`)
  ).toUpperCase();

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
    const height = 65;
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
        style={{ width: '100%', maxWidth: '260px', height: `${height}px`, display: 'block', margin: '0 auto' }}
      >
        <rect x="0" y="0" width={totalWidth} height={height} fill="#ffffff" />
        {rects}
      </svg>
    );
  };

  const handlePrintCard = () => {
    const cardEl = document.getElementById(`digital-id-card-public-${targetUser.id}`);
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
          <title>Cetak Kartu ID - ${effectiveNama}</title>
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
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 999999,
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
        className="stardust-white-card"
        style={{
          borderRadius: '20px',
          width: '100%',
          maxWidth: '520px',
          maxHeight: 'calc(100dvh - 36px)',
          margin: 'auto 0',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
          border: '1.5px solid #fed7aa',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER MODAL */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1c1917 0%, #7c2d12 40%, #c2410c 80%, #ea580c 100%)',
            color: '#ffffff',
            padding: '14px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '22px' }}>{isGuruAccount ? '👨‍🏫' : '🎒'}</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '14.5px', fontWeight: 'bold', color: '#ffffff' }}>
                Profil &amp; Kartu Digital Resmi
              </h3>
              <p style={{ margin: '1px 0 0 0', fontSize: '11px', color: '#fed7aa' }}>
                SMK YPK MEDAN &bull; {isGuruAccount ? 'Pendidik & Tenaga Kependidikan' : 'Peserta Didik'}
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

        {/* SCROLLABLE BODY */}
        <div style={{ padding: '14px 16px', overflowY: 'auto', flex: 1, backgroundColor: '#fafaf9' }}>
          {/* 🪪 1. KARTU IDENTITAS DIGITAL RESMI CR80 */}
          <div
            id={`digital-id-card-public-${targetUser.id}`}
            style={{
              background: 'linear-gradient(135deg, #1c1917 0%, #7c2d12 40%, #c2410c 80%, #ea580c 100%)',
              borderRadius: '20px',
              padding: '16px 18px',
              color: '#ffffff',
              boxShadow: '0 12px 30px rgba(124, 45, 18, 0.3)',
              border: '1.5px solid rgba(254, 215, 170, 0.65)',
              marginBottom: '14px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Watermark Logo */}
            <div
              style={{
                position: 'absolute',
                right: '-15px',
                bottom: '-20px',
                width: '150px',
                height: '150px',
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

            {/* Header Kartu */}
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

              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span
                  style={{
                    backgroundColor: isOnline ? 'rgba(34, 197, 94, 0.25)' : 'rgba(255, 255, 255, 0.22)',
                    color: '#ffffff',
                    border: isOnline ? '1px solid #86efac' : '1px solid #fed7aa',
                    fontSize: '9.5px',
                    fontWeight: '800',
                    padding: '3px 8px',
                    borderRadius: '12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span style={{ fontSize: '7px' }}>{isOnline ? '🟢' : '⚪'}</span> {isOnline ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>
            </div>

            {/* Body Kartu: Foto & Detail */}
            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
              {/* Foto ID */}
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
                  }}
                >
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt={effectiveNama}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <>
                      <span style={{ fontSize: '32px', fontWeight: 'bold', color: '#ffffff' }}>{userInitial}</span>
                      <span style={{ fontSize: '7.5px', textTransform: 'uppercase', color: '#fed7aa', fontWeight: 'bold', letterSpacing: '0.5px' }}>FOTO ID</span>
                    </>
                  )}
                </div>
              </div>

              {/* Info Pengguna */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3
                  style={{
                    margin: '0 0 3px 0',
                    fontSize: '14px',
                    fontWeight: '800',
                    color: '#ffffff',
                    letterSpacing: '0.2px',
                    lineHeight: 1.3,
                    wordBreak: 'break-word',
                  }}
                >
                  {effectiveNama}
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
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
                        <span style={{ color: '#fed7aa', fontWeight: '700', minWidth: '55px' }}>RFID:</span>
                        <code style={{ backgroundColor: 'rgba(0,0,0,0.35)', color: '#fef08a', padding: '2px 7px', borderRadius: '5px', fontWeight: 'bold', fontSize: '10.5px', border: '1px solid rgba(254, 240, 138, 0.25)' }}>
                          💳 {effectiveUid ? effectiveUid.toUpperCase() : 'BELUM ADA'}
                        </code>
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
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
                        <span style={{ color: '#fed7aa', fontWeight: '700', minWidth: '55px' }}>RFID:</span>
                        <code style={{ backgroundColor: 'rgba(0,0,0,0.35)', color: '#fef08a', padding: '2px 7px', borderRadius: '5px', fontWeight: 'bold', fontSize: '10.5px', border: '1px solid rgba(254, 240, 138, 0.25)' }}>
                          💳 {effectiveUid ? effectiveUid.toUpperCase() : 'BELUM ADA'}
                        </code>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Kartu */}
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
                |||| || ||| ||| <span style={{ color: '#fed7aa', fontWeight: 'bold' }}>{effectiveUid ? effectiveUid.toUpperCase().substring(0, 8) : 'YPK-2026'}</span>
              </div>
            </div>
          </div>

          {/* ⚡ STATUS AKTIVITAS LIVE */}
          <div
            style={{
              backgroundColor: isOnline ? '#f0fdf4' : '#ffffff',
              border: isOnline ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '10px 14px',
              marginBottom: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>{isOnline ? '🟢' : '⚪'}</span>
              <div>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: isOnline ? '#15803d' : '#475569' }}>
                  {isOnline ? 'Sedang Online' : 'Sedang Offline'}
                </span>
                <p style={{ margin: '1px 0 0 0', fontSize: '11px', color: '#64748b' }}>
                  {isOnline ? onlineActivity : (targetUser.lastSeen || 'Offline')}
                </p>
              </div>
            </div>
            {onlineDurationText && (
              <span style={{ fontSize: '10.5px', color: '#166534', fontWeight: 'bold', backgroundColor: '#dcfce7', padding: '2px 8px', borderRadius: '10px' }}>
                ⏱️ {onlineDurationText}
              </span>
            )}
          </div>

          {/* 📋 2. KOTAK BIODATA LENGKAP (GURU ATAU SISWA) */}
          <div
            className="stardust-white-card"
            style={{
              borderRadius: '16px',
              padding: '16px 18px',
              border: '1.5px solid #fed7aa',
              boxShadow: '0 4px 14px rgba(234, 88, 12, 0.08)',
              backgroundColor: '#ffffff',
            }}
          >
            {/* Header Biodata */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
                borderBottom: '1px solid #ffedd5',
                paddingBottom: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>{isGuruAccount ? '🧑‍🏫' : '🎒'}</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '14.5px', color: '#9a3412', fontWeight: '800' }}>
                    {isGuruAccount ? 'Biodata Singkat Pendidik' : 'Biodata Singkat Siswa/i'}
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#64748b' }}>
                    {isGuruAccount
                      ? 'Rekam Jejak & Profil Akademik Guru SMK YPK Medan'
                      : 'Profil Akademik & Data Pokok Peserta Didik SMK YPK Medan'}
                  </p>
                </div>
              </div>
            </div>

            {/* Grid Informasi Biodata */}
            {isGuruAccount ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '10px', fontSize: '12px' }}>
                <div style={{ backgroundColor: '#fff7ed', padding: '10px 12px', borderRadius: '10px', border: '1px solid #ffedd5' }}>
                  <span style={{ color: '#9a3412', fontSize: '10.5px', fontWeight: 'bold', display: 'block' }}>NUPTK / NIP:</span>
                  <span style={{ color: '#0f172a', fontWeight: '700', fontSize: '12.5px' }}>{guruBio.nuptk || '-'}</span>
                </div>
                <div style={{ backgroundColor: '#fff7ed', padding: '10px 12px', borderRadius: '10px', border: '1px solid #ffedd5' }}>
                  <span style={{ color: '#9a3412', fontSize: '10.5px', fontWeight: 'bold', display: 'block' }}>Tempat, Tgl Lahir:</span>
                  <span style={{ color: '#0f172a', fontWeight: '700' }}>{guruBio.tempatTglLahir || '-'}</span>
                </div>
                <div style={{ backgroundColor: '#fff7ed', padding: '10px 12px', borderRadius: '10px', border: '1px solid #ffedd5' }}>
                  <span style={{ color: '#9a3412', fontSize: '10.5px', fontWeight: 'bold', display: 'block' }}>Pendidikan Terakhir:</span>
                  <span style={{ color: '#0f172a', fontWeight: '700' }}>{guruBio.pendidikan || '-'}</span>
                </div>
                <div style={{ backgroundColor: '#fff7ed', padding: '10px 12px', borderRadius: '10px', border: '1px solid #ffedd5' }}>
                  <span style={{ color: '#9a3412', fontSize: '10.5px', fontWeight: 'bold', display: 'block' }}>Mata Pelajaran Diampu:</span>
                  <span style={{ color: '#0f172a', fontWeight: '700' }}>{guruBio.mapelDiampu || '-'}</span>
                </div>
                <div style={{ backgroundColor: '#fff7ed', padding: '10px 12px', borderRadius: '10px', border: '1px solid #ffedd5' }}>
                  <span style={{ color: '#9a3412', fontSize: '10.5px', fontWeight: 'bold', display: 'block' }}>No. WhatsApp / Kontak:</span>
                  <span style={{ color: '#0f172a', fontWeight: '700' }}>{guruBio.telepon || '-'}</span>
                </div>
                <div style={{ backgroundColor: '#fff7ed', padding: '10px 12px', borderRadius: '10px', border: '1px solid #ffedd5' }}>
                  <span style={{ color: '#9a3412', fontSize: '10.5px', fontWeight: 'bold', display: 'block' }}>Alamat Tempat Tinggal:</span>
                  <span style={{ color: '#0f172a', fontWeight: '700' }}>{guruBio.alamat || '-'}</span>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '10px', fontSize: '12px' }}>
                <div style={{ backgroundColor: '#fff7ed', padding: '10px 12px', borderRadius: '10px', border: '1px solid #ffedd5' }}>
                  <span style={{ color: '#9a3412', fontSize: '10.5px', fontWeight: 'bold', display: 'block' }}>NISN / NIS:</span>
                  <span style={{ color: '#0f172a', fontWeight: '700', fontSize: '12.5px' }}>{siswaBio.nisn || '-'}</span>
                </div>
                <div style={{ backgroundColor: '#fff7ed', padding: '10px 12px', borderRadius: '10px', border: '1px solid #ffedd5' }}>
                  <span style={{ color: '#9a3412', fontSize: '10.5px', fontWeight: 'bold', display: 'block' }}>Tempat, Tgl Lahir:</span>
                  <span style={{ color: '#0f172a', fontWeight: '700' }}>{siswaBio.tempatTglLahir || '-'}</span>
                </div>
                <div style={{ backgroundColor: '#fff7ed', padding: '10px 12px', borderRadius: '10px', border: '1px solid #ffedd5' }}>
                  <span style={{ color: '#9a3412', fontSize: '10.5px', fontWeight: 'bold', display: 'block' }}>Jenis Kelamin &amp; Agama:</span>
                  <span style={{ color: '#0f172a', fontWeight: '700' }}>{siswaBio.genderAgama || '-'}</span>
                </div>
                <div style={{ backgroundColor: '#fff7ed', padding: '10px 12px', borderRadius: '10px', border: '1px solid #ffedd5' }}>
                  <span style={{ color: '#9a3412', fontSize: '10.5px', fontWeight: 'bold', display: 'block' }}>Cita-cita / Impian:</span>
                  <span style={{ color: '#0f172a', fontWeight: '700' }}>{siswaBio.citaCita || '-'}</span>
                </div>
                <div style={{ backgroundColor: '#fff7ed', padding: '10px 12px', borderRadius: '10px', border: '1px solid #ffedd5' }}>
                  <span style={{ color: '#9a3412', fontSize: '10.5px', fontWeight: 'bold', display: 'block' }}>No. WhatsApp Siswa:</span>
                  <span style={{ color: '#0f172a', fontWeight: '700' }}>{siswaBio.telepon || '-'}</span>
                </div>
                <div style={{ backgroundColor: '#fff7ed', padding: '10px 12px', borderRadius: '10px', border: '1px solid #ffedd5' }}>
                  <span style={{ color: '#9a3412', fontSize: '10.5px', fontWeight: 'bold', display: 'block' }}>Orang Tua / Kontak:</span>
                  <span style={{ color: '#0f172a', fontWeight: '700' }}>{siswaBio.ortuKontak || '-'}</span>
                </div>
                <div style={{ backgroundColor: '#fff7ed', padding: '10px 12px', borderRadius: '10px', border: '1px solid #ffedd5', gridColumn: '1 / -1' }}>
                  <span style={{ color: '#9a3412', fontSize: '10.5px', fontWeight: 'bold', display: 'block' }}>Alamat Tempat Tinggal:</span>
                  <span style={{ color: '#0f172a', fontWeight: '700' }}>{siswaBio.alamat || '-'}</span>
                </div>
              </div>
            )}

            {/* Motto Box */}
            {(isGuruAccount ? guruBio.motto : siswaBio.motto) && (
              <div
                style={{
                  marginTop: '12px',
                  padding: '10px 14px',
                  backgroundColor: '#fef3c7',
                  borderRadius: '10px',
                  border: '1px solid #fde68a',
                  fontStyle: 'italic',
                  fontSize: '11.5px',
                  color: '#78350f',
                }}
              >
                💬 <b>{isGuruAccount ? 'Motto Pendidik:' : 'Motto Hidup:'}</b> &ldquo;{isGuruAccount ? guruBio.motto : siswaBio.motto}&rdquo;
              </div>
            )}
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div
          style={{
            padding: '12px 18px',
            backgroundColor: '#ffffff',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setShowBarcodeModal(true)}
              style={{
                backgroundColor: isGuruAccount ? '#1e40af' : '#059669',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '7px 14px',
                fontSize: '11.5px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <span>🔲</span> Barcode Absen
            </button>
            <button
              type="button"
              onClick={handlePrintCard}
              style={{
                backgroundColor: '#c2410c',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '7px 14px',
                fontSize: '11.5px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <span>🖨️</span> Cetak Kartu
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              backgroundColor: '#475569',
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

      {/* MODAL BARCODE POPUP */}
      {showBarcodeModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999999,
            padding: '16px',
          }}
          onClick={() => setShowBarcodeModal(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              maxWidth: '360px',
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.4)',
              border: '1.5px solid #e2e8f0',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                background: isGuruAccount
                  ? 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)'
                  : 'linear-gradient(135deg, #065f46 0%, #059669 100%)',
                padding: '14px 18px',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 'bold' }}>
                {isGuruAccount ? 'BARCODE GURU & STAFF' : 'BARCODE PRESENSI SISWA'}
              </h3>
              <button
                type="button"
                onClick={() => setShowBarcodeModal(false)}
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

            <div style={{ padding: '18px', textAlign: 'center' }}>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#0f172a', fontWeight: 'bold' }}>
                {effectiveNama}
              </h4>
              <p style={{ margin: '0 0 12px 0', fontSize: '11.5px', color: '#64748b' }}>
                {isGuruAccount ? `Inisial: [${effectiveInisial}] &bull; ${effectiveJurusan}` : `Kelas: ${effectiveKelas}`}
              </p>

              {/* FORMAT TOGGLE */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '12px' }}>
                <button
                  type="button"
                  onClick={() => setBarcodeFormat('1d')}
                  style={{
                    padding: '5px 10px',
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
                  📶 Barcode 1D
                </button>
                <button
                  type="button"
                  onClick={() => setBarcodeFormat('qr')}
                  style={{
                    padding: '5px 10px',
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
                  📱 QR Code
                </button>
              </div>

              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '2px dashed #94a3b8',
                  borderRadius: '12px',
                  padding: '14px 10px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px',
                }}
              >
                {barcodeFormat === '1d' ? (
                  <>
                    {renderBarcode1D(barcodeValue)}
                    <div style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '12px', letterSpacing: '2px', color: '#0f172a', marginTop: '6px' }}>
                      {barcodeValue}
                    </div>
                  </>
                ) : (
                  <>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=4&data=${encodeURIComponent(barcodeValue)}`}
                      alt={`QR Code ${barcodeValue}`}
                      style={{ width: '160px', height: '160px', display: 'block', borderRadius: '8px' }}
                    />
                    <div style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '11px', letterSpacing: '1.5px', color: '#0f172a', marginTop: '6px' }}>
                      {barcodeValue}
                    </div>
                  </>
                )}
              </div>

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
                  width: '100%',
                }}
              >
                Tutup Barcode
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
