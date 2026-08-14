'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Inisialisasi Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AbsensiPage() {
  const [siswaList, setSiswaList] = useState([]);
  const [absensiLogs, setAbsensiLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJurusan, setSelectedJurusan] = useState('Semua Jurusan');

  // State Modal Riwayat Tanggal
  const [modalSiswa, setModalSiswa] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 1. Fetch Data dari Supabase
  const fetchData = async () => {
    try {
      setLoading(true);

      // Ambil Data Master Siswa
      const { data: dataSiswa, error: errSiswa } = await supabase
        .from('rfid_cards')
        .select('*')
        .order('name', { ascending: true });

      if (errSiswa) throw errSiswa;

      // Ambil Data Logs Absensi
      const { data: dataLogs, error: errLogs } = await supabase
        .from('absensi')
        .select('*')
        .order('created_at', { ascending: false });

      if (errLogs) throw errLogs;

      setSiswaList(dataSiswa || []);
      setAbsensiLogs(dataLogs || []);
    } catch (error) {
      console.error('Error fetching data:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Subscribe Realtime Supabase
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'absensi' },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 2. Helper Perhitungan Rekap Riwayat (DIPERBAIKI SECARA KETAT)
  const getRecapForSiswa = (siswaUid) => {
    // Ambil log asli milik siswa dari state database
    const logs = absensiLogs.filter((l) => l.rfid_uid === siswaUid);

    // BILA LOGS KOSONG / BELUM ADA TAP -> SEMUA REKAP WAJIB 0!
    if (!logs || logs.length === 0) {
      return {
        hadirKartu: 0,
        hadirTanpaKartu: 0,
        telat: 0,
        sakit: 0,
        izin: 0,
        alpha: 0, // Kunci mutlak di angka 0
        datesTelatStr: '-',
        datesSakitStr: '-',
        datesIzinStr: '-',
        datesAlphaStr: '-',
        rawLogs: [],
      };
    }

    let cntHadirKartu = 0;
    let cntHadirTanpaKartu = 0;
    let cntTelat = 0;
    let cntSakit = 0;
    let cntIzin = 0;
    let cntAlpha = 0;

    let datesTelat = [];
    let datesSakit = [];
    let datesIzin = [];
    let datesAlpha = [];

    logs.forEach((log) => {
      const st = (log.status || '').toLowerCase().trim();
      const tgl = new Date(log.created_at).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });

      if (st.includes('hadir')) {
        if (st.includes('tanpa kartu')) {
          cntHadirTanpaKartu++;
        } else {
          cntHadirKartu++;
        }
      } else if (st.includes('telat') || st.includes('terlambat')) {
        cntTelat++;
        datesTelat.push(tgl);
      } else if (st.includes('sakit')) {
        cntSakit++;
        datesSakit.push(tgl);
      } else if (st.includes('izin')) {
        cntIzin++;
        datesIzin.push(tgl);
      } else if (st === 'alpha' || st === 'alpa') {
        cntAlpha++;
        datesAlpha.push(tgl);
      }
    });

    return {
      hadirKartu: cntHadirKartu,
      hadirTanpaKartu: cntHadirTanpaKartu,
      telat: cntTelat,
      sakit: cntSakit,
      izin: cntIzin,
      alpha: cntAlpha,
      datesTelatStr: datesTelat.length > 0 ? datesTelat.join('; ') : '-',
      datesSakitStr: datesSakit.length > 0 ? datesSakit.join('; ') : '-',
      datesIzinStr: datesIzin.length > 0 ? datesIzin.join('; ') : '-',
      datesAlphaStr: datesAlpha.length > 0 ? datesAlpha.join('; ') : '-',
      rawLogs: logs,
    };
  };

  // 3. Status Hari Ini untuk Tampilan Tabel Utama
  const getTodayStatus = (siswaUid) => {
    const todayStr = new Date().toLocaleDateString('id-ID');

    // Cari log absensi siswa hari ini
    const logToday = absensiLogs.find((l) => {
      const logDate = new Date(l.created_at).toLocaleDateString('id-ID');
      return l.rfid_uid === siswaUid && logDate === todayStr;
    });

    if (logToday) {
      return {
        status: logToday.status,
        waktu: new Date(logToday.created_at).toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        audit: logToday.pengubah || 'Mesin RFID',
      };
    }

    // Default status jika siswa belum tap hari ini
    return {
      status: 'BELUM TAP',
      waktu: 'Belum Melakukan Tap',
      audit: 'Mesin RFID',
    };
  };

  // Filter Jurusan & Search Query
  const filteredSiswa = siswaList.filter((siswa) => {
    const matchSearch =
      siswa.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (siswa.class_name &&
        siswa.class_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchJurusan =
      selectedJurusan === 'Semua Jurusan' ||
      siswa.class_name?.toLowerCase().includes(selectedJurusan.toLowerCase());

    return matchSearch && matchJurusan;
  });

  // Handle Buka Modal
  const handleOpenModal = (siswa) => {
    setModalSiswa(siswa);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-orange-50/30 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* HEADER & FILTER JURUSAN */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-orange-100">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="font-bold text-orange-800 mr-2 text-xs md:text-sm">JURUSAN:</span>
            {[
              'Semua Jurusan',
              'Teknik Jaringan Komputer dan Telekomunikasi',
              'Akuntansi dan Keuangan Lembaga',
              'Manajemen Perkantoran dan Layanan Bisnis',
              'Pemasaran',
              'Bisnis dan Manajemen',
            ].map((jurusan) => (
              <button
                key={jurusan}
                onClick={() => setSelectedJurusan(jurusan)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                  selectedJurusan === jurusan
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
                }`}
              >
                {jurusan}
              </button>
            ))}
          </div>
        </div>

        {/* SEARCH BAR */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-orange-100">
          <input
            type="text"
            placeholder="Cari nama siswa (Terurut A-Z) atau kelas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-orange-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm"
          />
        </div>

        {/* TABEL UTAMA */}
        <div className="bg-white rounded-xl shadow-sm border border-orange-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs md:text-sm">
              <thead className="bg-orange-50/50 text-orange-800 font-bold border-b border-orange-100">
                <tr>
                  <th className="p-3">STATUS HARI INI</th>
                  <th className="p-3">WAKTU TAP</th>
                  <th className="p-3">NAMA SISWA (A-Z)</th>
                  <th className="p-3">KELAS / JURUSAN</th>
                  <th className="p-3">RFID UID</th>
                  <th className="p-3">PENGUBAH STATUS (AUDIT)</th>
                  <th className="p-3 text-center">AKSI & RINCIAN TANGGAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-orange-50">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center p-6 text-gray-400">
                      Memuat data...
                    </td>
                  </tr>
                ) : filteredSiswa.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center p-6 text-gray-400">
                      Data tidak ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredSiswa.map((siswa) => {
                    const statusHariIni = getTodayStatus(siswa.card_uid);
                    return (
                      <tr key={siswa.id} className="hover:bg-orange-50/30 transition">
                        {/* Status Badge */}
                        <td className="p-3">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold inline-block ${
                              statusHariIni.status.toLowerCase().includes('hadir')
                                ? 'bg-green-100 text-green-700'
                                : statusHariIni.status.toLowerCase().includes('telat')
                                ? 'bg-yellow-100 text-yellow-700'
                                : statusHariIni.status.toLowerCase().includes('izin') ||
                                  statusHariIni.status.toLowerCase().includes('sakit')
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            ● {statusHariIni.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3 text-gray-500">{statusHariIni.waktu}</td>
                        <td className="p-3 font-bold text-gray-800">{siswa.name}</td>
                        <td className="p-3">
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded font-semibold text-xs">
                            {siswa.class_name || '-'}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-blue-600 font-bold">
                          {siswa.card_uid}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                            🤖 {statusHariIni.audit}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleOpenModal(siswa)}
                            className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-semibold shadow-sm transition"
                          >
                            👁 Riwayat Tanggal
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL RIWAYAT TANGGAL ABSENSI */}
        {isModalOpen && modalSiswa && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl relative">
              {/* Tombol Close */}
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ✕
              </button>

              {/* Header Modal */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">📅</span>
                <div>
                  <h3 className="font-bold text-orange-800 text-base">
                    Riwayat Tanggal Absensi
                  </h3>
                  <p className="text-xs font-semibold text-gray-600">
                    {modalSiswa.name} ({modalSiswa.class_name || '-'})
                  </p>
                </div>
              </div>

              {/* KOTAK REKAP STATISTIK */}
              {(() => {
                const recap = getRecapForSiswa(modalSiswa.card_uid);
                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="bg-red-50 border border-red-100 p-2 rounded-xl">
                        <div className="text-[10px] font-bold text-red-500 uppercase">
                          ALPHA
                        </div>
                        <div className="text-lg font-extrabold text-red-600">
                          {recap.alpha}
                        </div>
                      </div>

                      <div className="bg-yellow-50 border border-yellow-100 p-2 rounded-xl">
                        <div className="text-[10px] font-bold text-yellow-600 uppercase">
                          SAKIT
                        </div>
                        <div className="text-lg font-extrabold text-yellow-600">
                          {recap.sakit}
                        </div>
                      </div>

                      <div className="bg-blue-50 border border-blue-100 p-2 rounded-xl">
                        <div className="text-[10px] font-bold text-blue-500 uppercase">
                          IZIN
                        </div>
                        <div className="text-lg font-extrabold text-blue-600">
                          {recap.izin}
                        </div>
                      </div>

                      <div className="bg-orange-50 border border-orange-100 p-2 rounded-xl">
                        <div className="text-[10px] font-bold text-orange-500 uppercase">
                          TELAT
                        </div>
                        <div className="text-lg font-extrabold text-orange-600">
                          {recap.telat}
                        </div>
                      </div>
                    </div>

                    {/* RINCIAN CATATAN LOG */}
                    <div>
                      <div className="text-xs font-bold text-orange-800 uppercase mb-2">
                        RINCIAN CATATAN TANGGAL:
                      </div>
                      <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/50 min-h-[80px] flex items-center justify-center text-center">
                        {recap.rawLogs.length === 0 ? (
                          <p className="text-xs text-gray-400 font-medium">
                            Belum ada rekaman riwayat absensi.
                          </p>
                        ) : (
                          <div className="w-full text-left space-y-1 text-xs">
                            {recap.datesAlphaStr !== '-' && (
                              <p className="text-red-600">
                                <strong>Alpha:</strong> {recap.datesAlphaStr}
                              </p>
                            )}
                            {recap.datesSakitStr !== '-' && (
                              <p className="text-yellow-600">
                                <strong>Sakit:</strong> {recap.datesSakitStr}
                              </p>
                            )}
                            {recap.datesIzinStr !== '-' && (
                              <p className="text-blue-600">
                                <strong>Izin:</strong> {recap.datesIzinStr}
                              </p>
                            )}
                            {recap.datesTelatStr !== '-' && (
                              <p className="text-orange-600">
                                <strong>Telat:</strong> {recap.datesTelatStr}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* TOMBOL TUTUP */}
                    <button
                      onClick={() => setIsModalOpen(false)}
                      className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-xs transition shadow-sm"
                    >
                      Tutup
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
