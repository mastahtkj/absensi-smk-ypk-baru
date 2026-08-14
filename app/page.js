'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function DashboardAbsensi() {
  const [dataAbsensi, setDataAbsensi] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedPeriode, setSelectedPeriode] = useState('Hari Ini');
  const [selectedTingkat, setSelectedTingkat] = useState('Semua');
  const [selectedJurusan, setSelectedJurusan] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');

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

  const daftarJurusan = [
    'Semua Jurusan',
    'Teknik Jaringan Komputer dan Telekomunikasi',
    'Akuntansi dan Keuangan Lembaga',
    'Manajemen Perkantoran dan Layanan Bisnis',
    'Pemasaran',
    'Bisnis dan Manajemen',
  ];

  const filteredData = useMemo(() => {
    return dataAbsensi.filter((item) => {
      const now = new Date();
      const itemDate = new Date(item.created_at);

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

      let matchesJurusan = true;
      if (selectedJurusan !== 'Semua' && selectedJurusan !== 'Semua Jurusan' && selectedTingkat !== 'GURU / STAFF') {
        matchesJurusan = (item.kelas || '').toLowerCase().includes(selectedJurusan.toLowerCase());
      }

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
    <div style={{ fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif', backgroundColor: '#fff7ed', minHeight: '100vh', padding: '24px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

        {/* CONTAINER FILTER */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #ffedd5', padding: '20px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          
          {/* PERIODE & EXPORT */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid #fed7aa', paddingBottom: '16px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 'bold', color: '#c2410c', fontSize: '14px' }}>📅 PERIODE REKAP:</span>
              {['Hari Ini', '7 Hari', 'Bulanan'].map((p) => (
                <button
                  key={p}
                  onClick={() => setSelectedPeriode(p)}
                  style={{
                    padding: '6px 16px',
                    borderRadius: '20px',
                    border: 'none',
                    fontWeight: '600',
                    fontSize: '13px',
                    cursor: 'pointer',
                    backgroundColor: selectedPeriode === p ? '#f97316' : '#fff7ed',
                    color: selectedPeriode === p ? '#ffffff' : '#9a3412',
                  }}
                >
                  {p}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleExportCSV} style={{ backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>
                📊 Export Excel (.csv) Kop + Tanggal
              </button>
              <button onClick={() => window.print()} style={{ backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>
                📄 Cetak PDF Laporan
              </button>
            </div>
          </div>

          {/* TINGKAT */}
          <div style={{ display: 'flex', items: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
            <span style={{ fontWeight: 'bold', color: '#c2410c', minWidth: '100px', fontSize: '14px' }}>🎯 TINGKAT:</span>
            {[
              { id: 'Semua', label: '🎓 Semua Tingkat' },
              { id: 'Kelas X', label: '🎒 Kelas X' },
              { id: 'Kelas XI', label: '📚 Kelas XI' },
              { id: 'Kelas XII', label: '🏆 Kelas XII' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTingkat(t.id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: 'none',
                  fontWeight: '600',
                  fontSize: '13px',
                  cursor: 'pointer',
                  backgroundColor: selectedTingkat === t.id ? '#f97316' : '#ffedd5',
                  color: selectedTingkat === t.id ? '#ffffff' : '#9a3412',
                }}
              >
                {t.label}
              </button>
            ))}

            {/* TOMBOL GURU / STAFF */}
            <button
              onClick={() => {
                setSelectedTingkat('GURU / STAFF');
                setSelectedJurusan('Semua');
              }}
              style={{
                padding: '6px 16px',
                borderRadius: '20px',
                border: selectedTingkat === 'GURU / STAFF' ? '2px solid #d97706' : 'none',
                fontWeight: 'bold',
                fontSize: '13px',
                cursor: 'pointer',
                backgroundColor: selectedTingkat === 'GURU / STAFF' ? '#d97706' : '#fef3c7',
                color: selectedTingkat === 'GURU / STAFF' ? '#ffffff' : '#78350f',
              }}
            >
              👨‍🏫 Guru / Staff
            </button>
          </div>

          {/* JURUSAN */}
          <div style={{ display: 'flex', items: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ fontWeight: 'bold', color: '#c2410c', minWidth: '100px', fontSize: '14px' }}>🏫 JURUSAN:</span>
            {daftarJurusan.map((j) => {
              const isSelected = selectedJurusan === j;
              const isDisabled = selectedTingkat === 'GURU / STAFF';
              return (
                <button
                  key={j}
                  disabled={isDisabled}
                  onClick={() => setSelectedJurusan(j)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '12px',
                    border: '1px solid #fed7aa',
                    fontWeight: '600',
                    fontSize: '12px',
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    opacity: isDisabled ? 0.4 : 1,
                    backgroundColor: isSelected ? '#ea580c' : '#ffffff',
                    color: isSelected ? '#ffffff' : '#9a3412',
                  }}
                >
                  {j === 'Semua Jurusan' ? '🏫 Semua Jurusan' : j}
                </button>
              );
            })}
          </div>

        </div>

        {/* INPUT CARI */}
        <div style={{ marginBottom: '20px' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Cari nama siswa/guru (Terurut A-Z), kelas, atau RFID UID..."
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '12px',
              border: '1px solid #fed7aa',
              outline: 'none',
              fontSize: '14px',
              boxSizing: 'border-box',
              backgroundColor: '#ffffff',
            }}
          />
        </div>

        {/* TABEL DATA */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #ffedd5', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#fff7ed', borderBottom: '1px solid #fed7aa', color: '#9a3412', fontWeight: 'bold' }}>
                <th style={{ padding: '14px 16px' }}>STATUS HARI INI</th>
                <th style={{ padding: '14px 16px' }}>WAKTU TAP</th>
                <th style={{ padding: '14px 16px' }}>NAMA SISWA / GURU</th>
                <th style={{ padding: '14px 16px' }}>KELAS / JABATAN</th>
                <th style={{ padding: '14px 16px' }}>RFID UID</th>
                <th style={{ padding: '14px 16px' }}>PENGUBAH STATUS (AUDIT)</th>
                <th style={{ padding: '14px 16px', textAlign: 'center' }}>AKSI & RINCIAN</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: '#a1a1aa' }}>
                    🔄 Memuat data absensi...
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: '#a1a1aa' }}>
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
                    <tr key={row.id} style={{ borderBottom: '1px solid #fff7ed' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontWeight: 'bold',
                            fontSize: '11px',
                            backgroundColor: row.status?.includes('Hadir') ? '#d1fae5' : '#fee2e2',
                            color: row.status?.includes('Hadir') ? '#065f46' : '#991b1b',
                          }}
                        >
                          {row.status || 'Hadir'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 'bold', color: '#4b5563' }}>
                        {timeFormatted} WIB
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 'bold', color: '#1f2937' }}>
                        {row.nama}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontWeight: 'bold',
                            fontSize: '11px',
                            backgroundColor: isGuru ? '#fef3c7' : '#f3f4f6',
                            color: isGuru ? '#92400e' : '#374151',
                            border: isGuru ? '1px solid #fde68a' : 'none',
                          }}
                        >
                          {row.kelas}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#6b7280' }}>
                        {row.rfid_uid}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#6b7280' }}>
                        {row.edited_by || 'Mesin RFID YPK'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontFamily: 'monospace', color: '#9ca3af', fontSize: '11px' }}>
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
  );
}
