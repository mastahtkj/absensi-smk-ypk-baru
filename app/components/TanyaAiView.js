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
  const [apiStatus, setApiStatus] = useState('checking');
  const chatBottomRef = useRef(null);

  useEffect(() => {
    let active = true;
    fetch('/api/ai/chat', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data) => {
        if (active) setApiStatus(data.configured ? `ready:${data.model}` : 'setup_required');
      })
      .catch(() => {
        if (active) setApiStatus('unavailable');
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendMessage = async (e) => {
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
    try {
      const history = messages
        .filter((message) => message.sender === 'user' || (message.sender === 'ai' && message.id !== 1))
        .slice(-10)
        .map((message) => ({ role: message.sender === 'user' ? 'user' : 'assistant', content: message.text }));
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purpose: 'tutor',
          messages: [...history, { role: 'user', content: userText }].slice(-12),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Asisten AI belum bisa menjawab.');

      setMessages((prev) => [...prev, {
        id: Date.now() + 1,
        sender: 'ai',
        text: data.content,
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      }]);
    } catch (error) {
      setMessages((prev) => [...prev, {
        id: Date.now() + 1,
        sender: 'ai',
        text: `AI belum dapat menjawab. ${error.message || 'Periksa koneksi lalu coba lagi.'}`,
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const quickPrompts = [
    'Jelaskan cara kerja protokol DHCP di TJKT',
    'Rumus persamaan dasar akuntansi AKL',
    'Tips sukses mengerjakan Ujian CBT 30 PG + 5 Essay',
    'Bagaimana cara kerja presensi wajah AI?',
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
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: apiStatus.startsWith('ready:') ? '#4ade80' : '#fde68a' }}>
              {apiStatus.startsWith('ready:')
                ? `🟢 JoinBareng · ${apiStatus.slice(6)}`
                : apiStatus === 'checking'
                  ? '⏳ Memeriksa API...'
                  : apiStatus === 'setup_required'
                    ? '⚠️ API perlu dikonfigurasi di Vercel'
                    : '⚠️ API tidak dapat dihubungi'}
            </span>
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
            maxLength={4000}
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
        <div style={{ padding: '0 16px 10px', fontSize: '10px', color: '#64748b', backgroundColor: '#ffffff' }}>
          Jangan masukkan kata sandi atau data pribadi siswa ke dalam percakapan AI.
        </div>
      </div>
    </div>
  );
}
