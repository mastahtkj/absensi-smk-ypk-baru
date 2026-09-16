'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Swal from 'sweetalert2';
import { DEFAULT_BANNER_SLIDES, getYouTubeId, isVideoMedia } from './HomeBannerSlider';

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

  // 4. STATE MANAJEMEN AKUN & TAMBAH SISWA
  const [accountSubTab, setAccountSubTab] = useState('all'); // 'all', 'master', 'admin_guru', 'guru', 'siswa_admin', 'siswa'
  const [accountSearch, setAccountSearch] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('Semua');

  // STATE TAMBAH SISWA BARU PER KELAS (MASTER ADMIN)
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [studentAddMode, setStudentAddMode] = useState('single'); // 'single' | 'bulk'
  const [newStudentNama, setNewStudentNama] = useState('');
  const [newStudentKelas, setNewStudentKelas] = useState('X TJKT');
  const [newStudentCustomKelas, setNewStudentCustomKelas] = useState('');
  const [isCustomKelasSelected, setIsCustomKelasSelected] = useState(false);
  const [newStudentJurusan, setNewStudentJurusan] = useState('TJKT');
  const [newStudentRfid, setNewStudentRfid] = useState('');
  const [newStudentRole, setNewStudentRole] = useState('Siswa');
  const [newStudentPassword, setNewStudentPassword] = useState('siswa123');
  const [newStudentBulkText, setNewStudentBulkText] = useState('');
  const [isSubmittingStudent, setIsSubmittingStudent] = useState(false);

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
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('smk_ypk_home_banners');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {}
    }
    return DEFAULT_BANNER_SLIDES;
  });
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);

  const saveBannerSlidesToDb = async (updatedSlides) => {
    try {
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('smk_ypk_home_banners', JSON.stringify(updatedSlides));
        } catch (e) {}
      }

      if (supabase) {
        const payload = {
          id: 'school_config',
          teacher_slides: updatedSlides,
          home_banners: updatedSlides,
          updated_by: currentUser?.nama || 'Admin Master',
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from('app_settings')
          .upsert(payload, { onConflict: 'id' });

        if (error) {
          console.warn('Upsert app_settings warning, trying update:', error);
          await supabase.from('app_settings').update(payload).eq('id', 'school_config');
        }

        // 📡 Siarkan seketika ke seluruh HP siswa & laptop guru yang sedang aktif
        const broadcastSlidePayload = {
          teacher_slides: updatedSlides,
          home_banners: updatedSlides,
          timestamp: Date.now(),
        };
        try {
          supabase.channel('smk_ypk_presence_room').send({
            type: 'broadcast',
            event: 'banner_slides_updated',
            payload: broadcastSlidePayload,
          });
          supabase.channel('realtime:app_settings_sync').send({
            type: 'broadcast',
            event: 'banner_slides_updated',
            payload: broadcastSlidePayload,
          });
        } catch (e) {}

        if (onUpdateAppConfig) {
          onUpdateAppConfig({
            ...payload,
            home_banners: updatedSlides,
          });
        }
      }
    } catch (err) {
      console.warn('Gagal auto-save banner slide ke Supabase:', err);
    }
  };

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

  const bannerFileInputRef = useRef(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // FUNGSI UPLOAD FOTO/GAMBAR SLIDE DARI HP ATAU LAPTOP KE SERVER (RINGAN, CEPAT & SINKRON KE HP)
  const handleBannerFileChange = async (e, slideIndex) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      Swal.fire('Bukan Gambar', 'Harap pilih file gambar dengan format JPG, PNG, atau WEBP.', 'warning');
      return;
    }

    setIsUploadingPhoto(true);
    Swal.fire({
      title: 'Mengunggah Foto Slide...',
      text: `Memproses gambar untuk Slide #${slideIndex + 1}...`,
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('slideIndex', String(slideIndex));

      const res = await fetch('/api/upload-banner-video', {
        method: 'POST',
        body: formData,
      });

      const resData = await res.json().catch(() => ({}));

      let finalImageUrl = '';
      if (res.ok && resData.success && resData.url) {
        finalImageUrl = resData.url;
      } else {
        // Fallback ke canvas compression jika server offline
        const reader = new FileReader();
        const base64Fallback = await new Promise((resolve) => {
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(file);
        });
        finalImageUrl = base64Fallback;
      }

      const updated = [...bannerSlides];
      if (!updated[slideIndex]) {
        updated[slideIndex] = { id: slideIndex + 1, title: '', subtitle: '', image_url: '', caption: '', active: true, media_type: 'image' };
      }
      updated[slideIndex] = {
        ...updated[slideIndex],
        media_type: 'image',
        image_url: finalImageUrl,
        video_url: '',
      };
      setBannerSlides(updated);
      setIsUploadingPhoto(false);

      await saveBannerSlidesToDb(updated);

      Swal.fire({
        icon: 'success',
        title: 'Foto Slide Tersimpan! 📸',
        text: `Foto untuk Slide #${slideIndex + 1} berhasil disimpan dan langsung sinkron secara realtime ke HP & Laptop.`,
        timer: 2200,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error('Error uploading banner image:', err);
      setIsUploadingPhoto(false);
      Swal.fire('Gagal Menyimpan Foto', 'Terjadi kesalahan saat mengunggah foto ke server.', 'error');
    }

    if (e.target) e.target.value = '';
  };

  const videoFileInputRef = useRef(null);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);

  // FUNGSI UPLOAD VIDEO DARI HP ATAU LAPTOP (MP4/WebM) LANGSUNG KE SERVER (HD 1080P STREAMING & SINKRON KE HP)
  const handleBannerVideoChange = async (e, slideIndex) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      Swal.fire('Bukan Video', 'Harap pilih file video dengan format MP4 atau WEBM.', 'warning');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      Swal.fire({
        icon: 'warning',
        title: 'Ukuran Video Terlalu Besar',
        text: 'Ukuran file video melebihi 50MB. Disarankan memasukkan Link YouTube atau mengompresi video terlebih dahulu agar hemat kuota siswa.',
      });
      return;
    }

    setIsUploadingVideo(true);
    Swal.fire({
      title: 'Mengunggah Video HD...',
      html: `
        <div style="font-size: 13px; color: #475569; text-align: left; line-height: 1.5;">
          Sedang memproses video untuk <b>Slide #${slideIndex + 1}</b>.<br/>
          Video dioptimalkan untuk streaming cepat di Laptop &amp; HP tanpa buffering.
        </div>
      `,
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('slideIndex', String(slideIndex));

      const res = await fetch('/api/upload-banner-video', {
        method: 'POST',
        body: formData,
      });

      const resData = await res.json().catch(() => ({}));

      if (!res.ok || !resData.success || !resData.url) {
        throw new Error(resData.message || 'Gagal mengunggah file video ke server');
      }

      const cleanVideoUrl = resData.url;
      const updated = [...bannerSlides];
      if (!updated[slideIndex]) {
        updated[slideIndex] = { id: slideIndex + 1, title: '', subtitle: '', image_url: '', video_url: '', media_type: 'video', caption: '', active: true };
      }
      updated[slideIndex] = {
        ...updated[slideIndex],
        media_type: 'video',
        video_url: cleanVideoUrl,
        image_url: cleanVideoUrl,
      };
      setBannerSlides(updated);
      setIsUploadingVideo(false);

      await saveBannerSlidesToDb(updated);

      Swal.fire({
        icon: 'success',
        title: 'Video HD Berhasil Tersimpan! 🎬',
        html: `
          <div style="font-size: 13px; color: #334155; text-align: left; line-height: 1.5;">
            ✅ Video Slide #${slideIndex + 1} berhasil disimpan permanen di server.<br/>
            ✅ <b>Sinkronisasi Realtime:</b> Beranda di Laptop dan seluruh HP siswa/guru langsung memutar video HD ini secara otomatis!
          </div>
        `,
        timer: 2800,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error('Error uploading banner video:', err);
      setIsUploadingVideo(false);
      Swal.fire('Gagal Menyimpan Video', err.message || 'Terjadi kesalahan saat memproses file video.', 'error');
    }

    if (e.target) e.target.value = '';
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
        if (insErr) {
          const { error: updErr } = await supabase.from('app_settings').update(payload).eq('id', 'school_config');
          if (updErr) throw updErr;
        }
      }

      // 📡 Siarkan seketika ke seluruh HP & Laptop (Semua pengaturan: branding, teks berjalan, tema, slide, dll.)
      const fullBroadcastPayload = {
        ...payload,
        teacher_slides: bannerSlides,
        home_banners: bannerSlides,
        timestamp: Date.now(),
      };
      try {
        // Channel presence room (untuk pengguna & admin yang aktif)
        supabase.channel('smk_ypk_presence_room').send({
          type: 'broadcast',
          event: 'app_config_updated',
          payload: fullBroadcastPayload,
        });
        supabase.channel('smk_ypk_presence_room').send({
          type: 'broadcast',
          event: 'banner_slides_updated',
          payload: { teacher_slides: bannerSlides, home_banners: bannerSlides },
        });

        // Channel app_settings_sync (untuk HP siswa & beranda yang belum login)
        supabase.channel('realtime:app_settings_sync').send({
          type: 'broadcast',
          event: 'app_config_updated',
          payload: fullBroadcastPayload,
        });
        supabase.channel('realtime:app_settings_sync').send({
          type: 'broadcast',
          event: 'banner_slides_updated',
          payload: { teacher_slides: bannerSlides, home_banners: bannerSlides },
        });
      } catch (e) {}

      if (onUpdateAppConfig) {
        onUpdateAppConfig({
          ...payload,
          home_banners: bannerSlides,
        });
      }

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

        try {
          supabase.channel('smk_ypk_presence_room').send({
            type: 'broadcast',
            event: 'user_data_updated',
            payload: {
              user_id: user.id,
              rawId: targetId,
              isGuru: isGuru,
              password: cleanPass,
            },
          });
        } catch (e) {}

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

      try {
        supabase.channel('smk_ypk_presence_room').send({
          type: 'broadcast',
          event: 'user_data_updated',
          payload: {
            user_id: user.id,
            rawId: targetId,
            isGuru: isGuru,
            role: newRole,
          },
        });
      } catch (e) {}

      Swal.fire('Sukses', `Peran berhasil diubah menjadi: ${newRole}`, 'success');
      if (onRefreshData) onRefreshData();
    } catch (err) {
      Swal.fire('Gagal', err.message, 'error');
    }
  };

  // DAFTAR KELAS STANDAR & HELPER JURUSAN
  const STANDARD_CLASSES = useMemo(() => [
    'X TJKT', 'X MPLB', 'X AKL', 'X PM',
    'XI TJKT', 'XI MPLB', 'XI AKL', 'XI PM',
    'XII TJKT', 'XII MPLB', 'XII AKL', 'XII PM',
  ], []);

  const deriveJurusanFromClass = (className = '') => {
    const upper = String(className).toUpperCase();
    if (upper.includes('TJKT') || upper.includes('TKJ')) return 'TJKT';
    if (upper.includes('MPLB') || upper.includes('OTKP')) return 'MPLB';
    if (upper.includes('AKL') || upper.includes('AK')) return 'AKL';
    if (upper.includes('PM') || upper.includes('PEMASARAN') || upper.includes('BDP')) return 'PM';
    return 'TJKT';
  };

  const allClassesForSelection = useMemo(() => {
    const set = new Set(STANDARD_CLASSES);
    siswaList.forEach((s) => {
      if (!s.isGuru && s.kelas && s.kelas !== '-' && !s.kelas.toLowerCase().includes('guru')) {
        set.add(s.kelas.trim());
      }
    });
    return Array.from(set);
  }, [siswaList, STANDARD_CLASSES]);

  const handleClassChange = (selected) => {
    if (selected === '__CUSTOM__') {
      setIsCustomKelasSelected(true);
    } else {
      setIsCustomKelasSelected(false);
      setNewStudentKelas(selected);
      setNewStudentJurusan(deriveJurusanFromClass(selected));
    }
  };

  const handleCustomClassChange = (val) => {
    setNewStudentCustomKelas(val);
    setNewStudentJurusan(deriveJurusanFromClass(val));
  };

  // EDIT DATA SISWA OLEH MASTER ADMIN
  const handleEditStudent = async (student) => {
    const currentNama = student.nama || student.nama_siswa || '';
    const currentKelas = student.kelas || 'X TJKT';
    const currentRfid = (student.rfid && student.rfid !== '-') ? student.rfid : (student.rfid_uid || student.uid_rfid || '');

    const { value: formValues } = await Swal.fire({
      title: `Edit Data Siswa`,
      html: `
        <div style="text-align: left; font-size: 13px; color: #334155;">
          <label style="font-weight: bold; display: block; margin-bottom: 4px;">Nama Lengkap Siswa:</label>
          <input id="swal-edit-nama" class="swal2-input" style="margin: 0 0 12px 0; width: 100%; box-sizing: border-box; text-transform: uppercase;" value="${currentNama.replace(/"/g, '&quot;')}" placeholder="NAMA LENGKAP" />
          
          <label style="font-weight: bold; display: block; margin-bottom: 4px;">Kelas Siswa:</label>
          <input id="swal-edit-kelas" class="swal2-input" style="margin: 0 0 12px 0; width: 100%; box-sizing: border-box; text-transform: uppercase;" value="${currentKelas.replace(/"/g, '&quot;')}" placeholder="Contoh: X TJKT" />
          
          <label style="font-weight: bold; display: block; margin-bottom: 4px;">UID RFID Kartu (Kosongkan jika belum ada):</label>
          <input id="swal-edit-rfid" class="swal2-input" style="margin: 0 0 6px 0; width: 100%; box-sizing: border-box; text-transform: uppercase; font-family: monospace;" value="${currentRfid.replace(/"/g, '&quot;')}" placeholder="Contoh: A1B2C3D4" />
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonColor: primaryColor,
      cancelButtonColor: '#64748b',
      confirmButtonText: '💾 Simpan Perubahan',
      cancelButtonText: 'Batal',
      preConfirm: () => {
        const nama = document.getElementById('swal-edit-nama')?.value;
        const kelas = document.getElementById('swal-edit-kelas')?.value;
        const rfid = document.getElementById('swal-edit-rfid')?.value;
        if (!nama || !nama.trim()) {
          Swal.showValidationMessage('Nama siswa tidak boleh kosong!');
          return false;
        }
        if (!kelas || !kelas.trim()) {
          Swal.showValidationMessage('Kelas siswa tidak boleh kosong!');
          return false;
        }
        return {
          nama: nama.trim().toUpperCase(),
          kelas: kelas.trim().toUpperCase(),
          rfid: rfid && rfid.trim() ? rfid.trim().toUpperCase() : null,
        };
      },
    });

    if (formValues) {
      try {
        const targetId = student.rawId || student.id_siswa || String(student.id).replace(/\D/g, '');
        const derivedJurusan = deriveJurusanFromClass(formValues.kelas);
        const { error } = await supabase
          .from('tb_siswa')
          .update({
            nama_siswa: formValues.nama,
            kelas: formValues.kelas,
            jurusan: derivedJurusan,
            uid_rfid: formValues.rfid,
            rfid_uid: formValues.rfid,
          })
          .eq('id_siswa', targetId);

        if (error) throw error;

        try {
          supabase.channel('smk_ypk_presence_room').send({
            type: 'broadcast',
            event: 'user_data_updated',
            payload: {
              user_id: student.id,
              rawId: targetId,
              isGuru: false,
              nama: formValues.nama,
              kelas: formValues.kelas,
              jurusan: derivedJurusan,
              uid_rfid: formValues.rfid,
              rfid_uid: formValues.rfid,
            },
          });
        } catch (e) {}

        Swal.fire({
          icon: 'success',
          title: 'Perubahan Tersimpan!',
          text: `Data siswa ${formValues.nama} di kelas ${formValues.kelas} berhasil diperbarui di database.`,
          timer: 1800,
          showConfirmButton: false,
        });

        if (onRefreshData) onRefreshData();
      } catch (err) {
        Swal.fire('Gagal Memperbarui', err.message || 'Terjadi kesalahan sistem.', 'error');
      }
    }
  };

  // EDIT DATA GURU OLEH MASTER ADMIN
  const handleEditTeacher = async (teacher) => {
    const currentNama = teacher.nama || teacher.nama_guru || '';
    const currentInisial = teacher.inisial || '';
    const currentMapel = teacher.mapel || '';
    const currentNip = teacher.nip || '';
    const currentRfid = (teacher.rfid && teacher.rfid !== '-') ? teacher.rfid : (teacher.rfid_uid || teacher.uid_rfid || '');

    const { value: formValues } = await Swal.fire({
      title: `Edit Data Guru`,
      html: `
        <div style="text-align: left; font-size: 13px; color: #334155;">
          <label style="font-weight: bold; display: block; margin-bottom: 4px;">Nama Lengkap Guru / Tenaga Pendidik:</label>
          <input id="swal-edit-guru-nama" class="swal2-input" style="margin: 0 0 12px 0; width: 100%; box-sizing: border-box;" value="${currentNama.replace(/"/g, '&quot;')}" placeholder="NAMA LENGKAP & GELAR" />
          
          <div style="display: flex; gap: 8px; margin-bottom: 12px;">
            <div style="flex: 1;">
              <label style="font-weight: bold; display: block; margin-bottom: 4px;">Inisial (2-4 Huruf):</label>
              <input id="swal-edit-guru-inisial" class="swal2-input" style="margin: 0; width: 100%; box-sizing: border-box; text-transform: uppercase;" value="${currentInisial.replace(/"/g, '&quot;')}" placeholder="Contoh: IR" />
            </div>
            <div style="flex: 2;">
              <label style="font-weight: bold; display: block; margin-bottom: 4px;">Mata Pelajaran (Mapel):</label>
              <input id="swal-edit-guru-mapel" class="swal2-input" style="margin: 0; width: 100%; box-sizing: border-box;" value="${currentMapel.replace(/"/g, '&quot;')}" placeholder="Contoh: Informatika / TJKT" />
            </div>
          </div>

          <label style="font-weight: bold; display: block; margin-bottom: 4px;">NIP / NUPTK:</label>
          <input id="swal-edit-guru-nip" class="swal2-input" style="margin: 0 0 12px 0; width: 100%; box-sizing: border-box;" value="${currentNip.replace(/"/g, '&quot;')}" placeholder="NIP / NUPTK (Opsional)" />
          
          <label style="font-weight: bold; display: block; margin-bottom: 4px;">UID RFID Kartu Guru:</label>
          <input id="swal-edit-guru-rfid" class="swal2-input" style="margin: 0 0 6px 0; width: 100%; box-sizing: border-box; text-transform: uppercase; font-family: monospace;" value="${currentRfid.replace(/"/g, '&quot;')}" placeholder="Contoh: 92006F96" />
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonColor: primaryColor,
      cancelButtonColor: '#64748b',
      confirmButtonText: '💾 Simpan Data Guru',
      cancelButtonText: 'Batal',
      preConfirm: () => {
        const nama = document.getElementById('swal-edit-guru-nama')?.value;
        const inisial = document.getElementById('swal-edit-guru-inisial')?.value;
        const mapel = document.getElementById('swal-edit-guru-mapel')?.value;
        const nip = document.getElementById('swal-edit-guru-nip')?.value;
        const rfid = document.getElementById('swal-edit-guru-rfid')?.value;
        if (!nama || !nama.trim()) {
          Swal.showValidationMessage('Nama guru tidak boleh kosong!');
          return false;
        }
        return {
          nama: nama.trim(),
          inisial: inisial ? inisial.trim().toUpperCase() : '',
          mapel: mapel ? mapel.trim() : '',
          nip: nip ? nip.trim() : '',
          rfid: rfid && rfid.trim() ? rfid.trim().toUpperCase() : null,
        };
      },
    });

    if (formValues) {
      try {
        const targetId = teacher.rawId || teacher.id_guru || String(teacher.id).replace(/\D/g, '');
        const { error } = await supabase
          .from('tb_guru')
          .update({
            nama_guru: formValues.nama,
            inisial: formValues.inisial,
            mapel: formValues.mapel,
            nip: formValues.nip,
            uid_rfid: formValues.rfid,
            rfid_uid: formValues.rfid,
          })
          .eq('id_guru', targetId);

        if (error) throw error;

        try {
          supabase.channel('smk_ypk_presence_room').send({
            type: 'broadcast',
            event: 'user_data_updated',
            payload: {
              user_id: teacher.id,
              rawId: targetId,
              isGuru: true,
              nama: formValues.nama,
              inisial: formValues.inisial,
              mapel: formValues.mapel,
              nip: formValues.nip,
              uid_rfid: formValues.rfid,
              rfid_uid: formValues.rfid,
            },
          });
        } catch (e) {}

        Swal.fire({
          icon: 'success',
          title: 'Data Guru Diperbarui!',
          text: `Data ${formValues.nama} berhasil diperbarui di database dan aktif seketika di seluruh perangkat.`,
          timer: 1800,
          showConfirmButton: false,
        });

        if (onRefreshData) onRefreshData();
      } catch (err) {
        Swal.fire('Gagal Memperbarui', err.message || 'Terjadi kesalahan sistem.', 'error');
      }
    }
  };

  // HAPUS DATA SISWA OLEH MASTER ADMIN
  const handleDeleteStudent = async (student) => {
    const targetName = student.nama || student.nama_siswa || 'Siswa';
    const targetKelas = student.kelas || '-';
    const confirm = await Swal.fire({
      title: `Hapus Siswa Ini?`,
      html: `Apakah Anda yakin ingin menghapus data <b>${targetName}</b> (Kelas: ${targetKelas}) dari sistem?<br/><small style="color: #dc2626;">Tindakan ini permanen dan akan menghapus akun siswa dari database.</small>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus Siswa',
      cancelButtonText: 'Batal',
    });

    if (confirm.isConfirmed) {
      try {
        const targetId = student.rawId || student.id_siswa || String(student.id).replace(/\D/g, '');
        const { error } = await supabase.from('tb_siswa').delete().eq('id_siswa', targetId);
        if (error) throw error;

        try {
          supabase.channel('smk_ypk_presence_room').send({
            type: 'broadcast',
            event: 'user_data_deleted',
            payload: {
              user_id: student.id,
              rawId: targetId,
              isGuru: false,
            },
          });
        } catch (e) {}

        Swal.fire({
          icon: 'success',
          title: 'Siswa Dihapus',
          text: `Data ${targetName} berhasil dihapus dari database.`,
          timer: 1800,
          showConfirmButton: false,
        });

        if (onRefreshData) onRefreshData();
      } catch (err) {
        Swal.fire('Gagal Menghapus', err.message || 'Terjadi kesalahan saat menghapus.', 'error');
      }
    }
  };

  // SIMPAN SISWA BARU PER KELAS OLEH MASTER ADMIN (SINGLE & BULK)
  const handleSaveNewStudent = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!supabase) {
      Swal.fire('Error', 'Koneksi Supabase tidak tersedia.', 'error');
      return;
    }

    const finalKelas = isCustomKelasSelected
      ? newStudentCustomKelas.trim().toUpperCase()
      : newStudentKelas.trim().toUpperCase();

    if (!finalKelas) {
      Swal.fire('Peringatan', 'Silakan pilih atau ketik kelas untuk siswa baru!', 'warning');
      return;
    }

    setIsSubmittingStudent(true);

    try {
      const cleanJurusan = newStudentJurusan || deriveJurusanFromClass(finalKelas);

      if (studentAddMode === 'single') {
        const cleanNama = newStudentNama.trim().replace(/[\(\)\[\]\{\}\-\/\:]/g, ' ').replace(/\s+/g, ' ').toUpperCase();
        if (!cleanNama) {
          Swal.fire('Nama Kosong', 'Silakan masukkan nama lengkap siswa.', 'warning');
          setIsSubmittingStudent(false);
          return;
        }

        const cleanRfid = newStudentRfid.trim() ? newStudentRfid.trim().toUpperCase() : null;
        const cleanRole = newStudentRole || 'Siswa';
        const cleanPassword = newStudentPassword.trim() || 'siswa123';

        const payload = {
          nama_siswa: cleanNama,
          kelas: finalKelas,
          jurusan: cleanJurusan,
          uid_rfid: cleanRfid,
          role: cleanRole,
          password: cleanPassword,
        };

        let { error } = await supabase.from('tb_siswa').insert([payload]);
        if (error && error.message && error.message.toLowerCase().includes('password')) {
          delete payload.password;
          const retry = await supabase.from('tb_siswa').insert([payload]);
          error = retry.error;
        }

        if (error) throw error;

        try {
          supabase.channel('smk_ypk_presence_room').send({
            type: 'broadcast',
            event: 'user_data_updated',
            payload: {
              isGuru: false,
              nama: cleanNama,
              kelas: finalKelas,
              jurusan: cleanJurusan,
              uid_rfid: cleanRfid,
            },
          });
        } catch (e) {}

        Swal.fire({
          icon: 'success',
          title: 'Siswa Berhasil Ditambahkan! 🎉',
          html: `
            <div style="text-align: left; font-size: 13px; color: #334155; line-height: 1.6;">
              ✅ <b>Nama:</b> ${cleanNama}<br/>
              ✅ <b>Kelas:</b> ${finalKelas}<br/>
              ✅ <b>Jurusan:</b> ${cleanJurusan}<br/>
              ${cleanRfid ? `✅ <b>RFID:</b> ${cleanRfid}<br/>` : ''}
              ✅ <b>Hak Akses:</b> ${cleanRole}<br/>
              <span style="color: #16a34a; font-weight: bold;">Data langsung aktif seketika di sistem cloud.</span>
            </div>
          `,
          timer: 2800,
          showConfirmButton: false,
        });

        setNewStudentNama('');
        setNewStudentRfid('');
        setNewStudentPassword('siswa123');
        setShowAddStudentModal(false);
        if (onRefreshData) onRefreshData();

      } else {
        // MODE BANYAK SISWA SEKALIGUS (BULK COPAS)
        if (!newStudentBulkText.trim()) {
          Swal.fire('Daftar Kosong', 'Silakan tempel minimal 1 nama siswa pada kotak teks.', 'warning');
          setIsSubmittingStudent(false);
          return;
        }

        const lines = newStudentBulkText
          .split('\n')
          .map((l) => l.replace(/[\(\)\[\]\{\}\-\/\:]/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase())
          .filter((l) => l.length > 0);

        if (lines.length === 0) {
          Swal.fire('Daftar Kosong', 'Tidak ada nama siswa yang valid ditemukan.', 'warning');
          setIsSubmittingStudent(false);
          return;
        }

        const bulkRows = lines.map((name) => ({
          nama_siswa: name,
          kelas: finalKelas,
          jurusan: cleanJurusan,
          uid_rfid: null,
          role: 'Siswa',
          password: 'siswa123',
        }));

        let { error } = await supabase.from('tb_siswa').insert(bulkRows);
        if (error && error.message && error.message.toLowerCase().includes('password')) {
          const fallbackRows = bulkRows.map((r) => {
            const c = { ...r };
            delete c.password;
            return c;
          });
          const retry = await supabase.from('tb_siswa').insert(fallbackRows);
          error = retry.error;
        }

        if (error) throw error;

        try {
          supabase.channel('smk_ypk_presence_room').send({
            type: 'broadcast',
            event: 'user_data_updated',
            payload: {
              isGuru: false,
              kelas: finalKelas,
              jurusan: cleanJurusan,
              bulkCount: bulkRows.length,
            },
          });
        } catch (e) {}

        Swal.fire({
          icon: 'success',
          title: `${bulkRows.length} Siswa Berhasil Ditambahkan! 🎉`,
          text: `Seluruh siswa baru telah didaftarkan ke kelas ${finalKelas} (${cleanJurusan}).`,
          timer: 2800,
          showConfirmButton: false,
        });

        setNewStudentBulkText('');
        setShowAddStudentModal(false);
        if (onRefreshData) onRefreshData();
      }
    } catch (err) {
      console.error('Error adding student:', err);
      Swal.fire({
        icon: 'error',
        title: 'Gagal Menambahkan Siswa',
        text: err.message || 'Terjadi kesalahan saat menyimpan data ke Supabase.',
      });
    } finally {
      setIsSubmittingStudent(false);
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
      const isMaster =
        g.role === 'master' ||
        ['iqbal', 'hendrawan', 'fauzi', 'yenni', 'hartati', 'dede', 'jafar', 'savina'].includes(gUser) ||
        ['92006F96', 'BADFD805', '990BD705', 'DB1FD705', 'B9D9D805', 'D916D905', 'AA1BDB05', '99ACD805'].includes((g.rfid_uid || g.uid_rfid || '').toUpperCase().trim()) ||
        [2, 3, 4, 5, 9, 27, 29, 32].includes(Number(g.id_guru || g.rawId || String(g.id || '').replace(/\D/g, ''))) ||
        gNama.includes('iqbal') ||
        gNama.includes('hendrawan') ||
        gNama.includes('fauzi') ||
        gNama.replace(/\s+/g, '').includes('yenni') ||
        gNama.includes('hartati') ||
        gNama.includes('patiwael') ||
        gNama.includes('dede') ||
        gNama.includes('dermawan') ||
        gNama.includes('jafar') ||
        gNama.includes('ismail') ||
        gNama.includes('savina');
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

          {/* ⚡ SHORTCUT CEPAT MASTER ADMIN */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => {
                setActiveTab('accounts');
                setShowAddStudentModal(true);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#16a34a',
                color: '#ffffff',
                padding: '10px 18px',
                borderRadius: '12px',
                fontWeight: 'bold',
                fontSize: '13px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(22, 163, 74, 0.4)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#15803d')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#16a34a')}
            >
              <span style={{ fontSize: '15px' }}>➕</span> Tambah Siswa Baru per Kelas
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('accounts')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                padding: '10px 16px',
                borderRadius: '12px',
                fontWeight: '600',
                fontSize: '13px',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <span>👥</span> Kelola Siswa per Kelas ({siswaList.length} Siswa)
            </button>
          </div>
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
          { id: 'accounts', label: '👥 Siswa per Kelas & Akun', desc: 'Tambah Siswa, Role & Password' },
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
              const isVideo = isVideoMedia(slide) || slide.media_type === 'video';
              const hasMedia = Boolean(slide.video_url || slide.image_url);
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedSlideIndex(idx)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '12px',
                    fontSize: '12.5px',
                    fontWeight: 'bold',
                    border: isSelected ? `2px solid ${isVideo ? '#ef4444' : primaryColor}` : '1px solid #cbd5e1',
                    backgroundColor: isSelected ? (isVideo ? '#fef2f2' : `${primaryColor}15`) : '#f8fafc',
                    color: isSelected ? (isVideo ? '#dc2626' : primaryColor) : '#475569',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: isSelected ? `0 2px 8px ${isVideo ? '#ef444430' : primaryColor + '25'}` : 'none',
                  }}
                >
                  <span>{isSelected ? '⭐' : isVideo ? '🎬' : hasMedia ? '📷' : '🖼️'}</span>
                  <span>Slide #{idx + 1}: {slide.title ? (slide.title.length > 18 ? slide.title.substring(0, 18) + '...' : slide.title) : (isVideo ? `Video ${idx + 1}` : `Slide ${idx + 1}`)}</span>
                  {hasMedia && (
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: isVideo ? '#ef4444' : '#22c55e', display: 'inline-block' }} title={isVideo ? 'Sudah ada video' : 'Sudah ada foto'} />
                  )}
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
              video_url: '',
              media_type: 'image',
              caption: '',
              active: true,
            };
            const isVideo = isVideoMedia(currentSlide) || currentSlide.media_type === 'video';
            const mediaUrl = currentSlide.video_url || currentSlide.image_url || '';
            const ytId = getYouTubeId(mediaUrl);

            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                {/* KOLOM KIRI: FORM INPUT */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* 🔘 PILIHAN TIPE MEDIA: GAMBAR vs VIDEO */}
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '6px' }}>
                      Pilih Jenis Konten Slide #{selectedSlideIndex + 1}:
                    </label>
                    <div style={{ display: 'flex', gap: '8px', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
                      <button
                        type="button"
                        onClick={() => handleUpdateSlide(selectedSlideIndex, 'media_type', 'image')}
                        style={{
                          flex: 1,
                          padding: '9px 12px',
                          borderRadius: '9px',
                          fontSize: '12.5px',
                          fontWeight: '800',
                          border: 'none',
                          backgroundColor: !isVideo ? '#ffffff' : 'transparent',
                          color: !isVideo ? primaryColor : '#64748b',
                          boxShadow: !isVideo ? '0 2px 6px rgba(0,0,0,0.1)' : 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span>🖼️</span>
                        <span>Gambar / Brosur</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateSlide(selectedSlideIndex, 'media_type', 'video')}
                        style={{
                          flex: 1,
                          padding: '9px 12px',
                          borderRadius: '9px',
                          fontSize: '12.5px',
                          fontWeight: '800',
                          border: 'none',
                          backgroundColor: isVideo ? '#ef4444' : 'transparent',
                          color: isVideo ? '#ffffff' : '#64748b',
                          boxShadow: isVideo ? '0 2px 8px rgba(239, 68, 68, 0.35)' : 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span>🎬</span>
                        <span>Video (YouTube / MP4)</span>
                      </button>
                    </div>
                  </div>

                  {/* JIKA MEMILIH VIDEO */}
                  {isVideo ? (
                    <div
                      style={{
                        border: '2px dashed #ef4444',
                        borderRadius: '14px',
                        padding: '16px',
                        backgroundColor: '#fef2f2',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        boxShadow: '0 2px 8px rgba(239, 68, 68, 0.08)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                          <span>🎬</span>
                          <span>Pengaturan Video Slide #{selectedSlideIndex + 1}:</span>
                        </label>
                        {mediaUrl ? (
                          <span style={{ fontSize: '10.5px', fontWeight: 'bold', color: '#16a34a', backgroundColor: '#dcfce7', padding: '2px 8px', borderRadius: '6px', border: '1px solid #86efac' }}>
                            {ytId ? '✓ Link YouTube Aktif' : '✓ Video MP4 Siap'}
                          </span>
                        ) : (
                          <span style={{ fontSize: '10.5px', fontWeight: 'bold', color: '#d97706', backgroundColor: '#fef3c7', padding: '2px 8px', borderRadius: '6px', border: '1px solid #fde68a' }}>
                            Belum Ada Video
                          </span>
                        )}
                      </div>

                      <p style={{ margin: 0, fontSize: '11.5px', color: '#475569', lineHeight: 1.4 }}>
                        Slide ini akan berputar otomatis setiap 7 detik di beranda portal. Masukkan tautan <b>YouTube</b> atau upload file <b>MP4</b> langsung dari perangkat Anda.
                      </p>

                      {/* INPUT LINK YOUTUBE ATAU URL VIDEO */}
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '5px' }}>
                          🔗 Tautan Video YouTube / URL MP4:
                        </label>
                        <input
                          type="text"
                          value={currentSlide.video_url || currentSlide.image_url || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            handleUpdateSlide(selectedSlideIndex, 'video_url', val);
                            handleUpdateSlide(selectedSlideIndex, 'image_url', val);
                          }}
                          placeholder="https://www.youtube.com/watch?v=... atau https://youtu.be/..."
                          style={{
                            width: '100%',
                            padding: '9px 12px',
                            borderRadius: '10px',
                            border: '1px solid #fca5a5',
                            fontSize: '12.5px',
                            backgroundColor: '#ffffff',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>

                      {/* INPUT FILE VIDEO & TOMBOL UPLOAD */}
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <input
                          type="file"
                          ref={videoFileInputRef}
                          accept="video/mp4,video/webm,video/*"
                          onChange={(e) => handleBannerVideoChange(e, selectedSlideIndex)}
                          style={{ display: 'none' }}
                        />

                        <button
                          type="button"
                          onClick={() => videoFileInputRef.current?.click()}
                          disabled={isUploadingVideo}
                          style={{
                            backgroundColor: '#dc2626',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '10px',
                            padding: '9px 16px',
                            fontSize: '12.5px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 3px 10px rgba(220, 38, 38, 0.3)',
                          }}
                        >
                          <span>{isUploadingVideo ? '⏳' : '📤'}</span>
                          <span>{isUploadingVideo ? 'Memproses Video...' : 'Pilih File Video (MP4/WebM)'}</span>
                        </button>

                        {mediaUrl && (
                          <button
                            type="button"
                            onClick={async () => {
                              const updated = [...bannerSlides];
                              if (updated[selectedSlideIndex]) {
                                updated[selectedSlideIndex] = {
                                  ...updated[selectedSlideIndex],
                                  image_url: '',
                                  video_url: '',
                                };
                                setBannerSlides(updated);
                                await saveBannerSlidesToDb(updated);
                              }
                            }}
                            style={{
                              backgroundColor: '#fee2e2',
                              color: '#dc2626',
                              border: '1px solid #fecaca',
                              borderRadius: '10px',
                              padding: '9px 14px',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span>🗑️</span>
                            <span>Hapus Video</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* JIKA MEMILIH GAMBAR */
                    <>
                      <div
                        style={{
                          border: '2px dashed #3b82f6',
                          borderRadius: '14px',
                          padding: '16px',
                          backgroundColor: '#eff6ff',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          boxShadow: '0 2px 8px rgba(37, 99, 235, 0.08)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                          <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                            <span>📸</span>
                            <span>Upload Foto / Gambar Slide #{selectedSlideIndex + 1}:</span>
                          </label>
                          {currentSlide.image_url ? (
                            <span style={{ fontSize: '10.5px', fontWeight: 'bold', color: '#16a34a', backgroundColor: '#dcfce7', padding: '2px 8px', borderRadius: '6px', border: '1px solid #86efac' }}>
                              ✓ Foto Siap Ditampilkan
                            </span>
                          ) : (
                            <span style={{ fontSize: '10.5px', fontWeight: 'bold', color: '#d97706', backgroundColor: '#fef3c7', padding: '2px 8px', borderRadius: '6px', border: '1px solid #fde68a' }}>
                              Belum Ada Foto
                            </span>
                          )}
                        </div>

                        <p style={{ margin: 0, fontSize: '11.5px', color: '#475569', lineHeight: 1.4 }}>
                          Tekan tombol di bawah untuk memilih foto langsung dari <b>galeri HP</b> atau <b>folder komputer/laptop</b> Anda. Gambar otomatis dioptimalkan agar ringan dan cepat saat dibuka oleh siswa.
                        </p>

                        {/* INPUT FILE TERSEMBUNYI & TOMBOL PILIH FOTO */}
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                          <input
                            type="file"
                            ref={bannerFileInputRef}
                            accept="image/*"
                            onChange={(e) => handleBannerFileChange(e, selectedSlideIndex)}
                            style={{ display: 'none' }}
                          />

                          <button
                            type="button"
                            onClick={() => bannerFileInputRef.current?.click()}
                            disabled={isUploadingPhoto}
                            style={{
                              backgroundColor: '#2563eb',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '10px',
                              padding: '10px 18px',
                              fontSize: '13px',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '8px',
                              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <span style={{ fontSize: '15px' }}>{isUploadingPhoto ? '⏳' : '📤'}</span>
                            <span>{isUploadingPhoto ? 'Memproses Foto...' : currentSlide.image_url ? 'Ganti / Upload Foto Baru' : 'Pilih Foto dari HP / Komputer'}</span>
                          </button>

                          {currentSlide.image_url && (
                            <button
                              type="button"
                              onClick={async () => {
                                const updated = [...bannerSlides];
                                if (updated[selectedSlideIndex]) {
                                  updated[selectedSlideIndex] = { ...updated[selectedSlideIndex], image_url: '' };
                                  setBannerSlides(updated);
                                  await saveBannerSlidesToDb(updated);
                                }
                              }}
                              style={{
                                backgroundColor: '#fee2e2',
                                color: '#dc2626',
                                border: '1px solid #fecaca',
                                borderRadius: '10px',
                                padding: '10px 14px',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                              title="Hapus foto saat ini"
                            >
                              <span>🗑️</span>
                              <span>Hapus Foto</span>
                            </button>
                          )}
                        </div>

                        {/* PRATINJAU MINI FOTO YANG DIPILIH */}
                        {currentSlide.image_url && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#ffffff', padding: '8px 12px', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
                            <div style={{ width: '64px', height: '38px', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#0f172a', flexShrink: 0, border: '1px solid #cbd5e1' }}>
                              <img
                                src={currentSlide.image_url}
                                alt="Mini preview"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#1e293b', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {currentSlide.image_url.startsWith('data:') ? 'Foto dari Unggahan Perangkat (Base64)' : currentSlide.image_url}
                              </span>
                              <span style={{ fontSize: '10px', color: '#059669', fontWeight: 'bold' }}>
                                ✓ Siap Disimpan &amp; Tampil di Beranda
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* PRESET CEPAT BANNER YPK */}
                      <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px' }}>
                        <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 'bold', color: '#475569', marginBottom: '6px' }}>
                          ⚡ Atau Pilih Cepat dari Arsip Gambar Resmi:
                        </label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              handleUpdateSlide(selectedSlideIndex, 'image_url', '/banner-spmb-ypk.png');
                              if (!currentSlide.title) handleUpdateSlide(selectedSlideIndex, 'title', 'SPMB SMK YPK MEDAN 2025/2026');
                              if (!currentSlide.subtitle) handleUpdateSlide(selectedSlideIndex, 'subtitle', 'Sistem Penerimaan Murid Baru • Akreditasi A');
                            }}
                            style={{ padding: '5px 10px', fontSize: '11.5px', borderRadius: '6px', border: '1px solid #86efac', backgroundColor: '#f0fdf4', color: '#166534', fontWeight: 'bold', cursor: 'pointer' }}
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
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>
                          Tautan / URL Gambar (Alternatif / Opsional):
                        </label>
                        <input
                          type="text"
                          value={currentSlide.image_url || ''}
                          onChange={(e) => handleUpdateSlide(selectedSlideIndex, 'image_url', e.target.value)}
                          placeholder="https://... atau /banner-spmb-ypk.png (Otomatis terisi jika upload foto)"
                          style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#f8fafc' }}
                        />
                      </div>
                    </>
                  )}

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
                    <span style={{ fontSize: '10.5px', color: isVideo ? '#dc2626' : '#16a34a', backgroundColor: isVideo ? '#fee2e2' : '#dcfce7', padding: '2px 8px', borderRadius: '6px', fontWeight: 'bold' }}>
                      {isVideo ? '🎬 Video' : '📸 Slide'} {selectedSlideIndex + 1} dari 5
                    </span>
                  </div>

                  {/* KARTU BANNER HORIZONTAL */}
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
                    {/* MEDIA BANNER (GAMBAR ATAU VIDEO) */}
                    <div
                      style={{ width: '100%', height: '190px', position: 'relative', overflow: 'hidden', backgroundColor: '#0f172a' }}
                    >
                      {isVideo ? (
                        ytId ? (
                          <iframe
                            src={`https://www.youtube-nocookie.com/embed/${ytId}?autoplay=0&controls=1&rel=0`}
                            title="Preview Video Slide"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            style={{ width: '100%', height: '100%', border: 'none' }}
                          />
                        ) : mediaUrl ? (
                          <video
                            src={mediaUrl}
                            controls
                            style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#000000' }}
                          />
                        ) : (
                          <div
                            onClick={() => videoFileInputRef.current?.click()}
                            style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#f87171', gap: '6px', cursor: 'pointer' }}
                          >
                            <span style={{ fontSize: '36px' }}>🎬</span>
                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#ffffff' }}>Klik di sini untuk Memilih Video Slide #{selectedSlideIndex + 1}</span>
                            <span style={{ fontSize: '11px', color: '#cbd5e1' }}>Bisa masukkan link YouTube atau upload file MP4</span>
                          </div>
                        )
                      ) : (
                        currentSlide.image_url ? (
                          <img
                            src={currentSlide.image_url}
                            alt={currentSlide.title || 'Banner Slide'}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div
                            onClick={() => bannerFileInputRef.current?.click()}
                            style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', gap: '6px', cursor: 'pointer' }}
                          >
                            <span style={{ fontSize: '34px' }}>📷</span>
                            <span style={{ fontSize: '12.5px', fontWeight: 'bold', color: '#ffffff' }}>Klik di sini untuk Upload Foto Slide #{selectedSlideIndex + 1}</span>
                            <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>Dapat dipilih dari galeri HP atau folder laptop</span>
                          </div>
                        )
                      )}

                      {/* BADGE TIPE DI POJOK KANAN ATAS */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '10px',
                          right: '10px',
                          backgroundColor: isVideo ? 'rgba(220, 38, 38, 0.85)' : 'rgba(15, 23, 42, 0.75)',
                          backdropFilter: 'blur(4px)',
                          color: '#ffffff',
                          padding: '3px 9px',
                          borderRadius: '8px',
                          fontSize: '10px',
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          border: '1px solid rgba(255, 255, 255, 0.25)',
                          zIndex: 2,
                          pointerEvents: 'none',
                        }}
                      >
                        <span>{isVideo ? '🎬 Video' : '📷 Foto'}</span>
                      </div>

                      {/* OVERLAY GRADIENT */}
                      {!isVideo && (
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
                            pointerEvents: 'none',
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
                      )}
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
                Pemisahan tegas: Master Admin, Admin Guru, Guru, Siswa/i Admin, dan Siswa Biasa per Kelas.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', backgroundColor: '#f1f5f9', padding: '6px 14px', borderRadius: '20px' }}>
                Total Akun: {filteredUsers.length} Pengguna
              </div>
              <button
                type="button"
                onClick={() => {
                  if (selectedClassFilter !== 'Semua') {
                    setNewStudentKelas(selectedClassFilter);
                    setNewStudentJurusan(deriveJurusanFromClass(selectedClassFilter));
                    setIsCustomKelasSelected(false);
                  }
                  setShowAddStudentModal(true);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#16a34a',
                  color: '#ffffff',
                  padding: '7px 16px',
                  borderRadius: '12px',
                  fontWeight: 'bold',
                  fontSize: '12.5px',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#15803d')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#16a34a')}
              >
                <span>➕</span> Tambah Siswa Baru
              </button>
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
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Cari nama, username, nomor RFID..."
              value={accountSearch}
              onChange={(e) => setAccountSearch(e.target.value)}
              style={{ flex: 1, minWidth: '200px', padding: '8px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            />

            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              style={{ padding: '8px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#ffffff', fontWeight: '500' }}
            >
              {classOptions.map((c) => (
                <option key={c} value={c}>
                  Kelas: {c}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => {
                if (selectedClassFilter !== 'Semua') {
                  setNewStudentKelas(selectedClassFilter);
                  setNewStudentJurusan(deriveJurusanFromClass(selectedClassFilter));
                  setIsCustomKelasSelected(false);
                }
                setShowAddStudentModal(true);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: primaryColor,
                color: '#ffffff',
                padding: '8px 14px',
                borderRadius: '10px',
                fontWeight: 'bold',
                fontSize: '12.5px',
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: `0 2px 8px ${primaryColor}30`,
              }}
            >
              ➕ Tambah Siswa ke {selectedClassFilter !== 'Semua' ? selectedClassFilter : 'Kelas...'}
            </button>
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
                        <div style={{ display: 'flex', gap: '5px', justifyContent: 'center', alignItems: 'center' }}>
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
                            🔑 Pass
                          </button>

                          <button
                            onClick={() => (u.isGuru ? handleEditTeacher(u) : handleEditStudent(u))}
                            style={{
                              backgroundColor: '#eff6ff',
                              color: '#1d4ed8',
                              border: '1px solid #bfdbfe',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              cursor: 'pointer',
                              fontWeight: 'bold',
                            }}
                            title={u.isGuru ? "Edit Data Guru (Nama, Inisial, Mapel, NIP, RFID)" : "Edit Data Siswa (Nama, Kelas, RFID)"}
                          >
                            ✏️ Edit
                          </button>

                          {!u.isGuru && (
                            <button
                              onClick={() => handleDeleteStudent(u)}
                              style={{
                                backgroundColor: '#fef2f2',
                                color: '#dc2626',
                                border: '1px solid #fecaca',
                                padding: '4px 7px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                              }}
                              title="Hapus Siswa dari Database"
                            >
                              🗑️
                            </button>
                          )}

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

      {/* ========================================================================= */}
      {/* MODAL DIALOG: 🧑‍🎓 TAMBAH SISWA BARU PER KELAS (MASTER ADMIN)              */}
      {/* ========================================================================= */}
      {showAddStudentModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(5px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmittingStudent) {
              setShowAddStudentModal(false);
            }
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '560px',
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '1px solid #e2e8f0',
              position: 'relative',
              boxSizing: 'border-box',
            }}
          >
            {/* MODAL HEADER */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: `linear-gradient(135deg, ${primaryColor}12 0%, #ffffff 100%)`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    backgroundColor: `${primaryColor}18`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '22px',
                  }}
                >
                  🧑‍🎓
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 'bold', color: '#0f172a' }}>
                    Tambah Siswa Baru per Kelas
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                    Pusat Kendali Master • Tersimpan langsung ke database cloud <code style={{ color: primaryColor }}>tb_siswa</code>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isSubmittingStudent && setShowAddStudentModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '20px',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '8px',
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>

            {/* TAB MODE: SATU SISWA vs BANYAK SISWA */}
            <div style={{ padding: '16px 24px 0 24px' }}>
              <div style={{ display: 'flex', gap: '8px', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
                <button
                  type="button"
                  onClick={() => setStudentAddMode('single')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    fontWeight: 'bold',
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    backgroundColor: studentAddMode === 'single' ? '#ffffff' : 'transparent',
                    color: studentAddMode === 'single' ? primaryColor : '#64748b',
                    boxShadow: studentAddMode === 'single' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.2s',
                  }}
                >
                  👤 Formulir 1 Siswa
                </button>
                <button
                  type="button"
                  onClick={() => setStudentAddMode('bulk')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    fontWeight: 'bold',
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    backgroundColor: studentAddMode === 'bulk' ? '#ffffff' : 'transparent',
                    color: studentAddMode === 'bulk' ? primaryColor : '#64748b',
                    boxShadow: studentAddMode === 'bulk' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.2s',
                  }}
                >
                  📋 Banyak Siswa (Massal / Copas)
                </button>
              </div>
            </div>

            {/* FORM BODY */}
            <form onSubmit={handleSaveNewStudent} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* PILIH KELAS SISWA */}
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>
                  Pilih Kelas Siswa <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select
                  value={isCustomKelasSelected ? '__CUSTOM__' : newStudentKelas}
                  onChange={(e) => handleClassChange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13.5px',
                    backgroundColor: '#ffffff',
                    fontWeight: '600',
                    color: '#1e293b',
                    boxSizing: 'border-box',
                  }}
                >
                  <optgroup label="Daftar Kelas Standar SMK YPK">
                    {STANDARD_CLASSES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </optgroup>
                  {allClassesForSelection.filter((c) => !STANDARD_CLASSES.includes(c)).length > 0 && (
                    <optgroup label="Kelas Lain yang Terdaftar">
                      {allClassesForSelection
                        .filter((c) => !STANDARD_CLASSES.includes(c))
                        .map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                    </optgroup>
                  )}
                  <option value="__CUSTOM__">✏️ + Ketik Kelas Lain / Kustom...</option>
                </select>

                {isCustomKelasSelected && (
                  <div style={{ marginTop: '8px' }}>
                    <input
                      type="text"
                      placeholder="Ketik nama kelas (Contoh: X TJKT 2)"
                      value={newStudentCustomKelas}
                      onChange={(e) => handleCustomClassChange(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '10px',
                        border: '1.5px dashed #3b82f6',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                        backgroundColor: '#eff6ff',
                        textTransform: 'uppercase',
                      }}
                      autoFocus
                    />
                  </div>
                )}
              </div>

              {/* JURUSAN & HAK AKSES */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '5px' }}>
                    Jurusan Otomatis
                  </label>
                  <select
                    value={newStudentJurusan}
                    onChange={(e) => setNewStudentJurusan(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      backgroundColor: '#f8fafc',
                      fontWeight: '600',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="TJKT">TJKT (Teknik Komputer & Jaringan)</option>
                    <option value="MPLB">MPLB (Perkantoran)</option>
                    <option value="AKL">AKL (Akuntansi)</option>
                    <option value="PM">PM (Pemasaran)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '5px' }}>
                    Peran / Hak Akses
                  </label>
                  <select
                    value={newStudentRole}
                    onChange={(e) => setNewStudentRole(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      backgroundColor: '#ffffff',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="Siswa">Siswa Biasa</option>
                    <option value="siswa_admin">Siswa Admin (Ketua / Pengurus Kelas)</option>
                  </select>
                </div>
              </div>

              {/* JIKA MODE 1 SISWA */}
              {studentAddMode === 'single' ? (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 'bold', color: '#334155', marginBottom: '5px' }}>
                      Nama Lengkap Siswa <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: MUHAMMAD ALIF SAPUTRA"
                      value={newStudentNama}
                      onChange={(e) => setNewStudentNama(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13.5px',
                        boxSizing: 'border-box',
                        textTransform: 'uppercase',
                      }}
                      required
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '5px' }}>
                        UID Kartu RFID (Opsional)
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: A1B2C3D4"
                        value={newStudentRfid}
                        onChange={(e) => setNewStudentRfid(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: '10px',
                          border: '1px solid #cbd5e1',
                          fontSize: '13px',
                          boxSizing: 'border-box',
                          fontFamily: 'monospace',
                          textTransform: 'uppercase',
                        }}
                      />
                      <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>Bisa ditap/diisi nanti</span>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '5px' }}>
                        Kata Sandi Akun Siswa
                      </label>
                      <input
                        type="text"
                        placeholder="Default: siswa123"
                        value={newStudentPassword}
                        onChange={(e) => setNewStudentPassword(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: '10px',
                          border: '1px solid #cbd5e1',
                          fontSize: '13px',
                          boxSizing: 'border-box',
                        }}
                      />
                      <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>Default: siswa123</span>
                    </div>
                  </div>
                </>
              ) : (
                /* JIKA MODE BANYAK SISWA (MASSAL / COPAS) */
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '12.5px', fontWeight: 'bold', color: '#334155' }}>
                      Tempel Daftar Nama Siswa (1 Nama per Baris) <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#2563eb', backgroundColor: '#eff6ff', padding: '2px 8px', borderRadius: '8px' }}>
                      {newStudentBulkText.split('\n').filter((l) => l.trim().length > 0).length} Siswa Terdeteksi
                    </span>
                  </div>
                  <textarea
                    rows={6}
                    placeholder={`Tempel daftar nama siswa dari Excel atau WhatsApp di sini, contoh:\nANDI SAPUTRA\nBAYU PRATAMA\nCITRA LESTARI\nDANIEL SIREGAR`}
                    value={newStudentBulkText}
                    onChange={(e) => setNewStudentBulkText(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                      fontFamily: 'sans-serif',
                      resize: 'vertical',
                    }}
                  />
                  <p style={{ margin: '6px 0 0 0', fontSize: '11.5px', color: '#64748b', lineHeight: '1.4' }}>
                    Seluruh nama di atas akan otomatis didaftarkan ke kelas <b>{isCustomKelasSelected ? newStudentCustomKelas || 'Kustom' : newStudentKelas}</b> dengan jurusan <b>{newStudentJurusan}</b> dan kata sandi awal <code>siswa123</code>.
                  </p>
                </div>
              )}

              {/* TOMBOL AKSI MODAL */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(false)}
                  disabled={isSubmittingStudent}
                  style={{
                    flex: 1,
                    padding: '11px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#f8fafc',
                    color: '#475569',
                    fontWeight: 'bold',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingStudent}
                  style={{
                    flex: 2,
                    padding: '11px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: isSubmittingStudent ? '#94a3b8' : '#16a34a',
                    color: '#ffffff',
                    fontWeight: 'bold',
                    fontSize: '13.5px',
                    cursor: isSubmittingStudent ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  {isSubmittingStudent ? 'Menyimpan Siswa...' : '💾 Simpan Siswa Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
