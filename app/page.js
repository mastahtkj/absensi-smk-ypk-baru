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

  // --- STATE FITUR TEST ADMIN (IQBAL) ---
  const [testSiswaUid, setTestSiswaUid] = useState('');
  const [testStatus, setTestStatus] = useState('Hadir');
  const [testWaNumber, setTestWaNumber] = useState('');
  const [testWaMessage, setTestWaMessage] = useState('');
  const [autoSendWa, setAutoSendWa] = useState(false);
  const [fonnteToken, setFonnteToken] = useState(''); // Opsional: Isi jika pakai Fonnte API
  const [isSimulating, setIsSimulating] = useState(false);

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

      // Default pilih siswa pertama untuk test jika belum dipilih
      if (dataSiswa && dataSiswa.length > 0 && !testSiswaUid) {
        setTestSiswaUid(dataSiswa[0].card_uid);
        setTestWaNumber(dataSiswa[0].phone || '');
      }
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

  // Update nomor WA saat pilihan siswa simulasi berubah
  const handleSelectTestSiswa = (uid) => {
    setTestSiswaUid(uid);
    const s = siswaList.find((item) => item.card_uid === uid);
    if (s && s.phone) {
      setTestWaNumber(s.phone);
    }
  };

  // 2. Fungsi Simulasi Tap RFID (Admin Iqbal)
  const handleSimulasiTapRFID = async () => {
    if (!testSiswaUid) {
      alert('Pilih siswa terlebih dahulu!');
      return;
    }

    setIsSimulating(true);

    try {
      const siswa = siswaList.find((s) => s.card_uid === testSiswaUid);
      const namaSiswa = siswa ? siswa.name : testSiswaUid;

      // Insert Log Absensi Baru ke Supabase
      const { error } = await supabase.from('absensi').insert([
        {
          rfid_uid: testSiswaUid,
          status: testStatus,
          pengubah: 'Admin Iqbal (Test RFID)',
          created_at: new Date().toISOString(),
        },
      ]);

      if (error) throw error;

      alert(`✅ Berhasil Simulasi Tap RFID!\nSiswa: ${namaSiswa}\nStatus: ${testStatus}`);

      // Otomatis Kirim WA jika fitur diaktifkan
      if (autoSendWa && testWaNumber) {
        const msg = `[NOTIFIKASI ABSENSI]\nSiswa a.n *${namaSiswa}* telah melakukan tap absensi dengan status: *${testStatus.toUpperCase()}* pada jam ${new Date().toLocaleTimeString('id-ID')}.`;
        kirimWhatsApp(testWaNumber, msg);
      }

      fetchData(); // Refresh data
    } catch (err) {
      alert('Gagal melakukan simulasi: ' + err.message);
    } finally {
      setIsSimulating(false);
    }
  };

  // 3. Fungsi Kirim WhatsApp (Fonnte / Direct WA)
  const kirimWhatsApp = async (nomor, pesan) => {
    if (!nomor) {
      alert('Masukkan nomor WhatsApp tujuan!');
      return;
    }

    // Format Nomor Ke 62xxx
    let formattedPhone = nomor.replace(/[^0-9]/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '62' + formattedPhone.slice(1);
    }

    // Jika mengisi Token Fonnte API
    if (fonnteToken) {
      try {
        const res = await fetch('https://api.fonnte.com/send', {
          method: 'POST',
          headers: {
            Authorization: fonnteToken,
          },
          body: new URLSearchParams({
            target: formattedPhone,
            message: pesan,
          }),
        });
        const resData = await res.json();
        if (resData.status) {
          alert('✅ Pesan WhatsApp berhasil terkirim via Fonnte API!');
        } else {
          alert('⚠️ Fonnte Error: ' + resData.reason);
        }
      } catch (e) {
        alert('Gagal mengontak Fonnte API: ' + e.message);
      }
    } else {
      // Direct Link WhatsApp Web/App (Tanpa API Key)
      const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(pesan)}`;
      window.open(waUrl, '_blank');
    }
  };

  // 4. Helper Perhitungan Rekap Riwayat (STRICT CHECK)
  const getRecapForSiswa = (siswaUid) => {
    const logs = absensiLogs.filter((l) => l.rfid_uid === siswaUid);

    // KUNCI UTAMA: Jika logs kosong, WAJIB bernilai 0
    if (!logs || logs.length === 0) {
      return {
        hadirKartu: 0,
        hadirTanpaKartu: 0,
        telat: 0,
        sakit: 0,
        izin: 0,
        alpha: 0,
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

  // 5. Status Hari Ini untuk Tampilan Tabel
  const getTodayStatus = (siswaUid) => {
    const todayStr = new Date().toLocaleDateString('id-ID');

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

  const handleOpenModal = (siswa) => {
    setModalSiswa(siswa);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-orange-50/30 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ============================================================ */}
        {/* PANEL PENGUJI ADMIN IQBAL (TEST RFID & KIRIM WHATSAPP)       */}
        {/* ============================================================ */}
        <div className="bg-gradient-to-r from-orange-600 to-amber-600 p-5 rounded-2xl shadow-md text-white">
          <div className="flex items-center gap-2 mb-3 border-b border-orange-400/50 pb-2">
            <span className="text-xl">🛠️</span>
            <h2 className="font-bold text-sm md:text-base tracking-wide">
              PANEL TEST ALAT RFID & WHATSAPP (ADMIN IQBAL)
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-gray-800">
            {/* Opsi 1: Test RFID Tap */}
            <div className="bg-white p-3 rounded-xl shadow-sm space-y-2">
              <label className="text-xs font-bold text-orange-800 block">
                1. Pilih Siswa (Test Tap)
              </label>
              <select
                value={testSiswaUid}
                onChange={(e) => handleSelectTestSiswa(e.target.value)}
                className="w-full text-xs p-2 border rounded-lg focus:outline-none"
              >
                {siswaList.map((s) => (
                  <option key={s.id} value={s.card_uid}>
                    {s.name} ({s.class_name || 'No Class'}) - {s.card_uid}
                  </option>
                ))}
              </select>

              <label className="text-xs font-bold text-orange-800 block pt-1">
                2. Status Tap
              </label>
              <select
                value={testStatus}
                onChange={(e) => setTestStatus(e.target.value)}
                className="w-full text-xs p-2 border rounded-lg focus:outline-none"
              >
                <option value="Hadir">Hadir</option>
                <option value="Hadir Tanpa Kartu">Hadir Tanpa Kartu</option>
                <option value="Telat">Telat</option>
                <option value="Sakit">Sakit</option>
                <option value="Izin">Izin</option>
                <option value="Alpha">Alpha</option>
              </select>

              <button
                onClick={handleSimulasiTapRFID}
                disabled={isSimulating}
                className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-lg transition shadow"
              >
                {isSimulating ? 'Memproses...' : '⚡ SIMULASI TAP RFID'}
              </button>
            </div>

            {/* Opsi 2: Test WhatsApp */}
            <div className="bg-white p-3 rounded-xl shadow-sm space-y-2">
              <label className="text-xs font-bold text-orange-800 block">
                3. Test Kirim WhatsApp
              </label>
              <input
                type="text"
                placeholder="Nomor WA (contoh: 08123456789)"
                value={testWaNumber}
                onChange={(e) => setTestWaNumber(e.target.value)}
                className="w-full text-xs p-2 border rounded-lg focus:outline-none"
              />
              <textarea
                placeholder="Tulis pesan tes..."
                value={testWaMessage}
                onChange={(e) => setTestWaMessage(e.target.value)}
                rows={2}
                className="w-full text-xs p-2 border rounded-lg focus:outline-none resize-none"
              />
              <button
                onClick={() =>
                  kirimWhatsApp(
                    testWaNumber,
                    testWaMessage || 'Tes Pesan Absensi dari Admin Iqbal'
                  )
                }
                className="w-full py-2 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-lg transition shadow"
              >
                💬 KIRIM TEST WA
              </button>
            </div>

            {/* Opsi 3: Pengaturan Integrasi API */}
            <div className="bg-white p-3 rounded-xl shadow-sm space-y-2 flex flex-col justify-between">
              <div>
                <label className="text-xs font-bold text-orange-800 block mb-1">
                  4. Pengaturan Notifikasi Auto
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer my-2">
                  <input
                    type="checkbox"
                    checked={autoSendWa}
                    onChange={(e) => setAutoSendWa(e.target.checked)}
                    className="w-4 h-4 text-orange-500 rounded"
                  />
                  Auto Kirim WA saat Tap RFID
                </label>

                <label className="text-[10px] font-bold text-gray-500 block mt-2">
                  Fonnte API Token (Opsional untuk Auto-WA):
                </label>
                <input
                  type="password"
                  placeholder="Paste Token Fonnte disini..."
                  value={fonnteToken}
                  onChange={(e) => setFonnteToken(e.target.value)}
                  className="w-full text-xs p-1.5 border rounded-lg focus:outline-none"
                />
              </div>

              <p className="text-[10px] text-gray-400 italic">
                *Tanpa token Fonnte, sistem akan membuka WhatsApp Web/App langsung.
              </p>
            </div>
          </div>
        </div>

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
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ✕
              </button>

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
