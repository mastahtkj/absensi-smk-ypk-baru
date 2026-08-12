'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function Dashboard() {
  const [dataAbsensi, setDataAbsensi] = useState([]);
  const [loading, setLoading] = useState(true);

  const ambilData = async () => {
    const { data, error } = await supabase
      .from('absensi')
      .select('*')
      .order('id', { ascending: false }); // Urutkan dari data terbaru

    if (!error && data) {
      setDataAbsensi(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    ambilData();
    // Auto-refresh data setiap 3 detik
    const interval = setInterval(() => {
      ambilData();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', backgroundColor: '#f4f6f9', minHeight: '100vh' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <h1 style={{ textAlign: 'center', color: '#1e3a8a', marginBottom: '5px' }}>DASHBOARD ABSENSI REAL-TIME</h1>
        <h3 style={{ textAlign: 'center', color: '#64748b', marginTop: '0' }}>SMK YPK MEDAN</h3>
        
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
          <thead>
            <tr style={{ backgroundColor: '#2563eb', color: '#fff', textAlign: 'left' }}>
              <th style={{ padding: '12px' }}>Waktu Tap</th>
              <th style={{ padding: '12px' }}>Nama Siswa</th>
              <th style={{ padding: '12px' }}>Kelas</th>
              <th style={{ padding: '12px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>Memuat data...</td>
              </tr>
            ) : dataAbsensi.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#888' }}>Belum ada data absensi.</td>
              </tr>
            ) : (
              dataAbsensi.map((item, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '12px' }}>
                    {item.created_at ? new Date(item.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : '-'}
                  </td>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>{item.nama}</td>
                  <td style={{ padding: '12px' }}>{item.kelas}</td>
                  <td style={{ padding: '12px', color: item.status?.includes('TEPAT') ? 'green' : 'red' }}>
                    {item.status}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
