'use client';

import { useState } from 'react';

export default function DashboardPage() {
  const [testLog, setTestLog] = useState(null);
  const [loading, setLoading] = useState(false);

  // Data Kehadiran Per Kelas (Bisa disesuaikan / disambungkan ke DB kamu)
  const [dataKelas, setDataKelas] = useState([
    { id: 'X-TKJ-1', nama: 'X TKJ 1', total: 22, hadir: 4, wali: 'Bpk. Budi' },
    { id: 'XI-RPL-2', nama: 'XI RPL 2', total: 22, hadir: 7, wali: 'Ibu Siti' },
    { id: 'XII-MM-1', nama: 'XII MM 1', total: 22, hadir: 10, wali: 'Bpk. Ahmad' },
  ]);

  // Total Keseluruhan Siswa
  const totalSiswa = 66;
  const totalHadir = 21;
  const persenTotal = Math.round((totalHadir / totalSiswa) * 100);

  // Fungsi Simulasi Tap Kartu Admin (Iqbal)
  const handleTestTapAdmin = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/rfid/tap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: '1A2B3C4D', deviceId: 'ESP32_GATE_01' })
      });
      const data = await res.json();
      if (data.isTest) {
        setTestLog(data.data);
      }
    } catch (err) {
      alert('Gagal terhubung ke API Server!');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 sm:p-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Dashboard */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-800 p-5 rounded-2xl border border-slate-700 gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-orange-500">DASHBOARD ABSENSI REAL-TIME</h1>
            <p className="text-xs text-slate-400">SMK YPK MEDAN • Integrated IoT RFID Server</p>
          </div>
          <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 px-3 py-1.5 rounded-xl text-xs text-blue-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
            Mode Test: Iqbal (Role: Admin)
          </div>
        </div>

        {/* Ringkasan Top Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <p className="text-xs text-slate-400">Total Siswa Terdaftar</p>
            <p className="text-2xl font-bold text-white mt-1">{totalSiswa}</p>
          </div>
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <p className="text-xs text-slate-400">Hadir Tepat Waktu</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{totalHadir}</p>
          </div>
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <p className="text-xs text-slate-400">Persentase Kehadiran Total</p>
            <p className="text-2xl font-bold text-orange-400 mt-1">{persenTotal}%</p>
          </div>
        </div>

        {/* Banner Peringatan Urgent */}
        <div className="bg-red-950/60 border-l-4 border-red-500 p-4 rounded-r-2xl flex items-center gap-4">
          <span className="text-3xl">🚨</span>
          <div>
            <h3 className="font-bold text-red-400 text-sm md:text-base">PERINGATAN URGENT KEHADIRAN (REAL-TIME)</h3>
            <p className="text-xs text-slate-300">
              Tingkat kehadiran kritis ({persenTotal}%). Sebanyak <b>{totalSiswa - totalHadir} Siswa belum tapping kartu</b> hari ini!
            </p>
          </div>
        </div>

        {/* Notifikasi Pop-up Live Feed Pengujian RFID Iqbal */}
        {testLog && (
          <div className="bg-emerald-950/70 border border-emerald-500/50 p-4 rounded-2xl flex justify-between items-center transition-all animate-bounce">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📟</span>
              <div>
                <p className="text-xs font-bold text-emerald-400">[TEST ALAT SUCCESS] Tap RFID Iqbal Terdeteksi!</p>
                <p className="text-xs text-slate-300">
                  User: <b>{testLog.user}</b> | Card UID: <code>{testLog.uid}</code> | Waktu: {testLog.time}
                </p>
              </div>
            </div>
            <span className="text-[10px] bg-emerald-500 text-slate-950 font-bold px-2.5 py-1 rounded-md">WA SENT</span>
          </div>
        )}

        {/* Section Grafik Urgensi Per Kelas & Test Tools */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Grafik Batang Urgensi Kelas */}
          <div className="md:col-span-2 bg-slate-800 p-6 rounded-2xl border border-slate-700">
            <h2 className="text-sm font-bold text-slate-200 mb-4">📊 URGENSI KEHADIRAN PER KELAS</h2>
            
            <div className="space-y-5">
              {dataKelas.map((item) => {
                const persen = Math.round((item.hadir / item.total) * 100);
                let colorClass = "bg-red-500";
                let badgeText = "🚨 KRITIS";
                if (persen > 30) { colorClass = "bg-orange-500"; badgeText = "⚠️ WASPADA"; }
                if (persen > 40) { colorClass = "bg-emerald-500"; badgeText = "✅ AMAN"; }

                return (
                  <div key={item.id} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium">
                      <span>{item.nama} <span className="text-slate-400">({item.hadir}/{item.total} Siswa)</span></span>
                      <span className="font-bold">{persen}% - {badgeText}</span>
                    </div>
                    <div className="w-full bg-slate-700 h-3.5 rounded-full overflow-hidden">
                      <div className={`h-full ${colorClass} transition-all duration-500`} style={{ width: `${persen}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Toolkit Test Admin (Iqbal) */}
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 space-y-4">
            <h2 className="text-sm font-bold text-slate-200">🛠️ TEST ALAT & NOTIFIKASI</h2>
            <p className="text-xs text-slate-400">
              Gunakan tombol di bawah untuk mensimulasikan tap kartu Iqbal tanpa mengganggu rekap data siswa.
            </p>
            
            <button 
              onClick={handleTestTapAdmin}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-blue-600/20"
            >
              {loading ? 'Memproses...' : '🧪 Test Tap RFID Iqbal (Admin)'}
            </button>

            <div className="pt-3 border-t border-slate-700">
              <p className="text-[11px] text-slate-400 mb-1">Endpoint untuk Hardware ESP32:</p>
              <code className="text-[10px] bg-slate-900 p-2 rounded-lg block text-orange-400 break-all border border-slate-700">
                POST https://absensi-smk-ypk-baru.vercel.app/api/rfid/tap
              </code>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
