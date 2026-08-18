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

  // --- STATE MODE REGISTRASI TERPISAH (SISWA & GURU) ---
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerType, setRegisterType] = useState('siswa'); // 'siswa' atau 'guru'
  const [modalSearchQuery, setModalSearchQuery] = useState(''); // Fitur Pencarian di Tombol Daftar
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

  // REALTIME HANDLERS REF
  const realtimeHandlersRef = useRef({
    fetchInitialData,
    triggerRealtimePopup,
    triggerWaPopup,
    siswaList
  });

  useEffect(() => {
    realtimeHandlersRef.current = {
      fetchInitialData,
      triggerRealtimePopup,
      triggerWaPopup,
      siswaList
    };
  }, [fetchInitialData, triggerRealtimePopup, triggerWaPopup, siswaList]);

  // INITIAL LOAD & REALTIME SUBSCRIPTION PERBAIKAN
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
                    phone: 'Terkirim via Server'
                  });
                }
              }, 1000);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'absensi' },
        () => {
          realtimeHandlersRef.current.fetchInitialData();
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

  // HANDLERS LOGIN
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

  // HANDLER PEMANTAUAN DUA TOMBOL PENDAFTARAN TERPISAH
  const handleOpenRegisterSiswa = () => {
    setRegisterType('siswa');
    setModalSearchQuery('');
    setSelectedTarget('');
    setScannedUid('');
    setIsWaitingTap(true);
    setShowRegisterModal(true);
  };

  const handleOpenRegisterGuru = () => {
    setRegisterType('guru');
    setModalSearchQuery('');
    setSelectedTarget('');
    setScannedUid('');
    setIsWaitingTap(true);
    setShowRegisterModal(true);
  };

  // FILTERED OPTIONS UNTUK MODAL PENDAFTARAN SISWA/GURU + PENCARIAN REALTIME
  const filteredTargetList = useMemo(() => {
    const q = modalSearchQuery.toLowerCase().trim();
    return (siswaList || []).filter((item) => {
      const isGuruItem = item.isGuru || String(item.id).startsWith('GURU-');
      if (registerType === 'guru' && !isGuruItem) return false;
      if (registerType === 'siswa' && isGuruItem) return false;

      if (!q) return true;
      const nameMatch = (item.nama || '').toLowerCase().includes(q);
      const classMatch = (item.kelas || '').toLowerCase().includes(q);
      return nameMatch || classMatch;
    });
  }, [siswaList, registerType, modalSearchQuery]);

  // HANDLER REGISTRASI KARTU BARU
  const handleSaveRegisterCard = async () => {
    if (!selectedTarget) {
      Swal.fire({ icon: 'warning', title: 'Pilih Target', text: `Silakan pilih Nama ${registerType === 'guru' ? 'Guru' : 'Siswa'} terlebih dahulu!` });
      return;
    }
    if (!scannedUid) {
      Swal.fire({ icon: 'warning', title: 'UID Kosong', text: 'Silakan tap kartu RFID ke alat atau isi kolom UID!' });
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
        setIsWaitingTap(false);
      }
      await fetchInitialData();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem.';
      Swal.fire({ icon: 'error', title: 'Gagal Registrasi', text: errorMsg });
    } finally {
      if (isMountedRef.current) setIsUpdating(false);
    }
  };

  const handleOpenEditModal = (siswa) => {
    if (isRestrictedGuru) {
      Swal.fire({
        icon: 'error',
        title: 'Akses Ditolak',
        text: 'Akun Anda hanya memiliki izin untuk melihat dan mencetak laporan.'
      });
      return;
    }
    const validUid = siswa.rfid_uid || '';
    setEditingSiswa(siswa);
    setEditNama(siswa.nama || '');
    setEditKelas(siswa.kelas || '');
    setEditRfid(validUid);
  };

  // UPDATE STATUS PRESENSI SINKRON SAMA SUPABASE
  const handleUpdateStatus = async (newStatus) => {
    if (isRestrictedGuru) {
      Swal.fire({
        icon: 'error',
        title: 'Akses Ditolak',
        text: 'Anda tidak dapat mengedit status presensi.'
      });
      return;
    }

    if (!editingSiswa) return;
    setIsUpdating(true);
    const validUid = editRfid || editingSiswa.rfid_uid || `UID-${editingSiswa.id}`;
    const cleanNama = (editNama || editingSiswa.nama || '').trim();
    const editorInfo = `${currentUser?.nama || 'Guru'} (${currentUser?.role?.toUpperCase() || 'GURU'})`;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    try {
      let existingRecord = null;

      if (validUid) {
        const { data } = await supabase
          .from('absensi')
          .select('id')
          .eq('rfid_uid', validUid)
          .gte('created_at', startOfToday.toISOString())
          .order('id', { ascending: false })
          .limit(1);
        if (data && data.length > 0) {
          existingRecord = data[0];
        }
      }

      if (!existingRecord && cleanNama) {
        const { data } = await supabase
          .from('absensi')
          .select('id')
          .ilike('nama', cleanNama)
          .gte('created_at', startOfToday.toISOString())
          .order('id', { ascending: false })
          .limit(1);
        if (data && data.length > 0) {
          existingRecord = data[0];
        }
      }

      let error = null;

      if (existingRecord) {
        const res = await supabase
          .from('absensi')
          .update({ 
            status: newStatus, 
            nama: editNama || editingSiswa.nama,
            kelas: editKelas || editingSiswa.kelas,
            edited_by: editorInfo
          })
          .eq('id', existingRecord.id);
        error = res.error;
      } else {
        const res = await supabase
          .from('absensi')
          .insert({
            rfid_uid: validUid,
            nama: editNama || editingSiswa.nama,
            kelas: editKelas || editingSiswa.kelas,
            status: newStatus,
            edited_by: editorInfo,
            created_at: new Date().toISOString()
          });
        error = res.error;
      }

      if (!error) {
        if (isMountedRef.current) setEditingSiswa(null);
        await fetchInitialData();
        Swal.fire({
          icon: 'success',
          title: 'Berhasil!',
          text: `Status presensi ${editNama || editingSiswa.nama} diubah menjadi ${newStatus}`,
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Gagal memperbarui status',
          text: error.message
        });
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Kesalahan System',
        text: 'Terjadi kesalahan koneksi database.'
      });
    } finally {
      if (isMountedRef.current) setIsUpdating(false);
    }
  };

  const handleSaveBiodataAdmin = async () => {
    if (!editingSiswa) return;

    if (!isMasterIqbal && currentUser?.role !== 'admin') {
      Swal.fire({
        icon: 'error',
        title: 'Akses Ditolak',
        text: 'Hanya Administrator yang diperbolehkan mengubah Biodata Siswa/Guru.'
      });
      return;
    }

    setIsUpdating(true);
    try {
      if (editingSiswa?.isGuru) {
        const guruId = editingSiswa.rawId || String(editingSiswa.id).replace('GURU-', '');
        const { error: guruErr } = await supabase
          .from('guru')
          .update({
            nama: editNama,
            rfid_uid: editRfid
          })
          .eq('id', guruId);

        if (guruErr) {
          Swal.fire({
            icon: 'error',
            title: 'Gagal',
            text: 'Gagal memperbarui data guru: ' + guruErr.message
          });
        } else {
          Swal.fire({
            icon: 'success',
            title: 'Berhasil',
            text: 'Data Guru berhasil diperbarui!',
            timer: 2000,
            showConfirmButton: false
          });
          if (isMountedRef.current) setEditingSiswa(null);
          await fetchInitialData();
        }
      } else {
        const { error: cardError } = await supabase
          .from('rfid_cards')
          .update({
            nama: editNama,
            kelas: editKelas,
            rfid_uid: editRfid
          })
          .eq('id', editingSiswa.id);

        if (cardError) {
          Swal.fire({
            icon: 'error',
            title: 'Gagal',
            text: 'Gagal memperbarui master siswa: ' + cardError.message
          });
        } else {
          Swal.fire({
            icon: 'success',
            title: 'Berhasil Berubah',
            text: 'Data siswa berhasil diperbarui oleh Admin!',
            timer: 2000,
            showConfirmButton: false
          });
          if (isMountedRef.current) setEditingSiswa(null);
          await fetchInitialData();
        }
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Eror Simpan',
        text: 'Terjadi kesalahan saat menyimpan data.'
      });
    } finally {
      if (isMountedRef.current) setIsUpdating(false);
    }
  };

  // STATISTIK HARI INI
  const getTodayStr = () => new Date().toDateString();

  const totalSiswa = (siswaList || []).length;
  const totalHadir = useMemo(() => {
    if (!hasMounted) return 0;
    const today = getTodayStr();
    return (absensiLogs || []).filter((l) => {
      const rawDate = l.created_at ? new Date(l.created_at) : null;
      const isToday = rawDate && !isNaN(rawDate.getTime()) && rawDate.toDateString() === today;
      return isToday && l.status && l.status.includes('Hadir');
    }).length;
  }, [absensiLogs, hasMounted]);

  const persentaseHadir = totalSiswa > 0 ? Math.round((totalHadir / totalSiswa) * 100) : 0;

  // FILTER LOGIC
  const filteredSiswa = useMemo(() => {
    const q = (searchQuery || '').toLowerCase();
    return [...(siswaList || [])]
      .filter((s) => {
        const strKelas = s.kelas || '';
        const namaMatch = (s.nama || '').toLowerCase().includes(q);
        const kelasMatch = strKelas.toLowerCase().includes(q);
        const matchSearch = namaMatch || kelasMatch;

        let matchTingkat = true;
        if (filterTingkat === 'Kelas X') {
          matchTingkat = REGEX_KELAS_X.test(strKelas) || strKelas.trim() === 'X';
        } else if (filterTingkat === 'Kelas XI') {
          matchTingkat = REGEX_KELAS_XI.test(strKelas) || strKelas.trim() === 'XI';
        } else if (filterTingkat === 'Kelas XII') {
          matchTingkat = REGEX_KELAS_XII.test(strKelas) || strKelas.trim() === 'XII';
        } else if (filterTingkat === 'Guru / Staff') {
          matchTingkat = strKelas === 'Guru / Staff' || (s.isGuru === true && s.role !== 'admin');
        } else if (filterTingkat === "MASTER'K") {
          matchTingkat = strKelas === "MASTER'K" || s.role === 'admin' || strKelas.toUpperCase().includes('MASTER');
        }

        let matchJurusan = true;
        if (filterJurusan !== 'Semua Jurusan') {
          const k = strKelas.toUpperCase();
          if (filterJurusan === 'Guru / Staff') {
            matchJurusan = strKelas === 'Guru / Staff' || (s.isGuru === true && s.role !== 'admin');
          } else if (filterJurusan === "MASTER'K") {
            matchJurusan = strKelas === "MASTER'K" || s.role === 'admin' || k.includes('MASTER');
          } else if (filterJurusan === 'Teknik Jaringan Komputer dan Telekomunikasi') {
            matchJurusan = k.includes('TJKT') || k.includes('TEKNIK JARINGAN') || k.includes('KOMPUTER');
          } else if (filterJurusan === 'Akuntansi dan Keuangan Lembaga') {
            matchJurusan = k.includes('AKL') || k.includes('AKUNTANSI');
          } else if (filterJurusan === 'Manajemen Perkantoran dan Layanan Bisnis') {
            matchJurusan = k.includes('MPLB') || k.includes('MANAJEMEN PERKANTORAN') || k.includes('PERKANTORAN');
          } else if (filterJurusan === 'Pemasaran') {
            matchJurusan = k.includes('PM') || k.includes('PEMASARAN');
          }
        }

        return matchSearch && matchTingkat && matchJurusan;
      })
      .sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));
  }, [siswaList, searchQuery, filterTingkat, filterJurusan]);

  // LOOKUP REKAP ABSENSI TERSIAPAN
  const absensiMap = useMemo(() => {
    const mapByUid = new Map();
    const mapByNama = new Map();

    (absensiLogs || []).forEach((l) => {
      const uid = (l.rfid_uid || '').toString().trim().toUpperCase();
      const nama = (l.nama || '').toString().trim().toLowerCase();

      if (uid) {
        if (!mapByUid.has(uid)) mapByUid.set(uid, []);
        mapByUid.get(uid).push(l);
      }
      if (nama) {
        if (!mapByNama.has(nama)) mapByNama.set(nama, []);
        mapByNama.get(nama).push(l);
      }
    });

    return { mapByUid, mapByNama };
  }, [absensiLogs]);

  const todayAbsensiMap = useMemo(() => {
    if (!hasMounted) return new Map();
    const todayStr = getTodayStr();
    const todayMap = new Map();

    (absensiLogs || []).forEach((l) => {
      const rawDate = l.created_at ? new Date(l.created_at) : null;
      if (rawDate && !isNaN(rawDate.getTime()) && rawDate.toDateString() === todayStr) {
        const uid = (l.rfid_uid || '').toString().trim().toUpperCase();
        const nama = (l.nama || '').toString().trim().toLowerCase();

        if (uid && !todayMap.has(uid)) {
          todayMap.set(uid, l);
        }
        if (nama && !todayMap.has(nama)) {
          todayMap.set(nama, l);
        }
      }
    });

    return todayMap;
  }, [absensiLogs, hasMounted]);

  const getRecapForSiswa = useCallback((siswaObjOrUid) => {
    let cleanTargetUid = '';
    let targetNama = '';

    if (typeof siswaObjOrUid === 'object' && siswaObjOrUid !== null) {
      cleanTargetUid = (siswaObjOrUid.rfid_uid || '').toString().trim().toUpperCase();
      targetNama = (siswaObjOrUid.nama || '').toString().trim().toLowerCase();
    } else {
      cleanTargetUid = (siswaObjOrUid || '').toString().trim().toUpperCase();
    }

    const now = new Date();
    const startOfTodayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const matchedByUid = cleanTargetUid ? (absensiMap.mapByUid.get(cleanTargetUid) || []) : [];
    const matchedByNama = targetNama ? (absensiMap.mapByNama.get(targetNama) || []) : [];

    const logSet = new Set();
    const candidateLogs = [];

    [...matchedByUid, ...matchedByNama].forEach((log) => {
      if (!logSet.has(log.id)) {
        logSet.add(log.id);
        candidateLogs.push(log);
      }
    });

    let todayStatus = 'Alpha';
    let todayWaktu = '-';
    let editedBy = null;

    candidateLogs.forEach((l) => {
      const rawDate = l.created_at ? new Date(l.created_at) : null;
      if (rawDate && !isNaN(rawDate.getTime()) && rawDate.getTime() >= startOfTodayMs) {
        todayStatus = l.status || 'Hadir';
        todayWaktu = rawDate.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Jakarta'
        }) + ' WIB';
        if (l.edited_by) editedBy = l.edited_by;
      }
    });

    const datesHadir = new Set();
    const datesIzin = new Set();

    candidateLogs.forEach((l) => {
      const rawDate = l.created_at ? new Date(l.created_at) : null;
      if (rawDate && !isNaN(rawDate.getTime())) {
        const dateStr = rawDate.toDateString();
        const st = (l.status || '').toLowerCase();
        if (st.includes('hadir')) datesHadir.add(dateStr);
        else if (st.includes('izin') || st.includes('sakit')) datesIzin.add(dateStr);
      }
    });

    return {
      todayStatus,
      todayWaktu,
      editedBy,
      totalHadirCount: datesHadir.size,
      totalIzinCount: datesIzin.size,
      allLogs: candidateLogs
    };
  }, [absensiMap]);

  // EXPORT EXCEL (.CSV)
  const handleExportExcel = () => {
    try {
      let csvContent = 'data:text/csv;charset=utf-8,';
      csvContent += 'No,Nama,Kelas/Jabatan,Status Hari Ini,Waktu Tap,Total Hadir,Total Izin\n';

      filteredSiswa.forEach((item, index) => {
        const recap = getRecapForSiswa(item);
        const line = [
          index + 1,
          `"${item.nama || '-'}"`,
          `"${item.kelas || '-'}"`,
          `"${recap.todayStatus}"`,
          `"${recap.todayWaktu}"`,
          recap.totalHadirCount,
          recap.totalIzinCount
        ].join(',');
        csvContent += line + '\n';
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Laporan_Presensi_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Export Gagal', text: 'Terjadi kesalahan saat mengexport data CSV.' });
    }
  };

  // PRINT PDF REPORT
  const handlePrintPDF = () => {
    window.print();
  };

  // --- SPLASH SCREEN LOADING TAMPILAN ---
  if (loading) {
    return (
      <div style={styles.splashBg}>
        <div style={styles.splashCard}>
          <div style={styles.logoCircle}>
            <span style={{ fontSize: '32px' }}>🏫</span>
          </div>
          <h2 style={styles.splashTitle}>PRESENSI RFID DIGITAL</h2>
          <p style={styles.splashSub}>SMK YPK MEDAN</p>
          <div style={styles.progressContainer}>
            <div style={{ ...styles.progressBar, width: `${progress}%` }} />
          </div>
          <p style={styles.progressText}>Memuat Sistem... {Math.round(progress)}%</p>
        </div>
      </div>
    );
  }

  // --- VIEW LOGIN FORM TAMPILAN ---
  if (!isLoggedIn) {
    return (
      <div style={styles.loginBg}>
        <div style={styles.loginCard}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ ...styles.logoCircle, margin: '0 auto 10px' }}>
              <span style={{ fontSize: '32px' }}>🔒</span>
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1a237e' }}>PORTAL GURU & ADMIN</h2>
            <p style={{ fontSize: '12px', color: '#666' }}>SMK YPK MEDAN - RFID PRESENSI</p>
          </div>

          {loginError && (
            <div style={styles.alertError}>
              ⚠️ {loginError}
            </div>
          )}

          <form onSubmit={handleLoginSubmit}>
            <div style={{ marginBottom: '14px' }}>
              <label style={styles.label}>Username Guru / Admin:</label>
              <input
                type="text"
                required
                placeholder="Masukkan username..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={styles.inputStyle}
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={styles.label}>Password:</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Masukkan password..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={styles.inputStyle}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={styles.toggleBtn}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '18px' }}>
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ cursor: 'pointer', marginRight: '6px' }}
              />
              <label htmlFor="remember" style={{ fontSize: '12px', color: '#555', cursor: 'pointer' }}>
                Ingat Sesi Login Saya
              </label>
            </div>

            <button type="submit" disabled={isLoggingIn} style={styles.btnLogin}>
              {isLoggingIn ? '⏳ Memeriksa...' : '🔑 MASUK KE PORTAL'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- VIEW MAIN DASHBOARD ---
  return (
    <div style={styles.mainContainer}>
      {/* HEADER BAR */}
      <header style={styles.headerBar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={styles.headerIcon}>🏫</div>
          <div>
            <h1 style={styles.headerTitle}>PRESENSI RFID DIGITAL</h1>
            <p style={styles.headerSub}>SMK YPK MEDAN - Realtime Monitor</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#1a237e', display: 'block' }}>
              👤 {currentUser?.nama || 'Guru User'}
            </span>
            <span style={{ fontSize: '10px', color: '#fff', backgroundColor: isMasterIqbal ? '#2e7d32' : '#e65100', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
              {isMasterIqbal ? '👑 MASTER ADMIN' : '👨‍🏫 GURU'}
            </span>
          </div>
          <button onClick={handleLogout} style={styles.btnLogout}>
            🚪 Logout
          </button>
        </div>
      </header>

      <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* STATISTIK CARDS */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statIconBlue}>👥</div>
            <div>
              <div style={styles.statNumber}>{totalSiswa}</div>
              <div style={styles.statLabel}>Total Terdaftar</div>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statIconGreen}>✅</div>
            <div>
              <div style={styles.statNumber}>{totalHadir}</div>
              <div style={styles.statLabel}>Hadir Hari Ini</div>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statIconOrange}>📊</div>
            <div>
              <div style={styles.statNumber}>{persentaseHadir}%</div>
              <div style={styles.statLabel}>Persentase Kehadiran</div>
            </div>
          </div>
        </div>

        {/* CONTROLS & FILTER BARIS */}
        <div style={styles.filterCard}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', alignItems: 'center' }}>
            {/* SEARCH BAR */}
            <div style={{ flex: '1 1 300px', position: 'relative' }}>
              <input
                type="text"
                placeholder="🔍 Cari nama siswa / guru / kelas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={styles.searchInput}
              />
            </div>

            {/* ACTION BUTTONS (PEMISAHAN TOMBOL SISWA DAN GURU) */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {!isRestrictedGuru && (
                <>
                  <button 
                    onClick={handleOpenRegisterSiswa} 
                    style={{ 
                      backgroundColor: '#8e24aa', 
                      color: '#fff', 
                      border: 'none', 
                      padding: '10px 16px', 
                      borderRadius: '10px', 
                      fontSize: '12px', 
                      fontWeight: 'bold', 
                      cursor: 'pointer', 
                      boxShadow: '0 2px 6px rgba(142,36,170,0.3)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px' 
                    }}
                  >
                    🎓 ➕ Daftar RFID Siswa
                  </button>

                  <button 
                    onClick={handleOpenRegisterGuru} 
                    style={{ 
                      backgroundColor: '#0288d1', 
                      color: '#fff', 
                      border: 'none', 
                      padding: '10px 16px', 
                      borderRadius: '10px', 
                      fontSize: '12px', 
                      fontWeight: 'bold', 
                      cursor: 'pointer', 
                      boxShadow: '0 2px 6px rgba(2,136,209,0.3)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px' 
                    }}
                  >
                    👨‍🏫 ➕ Daftar RFID Guru
                  </button>
                </>
              )}
              <button onClick={handleExportExcel} style={styles.btnGreenExport}> 📊 Export Excel (.csv) </button>
              <button onClick={handlePrintPDF} style={styles.btnBluePdf}> 📄 Cetak PDF Laporan </button>
            </div>
          </div>

          {/* CHIP FILTERS TINGKAT & JURUSAN */}
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* TINGKAT FILTER */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#666', minWidth: '70px' }}>Tingkat:</span>
              {tingkatOptions.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => setFilterTingkat(opt.label)}
                  style={{
                    ...styles.chipBtn,
                    backgroundColor: filterTingkat === opt.label ? '#1a237e' : '#f0f2f5',
                    color: filterTingkat === opt.label ? '#fff' : '#444',
                  }}
                >
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>

            {/* JURUSAN FILTER */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#666', minWidth: '70px' }}>Jurusan:</span>
              {jurusanOptions.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => setFilterJurusan(opt.label)}
                  style={{
                    ...styles.chipBtn,
                    backgroundColor: filterJurusan === opt.label ? '#0d47a1' : '#f0f2f5',
                    color: filterJurusan === opt.label ? '#fff' : '#444',
                  }}
                >
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* DATA TABEL ABSENSI */}
        <div style={styles.tableCard}>
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>NO</th>
                  <th style={styles.th}>NAMA LENGKAP</th>
                  <th style={styles.th}>KELAS / JABATAN</th>
                  <th style={styles.th}>STATUS HARI INI</th>
                  <th style={styles.th}>WAKTU TAP</th>
                  <th style={styles.th}>TOTAL HADIR</th>
                  <th style={styles.th}>TOTAL IZIN</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>AKSI & DETAIL</th>
                </tr>
              </thead>
              <tbody>
                {filteredSiswa.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: '#888', fontSize: '13px' }}>
                      🚫 Tidak ada data siswa / guru yang cocok dengan filter pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredSiswa.map((item, idx) => {
                    const recap = getRecapForSiswa(item);
                    return (
                      <tr key={item.id} style={idx % 2 === 0 ? styles.trEven : styles.trOdd}>
                        <td style={{ ...styles.td, fontWeight: 'bold', color: '#666' }}>{idx + 1}</td>
                        <td style={styles.td}>
                          <b style={{ color: '#1a237e' }}>{item.nama}</b>
                          {item.isGuru && (
                            <span style={{ marginLeft: '6px', fontSize: '10px', backgroundColor: '#e1f5fe', color: '#0288d1', padding: '2px 6px', borderRadius: '6px', fontWeight: 'bold' }}>
                              👨‍🏫 GURU
                            </span>
                          )}
                          {!item.rfid_uid && (
                            <span style={{ marginLeft: '6px', fontSize: '10px', backgroundColor: '#fff3e0', color: '#e65100', padding: '2px 6px', borderRadius: '6px' }}>
                              ⚠️ Belum RFID
                            </span>
                          )}
                        </td>
                        <td style={styles.td}>
                          <span style={{ ...styles.badgeClass, backgroundColor: '#f5f5f5', color: '#333' }}>
                            {item.kelas || '-'}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <span style={
                            recap.todayStatus.includes('Hadir') ? styles.badgeHadir :
                            recap.todayStatus.includes('Izin') ? styles.badgeIzin :
                            styles.badgeAlpha
                          }>
                            {recap.todayStatus}
                          </span>
                          {recap.editedBy && (
                            <span style={{ display: 'block', fontSize: '9px', color: '#888', marginTop: '2px' }}>
                              ✏️ {recap.editedBy}
                            </span>
                          )}
                        </td>
                        <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: '12px' }}>{recap.todayWaktu}</td>
                        <td style={{ ...styles.td, fontWeight: 'bold', color: '#2e7d32' }}>{recap.totalHadirCount} Hari</td>
                        <td style={{ ...styles.td, fontWeight: 'bold', color: '#1565c0' }}>{recap.totalIzinCount} Hari</td>
                        <td style={{ ...styles.td, textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              style={styles.btnEditOutline}
                              title="Ubah Status Presensi"
                            >
                              ✏️ Status
                            </button>
                            <button
                              onClick={() => setDetailSiswa({ item, recap })}
                              style={styles.btnDetailOutline}
                              title="Lihat Detail Riwayat"
                            >
                              👁️ Detail
                            </button>
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
      </div>

      {/* --- MODAL REGISTRASI KARTU BARU DENGAN FITUR PENCARIAN & DUA TOMBOL --- */}
      {showRegisterModal && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalCard, maxWidth: '520px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, color: registerType === 'guru' ? '#0288d1' : '#8e24aa', fontSize: '18px', fontWeight: 'bold' }}>
                {registerType === 'guru' ? '👨‍🏫 Registrasi RFID Guru / Staff' : '🎓 Registrasi RFID Siswa'}
              </h3>
              <button 
                onClick={() => { setShowRegisterModal(false); setIsWaitingTap(false); }} 
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#888' }}
              >
                ✕
              </button>
            </div>

            {/* TAB NAVIGASI BERALIH CEPAT */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', backgroundColor: '#f5f5f5', padding: '4px', borderRadius: '10px' }}>
              <button
                onClick={() => { setRegisterType('siswa'); setSelectedTarget(''); }}
                style={{
                  flex: 1,
                  padding: '8px',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  cursor: 'pointer',
                  backgroundColor: registerType === 'siswa' ? '#8e24aa' : 'transparent',
                  color: registerType === 'siswa' ? '#fff' : '#666'
                }}
              >
                🎓 Registrasi Siswa
              </button>
              <button
                onClick={() => { setRegisterType('guru'); setSelectedTarget(''); }}
                style={{
                  flex: 1,
                  padding: '8px',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  cursor: 'pointer',
                  backgroundColor: registerType === 'guru' ? '#0288d1' : 'transparent',
                  color: registerType === 'guru' ? '#fff' : '#666'
                }}
              >
                👨‍🏫 Registrasi Guru
              </button>
            </div>

            {/* FITUR PENCARIAN DI MODAL */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#555', display: 'block', marginBottom: '4px' }}>
                🔍 Cari Nama / Kelas ({filteredTargetList.length} Ditemukan):
              </label>
              <input
                type="text"
                placeholder="Ketik nama atau kelas..."
                value={modalSearchQuery}
                onChange={(e) => setModalSearchQuery(e.target.value)}
                style={{ ...styles.inputStyle, padding: '8px 12px', fontSize: '12px' }}
              />
            </div>

            {/* DROPDOWN TARGET DARI HASIL PENCARIAN */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#555', display: 'block', marginBottom: '4px' }}>
                Pilih {registerType === 'guru' ? 'Guru / Staff' : 'Siswa'}:
              </label>
              <select
                value={selectedTarget}
                onChange={(e) => setSelectedTarget(e.target.value)}
                style={{ ...styles.inputStyle, padding: '8px 12px', fontSize: '12px' }}
              >
                <option value="">-- Pilih {registerType === 'guru' ? 'Guru / Staff' : 'Siswa'} --</option>
                {filteredTargetList.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nama} - {item.kelas} {item.rfid_uid ? `(Sudah ada UID: ${item.rfid_uid})` : '(Belum Ada RFID)'}
                  </option>
                ))}
              </select>
            </div>

            {/* SCANNER TAP UID */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#555', display: 'block', marginBottom: '4px' }}>
                Tap Kartu Ke Alat / Masukkan UID:
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Contoh: A1B2C3D4"
                  value={scannedUid}
                  onChange={(e) => setScannedUid(e.target.value.toUpperCase())}
                  style={{ ...styles.inputStyle, fontFamily: 'monospace', fontSize: '14px', fontWeight: 'bold', flex: 1 }}
                />
                <button
                  type="button"
                  onClick={() => setIsWaitingTap(!isWaitingTap)}
                  style={{
                    backgroundColor: isWaitingTap ? '#d32f2f' : '#00897b',
                    color: '#fff',
                    border: 'none',
                    padding: '0 14px',
                    borderRadius: '10px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {isWaitingTap ? '⏹ Stop Scan' : '📡 Mode Tap'}
                </button>
              </div>
            </div>

            {isWaitingTap && (
              <div style={{ backgroundColor: '#e0f2f1', border: '1px solid #80cbc4', padding: '10px', borderRadius: '10px', marginBottom: '15px', textAlign: 'center' }}>
                <b style={{ color: '#00695c', fontSize: '12px', display: 'block' }}>📡 MENUNGGU TAP KARTU DARI ALAT ESP8266...</b>
                <span style={{ fontSize: '11px', color: '#004d40' }}>Dekatkan kartu RFID baru ke alat presensi.</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button
                disabled={isUpdating}
                onClick={handleSaveRegisterCard}
                style={{
                  flex: 1,
                  backgroundColor: registerType === 'guru' ? '#0288d1' : '#8e24aa',
                  color: '#fff',
                  border: 'none',
                  padding: '10px',
                  borderRadius: '10px',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  cursor: isUpdating ? 'not-allowed' : 'pointer'
                }}
              >
                {isUpdating ? '⏳ Menyimpan...' : '💾 Simpan & Tautkan Kartu'}
              </button>
              <button
                onClick={() => { setShowRegisterModal(false); setIsWaitingTap(false); }}
                style={{
                  flex: 1,
                  backgroundColor: '#f5f5f5',
                  color: '#333',
                  border: '1px solid #ccc',
                  padding: '10px',
                  borderRadius: '10px',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL EDIT STATUS PRESENSI & ADMIN BIODATA --- */}
      {editingSiswa && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, color: '#1a237e', fontSize: '16px' }}>
                ✏️ Edit Status Presensi & Biodata
              </h3>
              <button onClick={() => setEditingSiswa(null)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#888' }}>
                ✕
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#444', marginBottom: '14px' }}>
              Ubah status presensi hari ini untuk: <b>{editingSiswa.nama}</b> ({editingSiswa.kelas})
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '16px' }}>
              <button
                disabled={isUpdating}
                onClick={() => handleUpdateStatus('Hadir')}
                style={{ backgroundColor: '#2e7d32', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}
              >
                ✅ Hadir
              </button>
              <button
                disabled={isUpdating}
                onClick={() => handleUpdateStatus('Izin')}
                style={{ backgroundColor: '#1565c0', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}
              >
                ℹ️ Izin / Sakit
              </button>
              <button
                disabled={isUpdating}
                onClick={() => handleUpdateStatus('Alpha')}
                style={{ backgroundColor: '#c62828', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}
              >
                ❌ Alpha
              </button>
            </div>

            {/* FORM MASTER DATA EDIT BILA USER ADMIN */}
            {(isMasterIqbal || currentUser?.role === 'admin') && (
              <div style={{ borderTop: '1px solid #eee', paddingTop: '14px', marginTop: '14px' }}>
                <b style={{ fontSize: '12px', color: '#e65100', display: 'block', marginBottom: '10px' }}>
                  👑 Edit Master Biodata (Khusus Admin):
                </b>
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ fontSize: '11px', color: '#666', display: 'block' }}>Nama:</label>
                  <input
                    type="text"
                    value={editNama}
                    onChange={(e) => setEditNama(e.target.value)}
                    style={{ ...styles.inputStyle, fontSize: '12px', padding: '6px 10px' }}
                  />
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ fontSize: '11px', color: '#666', display: 'block' }}>Kelas / Jabatan:</label>
                  <input
                    type="text"
                    value={editKelas}
                    onChange={(e) => setEditKelas(e.target.value)}
                    style={{ ...styles.inputStyle, fontSize: '12px', padding: '6px 10px' }}
                  />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '11px', color: '#666', display: 'block' }}>RFID UID:</label>
                  <input
                    type="text"
                    value={editRfid}
                    onChange={(e) => setEditRfid(e.target.value.toUpperCase())}
                    style={{ ...styles.inputStyle, fontSize: '12px', padding: '6px 10px', fontFamily: 'monospace' }}
                  />
                </div>
                <button
                  disabled={isUpdating}
                  onClick={handleSaveBiodataAdmin}
                  style={{ width: '100%', backgroundColor: '#e65100', color: '#fff', border: 'none', padding: '8px', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
                >
                  💾 Simpan Master Data Admin
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- MODAL DETAIL RIWAYAT ABSENSI --- */}
      {detailSiswa && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalCard, maxWidth: '550px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, color: '#1a237e', fontSize: '16px' }}>
                👁️ Riwayat Presensi Lengkap
              </h3>
              <button onClick={() => setDetailSiswa(null)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#888' }}>
                ✕
              </button>
            </div>

            <div style={{ marginBottom: '14px', backgroundColor: '#f0f2f5', padding: '10px', borderRadius: '8px' }}>
              <b style={{ fontSize: '14px', color: '#1a237e', display: 'block' }}>{detailSiswa.item.nama}</b>
              <span style={{ fontSize: '12px', color: '#555' }}>Kelas/Jabatan: {detailSiswa.item.kelas || '-'}</span> | <span style={{ fontSize: '11px', color: '#777', fontFamily: 'monospace' }}>UID: {detailSiswa.item.rfid_uid || 'Belum ditautkan'}</span>
            </div>

            <div style={{ maxHeight: '250px', overflowY: 'auto', marginBottom: '14px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#1a237e', color: '#fff' }}>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Waktu / Tanggal</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Status</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Diedit Oleh</th>
                  </tr>
                </thead>
                <tbody>
                  {detailSiswa.recap.allLogs.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ padding: '14px', textAlign: 'center', color: '#888' }}>
                        Belum ada catatan riwayat tap.
                      </td>
                    </tr>
                  ) : (
                    detailSiswa.recap.allLogs.map((l) => (
                      <tr key={l.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '8px' }}>
                          {l.created_at ? new Date(l.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : '-'}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          <span style={{
                            fontSize: '10px',
                            padding: '3px 8px',
                            borderRadius: '10px',
                            fontWeight: 'bold',
                            backgroundColor: (l.status || '').includes('Hadir') ? '#e8f5e9' : '#ffebee',
                            color: (l.status || '').includes('Hadir') ? '#2e7d32' : '#c62828'
                          }}>
                            {l.status || 'Hadir'}
                          </span>
                        </td>
                        <td style={{ padding: '8px', color: '#666', fontSize: '11px' }}>{l.edited_by || 'Sistem Tap RFID'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <button
              onClick={() => setDetailSiswa(null)}
              style={{ width: '100%', backgroundColor: '#1a237e', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// STYLESHEETS OBJECT (MEMELIHARA PENUH UI/UX ASLI KONSISTEN)
const styles = {
  splashBg: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#0a0e27' },
  splashCard: { textAlign: 'center', padding: '40px', backgroundColor: '#ffffff', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', width: '90%', maxWidth: '400px' },
  logoCircle: { width: '70px', height: '70px', borderRadius: '50%', backgroundColor: '#e8eaf6', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  splashTitle: { fontSize: '18px', fontWeight: 'bold', color: '#1a237e', marginTop: '15px' },
  splashSub: { fontSize: '12px', color: '#666', marginBottom: '20px' },
  progressContainer: { height: '8px', backgroundColor: '#e0e0e0', borderRadius: '10px', overflow: 'hidden', marginBottom: '10px' },
  progressBar: { height: '100%', backgroundColor: '#1a237e', transition: 'width 0.2s ease' },
  progressText: { fontSize: '11px', color: '#888', fontWeight: 'bold' },

  loginBg: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#f0f2f5' },
  loginCard: { backgroundColor: '#fff', padding: '30px', borderRadius: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', width: '90%', maxWidth: '380px' },
  label: { fontSize: '12px', fontWeight: 'bold', color: '#444', display: 'block', marginBottom: '6px' },
  inputStyle: { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '13px', outline: 'none', boxSizing: 'border-box' },
  toggleBtn: { position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' },
  btnLogin: { width: '100%', padding: '12px', backgroundColor: '#1a237e', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' },
  alertError: { backgroundColor: '#ffebee', color: '#c62828', padding: '10px', borderRadius: '8px', fontSize: '12px', marginBottom: '14px', border: '1px solid #ffcdd2' },

  mainContainer: { minHeight: '100vh', backgroundColor: '#f4f6f9', fontFamily: 'sans-serif' },
  headerBar: { backgroundColor: '#ffffff', padding: '14px 24px', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', sticky: 'top', zIndex: 10 },
  headerIcon: { width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#e8eaf6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' },
  headerTitle: { fontSize: '16px', fontWeight: 'bold', color: '#1a237e', margin: 0 },
  headerSub: { fontSize: '11px', color: '#777', margin: 0 },
  btnLogout: { backgroundColor: '#ffebee', border: '1px solid #ffcdd2', color: '#c62828', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' },

  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '20px' },
  statCard: { backgroundColor: '#fff', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '14px' },
  statIconBlue: { width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#e3f2fd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' },
  statIconGreen: { width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#e8f5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' },
  statIconOrange: { width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#fff3e0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' },
  statNumber: { fontSize: '22px', fontWeight: 'bold', color: '#1a237e' },
  statLabel: { fontSize: '12px', color: '#666' },

  filterCard: { backgroundColor: '#fff', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', marginBottom: '20px' },
  searchInput: { width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '12px', outline: 'none', boxSizing: 'border-box' },
  btnGreenExport: { backgroundColor: '#2e7d32', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' },
  btnBluePdf: { backgroundColor: '#1565c0', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' },
  chipBtn: { border: 'none', padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' },

  tableCard: { backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  thRow: { backgroundColor: '#1a237e', color: '#fff' },
  th: { padding: '12px 14px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' },
  td: { padding: '12px 14px', fontSize: '12px', borderBottom: '1px solid #eee' },
  trEven: { backgroundColor: '#ffffff' },
  trOdd: { backgroundColor: '#fcfcfd' },

  badgeHadir: { backgroundColor: '#e8f5e9', color: '#2e7d32', padding: '5px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #a5d6a7', display: 'inline-block' },
  badgeIzin: { backgroundColor: '#e3f2fd', color: '#1565c0', padding: '5px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #90caf9', display: 'inline-block' },
  badgeAlpha: { backgroundColor: '#ffebee', color: '#c62828', padding: '5px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #ffcdd2', display: 'inline-block' },
  badgeClass: { padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #ddd' },
  btnDetailOutline: { backgroundColor: '#ffffff', border: '1px solid #ffb74d', color: '#e65100', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' },
  btnEditOutline: { backgroundColor: '#ffffff', border: '1px solid #1565c0', color: '#1565c0', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' },

  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modalCard: { backgroundColor: '#fff', borderRadius: '16px', padding: '24px', width: '90%', maxWidth: '450px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }
};
