'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [dataSiswa, setDataSiswa] = useState([]);
  const [periode, setPeriode] = useState('Hari Ini');
  const [tingkat, setTingkat] = useState('Semua');
  const [jurusan, setJurusan] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    // Simulasi atau fetching data dari Supabase / API
    // Silakan sesuaikan fungsi fetching data sesuai kebutuhan project Anda
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      {/* CSS KHUSUS UNTUK CETAK/PRINT PDF */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-container, .print-container * {
            visibility: visible;
          }
          .print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A4;
            margin: 15mm 10mm 15mm 10mm;
          }
        }
        @media screen {
          .print-only {
            display: none;
          }
        }
      `}</style>

      {/* DASHBOARD UI UTAMA (TIDAK TAMPIL SAAT CETAK PDF) */}
      <div className="no-print max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">DASHBOARD PRESENSI SISWA</h1>
            <p className="text-sm text-gray-500">SMK YPK MEDAN</p>
          </div>
          <button
            onClick={handlePrint}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm transition flex items-center gap-2"
          >
            🖨️ Cetak PDF Laporan
          </button>
        </div>

        {/* CONTROLS & FILTER */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">PERIODE REKAP</label>
            <select
              value={periode}
              onChange={(e) => setPeriode(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="Hari Ini">Hari Ini</option>
              <option value="Minggu Ini">Minggu Ini</option>
              <option value="Bulan Ini">Bulan Ini</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">TINGKAT</label>
            <select
              value={tingkat}
              onChange={(e) => setTingkat(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="Semua">Semua Tingkat</option>
              <option value="X">Kelas X</option>
              <option value="XI">Kelas XI</option>
              <option value="XII">Kelas XII</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">JURUSAN</label>
            <select
              value={jurusan}
              onChange={(e) => setJurusan(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="Semua">Semua Jurusan</option>
              <option value="TJKT">TJKT</option>
              <option value="AKL">AKL</option>
              <option value="MPLB">MPLB</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">CARI NAMA SISWA</label>
            <input
              type="text"
              placeholder="Cari nama siswa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* CONTAINER TAMPILAN PRINT / PDF */}
      <div className="print-container">
        {/* KOP SURAT PRINT PDF */}
        <div className="print-only" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', paddingBottom: '10px' }}>
            <img
              src="/logo.png"
              onError={(e) => {
                e.target.src = 'https://upload.wikimedia.org/wikipedia/commons/2/27/Logo_SMK_YPK_Medan.png';
              }}
              alt="Logo SMK YPK Medan"
              style={{ width: '75px', height: '75px', objectFit: 'contain' }}
            />
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase' }}>
                YAYASAN PENDIDIKAN KEBANGSAAN
              </h3>
              <h1 style={{ margin: '3px 0', fontSize: '22px', fontWeight: '800', letterSpacing: '1.5px' }}>
                SMK YPK MEDAN
              </h1>
              <p style={{ margin: 0, fontSize: '10px', color: '#222', lineHeight: '1.4' }}>
                Jl. Sisingamangaraja No. 33, Medan, Sumatera Utara • Telp: (061) 123456
                <br />
                Website: smkypkmedan.sch.id | Email: info@smkypkmedan.sch.id
              </p>
            </div>
          </div>

          {/* GARIS GANDA KOP SURAT RESMI */}
          <div style={{ borderBottom: '3px solid #000', marginBottom: '2px' }}></div>
          <div style={{ borderBottom: '1px solid #000', marginBottom: '15px' }}></div>

          <div style={{ textAlign: 'center', marginTop: '10px' }}>
            <h2 style={{ margin: 0, fontSize: '13px', fontWeight: 'bold', textDecoration: 'underline', textTransform: 'uppercase' }}>
              LAPORAN REKAPITULASI DETAIL PRESENSI SISWA
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '10px', fontWeight: 'bold' }}>
              PERIODE: {periode.toUpperCase()} • TANGGAL CETAK: {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>

        {/* TABEL PRESENSI SISWA */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #000' }}>
                <th style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center', width: '30px' }}>NO</th>
                <th style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'left' }}>NAMA SISWA</th>
                <th style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center', width: '50px' }}>KELAS</th>
                <th style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center', width: '40px' }}>HADIR</th>
                <th style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center', width: '40px' }}>TELAT</th>
                <th style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center', width: '40px' }}>SAKIT</th>
                <th style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center', width: '40px' }}>IZIN</th>
                <th style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center', width: '40px' }}>ALPHA</th>
                <th style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'left' }}>RINCIAN TANGGAL KETERANGAN</th>
                <th style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center', width: '60px' }}>KEHADIRAN</th>
              </tr>
            </thead>
            <tbody>
              {dataSiswa.length > 0 ? (
                dataSiswa.map((siswa, index) => (
                  <tr key={index}>
                    <td style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center' }}>{index + 1}</td>
                    <td style={{ border: '1px solid #000', padding: '5px 8px', fontWeight: 'bold' }}>{siswa.nama}</td>
                    <td style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center' }}>{siswa.kelas}</td>
                    <td style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center' }}>{siswa.hadir || 0}</td>
                    <td style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center' }}>{siswa.telat || 0}</td>
                    <td style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center' }}>{siswa.sakit || 0}</td>
                    <td style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center' }}>{siswa.izin || 0}</td>
                    <td style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center' }}>{siswa.alpha || 0}</td>
                    <td style={{ border: '1px solid #000', padding: '5px 8px' }}>{siswa.keterangan || '-'}</td>
                    <td style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center' }}>{siswa.persentase || '0%'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10" style={{ border: '1px solid #000', padding: '20px', textAlign: 'center', color: '#666' }}>
                    Data presensi siswa belum tersedia.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* TANDA TANGAN (HANYA TAMPIL SAAT CETAK PDF) */}
        <div className="print-only" style={{ marginTop: '35px', display: 'flex', justifyContent: 'space-between', padding: '0 30px', pageBreakInside: 'avoid' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '11px' }}>Mengetahui,</p>
            <p style={{ margin: '2px 0 0 0', fontSize: '11px', fontWeight: 'bold' }}>Kepala Sekolah SMK YPK Medan</p>
            <div style={{ height: '60px' }}></div>
            <p style={{ margin: 0, fontSize: '11px', fontWeight: 'bold', textDecoration: 'underline' }}>
              Hartati Patiwael, S.Si
            </p>
          </div>

          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '11px' }}>
              Medan, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <p style={{ margin: '2px 0 0 0', fontSize: '11px', fontWeight: 'bold' }}>Guru Piket / Wali Kelas</p>
            <div style={{ height: '60px' }}></div>
            <p style={{ margin: 0, fontSize: '11px', fontWeight: 'bold', textDecoration: 'underline' }}>
              Fahrul Lubis, S.Pd
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
