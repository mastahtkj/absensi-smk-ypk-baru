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
  const s = String(status).toUpperCase();
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
  const [auditLogs, setAuditLogs] = useState([]);
  const [filterTingkat, setFilterTingkat] = useState('Semua Tingkat');
  const [filterJurusan, setFilterJurusan] = useState('Semua Jurusan');
  const [filterPeriode, setFilterPeriode] = useState('hari');
  const [searchQuery, setSearchQuery] = useState('');

  const [filterGuru, setFilterGuru] = useState('semua');

  const [editingSiswa, setEditingSiswa] = useState(null);
  const [editNama, setEditNama] = useState('');
  const [editKelas, setEditKelas] = useState('');
  const [editRfid, setEditRfid] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const [detailSiswa, setDetailSiswa] = useState(null);
  const [manualStatus, setManualStatus] = useState('Hadir (Tanpa Kartu)');

  // Modal Registrasi
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerMode, setRegisterMode] = useState('single');
  const [registerType, setRegisterType] = useState('siswa');
  const [modalFilterTingkat, setModalFilterTingkat] = useState('Semua Tingkat');
  const [modalFilterJurusan, setModalFilterJurusan] = useState('Semua Jurusan');
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [selectedTarget, setSelectedTarget] = useState('');
  const [isWaitingTap, setIsWaitingTap] = useState(false);
  const [scannedUid, setScannedUid] = useState('');

  // Mode Daftar Cepat
  const [fastIndex, setFastIndex] = useState(0);
  const [registeredHistory, setRegisteredHistory] = useState([]);
  const [isAutoProcessing, setIsAutoProcessing] = useState(false);

  const isMountedRef = useRef(true);
  const isPollingRef = useRef(false);
  const lastProcessedUidRef = useRef('');

  useEffect(() => {
    isMountedRef.current = true;
    setHasMounted(true);
    return () => { isMountedRef.current = false; };
  }, []);

  const isMasterIqbal = currentUser?.username?.toLowerCase() === 'iqbal' || currentUser?.role === 'admin';
  const isRestrictedGuru = !isMasterIqbal && currentUser && (RESTRICTED_GURU_IDS.includes(Number(currentUser.id)) || currentUser.role !== 'admin');

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

  const fetchAuditLogs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('audit_log_presensi')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data) setAuditLogs(data);
    } catch (e) {
      console.error('Audit log fetch error:', e);
    }
  }, []);

  const fetchInitialData = useCallback(async () => {
    try {
      const [{ data: siswaData, error: errSiswa }, { data: guruData, error: errGuru }, { data: logs, error: errLogs }] = await Promise.all([
        supabase.from('tb_siswa').select('*'),
        supabase.from('tb_guru').select('*'),
        supabase.from('absensi').select('*').order('created_at', { ascending: false })
      ]);

      if (errSiswa) console.error('Siswa error:', errSiswa);
      if (errGuru) console.error('Guru error:', errGuru);
      if (errLogs) console.error('Logs error:', errLogs);

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

      const guruFormatted = safeGuru.map((g) => ({
        id: `GURU-${g.id_guru}`,
        rawId: g.id_guru,
        nama: g.nama_guru || '',
        kelas: 'Guru / Staff',
        jurusan: 'Guru / Staff',
        rfid_uid: g.uid_rfid || '',
        isGuru: true,
        role: g.role || 'Guru'
      }));

      const combinedList = [...guruFormatted.sort((a, b) => a.nama.localeCompare(b.nama)), ...siswaFormatted.sort((a, b) => a.nama.localeCompare(b.nama))];

      if (isMountedRef.current) {
        setSiswaList(combinedList);
        setAbsensiLogs(safeLogs);
      }
      await fetchAuditLogs();
      return { combinedList, logs: safeLogs };
    } catch (err) {
      console.error('Error fetching data:', err);
      return { combinedList: [], logs: [] };
    }
  }, [fetchAuditLogs]);

  useEffect(() => {
    const totalDuration = 1500;
    const intervalTime = 50;
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

  const unassignedRegisterList = useMemo(() => {
    return filteredRegisterList.filter(item => !item.rfid_uid || item.rfid_uid.trim() === '');
  }, [filteredRegisterList]);

  const handleAutoRegisterFast = useCallback(async (uidToAssign, targetStudent) => {
    if (!targetStudent || !uidToAssign || isAutoProcessing) return;

    setIsAutoProcessing(true);
    const cleanUid = normalizeUid(uidToAssign);

    try {
      const isTargetGuru = targetStudent.isGuru || String(targetStudent.id).startsWith('GURU-');
      const targetDbId = targetStudent.rawId || String(targetStudent.id).replace('GURU-', '');

      if (isTargetGuru) {
        const { error: guruErr } = await supabase.from('tb_guru').update({ uid_rfid: cleanUid }).eq('id_guru', targetDbId);
        if (guruErr) throw guruErr;
      } else {
        const { error: siswaErr } = await supabase.from('tb_siswa').update({ uid_rfid: cleanUid }).eq('id_siswa', targetStudent.id);
        if (siswaErr) throw siswaErr;
      }

      setRegisteredHistory(prev => [{ nama: targetStudent.nama, kelas: targetStudent.kelas, uid: cleanUid }, ...prev]);
      await fetchInitialData();

      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(`${targetStudent.nama} berhasil`);
        utterance.lang = 'id-ID';
        speechSynthesis.speak(utterance);
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Gagal Tautkan Kartu', text: err.message, timer: 2000, showConfirmButton: false });
    } finally {
      setIsAutoProcessing(false);
    }
  }, [fetchInitialData, isAutoProcessing]);

  useEffect(() => {
    let intervalId;
    if (showRegisterModal && isWaitingTap) {
      intervalId = setInterval(async () => {
        if (isPollingRef.current) return;
        isPollingRef.current = true;
        try {
          const { data: latestScan } = await supabase.from('latest_scan').select('uid').eq('id', 1).maybeSingle();
          if (isMountedRef.current && latestScan?.uid) {
            const scanned = normalizeUid(latestScan.uid);
            setScannedUid(scanned);

            if (registerMode === 'fast' && scanned && scanned !== lastProcessedUidRef.current) {
              const currentTarget = unassignedRegisterList[fastIndex];
              if (currentTarget) {
                lastProcessedUidRef.current = scanned;
                await handleAutoRegisterFast(scanned, currentTarget);
              }
            }
          }
        } catch (err) {
          console.error('Polling error:', err);
        } finally {
          isPollingRef.current = false;
        }
      }, 800);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
      isPollingRef.current = false;
    };
  }, [showRegisterModal, isWaitingTap, registerMode, unassignedRegisterList, fastIndex, handleAutoRegisterFast]);

  const triggerRealtimePopup = useCallback((dataLog) => {
    try {
      if (typeof window === 'undefined') return;
      if (Swal.isVisible()) Swal.close();

      const statusText = dataLog.status || 'Hadir';
      const isTelat = String(statusText).toUpperCase().includes('TELAT');

      Swal.fire({
        title: '⚡ TAP RFID TERDETEKSI!',
        html: `
          <div style="font-size: 14px; margin-top: 5px; text-align: left;">
            <b style="font-size: 15px; color: #333;">${dataLog.nama || 'Siswa / Guru'}</b><br/>
            <span style="color: #666; font-size: 12px;">Kelas/Jabatan: <b>${dataLog.kelas || '-'}</b></span><br/>
            <span style="color: ${isTelat ? '#d32f2f' : '#2e7d32'}; font-weight: bold; font-size: 13px;">Status: ${statusText}</span><br/>
            <span style="color: #00897b; font-size: 11px; font-weight: bold; display: block; margin-top: 6px; background-color: #e0f2f1; padding: 4px 8px; border-radius: 4px;">📲 Notifikasi WA Terkirim Otomatis</span>
            <span style="color: #888; font-size: 11px; display: block; margin-top: 4px;">Waktu: ${dataLog.waktu} WIB</span>
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
    const guruUids = new Set(siswaList.filter(s => s.isGuru).map(s => normalizeUid(s.rfid_uid)));

    return absensiLogs.filter((log) => {
      const logDate = new Date(log.created_at);
      if (isNaN(logDate.getTime())) return false;

      if (filterPeriode === 'hari') {
        if (logDate.toDateString() !== now.toDateString()) return false;
      } else if (filterPeriode === 'minggu') {
        const diffTime = Math.abs(now - logDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 7) return false;
      } else if (filterPeriode === 'bulan') {
        if (logDate.getMonth() !== now.getMonth() || logDate.getFullYear() !== now.getFullYear()) return false;
      }

      const isGuruLog = (log.kelas || '').toLowerCase().includes('guru') || 
                        (log.kelas || '').toLowerCase().includes('staff') || 
                        (log.rfid_uid && guruUids.has(normalizeUid(log.rfid_uid)));

      if (filterTingkat === 'Guru / Staff') {
        if (!isGuruLog) return false;
      } else {
        if (isGuruLog) return false;

        if (filterTingkat === 'Kelas X' && !REGEX_KELAS_X.test(log.kelas || '')) return false;
        if (filterTingkat === 'Kelas XI' && !REGEX_KELAS_XI.test(log.kelas || '')) return false;
        if (filterTingkat === 'Kelas XII' && !REGEX_KELAS_XII.test(log.kelas || '')) return false;
      }

      if (filterJurusan !== 'Semua Jurusan' && filterTingkat !== 'Guru / Staff') {
        let keywords = [];
        if (filterJurusan === 'TJKT') keywords = ['tjkt', 'tkj', 'jaringan'];
        else if (filterJurusan === 'AKL') keywords = ['akl', 'akuntansi', 'ak'];
        else if (filterJurusan === 'MPLB') keywords = ['mplb', 'otkp', 'perkantoran', 'otp'];
        else if (filterJurusan === 'Pemasaran') keywords = ['pemasaran', 'bdp'];

        const isMatch = keywords.some((kw) => (log.kelas || '').toLowerCase().includes(kw));
        if (!isMatch) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNama = (log.nama || '').toLowerCase().includes(q);
        const matchKelas = (log.kelas || '').toLowerCase().includes(q);
        if (!matchNama && !matchKelas) return false;
      }

      return true;
    });
  }, [absensiLogs, filterPeriode, filterTingkat, filterJurusan, searchQuery, siswaList]);

  const guruLogs = useMemo(() => {
    const guruUids = new Set(siswaList.filter(s => s.isGuru).map(s => normalizeUid(s.rfid_uid)));
    return filteredLogs.filter(log => {
      const isGuruLog = (log.kelas || '').toLowerCase().includes('guru') || (log.kelas || '').toLowerCase().includes('staff') || (log.rfid_uid && guruUids.has(normalizeUid(log.rfid_uid)));
      if (!isGuruLog) return false;

      const st = String(log.status || '').toUpperCase();
      if (filterGuru === 'hadir') return st.includes('HADIR') || st.includes('TELAT');
      if (filterGuru === 'tanpa_kartu') return st.includes('TANPA KARTU');
      if (filterGuru === 'sakit_izin') return st.includes('SAKIT') || st.includes('IZIN');
      if (filterGuru === 'alpa') return st.includes('ALPA');
      return true;
    });
  }, [filteredLogs, siswaList, filterGuru]);

  const statsSiswaHariIni = useMemo(() => {
    const todayStr = new Date().toDateString();
    const siswaOnly = siswaList.filter(s => !s.isGuru);

    let totalHadir = 0;
    siswaOnly.forEach(siswa => {
      const hasUid = Boolean(siswa.rfid_uid && siswa.rfid_uid.trim() !== '');
      const cleanUid = normalizeUid(siswa.rfid_uid);

      const hasLogToday = absensiLogs.some((log) => {
        if (new Date(log.created_at).toDateString() !== todayStr) return false;
        if (hasUid && log.rfid_uid) return normalizeUid(log.rfid_uid) === cleanUid;
        return log.nama && log.nama.trim().toLowerCase() === siswa.nama.trim().toLowerCase();
      });

      if (hasLogToday) totalHadir++;
    });

    const totalSiswa = siswaOnly.length;
    const persentase = totalSiswa > 0 ? ((totalHadir / totalSiswa) * 100).toFixed(1) : '0';
    return { totalSiswa, totalHadir, persentase };
  }, [siswaList, absensiLogs]);

  const statsCount = useMemo(() => {
    let hadir = 0, telat = 0, sakit = 0, izin = 0, alpa = 0;
    filteredLogs.forEach(l => {
      const s = String(l.status || '').toUpperCase();
      if (s.includes('TELAT')) telat++;
      else if (s.includes('SAKIT')) sakit++;
      else if (s.includes('IZIN')) izin++;
      else if (s.includes('ALPA')) alpa++;
      else hadir++;
    });
    const total = filteredLogs.length;
    const persentase = total > 0 ? (((hadir + telat) / total) * 100).toFixed(1) : '0';
    return { hadir, telat, sakit, izin, alpa, total, persentase };
  }, [filteredLogs]);

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Data Kosong', text: 'Tidak ada log presensi untuk di-export.' });
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,No,Waktu,Nama,Kelas/Jabatan,Status Presensi\n";
    filteredLogs.forEach((log, i) => {
      const row = `${i + 1},"${new Date(log.created_at).toLocaleString('id-ID')}","${log.nama || '-'}","${log.kelas || '-'}","${log.status || '-'}"`;
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Rekap_Presensi_SMK_YPK_${filterPeriode}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handlePrintIndividu = (targetItem) => {
    if (!targetItem) return;

    const logsIndividu = absensiLogs.filter(log => 
      (targetItem.rfid_uid && normalizeUid(log.rfid_uid) === normalizeUid(targetItem.rfid_uid)) || 
      (log.nama && log.nama.trim().toLowerCase() === targetItem.nama.trim().toLowerCase())
    );

    const win = window.open('', '_blank');
    win.document.write(`
      <html>
        <head>
          <title>Rekap Presensi Individu - ${targetItem.nama}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; }
            .header { display: flex; align-items: center; border-bottom: 3px double #000; padding-bottom: 10px; margin-bottom: 15px; }
            .header img { width: 70px; height: 70px; margin-right: 15px; }
            .header-text { text-align: center; flex: 1; }
            .header-text h2 { margin: 0; font-size: 14px; }
            .header-text h1 { margin: 2px 0; font-size: 18px; }
            .header-text p { margin: 0; font-size: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
            th, td { border: 1px solid #333; padding: 6px 8px; text-align: left; }
            th { background-color: #f0f0f0; }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="/logo.png" alt="Logo" />
            <div class="header-text">
              <h2>YAYASAN PENDIDIKAN KELUARGA MEDAN</h2>
              <h1>SMK YPK MEDAN</h1>
              <p>Jl. Sakti Lubis Gg Amal. 25, Jl. Sakti Lubis Gg. Pegawai No.8, Siti Rejo I, Kec. Medan Kota, Kota Medan, Sumatera Utara 20219</p>
            </div>
          </div>
          <h3 style="text-align: center; margin: 10px 0;">LAPORAN REKAPITULASI PRESENSI INDIVIDU</h3>
          <p style="font-size: 12px; margin: 4px 0;"><b>Nama:</b> ${targetItem.nama}</p>
          <p style="font-size: 12px; margin: 4px 0;"><b>Kelas / Jabatan:</b> ${targetItem.kelas || '-'}</p>
          <p style="font-size: 12px; margin: 4px 0;"><b>UID RFID:</b> ${targetItem.rfid_uid || 'Belum Terdaftar'}</p>
          <table>
            <thead>
              <tr>
                <th style="width: 5%">No</th>
                <th style="width: 35%">Waktu Tap / Tanggal</th>
                <th style="width: 30%">Status Presensi</th>
                <th style="width: 30%">Pengubah (Jika Manual)</th>
              </tr>
            </thead>
            <tbody>
              ${logsIndividu.length === 0 ? '<tr><td colspan="4" style="text-align:center;">Belum ada riwayat presensi.</td></tr>' : 
                logsIndividu.map((l, idx) => `
                  <tr>
                    <td>${idx + 1}</td>
                    <td>${new Date(l.created_at).toLocaleString('id-ID')}</td>
                    <td>${l.status || 'Hadir'}</td>
                    <td>${l.updated_by || '-'}</td>
                  </tr>
                `).join('')
              }
            </tbody>
          </table>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    win.document.close();
  };

  const handleResendWA = async (log) => {
    try {
      const response = await fetch('/api/send-wa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama: log.nama,
          kelas: log.kelas || '-',
          status: log.status || 'Hadir',
          rfid_uid: log.rfid_uid || ''
        })
      });

      if (!response.ok) {
        throw new Error('Gagal terhubung ke API WhatsApp Gateway');
      }

      Swal.fire({
        icon: 'success',
        title: 'Notifikasi WA Terkirim',
        text: `Pesan WhatsApp Gateway untuk ${log.nama} berhasil dikirimkan ulang.`,
        timer: 2000,
        showConfirmButton: false
      });
    } catch (err) {
      console.error('Error resend WA:', err);
      Swal.fire({
        icon: 'error',
        title: 'Gagal Kirim WA',
        text: `Gagal mengirim ulang WhatsApp untuk ${log.nama || 'pengguna'}.`
      });
    }
  };

  // KODE PERBAIKAN: handleSaveManualAbsensi memanggil Vercel Serverless Function (/api/absensi)
  const handleSaveManualAbsensi = async () => {
    if (!detailSiswa) return;

    setIsUpdating(true);
    try {
      // 1. Kirim request ke Vercel Serverless Function (/api/absensi)
      const res = await fetch('/api/absensi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: detailSiswa.rfid_uid || '',
          status: manualStatus,
          nama: detailSiswa.nama,
          kelas: detailSiswa.kelas || '-'
        }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Gagal memperbarui status via API');
      }

      // 2. Catat Audit Log Perubahan Status (Client-side Audit Trail)
      await supabase.from('audit_log_presensi').insert([{
        diubah_oleh: currentUser?.nama || 'Admin / Guru',
        role_pengubah: currentUser?.role || 'Guru',
        target_nama: detailSiswa.nama,
        status_lama: 'Status Manual',
        status_baru: manualStatus
      }]);

      Swal.fire({
        icon: 'success',
        title: 'Status Diperbarui & WA Terkirim! 📲',
        text: `Status ${detailSiswa.nama} diubah menjadi [${manualStatus}]. Notifikasi WA otomatis dikirim via Kirimi.id.`,
        timer: 2500,
        showConfirmButton: false
      });

      // 3. Refresh data tampilan UI dan tutup modal
      await fetchInitialData();
      setDetailSiswa(null);

    } catch (err) {
      console.error('Error Save Manual Absensi:', err);
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
    if (isRestrictedGuru) {
      Swal.fire({ icon: 'error', title: 'Akses Dibatasi', text: 'Fitur registrasi kartu hanya untuk Admin.' });
      return;
    }
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
      Swal.fire({ icon: 'error', title: 'Akses Dibatasi', text: 'Anda tidak memiliki akses untuk mengubah master data.' });
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
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
            <span style={styles.badgeOnline}>🟢 System Online</span>
          </div>
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
    <>
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            display: block !important;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          @page {
            size: A4 portrait;
            margin: 1.2cm;
          }
        }
      `}</style>

      {/* KOP SURAT RESMI PDF DENGAN ALAMAT DAN FILTER DINAMIS */}
      <div className="print-area" style={{ display: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', borderBottom: '3px double #000', paddingBottom: '10px', marginBottom: '15px' }}>
          <img src="/logo.png" alt="Logo Sekolah" style={{ width: '85px', height: '85px', marginRight: '20px', objectFit: 'contain' }} />
          <div style={{ textAlign: 'center', flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold' }}>YAYASAN PENDIDIKAN KELUARGA MEDAN</h2>
            <h1 style={{ margin: '2px 0', fontSize: '20px', fontWeight: 'bold' }}>SMK YPK MEDAN</h1>
            <p style={{ margin: 0, fontSize: '10px', lineHeight: '1.3' }}>
              Jl. Sakti Lubis Gg Amal. 25, Jl. Sakti Lubis Gg. Pegawai No.8, Siti Rejo I, Kec. Medan Kota, Kota Medan, Sumatera Utara 20219
            </p>
            <p style={{ margin: '2px 0 0 0', fontSize: '10px', fontStyle: 'italic' }}>
              Email: smkypkmedan@gmail.com | Akreditasi A | Program Keahlian: TJKT, AKL, MPLB, Pemasaran
            </p>
          </div>
        </div>

        <h3 style={{ textAlign: 'center', textDecoration: 'underline', margin: '15px 0 5px 0', fontSize: '14px', textTransform: 'uppercase' }}>
          REKAPITULASI PRESENSI KEHADIRAN DIGITAL - {filterTingkat === 'Guru / Staff' ? 'GURU / STAFF' : 'SISWA'}
        </h3>
        <p style={{ fontSize: '11px', marginBottom: '15px', textAlign: 'center' }}>
          Periode Rekap: <b>{filterPeriode === 'hari' ? 'HARIAN' : filterPeriode === 'minggu' ? 'MINGGUAN' : filterPeriode === 'bulan' ? 'BULANAN' : 'SEMUA RIWAYAT'}</b> 
          {filterTingkat !== 'Semua Tingkat' && filterTingkat !== 'Guru / Staff' ? ` | Tingkat: ${filterTingkat}` : ''}
          {filterJurusan !== 'Semua Jurusan' ? ` | Jurusan: ${filterJurusan}` : ''}
          | Tanggal Cetak: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '15px' }} border="1" cellPadding="4">
          <thead>
            <tr style={{ backgroundColor: '#e0e0e0' }}>
              <th>Total Terdata</th>
              <th>Hadir Tepat Waktu</th>
              <th>Telat</th>
              <th>Sakit</th>
              <th>Izin</th>
              <th>Alpa</th>
              <th>Kehadiran (%)</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ textAlign: 'center', fontWeight: 'bold' }}>
              <td>{statsCount.total}</td>
              <td>{statsCount.hadir}</td>
              <td>{statsCount.telat}</td>
              <td>{statsCount.sakit}</td>
              <td>{statsCount.izin}</td>
              <td>{statsCount.alpa}</td>
              <td>{statsCount.persentase}%</td>
            </tr>
          </tbody>
        </table>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '25px' }} border="1" cellPadding="5">
          <thead>
            <tr style={{ backgroundColor: '#f0f0f0' }}>
              <th style={{ width: '5%' }}>No</th>
              <th style={{ width: '25%' }}>Waktu Tap</th>
              <th style={{ width: '30%' }}>Nama Lengkap</th>
              <th style={{ width: '20%' }}>Kelas / Jabatan</th>
              <th style={{ width: '20%' }}>Status Presensi</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '10px' }}>Tidak ada data presensi pada kriteria ini.</td>
              </tr>
            ) : (
              filteredLogs.map((log, i) => (
                <tr key={i}>
                  <td style={{ textAlign: 'center' }}>{i + 1}</td>
                  <td>{new Date(log.created_at).toLocaleString('id-ID')}</td>
                  <td style={{ fontWeight: 'bold' }}>{log.nama}</td>
                  <td>{log.kelas}</td>
                  <td>{log.status || 'Hadir'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', fontSize: '11px', pageBreakInside: 'avoid' }}>
          <div style={{ textAlign: 'center', width: '220px' }}>
            <p style={{ margin: 0 }}>Mengetahui,</p>
            <p style={{ margin: '2px 0 0 0', fontWeight: 'bold' }}>Guru / Wali Kelas / Admin</p>
            <div style={{ height: '65px' }}></div>
            <p style={{ margin: 0, fontWeight: 'bold', textDecoration: 'underline' }}>{currentUser?.nama || '..............................'}</p>
            <p style={{ margin: '2px 0 0 0' }}>Akun: {currentUser?.role?.toUpperCase() || 'GURU'}</p>
          </div>
          <div style={{ textAlign: 'center', width: '220px' }}>
            <p style={{ margin: 0 }}>Medan, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p style={{ margin: '2px 0 0 0', fontWeight: 'bold' }}>Kepala Sekolah SMK YPK Medan</p>
            <div style={{ height: '65px' }}></div>
            <p style={{ margin: 0, fontWeight: 'bold', textDecoration: 'underline' }}>HARTATI PATIWAEL, S.Si</p>
            <p style={{ margin: '2px 0 0 0' }}>NIP. -</p>
          </div>
        </div>
      </div>

      {/* DASHBOARD UTAMA */}
      <div style={styles.dashboardContainer}>
        <header style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/logo.png" alt="Logo SMK YPK Medan" style={styles.headerLogoImg} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 style={styles.headerTitle}>PRESENSI DIGITAL SMK YPK MEDAN</h1>
                <span style={styles.badgeOnline}>🟢 Online</span>
              </div>
              <p style={styles.headerSubtitle}>Pengguna Sesi: <b>{currentUser?.nama}</b> | Peran: <b>{currentUser?.role?.toUpperCase()}</b></p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button onClick={handleExportCSV} style={styles.btnExport}>📊 Export Excel (.csv)</button>
            <button onClick={handlePrint} style={styles.btnPdf}>🖨️ Cetak Rekap PDF</button>
            {!isRestrictedGuru && (
              <button onClick={() => { setShowRegisterModal(true); setRegisterMode('single'); setRegisterType('siswa'); setModalFilterTingkat('Semua Tingkat'); setModalFilterJurusan('Semua Jurusan'); setSelectedTarget(''); setScannedUid(''); setModalSearchQuery(''); setIsWaitingTap(false); setRegisteredHistory([]); setFastIndex(0); lastProcessedUidRef.current = ''; }} style={styles.btnRegister}>
                ➕ Registrasi Kartu
              </button>
            )}
            <button onClick={handleLogout} style={styles.btnLogout}>
              🚪 Keluar
            </button>
          </div>
        </header>

        {/* TABEL RINGKASAN STATISTIK */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          <div style={{ ...styles.statCard, borderLeft: '4px solid #0288d1' }}>
            <span style={styles.statTitle}>Total Terdata</span>
            <span style={{ ...styles.statValue, color: '#0288d1' }}>{statsCount.total}</span>
          </div>
          <div style={{ ...styles.statCard, borderLeft: '4px solid #2e7d32' }}>
            <span style={styles.statTitle}>Hadir Tepat Waktu</span>
            <span style={{ ...styles.statValue, color: '#2e7d32' }}>{statsCount.hadir}</span>
          </div>
          <div style={{ ...styles.statCard, borderLeft: '4px solid #e65100' }}>
            <span style={styles.statTitle}>Telat</span>
            <span style={{ ...styles.statValue, color: '#e65100' }}>{statsCount.telat}</span>
          </div>
          <div style={{ ...styles.statCard, borderLeft: '4px solid #d97706' }}>
            <span style={styles.statTitle}>Sakit</span>
            <span style={{ ...styles.statValue, color: '#d97706' }}>{statsCount.sakit}</span>
          </div>
          <div style={{ ...styles.statCard, borderLeft: '4px solid #7b1fa2' }}>
            <span style={styles.statTitle}>Izin</span>
            <span style={{ ...styles.statValue, color: '#7b1fa2' }}>{statsCount.izin}</span>
          </div>
          <div style={{ ...styles.statCard, borderLeft: '4px solid #c62828' }}>
            <span style={styles.statTitle}>Alpa</span>
            <span style={{ ...styles.statValue, color: '#c62828' }}>{statsCount.alpa}</span>
          </div>
          <div style={{ ...styles.statCard, borderLeft: '4px solid #00897b' }}>
            <span style={styles.statTitle}>Persentase Kehadiran</span>
            <span style={{ ...styles.statValue, color: '#00897b' }}>{statsCount.persentase}%</span>
          </div>

          <div style={{ ...styles.statCard, borderLeft: '4px solid #6a1b9a', backgroundColor: '#f3e5f5' }}>
            <span style={styles.statTitle}>Kehadiran Siswa Hari Ini</span>
            <span style={{ ...styles.statValue, color: '#6a1b9a' }}>
              {statsSiswaHariIni.persentase}%
            </span>
            <span style={{ fontSize: '10px', color: '#4a148c', marginTop: '2px' }}>
              ({statsSiswaHariIni.totalHadir}/{statsSiswaHariIni.totalSiswa} Siswa)
            </span>
          </div>
        </div>

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
              <label style={styles.filterLabel}>Filter Kategori / Tingkat:</label>
              <select value={filterTingkat} onChange={(e) => setFilterTingkat(e.target.value)} style={styles.selectInput}>
                {tingkatOptions.map((opt) => (<option key={opt.label} value={opt.label}>{opt.icon} {opt.label}</option>))}
              </select>
            </div>

            <div>
              <label style={styles.filterLabel}>Filter Jurusan:</label>
              <select value={filterJurusan} onChange={(e) => setFilterJurusan(e.target.value)} style={styles.selectInput} disabled={filterTingkat === 'Guru / Staff'}>
                {jurusanOptions.map((opt) => (<option key={opt.label} value={opt.label}>{opt.icon} {opt.label}</option>))}
              </select>
            </div>

            <div style={{ flex: 1 }}>
              <label style={styles.filterLabel}>Cari Nama / Kelas (Live Search):</label>
              <input type="text" placeholder="Ketik nama atau kelas..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={styles.searchInput} />
            </div>
          </div>
        </div>

        {/* TABEL MASTER DATA ANGGOTA */}
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
                  <tr><td colSpan={6} style={styles.tdEmpty}>Data tidak ditemukan.</td></tr>
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
                          {todayLog ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-start' }}>
                              {renderStatusBadge(todayLog.status)}
                              <span style={{ fontSize: '11px', color: '#2e7d32', fontWeight: 'bold' }}>
                                ⏰ {new Date(todayLog.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })} WIB
                              </span>
                            </div>
                          ) : (
                            hasUid ? <span style={styles.badgeAlpha}>Belum Tap</span> : <span style={styles.badgeClass}>Belum Ada Kartu</span>
                          )}
                        </td>
                        <td style={styles.td}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button onClick={() => setDetailSiswa(item)} style={styles.btnDetailOutline}>👁️ Detail / Status</button>
                            {!isRestrictedGuru && (
                              <button onClick={() => handleOpenEditModal(item)} style={styles.btnEditOutline}>✏️ Edit Master</button>
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

        {/* TABEL KHUSUS REKAPITULASI GURU */}
        <div style={{ ...styles.tableCard, marginTop: '20px' }}>
          <div style={{ ...styles.tableHeaderInfo, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', color: '#2e7d32' }}>
              👨‍🏫 Rekapitulasi Harian Guru &amp; Staff ({guruLogs.length} Entri)
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#555' }}>Filter Status Guru:</label>
              <select value={filterGuru} onChange={(e) => setFilterGuru(e.target.value)} style={styles.selectInput}>
                <option value="semua">Semua Status</option>
                <option value="hadir">Hadir / Tepat Waktu</option>
                <option value="tanpa_kartu">Hadir Tanpa Kartu</option>
                <option value="sakit_izin">Sakit / Izin</option>
                <option value="alpa">Alpa</option>
              </select>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr style={{ backgroundColor: '#e8f5e9' }}>
                  <th style={styles.th}>Tanggal</th>
                  <th style={styles.th}>Hari</th>
                  <th style={styles.th}>Waktu Tap</th>
                  <th style={styles.th}>Nama Guru / Staff</th>
                  <th style={styles.th}>Jabatan</th>
                  <th style={styles.th}>Status Kehadiran</th>
                </tr>
              </thead>
              <tbody>
                {guruLogs.length === 0 ? (
                  <tr><td colSpan={6} style={styles.tdEmpty}>Belum ada data rekap harian guru pada filter ini.</td></tr>
                ) : (
                  guruLogs.map((log, idx) => {
                    const dt = new Date(log.created_at);
                    const tanggalStr = dt.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
                    const hariStr = dt.toLocaleDateString('id-ID', { weekday: 'long' });
                    const waktuStr = dt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB';

                    return (
                      <tr key={log.id || idx} style={idx % 2 === 0 ? styles.trEven : styles.trOdd}>
                        <td style={styles.td}>{tanggalStr}</td>
                        <td style={styles.td}>{hariStr}</td>
                        <td style={{ ...styles.td, fontWeight: 'bold', color: '#2e7d32' }}>{waktuStr}</td>
                        <td style={{ ...styles.td, fontWeight: 'bold' }}>{log.nama}</td>
                        <td style={styles.td}><span style={styles.badgeClass}>{log.kelas || 'Guru / Staff'}</span></td>
                        <td style={styles.td}>{renderStatusBadge(log.status)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* TABEL LOG TAP MASUK PERIODIK */}
        <div style={{ ...styles.tableCard, marginTop: '20px' }}>
          <div style={styles.tableHeaderInfo}>
            <h3 style={{ margin: 0, fontSize: '16px', color: '#e65100' }}>
              📊 Log Presensi Masuk ({filterTingkat === 'Guru / Staff' ? 'GURU / STAFF' : 'SISWA'}) - [{filterPeriode.toUpperCase()}] - Total: {filteredLogs.length} Tap
            </h3>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>No</th>
                  <th style={styles.th}>Waktu Tap</th>
                  <th style={styles.th}>Nama</th>
                  <th style={styles.th}>Kelas / Jabatan</th>
                  <th style={styles.th}>WA Gateway</th>
                  <th style={styles.th}>Status Presensi</th>
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
                      <td style={styles.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '11px', color: '#00897b', fontWeight: 'bold', backgroundColor: '#e0f2f1', padding: '2px 6px', borderRadius: '4px' }}>
                            ✅ WA Terkirim
                          </span>
                          <button onClick={() => handleResendWA(log)} title="Kirim Ulang WA" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px' }}>🔄</button>
                        </div>
                      </td>
                      <td style={styles.td}>{renderStatusBadge(log.status)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* TABEL AUDIT LOG PERUBAHAN STATUS */}
        <div style={{ ...styles.tableCard, marginTop: '20px' }}>
          <div style={styles.tableHeaderInfo}>
            <h3 style={{ margin: 0, fontSize: '15px', color: '#0288d1' }}>
              🛡️ Tabel Log Perubahan Status (Audit Trail Transparansi Edit Manual)
            </h3>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr style={{ backgroundColor: '#e1f5fe' }}>
                  <th style={styles.th}>Pengubah Status</th>
                  <th style={styles.th}>Target Siswa/Guru</th>
                  <th style={styles.th}>Status Lama</th>
                  <th style={styles.th}>Status Baru</th>
                  <th style={styles.th}>Waktu Perubahan</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.length === 0 ? (
                  <tr><td colSpan={5} style={styles.tdEmpty}>Belum ada riwayat jejak perubahan manual.</td></tr>
                ) : (
                  auditLogs.map((log, idx) => (
                    <tr key={log.id || idx} style={idx % 2 === 0 ? styles.trEven : styles.trOdd}>
                      <td style={{ ...styles.td, fontWeight: 'bold' }}>{log.diubah_oleh} ({log.role_pengubah})</td>
                      <td style={styles.td}>{log.target_nama}</td>
                      <td style={styles.td}><span style={styles.badgeAlpha}>{log.status_lama}</span></td>
                      <td style={styles.td}><span style={styles.badgeHadir}>{log.status_baru}</span></td>
                      <td style={styles.td}>{new Date(log.created_at).toLocaleString('id-ID')}</td>
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
            <div style={{ ...styles.modalContent, maxWidth: '520px' }}>
              <div style={styles.modalHeader}>
                <h3 style={{ margin: 0, color: '#e65100' }}>🎴 Registrasi Kartu RFID Baru</h3>
                <button onClick={() => setShowRegisterModal(false)} style={styles.btnCloseModal}>✕</button>
              </div>

              <div style={{ marginTop: '14px' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', backgroundColor: '#fff3e0', padding: '4px', borderRadius: '8px' }}>
                  <button 
                    onClick={() => { setRegisterMode('single'); setIsWaitingTap(false); }} 
                    style={registerMode === 'single' ? styles.modeActive : styles.modeInactive}>
                    👤 Mode Satuan
                  </button>
                  <button 
                    onClick={() => { setRegisterMode('fast'); setFastIndex(0); lastProcessedUidRef.current = ''; }} 
                    style={registerMode === 'fast' ? styles.modeActiveFast : styles.modeInactive}>
                    ⚡ Mode Daftar Cepat
                  </button>
                </div>

                <div style={styles.tabContainer}>
                  <button onClick={() => { setRegisterType('siswa'); setSelectedTarget(''); setFastIndex(0); }} style={registerType === 'siswa' ? styles.tabActive : styles.tabInactive}>🎒 Siswa</button>
                  <button onClick={() => { setRegisterType('guru'); setSelectedTarget(''); setFastIndex(0); }} style={registerType === 'guru' ? styles.tabActive : styles.tabInactive}>👨‍🏫 Guru / Staff</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                  {registerType === 'siswa' && (
                    <>
                      <div>
                        <label style={styles.label}>Tingkat/Kelas:</label>
                        <select value={modalFilterTingkat} onChange={(e) => { setModalFilterTingkat(e.target.value); setFastIndex(0); }} style={{ ...styles.input, fontSize: '12px', padding: '6px' }}>
                          <option value="Semua Tingkat">Semua Kelas</option>
                          <option value="Kelas X">Kelas X</option>
                          <option value="Kelas XI">Kelas XI</option>
                          <option value="Kelas XII">Kelas XII</option>
                        </select>
                      </div>
                      <div>
                        <label style={styles.label}>Jurusan:</label>
                        <select value={modalFilterJurusan} onChange={(e) => { setModalFilterJurusan(e.target.value); setFastIndex(0); }} style={{ ...styles.input, fontSize: '12px', padding: '6px' }}>
                          <option value="Semua Jurusan">Semua Jurusan</option>
                          <option value="TJKT">TJKT</option>
                          <option value="AKL">AKL</option>
                          <option value="MPLB">MPLB</option>
                          <option value="Pemasaran">Pemasaran</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>

                {registerMode === 'single' ? (
                  <>
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
                  </>
                ) : (
                  <div style={{ backgroundColor: '#fafafa', padding: '14px', borderRadius: '10px', border: '1px solid #e0e0e0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#e65100' }}>
                        ⚡ Siswa Belum Punya Kartu: {unassignedRegisterList.length} Orang
                      </span>
                      <button 
                        type="button" 
                        onClick={() => setIsWaitingTap(!isWaitingTap)} 
                        style={isWaitingTap ? styles.btnCancelTap : styles.btnStartTap}>
                        {isWaitingTap ? '⏹ Stop Mode Auto-Tap' : '🚀 MULAILAH AUTO-TAP'}
                      </button>
                    </div>

                    {unassignedRegisterList.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#2e7d32', fontWeight: 'bold', backgroundColor: '#e8f5e9', borderRadius: '8px' }}>
                        🎉 Semua siswa pada filter ini sudah memiliki Kartu!
                      </div>
                    ) : (
                      <>
                        <div style={{ backgroundColor: isWaitingTap ? '#fff3e0' : '#ffffff', border: isWaitingTap ? '2px solid #e65100' : '1px solid #ccc', padding: '12px', borderRadius: '8px', textAlign: 'center', marginBottom: '12px' }}>
                          <span style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase' }}>
                            👉 Target {fastIndex + 1} dari {unassignedRegisterList.length}:
                          </span>
                          <h2 style={{ margin: '4px 0', fontSize: '18px', color: '#333' }}>
                            {unassignedRegisterList[fastIndex]?.nama || '-'}
                          </h2>
                          <span style={{ fontSize: '12px', color: '#e65100', fontWeight: 'bold' }}>
                            Kelas/Jabatan: {unassignedRegisterList[fastIndex]?.kelas || '-'}
                          </span>

                          <div style={{ marginTop: '10px', fontSize: '13px', color: isWaitingTap ? '#c62828' : '#666', fontWeight: 'bold' }}>
                            {isWaitingTap ? '⌛ TEMPELKAN KARTU RFID SEKARANG...' : 'Klik "MULAILAH AUTO-TAP" lalu Tap Kartu Berurutan'}
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '12px' }}>
                          <button 
                            disabled={fastIndex <= 0} 
                            onClick={() => setFastIndex(prev => Math.max(0, prev - 1))}
                            style={{ padding: '6px 12px', fontSize: '12px', cursor: 'pointer', borderRadius: '6px', border: '1px solid #ccc' }}>
                            ⬅️ Lewati / Kembali
                          </button>
                          <button 
                            disabled={fastIndex >= unassignedRegisterList.length - 1} 
                            onClick={() => setFastIndex(prev => Math.min(unassignedRegisterList.length - 1, prev + 1))}
                            style={{ padding: '6px 12px', fontSize: '12px', cursor: 'pointer', borderRadius: '6px', border: '1px solid #ccc' }}>
                            Berikutnya ➡️
                          </button>
                        </div>

                        {registeredHistory.length > 0 && (
                          <div>
                            <label style={{ ...styles.label, color: '#2e7d32' }}>✅ Riwayat Kartu Berhasil Ditautkan:</label>
                            <div style={{ maxHeight: '100px', overflowY: 'auto', backgroundColor: '#ffffff', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '6px' }}>
                              {registeredHistory.map((item, hIdx) => (
                                <div key={hIdx} style={{ fontSize: '11px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', padding: '4px 0' }}>
                                  <span><b>{item.nama}</b> ({item.kelas})</span>
                                  <code style={{ color: '#2e7d32' }}>{item.uid}</code>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    <div style={{ marginTop: '14px', textAlign: 'right' }}>
                      <button onClick={() => setShowRegisterModal(false)} style={styles.btnCancelModal}>Selesai &amp; Tutup</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MODAL EDIT MASTER DATA */}
        {editingSiswa && (
          <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
              <div style={styles.modalHeader}>
                <h3 style={{ margin: 0, color: '#1565c0' }}>✏️ Edit Master Data Anggota</h3>
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

        {/* MODAL DETAIL PROFIL & STATUS MANUAL */}
        {detailSiswa && (
          <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
              <div style={styles.modalHeader}>
                <h3 style={{ margin: 0, color: '#2e7d32' }}>👁️ Detail Profil &amp; Input Status Pengecualian</h3>
                <button onClick={() => setDetailSiswa(null)} style={styles.btnCloseModal}>✕</button>
              </div>

              <div style={{ marginTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ margin: '4px 0' }}><b>Nama:</b> {detailSiswa.nama}</p>
                    <p style={{ margin: '4px 0' }}><b>Kelas / Jabatan:</b> {detailSiswa.kelas || '-'}</p>
                    <p style={{ margin: '4px 0' }}><b>UID RFID:</b> <code>{detailSiswa.rfid_uid || 'Belum Terdaftar'}</code></p>
                  </div>

                  <button 
                    onClick={() => handlePrintIndividu(detailSiswa)} 
                    style={{ backgroundColor: '#0288d1', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    📄 Rekap Individu
                  </button>
                </div>
                
                <hr style={{ margin: '12px 0', border: '0', borderTop: '1px solid #eee' }} />

                <div style={{ backgroundColor: '#f9f9f9', padding: '12px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #e0e0e0' }}>
                  <label style={{ ...styles.label, color: '#2e7d32' }}>📌 Update Status Hari Ini (Manual Pengecualian):</label>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                    <select value={manualStatus} onChange={(e) => setManualStatus(e.target.value)} style={{ ...styles.input, flex: 1 }}>
                      <option value="Hadir (Tanpa Kartu)">HADIR (TANPA KARTU)</option>
                      <option value="Sakit">SAKIT</option>
                      <option value="Izin">IZIN</option>
                      <option value="Alpa">ALPA</option>
                    </select>
                    <button onClick={handleSaveManualAbsensi} disabled={isUpdating} style={{ ...styles.btnSaveModal, backgroundColor: '#2e7d32', flex: 'none', padding: '0 16px' }}>
                      {isUpdating ? '...' : 'Simpan Status'}
                    </button>
                  </div>
                </div>

                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#555' }}>Riwayat Presensi &amp; Audit Pengubah:</h4>
                <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                  {absensiLogs.filter(log => (detailSiswa.rfid_uid && normalizeUid(log.rfid_uid) === normalizeUid(detailSiswa.rfid_uid)) || (log.nama && log.nama.trim().toLowerCase() === detailSiswa.nama.trim().toLowerCase())).length === 0 ? (
                    <p style={{ fontSize: '12px', color: '#888' }}>Belum ada log presensi tercatat.</p>
                  ) : (
                    absensiLogs
                      .filter(log => (detailSiswa.rfid_uid && normalizeUid(log.rfid_uid) === normalizeUid(detailSiswa.rfid_uid)) || (log.nama && log.nama.trim().toLowerCase() === detailSiswa.nama.trim().toLowerCase()))
                      .map((log, index) => (
                        <div key={index} style={{ ...styles.logRow, flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                            <span>{new Date(log.created_at).toLocaleString('id-ID')}</span>
                            {renderStatusBadge(log.status)}
                          </div>
                          {log.updated_by && (
                            <span style={{ fontSize: '10px', color: '#0288d1', fontStyle: 'italic' }}>
                              Status diubah ke [{log.status}] oleh: {log.updated_by} pada {new Date(log.created_at).toLocaleTimeString('id-ID')}
                            </span>
                          )}
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
    </>
  );
}

const styles = {
  splashBg: { 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100vh', 
    backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0.85)), url(/gedung.png)', 
    backgroundSize: 'cover', 
    backgroundPosition: 'center', 
    fontFamily: 'sans-serif' 
  },
  splashCard: { textAlign: 'center', padding: '36px 28px', borderRadius: '16px', backgroundColor: 'rgba(255, 255, 255, 0.96)', boxShadow: '0 10px 25px rgba(0,0,0,0.25)', width: '100%', maxWidth: '420px', boxSizing: 'border-box' },
  splashLogoImg: { width: '80px', height: '80px', objectFit: 'contain', marginBottom: '14px' },
  splashTitle: { margin: '0 0 10px 0', fontSize: '15px', color: '#e65100', fontWeight: '800', letterSpacing: '0.5px', lineHeight: '1.4', textTransform: 'uppercase' },
  splashSubtitlePrimary: { margin: '0 0 4px 0', fontSize: '12px', color: '#222', fontWeight: '700', letterSpacing: '0.5px' },
  splashSubtitleSecondary: { margin: '0 0 22px 0', fontSize: '11px', color: '#e65100', fontWeight: '700', letterSpacing: '1.2px' },
  progressBarBg: { width: '100%', height: '8px', backgroundColor: '#ffe0b2', borderRadius: '4px', overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#e65100', transition: 'width 0.2s' },
  splashPercent: { marginTop: '8px', fontSize: '12px', color: '#e65100', fontWeight: 'bold' },

  badgeOnline: { backgroundColor: '#e8f5e9', color: '#2e7d32', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #a5d6a7' },

  loginBg: { 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    minHeight: '100vh', 
    backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0.85)), url(/gedung.png)', 
    backgroundSize: 'cover', 
    backgroundPosition: 'center', 
    fontFamily: 'sans-serif' 
  },
  loginCard: { width: '100%', maxWidth: '420px', padding: '32px 28px', backgroundColor: 'rgba(255, 255, 255, 0.96)', borderRadius: '16px', boxShadow: '0 8px 20px rgba(0,0,0,0.25)', boxSizing: 'border-box' },
  loginLogoImg: { width: '75px', height: '75px', objectFit: 'contain', marginBottom: '12px' },
  loginTitle: { margin: '0 0 8px 0', fontSize: '15px', color: '#e65100', fontWeight: '800', letterSpacing: '0.5px', lineHeight: '1.4', textTransform: 'uppercase' },
  loginSubtitlePrimary: { margin: '0', fontSize: '12px', color: '#222', fontWeight: '700', letterSpacing: '0.5px' },
  loginSubtitleSecondary: { margin: '0', fontSize: '11px', color: '#e65100', fontWeight: '700', letterSpacing: '1.2px' },
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
  btnExport: { backgroundColor: '#2e7d32', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' },
  btnPdf: { backgroundColor: '#0288d1', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' },
  btnRegister: { backgroundColor: '#e65100', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' },
  btnLogout: { backgroundColor: '#ffebee', color: '#c62828', border: '1px solid #ffcdd2', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' },

  statCard: { backgroundColor: '#ffffff', padding: '12px 16px', borderRadius: '8px', boxShadow: '0 2px 6px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column' },
  statTitle: { fontSize: '11px', color: '#666', fontWeight: 'bold' },
  statValue: { fontSize: '18px', fontWeight: 'bold', marginTop: '2px' },

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

  modeActive: { flex: 1, padding: '6px', backgroundColor: '#e65100', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' },
  modeActiveFast: { flex: 1, padding: '6px', backgroundColor: '#2e7d32', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' },
  modeInactive: { flex: 1, padding: '6px', backgroundColor: 'transparent', color: '#555', border: 'none', fontSize: '11px', cursor: 'pointer' },

  tabContainer: { display: 'flex', gap: '8px', marginBottom: '14px' },
  tabActive: { flex: 1, padding: '8px', backgroundColor: '#e65100', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' },
  tabInactive: { flex: 1, padding: '8px', backgroundColor: '#f5f5f5', color: '#666', border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' },

  tapBox: { backgroundColor: '#fff8e1', padding: '12px', borderRadius: '8px', textAlign: 'center', border: '1px dashed #ffe0b2' },
  uidDisplay: { fontSize: '16px', fontWeight: 'bold', color: '#e65100', margin: '6px 0 10px 0', fontFamily: 'monospace' },
  btnStartTap: { backgroundColor: '#2e7d32', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' },
  btnCancelTap: { backgroundColor: '#c62828', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' },

  btnSaveModal: { flex: 1, padding: '10px', backgroundColor: '#e65100', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' },
  btnCancelModal: { padding: '10px 16px', backgroundColor: '#f5f5f5', border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer', color: '#555' },
  logRow: { display: 'flex', padding: '8px 0', borderBottom: '1px solid #eee', fontSize: '12px' }
};
