'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserCheck, 
  ShieldCheck, 
  UserPlus, 
  CreditCard, 
  Send, 
  Clock, 
  MapPin, 
  BellRing,
  Sparkles,
  CheckCircle2,
  Scan,
  WandSparkles,
  Search,
  Check
} from 'lucide-react';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('dashboard');
  const [registType, setRegistType] = useState('siswa');
  const [logs] = useState([
    { id: 1, nama: 'Budi Santoso', role: 'Siswa', detail: 'X RPL', waktu: '07:15 WIB', statusWa: 'Sent' },
    { id: 2, nama: 'Ahmad Dahlan, S.Pd', role: 'Guru', detail: 'Inisial: AD', waktu: '07:10 WIB', statusWa: 'Sent' }
  ]);

  const [formData, setFormData] = useState({
    uid_rfid: '', nama: '', kelas: '', jurusan: '', inisial: '', no_wa_pribadi: '', no_wa_ortu: '', role: 'Siswa'
  });

  // Splash Screen Timer (3 Detik)
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    alert(`[SISTEM PREMIUM] Berhasil mendaftarkan ${formData.nama} dengan UID RFID: ${formData.uid_rfid}`);
    setFormData({ uid_rfid: '', nama: '', kelas: '', jurusan: '', inisial: '', no_wa_pribadi: '', no_wa_ortu: '', role: 'Siswa' });
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 font-sans relative overflow-x-hidden selection:bg-blue-500 selection:text-white">
      
      {/* 1. SPLASH SCREEN MAHAL */}
      <AnimatePresence>
        {loading && (
          <motion.div 
            key="splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#05070a] text-white"
          >
            {/* Background Gedung Transparan */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <Image src="/gedung.png" alt="Gedung SMK YPK Medan" fill className="object-cover filter blur-sm scale-110" priority />
            </div>

            {/* Glowing Orb Aura */}
            <div className="absolute w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] pointer-events-none"></div>

            {/* Content Splash Screen */}
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="relative z-10 flex flex-col items-center"
            >
              {/* Logo Sekolah */}
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                className="relative w-36 h-36 mb-6 p-2 bg-gradient-to-b from-blue-500/20 to-transparent rounded-full border border-blue-500/30 shadow-[0_0_50px_rgba(59,130,246,0.3)]"
              >
                <Image src="/logo.png" alt="Logo SMK YPK Medan" fill className="object-contain p-2" priority />
              </motion.div>

              <h1 className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-200 to-emerald-400">
                SMK YPK MEDAN
              </h1>
              <p className="text-xs text-slate-400 mt-2 tracking-[0.25em] uppercase font-semibold flex items-center gap-2">
                <WandSparkles className="w-3.5 h-3.5 text-blue-400" /> Smart RFID Attendance System
              </p>

              {/* Progress Bar Loading */}
              <div className="mt-10 w-64 h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
                <motion.div 
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                  className="w-full h-full bg-gradient-to-r from-blue-500 via-indigo-400 to-emerald-400"
                />
              </div>
              <p className="text-[10px] text-slate-500 font-mono mt-3 tracking-widest">CONNECTING ESP8266 SERVER...</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. BACKGROUND DASHBOARD */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <Image src="/gedung.png" alt="Gedung" fill className="object-cover opacity-[0.07] filter blur-md" priority />
        <div className="absolute inset-0 bg-gradient-to-b from-[#07090e]/80 via-[#07090e]/95 to-[#07090e]"></div>
      </div>

      {/* 3. MAIN CONTAINER */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* HEADER BAR GLASSMORPHISM */}
        <header className="flex flex-col md:flex-row justify-between items-center bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 p-6 rounded-3xl shadow-2xl mb-10">
          <div className="flex items-center gap-5 mb-4 md:mb-0">
            <div className="relative w-16 h-16 bg-slate-950 p-2.5 rounded-2xl border border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.15)]">
              <Image src="/logo.png" alt="Logo YPK" fill className="object-contain p-1" priority />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-blue-400">
                SMK YPK MEDAN
              </h1>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1 font-medium">
                <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" /> 
                Jl. Sakti Lubis Gg. Amal No.25 / Gg. Pegawai No.8
              </p>
            </div>
          </div>

          {/* TAB NAVIGATION */}
          <div className="flex bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800">
            <button 
              onClick={() => setTab('dashboard')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${tab === 'dashboard' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25' : 'text-slate-400 hover:text-white'}`}
            >
              <Sparkles className="w-4 h-4" /> Live Dashboard
            </button>
            <button 
              onClick={() => setTab('register')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${tab === 'register' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25' : 'text-slate-400 hover:text-white'}`}
            >
              <UserPlus className="w-4 h-4" /> Registrasi RFID
            </button>
          </div>
        </header>

        {/* SECTION 1: LIVE DASHBOARD */}
        {tab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* STAT CARDS */}
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 flex items-center gap-5 hover:border-blue-500/40 transition-all duration-300">
                <div className="p-4 bg-blue-500/10 text-blue-400 rounded-2xl border border-blue-500/20">
                  <UserCheck className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Siswa Hadir Hari Ini</p>
                  <h3 className="text-3xl font-black text-white mt-1">412 <span className="text-xs text-emerald-400 font-normal">/ 450</span></h3>
                </div>
              </div>

              <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 flex items-center gap-5 hover:border-emerald-500/40 transition-all duration-300">
                <div className="p-4 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Guru & Admin Hadir</p>
                  <h3 className="text-3xl font-black text-white mt-1">32 <span className="text-xs text-emerald-400 font-normal">/ 35</span></h3>
                </div>
              </div>

              <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 flex items-center gap-5 hover:border-indigo-500/40 transition-all duration-300">
                <div className="p-4 bg-indigo-500/10 text-indigo-400 rounded-2xl border border-indigo-500/20">
                  <Send className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Status WA Gateway</p>
                  <h3 className="text-3xl font-black text-emerald-400 mt-1">100% Instant</h3>
                </div>
              </div>
            </div>

            {/* REALTIME RFID TAP ACTIVITY */}
            <div className="lg:col-span-2 bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 shadow-xl">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-lg font-bold flex items-center gap-3">
                  <BellRing className="w-5 h-5 text-blue-400 animate-bounce" /> Live RFID Tap Activity
                </h2>
                <span className="flex items-center gap-2 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-4 py-1.5 rounded-full font-medium">
                  <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping"></span> Live ESP8266 Active
                </span>
              </div>

              <div className="space-y-4">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-5 bg-slate-950/60 border border-slate-800/80 rounded-2xl hover:border-blue-500/40 transition-all duration-300">
                    <div className="flex items-center gap-4">
                      <div className={`p-3.5 rounded-xl ${log.role === 'Siswa' ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                        <CreditCard className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-base text-slate-100">{log.nama}</h4>
                        <p className="text-xs text-slate-400 mt-0.5">{log.role} • {log.detail}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1.5 text-xs text-slate-300 font-mono">
                        <Clock className="w-3.5 h-3.5 text-slate-500" /> {log.waktu}
                      </div>
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full mt-2">
                        <CheckCircle2 className="w-3.5 h-3.5" /> WA {log.statusWa}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ESP8266 & HARDWARE PREVIEW */}
            <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 shadow-xl flex flex-col justify-between">
              <div>
                <h2 className="text-lg font-bold mb-6 text-slate-200">ESP8266 LCD Display</h2>
                <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-6 text-center font-mono">
                  <div className="flex items-center justify-center gap-2 mb-3 text-emerald-400">
                    <Scan className="w-4 h-4" /> <span className="text-xs font-semibold uppercase tracking-wider">Virtual LCD 16x2</span>
                  </div>
                  <div className="bg-[#112318] text-[#4ade80] p-5 rounded-xl border border-emerald-500/40 shadow-inner tracking-[0.15em] text-sm leading-relaxed font-bold">
                    <p>Halo, Budi S.</p>
                    <p className="text-emerald-300 mt-2">PRESENSI OK 07:15</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 p-5 bg-slate-950/60 border border-slate-800 rounded-2xl">
                <p className="text-xs text-slate-400 leading-relaxed">
                  Sistem pemrosesan RFID dibuat **Asynchronous (Tanpa Antrean)**. Notifikasi WA dikirim di latar belakang sehingga *tap* kartu pada ESP8266 merespon instan dalam hitungan milidetik.
                </p>
              </div>
            </div>

          </div>
        )}

        {/* SECTION 2: FORM REGISTRASI RFID */}
        {tab === 'register' && (
          <div className="max-w-2xl mx-auto bg-slate-900/50 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 sm:p-10 shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-bold flex items-center gap-3">
                <UserPlus className="w-6 h-6 text-blue-400" /> Pendaftaran RFID Baru
              </h2>
              <div className="flex bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs font-semibold">
                <button 
                  type="button" 
                  onClick={() => { setRegistType('siswa'); setFormData({...formData, role: 'Siswa'}); }} 
                  className={`px-4 py-2 rounded-lg transition-all ${registType === 'siswa' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                >
                  Siswa
                </button>
                <button 
                  type="button" 
                  onClick={() => { setRegistType('guru'); setFormData({...formData, role: 'Guru'}); }} 
                  className={`px-4 py-2 rounded-lg transition-all ${registType === 'guru' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                >
                  Guru / Admin
                </button>
              </div>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Scan UID RFID Kartu</label>
                <input 
                  type="text" 
                  required
                  placeholder="Tap kartu pada alat RFID..." 
                  value={formData.uid_rfid}
                  onChange={(e) => setFormData({...formData, uid_rfid: e.target.value})}
                  className="w-full bg-slate-950 border border-blue-500/40 rounded-xl px-4 py-3.5 text-sm text-blue-400 font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Nama Lengkap</label>
                <input 
                  type="text" 
                  required
                  placeholder="Masukkan nama lengkap..." 
                  value={formData.nama}
                  onChange={(e) => setFormData({...formData, nama: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              {registType === 'siswa' ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Kelas</label>
                      <input 
                        type="text" 
                        placeholder="Contoh: X, XI, XII" 
                        value={formData.kelas}
                        onChange={(e) => setFormData({...formData, kelas: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Jurusan</label>
                      <input 
                        type="text" 
                        placeholder="Contoh: RPL, TKJ" 
                        value={formData.jurusan}
                        onChange={(e) => setFormData({...formData, jurusan: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">No. WhatsApp Orang Tua</label>
                    <input 
                      type="text" 
                      placeholder="0812xxxxxxxx" 
                      value={formData.no_wa_ortu}
                      onChange={(e) => setFormData({...formData, no_wa_ortu: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Inisial Guru</label>
                    <input 
                      type="text" 
                      placeholder="Contoh: AD, HW" 
                      value={formData.inisial}
                      onChange={(e) => setFormData({...formData, inisial: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Role</label>
                    <select 
                      value={formData.role} 
                      onChange={(e) => setFormData({...formData, role: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
                    >
                      <option value="Guru">Guru</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">No. WhatsApp Pribadi</label>
                <input 
                  type="text" 
                  required
                  placeholder="0812xxxxxxxx" 
                  value={formData.no_wa_pribadi}
                  onChange={(e) => setFormData({...formData, no_wa_pribadi: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <button 
                type="submit" 
                className="w-full mt-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-300 tracking-wide"
              >
                Simpan & Daftarkan Kartu
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
