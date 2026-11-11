// 🧠 SISTEM RATING AKUN CERDAS BERBASIS AKTIVITAS & PERPUSTAKAAN (AI SMART USER REPUTATION)
// Menghitung rating akun secara otomatis berdasarkan keaktifan presensi, upload & membaca buku di perpustakaan, serta kedisiplinan belajar.
// Jika aktif berprestasi: rating NAIK. Jika jarang memakai aplikasi: rating TURUN otomatis.

export function calculateAiUserRating(user, customActivity = null) {
  if (!user) {
    return {
      score: 75,
      stars: 3.5,
      tier: 'Gold Reguler',
      badgeColor: '#f59e0b',
      label: '⭐ Bintang 3.5 · Cukup Aktif',
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

  // Cek apakah akun memiliki peran khusus (Master Admin mendapatkan rating sempurna)
  const isMaster = Boolean(
    user.isMaster ||
    user.username === 'iqbal' ||
    user.username === 'admin' ||
    String(user.nama || '').toLowerCase().includes('iqbal rangkuti')
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

  // Skor Dasar: 70 Poin
  let baseScore = 70;

  // 1. Poin Kehadiran Presensi Wajah Tepat Waktu (+3 poin, max 20 poin)
  const onTimeCount = activity.attendanceOnTime || 0;
  baseScore += Math.min(20, onTimeCount * 3);

  // 2. Pengurangan Keterlambatan (-1.5 poin per telat, max -12)
  const lateCount = activity.attendanceLate || 0;
  baseScore -= Math.min(12, lateCount * 1.5);

  // 3. Poin Prestasi Perpustakaan Digital:
  // - Guru/Siswa Upload Buku PDF/Modul (+12 poin per buku, max 25 poin)
  const uploads = activity.bookUploads || 0;
  baseScore += Math.min(25, uploads * 12);

  // - Membaca E-Book / Materi (+4 poin per sesi baca, max 15 poin)
  const readCount = activity.booksRead || 0;
  baseScore += Math.min(15, readCount * 4);

  // 4. Poin Login & Keaktifan Harian (+1 poin per login, max 10 poin)
  const logins = activity.totalLogins || 1;
  baseScore += Math.min(10, logins * 1);

  // 5. Penalti Otomatis Inaktivitas (Jika jarang memakai aplikasi > 3 hari):
  if (activity.lastActiveDate) {
    try {
      const lastActive = new Date(activity.lastActiveDate);
      const now = new Date();
      const diffMs = now.getTime() - lastActive.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays > 3) {
        // Turun rating otomatis sesuai permintaan: -4 poin per hari setelah hari ke-3 pasif
        const penalty = Math.min(30, (diffDays - 3) * 4);
        baseScore -= penalty;
      }
    } catch (e) {}
  }

  const finalScore = Math.max(30, Math.min(100, Math.round(baseScore)));

  // Klasifikasi Bintang & Tier Reputasi AI
  let stars = 3.5;
  let tier = 'Gold AI';
  let badgeColor = '#f59e0b';
  let label = '⭐ Bintang 3.5 · Cukup Aktif';

  if (finalScore >= 92) {
    stars = 5.0;
    tier = 'Diamond AI Teladan';
    badgeColor = '#06b6d4';
    label = '💎 Bintang 5 · Teladan Emas';
  } else if (finalScore >= 82) {
    stars = 4.5;
    tier = 'Platinum AI Berprestasi';
    badgeColor = '#10b981';
    label = '🏆 Bintang 4.5 · Sangat Aktif';
  } else if (finalScore >= 72) {
    stars = 4.0;
    tier = 'Gold AI Reguler';
    badgeColor = '#f59e0b';
    label = '🥇 Bintang 4 · Aktif Reguler';
  } else if (finalScore >= 58) {
    stars = 3.0;
    tier = 'Silver AI Standar';
    badgeColor = '#64748b';
    label = '🥈 Bintang 3 · Standar';
  } else {
    stars = 2.0;
    tier = 'Bronze AI Pasif';
    badgeColor = '#ef4444';
    label = '🥉 Bintang 2 · Perlu Ditingkatkan';
  }

  return {
    score: finalScore,
    stars,
    tier,
    badgeColor,
    label,
    bookUploads: uploads,
    booksRead: readCount,
    attendanceOnTime: onTimeCount,
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
