'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Swal from 'sweetalert2';
import { formatWhatsAppUrl } from '../lib/whatsapp';

export default function AttendanceAnalyticsView({
  siswaList = [],
  logs = [],
  supabase,
  currentUser,
}) {
  const [selectedKelas, setSelectedKelas] = useState('ALL');
  const [selectedPeriod, setSelectedPeriod] = useState('7_days'); // 'today', '7_days', '30_days', 'all'
  const [absentFilter, setAbsentFilter] = useState('ALL'); // 'ALL', '1x', '2x', '3x_plus'
  const [searchQuery, setSearchQuery] = useState('');
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Extract unique classes from siswaList
  const classList = useMemo(() => {
    const set = new Set();
    siswaList.forEach((s) => {
      if (s.kelas) set.add(s.kelas.trim());
    });
    const defaultClasses = [
      'X TJKT 1', 'X TJKT 2', 'XI TJKT', 'XII TJKT',
      'X MPLB 1', 'X MPLB 2', 'XI MPLB', 'XII MPLB',
      'X AKL', 'XI AKL', 'XII AKL',
      'X PM', 'XI PM', 'XII PM'
    ];
    defaultClasses.forEach(c => set.add(c));
    return Array.from(set).sort();
  }, [siswaList]);

  // Fetch or sync attendance data
  const fetchAttendance = async () => {
    setLoading(true);
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('absensi')
          .select('*')
          .order('id', { ascending: false })
          .limit(1000);

        if (!error && data && data.length > 0) {
          setAttendanceData(data);
          setLoading(false);
          return;
        }
      }
      // Fallback to passed logs
      if (Array.isArray(logs) && logs.length > 0) {
        setAttendanceData(logs);
      }
    } catch (e) {
      console.warn('Attendance fetch fallback:', e);
      if (Array.isArray(logs)) setAttendanceData(logs);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  // Filter logs by period
  const filteredLogs = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return attendanceData.filter((log) => {
      const logDateStr = log.tanggal || (log.created_at ? log.created_at.split('T')[0] : '');
      if (!logDateStr) return true;

      if (selectedPeriod === 'today') {
        return logDateStr === todayStr;
      }
      if (selectedPeriod === '7_days') {
        const diffDays = (now - new Date(logDateStr)) / (1000 * 60 * 60 * 24);
        return diffDays <= 7;
      }
      if (selectedPeriod === '30_days') {
        const diffDays = (now - new Date(logDateStr)) / (1000 * 60 * 60 * 24);
        return diffDays <= 30;
      }
      return true; // 'all'
    });
  }, [attendanceData, selectedPeriod]);

  // Aggregate stats per student
  const studentAbsenteeismRadar = useMemo(() => {
    // Map each student
    const radar = [];

    siswaList.forEach((s) => {
      const studentName = s.nama || s.nama_siswa || s.username || '';
      const studentKelas = s.kelas || '';

      if (selectedKelas !== 'ALL' && studentKelas !== selectedKelas) {
        return;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = studentName.toLowerCase().includes(q);
        const matchesNisn = (s.nisn || s.nis || '').includes(q);
        const matchesKelas = studentKelas.toLowerCase().includes(q);
        if (!matchesName && !matchesNisn && !matchesKelas) return;
      }

      // Check attendance logs for this student
      const studentLogs = filteredLogs.filter((l) => {
        const lNama = (l.nama || l.nama_siswa || '').toLowerCase().trim();
        const sNama = studentName.toLowerCase().trim();
        return lNama === sNama || (l.siswa_id && l.siswa_id === s.id);
      });

      // Count absence types
      const absentLogs = studentLogs.filter((l) => {
        const st = (l.status || '').toLowerCase();
        return st === 'alpha' || st === 'tidak hadir' || st === 'alpa' || st === 'absen';
      });

      const sickLogs = studentLogs.filter((l) => (l.status || '').toLowerCase() === 'sakit');
      const permitLogs = studentLogs.filter((l) => (l.status || '').toLowerCase() === 'izin');
      const presentLogs = studentLogs.filter((l) => {
        const st = (l.status || '').toLowerCase();
        return st === 'hadir' || st === 'terlambat' || st === 'masuk';
      });

      const absentCount = absentLogs.length;

      // Extract phone numbers
      let phone = s.telepon || s.biodata?.telepon || s.biodata?.telepon_siswa || '';
      let parentPhone = s.telepon_ortu || s.biodata?.ortuKontak || s.biodata?.telepon_ortu || '';

      // If student has absences or if viewing all
      radar.push({
        student: s,
        nama: studentName,
        kelas: studentKelas,
        nisn: s.nisn || s.nis || '-',
        foto_url: s.foto_url || s.biodata?.foto_resmi || s.biodata?.foto_url || '/logo.png',
        telepon: phone,
        teleponOrtu: parentPhone,
        absentCount,
        absentDates: absentLogs.map((l) => l.tanggal || l.created_at?.split('T')[0] || 'Hari Ini'),
        sickCount: sickLogs.length,
        permitCount: permitLogs.length,
        presentCount: presentLogs.length,
        totalRecorded: studentLogs.length,
      });
    });

    // Apply absent filter
    return radar.filter((r) => {
      if (absentFilter === '1x') return r.absentCount === 1;
      if (absentFilter === '2x') return r.absentCount === 2;
      if (absentFilter === '3x_plus') return r.absentCount >= 3;
      return true; // 'ALL'
    }).sort((a, b) => b.absentCount - a.absentCount || a.nama.localeCompare(b.nama));
  }, [siswaList, filteredLogs, selectedKelas, searchQuery, absentFilter]);

  // Stats KPI overall
  const overallStats = useMemo(() => {
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalSick = 0;
    let totalPermit = 0;

    filteredLogs.forEach((l) => {
      if (selectedKelas !== 'ALL' && l.kelas && l.kelas !== selectedKelas) return;
      const st = (l.status || '').toLowerCase();
      if (st === 'hadir' || st === 'terlambat') totalPresent++;
      else if (st === 'alpha' || st === 'tidak hadir' || st === 'alpa') totalAbsent++;
      else if (st === 'sakit') totalSick++;
      else if (st === 'izin') totalPermit++;
    });

    const totalRecords = totalPresent + totalAbsent + totalSick + totalPermit;
    const presentRate = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 100;

    const count1x = studentAbsenteeismRadar.filter((r) => r.absentCount === 1).length;
    const count2x = studentAbsenteeismRadar.filter((r) => r.absentCount === 2).length;
    const count3x = studentAbsenteeismRadar.filter((r) => r.absentCount >= 3).length;

    return {
      totalPresent,
      totalAbsent,
      totalSick,
      totalPermit,
      totalRecords,
      presentRate,
      count1x,
      count2x,
      count3x,
    };
  }, [filteredLogs, selectedKelas, studentAbsenteeismRadar]);

  // Class by class statistics for progress chart
  const classBreakdown = useMemo(() => {
    const map = {};

    classList.forEach((cls) => {
      map[cls] = { hadir: 0, alpha: 0, izin: 0, sakit: 0, total: 0 };
    });

    filteredLogs.forEach((l) => {
      const cls = l.kelas?.trim();
      if (cls && map[cls]) {
        const st = (l.status || '').toLowerCase();
        if (st === 'hadir' || st === 'terlambat') map[cls].hadir++;
        else if (st === 'alpha' || st === 'tidak hadir' || st === 'alpa') map[cls].alpha++;
        else if (st === 'sakit') map[cls].sakit++;
        else if (st === 'izin') map[cls].izin++;
        map[cls].total++;
      }
    });

    return Object.entries(map).map(([cls, data]) => {
      const rate = data.total > 0 ? Math.round((data.hadir / data.total) * 100) : 100;
      return {
        kelas: cls,
        rate,
        ...data,
      };
    }).sort((a, b) => b.rate - a.rate);
  }, [classList, filteredLogs]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 🧭 HEADER STATISTIK & RADAR KEHADIRAN */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)',
          borderRadius: '16px',
          padding: '24px',
          color: '#ffffff',
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.3)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', backgroundColor: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', padding: '4px 10px', borderRadius: '20px', border: '1px solid rgba(56, 189, 248, 0.4)' }}>
              REKAPITULASI PRESENSI OTOMATIS AI
            </span>
            <span style={{ fontSize: '11px', fontWeight: '800', backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34d399', padding: '4px 10px', borderRadius: '20px', border: '1px solid rgba(52, 211, 153, 0.4)' }}>
              🟢 REALTIME RADAR
            </span>
          </div>
          <h2 style={{ margin: '4px 0 6px 0', fontSize: '22px', fontWeight: '900', letterSpacing: '-0.5px' }}>
            📊 Grafik Kehadiran Siswa &amp; Radar Ketidakhadiran
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#93c5fd', maxWidth: '650px', lineHeight: '1.5' }}>
            Pantau persentase presensi seluruh kelas secara visual. Guru Admin &amp; Admin Master dapat langsung mendeteksi siswa yang <b>1x tidak hadir</b>, <b>2x tidak hadir</b>, maupun alpa beruntun serta langsung menghubungi orang tua via WhatsApp.
          </p>
        </div>

        <button
          onClick={fetchAttendance}
          disabled={loading}
          style={{
            backgroundColor: '#2563eb',
            color: '#ffffff',
            border: 'none',
            borderRadius: '10px',
            padding: '10px 18px',
            fontWeight: '700',
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)',
            transition: 'all 0.2s',
          }}
        >
          <span>{loading ? '🔄 Menyegarkan...' : '⚡ Refresh Data'}</span>
        </button>
      </div>

      {/* 🎛️ FILTER BAR: KELAS, PERIODE & PENCARIAN */}
      <div
        className="stardust-white-card"
        style={{
          borderRadius: '14px',
          padding: '16px 20px',
          border: '1px solid #e2e8f0',
          backgroundColor: '#ffffff',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px',
          alignItems: 'center',
        }}
      >
        {/* FILTER KELAS */}
        <div>
          <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 'bold', color: '#475569', marginBottom: '6px' }}>
            🏫 Filter Kelas:
          </label>
          <select
            value={selectedKelas}
            onChange={(e) => setSelectedKelas(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: '8px',
              border: '1.5px solid #cbd5e1',
              fontSize: '13px',
              fontWeight: '600',
              color: '#0f172a',
              backgroundColor: '#f8fafc',
            }}
          >
            <option value="ALL">🌟 Semua Kelas ({classList.length} Kelas)</option>
            {classList.map((cls) => (
              <option key={cls} value={cls}>
                {cls}
              </option>
            ))}
          </select>
        </div>

        {/* FILTER PERIODE WAKTU */}
        <div>
          <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 'bold', color: '#475569', marginBottom: '6px' }}>
            📅 Rentang Waktu:
          </label>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: '8px',
              border: '1.5px solid #cbd5e1',
              fontSize: '13px',
              fontWeight: '600',
              color: '#0f172a',
              backgroundColor: '#f8fafc',
            }}
          >
            <option value="today">Hari Ini</option>
            <option value="7_days">7 Hari Terakhir</option>
            <option value="30_days">30 Hari Terakhir (Bulan Ini)</option>
            <option value="all">Semua Riwayat Database</option>
          </select>
        </div>

        {/* PENCARIAN SISWA */}
        <div>
          <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 'bold', color: '#475569', marginBottom: '6px' }}>
            🔍 Cari Siswa / NISN:
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Ketik nama atau NISN..."
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: '8px',
              border: '1.5px solid #cbd5e1',
              fontSize: '13px',
              color: '#0f172a',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* 📊 KPI KARTU STATISTIK KEHADIRAN */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
        <div style={{ backgroundColor: '#ffffff', border: '1.5px solid #bbf7d0', borderRadius: '12px', padding: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#166534', display: 'block' }}>🟢 Tingkat Kehadiran</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '4px' }}>
            <span style={{ fontSize: '28px', fontWeight: '900', color: '#15803d' }}>{overallStats.presentRate}%</span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>({overallStats.totalPresent} hadir)</span>
          </div>
          <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: '600', marginTop: '4px', display: 'block' }}>Rata-rata Presensi Positif</span>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1.5px solid #fecdd3', borderRadius: '12px', padding: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#9f1239', display: 'block' }}>🔴 Total Alpha / Alpa</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '4px' }}>
            <span style={{ fontSize: '28px', fontWeight: '900', color: '#e11d48' }}>{overallStats.totalAbsent}</span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Catatan Tidak Hadir</span>
          </div>
          <span style={{ fontSize: '11px', color: '#e11d48', fontWeight: '600', marginTop: '4px', display: 'block' }}>Perlu Pemantauan Segera</span>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1.5px solid #fde68a', borderRadius: '12px', padding: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#854d0e', display: 'block' }}>⚠️ Siswa 1x Tidak Hadir</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '4px' }}>
            <span style={{ fontSize: '28px', fontWeight: '900', color: '#d97706' }}>{overallStats.count1x}</span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Siswa</span>
          </div>
          <span style={{ fontSize: '11px', color: '#b45309', fontWeight: '600', marginTop: '4px', display: 'block' }}>Peringatan Dini Wali Kelas</span>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1.5px solid #fed7aa', borderRadius: '12px', padding: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#9a3412', display: 'block' }}>🚨 Siswa 2x Tidak Hadir</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '4px' }}>
            <span style={{ fontSize: '28px', fontWeight: '900', color: '#ea580c' }}>{overallStats.count2x}</span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Siswa</span>
          </div>
          <span style={{ fontSize: '11px', color: '#ea580c', fontWeight: '600', marginTop: '4px', display: 'block' }}>Teguran &amp; Konfirmasi Ortu</span>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1.5px solid #fecaca', borderRadius: '12px', padding: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#b91c1c', display: 'block' }}>🔥 Siswa &ge; 3x Tidak Hadir</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '4px' }}>
            <span style={{ fontSize: '28px', fontWeight: '900', color: '#dc2626' }}>{overallStats.count3x}</span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Siswa</span>
          </div>
          <span style={{ fontSize: '11px', color: '#dc2626', fontWeight: '700', marginTop: '4px', display: 'block' }}>Panggilan Orang Tua / BK</span>
        </div>
      </div>

      {/* 📈 GRAFIK PERSENTASE KEHADIRAN PER KELAS */}
      <div
        className="stardust-white-card"
        style={{
          borderRadius: '16px',
          padding: '20px',
          border: '1.5px solid #e2e8f0',
          backgroundColor: '#ffffff',
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
              📈 Grafik Persentase Presensi Tiap Kelas
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
              Tampilan visual tingkat kedisiplinan dan absensi siswa per rombel
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', fontSize: '11px', fontWeight: 'bold' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#16a34a' }}>
              <span style={{ width: '10px', height: '10px', backgroundColor: '#22c55e', borderRadius: '50%' }}></span> &ge; 90% (Sangat Baik)
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#d97706' }}>
              <span style={{ width: '10px', height: '10px', backgroundColor: '#f59e0b', borderRadius: '50%' }}></span> 75 - 89% (Cukup)
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626' }}>
              <span style={{ width: '10px', height: '10px', backgroundColor: '#ef4444', borderRadius: '50%' }}></span> &lt; 75% (Perlu Perhatian)
            </span>
          </div>
        </div>

        {/* PROGRESS BARS PER KELAS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {classBreakdown.slice(0, selectedKelas === 'ALL' ? 14 : 1).map((item) => {
            const barColor = item.rate >= 90 ? '#10b981' : item.rate >= 75 ? '#f59e0b' : '#ef4444';
            return (
              <div key={item.kelas} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px' }}>
                  <span style={{ fontWeight: '700', color: '#1e293b' }}>
                    {item.kelas}
                  </span>
                  <div style={{ display: 'flex', gap: '10px', fontSize: '11.5px' }}>
                    <span style={{ color: '#16a34a', fontWeight: 'bold' }}>Hadir: {item.hadir}</span>
                    <span style={{ color: '#d97706' }}>Izin/Sakit: {item.izin + item.sakit}</span>
                    <span style={{ color: '#dc2626', fontWeight: 'bold' }}>Alpha: {item.alpha}</span>
                    <span style={{ fontWeight: '800', color: barColor, minWidth: '45px', textAlign: 'right' }}>
                      {item.rate}%
                    </span>
                  </div>
                </div>
                {/* Visual Bar */}
                <div style={{ width: '100%', height: '10px', backgroundColor: '#f1f5f9', borderRadius: '5px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${item.rate}%`,
                      height: '100%',
                      backgroundColor: barColor,
                      borderRadius: '5px',
                      transition: 'width 0.6s ease-in-out',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 🎯 RADAR KETIDAKHADIRAN SISWA & WHATSAPP CHAT */}
      <div
        className="stardust-white-card"
        style={{
          borderRadius: '16px',
          padding: '20px',
          border: '1.5px solid #fed7aa',
          backgroundColor: '#ffffff',
          boxShadow: '0 4px 14px rgba(234, 88, 12, 0.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '20px' }}>🎯</span>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '900', color: '#9a3412' }}>
                Radar Deteksi Siswa Tidak Hadir (Langsung Kontak WA)
              </h3>
            </div>
            <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#64748b' }}>
              G.Admin dan Admin Master dapat langsung melihat riwayat siswa tidak hadir 1x, 2x, atau lebih dan menghubungi siswa/orang tua dengan 1 klik.
            </p>
          </div>

          {/* FILTER BUTTONS: ALL, 1X, 2X, 3X+ */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setAbsentFilter('ALL')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '11.5px',
                fontWeight: '700',
                border: absentFilter === 'ALL' ? '2px solid #ea580c' : '1px solid #cbd5e1',
                backgroundColor: absentFilter === 'ALL' ? '#fff7ed' : '#ffffff',
                color: absentFilter === 'ALL' ? '#ea580c' : '#475569',
                cursor: 'pointer',
              }}
            >
              Semua ({studentAbsenteeismRadar.length})
            </button>
            <button
              onClick={() => setAbsentFilter('1x')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '11.5px',
                fontWeight: '700',
                border: absentFilter === '1x' ? '2px solid #d97706' : '1px solid #cbd5e1',
                backgroundColor: absentFilter === '1x' ? '#fef3c7' : '#ffffff',
                color: absentFilter === '1x' ? '#b45309' : '#475569',
                cursor: 'pointer',
              }}
            >
              ⚠️ 1x Tidak Hadir
            </button>
            <button
              onClick={() => setAbsentFilter('2x')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '11.5px',
                fontWeight: '700',
                border: absentFilter === '2x' ? '2px solid #ea580c' : '1px solid #cbd5e1',
                backgroundColor: absentFilter === '2x' ? '#ffedd5' : '#ffffff',
                color: absentFilter === '2x' ? '#c2410c' : '#475569',
                cursor: 'pointer',
              }}
            >
              🚨 2x Tidak Hadir
            </button>
            <button
              onClick={() => setAbsentFilter('3x_plus')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '11.5px',
                fontWeight: '700',
                border: absentFilter === '3x_plus' ? '2px solid #dc2626' : '1px solid #cbd5e1',
                backgroundColor: absentFilter === '3x_plus' ? '#fee2e2' : '#ffffff',
                color: absentFilter === '3x_plus' ? '#dc2626' : '#475569',
                cursor: 'pointer',
              }}
            >
              🔥 &ge; 3x Tidak Hadir
            </button>
          </div>
        </div>

        {/* RADAR TABLE / CARDS */}
        {studentAbsenteeismRadar.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 16px', color: '#64748b' }}>
            <span style={{ fontSize: '36px', display: 'block', marginBottom: '8px' }}>🎉</span>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#0f172a' }}>
              Tidak Ada Catatan Ketidakhadiran
            </h4>
            <p style={{ margin: 0, fontSize: '12px' }}>
              Seluruh siswa pada filter terpilih hadir dengan tertib atau belum ada catatan alpha pada periode ini.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
            {studentAbsenteeismRadar.map((item, idx) => {
              const isHigh = item.absentCount >= 3;
              const isMedium = item.absentCount === 2;
              const isLow = item.absentCount === 1;

              const badgeColor = isHigh
                ? { bg: '#fee2e2', border: '#fca5a5', text: '#dc2626', icon: '🔥' }
                : isMedium
                ? { bg: '#ffedd5', border: '#fdba74', text: '#ea580c', icon: '🚨' }
                : isLow
                ? { bg: '#fef3c7', border: '#fde68a', text: '#b45309', icon: '⚠️' }
                : { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d', icon: '🟢' };

              const defaultStudentMsg = `Halo ananda ${item.nama} (${item.kelas}), kami dari Tim Guru Admin SMK YPK Medan ingin mengonfirmasi alasan ketidakhadiran pada sesi presensi sekolah.`;
              const defaultParentMsg = `Yth. Bapak/Ibu Wali dari ${item.nama} (Kelas ${item.kelas}), kami dari SMK YPK Medan menginformasikan catatan kehadiran ananda (${item.absentCount}x tidak hadir). Mohon konfirmasinya. Terima kasih.`;

              return (
                <div
                  key={item.student.id || idx}
                  style={{
                    borderRadius: '12px',
                    padding: '14px',
                    border: `1.5px solid ${badgeColor.border}`,
                    backgroundColor: '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '10px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    {/* AVATAR DARI FOTO KARTU ID */}
                    <img
                      src={item.foto_url}
                      alt={item.nama}
                      style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '10px',
                        objectFit: 'cover',
                        border: '1.5px solid #cbd5e1',
                        backgroundColor: '#f1f5f9',
                        flexShrink: 0,
                      }}
                      onError={(e) => {
                        e.currentTarget.src = '/logo.png';
                      }}
                    />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                        <h4 style={{ margin: 0, fontSize: '13.5px', fontWeight: '800', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.nama}
                        </h4>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: '800',
                            backgroundColor: badgeColor.bg,
                            color: badgeColor.text,
                            padding: '2px 8px',
                            borderRadius: '6px',
                            border: `1px solid ${badgeColor.border}`,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {badgeColor.icon} {item.absentCount}x Alpha
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                        <span>🏫 <b>{item.kelas}</b></span>
                        <span>•</span>
                        <span>NISN: {item.nisn}</span>
                      </div>

                      {/* RINCIAN TANGGAL KETIDAKHADIRAN */}
                      {item.absentDates.length > 0 && (
                        <div style={{ marginTop: '6px', fontSize: '10.5px', color: '#b45309', backgroundColor: '#fffbeb', padding: '4px 8px', borderRadius: '6px', border: '1px solid #fef3c7' }}>
                          📅 <b>Tgl Tidak Hadir:</b> {item.absentDates.slice(0, 3).join(', ')}
                          {item.absentDates.length > 3 && ` (+${item.absentDates.length - 3} lainnya)`}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* TOMBOL AKSI CHAT WHATSAPP LANGSUNG */}
                  <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '10px', marginTop: '4px' }}>
                    {/* CHAT WA SISWA */}
                    {item.telepon && item.telepon !== '-' && formatWhatsAppUrl(item.telepon) ? (
                      <a
                        href={formatWhatsAppUrl(item.telepon, defaultStudentMsg)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          flex: 1,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '5px',
                          backgroundColor: '#dcfce7',
                          color: '#15803d',
                          border: '1px solid #86efac',
                          borderRadius: '8px',
                          padding: '6px 8px',
                          fontSize: '11px',
                          fontWeight: '700',
                          textDecoration: 'none',
                          cursor: 'pointer',
                        }}
                        title={`Chat WA Siswa (${item.telepon})`}
                      >
                        <span>💬 WA Siswa</span>
                      </a>
                    ) : (
                      <button
                        disabled
                        style={{
                          flex: 1,
                          backgroundColor: '#f1f5f9',
                          color: '#94a3b8',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          padding: '6px 8px',
                          fontSize: '10.5px',
                          fontWeight: '600',
                          cursor: 'not-allowed',
                        }}
                      >
                        No WA Siswa (-)
                      </button>
                    )}

                    {/* CHAT WA ORANG TUA */}
                    {item.teleponOrtu && item.teleponOrtu !== '-' && formatWhatsAppUrl(item.teleponOrtu) ? (
                      <a
                        href={formatWhatsAppUrl(item.teleponOrtu, defaultParentMsg)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          flex: 1,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '5px',
                          backgroundColor: '#ea580c',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '6px 8px',
                          fontSize: '11px',
                          fontWeight: '700',
                          textDecoration: 'none',
                          cursor: 'pointer',
                          boxShadow: '0 2px 6px rgba(234, 88, 12, 0.25)',
                        }}
                        title={`Chat WA Orang Tua (${item.teleponOrtu})`}
                      >
                        <span>👨‍👩‍👧 Chat Orang Tua</span>
                      </a>
                    ) : (
                      <button
                        disabled
                        style={{
                          flex: 1,
                          backgroundColor: '#f1f5f9',
                          color: '#94a3b8',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          padding: '6px 8px',
                          fontSize: '10.5px',
                          fontWeight: '600',
                          cursor: 'not-allowed',
                        }}
                      >
                        No WA Ortu (-)
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
