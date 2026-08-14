'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Inisialisasi Supabase Direct untuk Dashboard
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function Home() {
  // State Utama Dashboard
  const [absensiList, setAbsensiList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // State Modal Login & User
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // State Edit Absensi
  const [editingRow, setEditingRow] = useState(null);
  const [newStatus, setNewStatus] = useState('Hadir');

  // Load Data Absensi & Cek Session User
  useEffect(() => {
    fetchAbsensi();
    
    // Cek Session Guru
    const savedUser = localStorage.getItem('user_guru');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }

    // Realtime Listener Supabase
    const channel = supabase
      .channel('absensi-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'absensi' }, (payload) => {
        setAbsensiList((prev) => [payload.new, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAbsensi = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('absensi')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setAbsensiList(data);
    }
    setLoading(false);
  };

  // Process Login Langsung ke Supabase (Tanpa API Tambahan yang Bikin Error)
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');

    try {
      const { data, error } = await supabase
        .from('guru')
        .select('*')
        .eq('username', username.trim())
        .eq('password', password.trim())
        .single();

      if (error || !data) {
        setLoginError('Username atau Password salah!');
      } else {
        const userData = {
          id: data.id,
          nama: data.nama,
          role: data.role || 'guru'
        };
        setUser(userData);
        localStorage.setItem('user_guru', JSON.stringify(userData));
        setShowLoginModal(false);
        setUsername('');
        setPassword('');
      }
    } catch (err) {
      setLoginError('Terjadi kesalahan sistem.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user_guru');
    setUser(null);
  };

  // Handle Edit Status Absensi (Bisa dilakukan oleh Admin & Guru)
  const handleUpdateStatus = async (id) => {
    const { error } = await supabase
      .from('absensi')
      .update({ status: newStatus })
      .eq('id', id);

    if (!error) {
      setAbsensiList((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
      );
      setEditingRow(null);
      alert('Status berhasil diperbarui!');
    } else {
      alert('Gagal memperbarui status');
    }
  };

  // Filter Data
  const filteredData = absensiList.filter((item) => {
    const matchSearch = item.nama?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        item.kelas?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchDate = filterDate ? item.created_at?.startsWith(filterDate) : true;
    return matchSearch && matchDate;
  });

  return (
    <div style={styles.bgGedung}>
      <div style={styles.overlay}>
        {/* NAVBAR HEADER */}
        <header style={styles.navbar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="https://upload.wikimedia.org/wikipedia/commons/2/27/Logo_SMK_YPK_Medan.png" 
                 onError={(e) => { e.target.src = 'https://via.placeholder.com/45?text=YPK'; }} 
                 alt="Logo YPK" style={{ width: '45px', height: '45px' }} />
            <div>
              <h1 style={styles.titleNav}>SMK YPK MEDAN</h1>
              <p style={styles.subNav}>SYSTEM PRESENSI DIGITAL RFID REAL-TIME</p>
            </div>
          </div>

          <div>
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={styles.badgeUser}>
                  👤 {user.nama} ({user.role === 'admin' ? 'ADMIN' : 'GURU'})
                </span>
                <button onClick={handleLogout} style={styles.btnDanger}>Logout</button>
              </div>
            ) : (
              <button onClick={() => setShowLoginModal(true)} style={styles.btnLoginNav}>
                🔑 Login Guru / Staff
              </button>
            )}
          </div>
        </header>

        {/* CONTAINER UTAMA */}
        <main style={styles.mainContainer}>
          {/* CONTROL BAR / FILTER */}
          <div style={styles.cardControl}>
            <input 
              type="text" 
              placeholder="🔍 Cari Nama / Kelas..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              style={styles.inputSearch} 
            />
            <input 
              type="date" 
              value={filterDate} 
              onChange={(e) => setFilterDate(e.target.value)} 
              style={styles.inputDate} 
            />
            {user?.role === 'admin' && (
              <span style={styles.adminTag}>⚡ Mode Admin Aktif (Akses Edit Penuh)</span>
            )}
          </div>

          {/* TABEL PRESENSI */}
          <div style={styles.cardTable}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div style={styles.spinner}></div>
                <p style={{ marginTop: '10px', color: '#666' }}>Menghubungkan Server Presensi Real-Time...</p>
              </div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thRow}>
                    <th style={styles.th}>WAKTU</th>
                    <th style={styles.th}>NAMA</th>
                    <th style={styles.th}>KELAS / JABATAN</th>
                    <th style={styles.th}>STATUS</th>
                    <th style={styles.th}>AKSI</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#888' }}>
                        Belum ada data presensi.
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((row) => (
                      <tr key={row.id} style={styles.tr}>
                        <td style={styles.td}>
                          {new Date(row.created_at).toLocaleString('id-ID', {
                            dateStyle: 'short', timeStyle: 'medium'
                          })}
                        </td>
                        <td style={{ ...styles.td, fontWeight: 'bold' }}>{row.nama}</td>
                        <td style={styles.td}>{row.kelas}</td>
                        <td style={styles.td}>
                          {editingRow === row.id ? (
                            <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} style={styles.select}>
                              <option value="Hadir">Hadir</option>
                              <option value="Sakit">Sakit</option>
                              <option value="Izin">Izin</option>
                              <option value="Alpha">Alpha</option>
                            </select>
                          ) : (
                            <span style={getBadgeStatus(row.status)}>{row.status}</span>
                          )}
                        </td>
                        <td style={styles.td}>
                          {!user ? (
                            <span style={{ fontSize: '12px', color: '#aaa' }}>Login untuk Edit</span>
                          ) : editingRow === row.id ? (
                            <button onClick={() => handleUpdateStatus(row.id)} style={styles.btnSave}>Simpan</button>
                          ) : (
                            <button onClick={() => { setEditingRow(row.id); setNewStatus(row.status); }} style={styles.btnEdit}>
                              ✏️ Edit Status
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>

      {/* MODAL POPUP LOGIN GURU (ELEGAN) */}
      {showLoginModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={{ textAlign: 'center', marginBottom: '15px' }}>
              <img src="https://upload.wikimedia.org/wikipedia/commons/2/27/Logo_SMK_YPK_Medan.png" 
                   onError={(e) => { e.target.src = 'https://via.placeholder.com/60?text=YPK'; }} 
                   alt="Logo YPK" style={{ width: '60px', height: '60px' }} />
              <h3 style={{ margin: '10px 0 5px 0', color: '#333' }}>LOGIN GURU / STAFF</h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>SMK YPK MEDAN</p>
            </div>

            {loginError && <div style={styles.errorBox}>{loginError}</div>}

            <form onSubmit={handleLoginSubmit}>
              <div style={{ marginBottom: '12px' }}>
                <label style={styles.label}>Username</label>
                <input 
                  type="text" 
                  required 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  style={styles.inputModal} 
                  placeholder="Masukkan username Anda"
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={styles.label}>Password</label>
                <input 
                  type="password" 
                  required 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  style={styles.inputModal} 
                  placeholder="Masukkan password"
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => setShowLoginModal(false)} style={styles.btnCancel}>
                  Batal
                </button>
                <button type="submit" disabled={isLoggingIn} style={styles.btnSubmit}>
                  {isLoggingIn ? 'Memproses...' : 'MASUK'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// STYLING DENGAN DESAIN BAGUS (Gedung & Card Elegan)
const styles = {
  bgGedung: {
    minHeight: '100vh',
    backgroundImage: `url('https://images.unsplash.com/photo-1562774053-701939374585?q=80&w=1920')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
  },
  overlay: {
    minHeight: '100vh',
    backgroundColor: 'rgba(245, 240, 230, 0.82)',
    backdropFilter: 'blur(3px)'
  },
  navbar: {
    backgroundColor: '#ffffff',
    padding: '15px 30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
  },
  titleNav: { margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#4a2c11' },
  subNav: { margin: 0, fontSize: '11px', color: '#e67e22', fontWeight: 'bold', letterSpacing: '1px' },
  btnLoginNav: { backgroundColor: '#e67e22', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' },
  badgeUser: { backgroundColor: '#eef2f7', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', color: '#333' },
  btnDanger: { backgroundColor: '#e74c3c', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer' },
  mainContainer: { padding: '25px 30px', maxWidth: '1200px', margin: '0 auto' },
  cardControl: { backgroundColor: '#fff', padding: '15px 20px', borderRadius: '10px', display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' },
  inputSearch: { flex: 1, padding: '10px 14px', borderRadius: '6px', border: '1px solid #ccc', outline: 'none' },
  inputDate: { padding: '10px 14px', borderRadius: '6px', border: '1px solid #ccc', outline: 'none' },
  adminTag: { backgroundColor: '#f39c12', color: '#fff', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' },
  cardTable: { backgroundColor: '#fff', borderRadius: '10px', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thRow: { borderBottom: '2px solid #eee' },
  th: { padding: '12px', textAlign: 'left', fontSize: '13px', color: '#666', fontWeight: 'bold' },
  tr: { borderBottom: '1px solid #f0f0f0' },
  td: { padding: '12px', fontSize: '14px', color: '#333' },
  btnEdit: { backgroundColor: '#3498db', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
  btnSave: { backgroundColor: '#2ecc71', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
  select: { padding: '5px', borderRadius: '4px', border: '1px solid #ccc' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  modalCard: { backgroundColor: '#fff', width: '350px', padding: '25px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' },
  label: { fontSize: '12px', fontWeight: 'bold', color: '#555', display: 'block', marginBottom: '4px' },
  inputModal: { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' },
  btnSubmit: { flex: 1, backgroundColor: '#e67e22', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' },
  btnCancel: { flex: 1, backgroundColor: '#eee', color: '#333', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer' },
  errorBox: { backgroundColor: '#f8d7da', color: '#721c24', padding: '8px', borderRadius: '6px', fontSize: '12px', marginBottom: '12px', textAlign: 'center' },
  spinner: { width: '30px', height: '30px', border: '4px solid #f3f3f3', borderTop: '4px solid #e67e22', borderRadius: '50%', margin: '0 auto', animation: 'spin 1s linear infinite' }
};

const getBadgeStatus = (status) => {
  let bg = '#2ecc71';
  if (status?.includes('Sakit')) bg = '#f1c40f';
  if (status?.includes('Izin')) bg = '#3498db';
  if (status?.includes('Alpha')) bg = '#e74c3c';

  return {
    backgroundColor: bg,
    color: '#fff',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold',
    display: 'inline-block'
  };
};
