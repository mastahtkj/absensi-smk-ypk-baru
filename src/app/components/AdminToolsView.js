'use client';

import React from 'react';
import Swal from 'sweetalert2';

export default function AdminToolsView({
  onOpenBulk,
  siswaList = [],
  currentUser,
  supabase,
}) {
  const totalSiswa = siswaList.filter((s) => !s.isGuru).length;
  const totalGuru = siswaList.filter((s) => s.isGuru).length;
  const faceRegistered = siswaList.filter((s) => {
    return Boolean(s.face_descriptor || s.biodata?.face_descriptor);
  }).length;

  const handleCopyMasterSql = () => {
    const sqlText = `-- Silakan buka file SKRIP_MASTER_DATABASE_SUPABASE_LENGKAP.sql pada folder proyek untuk menjalankan skrip migrasi lengkap di Supabase SQL Editor.`;
    navigator.clipboard?.writeText(sqlText);
    Swal.fire({
      icon: 'success',
      title: 'Skrip SQL Tersedia',
      html: `
        <div style="font-size: 13px; color: #334155; text-align: left;">
          Skrip SQL Master telah disiapkan di file <b>SKRIP_MASTER_DATABASE_SUPABASE_LENGKAP.sql</b>.<br/><br/>
          Buka menu <b>SQL Editor</b> di Dashboard Supabase Anda, tempel seluruh query dari file tersebut, lalu klik <b>RUN</b>.
        </div>
      `,
    });
  };

  const handleResetDatabase = async () => {
    const res = await Swal.fire({
      icon: 'warning',
      title: 'Bersihkan Semua Data Kecuali Master Iqbal?',
      html: `
        <div style="font-size: 13px; color: #334155; text-align: left; line-height: 1.5;">
          <b>Peringatan:</b> Tindakan ini akan mengosongkan seluruh tabel <b>tb_siswa</b>, log presensi, perangkat login, dan seluruh guru lainnya di Supabase.<br/><br/>
          <span style="color: #16a34a; font-weight: bold;">HANYA Akun Admin Master Muhammad Iqbal Rangkuti yang dipertahankan utuh dan aktif.</span>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Ya, Bersihkan Kecuali Master Iqbal!',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
    });

    if (res.isConfirmed) {
      try {
        Swal.fire({ title: 'Sedang Membersihkan Database...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        if (supabase) {
          await supabase.from('absensi').delete().neq('id', 0);
          await supabase.from('latest_scan').delete().neq('id', 0);
          await supabase.from('tb_siswa_devices').delete().neq('id', 0);
          await supabase.from('tb_siswa').delete().neq('id_siswa', 0);
          
          // Hapus semua guru KECUALI username 'iqbal' dan ID 29
          await supabase.from('tb_guru').delete().neq('username', 'iqbal').neq('id_guru', 29);

          // Pastikan akun Master Iqbal selalu tersimpan dengan benar di database
          await supabase.from('tb_guru').upsert({
            id_guru: 29,
            nama_guru: 'MUHAMMAD IQBAL RANGKUTI,S.KOM., Gr.',
            username: 'iqbal',
            password: '301020',
            role: 'admin',
            inisial: 'IR',
            mapel: 'Teknik Jaringan Komputer & Telekomunikasi (TJKT)',
            foto_url: '/logo.png',
            biodata: {
              role: 'admin',
              username: 'iqbal',
              nama: 'MUHAMMAD IQBAL RANGKUTI,S.KOM., Gr.',
              inisial: 'IR',
            },
          }, { onConflict: 'id_guru' });
        }
        Swal.fire({
          icon: 'success',
          title: 'Database Bersih & Siap!',
          text: 'Seluruh data siswa dan guru lain telah dibersihkan. Hanya Admin Master Iqbal yang dipertahankan.',
        });
        if (typeof window !== 'undefined') {
          setTimeout(() => window.location.reload(), 1500);
        }
      } catch (e) {
        Swal.fire({ icon: 'error', title: 'Gagal Menghapus', text: e.message || 'Gunakan SQL Editor Supabase untuk truncate data.' });
      }
    }
  };

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
              DIGITALISASI OF TECHNOLOGY &bull; ADMINISTRASI UTAMA
            </span>
            <h1 style={{ margin: '8px 0 4px 0', fontSize: '22px', fontWeight: 'bold' }}>
              Pusat Manajemen &amp; Utilitas Admin SMK YPK
            </h1>
            <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1' }}>
              Kelola data master siswa dan bapak/ibu guru serta pengaturan database cloud Supabase sekolah.
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
        {/* CARD 1: INPUT MASSAL SISWA */}
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

        {/* CARD 2: PANDUAN SKRIP SQL SUPABASE */}
        <div
          onClick={handleCopyMasterSql}
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
              🏛️
            </div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '17px', color: '#0284c7', fontWeight: 'bold' }}>
              Skrip SQL Master Database
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: '1.4' }}>
              Lihat dan salin skrip migrasi database Supabase lengkap dengan tabel tb_siswa, tb_guru, absensi, dan publikasi realtime.
            </p>
          </div>
          <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#0284c7' }}>Petunjuk SQL Editor</span>
            <span style={{ fontSize: '16px', color: '#0284c7', fontWeight: 'bold' }}>➔</span>
          </div>
        </div>

        {/* CARD 3: RESET / KOSONGKAN DATA SUPABASE */}
        <div
          onClick={handleResetDatabase}
          className="stardust-white-card"
          style={{
            borderRadius: '14px',
            padding: '20px',
            border: '2px solid #fecaca',
            backgroundColor: '#fff5f5',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-3px)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
        >
          <div>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '12px' }}>
              🗑️
            </div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '17px', color: '#b91c1c', fontWeight: 'bold' }}>
              Reset Data Supabase
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#7f1d1d', lineHeight: '1.4' }}>
              Kosongkan data lama di Supabase untuk memulai pendaftaran akun baru dari awal.
            </p>
          </div>
          <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #fee2e2', paddingTop: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#dc2626' }}>Hapus Data</span>
            <span style={{ fontSize: '16px', color: '#dc2626', fontWeight: 'bold' }}>➔</span>
          </div>
        </div>
      </div>
    </div>
  );
}
