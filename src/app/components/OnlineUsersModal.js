'use client';

import React, { useState, useEffect, useMemo } from 'react';

export default function OnlineUsersModal({
  isOpen,
  onClose,
  siswaList = [],
  currentUser,
  onlineUsersMap = {},
  onSelectUser,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'online', 'guru', 'siswa'
  const [photoVersion, setPhotoVersion] = useState(0);

  // 📸 Dengarkan perubahan foto profil realtime
  React.useEffect(() => {
    const handlePhotoUpdated = () => setPhotoVersion((prev) => prev + 1);
    if (typeof window !== 'undefined') {
      window.addEventListener('user_photo_updated', handlePhotoUpdated);
      window.addEventListener('storage', handlePhotoUpdated);
      return () => {
        window.removeEventListener('user_photo_updated', handlePhotoUpdated);
        window.removeEventListener('storage', handlePhotoUpdated);
      };
    }
  }, []);

  const isAdmin = Boolean(
    currentUser?.role === 'admin' ||
    currentUser?.role === 'master' ||
    (currentUser?.username || '').toLowerCase() === 'admin' ||
    (currentUser?.username || '').toLowerCase() === 'iqbal' ||
    currentUser?.nama?.toLowerCase()?.includes('iqbal')
  );

  const [now, setNow] = useState(Date.now());

  // ⏱️ Realtime Live Ticker (Memperbarui detik setiap 1 detik)
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const allUsersWithStatus = useMemo(() => {
    if (!isOpen) return [];

    const currentId = String(currentUser?.id || currentUser?.rawId || '');
    const currentName = (currentUser?.nama || '').trim().toLowerCase();

    const safeList = Array.isArray(siswaList) ? siswaList.filter(Boolean) : [];

    return safeList
      .map((user, idx) => {
        const userId = String(user.id || user.rawId || `user-${idx}`);
        const userUid = String(user.rfid_uid || user.uid_rfid || user.rfid || '').toUpperCase();
        const userNama = String(user.nama || user.nama_guru || user.nama_siswa || user.username || `Pengguna ${idx + 1}`).trim();
        const isGuru = Boolean(
          user.isGuru ||
          userId.startsWith('GURU-') ||
          user.role === 'guru' ||
          user.role === 'admin'
        );

        // Cek status online murni dari Supabase Realtime Presence
        const onlineEntry =
          onlineUsersMap[userId] ||
          (userUid ? onlineUsersMap[userUid] : null) ||
          (userNama ? onlineUsersMap[userNama.toLowerCase()] : null) ||
          null;

        const isCurrent = Boolean(
          (currentId && userId === currentId) ||
          (currentName && userNama.toLowerCase() === currentName)
        );

        const lastSeenMs = onlineEntry?.lastSeen || (isCurrent ? now : (user.last_active ? new Date(user.last_active).getTime() : null));
        const isOnline = isCurrent || Boolean(onlineEntry && onlineEntry.lastSeen && (now - onlineEntry.lastSeen < 45000));

        // Format waktu presisi detik / menit
        let preciseStatus = 'Offline';
        let onlineDurationText = '';

        if (isOnline) {
          const diffSec = Math.max(0, Math.floor((now - (onlineEntry?.lastSeen || now)) / 1000));
          const sessionStart = onlineEntry?.sessionStart || (now - diffSec * 1000);
          const totalOnlineSec = Math.max(1, Math.floor((now - sessionStart) / 1000));

          if (totalOnlineSec < 60) {
            onlineDurationText = `Online ${totalOnlineSec} detik`;
          } else if (totalOnlineSec < 3600) {
            const m = Math.floor(totalOnlineSec / 60);
            const s = totalOnlineSec % 60;
            onlineDurationText = `Online ${m}m ${s}d`;
          } else {
            const h = Math.floor(totalOnlineSec / 3600);
            const m = Math.floor((totalOnlineSec % 3600) / 60);
            onlineDurationText = `Online ${h}j ${m}m`;
          }

          preciseStatus = diffSec <= 3 ? '🟢 Aktif sekarang (Live)' : `🟢 Aktif (${diffSec} detik lalu)`;
        } else if (lastSeenMs) {
          const diffSec = Math.max(0, Math.floor((now - lastSeenMs) / 1000));
          if (diffSec < 60) {
            preciseStatus = `Terakhir: ${diffSec} detik lalu`;
          } else if (diffSec < 3600) {
            const m = Math.floor(diffSec / 60);
            preciseStatus = `Terakhir: ${m} menit lalu`;
          } else if (diffSec < 86400) {
            const h = Math.floor(diffSec / 3600);
            preciseStatus = `Terakhir: ${h} jam lalu`;
          } else {
            const d = Math.floor(diffSec / 86400);
            preciseStatus = `Terakhir: ${d} hari lalu`;
          }
        }

        const onlineActivity = onlineEntry?.activity || (isOnline ? '🌐 Aktif di Portal' : 'Offline');

        // 📸 Resolusi Foto Profil Siswa / Guru (Database + Supabase Presence + Local Storage Cache dengan Proteksi Role)
        const isUserGuru = Boolean(
          user.isGuru ||
          userId.startsWith('GURU-') ||
          user.role === 'guru' ||
          user.role === 'admin'
        );
        const userPrefix = isUserGuru ? 'GURU-' : 'SISWA-';
        const photoKey1 = `user_photo_${userPrefix}${user.rawId || userId}`;
        const photoKey2 = `user_photo_${userId}`;
        const photoKey3 = user.username ? `user_photo_${user.username}` : '';
        const photoKey4 = userNama ? `user_photo_${userNama}` : '';

        const cachedPhoto = typeof window !== 'undefined'
          ? (localStorage.getItem(photoKey1) ||
             localStorage.getItem(photoKey2) ||
             (photoKey3 && localStorage.getItem(photoKey3)) ||
             (photoKey4 && localStorage.getItem(photoKey4)) || '')
          : '';

        const effectivePhoto = user.foto_url || user.foto || onlineEntry?.foto_url || cachedPhoto || '';

        return {
          id: userId,
          rawId: user.rawId || user.id_guru || user.id_siswa || userId,
          rfid_uid: userUid,
          inisial: user.inisial || '',
          biodata: user.biodata || null,
          rawUser: user,
          nama: userNama,
          kelas: String(user.kelas || (isGuru ? 'Guru / Tenaga Pengajar' : '-')),
          jurusan: String(user.jurusan || (isGuru ? 'Guru / Staff' : '-')),
          role: String(user.role || (isGuru ? 'Guru' : 'Siswa')),
          isGuru: isGuru,
          isOnline: isOnline,
          activity: onlineActivity,
          lastSeen: preciseStatus,
          onlineDurationText: onlineDurationText,
          foto_url: effectivePhoto,
        };
      })
      .sort((a, b) => {
        if (a.isOnline && !b.isOnline) return -1;
        if (!a.isOnline && b.isOnline) return 1;
        return (a.nama || '').localeCompare(b.nama || '');
      });
  }, [siswaList, currentUser, onlineUsersMap, now, isOpen, photoVersion]);

  const filteredUsers = useMemo(() => {
    if (!isOpen) return [];
    return allUsersWithStatus.filter((u) => {
      // Filter type
      if (filterType === 'online' && !u.isOnline) return false;
      if (filterType === 'guru' && !u.isGuru) return false;
      if (filterType === 'siswa' && u.isGuru) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (u.nama || '').toLowerCase().includes(q);
        const matchKelas = (u.kelas || '').toLowerCase().includes(q);
        const matchJurusan = (u.jurusan || '').toLowerCase().includes(q);
        return matchName || matchKelas || matchJurusan;
      }
      return true;
    });
  }, [allUsersWithStatus, filterType, searchQuery, isOpen]);

  const onlineCount = allUsersWithStatus.filter((u) => u.isOnline).length;
  const offlineCount = allUsersWithStatus.length - onlineCount;

  // Render check setelah seluruh React Hooks terpanggil secara konsisten
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        className="stardust-white-card"
        style={{
          borderRadius: '20px',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER MODAL */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 60%, #2563eb 100%)',
            color: '#ffffff',
            padding: '18px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>👥</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', letterSpacing: '0.3px' }}>
                Guru &amp; Siswa/i yang Online
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#93c5fd' }}>
                🟢 {onlineCount} Sedang Online &bull; ⚪ {offlineCount} Sedang Offline
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* CONTROLS (SEARCH & FILTERS) */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
          {/* SEARCH INPUT */}
          <div style={{ position: 'relative', marginBottom: '10px' }}>
            <span style={{ position: 'absolute', left: '12px', top: '9px', fontSize: '14px', color: '#94a3b8' }}>
              🔍
            </span>
            <input
              type="text"
              placeholder="Cari nama guru atau siswa/i..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '9px 12px 9px 36px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                backgroundColor: '#ffffff',
              }}
            />
          </div>

          {/* FILTER BUTTONS */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
            {[
              { id: 'all', label: `Semua (${allUsersWithStatus.length})` },
              { id: 'online', label: `🟢 Online (${onlineCount})` },
              { id: 'guru', label: '👨‍🏫 Guru' },
              { id: 'siswa', label: '🎒 Siswa/i' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterType(f.id)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '20px',
                  border: filterType === f.id ? '1px solid #2563eb' : '1px solid #e2e8f0',
                  backgroundColor: filterType === f.id ? '#2563eb' : '#ffffff',
                  color: filterType === f.id ? '#ffffff' : '#64748b',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* LIST OF USERS */}
        <div style={{ padding: '8px 16px', overflowY: 'auto', flex: 1 }}>
          {filteredUsers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 10px', color: '#94a3b8' }}>
              <div style={{ fontSize: '32px', marginBottom: '6px' }}>🔍</div>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 'bold' }}>Pengguna tidak ditemukan</p>
              <span style={{ fontSize: '11px' }}>Coba kata kunci pencarian yang lain.</span>
            </div>
          ) : (
            filteredUsers.map((user, idx) => (
              <div
                key={`${user.id || 'usr'}-${idx}`}
                onClick={() => onSelectUser && onSelectUser(user)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  marginBottom: '6px',
                  backgroundColor: user.isOnline ? '#f0fdf4' : '#ffffff',
                  border: user.isOnline ? '1.5px solid #86efac' : '1px solid #e2e8f0',
                  transition: 'all 0.15s ease',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 10px rgba(37, 99, 235, 0.12)';
                  e.currentTarget.style.borderColor = '#3b82f6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
                  e.currentTarget.style.borderColor = user.isOnline ? '#86efac' : '#e2e8f0';
                }}
                title={`Klik untuk membuka Profil & ID Card ${user.nama}`}
              >
                {/* AVATAR & INFO */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: user.isGuru
                          ? 'linear-gradient(135deg, #2563eb, #1d4ed8)'
                          : 'linear-gradient(135deg, #ea580c, #f59e0b)',
                        color: '#ffffff',
                        fontWeight: 'bold',
                        fontSize: '15px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                        overflow: 'hidden',
                        border: '1.5px solid rgba(255,255,255,0.8)',
                      }}
                    >
                      {user.foto_url ? (
                        <img
                          src={user.foto_url}
                          alt={user.nama}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        (user.nama || 'U').charAt(0).toUpperCase()
                      )}
                    </div>
                    {/* Status Dot */}
                    <span
                      style={{
                        position: 'absolute',
                        bottom: '0px',
                        right: '0px',
                        width: '11px',
                        height: '11px',
                        borderRadius: '50%',
                        backgroundColor: user.isOnline ? '#22c55e' : '#94a3b8',
                        border: '2px solid #ffffff',
                        boxShadow: user.isOnline ? '0 0 8px rgba(34, 197, 94, 0.8)' : 'none',
                      }}
                    />
                  </div>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <h4
                        style={{
                          margin: 0,
                          fontSize: '13px',
                          fontWeight: 'bold',
                          color: '#0f172a',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '180px',
                        }}
                      >
                        {user.nama}
                      </h4>
                      <span
                        style={{
                          fontSize: '9px',
                          fontWeight: 'bold',
                          padding: '1px 6px',
                          borderRadius: '8px',
                          backgroundColor: user.isGuru ? '#dbeafe' : '#ffedd5',
                          color: user.isGuru ? '#1e40af' : '#c2410c',
                        }}
                      >
                        {user.isGuru ? 'GURU' : 'SISWA/I'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '2px' }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: '11px',
                          color: '#64748b',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '160px',
                        }}
                      >
                        {user.kelas}
                      </p>
                      {/* 📍 LIVE ACTIVITY TRACKER BADGE */}
                      <span
                        style={{
                          fontSize: '10px',
                          color: user.isOnline ? '#1d4ed8' : '#64748b',
                          backgroundColor: user.isOnline ? '#eff6ff' : '#f8fafc',
                          border: user.isOnline ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                          padding: '1px 6px',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          fontWeight: user.isOnline ? 'bold' : 'normal',
                          maxWidth: '200px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {user.isOnline ? `${user.activity} (${user.lastSeen})` : user.lastSeen}
                      </span>
                    </div>
                  </div>
                </div>

                {/* STATUS BADGE & LIHAT PROFIL BUTTON */}
                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '8px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  {user.isOnline ? (
                    <div>
                      <span
                        style={{
                          backgroundColor: '#dcfce7',
                          color: '#15803d',
                          fontSize: '10px',
                          fontWeight: 'bold',
                          padding: '2px 7px',
                          borderRadius: '10px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          boxShadow: '0 1px 3px rgba(22, 101, 52, 0.1)',
                        }}
                      >
                        <span style={{ fontSize: '7px', animation: 'liveRadarBlink 1.5s infinite' }}>🟢</span> Online
                      </span>
                      {user.onlineDurationText && (
                        <div style={{ fontSize: '9px', color: '#166534', fontWeight: 'bold', marginTop: '1px' }}>
                          ⏱️ {user.onlineDurationText}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span
                      style={{
                        backgroundColor: '#f1f5f9',
                        color: '#94a3b8',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        padding: '2px 7px',
                        borderRadius: '10px',
                      }}
                    >
                      ⚪ Offline
                    </span>
                  )}

                  <span
                    style={{
                      fontSize: '9.5px',
                      color: '#2563eb',
                      fontWeight: 'bold',
                      backgroundColor: '#eff6ff',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      border: '1px solid #bfdbfe',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '2px',
                    }}
                  >
                    Profil ➔
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* FOOTER */}
        <div style={{ padding: '10px 16px', borderTop: '1px solid #f1f5f9', backgroundColor: '#f8fafc', textAlign: 'center' }}>
          <span style={{ fontSize: '11px', color: '#64748b' }}>
            Data status online diperbarui secara otomatis setiap detik.
          </span>
        </div>
      </div>
    </div>
  );
}
