'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import Swal from 'sweetalert2';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const RESTRICTED_GURU_IDS = [30, 31, 32, 33, 34];

const REGEX_KELAS_X = /^\s*X(?![I|i])[\s\-\.]?/i;
const REGEX_KELAS_XI = /^\s*XI(?![I|i])[\s\-\.]?/i;
const REGEX_KELAS_XII = /^\s*XII[\s\-\.]?/i;

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [hasMounted, setHasMounted] = useState(false);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [siswaList, setSiswaList] = useState([]);
  const [absensiLogs, setAbsensiLogs] = useState([]);
  const [periode, setPeriode] = useState('Hari Ini');
  const [filterTingkat, setFilterTingkat] = useState('Semua Tingkat');
  const [filterJurusan, setFilterJurusan] = useState('Semua Jurusan');
  const [searchQuery, setSearchQuery] = useState('');

  const [editingSiswa, setEditingSiswa] = useState(null);
  const [editNama, setEditNama] = useState('');
  const [editKelas, setEditKelas] = useState('');
  const [editRfid, setEditRfid] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState('');
  const [isWaitingTap, setIsWaitingTap] = useState(false);
  const [scannedUid, setScannedUid] = useState('');

  const isMountedRef = useRef(true);
  const isPollingRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    setHasMounted(true);
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const isMasterIqbal = currentUser?.username?.toLowerCase() === 'iqbal' || currentUser?.role === 'admin';
  const isRestrictedGuru = !isMasterIqbal && currentUser && RESTRICTED_GURU_IDS.includes(Number(currentUser.id));

  const baseTingkatOptions = useMemo(() => [
    { label: 'Semua Tingkat', icon: '🎓' },
    { label: 'Kelas X', icon: '🎒' },
    { label: 'Kelas XI', icon: '📚' },
    { label: 'Kelas XII', icon: '🏆' },
    { label: 'Guru / Staff', icon: '👨‍🏫' },
  ], []);

  const tingkatOptions = useMemo(() => isMasterIqbal 
    ? [...baseTingkatOptions, { label: "MASTER'K", icon: '👑' }]
    : baseTingkatOptions, [isMasterIqbal, baseTingkatOptions]);

  const baseJurusanOptions = useMemo(() => [
    { label: 'Semua Jurusan', icon: '🏫' },
    { label: 'Teknik Jaringan Komputer dan Telekomunikasi', icon: '💻' },
    { label: 'Akuntansi dan Keuangan Lembaga', icon: '📊' },
    { label: 'Manajemen Perkantoran dan Layanan Bisnis', icon: '💼' },
    { label: 'Pemasaran', icon: '📢' },
    { label: 'Guru / Staff', icon: '👨‍🏫' },
  ], []);

  const jurusanOptions = useMemo(() => isMasterIqbal 
    ? [...baseJurusanOptions, { label: "MASTER'K", icon: '👑' }]
    : baseJurusanOptions, [isMasterIqbal, baseJurusanOptions]);

  const fetchInitialData = useCallback(async () => {
    try {
      const [{ data: cards }, { data: guruData }, { data: logs }] = await Promise.all([
        supabase.from('rfid_cards').select('*'),
        supabase.from('guru').select('*'),
        supabase.from('absensi').select('*').order('created_at', { ascending: false })
      ]);

      const safeCards = Array.isArray(cards) ? cards : [];
      const safeGuru = Array.isArray(guruData) ? guruData : [];
      const safeLogs = Array.isArray(logs) ? logs : [];

      let combinedList = [...safeCards];

      if (safeGuru.length > 0) {
        const guruFormatted = safeGuru.map((g) => ({
          id: `GURU-${g.id}`,
          rawId: g.id,
          nama: g.nama || '',
          kelas: g.role === 'admin' ? "MASTER'K" : 'Guru / Staff',
          rfid_uid: g.rfid_uid || null,
          isGuru: true,
          role: g.role
        }));
        combinedList = [...combinedList, ...guruFormatted];
      }

      if (isMountedRef.current) {
        setSiswaList(combinedList);
        setAbsensiLogs(safeLogs);
      }
      return { combinedList, logs: safeLogs };
    } catch (err) {
      console.error('Error fetching data:', err);
      return { combinedList: [], logs: [] };
    }
  }, []);

  useEffect(() => {
    const totalDuration = 1500;
    const intervalTime = 100;
    const step = 100 / (totalDuration / intervalTime);

    const timer = setInterval(() => {
      if (!isMountedRef.current) return;
      setProgress((prev) => {
        if (prev >= 100) return 100;
        return Math.min(prev + step, 100);
      });
    }, intervalTime);

    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('user_guru');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (isMountedRef.current && parsed) {
            setCurrentUser(parsed);
            setIsLoggedIn(true);
          }
        } catch (e) {
          localStorage.removeItem('user_guru');
        }
      }
    }

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (progress >= 100) {
      const timeoutId = setTimeout(() => {
        if (isMountedRef.current) setLoading(false);
      }, 200);
      return () => clearTimeout(timeoutId);
    }
  }, [progress]);

  const triggerRealtimePopup = useCallback((dataLog) => {
    try {
      if (typeof window === 'undefined') return;
      if (Swal.isVisible()) Swal.close();

      Swal.fire({
        title: '⚡ TAP RFID TERDETEKSI!',
        html: `
          <div style="font-size: 14px; margin-top: 5px; text-align: left;">
            <b style="font-size: 15px; color: #333;">${dataLog.nama || 'Siswa / Guru'}</b><br/>
            <span style="color: #666; font-size: 12px;">Kelas/Jabatan: <b>${dataLog.kelas || '-'}</b></span><br/>
            <span style="color: ${dataLog.status && dataLog.status.includes('Telat') ? '#d32f2f' : '#2e7d32'}; font-weight: bold; font-size: 13px;">Status: ${dataLog.status || 'Hadir'}</span><br/>
            <span style="color: #888; font-size: 11px; display: block; margin-top: 3px;">Waktu: ${dataLog.waktu} WIB</span>
          </div>
        `,
        icon: dataLog.status && dataLog.status.includes('Telat') ? 'warning' : 'success',
        timer: 4000,
        timerProgressBar: true,
        showConfirmButton: false,
        toast: true,
        position: 'top-end',
        background: '#ffffff',
      });
    } catch (err) {
      console.error('SweetAlert Error:', err);
    }
  }, []);

  const triggerWaPopup = useCallback((waData) => {
    try {
      if (typeof window === 'undefined') return;
      Swal.fire({
        title: '💬 NOTIFIKASI WA TERKIRIM!',
        html: `
          <div style="font-size: 14px; margin-top: 5px; text-align: left;">
            <b style="font-size: 15px; color: #333;">${waData.nama || 'Siswa / Guru'}</b><br/>
            <span style="color: #666; font-size: 12px;">Penerima: <b>${waData.targetRole || 'Orang Tua / Wali'}</b></span><br/>
            <span style="color: #2e7d32; font-weight: bold; font-size: 13px;">Status WA: Terkirim ✅</span>
          </div>
        `,
        icon: 'success',
        timer: 4000,
        timerProgressBar: true,
        showConfirmButton: false,
        toast: true,
        position: 'top-end',
        background: '#ffffff',
      });
    } catch (err) {
      console.error('SweetAlert WA Error:', err);
    }
  }, []);

  const realtimeHandlersRef = useRef({ fetchInitialData, triggerRealtimePopup, triggerWaPopup });
  useEffect(() => {
    realtimeHandlersRef.current = { fetchInitialData, triggerRealtimePopup, triggerWaPopup };
  }, [fetchInitialData, triggerRealtimePopup, triggerWaPopup]);

  useEffect(() => {
    fetchInitialData();

    const channel = supabase
      .channel('realtime-absensi-channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'absensi' },
        async (payload) => {
          const { fetchInitialData: refresh, triggerRealtimePopup: popUp, triggerWaPopup: waPopUp } = realtimeHandlersRef.current;
          await refresh();

          if (payload && payload.new) {
            const newRecord = payload.new;
            const rawTime = newRecord.created_at ? new Date(newRecord.created_at) : new Date();

            popUp({
              nama: newRecord.nama || 'Siswa / Guru',
              kelas: newRecord.kelas || '-',
              status: newRecord.status || 'Hadir',
              waktu: rawTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Jakarta' })
            });

            if (newRecord.wa_sent) {
              setTimeout(() => {
                waPopUp({
                  nama: newRecord.nama || 'Siswa / Guru',
                  targetRole: newRecord.kelas?.includes('Guru') ? 'Guru / Staff' : 'Orang Tua / Wali'
                });
              }, 1000);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchInitialData]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');

    try {
      const { data: guru, error } = await supabase
        .from('guru')
        .select('*')
        .eq('username', username.trim())
        .eq('password', password.trim())
        .maybeSingle();

      if (error || !guru) {
        if (isMountedRef.current) setLoginError('Username atau password salah!');
      } else {
        const userData = {
          id: guru.id,
          nama: guru.nama,
          username: guru.username,
          role: (guru.role || 'guru').toLowerCase()
        };
        if (isMountedRef.current) {
          setCurrentUser(userData);
          setIsLoggedIn(true);
        }
        if (rememberMe) {
          localStorage.setItem('user_guru', JSON.stringify(userData));
        }
      }
    } catch (err) {
      if (isMountedRef.current) setLoginError('Gagal terhubung ke database.');
    } finally {
      if (isMountedRef.current) setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user_guru');
    setIsLoggedIn(false);
    setCurrentUser(null);
  };

  const totalSiswa = (siswaList || []).length;
  const totalHadir = (absensiLogs || []).filter((l) => l.status && l.status.includes('Hadir')).length;
  const persentaseHadir = totalSiswa > 0 ? Math.round((totalHadir / totalSiswa) * 100) : 0;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#fff3e0' }}>
        <h3>Loading Presensi Digital SMK YPK MEDAN... {Math.round(progress)}%</h3>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#fff3e0' }}>
        <form onSubmit={handleLoginSubmit} style={{ padding: '30px', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
          <h2>PORTAL PRESENSI DIGITAL</h2>
          {loginError && <p style={{ color: 'red' }}>{loginError}</p>}
          <div style={{ marginBottom: '10px' }}>
            <label>Username:</label>
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required style={{ width: '100%', padding: '8px' }} />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Password:</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: '100%', padding: '8px' }} />
          </div>
          <button type="submit" disabled={isLoggingIn} style={{ width: '100%', padding: '10px', backgroundColor: '#e65100', color: '#fff', border: 'none', borderRadius: '6px' }}>
            {isLoggingIn ? 'MEMPROSES...' : 'MASUK KE DASHBOARD'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>DASHBOARD ABSENSI REAL-TIME - SMK YPK MEDAN</h2>
        <button onClick={handleLogout} style={{ padding: '8px 16px', backgroundColor: '#d32f2f', color: '#fff', border: 'none', borderRadius: '6px' }}>Keluar</button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '20px' }}>
        <div style={{ padding: '15px', background: '#e3f2fd', borderRadius: '8px' }}>
          <h4>Total Terdaftar</h4>
          <h2>{totalSiswa}</h2>
        </div>
        <div style={{ padding: '15px', background: '#e8f5e9', borderRadius: '8px' }}>
          <h4>Hadir Tepat Waktu</h4>
          <h2>{totalHadir}</h2>
        </div>
        <div style={{ padding: '15px', background: '#fff3e0', borderRadius: '8px' }}>
          <h4>Persentase Kehadiran</h4>
          <h2>{persentaseHadir}%</h2>
        </div>
      </div>

      <div style={{ background: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
        <h3>Log Absensi Terbaru</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
          <thead>
            <tr style={{ background: '#f5f5f5', textAlign: 'left' }}>
              <th style={{ padding: '8px', border: '1px solid #ddd' }}>Nama</th>
              <th style={{ padding: '8px', border: '1px solid #ddd' }}>Kelas/Jabatan</th>
              <th style={{ padding: '8px', border: '1px solid #ddd' }}>Status</th>
              <th style={{ padding: '8px', border: '1px solid #ddd' }}>Waktu Tap</th>
              <th style={{ padding: '8px', border: '1px solid #ddd' }}>Status WA</th>
            </tr>
          </thead>
          <tbody>
            {absensiLogs.slice(0, 15).map((log) => (
              <tr key={log.id}>
                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{log.nama}</td>
                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{log.kelas}</td>
                <td style={{ padding: '8px', border: '1px solid #ddd', color: log.status?.includes('Telat') ? 'red' : 'green' }}>{log.status}</td>
                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{new Date(log.created_at).toLocaleTimeString('id-ID')}</td>
                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{log.wa_sent ? 'Terkirim ✅' : 'Gagal ❌'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
