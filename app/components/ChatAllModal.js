'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vubetdnbvyvwykffteoc.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1YmV0ZG5idnl2d3lrZmZ0ZW9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY5NTM5MTcsImV4cCI6MjA2MjUyOTkxN30.8Vv8n3aXjY-X6wR_0V7Xo6z_yQ5Z9U8T1-4Q6X7X9Y0';

const supabaseClient = typeof window !== 'undefined' ? createClient(supabaseUrl, supabaseAnonKey) : null;

const ALL_CHAT_CATEGORIES = [
  {
    id: 'Guru & Admin',
    label: '👨‍🏫 Guru & Admin',
    shortLabel: 'Guru & Admin',
    badgeBg: '#dcfce7',
    badgeText: '#166534',
    borderColor: '#86efac',
    privacyNote: '🔒 Khusus Guru & Admin (Siswa Admin Tidak Bisa Akses)',
  },
  {
    id: 'Siswa Admin',
    label: '🎒 Siswa/i Admin',
    shortLabel: 'Siswa/i Admin',
    badgeBg: '#f3e8ff',
    badgeText: '#6b21a8',
    borderColor: '#d8b4fe',
    privacyNote: '🔒 Khusus Siswa/i Admin (Guru Tidak Bisa Akses)',
  },
  {
    id: 'Pengumuman KBM',
    label: '📢 Broadcast KBM',
    shortLabel: 'Broadcast KBM',
    badgeBg: '#eff6ff',
    badgeText: '#1e40af',
    borderColor: '#93c5fd',
    privacyNote: '📢 Siaran Umum (Terbuka untuk Guru & Siswa/i Admin)',
  },
];

const INITIAL_MESSAGES = [
  {
    id: 'INIT-1',
    nama: 'MUHAMMAD IQBAL RANGKUTI,S.KOM., Gr.',
    role: 'admin',
    kategori: 'Guru & Admin',
    pesan: 'Selamat pagi bapak/ibu guru. Mohon diperhatikan jika berhalangan hadir agar segera mengupload bahan ajar dan instruksi tugas di menu Bahan Ajar Inval.',
    waktu: '07:15 WIB',
    tanggal: 'Hari Ini',
    kelas: 'Admin / Master',
    isRecalled: false,
    senderId: 'iqbal_master',
  },
  {
    id: 'INIT-2',
    nama: 'Admin Kelas X TJKT',
    role: 'siswa_admin',
    kategori: 'Siswa Admin',
    pesan: 'Untuk rekan-rekan Siswa/i Admin tiap kelas, pastikan modul pembelajaran KBM di kelas masing-masing berjalan tertib.',
    waktu: '07:35 WIB',
    tanggal: 'Hari Ini',
    kelas: 'Siswa/i Admin [X TJKT]',
    isRecalled: false,
    senderId: 'siswa_admin_x_tjkt',
  },
  {
    id: 'INIT-3',
    nama: 'Pusat Koordinasi SMK YPK',
    role: 'admin',
    kategori: 'Pengumuman KBM',
    pesan: '📢 Pengumuman Broadcast: Seluruh jam pelajaran KBM aktif sesuai jadwal roster hari ini. Selamat belajar & mengajar.',
    waktu: '08:00 WIB',
    tanggal: 'Hari Ini',
    kelas: 'Pusat Informasi',
    isRecalled: false,
    senderId: 'system_broadcast',
  },
];

export default function ChatAllModal({
  isOpen,
  onClose,
  currentUser,
  isMasterIqbal,
  isSiswaAdmin,
  siswaAdminKelas,
  supabase = supabaseClient,
}) {
  const isGuruAccount = Boolean(currentUser?.isGuru && !String(currentUser?.id).startsWith('SISWA-'));
  const isAdmin = Boolean(
    isMasterIqbal ||
    currentUser?.role === 'admin' ||
    currentUser?.role === 'master' ||
    (currentUser?.username || '').toLowerCase() === 'admin' ||
    (currentUser?.username || '').toLowerCase() === 'iqbal'
  );

  // Hak Akses Masuk Ruang Chat: Hanya Guru Admin, Guru, dan Siswa/i Admin
  const canAccessChat = Boolean(isAdmin || isGuruAccount || isSiswaAdmin);

  // 🔒 HAK AKSES PRIVACY KATEGORI MASING-MASING:
  // 1. Guru & Admin: Hanya Guru & Admin yang bisa membaca & mengirim (Siswa Admin DILARANG TOTAL)
  const canAccessGuruAdminChannel = Boolean(isAdmin || (isGuruAccount && !isSiswaAdmin));
  // 2. Siswa Admin: Hanya Siswa/i Admin dan Master Iqbal yang bisa membaca & mengirim (Guru biasa DILARANG TOTAL)
  const canAccessSiswaAdminChannel = Boolean(isMasterIqbal || isSiswaAdmin);
  // 3. Broadcast KBM: Terbuka untuk semua yang bisa masuk chat
  const canAccessBroadcastChannel = true;

  // Daftar kategori yang boleh dilihat & dipilih oleh user yang sedang login
  const allowedCategories = ALL_CHAT_CATEGORIES.filter((cat) => {
    if (cat.id === 'Guru & Admin') return canAccessGuruAdminChannel;
    if (cat.id === 'Siswa Admin') return canAccessSiswaAdminChannel;
    return canAccessBroadcastChannel;
  });

  const defaultTarget = isSiswaAdmin && !isMasterIqbal ? 'Siswa Admin' : 'Guru & Admin';

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [targetCategory, setTargetCategory] = useState(defaultTarget);
  const [filterCategory, setFilterCategory] = useState('Semua');
  const chatBottomRef = useRef(null);

  // Sesuaikan targetCategory jika default berubah
  useEffect(() => {
    if (isSiswaAdmin && !isMasterIqbal) {
      setTargetCategory('Siswa Admin');
    } else {
      setTargetCategory('Guru & Admin');
    }
  }, [isSiswaAdmin, isMasterIqbal]);

  // Load chat messages & Realtime Sync
  useEffect(() => {
    if (!isOpen || !canAccessChat) return;

    const loadMessages = () => {
      try {
        const stored = localStorage.getItem('smk_ypk_chat_all_messages_v4');
        if (stored) {
          setMessages(JSON.parse(stored));
        } else {
          setMessages(INITIAL_MESSAGES);
          localStorage.setItem('smk_ypk_chat_all_messages_v4', JSON.stringify(INITIAL_MESSAGES));
        }
      } catch (e) {
        setMessages(INITIAL_MESSAGES);
      }
    };

    loadMessages();

    // 🔄 1. Listener Storage Lokal Cross-Tab
    const handleStorageChange = (e) => {
      if (e.key === 'smk_ypk_chat_all_messages_v4' || e.type === 'smk_ypk_chat_sync') {
        loadMessages();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('smk_ypk_chat_sync', handleStorageChange);

    // 📡 2. Supabase Realtime Broadcast Channel (Cross-Device HP / Laptop)
    let chatChannel = null;
    if (supabase) {
      chatChannel = supabase.channel('smk_ypk_chat_broadcast_room');
      chatChannel
        .on('broadcast', { event: 'chat_message' }, (payload) => {
          if (payload?.payload) {
            setMessages((prev) => {
              const exists = prev.some((m) => m.id === payload.payload.id);
              if (exists) return prev;
              const updated = [...prev, payload.payload];
              try {
                localStorage.setItem('smk_ypk_chat_all_messages_v4', JSON.stringify(updated));
              } catch (err) {}
              return updated;
            });
          }
        })
        .on('broadcast', { event: 'chat_recall' }, (payload) => {
          if (payload?.payload?.id) {
            setMessages((prev) => {
              const updated = prev.map((m) =>
                m.id === payload.payload.id
                  ? { ...m, isRecalled: true, pesan: '🚫 Pesan ini telah ditarik oleh pengirim.' }
                  : m
              );
              try {
                localStorage.setItem('smk_ypk_chat_all_messages_v4', JSON.stringify(updated));
              } catch (err) {}
              return updated;
            });
          }
        })
        .on('broadcast', { event: 'chat_clear' }, () => {
          setMessages([]);
          try {
            localStorage.setItem('smk_ypk_chat_all_messages_v4', JSON.stringify([]));
          } catch (err) {}
        })
        .subscribe();
    }

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('smk_ypk_chat_sync', handleStorageChange);
      if (chatChannel && supabase) {
        supabase.removeChannel(chatChannel);
      }
    };
  }, [isOpen, canAccessChat, supabase]);

  // Auto scroll to bottom
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages, isOpen, filterCategory]);

  if (!isOpen || !canAccessChat) return null;

  const currentUserIdStr = String(currentUser?.rawId || currentUser?.id || currentUser?.username || 'user');

  // 🔒 PRIVACY FILTER: HANYA PESAN YANG SESUAI HAK AKSES YANG DIIZINKAN DILIHAT
  const visibleMessages = messages.filter((m) => {
    // 1. Pesan Broadcast: Boleh dibaca oleh semua yang login
    if (m.kategori === 'Pengumuman KBM' || m.kategori === 'Broadcast KBM' || m.kategori === 'Broadcast') {
      return true;
    }

    // 2. Pesan Khusus 'Guru & Admin': Hanya Guru dan Admin (Siswa Admin TIDAK BISA LIHAT)
    if (m.kategori === 'Guru & Admin') {
      return canAccessGuruAdminChannel;
    }

    // 3. Pesan Khusus 'Siswa Admin': Hanya Siswa/i Admin dan Master Iqbal (Guru biasa TIDAK BISA LIHAT)
    if (m.kategori === 'Siswa Admin') {
      return canAccessSiswaAdminChannel;
    }

    // 4. Jika pengirim adalah user sendiri
    if (m.senderId && m.senderId === currentUserIdStr) {
      return true;
    }

    return false;
  });

  // Tampilan pesan setelah difilter tab kategori yang aktif
  const displayedMessages = visibleMessages.filter((m) => {
    if (filterCategory === 'Semua') return true;
    return m.kategori === filterCategory;
  });

  const syncChatUpdate = (updatedMessages, broadcastEvent = null, broadcastPayload = null) => {
    setMessages(updatedMessages);
    try {
      localStorage.setItem('smk_ypk_chat_all_messages_v4', JSON.stringify(updatedMessages));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('smk_ypk_chat_sync'));
      }
    } catch (err) {
      console.warn('Failed syncing chat:', err);
    }

    // Kirim via Supabase Broadcast jika ada
    if (supabase && broadcastEvent) {
      try {
        supabase.channel('smk_ypk_chat_broadcast_room').send({
          type: 'broadcast',
          event: broadcastEvent,
          payload: broadcastPayload,
        });
      } catch (e) {}
    }
  };

  const handleSendMessage = (e) => {
    e?.preventDefault();
    if (!inputText.trim()) return;

    // Keamanan ganda: pastikan targetCategory diizinkan untuk peran saat ini
    const isTargetAllowed = allowedCategories.some((c) => c.id === targetCategory);
    const finalTarget = isTargetAllowed ? targetCategory : defaultTarget;

    const now = new Date();
    const waktuStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }) + ' WIB';

    let userRole = 'guru';
    let userKelas = currentUser?.kelas || currentUser?.jabatan || 'Guru SMK YPK';

    if (isAdmin) {
      userRole = 'admin';
      userKelas = 'Admin / Kepala';
    } else if (isSiswaAdmin) {
      userRole = 'siswa_admin';
      userKelas = siswaAdminKelas ? `Siswa/i Admin [${siswaAdminKelas}]` : 'Siswa/i Admin';
    }

    const newMsg = {
      id: 'MSG-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      nama: currentUser?.nama || (isAdmin ? 'Admin Sekolah' : 'Pengguna'),
      role: userRole,
      kategori: finalTarget,
      pesan: inputText.trim(),
      waktu: waktuStr,
      tanggal: 'Hari Ini',
      kelas: userKelas,
      isRecalled: false,
      senderId: currentUserIdStr,
    };

    const updated = [...messages, newMsg];
    syncChatUpdate(updated, 'chat_message', newMsg);
    setInputText('');
  };

  // ↩️ FITUR TARIK PESAN REALTIME (UNSEND MESSAGE)
  const handleRecallMessage = (msgId) => {
    const updated = messages.map((m) => {
      if (m.id === msgId) {
        return {
          ...m,
          isRecalled: true,
          pesan: '🚫 Pesan ini telah ditarik oleh pengirim.',
        };
      }
      return m;
    });
    syncChatUpdate(updated, 'chat_recall', { id: msgId });
  };

  // 🗑️ TOMBOL BERSIHKAN (KHUSUS ADMIN MASTER)
  const handleDirectClearChat = () => {
    if (!isAdmin) return;
    syncChatUpdate([], 'chat_clear', {});
  };

  const getCategoryBadge = (catId) => {
    const found = ALL_CHAT_CATEGORIES.find((c) => c.id === catId);
    if (found) return found;
    return {
      id: catId,
      label: `📌 ${catId}`,
      shortLabel: catId,
      badgeBg: '#f1f5f9',
      badgeText: '#475569',
      borderColor: '#cbd5e1',
      privacyNote: '',
    };
  };

  // Keyboard Escape listener untuk menutup modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        overflowY: 'auto',
        padding: 'calc(env(safe-area-inset-top, 0px) + 16px) 12px 24px 12px',
        boxSizing: 'border-box',
      }}
      onClick={onClose}
    >
      <div
        className="stardust-white-card"
        style={{
          borderRadius: '22px',
          width: '100%',
          maxWidth: '560px',
          height: '92vh',
          maxHeight: 'calc(100dvh - 36px)',
          margin: 'auto 0',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 📱 HEADER MODAL */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
            color: '#ffffff',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
              }}
            >
              💬
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <h3 style={{ margin: 0, fontSize: '14.5px', fontWeight: '800', color: '#ffffff', letterSpacing: '0.2px' }}>
                  Ruang Chat SMK YPK
                </h3>
                <span
                  style={{
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    fontSize: '8.5px',
                    fontWeight: '800',
                    padding: '2px 6px',
                    borderRadius: '10px',
                  }}
                >
                  🟢 Realtime
                </span>
              </div>
              <p style={{ margin: '1px 0 0 0', fontSize: '10.5px', color: '#bfdbfe' }}>
                {isSiswaAdmin && !isMasterIqbal
                  ? '🔒 Saluran Siswa/i Admin & Broadcast KBM'
                  : !isSiswaAdmin && !isMasterIqbal
                  ? '🔒 Saluran Guru & Admin & Broadcast KBM'
                  : 'Koordinasi Master: Guru Admin & Siswa/i Admin'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {/* TOMBOL BERSIHKAN: KHUSUS ADMIN MASTER */}
            {isAdmin && (
              <button
                type="button"
                onClick={handleDirectClearChat}
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.3)',
                  border: '1px solid rgba(239, 68, 68, 0.6)',
                  color: '#fee2e2',
                  padding: '5px 10px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease',
                }}
                title="Klik Sekali untuk Bersihkan Seluruh Chat"
              >
                <span>🗑️</span>
                <span>Bersihkan</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.25)',
                border: 'none',
                color: '#ffffff',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                touchAction: 'manipulation',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#ef4444')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.25)')}
              title="Tutup Chat"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 🌟 TAB FILTER SESUAI HAK PRIVASI MASING-MASING */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            padding: '8px 12px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            gap: '6px',
            overflowX: 'auto',
            flexShrink: 0,
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <button
            type="button"
            onClick={() => setFilterCategory('Semua')}
            style={{
              padding: '6px 12px',
              borderRadius: '10px',
              fontSize: '11px',
              fontWeight: filterCategory === 'Semua' ? '800' : '600',
              border: filterCategory === 'Semua' ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
              backgroundColor: filterCategory === 'Semua' ? '#2563eb' : '#ffffff',
              color: filterCategory === 'Semua' ? '#ffffff' : '#475569',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              boxShadow: filterCategory === 'Semua' ? '0 2px 6px rgba(37, 99, 235, 0.25)' : 'none',
            }}
          >
            💬 Semua ({visibleMessages.length})
          </button>

          {allowedCategories.map((cat) => {
            const isActive = filterCategory === cat.id;
            const count = visibleMessages.filter((m) => m.kategori === cat.id).length;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setFilterCategory(cat.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '10px',
                  fontSize: '11px',
                  fontWeight: isActive ? '800' : '600',
                  border: isActive ? `1.5px solid ${cat.borderColor}` : '1px solid #cbd5e1',
                  backgroundColor: isActive ? cat.badgeBg : '#ffffff',
                  color: isActive ? cat.badgeText : '#475569',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  boxShadow: isActive ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                {cat.label} ({count})
              </button>
            );
          })}
        </div>

        {/* 💬 DAFTAR PESAN (CHAT BUBBLE AREA) */}
        <div
          style={{
            flex: 1,
            padding: '12px 14px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            backgroundColor: '#f1f5f9',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {displayedMessages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 14px', color: '#94a3b8' }}>
              <div style={{ fontSize: '38px', marginBottom: '8px' }}>🔒</div>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 'bold', color: '#334155' }}>
                Belum ada pesan di saluran ini.
              </p>
              <p style={{ margin: '4px 0 0 0', fontSize: '11px' }}>
                Pesan di saluran ini terisolasi dan hanya dapat diakses oleh pihak yang berwenang.
              </p>
            </div>
          ) : (
            displayedMessages.map((msg) => {
              const isMyMsg =
                (msg.senderId && msg.senderId === currentUserIdStr) ||
                (currentUser?.nama && msg.nama && msg.nama.trim().toLowerCase() === currentUser.nama.trim().toLowerCase());

              const isAdminMsg = msg.role === 'admin';
              const isSiswaAdminMsg = msg.role === 'siswa_admin';
              const catBadge = getCategoryBadge(msg.kategori);

              return (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isMyMsg ? 'flex-end' : 'flex-start',
                    maxWidth: '100%',
                  }}
                >
                  {/* PENGIRIM INFO BAR */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      marginBottom: '3px',
                      fontSize: '11px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span style={{ fontWeight: 'bold', color: isMyMsg ? '#1e40af' : '#0f172a' }}>
                      {isMyMsg ? 'Anda' : msg.nama}
                    </span>

                    <span
                      style={{
                        fontSize: '9px',
                        fontWeight: 'bold',
                        padding: '1px 6px',
                        borderRadius: '6px',
                        backgroundColor: isAdminMsg ? '#fee2e2' : isSiswaAdminMsg ? '#f3e8ff' : '#dbeafe',
                        color: isAdminMsg ? '#dc2626' : isSiswaAdminMsg ? '#7e22ce' : '#1e40af',
                      }}
                    >
                      {msg.kelas}
                    </span>

                    <span style={{ color: '#94a3b8', fontSize: '10px' }}>• {msg.waktu}</span>
                  </div>

                  {/* CHAT BUBBLE */}
                  <div
                    style={{
                      backgroundColor: isMyMsg ? '#2563eb' : '#ffffff',
                      color: isMyMsg ? '#ffffff' : '#0f172a',
                      padding: '10px 14px',
                      borderRadius: isMyMsg ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      boxShadow: isMyMsg ? '0 4px 12px rgba(37, 99, 235, 0.25)' : '0 2px 8px rgba(0, 0, 0, 0.05)',
                      maxWidth: '85%',
                      wordBreak: 'break-word',
                      border: isMyMsg ? 'none' : '1px solid #e2e8f0',
                      position: 'relative',
                    }}
                  >
                    {/* BADGE SALURAN PRIVACY */}
                    {!msg.isRecalled && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
                        <span
                          style={{
                            fontSize: '9px',
                            fontWeight: 'bold',
                            padding: '1px 6px',
                            borderRadius: '6px',
                            backgroundColor: isMyMsg ? 'rgba(255, 255, 255, 0.2)' : catBadge.badgeBg,
                            color: isMyMsg ? '#ffffff' : catBadge.badgeText,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                        >
                          {catBadge.label}
                        </span>

                        {/* ↩️ TOMBOL TARIK PESAN */}
                        {(isMyMsg || isAdmin) && (
                          <button
                            type="button"
                            onClick={() => handleRecallMessage(msg.id)}
                            style={{
                              backgroundColor: isMyMsg ? 'rgba(255,255,255,0.2)' : '#f1f5f9',
                              border: 'none',
                              color: isMyMsg ? '#ffffff' : '#ef4444',
                              fontSize: '9.5px',
                              fontWeight: 'bold',
                              borderRadius: '4px',
                              padding: '2px 6px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px',
                            }}
                            title="Tarik Pesan Ini"
                          >
                            <span>↩️</span>
                            <span>Tarik</span>
                          </button>
                        )}
                      </div>
                    )}

                    <div style={{ fontSize: '13px', lineHeight: '1.45', fontStyle: msg.isRecalled ? 'italic' : 'normal', whiteSpace: 'pre-wrap' }}>
                      {msg.pesan}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* 🔘 PILIHAN TUJUAN PESAN (SESUAI PRIVACY PERAN) */}
        <div
          style={{
            backgroundColor: '#ffffff',
            padding: '8px 12px 0 12px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span style={{ fontSize: '11px', fontWeight: '800', color: '#1e3a8a', whiteSpace: 'nowrap' }}>
            Tujuan:
          </span>
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', flex: 1, WebkitOverflowScrolling: 'touch' }}>
            {allowedCategories.map((cat) => {
              const isSelected = targetCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setTargetCategory(cat.id)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: isSelected ? '800' : '600',
                    border: isSelected ? `1.5px solid ${cat.borderColor}` : '1px solid #e2e8f0',
                    backgroundColor: isSelected ? cat.badgeBg : '#f8fafc',
                    color: isSelected ? cat.badgeText : '#64748b',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s ease',
                  }}
                  title={cat.privacyNote}
                >
                  <span>{cat.label}</span>
                  {isSelected && <span>✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* ✍️ INPUT FORM BAR */}
        <form
          onSubmit={handleSendMessage}
          style={{
            backgroundColor: '#ffffff',
            padding: '10px 12px 14px 12px',
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <input
            type="text"
            placeholder={`Tulis pesan untuk ${allowedCategories.find((c) => c.id === targetCategory)?.label || targetCategory}...`}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: '12px',
              border: '1.5px solid #cbd5e1',
              fontSize: '13px',
              outline: 'none',
              backgroundColor: '#f8fafc',
            }}
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            style={{
              backgroundColor: inputText.trim() ? '#2563eb' : '#cbd5e1',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: 'bold',
              cursor: inputText.trim() ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              flexShrink: 0,
              boxShadow: inputText.trim() ? '0 3px 8px rgba(37, 99, 235, 0.3)' : 'none',
            }}
          >
            <span>Kirim</span>
            <span>✉️</span>
          </button>
        </form>
      </div>
    </div>
  );
}
