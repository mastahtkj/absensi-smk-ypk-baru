'use client';

import React, { useState } from 'react';
import Swal from 'sweetalert2';

export default function WhitelabelBackendHub({
  appConfig = {},
  onSaveConfig,
  supabase,
  currentUser,
}) {
  // 1. Identitas Pokok Sekolah
  const [schoolName, setSchoolName] = useState(appConfig.school_name || 'SMK YPK MEDAN');
  const [schoolShortName, setSchoolShortName] = useState(appConfig.school_short_name || 'SMK YPK');
  const [schoolTagline, setSchoolTagline] = useState(appConfig.school_tagline || 'Aplikasi Sekolah Digital Terpadu');
  const [npsn, setNpsn] = useState(appConfig.school_npsn || '10210877');
  const [akreditasi, setAkreditasi] = useState(appConfig.school_akreditasi || 'A (Unggul)');
  const [statusSekolah, setStatusSekolah] = useState(appConfig.school_status || 'Swasta');
  const [alamat, setAlamat] = useState(appConfig.school_address || 'Jl. Sakti Lubis Gg. Amal No. 25, Medan Amplas');
  const [kota, setKota] = useState(appConfig.school_city || 'Kota Medan');
  const [provinsi, setProvinsi] = useState(appConfig.school_province || 'Sumatera Utara');
  const [telepon, setTelepon] = useState(appConfig.school_phone || '061-7865432');
  const [email, setEmail] = useState(appConfig.school_email || 'info@smkypkmedan.sch.id');
  const [website, setWebsite] = useState(appConfig.school_website || 'https://smkypkmedan.sch.id');

  // 2. Pimpinan & Pejabat Sekolah
  const [kepsekNama, setKepsekNama] = useState(appConfig.kepala_sekolah_nama || 'Drs. H. M. Syahril, M.Pd.');
  const [kepsekNip, setKepsekNip] = useState(appConfig.kepala_sekolah_nip || '196805121995121002');
  const [wakaKurikulum, setWakaKurikulum] = useState(appConfig.waka_kurikulum || 'Ahmad Fauzi, S.Pd., M.Kom.');
  const [wakaKesiswaan, setWakaKesiswaan] = useState(appConfig.waka_kesiswaan || 'Nurul Hidayati, S.Pd.');
  const [wakaHubin, setWakaHubin] = useState(appConfig.waka_hubin || 'Muhammad Iqbal Rangkuti, S.Kom.');
  const [kepalaTu, setKepalaTu] = useState(appConfig.kepala_tu || 'Siti Rahmawati, S.E.');

  // 3. Tahun Ajaran & Semester
  const [tahunAjaran, setTahunAjaran] = useState(appConfig.tahun_ajaran || '2026/2027');
  const [semesterAktif, setSemesterAktif] = useState(appConfig.semester_aktif || 'Ganjil');

  // 4. Daftar Jurusan
  const [jurusanList, setJurusanList] = useState(
    appConfig.jurusan_list || [
      'Teknik Jaringan Komputer & Telekomunikasi (TJKT)',
      'Manajemen Perkantoran & Layanan Bisnis (MPLB)',
      'Akuntansi & Keuangan Lembaga (AKL)',
      'Pemasaran (PM)',
    ]
  );
  const [newJurusanInput, setNewJurusanInput] = useState('');

  // 5. Geofence & GPS Titik Presensi
  const [latitude, setLatitude] = useState(String(appConfig.school_latitude || '3.55832'));
  const [longitude, setLongitude] = useState(String(appConfig.school_longitude || '98.69421'));
  const [radiusMeters, setRadiusMeters] = useState(String(appConfig.geofence_radius_meters || '200'));

  // 6. Branding & Tema Tampilan
  const [logoUrl, setLogoUrl] = useState(appConfig.school_logo_url || '/logo.png');
  const [primaryColor, setPrimaryColor] = useState(appConfig.theme_primary_color || '#1e40af');
  const [secondaryColor, setSecondaryColor] = useState(appConfig.theme_secondary_color || '#0ea5e9');
  const [welcomeText, setWelcomeText] = useState(appConfig.school_welcome_text || 'Selamat Datang di Portal Resmi Sekolah');

  // 7. Supabase Database Connection Info
  const [supabaseUrl, setSupabaseUrl] = useState(
    (typeof window !== 'undefined' && localStorage.getItem('smk_ypk_supabase_url')) ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    'https://wpyfwkcevgdhkazeesdq.supabase.co'
  );
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(
    (typeof window !== 'undefined' && localStorage.getItem('smk_ypk_supabase_anon_key')) || ''
  );

  const [saving, setSaving] = useState(false);

  // Ambil Lokasi GPS Saat Ini
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      Swal.fire('Error', 'Browser tidak mendukung GPS Geolocation.', 'error');
      return;
    }
    Swal.fire({
      title: 'Mendeteksi Koordinat GPS...',
      didOpen: () => Swal.showLoading(),
      allowOutsideClick: false,
    });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        Swal.fire({
          icon: 'success',
          title: 'Koordinat Berhasil Diambil! 📍',
          text: `Latitude: ${pos.coords.latitude.toFixed(6)}, Longitude: ${pos.coords.longitude.toFixed(6)}`,
          timer: 2000,
        });
      },
      (err) => {
        Swal.fire('Gagal Ambil GPS', err.message || 'Pastikan izin lokasi diaktifkan.', 'warning');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Tambah Jurusan Baru
  const handleAddJurusan = () => {
    if (!newJurusanInput.trim()) return;
    if (jurusanList.includes(newJurusanInput.trim())) {
      Swal.fire('Info', 'Jurusan ini sudah ada dalam daftar.', 'info');
      return;
    }
    setJurusanList([...jurusanList, newJurusanInput.trim()]);
    setNewJurusanInput('');
  };

  // Hapus Jurusan
  const handleDeleteJurusan = (idx) => {
    const updated = jurusanList.filter((_, i) => i !== idx);
    setJurusanList(updated);
  };

  // Preset: SMK YPK Medan
  const handleLoadPresetYpk = () => {
    setSchoolName('SMK YPK MEDAN');
    setSchoolShortName('SMK YPK');
    setSchoolTagline('Aplikasi Sekolah Digital Terpadu');
    setNpsn('10210877');
    setAkreditasi('A (Unggul)');
    setStatusSekolah('Swasta');
    setAlamat('Jl. Sakti Lubis Gg. Amal No. 25, Medan Amplas');
    setKota('Kota Medan');
    setProvinsi('Sumatera Utara');
    setTelepon('061-7865432');
    setEmail('info@smkypkmedan.sch.id');
    setWebsite('https://smkypkmedan.sch.id');
    setKepsekNama('Drs. H. M. Syahril, M.Pd.');
    setKepsekNip('196805121995121002');
    setWakaKurikulum('Ahmad Fauzi, S.Pd., M.Kom.');
    setWakaKesiswaan('Nurul Hidayati, S.Pd.');
    setWakaHubin('Muhammad Iqbal Rangkuti, S.Kom.');
    setKepalaTu('Siti Rahmawati, S.E.');
    setTahunAjaran('2026/2027');
    setSemesterAktif('Ganjil');
    setJurusanList([
      'Teknik Jaringan Komputer & Telekomunikasi (TJKT)',
      'Manajemen Perkantoran & Layanan Bisnis (MPLB)',
      'Akuntansi & Keuangan Lembaga (AKL)',
      'Pemasaran (PM)',
    ]);
    setLatitude('3.558320');
    setLongitude('98.694210');
    setRadiusMeters('200');
    setLogoUrl('/logo.png');
    setPrimaryColor('#1e40af');
    setSecondaryColor('#0ea5e9');
    setWelcomeText('Selamat Datang di Portal Resmi SMK YPK Medan');
    Swal.fire('Preset Dimuat', 'Data konfigurasi resmi SMK YPK Medan berhasil dimuat ke formulir.', 'success');
  };

  // Preset: Template Sekolah Baru (Siap Jual)
  const handleLoadPresetNewSchool = () => {
    setSchoolName('SMK NUSANTARA JAYA');
    setSchoolShortName('SMK NUSANTARA');
    setSchoolTagline('Membentuk Generasi Unggul Berkarakter & Berwawasan Global');
    setNpsn('20109988');
    setAkreditasi('A');
    setStatusSekolah('Negeri');
    setAlamat('Jl. Pendidikan No. 100, Kawasan Vokasi Terpadu');
    setKota('Jakarta Pusat');
    setProvinsi('DKI Jakarta');
    setTelepon('021-5551234');
    setEmail('admin@smknusantarajaya.sch.id');
    setWebsite('https://smknusantarajaya.sch.id');
    setKepsekNama('Drs. Bambang Sudiro, M.Pd.');
    setKepsekNip('197001011997031001');
    setWakaKurikulum('Dra. Siti Aminah, M.Pd.');
    setWakaKesiswaan('Budi Santoso, S.Kom.');
    setWakaHubin('Hendra Wijaya, S.T.');
    setKepalaTu('Rina Marlina, S.A.P.');
    setTahunAjaran('2026/2027');
    setSemesterAktif('Ganjil');
    setJurusanList([
      'Rekayasa Perangkat Lunak (RPL)',
      'Teknik Komputer & Jaringan (TKJ)',
      'Desain Komunikasi Visual (DKV)',
      'Manajemen Bisnis & Pemasaran',
    ]);
    setLatitude('-6.175392');
    setLongitude('106.827153');
    setRadiusMeters('150');
    setLogoUrl('/logo.png');
    setPrimaryColor('#0f766e');
    setSecondaryColor('#14b8a6');
    setWelcomeText('Selamat Datang di Sistem Digital Sekolah');
    Swal.fire('Preset Siap Jual Dimuat', 'Template sekolah baru berhasil dimuat. Silakan sesuaikan data dengan sekolah pembeli.', 'success');
  };

  // Ekspor JSON Template
  const handleExportJson = () => {
    const configData = {
      school_name: schoolName,
      school_short_name: schoolShortName,
      school_tagline: schoolTagline,
      school_npsn: npsn,
      school_akreditasi: akreditasi,
      school_status: statusSekolah,
      school_address: alamat,
      school_city: kota,
      school_province: provinsi,
      school_phone: telepon,
      school_email: email,
      school_website: website,
      kepala_sekolah_nama: kepsekNama,
      kepala_sekolah_nip: kepsekNip,
      waka_kurikulum: wakaKurikulum,
      waka_kesiswaan: wakaKesiswaan,
      waka_hubin: wakaHubin,
      kepala_tu: kepalaTu,
      tahun_ajaran: tahunAjaran,
      semester_aktif: semesterAktif,
      jurusan_list: jurusanList,
      school_latitude: parseFloat(latitude) || 3.55832,
      school_longitude: parseFloat(longitude) || 98.69421,
      geofence_radius_meters: parseFloat(radiusMeters) || 200,
      school_logo_url: logoUrl,
      theme_primary_color: primaryColor,
      theme_secondary_color: secondaryColor,
      school_welcome_text: welcomeText,
      exported_at: new Date().toISOString(),
      generator: 'SMK YPK Super App Whitelabel Backend Engine',
    };

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(configData, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `konfigurasi-${schoolShortName.toLowerCase().replace(/\s+/g, '-')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    Swal.fire({
      icon: 'success',
      title: 'Template Berhasil Diekspor! 📥',
      text: 'File JSON konfigurasi sekolah telah diunduh. Anda dapat menyimpannya sebagai arsip penjualan sekolah.',
    });
  };

  // Impor JSON Template
  const handleImportJson = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed.school_name) setSchoolName(parsed.school_name);
        if (parsed.school_short_name) setSchoolShortName(parsed.school_short_name);
        if (parsed.school_tagline) setSchoolTagline(parsed.school_tagline);
        if (parsed.school_npsn) setNpsn(parsed.school_npsn);
        if (parsed.school_akreditasi) setAkreditasi(parsed.school_akreditasi);
        if (parsed.school_status) setStatusSekolah(parsed.school_status);
        if (parsed.school_address) setAlamat(parsed.school_address);
        if (parsed.school_city) setKota(parsed.school_city);
        if (parsed.school_province) setProvinsi(parsed.school_province);
        if (parsed.school_phone) setTelepon(parsed.school_phone);
        if (parsed.school_email) setEmail(parsed.school_email);
        if (parsed.school_website) setWebsite(parsed.school_website);
        if (parsed.kepala_sekolah_nama) setKepsekNama(parsed.kepala_sekolah_nama);
        if (parsed.kepala_sekolah_nip) setKepsekNip(parsed.kepala_sekolah_nip);
        if (parsed.waka_kurikulum) setWakaKurikulum(parsed.waka_kurikulum);
        if (parsed.waka_kesiswaan) setWakaKesiswaan(parsed.waka_kesiswaan);
        if (parsed.waka_hubin) setWakaHubin(parsed.waka_hubin);
        if (parsed.kepala_tu) setKepalaTu(parsed.kepala_tu);
        if (parsed.tahun_ajaran) setTahunAjaran(parsed.tahun_ajaran);
        if (parsed.semester_aktif) setSemesterAktif(parsed.semester_aktif);
        if (Array.isArray(parsed.jurusan_list)) setJurusanList(parsed.jurusan_list);
        if (parsed.school_latitude) setLatitude(String(parsed.school_latitude));
        if (parsed.school_longitude) setLongitude(String(parsed.school_longitude));
        if (parsed.geofence_radius_meters) setRadiusMeters(String(parsed.geofence_radius_meters));
        if (parsed.school_logo_url) setLogoUrl(parsed.school_logo_url);
        if (parsed.theme_primary_color) setPrimaryColor(parsed.theme_primary_color);
        if (parsed.theme_secondary_color) setSecondaryColor(parsed.theme_secondary_color);
        if (parsed.school_welcome_text) setWelcomeText(parsed.school_welcome_text);

        Swal.fire({
          icon: 'success',
          title: 'Konfigurasi Berhasil Diimpor! 📤',
          text: `Data untuk "${parsed.school_name || 'Sekolah'}" berhasil dimuat ke seluruh formulir.`,
        });
      } catch (err) {
        Swal.fire('Format Salah', 'File yang dipilih bukan file JSON konfigurasi yang valid.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Simpan Seluruh Perubahan
  const handleSaveAllConfig = async () => {
    setSaving(true);
    const payload = {
      id: 'school_config',
      school_name: schoolName,
      school_short_name: schoolShortName,
      school_tagline: schoolTagline,
      school_npsn: npsn,
      school_akreditasi: akreditasi,
      school_status: statusSekolah,
      school_address: alamat,
      school_city: kota,
      school_province: provinsi,
      school_phone: telepon,
      school_email: email,
      school_website: website,
      kepala_sekolah_nama: kepsekNama,
      kepala_sekolah_nip: kepsekNip,
      waka_kurikulum: wakaKurikulum,
      waka_kesiswaan: wakaKesiswaan,
      waka_hubin: wakaHubin,
      kepala_tu: kepalaTu,
      tahun_ajaran: tahunAjaran,
      semester_aktif: semesterAktif,
      jurusan_list: jurusanList,
      school_latitude: parseFloat(latitude) || 3.55832,
      school_longitude: parseFloat(longitude) || 98.69421,
      geofence_radius_meters: parseFloat(radiusMeters) || 200,
      school_logo_url: logoUrl,
      theme_primary_color: primaryColor,
      theme_secondary_color: secondaryColor,
      school_welcome_text: welcomeText,
      updated_by: currentUser?.nama || 'Admin Master',
      updated_at: new Date().toISOString(),
    };

    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('smk_ypk_school_config', JSON.stringify(payload));
        if (supabaseUrl) localStorage.setItem('smk_ypk_supabase_url', supabaseUrl);
        if (supabaseAnonKey) localStorage.setItem('smk_ypk_supabase_anon_key', supabaseAnonKey);
      }

      if (supabase) {
        let currentPayload = { ...payload };
        for (let attempt = 0; attempt < 8; attempt++) {
          const { error } = await supabase
            .from('app_settings')
            .upsert(currentPayload, { onConflict: 'id' });

          if (!error) break;

          const missingCol = error.message?.match(/Could not find the '([^']+)' column/i)?.[1];
          if (missingCol && Object.prototype.hasOwnProperty.call(currentPayload, missingCol)) {
            console.warn(`[Auto-Heal Whitelabel] Kolom '${missingCol}' belum terdaftar. Menghapus & mencoba ulang...`);
            delete currentPayload[missingCol];
            continue;
          }

          const { error: updErr } = await supabase.from('app_settings').update(currentPayload).eq('id', 'school_config');
          if (!updErr) break;

          const updMissingCol = updErr.message?.match(/Could not find the '([^']+)' column/i)?.[1];
          if (updMissingCol && Object.prototype.hasOwnProperty.call(currentPayload, updMissingCol)) {
            console.warn(`[Auto-Heal Whitelabel] Kolom '${updMissingCol}' belum terdaftar (update). Menghapus & mencoba ulang...`);
            delete currentPayload[updMissingCol];
            continue;
          }
          break;
        }

        // Siarkan perubahan secara realtime ke semua perangkat
        try {
          supabase.channel('smk_ypk_presence_room').send({
            type: 'broadcast',
            event: 'app_config_updated',
            payload,
          });
          supabase.channel('realtime:app_settings_sync').send({
            type: 'broadcast',
            event: 'app_config_updated',
            payload,
          });
        } catch (e) {}
      }

      if (onSaveConfig) {
        onSaveConfig(payload);
      }

      Swal.fire({
        icon: 'success',
        title: 'Konfigurasi Sekolah Tersimpan! 🚀',
        html: `
          <div style="font-size: 13px; text-align: left; color: #334155;">
            ✅ <b>Identitas Sekolah:</b> ${schoolName} berhasil disimpan.<br/>
            ✅ <b>Titik GPS &amp; Geofence:</b> ${latitude}, ${longitude} (${radiusMeters} meter).<br/>
            ✅ <b>Sinkronisasi Seketika:</b> Seluruh HP guru, siswa, dan beranda otomatis mengikuti identitas sekolah baru tanpa instal ulang!
          </div>
        `,
        timer: 3000,
      });
    } catch (err) {
      console.error('Error saving whitelabel:', err);
      Swal.fire('Gagal Menyimpan', err.message || 'Terjadi kesalahan sistem.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* 🧭 BANNER WHITELABEL HUB */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
          borderRadius: '16px',
          padding: '24px',
          color: '#ffffff',
          boxShadow: '0 10px 25px -5px rgba(49, 46, 129, 0.3)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', backgroundColor: 'rgba(165, 180, 252, 0.2)', color: '#c7d2fe', padding: '4px 10px', borderRadius: '20px', border: '1px solid rgba(165, 180, 252, 0.4)' }}>
              MULTI-TENANT &bull; MULTI-SCHOOL WHITELABEL ENGINE
            </span>
            <span style={{ fontSize: '11px', fontWeight: '800', backgroundColor: 'rgba(52, 211, 153, 0.2)', color: '#34d399', padding: '4px 10px', borderRadius: '20px', border: '1px solid rgba(52, 211, 153, 0.4)' }}>
              SIAP JUAL KE SEKOLAH LAIN
            </span>
          </div>
          <h2 style={{ margin: '4px 0 6px 0', fontSize: '23px', fontWeight: '900', letterSpacing: '-0.5px' }}>
            🏫 Backend &amp; Pusat Whitelabel Sekolah
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#c7d2fe', maxWidth: '680px', lineHeight: '1.5' }}>
            Kustomisasi seluruh identitas aplikasi dalam satu tempat. Jika ada sekolah lain yang ingin membeli atau menggunakan proyek ini, Anda cukup mengubah nama sekolah, jurusan, kepala sekolah, GPS presensi, logo, dan koneksi database di bawah ini!
          </p>
        </div>

        {/* QUICK PRESET & ACTION BUTTONS */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={handleLoadPresetYpk}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '11.5px',
              fontWeight: '700',
              cursor: 'pointer',
            }}
          >
            🔄 Preset SMK YPK (Asli)
          </button>
          <button
            onClick={handleLoadPresetNewSchool}
            style={{
              backgroundColor: 'rgba(52, 211, 153, 0.25)',
              color: '#6ee7b7',
              border: '1px solid rgba(52, 211, 153, 0.4)',
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '11.5px',
              fontWeight: '700',
              cursor: 'pointer',
            }}
          >
            ⚡ Template Sekolah Baru (Jual)
          </button>
          <button
            onClick={handleExportJson}
            style={{
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '11.5px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            📥 Ekspor JSON
          </button>
          <label
            style={{
              backgroundColor: '#10b981',
              color: '#ffffff',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '11.5px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            📤 Impor JSON
            <input type="file" accept=".json" onChange={handleImportJson} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      {/* 🏛️ 1. IDENTITAS POKOK SEKOLAH */}
      <div className="stardust-white-card" style={{ borderRadius: '14px', padding: '22px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
        <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '800', color: '#1e293b' }}>
          🏛️ 1. Identitas Pokok &amp; Profil Lembaga Sekolah
        </h3>
        <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#64748b' }}>
          Informasi legalitas, nama resmi, kontak, dan alamat sekolah yang tampil di seluruh kop surat, kartu ID, dan beranda
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>
              Nama Lengkap Sekolah:
            </label>
            <input
              type="text"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="Contoh: SMK YPK MEDAN"
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>
              Nama Singkat / Singkatan:
            </label>
            <input
              type="text"
              value={schoolShortName}
              onChange={(e) => setSchoolShortName(e.target.value)}
              placeholder="Contoh: SMK YPK"
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>
              NPSN (Nomor Pokok Sekolah Nasional):
            </label>
            <input
              type="text"
              value={npsn}
              onChange={(e) => setNpsn(e.target.value)}
              placeholder="Contoh: 10210877"
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>
              Status Akreditasi:
            </label>
            <input
              type="text"
              value={akreditasi}
              onChange={(e) => setAkreditasi(e.target.value)}
              placeholder="Contoh: A (Unggul)"
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>
              Status Sekolah:
            </label>
            <select
              value={statusSekolah}
              onChange={(e) => setStatusSekolah(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box', backgroundColor: '#f8fafc' }}
            >
              <option value="Swasta">Swasta</option>
              <option value="Negeri">Negeri</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>
              Motto / Slogan Sekolah:
            </label>
            <input
              type="text"
              value={schoolTagline}
              onChange={(e) => setSchoolTagline(e.target.value)}
              placeholder="Contoh: Aplikasi Sekolah Digital Terpadu"
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>
              Alamat Lengkap Kampus Sekolah:
            </label>
            <input
              type="text"
              value={alamat}
              onChange={(e) => setAlamat(e.target.value)}
              placeholder="Contoh: Jl. Sakti Lubis Gg. Amal No. 25, Medan Amplas"
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>
              Kota / Kabupaten:
            </label>
            <input
              type="text"
              value={kota}
              onChange={(e) => setKota(e.target.value)}
              placeholder="Contoh: Kota Medan"
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>
              Provinsi:
            </label>
            <input
              type="text"
              value={provinsi}
              onChange={(e) => setProvinsi(e.target.value)}
              placeholder="Contoh: Sumatera Utara"
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>
              No. Telepon / Hotline:
            </label>
            <input
              type="text"
              value={telepon}
              onChange={(e) => setTelepon(e.target.value)}
              placeholder="Contoh: 061-7865432"
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>
              Email Resmi Sekolah:
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Contoh: info@smkypkmedan.sch.id"
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>
              Website Resmi Sekolah:
            </label>
            <input
              type="text"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="Contoh: https://smkypkmedan.sch.id"
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>
        </div>
      </div>

      {/* 👨‍💼 2. PIMPINAN & PEJABAT STRUKTURAL */}
      <div className="stardust-white-card" style={{ borderRadius: '14px', padding: '22px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
        <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '800', color: '#1e293b' }}>
          👨‍💼 2. Pimpinan &amp; Pejabat Struktural Sekolah
        </h3>
        <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#64748b' }}>
          Data penandatangan rapor, surat tugas, dan legalitas dokumen resmi sekolah
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>
              Nama Lengkap Kepala Sekolah &amp; Gelar:
            </label>
            <input
              type="text"
              value={kepsekNama}
              onChange={(e) => setKepsekNama(e.target.value)}
              placeholder="Contoh: Drs. H. M. Syahril, M.Pd."
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>
              NIP / NUPTK Kepala Sekolah:
            </label>
            <input
              type="text"
              value={kepsekNip}
              onChange={(e) => setKepsekNip(e.target.value)}
              placeholder="Contoh: 196805121995121002"
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>
              Wakil Kepala Bidang Kurikulum:
            </label>
            <input
              type="text"
              value={wakaKurikulum}
              onChange={(e) => setWakaKurikulum(e.target.value)}
              placeholder="Nama Waka Kurikulum"
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>
              Wakil Kepala Bidang Kesiswaan:
            </label>
            <input
              type="text"
              value={wakaKesiswaan}
              onChange={(e) => setWakaKesiswaan(e.target.value)}
              placeholder="Nama Waka Kesiswaan"
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>
              Wakil Kepala Bidang Humas / Hubin:
            </label>
            <input
              type="text"
              value={wakaHubin}
              onChange={(e) => setWakaHubin(e.target.value)}
              placeholder="Nama Waka Hubin"
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>
              Kepala Tata Usaha:
            </label>
            <input
              type="text"
              value={kepalaTu}
              onChange={(e) => setKepalaTu(e.target.value)}
              placeholder="Nama Kepala Tata Usaha"
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>
        </div>
      </div>

      {/* 📚 3. TAHUN AJARAN & DAFTAR JURUSAN KEJURUAN */}
      <div className="stardust-white-card" style={{ borderRadius: '14px', padding: '22px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
        <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '800', color: '#1e293b' }}>
          📚 3. Tahun Ajaran &amp; Daftar Program Keahlian / Jurusan
        </h3>
        <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#64748b' }}>
          Tentukan tahun ajaran berjalan serta program studi atau konsentrasi keahlian yang ada di sekolah pembeli
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>
              Tahun Ajaran Aktif:
            </label>
            <input
              type="text"
              value={tahunAjaran}
              onChange={(e) => setTahunAjaran(e.target.value)}
              placeholder="Contoh: 2026/2027"
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>
              Semester Berjalan:
            </label>
            <select
              value={semesterAktif}
              onChange={(e) => setSemesterAktif(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box', backgroundColor: '#f8fafc' }}
            >
              <option value="Ganjil">Semester Ganjil</option>
              <option value="Genap">Semester Genap</option>
            </select>
          </div>
        </div>

        {/* EDITOR JURUSAN */}
        <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}>
            Daftar Jurusan / Program Keahlian Terdaftar ({jurusanList.length} Jurusan):
          </label>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
            {jurusanList.map((jur, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#ffffff',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#334155',
                }}
              >
                <span>🔹 {jur}</span>
                <button
                  type="button"
                  onClick={() => handleDeleteJurusan(idx)}
                  style={{
                    backgroundColor: '#fee2e2',
                    color: '#ef4444',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  Hapus
                </button>
              </div>
            ))}
          </div>

          {/* INPUT TAMBAH JURUSAN */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={newJurusanInput}
              onChange={(e) => setNewJurusanInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddJurusan();
                }
              }}
              placeholder="Ketik nama jurusan baru (misal: Rekayasa Perangkat Lunak - RPL)..."
              style={{
                flex: 1,
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1.5px solid #cbd5e1',
                fontSize: '13px',
              }}
            />
            <button
              type="button"
              onClick={handleAddJurusan}
              style={{
                backgroundColor: '#1e40af',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '9px 18px',
                fontSize: '12.5px',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              + Tambah Jurusan
            </button>
          </div>
        </div>
      </div>

      {/* 📍 4. GEOFENCE GPS & TITIK KOORDINAT PRESENSI */}
      <div className="stardust-white-card" style={{ borderRadius: '14px', padding: '22px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#1e293b' }}>
              📍 4. Geofence GPS &amp; Titik Koordinat Presensi Sekolah
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
              Atur titik koordinat sekolah pembeli agar siswa dan guru wajib berada di area sekolah saat absen
            </p>
          </div>

          <button
            type="button"
            onClick={handleGetCurrentLocation}
            style={{
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>📍 Ambil GPS Saya Sekarang</span>
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>
              Latitude Sekolah:
            </label>
            <input
              type="text"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              placeholder="Contoh: 3.558320"
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>
              Longitude Sekolah:
            </label>
            <input
              type="text"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              placeholder="Contoh: 98.694210"
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>
              Radius Toleransi Presensi (Meter):
            </label>
            <input
              type="number"
              value={radiusMeters}
              onChange={(e) => setRadiusMeters(e.target.value)}
              placeholder="Contoh: 200"
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>
        </div>
      </div>

      {/* 🎨 5. BRANDING & TEMA VISUAL */}
      <div className="stardust-white-card" style={{ borderRadius: '14px', padding: '22px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
        <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '800', color: '#1e293b' }}>
          🎨 5. Tampilan Tema &amp; Branding Sekolah
        </h3>
        <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#64748b' }}>
          Sesuaikan palet warna, logo, dan teks sambutan agar pas dengan identitas warna almamater sekolah pembeli
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>
              URL Path Logo Sekolah:
            </label>
            <input
              type="text"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="/logo.png atau URL logo"
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>
              Warna Utama Tema (Primary Color):
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                style={{ width: '42px', height: '38px', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer' }}
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                style={{ flex: 1, padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>
              Warna Sekunder (Secondary Color):
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="color"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                style={{ width: '42px', height: '38px', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer' }}
              />
              <input
                type="text"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                style={{ flex: 1, padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>
              Teks Berjalan / Sambutan di Header:
            </label>
            <input
              type="text"
              value={welcomeText}
              onChange={(e) => setWelcomeText(e.target.value)}
              placeholder="Contoh: Selamat Datang di Portal Resmi Sekolah"
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>
        </div>
      </div>

      {/* 💾 TOMBOL SIMPAN BESAR DI BAWAH */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '10px 0' }}>
        <button
          type="button"
          onClick={handleSaveAllConfig}
          disabled={saving}
          style={{
            backgroundColor: '#16a34a',
            color: '#ffffff',
            border: 'none',
            borderRadius: '12px',
            padding: '14px 28px',
            fontSize: '15px',
            fontWeight: '900',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(22, 163, 74, 0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s',
          }}
        >
          <span>{saving ? '⏳ Menyimpan...' : '💾 Terapkan Seluruh Konfigurasi Sekolah'}</span>
        </button>
      </div>
    </div>
  );
}
