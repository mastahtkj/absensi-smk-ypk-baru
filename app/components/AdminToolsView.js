'use client';

import React from 'react';

export default function AdminToolsView({
  onOpenRegister,
  onOpenBulk,
  onOpenScanner,
  siswaList = [],
  currentUser,
}) {
  const totalSiswa = siswaList.filter((s) => !s.isGuru).length;
  const totalGuru = siswaList.filter((s) => s.isGuru).length;
  const faceRegistered = siswaList.filter((s) => {
    return Boolean(s.face_descriptor || s.biodata?.face_descriptor);
  }).length;

  return (
    <div style={{ padding: '4px 0 30px 0' }}>
      {/* BANNER ADMIN TOOLS */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
          borderRadius: '16px',
          padding: '24px',
          color: '#ffffff',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.25)',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', backgroundColor: 'rgba(6, 182, 212, 0.25)', color: '#38bdf8', padding: '4px 10px', borderRadius: '20px' }}>
              DIGITALISASI OF TECHNOLOGY &bull; BIOMETRIK AI
            </span>
            <h1 style={{ margin: '8px 0 4px 0', fontSize: '22px', fontWeight: 'bold' }}>
              Pusat Manajemen &amp; Utilitas Admin SMK YPK
            </h1>
            <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1' }}>
              Kelola data master biometrik Face Recognition, pendaftaran massal siswa, dan konfigurasi hak akses pengguna.
            </p>
          </div>
          <div style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '10px 16px', borderRadius: '12px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.15)' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>Wajah AI Terdaftar</span>
            <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#38bdf8' }}>{faceRegistered} / {siswaList.length}</span>
          </div>
        </div>
      </div>

      {/* STATS MASTER DATA */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '22px' }}>
        <div className="stardust-white-card" style={{ padding: '14px 18px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', display: 'block' }}>Total Siswa</span>
          <span style={{ fontSize: '22px', fontWeight: 'bold', color: '#2563eb' }}>{totalSiswa} Orang</span>
        </div>
        <div className="stardust-white-card" style={{ padding: '14px 18px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', display: 'block' }}>Total Guru &amp; Staff</span>
          <span style={{ fontSize: '22px', fontWeight: 'bold', color: '#16a34a' }}>{totalGuru} Orang</span>
        </div>
        <div className="stardust-white-card" style={{ padding: '14px 18px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', display: 'block' }}>Wajah AI Aktif</span>
          <span style={{ fontSize: '22px', fontWeight: 'bold', color: '#0284c7' }}>{faceRegistered} Biometrik</span>
        </div>
      </div>

      {/* MODUL TOOLS ACTION CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        {/* CARD 1: PEREKAMAN WAJAH AI */}
        <div
          onClick={onOpenRegister}
          className="stardust-white-card"
          style={{
            borderRadius: '14px',
            padding: '20px',
            border: '2px solid #bae6fd',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(2, 132, 199, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-3px)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
        >
          <div>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '12px' }}>
              👤
            </div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '17px', color: '#0284c7', fontWeight: 'bold' }}>
              Pusat Perekaman Wajah AI
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: '1.4' }}>
              Pendaftaran dan kalibrasi biometrik wajah siswa dan bapak/ibu guru langsung via kamera laptop / HP ke cloud Supabase.
            </p>
          </div>
          <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#0284c7' }}>Buka Manajer Wajah AI</span>
            <span style={{ fontSize: '16px', color: '#0284c7', fontWeight: 'bold' }}>➔</span>
          </div>
        </div>

        {/* CARD 2: BUKA SCANNER PRESENSI */}
        {onOpenScanner && (
          <div
            onClick={onOpenScanner}
            className="stardust-white-card"
            style={{
              borderRadius: '14px',
              padding: '20px',
              border: '2px solid #bbf7d0',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(22, 163, 74, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-3px)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            <div>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '12px' }}>
                📸
              </div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '17px', color: '#16a34a', fontWeight: 'bold' }}>
                Terminal Scanner Presensi AI
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: '1.4' }}>
                Buka layar scanner kamera otomatis untuk pos piket / lobby sekolah. Deteksi real-time dengan suara sambutan AI.
              </p>
            </div>
            <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#16a34a' }}>Buka Scanner Kamera</span>
              <span style={{ fontSize: '16px', color: '#16a34a', fontWeight: 'bold' }}>➔</span>
            </div>
          </div>
        )}

        {/* CARD 3: INPUT MASSAL SISWA */}
        <div
          onClick={onOpenBulk}
          className="stardust-white-card"
          style={{
            borderRadius: '14px',
            padding: '20px',
            border: '2px solid #e2e8f0',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-3px)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
        >
          <div>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '12px' }}>
              📥
            </div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '17px', color: '#334155', fontWeight: 'bold' }}>
              Input Siswa Massal
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: '1.4' }}>
              Salin dan tempel puluhan daftar nama siswa baru per kelas langsung masuk ke database Supabase tanpa perlu input satu per satu.
            </p>
          </div>
          <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>Buka Form Copas Siswa</span>
            <span style={{ fontSize: '16px', color: '#334155', fontWeight: 'bold' }}>➔</span>
          </div>
        </div>
      </div>
    </div>
  );
}
