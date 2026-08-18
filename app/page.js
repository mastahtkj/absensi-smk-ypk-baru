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
const KIRIMI_USER_CODE = process.env.NEXT_PUBLIC_KIRIMI_USER_CODE || '';
const KIRIMI_SECRET_KEY = process.env.NEXT_PUBLIC_KIRIMI_SECRET_KEY || '';
const KIRIMI_DEVICE_ID = process.env.NEXT_PUBLIC_KIRIMI_DEVICE_ID || '';

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

  // --- STATE MODE REGISTRASI / TAP KARTU BARU ---
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

  // FETCH DATA INITIAL
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

  // KIRIM WHATSAPP VIA KIRIMI.ID (CLIENT FALLBACK ONLY)
  const sendWhatsAppNotification = useCallback(async (logData) => {
    try {
      if (!logData || !logData.rfid_uid || logData.wa_sent) return;

      const cleanUid = logData.rfid_uid.toString().trim().toUpperCase();
      let targetPhone = null;
      let targetRole = 'Orang Tua / Wali';

      const { data: checkGuru } = await supabase
        .from('guru')
        .select('id, nama, no_wa')
        .eq('rfid_uid', cleanUid)
        .maybeSingle();

      if (checkGuru && checkGuru.no_wa) {
        targetPhone = checkGuru.no_wa;
        targetRole = 'Guru / Staff';
      } else {
        const { data: siswa } = await supabase
          .from('rfid_cards')
          .select('no_hp_ortu, no_wa')
          .eq('rfid_uid', cleanUid)
          .maybeSingle();

        targetPhone = siswa?.no_hp_ortu || siswa?.no_wa;
        targetRole = 'Orang Tua / Wali';
      }

      if (!targetPhone) return;

      let formattedPhone = targetPhone.toString().replace(/[^0-9]/g, '');
      if (formattedPhone.startsWith('0')) formattedPhone = '62' + formattedPhone.slice(1);
      else if (formattedPhone.startsWith('8')) formattedPhone = '62' + formattedPhone;

      const rawTime = logData.created_at ? new Date(logData.created_at) : new Date();
      const validTime = isNaN(rawTime.getTime()) ? new Date() : rawTime;

      const waktuTap = validTime.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta'
      });

      const pesan = `*PRESENSI DIGITAL SMK YPK MEDAN*\n\n` +
        `Yth. Bapak/Ibu ${targetRole === 'Guru / Staff' ? 'Guru/Staff' : 'Orang Tua/Wali'},\n` +
        `Pemberitahuan presensi kehadiran:\n\n` +
        `👤 *Nama:* ${logData.nama || '-'}\n` +
        `🏫 *Kelas/Jabatan:* ${logData.kelas || '-'}\n` +
        `⏰ *Waktu Tap:* ${waktuTap} WIB\n` +
        `📌 *Status Presensi:* ${logData.status || 'Hadir'}\n\n` +
        `Terima kasih. Pesan ini dikirim otomatis oleh sistem presensi RFID sekolah.`;

      if (KIRIMI_USER_CODE && KIRIMI_SECRET_KEY && KIRIMI_DEVICE_ID) {
        await fetch('https://dash.kirimi.id/api/v2/send-message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Code': KIRIMI_USER_CODE,
            'Secret-Key': KIRIMI_SECRET_KEY,
            'Device-Id': KIRIMI_DEVICE_ID
          },
          body: JSON.stringify({
            user_code: KIRIMI_USER_CODE,
            device_id: KIRIMI_DEVICE_ID,
            secret: KIRIMI_SECRET_KEY,
            phone: formattedPhone,
            message: pesan
          })
        }).catch((err) => console.warn('CORS/Network error Kirimi API Client:', err));

        await supabase.from('absensi').update({ wa_sent: true }).eq('id', logData.id);
      }

      setTimeout(() => {
        if (isMountedRef.current) {
          triggerWaPopup({
            nama: logData.nama || 'Siswa / Guru',
            targetRole: targetRole,
            phone: formattedPhone
          });
        }
      }, 1000);

    } catch (err) {
      console.error('Gagal mengirim WhatsApp via Kirimi.id:', err);
    }
  }, [triggerWaPopup]);

  const realtimeHandlersRef = useRef({
    fetchInitialData,
    triggerRealtimePopup,
    triggerWaPopup,
    sendWhatsAppNotification,
    siswaList
  });

  useEffect(() => {
    realtimeHandlersRef.current = {
      fetchInitialData,
      triggerRealtimePopup,
      triggerWaPopup,
      sendWhatsAppNotification,
      siswaList
    };
  }, [fetchInitialData, triggerRealtimePopup, triggerWaPopup, sendWhatsAppNotification, siswaList]);

  // INITIAL LOAD & REALTIME SUBSCRIPTION
  useEffect(() => {
    fetchInitialData();

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'absensi' },
        async (payload) => {
          const { fetchInitialData: refresh, triggerRealtimePopup: popUp, triggerWaPopup: waPopUp, sendWhatsAppNotification: sendWa } = realtimeHandlersRef.current;
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
            } else {
              sendWa({
                ...newRecord,
                nama: displayName || newRecord.nama,
                kelas: displayKelas || newRecord.kelas
              });
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

  // HANDLER REGISTRASI KARTU BARU (PERBAIKAN PERTAUTAN UID)
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

  // UPDATE STATUS PRESENSI
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

  // LOOKUP REKAP ABSENSI
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
      } else if (periode === '30 Hari') {
        const logDateMs = new Date(logDate.getFullYear(), logDate.getMonth(), logDate.getDate()).getTime();
        const diffDays = Math.round((startOfTodayMs - logDateMs) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays < 30;
      }
      return true;
    });

    let h = 0, t = 0, i = 0, a = 0;
    logs.forEach((l) => {
      const st = l.status || '';
      if (st.includes('Telat')) t++;
      else if (st.includes('Hadir')) h++;
      else if (st.includes('Izin') || st.includes('Sakit')) i++;
      else if (st.includes('Alpha')) a++;
    });

    let todayRecord = null;
    if (cleanTargetUid) todayRecord = todayAbsensiMap.get(cleanTargetUid);
    if (!todayRecord && targetNama) todayRecord = todayAbsensiMap.get(targetNama);

    let status = 'Alpha';
    let jamTap = '-';

    if (todayRecord) {
      status = todayRecord.status || 'Hadir';
      const rawDate = todayRecord.created_at ? new Date(todayRecord.created_at) : null;
      if (rawDate && !isNaN(rawDate.getTime())) {
        jamTap = rawDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      }
    }

    return { status, jamTap, totalHadir: h + t, totalTelat: t, totalIzin: i, totalAlpha: a, logs };
  }, [absensiMap, todayAbsensiMap, periode]);

  // WARNA STRIP KELAS / BADGE
  const getClassBadgeStyle = (kelasStr) => {
    if (!kelasStr) return { backgroundColor: '#e2e8f0', color: '#475569', borderColor: '#cbd5e1' };
    const k = kelasStr.toUpperCase();
    if (k.includes('TJKT')) return { backgroundColor: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe' };
    if (k.includes('AKL')) return { backgroundColor: '#f0fdf4', color: '#15803d', borderColor: '#bbf7d0' };
    if (k.includes('MPLB')) return { backgroundColor: '#faf5ff', color: '#6b21a8', borderColor: '#e9d5ff' };
    if (k.includes('PM')) return { backgroundColor: '#fff7ed', color: '#c2410c', borderColor: '#ffedd5' };
    if (k.includes('MASTER')) return { backgroundColor: '#fefce8', color: '#a16207', borderColor: '#fef08a' };
    return { backgroundColor: '#f3f4f6', color: '#374151', borderColor: '#e5e7eb' };
  };

  // HELPER MENCETAK DOKUMEN REKAP
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const todayStr = new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    let contentHtml = `
      <html>
        <head>
          <title>Laporan Presensi Siswa SMK YPK MEDAN</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #333; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 20px; text-transform: uppercase; }
            .header p { margin: 5px 0 0; font-size: 13px; color: #666; }
            .meta { margin-bottom: 15px; font-size: 12px; display: flex; justify-content: space-between; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
            th, td { border: 1px solid #ccc; padding: 8px 10px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; text-transform: uppercase; }
            .badge { font-weight: bold; padding: 2px 6px; borderRadius: 4px; font-size: 10px; }
            .footer { margin-top: 30px; text-align: right; font-size: 12px; }
            .signature { margin-top: 50px; text-align: right; font-size: 12px; }
            @media print {
              @page { size: A4 portrait; margin: 15mm; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Laporan Presensi Kehadiran SMK YPK MEDAN</h1>
            <p>Sistem Presensi RFID Terintegrasi Realtime</p>
          </div>
          <div class="meta">
            <span><b>Periode:</b> ${periode}</span>
            <span><b>Tingkat:</b> ${filterTingkat} | <b>Jurusan:</b> ${filterJurusan}</span>
            <span><b>Tanggal Cetak:</b> ${todayStr}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 30px; text-align: center;">No</th>
                <th>Nama Lengkap</th>
                <th>Kelas / Jabatan</th>
                <th style="text-align: center;">Status Hari Ini</th>
                <th style="text-align: center;">Jam Tap</th>
                <th style="text-align: center;">Hadir/Telat</th>
                <th style="text-align: center;">Izin</th>
                <th style="text-align: center;">Alpha</th>
              </tr>
            </thead>
            <tbody>
    `;

    filteredSiswa.forEach((siswa, idx) => {
      const recap = getRecapForSiswa(siswa);
      contentHtml += `
        <tr>
          <td style="text-align: center;">${idx + 1}</td>
          <td><b>${siswa.nama || '-'}</b></td>
          <td>${siswa.kelas || '-'}</td>
          <td style="text-align: center;">${recap.status}</td>
          <td style="text-align: center;">${recap.jamTap}</td>
          <td style="text-align: center;">${recap.totalHadir}</td>
          <td style="text-align: center;">${recap.totalIzin}</td>
          <td style="text-align: center;">${recap.totalAlpha}</td>
        </tr>
      `;
    });

    contentHtml += `
            </tbody>
          </table>
          <div class="signature">
            <p>Medan, ${todayStr}</p>
            <p style="margin-top: 60px;"><b><u>Petugas / Petugas Piket</u></b></p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(contentHtml);
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  // --- RENDER SPLASH SCREEN LOADING ---
  if (loading) {
    return (
      <div style={styles.splashContainer}>
        <div style={styles.splashCard}>
          <div style={styles.logoWrapper}>
            <div style={styles.logoCircle}>
              <span style={{ fontSize: '38px' }}>🎓</span>
            </div>
          </div>
          <h2 style={styles.splashTitle}>SMK YPK MEDAN</h2>
          <p style={styles.splashSubtitle}>Sistem Presensi RFID Terintegrasi Realtime</p>
          <div style={styles.progressBarWrapper}>
            <div style={{ ...styles.progressBarFill, width: `${progress}%` }} />
          </div>
          <div style={styles.splashFooterText}>
            <span>Memuat Data Sistem...</span>
            <span style={{ fontWeight: 'bold', color: '#e65100' }}>{Math.round(progress)}%</span>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER FORM LOGIN ---
  if (!isLoggedIn) {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.loginCard}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={styles.loginLogoBg}>
              <span style={{ fontSize: '32px' }}>🏫</span>
            </div>
            <h2 style={styles.loginTitle}>PORTAL PRESENSI</h2>
            <p style={styles.loginSub}>SMK YPK MEDAN</p>
          </div>

          {loginError && (
            <div style={styles.errorAlert}>
              <span>⚠️ {loginError}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={styles.labelInput}>Username Guru / Admin</label>
              <input
                type="text"
                required
                placeholder="Masukkan Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={styles.textInput}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={styles.labelInput}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Masukkan Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={styles.textInput}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={styles.btnToggleShowPass}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div style={styles.rememberRow}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '13px', color: '#555' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ marginRight: '8px', accentColor: '#e65100' }}
                />
                Ingat Saya
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              style={{
                ...styles.btnLoginSubmit,
                opacity: isLoggingIn ? 0.7 : 1,
                cursor: isLoggingIn ? 'not-allowed' : 'pointer'
              }}
            >
              {isLoggingIn ? 'Memproses Access...' : 'MASUK KE SYSTEM ➔'}
            </button>
          </form>

          <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '11px', color: '#888' }}>
            © {new Date().getFullYear()} SMK YPK MEDAN • Integrated RFID Presence
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER MAIN DASHBOARD ---
  return (
    <div style={styles.dashboardPage}>
      {/* HEADER BAR */}
      <header style={styles.headerBar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={styles.headerIconBg}>🎓</div>
          <div>
            <h1 style={styles.headerTitle}>SMK YPK MEDAN</h1>
            <p style={styles.headerSub}>Dashboard Presensi RFID Realtime</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={styles.userInfoBadge}>
            <span style={{ fontSize: '18px' }}>👤</span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b' }}>{currentUser?.nama || 'Pengguna'}</div>
              <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>
                {isRestrictedGuru ? 'Guru (Read Only)' : isMasterIqbal ? 'Master Admin' : currentUser?.role || 'Guru'}
              </div>
            </div>
          </div>

          {!isRestrictedGuru && (
            <button
              onClick={() => {
                setShowRegisterModal(true);
                setIsWaitingTap(true);
                setScannedUid('');
                setSelectedTarget('');
              }}
              style={styles.btnRegisterCard}
            >
              ➕ Tap / Register Kartu Baru
            </button>
          )}

          <button onClick={handleLogout} style={styles.btnLogout}>
            🚪 Keluar
          </button>
        </div>
      </header>

      {/* STATS CARDS */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div>
            <div style={styles.statLabel}>Total Siswa & Staff</div>
            <div style={styles.statVal}>{totalSiswa}</div>
          </div>
          <div style={{ ...styles.statIconBox, backgroundColor: '#eff6ff', color: '#2563eb' }}>👥</div>
        </div>

        <div style={styles.statCard}>
          <div>
            <div style={styles.statLabel}>Hadir Hari Ini</div>
            <div style={{ ...styles.statVal, color: '#16a34a' }}>{totalHadir}</div>
          </div>
          <div style={{ ...styles.statIconBox, backgroundColor: '#f0fdf4', color: '#16a34a' }}>✅</div>
        </div>

        <div style={styles.statCard}>
          <div>
            <div style={styles.statLabel}>Persentase Kehadiran</div>
            <div style={{ ...styles.statVal, color: '#e65100' }}>{persentaseHadir}%</div>
          </div>
          <div style={{ ...styles.statIconBox, backgroundColor: '#fff7ed', color: '#ea580c' }}>📊</div>
        </div>
      </div>

      {/* FILTER CONTROL SECTION */}
      <div style={styles.filterCard}>
        <div style={styles.filterGrid}>
          {/* CARI SISWA */}
          <div>
            <label style={styles.filterLabel}>🔍 Cari Nama / Kelas</label>
            <input
              type="text"
              placeholder="Ketik nama atau kelas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.filterSelect}
            />
          </div>

          {/* PERIODE REKAP */}
          <div>
            <label style={styles.filterLabel}>📅 Periode Laporan</label>
            <select
              value={periode}
              onChange={(e) => setPeriode(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="Hari Ini">Hari Ini</option>
              <option value="7 Hari">7 Hari Terakhir</option>
              <option value="30 Hari">30 Hari Terakhir</option>
            </select>
          </div>

          {/* TINGKAT KELAS */}
          <div>
            <label style={styles.filterLabel}>🎓 Tingkat / Role</label>
            <select
              value={filterTingkat}
              onChange={(e) => setFilterTingkat(e.target.value)}
              style={styles.filterSelect}
            >
              {tingkatOptions.map((opt) => (
                <option key={opt.label} value={opt.label}>
                  {opt.icon} {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* JURUSAN */}
          <div>
            <label style={styles.filterLabel}>🏫 Keahlian / Jurusan</label>
            <select
              value={filterJurusan}
              onChange={(e) => setFilterJurusan(e.target.value)}
              style={styles.filterSelect}
            >
              {jurusanOptions.map((opt) => (
                <option key={opt.label} value={opt.label}>
                  {opt.icon} {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', gap: '10px' }}>
          <button onClick={handlePrint} style={styles.btnPrint}>
            🖨️ Cetak Rekap Laporan
          </button>
        </div>
      </div>

      {/* TABEL DATA SISWA & STAFF */}
      <div style={styles.tableCard}>
        <div style={styles.tableHeaderRow}>
          <h3 style={styles.tableTitle}>
            📋 Daftar Presensi ({filteredSiswa.length} Orang)
          </h3>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            Menampilkan data sesuai filter aktif
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                <th style={{ ...styles.th, textAlign: 'center', width: '50px' }}>No</th>
                <th style={styles.th}>Nama Lengkap</th>
                <th style={styles.th}>Kelas / Jabatan</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>Status Hari Ini</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>Jam Tap</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>Hadir / Telat</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>Izin / Sakit</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>Alpha</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>Aksi / Detail</th>
              </tr>
            </thead>
            <tbody>
              {filteredSiswa.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                    Data siswa atau guru tidak ditemukan.
                  </td>
                </tr>
              ) : (
                filteredSiswa.map((siswa, index) => {
                  const recap = getRecapForSiswa(siswa);
                  const badgeStyle = getClassBadgeStyle(siswa.kelas);

                  return (
                    <tr key={siswa.id || index} style={styles.tdRow}>
                      <td style={{ ...styles.td, textAlign: 'center', color: '#64748b' }}>
                        {index + 1}
                      </td>
                      <td style={styles.td}>
                        <div style={{ fontWeight: 'bold', color: '#1e293b' }}>
                          {siswa.nama || 'Tanpa Nama'}
                        </div>
                        <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
                          UID: {siswa.rfid_uid || 'Belum Registrasi'}
                        </div>
                      </td>
                      <td style={styles.td}>
                        <span style={{ ...styles.badgeClass, ...badgeStyle }}>
                          {siswa.kelas || '-'}
                        </span>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <span
                          style={
                            recap.status.includes('Telat')
                              ? styles.badgeTelat
                              : recap.status.includes('Hadir')
                              ? styles.badgeHadir
                              : recap.status.includes('Izin') || recap.status.includes('Sakit')
                              ? styles.badgeIzin
                              : styles.badgeAlpha
                          }
                        >
                          {recap.status}
                        </span>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center', fontWeight: '500', color: '#334155' }}>
                        {recap.jamTap}
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center', fontWeight: 'bold', color: '#16a34a' }}>
                        {recap.totalHadir}
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center', fontWeight: 'bold', color: '#0284c7' }}>
                        {recap.totalIzin}
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center', fontWeight: 'bold', color: '#dc2626' }}>
                        {recap.totalAlpha}
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button
                            onClick={() => setDetailSiswa({ ...siswa, recap })}
                            style={styles.btnDetailOutline}
                            title="Lihat Riwayat Log"
                          >
                            👁️ Detail
                          </button>
                          {!isRestrictedGuru && (
                            <button
                              onClick={() => handleOpenEditModal(siswa)}
                              style={styles.btnEditOutline}
                              title="Ubah Status / Biodata"
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

      {/* MODAL REGISTRASI KARTU TAP BARU */}
      {showRegisterModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>📇 Registrasi / Tautkan Kartu RFID</h3>
              <button
                onClick={() => {
                  setShowRegisterModal(false);
                  setIsWaitingTap(false);
                }}
                style={styles.btnCloseModal}
              >
                ✖
              </button>
            </div>

            <div style={{ padding: '20px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={styles.labelInput}>Pilih Nama Guru / Siswa Target</label>
                <select
                  value={selectedTarget}
                  onChange={(e) => setSelectedTarget(e.target.value)}
                  style={styles.textInput}
                >
                  <option value="">-- Pilih Nama Pemilik Kartu --</option>
                  {siswaList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nama} ({s.kelas || 'Guru/Staff'})
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.tapBox}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📡</div>
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#334155' }}>
                  {isWaitingTap ? 'Silakan Tap Kartu RFID Ke Reader...' : 'Sistem Siap'}
                </div>
                <p style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                  UID yang terdeteksi otomatis akan muncul di kolom bawah ini secara realtime.
                </p>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={styles.labelInput}>Scanned UID (Auto / Manual)</label>
                <input
                  type="text"
                  placeholder="Contoh: A1B2C3D4"
                  value={scannedUid}
                  onChange={(e) => setScannedUid(e.target.value.toUpperCase())}
                  style={{ ...styles.textInput, fontWeight: 'bold', letterSpacing: '1px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setShowRegisterModal(false);
                    setIsWaitingTap(false);
                  }}
                  style={styles.btnSecondary}
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveRegisterCard}
                  disabled={isUpdating}
                  style={styles.btnPrimary}
                >
                  {isUpdating ? 'Menyimpan...' : '💾 Simpan & Tautkan Kartu'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIT STATUS & BIODATA */}
      {editingSiswa && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>✏️ Update Presensi / Biodata</h3>
              <button onClick={() => setEditingSiswa(null)} style={styles.btnCloseModal}>
                ✖
              </button>
            </div>

            <div style={{ padding: '20px' }}>
              <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e293b' }}>
                  {editingSiswa.nama}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  Kelas / Jabatan: {editingSiswa.kelas || '-'}
                </div>
              </div>

              {/* QUICK UPDATE STATUS HARI INI */}
              <div style={{ marginBottom: '20px' }}>
                <label style={styles.filterLabel}>Ubah Status Presensi Hari Ini:</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                  <button
                    onClick={() => handleUpdateStatus('Hadir')}
                    disabled={isUpdating}
                    style={{ ...styles.btnStatusOpt, backgroundColor: '#f0fdf4', color: '#16a34a', borderColor: '#bbf7d0' }}
                  >
                    ✅ Hadir
                  </button>
                  <button
                    onClick={() => handleUpdateStatus('Hadir (Telat)')}
                    disabled={isUpdating}
                    style={{ ...styles.btnStatusOpt, backgroundColor: '#fff7ed', color: '#c2410c', borderColor: '#ffedd5' }}
                  >
                    ⚠️ Telat
                  </button>
                  <button
                    onClick={() => handleUpdateStatus('Izin')}
                    disabled={isUpdating}
                    style={{ ...styles.btnStatusOpt, backgroundColor: '#f0f9ff', color: '#0284c7', borderColor: '#bae6fd' }}
                  >
                    📩 Izin / Sakit
                  </button>
                  <button
                    onClick={() => handleUpdateStatus('Alpha')}
                    disabled={isUpdating}
                    style={{ ...styles.btnStatusOpt, backgroundColor: '#fef2f2', color: '#dc2626', borderColor: '#fecaca' }}
                  >
                    ❌ Alpha
                  </button>
                </div>
              </div>

              {/* KHUSUS ADMIN MASTER / IQBAL BISA EDIT BIODATA */}
              {(isMasterIqbal || currentUser?.role === 'admin') && (
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#e65100', marginBottom: '10px' }}>
                    👑 Akses Admin: Edit Master Data
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={styles.labelInput}>Nama Lengkap</label>
                    <input
                      type="text"
                      value={editNama}
                      onChange={(e) => setEditNama(e.target.value)}
                      style={styles.textInput}
                    />
                  </div>
                  {!editingSiswa.isGuru && (
                    <div style={{ marginBottom: '10px' }}>
                      <label style={styles.labelInput}>Kelas</label>
                      <input
                        type="text"
                        value={editKelas}
                        onChange={(e) => setEditKelas(e.target.value)}
                        style={styles.textInput}
                      />
                    </div>
                  )}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={styles.labelInput}>UID Kartu RFID</label>
                    <input
                      type="text"
                      value={editRfid}
                      onChange={(e) => setEditRfid(e.target.value)}
                      style={styles.textInput}
                    />
                  </div>
                  <button
                    onClick={handleSaveBiodataAdmin}
                    disabled={isUpdating}
                    style={{ ...styles.btnPrimary, width: '100%' }}
                  >
                    💾 Simpan Perubahan Biodata Master
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETAIL RIWAYAT LOG */}
      {detailSiswa && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalContent, maxWidth: '600px' }}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>📜 Riwayat Presensi Detail</h3>
              <button onClick={() => setDetailSiswa(null)} style={styles.btnCloseModal}>
                ✖
              </button>
            </div>

            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '16px', color: '#1e293b' }}>{detailSiswa.nama}</h4>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Kelas: {detailSiswa.kelas || '-'}</p>
                </div>
                <span style={styles.badgeClass}>Periode: {periode}</span>
              </div>

              <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <table style={{ ...styles.table, fontSize: '12px' }}>
                  <thead>
                    <tr style={styles.thRow}>
                      <th style={styles.th}>Waktu & Tanggal</th>
                      <th style={{ ...styles.th, textAlign: 'center' }}>Status</th>
                      <th style={styles.th}>Diedit Oleh</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailSiswa.recap.logs.length === 0 ? (
                      <tr>
                        <td colSpan={3} style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                          Belum ada riwayat presensi tercatat pada periode ini.
                        </td>
                      </tr>
                    ) : (
                      detailSiswa.recap.logs.map((log) => {
                        const rawDate = log.created_at ? new Date(log.created_at) : null;
                        const dateStr = rawDate && !isNaN(rawDate.getTime())
                          ? rawDate.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
                          : '-';

                        return (
                          <tr key={log.id} style={styles.tdRow}>
                            <td style={styles.td}>{dateStr} WIB</td>
                            <td style={{ ...styles.td, textAlign: 'center' }}>
                              <span style={log.status?.includes('Telat') ? styles.badgeTelat : styles.badgeHadir}>
                                {log.status || 'Hadir'}
                              </span>
                            </td>
                            <td style={{ ...styles.td, color: '#64748b' }}>{log.edited_by || 'Sistem Tap'}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- STYLES OBJECT ---
const styles = {
  splashContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff7ed',
    padding: '20px'
  },
  splashCard: {
    backgroundColor: '#ffffff',
    padding: '40px 30px',
    borderRadius: '20px',
    boxShadow: '0 10px 25px -5px rgba(230, 81, 0, 0.1)',
    textAlign: 'center',
    maxWidth: '400px',
    width: '100%'
  },
  logoWrapper: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '16px'
  },
  logoCircle: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: '#fff7ed',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid #ffedd5'
  },
  splashTitle: {
    fontSize: '22px',
    fontWeight: '800',
    color: '#e65100',
    margin: '0 0 6px 0'
  },
  splashSubtitle: {
    fontSize: '12px',
    color: '#64748b',
    margin: '0 0 24px 0'
  },
  progressBarWrapper: {
    height: '8px',
    backgroundColor: '#ffedd5',
    borderRadius: '10px',
    overflow: 'hidden',
    marginBottom: '12px'
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#e65100',
    transition: 'width 0.2s ease'
  },
  splashFooterText: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#64748b'
  },

  loginContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    padding: '20px'
  },
  loginCard: {
    backgroundColor: '#ffffff',
    padding: '36px 30px',
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
    width: '100%',
    maxWidth: '380px',
    border: '1px solid #f1f5f9'
  },
  loginLogoBg: {
    width: '60px',
    height: '60px',
    backgroundColor: '#fff7ed',
    borderRadius: '14px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '12px'
  },
  loginTitle: {
    fontSize: '18px',
    fontWeight: '800',
    color: '#e65100',
    margin: '0'
  },
  loginSub: {
    fontSize: '12px',
    color: '#64748b',
    margin: '2px 0 0 0',
    fontWeight: '600'
  },
  errorAlert: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    padding: '10px 12px',
    borderRadius: '8px',
    fontSize: '12px',
    marginBottom: '16px',
    border: '1px solid #fecaca'
  },
  labelInput: {
    display: 'block',
    fontSize: '12px',
    fontWeight: '600',
    color: '#334155',
    marginBottom: '6px'
  },
  textInput: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box'
  },
  btnToggleShowPass: {
    position: 'absolute',
    right: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px'
  },
  rememberRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  btnLoginSubmit: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#e65100',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 'bold',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },

  dashboardPage: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    padding: '24px',
    fontFamily: 'Inter, system-ui, sans-serif'
  },
  headerBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: '16px 24px',
    borderRadius: '16px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
    marginBottom: '24px',
    border: '1px solid #f1f5f9'
  },
  headerIconBg: {
    width: '44px',
    height: '44px',
    backgroundColor: '#fff7ed',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px'
  },
  headerTitle: {
    fontSize: '18px',
    fontWeight: '800',
    color: '#e65100',
    margin: 0
  },
  headerSub: {
    fontSize: '12px',
    color: '#64748b',
    margin: 0
  },
  userInfoBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: '#f8fafc',
    padding: '8px 12px',
    borderRadius: '10px',
    border: '1px solid #e2e8f0'
  },
  btnRegisterCard: {
    backgroundColor: '#fff7ed',
    border: '1px solid #ffb74d',
    color: '#e65100',
    padding: '9px 16px',
    borderRadius: '10px',
    fontSize: '12px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  btnLogout: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#dc2626',
    padding: '9px 16px',
    borderRadius: '10px',
    fontSize: '12px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },

  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
    marginBottom: '24px'
  },
  statCard: {
    backgroundColor: '#ffffff',
    padding: '20px',
    borderRadius: '16px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    border: '1px solid #f1f5f9'
  },
  statLabel: {
    fontSize: '12px',
    color: '#64748b',
    fontWeight: '600'
  },
  statVal: {
    fontSize: '24px',
    fontWeight: '800',
    color: '#1e293b',
    marginTop: '4px'
  },
  statIconBox: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px'
  },

  filterCard: {
    backgroundColor: '#ffffff',
    padding: '20px',
    borderRadius: '16px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
    marginBottom: '24px',
    border: '1px solid #f1f5f9'
  },
  filterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px'
  },
  filterLabel: {
    display: 'block',
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#475569',
    marginBottom: '6px'
  },
  filterSelect: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    fontSize: '12px',
    outline: 'none',
    backgroundColor: '#ffffff',
    boxSizing: 'border-box'
  },
  btnPrint: {
    backgroundColor: '#1e293b',
    color: '#ffffff',
    border: 'none',
    padding: '10px 18px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },

  tableCard: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
    border: '1px solid #f1f5f9',
    overflow: 'hidden'
  },
  tableHeaderRow: {
    padding: '20px',
    borderBottom: '1px solid #f1f5f9',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  tableTitle: {
    fontSize: '15px',
    fontWeight: 'bold',
    color: '#1e293b',
    margin: 0
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left'
  },
  thRow: {
    backgroundColor: '#f8fafc',
    borderBottom: '1px solid #e2e8f0'
  },
  th: {
    padding: '12px 16px',
    fontSize: '11px',
    fontWeight: 'bold',
    color: '#475569',
    textTransform: 'uppercase'
  },
  tdRow: {
    borderBottom: '1px solid #f1f5f9',
    transition: 'background-color 0.15s'
  },
  td: {
    padding: '14px 16px',
    fontSize: '12px'
  },

  badgeHadir: {
    backgroundColor: '#f0fdf4',
    color: '#15803d',
    padding: '5px 12px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: 'bold',
    border: '1px solid #bbf7d0',
    display: 'inline-block'
  },
  badgeTelat: {
    backgroundColor: '#fff7ed',
    color: '#c2410c',
    padding: '5px 12px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: 'bold',
    border: '1px solid #ffedd5',
    display: 'inline-block'
  },
  badgeIzin: {
    backgroundColor: '#e3f2fd',
    color: '#1565c0',
    padding: '5px 12px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: 'bold',
    border: '1px solid #90caf9',
    display: 'inline-block'
  },
  badgeAlpha: {
    backgroundColor: '#ffebee',
    color: '#c62828',
    padding: '5px 12px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: 'bold',
    border: '1px solid #ffcdd2',
    display: 'inline-block'
  },
  badgeClass: {
    padding: '4px 10px',
    borderRadius: '8px',
    fontSize: '11px',
    fontWeight: 'bold',
    border: '1px solid'
  },
  btnDetailOutline: {
    backgroundColor: '#ffffff',
    border: '1px solid #ffb74d',
    color: '#e65100',
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '11px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  btnEditOutline: {
    backgroundColor: '#ffffff',
    border: '1px solid #1565c0',
    color: '#1565c0',
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '11px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },

  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px'
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '480px',
    overflow: 'hidden',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
  },
  modalHeader: {
    padding: '16px 20px',
    backgroundColor: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  modalTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#1e293b',
    margin: 0
  },
  btnCloseModal: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#64748b'
  },
  tapBox: {
    backgroundColor: '#fff7ed',
    border: '2px dashed #ffb74d',
    borderRadius: '12px',
    padding: '20px',
    textAlign: 'center',
    marginBottom: '16px'
  },
  btnPrimary: {
    backgroundColor: '#e65100',
    color: '#ffffff',
    border: 'none',
    padding: '10px 18px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  btnSecondary: {
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: 'none',
    padding: '10px 18px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  btnStatusOpt: {
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid',
    fontSize: '12px',
    fontWeight: 'bold',
    cursor: 'pointer'
  }
};
