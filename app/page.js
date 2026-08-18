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

const normalizeUid = (uid) => (uid ? String(uid).trim().toUpperCase() : '');

const renderStatusBadge = (status = 'Hadir') => {
  const s = status.toUpperCase();
  if (s.includes('TELAT')) return <span style={styles.badgeTelat}>{status}</span>;
  if (s.includes('TANPA KARTU')) return <span style={styles.badgeTanpaKartu}>{status}</span>;
  if (s.includes('SAKIT')) return <span style={styles.badgeSakit}>{status}</span>;
  if (s.includes('IZIN')) return <span style={styles.badgeIzin}>{status}</span>;
  if (s.includes('ALPA')) return <span style={styles.badgeAlpha}>{status}</span>;
  return <span style={styles.badgeHadir}>{status}</span>;
};

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
  const [filterTingkat, setFilterTingkat] = useState('Semua Tingkat');
  const [filterJurusan, setFilterJurusan] = useState('Semua Jurusan');
  const [filterPeriode, setFilterPeriode] = useState('hari');
  const [searchQuery, setSearchQuery] = useState('');

  const [editingSiswa, setEditingSiswa] = useState(null);
  const [editNama, setEditNama] = useState('');
  const [editKelas, setEditKelas] = useState('');
  const [editRfid, setEditRfid] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const [detailSiswa, setDetailSiswa] = useState(null);
  const [manualStatus, setManualStatus] = useState('Hadir (Tanpa Kartu)');

  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerType, setRegisterType] = useState('siswa');
  const [modalFilterTingkat, setModalFilterTingkat] = useState('Semua Tingkat');
  const [modalFilterJurusan, setModalFilterJurusan] = useState('Semua Jurusan');
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

  const isMasterIqbal = currentUser?.username?.toLowerCase() === 'iqbal' || currentUser?.role === 'admin';
  const isRestrictedGuru = !isMasterIqbal && currentUser && RESTRICTED_GURU_IDS.includes(Number(currentUser.id));

  const tingkatOptions = useMemo(() => [
    { label: 'Semua Tingkat', icon: '🎓' },
    { label: 'Kelas X', icon: '🎒' },
    { label: 'Kelas XI', icon: '📚' },
    { label: 'Kelas XII', icon: '🏆' },
    { label: 'Guru / Staff', icon: '👨‍🏫' },
  ], []);

  const jurusanOptions = useMemo(() => [
    { label: 'Semua Jurusan', icon: '🏫' },
    { label: 'TJKT', icon: '💻' },
    { label: 'AKL', icon: '📊' },
    { label: 'MPLB', icon: '💼' },
    { label: 'Pemasaran', icon: '📢' },
  ], []);

  const fetchInitialData = useCallback(async () => {
    try {
      const [{ data: siswaData }, { data: guruData }, { data: logs }] = await Promise.all([
        supabase.from('tb_siswa').select('*'),
        supabase.from('tb_guru').select('*'),
        supabase.from('absensi').select('*').order('created_at', { ascending: false })
      ]);

      const safeSiswa = Array.isArray(siswaData) ? siswaData : [];
      const safeGuru = Array.isArray(guruData) ? guruData : [];
      const safeLogs = Array.isArray(logs) ? logs : [];

      const siswaFormatted = safeSiswa.map((s) => ({
        id: s.id_siswa,
        rawId: s.id_siswa,
        nama: s.nama_siswa || '',
        kelas: s.kelas || '-',
        jurusan: s.jurusan || '',
        rfid_uid: s.uid_rfid || '',
        no_wa_pribadi: s.no_wa_pribadi,
        no_wa_ortu: s.no_wa_ortu,
        role: s.role || 'Siswa',
        isGuru: false
      }));

      const guruFormatted = safeGuru.map((g) => {
        const guruId = g.id_guru;
        return {
          id: `GURU-${guruId}`,
          rawId: guruId,
          nama: g.nama_guru || '',
          kelas: 'Guru / Staff',
          jurusan: 'Guru / Staff',
          rfid_uid: g.uid_rfid || '',
          isGuru: true,
          role: g.role || 'Guru'
        };
      });

      let combinedList = [...siswaFormatted, ...guruFormatted];

      combinedList.sort((a, b) => 
        (a.nama || '').trim().localeCompare((b.nama || '').trim(), 'id', { sensitivity: 'base' })
      );

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
      setProgress((prev) => Math.min(prev + step, 100));
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

  useEffect(() => {
    let intervalId;
    if (showRegisterModal && isWaitingTap) {
      intervalId = setInterval(async () => {
        if (isPollingRef.current) return;
        isPollingRef.current = true;
        try {
          const { data: latestScan } = await supabase.from('latest_scan').select('uid').eq('id', 1).maybeSingle();
          if (isMountedRef.current && latestScan?.uid) {
            setScannedUid((prev) => (prev !== latestScan.uid ? latestScan.uid : prev));
          }
        } catch (err) {
          console.error('Polling error:', err);
        } fontally {
          isPollingRef.current = false;
        }
      }, 1000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
      isPollingRef.current = false;
    };
  }, [showRegisterModal, isWaitingTap]);

  const triggerRealtimePopup = useCallback((dataLog) => {
    try {
      if (typeof window === 'undefined') return;
      if (Swal.isVisible()) Swal.close();

      const statusText = dataLog.status || 'Hadir';
      const isTelat = statusText.toUpperCase().includes('TELAT');

      Swal.fire({
        title: '⚡ TAP RFID TERDETEKSI!',
        html: `
          <div style="font-size: 14px; margin-top: 5px; text-align: left;">
            <b style="font-size: 15px; color: #333;">${dataLog.nama || 'Siswa / Guru'}</b><br/>
            <span style="color: #666; font-size: 12px;">Kelas/Jabatan: <b>${dataLog.kelas || '-'}</b></span><br/>
            <span style="color: ${isTelat ? '#d32f2f' : '#2e7d32'}; font-weight: bold; font-size: 13px;">Status: ${statusText}</span>
            <span style="color: #888; font-size: 11px; display: block; margin-top: 3px;">Waktu: ${dataLog.waktu} WIB</span>
          </div>
        `,
        icon: isTelat ? 'warning' : 'success',
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

  const realtimeHandlersRef = useRef({ fetchInitialData, triggerRealtimePopup });
  useEffect(() => {
    realtimeHandlersRef.current = { fetchInitialData, triggerRealtimePopup };
  }, [fetchInitialData, triggerRealtimePopup]);

  useEffect(() => {
    fetchInitialData();
    const channel = supabase.channel('schema-db-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'absensi' }, async (payload) => {
        const { fetchInitialData: refresh, triggerRealtimePopup: popUp } = realtimeHandlersRef.current;
        const freshData = await refresh();
        const currentSiswa = freshData?.combinedList || [];

        if (payload?.new) {
          const newRecord = payload.new;
          if (newRecord.rfid_uid && isMountedRef.current) setScannedUid(newRecord.rfid_uid);

          let displayName = newRecord.nama;
          let displayKelas = newRecord.kelas;

          if (!displayName || !displayKelas) {
            const cleanUid = normalizeUid(newRecord.rfid_uid);
            const localMatched = currentSiswa.find((s) => normalizeUid(s.rfid_uid) === cleanUid);
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
            waktu: validTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Jakarta' })
          });
        }
      }).subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchInitialData]);

  const filteredLogs = useMemo(() => {
    const now = new Date();
    return absensiLogs.filter((log) => {
      const logDate = new Date(log.created_at);
      if (isNaN(logDate.getTime())) return false;

      if (filterPeriode === 'hari') {
        return logDate.toDateString() === now.toDateString();
      } else if (filterPeriode === 'minggu') {
        const diffTime = Math.abs(now - logDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
      } else if (filterPeriode === 'bulan') {
        return logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [absensiLogs, filterPeriode]);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  // --- PERBAIKAN FUNGSI SIMPAN ABSENSI MANUAL ---
  const handleSaveManualAbsensi = async () => {
    if (!detailSiswa) return;
    if (isRestrictedGuru) {
      Swal.fire({ icon: 'error', title: 'Akses Dibatasi', text: 'Tidak memiliki izin mengubah status.' });
      return;
    }

    setIsUpdating(true);
    try {
      // 1. Definisikan rentang waktu hari ini secara konsisten
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

      // 2. Cari log hari ini berdasarkan Nama atau RFID UID
      const { data: existing } = await supabase
        .from('absensi')
        .select('*')
        .or(`nama.eq."${detailSiswa.nama}",rfid_uid.eq."${detailSiswa.rfid_uid}"`)
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
        .maybeSingle();

      let updatedRecord = null;

      if (existing) {
        // Jika sudah ada log hari ini, update statusnya
        const { data, error } = await supabase
          .from('absensi')
          .update({ status: manualStatus })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        updatedRecord = data;
      } else {
        // Jika belum ada log hari ini, buat data baru (insert)
        const { data, error } = await supabase
          .from('absensi')
          .insert([{
            rfid_uid: detailSiswa.rfid_uid || 'MANUAL_ENTRY',
            nama: detailSiswa.nama,
            kelas: detailSiswa.kelas || '-',
            status: manualStatus,
            wa_sent: false
          }])
          .select()
          .single();

        if (error) throw error;
        updatedRecord = data;
      }

      // 3. Perbarui state lokal secara langsung agar UI langsung ter-refresh seketika
      if (updatedRecord) {
        setAbsensiLogs((prevLogs) => {
          const filtered = prevLogs.filter((log) => log.id !== updatedRecord.id);
          return [updatedRecord, ...filtered];
        });
      }

      Swal.fire({
        icon: 'success',
        title: 'Status Diperbarui!',
        text: `Status ${detailSiswa.nama} berhasil diubah menjadi: ${manualStatus}`,
        timer: 2000,
        showConfirmButton: false
      });

      await fetchInitialData();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: err.message });
    } finally {
      if (isMountedRef.current) setIsUpdating(false);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');

    try {
      const { data: guru, error } = await supabase
        .from('tb_guru')
        .select('*')
        .eq('username', username.trim())
        .eq('password', password.trim())
        .maybeSingle();

      if (error || !guru) {
        if (isMountedRef.current) setLoginError('Username atau password salah!');
      } else {
        const guruId = guru.id_guru;
        const userData = { id: guruId, nama: guru.nama_guru || guru.username, username: guru.username, role: (guru.role || 'guru').toLowerCase() };
        if (isMountedRef.current) {
          setCurrentUser(userData);
          setIsLoggedIn(true);
        }
        if (rememberMe && typeof window !== 'undefined') {
          localStorage.setItem('user_guru', JSON.stringify(userData));
        }

        Swal.fire({ icon: 'success', title: 'Selamat Datang!', text: `Login berhasil sebagai ${userData.nama}`, timer: 2000, showConfirmButton: false });
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
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user_guru');
      }
      if (isMountedRef.current) {
        setIsLoggedIn(false);
        setCurrentUser(null);
      }
    }
  };

  const handleSaveRegisterCard = async () => {
    if (!selectedTarget) {
      Swal.fire({ icon: 'warning', title: 'Pilih Target', text: 'Silakan pilih nama terlebih dahulu!' });
      return;
    }
    if (!scannedUid) {
      Swal.fire({ icon: 'warning', title: 'UID Kosong', text: 'Silakan tap kartu RFID atau isi UID!' });
      return;
    }

    setIsUpdating(true);
    const cleanUid = normalizeUid(scannedUid);

    try {
      const targetObj = siswaList.find((s) => String(s.id) === String(selectedTarget));
      if (!targetObj) throw new Error('Data target tidak ditemukan.');

      const isTargetGuru = targetObj.isGuru || String(targetObj.id).startsWith('GURU-');
      const targetDbId = targetObj.rawId || String(targetObj.id).replace('GURU-', '');

      if (isTargetGuru) {
        const { error: guruErr } = await supabase.from('tb_guru').update({ uid_rfid: cleanUid }).eq('id_guru', targetDbId);
        if (guruErr) throw guruErr;
      } else {
        const { error: siswaErr } = await supabase.from('tb_siswa').update({ uid_rfid: cleanUid }).eq('id_siswa', targetObj.id);
        if (siswaErr) throw siswaErr;
      }

      Swal.fire({ icon: 'success', title: 'Registrasi Berhasil! 🎉', text: `Kartu (${cleanUid}) ditautkan ke ${targetObj.nama}!`, timer: 2500, showConfirmButton: false });

      if (isMountedRef.current) {
        setShowRegisterModal(false);
        setSelectedTarget('');
        setScannedUid('');
        setModalSearchQuery('');
        setIsWaitingTap(false);
      }
      await fetchInitialData();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Gagal Registrasi', text: err.message });
    } finally {
      if (isMountedRef.current) setIsUpdating(false);
    }
  };

  const handleOpenEditModal = (siswa) => {
    if (isRestrictedGuru) {
      Swal.fire({ icon: 'error', title: 'Akses Dibatasi', text: 'Anda tidak dapat mengubah data!' });
      return;
    }
    setEditingSiswa(siswa);
    setEditNama(siswa.nama || '');
    setEditKelas(siswa.kelas || '');
    setEditRfid(siswa.rfid_uid || '');
  };

  const handleUpdateSiswa = async (e) => {
    e.preventDefault();
    if (isRestrictedGuru || !editingSiswa) return;

    setIsUpdating(true);
    try {
      const isGuruObj = editingSiswa.isGuru || String(editingSiswa.id).startsWith('GURU-');
      const targetDbId = editingSiswa.rawId || String(editingSiswa.id).replace('GURU-', '');

      if (isGuruObj) {
        const { error } = await supabase.from('tb_guru').update({ nama_guru: editNama, uid_rfid: editRfid }).eq('id_guru', targetDbId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('tb_siswa').update({ nama_siswa: editNama, kelas: editKelas, uid_rfid: editRfid }).eq('id_siswa', editingSiswa.id);
        if (error) throw error;
      }

      Swal.fire({ icon: 'success', title: 'Berhasil!', text: 'Data berhasil diperbarui', timer: 1500, showConfirmButton: false });
      setEditingSiswa(null);
      await fetchInitialData();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: 'Gagal memperbarui data' });
    } finally {
      if (isMountedRef.current) setIsUpdating(false);
    }
  };

  const filteredRegisterList = useMemo(() => {
    return siswaList.filter((item) => {
      const isGuru = item.isGuru || String(item.id).startsWith('GURU-');
      if (registerType === 'siswa' && isGuru) return false;
      if (registerType === 'guru' && !isGuru) return false;

      if (registerType === 'siswa' && modalFilterTingkat !== 'Semua Tingkat') {
        if (modalFilterTingkat === 'Kelas X' && !REGEX_KELAS_X.test(item.kelas || '')) return false;
        if (modalFilterTingkat === 'Kelas XI' && !REGEX_KELAS_XI.test(item.kelas || '')) return false;
        if (modalFilterTingkat === 'Kelas XII' && !REGEX_KELAS_XII.test(item.kelas || '')) return false;
      }

      if (registerType === 'siswa' && modalFilterJurusan !== 'Semua Jurusan') {
        let keywords = [];
        if (modalFilterJurusan === 'TJKT') keywords = ['tjkt', 'tkj', 'jaringan'];
        else if (modalFilterJurusan === 'AKL') keywords = ['akl', 'akuntansi', 'ak'];
        else if (modalFilterJurusan === 'MPLB') keywords = ['mplb', 'otkp', 'perkantoran', 'otp'];
        else if (modalFilterJurusan === 'Pemasaran') keywords = ['pemasaran', 'bdp'];

        const isMatch = keywords.some((kw) => (item.jurusan || '').toLowerCase().includes(kw) || (item.kelas || '').toLowerCase().includes(kw));
        if (!isMatch) return false;
      }

      if (modalSearchQuery.trim()) {
        const q = modalSearchQuery.toLowerCase();
        return (item.nama || '').toLowerCase().includes(q) || (item.kelas || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [siswaList, registerType, modalFilterTingkat, modalFilterJurusan, modalSearchQuery]);

  const filteredData = useMemo(() => {
    let list = [...siswaList];

    if (filterTingkat !== 'Semua Tingkat') {
      if (filterTingkat === 'Kelas X') list = list.filter((s) => REGEX_KELAS_X.test(s.kelas || ''));
      else if (filterTingkat === 'Kelas XI') list = list.filter((s) => REGEX_KELAS_XI.test(s.kelas || ''));
      else if (filterTingkat === 'Kelas XII') list = list.filter((s) => REGEX_KELAS_XII.test(s.kelas || ''));
      else if (filterTingkat === 'Guru / Staff') list = list.filter((s) => s.isGuru || s.kelas === 'Guru / Staff');
    }

    if (filterJurusan !== 'Semua Jurusan') {
      let keywords = [];
      if (filterJurusan === 'TJKT') keywords = ['tjkt', 'tkj', 'jaringan'];
      else if (filterJurusan === 'AKL') keywords = ['akl', 'akuntansi', 'ak'];
      else if (filterJurusan === 'MPLB') keywords = ['mplb', 'otkp', 'perkantoran', 'otp'];
      else if (filterJurusan === 'Pemasaran') keywords = ['pemasaran', 'bdp'];

      list = list.filter((s) => keywords.some((kw) => (s.jurusan || '').toLowerCase().includes(kw) || (s.kelas || '').toLowerCase().includes(kw)));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((s) => (s.nama || '').toLowerCase().includes(q) || (s.kelas || '').toLowerCase().includes(q));
    }

    return list;
  }, [siswaList, filterTingkat, filterJurusan, searchQuery]);

  if (loading || !hasMounted) {
    return (
      <div style={styles.splashBg}>
        <div style={styles.splashCard}>
          <img src="/logo.png" alt="Logo SMK YPK Medan" style={styles.splashLogoImg} />
          <h2 style={styles.splashTitle}>SISTEM PRESENSI DIGITAL RFID &amp; NFC</h2>
          <p style={styles.splashSubtitlePrimary}>SMK BISA YPK LUAR BIASA</p>
          <p style={styles.splashSubtitleSecondary}>TJKT PROJECT&apos;S</p>
          <div style={styles.progressBarBg}>
            <div style={{ ...styles.progressBarFill, width: `${progress}%` }} />
          </div>
          <p style={styles.splashPercent}>{Math.round(progress)}%</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div style={styles.loginBg}>
        <div style={styles.loginCard}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <img src="/logo.png" alt="Logo SMK YPK Medan" style={styles.loginLogoImg} />
            <h1 style={styles.loginTitle}>PORTAL PRESENSI DIGITAL SMK YPK MEDAN</h1>
            <p style={styles.loginSubtitlePrimary}>SMK BISA ! YPK LUAR BIASA</p>
          </div>

          {loginError && <div style={styles.errorAlert}>{loginError}</div>}

          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={styles.label}>Username</label>
              <input type="text" required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Masukkan username..." style={styles.input} />
            </div>

            <div>
              <label style={styles.label}>Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Masukkan password..." style={styles.input} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={styles.showPassBtn}>
                  {showPassword ? '👁️' : '🙈'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#555' }}>
                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                Ingat Saya
              </label>
            </div>

            <button type="submit" disabled={isLoggingIn} style={styles.btnLogin}>
              {isLoggingIn ? 'Memproses...' : 'Masuk Portal'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '4px' }}>
              <p style={styles.loginSubtitleSecondary}>TJKT PROJECT&apos;S</p>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.dashboardContainer}>
      <header style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/logo.png" alt="Logo SMK YPK Medan" style={styles.headerLogoImg} />
          <div>
            <h1 style={styles.headerTitle}>PRESENSI DIGITAL SMK YPK MEDAN</h1>
            <p style={styles.headerSubtitle}>Selamat Datang, <b>{currentUser?.nama}</b> ({currentUser?.role?.toUpperCase()})</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={handlePrint} style={styles.btnPdf}>🖨️ Cetak Rekap PDF</button>
          {!isRestrictedGuru && (
            <button onClick={() => { setShowRegisterModal(true); setRegisterType('siswa'); setModalFilterTingkat('Semua Tingkat'); setModalFilterJurusan('Semua Jurusan'); setSelectedTarget(''); setScannedUid(''); setModalSearchQuery(''); setIsWaitingTap(false); }} style={styles.btnRegister}>
              ➕ Registrasi Kartu
            </button>
          )}
          <button onClick={handleLogout} style={styles.btnLogout}>
            🚪 Keluar
          </button>
        </div>
      </header>

      {/* FILTER BAR */}
      <div style={styles.filterCard}>
        <div style={styles.filterGrid}>
          <div>
            <label style={styles.filterLabel}>Periode Rekap Log:</label>
            <select value={filterPeriode} onChange={(e) => setFilterPeriode(e.target.value)} style={styles.selectInput}>
              <option value="hari">📅 Rekap Hari Ini</option>
              <option value="minggu">📅 Rekap Minggu Ini (7 Hari)</option>
              <option value="bulan">📅 Rekap Bulan Ini</option>
              <option value="semua">📂 Semua Riwayat</option>
            </select>
          </div>

          <div>
            <label style={styles.filterLabel}>Filter Tingkat:</label>
            <select value={filterTingkat} onChange={(e) => setFilterTingkat(e.target.value)} style={styles.selectInput}>
              {tingkatOptions.map((opt) => (<option key={opt.label} value={opt.label}>{opt.icon} {opt.label}</option>))}
            </select>
          </div>

          <div>
            <label style={styles.filterLabel}>Filter Jurusan:</label>
            <select value={filterJurusan} onChange={(e) => setFilterJurusan(e.target.value)} style={styles.selectInput}>
              {jurusanOptions.map((opt) => (<option key={opt.label} value={opt.label}>{opt.icon} {opt.label}</option>))}
            </select>
          </div>

          <div style={{ flex: 1 }}>
            <label style={styles.filterLabel}>Cari Nama / Kelas:</label>
            <input type="text" placeholder="Ketik nama atau kelas..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={styles.searchInput} />
          </div>
        </div>
      </div>

      {/* TABEL PROFIL SISWA */}
      <div style={styles.tableCard}>
        <div style={styles.tableHeaderInfo}>
          <h3 style={{ margin: 0, fontSize: '16px', color: '#333' }}>
            📋 Master Data Anggota (A-Z) ({filteredData.length})
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
                <th style={styles.th}>Status Hari Ini</th>
                <th style={styles.th}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr><td colSpan={6} style={styles.tdEmpty}>Data tidak ditemukan. Silakan isi data di database tb_siswa / tb_guru.</td></tr>
              ) : (
                filteredData.map((item, idx) => {
                  const hasUid = Boolean(item.rfid_uid && item.rfid_uid.trim() !== '');
                  const cleanUid = normalizeUid(item.rfid_uid);
                  const todayStr = new Date().toDateString();

                  const todayLog = absensiLogs.find((log) => {
                    const logDate = new Date(log.created_at).toDateString();
                    if (logDate !== todayStr) return false;

                    if (hasUid && log.rfid_uid) {
                      return normalizeUid(log.rfid_uid) === cleanUid;
                    }

                    return log.nama && log.nama.trim().toLowerCase() === item.nama.trim().toLowerCase();
                  });

                  return (
                    <tr key={item.id} style={idx % 2 === 0 ? styles.trEven : styles.trOdd}>
                      <td style={styles.td}>{idx + 1}</td>
                      <td style={{ ...styles.td, fontWeight: 'bold' }}>{item.nama}</td>
                      <td style={styles.td}><span style={styles.badgeClass}>{item.kelas || '-'}</span></td>
                      <td style={styles.td}>
                        <code style={styles.codeUid}>
                          {hasUid ? item.rfid_uid : 'BELUM TERDAFTAR'}
                        </code>
                      </td>
                      <td style={styles.td}>
                        {todayLog 
                          ? renderStatusBadge(todayLog.status) 
                          : (hasUid ? <span style={styles.badgeAlpha}>Belum Tap</span> : <span style={styles.badgeClass}>Belum Ada Kartu</span>)}
                      </td>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => setDetailSiswa(item)} style={styles.btnDetailOutline}>👁️ Detail / Status</button>
                          {!isRestrictedGuru && (
                            <button onClick={() => handleOpenEditModal(item)} style={styles.btnEditOutline}>✏️ Edit</button>
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

      {/* TABEL LOG TAP PERIODIK */}
      <div style={{ ...styles.tableCard, marginTop: '20px' }}>
        <div style={styles.tableHeaderInfo}>
          <h3 style={{ margin: 0, fontSize: '16px', color: '#e65100' }}>
            📊 Log Presensi Masuk ({filterPeriode.toUpperCase()}) - Total: {filteredLogs.length} Tap
          </h3>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                <th style={styles.th}>No</th>
                <th style={styles.th}>Waktu Tap</th>
                <th style={styles.th}>Nama</th>
                <th style={styles.th}>Kelas</th>
                <th style={styles.th}>UID RFID</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr><td colSpan={6} style={styles.tdEmpty}>Belum ada data tap masuk pada periode ini.</td></tr>
              ) : (
                filteredLogs.map((log, idx) => (
                  <tr key={log.id || idx} style={idx % 2 === 0 ? styles.trEven : styles.trOdd}>
                    <td style={styles.td}>{idx + 1}</td>
                    <td style={styles.td}>{new Date(log.created_at).toLocaleString('id-ID')}</td>
                    <td style={{ ...styles.td, fontWeight: 'bold' }}>{log.nama || '-'}</td>
                    <td style={styles.td}>{log.kelas || '-'}</td>
                    <td style={styles.td}><code style={styles.codeUid}>{log.rfid_uid || '-'}</code></td>
                    <td style={styles.td}>{renderStatusBadge(log.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL REGISTRASI KARTU */}
      {showRegisterModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, color: '#e65100' }}>🎴 Registrasi Kartu RFID Baru</h3>
              <button onClick={() => setShowRegisterModal(false)} style={styles.btnCloseModal}>✕</button>
            </div>

            <div style={{ marginTop: '16px' }}>
              <div style={styles.tabContainer}>
                <button onClick={() => { setRegisterType('siswa'); setSelectedTarget(''); }} style={registerType === 'siswa' ? styles.tabActive : styles.tabInactive}>🎒 Siswa</button>
                <button onClick={() => { setRegisterType('guru'); setSelectedTarget(''); }} style={registerType === 'guru' ? styles.tabActive : styles.tabInactive}>👨‍🏫 Guru / Staff</button>
              </div>

              {registerType === 'siswa' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                  <div>
                    <label style={styles.label}>Tingkat/Kelas:</label>
                    <select value={modalFilterTingkat} onChange={(e) => setModalFilterTingkat(e.target.value)} style={{ ...styles.input, fontSize: '12px', padding: '6px' }}>
                      <option value="Semua Tingkat">Semua Kelas</option>
                      <option value="Kelas X">Kelas X</option>
                      <option value="Kelas XI">Kelas XI</option>
                      <option value="Kelas XII">Kelas XII</option>
                    </select>
                  </div>
                  <div>
                    <label style={styles.label}>Jurusan:</label>
                    <select value={modalFilterJurusan} onChange={(e) => setModalFilterJurusan(e.target.value)} style={{ ...styles.input, fontSize: '12px', padding: '6px' }}>
                      <option value="Semua Jurusan">Semua Jurusan</option>
                      <option value="TJKT">TJKT</option>
                      <option value="AKL">AKL</option>
                      <option value="MPLB">MPLB</option>
                      <option value="Pemasaran">Pemasaran</option>
                    </select>
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '12px' }}>
                <label style={styles.label}>Cari Nama:</label>
                <input type="text" placeholder={`Cari nama ${registerType}...`} value={modalSearchQuery} onChange={(e) => setModalSearchQuery(e.target.value)} style={styles.input} />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={styles.label}>Pilih Nama ({filteredRegisterList.length} Ditemukan):</label>
                <select value={selectedTarget} onChange={(e) => setSelectedTarget(e.target.value)} style={styles.input}>
                  <option value="">-- Pilih Target --</option>
                  {filteredRegisterList.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nama} ({item.kelas || '-'}) {item.rfid_uid ? `[UID: ${item.rfid_uid}]` : '[Belum Ada UID]'}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.tapBox}>
                <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#666' }}>
                  {isWaitingTap ? '⌛ Silakan Tap Kartu ke Alat RFID Sekarang...' : 'Status Scan RFID:'}
                </p>
                <div style={styles.uidDisplay}>{scannedUid ? `UID: ${scannedUid}` : 'Belum Ada Tap'}</div>
                <button type="button" onClick={() => setIsWaitingTap(!isWaitingTap)} style={isWaitingTap ? styles.btnCancelTap : styles.btnStartTap}>
                  {isWaitingTap ? '⏹ Stop Polling Tap' : '📡 Mulai Mode Scan RFID'}
                </button>
              </div>

              <div style={{ marginTop: '16px' }}>
                <label style={styles.label}>UID Terdeteksi / Manual Input:</label>
                <input type="text" value={scannedUid} onChange={(e) => setScannedUid(e.target.value.toUpperCase())} placeholder="Ketik UID manual jika perlu..." style={styles.input} />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button onClick={handleSaveRegisterCard} disabled={isUpdating} style={styles.btnSaveModal}>{isUpdating ? 'Menyimpan...' : '💾 Simpan Tautan Kartu'}</button>
                <button onClick={() => setShowRegisterModal(false)} style={styles.btnCancelModal}>Batal</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIT DATA */}
      {editingSiswa && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, color: '#1565c0' }}>✏️ Edit Data Anggota</h3>
              <button onClick={() => setEditingSiswa(null)} style={styles.btnCloseModal}>✕</button>
            </div>

            <form onSubmit={handleUpdateSiswa} style={{ marginTop: '16px' }}>
              <div style={{ marginBottom: '12px' }}>
                <label style={styles.label}>Nama Lengkap:</label>
                <input type="text" required value={editNama} onChange={(e) => setEditNama(e.target.value)} style={styles.input} />
              </div>

              {!editingSiswa.isGuru && (
                <div style={{ marginBottom: '12px' }}>
                  <label style={styles.label}>Kelas:</label>
                  <input type="text" required value={editKelas} onChange={(e) => setEditKelas(e.target.value)} style={styles.input} />
                </div>
              )}

              <div style={{ marginBottom: '16px' }}>
                <label style={styles.label}>UID RFID Kartu:</label>
                <input type="text" value={editRfid} onChange={(e) => setEditRfid(e.target.value.toUpperCase())} placeholder="Isi / Ubah UID Kartu..." style={styles.input} />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" disabled={isUpdating} style={styles.btnSaveModal}>{isUpdating ? 'Memproses...' : '💾 Simpan Perubahan'}</button>
                <button type="button" onClick={() => setEditingSiswa(null)} style={styles.btnCancelModal}>Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETAIL PROFILE & RIWAYAT */}
      {detailSiswa && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, color: '#2e7d32' }}>👁️ Detail Profil &amp; Input Status</h3>
              <button onClick={() => setDetailSiswa(null)} style={styles.btnCloseModal}>✕</button>
            </div>

            <div style={{ marginTop: '16px' }}>
              <p style={{ margin: '4px 0' }}><b>Nama:</b> {detailSiswa.nama}</p>
              <p style={{ margin: '4px 0' }}><b>Kelas / Jabatan:</b> {detailSiswa.kelas || '-'}</p>
              <p style={{ margin: '4px 0' }}><b>UID RFID:</b> <code>{detailSiswa.rfid_uid || 'Belum Terdaftar'}</code></p>
              
              <hr style={{ margin: '12px 0', border: '0', borderTop: '1px solid #eee' }} />

              <div style={{ backgroundColor: '#f9f9f9', padding: '12px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #e0e0e0' }}>
                <label style={{ ...styles.label, color: '#2e7d32' }}>📌 Update Status Hari Ini (Manual):</label>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  <select value={manualStatus} onChange={(e) => setManualStatus(e.target.value)} style={{ ...styles.input, flex: 1 }}>
                    <option value="Hadir (Tanpa Kartu)">HADIR (TANPA KARTU)</option>
                    <option value="Sakit">SAKIT</option>
                    <option value="Izin">IZIN</option>
                    <option value="Telat">TELAT</option>
                    <option value="Hadir">HADIR</option>
                    <option value="Alpa">ALPA</option>
                  </select>
                  <button onClick={handleSaveManualAbsensi} disabled={isUpdating} style={{ ...styles.btnSaveModal, backgroundColor: '#2e7d32', flex: 'none', padding: '0 16px' }}>
                    {isUpdating ? '...' : 'Simpan'}
                  </button>
                </div>
              </div>

              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#555' }}>Riwayat Presensi:</h4>
              <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                {absensiLogs.filter(log => (detailSiswa.rfid_uid && normalizeUid(log.rfid_uid) === normalizeUid(detailSiswa.rfid_uid)) || (log.nama && log.nama.trim().toLowerCase() === detailSiswa.nama.trim().toLowerCase())).length === 0 ? (
                  <p style={{ fontSize: '12px', color: '#888' }}>Belum ada log presensi tercatat.</p>
                ) : (
                  absensiLogs
                    .filter(log => (detailSiswa.rfid_uid && normalizeUid(log.rfid_uid) === normalizeUid(detailSiswa.rfid_uid)) || (log.nama && log.nama.trim().toLowerCase() === detailSiswa.nama.trim().toLowerCase()))
                    .map((log, index) => (
                      <div key={index} style={styles.logRow}>
                        <span>{new Date(log.created_at).toLocaleString('id-ID')}</span>
                        {renderStatusBadge(log.status)}
                      </div>
                    ))
                )}
              </div>

              <div style={{ marginTop: '16px', textAlign: 'right' }}>
                <button onClick={() => setDetailSiswa(null)} style={styles.btnCancelModal}>Tutup</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  splashBg: { 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100vh', 
    backgroundImage: 'linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url(/gedung.png)', 
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    fontFamily: 'sans-serif' 
  },
  splashCard: { 
    textAlign: 'center', 
    padding: '36px 28px', 
    borderRadius: '16px', 
    backgroundColor: 'rgba(255, 255, 255, 0.96)', 
    boxShadow: '0 10px 25px rgba(0,0,0,0.25)', 
    width: '100%',
    maxWidth: '420px',
    boxSizing: 'border-box'
  },
  splashLogoImg: { width: '80px', height: '80px', objectFit: 'contain', marginBottom: '14px' },
  splashTitle: { 
    margin: '0 0 10px 0', 
    fontSize: '15px', 
    color: '#e65100', 
    fontWeight: '800', 
    letterSpacing: '0.5px', 
    lineHeight: '1.4',
    textTransform: 'uppercase'
  },
  splashSubtitlePrimary: { 
    margin: '0 0 4px 0', 
    fontSize: '12px', 
    color: '#222', 
    fontWeight: '700',
    letterSpacing: '0.5px'
  },
  splashSubtitleSecondary: { 
    margin: '0 0 22px 0', 
    fontSize: '11px', 
    color: '#e65100', 
    fontWeight: '700', 
    letterSpacing: '1.2px' 
  },
  progressBarBg: { width: '100%', height: '8px', backgroundColor: '#ffe0b2', borderRadius: '4px', overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#e65100', transition: 'width 0.2s' },
  splashPercent: { marginTop: '8px', fontSize: '12px', color: '#e65100', fontWeight: 'bold' },

  loginBg: { 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    minHeight: '100vh', 
    backgroundImage: 'linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url(/gedung.png)', 
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    fontFamily: 'sans-serif' 
  },
  loginCard: { 
    width: '100%', 
    maxWidth: '420px', 
    padding: '32px 28px', 
    backgroundColor: 'rgba(255, 255, 255, 0.96)', 
    borderRadius: '16px', 
    boxShadow: '0 8px 20px rgba(0,0,0,0.25)',
    boxSizing: 'border-box'
  },
  loginLogoImg: { width: '75px', height: '75px', objectFit: 'contain', marginBottom: '12px' },
  loginTitle: { 
    margin: '0 0 8px 0', 
    fontSize: '15px', 
    color: '#e65100', 
    fontWeight: '800', 
    letterSpacing: '0.5px', 
    lineHeight: '1.4',
    textTransform: 'uppercase'
  },
  loginSubtitlePrimary: { 
    margin: '0', 
    fontSize: '12px', 
    color: '#222', 
    fontWeight: '700',
    letterSpacing: '0.5px'
  },
  loginSubtitleSecondary: { 
    margin: '0', 
    fontSize: '11px', 
    color: '#e65100', 
    fontWeight: '700', 
    letterSpacing: '1.2px' 
  },
  errorAlert: { backgroundColor: '#ffebee', color: '#c62828', padding: '10px', borderRadius: '8px', fontSize: '12px', marginBottom: '14px', textAlign: 'center' },
  label: { display: 'block', fontSize: '12px', color: '#555', marginBottom: '4px', fontWeight: 'bold' },
  input: { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '13px', boxSizing: 'border-box' },
  showPassBtn: { position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' },
  btnLogin: { width: '100%', padding: '12px', backgroundColor: '#e65100', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' },

  dashboardContainer: { minHeight: '100vh', backgroundColor: '#f5f5f5', padding: '20px', fontFamily: 'sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', padding: '16px 24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' },
  headerLogoImg: { width: '45px', height: '45px', objectFit: 'contain' },
  headerTitle: { margin: 0, fontSize: '18px', color: '#e65100' },
  headerSubtitle: { margin: '2px 0 0 0', fontSize: '12px', color: '#666' },
  btnPdf: { backgroundColor: '#0288d1', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' },
  btnRegister: { backgroundColor: '#e65100', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' },
  btnLogout: { backgroundColor: '#ffebee', color: '#c62828', border: '1px solid #ffcdd2', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' },

  filterCard: { backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: '20px' },
  filterGrid: { display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' },
  filterLabel: { display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px', fontWeight: 'bold' },
  selectInput: { padding: '8px 12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '13px', minWidth: '180px' },
  searchInput: { width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '13px', boxSizing: 'border-box' },

  tableCard: { backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', overflow: 'hidden' },
  tableHeaderInfo: { padding: '16px', borderBottom: '1px solid #eee' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' },
  thRow: { backgroundColor: '#fff3e0' },
  th: { padding: '12px 16px', color: '#e65100', fontWeight: 'bold', borderBottom: '1px solid #ffe0b2' },
  td: { padding: '12px 16px', borderBottom: '1px solid #eee' },
  tdEmpty: { padding: '24px', textAlign: 'center', color: '#888' },
  trEven: { backgroundColor: '#ffffff' },
  trOdd: { backgroundColor: '#fafafa' },

  codeUid: { backgroundColor: '#f0f0f0', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace' },
  badgeClass: { backgroundColor: '#f5f5f5', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', color: '#555' },

  badgeHadir: { backgroundColor: '#e8f5e9', color: '#2e7d32', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' },
  badgeTelat: { backgroundColor: '#fff3e0', color: '#e65100', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' },
  badgeTanpaKartu: { backgroundColor: '#e1f5fe', color: '#0288d1', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' },
  badgeSakit: { backgroundColor: '#fef3c7', color: '#d97706', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' },
  badgeIzin: { backgroundColor: '#f3e5f5', color: '#7b1fa2', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' },
  badgeAlpha: { backgroundColor: '#ffebee', color: '#c62828', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' },

  btnDetailOutline: { backgroundColor: '#ffffff', border: '1px solid #ffb74d', color: '#e65100', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' },
  btnEditOutline: { backgroundColor: '#ffffff', border: '1px solid #1565c0', color: '#1565c0', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' },

  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { backgroundColor: '#ffffff', width: '100%', maxWidth: '450px', borderRadius: '12px', padding: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' },
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
  logRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #eee', fontSize: '12px' }
};
