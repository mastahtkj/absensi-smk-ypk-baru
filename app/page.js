'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

// --- SUPABASE CLIENT ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function Page() {
  // --- STATE TAMPILAN (LOADING -> LOGIN -> DASHBOARD) ---
  const [isInitializing, setIsInitializing] = useState(true);
  const [initProgress, setInitProgress] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // --- STATE FORM LOGIN ---
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // --- STATE DATA ABSENSI ---
  const [dataAbsensi, setDataAbsensi] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  // --- STATE FILTER DASHBOARD ---
  const [selectedPeriode, setSelectedPeriode] = useState('Hari Ini');
  const [selectedTingkat, setSelectedTingkat] = useState('Semua');
  const [selectedJurusan, setSelectedJurusan] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');

  // 1. EFEK SIMULASI INITIALIZING SYSTEM
  useEffect(() => {
    const interval = setInterval(() => {
      setInitProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setIsInitializing(false), 400);
          return 100;
        }
        return prev + 15;
      });
    }, 120);

    return () => clearInterval(interval);
  }, []);

  // 2. FETCH DATA ABSENSI DARI SUPABASE
  const fetchAbsensi = async () => {
    setLoadingData(true);
    try {
      const { data, error } = await supabase
        .from('absensi')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDataAbsensi(data || []);
    } catch (err) {
      console.error('Error fetch absensi:', err.message);
    } finally {
      setLoadingData(false);
    }
  };

  // 3. REALTIME LISTENER SUPABASE
  useEffect(() => {
    if (isLoggedIn) {
      fetchAbsensi();

      const channel = supabase
        .channel('realtime_absensi_page')
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
    }
  }, [isLoggedIn]);

  // HANDLER LOGIN
  const handleLogin = (e) => {
    e.preventDefault();
    if (!username || !password) {
      setLoginError('Silakan isi username dan password!');
      return;
    }
    // Bypass / Akun Guru Iqbal / Admin
    setLoginError('');
    setIsLoggedIn(true);
  };

  // DAFTAR JURUSAN
  const daftarJurusan = [
    'Semua Jurusan',
    'Teknik Jaringan Komputer dan Telekomunikasi',
    'Akuntansi dan Keuangan Lembaga',
    'Manajemen Perkantoran dan Layanan Bisnis',
    'Pemasaran',
    'Bisnis dan Manajemen',
  ];

  // LOGIKA FILTERING DATA
  const filteredData = useMemo(() => {
    return dataAbsensi.filter((item) => {
      const now = new Date();
      const itemDate = new Date(item.created_at);

      // Filter Periode
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

      // Filter Tingkat (Termasuk Guru / Staff)
      let matchesTingkat = true;
      const kelasUpper = (item.kelas || '').toUpperCase();

      if (selectedTingkat === 'Kelas X') {
        matchesTingkat = kelasUpper.startsWith('X ') || kelasUpper === 'X';
      } else if (selectedTingkat === 'Kelas XI') {
        matchesTingkat = kelasUpper.startsWith('XI ') || kelasUpper === 'XI';
      } else if (selectedTingkat === 'Kelas XII') {
        matchesTingkat = kelasUpper.startsWith('XII ') || kelasUpper === 'XII';
      } else if (selectedTingkat === 'GURU / STAFF') {
        matchesTingkat = kelasUpper.includes('GURU') || kelasUpper.includes('STAFF');
      }

      // Filter Jurusan
      let matchesJurusan = true;
      if (selectedJurusan !== 'Semua' && selectedJurusan !== 'Semua Jurusan' && selectedTingkat !== 'GURU / STAFF') {
        matchesJurusan = (item.kelas || '').toLowerCase().includes(selectedJurusan.toLowerCase());
      }

      // Filter Pencarian
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

  // HANDLER EXPORT EXCEL
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

  // =========================================================================
  // TAMPILAN 1: PROSES INISIALISASI / LOADING SCREEN
  // =========================================================================
  if (isInitializing) {
    return (
      <div className="relative min-h-screen w-full flex items-center justify-center bg-gray-900 overflow-hidden font-sans">
        {/* Background Gedung YPK */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30 blur-xs"
          style={{ backgroundImage: `url('https://images.unsplash.com/photo-1562774053-701939374585?q=80&w=1000')` }}
        />
        <div className="absolute inset-0 bg-black/40" />

        <div className="relative z-10 bg-white/95 backdrop-blur-md rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl text-center border border-white/20">
          <div className="flex justify-between items-center mb-4">
            <span />
            <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              • SYSTEM ONLINE
            </span>
          </div>

          <div className="w-20 h-20 mx-auto mb-3 flex items-center justify-center bg-orange-50 rounded-2xl p-2 border border-orange-100">
            <img src="https://upload.wikimedia.org/wikipedia/commons/9/99/Sample_User_Icon.png" alt="YPK Logo" className="w-full h-full object-contain" />
          </div>

          <p className="text-xs font-extrabold uppercase tracking-widest text-orange-600 mb-1">
            SERVER ABSENSI DIGITAL
          </p>
          <h1 className="text-xl font-black text-gray-800 mb-1">SMK YPK MEDAN</h1>
          <p className="text-xs text-gray-500 mb-6">Menghubungkan Server Presensi RFID Real-Time...</p>

          <div className="w-full bg-orange-100 h-3 rounded-full overflow-hidden mb-2">
            <div
              className="bg-gradient-to-r from-orange-500 to-amber-500 h-full transition-all duration-300 rounded-full"
              style={{ width: `${initProgress}%` }}
            />
          </div>
          <p className="text-xs font-bold text-gray-600 mb-6">Proses Inisialisasi {initProgress}%</p>

          <p className="text-xs text-orange-600 font-bold">Dibuat Oleh : TJKT Projects</p>
        </div>
      </div>
    );
  }

  // =========================================================================
  // TAMPILAN 2: PORTAL LOGIN
  // =========================================================================
  if (!isLoggedIn) {
    return (
      <div className="relative min-h-screen w-full flex items-center justify-center bg-gray-900 overflow-hidden font-sans">
        {/* Background Gedung YPK */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40"
          style={{ backgroundImage: `url('https://images.unsplash.com/photo-1562774053-701939374585?q=80&w=1000')` }}
        />
        <div className="absolute inset-0 bg-black/30" />

        <div className="relative z-10 bg-white/95 backdrop-blur-md rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl border border-white/20">
          <div className="w-20 h-20 mx-auto mb-3 flex items-center justify-center bg-orange-50 rounded-2xl p-2 border border-orange-100">
            <img src="https://upload.wikimedia.org/wikipedia/commons/9/99/Sample_User_Icon.png" alt="YPK Logo" className="w-full h-full object-contain" />
          </div>

          <h2 className="text-center text-xl font-black text-orange-600 uppercase tracking-wide">
            PORTAL ABSENSI DIGITAL
          </h2>
          <p className="text-center text-xs text-gray-500 mb-6">
            Silakan login untuk mengakses portal SMK YPK MEDAN
          </p>

          {loginError && (
            <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-600 text-xs p-3 rounded-xl text-center font-bold">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-orange-600 mb-1">
                Username / Peran:
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username"
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-orange-600 mb-1">
                Password:
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="remember" className="rounded text-orange-600 focus:ring-orange-500" />
              <label htmlFor="remember" className="text-xs text-gray-600">
                Ingat Saya di Perangkat Ini
              </label>
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold py-3 rounded-xl shadow-lg transition text-sm flex items-center justify-center gap-2"
            >
              MASUK KE DASHBOARD →
            </button>
          </form>
        </div>
      </div>
    );
  }

  // =========================================================================
  // TAMPILAN 3: DASHBOARD ABSENSI UTAMA (LENGKAP DENGAN TOMBOL GURU/STAFF)
  // =========================================================================
  return (
    <div className="min-h-screen bg-orange-50/50 p-4 md:p-8 font-sans text-gray-800">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* HEADER DASHBOARD */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-orange-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-100 rounded-xl p-1.5 border border-orange-200">
              <img src="https://upload.wikimedia.org/wikipedia/commons/9/99/Sample_User_Icon.png" alt="YPK Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-lg font-black text-gray-800">DASHBOARD PRESENSI DIGITAL</h1>
              <p className="text-xs text-orange-600 font-bold">SMK YPK MEDAN • REAL-TIME SUPABASE</p>
            </div>
          </div>
          <button
            onClick={() => setIsLoggedIn(false)}
            className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 px-4 py-2 rounded-xl text-xs font-bold transition"
          >
            🔒 Keluar / Logout
          </button>
        </div>

        {/* PANEL FILTER DASHBOARD */}
        <div className="bg-white rounded-2xl border border-orange-200 p-6 shadow-sm space-y-5">
          
          {/* BARIS 1: PERIODE REKAP & TOMBOL EXPORT */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-orange-100 pb-4">
            <div className="flex items-center gap-2">
              <span className="font-bold text-orange-700 flex items-center gap-1 text-xs md:text-sm">
                📅 PERIODE REKAP:
              </span>
              {['Hari Ini', '7 Hari', 'Bulanan'].map((periode) => (
                <button
                  key={periode}
                  onClick={() => setSelectedPeriode(periode)}
                  className={`px-4 py-1.5 rounded-full text-xs md:text-sm font-semibold transition ${
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
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs md:text-sm font-semibold shadow-sm transition flex items-center gap-2"
              >
                📊 Export Excel (.csv) Kop + Tanggal
              </button>
              <button
                onClick={() => window.print()}
                className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-xl text-xs md:text-sm font-semibold shadow-sm transition flex items-center gap-2"
              >
                📄 Cetak PDF Laporan
              </button>
            </div>
          </div>

          {/* BARIS 2: TINGKAT (TERMASUK TOMBOL GURU / STAFF) */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-orange-700 text-xs md:text-sm min-w-[90px]">
              🎯 TINGKAT:
            </span>
            <button
              onClick={() => setSelectedTingkat('Semua')}
              className={`px-3.5 py-1.5 rounded-full text-xs md:text-sm font-semibold transition ${
                selectedTingkat === 'Semua'
                  ? 'bg-orange-500 text-white'
                  : 'bg-orange-100/80 text-orange-800 hover:bg-orange-200'
              }`}
            >
              🎓 Semua Tingkat
            </button>
            <button
              onClick={() => setSelectedTingkat('Kelas X')}
              className={`px-3.5 py-1.5 rounded-full text-xs md:text-sm font-semibold transition ${
                selectedTingkat === 'Kelas X'
                  ? 'bg-orange-500 text-white'
                  : 'bg-orange-100/80 text-orange-800 hover:bg-orange-200'
              }`}
            >
              🎒 Kelas X
            </button>
            <button
              onClick={() => setSelectedTingkat('Kelas XI')}
              className={`px-3.5 py-1.5 rounded-full text-xs md:text-sm font-semibold transition ${
                selectedTingkat === 'Kelas XI'
                  ? 'bg-orange-500 text-white'
                  : 'bg-orange-100/80 text-orange-800 hover:bg-orange-200'
              }`}
            >
              📚 Kelas XI
            </button>
            <button
              onClick={() => setSelectedTingkat('Kelas XII')}
              className={`px-3.5 py-1.5 rounded-full text-xs md:text-sm font-semibold transition ${
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
                setSelectedJurusan('Semua');
              }}
              className={`px-4 py-1.5 rounded-full text-xs md:text-sm font-bold transition flex items-center gap-1.5 ${
                selectedTingkat === 'GURU / STAFF'
                  ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-300'
                  : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
              }`}
            >
              👨‍🏫 Guru / Staff
            </button>
          </div>

          {/* BARIS 3: JURUSAN */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-orange-700 text-xs md:text-sm min-w-[90px]">
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
                  className={`px-3 py-1.5 rounded-2xl text-xs font-semibold transition ${
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

        {/* INPUT PENCARIAN */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Cari nama siswa/guru (Terurut A-Z), kelas, atau RFID UID..."
            className="w-full bg-white border border-orange-200 rounded-2xl px-5 py-3.5 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        {/* TABEL DATA ABSENSI */}
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
                {loadingData ? (
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
                    const isGuru = (row.kelas || '').toUpperCase().includes('GURU') || (row.kelas || '').toUpperCase().includes('STAFF');
                    const timeFormatted = new Date(row.created_at).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    });

                    return (
                      <tr key={row.id} className="hover:bg-orange-50/40 transition">
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                              row.status === 'Hadir' || row.status === 'Hadir (TEST)' || row.status === 'Hadir (Tanpa Kartu)'
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
                        <td className="py-3.5 px-4 font-mono font-medium text-gray-600">
                          {timeFormatted} WIB
                        </td>
                        <td className="py-3.5 px-4 font-bold text-gray-800">
                          {row.nama}
                        </td>
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
                        <td className="py-3.5 px-4 font-mono text-gray-500 uppercase">
                          {row.rfid_uid}
                        </td>
                        <td className="py-3.5 px-4 text-gray-500">
                          {row.edited_by || 'Mesin RFID YPK'}
                        </td>
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
