'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
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
  CheckCircle2
} from 'lucide-react';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('dashboard');
  const [registType, setRegistType] = useState('siswa');
  const [logs] = useState([
    { id: 1, nama: 'Budi Santoso', role: 'Siswa', detail: 'X RPL', waktu: '07:15 WIB', statusWa: 'Terkirim' },
    { id: 2, nama: 'Ahmad Dahlan, S.Pd', role: 'Guru', detail: 'Inisial: AD', waktu: '07:10 WIB', statusWa: 'Terkirim' }
  ]);

  const [formData, setFormData] = useState({
    uid_rfid: '',
    nama: '',
    kelas: '',
    jurusan: '',
    inisial: '',
    no_wa_pribadi: '',
    no_wa_ortu: '',
    role: 'Siswa'
  });

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    alert(`Berhasil mendaftarkan ${formData.nama} dengan UID: ${formData.uid_rfid}`);
    setFormData({ uid_rfid: '', nama: '', kelas: '', jurusan: '', inisial: '', no_wa_pribadi: '', no_wa_ortu: '', role: 'Siswa' });
  };

  if (loading) {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center bg-slate-950 overflow-hidden text-white">
        <div className="absolute inset-0 z-0 opacity-30">
          <Image src="/gedung.png" alt="Gedung SMK YPK Medan" fill className="object-cover filter blur-sm scale-105 animate-pulse" priority />
        </div>
        <div className="relative z-10 flex flex-col items-center animate-bounce">
          <div className="relative w-32 h-32 mb-4 drop-shadow-[0_0_25px_rgba(59,130,246,0.6)]">
            <Image src="/logo.png" alt="Logo SMK YPK Medan" fill className="object-contain" priority />
          </div>
          <h1 className="text-3xl font-extrabold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
            SMK YPK MEDAN
          </h1>
          <p className="text-sm text-slate-400 mt-2 tracking-widest uppercase">Smart RFID Attendance System</p>
          <div className="mt-8 flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-ping"></div>
            <span className="text-xs text-blue-300 font-mono">MEMUAT SISTEM PRESENSI REALTIME...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 relative overflow-hidden font-sans">
      <div className="fixed inset-0 z-0">
        <Image src="/gedung.png" alt="Gedung SMK YPK Medan" fill className="object-cover opacity-20 filter blur-md" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/90 to-slate-950"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-6">
        <header className="flex flex-col md:flex-row justify-between items-center bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-5 rounded-3xl shadow-2xl mb-8">
          <div className="flex items-center gap-4 mb-4 md:mb-0">
            <div className="relative w-14 h-14 bg-slate-800/80 p-2 rounded-2xl border border-blue-500/30">
              <Image src="/logo.png" alt="Logo SMK YPK" fill className="object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-blue-400">
                SMK YPK MEDAN
              </h1>
              <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-red-400" /> Jl. Sakti Lubis Gg. Amal No.25 / Gg. Pegawai No.8
              </p>
            </div>
          </div>

          <div className="flex bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800">
            <button 
              onClick={() => setTab('dashboard')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 ${tab === 'dashboard' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25' : 'text-slate-400 hover:text-white'}`}
            >
              <Sparkles className="w-4 h-4" /> Live Dashboard
            </button>
            <button 
              onClick={() => setTab('register')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 ${tab === 'register' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25' : 'text-slate-400 hover:text-white'}`}
            >
              <UserPlus className="w-4 h-4" /> Registrasi RFID
            </button>
          </div>
        </header>

        {tab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Siswa Hadir</p>
                  <h3 className="text-2xl font-bold text-white">412 <span className="text-xs text-emerald-400 font-normal">/ 450</span></h3>
                </div>
              </div>

              <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Guru & Admin Hadir</p>
                  <h3 className="text-2xl font-bold text-white">32 <span className="text-xs text-emerald-400 font-normal">/ 35</span></h3>
                </div>
              </div>

              <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 flex items-center gap-4">
                <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
                  <Send className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Notifikasi WA Terkirim</p>
                  <h3 className="text-2xl font-bold text-emerald-400">100% Instant</h3>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <BellRing className="w-5 h-5 text-blue-400 animate-bounce" /> Realtime RFID Tap Activity
                </h2>
                <span className="flex items-center gap-1.5 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping"></span> Live ESP8266 Connected
                </span>
              </div>

              <div className="space-y-3">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-4 bg-slate-950/60 border border-slate-800/80 rounded-2xl hover:border-blue-500/40 transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${log.role === 'Siswa' ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-slate-100">{log.nama}</h4>
                        <p className="text-xs text-slate-400">{log.role} • {log.detail}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-xs text-slate-300 font-mono">
                        <Clock className="w-3 h-3 text-slate-500" /> {log.waktu}
                      </div>
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 mt-1">
                        <CheckCircle2 className="w-3 h-3" /> WA {log.statusWa}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
              <div>
                <h2 className="text-lg font-semibold mb-4 text-slate-200">ESP8266 & LCD Preview</h2>
                <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-5 text-center font-mono">
                  <p className="text-xs text-emerald-500 mb-2">// Virtual LCD 16x2 Display</p>
                  <div className="bg-emerald-900/80 text-emerald-200 p-4 rounded-xl border border-emerald-400/30 shadow-inner tracking-widest text-sm">
                    <p>Halo, Budi S.</p>
                    <p className="text-emerald-300 mt-1">PRESENSI OK 07:15</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-slate-950/60 border border-slate-800 rounded-2xl">
                <p className="text-xs text-slate-400 leading-relaxed">
                  Sistem ini terhubung langsung secara *asynchronous* ke Gateway Whatsapp dan Server Database untuk kecepatan pembacaan tanpa tumpukan antrean.
                </p>
              </div>
            </div>
          </div>
        )}

        {tab === 'register' && (
          <div className="max-w-2xl mx-auto bg-slate-900/70 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-400" /> Pendaftaran Kartu RFID Baru
              </h2>
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                <button 
                  type="button" 
                  onClick={() => { setRegistType('siswa'); setFormData({...formData, role: 'Siswa'}); }} 
                  className={`px-3 py-1.5 rounded-lg ${registType === 'siswa' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
                >
                  Siswa
                </button>
                <button 
                  type="button" 
                  onClick={() => { setRegistType('guru'); setFormData({...formData, role: 'Guru'}); }} 
                  className={`px-3 py-1.5 rounded-lg ${registType === 'guru' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
                >
                  Guru / Admin
                </button>
              </div>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Scan UID RFID Kartu</label>
                <input 
                  type="text" 
                  required
                  placeholder="Tap kartu pada alat atau masukkan UID..." 
                  value={formData.uid_rfid}
                  onChange={(e) => setFormData({...formData, uid_rfid: e.target.value})}
                  className="w-full bg-slate-950 border border-blue-500/40 rounded-xl px-4 py-3 text-sm text-blue-400 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Nama Lengkap</label>
                <input 
                  type="text" 
                  required
                  placeholder="Masukkan nama lengkap..." 
                  value={formData.nama}
                  onChange={(e) => setFormData({...formData, nama: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              {registType === 'siswa' ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Kelas</label>
                      <input 
                        type="text" 
                        placeholder="Contoh: X, XI, XII" 
                        value={formData.kelas}
                        onChange={(e) => setFormData({...formData, kelas: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Jurusan</label>
                      <input 
                        type="text" 
                        placeholder="Contoh: RPL, TKJ" 
                        value={formData.jurusan}
                        onChange={(e) => setFormData({...formData, jurusan: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">No. WhatsApp Orang Tua</label>
                    <input 
                      type="text" 
                      placeholder="0812xxxxxxxx" 
                      value={formData.no_wa_ortu}
                      onChange={(e) => setFormData({...formData, no_wa_ortu: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Inisial Guru</label>
                    <input 
                      type="text" 
                      placeholder="Contoh: AD, HW" 
                      value={formData.inisial}
                      onChange={(e) => setFormData({...formData, inisial: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Role</label>
                    <select 
                      value={formData.role} 
                      onChange={(e) => setFormData({...formData, role: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                    >
                      <option value="Guru">Guru</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">No. WhatsApp Pribadi</label>
                <input 
                  type="text" 
                  required
                  placeholder="0812xxxxxxxx" 
                  value={formData.no_wa_pribadi}
                  onChange={(e) => setFormData({...formData, no_wa_pribadi: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <button 
                type="submit" 
                className="w-full mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-3 rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-300"
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
