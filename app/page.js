'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

// --- INITIALIZE SUPABASE CLIENT ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function DashboardAbsensi() {
  // --- STATE DATA ABSENSI ---
  const [dataAbsensi, setDataAbsensi] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- STATE FILTER ---
  const [selectedPeriode, setSelectedPeriode] = useState('Hari Ini'); // 'Hari Ini', '7 Hari', 'Bulanan'
  const [selectedTingkat, setSelectedTingkat] = useState('Semua'); // 'Semua', 'Kelas X', 'Kelas XI', 'Kelas XII', 'GURU / STAFF'
  const [selectedJurusan, setSelectedJurusan] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');

  // --- AMBIL DATA DARI SUPABASE ---
  const fetchAbsensi = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('absensi')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDataAbsensi(data || []);
    } catch (err) {
      console.error('Error fetching absensi:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAbsensi();

    // Realtime listener Supabase agar data otomatis bertambah saat tap RFID
    const channel = supabase
      .channel('realtime_absensi')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'absensi' },
        (payload) => {
          setDataAbsensi((prev) => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // --- DAFTAR JURUSAN OPSI ---
  const daftarJurusan = [
    'Semua Jurusan',
    'Teknik Jaringan Komputer dan Telekomunikasi',
    'Akuntansi dan Keuangan Lembaga',
    'Manajemen Perkantoran dan Layanan Bisnis',
    'Pemasaran',
    'Bisnis dan Manajemen',
  ];

  // --- LOGIKA FILTER DATA ---
  const filteredData = useMemo(() => {
    return dataAbsensi.filter((item) => {
      const now = new Date();
      const itemDate = new Date(item.created_at);

      // 1. Filter Periode Rekap
      let matchesPeriode = true;
      if (selectedPeriode === 'Hari Ini') {
        matchesPeriode = itemDate.toDateString() === now.toDateString();
      } else if (selectedPeriode === '7 Hari') {
        const diffDays = (now - itemDate) / (1000 * 60 * 60 * 24);
        matchesPeriode = diffDays <= 7;
      } else if (selectedPeriode === 'Bulanan') {
        matchesPeriode =
          itemDate.getMonth() === now.getMonth() &&
          itemDate.getFullYear() === now.getFullYear();
      }

      // 2. Filter Tingkat (Termasuk Guru / Staff)
      let matchesTingkat = true;
      const kelasUpper = (item.kelas || '').toUpperCase();

      if (selectedTingkat === 'Kelas X') {
        matchesTingkat = kelasUpper.startsWith('X ') || kelasUpper === 'X';
      } else if (selectedTingkat === 'Kelas XI') {
        matchesTingkat = kelasUpper.startsWith('XI ') || kelasUpper === 'XI';
      } else if (selectedTingkat === 'Kelas XII') {
        matchesTingkat = kelasUpper.startsWith('XII ') || kelasUpper === 'XII';
      } else if (selectedTingkat === 'GURU / STAFF') {
        // Cocokkan jika kelas bernilai 'GURU / STAFF' atau mengandung kata GURU
        matchesTingkat = kelasUpper.includes('GURU') || kelasUpper.includes('STAFF');
      }

      // 3. Filter Jurusan (Abaikan jika memilih GURU / STAFF)
      let matchesJurusan = true;
      if (selectedJurusan !== 'Semua' && selectedJurusan !== 'Semua Jurusan' && selectedTingkat !== 'GURU / STAFF') {
        matchesJurusan = (item.kelas || '').toLowerCase().includes(selectedJurusan.toLowerCase());
      }

      // 4. Filter Pencarian Nama / RFID / Kelas
      let matchesSearch = true;
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        matchesSearch =
          (item.nama || '').toLowerCase().includes(q) ||
          (item.kelas || '').toLowerCase().includes(q) ||
          (item.rfid_uid || '').toLowerCase().includes(q);
      }

      return matchesPeriode && matchesTingkat && matchesJurusan && matchesSearch;
    });
  }, [dataAbsensi, selectedPeriode, selectedTingkat, selectedJurusan, searchQuery]);

  // --- HANDLER EXPORT EXCEL ---
  const handleExportCSV = () => {
    if (filteredData.length === 0) {
      alert('Tidak ada data untuk diexport!');
      return;
    }
    const headers = ['ID', 'Waktu Tap', 'Nama', 'Kelas/Jabatan', 'RFID UID', 'Status', 'Pengubah'];
    const rows = filteredData.map((d) => [
      d.id,
      new Date(d.created_at).toLocaleString('id-ID'),
      `"${d.nama || '-'}"`,
      `"${d.kelas || '-'}"`,
      `"${d.rfid_uid || '-'}"`,
      `"${d.status || '-'}"`,
      `"${d.edited_by || 'Mesin RFID YPK'}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Rekap_Absensi_SMK_YPK_${selectedPeriode}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-orange-50/50 p-4 md:p-8 font-sans text-gray-800">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ========================================================= */}
        {/* PANEL FILTER DASHBOARD */}
        {/* ========================================================= */}
        <div className="bg-white rounded-2xl border border-orange-200 p-6 shadow-sm space-y-5">
          
          {/* BARIS 1: PERIODE REKAP & TOMBOL EXPORT */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-orange-100 pb-4">
            <div className="flex items-center gap-2">
              <span className="font-bold text-orange-700 flex items-center gap-1 text-sm md:text-base">
                📅 PERIODE REKAP:
              </span>
              {['Hari Ini', '7 Hari', 'Bulanan'].map((periode) => (
                <button
                  key={periode}
                  onClick={() => setSelectedPeriode(periode)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                    selectedPeriode === periode
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
                  }`}
                >
                  {periode}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleExportCSV}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition flex items-center gap-2"
              >
                📊 Export Excel (.csv) Kop + Tanggal
              </button>
              <button
                onClick={() => window.print()}
                className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition flex items-center gap-2"
              >
                📄 Cetak PDF Laporan
              </button>
            </div>
          </div>

          {/* BARIS 2: TINGKAT (TERMASUK TOMBOL GURU / STAFF) */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-orange-700 text-sm md:text-base min-w-[100px]">
              🎯 TINGKAT:
            </span>
            <button
              onClick={() => setSelectedTingkat('Semua')}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${
                selectedTingkat === 'Semua'
                  ? 'bg-orange-500 text-white'
                  : 'bg-orange-100/80 text-orange-800 hover:bg-orange-200'
              }`}
            >
              🎓 Semua Tingkat
            </button>
            <button
              onClick={() => setSelectedTingkat('Kelas X')}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${
                selectedTingkat === 'Kelas X'
                  ? 'bg-orange-500 text-white'
                  : 'bg-orange-100/80 text-orange-800 hover:bg-orange-200'
              }`}
            >
              🎒 Kelas X
            </button>
            <button
              onClick={() => setSelectedTingkat('Kelas XI')}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${
                selectedTingkat === 'Kelas XI'
                  ? 'bg-orange-500 text-white'
                  : 'bg-orange-100/80 text-orange-800 hover:bg-orange-200'
              }`}
            >
              📚 Kelas XI
            </button>
            <button
              onClick={() => setSelectedTingkat('Kelas XII')}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${
                selectedTingkat === 'Kelas XII'
                  ? 'bg-orange-500 text-white'
                  : 'bg-orange-100/80 text-orange-800 hover:bg-orange-200'
              }`}
            >
              🏆 Kelas XII
            </button>

            {/* 👨‍🏫 TOMBOL GURU / STAFF BARU */}
            <button
              onClick={() => {
                setSelectedTingkat('GURU / STAFF');
                setSelectedJurusan('Semua'); // Reset jurusan saat memilih Guru
              }}
              className={`px-4 py-1.5 rounded-full text-sm font-bold transition flex items-center gap-1.5 ${
                selectedTingkat === 'GURU / STAFF'
                  ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-300'
                  : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
              }`}
            >
              👨‍🏫 Guru / Staff
            </button>
          </div>

          {/* BARIS 3: JURUSAN (NONAKTIF JIKA PILIH GURU) */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-orange-700 text-sm md:text-base min-w-[100px]">
              🏫 JURUSAN:
            </span>
            {daftarJurusan.map((jurusan) => {
              const isSelected = selectedJurusan === jurusan;
              const isDisabled = selectedTingkat === 'GURU / STAFF';

              return (
                <button
                  key={jurusan}
                  disabled={isDisabled}
                  onClick={() => setSelectedJurusan(jurusan)}
                  className={`px-3.5 py-1.5 rounded-2xl text-xs md:text-sm font-semibold transition ${
                    isDisabled
                      ? 'opacity-40 cursor-not-allowed bg-gray-100 text-gray-400'
                      : isSelected
                      ? 'bg-orange-600 text-white shadow-sm'
                      : 'bg-orange-50 text-orange-800 hover:bg-orange-100 border border-orange-200/60'
                  }`}
                >
                  {jurusan === 'Semua Jurusan' ? '🏫 Semua Jurusan' : jurusan}
                </button>
              );
            })}
          </div>

        </div>

        {/* ========================================================= */}
        {/* INPUT PENCARIAN */}
        {/* ========================================================= */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Cari nama siswa/guru (Terurut A-Z), kelas, atau RFID UID..."
            className="w-full bg-white border border-orange-200 rounded-2xl px-5 py-3.5 pl-11 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        {/* ========================================================= */}
        {/* TABEL DATA ABSENSI */}
        {/* ========================================================= */}
        <div className="bg-white rounded-2xl border border-orange-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs md:text-sm">
              <thead>
                <tr className="border-b border-orange-100 bg-orange-50/50 text-orange-800 font-bold uppercase tracking-wider">
                  <th className="py-4 px-4">Status Hari Ini</th>
                  <th className="py-4 px-4">Waktu Tap</th>
                  <th className="py-4 px-4">Nama Siswa / Guru</th>
                  <th className="py-4 px-4">Kelas / Jabatan</th>
                  <th className="py-4 px-4">RFID UID</th>
                  <th className="py-4 px-4">Pengubah Status (Audit)</th>
                  <th className="py-4 px-4 text-center">Aksi & Rincian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-orange-100">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-gray-400">
                      🔄 Memuat data absensi...
                    </td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-gray-400">
                      🔍 Tidak ada data absensi yang ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((row) => {
                    const isGuru = (row.kelas || '').toUpperCase().includes('GURU');
                    const timeFormatted = new Date(row.created_at).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    });

                    return (
                      <tr key={row.id} className="hover:bg-orange-50/40 transition">
                        {/* STATUS */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                              row.status === 'Hadir' || row.status === 'Hadir (TEST)'
                                ? 'bg-emerald-100 text-emerald-700'
                                : row.status === 'Izin'
                                ? 'bg-amber-100 text-amber-700'
                                : row.status === 'Sakit'
                                ? 'bg-sky-100 text-sky-700'
                                : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            {row.status || 'Hadir'}
                          </span>
                        </td>

                        {/* WAKTU TAP */}
                        <td className="py-3.5 px-4 font-mono font-medium text-gray-600">
                          {timeFormatted} WIB
                        </td>

                        {/* NAMA SISWA / GURU */}
                        <td className="py-3.5 px-4 font-bold text-gray-800">
                          {row.nama}
                        </td>

                        {/* KELAS / JABATAN */}
                        <td className="py-3.5 px-4 font-medium">
                          <span
                            className={`px-2.5 py-0.5 rounded-md text-xs font-semibold ${
                              isGuru
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {row.kelas}
                          </span>
                        </td>

                        {/* RFID UID */}
                        <td className="py-3.5 px-4 font-mono text-gray-500 uppercase">
                          {row.rfid_uid}
                        </td>

                        {/* PENGUBAH STATUS AUDIT */}
                        <td className="py-3.5 px-4 text-gray-500">
                          {row.edited_by || 'Mesin RFID YPK'}
                        </td>

                        {/* AKSI & RINCIAN TANGGAL */}
                        <td className="py-3.5 px-4 text-center font-mono text-xs text-gray-400">
                          {new Date(row.created_at).toLocaleDateString('id-ID')}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
