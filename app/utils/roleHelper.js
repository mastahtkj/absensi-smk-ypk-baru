// =============================================================
// 🏷️ SISTEM KLASIFIKASI ROLE TERPUSAT SMK YPK MEDAN
// =============================================================
// 1. Master Admin : Bpk. Muhammad Iqbal Rangkuti, S.Kom., Gr.
// 2. Gadmin       : Guru Admin (Guru Pengajar dengan hak akses admin)
// 3. Padmin       : Pegawai Admin (Pegawai / TU / Staff Administrasi dengan hak admin)
// 4. Sadmin       : Siswa Admin (Ketua / Pengurus Kelas dengan hak presensi kelas)
// 5. Guru         : Guru Pengajar Biasa
// 6. Pegawai      : Pegawai / Staff / Tenaga Kependidikan Biasa
// 7. Siswa        : Siswa / Siswi Biasa
// =============================================================

export const OFFICIAL_SISWA_ADMIN_NAMES = [
  'ira ulandari',
  'alzalika nazwa',
  'alzalika',
  'aisha',
  'rizky arka',
];

export function getUserRoleInfo(user) {
  if (!user) {
    return {
      type: 'siswa',
      label: 'Siswa/I',
      badge: '🎒 Siswa/I',
      adminType: null,
      color: '#64748b',
      bgColor: '#f1f5f9',
      borderColor: '#cbd5e1',
    };
  }

  const rawRole = String(user.role || '').toLowerCase().trim();
  const rawUsername = String(user.username || '').toLowerCase().trim();
  const rawNama = String(user.nama || user.nama_guru || user.nama_siswa || '').toLowerCase().trim();
  const idStr = String(user.id || user.rawId || user.id_guru || user.id_siswa || '');
  const mapel = String(user.mapel || '').toLowerCase().trim();
  const kelas = String(user.kelas || '').toLowerCase().trim();

  // Cek apakah akun Siswa
  const isStudent = Boolean(
    idStr.startsWith('SISWA-') ||
    user.isGuru === false ||
    rawRole.includes('siswa') ||
    rawRole.includes('sadmin') ||
    Boolean(user.nisn) ||
    Boolean(user.id_siswa)
  );

  // 1. MASTER ADMIN (Bpk. Muhammad Iqbal Rangkuti, Ibu Hartati Patiwael & Bpk. Hendrawan)
  const isMaster = Boolean(
    !isStudent && (
      user.isMaster === true ||
      rawRole === 'master' ||
      rawRole === 'superadmin' ||
      rawUsername === 'iqbal' ||
      rawUsername.includes('iqbal') ||
      rawUsername.includes('hartat') ||
      rawUsername.includes('patiwael') ||
      rawUsername.includes('hendrawan') ||
      idStr === 'GURU-4' ||
      idStr === 'GURU-YPK-04' ||
      idStr === 'GURU-29' ||
      idStr === '4' ||
      idStr === '29' ||
      idStr === 'GURU-1' ||
      idStr === 'GURU-YPK-01' ||
      idStr === '1' ||
      idStr === 'GURU-2' ||
      idStr === 'GURU-3' ||
      idStr === 'GURU-YPK-02' ||
      idStr === '2' ||
      idStr === '3' ||
      rawNama.includes('iqbal') ||
      rawNama.includes('hartati') ||
      rawNama.includes('hartaty') ||
      rawNama.includes('patiwael') ||
      rawNama.includes('hendrawan')
    )
  );

  if (isMaster) {
    return {
      type: 'master',
      label: 'Master Admin',
      badge: '👑 Master Admin',
      adminType: 'master',
      color: '#d97706',
      bgColor: '#fef3c7',
      borderColor: '#fde68a',
    };
  }

  // Cek apakah akun Pegawai / Staff
  const isStaff = Boolean(
    !isStudent && (
      rawRole.includes('pegawai') ||
      rawRole.includes('padmin') ||
      rawRole.includes('staf') ||
      mapel.includes('staf') ||
      mapel.includes('pegawai') ||
      kelas.includes('pegawai') ||
      kelas.includes('staff')
    )
  );

  // 2. SADMIN (Siswa Admin)
  const isSadmin = Boolean(
    isStudent && (
      rawRole === 'sadmin' ||
      rawRole.includes('sadmin') ||
      rawRole.includes('siswa_admin') ||
      rawRole.includes('admin') ||
      OFFICIAL_SISWA_ADMIN_NAMES.some((n) => rawNama.includes(n) || rawUsername.includes(n))
    )
  );

  if (isSadmin) {
    return {
      type: 'sadmin',
      label: 'Sadmin (Siswa Admin)',
      badge: '⭐ Sadmin',
      adminType: 'sadmin',
      color: '#7e22ce',
      bgColor: '#f3e8ff',
      borderColor: '#d8b4fe',
    };
  }

  // 3. PADMIN (Pegawai Admin)
  const isPadmin = Boolean(
    isStaff && (
      rawRole === 'padmin' ||
      rawRole.includes('padmin') ||
      rawRole.includes('admin') ||
      rawRole === 'admin_pegawai'
    )
  );

  if (isPadmin) {
    return {
      type: 'padmin',
      label: 'Padmin (Pegawai Admin)',
      badge: '💼 Padmin',
      adminType: 'padmin',
      color: '#0d9488',
      bgColor: '#ccfbf1',
      borderColor: '#99f6e4',
    };
  }

  // 4. GADMIN (Guru Admin)
  const isGadmin = Boolean(
    !isStudent && !isStaff && (
      rawRole === 'gadmin' ||
      rawRole.includes('gadmin') ||
      rawRole.includes('admin') ||
      rawRole === 'admin_guru'
    )
  );

  if (isGadmin) {
    return {
      type: 'gadmin',
      label: 'Gadmin (Guru Admin)',
      badge: '👨‍🏫 Gadmin',
      adminType: 'gadmin',
      color: '#1e40af',
      bgColor: '#dbeafe',
      borderColor: '#bfdbfe',
    };
  }

  // 5. PEGAWAI BIASA
  if (isStaff) {
    return {
      type: 'pegawai',
      label: 'Pegawai / Staff',
      badge: '💼 Pegawai',
      adminType: null,
      color: '#475569',
      bgColor: '#f1f5f9',
      borderColor: '#e2e8f0',
    };
  }

  // 6. GURU PENGAJAR BIASA
  if (!isStudent) {
    return {
      type: 'guru',
      label: 'Guru Pengajar',
      badge: '👨‍🏫 Guru',
      adminType: null,
      color: '#2563eb',
      bgColor: '#eff6ff',
      borderColor: '#bfdbfe',
    };
  }

  // 7. SISWA BIASA
  return {
    type: 'siswa',
    label: 'Siswa/I',
    badge: '🎒 Siswa/I',
    adminType: null,
    color: '#64748b',
    bgColor: '#f8fafc',
    borderColor: '#e2e8f0',
  };
}

export default getUserRoleInfo;
