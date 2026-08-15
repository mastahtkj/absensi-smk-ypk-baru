'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// LIST ID GURU YANG DIBATASI HAK AKSESNYA (READ & PRINT ONLY)
const RESTRICTED_GURU_IDS = [30, 31, 32, 33, 34];

// CREDENTIAL API KIRIMI.ID
const KIRIMI_USER_CODE = 'KMQZ4Y0826';
const KIRIMI_SECRET_KEY = '0a2eae1b7a76fb9709f691fa0ebcff536c86aa1b3247f45eee8ab05e53aae3b1';

export default function Home() {
  // --- STATE SYSTEM & LOGIN ---
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

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

  // STATE NOTIFIKASI POP-UP REALTIME RFID (TOAST)
  const [toastNotif, setToastNotif] = useState(null);
  const [toastFade, setToastFade] = useState(false);

  // Modal State Edit Data & Status
  const [editingSiswa, setEditingSiswa] = useState(null);
  const [editNama, setEditNama] = useState('');
  const [editKelas, setEditKelas] = useState('');
  const [editRfid, setEditRfid] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Modal State Lihat Detail Riwayat Tanggal
  const [detailSiswa, setDetailSiswa] = useState(null);

  // DATA DAFTAR TINGKAT
  const tingkatOptions = [
    { label: 'Semua Tingkat', icon: '🎓' },
    { label: 'Kelas X', icon: '🎒' },
    { label: 'Kelas XI', icon: '📚' },
    { label: 'Kelas XII', icon: '🏆' },
    { label: 'Guru / Staff', icon: '👨‍🏫' },
  ];

  // DATA DAFTAR JURUSAN (DITAMBAHKAN GURU / STAFF)
  const jurusanOptions = [
    { label: 'Semua Jurusan', icon: '🏫' },
    { label: 'Teknik Jaringan Komputer dan Telekomunikasi', icon: '💻' },
    { label: 'Akuntansi dan Keuangan Lembaga', icon: '📊' },
    { label: 'Manajemen Perkantoran dan Layanan Bisnis', icon: '💼' },
    { label: 'Pemasaran', icon: '📢' },
    { label: 'Guru / Staff', icon: '👨‍🏫' },
  ];

  // CEK APAKAH AKUN ADALAH MASTER ADMIN (IQBAL) ATAU RESTRICTED GURU
  const isMasterIqbal = currentUser?.username?.toLowerCase() === 'iqbal' || currentUser?.role === 'admin';
  const isRestrictedGuru = !isMasterIqbal && currentUser && RESTRICTED_GURU_IDS.includes(Number(currentUser.id));

  // TRIGGER NOTIFIKASI POP-UP (3-5 DETIK HILANG PELAN-PELAN)
  const triggerRealtimePopup = (dataLog) => {
    setToastNotif(dataLog);
    setToastFade(false);

    setTimeout(() => {
      setToastFade(true);
    }, 4000);

    setTimeout(() => {
      setToastNotif(null);
    }, 4800);
  };

  // FUNGSI KIRIM NOTIFIKASI WA KHUSUS SISWA KE WA ORANG TUA VIA KIRIMI.ID
  const sendWhatsAppNotification = async (logData) => {
    try {
      if (!logData.rfid_uid) return;

      // 1. Cek apakah ini kartu Guru/Staff. Jika Guru, LEWATI (Jangan Kirim WA)
      const { data: checkGuru } = await supabase
        .from('guru')
        .select('id')
        .eq('rfid_uid', logData.rfid_uid)
        .maybeSingle();

      if (checkGuru || (logData.kelas && logData.kelas.toLowerCase().includes('guru'))) {
        return; // Hentikan fungsi, tidak ada WA yang dikirim untuk Guru/Staff
      }

      // 2. Ambil Data Siswa & Nomor WA Orang Tua dari tabel rfid_cards
      const { data: siswa } = await supabase
        .from('rfid_cards')
        .select('no_hp_ortu, no_wa')
        .eq('rfid_uid', logData.rfid_uid)
        .maybeSingle();

      const noHpOrtu = siswa?.no_hp_ortu || siswa?.no_wa;
      if (!noHpOrtu) return; // Jika nomor HP ortu tidak ditemukan di Supabase, lewati

      // 3. Format Nomor HP ke Format Internasional (628xxx)
      let formattedPhone = noHpOrtu.replace(/[^0-9]/g, '');
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '62' + formattedPhone.slice(1);
      }

      const waktuTap = new Date(logData.created_at || Date.now()).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit'
      });

      // 4. Susun Format Pesan WhatsApp Orang Tua
      const pesan = `*PRESENSI DIGITAL SMK YPK MEDAN*\n\n` +
        `Yth. Bapak/Ibu Orang Tua/Wali,\n` +
        `Pemberitahuan presensi kehadiran putra/putri Anda:\n\n` +
        `👤 *Nama Siswa:* ${logData.nama || '-'}\n` +
        `🏫 *Kelas:* ${logData.kelas || '-'}\n` +
        `⏰ *Waktu Tap:* ${waktuTap} WIB\n` +
        `📌 *Status Presensi:* ${logData.status || 'Hadir'}\n\n` +
        `Terima kasih. Pesan ini dikirim otomatis oleh sistem presensi RFID sekolah.`;

      // 5. Kirim HTTP Request ke API Kirimi.id
      await fetch('https://dash.kirimi.id/api/v2/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Code': KIRIMI_USER_CODE,
          'Secret-Key': KIRIMI_SECRET_KEY
        },
        body: JSON.stringify({
          phone: formattedPhone,
          message: pesan
        })
      });
    } catch (err) {
      console.error('Gagal mengirim WhatsApp via Kirimi.id:', err);
    }
  };

  // 1. INITIAL LOAD & REALTIME
  useEffect(() => {
    const totalDuration = 2500;
    const intervalTime = 100;
    const step = 100 / (totalDuration / intervalTime);

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => setLoading(false), 200);
          return 100;
        }
        return Math.min(prev + step, 100);
      });
    }, intervalTime);

    const savedUser = localStorage.getItem('user_guru');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setCurrentUser(parsed);
        setIsLoggedIn(true);
      } catch (e) {
        localStorage.removeItem('user_guru');
      }
    }

    fetchInitialData();

    // REALTIME LISTENER ABSENSI (POPUPS UI + WA KIRIMI.ID AUTOMATION)
    const channel = supabase
      .channel('absensi-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'absensi' }, (payload) => {
        fetchInitialData();

        // Tampilkan Notifikasi jika ada event baru (INSERT / UPDATE dari Mesin RFID)
        if (payload.new) {
          triggerRealtimePopup({
            nama: payload.new.nama || 'Siswa / Guru',
            kelas: payload.new.kelas || '-',
            status: payload.new.status || 'Hadir',
            waktu: new Date(payload.new.created_at || Date.now()).toLocaleTimeString('id-ID')
          });

          // Otomatis Kirim WhatsApp (Hanya jika event data baru dimasukkan / INSERT)
          if (payload.eventType === 'INSERT') {
            sendWhatsAppNotification(payload.new);
          }
        }
      })
      .subscribe();

    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchInitialData = async () => {
    const { data: cards } = await supabase.from('rfid_cards').select('*');
    const { data: guruData } = await supabase.from('guru').select('*');

    let combinedList = cards ? [...cards] : [];

    if (guruData && guruData.length > 0) {
      const guruFormatted = guruData.map((g) => ({
        id: `GURU-${g.id}`,
        nama: g.nama,
        kelas: 'Guru / Staff',
        rfid_uid: g.rfid_uid || g.uid || `GURU-UID-${g.id}`,
        isGuru: true
      }));
      combinedList = [...combinedList, ...guruFormatted];
    }

    setSiswaList(combinedList);

    const { data: logs } = await supabase.from('absensi').select('*').order('created_at', { ascending: false });
    if (logs) setAbsensiLogs(logs);
  };

  // 2. SUBMIT LOGIN
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
        .single();

      if (error || !guru) {
        setLoginError('Username atau password salah!');
      } else {
        const userData = {
          id: guru.id,
          nama: guru.nama,
          username: guru.username,
          role: (guru.role || 'guru').toLowerCase()
        };
        setCurrentUser(userData);
        setIsLoggedIn(true);
        if (rememberMe) {
          localStorage.setItem('user_guru', JSON.stringify(userData));
        }
      }
    } catch (err) {
      setLoginError('Gagal terhubung ke database.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user_guru');
    setIsLoggedIn(false);
    setCurrentUser(null);
  };

  // 3. EDIT MODAL
  const handleOpenEditModal = (siswa) => {
    if (isRestrictedGuru) {
      alert('Akses Ditolak: Akun Anda hanya memiliki izin untuk melihat dan mencetak laporan.');
      return;
    }
    const validUid = siswa.rfid_uid || siswa.uid || siswa.card_uid || '';
    setEditingSiswa(siswa);
    setEditNama(siswa.nama || '');
    setEditKelas(siswa.kelas || '');
    setEditRfid(validUid);
  };

  // 4. UPDATE STATUS PRESENSI
  const handleUpdateStatus = async (newStatus) => {
    if (isRestrictedGuru) {
      alert('Akses Ditolak: Anda tidak dapat mengedit status presensi.');
      return;
    }

    if (!editingSiswa) return;
    setIsUpdating(true);
    const validUid = editRfid || editingSiswa.rfid_uid || `UID-${editingSiswa.id}`;
    const editorInfo = `${currentUser?.nama || 'Guru'} (${currentUser?.role?.toUpperCase() || 'GURU'})`;

    try {
      const { data: existing } = await supabase
        .from('absensi')
        .select('id')
        .eq('rfid_uid', validUid)
        .limit(1);

      let error = null;

      if (existing && existing.length > 0) {
        const res = await supabase
          .from('absensi')
          .update({ 
            status: newStatus, 
            nama: editNama || editingSiswa.nama,
            kelas: editKelas || editingSiswa.kelas,
            edited_by: editorInfo
          })
          .eq('rfid_uid', validUid);
        error = res.error;
      } else {
        const res = await supabase
          .from('absensi')
          .insert({
            rfid_uid: validUid,
            nama: editNama || editingSiswa.nama,
            kelas: editKelas || editingSiswa.kelas,
            status: newStatus,
            edited_by: editorInfo
          });
        error = res.error;
      }

      if (!error) {
        setEditingSiswa(null);
        await fetchInitialData();
      } else {
        alert('Gagal memperbarui status: ' + error.message);
      }
    } catch (err) {
      alert('Terjadi kesalahan koneksi database.');
    } finally {
      setIsUpdating(false);
    }
  };

  // 5. UPDATE BIODATA ADMIN / MASTER IQBAL
  const handleSaveBiodataAdmin = async () => {
    if (!isMasterIqbal && currentUser?.role !== 'admin') {
      alert('Hanya Administrator yang diperbolehkan mengubah Biodata Siswa/Guru.');
      return;
    }

    setIsUpdating(true);
    try {
      if (editingSiswa?.isGuru) {
        const guruId = editingSiswa.id.replace('GURU-', '');
        const { error: guruErr } = await supabase
          .from('guru')
          .update({
            nama: editNama,
            rfid_uid: editRfid
          })
          .eq('id', guruId);

        if (guruErr) {
          alert('Gagal memperbarui data guru: ' + guruErr.message);
        } else {
          alert('Data Guru berhasil diperbarui!');
          setEditingSiswa(null);
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
          alert('Gagal memperbarui master siswa: ' + cardError.message);
        } else {
          const oldUid = editingSiswa.rfid_uid || editingSiswa.uid;
          if (oldUid) {
            await supabase
              .from('absensi')
              .update({
                nama: editNama,
                kelas: editKelas,
                rfid_uid: editRfid
              })
              .eq('rfid_uid', oldUid);
          }

          alert('Data siswa berhasil diperbarui oleh Admin!');
          setEditingSiswa(null);
          await fetchInitialData();
        }
      }
    } catch (err) {
      alert('Terjadi kesalahan saat menyimpan data.');
    } finally {
      setIsUpdating(false);
    }
  };

  // STATISTIK SISWA & GURU
  const totalSiswa = siswaList.length || 0;
  const totalHadir = absensiLogs.filter((l) => l.status && l.status.includes('Hadir')).length;
  const persentaseHadir = totalSiswa > 0 ? Math.round((totalHadir / totalSiswa) * 100) : 0;

  // FILTER LOGIKA SISWA & GURU (TERMASUK TOMBOL GURU/STAFF DI JURUSAN)
  const filteredSiswa = siswaList
    .filter((s) => {
      const namaMatch = (s.nama || '').toLowerCase().includes(searchQuery.toLowerCase());
      const kelasMatch = (s.kelas || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchSearch = namaMatch || kelasMatch;

      let matchTingkat = true;
      if (filterTingkat === 'Kelas X') {
        matchTingkat = /^\s*X[\s\-]/i.test(s.kelas) || s.kelas === 'X';
      } else if (filterTingkat === 'Kelas XI') {
        matchTingkat = /^\s*XI[\s\-]/i.test(s.kelas) || s.kelas === 'XI';
      } else if (filterTingkat === 'Kelas XII') {
        matchTingkat = /^\s*XII[\s\-]/i.test(s.kelas) || s.kelas === 'XII';
      } else if (filterTingkat === 'Guru / Staff') {
        matchTingkat = s.kelas === 'Guru / Staff' || s.isGuru === true;
      }

      let matchJurusan = true;
      if (filterJurusan !== 'Semua Jurusan') {
        const k = (s.kelas || '').toUpperCase();
        if (filterJurusan === 'Guru / Staff') {
          matchJurusan = s.kelas === 'Guru / Staff' || s.isGuru === true;
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

  // HELPER REKAP
  const getRecapForSiswa = (siswaUid) => {
    const logs = absensiLogs.filter((l) => l.rfid_uid === siswaUid);
    
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
      const tgl = new Date(log.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });

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

    if (logs.length === 0) {
      cntAlpha = 1;
      datesAlpha.push('Hari Ini');
    }

    const totalHadirSemua = cntHadirKartu + cntHadirTanpaKartu;
    const totalLogCount = logs.length || 1;
    const pct = Math.round((totalHadirSemua / totalLogCount) * 100);

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
  };

  // EXPORT EXCEL
  const handleExportExcel = () => {
    if (filteredSiswa.length === 0) {
      alert('Tidak ada data siswa/guru untuk di-export!');
      return;
    }

    let csvData = "\uFEFF";
    csvData += "SEKOLAH MENENGAH KEJURUAN (SMK) YPK MEDAN\n";
    csvData += "Jl. Sisingamangaraja No. 33, Kota Medan, Sumatera Utara | Telp: (061) 123456 | Email: info@smkypkmedan.sch.id\n";
    csvData += `LAPORAN REKAPITULASI DETAIL PRESENSI SISWA & GURU/STAFF - PERIODE: ${periode.toUpperCase()}\n`;
    csvData += `Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}\n\n`;

    csvData += "NO,NAMA LENGKAP,KELAS / JURUSAN / JABATAN,RFID UID,TOTAL HADIR (KARTU),TOTAL HADIR (NO KARTU),TOTAL TELAT,TOTAL SAKIT,TOTAL IZIN,TOTAL ALPHA,RINCIAN TANGGAL TELAT,RINCIAN TANGGAL SAKIT,RINCIAN TANGGAL IZIN,RINCIAN TANGGAL ALPHA,PERSENTASE KEHADIRAN (%)\n";

    filteredSiswa.forEach((siswa, index) => {
      const siswaUid = siswa.rfid_uid || siswa.uid || siswa.card_uid || `UID-${siswa.id}`;
      const recap = getRecapForSiswa(siswaUid);

      const row = [
        index + 1,
        `"${siswa.nama || ''}"`,
        `"${siswa.kelas || ''}"`,
        `"${siswaUid}"`,
        recap.hadirKartu,
        recap.hadirTanpaKartu,
        recap.telat,
        recap.sakit,
        recap.izin,
        recap.alpha,
        `"${recap.datesTelatStr}"`,
        `"${recap.datesSakitStr}"`,
        `"${recap.datesIzinStr}"`,
        `"${recap.datesAlphaStr}"`,
        `"${recap.persentase}%"`
      ].join(",");

      csvData += row + "\n";
    });

    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Laporan_Absensi_SMK_YPK_${new Date().toLocaleDateString('id-ID').replace(/\//g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  // LOGIKA KELAS URGENT
  const classStats = Object.values(
    siswaList
      .filter((s) => !s.isGuru && s.kelas !== 'Guru / Staff')
      .reduce((acc, siswa) => {
        const kelas = siswa.kelas || 'Tanpa Kelas';
        if (!acc[kelas]) {
          acc[kelas] = { kelas, totalSiswa: 0, hadir: 0, alpha: 0, telat: 0, sakitIzin: 0 };
        }
        acc[kelas].totalSiswa += 1;

        const siswaUid = siswa.rfid_uid || siswa.uid || siswa.card_uid || `UID-${siswa.id}`;
        const log = absensiLogs.find((l) => l.rfid_uid === siswaUid);
        const status = (log?.status || 'Alpha').toLowerCase();

        if (status.includes('hadir')) {
          acc[kelas].hadir += 1;
        } else if (status.includes('telat')) {
          acc[kelas].telat += 1;
        } else if (status.includes('sakit') || status.includes('izin')) {
          acc[kelas].sakitIzin += 1;
        } else {
          acc[kelas].alpha += 1;
        }

        return acc;
      }, {})
  ).map((item) => {
    const pctHadir = item.totalSiswa > 0 ? Math.round((item.hadir / item.totalSiswa) * 100) : 0;
    return { ...item, pctHadir };
  });

  const urgentClasses = classStats
    .sort((a, b) => a.pctHadir - b.pctHadir || (b.alpha + b.telat) - (a.alpha + a.telat))
    .slice(0, 5);

  // SPLASH SCREEN
  if (loading) {
    return (
      <div style={styles.loginBg}>
        <div style={styles.overlay}>
          <div style={{ ...styles.splashCard, position: 'relative' }}>
            <div style={styles.systemOnlineBadge}>
              <span style={styles.greenDot}>●</span> SYSTEM ONLINE
            </div>

            <img
              src="/logo.png"
              onError={(e) => {
                e.target.src = 'https://upload.wikimedia.org/wikipedia/commons/2/27/Logo_SMK_YPK_Medan.png';
              }}
              alt="Logo SMK YPK Medan"
              style={{ width: '90px', margin: '15px auto 15px auto', display: 'block' }}
            />
            <span style={styles.orangeBadge}>SERVER ABSENSI DIGITAL</span>
            <h2 style={{ color: '#333', margin: '10px 0 5px 0', fontSize: '22px', fontWeight: 'bold' }}>
              SMK YPK MEDAN
            </h2>
            <p style={{ color: '#666', fontSize: '12px', margin: '0 0 20px 0' }}>
              Menghubungkan Server Presensi RFID Real-Time...
            </p>

            <div style={styles.progressTrack}>
              <div style={{ ...styles.progressBar, width: `${Math.round(progress)}%` }}></div>
            </div>

            <div style={{ textAlign: 'center', fontSize: '12px', color: '#666', marginTop: '10px', fontWeight: 'bold' }}>
              Proses Inisialisasi {Math.round(progress)}%
            </div>

            <div style={{ marginTop: '25px', paddingTop: '15px', borderTop: '1px solid #ffe0b2', fontSize: '12px', color: '#e65100', fontWeight: 'bold', letterSpacing: '1px' }}>
              Dibuat Oleh : TJKT Projects
            </div>
          </div>
        </div>
      </div>
    );
  }

  // LOGIN PORTAL BARU
  if (!isLoggedIn) {
    return (
      <div style={styles.loginBg}>
        <div style={styles.overlay}>
          <div style={styles.portalCard}>
            
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
              <img 
                src="/logo.png"
                onError={(e) => {
                  e.target.src = 'https://upload.wikimedia.org/wikipedia/commons/2/27/Logo_SMK_YPK_Medan.png';
                }}
                alt="Logo SMK YPK MEDAN" 
                style={{ width: '80px', height: '80px', objectFit: 'contain' }}
              />
            </div>

            <h2 style={{ textAlign: 'center', color: '#e65100', margin: '0 0 4px 0', fontSize: '20px', fontWeight: '800', letterSpacing: '0.5px' }}>
              PORTAL PRESENSI DIGITAL
            </h2>
            <p style={{ textAlign: 'center', color: '#666', fontSize: '12px', margin: '0 0 24px 0' }}>
              Silakan login untuk mengakses portal SMK YPK MEDAN
            </p>

            {loginError && <div style={styles.errorAlert}>{loginError}</div>}

            <form onSubmit={handleLoginSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={styles.fieldLabel}>
                  Username:
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username"
                  style={styles.inputStyle}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={styles.fieldLabel}>
                  Password:
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{ ...styles.inputStyle, paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#9E9E9E',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {showPassword ? (
                      <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    ) : (
                      <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a10.02 10.02 0 013.97-.863c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21M3 3l18 18" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#e65100', cursor: 'pointer' }}
                />
                <label htmlFor="remember" style={{ fontSize: '12px', color: '#555', cursor: 'pointer', userSelect: 'none' }}>
                  Ingat Saya di Perangkat Ini
                </label>
              </div>

              <button 
                type="submit" 
                disabled={isLoggingIn} 
                style={styles.btnOrange}
              >
                {isLoggingIn ? 'MEMPROSES...' : 'MASUK KE DASHBOARD →'}
              </button>

              <div style={{ paddingTop: '16px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '11px', fontWeight: 'bold', color: '#9E9E9E', letterSpacing: '1px', textTransform: 'uppercase' }}>
                  TJKT PROJECT'S
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // MAIN DASHBOARD
  return (
    <div style={styles.dashboardBg}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background-color: #ffffff !important; color: #000000 !important; }
          main { padding: 0 !important; max-width: 100% !important; }
          table { border-collapse: collapse !important; width: 100% !important; }
          th, td { border: 1px solid #333 !important; padding: 6px 8px !important; font-size: 10px !important; }
        }
        @media screen {
          .print-only { display: none !important; }
        }

        .pill-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 30px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 1px solid #ffe0b2;
          background-color: #ffffff;
          color: #d84315;
          box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }

        .pill-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 10px rgba(230,81,0,0.12);
          border-color: #ffb74d;
        }

        .pill-btn.active {
          background: linear-gradient(135deg, #e65100 0%, #f57c00 100%);
          color: #ffffff;
          border: none;
          box-shadow: 0 4px 12px rgba(230,81,0,0.25);
        }

        .stat-card {
          background: #ffffff;
          border-radius: 16px;
          padding: 20px;
          border: 1px solid #ffe0b2;
          box-shadow: 0 4px 15px rgba(230,81,0,0.04);
        }

        .btn-status-option {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 12px;
          border-radius: 10px;
          font-weight: bold;
          font-size: 12px;
          cursor: pointer;
          border: none;
          transition: transform 0.15s ease, filter 0.15s ease;
          color: #ffffff;
        }

        .btn-status-option:hover {
          transform: scale(1.02);
          filter: brightness(1.05);
        }

        /* ANIMASI POP-UP / TOAST REALTIME */
        .toast-popup {
          position: fixed;
          top: 25px;
          right: 25px;
          z-index: 99999;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-left: 6px solid #2ecc71;
          border-radius: 14px;
          padding: 16px 20px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18);
          display: flex;
          align-items: center;
          gap: 15px;
          min-width: 310px;
          transition: opacity 0.8s ease, transform 0.8s ease;
        }

        .toast-popup.show {
          opacity: 1;
          transform: translateY(0);
        }

        .toast-popup.fade-out {
          opacity: 0;
          transform: translateY(-20px);
        }
      `}</style>

      {/* FLOATING TOAST POPUP ABSENSI RFID (NOTIFIKASI 3-5 DETIK) */}
      {toastNotif && (
        <div className={`toast-popup ${toastFade ? 'fade-out' : 'show'}`}>
          <div style={{ fontSize: '30px', animation: 'bounce 1s infinite' }}>🔔</div>
          <div>
            <div style={{ fontSize: '11px', color: '#2ecc71', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              ⚡ TAP RFID TERDETEKSI ({toastNotif.waktu})
            </div>
            <h4 style={{ margin: '2px 0 0 0', color: '#333', fontSize: '15px', fontWeight: 'bold' }}>
              {toastNotif.nama}
            </h4>
            <p style={{ margin: '2px 0 0 0', color: '#666', fontSize: '12px' }}>
              {toastNotif.kelas} • <span style={{ color: '#2e7d32', fontWeight: 'bold' }}>{toastNotif.status}</span>
            </p>
          </div>
        </div>
      )}

      {/* KOP SURAT PRINT PDF */}
      <div className="print-only" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', paddingBottom: '10px' }}>
          <img
            src="/logo.png"
            onError={(e) => {
              e.target.src = 'https://upload.wikimedia.org/wikipedia/commons/2/27/Logo_SMK_YPK_Medan.png';
            }}
            alt="Logo SMK YPK Medan"
            style={{ width: '75px', height: '75px', objectFit: 'contain' }}
          />
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase' }}>
              YAYASAN PENDIDIKAN KEBANGSAAN
            </h3>
            <h1 style={{ margin: '3px 0', fontSize: '22px', fontWeight: '800', letterSpacing: '1.5px' }}>
              SMK YPK MEDAN
            </h1>
            <p style={{ margin: 0, fontSize: '10px', color: '#222', lineHeight: '1.4' }}>
              Jl. Sisingamangaraja No. 33, Medan, Sumatera Utara • Telp: (061) 123456
              <br />
              Website: smkypkmedan.sch.id | Email: info@smkypkmedan.sch.id
            </p>
          </div>
        </div>

        <div style={{ borderBottom: '3px solid #000', marginBottom: '2px' }}></div>
        <div style={{ borderBottom: '1px solid #000', marginBottom: '15px' }}></div>

        <div style={{ textAlign: 'center', marginTop: '10px' }}>
          <h2 style={{ margin: 0, fontSize: '13px', fontWeight: 'bold', textDecoration: 'underline', textTransform: 'uppercase' }}>
            LAPORAN REKAPITULASI DETAIL PRESENSI SISWA & GURU
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '10px', fontWeight: 'bold' }}>
            PERIODE: {periode.toUpperCase()} • TANGGAL CETAK: {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      <header style={styles.headerNav} className="no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <img
            src="/logo.png"
            onError={(e) => {
              e.target.src = 'https://upload.wikimedia.org/wikipedia/commons/2/27/Logo_SMK_YPK_Medan.png';
            }}
            alt="Logo SMK YPK Medan"
            style={{ width: '48px', height: '48px', objectFit: 'contain' }}
          />
          <div>
            <h1 style={{ margin: 0, fontSize: '18px', color: '#e65100', fontWeight: 'bold' }}>
              DASHBOARD ABSENSI REAL-TIME
            </h1>
            <p style={{ margin: 0, fontSize: '11px', color: '#666', fontWeight: '600' }}>
              SMK YPK MEDAN • Integrated IoT RFID Server
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ textAlign: 'right' }}>
            <b style={{ display: 'block', fontSize: '14px', color: '#333' }}>
              {currentUser?.nama || 'Bpk/Ibu Guru'} (ID: {currentUser?.id})
            </b>
            <span style={{ fontSize: '11px', color: isMasterIqbal ? '#2e7d32' : isRestrictedGuru ? '#c62828' : '#e65100', fontWeight: 'bold', textTransform: 'uppercase' }}>
              {isMasterIqbal 
                ? '👑 MASTER ADMIN (IQBAL / FULL TESTING CONTROL)' 
                : isRestrictedGuru 
                  ? '🔒 GURU PENINJAU (VIEW & PRINT ONLY)' 
                  : '👨‍🏫 GURU PENGAJAR (IZIN EDIT PRESENSI)'}
            </span>
          </div>
          <button onClick={handleLogout} style={styles.btnLogoutOutlined}>
            Keluar 🚪
          </button>
        </div>
      </header>

      <main style={{ padding: '25px 30px', maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* STATS CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '25px' }} className="no-print">
          <div className="stat-card" style={{ borderLeft: '6px solid #e65100', display: 'flex', alignItems: 'center', gap: '18px' }}>
            <div style={styles.iconCircle}>🎓</div>
            <div>
              <h1 style={{ margin: 0, fontSize: '32px', color: '#222', fontWeight: '800' }}>{totalSiswa}</h1>
              <p style={{ margin: 0, fontSize: '12px', color: '#777', fontWeight: 'bold' }}>Total Terdaftar (Siswa & Guru)</p>
            </div>
          </div>

          <div className="stat-card" style={{ borderLeft: '6px solid #2ecc71', display: 'flex', alignItems: 'center', gap: '18px' }}>
            <div style={{ ...styles.iconCircle, backgroundColor: '#e8f5e9', color: '#2ecc71' }}>✅</div>
            <div>
              <h1 style={{ margin: 0, fontSize: '32px', color: '#222', fontWeight: '800' }}>{totalHadir}</h1>
              <p style={{ margin: 0, fontSize: '12px', color: '#777', fontWeight: 'bold' }}>Hadir Tepat Waktu</p>
            </div>
          </div>

          <div className="stat-card" style={{ borderLeft: '6px solid #ff9800', display: 'flex', alignItems: 'center', gap: '18px' }}>
            <div style={{ ...styles.iconCircle, backgroundColor: '#fff3e0', color: '#e65100' }}>📈</div>
            <div>
              <h1 style={{ margin: 0, fontSize: '32px', color: '#222', fontWeight: '800' }}>{persentaseHadir}%</h1>
              <p style={{ margin: 0, fontSize: '12px', color: '#777', fontWeight: 'bold' }}>Persentase Kehadiran Total</p>
            </div>
          </div>
        </div>

        {/* MONITORING KELAS URGENT (KHUSUS ADMIN / MASTER) */}
        {(currentUser?.role === 'admin' || isMasterIqbal) && (
          <div style={{ ...styles.cardBox, marginBottom: '25px', backgroundColor: '#ffffff' }} className="no-print">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ margin: 0, color: '#c62828', fontSize: '16px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🚨</span> MONITORING KELAS URGENT (KHUSUS ADMIN)
                </h3>
                <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#666' }}>
                  Daftar kelas dengan tingkat kehadiran terendah hari ini untuk penanganan cepat
                </p>
              </div>
              <span style={{ fontSize: '11px', backgroundColor: '#ffebee', color: '#c62828', padding: '6px 14px', borderRadius: '20px', fontWeight: 'bold', border: '1px solid #ffcdd2' }}>
                ⚠️ PERHATIAN KHUSUS ADMIN
              </span>
            </div>

            {urgentClasses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#888', fontSize: '13px' }}>
                Belum ada data kelas yang dapat dianalisis.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {urgentClasses.map((item) => {
                  let alertBadge = { label: '🟡 WASPADA', color: '#f57c00', bg: '#fff3e0', border: '#ffe0b2' };
                  if (item.pctHadir < 60 || item.alpha >= 3) {
                    alertBadge = { label: '🚨 KRITIS', color: '#c62828', bg: '#ffebee', border: '#ffcdd2' };
                  } else if (item.pctHadir < 80) {
                    alertBadge = { label: '⚠️ PERHATIAN', color: '#e65100', bg: '#fff3e0', border: '#ffcc80' };
                  }

                  return (
                    <div key={item.kelas} style={{ border: `1px solid ${alertBadge.border}`, borderRadius: '12px', padding: '14px 18px', backgroundColor: '#fafafa' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#333' }}>
                            🏫 {item.kelas}
                          </span>
                          <span style={{ fontSize: '10px', backgroundColor: alertBadge.bg, color: alertBadge.color, padding: '3px 8px', borderRadius: '6px', fontWeight: 'bold', border: `1px solid ${alertBadge.border}` }}>
                            {alertBadge.label}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: 'bold', color: alertBadge.color }}>
                          Kehadiran: {item.pctHadir}% ({item.hadir}/{item.totalSiswa} Siswa)
                        </div>
                      </div>

                      <div style={{ backgroundColor: '#e0e0e0', height: '8px', borderRadius: '4px', overflow: 'hidden', marginBottom: '10px' }}>
                        <div style={{ backgroundColor: alertBadge.color, height: '100%', width: `${item.pctHadir}%`, transition: 'width 0.3s ease' }}></div>
                      </div>

                      <div style={{ display: 'flex', gap: '15px', fontSize: '11px', color: '#555' }}>
                        <span>🔴 <b>Alpha:</b> {item.alpha} siswa</span>
                        <span>⏰ <b>Telat:</b> {item.telat} siswa</span>
                        <span>🟡 <b>Sakit/Izin:</b> {item.sakitIzin} siswa</span>
                        <span style={{ marginLeft: 'auto', color: '#2e7d32' }}>🟢 <b>Hadir:</b> {item.hadir} siswa</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* FILTER BAR */}
        <div style={{ ...styles.cardBox, marginBottom: '25px', backgroundColor: '#ffffff' }} className="no-print">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1px solid #fff3e0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#e65100', display: 'flex', alignItems: 'center', gap: '5px' }}>
                📅 PERIODE REKAP:
              </span>
              {['Hari Ini', '7 Hari', 'Bulanan'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriode(p)}
                  className={`pill-btn ${periode === p ? 'active' : ''}`}
                >
                  {p}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleExportExcel} style={styles.btnGreenExport}>
                📊 Export Excel (.csv) Kop + Tanggal
              </button>
              <button onClick={handlePrintPDF} style={styles.btnBluePdf}>
                📄 Cetak PDF Laporan
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#e65100', width: '90px', flexShrink: 0 }}>
              🎯 TINGKAT:
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {tingkatOptions.map((t) => (
                <button
                  key={t.label}
                  onClick={() => setFilterTingkat(t.label)}
                  className={`pill-btn ${filterTingkat === t.label ? 'active' : ''}`}
                >
                  <span style={{ fontSize: '14px' }}>{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#e65100', width: '90px', flexShrink: 0, marginTop: '8px' }}>
              🏛️ JURUSAN:
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {jurusanOptions.map((j) => (
                <button
                  key={j.label}
                  onClick={() => setFilterJurusan(j.label)}
                  className={`pill-btn ${filterJurusan === j.label ? 'active' : ''}`}
                >
                  <span style={{ fontSize: '15px' }}>{j.icon}</span>
                  <span>{j.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* INPUT SEARCH */}
        <div style={{ marginBottom: '20px' }} className="no-print">
          <input
            type="text"
            placeholder="🔍 Cari nama siswa/guru (Terurut A-Z) atau kelas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchBar}
          />
        </div>

        {/* TABEL MONITORING DATA SISWA & GURU */}
        <div style={{ ...styles.cardBox, overflowX: 'auto' }} className="no-print">
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1000px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ffe0b2', backgroundColor: '#fffcf7' }}>
                <th style={{ ...styles.thCol, width: '18%' }}>STATUS HARI INI</th>
                <th style={{ ...styles.thCol, width: '14%' }}>WAKTU TAP</th>
                <th style={{ ...styles.thCol, width: '18%' }}>NAMA LENGKAP (A-Z)</th>
                <th style={{ ...styles.thCol, width: '10%' }}>KELAS / JABATAN</th>
                <th style={{ ...styles.thCol, width: '10%' }}>RFID UID</th>
                <th style={{ ...styles.thCol, width: '15%' }}>PENGUBAH STATUS (AUDIT)</th>
                <th style={{ ...styles.thCol, width: '15%', textAlign: 'center' }}>AKSI & RINCIAN TANGGAL</th>
              </tr>
            </thead>
            <tbody>
              {filteredSiswa.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '35px', color: '#888' }}>
                    <div style={{ fontSize: '30px', marginBottom: '8px' }}>🔍</div>
                    <b>Tidak ada data ditemukan untuk filter ini.</b>
                  </td>
                </tr>
              ) : (
                filteredSiswa.map((siswa) => {
                  const siswaUid = siswa.rfid_uid || siswa.uid || siswa.card_uid || `UID-${siswa.id}`;
                  const log = absensiLogs.find((l) => l.rfid_uid === siswaUid);
                  const status = log?.status || 'Alpha';
                  const editedBy = log?.edited_by;

                  return (
                    <tr key={siswa.id} style={{ borderBottom: '1px solid #fff3e0' }}>
                      <td style={styles.tdCol}>
                        {status === 'Hadir' || status === 'Hadir (Tap RFID)' ? (
                          <span style={styles.badgeHadir}>🟢 HADIR (KARTU)</span>
                        ) : status === 'Hadir (Tanpa Kartu)' ? (
                          <span style={styles.badgeHadir}>🟢 HADIR (NO CARD)</span>
                        ) : status === 'Telat' ? (
                          <span style={styles.badgeTelat}>⏰ TELAT</span>
                        ) : status === 'Sakit' ? (
                          <span style={styles.badgeSakit}>🟡 SAKIT</span>
                        ) : status === 'Izin' ? (
                          <span style={styles.badgeIzin}>🔵 IZIN</span>
                        ) : (
                          <span style={styles.badgeAlpha}>🔴 BELUM TAP / ALPHA</span>
                        )}
                      </td>
                      <td style={{ ...styles.tdCol, color: '#666', fontSize: '12px' }}>
                        {log ? new Date(log.created_at).toLocaleString('id-ID') : 'Belum Melakukan Tap'}
                      </td>
                      <td style={{ ...styles.tdCol, fontWeight: 'bold' }}>{siswa.nama}</td>
                      <td style={styles.tdCol}>
                        <span style={{
                          ...styles.badgeClass,
                          backgroundColor: siswa.isGuru ? '#e3f2fd' : '#fffdfa',
                          color: siswa.isGuru ? '#1565c0' : '#e65100',
                          borderColor: siswa.isGuru ? '#90caf9' : '#ffe0b2'
                        }}>
                          {siswa.kelas || 'X TJKT'}
                        </span>
                      </td>
                      <td style={{ ...styles.tdCol, color: '#1565c0', fontFamily: 'monospace', fontWeight: 'bold' }}>
                        {siswaUid}
                      </td>
                      <td style={styles.tdCol}>
                        {editedBy ? (
                          <span style={{ fontSize: '11px', color: '#d32f2f', backgroundColor: '#ffebee', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold', border: '1px solid #ffcdd2', display: 'inline-block' }}>
                            👤 {editedBy}
                          </span>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#2e7d32', backgroundColor: '#e8f5e9', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold', border: '1px solid #a5d6a7', display: 'inline-block' }}>
                            🤖 Mesin RFID
                          </span>
                        )}
                      </td>
                      <td style={{ ...styles.tdCol, textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                          <button
                            onClick={() => setDetailSiswa(siswa)}
                            style={styles.btnDetailOutline}
                            title="Lihat daftar tanggal Alpha, Sakit, Izin, Telat"
                          >
                            👁️ Riwayat Tanggal
                          </button>

                          {!isRestrictedGuru ? (
                            <button
                              onClick={() => handleOpenEditModal(siswa)}
                              style={styles.btnEditOutline}
                            >
                              ✏️ Edit Status
                            </button>
                          ) : (
                            <span style={{ fontSize: '11px', color: '#888', backgroundColor: '#f5f5f5', padding: '6px 10px', borderRadius: '8px', border: '1px solid #ddd', cursor: 'not-allowed' }}>
                              🔒 Akses Dibatasi
                            </span>
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

        {/* TABEL REKAP CETAK PDF */}
        <div className="print-only">
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f2f2f2' }}>
                <th style={{ padding: '6px', border: '1px solid #000' }}>NO</th>
                <th style={{ padding: '6px', border: '1px solid #000' }}>NAMA LENGKAP</th>
                <th style={{ padding: '6px', border: '1px solid #000' }}>KELAS / JABATAN</th>
                <th style={{ padding: '6px', border: '1px solid #000' }}>HADIR</th>
                <th style={{ padding: '6px', border: '1px solid #000' }}>TELAT</th>
                <th style={{ padding: '6px', border: '1px solid #000' }}>SAKIT</th>
                <th style={{ padding: '6px', border: '1px solid #000' }}>IZIN</th>
                <th style={{ padding: '6px', border: '1px solid #000' }}>ALPHA</th>
                <th style={{ padding: '6px', border: '1px solid #000' }}>RINCIAN TANGGAL KETERANGAN</th>
                <th style={{ padding: '6px', border: '1px solid #000' }}>KEHADIRAN</th>
              </tr>
            </thead>
            <tbody>
              {filteredSiswa.map((siswa, index) => {
                const siswaUid = siswa.rfid_uid || siswa.uid || siswa.card_uid || `UID-${siswa.id}`;
                const recap = getRecapForSiswa(siswaUid);

                return (
                  <tr key={siswa.id}>
                    <td style={{ textAlign: 'center', padding: '5px', border: '1px solid #000' }}>{index + 1}</td>
                    <td style={{ padding: '5px', border: '1px solid #000', fontWeight: 'bold' }}>{siswa.nama}</td>
                    <td style={{ padding: '5px', border: '1px solid #000' }}>{siswa.kelas}</td>
                    <td style={{ textAlign: 'center', padding: '5px', border: '1px solid #000' }}>{recap.hadirKartu + recap.hadirTanpaKartu}</td>
                    <td style={{ textAlign: 'center', padding: '5px', border: '1px solid #000' }}>{recap.telat}</td>
                    <td style={{ textAlign: 'center', padding: '5px', border: '1px solid #000' }}>{recap.sakit}</td>
                    <td style={{ textAlign: 'center', padding: '5px', border: '1px solid #000' }}>{recap.izin}</td>
                    <td style={{ textAlign: 'center', padding: '5px', border: '1px solid #000', color: recap.alpha > 0 ? 'red' : 'black' }}>{recap.alpha}</td>
                    <td style={{ padding: '5px', border: '1px solid #000', fontSize: '9px' }}>
                      {recap.datesAlphaStr !== '-' && <div><b>Alpha:</b> {recap.datesAlphaStr}</div>}
                      {recap.datesSakitStr !== '-' && <div><b>Sakit:</b> {recap.datesSakitStr}</div>}
                      {recap.datesIzinStr !== '-' && <div><b>Izin:</b> {recap.datesIzinStr}</div>}
                      {recap.datesTelatStr !== '-' && <div><b>Telat:</b> {recap.datesTelatStr}</div>}
                      {recap.datesAlphaStr === '-' && recap.datesSakitStr === '-' && recap.datesIzinStr === '-' && recap.datesTelatStr === '-' && '-'}
                    </td>
                    <td style={{ textAlign: 'center', padding: '5px', border: '1px solid #000', fontWeight: 'bold' }}>{recap.persentase}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div style={{ marginTop: '35px', display: 'flex', justifyContent: 'space-between', padding: '0 30px', pageBreakInside: 'avoid' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '11px' }}>Mengetahui,</p>
              <p style={{ margin: '2px 0 0 0', fontSize: '11px', fontWeight: 'bold' }}>Kepala Sekolah SMK YPK Medan</p>
              <div style={{ height: '60px' }}></div>
              <p style={{ margin: 0, fontSize: '11px', fontWeight: 'bold', textDecoration: 'underline' }}>
                Hartati Patiwael, S.Si
              </p>
            </div>

            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '11px' }}>
                Medan, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <p style={{ margin: '2px 0 0 0', fontSize: '11px', fontWeight: 'bold' }}>Guru Piket / Admin</p>
              <div style={{ height: '60px' }}></div>
              <p style={{ margin: 0, fontSize: '11px', fontWeight: 'bold', textDecoration: 'underline' }}>
                {currentUser?.nama || '................................'}
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* MODAL DETAIL RIWAYAT TANGGAL */}
      {detailSiswa && (
        <div style={styles.modalOverlay} className="no-print">
          <div style={{ ...styles.modalContent, width: '480px', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #ffe0b2', paddingBottom: '10px', marginBottom: '15px' }}>
              <div>
                <h3 style={{ margin: 0, color: '#e65100', fontSize: '16px', fontWeight: 'bold' }}>
                  📅 Riwayat Tanggal Absensi
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '13px', fontWeight: 'bold', color: '#333' }}>
                  {detailSiswa.nama} ({detailSiswa.kelas})
                </p>
              </div>
              <button onClick={() => setDetailSiswa(null)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}>✖</button>
            </div>

            {(() => {
              const siswaUid = detailSiswa.rfid_uid || detailSiswa.uid || detailSiswa.card_uid || `UID-${detailSiswa.id}`;
              const recap = getRecapForSiswa(siswaUid);

              return (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '15px', textAlign: 'center' }}>
                    <div style={{ backgroundColor: '#ffebee', padding: '8px', borderRadius: '8px', border: '1px solid #ffcdd2' }}>
                      <span style={{ fontSize: '10px', color: '#c62828', fontWeight: 'bold', display: 'block' }}>ALPHA</span>
                      <b style={{ fontSize: '16px', color: '#c62828' }}>{recap.alpha}</b>
                    </div>
                    <div style={{ backgroundColor: '#fffde7', padding: '8px', borderRadius: '8px', border: '1px solid #fff59d' }}>
                      <span style={{ fontSize: '10px', color: '#fbc02d', fontWeight: 'bold', display: 'block' }}>SAKIT</span>
                      <b style={{ fontSize: '16px', color: '#fbc02d' }}>{recap.sakit}</b>
                    </div>
                    <div style={{ backgroundColor: '#e3f2fd', padding: '8px', borderRadius: '8px', border: '1px solid #90caf9' }}>
                      <span style={{ fontSize: '10px', color: '#1565c0', fontWeight: 'bold', display: 'block' }}>IZIN</span>
                      <b style={{ fontSize: '16px', color: '#1565c0' }}>{recap.izin}</b>
                    </div>
                    <div style={{ backgroundColor: '#fff8e1', padding: '8px', borderRadius: '8px', border: '1px solid #ffe082' }}>
                      <span style={{ fontSize: '10px', color: '#f57f17', fontWeight: 'bold', display: 'block' }}>TELAT</span>
                      <b style={{ fontSize: '16px', color: '#f57f17' }}>{recap.telat}</b>
                    </div>
                  </div>

                  <h4 style={{ fontSize: '12px', color: '#e65100', margin: '0 0 8px 0', fontWeight: 'bold' }}>RINCIAN CATATAN TANGGAL:</h4>
                  
                  <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid #ffe0b2', borderRadius: '10px', padding: '10px', backgroundColor: '#fffdfa' }}>
                    {recap.rawLogs.length === 0 ? (
                      <p style={{ fontSize: '12px', color: '#888', margin: 0, textAlign: 'center' }}>Belum ada rekaman riwayat absensi.</p>
                    ) : (
                      recap.rawLogs.map((logItem, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < recap.rawLogs.length - 1 ? '1px dashed #ffe0b2' : 'none' }}>
                          <div>
                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#333', display: 'block' }}>
                              {new Date(logItem.created_at).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </span>
                            <span style={{ fontSize: '10px', color: '#888', display: 'block' }}>
                              Jam: {new Date(logItem.created_at).toLocaleTimeString('id-ID')}
                            </span>
                            {logItem.edited_by && (
                              <span style={{ fontSize: '9px', color: '#d32f2f', fontWeight: 'bold' }}>
                                👤 Diubah oleh: {logItem.edited_by}
                              </span>
                            )}
                          </div>
                          <div>
                            {logItem.status?.includes('Hadir') ? (
                              <span style={{ ...styles.badgeHadir, fontSize: '10px', padding: '3px 8px' }}>🟢 HADIR</span>
                            ) : logItem.status?.includes('Telat') ? (
                              <span style={{ ...styles.badgeTelat, fontSize: '10px', padding: '3px 8px' }}>⏰ TELAT</span>
                            ) : logItem.status?.includes('Sakit') ? (
                              <span style={{ ...styles.badgeSakit, fontSize: '10px', padding: '3px 8px' }}>🟡 SAKIT</span>
                            ) : logItem.status?.includes('Izin') ? (
                              <span style={{ ...styles.badgeIzin, fontSize: '10px', padding: '3px 8px' }}>🔵 IZIN</span>
                            ) : (
                              <span style={{ ...styles.badgeAlpha, fontSize: '10px', padding: '3px 8px' }}>🔴 ALPHA</span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })()}

            <button onClick={() => setDetailSiswa(null)} style={{ ...styles.btnOrange, marginTop: '15px', padding: '10px' }}>
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* MODAL UBAH STATUS PRESENSI */}
      {editingSiswa && !isRestrictedGuru && (
        <div style={styles.modalOverlay} className="no-print">
          <div style={{ ...styles.modalContent, width: '420px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '20px' }}>✏️</span>
              <h3 style={{ margin: 0, color: '#e65100', fontSize: '18px', fontWeight: 'bold' }}>
                Ubah Status Presensi
              </h3>
            </div>
            
            <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#666' }}>
              {isMasterIqbal || currentUser?.role === 'admin'
                ? 'Master Admin dapat memperbarui biodata & status presensi'
                : 'Guru dapat memilih status presensi'}
            </p>

            <div style={{ textAlign: 'left', marginBottom: '15px' }}>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#e65100', display: 'block', marginBottom: '3px' }}>
                Nama:
              </label>
              <input
                type="text"
                value={editNama}
                disabled={!isMasterIqbal && currentUser?.role !== 'admin'}
                onChange={(e) => setEditNama(e.target.value)}
                style={{
                  ...styles.inputStyle,
                  backgroundColor: (isMasterIqbal || currentUser?.role === 'admin') ? '#fff' : '#f8f9fa',
                  cursor: (isMasterIqbal || currentUser?.role === 'admin') ? 'text' : 'not-allowed',
                  fontSize: '12px',
                  padding: '8px 12px'
                }}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#e65100', display: 'block', marginBottom: '3px' }}>
                    Kelas / Jabatan:
                  </label>
                  <input
                    type="text"
                    value={editKelas}
                    disabled={!isMasterIqbal && currentUser?.role !== 'admin'}
                    onChange={(e) => setEditKelas(e.target.value)}
                    style={{
                      ...styles.inputStyle,
                      backgroundColor: (isMasterIqbal || currentUser?.role === 'admin') ? '#fff' : '#f8f9fa',
                      cursor: (isMasterIqbal || currentUser?.role === 'admin') ? 'text' : 'not-allowed',
                      fontSize: '12px',
                      padding: '8px 12px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#e65100', display: 'block', marginBottom: '3px' }}>
                    RFID UID:
                  </label>
                  <input
                    type="text"
                    value={editRfid}
                    disabled={!isMasterIqbal && currentUser?.role !== 'admin'}
                    onChange={(e) => setEditRfid(e.target.value)}
                    style={{
                      ...styles.inputStyle,
                      backgroundColor: (isMasterIqbal || currentUser?.role === 'admin') ? '#fff' : '#f8f9fa',
                      cursor: (isMasterIqbal || currentUser?.role === 'admin') ? 'text' : 'not-allowed',
                      fontSize: '12px',
                      padding: '8px 12px',
                      fontFamily: 'monospace'
                    }}
                  />
                </div>
              </div>

              {(isMasterIqbal || currentUser?.role === 'admin') && (
                <button
                  disabled={isUpdating}
                  onClick={handleSaveBiodataAdmin}
                  style={{
                    width: '100%',
                    marginTop: '12px',
                    padding: '10px',
                    backgroundColor: '#1565c0',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(21,101,192,0.3)'
                  }}
                >
                  💾 Simpan Perubahan Biodata
                </button>
              )}
            </div>

            <hr style={{ border: '0.5px solid #ffe0b2', margin: '15px 0' }} />

            <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#e65100', textAlign: 'left', marginBottom: '10px' }}>
              PILIH STATUS PRESENSI:
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '9px' }}>
              <button
                disabled={isUpdating}
                onClick={() => handleUpdateStatus('Hadir (Tanpa Kartu)')}
                className="btn-status-option"
                style={{ backgroundColor: '#2ecc71' }}
              >
                <span>🟢</span> HADIR (TANPA KARTU)
              </button>

              <button
                disabled={isUpdating}
                onClick={() => handleUpdateStatus('Telat')}
                className="btn-status-option"
                style={{ backgroundColor: '#f39c12' }}
              >
                <span>⏰</span> TELAT
              </button>

              <button
                disabled={isUpdating}
                onClick={() => handleUpdateStatus('Sakit')}
                className="btn-status-option"
                style={{ backgroundColor: '#f1c40f', color: '#333' }}
              >
                <span>🤒</span> SAKIT
              </button>

              <button
                disabled={isUpdating}
                onClick={() => handleUpdateStatus('Izin')}
                className="btn-status-option"
                style={{ backgroundColor: '#3498db' }}
              >
                <span>✉️</span> IZIN
              </button>

              <button
                disabled={isUpdating}
                onClick={() => handleUpdateStatus('Alpha')}
                className="btn-status-option"
                style={{ backgroundColor: '#e74c3c' }}
              >
                <span>❌</span> ALPHA
              </button>
            </div>

            <button
              onClick={() => setEditingSiswa(null)}
              style={styles.btnCancelModal}
            >
              Batal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  loginBg: {
    minHeight: '100vh',
    backgroundImage: `url('/gedung.png')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
  },
  overlay: {
    minHeight: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px'
  },
  portalCard: {
    backgroundColor: '#ffffff',
    padding: '32px 36px',
    borderRadius: '20px',
    boxShadow: '0 15px 35px rgba(0,0,0,0.3)',
    width: '100%',
    maxWidth: '400px'
  },
  splashCard: {
    backgroundColor: '#ffffff',
    padding: '35px',
    borderRadius: '20px',
    boxShadow: '0 15px 35px rgba(0,0,0,0.3)',
    width: '100%',
    maxWidth: '380px',
    textAlign: 'center'
  },
  systemOnlineBadge: {
    position: 'absolute',
    top: '15px',
    right: '15px',
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 'bold',
    border: '1px solid #a5d6a7'
  },
  greenDot: { color: '#2ecc71', fontSize: '10px' },
  orangeBadge: { backgroundColor: '#fff3e0', color: '#e65100', fontSize: '11px', fontWeight: 'bold', padding: '4px 12px', borderRadius: '12px' },
  progressTrack: { backgroundColor: '#ffe0b2', height: '9px', borderRadius: '5px', overflow: 'hidden', marginTop: '15px' },
  progressBar: { backgroundColor: '#e65100', height: '100%', transition: 'width 0.1s linear' },
  fieldLabel: { fontSize: '12px', fontWeight: 'bold', color: '#e65100', display: 'block', marginBottom: '5px' },
  inputStyle: { width: '100%', padding: '12px 15px', borderRadius: '10px', border: '1px solid #ffe0b2', outline: 'none', boxSizing: 'border-box' },
  btnOrange: { width: '100%', padding: '14px', backgroundColor: '#e65100', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' },
  errorAlert: { backgroundColor: '#ffebee', color: '#c62828', padding: '10px', borderRadius: '8px', fontSize: '12px', marginBottom: '15px', textAlign: 'center' },
  
  dashboardBg: {
    minHeight: '100vh',
    backgroundColor: '#fffdfa',
    fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
  },
  headerNav: {
    backgroundColor: '#ffffff',
    padding: '15px 30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #ffe0b2',
    boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
  },
  btnLogoutOutlined: { border: '1px solid #ffcdd2', backgroundColor: '#fff5f5', color: '#c62828', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' },
  cardBox: { backgroundColor: '#ffffff', borderRadius: '16px', padding: '22px', border: '1px solid #ffe0b2', boxShadow: '0 4px 15px rgba(230,81,0,0.03)' },
  iconCircle: { width: '52px', height: '52px', borderRadius: '50%', backgroundColor: '#fff3e0', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '24px' },
  btnGreenExport: { backgroundColor: '#2ecc71', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 6px rgba(46,204,113,0.3)' },
  btnBluePdf: { backgroundColor: '#2980b9', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 6px rgba(41,128,185,0.3)' },
  searchBar: { width: '100%', padding: '14px 22px', borderRadius: '30px', border: '1px solid #ffe0b2', outline: 'none', boxSizing: 'border-box', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', fontSize: '13px' },
  thCol: { textAlign: 'left', padding: '12px 10px', fontSize: '11px', color: '#e65100', fontWeight: 'bold', whiteSpace: 'nowrap' },
  tdCol: { padding: '12px 10px', fontSize: '13px', color: '#333', verticalAlign: 'middle' },
  
  badgeAlpha: { 
    display: 'inline-flex',
    alignItems: 'center',
    backgroundColor: '#ffebee', 
    color: '#c62828', 
    padding: '4px 10px', 
    borderRadius: '16px', 
    fontSize: '10px', 
    fontWeight: 'bold', 
    border: '1px solid #ffcdd2',
    whiteSpace: 'nowrap'
  },
  badgeHadir: { 
    display: 'inline-flex',
    alignItems: 'center',
    backgroundColor: '#e8f5e9', 
    color: '#2e7d32', 
    padding: '4px 10px', 
    borderRadius: '16px', 
    fontSize: '10px', 
    fontWeight: 'bold', 
    border: '1px solid #a5d6a7',
    whiteSpace: 'nowrap'
  },
  badgeTelat: { 
    display: 'inline-flex',
    alignItems: 'center',
    backgroundColor: '#fff8e1', 
    color: '#f57f17', 
    padding: '4px 10px', 
    borderRadius: '16px', 
    fontSize: '10px', 
    fontWeight: 'bold', 
    border: '1px solid #ffe082',
    whiteSpace: 'nowrap'
  },
  badgeSakit: { 
    display: 'inline-flex',
    alignItems: 'center',
    backgroundColor: '#fffde7', 
    color: '#fbc02d', 
    padding: '4px 10px', 
    borderRadius: '16px', 
    fontSize: '10px', 
    fontWeight: 'bold', 
    border: '1px solid #fff59d',
    whiteSpace: 'nowrap'
  },
  badgeIzin: { 
    display: 'inline-flex',
    alignItems: 'center',
    backgroundColor: '#e3f2fd', 
    color: '#1565c0', 
    padding: '4px 10px', 
    borderRadius: '16px', 
    fontSize: '10px', 
    fontWeight: 'bold', 
    border: '1px solid #90caf9',
    whiteSpace: 'nowrap'
  },
  
  badgeClass: { border: '1px solid #ffe0b2', backgroundColor: '#fffdfa', color: '#e65100', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', whiteSpace: 'nowrap' },
  btnEditOutline: { border: '1px solid #ffe0b2', backgroundColor: '#fff3e0', color: '#e65100', padding: '5px 10px', borderRadius: '8px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap' },
  btnDetailOutline: { border: '1px solid #90caf9', backgroundColor: '#e3f2fd', color: '#1565c0', padding: '5px 10px', borderRadius: '8px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap' },

  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: '28px',
    borderRadius: '20px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
    textAlign: 'center'
  },
  btnCancelModal: { marginTop: '15px', backgroundColor: 'transparent', color: '#888', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }
};
