'use client';

import React, { useState, useRef, useEffect } from 'react';

export default function TanyaAiView({ currentUser }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: `Halo ${currentUser?.nama || 'Siswa/Guru SMK YPK'}! 👋 Saya adalah **Asisten AI SMK YPK Medan**. \n\nSaya siap membantu Anda dalam:\n- 💡 Menjawab pertanyaan pelajaran kejuruan (TJKT, AKL, MPLB, PM) & umum\n- 📝 Membantu latihan soal ujian CBT & penjelasan konsep sulit\n- 🏫 Memberikan informasi seputar kegiatan & sistem sekolah\n- ⚡ Membuat rangkuman materi pelajaran praktis\n\nApa yang ingin Anda pelajari atau tanyakan hari ini?`,
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatBottomRef = useRef(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputPrompt.trim() || isTyping) return;

    const userText = inputPrompt.trim();
    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: userText,
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt('');
    setIsTyping(true);

    // AI Response Engine (Smart Subject Recognition)
    setTimeout(() => {
      let aiResponseText = '';
      const lower = userText.toLowerCase();

      if (lower.includes('ip address') || lower.includes('subnetting') || lower.includes('dhcp') || lower.includes('router') || lower.includes('tjkt')) {
        aiResponseText = `📡 **Penjelasan Konsep Jaringan (TJKT):**\n\nUntuk pertanyaan Anda terkait jaringan komputer:\n1. **IP Address & Subnetting**: Subnet mask /24 memiliki netmask \`255.255.255.0\` dan menyediakan hingga 254 host usable.\n2. **Protokol DHCP**: Server DHCP membagikan konfigurasi IP, Gateway, dan DNS secara otomatis tanpa konfigurasi manual di sisi klien.\n3. **Best Practice SMK YPK**: Pastikan konfigurasi IP Pool di Router Mikrotik tidak bentrok dengan IP statis server presensi RFID kita!`;
      } else if (lower.includes('akuntansi') || lower.includes('jurnal') || lower.includes('neraca') || lower.includes('akl') || lower.includes('debit')) {
        aiResponseText = `📊 **Penjelasan Konsep Akuntansi (AKL):**\n\nDalam siklus akuntansi keuangan:\n- **Persamaan Dasar**: \`Aset (Aktiva) = Kewajiban (Liabilitas) + Modal (Ekuitas)\`\n- **Aturan Debet/Kredit**: Aset bertambah di Debet (+), Kewajiban bertambah di Kredit (+), Pendapatan di Kredit (+), dan Beban di Debet (+).\n- Pastikan setiap jurnal penyesuaian akhir periode dihitung secara teliti sebelum menyusun kertas kerja 10 kolom!`;
      } else if (lower.includes('ujian') || lower.includes('cbt') || lower.includes('soal') || lower.includes('anti nyontek')) {
        aiResponseText = `📝 **Informasi Ujian CBT SMK YPK:**\n\nSistem Ujian CBT SMK YPK Medan dirancang dengan standar **30 Soal Pilihan Ganda + 5 Soal Essay**.\n- **Sistem Anti-Nyontek**: Menggunakan deteksi fullscreen dan tab switch (maksimal 3x peringatan sebelum auto-submit).\n- **Tips Menghadapi Ujian**: Pastikan koneksi stabil, baca soal dengan teliti, dan manfaatkan fitur penanda warna nomor soal!`;
      } else if (lower.includes('presensi') || lower.includes('rfid') || lower.includes('kartu') || lower.includes('absen')) {
        aiResponseText = `💳 **Sistem Presensi RFID SMK YPK:**\n\nSistem presensi menggunakan kartu Mifare RFID 13.56 MHz yang terhubung dengan mikrokontroler ESP8266 dan database Supabase realtime. Jam masuk dimulai pukul 07:15 WIB dan siswa yang melewati batas waktu akan otomatis tercatat sebagai Terlambat.`;
      } else {
        aiResponseText = `💡 **Jawaban Asisten Belajar AI:**\n\nTerima kasih atas pertanyaannya! Berdasarkan kurikulum kejuruan SMK YPK Medan, konsep yang Anda tanyakan sangat penting untuk dipahami secara bertahap.\n\nBeberapa poin kunci yang perlu diperhatikan:\n1. Pahami dasar teori dan praktikum di bengkel/lab sekolah.\n2. Gunakan modul bahan ajar di menu E-Learning untuk memperdalam pemahaman.\n3. Diskusikan dengan guru mata pelajaran atau coba uji pemahaman Anda di menu Ujian CBT.\n\nAda bagian spesifik yang ingin kita bahas lebih dalam?`;
      }

      const aiMsg = {
        id: Date.now() + 1,
        sender: 'ai',
        text: aiResponseText,
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1000);
  };

  const quickPrompts = [
    'Jelaskan cara kerja protokol DHCP di TJKT',
    'Rumus persamaan dasar akuntansi AKL',
    'Tips sukses mengerjakan Ujian CBT 30 PG + 5 Essay',
    'Bagaimana cara kerja kartu presensi RFID?',
  ];

  return (
    <div style={{ padding: '4px 0 30px 0' }}>
      {/* BANNER TANYA AI */}
      <div
        style={{
          background: 'linear-gradient(135deg, #4338ca 0%, #6366f1 50%, #8b5cf6 100%)',
          borderRadius: '16px',
          padding: '24px',
          color: '#ffffff',
          boxShadow: '0 8px 24px rgba(99, 102, 241, 0.25)',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', backgroundColor: 'rgba(255, 255, 255, 0.2)', padding: '4px 10px', borderRadius: '20px' }}>
              SMART AI TUTOR
            </span>
            <h1 style={{ margin: '8px 0 4px 0', fontSize: '22px', fontWeight: 'bold' }}>
              Asisten Tanya AI SMK YPK Medan
            </h1>
            <p style={{ margin: 0, fontSize: '13px', color: '#e0e7ff' }}>
              Kecerdasan Buatan pendamping belajar 24/7 untuk menjawab pertanyaan materi dan konsep kejuruan.
            </p>
          </div>
          <div style={{ backgroundColor: 'rgba(255,255,255,0.15)', padding: '10px 16px', borderRadius: '12px', textAlign: 'center' }}>
            <span style={{ fontSize: '11px', color: '#c7d2fe', display: 'block' }}>Status AI Engine</span>
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#4ade80' }}>🟢 Siap Menjawab</span>
          </div>
        </div>
      </div>

      {/* CHAT CONTAINER */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          height: '520px',
        }}
      >
        {/* CHAT MESSAGES AREA */}
        <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', backgroundColor: '#f8fafc' }}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                style={{
                  maxWidth: '80%',
                  padding: '12px 16px',
                  borderRadius: msg.sender === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  backgroundColor: msg.sender === 'user' ? '#2563eb' : '#ffffff',
                  color: msg.sender === 'user' ? '#ffffff' : '#0f172a',
                  border: msg.sender === 'user' ? 'none' : '1px solid #e2e8f0',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {msg.text}
              </div>
              <span style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px', padding: '0 4px' }}>
                {msg.sender === 'user' ? 'Anda' : 'Asisten AI'} • {msg.time}
              </span>
            </div>
          ))}

          {isTyping && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6366f1', fontSize: '12px', fontWeight: 'bold' }}>
              <span>🤖 Asisten AI sedang mengetik penjelasan...</span>
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* QUICK PROMPT SUGGESTIONS */}
        <div style={{ backgroundColor: '#ffffff', padding: '10px 16px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '6px', overflowX: 'auto', whiteSpace: 'nowrap' }}>
          {quickPrompts.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setInputPrompt(prompt);
              }}
              style={{
                padding: '5px 12px',
                borderRadius: '16px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#f8fafc',
                color: '#475569',
                fontSize: '11px',
                cursor: 'pointer',
                fontWeight: '500',
              }}
            >
              💡 {prompt}
            </button>
          ))}
        </div>

        {/* INPUT FORM */}
        <form onSubmit={handleSendMessage} style={{ display: 'flex', padding: '12px 16px', backgroundColor: '#ffffff', borderTop: '1px solid #e2e8f0', gap: '8px' }}>
          <input
            type="text"
            placeholder="Ketik pertanyaan pelajaran atau materi yang ingin Anda tanyakan..."
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '24px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={!inputPrompt.trim() || isTyping}
            style={{
              backgroundColor: '#6366f1',
              color: '#ffffff',
              border: 'none',
              borderRadius: '24px',
              padding: '0 20px',
              fontSize: '13px',
              fontWeight: 'bold',
              cursor: !inputPrompt.trim() || isTyping ? 'not-allowed' : 'pointer',
              opacity: !inputPrompt.trim() || isTyping ? 0.6 : 1,
            }}
          >
            Kirim 🚀
          </button>
        </form>
      </div>
    </div>
  );
}
