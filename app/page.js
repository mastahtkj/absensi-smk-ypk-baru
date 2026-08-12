'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Dashboard() {
  const [dataAbsensi, setDataAbsensi] = useState([]);

  useEffect(() => {
    const ambilData = async () => {
      const { data } = await supabase
        .from('absensi')
        .select('*')
        .order('created_at', { ascending: false });
      setDataAbsensi(data || []);
    };

    ambilData();

    const channel = supabase
      .channel('absensi-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'absensi' }, (payload) => {
        setDataAbsensi((prev) => [payload.new, ...prev]);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  return (
    <div style={{ padding: '30px', fontFamily: 'Arial, sans-serif', backgroundColor: '#f4f6f9', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <h2 style={{ color: '#1a365d', textAlign: 'center', marginBottom: '5px' }}>DASHBOARD ABSENSI REAL-TIME</h2>
        <h4 style={{ color: '#718096', textAlign: 'center', marginTop: '0' }}>SMK YPK MEDAN</h4>
        <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid #eee' }} />
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#2b6cb0', color: 'white' }}>
              <th style={{ padding: '12px' }}>Waktu Tap</th>
              <th style={{ padding: '12px' }}>Nama Siswa</th>
              <th style={{ padding: '12px' }}>Kelas</th>
              <th style={{ padding: '12px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {dataAbsensi.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#a0aec0' }}>Belum ada data absensi hari ini.</td>
              </tr>
            ) : (
              dataAbsensi.map((row) => (
                <tr key={row.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '12px' }}>{new Date(row.created_at).toLocaleString('id-ID')}</td>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>{row.nama}</td>
                  <td style={{ padding: '12px' }}>{row.kelas}</td>
                  <td style={{ padding: '12px' }}>{row.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
