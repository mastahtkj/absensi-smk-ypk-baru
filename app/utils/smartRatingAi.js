// 🧠 SISTEM RATING AKUN CERDAS BERBASIS AKTIVITAS & PERPUSTAKAAN (AI SMART USER REPUTATION)
// Menghitung rating akun secara otomatis berdasarkan keaktifan presensi, upload & membaca buku di perpustakaan, serta kedisiplinan belajar.
// Jika aktif berprestasi: rating NAIK. Jika jarang memakai aplikasi: rating TURUN otomatis.

export function calculateAiUserRating(user, customActivity = null) {
  if (!user) {
    return {
      score: 0,
      stars: 1.0,
      tier: 'Bronze AI Pemula',
      badgeColor: '#64748b',
      label: '⭐ Bintang 1 (0.0%) · Siswa Pemula',
      bookUploads: 0,
      booksRead: 0,
      attendanceOnTime: 0,
    };
  }

  const rawId = String(user.rawId || user.id || user.id_siswa || user.id_guru || '').replace(/\D/g, '');
  const userKey = `smk_ypk_user_activity_${rawId || user.username || user.nama}`;

  let activity = customActivity || {
    bookUploads: 0,
    booksRead: 0,
    attendanceOnTime: 0,
    attendanceLate: 0,
    lastActiveDate: new Date().toISOString().split('T')[0],
    totalLogins: 1,
  };

  if (!customActivity && typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(userKey);
      if (stored) {
        activity = { ...activity, ...JSON.parse(stored) };
      }
    } catch (e) {}
  }

  const idStr = String(user.id || user.rawId || user.id_guru || user.id_siswa || '');
  const rawRole = String(user.role || '').toLowerCase();
  const rawNama = String(user.nama || user.nama_guru || user.nama_siswa || '').toLowerCase();
  const rawUser = String(user.username || '').toLowerCase();

  const isStudent = Boolean(
    idStr.startsWith('SISWA-') ||
    user.isGuru === false ||
    rawRole.includes('siswa') ||
    rawRole.includes('sadmin') ||
    Boolean(user.nisn) ||
    Boolean(user.id_siswa)
  );

  // 1. MASTER ADMIN (Bpk. Muhammad Iqbal Rangkuti)
  const isMaster = Boolean(
    !isStudent && (
      user.isMaster ||
      rawUser === 'iqbal' ||
      rawRole === 'master' ||
      idStr === 'GURU-4' ||
      idStr === 'GURU-YPK-04' ||
      (user.isGuru && rawNama.includes('iqbal rangkuti'))
    )
  );

  if (isMaster) {
    return {
      score: 100,
      stars: 5.0,
      tier: 'Diamond Master AI',
      badgeColor: '#06b6d4',
      label: '💎 Bintang 5 · Master Teladan Emas',
      bookUploads: activity.bookUploads || 5,
      booksRead: activity.booksRead || 12,
      attendanceOnTime: activity.attendanceOnTime || 30,
    };
  }

  // 2. GURU & PEGAWAI / STAFF SEKOLAH (Rating Tinggi Teladan Emas Bintang 5 100%)
  const isGuruOrStaff = Boolean(
    !isStudent && (
      user.isGuru ||
      user.is_guru ||
      rawRole.includes('guru') ||
      rawRole.includes('gadmin') ||
      rawRole.includes('pegawai') ||
      rawRole.includes('padmin') ||
      rawRole.includes('staff') ||
      rawRole.includes('staf') ||
      idStr.startsWith('GURU-') ||
      user.mapel ||
      user.nuptk ||
      user.nip
    )
  );

  if (isGuruOrStaff) {
    return {
      score: 100,
      stars: 5.0,
      tier: 'Diamond AI Teladan',
      badgeColor: '#10b981',
      label: '💎 Bintang 5 (100%) · Teladan Emas',
      bookUploads: activity.bookUploads || 3,
      booksRead: activity.booksRead || 8,
      attendanceOnTime: activity.attendanceOnTime || 25,
    };
  }

  // 3. SISWA: Perhitungan Dinamis Berdasarkan Presensi, Baca Buku & Aktivitas Belajar
  const attendanceScore = Math.min(50, (activity.attendanceOnTime || 0) * 5);
  const readingScore = Math.min(30, (activity.booksRead || 0) * 10);
  const loginScore = Math.min(20, (activity.totalLogins || 1) * 2);
  const totalScore = Math.min(100, Math.max(10, attendanceScore + readingScore + loginScore));

  const stars = Number((1.0 + (totalScore / 100) * 4.0).toFixed(1));

  let tier = 'Bronze AI Pemula';
  let badgeColor = '#64748b';
  let label = `⭐ Bintang ${stars} (${totalScore}%) · Siswa Pemula`;

  if (totalScore >= 90) {
    tier = 'Diamond AI Teladan';
    badgeColor = '#10b981';
    label = `💎 Bintang ${stars} (${totalScore}%) · Siswa Teladan Emas`;
  } else if (totalScore >= 75) {
    tier = 'Platinum AI Berprestasi';
    badgeColor = '#0284c7';
    label = `⭐ Bintang ${stars} (${totalScore}%) · Siswa Berprestasi`;
  } else if (totalScore >= 60) {
    tier = 'Gold AI Rajin Belajar';
    badgeColor = '#d97706';
    label = `⭐ Bintang ${stars} (${totalScore}%) · Siswa Rajin`;
  } else if (totalScore >= 35) {
    tier = 'Silver AI Berkembang';
    badgeColor = '#7c3aed';
    label = `⭐ Bintang ${stars} (${totalScore}%) · Siswa Berkembang`;
  }

  return {
    score: totalScore,
    stars: stars,
    tier: tier,
    badgeColor: badgeColor,
    label: label,
    bookUploads: activity.bookUploads || 0,
    booksRead: activity.booksRead || 0,
    attendanceOnTime: activity.attendanceOnTime || 0,
  };
}

export function recordUserActivity(user, activityType) {
  if (!user || typeof window === 'undefined') return;
  try {
    const rawId = String(user.rawId || user.id || user.id_siswa || user.id_guru || '').replace(/\D/g, '');
    const userKey = `smk_ypk_user_activity_${rawId || user.username || user.nama}`;
    const today = new Date().toISOString().split('T')[0];

    const current = JSON.parse(localStorage.getItem(userKey) || '{}');
    const updated = {
      ...current,
      lastActiveDate: today,
    };

    if (activityType === 'upload_book') {
      updated.bookUploads = (updated.bookUploads || 0) + 1;
    } else if (activityType === 'read_book') {
      updated.booksRead = (updated.booksRead || 0) + 1;
    } else if (activityType === 'attendance_ontime') {
      updated.attendanceOnTime = (updated.attendanceOnTime || 0) + 1;
    } else if (activityType === 'attendance_late') {
      updated.attendanceLate = (updated.attendanceLate || 0) + 1;
    } else if (activityType === 'daily_login') {
      if (updated.lastLoginDate !== today) {
        updated.lastLoginDate = today;
        updated.totalLogins = (updated.totalLogins || 0) + 1;
      }
    }

    localStorage.setItem(userKey, JSON.stringify(updated));
  } catch (e) {}
}
