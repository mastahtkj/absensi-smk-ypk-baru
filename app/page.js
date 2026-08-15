'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

// Inisialisasi Supabase Client-side
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vyvyuxswnicqawhhogbf.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

const supabase = createClient(supabaseUrl, supabaseKey);

// --- INLINE SVG ICONS (SOLUSI BEBAS ERROR DEPLOYMENT) ---
const IconUsers = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
);
const IconUserCheck = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);
const IconClock = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);
const IconUserX = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" /></svg>
);
const IconRadio = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728M8.464 15.536a5 5 0 010-7.072m7.072 0a5 5 0 010 7.072M12 12h.01" /></svg>
);
const IconSearch = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
);
const IconRefreshCw = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
);
const IconAlertCircle = ({ className = "w-3.5 h-3.5" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 0 0118 0z" /></svg>
);
const IconTrendingUp = ({ className = "w-3.5 h-3.5" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
);
const IconBellRing = ({ className = "w-7 h-7" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
);
const IconAward = ({ className = "w-3.5 h-3.5" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
);
const IconBookOpen = ({ className = "w-3.5 h-3.5" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
);

export default function DashboardPage() {
  const [absensiLogs, setAbsensiLogs] = useState([]);
  const [rfidCards, setRfidCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterKelas, setFilterKelas] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('absensi');

  const [stats, setStats] = useState({
    totalSiswa: 0,
    hadirToday: 0,
    telatToday: 0,
    tanpaKeterangan: 0
  });

  const [latestScan, setLatestScan] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const toastTimeoutRef = useRef(null);

  useEffect(() => {
    fetchInitialData();

    const absensiChannel = supabase
      .channel('realtime-absensi-ui')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'absensi' },
        (payload) => {
          fetchInitialData();

          if (payload.new) {
            triggerRealtimeToast({
              nama: payload.new.nama || 'Siswa / Guru',
              kelas: payload.new.kelas || '-',
              status: payload.new.status || 'Hadir',
              waktu: payload.new.waktu || new Date().toLocaleTimeString('id-ID')
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(absensiChannel);
    };
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);

      const { data: logs, error: logsError } = await supabase
        .from('absensi')
        .select('*')
        .order('created_at', { ascending: false });

      if (logsError) throw logsError;

      const { data: cards, error: cardsError } = await supabase
        .from('rfid_cards')
        .select('*');

      if (cardsError) throw cardsError;

      setAbsensiLogs(logs || []);
      setRfidCards(cards || []);
      calculateStats(logs || [], cards || []);

    } catch (err) {
      console.error('Error Fetch Data Supabase:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (logs, cards) => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    const todayLogs = logs.filter(log => {
      if (!log.created_at) return false;
      return log.created_at.startsWith(todayStr);
    });

    const totalRegistered = cards.length;
    const hadir = todayLogs.filter(l => l.status === 'Hadir' || l.status === 'Hadir (TEST)').length;
    const telat = todayLogs.filter(l => l.status === 'Telat' || l.status === 'Telat (TEST)').length;
    const alpha = Math.max(0, totalRegistered - (hadir + telat));

    setStats({
      totalSiswa: totalRegistered,
      hadirToday: hadir,
      telatToday: telat,
      tanpaKeterangan: alpha
    });
  };

  const triggerRealtimeToast = (data) => {
    setLatestScan(data);
    setShowToast(true);

    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }

    toastTimeoutRef.current = setTimeout(() => {
      setShowToast(false);
    }, 6000);
  };

  const filteredLogs = absensiLogs.filter(item => {
    const matchesSearch = (item.nama || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.rfid_uid || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesKelas = filterKelas === 'ALL' || item.kelas === filterKelas;
    return matchesSearch && matchesKelas;
  });

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans pb-12">
      {/* Realtime Toast Notification */}
      {showToast && latestScan && (
        <div className="fixed top-5 right-5 z-50 animate-bounce duration-300">
          <div className="bg-slate-800 border-2 border-cyan-500 text-white p-4 rounded-xl shadow-2xl flex items-start gap-4 max-w-md">
            <div className={`p-3 rounded-lg ${latestScan.status.includes('Telat') ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
              <IconBellRing className="w-7 h-7 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-cyan-400">{latestScan.nama}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 font-mono">
                  {latestScan.kelas}
                </span>
              </div>
              <p className="text-sm text-slate-300 mt-1">
                Berhasil Presensi Pada: <span className="font-mono text-white font-semibold">{latestScan.waktu}</span>
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className={`text-xs px-2.5 py-1 rounded-md font-bold uppercase tracking-wider ${
                  latestScan.status.includes('Telat') ? 'bg-amber-500 text-slate-950' : 'bg-emerald-500 text-slate-950'
                }`}>
                  STATUS: {latestScan.status}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header Dashboard */}
      <header className="bg-slate-800/80 backdrop-blur border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-600 rounded-xl shadow-lg shadow-cyan-600/30">
              <IconRadio className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                PRESENSI DIGITAL RFID - SMK YPK MEDAN
              </h1>
              <p className="text-xs text-slate-400">Monitoring Absensi Realtime & Notifikasi WA Terintegrasi</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={fetchInitialData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-semibold text-slate-200 transition-all border border-slate-600"
            >
              <IconRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
              Refresh Data
            </button>
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              Realtime Active
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* Ringkasan Kartu Statistik */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 hover:border-cyan-500/40 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Siswa Terdaftar</p>
                <h3 className="text-3xl font-extrabold text-white mt-1">{stats.totalSiswa}</h3>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
                <IconUsers className="w-6 h-6" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3 flex items-center gap-1">
              <IconBookOpen className="w-3.5 h-3.5" /> Database RFID Aktif
            </p>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 hover:border-emerald-500/40 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Hadir Tepat Waktu</p>
                <h3 className="text-3xl font-extrabold text-emerald-400 mt-1">{stats.hadirToday}</h3>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
                <IconUserCheck className="w-6 h-6" />
              </div>
            </div>
            <p className="text-xs text-emerald-500/80 mt-3 flex items-center gap-1">
              <IconAward className="w-3.5 h-3.5" /> Sebelum 07:00 WIB
            </p>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 hover:border-amber-500/40 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Terlambat</p>
                <h3 className="text-3xl font-extrabold text-amber-400 mt-1">{stats.telatToday}</h3>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400">
                <IconClock className="w-6 h-6" />
              </div>
            </div>
            <p className="text-xs text-amber-500/80 mt-3 flex items-center gap-1">
              <IconAlertCircle className="w-3.5 h-3.5" /> Lewat Jam 07:00 WIB
            </p>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 hover:border-rose-500/40 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Belum Tap / Alpha</p>
                <h3 className="text-3xl font-extrabold text-rose-400 mt-1">{stats.tanpaKeterangan}</h3>
              </div>
              <div className="p-3 bg-rose-500/10 rounded-xl text-rose-400">
                <IconUserX className="w-6 h-6" />
              </div>
            </div>
            <p className="text-xs text-rose-500/80 mt-3 flex items-center gap-1">
              <IconTrendingUp className="w-3.5 h-3.5" /> Estimasi Hari Ini
            </p>
          </div>

        </div>

        {/* Tab Switcher & Filter */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            
            <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-700 w-full md:w-auto">
              <button
                onClick={() => setActiveTab('absensi')}
                className={`flex-1 md:flex-initial px-5 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'absensi' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Riwayat Log Absensi ({filteredLogs.length})
              </button>
              <button
                onClick={() => setActiveTab('kartu')}
                className={`flex-1 md:flex-initial px-5 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'kartu' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Data Kartu RFID Terdaftar ({rfidCards.length})
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <IconSearch className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari Nama / UID Kartu..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {activeTab === 'absensi' && (
                <select
                  value={filterKelas}
                  onChange={(e) => setFilterKelas(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="ALL">Semua Kelas</option>
                  <option value="X RPL">X RPL</option>
                  <option value="XI RPL">XI RPL</option>
                  <option value="XII RPL">XII RPL</option>
                  <option value="X TKJ">X TKJ</option>
                  <option value="XI TKJ">XI TKJ</option>
                  <option value="XII TKJ">XII TKJ</option>
                </select>
              )}
            </div>

          </div>
        </div>

        {/* Tabel Data Absensi */}
        {activeTab === 'absensi' && (
          <div className="bg-slate-800/40 border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-800/80 border-b border-slate-700 text-slate-400 text-xs uppercase font-semibold">
                    <th className="py-4 px-6">Waktu Tap</th>
                    <th className="py-4 px-6">Nama Siswa</th>
                    <th className="py-4 px-6">Kelas</th>
                    <th className="py-4 px-6">UID RFID</th>
                    <th className="py-4 px-6">Status Kehadiran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50 text-sm">
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-slate-500">
                        <IconRefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
                        Memuat data absensi...
                      </td>
                    </tr>
                  ) : filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-slate-500 font-medium">
                        Belum ada data rekaman presensi hari ini.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="py-4 px-6 font-mono text-xs text-slate-300">
                          {log.waktu || (log.created_at ? new Date(log.created_at).toLocaleTimeString('id-ID') : '-')}
                        </td>
                        <td className="py-4 px-6 font-semibold text-white">
                          {log.nama}
                        </td>
                        <td className="py-4 px-6">
                          <span className="px-2.5 py-1 bg-slate-700/60 border border-slate-600 rounded-lg text-xs font-mono text-slate-300">
                            {log.kelas || '-'}
                          </span>
                        </td>
                        <td className="py-4 px-6 font-mono text-xs text-cyan-400">
                          {log.rfid_uid}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                            (log.status || '').includes('Telat')
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tabel Data Kartu RFID */}
        {activeTab === 'kartu' && (
          <div className="bg-slate-800/40 border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-800/80 border-b border-slate-700 text-slate-400 text-xs uppercase font-semibold">
                    <th className="py-4 px-6">UID RFID</th>
                    <th className="py-4 px-6">Nama Lengkap</th>
                    <th className="py-4 px-6">Kelas</th>
                    <th className="py-4 px-6">No. WA Orang Tua</th>
                    <th className="py-4 px-6">Status Kartu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50 text-sm">
                  {rfidCards.map((card) => (
                    <tr key={card.id || card.uid} className="hover:bg-slate-800/50 transition-colors">
                      <td className="py-4 px-6 font-mono text-xs text-cyan-400 font-bold">
                        {card.uid || card.rfid_uid}
                      </td>
                      <td className="py-4 px-6 font-semibold text-white">
                        {card.nama}
                      </td>
                      <td className="py-4 px-6">
                        <span className="px-2.5 py-1 bg-slate-700/60 border border-slate-600 rounded-lg text-xs font-mono text-slate-300">
                          {card.kelas || '-'}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-mono text-xs text-slate-300">
                        {card.no_hp || card.phone || card.whatsapp || '-'}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          card.status_kartu === 'Unassigned' 
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}>
                          {card.status_kartu || 'Active'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
