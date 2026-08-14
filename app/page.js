'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Cek apakah user sudah login sebelumnya
  useEffect(() => {
    const savedUser = localStorage.getItem('user_guru');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // Fungsi Login ke Supabase via API
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setUser(data.user);
        localStorage.setItem('user_guru', JSON.stringify(data.user));
      } else {
        setErrorMsg(data.message || 'Username atau password salah!');
      }
    } catch (err) {
      setErrorMsg('Gagal terhubung ke server');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user_guru');
    setUser(null);
  };

  // =======================================================
  // 1. TAMPILAN JIKA BELUM LOGIN (FORM LOGIN)
  // =======================================================
  if (!user) {
    return (
      <div style={styles.container}>
        <div style={styles.loginCard}>
          <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>LOGIN GURU / STAFF</h2>
          <h3 style={{ textAlign: 'center', color: '#666', marginBottom: '20px' }}>SMK YPK MEDAN</h3>
          
          {errorMsg && <p style={styles.error}>{errorMsg}</p>}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '15px' }}>
              <label>Username:</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                style={styles.input}
                placeholder="Masukkan username"
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label>Password:</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={styles.input}
                placeholder="Masukkan password"
              />
            </div>
            <button type="submit" disabled={loading} style={styles.btnPrimary}>
              {loading ? 'Memproses...' : 'MASUK'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // =======================================================
  // 2. TAMPILAN DASHBOARD SETELAH LOGIN BERHASIL
  // =======================================================
  return (
    <div style={{ padding: '30px', fontFamily: 'sans-serif' }}>
      <div style={styles.header}>
        <div>
          <h2>Selamat Datang, {user.nama}</h2>
          <p>Hak Akses: <b style={{ color: user.role === 'admin' ? 'red' : 'blue' }}>{user.role ? user.role.toUpperCase() : 'GURU'}</b></p>
        </div>
        <button onClick={handleLogout} style={styles.btnLogout}>Logout</button>
      </div>

      <hr style={{ margin: '20px 0' }} />

      <h3>Menu Akses Anda:</h3>
      
      <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginTop: '15px' }}>
        {/* FITUR UNTUK SEMUA GURU / STAFF */}
        <button style={styles.btnActionGreen} onClick={() => alert('Membuka Fitur Edit Absensi (Hadir/Sakit/Izin)')}>
          ✏️ Edit Status Absensi
        </button>

        {/* FITUR KHUSUS ADMIN (GURU NO 1, 2, 3, 8, 28) */}
        {user.role === 'admin' && (
          <>
            <button style={styles.btnActionBlue} onClick={() => alert('Membuka Kelola Siswa')}>
              👤 Tambah / Edit Data Siswa
            </button>
            <button style={styles.btnActionPurple} onClick={() => alert('Membuka Kelola Data Guru')}>
              👨‍🏫 Kelola Data Guru
            </button>
            <button style={styles.btnActionOrange} onClick={() => alert('Membuka Setting RFID')}>
              🎴 Setting Kartu RFID
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// Styling Sederhana
const styles = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f4f6f8', fontFamily: 'sans-serif' },
  loginCard: { background: '#fff', padding: '30px', borderRadius: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', width: '100%', maxWidth: '380px' },
  input: { width: '100%', padding: '10px', marginTop: '5px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' },
  btnPrimary: { width: '100%', padding: '12px', background: '#0070f3', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' },
  error: { color: 'red', fontSize: '14px', marginBottom: '10px', textAlign: 'center' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  btnLogout: { background: '#ff4d4f', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer' },
  btnActionGreen: { background: '#2e7d32', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: '5px', cursor: 'pointer' },
  btnActionBlue: { background: '#1565c0', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: '5px', cursor: 'pointer' },
  btnActionPurple: { background: '#6a1b9a', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: '5px', cursor: 'pointer' },
  btnActionOrange: { background: '#e65100', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: '5px', cursor: 'pointer' },
};
