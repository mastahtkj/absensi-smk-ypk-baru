'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Swal from 'sweetalert2';
import { DEFAULT_BANNER_SLIDES } from './HomeBannerSlider';

export default function MasterControlView({
  appConfig = {},
  onUpdateAppConfig,
  currentUser,
  siswaList = [],
  guruList = [],
  absensiLogs = [],
  supabase,
  onRefreshData,
}) {
  const [activeTab, setActiveTab] = useState('branding'); // 'branding', 'teacher_slides', 'time_geo', 'modules', 'accounts', 'devices', 'audit'
  const [isSaving, setIsSaving] = useState(false);

  // 1. STATE BRANDING & TEMA
  const [schoolName, setSchoolName] = useState(appConfig.school_name || 'SMK YPK MEDAN');
  const [schoolTagline, setSchoolTagline] = useState(appConfig.school_tagline || 'Aplikasi Sekolah Digital Terpadu');
  const [schoolAddress, setSchoolAddress] = useState(appConfig.school_address || 'Jl. Sakti Lubis Gg. Amal No. 25 & Gg. Pegawai No. 8, Medan');
  const [schoolLogoUrl, setSchoolLogoUrl] = useState(appConfig.school_logo_url || '/logo.png');
  const [schoolBannerUrl, setSchoolBannerUrl] = useState(appConfig.school_banner_url || '');
  const [runningText, setRunningText] = useState(appConfig.running_text || '');
  const [primaryColor, setPrimaryColor] = useState(appConfig.theme_primary_color || '#1e40af');
  const [accentColor, setAccentColor] = useState(appConfig.theme_accent_color || '#3b82f6');
  const [themePreset, setThemePreset] = useState(appConfig.theme_preset || 'royal_blue');

  // 2. STATE JAM & GEOFENCING
  const [entryTime, setEntryTime] = useState(appConfig.entry_time || '07:15');
  const [lateThresholdTime, setLateThresholdTime] = useState(appConfig.late_threshold_time || '07:30');
  const [departureTime, setDepartureTime] = useState(appConfig.departure_time || '14:30');
  const [fridayDepartureTime, setFridayDepartureTime] = useState(appConfig.friday_departure_time || '11:35');
  const [latitude, setLatitude] = useState(String(appConfig.school_latitude || '3.55832'));
  const [longitude, setLongitude] = useState(String(appConfig.school_longitude || '98.69421'));
  const [radiusMeters, setRadiusMeters] = useState(String(appConfig.geofence_radius_meters || '200'));

  // 3. STATE FITUR ON/OFF
  const [cbtActive, setCbtActive] = useState(appConfig.feature_cbt_active !== false);
  const [invalActive, setInvalActive] = useState(appConfig.feature_inval_active !== false);
  const [libraryActive, setLibraryActive] = useState(appConfig.feature_library_active !== false);
  const [madingActive, setMadingActive] = useState(appConfig.feature_mading_active !== false);
  const [bellActive, setBellActive] = useState(appConfig.feature_audio_bell_active !== false);
  const [chatActive, setChatActive] = useState(appConfig.feature_chat_all_active !== false);

  // 4. STATE MANAJEMEN AKUN
  const [accountSubTab, setAccountSubTab] = useState('all'); // 'all', 'master', 'admin_guru', 'guru', 'siswa_admin', 'siswa'
  const [accountSearch, setAccountSearch] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('Semua');

  // 5. STATE PERANGKAT SISWA
  const [deviceList, setDeviceList] = useState([]);
  const [deviceLoading, setDeviceLoading] = useState(false);
  const [deviceSearch, setDeviceSearch] = useState('');

  // 6. STATE AUDIT LOG
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // 7. STATE 5 SLIDE GAMBAR BANNER / BROSUR BERANDA (PERSIS SEPERTI CONTOH BROSUR SPMB)
  const [bannerSlides, setBannerSlides] = useState(() => {
    let initial = appConfig?.home_banners || appConfig?.teacher_slides;
    if (typeof initial === 'string') {
      try { initial = JSON.parse(initial); } catch (e) {}
    }
    if (Array.isArray(initial) && initial.length > 0 && (initial[0]?.image_url || initial[0]?.title)) return initial;
    return DEFAULT_BANNER_SLIDES;
  });
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);

  const handleUpdateSlide = (index, field, value) => {
    setBannerSlides((prev) => {
      const copy = [...prev];
      if (!copy[index]) {
        copy[index] = { id: index + 1, title: '', subtitle: '', image_url: '', caption: '', active: true };
      }
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Sinkronisasi state internal saat appConfig berubah dari database Supabase (Realtime)
  useEffect(() => {
    if (appConfig) {
      if (appConfig.school_name) setSchoolName(appConfig.school_name);
      if (appConfig.school_tagline) setSchoolTagline(appConfig.school_tagline);
      if (appConfig.school_address) setSchoolAddress(appConfig.school_address);
      if (appConfig.school_logo_url) setSchoolLogoUrl(appConfig.school_logo_url);
      if (appConfig.school_banner_url !== undefined) setSchoolBannerUrl(appConfig.school_banner_url || '');
      if (appConfig.running_text) setRunningText(appConfig.running_text);
      if (appConfig.theme_primary_color) setPrimaryColor(appConfig.theme_primary_color);
      if (appConfig.theme_accent_color) setAccentColor(appConfig.theme_accent_color);
      if (appConfig.theme_preset) setThemePreset(appConfig.theme_preset);

      if (appConfig.entry_time) setEntryTime(appConfig.entry_time);
      if (appConfig.late_threshold_time) setLateThresholdTime(appConfig.late_threshold_time);
      if (appConfig.departure_time) setDepartureTime(appConfig.departure_time);
      if (appConfig.friday_departure_time) setFridayDepartureTime(appConfig.friday_departure_time);
      if (appConfig.school_latitude) setLatitude(String(appConfig.school_latitude));
      if (appConfig.school_longitude) setLongitude(String(appConfig.school_longitude));
      if (appConfig.geofence_radius_meters) setRadiusMeters(String(appConfig.geofence_radius_meters));

      if (appConfig.feature_cbt_active !== undefined) setCbtActive(appConfig.feature_cbt_active);
      if (appConfig.feature_inval_active !== undefined) setInvalActive(appConfig.feature_inval_active);
      if (appConfig.feature_library_active !== undefined) setLibraryActive(appConfig.feature_library_active);
      if (appConfig.feature_mading_active !== undefined) setMadingActive(appConfig.feature_mading_active);
      if (appConfig.feature_audio_bell_active !== undefined) setBellActive(appConfig.feature_audio_bell_active);
      if (appConfig.feature_chat_all_active !== undefined) setChatActive(appConfig.feature_chat_all_active);
      if (appConfig.home_banners || appConfig.teacher_slides) {
        let parsed = appConfig.home_banners || appConfig.teacher_slides;
        if (typeof parsed === 'string') {
          try { parsed = JSON.parse(parsed); } catch (e) {}
        }
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (parsed[0]?.image_url || parsed[0]?.title) {
            setBannerSlides(parsed);
          }
        }
      }
    }
  }, [appConfig]);

  // Load Perangkat Siswa saat tab 'devices' dibuka
  const fetchStudentDevices = async () => {
    if (!supabase) return;
    setDeviceLoading(true);
    try {
      const { data, error } = await supabase
        .from('tb_siswa_devices')
        .select('*')
        .order('last_login', { ascending: false });
      if (!error && data) {
        setDeviceList(data);
      }
    } catch (e) {
      console.warn('Error load devices:', e);
    } finally {
      setDeviceLoading(false);
    }
  };

  // Load Audit Log saat tab 'audit' dibuka
  const fetchAuditLogs = async () => {
    if (!supabase) return;
    setAuditLoading(true);
    try {
      const { data, error } = await supabase
        .from('audit_log_presensi')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (!error && data) {
        setAuditLogs(data);
      }
    } catch (e) {
      console.warn('Error load audit logs:', e);
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'devices') fetchStudentDevices();
    if (activeTab === 'audit') fetchAuditLogs();
  }, [activeTab]);

  // DAFTAR PRESET TEMA WARNA
  const THEME_PRESETS = [
    { id: 'royal_blue', name: 'Royal Blue (Standar YPK)', primary: '#1e40af', accent: '#3b82f6', bg: '#eff6ff' },
    { id: 'emerald_green', name: 'Emerald Islamic (Hijau Islami)', primary: '#065f46', accent: '#10b981', bg: '#ecfdf5' },
    { id: 'cyber_purple', name: 'Cyber Violet (Elegan Modern)', primary: '#5b21b6', accent: '#8b5cf6', bg: '#f5f3ff' },
    { id: 'sunset_orange', name: 'Sunset Amber (Enerjik)', primary: '#9a3412', accent: '#f97316', bg: '#fff7ed' },
    { id: 'midnight_slate', name: 'Midnight Dark (Modern Minimalis)', primary: '#0f172a', accent: '#475569', bg: '#f8fafc' },
  ];

  const applyPreset = (preset) => {
    setThemePreset(preset.id);
    setPrimaryColor(preset.primary);
    setAccentColor(preset.accent);
  };

  // SIMPAN PENGATURAN KE SUPABASE (REALTIME AUTO-SYNC KE HP & WEB)
  const saveAllSettings = async (customPayload = null) => {
    if (!supabase) {
      Swal.fire('Error', 'Koneksi Supabase tidak terdeteksi.', 'error');
      return;
    }
    setIsSaving(true);
    try {
      const payload = customPayload || {
        id: 'school_config',
        school_name: schoolName.trim(),
        school_tagline: schoolTagline.trim(),
        school_address: schoolAddress.trim(),
        school_logo_url: schoolLogoUrl.trim(),
        school_banner_url: schoolBannerUrl.trim(),
        running_text: runningText.trim(),
        theme_preset: themePreset,
        theme_primary_color: primaryColor,
        theme_accent_color: accentColor,
        entry_time: entryTime,
        late_threshold_time: lateThresholdTime,
        departure_time: departureTime,
        friday_departure_time: fridayDepartureTime,
        school_latitude: parseFloat(latitude) || 3.55832,
        school_longitude: parseFloat(longitude) || 98.69421,
        geofence_radius_meters: parseFloat(radiusMeters) || 200.0,
        feature_cbt_active: cbtActive,
        feature_inval_active: invalActive,
        feature_library_active: libraryActive,
        feature_mading_active: madingActive,
        feature_audio_bell_active: bellActive,
        feature_chat_all_active: chatActive,
        teacher_slides: bannerSlides,
        home_banners: bannerSlides,
        updated_by: currentUser?.nama || 'Admin Master',
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('app_settings')
        .upsert(payload, { onConflict: 'id' })
        .select();

      if (error) {
        // Coba insert jika upsert gagal
        const { error: insErr } = await supabase.from('app_settings').insert([payload]);
        if (insErr) throw insErr;
      }

      if (onUpdateAppConfig) onUpdateAppConfig(payload);

      Swal.fire({
        icon: 'success',
        title: 'Pengaturan Berhasil Disimpan! 🚀',
        html: `
          <div style="font-size: 13px; color: #475569; text-align: left; line-height: 1.5;">
            ✅ Data konfigurasi tersimpan ke database cloud.<br/>
            ✅ <b>Sinkronisasi Otomatis:</b> Seluruh HP &amp; Website yang sedang aktif akan langsung menerapkan perubahan ini secara seketika tanpa perlu reload!
          </div>
        `,
        timer: 2500,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error('Gagal simpan konfigurasi:', err);
      Swal.fire({
        icon: 'error',
        title: 'Gagal Menyimpan',
        text: err.message || 'Terjadi kesalahan saat menyimpan pengaturan ke database.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // RESET PERANGKAT HP SISWA
  const handleResetDevice = async (id, namaSiswa) => {
    const confirm = await Swal.fire({
      title: 'Reset Slot HP Siswa?',
      html: `Apakah Anda yakin ingin menghapus slot perangkat untuk <b>${namaSiswa}</b>?<br/><small style="color: #64748b;">Siswa akan dapat melakukan login ulang di HP barunya.</small>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Reset Slot HP',
      cancelButtonText: 'Batal',
    });

    if (confirm.isConfirmed) {
      try {
        const { error } = await supabase.from('tb_siswa_devices').delete().eq('id', id);
        if (error) throw error;
        Swal.fire('Berhasil', `Slot HP ${namaSiswa} berhasil direset.`, 'success');
        fetchStudentDevices();
      } catch (err) {
        Swal.fire('Error', err.message, 'error');
      }
    }
  };

  // RESET PASSWORD PENGGUNA (GURU ATAU SISWA)
  const handleResetPassword = async (user, isGuru) => {
    const displayName = user.nama || user.nama_guru || user.nama_siswa || 'Pengguna';
    const { value: newPassword } = await Swal.fire({
      title: `Ganti Kata Sandi: ${displayName}`,
      input: 'text',
      inputLabel: 'Masukkan kata sandi baru:',
      inputPlaceholder: isGuru ? 'Default: guru123' : 'Default: siswa123',
      showCancelButton: true,
      confirmButtonColor: '#1e40af',
      cancelButtonText: 'Batal',
      confirmButtonText: 'Simpan Kata Sandi',
      inputValidator: (val) => {
        if (!val || val.trim().length < 3) return 'Kata sandi minimal 3 karakter!';
      },
    });

    if (newPassword) {
      try {
        const cleanPass = newPassword.trim();
        const targetId = user.rawId || user.id_guru || user.id_siswa || String(user.id).replace(/\D/g, '');
        if (isGuru) {
          const { error } = await supabase
            .from('tb_guru')
            .update({ password: cleanPass })
            .eq('id_guru', targetId);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('tb_siswa')
            .update({ password: cleanPass })
            .eq('id_siswa', targetId);
          if (error) throw error;
        }
        Swal.fire('Sukses', `Kata sandi berhasil diubah menjadi: ${cleanPass}`, 'success');
        if (onRefreshData) onRefreshData();
      } catch (err) {
        Swal.fire('Gagal', err.message, 'error');
      }
    }
  };

  // UBAH ROLE PENGGUNA
  const handleChangeRole = async (user, isGuru, newRole) => {
    try {
      const targetId = user.rawId || user.id_guru || user.id_siswa || String(user.id).replace(/\D/g, '');
      if (isGuru) {
        const { error } = await supabase
          .from('tb_guru')
          .update({ role: newRole })
          .eq('id_guru', targetId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('tb_siswa')
          .update({ role: newRole })
          .eq('id_siswa', targetId);
        if (error) throw error;
      }
      Swal.fire('Sukses', `Peran berhasil diubah menjadi: ${newRole}`, 'success');
      if (onRefreshData) onRefreshData();
    } catch (err) {
      Swal.fire('Gagal', err.message, 'error');
    }
  };

  // FILTER PENGGUNA
  const filteredUsers = useMemo(() => {
    const list = [];

    // Guru
    guruList.forEach((g) => {
      const displayName = g.nama || g.nama_guru || g.username || 'Guru YPK';
      const gNama = displayName.toLowerCase();
      const gUser = (g.username || '').toLowerCase();
      const isMaster = gUser === 'iqbal' || g.role === 'master' || gNama.includes('iqbal');
      const isAdmin = (g.role === 'admin' || g.role === 'admin_guru') && !isMaster;
      let calculatedRole = 'Guru';
      if (isMaster) calculatedRole = 'Master';
      else if (isAdmin) calculatedRole = 'Admin Guru';

      list.push({
        ...g,
        idKey: g.id || `GURU-${g.rawId || g.id_guru || Math.random()}`,
        nama: displayName,
        username: g.username || (g.inisial ? `guru.${g.inisial.toLowerCase()}` : ''),
        roleBadge: calculatedRole,
        isGuru: true,
        rfid: g.rfid_uid || g.uid_rfid || '-',
        kelas: g.inisial ? `Inisial: ${g.inisial}` : (g.kelas || 'Guru / Staff'),
      });
    });

    // Siswa
    siswaList.forEach((s) => {
      if (s.isGuru) return;
      const displayName = s.nama || s.nama_siswa || s.username || 'Siswa YPK';
      const sNama = displayName.toLowerCase();
      const sRole = String(s.role || '').toLowerCase();
      const isSAdmin = sRole.includes('admin') || sRole.includes('siswa_admin');
      list.push({
        ...s,
        idKey: s.id || `SISWA-${s.rawId || s.id_siswa || Math.random()}`,
        nama: displayName,
        username: s.username || '',
        roleBadge: isSAdmin ? 'Siswa Admin' : 'Siswa',
        isGuru: false,
        rfid: s.rfid_uid || s.uid_rfid || '-',
        kelas: s.kelas || '-',
      });
    });

    return list.filter((u) => {
      // Filter SubTab
      if (accountSubTab === 'master' && u.roleBadge !== 'Master') return false;
      if (accountSubTab === 'admin_guru' && u.roleBadge !== 'Admin Guru') return false;
      if (accountSubTab === 'guru' && u.roleBadge !== 'Guru') return false;
      if (accountSubTab === 'siswa_admin' && u.roleBadge !== 'Siswa Admin') return false;
      if (accountSubTab === 'siswa' && u.roleBadge !== 'Siswa') return false;

      // Filter Kelas
      if (selectedClassFilter !== 'Semua' && !u.isGuru && u.kelas !== selectedClassFilter) return false;

      // Search Query
      if (accountSearch.trim()) {
        const q = accountSearch.toLowerCase();
        const nMatch = u.nama.toLowerCase().includes(q);
        const rMatch = String(u.rfid || '').toLowerCase().includes(q);
        const kMatch = String(u.kelas || '').toLowerCase().includes(q);
        return nMatch || rMatch || kMatch;
      }
      return true;
    });
  }, [guruList, siswaList, accountSubTab, accountSearch, selectedClassFilter]);

  // DAFTAR KELAS UNIK UNTUK FILTER
  const classOptions = useMemo(() => {
    const set = new Set();
    siswaList.forEach((s) => {
      if (!s.isGuru && s.kelas) set.add(s.kelas);
    });
    return ['Semua', ...Array.from(set).sort()];
  }, [siswaList]);

  return (
    <div style={{ padding: '8px 0 40px 0', maxWidth: '1280px', margin: '0 auto', color: '#1e293b' }}>
      {/* 👑 HERO BANNER ADMIN MASTER */}
      <div
        style={{
          background: `linear-gradient(135deg, ${primaryColor} 0%, #0f172a 100%)`,
          borderRadius: '20px',
          padding: '26px',
          color: '#ffffff',
          boxShadow: '0 12px 32px rgba(15, 23, 42, 0.25)',
          marginBottom: '22px',
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.15)',
        }}
      >
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
            <span
              style={{
                backgroundColor: '#f59e0b',
                color: '#ffffff',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: '900',
                letterSpacing: '0.6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: '0 2px 8px rgba(245, 158, 11, 0.4)',
              }}
            >
              <span>👑</span> PUSAT KENDALI TERTINGGI (SUPER ADMIN)
            </span>
            <span
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                color: '#86efac',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: 'bold',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block' }} />
              SINKRONISASI CLOUD SUPABASE REALTIME: AKTIF
            </span>
          </div>

          <h1 style={{ margin: '4px 0 8px 0', fontSize: '26px', fontWeight: '900', letterSpacing: '-0.5px' }}>
            Master Control Center • {schoolName}
          </h1>
          <p style={{ margin: 0, fontSize: '13.5px', color: '#cbd5e1', maxWidth: '800px', lineHeight: '1.5' }}>
            Anda memiliki wewenang mutlak untuk membaca, menulis, dan mengubah seluruh aspek aplikasi. Setiap perubahan nama, jam KBM, tema warna, atau aturan geofence yang Anda simpan di sini akan <b>langsung tersinkronisasi 100% di HP maupun di Website</b> secara seketika tanpa perbedaan.
          </p>
        </div>
      </div>

      {/* 🧭 NAVIGATION TABS MASTER CONTROL */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '12px',
          marginBottom: '20px',
          scrollbarWidth: 'none',
        }}
      >
        {[
          { id: 'branding', label: '🎨 Tampilan & Branding', desc: 'Nama, Logo & Tema' },
          { id: 'teacher_slides', label: '🖼️ 5 Slide Banner Beranda', desc: 'Brosur SPMB & Banner' },
          { id: 'time_geo', label: '⏰ Jam & Geofence GPS', desc: 'Aturan Presensi HP' },
          { id: 'modules', label: '🧩 Saklar Modul', desc: 'On / Off Fitur' },
          { id: 'accounts', label: '👥 Manajemen Akun & Hak Akses', desc: 'Pisah Role & Password' },
          { id: 'devices', label: '📱 Kelola HP Siswa', desc: 'Reset Batas 2 Perangkat' },
          { id: 'audit', label: '📊 Audit & Log Aktivitas', desc: 'Riwayat Perubahan' },
        ].map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                backgroundColor: isSelected ? primaryColor : '#ffffff',
                color: isSelected ? '#ffffff' : '#475569',
                border: isSelected ? `2px solid ${primaryColor}` : '1px solid #e2e8f0',
                padding: '10px 18px',
                borderRadius: '14px',
                fontWeight: 'bold',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '2px',
                boxShadow: isSelected ? `0 6px 16px ${primaryColor}40` : '0 2px 4px rgba(0,0,0,0.03)',
              }}
            >
              <span style={{ fontSize: '13.5px' }}>{tab.label}</span>
              <span style={{ fontSize: '10.5px', opacity: isSelected ? 0.9 : 0.6, fontWeight: 'normal' }}>{tab.desc}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: 🎨 TAMPILAN & BRANDING SEKOLAH                                       */}
      {/* ========================================================================= */}
      {activeTab === 'branding' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {/* FORM IDENTITAS */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
            }}
          >
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 'bold', color: primaryColor, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🏫</span> Identitas &amp; Banner Sekolah
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '5px' }}>
                  Nama Sekolah
                </label>
                <input
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13.5px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '5px' }}>
                  Tagline / Sub-Judul Sekolah
                </label>
                <input
                  type="text"
                  value={schoolTagline}
                  onChange={(e) => setSchoolTagline(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13.5px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '5px' }}>
                  Alamat Lengkap Sekolah
                </label>
                <textarea
                  rows={2}
                  value={schoolAddress}
                  onChange={(e) => setSchoolAddress(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13.5px',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '5px' }}>
                  Teks Berjalan Pengumuman (Running Text Marquee di Header)
                </label>
                <textarea
                  rows={2}
                  value={runningText}
                  onChange={(e) => setRunningText(e.target.value)}
                  placeholder="Masukkan pengumuman penting yang akan berjalan di bilah atas aplikasi..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13.5px',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '5px' }}>
                  URL Logo Sekolah (PNG / SVG)
                </label>
                <input
                  type="text"
                  value={schoolLogoUrl}
                  onChange={(e) => setSchoolLogoUrl(e.target.value)}
                  placeholder="/logo.png atau https://..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13.5px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          </div>

          {/* PALET WARNA & PRESET TEMA */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 'bold', color: primaryColor, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🎨</span> Preset &amp; Kustomisasi Warna Tema
              </h3>

              <p style={{ margin: '0 0 14px 0', fontSize: '12.5px', color: '#64748b' }}>
                Pilih tema warna siap pakai atau tentukan warna hex kustom. Perubahan ini akan langsung mengubah warna tema aplikasi di <b>laptop dan seluruh HP siswa/guru</b>.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                {THEME_PRESETS.map((p) => {
                  const isCur = themePreset === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => applyPreset(p)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '12px',
                        border: isCur ? `2px solid ${p.primary}` : '1px solid #e2e8f0',
                        backgroundColor: isCur ? p.bg : '#f8fafc',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: p.primary, border: '2px solid #ffffff', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
                        <span style={{ fontSize: '13px', fontWeight: isCur ? 'bold' : '500', color: isCur ? p.primary : '#334155' }}>
                          {p.name}
                        </span>
                      </div>
                      {isCur && <span style={{ color: p.primary, fontWeight: 'bold', fontSize: '14px' }}>✓ Aktif</span>}
                    </div>
                  );
                })}
              </div>

              {/* CUSTOM COLOR PICKER */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>
                    Warna Primer Kustom
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => {
                        setPrimaryColor(e.target.value);
                        setThemePreset('custom');
                      }}
                      style={{ width: '40px', height: '36px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => {
                        setPrimaryColor(e.target.value);
                        setThemePreset('custom');
                      }}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>
                    Warna Aksen Kustom
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => {
                        setAccentColor(e.target.value);
                        setThemePreset('custom');
                      }}
                      style={{ width: '40px', height: '36px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                    />
                    <input
                      type="text"
                      value={accentColor}
                      onChange={(e) => {
                        setAccentColor(e.target.value);
                        setThemePreset('custom');
                      }}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '24px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
              <button
                onClick={() => saveAllSettings()}
                disabled={isSaving}
                style={{
                  width: '100%',
                  backgroundColor: primaryColor,
                  color: '#ffffff',
                  padding: '12px',
                  borderRadius: '12px',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: `0 4px 14px ${primaryColor}40`,
                }}
              >
                {isSaving ? 'Menyimpan & Menyinkronkan...' : '💾 Simpan Perubahan Tampilan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: 🖼️ 5 SLIDE BANNER / BROSUR BERANDA (PERSIS SESUAI BROSUR CONTOH SPMB)  */}
      {/* ========================================================================= */}
      {activeTab === 'teacher_slides' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 'bold', color: primaryColor, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🖼️</span> Kelola 5 Slide Banner &amp; Brosur Sekolah di Beranda
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#64748b' }}>
                Atur 5 slide gambar banner horizontal (seperti brosur SPMB, gedung, fasilitas kejuruan, dll.) lengkap dengan 5 titik indikator bulat (dots) persis seperti di gambar contoh. Seluruh perubahan langsung <b>sinkron 100% di HP dan Website</b>.
              </p>
            </div>
            <button
              onClick={() => saveAllSettings()}
              disabled={isSaving}
              style={{
                backgroundColor: '#16a34a',
                color: '#ffffff',
                border: 'none',
                padding: '9px 18px',
                borderRadius: '10px',
                fontWeight: 'bold',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
              }}
            >
              <span>💾</span>
              <span>{isSaving ? 'Menyimpan...' : 'Simpan 5 Slide Banner'}</span>
            </button>
          </div>

          {/* PILIHAN SLIDE (1 s/d 5) */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '16px' }}>
            {[0, 1, 2, 3, 4].map((idx) => {
              const slide = bannerSlides[idx] || {};
              const isSelected = selectedSlideIndex === idx;
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedSlideIndex(idx)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '12px',
                    fontSize: '12.5px',
                    fontWeight: 'bold',
                    border: isSelected ? `2px solid ${primaryColor}` : '1px solid #cbd5e1',
                    backgroundColor: isSelected ? `${primaryColor}15` : '#f8fafc',
                    color: isSelected ? primaryColor : '#475569',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>{isSelected ? '⭐' : '🖼️'}</span>
                  <span>Slide #{idx + 1}: {slide.title ? (slide.title.length > 20 ? slide.title.substring(0, 20) + '...' : slide.title) : `Banner ${idx + 1}`}</span>
                </button>
              );
            })}
          </div>

          {/* FORM EDITOR UNTUK SLIDE BANNER YANG DIPILIH */}
          {(() => {
            const currentSlide = bannerSlides[selectedSlideIndex] || {
              id: selectedSlideIndex + 1,
              title: '',
              subtitle: '',
              image_url: '',
              caption: '',
              active: true,
            };

            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                {/* KOLOM KIRI: FORM INPUT */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* PRESET CEPAT BANNER YPK */}
                  <div style={{ backgroundColor: '#f0fdf4', border: '1.5px dashed #86efac', borderRadius: '12px', padding: '12px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#166534', marginBottom: '6px' }}>
                      ⚡ Tombol Cepat Pilihan Gambar Resmi:
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          handleUpdateSlide(selectedSlideIndex, 'image_url', '/banner-spmb-ypk.png');
                          if (!currentSlide.title) handleUpdateSlide(selectedSlideIndex, 'title', 'SPMB SMK YPK MEDAN 2025/2026');
                          if (!currentSlide.subtitle) handleUpdateSlide(selectedSlideIndex, 'subtitle', 'Sistem Penerimaan Murid Baru • Akreditasi A');
                        }}
                        style={{ padding: '5px 10px', fontSize: '11.5px', borderRadius: '6px', border: '1px solid #86efac', backgroundColor: '#ffffff', color: '#166534', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        📄 Brosur SPMB (Unggahan Anda)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleUpdateSlide(selectedSlideIndex, 'image_url', '/gedung.png');
                          if (!currentSlide.title) handleUpdateSlide(selectedSlideIndex, 'title', 'Gedung & Kampus SMK YPK');
                          if (!currentSlide.subtitle) handleUpdateSlide(selectedSlideIndex, 'subtitle', 'Fasilitas Belajar & Lab Kejuruan Terpadu');
                        }}
                        style={{ padding: '5px 10px', fontSize: '11.5px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#334155', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        🏫 Gedung Sekolah
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleUpdateSlide(selectedSlideIndex, 'image_url', '/logo.png');
                        }}
                        style={{ padding: '5px 10px', fontSize: '11.5px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#334155', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        ⭐ Logo YPK
                      </button>
                    </div>
                    <span style={{ fontSize: '10.5px', color: '#15803d', marginTop: '6px', display: 'block' }}>
                      💡 Anda juga dapat mengisikan URL gambar dari internet (https://...) atau file lokal di folder publik.
                    </span>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '5px' }}>
                      Tautan / URL Gambar Banner (Rasio Horizontal 16:9 / 2:1)
                    </label>
                    <input
                      type="text"
                      value={currentSlide.image_url || ''}
                      onChange={(e) => handleUpdateSlide(selectedSlideIndex, 'image_url', e.target.value)}
                      placeholder="Contoh: /banner-spmb-ypk.png atau https://..."
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '5px' }}>
                      Judul Utama Banner
                    </label>
                    <input
                      type="text"
                      value={currentSlide.title || ''}
                      onChange={(e) => handleUpdateSlide(selectedSlideIndex, 'title', e.target.value)}
                      placeholder="Contoh: SPMB SMK YPK MEDAN 2025/2026"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '5px' }}>
                      Sub-Judul / Label Brosur
                    </label>
                    <input
                      type="text"
                      value={currentSlide.subtitle || ''}
                      onChange={(e) => handleUpdateSlide(selectedSlideIndex, 'subtitle', e.target.value)}
                      placeholder="Contoh: Sistem Penerimaan Murid Baru • Akreditasi A"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '5px' }}>
                      Keterangan / Deskripsi Brosur
                    </label>
                    <textarea
                      rows={3}
                      value={currentSlide.caption || ''}
                      onChange={(e) => handleUpdateSlide(selectedSlideIndex, 'caption', e.target.value)}
                      placeholder="Tuliskan keterangan detail brosur, informasi jurusan, nomor pendaftaran, dll..."
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', resize: 'vertical' }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#f8fafc', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <input
                      type="checkbox"
                      id={`slideActive_${selectedSlideIndex}`}
                      checked={currentSlide.active !== false}
                      onChange={(e) => handleUpdateSlide(selectedSlideIndex, 'active', e.target.checked)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <label htmlFor={`slideActive_${selectedSlideIndex}`} style={{ fontSize: '13px', fontWeight: 'bold', color: '#334155', cursor: 'pointer' }}>
                      Tampilkan Slide #{selectedSlideIndex + 1} Ini di Beranda
                    </label>
                  </div>
                </div>

                {/* KOLOM KANAN: PRATINJAU LANGSUNG (LIVE PREVIEW HORIZONTAL DENGAN TITIK DOTS) */}
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>👁️</span> Pratinjau Tampilan Beranda (Web &amp; HP):
                    </span>
                    <span style={{ fontSize: '10.5px', color: '#16a34a', backgroundColor: '#dcfce7', padding: '2px 8px', borderRadius: '6px', fontWeight: 'bold' }}>
                      Slide {selectedSlideIndex + 1} dari 5
                    </span>
                  </div>

                  {/* KARTU BANNER HORIZONTAL PERSIS SEPERTI GAMBAR CONTOH */}
                  <div
                    style={{
                      borderRadius: '16px',
                      overflow: 'hidden',
                      boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
                      border: '1.5px solid #cbd5e1',
                      background: '#0f172a',
                      position: 'relative',
                    }}
                  >
                    {/* GAMBAR BANNER */}
                    <div style={{ width: '100%', height: '180px', position: 'relative', overflow: 'hidden', backgroundColor: '#1e293b' }}>
                      {currentSlide.image_url ? (
                        <img
                          src={currentSlide.image_url}
                          alt={currentSlide.title || 'Banner Slide'}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', gap: '6px' }}>
                          <span style={{ fontSize: '32px' }}>🖼️</span>
                          <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Belum Ada Gambar Banner</span>
                        </div>
                      )}

                      {/* OVERLAY GRADIENT */}
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'linear-gradient(180deg, rgba(15,23,42,0.1) 0%, rgba(15,23,42,0.85) 100%)',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'flex-end',
                          padding: '14px',
                          color: '#ffffff',
                        }}
                      >
                        {currentSlide.subtitle && (
                          <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: 'rgba(37,99,235,0.85)', padding: '2px 8px', borderRadius: '4px', width: 'fit-content', marginBottom: '4px', color: '#ffffff' }}>
                            {currentSlide.subtitle}
                          </span>
                        )}
                        <h4 style={{ margin: '0 0 3px 0', fontSize: '14.5px', fontWeight: '900', color: '#ffffff', textShadow: '0 2px 4px rgba(0,0,0,0.6)' }}>
                          {currentSlide.title || `Banner Slide #${selectedSlideIndex + 1}`}
                        </h4>
                        {currentSlide.caption && (
                          <p style={{ margin: 0, fontSize: '10.5px', color: '#e2e8f0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.3 }}>
                            {currentSlide.caption}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* ⚪ ⚫ ⚪ ⚪ ⚪ 5 TITIK INDIKATOR BULAT DI BAWAH PERSIS SEPERTI DI GAMBAR CONTOH */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '7px',
                        padding: '10px',
                        backgroundColor: '#ffffff',
                        borderTop: '1px solid #e2e8f0',
                      }}
                    >
                      {[0, 1, 2, 3, 4].map((dotIdx) => {
                        const isCurDot = selectedSlideIndex === dotIdx;
                        return (
                          <div
                            key={dotIdx}
                            onClick={() => setSelectedSlideIndex(dotIdx)}
                            style={{
                              width: isCurDot ? '22px' : '8px',
                              height: '8px',
                              borderRadius: '4px',
                              backgroundColor: isCurDot ? primaryColor : '#cbd5e1',
                              cursor: 'pointer',
                              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                              boxShadow: isCurDot ? `0 2px 6px ${primaryColor}60` : 'none',
                            }}
                            title={`Buka Slide #${dotIdx + 1}`}
                          />
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ marginTop: '16px' }}>
                    <button
                      onClick={() => saveAllSettings()}
                      disabled={isSaving}
                      style={{
                        width: '100%',
                        backgroundColor: primaryColor,
                        color: '#ffffff',
                        padding: '12px',
                        borderRadius: '12px',
                        fontWeight: 'bold',
                        fontSize: '14px',
                        border: 'none',
                        cursor: 'pointer',
                        boxShadow: `0 4px 14px ${primaryColor}40`,
                        transition: 'opacity 0.2s',
                      }}
                    >
                      {isSaving ? 'Menyimpan & Menyinkronkan...' : '💾 Simpan Seluruh 5 Slide Banner'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ⏰ JAM & GEOFENCE GPS (ATURAN PRESENSI HP)                           */}
      {/* ========================================================================= */}
      {activeTab === 'time_geo' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {/* ATURAN JAM KBM */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
            }}
          >
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 'bold', color: primaryColor, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⏰</span> Jam Operasional &amp; Presensi Sekolah
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '5px' }}>
                  Jam Masuk KBM (Tepat Waktu)
                </label>
                <input
                  type="time"
                  value={entryTime}
                  onChange={(e) => setEntryTime(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                />
                <span style={{ fontSize: '11px', color: '#64748b' }}>Siswa/guru yang tap sebelum jam ini berstatus &quot;Hadir Tepat Waktu&quot;.</span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '5px' }}>
                  Batas Toleransi Keterlambatan
                </label>
                <input
                  type="time"
                  value={lateThresholdTime}
                  onChange={(e) => setLateThresholdTime(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                />
                <span style={{ fontSize: '11px', color: '#64748b' }}>Tap setelah jam ini akan otomatis tercatat sebagai &quot;Terlambat&quot;.</span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '5px' }}>
                  Jam Pulang Reguler (Senin - Kamis)
                </label>
                <input
                  type="time"
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '5px' }}>
                  Jam Pulang Khusus Hari Jumat
                </label>
                <input
                  type="time"
                  value={fridayDepartureTime}
                  onChange={(e) => setFridayDepartureTime(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                />
                <span style={{ fontSize: '11px', color: '#64748b' }}>Waktu pulang lebih awal sebelum Sholat Jumat.</span>
              </div>
            </div>
          </div>

          {/* GEOFENCING GPS */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 'bold', color: primaryColor, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📍</span> Titik Koordinat GPS &amp; Radius Geofence
              </h3>

              <p style={{ margin: '0 0 16px 0', fontSize: '12.5px', color: '#64748b', lineHeight: '1.5' }}>
                Pengaturan ini mengatur validasi presensi mandiri lewat HP. Siswa atau guru hanya dapat melakukan presensi mandiri jika GPS HP berada di dalam radius toleransi ini.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '5px' }}>
                    Latitude Sekolah
                  </label>
                  <input
                    type="text"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    placeholder="Contoh: 3.55832"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13.5px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '5px' }}>
                    Longitude Sekolah
                  </label>
                  <input
                    type="text"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    placeholder="Contoh: 98.69421"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13.5px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '5px' }}>
                    Radius Toleransi Geofencing (Meter)
                  </label>
                  <input
                    type="number"
                    value={radiusMeters}
                    onChange={(e) => setRadiusMeters(e.target.value)}
                    placeholder="200"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13.5px', boxSizing: 'border-box' }}
                  />
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Standar: 200 meter (mencakup seluruh area gerbang, halaman, dan gedung SMK YPK).</span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '24px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
              <button
                onClick={() => saveAllSettings()}
                disabled={isSaving}
                style={{
                  width: '100%',
                  backgroundColor: primaryColor,
                  color: '#ffffff',
                  padding: '12px',
                  borderRadius: '12px',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: `0 4px 14px ${primaryColor}40`,
                }}
              >
                {isSaving ? 'Menyimpan & Menyinkronkan...' : '💾 Simpan Aturan Jam & Geofence'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: 🧩 SAKLAR MODUL (FEATURE TOGGLES)                                    */}
      {/* ========================================================================= */}
      {activeTab === 'modules' && (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
          }}
        >
          <h3 style={{ margin: '0 0 8px 0', fontSize: '17px', fontWeight: 'bold', color: primaryColor }}>
            Saklar Fitur &amp; Modul Aplikasi
          </h3>
          <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#64748b' }}>
            Aktifkan atau nonaktifkan modul secara dinamis. Modul yang dimatikan akan otomatis disembunyikan dari antarmuka pengguna di Website maupun di HP.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {[
              {
                id: 'cbt',
                title: '📝 Ujian CBT Online',
                desc: 'Ujian daring dengan proteksi anti-cheat, 30 PG + 5 Essay, dan koreksi otomatis.',
                val: cbtActive,
                setter: setCbtActive,
              },
              {
                id: 'inval',
                title: '👨‍🏫 Inval Guru & Bahan Ajar',
                desc: 'Penjadwalan guru pengganti saat izin/sakit serta modul materi pelajaran KBM.',
                val: invalActive,
                setter: setInvalActive,
              },
              {
                id: 'library',
                title: '📖 Perpustakaan Digital',
                desc: 'Katalog e-book kurikulum merdeka dan buku referensi kejuruan SMK.',
                val: libraryActive,
                setter: setLibraryActive,
              },
              {
                id: 'mading',
                title: '📢 Mading & Pengumuman',
                desc: 'Penerbitan berita resmi sekolah dengan push notification ke HP siswa/guru.',
                val: madingActive,
                setter: setMadingActive,
              },
              {
                id: 'bell',
                title: '🔔 Bel Suara Otomatis',
                desc: 'Bel sekolah melodi dan pengumuman suara otomatis berbasis jadwal KBM.',
                val: bellActive,
                setter: setBellActive,
              },
              {
                id: 'chat',
                title: '💬 Ruang Chat Guru & Siswa Admin',
                desc: 'Komunikasi tertutup antara dewan guru dan pengurus/ketua kelas.',
                val: chatActive,
                setter: setChatActive,
              },
            ].map((mod) => (
              <div
                key={mod.id}
                style={{
                  padding: '16px',
                  borderRadius: '14px',
                  border: mod.val ? '2px solid #86efac' : '1px solid #e2e8f0',
                  backgroundColor: mod.val ? '#f0fdf4' : '#f8fafc',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '14.5px', fontWeight: 'bold', color: mod.val ? '#166534' : '#475569' }}>
                      {mod.title}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 'bold',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        backgroundColor: mod.val ? '#dcfce7' : '#e2e8f0',
                        color: mod.val ? '#15803d' : '#64748b',
                      }}
                    >
                      {mod.val ? 'AKTIF' : 'NONAKTIF'}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: '1.4' }}>{mod.desc}</p>
                </div>

                <button
                  type="button"
                  onClick={() => mod.setter(!mod.val)}
                  style={{
                    backgroundColor: mod.val ? '#dc2626' : '#16a34a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    width: '100%',
                  }}
                >
                  {mod.val ? 'Matikan Modul Ini' : 'Aktifkan Modul Ini'}
                </button>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '24px', borderTop: '1px solid #f1f5f9', paddingTop: '16px', textAlign: 'right' }}>
            <button
              onClick={() => saveAllSettings()}
              disabled={isSaving}
              style={{
                backgroundColor: primaryColor,
                color: '#ffffff',
                padding: '12px 28px',
                borderRadius: '12px',
                fontWeight: 'bold',
                fontSize: '14px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: `0 4px 14px ${primaryColor}40`,
              }}
            >
              {isSaving ? 'Menyimpan...' : '💾 Simpan Status Saklar Modul'}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: 👥 MANAJEMEN AKUN & HAK AKSES (PEMISAHAN PERAN TEGAS)              */}
      {/* ========================================================================= */}
      {activeTab === 'accounts' && (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 'bold', color: primaryColor }}>
                Manajemen Seluruh Akun Pengguna &amp; Hak Akses
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#64748b' }}>
                Pemisahan tegas: Master Admin, Admin Guru, Guru, Siswa/i Admin, dan Siswa Biasa.
              </p>
            </div>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', backgroundColor: '#f1f5f9', padding: '6px 14px', borderRadius: '20px' }}>
              Total Akun: {filteredUsers.length} Pengguna
            </div>
          </div>

          {/* SUB-FILTER ROLE */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
            {[
              { id: 'all', label: 'Semua Akun' },
              { id: 'master', label: '👑 Master Admin' },
              { id: 'admin_guru', label: '👨‍🏫 Admin Guru' },
              { id: 'guru', label: '🧑‍🏫 Guru Pengajar' },
              { id: 'siswa_admin', label: '⭐ Siswa Admin' },
              { id: 'siswa', label: '🎒 Siswa Biasa' },
            ].map((sub) => (
              <button
                key={sub.id}
                onClick={() => setAccountSubTab(sub.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  border: accountSubTab === sub.id ? `2px solid ${primaryColor}` : '1px solid #e2e8f0',
                  backgroundColor: accountSubTab === sub.id ? `${primaryColor}15` : '#ffffff',
                  color: accountSubTab === sub.id ? primaryColor : '#64748b',
                  cursor: 'pointer',
                }}
              >
                {sub.label}
              </button>
            ))}
          </div>

          {/* SEARCH & FILTER KELAS */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
            <input
              type="text"
              placeholder="Cari nama, username, nomor RFID..."
              value={accountSearch}
              onChange={(e) => setAccountSearch(e.target.value)}
              style={{ flex: 1, minWidth: '220px', padding: '8px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            />

            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              style={{ padding: '8px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#ffffff' }}
            >
              {classOptions.map((c) => (
                <option key={c} value={c}>
                  Kelas: {c}
                </option>
              ))}
            </select>
          </div>

          {/* TABEL PENGGUNA */}
          <div style={{ overflowX: 'auto', border: '1px solid #f1f5f9', borderRadius: '12px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '10px 12px' }}>Nama Pengguna</th>
                  <th style={{ padding: '10px 12px' }}>Peran / Role</th>
                  <th style={{ padding: '10px 12px' }}>UID Kartu RFID</th>
                  <th style={{ padding: '10px 12px' }}>Kelas / Jabatan</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Aksi Master</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.slice(0, 80).map((u) => {
                  const isMaster = u.roleBadge === 'Master';
                  const isAdminG = u.roleBadge === 'Admin Guru';
                  const isSisAdmin = u.roleBadge === 'Siswa Admin';

                  let badgeColor = '#64748b';
                  let badgeBg = '#f1f5f9';
                  if (isMaster) {
                    badgeColor = '#b45309';
                    badgeBg = '#fef3c7';
                  } else if (isAdminG) {
                    badgeColor = '#047857';
                    badgeBg = '#d1fae5';
                  } else if (isSisAdmin) {
                    badgeColor = '#c2410c';
                    badgeBg = '#ffedd5';
                  } else if (u.isGuru) {
                    badgeColor = '#1d4ed8';
                    badgeBg = '#dbeafe';
                  }

                  return (
                    <tr key={u.idKey} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 'bold', color: '#1e293b' }}>
                        {u.nama}
                        {u.username && <span style={{ display: 'block', fontSize: '10.5px', color: '#94a3b8', fontWeight: 'normal' }}>@{u.username}</span>}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span
                          style={{
                            backgroundColor: badgeBg,
                            color: badgeColor,
                            fontWeight: 'bold',
                            padding: '3px 8px',
                            borderRadius: '10px',
                            fontSize: '11px',
                            display: 'inline-block',
                          }}
                        >
                          {u.roleBadge}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#334155' }}>
                        {u.rfid || '-'}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#475569' }}>
                        {u.kelas || '-'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button
                            onClick={() => handleResetPassword(u, u.isGuru)}
                            style={{
                              backgroundColor: '#f1f5f9',
                              color: '#334155',
                              border: '1px solid #cbd5e1',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              cursor: 'pointer',
                              fontWeight: 'bold',
                            }}
                            title="Reset / Ubah Kata Sandi"
                          >
                            🔑 Password
                          </button>

                          {/* OPSI UBAH ROLE */}
                          {!isMaster && (
                            <select
                              value={u.roleBadge === 'Admin Guru' ? 'admin' : (u.roleBadge === 'Siswa Admin' ? 'siswa_admin' : (u.isGuru ? 'guru' : 'siswa'))}
                              onChange={(e) => handleChangeRole(u, u.isGuru, e.target.value)}
                              style={{
                                padding: '4px 6px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                fontSize: '11px',
                                backgroundColor: '#ffffff',
                                cursor: 'pointer',
                              }}
                            >
                              {u.isGuru ? (
                                <>
                                  <option value="guru">Guru Pengajar</option>
                                  <option value="admin">Admin Guru</option>
                                </>
                              ) : (
                                <>
                                  <option value="siswa">Siswa Biasa</option>
                                  <option value="siswa_admin">Siswa Admin</option>
                                </>
                              )}
                            </select>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: 📱 KELOLA PERANGKAT HP SISWA (BATAS 2 PERANGKAT)                    */}
      {/* ========================================================================= */}
      {activeTab === 'devices' && (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 'bold', color: primaryColor }}>
                Manajemen Batas 2 Perangkat Login Siswa (HP Siswa &amp; HP Ortu)
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#64748b' }}>
                Jika siswa berganti HP atau slot perangkat penuh, klik tombol &quot;Reset Slot&quot; agar siswa dapat masuk di HP barunya.
              </p>
            </div>
            <button
              onClick={fetchStudentDevices}
              style={{
                backgroundColor: '#f1f5f9',
                color: '#334155',
                border: '1px solid #cbd5e1',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              🔄 Muat Ulang Data Perangkat
            </button>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <input
              type="text"
              placeholder="Cari nama siswa atau tipe perangkat HP..."
              value={deviceSearch}
              onChange={(e) => setDeviceSearch(e.target.value)}
              style={{ width: '100%', padding: '8px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>

          {deviceLoading ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>Memuat daftar perangkat...</div>
          ) : (
            <div style={{ overflowX: 'auto', border: '1px solid #f1f5f9', borderRadius: '12px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '10px 12px' }}>Nama Siswa</th>
                    <th style={{ padding: '10px 12px' }}>Tipe Perangkat / Browser</th>
                    <th style={{ padding: '10px 12px' }}>ID Perangkat</th>
                    <th style={{ padding: '10px 12px' }}>Waktu Login Terakhir</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Aksi Reset</th>
                  </tr>
                </thead>
                <tbody>
                  {deviceList
                    .filter((d) => {
                      if (!deviceSearch.trim()) return true;
                      const q = deviceSearch.toLowerCase();
                      return (
                        String(d.nama_siswa || '').toLowerCase().includes(q) ||
                        String(d.device_name || '').toLowerCase().includes(q) ||
                        String(d.device_id || '').toLowerCase().includes(q)
                      );
                    })
                    .map((d) => (
                      <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 'bold', color: '#1e293b' }}>
                          {d.nama_siswa || 'Siswa'}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#475569' }}>
                          {d.device_name || 'HP Siswa'}
                        </td>
                        <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: '11px', color: '#64748b' }}>
                          {d.device_id}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#64748b', fontSize: '11.5px' }}>
                          {d.last_login ? new Date(d.last_login).toLocaleString('id-ID') : '-'}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <button
                            onClick={() => handleResetDevice(d.id, d.nama_siswa)}
                            style={{
                              backgroundColor: '#fee2e2',
                              color: '#dc2626',
                              border: '1px solid #fca5a5',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                            }}
                          >
                            Hapus Slot HP
                          </button>
                        </td>
                      </tr>
                    ))}
                  {deviceList.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                        Belum ada perangkat siswa yang terdaftar di database.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: 📊 AUDIT & LOG AKTIVITAS (REKAP HARIAN & LOG KEAMANAN)             */}
      {/* ========================================================================= */}
      {activeTab === 'audit' && (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 'bold', color: primaryColor }}>
                Log Audit &amp; Riwayat Perubahan Presensi
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#64748b' }}>
                Mencatat setiap kali status kehadiran siswa atau guru diubah oleh Admin/Guru Piket demi transparansi penuh.
              </p>
            </div>
            <button
              onClick={fetchAuditLogs}
              style={{
                backgroundColor: '#f1f5f9',
                color: '#334155',
                border: '1px solid #cbd5e1',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              🔄 Muat Ulang Log
            </button>
          </div>

          {auditLoading ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>Memuat riwayat audit...</div>
          ) : (
            <div style={{ overflowX: 'auto', border: '1px solid #f1f5f9', borderRadius: '12px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '10px 12px' }}>Waktu Perubahan</th>
                    <th style={{ padding: '10px 12px' }}>Diubah Oleh</th>
                    <th style={{ padding: '10px 12px' }}>Siswa / Guru Target</th>
                    <th style={{ padding: '10px 12px' }}>Status Lama</th>
                    <th style={{ padding: '10px 12px' }}>Status Baru</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 12px', color: '#64748b', fontSize: '11.5px' }}>
                        {log.created_at ? new Date(log.created_at).toLocaleString('id-ID') : '-'}
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 'bold', color: '#1e293b' }}>
                        {log.diubah_oleh} <span style={{ fontSize: '10px', color: '#94a3b8' }}>({log.role_pengubah || 'Admin'})</span>
                      </td>
                      <td style={{ padding: '10px 12px', color: '#334155', fontWeight: '500' }}>
                        {log.target_nama}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold' }}>
                          {log.status_lama || '-'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold' }}>
                          {log.status_baru || '-'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                        Belum ada aktivitas audit presensi yang tercatat.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
