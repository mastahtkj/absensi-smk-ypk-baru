'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import Swal from 'sweetalert2';

// Inisialisasi Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// LIST ID GURU YANG DIBATASI HAK AKSESNYA (READ & PRINT ONLY)
const RESTRICTED_GURU_IDS = [30, 31, 32, 33, 34];

// CREDENTIAL API KIRIMI.ID
const KIRIMI_USER_CODE = process.env.NEXT_PUBLIC_KIRIMI_USER_CODE || 'KMQZ4Y0826';
const KIRIMI_SECRET_KEY = process.env.NEXT_PUBLIC_KIRIMI_SECRET_KEY || '0a2eae1b7a76fb9709f691fa0ebcff536c86aa1b3247f45eee8ab05e53aae3b1';
const KIRIMI_DEVICE_ID = process.env.NEXT_PUBLIC_KIRIMI_DEVICE_ID || 'D-H7IJQ';

// PRE-COMPILED REGEX UNTUK OPTIMASI PERFORMA FILTERING
const REGEX_KELAS_X = /^\s*X(?![I|i])[\s\-\.]?/i;
const REGEX_KELAS_XI = /^\s*XI(?![I|i])[\s\-\.]?/i;
const REGEX_KELAS_XII = /^\s*XII[\s\-\.]?/i;

export default function Home() {
  // --- STATE SYSTEM & LOGIN ---
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [hasMounted, setHasMounted] = useState(false);

  // Form Login State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // --- STATE DASHBOARD ABSENSI ---
  const [siswaList, setSiswaList] = useState([]);
  const [absensiLogs, setAbsensiLogs] = useState([]);
  const [periode, setPeriode] = useState('Hari Ini');
  const [filterTingkat, setFilterTingkat] = useState('Semua Tingkat');
  const [filterJurusan, setFilterJurusan] = useState('Semua Jurusan');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State Edit Data & Status
  const [editingSiswa, setEditingSiswa] = useState(null);
  const [editNama, setEditNama] = useState('');
  const [editKelas, setEditKelas] = useState('');
  const [editRfid, setEditRfid] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Modal State Lihat Detail Riwayat Tanggal
  const [detailSiswa, setDetailSiswa] = useState(null);

  // --- STATE MODE REGISTRASI TERPISAH & SEARCH MODAL ---
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerType, setRegisterType] = useState('siswa'); // 'siswa' atau 'guru'
  const [modalSearchQuery, setModalSearchQuery] = useState('');
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

  // CEK ROLE USER
  const isMasterIqbal = currentUser?.username?.toLowerCase() === 'iqbal' || currentUser?.role === 'admin';
  const isRestrictedGuru = !isMasterIqbal && currentUser && RESTRICTED_GURU_IDS.includes(Number(currentUser.id));

  // DAFTAR TINGKAT
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

  // DAFTAR JURUSAN
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

  // FETCH DATA INITIAL & SYNC DATABASE
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
      if (isMountedRef.current) {
        setSiswaList((prev) => prev || []);
        setAbsensiLogs((prev) => prev || []);
      }
      return { combinedList: [], logs: [] };
    }
  }, []);

  // SPLASH SCREEN TIMER
  useEffect(() => {
    const totalDuration = 2500;
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

  // POLLING UTK MENGAMBIL UID TERBARU SAAT MODE TAP AKTIF
  useEffect(() => {
    let intervalId;

    if (showRegisterModal && isWaitingTap) {
      intervalId = setInterval(async () => {
        if (isPollingRef.current) return;
        isPollingRef.current = true;

        try {
          const { data: latestScan } = await supabase
            .from('latest_scan')
            .select('uid')
            .eq('id', 1)
            .maybeSingle();

          if (!isMountedRef.current) return;

          if (latestScan && latestScan.uid) {
            setScannedUid((prev) => (prev !== latestScan.uid ? latestScan.uid : prev));
          }
        } catch (err) {
          // Silent fallback
        } finally {
          isPollingRef.current = false;
        }
      }, 1000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      isPollingRef.current = false;
    };
  }, [showRegisterModal, isWaitingTap]);

  // POPUP SWEETALERT REALTIME RFID TAP
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
            <span style="color: ${dataLog.status && dataLog.status.includes('Telat') ? '#d32f2f' : '#2e7d32'}; font-weight: bold; font-size: 13px;">Status: ${dataLog.status || 'Hadir'}</span>
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

  // POPUP SWEETALERT REALTIME NOTIFIKASI WA TERKIRIM
  const triggerWaPopup = useCallback((waData) => {
    try {
      if (typeof window === 'undefined') return;
      Swal.fire({
        title: '💬 NOTIFIKASI WA TERKIRIM!',
        html: `
          <div style="font-size: 14px; margin-top: 5px; text-align: left;">
            <b style="font-size: 15px; color: #333;">${waData.nama || 'Siswa / Guru'}</b><br/>
            <span style="color: #666; font-size: 12px;">Penerima: <b>${waData.targetRole || 'Orang Tua / Wali'}</b></span><br/>
            <span style="color: #00897b; font-size: 12px; font-weight: bold;">No. WA: ${waData.phone || '-'}</span><br/>
            <span style="color: #2e7d32; font-weight: bold; font-size: 13px;">Status: WhatsApp Sent ✅</span>
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

  const realtimeHandlersRef = useRef({ fetchInitialData, triggerRealtimePopup, triggerWaPopup, siswaList });
  useEffect(() => {
    realtimeHandlersRef.current = { fetchInitialData, triggerRealtimePopup, triggerWaPopup, siswaList };
  }, [fetchInitialData, triggerRealtimePopup, triggerWaPopup, siswaList]);

  // REALTIME SUBSCRIPTION
  useEffect(() => {
    fetchInitialData();

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'absensi' },
        async (payload) => {
          const { fetchInitialData: refresh, triggerRealtimePopup: popUp, triggerWaPopup: waPopUp } = realtimeHandlersRef.current;
          const freshData = await refresh();
          const currentSiswa = freshData?.combinedList || [];

          if (payload && payload.new) {
            const newRecord = payload.new;

            if (newRecord.rfid_uid && isMountedRef.current) {
              setScannedUid(newRecord.rfid_uid);
            }

            let displayName = newRecord.nama;
            let displayKelas = newRecord.kelas;

            if (!displayName || !displayKelas) {
              const cleanUid = (newRecord.rfid_uid || '').toString().trim().toUpperCase();
              const localMatched = currentSiswa.find(
                (s) => (s.rfid_uid || '').toString().trim().toUpperCase() === cleanUid
              );

              if (localMatched) {
                displayName = localMatched.nama;
                displayKelas = localMatched.kelas;
              }
            }

            const rawTime = newRecord.created_at ? new Date(newRecord.created_at) : new Date();
            const validTime = isNaN(rawTime.getTime()) ? new Date() : rawTime;

            popUp({
              nama: displayName || newRecord.nama || 'Siswa / Guru',
              kelas: displayKelas || newRecord.kelas || '-',
              status: newRecord.status || 'Hadir',
              waktu: validTime.toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                timeZone: 'Asia/Jakarta'
              })
            });

            if (newRecord.wa_sent) {
              setTimeout(() => {
                if (isMountedRef.current) {
                  waPopUp({
                    nama: displayName || newRecord.nama || 'Siswa / Guru',
                    targetRole: displayKelas?.includes('Guru') ? 'Guru / Staff' : 'Orang Tua / Wali',
                    phone: newRecord.no_wa || '-'
                  });
                }
              }, 1200);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'absensi' },
        (payload) => {
          realtimeHandlersRef.current.fetchInitialData();
          if (payload?.new?.rfid_uid && isMountedRef.current) {
            setScannedUid(payload.new.rfid_uid);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'latest_scan' },
        (payload) => {
          if (payload?.new?.uid && isMountedRef.current) {
            setScannedUid(payload.new.uid);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchInitialData]);

  // LOGIN & LOGOUT HANDLERS
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

        Swal.fire({
          icon: 'success',
          title: 'Selamat Datang!',
          text: `Login berhasil sebagai ${userData.nama}`,
          timer: 2000,
          showConfirmButton: false
        });
      }
    } catch (err) {
      if (isMountedRef.current) setLoginError('Gagal terhubung ke database.');
    } finally {
      if (isMountedRef.current) setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    const res = await Swal.fire({
      title: 'Apakah Anda yakin?',
      text: 'Anda akan keluar dari sesi portal presensi ini.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e65100',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Ya, Keluar',
      cancelButtonText: 'Batal'
    });
    if (res.isConfirmed) {
      localStorage.removeItem('user_guru');
      if (isMountedRef.current) {
        setIsLoggedIn(false);
        setCurrentUser(null);
      }
    }
  };

  // SAVE REGISTER CARD
  const handleSaveRegisterCard = async () => {
    if (!selectedTarget) {
      Swal.fire({
        icon: 'warning',
        title: 'Pilih Target',
        text: `Silakan pilih Nama ${registerType === 'guru' ? 'Guru / Staff' : 'Siswa'} terlebih dahulu!`
      });
      return;
    }
    if (!scannedUid) {
      Swal.fire({
        icon: 'warning',
        title: 'UID Kosong',
        text: 'Silakan tap kartu RFID ke alat atau isi kolom UID!'
      });
      return;
    }
    setIsUpdating(true);
    const cleanUid = scannedUid.trim().toUpperCase();

    try {
      const targetObj = siswaList.find((s) => String(s.id) === String(selectedTarget));
      if (!targetObj) {
        throw new Error('Data target tidak ditemukan.');
      }

      const isTargetGuru = targetObj.isGuru || String(targetObj.id).startsWith('GURU-');
      const targetDbId = targetObj.rawId || String(targetObj.id).replace('GURU-', '');

      if (isTargetGuru) {
        const { error: guruErr } = await supabase
          .from('guru')
          .update({ rfid_uid: cleanUid })
          .eq('id', targetDbId);
        if (guruErr) throw guruErr;
      } else {
        const { error: cardErr } = await supabase
          .from('rfid_cards')
          .update({ rfid_uid: cleanUid })
          .eq('id', targetObj.id);
        if (cardErr) throw cardErr;
      }

      await supabase
        .from('absensi')
        .update({
          nama: targetObj.nama,
          kelas: targetObj.kelas || (isTargetGuru ? 'Guru / Staff' : '-'),
          rfid_uid: cleanUid
        })
        .eq('rfid_uid', cleanUid);

      Swal.fire({
        icon: 'success',
        title: 'Registrasi Berhasil! 🎉',
        text: `Kartu UID (${cleanUid}) berhasil ditautkan ke ${targetObj.nama}!`,
        timer: 2500,
        showConfirmButton: false
      });

      if (isMountedRef.current) {
        setShowRegisterModal(false);
        setSelectedTarget('');
        setScannedUid('');
        setModalSearchQuery('');
        setIsWaitingTap(false);
      }
      await fetchInitialData();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem.';
      Swal.fire({
        icon: 'error',
        title: 'Gagal Registrasi',
        text: errorMsg
      });
    } finally {
      if (isMountedRef.current) setIsUpdating(false);
    }
  };

  // EDIT MODAL HANDLERS
  const handleOpenEditModal = (siswa) => {
    if (isRestrictedGuru) {
      Swal.fire({
        icon: 'error',
        title: 'Akses Dibatasi',
        text: 'Anda hanya memiliki akses Read & Print. Tidak dapat mengubah data!'
      });
      return;
    }
    setEditingSiswa(siswa);
    setEditNama(siswa.nama || '');
    setEditKelas(siswa.kelas || '');
    setEditRfid(siswa.rfid_uid || '');
  };

  const handleUpdateSiswa = async (e) => {
    e.preventDefault();
    if (isRestrictedGuru) return;
    if (!editingSiswa) return;

    setIsUpdating(true);
    try {
      const isGuruObj = editingSiswa.isGuru || String(editingSiswa.id).startsWith('GURU-');
      const targetDbId = editingSiswa.rawId || String(editingSiswa.id).replace('GURU-', '');

      if (isGuruObj) {
        const { error } = await supabase
          .from('guru')
          .update({ nama: editNama, rfid_uid: editRfid })
          .eq('id', targetDbId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('rfid_cards')
          .update({ nama: editNama, kelas: editKelas, rfid_uid: editRfid })
          .eq('id', editingSiswa.id);
        if (error) throw error;
      }

      Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: 'Data berhasil diperbarui',
        timer: 1500,
        showConfirmButton: false
      });

      setEditingSiswa(null);
      await fetchInitialData();
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: 'Gagal memperbarui data'
      });
    } finally {
      if (isMountedRef.current) setIsUpdating(false);
    }
  };

  // FILTER TARGET DAFTAR KARTU DENGAN MODAL SEARCH & TAB GURU/SISWA
  const filteredRegisterList = useMemo(() => {
    return siswaList.filter((item) => {
      const isGuru = item.isGuru || String(item.id).startsWith('GURU-');
      
      if (registerType === 'siswa' && isGuru) return false;
      if (registerType === 'guru' && !isGuru) return false;

      if (modalSearchQuery.trim()) {
        const q = modalSearchQuery.toLowerCase();
        const matchNama = (item.nama || '').toLowerCase().includes(q);
        const matchKelas = (item.kelas || '').toLowerCase().includes(q);
        return matchNama || matchKelas;
      }

      return true;
    });
  }, [siswaList, registerType, modalSearchQuery]);

  // FILTER DASHBOARD UTAMA (DIPERBAIKI LOGIKANYA SUPAYA TIDAK 'DATA TIDAK DITEMUKAN')
  const filteredData = useMemo(() => {
    let list = [...siswaList];

    // 1. Filter Tingkat
    if (filterTingkat !== 'Semua Tingkat') {
      if (filterTingkat === 'Kelas X') list = list.filter((s) => REGEX_KELAS_X.test(s.kelas || ''));
      else if (filterTingkat === 'Kelas XI') list = list.filter((s) => REGEX_KELAS_XI.test(s.kelas || ''));
      else if (filterTingkat === 'Kelas XII') list = list.filter((s) => REGEX_KELAS_XII.test(s.kelas || ''));
      else if (filterTingkat === 'Guru / Staff') list = list.filter((s) => s.isGuru || s.kelas === 'Guru / Staff');
      else if (filterTingkat === "MASTER'K") list = list.filter((s) => s.kelas === "MASTER'K");
    }

    // 2. Filter Jurusan (Diperluas dengan Singkatan)
    if (filterJurusan !== 'Semua Jurusan') {
      if (filterJurusan === 'Guru / Staff') {
        list = list.filter((s) => s.isGuru || s.kelas === 'Guru / Staff');
      } else if (filterJurusan === "MASTER'K") {
        list = list.filter((s) => s.kelas === "MASTER'K");
      } else {
        let keywords = [];
        if (filterJurusan.includes('Jaringan') || filterJurusan.includes('Komputer')) {
          keywords = ['tjkt', 'tkj', 'jaringan', 'komputer'];
        } else if (filterJurusan.includes('Akuntansi')) {
          keywords = ['akl', 'akuntansi', 'keuangan'];
        } else if (filterJurusan.includes('Perkantoran') || filterJurusan.includes('Manajemen')) {
          keywords = ['mplb', 'otkp', 'perkantoran', 'manajemen'];
        } else if (filterJurusan.includes('Pemasaran')) {
          keywords = ['pemasaran', 'bdp', 'bisnis'];
        } else {
          keywords = [filterJurusan.toLowerCase()];
        }

        list = list.filter((s) => {
          const strJurusan = (s.jurusan || '').toLowerCase();
          const strKelas = (s.kelas || '').toLowerCase();
          return keywords.some((kw) => strJurusan.includes(kw) || strKelas.includes(kw));
        });
      }
    }

    // 3. Search Query Dashboard
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) => (s.nama || '').toLowerCase().includes(q) || (s.kelas || '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [siswaList, filterTingkat, filterJurusan, searchQuery]);

  // RENDERING SPLASH SCREEN / LOADING
  if (loading || !hasMounted) {
    return (
      <div style={styles.splashBg}>
        <div style={styles.splashCard}>
          <div style={styles.splashLogo}>🏫</div>
          <h2 style={styles.splashTitle}>SISTEM PRESENSI RFID</h2>
          <p style={styles.splashSubtitle}>SMK YPK MEDAN</p>
          <div style={styles.progressBarBg}>
            <div style={{ ...styles.progressBarFill, width: `${progress}%` }} />
          </div>
          <p style={styles.splashPercent}>{Math.round(progress)}%</p>
        </div>
      </div>
    );
  }

  // RENDERING PAGE LOGIN
  if (!isLoggedIn) {
    return (
      <div style={styles.loginBg}>
        <div style={styles.loginCard}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={styles.loginIcon}>🔐</div>
            <h1 style={styles.loginTitle}>PORTAL GURU & ADMIN</h1>
            <p style={styles.loginSubtitle}>Silakan masuk untuk mengelola data presensi</p>
          </div>

          {loginError && <div style={styles.errorAlert}>{loginError}</div>}

          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={styles.label}>Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username..."
                style={styles.input}
              />
            </div>

            <div>
              <label style={styles.label}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password..."
                  style={styles.input}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={styles.showPassBtn}
                >
                  {showPassword ? '👁️' : '🙈'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#555' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                Ingat Saya
              </label>
            </div>

            <button type="submit" disabled={isLoggingIn} style={styles.btnLogin}>
              {isLoggingIn ? 'Memproses...' : 'Masuk Portal'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // RENDERING DASHBOARD UTAMA
  return (
    <div style={styles.dashboardContainer}>
      {/* HEADER */}
      <header style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={styles.headerLogo}>🏫</div>
          <div>
            <h1 style={styles.headerTitle}>PRESENSI DIGITAL SMK YPK MEDAN</h1>
            <p style={styles.headerSubtitle}>Selamat Datang, <b>{currentUser?.nama}</b> ({currentUser?.role?.toUpperCase()})</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {!isRestrictedGuru && (
            <button
              onClick={() => {
                setShowRegisterModal(true);
                setRegisterType('siswa');
                setSelectedTarget('');
                setScannedUid('');
                setModalSearchQuery('');
                setIsWaitingTap(false);
              }}
              style={styles.btnRegister}
            >
              ➕ Registrasi Kartu
            </button>
          )}

          <button onClick={handleLogout} style={styles.btnLogout}>
            🚪 Keluar
          </button>
        </div>
      </header>

      {/* FILTER & SEARCH BAR */}
      <div style={styles.filterCard}>
        <div style={styles.filterGrid}>
          <div>
            <label style={styles.filterLabel}>Filter Tingkat:</label>
            <select
              value={filterTingkat}
              onChange={(e) => setFilterTingkat(e.target.value)}
              style={styles.selectInput}
            >
              {tingkatOptions.map((opt) => (
                <option key={opt.label} value={opt.label}>
                  {opt.icon} {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={styles.filterLabel}>Filter Jurusan:</label>
            <select
              value={filterJurusan}
              onChange={(e) => setFilterJurusan(e.target.value)}
              style={styles.selectInput}
            >
              {jurusanOptions.map((opt) => (
                <option key={opt.label} value={opt.label}>
                  {opt.icon} {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: 1 }}>
            <label style={styles.filterLabel}>Cari Nama / Kelas:</label>
            <input
              type="text"
              placeholder="Ketik nama atau kelas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
          </div>
        </div>
      </div>

      {/* TABEL DATA SISWA & GURU */}
      <div style={styles.tableCard}>
        <div style={styles.tableHeaderInfo}>
          <h3 style={{ margin: 0, fontSize: '16px', color: '#333' }}>
            📋 Data Anggota & Kartu RFID ({filteredData.length})
          </h3>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                <th style={styles.th}>No</th>
                <th style={styles.th}>Nama Lengkap</th>
                <th style={styles.th}>Kelas / Jabatan</th>
                <th style={styles.th}>UID RFID</th>
                <th style={styles.th}>Status Kartu</th>
                <th style={styles.th}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={6} style={styles.tdEmpty}>
                    Data tidak ditemukan.
                  </td>
                </tr>
              ) : (
                filteredData.map((item, idx) => {
                  const isGuru = item.isGuru || String(item.id).startsWith('GURU-');
                  const hasUid = Boolean(item.rfid_uid);

                  return (
                    <tr key={item.id} style={idx % 2 === 0 ? styles.trEven : styles.trOdd}>
                      <td style={styles.td}>{idx + 1}</td>
                      <td style={{ ...styles.td, fontWeight: 'bold' }}>{item.nama}</td>
                      <td style={styles.td}>
                        <span style={styles.badgeClass}>{item.kelas || '-'}</span>
                      </td>
                      <td style={styles.td}>
                        <code style={styles.codeUid}>{item.rfid_uid || 'BELUM TERDAFTAR'}</code>
                      </td>
                      <td style={styles.td}>
                        {hasUid ? (
                          <span style={styles.badgeHadir}>TERTAUT</span>
                        ) : (
                          <span style={styles.badgeAlpha}>BELUM ADA</span>
                        )}
                      </td>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => setDetailSiswa(item)}
                            style={styles.btnDetailOutline}
                          >
                            👁️ Detail
                          </button>
                          {!isRestrictedGuru && (
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              style={styles.btnEditOutline}
                            >
                              ✏️ Edit
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL REGISTRASI KARTU RFID DENGAN TAB SWITCHING & CARI */}
      {showRegisterModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, color: '#e65100' }}>🎴 Registrasi Kartu RFID Baru</h3>
              <button
                onClick={() => setShowRegisterModal(false)}
                style={styles.btnCloseModal}
              >
                ✕
              </button>
            </div>

            <div style={{ marginTop: '16px' }}>
              <div style={styles.tabContainer}>
                <button
                  onClick={() => {
                    setRegisterType('siswa');
                    setSelectedTarget('');
                  }}
                  style={registerType === 'siswa' ? styles.tabActive : styles.tabInactive}
                >
                  🎒 Siswa
                </button>
                <button
                  onClick={() => {
                    setRegisterType('guru');
                    setSelectedTarget('');
                  }}
                  style={registerType === 'guru' ? styles.tabActive : styles.tabInactive}
                >
                  👨‍🏫 Guru / Staff
                </button>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={styles.label}>Pencarian Fast Target:</label>
                <input
                  type="text"
                  placeholder={`Cari nama ${registerType}...`}
                  value={modalSearchQuery}
                  onChange={(e) => setModalSearchQuery(e.target.value)}
                  style={styles.input}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={styles.label}>
                  Pilih Nama {registerType === 'guru' ? 'Guru / Staff' : 'Siswa'}:
                </label>
                <select
                  value={selectedTarget}
                  onChange={(e) => setSelectedTarget(e.target.value)}
                  style={styles.input}
                >
                  <option value="">-- Pilih Target --</option>
                  {filteredRegisterList.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nama} ({item.kelas || '-'}) {item.rfid_uid ? `[UID: ${item.rfid_uid}]` : '[Belum ada UID]'}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.tapBox}>
                <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#666' }}>
                  {isWaitingTap ? '⌛ Silakan Tap Kartu ke Alat RFID Sekarang...' : 'Status Scan RFID:'}
                </p>
                <div style={styles.uidDisplay}>
                  {scannedUid ? `UID: ${scannedUid}` : 'Belum Ada Tap'}
                </div>

                <button
                  type="button"
                  onClick={() => setIsWaitingTap(!isWaitingTap)}
                  style={isWaitingTap ? styles.btnCancelTap : styles.btnStartTap}
                >
                  {isWaitingTap ? '⏹ Stop Polling Tap' : '📡 Mulai Mode Scan RFID'}
                </button>
              </div>

              <div style={{ marginTop: '16px' }}>
                <label style={styles.label}>UID Terdeteksi / Manual Input:</label>
                <input
                  type="text"
                  value={scannedUid}
                  onChange={(e) => setScannedUid(e.target.value.toUpperCase())}
                  placeholder="Ketik UID manual jika perlu..."
                  style={styles.input}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button
                  onClick={handleSaveRegisterCard}
                  disabled={isUpdating}
                  style={styles.btnSaveModal}
                >
                  {isUpdating ? 'Menyimpan...' : '💾 Simpan Tautan Kartu'}
                </button>
                <button
                  onClick={() => setShowRegisterModal(false)}
                  style={styles.btnCancelModal}
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIT DATA & UID */}
      {editingSiswa && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, color: '#1565c0' }}>✏️ Edit Data Anggota</h3>
              <button onClick={() => setEditingSiswa(null)} style={styles.btnCloseModal}>
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateSiswa} style={{ marginTop: '16px' }}>
              <div style={{ marginBottom: '12px' }}>
                <label style={styles.label}>Nama Lengkap:</label>
                <input
                  type="text"
                  required
                  value={editNama}
                  onChange={(e) => setEditNama(e.target.value)}
                  style={styles.input}
                />
              </div>

              {!editingSiswa.isGuru && (
                <div style={{ marginBottom: '12px' }}>
                  <label style={styles.label}>Kelas:</label>
                  <input
                    type="text"
                    required
                    value={editKelas}
                    onChange={(e) => setEditKelas(e.target.value)}
                    style={styles.input}
                  />
                </div>
              )}

              <div style={{ marginBottom: '16px' }}>
                <label style={styles.label}>UID RFID Kartu:</label>
                <input
                  type="text"
                  value={editRfid}
                  onChange={(e) => setEditRfid(e.target.value.toUpperCase())}
                  placeholder="Isi / Ubah UID Kartu..."
                  style={styles.input}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" disabled={isUpdating} style={styles.btnSaveModal}>
                  {isUpdating ? 'Memproses...' : '💾 Simpan Perubahan'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingSiswa(null)}
                  style={styles.btnCancelModal}
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETAIL RIWAYAT */}
      {detailSiswa && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, color: '#2e7d32' }}>👁️ Detail Profil & Riwayat Presensi</h3>
              <button onClick={() => setDetailSiswa(null)} style={styles.btnCloseModal}>
                ✕
              </button>
            </div>

            <div style={{ marginTop: '16px' }}>
              <p style={{ margin: '4px 0' }}><b>Nama:</b> {detailSiswa.nama}</p>
              <p style={{ margin: '4px 0' }}><b>Kelas / Jabatan:</b> {detailSiswa.kelas || '-'}</p>
              <p style={{ margin: '4px 0' }}><b>UID RFID:</b> <code>{detailSiswa.rfid_uid || 'Belum Terdaftar'}</code></p>
              <hr style={{ margin: '12px 0', border: '0', borderTop: '1px solid #eee' }} />

              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#555' }}>Riwayat Presensi Terbaru:</h4>
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {absensiLogs.filter(log => log.rfid_uid === detailSiswa.rfid_uid || log.nama === detailSiswa.nama).length === 0 ? (
                  <p style={{ fontSize: '12px', color: '#888' }}>Belum ada log presensi tercatat.</p>
                ) : (
                  absensiLogs
                    .filter(log => log.rfid_uid === detailSiswa.rfid_uid || log.nama === detailSiswa.nama)
                    .map((log, index) => (
                      <div key={index} style={styles.logRow}>
                        <span>{new Date(log.created_at).toLocaleString('id-ID')}</span>
                        <span style={log.status?.includes('Telat') ? styles.badgeAlpha : styles.badgeHadir}>
                          {log.status || 'Hadir'}
                        </span>
                      </div>
                    ))
                )}
              </div>

              <div style={{ marginTop: '16px', textAlign: 'right' }}>
                <button onClick={() => setDetailSiswa(null)} style={styles.btnCancelModal}>
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// STYLES INLINE
const styles = {
  splashBg: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    backgroundColor: '#fff3e0',
    fontFamily: 'sans-serif'
  },
  splashCard: {
    textAlign: 'center',
    padding: '40px',
    borderRadius: '16px',
    backgroundColor: '#ffffff',
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
    width: '320px'
  },
  splashLogo: { fontSize: '50px', marginBottom: '10px' },
  splashTitle: { margin: 0, fontSize: '18px', color: '#e65100', fontWeight: 'bold' },
  splashSubtitle: { margin: '4px 0 20px 0', fontSize: '12px', color: '#777' },
  progressBarBg: {
    width: '100%',
    height: '8px',
    backgroundColor: '#ffe0b2',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  progressBarFill: { height: '100%', backgroundColor: '#e65100', transition: 'width 0.2s' },
  splashPercent: { marginTop: '8px', fontSize: '12px', color: '#e65100', fontWeight: 'bold' },

  loginBg: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#fff8e1',
    fontFamily: 'sans-serif'
  },
  loginCard: {
    width: '100%',
    maxWidth: '380px',
    padding: '30px',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 8px 20px rgba(0,0,0,0.08)'
  },
  loginIcon: { fontSize: '40px', marginBottom: '8px' },
  loginTitle: { margin: 0, fontSize: '18px', color: '#333' },
  loginSubtitle: { margin: '4px 0 0 0', fontSize: '12px', color: '#777' },
  errorAlert: {
    backgroundColor: '#ffebee',
    color: '#c62828',
    padding: '10px',
    borderRadius: '8px',
    fontSize: '12px',
    marginBottom: '14px',
    textAlign: 'center'
  },
  label: { display: 'block', fontSize: '12px', color: '#555', marginBottom: '4px', fontWeight: 'bold' },
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #ccc',
    fontSize: '13px',
    boxSizing: 'border-box'
  },
  showPassBtn: {
    position: 'absolute',
    right: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer'
  },
  btnLogin: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#e65100',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 'bold',
    fontSize: '14px',
    cursor: 'pointer'
  },

  dashboardContainer: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    padding: '20px',
    fontFamily: 'sans-serif'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: '16px 24px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    marginBottom: '20px'
  },
  headerLogo: { fontSize: '32px' },
  headerTitle: { margin: 0, fontSize: '18px', color: '#e65100' },
  headerSubtitle: { margin: '2px 0 0 0', fontSize: '12px', color: '#666' },
  btnRegister: {
    backgroundColor: '#e65100',
    color: '#fff',
    border: 'none',
    padding: '8px 14px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  btnLogout: {
    backgroundColor: '#ffebee',
    color: '#c62828',
    border: '1px solid #ffcdd2',
    padding: '8px 14px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },

  filterCard: {
    backgroundColor: '#ffffff',
    padding: '16px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    marginBottom: '20px'
  },
  filterGrid: { display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' },
  filterLabel: { display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px', fontWeight: 'bold' },
  selectInput: {
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid #ccc',
    fontSize: '13px',
    minWidth: '180px'
  },
  searchInput: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid #ccc',
    fontSize: '13px',
    boxSizing: 'border-box'
  },

  tableCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    overflow: 'hidden'
  },
  tableHeaderInfo: {
    padding: '16px',
    borderBottom: '1px solid #eee'
  },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' },
  thRow: { backgroundColor: '#fff3e0' },
  th: { padding: '12px 16px', color: '#e65100', fontWeight: 'bold', borderBottom: '1px solid #ffe0b2' },
  td: { padding: '12px 16px', borderBottom: '1px solid #eee' },
  tdEmpty: { padding: '24px', textAlign: 'center', color: '#888' },
  trEven: { backgroundColor: '#ffffff' },
  trOdd: { backgroundColor: '#fafafa' },

  codeUid: { backgroundColor: '#f0f0f0', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace' },
  badgeHadir: { backgroundColor: '#e8f5e9', color: '#2e7d32', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' },
  badgeAlpha: { backgroundColor: '#ffebee', color: '#c62828', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' },
  badgeClass: { backgroundColor: '#f5f5f5', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', color: '#555' },

  btnDetailOutline: { backgroundColor: '#ffffff', border: '1px solid #ffb74d', color: '#e65100', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' },
  btnEditOutline: { backgroundColor: '#ffffff', border: '1px solid #1565c0', color: '#1565c0', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' },

  modalOverlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  modalContent: {
    backgroundColor: '#ffffff',
    width: '100%',
    maxWidth: '450px',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
  },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  btnCloseModal: { background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#888' },

  tabContainer: { display: 'flex', gap: '8px', marginBottom: '14px' },
  tabActive: { flex: 1, padding: '8px', backgroundColor: '#e65100', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' },
  tabInactive: { flex: 1, padding: '8px', backgroundColor: '#f5f5f5', color: '#666', border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' },

  tapBox: { backgroundColor: '#fff8e1', padding: '12px', borderRadius: '8px', textAlign: 'center', border: '1px dashed #ffe0b2' },
  uidDisplay: { fontSize: '16px', fontWeight: 'bold', color: '#e65100', margin: '6px 0 10px 0', fontFamily: 'monospace' },
  btnStartTap: { backgroundColor: '#2e7d32', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' },
  btnCancelTap: { backgroundColor: '#c62828', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' },

  btnSaveModal: { flex: 1, padding: '10px', backgroundColor: '#e65100', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' },
  btnCancelModal: { padding: '10px 16px', backgroundColor: '#f5f5f5', border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer', color: '#555' },
  logRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee', fontSize: '12px' }
};
