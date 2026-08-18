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

  const [detailSiswa, setDetailSiswa] = useState(null);

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

      const safeCards = Array.isArray(cards) ? cards.map(c => ({
        ...c,
        id: `SISWA-${c.id}`,
        rawId: c.id,
        rfid_uid: c.rfid_uid ? c.rfid_uid.trim().toUpperCase() : null,
        isGuru: false
      })) : [];

      const safeGuru = Array.isArray(guruData) ? guruData.map(g => ({
        ...g,
        id: `GURU-${g.id}`,
        rawId: g.id,
        nama: g.nama || '',
        kelas: g.role === 'admin' ? "MASTER'K" : 'Guru / Staff',
        rfid_uid: g.rfid_uid ? g.rfid_uid.trim().toUpperCase() : null,
        isGuru: true,
        role: g.role
      })) : [];

      const safeLogs = Array.isArray(logs) ? logs.map(l => ({
        ...l,
        rfid_uid: l.rfid_uid ? l.rfid_uid.trim().toUpperCase() : ''
      })) : [];

      const combinedList = [...safeCards, ...safeGuru];

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
            const cleanUid = latestScan.uid.trim().toUpperCase();
            setScannedUid((prev) => (prev !== cleanUid ? cleanUid : prev));
            return;
          }
        } catch (err) {
          // Fallback silent
        } finally {
          isPollingRef.current = false;
        }
      }, 1200);
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

  const triggerWaPopup = useCallback((waData) => {
    try {
      if (typeof window === 'undefined') return;
      Swal.fire({
        title: '💬 NOTIFIKASI WA TERKIRIM!',
        html: `
          <div style="font-size: 14px; margin-top: 5px; text-align: left;">
            <b style="font-size: 15px; color: #333;">${waData.nama || 'Siswa / Guru'}</b><br/>
            <span style="color: #666; font-size: 12px;">Penerima: <b>${waData.targetRole || 'Orang Tua / Wali'}</b></span><br/>
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
            const cleanUid = newRecord.rfid_uid ? newRecord.rfid_uid.toString().trim().toUpperCase() : '';

            if (cleanUid && isMountedRef.current) {
              setScannedUid(cleanUid);
            }

            let displayName = newRecord.nama;
            let displayKelas = newRecord.kelas;

            if (!displayName || !displayKelas) {
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
                    targetRole: displayKelas?.includes('Guru') ? 'Guru / Staff' : 'Orang Tua / Wali'
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
        async (payload) => {
          const { fetchInitialData: refresh, triggerWaPopup: waPopUp } = realtimeHandlersRef.current;
          const freshData = await refresh();

          if (payload?.new) {
            const newRecord = payload.new;
            const oldRecord = payload.old;

            if (newRecord.rfid_uid && isMountedRef.current) {
              setScannedUid(newRecord.rfid_uid.toString().trim().toUpperCase());
            }

            // Pemicu Notifikasi WA jika wa_sent berubah dari false menjadi true
            if (newRecord.wa_sent && (!oldRecord || !oldRecord.wa_sent)) {
              const currentSiswa = freshData?.combinedList || [];
              const cleanUid = (newRecord.rfid_uid || '').toString().trim().toUpperCase();
              const matchedSiswa = currentSiswa.find(
                (s) => (s.rfid_uid || '').toString().trim().toUpperCase() === cleanUid
              );

              waPopUp({
                nama: matchedSiswa?.nama || newRecord.nama || 'Siswa / Guru',
                targetRole: (matchedSiswa?.kelas || newRecord.kelas || '').includes('Guru') ? 'Guru / Staff' : 'Orang Tua / Wali'
              });
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'latest_scan' },
        (payload) => {
          if (payload?.new?.uid && isMountedRef.current) {
            setScannedUid(payload.new.uid.toString().trim().toUpperCase());
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

  const handleSaveRegisterCard = async () => {
    if (!selectedTarget) {
      Swal.fire({ icon: 'warning', title: 'Pilih Target', text: 'Silakan pilih Nama Guru / Siswa terlebih dahulu!' });
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
      const targetDbId = targetObj.rawId || String(targetObj.id).replace('GURU-', '').replace('SISWA-', '');

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
          .eq('id', targetDbId);

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
    const validUid = siswa.rfid_uid ? siswa.rfid_uid.trim().toUpperCase() : '';
    setEditingSiswa(siswa);
    setEditNama(siswa.nama || '');
    setEditKelas(siswa.kelas || '');
    setEditRfid(validUid);
  };

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
    const validUid = (editRfid || editingSiswa.rfid_uid || `UID-${editingSiswa.rawId || editingSiswa.id}`).trim().toUpperCase();
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
    const cleanRfid = editRfid ? editRfid.trim().toUpperCase() : '';

    try {
      if (editingSiswa?.isGuru) {
        const guruId = editingSiswa.rawId || String(editingSiswa.id).replace('GURU-', '');
        const { error: guruErr } = await supabase
          .from('guru')
          .update({
            nama: editNama,
            rfid_uid: cleanRfid
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
        const siswaId = editingSiswa.rawId || String(editingSiswa.id).replace('SISWA-', '');
        const { error: cardError } = await supabase
          .from('rfid_cards')
          .update({
            nama: editNama,
            kelas: editKelas,
            rfid_uid: cleanRfid
          })
          .eq('id', siswaId);

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

    const logs = candidateLogs.filter((l) => {
      const logDate = l.created_at ? new Date(l.created_at) : new Date();
      if (isNaN(logDate.getTime())) return false;

      if (periode === 'Hari Ini') {
        return logDate.toDateString() === now.toDateString();
      } else if (periode === '7 Hari') {
        const logDateMs = new Date(logDate.getFullYear(), logDate.getMonth(), logDate.getDate()).getTime();
        const diffDays = Math.round((startOfTodayMs - logDateMs) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays < 7;
      } else if (periode === 'Bulanan') {
        return logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear();
      }
      return true;
    });

    let cntHadirKartu = 0;
    let cntHadirTanpaKartu = 0;
    let cntTelat = 0;
    let cntSakit = 0;
    let cntIzin = 0;
    let cntAlpha = 0;

    let datesTelat = [];
    let datesSakit = [];
    let datesIzin = [];
    let datesAlpha = [];

    logs.forEach((log) => {
      const st = (log.status || '').toLowerCase();
      const rawDate = log.created_at ? new Date(log.created_at) : new Date();
      const validDate = isNaN(rawDate.getTime()) ? new Date() : rawDate;
      const tgl = validDate.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });

      if (st === 'hadir' || st === 'hadir (tap rfid)') {
        cntHadirKartu++;
      } else if (st.includes('tanpa kartu')) {
        cntHadirTanpaKartu++;
      } else if (st.includes('telat')) {
        cntTelat++;
        datesTelat.push(tgl);
      } else if (st.includes('sakit')) {
        cntSakit++;
        datesSakit.push(tgl);
      } else if (st.includes('izin')) {
        cntIzin++;
        datesIzin.push(tgl);
      } else {
        cntAlpha++;
        datesAlpha.push(tgl);
      }
    });

    if (logs.length === 0 && periode === 'Hari Ini') {
      cntAlpha = 1;
      datesAlpha.push('Hari Ini');
    }

    const totalHadirSemua = cntHadirKartu + cntHadirTanpaKartu;
    const totalLogCount = logs.length || (periode === 'Hari Ini' ? 1 : 0);
    const pct = totalLogCount > 0 ? Math.round((totalHadirSemua / totalLogCount) * 100) : 0;

    return {
      hadirKartu: cntHadirKartu,
      hadirTanpaKartu: cntHadirTanpaKartu,
      telat: cntTelat,
      sakit: cntSakit,
      izin: cntIzin,
      alpha: cntAlpha,
      datesTelatStr: datesTelat.length > 0 ? datesTelat.join('; ') : '-',
      datesSakitStr: datesSakit.length > 0 ? datesSakit.join('; ') : '-',
      datesIzinStr: datesIzin.length > 0 ? datesIzin.join('; ') : '-',
      datesAlphaStr: datesAlpha.length > 0 ? datesAlpha.join('; ') : '-',
      persentase: pct,
      rawLogs: logs
    };
  }, [absensiMap, periode]);

  // Sisa komponen UI/UX tetap sama persis seperti kode asli...
