'use client';

import React, { useState, useEffect, useRef } from 'react';

// 🤖 WIDGET FLOATING 'TANYA AI' ASISTEN SEKOLAH DI POJOK KANAN BAWAH
export default function FloatingAiChatWidget({ currentUser, statsCount, siswaList = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMsg, setInputMsg] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: `Halo ${currentUser?.nama || 'Bapak/Ibu/Siswa'}! 👋 Saya Asisten AI SMK YPK Medan. Ada yang bisa saya bantu terkait jadwal presensi, sistem biometrik wajah AI, perangkat & modul ajar, perpustakaan, ujian CBT, atau fitur SMK YPK Medan Super App?`,
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const chatBottomRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const quickPrompts = [
    '🕒 Jam Masuk & Pulang',
    '📘 Info Perangkat Ajar',
    '📊 Rekap Kehadiran Hari Ini',
    '🪪 Cara Upload Foto ID',
  ];

  const handleSend = (textToSend) => {
    const query = (textToSend || inputMsg).trim();
    if (!query) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: query,
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputMsg('');
    setIsTyping(true);

    setTimeout(() => {
      let reply = '';
      const q = query.toLowerCase();

      if (q.includes('jam') || q.includes('masuk') || q.includes('pulang') || q.includes('waktu') || q.includes('telat')) {
        reply = `🕒 **Ketentuan Jam Presensi SMK YPK Medan:**\n• **Jam Masuk:** 07.15 WIB\n• **Batas Hadir Tepat:** 07.30 WIB (lewat dari ini tercatat Telat)\n• **Jam Pulang Guru:** 14.30 - 15.00 WIB\n• Presensi menggunakan Kamera Scanner Wajah AI di pos piket / kelas.`;
      } else if (q.includes('wajah') || q.includes('face') || q.includes('scan') || q.includes('biometrik') || q.includes('kartu')) {
        reply = `📋 **Sistem Presensi Digital SMK YPK Medan:**\n1. Presensi kehadiran guru dan siswa dicatat secara terpusat dan realtime.\n2. Rekapitulasi kehadiran harian dapat dipantau langsung dari menu **Presensi**.\n3. Untuk pembaruan status kehadiran (Sakit/Izin/Dinas), silakan lapor kepada Guru Piket atau Admin Sekolah.`;
      } else if (q.includes('perangkat') || q.includes('modul') || q.includes('cp') || q.includes('atp') || q.includes('rpp') || q.includes('ajar')) {
        reply = `📘 **Perangkat & Modul Ajar Digital SMK YPK Medan:**\n• Guru dapat mengunggah dokumen CP, ATP, Modul Ajar P5, Kalender Pendidikan, dan Asesmen dalam format PDF/Word.\n• Siswa dapat membaca dan mengunduh Modul Ajar langsung dari aplikasi.\n• Terintegrasi dengan pembaca dokumen digital interaktif.`;
      } else if (q.includes('rekap') || q.includes('statistik') || q.includes('hadir') || q.includes('persen') || q.includes('berapa')) {
        reply = `📊 **Statistik Kehadiran Hari Ini:**\n• Total Terdata: **${statsCount?.total || 0} orang**\n• Hadir Tepat: **${statsCount?.hadir || 0} orang**\n• Telat / Sakit / Izin: **${(statsCount?.telat || 0) + (statsCount?.sakit || 0) + (statsCount?.izin || 0)} orang**\n• Tingkat Kehadiran: **${statsCount?.persentase || 0}%**`;
      } else if (q.includes('foto') || q.includes('upload') || q.includes('ganti foto') || q.includes('gambar')) {
        reply = `🪪 **Cara Upload & Ganti Foto ID Card:**\n1. Buka menu **Profil & Kartu Digital** (atau tombol *ID Card Saya* di beranda).\n2. Klik tombol **📷 Upload / Ganti Foto** di bawah kotak foto ID Card.\n3. Pilih foto Anda dari galeri/kamera.\n4. Foto akan langsung tampil di ID Card dan tersimpan secara otomatis.`;
      } else if (q.includes('super app') || q.includes('fitur') || q.includes('menu') || q.includes('aplikasi')) {
        reply = `🚀 **Fitur SMK YPK MEDAN SUPER APP:**\n1. **Presensi Wajah AI:** Terminal pemindai biometrik wajah siswa, guru, dan pegawai realtime.\n2. **ID Card Digital:** Kartu identitas resmi dengan barcode & biodata lengkap pendidik.\n3. **Perangkat Ajar Guru:** Administrasi, CP/ATP, Modul Ajar P5 & Asesmen.\n4. **Ujian CBT Online:** Ujian layar penuh dengan proteksi anti-nyontek.\n5. **Perpustakaan Digital:** Pembaca dan pengunggah E-Book PDF guru & siswa.`;
      } else if (q.includes('halo') || q.includes('hai') || q.includes('pagi') || q.includes('siang') || q.includes('sore') || q.includes('malam')) {
        reply = `Halo! Senang bisa membantu Anda di **SMK YPK Medan Super App**. Ada informasi apa yang ingin Anda tanyakan seputar presensi atau sekolah?`;
      } else if (q.includes('terima kasih') || q.includes('makasih') || q.includes('thanks')) {
        reply = `Sama-sama! Semangat menjalankan aktivitas di SMK Swasta YPK Medan. Jika butuh bantuan lain, saya selalu siap di sini! 😊`;
      } else {
        reply = `Saya mengerti pertanyaan Anda mengenai "${query}".\n\nUntuk informasi lebih rinci terkait administrasi, Anda dapat mengakses menu di **SMK YPK Medan Super App** atau menghubungi Admin Sekolah / Guru Piket. Ada hal lain yang ingin Anda ketahui seputar presensi wajah AI?`;
      }

      const aiMsg = {
        id: Date.now() + 1,
        sender: 'ai',
        text: reply,
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 600);
  };

  return (
    <>
      {/* FLOATING BUTTON DI POJOK KANAN BAWAH */}
      <div className="floating-chat-btn-container">
        {!isOpen && (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            style={{
              background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 50%, #9a3412 100%)',
              color: '#ffffff',
              border: '2px solid rgba(254, 215, 170, 0.6)',
              borderRadius: '50px',
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(234, 88, 12, 0.45)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.25s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.06)';
              e.currentTarget.style.boxShadow = '0 12px 30px rgba(234, 88, 12, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(234, 88, 12, 0.45)';
            }}
          >
            <span style={{ fontSize: '20px' }}>🤖</span>
            <span>Tanya AI</span>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#4ade80',
                display: 'inline-block',
                marginLeft: '2px',
                boxShadow: '0 0 8px #4ade80',
              }}
            />
          </button>
        )}

        {/* DIALOG CHAT WINDOW */}
        {isOpen && (
          <div
            style={{
              width: '360px',
              maxWidth: 'calc(100vw - 32px)',
              height: '520px',
              maxHeight: 'calc(100vh - 100px)',
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              animation: 'fadeIn 0.2s ease-out',
            }}
          >
            {/* HEADER */}
            <div
              style={{
                background: 'linear-gradient(135deg, #7c2d12 0%, #c2410c 50%, #ea580c 100%)',
                color: '#ffffff',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                  }}
                >
                  🤖
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#ffffff' }}>
                    Asisten AI SMK YPK
                  </h4>
                  <span style={{ fontSize: '11px', color: '#fed7aa', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#4ade80', display: 'inline-block' }} />
                    Online &amp; Siap Bantu
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: '#ffffff',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Tutup Chat"
              >
                ✕
              </button>
            </div>

            {/* CHAT MESSAGES BODY */}
            <div
              style={{
                flex: 1,
                padding: '14px',
                overflowY: 'auto',
                backgroundColor: '#f8fafc',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              {messages.map((m) => (
                <div
                  key={m.id}
                  style={{
                    alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    backgroundColor: m.sender === 'user' ? '#ea580c' : '#ffffff',
                    color: m.sender === 'user' ? '#ffffff' : '#1e293b',
                    padding: '10px 14px',
                    borderRadius: m.sender === 'user' ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                    fontSize: '12.5px',
                    lineHeight: '1.45',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    border: m.sender === 'user' ? 'none' : '1px solid #e2e8f0',
                    whiteSpace: 'pre-line',
                  }}
                >
                  <div>{m.text}</div>
                  <div
                    style={{
                      fontSize: '9.5px',
                      color: m.sender === 'user' ? '#fed7aa' : '#94a3b8',
                      textAlign: 'right',
                      marginTop: '4px',
                    }}
                  >
                    {m.time}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div
                  style={{
                    alignSelf: 'flex-start',
                    backgroundColor: '#ffffff',
                    padding: '8px 14px',
                    borderRadius: '16px',
                    fontSize: '12px',
                    color: '#64748b',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>🤖 AI sedang mengetik...</span>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* QUICK PROMPTS BADGES */}
            <div
              style={{
                padding: '8px 12px',
                backgroundColor: '#ffffff',
                borderTop: '1px solid #f1f5f9',
                display: 'flex',
                gap: '6px',
                overflowX: 'auto',
                whiteSpace: 'nowrap',
              }}
            >
              {quickPrompts.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(p)}
                  style={{
                    fontSize: '11px',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    border: '1px solid #fed7aa',
                    backgroundColor: '#fff7ed',
                    color: '#c2410c',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    flexShrink: 0,
                  }}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* INPUT FOOTER */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              style={{
                padding: '10px 12px',
                backgroundColor: '#ffffff',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                gap: '8px',
              }}
            >
              <input
                type="text"
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                placeholder="Ketik pertanyaan Anda..."
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '24px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12.5px',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                style={{
                  backgroundColor: '#ea580c',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  flexShrink: 0,
                }}
                title="Kirim Pesan"
              >
                ➔
              </button>
            </form>
          </div>
        )}
      </div>
    </>
  );
}
