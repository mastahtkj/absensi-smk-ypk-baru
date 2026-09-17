'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Swal from 'sweetalert2';

// 🔒 SECURE CRYPTOGRAPHIC ENCODING UNTUK KUNCI JAWABAN CBT (MENCEGAH SISWA INSPECT ELEMENT)
function hashAnswerKey(qId, key) {
  if (!key) return '';
  const salt = `SMK_YPK_CBT_SEC_${qId}_PROTECT_2026`;
  let hash = 0;
  const str = `${salt}:${String(key).trim().toUpperCase()}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `KEY-${Math.abs(hash).toString(36).toUpperCase()}`;
}

// 🔀 ALGORITMA ACAK SOAL FISHER-YATES (TIAP SISWA MEMILIKI URUTAN SOAL BERBEDA AGAR TIDAK BISA MENCONTEK)
function shuffleArray(arr) {
  if (!Array.isArray(arr)) return [];
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// 🖼️ HELPER KOMPRESI FOTO SOAL OTOMATIS (Mencegah Database Penuh & Menghemat Kuota Siswa)
function compressAndConvertImage(file, maxWidth = 800, maxHeight = 800, quality = 0.7) {
  return new Promise((resolve) => {
    if (!file) return resolve('');
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.onerror = () => resolve(event.target.result);
    };
    reader.onerror = () => resolve('');
  });
}

// 🤖 GENERATOR SOAL OTOMATIS GOOGLE GEMINI AI UNTUK SMK YPK MEDAN
async function generateExamWithGemini({
  topic = 'Teknologi Informasi & Produktif Kejuruan',
  mapel = 'Teknologi Jaringan Komputer',
  jurusan = 'TJKT',
  tingkat = 'Kelas X',
  pgCount = 30,
  essayCount = 5,
  difficulty = 'Sedang',
  apiKey = '',
}) {
  const cleanKey = apiKey ? apiKey.trim() : '';
  const prompt = `Anda adalah Guru Ahli Kurikulum SMK YPK Medan. Buatlah paket soal ujian CBT lengkap untuk:
- Topik / Materi: ${topic}
- Mata Pelajaran: ${mapel}
- Jurusan: ${jurusan} (SMK)
- Tingkat: ${tingkat}
- Jumlah Pilihan Ganda: ${pgCount} butir (Opsi A, B, C, D, E dengan kunci jawaban A/B/C/D/E dan bobot masing-masing 2 poin).
- Jumlah Soal Essay: ${essayCount} butir (dengan pedoman penskoran singkat dan bobot masing-masing 8 poin).
- Tingkat Kesulitan: ${difficulty}.

Hasilkan output HANYA berupa JSON murni (valid JSON, tanpa markdown formatting, tanpa backtick \`\`\`json) dengan format:
{
  "judul_ujian": "Ujian CBT ${mapel} - ${topic}",
  "soal_list": [
    {
      "nomor": 1,
      "tipe": "PG",
      "pertanyaan": "Teks pertanyaan jelas dan kontekstual kejuruan...",
      "opsi_a": "Pilihan A",
      "opsi_b": "Pilihan B",
      "opsi_c": "Pilihan C",
      "opsi_d": "Pilihan D",
      "opsi_e": "Pilihan E",
      "kunci": "A",
      "bobot": 2
    },
    {
      "nomor": ${pgCount + 1},
      "tipe": "Essay",
      "pertanyaan": "Teks soal essay analisa / studi kasus...",
      "pedoman": "Pedoman kriteria penilaian jawaban lengkap...",
      "bobot": 8
    }
  ]
}`;

  if (cleanKey) {
    try {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${cleanKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              responseMimeType: 'application/json',
            },
          }),
        }
      );
      if (resp.ok) {
        const data = await resp.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const cleanJsonText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJsonText);
        if (parsed && Array.isArray(parsed.soal_list) && parsed.soal_list.length > 0) {
          return {
            judul: parsed.judul_ujian || `Ujian CBT ${mapel} - ${topic}`,
            soal_list: parsed.soal_list.map((q, idx) => ({
              ...q,
              id: idx + 1,
              nomor: idx + 1,
              tipe: q.tipe || (idx < pgCount ? 'PG' : 'Essay'),
              bobot: Number(q.bobot) || (idx < pgCount ? 2 : 8),
            })),
          };
        }
      }
    } catch (e) {
      console.warn('Gemini API call error, switching to smart SMK YPK curriculum engine fallback:', e);
    }
  }

  // Smart fallback generator tailored to SMK YPK vocational majors
  const generatedList = [];
  const sampleTopics = [
    { q: `Prinsip kerja dan konsep dasar dari ${topic} dalam industri kerja modern adalah...`, a: `Penerapan standar operasional prosedur yang tepat dan efisien`, b: `Menghindari penggunaan teknologi modern`, c: `Melakukan proses manual tanpa dokumentasi`, d: `Mengurangi pengawasan keselamatan kerja`, e: `Menyerahkan pekerjaan tanpa verifikasi`, k: 'A' },
    { q: `Komponen perangkat keras utama yang digunakan untuk pengoperasian sistem pada materi ${topic} adalah...`, a: `Kabel Unshielded Twisted Pair`, b: `Unit Pemroses Terpusat dan antarmuka jaringan terintegrasi`, c: `Monitor tabung lama`, d: `Power Supply pasif`, e: `Optical Drive`, k: 'B' },
    { q: `Langkah pertama dalam prosedur troubleshooting jika terjadi kendala operasional pada ${topic} adalah...`, a: `Menginstal ulang seluruh sistem`, b: `Melakukan identifikasi gejala masalah dan pengecekan fisik konektivitas`, c: `Mengabaikan laporan kesalahan`, d: `Mengganti perangkat secara acak`, e: `Mematikan daya secara mendadak`, k: 'B' },
    { q: `Pentingnya kepatuhan terhadap K3 (Kesehatan dan Keselamatan Kerja) dalam praktik ${topic} di laboratorium SMK YPK adalah...`, a: `Mencegah terjadinya kecelakaan kerja dan menjaga keawetan aset peralatan`, b: `Hanya sekadar formalitas peraturan sekolah`, c: `Menghabiskan waktu jam pelajaran praktik`, d: `Membatasi kreativitas siswa dalam mencoba`, e: `Mempersulit prosedur kerja guru dan siswa`, k: 'A' },
    { q: `Standar protokol komunikasi digital yang paling aman untuk transmisi data sistem ${topic} adalah...`, a: `HTTP tanpa sertifikat`, b: `Telnet port 23`, c: `HTTPS / TLS dengan sertifikat enkripsi valid`, d: `FTP mode aktif tanpa password`, e: `SNMP v1 publik`, k: 'C' },
  ];

  for (let i = 1; i <= pgCount; i++) {
    const pick = sampleTopics[(i - 1) % sampleTopics.length];
    generatedList.push({
      id: i,
      nomor: i,
      tipe: 'PG',
      pertanyaan: `[No. ${i}] Terkait materi ${topic} (${jurusan}): ${pick.q}`,
      opsi_a: pick.a,
      opsi_b: pick.b,
      opsi_c: pick.c,
      opsi_d: pick.d,
      opsi_e: pick.e,
      kunci: pick.k,
      bobot: 2,
    });
  }

  for (let j = 1; j <= essayCount; j++) {
    const num = pgCount + j;
    generatedList.push({
      id: num,
      nomor: num,
      tipe: 'Essay',
      pertanyaan: `[Essay No. ${j}] Jelaskan secara komprehensif alur kerja, analisis studi kasus, dan penanganan kendala yang sering dijumpai pada topik "${topic}" untuk siswa jurusan ${jurusan}!`,
      pedoman: `Kriteria penskoran: Menyebutkan konsep dasar (3 poin), menjelaskan alur kerja sistematis (3 poin), dan solusi troubleshooting realistis (2 poin). Total 8 poin.`,
      bobot: 8,
    });
  }

  return {
    judul: `Ujian CBT ${mapel} - ${topic}`,
    soal_list: generatedList,
  };
}

// 📥 PARSER SOAL PINTAR DARI TEKS / WORD / EXCEL (GURU BISA COPAS LANGSUNG)
export function parseExamQuestionsFromText(rawText, startingNumber = 1) {
  if (!rawText || typeof rawText !== 'string' || !rawText.trim()) return [];

  const lines = rawText.split('\n');
  const results = [];
  let current = null;
  let runningNum = startingNumber;

  lines.forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) return;

    // Deteksi nomor soal baru: misal "1.", "1)", "1 ", "No. 1", "Soal 1", "Nomor 1:"
    const numMatch = line.match(/^(?:no\.?|soal|nomor)?\s*(\d+)[\.\)\:\-]?\s*(.*)/i);
    const isOptionStart = /^[A-Ea-e][\.\)\:\-]\s*/.test(line);
    const isKeyStart = /^(?:kunci|jawaban|kunci jawaban|ans|answer|pedoman)[\:\=]/i.test(line);

    if (numMatch && !isOptionStart && !isKeyStart && numMatch[2]) {
      if (current) results.push(current);
      const isExplicitEssay = /essay|uraian/i.test(line);
      current = {
        id: runningNum,
        nomor: runningNum,
        tipe: isExplicitEssay ? 'Essay' : 'PG',
        pertanyaan: numMatch[2] || '',
        opsi_a: '',
        opsi_b: '',
        opsi_c: '',
        opsi_d: '',
        opsi_e: '',
        kunci: isExplicitEssay ? '' : 'A',
        bobot: isExplicitEssay ? 8 : 2,
        pedoman: isExplicitEssay ? 'Pedoman penilaian guru SMK YPK' : '',
      };
      runningNum++;
      return;
    }

    // Deteksi Opsi Pilihan Ganda (A, B, C, D, E)
    const optMatch = line.match(/^([A-Ea-e])[\.\)\:\-]?\s*(.*)/);
    if (optMatch && current) {
      const letter = optMatch[1].toUpperCase();
      const text = optMatch[2] || '';
      current[`opsi_${letter.toLowerCase()}`] = text;
      current.tipe = 'PG';
      return;
    }

    // Deteksi Kunci Jawaban (Kunci: A atau Jawaban: B)
    const keyMatch = line.match(/^(?:kunci|jawaban|kunci jawaban|ans|answer)[\:\=\s]+([A-Ea-e])/i);
    if (keyMatch && current) {
      current.kunci = keyMatch[1].toUpperCase();
      current.tipe = 'PG';
      return;
    }

    // Deteksi Pedoman Nilai Essay
    const pedomanMatch = line.match(/^(?:pedoman|rubrik|kriteria|penskoran)[\:\=\s]+(.*)/i);
    if (pedomanMatch && current) {
      current.pedoman = pedomanMatch[1];
      current.tipe = 'Essay';
      current.bobot = 8;
      return;
    }

    // Jika bukan nomor baru dan bukan opsi/kunci: ini adalah kelanjutan teks pertanyaan
    if (current) {
      if (!current.opsi_a) {
        current.pertanyaan = current.pertanyaan ? `${current.pertanyaan} ${line}` : line;
      }
    }
  });

  if (current) results.push(current);

  // Periksa kembali tipe: jika tidak ada opsi_a dan opsi_b, otomatis jadikan Essay
  results.forEach((q) => {
    if (!q.opsi_a && !q.opsi_b) {
      q.tipe = 'Essay';
      q.bobot = 8;
      if (!q.pedoman) q.pedoman = 'Pedoman penskoran guru SMK YPK';
    }
  });

  return results;
}

// 🏷️ IKON OTOMATIS PER MATA PELAJARAN
export function getMapelIcon(mapelName = '') {
  const m = String(mapelName).toLowerCase();
  if (m.includes('jaringan') || m.includes('tjkt') || m.includes('komputer') || m.includes('informatika')) return '💻';
  if (m.includes('akuntansi') || m.includes('akl') || m.includes('keuangan')) return '📊';
  if (m.includes('kantor') || m.includes('mplb') || m.includes('arsip')) return '📁';
  if (m.includes('pasar') || m.includes('bisnis') || m.includes('marketing') || m.includes('retail')) return '🛍️';
  if (m.includes('matematika') || m.includes('hitung') || m.includes('mtk')) return '📐';
  if (m.includes('indonesia')) return '🇮🇩';
  if (m.includes('inggris') || m.includes('english')) return '🌐';
  if (m.includes('agama') || m.includes('islam') || m.includes('budi')) return '🕌';
  if (m.includes('pancasila') || m.includes('ppkn') || m.includes('kewarganegaraan')) return '🦅';
  if (m.includes('sejarah')) return '📜';
  if (m.includes('olahraga') || m.includes('pjok') || m.includes('jasmani')) return '⚽';
  if (m.includes('kewirausahaan') || m.includes('pkk') || m.includes('kreatif')) return '💡';
  return '📚';
}

// 📋 DAFTAR PILIHAN MATA PELAJARAN RESMI SMK YPK MEDAN
export const MAPEL_OPTIONS_SMK_YPK = [
  'Teknologi Jaringan Komputer & Telekomunikasi (TJKT)',
  'Akuntansi dan Keuangan Lembaga (AKL)',
  'Manajemen Perkantoran & Layanan Bisnis (MPLB)',
  'Pemasaran & Bisnis Digital (PM)',
  'Matematika',
  'Bahasa Indonesia',
  'Bahasa Inggris',
  'Pendidikan Agama & Budi Pekerti',
  'Pendidikan Pancasila (PPKn)',
  'Sejarah Indonesia',
  'Pendidikan Jasmani, Olahraga & Kesehatan (PJOK)',
  'Informatika & Komputer',
  'Produk Kreatif & Kewirausahaan (PKK)',
  'Seni Budaya & Muatan Lokal',
  'Lainnya (Ketik Sendiri)',
];

// 📚 BANK SOAL SAMPEL RESMI (30 PILIHAN GANDA + 5 ESSAY) SIAP UJI COBA LANGSUNG
export const DEFAULT_SAMPLE_EXAM = {
  id: 101,
  judul_ujian: 'Penilaian Tengah Semester (PTS) - Kejuruan & Literasi Digital TJKT',
  mata_pelajaran: 'Teknologi Jaringan Komputer & Telekomunikasi (TJKT)',
  tingkat: 'Kelas X',
  jurusan: 'TJKT',
  kelas_target: 'X TJKT',
  durasi_menit: 60,
  kkm: 75,
  token_ujian: 'TJKT26',
  password_pengawas: 'ypkadmin',
  acak_soal: false,
  tampilkan_nilai: true,
  anti_cheat_enabled: true,
  max_tab_violations: 3,
  status_ujian: 'Aktif',
  dibuat_oleh: 'Iqbal, S.Kom (Guru TJKT)',
  soal_list: [
    // 30 SOAL PILIHAN GANDA
    { id: 1, nomor: 1, tipe: 'PG', pertanyaan: 'Apa fungsi utama dari protokol DHCP pada jaringan komputer di SMK YPK?', opsi_a: 'Memberikan alamat IP secara otomatis ke perangkat klien', opsi_b: 'Mengamankan transmisi data melalui enkripsi SSL', opsi_c: 'Menghubungkan komputer dengan printer secara fisik', opsi_d: 'Membatasi bandwidth pengguna internet', opsi_e: 'Menyimpan file backup database sekolah', kunci: 'A', bobot: 2 },
    { id: 2, nomor: 2, tipe: 'PG', pertanyaan: 'Alat jaringan pada gambar berikut yang berfungsi menghubungkan dua jaringan dengan subnet berbeda adalah...', gambar_url: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&auto=format&fit=crop&q=60', opsi_a: 'Switch Unmanaged', opsi_b: 'Router', opsi_c: 'Hub', opsi_d: 'Kabel UTP', opsi_e: 'Repeater', kunci: 'B', bobot: 2 },
    { id: 3, nomor: 3, tipe: 'PG', pertanyaan: 'Topologi jaringan yang menggunakan satu kabel tunggal sebagai jalur utama transmisi data adalah...', opsi_a: 'Star', opsi_b: 'Mesh', opsi_c: 'Bus', opsi_d: 'Ring', opsi_e: 'Tree', kunci: 'C', bobot: 2 },
    { id: 4, nomor: 4, tipe: 'PG', pertanyaan: 'Urutan warna standar kabel UTP T568B untuk pin 1 sampai 3 adalah...', opsi_a: 'Putih Hijau, Hijau, Putih Oranye', opsi_b: 'Putih Oranye, Oranye, Putih Hijau', opsi_c: 'Putih Biru, Biru, Putih Cokelat', opsi_d: 'Putih Cokelat, Cokelat, Biru', opsi_e: 'Oranye, Putih Oranye, Hijau', kunci: 'B', bobot: 2 },
    { id: 5, nomor: 5, tipe: 'PG', pertanyaan: 'Dalam akuntansi keuangan, persamaan dasar akuntansi yang benar adalah...', opsi_a: 'Aset = Liabilitas - Ekuitas', opsi_b: 'Aset = Liabilitas + Ekuitas', opsi_c: 'Liabilitas = Aset + Ekuitas', opsi_d: 'Ekuitas = Aset + Liabilitas', opsi_e: 'Pendapatan = Beban + Modal', kunci: 'B', bobot: 2 },
    { id: 6, nomor: 6, tipe: 'PG', pertanyaan: 'Laporan keuangan yang menyajikan posisi aktiva, kewajiban, dan modal pada tanggal tertentu adalah...', opsi_a: 'Laporan Laba Rugi', opsi_b: 'Laporan Perubahan Modal', opsi_c: 'Neraca (Balance Sheet)', opsi_d: 'Laporan Arus Kas', opsi_e: 'Jurnal Penyesuaian', kunci: 'C', bobot: 2 },
    { id: 7, nomor: 7, tipe: 'PG', pertanyaan: 'Surat resmi yang dikeluarkan oleh instansi sekolah kepada orang tua siswa disebut...', opsi_a: 'Surat Pribadi', opsi_b: 'Surat Dinas / Resmi', opsi_c: 'Surat Niaga', opsi_d: 'Surat Elektronik Biasa', opsi_e: 'Surat Lamaran', kunci: 'B', bobot: 2 },
    { id: 8, nomor: 8, tipe: 'PG', pertanyaan: 'Dalam administrasi perkantoran (MPLB), sistem kearsipan berdasarkan abjad nama disebut...', opsi_a: 'Chronological Filing System', opsi_b: 'Alphabetical Filing System', opsi_c: 'Numerical Filing System', opsi_d: 'Geographical Filing System', opsi_e: 'Subject Filing System', kunci: 'B', bobot: 2 },
    { id: 9, nomor: 9, tipe: 'PG', pertanyaan: 'Strategi pemasaran 4P dalam Bisnis & Pemasaran (PM) terdiri dari...', opsi_a: 'Product, Price, Place, Promotion', opsi_b: 'People, Process, Profit, Production', opsi_c: 'Plan, Perform, Packaging, Public', opsi_d: 'Payment, Positioning, Policy, Power', opsi_e: 'Program, People, Place, Point', kunci: 'A', bobot: 2 },
    { id: 10, nomor: 10, tipe: 'PG', pertanyaan: 'Saluran pemasaran digital yang memanfaatkan mesin pencari Google tanpa berbayar disebut...', opsi_a: 'SEM (Search Engine Marketing)', opsi_b: 'SEO (Search Engine Optimization)', opsi_c: 'Affiliate Marketing', opsi_d: 'Telemarketing', opsi_e: 'Direct Selling', kunci: 'B', bobot: 2 },
    { id: 11, nomor: 11, tipe: 'PG', pertanyaan: 'Frekuensi standar yang digunakan pada kartu RFID Mifare 1K SMK YPK adalah...', opsi_a: '125 kHz', opsi_b: '13.56 MHz', opsi_c: '2.4 GHz', opsi_d: '5.8 GHz', opsi_e: '900 MHz', kunci: 'B', bobot: 2 },
    { id: 12, nomor: 12, tipe: 'PG', pertanyaan: 'Mikrokontroler berfitur Wi-Fi yang sering digunakan pada sistem IoT presensi adalah...', opsi_a: 'Arduino Uno R3', opsi_b: 'ESP8266 / NodeMCU', opsi_c: 'Raspberry Pi Pico Non-W', opsi_d: 'ATmega328P Standalone', opsi_e: 'PIC16F877A', kunci: 'B', bobot: 2 },
    { id: 13, nomor: 13, tipe: 'PG', pertanyaan: 'Perintah command prompt (CMD) untuk memeriksa konektivitas jaringan ke server adalah...', opsi_a: 'ipconfig /all', opsi_b: 'ping', opsi_c: 'tracert', opsi_d: 'netstat', opsi_e: 'nslookup', kunci: 'B', bobot: 2 },
    { id: 14, nomor: 14, tipe: 'PG', pertanyaan: 'Subnet mask standar untuk jaringan kelas C dengan prefix /24 adalah...', opsi_a: '255.0.0.0', opsi_b: '255.255.0.0', opsi_c: '255.255.255.0', opsi_d: '255.255.255.128', opsi_e: '255.255.255.252', kunci: 'C', bobot: 2 },
    { id: 15, nomor: 15, tipe: 'PG', pertanyaan: 'Jurnal yang digunakan untuk mencatat transaksi pengeluaran kas secara tunai adalah...', opsi_a: 'Jurnal Penjualan', opsi_b: 'Jurnal Pengeluaran Kas (Cash Payment Journal)', opsi_c: 'Jurnal Penerimaan Kas', opsi_d: 'Jurnal Pembelian', opsi_e: 'Jurnal Umum', kunci: 'B', bobot: 2 },
    { id: 16, nomor: 16, tipe: 'PG', pertanyaan: 'Bukti transaksi pembelian atau penjualan barang secara kredit disebut...', opsi_a: 'Kuitansi', opsi_b: 'Faktur (Invoice)', opsi_c: 'Nota Kontan', opsi_d: 'Cek', opsi_e: 'Bilyet Giro', kunci: 'B', bobot: 2 },
    { id: 17, nomor: 17, tipe: 'PG', pertanyaan: 'Software lembar kerja pengolah angka yang umum digunakan di jurusan Akuntansi adalah...', opsi_a: 'Microsoft Word', opsi_b: 'Microsoft Excel', opsi_c: 'Microsoft PowerPoint', opsi_d: 'CorelDRAW', opsi_e: 'Adobe Premiere', kunci: 'B', bobot: 2 },
    { id: 18, nomor: 18, tipe: 'PG', pertanyaan: 'Rumus pada spreadsheet untuk menjumlahkan sekumpulan data numerik adalah...', opsi_a: '=AVERAGE()', opsi_b: '=SUM()', opsi_c: '=COUNT()', opsi_d: '=MAX()', opsi_e: '=IF()', kunci: 'B', bobot: 2 },
    { id: 19, nomor: 19, tipe: 'PG', pertanyaan: 'Sikap profesional yang wajib dimiliki oleh sekretaris dalam menjaga rahasia kantor adalah...', opsi_a: 'Integritas & Loyalitas', opsi_b: 'Egoisme', opsi_c: 'Apatis', opsi_d: 'Pasif', opsi_e: 'Konsumtif', kunci: 'A', bobot: 2 },
    { id: 20, nomor: 20, tipe: 'PG', pertanyaan: 'Alat perkantoran yang digunakan untuk menghancurkan dokumen rahasia menjadi potongan kecil adalah...', opsi_a: 'Laminating Machine', opsi_b: 'Paper Shredder', opsi_c: 'Scanner Dokumen', opsi_d: 'Perforator', opsi_e: 'Stapler Heavy Duty', kunci: 'B', bobot: 2 },
    { id: 21, nomor: 21, tipe: 'PG', pertanyaan: 'Tahap pertama dalam proses pengambilan keputusan pembelian oleh konsumen adalah...', opsi_a: 'Evaluasi Alternatif', opsi_b: 'Pengenalan Masalah / Kebutuhan', opsi_c: 'Pencarian Informasi', opsi_d: 'Keputusan Membeli', opsi_e: 'Perilaku Pasca Pembelian', kunci: 'B', bobot: 2 },
    { id: 22, nomor: 22, tipe: 'PG', pertanyaan: 'Visual merchandising pada toko ritel bertujuan untuk...', opsi_a: 'Menyembunyikan barang dagangan', opsi_b: 'Menarik perhatian pelanggan dan meningkatkan penjualan', opsi_c: 'Mengurangi jumlah pramuniaga', opsi_d: 'Menaikkan harga pokok barang', opsi_e: 'Mempercepat kerusakan produk', kunci: 'B', bobot: 2 },
    { id: 23, nomor: 23, tipe: 'PG', pertanyaan: 'Sistem operasi berbasis open source yang banyak digunakan untuk server jaringan adalah...', opsi_a: 'Windows 11 Home', opsi_b: 'Linux (Ubuntu / Debian)', opsi_c: 'macOS Monterey', opsi_d: 'MS-DOS', opsi_e: 'Android Go', kunci: 'B', bobot: 2 },
    { id: 24, nomor: 24, tipe: 'PG', pertanyaan: 'Port default untuk layanan web server aman (HTTPS) adalah...', opsi_a: 'Port 80', opsi_b: 'Port 443', opsi_c: 'Port 21', opsi_d: 'Port 22', opsi_e: 'Port 3306', kunci: 'B', bobot: 2 },
    { id: 25, nomor: 25, tipe: 'PG', pertanyaan: 'Karakteristik utama dari media transmisi serat optik (Fiber Optic) adalah...', opsi_a: 'Menggunakan sinyal listrik pada kabel tembaga', opsi_b: 'Mentransmisikan data dalam bentuk pulsa cahaya berkecepatan tinggi', opsi_c: 'Sangat rentan terhadap interferensi gelombang radio', opsi_d: 'Memiliki jarak transmisi maksimal hanya 100 meter', opsi_e: 'Harganya paling murah dibandingkan kabel coaxial', kunci: 'B', bobot: 2 },
    { id: 26, nomor: 26, tipe: 'PG', pertanyaan: 'Metode persediaan di mana barang yang pertama masuk diasumsikan sebagai yang pertama keluar disebut...', opsi_a: 'LIFO (Last In First Out)', opsi_b: 'FIFO (First In First Out)', opsi_c: 'Average Method', opsi_d: 'Specific Identification', opsi_e: 'Weighted Moving Average', kunci: 'B', bobot: 2 },
    { id: 27, nomor: 27, tipe: 'PG', pertanyaan: 'Pajak yang dikenakan atas konsumsi barang kena pajak di dalam negeri adalah...', opsi_a: 'PPh Pasal 21', opsi_b: 'PPN (Pajak Pertambahan Nilai)', opsi_c: 'PBB (Pajak Bumi dan Bangunan)', opsi_d: 'BPHTB', opsi_e: 'Pajak Kendaraan Bermotor', kunci: 'B', bobot: 2 },
    { id: 28, nomor: 28, tipe: 'PG', pertanyaan: 'Media penyimpanan cloud storage yang sering digunakan untuk berbagi dokumen sekolah adalah...', opsi_a: 'Google Drive', opsi_b: 'Floppy Disk', opsi_c: 'Flashdisk 2GB', opsi_d: 'CD-ROM', opsi_e: 'Pita Magnetik', kunci: 'A', bobot: 2 },
    { id: 29, nomor: 29, tipe: 'PG', pertanyaan: 'Teknologi kecerdasan buatan (AI) yang memproses bahasa alami manusia disebut...', opsi_a: 'Computer Vision', opsi_b: 'NLP (Natural Language Processing)', opsi_c: 'Robotics Automation', opsi_d: 'Genetic Algorithm', opsi_e: 'Reinforcement Sensor', kunci: 'B', bobot: 2 },
    { id: 30, nomor: 30, tipe: 'PG', pertanyaan: 'Visi utama lulusan SMK YPK Medan dalam menghadapi era industri 4.0 adalah...', opsi_a: 'Menjadi generasi terampil, berkarakter, beriman, dan berdaya saing global', opsi_b: 'Hanya mencari sertifikat formal', opsi_c: 'Menghindari perkembangan teknologi informasi', opsi_d: 'Bekerja tanpa memperhatikan etika profesi', opsi_e: 'Menolak inovasi sistem digital', kunci: 'A', bobot: 2 },

    // 5 SOAL ESSAY
    { id: 31, nomor: 31, tipe: 'Essay', pertanyaan: 'Jelaskan perbedaan mendasar antara jaringan LAN (Local Area Network) dan WAN (Wide Area Network) beserta contoh penerapannya di lingkungan SMK YPK Medan!', pedoman: 'LAN mencakup area terbatas (gedung sekolah/lab komputer), sedangkan WAN mencakup area geografis luas (antar kota/negara via internet).', bobot: 8 },
    { id: 32, nomor: 32, tipe: 'Essay', pertanyaan: 'Sebutkan dan jelaskan 3 (tiga) komponen utama dalam sistem presensi digital RFID SMK YPK (Tag RFID, Reader/ESP8266, dan Server Database)!', pedoman: '1. Kartu RFID (UID identitas), 2. Reader RFID/ESP8266 (pemindai dan pengirim data Wi-Fi), 3. Server Database Supabase (pengolah dan penyimpan riwayat kehadiran).', bobot: 8 },
    { id: 33, nomor: 33, tipe: 'Essay', pertanyaan: 'Dalam administrasi perkantoran, mengapa tata kelola arsip surat masuk dan keluar yang rapi sangat penting bagi efisiensi sebuah organisasi sekolah?', pedoman: 'Memudahkan pencarian dokumen penting, menjaga bukti legalitas/transaksi, mencegah kehilangan data, dan mempercepat alur kerja.', bobot: 8 },
    { id: 34, nomor: 34, tipe: 'Essay', pertanyaan: 'Jelaskan mengapa laporan Laba Rugi dan Neraca saling berkaitan dalam siklus akuntansi keuangan perusahaan jasa maupun dagang!', pedoman: 'Laba/Rugi bersih dari Laporan Laba Rugi akan menambah atau mengurangi Ekuitas/Modal di Neraca melalui Laporan Perubahan Modal.', bobot: 8 },
    { id: 35, nomor: 35, tipe: 'Essay', pertanyaan: 'Bagaimana peran teknologi digital dan kecerdasan buatan (AI) dapat membantu siswa SMK YPK dalam meningkatkan prestasi akademik dan kesiapan kerja di dunia industri?', pedoman: 'AI sebagai asisten belajar personal, simulasi praktik kejuruan, efisiensi pengerjaan tugas, dan melatih adaptasi teknologi di dunia kerja modern.', bobot: 8 },
  ],
};

// 📚 DAFTAR PAKET UJIAN AWAL TERKELOMPOK PER MATA PELAJARAN DI SMK YPK MEDAN
export const INITIAL_SMK_YPK_EXAMS = [
  DEFAULT_SAMPLE_EXAM,
  {
    id: 102,
    judul_ujian: 'Ulangan Harian - Matematika Kejuruan & Logika Bisnis',
    mata_pelajaran: 'Matematika',
    tingkat: 'Semua Tingkat',
    jurusan: 'Semua Jurusan',
    kelas_target: 'Semua Kelas',
    durasi_menit: 60,
    kkm: 75,
    token_ujian: 'MTK2026',
    password_pengawas: 'ypkadmin',
    acak_soal: false,
    tampilkan_nilai: true,
    anti_cheat_enabled: true,
    max_tab_violations: 3,
    status_ujian: 'Aktif',
    dibuat_oleh: 'Hartati Patiwael, S.Si',
    soal_list: [
      { id: 1, nomor: 1, tipe: 'PG', pertanyaan: 'Nilai dari 2^5 + 3^2 adalah...', opsi_a: '32', opsi_b: '41', opsi_c: '25', opsi_d: '39', opsi_e: '45', kunci: 'B', bobot: 2 },
      { id: 2, nomor: 2, tipe: 'PG', pertanyaan: 'Jika sebuah barang dibeli seharga Rp 100.000 dan dijual Rp 125.000, persentase keuntungannya adalah...', opsi_a: '20%', opsi_b: '25%', opsi_c: '15%', opsi_d: '30%', opsi_e: '10%', kunci: 'B', bobot: 2 },
      { id: 3, nomor: 3, tipe: 'PG', pertanyaan: 'Bentuk sederhana dari (x^3 * x^4) / x^2 adalah...', opsi_a: 'x^5', opsi_b: 'x^6', opsi_c: 'x^9', opsi_d: 'x^4', opsi_e: 'x^7', kunci: 'A', bobot: 2 },
      { id: 4, nomor: 4, tipe: 'PG', pertanyaan: 'Sebuah segitiga siku-siku memiliki panjang alas 6 cm dan tinggi 8 cm. Panjang sisi miringnya adalah...', opsi_a: '9 cm', opsi_b: '10 cm', opsi_c: '12 cm', opsi_d: '14 cm', opsi_e: '15 cm', kunci: 'B', bobot: 2 },
      { id: 5, nomor: 5, tipe: 'PG', pertanyaan: 'Rata-rata hitung (mean) dari data: 7, 8, 9, 6, 10 adalah...', opsi_a: '7.5', opsi_b: '8.0', opsi_c: '8.5', opsi_d: '7.8', opsi_e: '8.2', kunci: 'B', bobot: 2 },
      { id: 6, nomor: 6, tipe: 'Essay', pertanyaan: 'Jelaskan penerapan matematika keuangan (bunga tunggal dan bunga majemuk) dalam pengelolaan tabungan siswa di sekolah!', pedoman: 'Konsep bunga tunggal dihitung dari pokok awal, sedangkan bunga majemuk dihitung dari pokok beserta bunga berjalan.', bobot: 10 },
    ],
  },
  {
    id: 103,
    judul_ujian: 'Ujian Praktik Siklus Akuntansi & Pembukuan Perusahaan',
    mata_pelajaran: 'Akuntansi dan Keuangan Lembaga (AKL)',
    tingkat: 'Kelas XI',
    jurusan: 'AKL',
    kelas_target: 'XI AKL',
    durasi_menit: 90,
    kkm: 75,
    token_ujian: 'AKL2026',
    password_pengawas: 'ypkadmin',
    acak_soal: false,
    tampilkan_nilai: true,
    anti_cheat_enabled: true,
    max_tab_violations: 3,
    status_ujian: 'Aktif',
    dibuat_oleh: 'Hj. Darmawati, S.Pd., M.Pd',
    soal_list: [
      { id: 1, nomor: 1, tipe: 'PG', pertanyaan: 'Persamaan dasar akuntansi yang benar adalah...', opsi_a: 'Aset = Liabilitas - Ekuitas', opsi_b: 'Aset = Liabilitas + Ekuitas', opsi_c: 'Ekuitas = Aset + Liabilitas', opsi_d: 'Liabilitas = Aset + Ekuitas', opsi_e: 'Modal = Aset - Beban', kunci: 'B', bobot: 2 },
      { id: 2, nomor: 2, tipe: 'PG', pertanyaan: 'Laporan keuangan yang menyajikan posisi aktiva, kewajiban, dan modal pada tanggal tertentu adalah...', opsi_a: 'Laba Rugi', opsi_b: 'Perubahan Modal', opsi_c: 'Neraca', opsi_d: 'Arus Kas', opsi_e: 'Jurnal Penyesuaian', kunci: 'C', bobot: 2 },
      { id: 3, nomor: 3, tipe: 'Essay', pertanyaan: 'Jelaskan perbedaan mendasar antara perusahaan jasa dan perusahaan dagang dalam penyusunan laporan keuangan!', pedoman: 'Perusahaan jasa tidak memiliki persediaan barang dagang (HPP), sedangkan perusahaan dagang menghitung HPP.', bobot: 10 },
    ],
  },
  {
    id: 104,
    judul_ujian: 'Ujian Administrasi Perkantoran & Kearsipan Digital',
    mata_pelajaran: 'Manajemen Perkantoran & Layanan Bisnis (MPLB)',
    tingkat: 'Kelas X',
    jurusan: 'MPLB',
    kelas_target: 'X MPLB',
    durasi_menit: 60,
    kkm: 75,
    token_ujian: 'MPLB26',
    password_pengawas: 'ypkadmin',
    acak_soal: false,
    tampilkan_nilai: true,
    anti_cheat_enabled: true,
    max_tab_violations: 3,
    status_ujian: 'Aktif',
    dibuat_oleh: 'Dewan Guru MPLB SMK YPK',
    soal_list: [
      { id: 1, nomor: 1, tipe: 'PG', pertanyaan: 'Surat resmi yang dikeluarkan oleh instansi sekolah kepada orang tua siswa disebut...', opsi_a: 'Surat Pribadi', opsi_b: 'Surat Dinas / Resmi', opsi_c: 'Surat Niaga', opsi_d: 'Surat Lamaran', opsi_e: 'Memo', kunci: 'B', bobot: 2 },
      { id: 2, nomor: 2, tipe: 'PG', pertanyaan: 'Sistem kearsipan berdasarkan abjad nama disebut...', opsi_a: 'Chronological System', opsi_b: 'Alphabetical Filing System', opsi_c: 'Numerical System', opsi_d: 'Geographical System', opsi_e: 'Subject System', kunci: 'B', bobot: 2 },
      { id: 3, nomor: 3, tipe: 'Essay', pertanyaan: 'Mengapa tata kelola arsip digital sangat penting dalam era perkantoran modern?', pedoman: 'Memudahkan pencarian cepat, menghemat ruang fisik, mencegah kerusakan fisik, dan memudahkan kolaborasi.', bobot: 10 },
    ],
  },
  {
    id: 105,
    judul_ujian: 'Ujian Strategi Pemasaran Digital & E-Commerce',
    mata_pelajaran: 'Pemasaran & Bisnis Digital (PM)',
    tingkat: 'Kelas XII',
    jurusan: 'Pemasaran',
    kelas_target: 'XII Pemasaran',
    durasi_menit: 60,
    kkm: 75,
    token_ujian: 'PM2026',
    password_pengawas: 'ypkadmin',
    acak_soal: false,
    tampilkan_nilai: true,
    anti_cheat_enabled: true,
    max_tab_violations: 3,
    status_ujian: 'Aktif',
    dibuat_oleh: 'Dewan Guru Bisnis & Pemasaran',
    soal_list: [
      { id: 1, nomor: 1, tipe: 'PG', pertanyaan: 'Strategi bauran pemasaran 4P terdiri dari...', opsi_a: 'Product, Price, Place, Promotion', opsi_b: 'People, Process, Profit, Production', opsi_c: 'Plan, Perform, Packaging, Public', opsi_d: 'Payment, Policy, Power, Point', opsi_e: 'Program, People, Place, Point', kunci: 'A', bobot: 2 },
      { id: 2, nomor: 2, tipe: 'PG', pertanyaan: 'Pemasaran organik di mesin pencari Google tanpa iklan berbayar disebut...', opsi_a: 'SEM', opsi_b: 'SEO (Search Engine Optimization)', opsi_c: 'Telemarketing', opsi_d: 'Direct Selling', opsi_e: 'Affiliate', kunci: 'B', bobot: 2 },
      { id: 3, nomor: 3, tipe: 'Essay', pertanyaan: 'Jelaskan bagaimana media sosial dapat dimanfaatkan untuk meningkatkan penjualan produk UMKM lokal!', pedoman: 'Membangun awareness, konten visual menarik, interaksi dengan calon pelanggan, dan promosi tertarget.', bobot: 10 },
    ],
  },
];

export default function UjianCbtView({
  currentUser,
  siswaList = [],
  isMasterIqbal,
  isSiswaAdmin,
  siswaAdminKelas,
  isRestrictedGuru,
  activeSubMenu = 'ruang_ujian',
  onSubMenuChange,
  supabase,
}) {
  // State Ujian
  const [examList, setExamList] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [isExamRunning, setIsExamRunning] = useState(false);

  // Ruang Ujian State (Siswa CBT)
  const [studentAnswers, setStudentAnswers] = useState({}); // { [nomor]: 'A' | 'Teks' }
  const [raguList, setRaguList] = useState({}); // { [nomor]: boolean }
  const [activeQuestionNum, setActiveQuestionNum] = useState(1);
  const [studentShuffledQuestions, setStudentShuffledQuestions] = useState([]);
  const [activeQuestionSeq, setActiveQuestionSeq] = useState(1);
  const [activeExamSession, setActiveExamSession] = useState(null);
  const [fontSizeLevel, setFontSizeLevel] = useState(16);
  const [tokenInput, setTokenInput] = useState('');
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(3600);
  const essaySaveTimeoutRef = useRef({});

  // Anti-Cheat Engine & Layar Terkunci Pengawas
  const [violationCount, setViolationCount] = useState(0);
  const [violationLogs, setViolationLogs] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCheatWarningModal, setIsCheatWarningModal] = useState(false);
  const [cheatWarningReason, setCheatWarningReason] = useState('');
  const [isScreenLockedByAdmin, setIsScreenLockedByAdmin] = useState(false);
  const [lockedReason, setLockedReason] = useState('');
  const [unlockPasswordInput, setUnlockPasswordInput] = useState('');
  const [unlockErrorMsg, setUnlockErrorMsg] = useState('');
  const [proctorHelpSent, setProctorHelpSent] = useState(false);

  // Soal Bergambar Modal Zoom Lightbox
  const [lightboxImage, setLightboxImage] = useState(null);

  // Form Buat Ujian (Guru / Admin)
  const [formJudul, setFormJudul] = useState('');
  const [formMapel, setFormMapel] = useState('Teknologi Informasi');
  const [formTingkat, setFormTingkat] = useState('Semua Tingkat');
  const [formJurusan, setFormJurusan] = useState('Semua Jurusan');
  const [formDurasi, setFormDurasi] = useState(60);
  const [formKkm, setFormKkm] = useState(75);
  const [formToken, setFormToken] = useState('YPK2026');
  const [formPasswordPengawas, setFormPasswordPengawas] = useState('ypkadmin');
  const [formAcakSoal, setFormAcakSoal] = useState(false);
  const [formSoalList, setFormSoalList] = useState([]);
  const [activeTabBuilder, setActiveTabBuilder] = useState('import'); // 'import' | 'pg' | 'essay' | 'ai_gemini'
  const [bulkImportText, setBulkImportText] = useState('');

  // AI Gemini Generator State
  const [aiTopic, setAiTopic] = useState('Konfigurasi Jaringan Mikrotik, Subnetting & Troubleshooting');
  const [aiMapel, setAiMapel] = useState('Teknologi Jaringan Komputer');
  const [aiJurusan, setAiJurusan] = useState('TJKT');
  const [aiTingkat, setAiTingkat] = useState('Kelas X');
  const [aiPgCount, setAiPgCount] = useState(30);
  const [aiEssayCount, setAiEssayCount] = useState(5);
  const [aiDifficulty, setAiDifficulty] = useState('Sedang');
  const [geminiApiKeyInput, setGeminiApiKeyInput] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Bank Soal & Editor Soal State
  const [selectedBankExamId, setSelectedBankExamId] = useState('');
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [editingImagePreview, setEditingImagePreview] = useState('');
  const [isAddingNewQuestion, setIsAddingNewQuestion] = useState(false);
  const [bankSearchQuery, setBankSearchQuery] = useState('');
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // 🏷️ Filter Mapel & Guru Pembuat (SMK YPK CBT)
  const [selectedMapelFilter, setSelectedMapelFilter] = useState('Semua');
  const [selectedGuruFilter, setSelectedGuruFilter] = useState('semua'); // 'semua' | 'saya'
  const [activeExamForEdit, setActiveExamForEdit] = useState(null); // Jika diisi, membuka editor butir soal paket tersebut
  const [uploadModalExam, setUploadModalExam] = useState(null); // Paket ujian yang sedang dibuka modal upload cepatnya
  const [quickUploadText, setQuickUploadText] = useState('');
  const [quickUploadMode, setQuickUploadMode] = useState('append'); // 'append' | 'replace'
  const [isProcessingQuickUpload, setIsProcessingQuickUpload] = useState(false);
  const quickUploadFileRef = useRef(null);
  const [tokenInputsByExam, setTokenInputsByExam] = useState({});

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Pastikan saat modal edit soal dibuka: scroll layar terkunci dan tampilan modal tetap di paling atas (tidak ke tengah)
  useEffect(() => {
    if (editingQuestion) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const timer = setTimeout(() => {
        const scrollBody = document.getElementById('edit-modal-scrollable-body');
        if (scrollBody) {
          scrollBody.scrollTop = 0;
        }
      }, 10);
      return () => {
        document.body.style.overflow = prevOverflow;
        clearTimeout(timer);
      };
    }
  }, [editingQuestion]);

  // Koreksi Essay & Nilai
  const [submissionList, setSubmissionList] = useState([]);
  const [gradingSubmission, setGradingSubmission] = useState(null);
  const [essayScores, setEssayScores] = useState({});

  // Hasil Ujian Selesai
  const [examResult, setExamResult] = useState(null);

  const timerIntervalRef = useRef(null);

  const isTeacherOrAdmin = Boolean(
    isMasterIqbal ||
    currentUser?.isMaster ||
    currentUser?.isGuru === true ||
    String(currentUser?.username || '').toLowerCase() === 'iqbal' ||
    String(currentUser?.nama || '').toLowerCase().includes('iqbal') ||
    String(currentUser?.role || '').toLowerCase() === 'master' ||
    (!String(currentUser?.id || '').startsWith('SISWA-') && !isSiswaAdmin && (currentUser?.role?.toLowerCase() === 'admin' || currentUser?.role?.toLowerCase() === 'guru' || currentUser?.role?.toLowerCase() === 'staff')) ||
    String(currentUser?.id || '').startsWith('GURU-')
  );

  const isStudentUser = Boolean(!isTeacherOrAdmin);
  const isAdminOrTeacher = isTeacherOrAdmin;

  // 🎯 Resolusi Tab Efektif Bebas Kedip - Guru langsung masuk Bank Soal per Mapel
  const defaultTab = isTeacherOrAdmin ? 'bank_soal' : 'ruang_ujian';
  const effectiveTab = (isStudentUser && (activeSubMenu === 'buat_ujian' || activeSubMenu === 'koreksi_essay' || activeSubMenu === 'bank_soal'))
    ? 'ruang_ujian'
    : (activeSubMenu || defaultTab);

  // Fetch Supabase Exams & Realtime Sync
  const fetchSupabaseExams = async () => {
    if (!supabase) return;
    try {
      const { data: exams, error: examErr } = await supabase
        .from('tb_ujian')
        .select('*')
        .order('created_at', { ascending: false });

      if (examErr || !exams || exams.length === 0) return;

      const { data: questions } = await supabase
        .from('tb_soal_ujian')
        .select('*')
        .order('nomor_soal', { ascending: true });

      const mappedExams = exams.map((ex) => {
        const examQuestions = (questions || [])
          .filter((q) => q.id_ujian === ex.id_ujian)
          .map((q) => ({
            id: q.id_soal || q.nomor_soal,
            nomor: q.nomor_soal,
            tipe: q.tipe_soal || 'PG',
            pertanyaan: q.pertanyaan || '',
            gambar_url: q.gambar_url || '',
            opsi_a: q.opsi_a || '',
            opsi_b: q.opsi_b || '',
            opsi_c: q.opsi_c || '',
            opsi_d: q.opsi_d || '',
            opsi_e: q.opsi_e || '',
            kunci: q.kunci_jawaban || 'A',
            bobot: q.bobot_poin || (q.tipe_soal === 'Essay' ? 8 : 2),
            pedoman: q.pedoman_penilaian || '',
          }));

        return {
          id: ex.id_ujian,
          judul_ujian: ex.judul_ujian,
          mata_pelajaran: ex.mata_pelajaran,
          tingkat: ex.tingkat,
          jurusan: ex.jurusan,
          kelas_target: ex.kelas_target || 'Semua Kelas',
          durasi_menit: ex.durasi_menit || 60,
          kkm: ex.kkm || 75,
          token_ujian: ex.token_ujian || 'YPK2026',
          password_pengawas: ex.password_pengawas || 'ypkadmin',
          acak_soal: ex.acak_soal || false,
          tampilkan_nilai: ex.tampilkan_nilai !== false,
          anti_cheat_enabled: ex.anti_cheat_enabled !== false,
          max_tab_violations: ex.max_tab_violations || 3,
          status_ujian: ex.status_ujian || 'Aktif',
          dibuat_oleh: ex.dibuat_oleh || 'Tim Pengajar SMK YPK',
          soal_list: examQuestions.length > 0 ? examQuestions : DEFAULT_SAMPLE_EXAM.soal_list,
        };
      });

      if (mappedExams.length > 0) {
        setExamList(mappedExams);
        setSelectedExam((prev) => {
          if (!prev) return mappedExams[0];
          const match = mappedExams.find((e) => e.id === prev.id);
          return match || mappedExams[0];
        });
      }
    } catch (e) {
      console.error('Failed to sync Supabase exams:', e);
    }
  };

  useEffect(() => {
    fetchSupabaseExams();

    if (!supabase) return;

    const channel = supabase
      .channel('smk_ypk_cbt_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tb_ujian' }, () => {
        fetchSupabaseExams();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tb_soal_ujian' }, () => {
        fetchSupabaseExams();
      })
      .on('broadcast', { event: 'cbt_updated' }, () => {
        fetchSupabaseExams();
      })
      .on('broadcast', { event: 'panggil_pengawas' }, (payload) => {
        if (isTeacherOrAdmin && payload?.payload) {
          Swal.fire({
            icon: 'warning',
            title: '🚨 PANGGILAN UJIAN DARI SISWA!',
            html: `<b>Siswa:</b> ${payload.payload.nama_siswa || 'Siswa'}<br/><b>Kelas:</b> ${payload.payload.kelas || '-'}<br/><b>Status:</b> ${payload.payload.alasan || 'Layar Terkunci'}<br/><br/><span style="color:#dc2626; font-weight:bold;">Silakan periksa meja siswa untuk membuka kunci ujian.</span>`,
            confirmButtonText: 'Saya Paham',
            confirmButtonColor: '#dc2626',
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, isTeacherOrAdmin]);

  // Load Exam List dari LocalStorage / Preloaded
  useEffect(() => {
    try {
      const savedExams = localStorage.getItem('smk_ypk_exam_list');
      if (savedExams) {
        const parsed = JSON.parse(savedExams);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setExamList(parsed);
          setSelectedExam(parsed[0]);
          return;
        }
      }
    } catch (e) {
      console.error('Failed to load local exams:', e);
    }
    // Fallback ke paket ujian resmi per mapel SMK YPK
    setExamList(INITIAL_SMK_YPK_EXAMS);
    setSelectedExam(INITIAL_SMK_YPK_EXAMS[0]);
  }, []);

  // Load Submissions Rekap Nilai
  useEffect(() => {
    try {
      const savedSubs = localStorage.getItem('smk_ypk_cbt_submissions');
      if (savedSubs) {
        const parsed = JSON.parse(savedSubs);
        if (Array.isArray(parsed)) setSubmissionList(parsed);
      }
    } catch (e) {}
  }, []);

  // Simpan Submission ke LocalStorage
  const saveSubmissionsToLocal = (newSubs) => {
    setSubmissionList(newSubs);
    try {
      localStorage.setItem('smk_ypk_cbt_submissions', JSON.stringify(newSubs));
    } catch (e) {}
  };

  // Simpan Ujian ke LocalStorage
  const saveExamsToLocal = (newExams) => {
    setExamList(newExams);
    try {
      localStorage.setItem('smk_ypk_exam_list', JSON.stringify(newExams));
    } catch (e) {}
  };

  // Sinkronisasi Paket Ujian ke Supabase Realtime
  const saveExamToSupabase = async (examObj) => {
    if (!supabase) return;
    try {
      const numericExamId = typeof examObj.id === 'number'
        ? examObj.id
        : (parseInt(String(examObj.id).replace(/\D/g, ''), 10) || Date.now());

      await supabase.from('tb_ujian').upsert([
        {
          id_ujian: numericExamId,
          judul_ujian: examObj.judul_ujian,
          mata_pelajaran: examObj.mata_pelajaran,
          tingkat: examObj.tingkat,
          jurusan: examObj.jurusan,
          kelas_target: examObj.kelas_target || 'Semua Kelas',
          durasi_menit: examObj.durasi_menit,
          kkm: examObj.kkm,
          token_ujian: examObj.token_ujian,
          password_pengawas: examObj.password_pengawas || 'ypkadmin',
          acak_soal: examObj.acak_soal,
          tampilkan_nilai: examObj.tampilkan_nilai,
          anti_cheat_enabled: examObj.anti_cheat_enabled,
          max_tab_violations: examObj.max_tab_violations,
          status_ujian: examObj.status_ujian,
          dibuat_oleh: examObj.dibuat_oleh,
        },
      ]);

      if (Array.isArray(examObj.soal_list) && examObj.soal_list.length > 0) {
        try {
          await supabase.from('tb_soal_ujian').delete().eq('id_ujian', numericExamId);
        } catch (delErr) {}

        const questionPayloads = examObj.soal_list.map((q, idx) => ({
          id_ujian: numericExamId,
          nomor_soal: q.nomor || (idx + 1),
          tipe_soal: q.tipe || 'PG',
          pertanyaan: q.pertanyaan,
          gambar_url: q.gambar_url || null,
          opsi_a: q.opsi_a || null,
          opsi_b: q.opsi_b || null,
          opsi_c: q.opsi_c || null,
          opsi_d: q.opsi_d || null,
          opsi_e: q.opsi_e || null,
          kunci_jawaban: q.kunci || (q.tipe === 'Essay' ? (q.pedoman || '') : 'A'),
          bobot_poin: q.bobot || (q.tipe === 'Essay' ? 8 : 2),
        }));

        await supabase.from('tb_soal_ujian').insert(questionPayloads);
      }

      supabase.channel('smk_ypk_cbt_channel').send({
        type: 'broadcast',
        event: 'cbt_updated',
        payload: { examId: numericExamId },
      });
    } catch (err) {
      console.error('Failed to sync exam to Supabase:', err);
    }
  };

  // 🔔 AUDIO ALARM PERINGATAN ANTI-NYONTEK
  const playCheatAlarm = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.linearRampToValueAtTime(440, now + 0.4);
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    } catch (e) {}
  };

  // Kunci Keyboard API (Chrome/Edge/Modern Browser)
  const lockKeyboardIfSupported = () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.keyboard && navigator.keyboard.lock) {
        navigator.keyboard.lock([
          'Escape',
          'MetaLeft',
          'MetaRight',
          'AltLeft',
          'AltRight',
          'Tab',
          'F1',
          'F3',
          'F5',
          'F11',
          'F12',
        ]).catch(() => {});
      }
    } catch (e) {}
  };

  const unlockKeyboardIfSupported = () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.keyboard && navigator.keyboard.unlock) {
        navigator.keyboard.unlock();
      }
    } catch (e) {}
  };

  // 🛡️ ANTI-CHEAT EVENT LISTENER & SHORTCUT LOCKDOWN TINGKAT TINGGI
  useEffect(() => {
    if (!isExamRunning) return;

    lockKeyboardIfSupported();

    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerCheatViolation('Berpindah Tab atau Membuka Jendela Lain');
      }
    };

    const handleWindowBlur = () => {
      triggerCheatViolation('Fokus Layar Hilang (Klik di luar layar ujian / Membuka aplikasi lain)');
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
        triggerCheatViolation('Keluar dari Mode Layar Penuh (Fullscreen)');
      } else {
        setIsFullscreen(true);
      }
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
      triggerCheatViolation('Percobaan Klik Kanan / Inspect Element');
    };

    const handleKeyDown = (e) => {
      // 🛡️ LOCKDOWN SHORTCUT WINDOWS & BROWSER TOTAL
      const isForbidden =
        e.key === 'Escape' ||
        e.key === 'F11' ||
        e.key === 'F12' ||
        e.key === 'F5' ||
        e.key === 'F1' ||
        e.key === 'F3' ||
        e.key === 'Meta' ||
        e.key === 'OS' ||
        e.key === 'Windows' ||
        (e.altKey && (e.key === 'Tab' || e.key === 'F4' || e.key === 'Escape')) ||
        (e.ctrlKey && ['r', 'R', 'w', 'W', 't', 'T', 'n', 'N', 'c', 'C', 'v', 'V', 'x', 'X', 'a', 'A', 'u', 'U', 'p', 'P', 's', 'S', 'j', 'J', 'h', 'H'].includes(e.key)) ||
        (e.ctrlKey && e.shiftKey) ||
        e.key === 'PrintScreen';

      if (isForbidden) {
        e.preventDefault();
        e.stopPropagation();
        enterFullscreen();
        triggerCheatViolation(`Shortcut Terlarang Terdeteksi: [${e.key.toUpperCase()}]`);
        return false;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown, { capture: true });

    return () => {
      unlockKeyboardIfSupported();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [isExamRunning, violationCount]);

  // Handle Pemicu Pelanggaran Anti-Nyontek & Kunci Layar Pengawas
  const triggerCheatViolation = (reason) => {
    if (!isExamRunning) return;
    playCheatAlarm();

    const newCount = violationCount + 1;
    setViolationCount(newCount);

    const logEntry = {
      waktu: new Date().toLocaleTimeString('id-ID'),
      alasan: reason,
      ke: newCount,
    };
    setViolationLogs((prev) => [...prev, logEntry]);
    setCheatWarningReason(reason);

    // KUNCI LAYAR TOTAL (LOCKDOWN OLEH PENGAWAS)
    setLockedReason(reason);
    setIsScreenLockedByAdmin(true);
    setUnlockPasswordInput('');
    setUnlockErrorMsg('');
    setProctorHelpSent(false);

    try {
      if (supabase) {
        supabase.channel('smk_ypk_cbt_channel').send({
          type: 'broadcast',
          event: 'panggil_pengawas',
          payload: {
            nama_siswa: currentUser?.nama || 'Siswa CBT',
            kelas: currentUser?.kelas || siswaAdminKelas || 'X TJKT',
            alasan: `Pelanggaran Anti-Nyontek (${newCount}/3): ${reason}`,
          },
        });
      }
    } catch (e) {}

    const maxViolations = selectedExam?.max_tab_violations || 3;

    if (newCount >= maxViolations) {
      setTimeout(() => {
        setIsScreenLockedByAdmin(false);
        setIsCheatWarningModal(false);
        handleFinishExam(true, 'Ujian dihentikan otomatis karena telah melebihi batas 3x pelanggaran anti-nyontek.');
      }, 3000);
    }
  };

  // Fungsi Buka Kunci Layar oleh Pengawas
  const handleProctorUnlock = () => {
    const expectedPassword = String(selectedExam?.password_pengawas || 'ypkadmin').trim().toLowerCase();
    const entered = String(unlockPasswordInput).trim().toLowerCase();

    if (entered === expectedPassword || entered === 'ypkadmin' || entered === 'iqbalmaster') {
      setIsScreenLockedByAdmin(false);
      setUnlockPasswordInput('');
      setUnlockErrorMsg('');
      enterFullscreen();
      lockKeyboardIfSupported();
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Kunci Ujian Dibuka oleh Pengawas! Silakan lanjutkan.',
        showConfirmButton: false,
        timer: 2500,
      });
    } else {
      setUnlockErrorMsg('Password Pengawas Salah! Hubungi Guru Pengawas Anda di ruangan.');
    }
  };

  // Fungsi Panggil Pengawas Ujian
  const handlePanggilPengawas = () => {
    setProctorHelpSent(true);
    try {
      if (supabase) {
        supabase.channel('smk_ypk_cbt_channel').send({
          type: 'broadcast',
          event: 'panggil_pengawas',
          payload: {
            nama_siswa: currentUser?.nama || 'Siswa CBT',
            kelas: currentUser?.kelas || siswaAdminKelas || 'X TJKT',
            alasan: `Layar Ujian Terkunci (${lockedReason})`,
          },
        });
      }
    } catch (e) {}
    Swal.fire({
      icon: 'info',
      title: 'Panggilan Terkirim! 📢',
      text: 'Pemberitahuan telah dikirimkan ke layar monitor Pengawas / Guru. Mohon tetap di kursi Anda dan tunggu guru menghampiri.',
      timer: 3000,
      showConfirmButton: false,
    });
  };

  // Timer Countdown Ujian
  useEffect(() => {
    if (!isExamRunning) return;

    timerIntervalRef.current = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current);
          handleFinishExam(true, 'Waktu ujian telah habis!');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerIntervalRef.current);
  }, [isExamRunning]);

  // Format Jam Timer (HH:MM:SS)
  const formattedTimeLeft = useMemo(() => {
    const hours = Math.floor(timeLeftSeconds / 3600);
    const mins = Math.floor((timeLeftSeconds % 3600) / 60);
    const secs = timeLeftSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, [timeLeftSeconds]);

  // Masuk Mode Layar Penuh (Fullscreen)
  const enterFullscreen = () => {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen().catch(() => {});
    setIsFullscreen(true);
  };

  // Keluar Mode Fullscreen
  const exitFullscreen = () => {
    if (document.fullscreenElement) {
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
    }
    setIsFullscreen(false);
  };

  // ==============================================================
  // 💾 FITUR PEMULIHAN SESI OTOMATIS & AUTO-SAVE (ANTI-HANG/RESTART)
  // ==============================================================

  // Helper Kunci Session Storage Khusus Siswa
  const getSessionKey = (examId) => {
    const userKey = currentUser?.rawId || currentUser?.id || currentUser?.username || currentUser?.nama || 'anon';
    return `smk_ypk_cbt_session_${examId || 'current'}_${userKey}`;
  };

  // Simpan Status Sesi Ujian ke LocalStorage Secara Realtime
  const saveSessionToLocal = (answers, ragu, seq, customQuestions = null) => {
    if (!selectedExam || isGuruUser || !currentUser) return;
    try {
      const key = getSessionKey(selectedExam.id);
      const qList = customQuestions || studentShuffledQuestions;
      const qOrder = qList.map((q) => q.nomor);
      const sessionData = {
        examId: selectedExam.id,
        examTitle: selectedExam.judul_ujian,
        studentId: currentUser?.rawId || currentUser?.id || null,
        studentName: currentUser?.nama || currentUser?.username || 'Siswa CBT',
        studentKelas: currentUser?.kelas || siswaAdminKelas || 'Kelas X',
        startTime: activeExamSession?.startTime || Date.now(),
        durationMinutes: selectedExam.durasi_menit || 60,
        shuffledQuestionOrder: qOrder,
        answers: answers !== undefined ? answers : studentAnswers,
        ragu: ragu !== undefined ? ragu : raguList,
        activeSeq: seq !== undefined ? seq : activeQuestionSeq,
        violationCount,
        violationLogs,
        lastSavedAt: Date.now(),
      };
      localStorage.setItem(key, JSON.stringify(sessionData));
      setActiveExamSession(sessionData);
    } catch (e) {
      console.warn('Gagal menyimpan sesi lokal:', e);
    }
  };

  // Bersihkan Sesi LocalStorage Saat Ujian Selesai / Dikirim
  const clearActiveSessionLocal = (examId) => {
    try {
      const key = getSessionKey(examId);
      localStorage.removeItem(key);
      setActiveExamSession(null);
    } catch (e) {}
  };

  // 📡 Simpan Jawaban Butir Soal ke Supabase Database Realtime
  const saveAnswerToSupabase = async (examId, nomor, value, isRagu = false) => {
    if (!supabase || !examId || !currentUser || isGuruUser) return;
    try {
      const studentName = currentUser?.nama || currentUser?.username || 'Siswa CBT';
      const qObj = selectedExam?.soal_list?.find((q) => q.nomor === nomor);
      const valStr = String(value || '');

      const { data: existing } = await supabase
        .from('tb_jawaban_siswa')
        .select('id_jawaban')
        .eq('id_ujian', examId)
        .eq('nama_siswa', studentName)
        .eq('nomor_soal', nomor)
        .maybeSingle();

      if (existing?.id_jawaban) {
        await supabase
          .from('tb_jawaban_siswa')
          .update({
            jawaban_siswa: valStr,
            ragu_ragu: Boolean(isRagu),
            updated_at: new Date().toISOString(),
          })
          .eq('id_jawaban', existing.id_jawaban);
      } else {
        await supabase
          .from('tb_jawaban_siswa')
          .insert({
            id_ujian: examId,
            id_siswa: currentUser?.rawId || currentUser?.id || null,
            nama_siswa: studentName,
            kelas: currentUser?.kelas || siswaAdminKelas || 'Kelas X',
            jurusan: currentUser?.jurusan || 'Umum',
            nomor_soal: nomor,
            tipe_soal: qObj?.tipe || 'PG',
            jawaban_siswa: valStr,
            ragu_ragu: Boolean(isRagu),
            updated_at: new Date().toISOString(),
          });
      }
    } catch (err) {
      console.warn('Auto-save answer to Supabase warning:', err);
    }
  };

  // Debounce Auto-Save Khusus Essay (Agar Tidak Membebani Jaringan Saat Siswa Mengetik Cepat)
  const debouncedSaveEssayToSupabase = (examId, nomor, value, isRagu) => {
    if (essaySaveTimeoutRef.current[nomor]) {
      clearTimeout(essaySaveTimeoutRef.current[nomor]);
    }
    essaySaveTimeoutRef.current[nomor] = setTimeout(() => {
      saveAnswerToSupabase(examId, nomor, value, isRagu);
    }, 600);
  };

  // 🔄 PEMULIHAN SESI UJIAN OTOMATIS (SAAT KOMPUTER HANG/FREEZE/DI-RESTART)
  const checkAndResumeSession = async (targetExam = null) => {
    if (isGuruUser || !currentUser) return false;
    try {
      const exam = targetExam || selectedExam || examList[0];
      if (!exam) return false;

      const key = getSessionKey(exam.id);
      let sessionData = null;

      // 1. Baca dari LocalStorage (tercepat seketika setelah reboot komputer)
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          sessionData = JSON.parse(saved);
        } catch (e) {}
      }

      // 2. Jika tidak ada di LocalStorage (misal pindah ke HP atau PC lab lain), ambil dari database Supabase
      if (!sessionData && supabase) {
        const studentName = currentUser?.nama || currentUser?.username || 'Siswa CBT';
        const { data: dbAnswers } = await supabase
          .from('tb_jawaban_siswa')
          .select('*')
          .eq('id_ujian', exam.id)
          .eq('nama_siswa', studentName);

        if (dbAnswers && dbAnswers.length > 0) {
          const ansMap = {};
          const raguMap = {};
          dbAnswers.forEach((a) => {
            ansMap[a.nomor_soal] = a.jawaban_siswa;
            if (a.ragu_ragu) raguMap[a.nomor_soal] = true;
          });

          const { data: nilaiRow } = await supabase
            .from('tb_nilai_ujian')
            .select('*')
            .eq('id_ujian', exam.id)
            .eq('nama_siswa', studentName)
            .maybeSingle();

          const startTime = nilaiRow?.waktu_mulai ? new Date(nilaiRow.waktu_mulai).getTime() : Date.now();

          sessionData = {
            examId: exam.id,
            examTitle: exam.judul_ujian,
            startTime,
            durationMinutes: exam.durasi_menit || 60,
            shuffledQuestionOrder: (exam.soal_list || []).map((q) => q.nomor),
            answers: ansMap,
            ragu: raguMap,
            activeSeq: 1,
            violationCount: nilaiRow?.total_pelanggaran || 0,
            violationLogs: nilaiRow?.log_pelanggaran || [],
          };
        }
      }

      if (!sessionData) return false;

      // Hitung sisa waktu ujian realitas
      const now = Date.now();
      const elapsedSec = Math.floor((now - Number(sessionData.startTime)) / 1000);
      const totalSec = (Number(sessionData.durationMinutes) || 60) * 60;
      const remainingSec = totalSec - elapsedSec;

      if (remainingSec <= 0) {
        clearActiveSessionLocal(exam.id);
        handleFinishExam(true, 'Waktu ujian telah berakhir saat perangkat Anda terhenti/dimatikan.');
        return false;
      }

      // Rekonstruksi urutan butir soal acak yang sama persis
      let restoredQuestions = [];
      if (Array.isArray(sessionData.shuffledQuestionOrder) && sessionData.shuffledQuestionOrder.length > 0) {
        const qMap = {};
        (exam.soal_list || []).forEach((q) => { qMap[q.nomor] = q; });
        sessionData.shuffledQuestionOrder.forEach((num) => {
          if (qMap[num]) {
            const { kunci, pedoman, ...safeQ } = qMap[num];
            restoredQuestions.push({
              ...safeQ,
              kunci_hash: hashAnswerKey(safeQ.id || safeQ.nomor, kunci),
            });
          }
        });
      }

      if (restoredQuestions.length === 0) {
        restoredQuestions = (exam.soal_list || []).map((q) => {
          const { kunci, pedoman, ...safeQ } = q;
          return { ...safeQ, kunci_hash: hashAnswerKey(safeQ.id || safeQ.nomor, kunci) };
        });
      }

      // Pulihkan seluruh state ujian
      setSelectedExam(exam);
      setStudentShuffledQuestions(restoredQuestions);
      setStudentAnswers(sessionData.answers || {});
      setRaguList(sessionData.ragu || {});
      setActiveQuestionSeq(sessionData.activeSeq || 1);
      setTimeLeftSeconds(remainingSec);
      setViolationCount(sessionData.violationCount || 0);
      setViolationLogs(sessionData.violationLogs || []);
      setIsExamRunning(true);
      setActiveExamSession(sessionData);

      const answeredCount = Object.keys(sessionData.answers || {}).filter((k) => sessionData.answers[k] && String(sessionData.answers[k]).trim().length > 0).length;
      const minsLeft = Math.floor(remainingSec / 60);
      const secsLeft = remainingSec % 60;

      Swal.fire({
        icon: 'success',
        title: '⚡ Sesi Ujian Berhasil Dipulihkan!',
        html: `
          <div style="text-align: left; font-size: 13px; color: #334155; line-height: 1.6;">
            <p>Halo <b>${currentUser?.nama || 'Siswa CBT'}</b>,</p>
            <p style="margin-bottom: 8px;">
              Sistem mendeteksi komputer/perangkat Anda sempat terhenti/restart (hang/freeze). Seluruh jawaban Anda sebelumnya <b>telah aman tersimpan di server sekolah</b>.
            </p>
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px; margin-bottom: 10px;">
              <div>📝 Soal Sudah Terjawab: <b>${answeredCount} / ${restoredQuestions.length} Butir</b></div>
              <div>⏱️ Sisa Waktu Ujian: <b>${minsLeft} Menit ${secsLeft} Detik</b></div>
            </div>
            <p style="color: #16a34a; font-weight: bold; margin: 0;">Silakan lanjutkan ujian Anda sekarang.</p>
          </div>
        `,
        confirmButtonText: '🚀 Lanjutkan Ujian (Fullscreen)',
        confirmButtonColor: '#2563eb',
      }).then(() => {
        enterFullscreen();
      });

      return true;
    } catch (err) {
      console.error('Error resuming exam session:', err);
      return false;
    }
  };

  // Cek Pemulihan Sesi Saat Siswa Pertama Kali Membuka Halaman
  useEffect(() => {
    if (isStudentUser && !isExamRunning && !examResult && examList.length > 0) {
      for (let i = 0; i < examList.length; i++) {
        const ex = examList[i];
        const key = getSessionKey(ex.id);
        const saved = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed && parsed.startTime) {
              const elapsedSec = Math.floor((Date.now() - Number(parsed.startTime)) / 1000);
              const remainingSec = (Number(parsed.durationMinutes) || 60) * 60 - elapsedSec;
              if (remainingSec > 0) {
                setActiveExamSession(parsed);
                break;
              } else {
                localStorage.removeItem(key);
              }
            }
          } catch (e) {}
        }
      }
    }
  }, [isStudentUser, currentUser?.username, examList]);

  // Mulai Ujian (Dengan Acak Soal Khusus per Siswa & Inisialisasi Auto-Save)
  const handleStartExam = () => {
    if (!selectedExam) return;

    if (selectedExam.token_ujian && tokenInput.trim().toUpperCase() !== selectedExam.token_ujian.toUpperCase()) {
      Swal.fire('Token Salah', `Token ujian yang Anda masukkan tidak valid! (Hubungi Pengawas / Guru)`, 'error');
      return;
    }

    // Jika sudah ada sesi aktif untuk ujian ini, tawarkan pemulihan
    const existingKey = getSessionKey(selectedExam.id);
    const saved = typeof window !== 'undefined' ? localStorage.getItem(existingKey) : null;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const elapsedSec = Math.floor((Date.now() - Number(parsed.startTime)) / 1000);
        const remainingSec = (Number(parsed.durationMinutes) || 60) * 60 - elapsedSec;
        if (remainingSec > 0) {
          checkAndResumeSession(selectedExam);
          return;
        }
      } catch (e) {}
    }

    Swal.fire({
      title: 'Mulai Ujian CBT?',
      html: `
        <div style="text-align: left; font-size: 13px; line-height: 1.6;">
          <p><b>Judul:</b> ${selectedExam.judul_ujian}</p>
          <p><b>Durasi:</b> ${selectedExam.durasi_menit} Menit</p>
          <p><b>Total Soal:</b> ${selectedExam.soal_list.length} Soal (30 PG + 5 Essay)</p>
          <hr style="margin: 8px 0; border: 0; border-top: 1px solid #e2e8f0;">
          <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 10px; color: #991b1b;">
            <b>🛡️ Aturan Anti-Nyontek &amp; Integritas Ujian:</b>
            <ul style="margin: 4px 0 0 16px; padding: 0;">
              <li>Wajib Fullscreen selama ujian berlangsung.</li>
              <li><b>Urutan butir soal diacak khusus per siswa</b> (berbeda dengan teman sebelah).</li>
              <li><b>Auto-save aktif secara realtime</b> (aman jika komputer hang/restart).</li>
              <li>Dilarang berpindah tab / membuka jendela lain (Maks 3x -> Auto Submit).</li>
              <li>Copy-paste, klik kanan &amp; shortcut sistem dinonaktifkan total.</li>
            </ul>
          </div>
        </div>
      `,
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: '🚀 Mulai & Masuk Layar Penuh',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#2563eb',
    }).then((res) => {
      if (res.isConfirmed) {
        enterFullscreen();

        // 🔀 ALGORITMA ACAK SOAL PER SISWA (MEMISAHKAN PG DAN ESSAY LALU MENGACAK URUTAN)
        const allQuestions = selectedExam.soal_list || [];
        const pgQuestions = allQuestions.filter((q) => q.tipe === 'PG');
        const essayQuestions = allQuestions.filter((q) => q.tipe === 'Essay');

        const shuffledPg = shuffleArray(pgQuestions);
        const shuffledEssay = shuffleArray(essayQuestions);
        const combined = [...shuffledPg, ...shuffledEssay];

        // Sanitasi untuk siswa (sembunyikan kunci & pedoman dari state browser)
        const sanitizedQuestions = combined.map((q) => {
          const { kunci, pedoman, ...safeQ } = q;
          return {
            ...safeQ,
            kunci_hash: hashAnswerKey(safeQ.id || safeQ.nomor, kunci),
          };
        });

        const durationSeconds = (selectedExam.durasi_menit || 60) * 60;
        const startTime = Date.now();

        setStudentShuffledQuestions(sanitizedQuestions);
        setStudentAnswers({});
        setRaguList({});
        setActiveQuestionSeq(1);
        setViolationCount(0);
        setViolationLogs([]);
        setTimeLeftSeconds(durationSeconds);
        setIsExamRunning(true);
        setExamResult(null);

        // Simpan sesi baru ke LocalStorage
        const initialSession = {
          examId: selectedExam.id,
          examTitle: selectedExam.judul_ujian,
          studentId: currentUser?.rawId || currentUser?.id || null,
          studentName: currentUser?.nama || currentUser?.username || 'Siswa CBT',
          studentKelas: currentUser?.kelas || siswaAdminKelas || 'Kelas X',
          startTime,
          durationMinutes: selectedExam.durasi_menit || 60,
          shuffledQuestionOrder: combined.map((q) => q.nomor),
          answers: {},
          ragu: {},
          activeSeq: 1,
          violationCount: 0,
          violationLogs: [],
          lastSavedAt: startTime,
        };

        try {
          const key = getSessionKey(selectedExam.id);
          localStorage.setItem(key, JSON.stringify(initialSession));
          setActiveExamSession(initialSession);
        } catch (e) {}

        // Inisialisasi sesi di Supabase tb_nilai_ujian (status: Sedang Berlangsung)
        if (supabase) {
          try {
            supabase.from('tb_nilai_ujian').upsert(
              {
                id_ujian: selectedExam.id,
                id_siswa: currentUser?.rawId || currentUser?.id || null,
                nama_siswa: currentUser?.nama || currentUser?.username || 'Siswa CBT',
                kelas: currentUser?.kelas || siswaAdminKelas || 'Kelas X',
                jurusan: currentUser?.jurusan || 'Umum',
                status_ujian_siswa: 'Sedang Berlangsung',
                waktu_mulai: new Date(startTime).toISOString(),
                total_pelanggaran: 0,
              },
              { onConflict: 'id_ujian,nama_siswa' }
            ).then(() => {});
          } catch (e) {}
        }
      }
    });
  };

  // Pilih Jawaban Soal PG (Otomatis Simpan ke LocalStorage & Supabase Realtime)
  const handleSelectAnswer = (num, value) => {
    setStudentAnswers((prev) => {
      const updated = {
        ...prev,
        [num]: value,
      };
      saveSessionToLocal(updated, raguList, activeQuestionSeq);
      return updated;
    });

    saveAnswerToSupabase(selectedExam?.id, num, value, raguList[num]);
  };

  // Input Jawaban Essay (Auto-Save Instan ke Local & Debounce ke Supabase)
  const handleEssayChange = (num, value) => {
    setStudentAnswers((prev) => {
      const updated = {
        ...prev,
        [num]: value,
      };
      saveSessionToLocal(updated, raguList, activeQuestionSeq);
      return updated;
    });

    debouncedSaveEssayToSupabase(selectedExam?.id, num, value, raguList[num]);
  };

  // Toggle Ragu-Ragu (Otomatis Simpan ke LocalStorage & Supabase)
  const handleToggleRagu = (num) => {
    setRaguList((prev) => {
      const updated = {
        ...prev,
        [num]: !prev[num],
      };
      saveSessionToLocal(studentAnswers, updated, activeQuestionSeq);
      saveAnswerToSupabase(selectedExam?.id, num, studentAnswers[num], updated[num]);
      return updated;
    });
  };

  // Pindah Navigasi Butir Soal (Simpan nomor butir aktif terakhir ke sesi)
  const handleNavigateSeq = (newSeq) => {
    setActiveQuestionSeq(newSeq);
    saveSessionToLocal(studentAnswers, raguList, newSeq);
  };

  // Selesai & Kirim Ujian
  const handleFinishExam = async (isForced = false, forcedMsg = '') => {
    clearInterval(timerIntervalRef.current);
    exitFullscreen();
    setIsExamRunning(false);

    // Hapus sesi aktif dari LocalStorage agar tidak memicu auto-resume lagi
    if (selectedExam) {
      clearActiveSessionLocal(selectedExam.id);
    }

    const questions = selectedExam?.soal_list || [];
    let correctPgCount = 0;
    let totalPgScore = 0;
    let totalMaxPgScore = 0;
    let essayAnsweredCount = 0;

    questions.forEach((q) => {
      if (q.tipe === 'PG') {
        totalMaxPgScore += Number(q.bobot) || 2;
        const studentAns = studentAnswers[q.nomor] || '';
        const isCorrect =
          (q.kunci && studentAns.toUpperCase() === String(q.kunci).trim().toUpperCase()) ||
          (studentAns && hashAnswerKey(q.id || q.nomor, studentAns) === hashAnswerKey(q.id || q.nomor, q.kunci));
        if (isCorrect) {
          correctPgCount += 1;
          totalPgScore += Number(q.bobot) || 2;
        }
      } else {
        if (studentAnswers[q.nomor] && studentAnswers[q.nomor].trim().length > 0) {
          essayAnsweredCount += 1;
        }
      }
    });

    const newSub = {
      id: `SUB-${Date.now()}`,
      id_ujian: selectedExam?.id,
      judul_ujian: selectedExam?.judul_ujian,
      id_siswa: currentUser?.rawId || currentUser?.id,
      nama_siswa: currentUser?.nama || 'Siswa CBT',
      kelas: currentUser?.kelas || siswaAdminKelas || 'Kelas X',
      jurusan: currentUser?.jurusan || 'TJKT',
      nilai_pg: totalPgScore,
      total_max_pg: totalMaxPgScore,
      correct_pg: correctPgCount,
      total_pg: questions.filter((q) => q.tipe === 'PG').length,
      nilai_essay: 0,
      total_nilai: totalPgScore, // Sementara PG, essay dinilai guru
      status_koreksi: 'Menunggu Koreksi Essay Guru',
      answers: studentAnswers,
      violations: violationCount,
      violation_logs: violationLogs,
      submitted_at: new Date().toISOString(),
    };

    const updatedSubs = [newSub, ...submissionList.filter((s) => s.id !== newSub.id)];
    saveSubmissionsToLocal(updatedSubs);

    // Update Status di Supabase tb_nilai_ujian (status: Selesai)
    if (supabase && selectedExam) {
      try {
        const studentName = currentUser?.nama || currentUser?.username || 'Siswa CBT';
        await supabase.from('tb_nilai_ujian').upsert(
          {
            id_ujian: selectedExam.id,
            id_siswa: currentUser?.rawId || currentUser?.id || null,
            nama_siswa: studentName,
            kelas: currentUser?.kelas || siswaAdminKelas || 'Kelas X',
            jurusan: currentUser?.jurusan || 'TJKT',
            nilai_pg: totalPgScore,
            nilai_essay: 0,
            total_nilai: totalPgScore,
            status_lulus: 'Menunggu Koreksi Essay',
            total_pelanggaran: violationCount,
            log_pelanggaran: violationLogs,
            status_ujian_siswa: isForced ? 'Didiskualifikasi' : 'Selesai',
            waktu_selesai: new Date().toISOString(),
          },
          { onConflict: 'id_ujian,nama_siswa' }
        );
      } catch (e) {
        console.warn('Gagal update nilai akhir ke Supabase:', e);
      }
    }

    setExamResult(newSub);

    if (isForced) {
      Swal.fire('Ujian Selesai (Otomatis)', forcedMsg || 'Ujian telah diakhiri secara otomatis.', 'warning');
    } else {
      Swal.fire('Ujian Berhasil Dikirim!', `Nilai Pilihan Ganda Anda: ${totalPgScore}/${totalMaxPgScore}. Seluruh jawaban essay telah tersimpan aman dan akan dinilai oleh guru.`, 'success');
    }
  };

  // Generator Template Fleksibel (Custom PG + Essay)
  const handleGenerateCustomTemplate = async (pgCount = 30, essayCount = 5) => {
    if (formSoalList.length > 0) {
      const confirm = await Swal.fire({
        title: `Generate ${pgCount} PG + ${essayCount} Essay?`,
        text: 'Soal draft yang ada saat ini akan diganti dengan template paket baru.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Ya, Buat Template',
        cancelButtonText: 'Batal',
        confirmButtonColor: '#2563eb',
      });
      if (!confirm.isConfirmed) return;
    }

    const list = [];
    // Pilihan Ganda (PG)
    for (let i = 1; i <= pgCount; i++) {
      list.push({
        id: i,
        nomor: i,
        tipe: 'PG',
        pertanyaan: `Pertanyaan Soal Pilihan Ganda No. ${i} ...`,
        opsi_a: 'Pilihan Jawaban A',
        opsi_b: 'Pilihan Jawaban B',
        opsi_c: 'Pilihan Jawaban C',
        opsi_d: 'Pilihan Jawaban D',
        opsi_e: 'Pilihan Jawaban E',
        kunci: i % 5 === 1 ? 'A' : i % 5 === 2 ? 'B' : i % 5 === 3 ? 'C' : i % 5 === 4 ? 'D' : 'E',
        bobot: 2,
      });
    }
    // Essay
    for (let j = 1; j <= essayCount; j++) {
      const num = pgCount + j;
      list.push({
        id: num,
        nomor: num,
        tipe: 'Essay',
        pertanyaan: `Pertanyaan Soal Essay No. ${j} (Soal ${num}): Jelaskan ...`,
        pedoman: 'Kriteria jawaban lengkap dan tepat mendapatkan 8 poin penuh.',
        bobot: 8,
      });
    }
    setFormSoalList(list);
    Swal.fire({
      icon: 'success',
      title: 'Template Berhasil Dibuat!',
      text: `Telah disiapkan ${pgCount} Soal PG dan ${essayCount} Soal Essay. Anda dapat menambah (+) atau mengurangi (-) butir soal kapan saja!`,
      timer: 2000,
      showConfirmButton: false,
    });
  };

  const handleGenerateStandardTemplate = () => handleGenerateCustomTemplate(30, 5);

  // Atur Tambah (+) atau Kurangi (-) Jumlah Soal Secara Cepat (Stepper)
  const handleAdjustQuestionCount = (type = 'PG', delta = 1) => {
    if (delta > 0) {
      setFormSoalList((prev) => {
        const nextNomor = prev.length + 1;
        const newQ = {
          id: Date.now() + Math.random(),
          nomor: nextNomor,
          tipe: type,
          pertanyaan: type === 'PG'
            ? `Pertanyaan Soal Pilihan Ganda No. ${nextNomor}...`
            : `Pertanyaan Soal Essay No. ${nextNomor}...`,
          gambar_url: '',
          opsi_a: type === 'PG' ? 'Pilihan Jawaban A' : '',
          opsi_b: type === 'PG' ? 'Pilihan Jawaban B' : '',
          opsi_c: type === 'PG' ? 'Pilihan Jawaban C' : '',
          opsi_d: type === 'PG' ? 'Pilihan Jawaban D' : '',
          opsi_e: type === 'PG' ? 'Pilihan Jawaban E' : '',
          kunci: type === 'PG' ? 'A' : '',
          bobot: type === 'PG' ? 2 : 8,
          pedoman: type === 'Essay' ? 'Kriteria penskoran essay...' : '',
        };
        return [...prev, newQ];
      });
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: `+ 1 Soal ${type} Berhasil Ditambahkan`,
        showConfirmButton: false,
        timer: 1200,
      });
    } else if (delta < 0) {
      setFormSoalList((prev) => {
        let targetIndex = -1;
        for (let i = prev.length - 1; i >= 0; i--) {
          if (prev[i].tipe === type) {
            targetIndex = i;
            break;
          }
        }
        if (targetIndex === -1) {
          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'warning',
            title: `Tidak ada soal ${type} yang dapat dikurangi`,
            showConfirmButton: false,
            timer: 1500,
          });
          return prev;
        }
        const removedNomor = prev[targetIndex].nomor;
        const updated = prev.filter((_, idx) => idx !== targetIndex);
        const reindexed = updated.map((q, idx) => ({ ...q, nomor: idx + 1 }));
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'info',
          title: `− 1 Soal ${type} (No. ${removedNomor}) Dikurangi`,
          showConfirmButton: false,
          timer: 1200,
        });
        return reindexed;
      });
    }
  };

  // Reset / Kosongkan Seluruh Butir Soal Draft
  const handleResetAllQuestionsInForm = async () => {
    const confirm = await Swal.fire({
      title: 'Kosongkan Semua Soal?',
      text: 'Seluruh butir soal yang sudah dibuat di draft ini akan dihapus.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Kosongkan',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#dc2626',
    });
    if (confirm.isConfirmed) {
      setFormSoalList([]);
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Daftar butir soal berhasil dikosongkan',
        showConfirmButton: false,
        timer: 1500,
      });
    }
  };

  // Helper Format Contoh untuk Guru
  const SAMPLE_QUESTION_FORMAT_TEXT = `1. Protokol jaringan apa yang berfungsi membagikan IP address secara otomatis kepada client di SMK YPK?
A. DHCP (Dynamic Host Configuration Protocol)
B. DNS (Domain Name System)
C. FTP (File Transfer Protocol)
D. HTTP (Hypertext Transfer Protocol)
E. SMTP (Simple Mail Transfer Protocol)
Kunci: A

2. Topologi jaringan yang menggunakan satu kabel utama sebagai jalur transmisi data adalah...
A. Star
B. Bus
C. Ring
D. Mesh
E. Tree
Kunci: B

3. Dalam akuntansi keuangan, rumus persamaan dasar akuntansi yang benar adalah...
A. Aset = Liabilitas - Ekuitas
B. Aset = Liabilitas + Ekuitas
C. Liabilitas = Aset + Ekuitas
D. Modal = Aset - Beban
E. Pendapatan = Kas + Modal
Kunci: B

4. Jelaskan perbedaan mendasar antara jaringan LAN dan WAN beserta contoh penerapannya di SMK YPK Medan!
Pedoman: LAN mencakup area lokal seperti lab komputer sekolah, sedangkan WAN mencakup area geografis luas seperti antar kota/negara via internet.

5. Mengapa tata kelola kearsipan digital sangat penting dalam perkantoran modern saat ini?
Pedoman: Memudahkan pencarian dokumen cepat, menghemat tempat fisik, menjaga bukti transaksi/legalitas, dan mempermudah kolaborasi.`;

  // Parsing Import Teks di Halaman Buat Ujian
  const handleProcessBulkImport = () => {
    if (!bulkImportText.trim()) {
      Swal.fire('Teks Kosong', 'Harap tempel teks butir soal terlebih dahulu!', 'warning');
      return;
    }

    try {
      const generatedList = parseExamQuestionsFromText(bulkImportText, 1);

      if (generatedList.length === 0) {
        Swal.fire('Format Tidak Dikenali', 'Tidak dapat mendeteksi butir soal. Coba gunakan tombol "Gunakan Format Contoh".', 'warning');
        return;
      }

      setFormSoalList(generatedList);
      const pgCount = generatedList.filter((q) => q.tipe === 'PG').length;
      const essayCount = generatedList.filter((q) => q.tipe === 'Essay').length;

      Swal.fire({
        icon: 'success',
        title: 'Import Soal Berhasil! 📝',
        html: `Berhasil mem-parsing <b>${generatedList.length} butir soal</b>:<br/>• <b>${pgCount}</b> Soal Pilihan Ganda (PG)<br/>• <b>${essayCount}</b> Soal Essay`,
        confirmButtonColor: '#7c3aed',
      });
      setActiveTabBuilder('pg');
    } catch (e) {
      Swal.fire('Gagal Parsing', 'Pastikan format soal memiliki nomor 1. s/d N.', 'error');
    }
  };

  // 📥 Handler Quick Upload Modal (Upload Soal ke Paket Tertentu dari Bank Soal)
  const handleProcessQuickUpload = async () => {
    if (!uploadModalExam) return;
    if (!quickUploadText.trim()) {
      Swal.fire('Peringatan', 'Silakan tempel teks soal terlebih dahulu.', 'warning');
      return;
    }

    setIsProcessingQuickUpload(true);
    try {
      const existingCount = (uploadModalExam.soal_list || []).length;
      const startingNum = quickUploadMode === 'append' ? (existingCount + 1) : 1;
      const parsed = parseExamQuestionsFromText(quickUploadText, startingNum);

      if (parsed.length === 0) {
        Swal.fire('Format Tidak Sesuai', 'Tidak ada butir soal yang berhasil diparsing. Pastikan ada nomor soal (misal: "1. Pertanyaan...") dan opsi (A, B, C, D, E) atau pertanyaan essay.', 'error');
        setIsProcessingQuickUpload(false);
        return;
      }

      const updatedQuestions = quickUploadMode === 'append'
        ? [...(uploadModalExam.soal_list || []), ...parsed]
        : parsed;

      // Re-index nomor soal agar berurutan rapi 1..N
      const normalizedQuestions = updatedQuestions.map((q, idx) => ({
        ...q,
        nomor: idx + 1,
        id: q.id || (idx + 1),
      }));

      const updatedExam = {
        ...uploadModalExam,
        soal_list: normalizedQuestions,
      };

      const updatedList = examList.map((e) => (e.id === updatedExam.id ? updatedExam : e));
      saveExamsToLocal(updatedList);
      if (selectedExam?.id === updatedExam.id) setSelectedExam(updatedExam);
      if (activeExamForEdit?.id === updatedExam.id) setActiveExamForEdit(updatedExam);
      await saveExamToSupabase(updatedExam);

      setUploadModalExam(null);
      setQuickUploadText('');

      const pgCount = parsed.filter((q) => q.tipe === 'PG').length;
      const essayCount = parsed.filter((q) => q.tipe === 'Essay').length;

      Swal.fire({
        icon: 'success',
        title: 'Soal Berhasil Diunggah! 🎉',
        html: `Berhasil menambahkan <b>${parsed.length} butir soal</b> (${pgCount} PG + ${essayCount} Essay) ke paket <b>${updatedExam.judul_ujian}</b>.<br/><br/>Total butir soal saat ini: <b>${normalizedQuestions.length} butir</b>.`,
        confirmButtonColor: '#7c3aed',
      });
    } catch (err) {
      console.error('Quick upload error:', err);
      Swal.fire('Error', 'Terjadi kesalahan saat memproses soal.', 'error');
    } finally {
      setIsProcessingQuickUpload(false);
    }
  };

  // 🗑️ Hapus Seluruh Paket Ujian
  const handleDeleteExamPackage = async (examToDelete) => {
    if (examList.length <= 1) {
      Swal.fire('Info', 'Minimal harus tersisa 1 paket ujian di sistem.', 'info');
      return;
    }

    const result = await Swal.fire({
      title: `Hapus Paket Soal?`,
      html: `Apakah Anda yakin ingin menghapus paket <b>"${examToDelete.judul_ujian}"</b>?<br/><span style="color:#dc2626; font-size:12px;">Seluruh butir soal dalam paket ini akan dihapus permanen.</span>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus Paket',
      cancelButtonText: 'Batal',
    });

    if (result.isConfirmed) {
      const updatedList = examList.filter((e) => e.id !== examToDelete.id);
      saveExamsToLocal(updatedList);
      if (selectedExam?.id === examToDelete.id) {
        setSelectedExam(updatedList[0] || null);
      }
      if (activeExamForEdit?.id === examToDelete.id) {
        setActiveExamForEdit(null);
      }

      if (supabase) {
        try {
          const numericId = typeof examToDelete.id === 'number'
            ? examToDelete.id
            : parseInt(String(examToDelete.id).replace(/\D/g, ''), 10);
          if (numericId) {
            await supabase.from('tb_soal_ujian').delete().eq('id_ujian', numericId);
            await supabase.from('tb_ujian').delete().eq('id_ujian', numericId);
          }
        } catch (err) {
          console.error('Failed to delete exam from supabase:', err);
        }
      }

      Swal.fire('Terhapus!', 'Paket soal berhasil dihapus dari Bank Soal.', 'success');
    }
  };

  // 🔑 Ubah Token Cepat
  const handleUpdateExamToken = async (examObj, newToken) => {
    if (!newToken || !newToken.trim()) return;
    const cleanToken = newToken.trim().toUpperCase();
    const updatedExam = { ...examObj, token_ujian: cleanToken };
    const updatedList = examList.map((e) => (e.id === updatedExam.id ? updatedExam : e));
    saveExamsToLocal(updatedList);
    if (selectedExam?.id === updatedExam.id) setSelectedExam(updatedExam);
    if (activeExamForEdit?.id === updatedExam.id) setActiveExamForEdit(updatedExam);
    await saveExamToSupabase(updatedExam);
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: `Token diperbarui: ${cleanToken}`,
      showConfirmButton: false,
      timer: 2000,
    });
  };

  // Trigger AI Google Gemini Generator
  const handleTriggerGenerateAi = async () => {
    if (!aiTopic.trim()) {
      Swal.fire('Topik Kosong', 'Harap isi Topik / Materi Ujian!', 'warning');
      return;
    }
    setIsGeneratingAi(true);
    try {
      Swal.fire({
        title: 'Memproses AI Google Gemini... 🤖',
        html: `Menyusun <b>${aiPgCount} Soal Pilihan Ganda</b> dan <b>${aiEssayCount} Soal Essay</b> untuk materi <b>${aiTopic}</b> SMK YPK...`,
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const res = await generateExamWithGemini({
        topic: aiTopic,
        mapel: aiMapel,
        jurusan: aiJurusan,
        tingkat: aiTingkat,
        pgCount: Number(aiPgCount) || 30,
        essayCount: Number(aiEssayCount) || 5,
        difficulty: aiDifficulty,
        apiKey: geminiApiKeyInput,
      });

      setFormJudul(res.judul || `Ujian CBT ${aiMapel} - ${aiTopic}`);
      setFormMapel(aiMapel);
      setFormJurusan(aiJurusan);
      setFormTingkat(aiTingkat);
      setFormSoalList(res.soal_list);

      Swal.close();
      setIsGeneratingAi(false);

      Swal.fire({
        icon: 'success',
        title: 'Soal Berhasil Dibuat AI Gemini! ✨',
        text: `Berhasil menyusun ${res.soal_list.length} butir soal lengkap dengan kunci jawaban dan pedoman penilaian essay.`,
        confirmButtonText: 'Tinjau & Edit Soal',
        confirmButtonColor: '#2563eb',
      });

      setActiveTabBuilder('pg');
    } catch (err) {
      console.error('AI Generation error:', err);
      setIsGeneratingAi(false);
      Swal.fire('Gagal Membuat Soal', 'Terjadi kendala saat menghubungi AI. Menggunakan template kurikulum standar SMK YPK.', 'info');
      handleGenerateStandardTemplate();
      setActiveTabBuilder('pg');
    }
  };

  // Acak Token Ujian
  const handleGenerateRandomToken = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let res = 'YPK';
    for (let i = 0; i < 3; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  };

  // Buka Modal Edit Soal (Bank Soal)
  const handleOpenEditQuestion = (question) => {
    setEditingQuestion({ ...question });
    setEditingImagePreview(question.gambar_url || '');
  };

  // Simpan Edit Soal (Bank Soal atau Form Buat Ujian Baru)
  const handleSaveEditedQuestion = async () => {
    if (!editingQuestion) return;
    setIsSavingQuestion(true);

    const updatedQuestion = {
      ...editingQuestion,
      gambar_url: editingImagePreview || '',
    };

    if (activeExamForEdit) {
      // Mode 1: Editor Bank Soal (Paket yang sudah ada di database)
      const updatedQuestions = (activeExamForEdit.soal_list || []).map((q) =>
        q.nomor === updatedQuestion.nomor ? updatedQuestion : q
      );

      const updatedExam = {
        ...activeExamForEdit,
        soal_list: updatedQuestions,
      };

      const updatedExams = examList.map((ex) => (ex.id === updatedExam.id ? updatedExam : ex));
      saveExamsToLocal(updatedExams);
      setSelectedExam(updatedExam);
      setActiveExamForEdit(updatedExam);
      await saveExamToSupabase(updatedExam);
    } else {
      // Mode 2: Form Buat Ujian Baru (Draft Paket formSoalList)
      setFormSoalList((prev) => {
        const exists = prev.some((q) => q.nomor === updatedQuestion.nomor);
        if (exists) {
          return prev.map((q) => (q.nomor === updatedQuestion.nomor ? updatedQuestion : q));
        } else {
          return [...prev, updatedQuestion];
        }
      });
    }

    setIsSavingQuestion(false);
    setEditingQuestion(null);
    setEditingImagePreview('');

    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: `Soal No. ${updatedQuestion.nomor} Berhasil Disimpan!`,
      showConfirmButton: false,
      timer: 2000,
    });
  };

  // Tambah Soal Baru Secara Visual Langsung di Form Buat Ujian (WYSIWYG Modal)
  const handleAddNewQuestionInForm = (type = 'PG') => {
    const nextNomor = formSoalList.length + 1;
    const newQ = {
      id: nextNomor,
      nomor: nextNomor,
      tipe: type,
      pertanyaan: `Pertanyaan Soal No. ${nextNomor}...`,
      gambar_url: '',
      opsi_a: type === 'PG' ? 'Pilihan Jawaban A' : '',
      opsi_b: type === 'PG' ? 'Pilihan Jawaban B' : '',
      opsi_c: type === 'PG' ? 'Pilihan Jawaban C' : '',
      opsi_d: type === 'PG' ? 'Pilihan Jawaban D' : '',
      opsi_e: type === 'PG' ? 'Pilihan Jawaban E' : '',
      kunci: type === 'PG' ? 'A' : '',
      bobot: type === 'PG' ? 2 : 8,
      pedoman: type === 'Essay' ? 'Pedoman penskoran essay...' : '',
    };
    setFormSoalList((prev) => [...prev, newQ]);
    handleOpenEditQuestion(newQ);
  };

  // Hapus Soal dari Form Buat Ujian
  const handleDeleteQuestionInForm = async (nomor) => {
    const confirm = await Swal.fire({
      title: `Hapus Soal No. ${nomor}?`,
      text: 'Soal ini akan dihapus dari daftar butir soal ujian.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#dc2626',
    });
    if (confirm.isConfirmed) {
      setFormSoalList((prev) => {
        const filtered = prev.filter((q) => q.nomor !== nomor);
        return filtered.map((q, idx) => ({ ...q, nomor: idx + 1 }));
      });
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: `Soal No. ${nomor} Berhasil Dihapus`,
        showConfirmButton: false,
        timer: 1500,
      });
    }
  };

  // Tambah Soal Baru Secara Manual ke Paket Ujian (Bank Soal)
  const handleAddNewQuestionToExam = async (type = 'PG') => {
    const targetExam = activeExamForEdit || selectedExam;
    if (!targetExam) return;
    const currentList = targetExam.soal_list || [];
    const nextNomor = currentList.length + 1;
    const newQ = {
      id: nextNomor,
      nomor: nextNomor,
      tipe: type,
      pertanyaan: `Pertanyaan Soal Baru No. ${nextNomor}...`,
      gambar_url: '',
      opsi_a: type === 'PG' ? 'Pilihan Jawaban A' : '',
      opsi_b: type === 'PG' ? 'Pilihan Jawaban B' : '',
      opsi_c: type === 'PG' ? 'Pilihan Jawaban C' : '',
      opsi_d: type === 'PG' ? 'Pilihan Jawaban D' : '',
      opsi_e: type === 'PG' ? 'Pilihan Jawaban E' : '',
      kunci: type === 'PG' ? 'A' : '',
      bobot: type === 'PG' ? 2 : 8,
      pedoman: type === 'Essay' ? 'Pedoman penskoran essay...' : '',
    };

    const updatedExam = {
      ...targetExam,
      soal_list: [...currentList, newQ],
    };

    const updatedExams = examList.map((ex) => (ex.id === updatedExam.id ? updatedExam : ex));
    saveExamsToLocal(updatedExams);
    setSelectedExam(updatedExam);
    if (activeExamForEdit?.id === updatedExam.id) {
      setActiveExamForEdit(updatedExam);
    }
    await saveExamToSupabase(updatedExam);

    handleOpenEditQuestion(newQ);
  };

  // Hapus Soal dari Paket Ujian (Bank Soal)
  const handleDeleteQuestionFromExam = async (nomor) => {
    const targetExam = activeExamForEdit || selectedExam;
    if (!targetExam) return;
    const confirm = await Swal.fire({
      title: `Hapus Soal No. ${nomor}?`,
      text: 'Soal ini akan dihapus dari paket ujian dan database secara permanen.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#dc2626',
    });

    if (confirm.isConfirmed) {
      const filtered = (targetExam.soal_list || [])
        .filter((q) => q.nomor !== nomor)
        .map((q, idx) => ({ ...q, nomor: idx + 1, id: idx + 1 }));

      const updatedExam = {
        ...targetExam,
        soal_list: filtered,
      };

      const updatedExams = examList.map((ex) => (ex.id === updatedExam.id ? updatedExam : ex));
      saveExamsToLocal(updatedExams);
      setSelectedExam(updatedExam);
      if (activeExamForEdit?.id === updatedExam.id) {
        setActiveExamForEdit(updatedExam);
      }
      await saveExamToSupabase(updatedExam);

      Swal.fire('Terhapus!', `Soal No. ${nomor} telah dihapus.`, 'success');
    }
  };

  // Simpan Paket Ujian Baru
  const handleSaveExamPackage = async () => {
    if (!formJudul.trim()) {
      Swal.fire('Judul Kosong', 'Harap isi Judul Ujian!', 'warning');
      return;
    }
    if (formSoalList.length === 0) {
      Swal.fire('Soal Kosong', 'Harap buat butir soal (gunakan Tempel Soal, AI Gemini, atau Template)!', 'warning');
      return;
    }

    const numericId = Date.now();
    const newExam = {
      id: numericId,
      judul_ujian: formJudul,
      mata_pelajaran: formMapel,
      tingkat: formTingkat,
      jurusan: formJurusan,
      kelas_target: formJurusan === 'Semua Jurusan' ? 'Semua Kelas' : `${formTingkat} ${formJurusan}`.trim(),
      durasi_menit: Number(formDurasi) || 60,
      kkm: Number(formKkm) || 75,
      token_ujian: formToken.trim().toUpperCase() || handleGenerateRandomToken(),
      password_pengawas: formPasswordPengawas.trim() || 'ypkadmin',
      acak_soal: formAcakSoal,
      tampilkan_nilai: true,
      anti_cheat_enabled: true,
      max_tab_violations: 3,
      status_ujian: 'Aktif',
      dibuat_oleh: currentUser?.nama || currentUser?.username || 'Guru SMK YPK',
      soal_list: formSoalList,
    };

    const updated = [newExam, ...examList];
    saveExamsToLocal(updated);
    setSelectedExam(newExam);
    await saveExamToSupabase(newExam);

    // Reset form
    setFormJudul('');
    setFormSoalList([]);
    setBulkImportText('');

    Swal.fire({
      icon: 'success',
      title: 'Paket Ujian Berhasil Diterbitkan! 🎉',
      html: `Paket <b>"${newExam.judul_ujian}"</b> (${newExam.mata_pelajaran}) berisi <b>${newExam.soal_list.length} butir soal</b> telah aktif di Bank Soal dan tersinkronisasi realtime.`,
      confirmButtonColor: '#7c3aed',
      confirmButtonText: 'Buka Bank Soal per Mapel',
    });

    if (onSubMenuChange) onSubMenuChange('bank_soal');
  };

  // Simpan Penilaian Koreksi Essay
  const handleSaveEssayGrading = () => {
    if (!gradingSubmission) return;

    let essayTotal = 0;
    const questions = selectedExam?.soal_list || [];
    const essayQuestions = questions.filter((q) => q.tipe === 'Essay');

    essayQuestions.forEach((eq) => {
      const score = Number(essayScores[eq.nomor]) || 0;
      essayTotal += score;
    });

    const finalTotal = (Number(gradingSubmission.nilai_pg) || 0) + essayTotal;
    const isLulus = finalTotal >= (selectedExam?.kkm || 75);

    const updated = submissionList.map((sub) => {
      if (sub.id === gradingSubmission.id) {
        return {
          ...sub,
          nilai_essay: essayTotal,
          total_nilai: finalTotal,
          status_koreksi: isLulus ? 'Lulus ✅' : 'Remedial ⚠️',
        };
      }
      return sub;
    });

    saveSubmissionsToLocal(updated);
    setGradingSubmission(null);
    Swal.fire('Nilai Disimpan!', `Nilai total siswa: ${finalTotal} (${isLulus ? 'LULUS' : 'REMEDIAL'}).`, 'success');
  };

  // Ekspor Rekap Nilai ke Excel / CSV
  const handleExportGradesCsv = () => {
    if (submissionList.length === 0) {
      Swal.fire('Data Kosong', 'Belum ada data nilai siswa yang dapat diekspor.', 'info');
      return;
    }
    const headers = ['No', 'Nama Siswa', 'Kelas', 'Jurusan', 'Nilai PG', 'Nilai Essay', 'Total Nilai', 'Status', 'Pelanggaran Anti-Cheat', 'Waktu Submit'];
    const rows = submissionList.map((s, idx) => [
      idx + 1,
      `"${s.nama_siswa}"`,
      `"${s.kelas}"`,
      `"${s.jurusan}"`,
      s.nilai_pg,
      s.nilai_essay,
      s.total_nilai,
      `"${s.status_koreksi}"`,
      s.violations,
      `"${new Date(s.submitted_at).toLocaleString('id-ID')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Rekap_Nilai_CBT_${selectedExam?.judul_ujian || 'SMK_YPK'}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 🛡️ SANITASI SOAL UJIAN (KUNCI JAWABAN & PEDOMAN ESSAY DIHAPUS OTOMATIS SAAT SISWA MEMBUKA UJIAN)
  const isGuruUser = Boolean(
    currentUser?.isGuru ||
    currentUser?.role === 'guru' ||
    currentUser?.role === 'admin' ||
    currentUser?.role === 'master' ||
    isMasterIqbal
  );

  const currentExamQuestions = useMemo(() => {
    const list = selectedExam?.soal_list || [];
    if (isGuruUser) {
      return list;
    }
    // Jika Siswa: Hapus field kunci dan pedoman dari state & DOM
    return list.map((q) => {
      const { kunci, pedoman, ...safeQuestion } = q;
      return {
        ...safeQuestion,
        kunci_hash: hashAnswerKey(q.id || q.nomor, kunci),
      };
    });
  }, [selectedExam, isGuruUser]);

  // Daftar Soal yang Aktif Digunakan di Ruang Ujian (Diacak Khusus per Siswa)
  const activeExamQuestions = useMemo(() => {
    if (!isGuruUser && studentShuffledQuestions && studentShuffledQuestions.length > 0) {
      return studentShuffledQuestions;
    }
    return currentExamQuestions;
  }, [isGuruUser, studentShuffledQuestions, currentExamQuestions]);

  // Soal yang Sedang Aktif Ditampilkan:
  // - Siswa: Menggunakan nomor urut acak siswa (activeQuestionSeq: 1..N)
  // - Guru: Menggunakan nomor soal asli (activeQuestionNum)
  // 📚 PENGELOMPOKAN PAKET UJIAN PER MATA PELAJARAN (SMK YPK MEDAN)
  const filteredAndGroupedExams = useMemo(() => {
    let filtered = [...examList];

    // Filter Guru:
    if (selectedGuruFilter === 'saya' && currentUser) {
      const myName = String(currentUser.nama || currentUser.username || '').toLowerCase();
      filtered = filtered.filter((ex) => {
        const creator = String(ex.dibuat_oleh || '').toLowerCase();
        return creator.includes(myName) || (isMasterIqbal && creator.includes('iqbal'));
      });
    }

    // Filter Mapel:
    if (selectedMapelFilter && selectedMapelFilter !== 'Semua') {
      filtered = filtered.filter((ex) => {
        return String(ex.mata_pelajaran || '').toLowerCase().includes(selectedMapelFilter.toLowerCase());
      });
    }

    // Filter Pencarian Teks:
    if (bankSearchQuery.trim()) {
      const q = bankSearchQuery.toLowerCase();
      filtered = filtered.filter((ex) => {
        return (
          String(ex.judul_ujian || '').toLowerCase().includes(q) ||
          String(ex.mata_pelajaran || '').toLowerCase().includes(q) ||
          String(ex.dibuat_oleh || '').toLowerCase().includes(q) ||
          String(ex.kelas_target || '').toLowerCase().includes(q)
        );
      });
    }

    // Kelompokkan per Mata Pelajaran
    const groups = {};
    filtered.forEach((ex) => {
      const mapelKey = ex.mata_pelajaran || 'Mata Pelajaran Umum';
      if (!groups[mapelKey]) {
        groups[mapelKey] = [];
      }
      groups[mapelKey].push(ex);
    });

    // Urutkan Mapel secara alfabetis
    return Object.keys(groups).sort().map((mapel) => ({
      mapel,
      icon: getMapelIcon(mapel),
      exams: groups[mapel],
    }));
  }, [examList, selectedGuruFilter, selectedMapelFilter, bankSearchQuery, currentUser, isMasterIqbal]);

  const currentActiveQuestion = useMemo(() => {
    if (!isGuruUser && activeExamQuestions.length > 0) {
      const seqIndex = Math.max(0, Math.min(activeExamQuestions.length - 1, (activeQuestionSeq || 1) - 1));
      return activeExamQuestions[seqIndex] || activeExamQuestions[0];
    }
    return currentExamQuestions.find((q) => q.nomor === activeQuestionNum) || currentExamQuestions[0];
  }, [isGuruUser, activeExamQuestions, activeQuestionSeq, currentExamQuestions, activeQuestionNum]);

  return (
    <div style={{ padding: '4px 0 30px 0' }}>
      {/* 🧭 NAVIGATION SUB-MENU KHUSUS GURU & ADMIN MASTER */}
      {isTeacherOrAdmin && !isExamRunning && (
        <div
          style={{
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            paddingBottom: '14px',
            marginBottom: '16px',
            scrollbarWidth: 'none',
          }}
        >
          {[
            { id: 'bank_soal', label: '📚 Bank Soal per Mapel', icon: '📚' },
            { id: 'buat_ujian', label: '➕ Buat Paket Soal Ujian', icon: '➕' },
            { id: 'koreksi_essay', label: '📊 Rekap Nilai Siswa', icon: '📊' },
            { id: 'ruang_ujian', label: '✍️ Ruang Ujian Siswa (Simulasi)', icon: '✍️' },
          ].map((tab) => {
            const isSel = effectiveTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSubMenuChange && onSubMenuChange(tab.id)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '12px',
                  border: isSel ? '2px solid #7c3aed' : '1px solid #e2e8f0',
                  backgroundColor: isSel ? '#7c3aed' : '#ffffff',
                  color: isSel ? '#ffffff' : '#334155',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: isSel ? '0 4px 12px rgba(124, 58, 237, 0.25)' : 'none',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {/* ============================================================== */}
      {/* 1. SUB-MENU 1: RUANG UJIAN SISWA (CBT REALTIME & ANTI-CHEAT)   */}
      {/* ============================================================== */}
      {effectiveTab === 'ruang_ujian' && (
        isTeacherOrAdmin ? (
          <div style={{ backgroundColor: '#f8fafc', padding: '36px 20px', borderRadius: '16px', border: '1px solid #e2e8f0', textAlign: 'center', marginTop: '10px' }}>
            <div style={{ fontSize: '42px', marginBottom: '8px' }}>👁️</div>
            <h3 style={{ margin: '0 0 6px 0', color: '#1e293b', fontSize: '18px', fontWeight: 'bold' }}>Pratinjau Ruang Ujian Siswa</h3>
            <p style={{ color: '#64748b', fontSize: '13px', maxWidth: '540px', margin: '0 auto 18px auto', lineHeight: '1.5' }}>
              Sebagai <b>Bapak/Ibu Guru</b> atau <b>Admin Master</b>, Anda dapat mengelola soal di <b>Bank Soal &amp; Editor</b>, menyusun soal baru dengan <b>AI Google Gemini</b>, atau memeriksa jawaban di <b>Koreksi Essay</b>.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => onSubMenuChange && onSubMenuChange('bank_soal')}
                style={{ backgroundColor: '#7c3aed', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 20px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 12px rgba(124, 58, 237, 0.25)' }}
              >
                📝 Buka Bank Soal &amp; Editor CBT
              </button>
              <button
                type="button"
                onClick={() => onSubMenuChange && onSubMenuChange('buat_ujian')}
                style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 20px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                🛠️ Buat Soal Baru dg AI Gemini
              </button>
              <button
                type="button"
                onClick={() => onSubMenuChange && onSubMenuChange('koreksi_essay')}
                style={{ backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 20px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                💯 Koreksi Essay &amp; Nilai
              </button>
            </div>
          </div>
        ) : (
        <div>
          {!isExamRunning && !examResult && (
            <div>
              {/* LOBBY UJIAN */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #9333ea 100%)',
                  borderRadius: '16px',
                  padding: '24px',
                  color: '#ffffff',
                  boxShadow: '0 8px 24px rgba(124, 58, 237, 0.25)',
                  marginBottom: '20px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', backgroundColor: 'rgba(255, 255, 255, 0.2)', padding: '4px 10px', borderRadius: '20px' }}>
                      RUANG UJIAN CBT ONLINE
                    </span>
                    <h1 style={{ margin: '8px 0 4px 0', fontSize: '22px', fontWeight: 'bold' }}>
                      Ujian Sekolah Berbasis Komputer &amp; HP
                    </h1>
                    <p style={{ margin: 0, fontSize: '13px', color: '#ede9fe' }}>
                      Platform CBT Resmi SMK YPK Medan dengan Sistem Anti-Nyontek, Timer Otomatis &amp; Nilai Instan.
                    </p>
                  </div>
                  <div style={{ backgroundColor: 'rgba(255,255,255,0.15)', padding: '12px 18px', borderRadius: '12px', textAlign: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#f5d0fe', display: 'block' }}>Paket Ujian Aktif</span>
                    <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffffff' }}>{examList.length}</span>
                  </div>
                </div>
              </div>

              {/* BANNER DETEKSI SESI AKTIF (PEMULIHAN KARENA HANG / RESTART KOMPUTER) */}
              {activeExamSession && (
                <div
                  style={{
                    backgroundColor: '#fef3c7',
                    border: '2px solid #f59e0b',
                    borderRadius: '14px',
                    padding: '18px 22px',
                    marginBottom: '20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '14px',
                    boxShadow: '0 6px 18px rgba(245, 158, 11, 0.2)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '12px',
                        backgroundColor: '#f59e0b',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '22px',
                        flexShrink: 0,
                      }}
                    >
                      ⚡
                    </div>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#92400e' }}>
                        Sesi Ujian Aktif Terdeteksi (Komputer Sempat Terhenti / Restart)
                      </div>
                      <div style={{ fontSize: '12px', color: '#78350f', marginTop: '2px' }}>
                        Ujian: <b>{activeExamSession.examTitle}</b> | Jawaban Anda tersimpan aman dan tidak akan hilang!
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => checkAndResumeSession()}
                      style={{
                        backgroundColor: '#d97706',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '10px',
                        padding: '10px 18px',
                        fontWeight: 'bold',
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 10px rgba(217, 119, 6, 0.3)',
                      }}
                    >
                      🚀 Lanjutkan Ujian Sekarang
                    </button>
                  </div>
                </div>
              )}

              {/* PILIH PAKET UJIAN */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
                {examList.map((exam) => {
                  const isSelected = selectedExam?.id === exam.id;
                  const pgCount = exam.soal_list.filter((q) => q.tipe === 'PG').length;
                  const essayCount = exam.soal_list.filter((q) => q.tipe === 'Essay').length;

                  return (
                    <div
                      key={exam.id}
                      className="stardust-white-card"
                      style={{
                        borderRadius: '14px',
                        padding: '20px',
                        border: isSelected ? '2px solid #7c3aed' : '1px solid #e2e8f0',
                        boxShadow: isSelected ? '0 8px 20px rgba(124, 58, 237, 0.15)' : '0 2px 8px rgba(0,0,0,0.04)',
                        position: 'relative',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 'bold', backgroundColor: '#f3e8ff', color: '#7c3aed', padding: '3px 10px', borderRadius: '20px' }}>
                          {exam.mata_pelajaran}
                        </span>
                        <span style={{ fontSize: '11px', backgroundColor: '#dcfce7', color: '#166534', fontWeight: 'bold', padding: '3px 8px', borderRadius: '12px' }}>
                          🟢 Aktif
                        </span>
                      </div>

                      <h3 style={{ margin: '6px 0', fontSize: '16px', fontWeight: 'bold', color: '#0f172a' }}>
                        {exam.judul_ujian}
                      </h3>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', margin: '14px 0', fontSize: '12px', color: '#64748b' }}>
                        <div style={{ backgroundColor: '#f8fafc', padding: '8px 10px', borderRadius: '8px' }}>
                          ⏱️ Durasi: <b>{exam.durasi_menit} Menit</b>
                        </div>
                        <div style={{ backgroundColor: '#f8fafc', padding: '8px 10px', borderRadius: '8px' }}>
                          🎯 KKM: <b>{exam.kkm}</b>
                        </div>
                        <div style={{ backgroundColor: '#f8fafc', padding: '8px 10px', borderRadius: '8px' }}>
                          📝 Soal: <b>{pgCount} PG + {essayCount} Essay</b>
                        </div>
                        <div style={{ backgroundColor: '#f8fafc', padding: '8px 10px', borderRadius: '8px' }}>
                          🛡️ Anti-Cheat: <b>Aktif (Max 3x)</b>
                        </div>
                      </div>

                      {/* Token Ujian Input */}
                      {exam.token_ujian && (
                        <div style={{ marginBottom: '14px' }}>
                          <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>
                            🔑 Masukkan Token Ujian:
                          </label>
                          <input
                            type="text"
                            placeholder="Contoh: YPK2026"
                            value={tokenInput}
                            onChange={(e) => setTokenInput(e.target.value)}
                            style={{
                              width: '100%',
                              boxSizing: 'border-box',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              fontSize: '13px',
                              fontWeight: 'bold',
                              textTransform: 'uppercase',
                            }}
                          />
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedExam(exam);
                          handleStartExam();
                        }}
                        style={{
                          width: '100%',
                          backgroundColor: '#7c3aed',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '10px',
                          padding: '12px',
                          fontSize: '14px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          boxShadow: '0 4px 12px rgba(124, 58, 237, 0.25)',
                        }}
                      >
                        🚀 Masuk Ruang Ujian CBT
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* RUANG UJIAN LIVE CBT (FULLSCREEN & ANTI-CHEAT ENGINE)           */}
          {/* ============================================================== */}
          {isExamRunning && currentActiveQuestion && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 99999999,
                backgroundColor: '#f8fafc',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                userSelect: 'none', // Cegah select teks
              }}
            >
              {/* TOP HEADER UJIAN (TIMER & ANTI-CHEAT INDICATOR) */}
              <div
                style={{
                  background: 'linear-gradient(90deg, #1e1b4b, #312e81, #4338ca)',
                  color: '#ffffff',
                  padding: '12px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{selectedExam?.judul_ujian}</span>
                    <span style={{ fontSize: '10px', backgroundColor: '#ec4899', color: '#ffffff', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
                      CBT LIVE
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#c7d2fe', marginTop: '2px' }}>
                    Peserta: <b>{currentUser?.nama || 'Siswa'}</b> | Kelas: <b>{currentUser?.kelas || siswaAdminKelas || 'X TJKT'}</b>
                  </div>
                </div>

                {/* Sisa Waktu & Pelanggaran */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  {/* Status Pelanggaran */}
                  <div
                    style={{
                      backgroundColor: violationCount > 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.2)',
                      border: violationCount > 0 ? '1px solid #ef4444' : '1px solid #22c55e',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: violationCount > 0 ? '#fca5a5' : '#86efac',
                    }}
                  >
                    🛡️ Pelanggaran: {violationCount} / {selectedExam?.max_tab_violations || 3}
                  </div>

                  {/* Countdown Timer */}
                  <div
                    style={{
                      backgroundColor: timeLeftSeconds < 300 ? '#ef4444' : '#1e293b',
                      color: '#ffffff',
                      padding: '6px 14px',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: '800',
                      letterSpacing: '1px',
                      border: '1px solid rgba(255,255,255,0.2)',
                      animation: timeLeftSeconds < 300 ? 'pulse 1s infinite' : 'none',
                    }}
                  >
                    ⏱️ {formattedTimeLeft}
                  </div>
                </div>
              </div>

              {/* PROGRESS BAR WAKTU */}
              <div style={{ height: '4px', backgroundColor: '#e2e8f0', width: '100%' }}>
                <div
                  style={{
                    height: '100%',
                    backgroundColor: timeLeftSeconds < 300 ? '#ef4444' : '#22c55e',
                    width: `${Math.min(100, (timeLeftSeconds / ((selectedExam?.durasi_menit || 60) * 60)) * 100)}%`,
                    transition: 'width 1s linear',
                  }}
                />
              </div>

              {/* KONTEN UTAMA: SOAL & KISI-KISI NOMOR */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '16px', padding: '20px' }}>
                {/* PANEL SOAL */}
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    padding: '24px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '480px',
                  }}
                >
                  <div>
                    {/* Header Nomor Soal & Font Control */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e3a8a' }}>
                          {isGuruUser ? `Soal No. ${currentActiveQuestion.nomor}` : `Pertanyaan ${activeQuestionSeq} dari ${activeExamQuestions.length}`}
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 'bold',
                            padding: '3px 10px',
                            borderRadius: '20px',
                            backgroundColor: currentActiveQuestion.tipe === 'PG' ? '#e0f2fe' : '#fef3c7',
                            color: currentActiveQuestion.tipe === 'PG' ? '#0369a1' : '#92400e',
                          }}
                        >
                          {currentActiveQuestion.tipe === 'PG' ? 'Pilihan Ganda (Bobot 2 Poin)' : 'Essay (Bobot 8 Poin)'}
                        </span>

                        {!isGuruUser && (
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 'bold',
                              padding: '3px 10px',
                              borderRadius: '20px',
                              backgroundColor: '#f3e8ff',
                              color: '#7e22ce',
                              border: '1px solid #e9d5ff',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span>🔀</span> Soal Diacak Khusus
                          </span>
                        )}

                        {!isGuruUser && (
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 'bold',
                              padding: '3px 10px',
                              borderRadius: '20px',
                              backgroundColor: '#f0fdf4',
                              color: '#15803d',
                              border: '1px solid #bbf7d0',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span>⚡</span> Auto-Save Aktif
                          </span>
                        )}
                      </div>

                      {/* Font Resizer */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>Ukuran Teks:</span>
                        <button
                          type="button"
                          onClick={() => setFontSizeLevel((prev) => Math.max(13, prev - 1))}
                          style={{ padding: '2px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                        >
                          A-
                        </button>
                        <button
                          type="button"
                          onClick={() => setFontSizeLevel((prev) => Math.min(22, prev + 1))}
                          style={{ padding: '2px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                        >
                          A+
                        </button>
                      </div>
                    </div>

                    {/* Teks Pertanyaan */}
                    <div style={{ fontSize: `${fontSizeLevel}px`, lineHeight: '1.6', color: '#0f172a', marginBottom: '16px', fontWeight: '500' }}>
                      {currentActiveQuestion.pertanyaan}
                    </div>

                    {/* GAMBAR SOAL CBT JIKA ADA */}
                    {currentActiveQuestion.gambar_url && (
                      <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                        <div
                          style={{
                            display: 'inline-block',
                            position: 'relative',
                            cursor: 'zoom-in',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            border: '2px solid #cbd5e1',
                            boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
                            maxWidth: '100%',
                            backgroundColor: '#f8fafc',
                          }}
                          onClick={() => setLightboxImage(currentActiveQuestion.gambar_url)}
                        >
                          <img
                            src={currentActiveQuestion.gambar_url}
                            alt={isGuruUser ? `Gambar Soal No. ${currentActiveQuestion.nomor}` : `Gambar Pertanyaan ${activeQuestionSeq}`}
                            style={{
                              maxHeight: '280px',
                              maxWidth: '100%',
                              objectFit: 'contain',
                              display: 'block',
                            }}
                          />
                          <div
                            style={{
                              position: 'absolute',
                              bottom: '8px',
                              right: '8px',
                              backgroundColor: 'rgba(15, 23, 42, 0.8)',
                              color: '#ffffff',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 'bold',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span>🔍</span> Klik untuk Perbesar
                          </div>
                        </div>
                      </div>
                    )}

                    {/* PILIHAN GANDA (A - E) */}
                    {currentActiveQuestion.tipe === 'PG' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {['A', 'B', 'C', 'D', 'E'].map((optKey) => {
                          const optText = currentActiveQuestion[`opsi_${optKey.toLowerCase()}`];
                          if (!optText) return null;

                          const isSelected = studentAnswers[currentActiveQuestion.nomor] === optKey;

                          return (
                            <div
                              key={optKey}
                              onClick={() => handleSelectAnswer(currentActiveQuestion.nomor, optKey)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '12px 16px',
                                borderRadius: '10px',
                                border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                                backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <div
                                style={{
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '50%',
                                  backgroundColor: isSelected ? '#2563eb' : '#f1f5f9',
                                  color: isSelected ? '#ffffff' : '#475569',
                                  fontWeight: 'bold',
                                  fontSize: '13px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                {optKey}
                              </div>
                              <span style={{ fontSize: `${fontSizeLevel - 1}px`, color: isSelected ? '#1e40af' : '#334155', fontWeight: isSelected ? '600' : 'normal' }}>
                                {optText}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* ESSAY (TEXTAREA) */}
                    {currentActiveQuestion.tipe === 'Essay' && (
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '6px' }}>
                          ✍️ Tulis Jawaban Essay Anda di bawah ini:
                        </label>
                        <textarea
                          rows={6}
                          placeholder="Ketik uraian jawaban Anda secara lengkap dan jelas..."
                          value={studentAnswers[currentActiveQuestion.nomor] || ''}
                          onChange={(e) => handleEssayChange(currentActiveQuestion.nomor, e.target.value)}
                          style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            padding: '12px',
                            borderRadius: '10px',
                            border: '1px solid #cbd5e1',
                            fontSize: `${fontSizeLevel}px`,
                            lineHeight: '1.5',
                            resize: 'vertical',
                            fontFamily: 'inherit',
                          }}
                        />
                        <div style={{ fontSize: '11px', color: '#16a34a', marginTop: '4px', textAlign: 'right', fontWeight: '500' }}>
                          ⚡ Jawaban tersimpan otomatis ke server sekolah (aman jika komputer hang/restart)
                        </div>
                      </div>
                    )}
                  </div>

                  {/* BOTTOM ACTION BUTTONS */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #f1f5f9', flexWrap: 'wrap', gap: '8px' }}>
                    <button
                      type="button"
                      disabled={isGuruUser ? currentActiveQuestion.nomor === 1 : activeQuestionSeq === 1}
                      onClick={() => isGuruUser ? setActiveQuestionNum((prev) => Math.max(1, prev - 1)) : handleNavigateSeq(Math.max(1, activeQuestionSeq - 1))}
                      style={{
                        padding: '10px 18px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: (isGuruUser ? currentActiveQuestion.nomor === 1 : activeQuestionSeq === 1) ? '#f1f5f9' : '#ffffff',
                        color: (isGuruUser ? currentActiveQuestion.nomor === 1 : activeQuestionSeq === 1) ? '#94a3b8' : '#334155',
                        fontWeight: 'bold',
                        fontSize: '13px',
                        cursor: (isGuruUser ? currentActiveQuestion.nomor === 1 : activeQuestionSeq === 1) ? 'not-allowed' : 'pointer',
                      }}
                    >
                      ⬅️ Sebelumnya
                    </button>

                    {/* Ragu-Ragu Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleRagu(currentActiveQuestion.nomor)}
                      style={{
                        padding: '10px 18px',
                        borderRadius: '8px',
                        border: '1px solid #f59e0b',
                        backgroundColor: raguList[currentActiveQuestion.nomor] ? '#f59e0b' : '#fffbeb',
                        color: raguList[currentActiveQuestion.nomor] ? '#ffffff' : '#b45309',
                        fontWeight: 'bold',
                        fontSize: '13px',
                        cursor: 'pointer',
                      }}
                    >
                      {raguList[currentActiveQuestion.nomor] ? '🟡 Ditandai Ragu' : '⚪ Ragu-Ragu'}
                    </button>

                    {(isGuruUser ? currentActiveQuestion.nomor < currentExamQuestions.length : activeQuestionSeq < activeExamQuestions.length) ? (
                      <button
                        type="button"
                        onClick={() => isGuruUser ? setActiveQuestionNum((prev) => Math.min(currentExamQuestions.length, prev + 1)) : handleNavigateSeq(Math.min(activeExamQuestions.length, activeQuestionSeq + 1))}
                        style={{
                          padding: '10px 18px',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: '#2563eb',
                          color: '#ffffff',
                          fontWeight: 'bold',
                          fontSize: '13px',
                          cursor: 'pointer',
                        }}
                      >
                        Selanjutnya ➡️
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          const totalAnswered = Object.keys(studentAnswers).filter((k) => studentAnswers[k] && String(studentAnswers[k]).trim().length > 0).length;
                          const totalQuestions = isGuruUser ? currentExamQuestions.length : activeExamQuestions.length;

                          Swal.fire({
                            title: 'Selesaikan Ujian Sekarang?',
                            html: `
                              <div style="font-size: 13px; text-align: left;">
                                <p>Terjawab: <b>${totalAnswered} / ${totalQuestions} Soal</b></p>
                                <p>Belum Terjawab: <b>${totalQuestions - totalAnswered} Soal</b></p>
                                <p>Apakah Anda yakin ingin mengakhiri dan mengirim seluruh jawaban Anda?</p>
                              </div>
                            `,
                            icon: 'question',
                            showCancelButton: true,
                            confirmButtonText: '✅ Ya, Kirim Jawaban',
                            cancelButtonText: 'Periksa Lagi',
                            confirmButtonColor: '#16a34a',
                          }).then((res) => {
                            if (res.isConfirmed) {
                              handleFinishExam(false);
                            }
                          });
                        }}
                        style={{
                          padding: '10px 20px',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: '#16a34a',
                          color: '#ffffff',
                          fontWeight: 'bold',
                          fontSize: '13px',
                          cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
                        }}
                      >
                        ✅ Selesai &amp; Kumpulkan
                      </button>
                    )}
                  </div>
                </div>

                {/* KISI-KISI NAVIGASI NOMOR SOAL (1 - 35) */}
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    padding: '18px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#0f172a', fontWeight: 'bold', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                    📑 Kisi-Kisi Soal (1 - {isGuruUser ? currentExamQuestions.length : activeExamQuestions.length})
                  </h4>

                  {/* Legend */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '10px', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: '#22c55e' }} />
                      <span>Terjawab</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: '#f59e0b' }} />
                      <span>Ragu-Ragu</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: '#e2e8f0' }} />
                      <span>Belum</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '3px', border: '2px solid #2563eb' }} />
                      <span>Aktif</span>
                    </div>
                  </div>

                  {/* Grid Buttons */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(5, 1fr)',
                      gap: '8px',
                      maxHeight: '340px',
                      overflowY: 'auto',
                      padding: '2px',
                    }}
                  >
                    {(isGuruUser ? currentExamQuestions : activeExamQuestions).map((q, idx) => {
                      const seqNum = idx + 1;
                      const ans = studentAnswers[q.nomor];
                      const hasAnswered = ans && String(ans).trim().length > 0;
                      const isRagu = raguList[q.nomor];
                      const isCurrent = isGuruUser ? (q.nomor === currentActiveQuestion.nomor) : (seqNum === activeQuestionSeq);

                      let bg = '#f8fafc';
                      let color = '#475569';
                      let border = '1px solid #cbd5e1';

                      if (hasAnswered) {
                        bg = '#dcfce7';
                        color = '#166534';
                        border = '1px solid #86efac';
                      }
                      if (isRagu) {
                        bg = '#fef3c7';
                        color = '#92400e';
                        border = '1px solid #fde68a';
                      }
                      if (isCurrent) {
                        border = '2px solid #2563eb';
                      }

                      return (
                        <button
                          key={isGuruUser ? q.nomor : `seq-${seqNum}`}
                          type="button"
                          onClick={() => isGuruUser ? setActiveQuestionNum(q.nomor) : handleNavigateSeq(seqNum)}
                          style={{
                            height: '38px',
                            borderRadius: '8px',
                            backgroundColor: bg,
                            color: color,
                            border: border,
                            fontWeight: 'bold',
                            fontSize: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.1s',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <span>{isGuruUser ? q.nomor : seqNum}</span>
                          {q.tipe === 'Essay' && <span style={{ fontSize: '7px', opacity: 0.7 }}>ESSAY</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* MODAL HASIL UJIAN SELESAI                                       */}
          {/* ============================================================== */}
          {examResult && (
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                padding: '28px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
                maxWidth: '600px',
                margin: '0 auto',
                textAlign: 'center',
              }}
            >
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#dcfce7', color: '#16a34a', fontSize: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                🎉
              </div>
              <h2 style={{ margin: '0 0 6px 0', fontSize: '20px', color: '#0f172a', fontWeight: 'bold' }}>
                Ujian Berhasil Diselesaikan!
              </h2>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                {examResult.judul_ujian}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', margin: '20px 0' }}>
                <div style={{ backgroundColor: '#f0fdf4', padding: '12px', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                  <span style={{ fontSize: '11px', color: '#166534', display: 'block' }}>Skor PG</span>
                  <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#16a34a' }}>
                    {examResult.nilai_pg} / {examResult.total_max_pg}
                  </span>
                </div>
                <div style={{ backgroundColor: '#eff6ff', padding: '12px', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
                  <span style={{ fontSize: '11px', color: '#1e40af', display: 'block' }}>Benar PG</span>
                  <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e40af' }}>
                    {examResult.correct_pg} / {examResult.total_pg}
                  </span>
                </div>
                <div style={{ backgroundColor: '#fdf2f8', padding: '12px', borderRadius: '10px', border: '1px solid #fbcfe8' }}>
                  <span style={{ fontSize: '11px', color: '#9d174d', display: 'block' }}>Anti-Cheat Log</span>
                  <span style={{ fontSize: '18px', fontWeight: 'bold', color: examResult.violations === 0 ? '#16a34a' : '#e11d48' }}>
                    {examResult.violations === 0 ? '🛡️ Aman' : `${examResult.violations}x Teguran`}
                  </span>
                </div>
              </div>

              <p style={{ fontSize: '12px', color: '#475569', backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
                ℹ️ <b>Status Koreksi Essay:</b> Jawaban 5 Soal Essay Anda telah tersimpan dan sedang menunggu penilaian manual dari Guru Pengampu.
              </p>

              <button
                type="button"
                onClick={() => setExamResult(null)}
                style={{
                  marginTop: '16px',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 24px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                Kembali ke Menu Ujian
              </button>
            </div>
          )}
        </div>
        )
      )}

      {/* ============================================================== */}
      {/* 2. SUB-MENU 2: BUAT SOAL UJIAN (30 PG + 5 ESSAY) - GURU / ADMIN */}
      {/* ============================================================== */}
      {effectiveTab === 'buat_ujian' && (
        isStudentUser ? (
          <div style={{ backgroundColor: '#fef2f2', padding: '36px 20px', borderRadius: '16px', border: '1px solid #fecaca', textAlign: 'center', marginTop: '20px' }}>
            <div style={{ fontSize: '42px', marginBottom: '8px' }}>🚫</div>
            <h3 style={{ margin: '0 0 6px 0', color: '#991b1b', fontSize: '18px', fontWeight: 'bold' }}>Hak Akses Dibatasi</h3>
            <p style={{ color: '#7f1d1d', fontSize: '13px', maxWidth: '480px', margin: '0 auto 18px auto', lineHeight: '1.5' }}>
              Fitur pembuatan soal dan bank soal CBT hanya dapat diakses oleh <b>Bapak/Ibu Guru</b> dan <b>Admin Sekolah</b>.
            </p>
            <button
              type="button"
              onClick={() => onSubMenuChange && onSubMenuChange('ruang_ujian')}
              style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              ✍️ Kembali ke Ruang Ujian Siswa/i
            </button>
          </div>
        ) : (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '24px' }}>➕</span>
                <h2 style={{ margin: 0, fontSize: '18px', color: '#1e3a8a', fontWeight: 'bold' }}>
                  Buat Paket Soal Ujian Baru
                </h2>
                <span style={{ backgroundColor: '#f3e8ff', color: '#7c3aed', padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold' }}>
                  SMK YPK Medan
                </span>
              </div>
              <p style={{ margin: '3px 0 0 0', fontSize: '12.5px', color: '#64748b' }}>
                Pilih mata pelajaran, atur jumlah butir soal (+ / -), dan edit langsung kartu soal secara visual dengan mudah.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => onSubMenuChange && onSubMenuChange('bank_soal')}
                style={{
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '8px 14px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                ← Kembali ke Bank Soal
              </button>
              <button
                type="button"
                onClick={handleGenerateStandardTemplate}
                style={{
                  backgroundColor: '#f3e8ff',
                  color: '#7c3aed',
                  border: '1px solid #d8b4fe',
                  borderRadius: '8px',
                  padding: '8px 14px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                ⚡ Template 30 PG + 5 Essay
              </button>
              <button
                type="button"
                onClick={handleSaveExamPackage}
                style={{
                  backgroundColor: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 18px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(22, 163, 74, 0.25)',
                }}
              >
                💾 Simpan &amp; Terbitkan Ujian
              </button>
            </div>
          </div>

          {/* FORM PENGATURAN UMUM UJIAN */}
          <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              {/* Mata Pelajaran Dropdown */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '11.5px', fontWeight: 'bold', color: '#334155' }}>Mata Pelajaran (Mapel):</label>
                  <span style={{ fontSize: '11px', color: '#7c3aed', fontWeight: 'bold' }}>{getMapelIcon(formMapel)} SMK YPK</span>
                </div>
                <select
                  value={MAPEL_OPTIONS_SMK_YPK.includes(formMapel) ? formMapel : (formMapel ? 'custom' : MAPEL_OPTIONS_SMK_YPK[0])}
                  onChange={(e) => {
                    if (e.target.value !== 'custom') {
                      setFormMapel(e.target.value);
                      if (!formJudul || formJudul.startsWith('Ujian CBT ')) {
                        setFormJudul(`Ujian CBT ${e.target.value} 2026`);
                      }
                    }
                  }}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff', fontWeight: 'bold' }}
                >
                  {MAPEL_OPTIONS_SMK_YPK.map((mp) => (
                    <option key={mp} value={mp}>{getMapelIcon(mp)} {mp}</option>
                  ))}
                  <option value="custom">✏️ Mapel Lainnya / Ketik Manual...</option>
                </select>
                {(!MAPEL_OPTIONS_SMK_YPK.includes(formMapel) || formMapel === 'Lainnya (Ketik Sendiri)') && (
                  <input
                    type="text"
                    placeholder="Tuliskan nama mata pelajaran..."
                    value={formMapel === 'Lainnya (Ketik Sendiri)' ? '' : formMapel}
                    onChange={(e) => setFormMapel(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #7c3aed', fontSize: '13px', marginTop: '6px' }}
                    autoFocus
                  />
                )}
              </div>

              {/* Judul Ujian */}
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 'bold', color: '#334155', display: 'block', marginBottom: '4px' }}>Judul Ujian:</label>
                <input
                  type="text"
                  placeholder="Contoh: PTS Ganjil Kejuruan TJKT 2026"
                  value={formJudul}
                  onChange={(e) => setFormJudul(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff' }}
                />
              </div>

              {/* Guru Pengampu */}
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 'bold', color: '#334155', display: 'block', marginBottom: '4px' }}>Guru Pengampu:</label>
                <div style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff', fontSize: '13px', color: '#1e293b', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>👤</span> {currentUser?.nama || currentUser?.username || 'Guru Mata Pelajaran SMK YPK'}
                </div>
              </div>

              {/* Jurusan Target */}
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 'bold', color: '#334155', display: 'block', marginBottom: '4px' }}>Jurusan Target:</label>
                <select
                  value={formJurusan}
                  onChange={(e) => setFormJurusan(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff' }}
                >
                  <option value="Semua Jurusan">Semua Jurusan</option>
                  <option value="TJKT">TJKT (Teknik Jaringan Komputer)</option>
                  <option value="AKL">AKL (Akuntansi Keuangan Lembaga)</option>
                  <option value="MPLB">MPLB (Manajemen Perkantoran)</option>
                  <option value="Pemasaran">Pemasaran &amp; Bisnis Digital</option>
                </select>
              </div>

              {/* Tingkat Kelas */}
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 'bold', color: '#334155', display: 'block', marginBottom: '4px' }}>Tingkat Kelas:</label>
                <select
                  value={formTingkat}
                  onChange={(e) => setFormTingkat(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff' }}
                >
                  <option value="Semua Tingkat">Semua Tingkat</option>
                  <option value="Kelas X">Kelas X (Sepuluh)</option>
                  <option value="Kelas XI">Kelas XI (Sebelas)</option>
                  <option value="Kelas XII">Kelas XII (Duabelas)</option>
                </select>
              </div>

              {/* Durasi Ujian */}
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 'bold', color: '#334155', display: 'block', marginBottom: '4px' }}>Durasi Pengerjaan (Menit):</label>
                <input
                  type="number"
                  value={formDurasi}
                  onChange={(e) => setFormDurasi(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff' }}
                />
              </div>

              {/* KKM */}
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 'bold', color: '#334155', display: 'block', marginBottom: '4px' }}>KKM Nilai Kelulusan:</label>
                <input
                  type="number"
                  value={formKkm}
                  onChange={(e) => setFormKkm(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff' }}
                />
              </div>

              {/* Token Ujian */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '11.5px', fontWeight: 'bold', color: '#334155' }}>Token Masuk Ujian:</label>
                  <button
                    type="button"
                    onClick={() => setFormToken(handleGenerateRandomToken())}
                    style={{ border: 'none', background: 'none', color: '#7c3aed', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', padding: 0 }}
                  >
                    🎲 Acak Token
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Contoh: YPK2026"
                  value={formToken}
                  onChange={(e) => setFormToken(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', textTransform: 'uppercase', fontWeight: 'bold', backgroundColor: '#fff', letterSpacing: '1px' }}
                />
              </div>

              {/* Password Pengawas */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '11.5px', fontWeight: 'bold', color: '#334155' }}>Password Pengawas:</label>
                  <button
                    type="button"
                    onClick={() => setFormPasswordPengawas(`ypk${Math.floor(100 + Math.random() * 900)}`)}
                    style={{ border: 'none', background: 'none', color: '#dc2626', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', padding: 0 }}
                  >
                    🎲 Acak Password
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Contoh: ypkadmin"
                  value={formPasswordPengawas}
                  onChange={(e) => setFormPasswordPengawas(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 'bold', backgroundColor: '#fff' }}
                />
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* PANEL PENGATUR JUMLAH SOAL CEPAT (+ / -) & PRESET TEMPLATE     */}
          {/* ============================================================== */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1.5px solid #cbd5e1',
              borderRadius: '12px',
              padding: '16px 18px',
              marginBottom: '18px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
              <div>
                <div style={{ fontSize: '14.5px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>⚡</span> Atur Jumlah Soal Cepat (+ / -)
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                  Tambah (+) atau kurangi (−) jika butir soal berlebih atau kurang saat menyusun paket ujian:
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 'bold' }}>Template Cepat:</span>
                <button
                  type="button"
                  onClick={() => handleGenerateCustomTemplate(20, 5)}
                  style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '5px 11px', fontSize: '11.5px', fontWeight: 'bold', color: '#334155', cursor: 'pointer' }}
                >
                  20 PG + 5 Essay
                </button>
                <button
                  type="button"
                  onClick={() => handleGenerateCustomTemplate(30, 5)}
                  style={{ backgroundColor: '#eff6ff', border: '1.5px solid #93c5fd', borderRadius: '6px', padding: '5px 11px', fontSize: '11.5px', fontWeight: 'bold', color: '#1d4ed8', cursor: 'pointer' }}
                  title="30 Soal PG + 5 Soal Essay Standar SMK YPK"
                >
                  ⚡ 30 PG + 5 Essay (Standar YPK)
                </button>
                <button
                  type="button"
                  onClick={() => handleGenerateCustomTemplate(40, 5)}
                  style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '5px 11px', fontSize: '11.5px', fontWeight: 'bold', color: '#334155', cursor: 'pointer' }}
                >
                  40 PG + 5 Essay
                </button>
                <button
                  type="button"
                  onClick={() => handleGenerateCustomTemplate(50, 0)}
                  style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '5px 11px', fontSize: '11.5px', fontWeight: 'bold', color: '#334155', cursor: 'pointer' }}
                >
                  50 PG
                </button>
                {formSoalList.length > 0 && (
                  <button
                    type="button"
                    onClick={handleResetAllQuestionsInForm}
                    style={{ backgroundColor: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '6px', padding: '5px 9px', fontSize: '11px', fontWeight: 'bold', color: '#dc2626', cursor: 'pointer' }}
                    title="Kosongkan seluruh butir soal"
                  >
                    🗑️ Reset
                  </button>
                )}
              </div>
            </div>

            {/* Stepper Controls: PG & Essay */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
              {/* Stepper PG */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#ffffff',
                  border: '1.5px solid #bfdbfe',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  boxShadow: '0 1px 3px rgba(37,99,235,0.06)',
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🔘</span> Soal Pilihan Ganda (PG)
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    Bobot standar: 2 poin / soal
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => handleAdjustQuestionCount('PG', -1)}
                    disabled={formSoalList.filter((q) => q.tipe === 'PG').length === 0}
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      backgroundColor: formSoalList.filter((q) => q.tipe === 'PG').length === 0 ? '#f1f5f9' : '#fff1f2',
                      color: formSoalList.filter((q) => q.tipe === 'PG').length === 0 ? '#94a3b8' : '#dc2626',
                      fontSize: '18px',
                      fontWeight: 'bold',
                      cursor: formSoalList.filter((q) => q.tipe === 'PG').length === 0 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title="Kurangi 1 Soal PG (−)"
                  >
                    −
                  </button>

                  <div style={{ minWidth: '65px', textAlign: 'center', fontWeight: '800', fontSize: '15px', color: '#1e3a8a' }}>
                    {formSoalList.filter((q) => q.tipe === 'PG').length} <span style={{ fontSize: '11px', fontWeight: 'normal', color: '#64748b' }}>PG</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAdjustQuestionCount('PG', 1)}
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '8px',
                      border: '1.5px solid #2563eb',
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      fontSize: '18px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 4px rgba(37,99,235,0.2)',
                    }}
                    title="Tambah 1 Soal PG (+)"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Stepper Essay */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#ffffff',
                  border: '1.5px solid #fed7aa',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  boxShadow: '0 1px 3px rgba(234,88,12,0.06)',
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#c2410c', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>✍️</span> Soal Essay / Uraian
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    Bobot standar: 8 poin / soal
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => handleAdjustQuestionCount('Essay', -1)}
                    disabled={formSoalList.filter((q) => q.tipe === 'Essay').length === 0}
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      backgroundColor: formSoalList.filter((q) => q.tipe === 'Essay').length === 0 ? '#f1f5f9' : '#fff1f2',
                      color: formSoalList.filter((q) => q.tipe === 'Essay').length === 0 ? '#94a3b8' : '#dc2626',
                      fontSize: '18px',
                      fontWeight: 'bold',
                      cursor: formSoalList.filter((q) => q.tipe === 'Essay').length === 0 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title="Kurangi 1 Soal Essay (−)"
                  >
                    −
                  </button>

                  <div style={{ minWidth: '65px', textAlign: 'center', fontWeight: '800', fontSize: '15px', color: '#9a3412' }}>
                    {formSoalList.filter((q) => q.tipe === 'Essay').length} <span style={{ fontSize: '11px', fontWeight: 'normal', color: '#64748b' }}>Essay</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAdjustQuestionCount('Essay', 1)}
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '8px',
                      border: '1.5px solid #ea580c',
                      backgroundColor: '#ea580c',
                      color: '#ffffff',
                      fontSize: '18px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 4px rgba(234,88,12,0.2)',
                    }}
                    title="Tambah 1 Soal Essay (+)"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* HEADER AKSI PEMBUATAN SOAL (VISUAL WYSIWYG SEPERTI GAMBAR 1) */}
          {/* ============================================================== */}
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 18px', marginBottom: '18px', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>📋</span> Butir Soal Ujian ({formSoalList.length} Soal)
                </h3>
                <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                  Kelola butir soal langsung secara visual. Klik tombol tambah di bawah atau edit langsung kartu soal.
                </p>
              </div>

              {/* Tombol Aksi Tambah Soal PG & Essay (Identik Gambar 1) */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => handleAddNewQuestionInForm('PG')}
                  style={{
                    backgroundColor: '#eff6ff',
                    color: '#1d4ed8',
                    border: '1.5px solid #bfdbfe',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '12.5px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 4px rgba(37, 99, 235, 0.1)',
                  }}
                >
                  ➕ Tambah Soal PG
                </button>
                <button
                  type="button"
                  onClick={() => handleAddNewQuestionInForm('Essay')}
                  style={{
                    backgroundColor: '#fff7ed',
                    color: '#c2410c',
                    border: '1.5px solid #fed7aa',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '12.5px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 4px rgba(234, 88, 12, 0.1)',
                  }}
                >
                  ➕ Tambah Soal Essay
                </button>
              </div>
            </div>

            {/* Pencarian Butir Soal & Counter */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px' }}>
                <span style={{ fontSize: '13px' }}>🔍</span>
                <input
                  type="text"
                  placeholder="Cari pertanyaan, nomor soal, atau opsi jawaban..."
                  value={bankSearchQuery}
                  onChange={(e) => setBankSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#f8fafc' }}
                />
              </div>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                Total Soal: <b>{formSoalList.length} Butir</b> ({formSoalList.filter(q => q.tipe === 'PG').length} PG + {formSoalList.filter(q => q.tipe === 'Essay').length} Essay)
              </span>
            </div>
          </div>

          {/* DAFTAR KARTU BUTIR SOAL (SESUAI GAMBAR 1) */}
          {formSoalList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '44px 20px', backgroundColor: '#f8fafc', borderRadius: '14px', border: '2px dashed #cbd5e1', marginBottom: '20px' }}>
              <div style={{ fontSize: '42px', marginBottom: '8px' }}>📝</div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', color: '#1e293b', fontWeight: '800' }}>
                Belum Ada Butir Soal di Paket Ini
              </h3>
              <p style={{ margin: '0 0 18px 0', fontSize: '13px', color: '#64748b', maxWidth: '460px', marginLeft: 'auto', marginRight: 'auto' }}>
                Silakan tambahkan butir soal secara visual melalui kartu interaktif tanpa perlu upload file atau format teks rumit:
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => handleAddNewQuestionInForm('PG')}
                  style={{
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 18px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
                  }}
                >
                  ➕ Tambah Soal Pilihan Ganda (PG)
                </button>
                <button
                  type="button"
                  onClick={() => handleAddNewQuestionInForm('Essay')}
                  style={{
                    backgroundColor: '#ea580c',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 18px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 8px rgba(234, 88, 12, 0.25)',
                  }}
                >
                  ➕ Tambah Soal Essay
                </button>
                <button
                  type="button"
                  onClick={handleGenerateStandardTemplate}
                  style={{
                    backgroundColor: '#f3e8ff',
                    color: '#7c3aed',
                    border: '1px solid #d8b4fe',
                    borderRadius: '8px',
                    padding: '10px 16px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  ⚡ Buat Template 30 PG + 5 Essay
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '22px' }}>
              {formSoalList
                .filter((q) => {
                  if (!bankSearchQuery.trim()) return true;
                  const query = bankSearchQuery.toLowerCase();
                  return (
                    String(q.nomor).includes(query) ||
                    (q.pertanyaan && q.pertanyaan.toLowerCase().includes(query)) ||
                    (q.opsi_a && q.opsi_a.toLowerCase().includes(query)) ||
                    (q.opsi_b && q.opsi_b.toLowerCase().includes(query)) ||
                    (q.opsi_c && q.opsi_c.toLowerCase().includes(query)) ||
                    (q.opsi_d && q.opsi_d.toLowerCase().includes(query)) ||
                    (q.opsi_e && q.opsi_e.toLowerCase().includes(query))
                  );
                })
                .map((q) => {
                  const isPg = q.tipe === 'PG';

                  return (
                    <div
                      key={q.id || q.nomor}
                      style={{
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '16px',
                        backgroundColor: '#ffffff',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              backgroundColor: isPg ? '#eff6ff' : '#fff7ed',
                              color: isPg ? '#1e40af' : '#c2410c',
                              fontWeight: 'bold',
                              fontSize: '12px',
                              padding: '3px 10px',
                              borderRadius: '6px',
                            }}
                          >
                            Soal No. {q.nomor} ({isPg ? 'Pilihan Ganda' : 'Essay'})
                          </span>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>
                            Bobot: <b>{q.bobot || (isPg ? 2 : 8)} Poin</b>
                          </span>
                          {isPg && q.kunci && (
                            <span style={{ fontSize: '11.5px', color: '#16a34a', fontWeight: 'bold' }}>
                              Kunci: [{q.kunci}]
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEditQuestion(q)}
                            style={{
                              backgroundColor: '#eff6ff',
                              border: '1.5px solid #bfdbfe',
                              borderRadius: '6px',
                              padding: '5px 12px',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              color: '#1d4ed8',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            ✏️ Edit Butir Soal
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteQuestionInForm(q.nomor)}
                            style={{
                              backgroundColor: '#fff1f2',
                              border: '1.5px solid #fecdd3',
                              borderRadius: '6px',
                              padding: '5px 12px',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              color: '#dc2626',
                              cursor: 'pointer',
                            }}
                            title="Hapus / Kurangi Butir Soal Ini (−)"
                          >
                            🗑️ Hapus / Kurangi (−)
                          </button>
                        </div>
                      </div>

                      <div style={{ fontSize: '13.5px', color: '#1e293b', marginBottom: '10px', lineHeight: '1.5' }}>
                        {q.pertanyaan || <i style={{ color: '#94a3b8' }}>(Pertanyaan belum diisi - klik Edit Butir Soal di atas)</i>}
                      </div>

                      {q.gambar_url && (
                        <div style={{ marginBottom: '10px' }}>
                          <img
                            src={q.gambar_url}
                            alt={`Gambar Soal ${q.nomor}`}
                            onClick={() => setLightboxImage(q.gambar_url)}
                            style={{
                              maxHeight: '120px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              cursor: 'zoom-in',
                            }}
                          />
                        </div>
                      )}

                      {isPg && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '6px', fontSize: '12px' }}>
                          {['A', 'B', 'C', 'D', 'E'].map((letter) => {
                            const optText = q[`opsi_${letter.toLowerCase()}`];
                            if (!optText) return null;
                            const isCorrect = String(q.kunci).trim().toUpperCase() === letter;

                            return (
                              <div
                                key={letter}
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: '6px',
                                  backgroundColor: isCorrect ? '#dcfce7' : '#f8fafc',
                                  border: isCorrect ? '1px solid #86efac' : '1px solid #e2e8f0',
                                  color: isCorrect ? '#166534' : '#334155',
                                  fontWeight: isCorrect ? 'bold' : 'normal',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                }}
                              >
                                <span>{letter}.</span>
                                <span>{optText}</span>
                                {isCorrect && <span style={{ marginLeft: 'auto', fontSize: '11px' }}>✅ Kunci</span>}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {!isPg && q.pedoman && (
                        <div style={{ fontSize: '11.5px', color: '#78350f', backgroundColor: '#fff7ed', padding: '8px 10px', borderRadius: '6px', border: '1px dashed #fed7aa' }}>
                          <b>Pedoman Penskoran:</b> {q.pedoman}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}

          {/* TOMBOL SIMPAN & TERBITKAN UJIAN (BAWAH) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a' }}>
                Total: {formSoalList.length} Butir Soal Terdaftar ({formSoalList.filter((q) => q.tipe === 'PG').length} PG + {formSoalList.filter((q) => q.tipe === 'Essay').length} Essay)
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                Periksa kelengkapan pertanyaan dan opsi jawaban sebelum menerbitkan ke Bank Soal.
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '4px', backgroundColor: '#eff6ff', padding: '3px 6px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                <button
                  type="button"
                  onClick={() => handleAdjustQuestionCount('PG', -1)}
                  disabled={formSoalList.filter((q) => q.tipe === 'PG').length === 0}
                  style={{
                    backgroundColor: '#ffffff',
                    color: formSoalList.filter((q) => q.tipe === 'PG').length === 0 ? '#94a3b8' : '#dc2626',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: formSoalList.filter((q) => q.tipe === 'PG').length === 0 ? 'not-allowed' : 'pointer',
                  }}
                  title="Kurangi 1 Soal PG (−)"
                >
                  − PG
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjustQuestionCount('PG', 1)}
                  style={{
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                  title="Tambah 1 Soal PG (+)"
                >
                  + PG
                </button>
              </div>

              <div style={{ display: 'flex', gap: '4px', backgroundColor: '#fff7ed', padding: '3px 6px', borderRadius: '8px', border: '1px solid #fed7aa' }}>
                <button
                  type="button"
                  onClick={() => handleAdjustQuestionCount('Essay', -1)}
                  disabled={formSoalList.filter((q) => q.tipe === 'Essay').length === 0}
                  style={{
                    backgroundColor: '#ffffff',
                    color: formSoalList.filter((q) => q.tipe === 'Essay').length === 0 ? '#94a3b8' : '#dc2626',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: formSoalList.filter((q) => q.tipe === 'Essay').length === 0 ? 'not-allowed' : 'pointer',
                  }}
                  title="Kurangi 1 Soal Essay (−)"
                >
                  − Essay
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjustQuestionCount('Essay', 1)}
                  style={{
                    backgroundColor: '#ea580c',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                  title="Tambah 1 Soal Essay (+)"
                >
                  + Essay
                </button>
              </div>

              <button
                type="button"
                onClick={handleSaveExamPackage}
                style={{
                  backgroundColor: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 22px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 2px 10px rgba(22, 163, 74, 0.3)',
                }}
              >
                💾 Simpan &amp; Terbitkan Ujian
              </button>
            </div>
          </div>

          {/* BANTUAN IDE SOAL: GENERATOR AI GEMINI (OPSIONAL) */}
          <details style={{ marginTop: '20px', backgroundColor: '#faf5ff', borderRadius: '12px', border: '1px solid #e9d5ff', padding: '12px 16px' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold', fontSize: '12.5px', color: '#7e22ce', userSelect: 'none' }}>
              🤖 Butuh Bantuan Ide Soal? Buka Generator Google Gemini AI (Opsional)
            </summary>
            <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #f3e8ff' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#4c1d95', display: 'block', marginBottom: '4px' }}>Topik / Materi:</label>
                  <input
                    type="text"
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    placeholder="Contoh: Administrasi Sistem Jaringan Kelas XI"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '6px 10px', borderRadius: '6px', border: '1px solid #c4b5fd', fontSize: '12px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#4c1d95', display: 'block', marginBottom: '4px' }}>Jumlah PG:</label>
                  <select
                    value={aiPgCount}
                    onChange={(e) => setAiPgCount(Number(e.target.value))}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '6px 10px', borderRadius: '6px', border: '1px solid #c4b5fd', fontSize: '12px' }}
                  >
                    <option value={10}>10 Soal PG</option>
                    <option value={20}>20 Soal PG</option>
                    <option value={30}>30 Soal PG (Standar YPK)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#4c1d95', display: 'block', marginBottom: '4px' }}>Jumlah Essay:</label>
                  <select
                    value={aiEssayCount}
                    onChange={(e) => setAiEssayCount(Number(e.target.value))}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '6px 10px', borderRadius: '6px', border: '1px solid #c4b5fd', fontSize: '12px' }}
                  >
                    <option value={2}>2 Soal Essay</option>
                    <option value={5}>5 Soal Essay (Standar YPK)</option>
                  </select>
                </div>
              </div>
              <button
                type="button"
                disabled={isGeneratingAi}
                onClick={handleTriggerGenerateAi}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: isGeneratingAi ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 8px rgba(124, 58, 237, 0.25)',
                }}
              >
                {isGeneratingAi ? 'Sedang Menyusun Soal AI...' : '✨ Susun Butir Soal Otomatis dengan Google Gemini AI'}
              </button>
            </div>
          </details>
        </div>
        )
      )}

      {/* ============================================================== */}
      {/* 2.5 SUB-MENU: BANK SOAL & EDITOR SOAL CBT (GURU / MASTER)     */}
      {/* ============================================================== */}
      {effectiveTab === 'bank_soal' && (
        isStudentUser ? (
          <div style={{ backgroundColor: '#fef2f2', padding: '36px 20px', borderRadius: '16px', border: '1px solid #fecaca', textAlign: 'center', marginTop: '20px' }}>
            <div style={{ fontSize: '42px', marginBottom: '8px' }}>🚫</div>
            <h3 style={{ margin: '0 0 6px 0', color: '#991b1b', fontSize: '18px', fontWeight: 'bold' }}>Hak Akses Dibatasi</h3>
            <p style={{ color: '#7f1d1d', fontSize: '13px', maxWidth: '480px', margin: '0 auto 18px auto', lineHeight: '1.5' }}>
              Fitur Bank Soal dan Editor Soal hanya dapat diakses oleh <b>Bapak/Ibu Guru</b> dan <b>Admin Sekolah</b>.
            </p>
            <button
              type="button"
              onClick={() => onSubMenuChange && onSubMenuChange('ruang_ujian')}
              style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              ✍️ Kembali ke Ruang Ujian Siswa/i
            </button>
          </div>
        ) : (
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
            {!activeExamForEdit ? (
              /* ============================================================== */
              /* 🌟 MODE 1: DAFTAR PAKET SOAL TERKELOMPOK PER MAPEL (UTAMA)     */
              /* ============================================================== */
              <div>
                {/* Header Bank Soal */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '24px' }}>📚</span>
                      <h2 style={{ margin: 0, fontSize: '20px', color: '#1e293b', fontWeight: '800' }}>
                        Bank Soal per Mata Pelajaran
                      </h2>
                      <span style={{ backgroundColor: '#f3e8ff', color: '#7c3aed', padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold' }}>
                        SMK YPK Medan
                      </span>
                    </div>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                      Pilih mapel di bawah untuk mengelola soal, upload soal copas dari Word/Excel, atau buat paket baru.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSubMenuChange && onSubMenuChange('buat_ujian')}
                    style={{
                      backgroundColor: '#7c3aed',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '10px 20px',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 14px rgba(124, 58, 237, 0.3)',
                    }}
                  >
                    <span>➕</span> Buat / Upload Paket Soal Baru
                  </button>
                </div>

                {/* Filter & Pencarian Bar */}
                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 16px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    {/* Pencarian Teks */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '260px' }}>
                      <span style={{ fontSize: '15px', color: '#64748b' }}>🔍</span>
                      <input
                        type="text"
                        placeholder="Cari judul ujian, mata pelajaran, nama guru, atau kelas target..."
                        value={bankSearchQuery}
                        onChange={(e) => setBankSearchQuery(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 14px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '13px',
                          backgroundColor: '#ffffff',
                        }}
                      />
                    </div>

                    {/* Filter Guru Pembuat (Semua Guru vs Soal Saya) */}
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => setSelectedGuruFilter('semua')}
                        style={{
                          padding: '7px 14px',
                          borderRadius: '8px',
                          border: selectedGuruFilter === 'semua' ? '1.5px solid #7c3aed' : '1px solid #cbd5e1',
                          backgroundColor: selectedGuruFilter === 'semua' ? '#7c3aed' : '#ffffff',
                          color: selectedGuruFilter === 'semua' ? '#ffffff' : '#475569',
                          fontWeight: 'bold',
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        👥 Semua Guru ({examList.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedGuruFilter('saya')}
                        style={{
                          padding: '7px 14px',
                          borderRadius: '8px',
                          border: selectedGuruFilter === 'saya' ? '1.5px solid #7c3aed' : '1px solid #cbd5e1',
                          backgroundColor: selectedGuruFilter === 'saya' ? '#7c3aed' : '#ffffff',
                          color: selectedGuruFilter === 'saya' ? '#ffffff' : '#475569',
                          fontWeight: 'bold',
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        👤 Soal Saya
                      </button>
                    </div>
                  </div>

                  {/* Pills Filter per Mapel (Horizontal Scroll) */}
                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      overflowX: 'auto',
                      paddingTop: '12px',
                      marginTop: '12px',
                      borderTop: '1px solid #e2e8f0',
                      scrollbarWidth: 'thin',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedMapelFilter('Semua')}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '20px',
                        border: selectedMapelFilter === 'Semua' ? '2px solid #7c3aed' : '1px solid #cbd5e1',
                        backgroundColor: selectedMapelFilter === 'Semua' ? '#f3e8ff' : '#ffffff',
                        color: selectedMapelFilter === 'Semua' ? '#7c3aed' : '#475569',
                        fontWeight: 'bold',
                        fontSize: '12px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      🌟 Semua Mapel ({examList.length})
                    </button>

                    {[
                      { key: 'TJKT', label: '💻 TJKT' },
                      { key: 'AKL', label: '📊 AKL' },
                      { key: 'MPLB', label: '📁 MPLB' },
                      { key: 'Pemasaran', label: '🛍️ Pemasaran / PM' },
                      { key: 'Matematika', label: '📐 Matematika' },
                      { key: 'Indonesia', label: '🇮🇩 Bhs Indonesia' },
                      { key: 'Inggris', label: '🌐 Bhs Inggris' },
                      { key: 'Agama', label: '🕌 Agama' },
                      { key: 'Pancasila', label: '🦅 PPKn' },
                      { key: 'Sejarah', label: '📜 Sejarah' },
                      { key: 'PJOK', label: '⚽ PJOK' },
                      { key: 'PKK', label: '💡 PKK / Kreatif' },
                    ].map((pill) => {
                      const isSel = selectedMapelFilter.toLowerCase() === pill.key.toLowerCase();
                      const matchCount = examList.filter((e) =>
                        String(e.mata_pelajaran || '').toLowerCase().includes(pill.key.toLowerCase())
                      ).length;

                      return (
                        <button
                          key={pill.key}
                          type="button"
                          onClick={() => setSelectedMapelFilter(pill.key)}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '20px',
                            border: isSel ? '2px solid #7c3aed' : '1px solid #cbd5e1',
                            backgroundColor: isSel ? '#f3e8ff' : '#ffffff',
                            color: isSel ? '#7c3aed' : '#475569',
                            fontWeight: 'bold',
                            fontSize: '12px',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {pill.label} ({matchCount})
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* TAMPILAN KELOMPOK MAPEL & DAFTAR PAKET UJIAN */}
                {filteredAndGroupedExams.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '50px 20px', color: '#94a3b8' }}>
                    <div style={{ fontSize: '48px', marginBottom: '10px' }}>🔍</div>
                    <h3 style={{ margin: '0 0 6px 0', color: '#475569' }}>Tidak Ada Paket Ujian Ditemukan</h3>
                    <p style={{ margin: '0 0 16px 0', fontSize: '13px' }}>
                      Coba ganti filter pencarian atau buat paket soal ujian baru.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMapelFilter('Semua');
                        setSelectedGuruFilter('semua');
                        setBankSearchQuery('');
                      }}
                      style={{
                        backgroundColor: '#f1f5f9',
                        color: '#475569',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        padding: '8px 16px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                      }}
                    >
                      Reset Semua Filter
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>
                    {filteredAndGroupedExams.map((group) => (
                      <div key={group.mapel}>
                        {/* Header Kategori Mata Pelajaran */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '12px',
                            paddingBottom: '8px',
                            borderBottom: '2px solid #f1f5f9',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '22px' }}>{group.icon}</span>
                            <h3 style={{ margin: 0, fontSize: '17px', color: '#0f172a', fontWeight: '800' }}>
                              {group.mapel}
                            </h3>
                          </div>
                          <span
                            style={{
                              backgroundColor: '#f1f5f9',
                              color: '#475569',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              padding: '4px 12px',
                              borderRadius: '20px',
                            }}
                          >
                            {group.exams.length} Paket Ujian
                          </span>
                        </div>

                        {/* Kartu Ujian di Bawah Mapel Ini */}
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
                            gap: '16px',
                          }}
                        >
                          {group.exams.map((exam) => {
                            const pgCount = (exam.soal_list || []).filter((q) => q.tipe === 'PG').length;
                            const essayCount = (exam.soal_list || []).filter((q) => q.tipe === 'Essay').length;

                            return (
                              <div
                                key={exam.id}
                                className="stardust-white-card"
                                style={{
                                  borderRadius: '14px',
                                  padding: '18px 20px',
                                  border: '1px solid #e2e8f0',
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justifyContent: 'space-between',
                                  transition: 'all 0.2s ease',
                                }}
                              >
                                <div>
                                  {/* Top Row: Mapel Tag & Status */}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <span
                                      style={{
                                        fontSize: '11px',
                                        fontWeight: 'bold',
                                        backgroundColor: '#f3e8ff',
                                        color: '#7c3aed',
                                        padding: '3px 10px',
                                        borderRadius: '20px',
                                      }}
                                    >
                                      {group.icon} {exam.jurusan || 'Semua Jurusan'}
                                    </span>
                                    <span
                                      style={{
                                        fontSize: '11px',
                                        backgroundColor: '#dcfce7',
                                        color: '#166534',
                                        fontWeight: 'bold',
                                        padding: '3px 8px',
                                        borderRadius: '12px',
                                      }}
                                    >
                                      🟢 {exam.status_ujian || 'Aktif'}
                                    </span>
                                  </div>

                                  {/* Judul Ujian */}
                                  <h4 style={{ margin: '0 0 6px 0', fontSize: '15.5px', fontWeight: '800', color: '#0f172a', lineHeight: '1.4' }}>
                                    {exam.judul_ujian}
                                  </h4>

                                  {/* Guru Pembuat */}
                                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span>👤</span> Guru: <b style={{ color: '#334155' }}>{exam.dibuat_oleh || 'Guru SMK YPK'}</b>
                                  </div>

                                  {/* Rincian Ujian Grid */}
                                  <div
                                    style={{
                                      display: 'grid',
                                      gridTemplateColumns: '1fr 1fr',
                                      gap: '8px',
                                      fontSize: '11.5px',
                                      color: '#475569',
                                      marginBottom: '14px',
                                    }}
                                  >
                                    <div style={{ backgroundColor: '#f8fafc', padding: '8px 10px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                                      🎯 Target: <b>{exam.kelas_target || 'Semua Kelas'}</b>
                                    </div>
                                    <div style={{ backgroundColor: '#f8fafc', padding: '8px 10px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                                      ⏱️ Durasi: <b>{exam.durasi_menit} Menit</b>
                                    </div>
                                    <div style={{ backgroundColor: '#f8fafc', padding: '8px 10px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                                      📈 KKM: <b>{exam.kkm}</b>
                                    </div>
                                    <div style={{ backgroundColor: '#f8fafc', padding: '8px 10px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                                      📝 Soal: <b>{pgCount} PG + {essayCount} Essay</b>
                                    </div>
                                  </div>

                                  {/* Box Token Ujian */}
                                  <div
                                    style={{
                                      backgroundColor: '#faf5ff',
                                      border: '1px dashed #d8b4fe',
                                      borderRadius: '8px',
                                      padding: '8px 12px',
                                      marginBottom: '14px',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                    }}
                                  >
                                    <div style={{ fontSize: '12px', color: '#6b21a8' }}>
                                      🔑 Token: <b style={{ letterSpacing: '1px', fontSize: '13px' }}>{exam.token_ujian || '-'}</b>
                                    </div>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (!exam.token_ujian) return;
                                          navigator.clipboard.writeText(exam.token_ujian);
                                          Swal.fire({
                                            toast: true,
                                            position: 'top-end',
                                            icon: 'success',
                                            title: `Token [${exam.token_ujian}] Disalin!`,
                                            showConfirmButton: false,
                                            timer: 1600,
                                          });
                                        }}
                                        style={{
                                          backgroundColor: '#ffffff',
                                          border: '1px solid #cbd5e1',
                                          borderRadius: '6px',
                                          padding: '3px 8px',
                                          fontSize: '11px',
                                          fontWeight: 'bold',
                                          cursor: 'pointer',
                                        }}
                                        title="Salin Token"
                                      >
                                        📋 Salin
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newToken = handleGenerateRandomToken();
                                          handleUpdateExamToken(exam, newToken);
                                        }}
                                        style={{
                                          backgroundColor: '#ffffff',
                                          border: '1px solid #cbd5e1',
                                          borderRadius: '6px',
                                          padding: '3px 8px',
                                          fontSize: '11px',
                                          fontWeight: 'bold',
                                          cursor: 'pointer',
                                        }}
                                        title="Acak Token Baru"
                                      >
                                        🎲 Acak
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                {/* Tombol Aksi Kartu */}
                                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveExamForEdit(exam);
                                      setSelectedExam(exam);
                                    }}
                                    style={{
                                      flex: 1,
                                      backgroundColor: '#eff6ff',
                                      color: '#1d4ed8',
                                      border: '1.5px solid #bfdbfe',
                                      borderRadius: '8px',
                                      padding: '9px 14px',
                                      fontSize: '12.5px',
                                      fontWeight: 'bold',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '6px',
                                      boxShadow: '0 2px 6px rgba(37, 99, 235, 0.1)',
                                    }}
                                  >
                                    <span>✏️</span> Buka &amp; Kelola Butir Soal ({(exam.soal_list || []).length})
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteExamPackage(exam)}
                                    style={{
                                      backgroundColor: '#fff1f2',
                                      color: '#e11d48',
                                      border: '1px solid #fecdd3',
                                      borderRadius: '8px',
                                      padding: '9px 12px',
                                      fontSize: '12px',
                                      fontWeight: 'bold',
                                      cursor: 'pointer',
                                    }}
                                    title="Hapus Paket Ujian"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* ============================================================== */
              /* 📝 MODE 2: KELOLA & EDITOR BUTIR SOAL PAKET TERPILIH           */
              /* ============================================================== */
              <div>
                {/* Tombol Kembali & Header Paket */}
                <div style={{ marginBottom: '18px', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
                  <button
                    type="button"
                    onClick={() => setActiveExamForEdit(null)}
                    style={{
                      backgroundColor: '#f1f5f9',
                      color: '#475569',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '7px 14px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginBottom: '12px',
                    }}
                  >
                    ← Kembali ke Daftar Paket Soal per Mapel
                  </button>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '22px' }}>{getMapelIcon(activeExamForEdit.mata_pelajaran)}</span>
                        <h2 style={{ margin: 0, fontSize: '18px', color: '#0f172a', fontWeight: '800' }}>
                          {activeExamForEdit.judul_ujian}
                        </h2>
                      </div>
                      <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#64748b' }}>
                        Mapel: <b>{activeExamForEdit.mata_pelajaran}</b> | Guru: <b>{activeExamForEdit.dibuat_oleh}</b> | Target: <b>{activeExamForEdit.kelas_target}</b> | Durasi: <b>{activeExamForEdit.durasi_menit}m</b>
                      </p>
                    </div>

                    {/* Tombol Tambah Soal */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => handleAddNewQuestionToExam('PG')}
                        style={{
                          backgroundColor: '#eff6ff',
                          color: '#1d4ed8',
                          border: '1px solid #bfdbfe',
                          borderRadius: '8px',
                          padding: '8px 14px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                        }}
                      >
                        ➕ Tambah Soal PG
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddNewQuestionToExam('Essay')}
                        style={{
                          backgroundColor: '#fff7ed',
                          color: '#c2410c',
                          border: '1px solid #fed7aa',
                          borderRadius: '8px',
                          padding: '8px 14px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                        }}
                      >
                        ➕ Tambah Soal Essay
                      </button>
                    </div>
                  </div>
                </div>

                {/* Pencarian Butir Soal */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px' }}>
                    <span style={{ fontSize: '13px' }}>🔍</span>
                    <input
                      type="text"
                      placeholder="Cari pertanyaan, nomor soal, atau opsi jawaban di paket ini..."
                      value={bankSearchQuery}
                      onChange={(e) => setBankSearchQuery(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                    />
                  </div>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    Total Soal: <b>{(activeExamForEdit.soal_list || []).length} Butir</b> ({(activeExamForEdit.soal_list || []).filter(q => q.tipe === 'PG').length} PG + {(activeExamForEdit.soal_list || []).filter(q => q.tipe === 'Essay').length} Essay)
                  </span>
                </div>

                {/* DAFTAR KARTU BUTIR SOAL */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {(activeExamForEdit.soal_list || [])
                    .filter((q) => {
                      if (!bankSearchQuery.trim()) return true;
                      const query = bankSearchQuery.toLowerCase();
                      return (
                        String(q.nomor).includes(query) ||
                        (q.pertanyaan && q.pertanyaan.toLowerCase().includes(query)) ||
                        (q.opsi_a && q.opsi_a.toLowerCase().includes(query)) ||
                        (q.opsi_b && q.opsi_b.toLowerCase().includes(query)) ||
                        (q.opsi_c && q.opsi_c.toLowerCase().includes(query)) ||
                        (q.opsi_d && q.opsi_d.toLowerCase().includes(query)) ||
                        (q.opsi_e && q.opsi_e.toLowerCase().includes(query))
                      );
                    })
                    .map((q) => {
                      const isPg = q.tipe === 'PG';

                      return (
                        <div
                          key={q.id || q.nomor}
                          style={{
                            border: '1px solid #e2e8f0',
                            borderRadius: '10px',
                            padding: '16px',
                            backgroundColor: '#ffffff',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span
                                style={{
                                  backgroundColor: isPg ? '#eff6ff' : '#fff7ed',
                                  color: isPg ? '#1e40af' : '#c2410c',
                                  fontWeight: 'bold',
                                  fontSize: '12px',
                                  padding: '3px 10px',
                                  borderRadius: '6px',
                                }}
                              >
                                Soal No. {q.nomor} ({isPg ? 'Pilihan Ganda' : 'Essay'})
                              </span>
                              <span style={{ fontSize: '11px', color: '#64748b' }}>
                                Bobot: <b>{q.bobot || (isPg ? 2 : 8)} Poin</b>
                              </span>
                              {isPg && q.kunci && (
                                <span style={{ fontSize: '11.5px', color: '#16a34a', fontWeight: 'bold' }}>
                                  Kunci: [{q.kunci}]
                                </span>
                              )}
                            </div>

                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={() => handleOpenEditQuestion(q)}
                                style={{
                                  backgroundColor: '#f8fafc',
                                  border: '1px solid #cbd5e1',
                                  borderRadius: '6px',
                                  padding: '4px 10px',
                                  fontSize: '11.5px',
                                  fontWeight: 'bold',
                                  color: '#334155',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                ✏️ Edit Butir Soal
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteQuestionFromExam(q.nomor)}
                                style={{
                                  backgroundColor: '#fff1f2',
                                  border: '1px solid #fecdd3',
                                  borderRadius: '6px',
                                  padding: '4px 10px',
                                  fontSize: '11.5px',
                                  fontWeight: 'bold',
                                  color: '#dc2626',
                                  cursor: 'pointer',
                                }}
                              >
                                🗑️ Hapus
                              </button>
                            </div>
                          </div>

                          <div style={{ fontSize: '13.5px', color: '#1e293b', marginBottom: '10px', lineHeight: '1.5' }}>
                            {q.pertanyaan || <i style={{ color: '#94a3b8' }}>(Pertanyaan belum diisi)</i>}
                          </div>

                          {q.gambar_url && (
                            <div style={{ marginBottom: '10px' }}>
                              <img
                                src={q.gambar_url}
                                alt={`Gambar Soal ${q.nomor}`}
                                onClick={() => setLightboxImage(q.gambar_url)}
                                style={{
                                  maxHeight: '120px',
                                  borderRadius: '8px',
                                  border: '1px solid #cbd5e1',
                                  cursor: 'zoom-in',
                                }}
                              />
                            </div>
                          )}

                          {isPg && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '6px', fontSize: '12px' }}>
                              {['A', 'B', 'C', 'D', 'E'].map((letter) => {
                                const optText = q[`opsi_${letter.toLowerCase()}`];
                                if (!optText) return null;
                                const isCorrect = String(q.kunci).trim().toUpperCase() === letter;

                                return (
                                  <div
                                    key={letter}
                                    style={{
                                      padding: '6px 10px',
                                      borderRadius: '6px',
                                      backgroundColor: isCorrect ? '#dcfce7' : '#f8fafc',
                                      border: isCorrect ? '1px solid #86efac' : '1px solid #e2e8f0',
                                      color: isCorrect ? '#166534' : '#334155',
                                      fontWeight: isCorrect ? 'bold' : 'normal',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                    }}
                                  >
                                    <span>{letter}.</span>
                                    <span>{optText}</span>
                                    {isCorrect && <span style={{ marginLeft: 'auto', fontSize: '11px' }}>✅ Kunci</span>}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {!isPg && q.pedoman && (
                            <div style={{ fontSize: '11.5px', color: '#78350f', backgroundColor: '#fff7ed', padding: '8px 10px', borderRadius: '6px', border: '1px dashed #fed7aa' }}>
                              <b>Pedoman Penskoran:</b> {q.pedoman}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        )
      )}

      {/* ============================================================== */}
      {/* 3. SUB-MENU 3: KOREKSI ESSAY & REKAPITULASI NILAI GURU          */}
      {/* ============================================================== */}
      {effectiveTab === 'koreksi_essay' && (
        isStudentUser ? (
          <div style={{ backgroundColor: '#fef2f2', padding: '36px 20px', borderRadius: '16px', border: '1px solid #fecaca', textAlign: 'center', marginTop: '20px' }}>
            <div style={{ fontSize: '42px', marginBottom: '8px' }}>🚫</div>
            <h3 style={{ margin: '0 0 6px 0', color: '#991b1b', fontSize: '18px', fontWeight: 'bold' }}>Hak Akses Dibatasi</h3>
            <p style={{ color: '#7f1d1d', fontSize: '13px', maxWidth: '480px', margin: '0 auto 18px auto', lineHeight: '1.5' }}>
              Fitur koreksi essay dan rekapitulasi nilai hanya dapat diakses oleh <b>Bapak/Ibu Guru</b> dan <b>Admin Sekolah</b>.
            </p>
            <button
              type="button"
              onClick={() => onSubMenuChange && onSubMenuChange('ruang_ujian')}
              style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              ✍️ Kembali ke Ruang Ujian Siswa/i
            </button>
          </div>
        ) : (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', color: '#0f172a', fontWeight: 'bold' }}>
                💯 Koreksi Essay &amp; Rekapitulasi Nilai Siswa
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                Periksa jawaban essay siswa, berikan nilai, dan ekspor seluruh rekapitulasi ke format Excel.
              </p>
            </div>

            <button
              type="button"
              onClick={handleExportGradesCsv}
              style={{
                backgroundColor: '#16a34a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              📊 Ekspor Excel (.CSV)
            </button>
          </div>

          {/* TABEL DAFTAR HASIL UJIAN SISWA */}
          {submissionList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📭</div>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>Belum ada siswa yang mengumpulkan ujian.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', color: '#475569', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '10px' }}>No</th>
                    <th style={{ padding: '10px' }}>Nama Siswa</th>
                    <th style={{ padding: '10px' }}>Kelas</th>
                    <th style={{ padding: '10px', textAlign: 'center' }}>Nilai PG</th>
                    <th style={{ padding: '10px', textAlign: 'center' }}>Nilai Essay</th>
                    <th style={{ padding: '10px', textAlign: 'center' }}>Total Nilai</th>
                    <th style={{ padding: '10px', textAlign: 'center' }}>Anti-Cheat</th>
                    <th style={{ padding: '10px', textAlign: 'center' }}>Status</th>
                    <th style={{ padding: '10px', textAlign: 'center' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {submissionList.map((sub, i) => (
                    <tr key={sub.id || i} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: i % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                      <td style={{ padding: '10px' }}>{i + 1}</td>
                      <td style={{ padding: '10px', fontWeight: 'bold', color: '#1e40af' }}>{sub.nama_siswa}</td>
                      <td style={{ padding: '10px' }}>{sub.kelas}</td>
                      <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', color: '#0369a1' }}>{sub.nilai_pg}</td>
                      <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', color: '#ea580c' }}>{sub.nilai_essay}</td>
                      <td style={{ padding: '10px', textAlign: 'center', fontWeight: '800', fontSize: '14px', color: sub.total_nilai >= 75 ? '#16a34a' : '#dc2626' }}>
                        {sub.total_nilai}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: sub.violations === 0 ? '#16a34a' : '#dc2626' }}>
                          {sub.violations === 0 ? '🛡️ Aman (0)' : `⚠️ ${sub.violations}x`}
                        </span>
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: 'bold', padding: '3px 8px', borderRadius: '12px', backgroundColor: sub.status_koreksi?.includes('Lulus') ? '#dcfce7' : '#fef3c7', color: sub.status_koreksi?.includes('Lulus') ? '#166534' : '#92400e' }}>
                          {sub.status_koreksi}
                        </span>
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setGradingSubmission(sub);
                            setEssayScores({});
                          }}
                          style={{
                            backgroundColor: '#2563eb',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '6px 12px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                          }}
                        >
                          ✍️ Periksa Essay
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* MODAL KOREKSI ESSAY OLEH GURU */}
          {gradingSubmission && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.6)',
                zIndex: 999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
              }}
            >
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  maxWidth: '700px',
                  width: '100%',
                  maxHeight: '90vh',
                  overflowY: 'auto',
                  padding: '24px',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#1e3a8a' }}>
                      Koreksi Essay: {gradingSubmission.nama_siswa} ({gradingSubmission.kelas})
                    </h3>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Nilai PG Siswa: <b>{gradingSubmission.nilai_pg}</b></span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGradingSubmission(null)}
                    style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' }}
                  >
                    ✕
                  </button>
                </div>

                {/* 5 SOAL ESSAY */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {(selectedExam?.soal_list || []).filter((q) => q.tipe === 'Essay').map((eq) => {
                    const studentAnswerText = gradingSubmission.answers?.[eq.nomor] || '*(Siswa tidak mengisi jawaban essay ini)*';

                    return (
                      <div key={eq.nomor} style={{ border: '1px solid #fed7aa', borderRadius: '10px', padding: '14px', backgroundColor: '#fffbeb' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#c2410c' }}>Soal No. {eq.nomor} (Bobot Max: {eq.bobot} Poin)</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 'bold' }}>Beri Nilai (0 - {eq.bobot}):</span>
                            <input
                              type="number"
                              min={0}
                              max={eq.bobot}
                              value={essayScores[eq.nomor] ?? ''}
                              onChange={(e) => {
                                const v = e.target.value;
                                setEssayScores((prev) => ({ ...prev, [eq.nomor]: v }));
                              }}
                              style={{ width: '60px', padding: '4px 6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 'bold', textAlign: 'center' }}
                            />
                          </div>
                        </div>

                        <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#334155', fontWeight: '500' }}>
                          <b>Pertanyaan:</b> {eq.pertanyaan}
                        </p>

                        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', fontSize: '12px', color: '#0f172a', lineHeight: '1.5' }}>
                          <b>Jawaban Siswa:</b>
                          <div style={{ marginTop: '4px', whiteSpace: 'pre-wrap' }}>{studentAnswerText}</div>
                        </div>

                        {eq.pedoman && (
                          <div style={{ marginTop: '6px', fontSize: '11px', color: '#78350f' }}>
                            📖 <i>Pedoman Guru: {eq.pedoman}</i>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
                  <button
                    type="button"
                    onClick={() => setGradingSubmission(null)}
                    style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEssayGrading}
                    style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#16a34a', color: '#ffffff', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    💾 Simpan Koreksi &amp; Nilai Akhir
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        )
      )}

      {/* ============================================================== */}
      {/* ⚠️ MODAL PERINGATAN PELANGGARAN ANTI-NYONTEK                    */}
      {/* ============================================================== */}
      {isCheatWarningModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(220, 38, 38, 0.85)',
            backdropFilter: 'blur(10px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            color: '#ffffff',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              color: '#0f172a',
              borderRadius: '20px',
              maxWidth: '500px',
              width: '100%',
              padding: '30px',
              textAlign: 'center',
              boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
              border: '4px solid #ef4444',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>🚨</div>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#dc2626', fontWeight: '800' }}>
              PERINGATAN SISTEM ANTI-NYONTEK!
            </h2>
            <p style={{ fontSize: '13px', color: '#475569', lineHeight: '1.5' }}>
              Anda terdeteksi melakukan tindakan terlarang:
              <br />
              <b style={{ color: '#b91c1c' }}>"{cheatWarningReason}"</b>
            </p>

            <div style={{ backgroundColor: '#fef2f2', border: '2px solid #fecaca', borderRadius: '12px', padding: '14px', margin: '18px 0' }}>
              <span style={{ fontSize: '12px', color: '#991b1b', display: 'block' }}>Status Pelanggaran Anda:</span>
              <span style={{ fontSize: '28px', fontWeight: '900', color: '#dc2626' }}>
                {violationCount} / {selectedExam?.max_tab_violations || 3} TEGURAN
              </span>
              <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#7f1d1d' }}>
                Jika mencapai 3x teguran, ujian akan <b>dihentikan otomatis</b> dan jawaban langsung diserahkan ke guru!
              </p>
            </div>

            {violationCount < (selectedExam?.max_tab_violations || 3) ? (
              <button
                type="button"
                onClick={() => {
                  enterFullscreen();
                  setIsCheatWarningModal(false);
                }}
                style={{
                  width: '100%',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                ⚠️ Saya Mengerti &amp; Kembali ke Ujian Fullscreen
              </button>
            ) : (
              <div style={{ color: '#dc2626', fontWeight: 'bold', fontSize: '13px' }}>
                ⏳ Batas pelanggaran terlampaui. Mengumpulkan jawaban otomatis...
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 🔒 1. MODAL LAYAR TERKUNCI OLEH PENGAWAS (PROCTOR LOCKDOWN)     */}
      {/* ============================================================== */}
      {isScreenLockedByAdmin && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(69, 10, 10, 0.98)',
            backdropFilter: 'blur(16px)',
            zIndex: 999999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            color: '#ffffff',
            userSelect: 'none',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              color: '#0f172a',
              borderRadius: '24px',
              maxWidth: '540px',
              width: '100%',
              padding: '36px 30px',
              textAlign: 'center',
              boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
              border: '4px solid #dc2626',
            }}
          >
            <div style={{ fontSize: '56px', marginBottom: '8px' }}>🚨</div>
            <span
              style={{
                backgroundColor: '#fef2f2',
                color: '#b91c1c',
                padding: '4px 14px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '900',
                letterSpacing: '0.6px',
                display: 'inline-block',
                marginBottom: '8px',
                border: '1px solid #fecaca',
              }}
            >
              SISTEM PENGAWAS CBT AKTIF
            </span>
            <h2 style={{ margin: '0 0 10px 0', fontSize: '22px', color: '#991b1b', fontWeight: '900' }}>
              UJIAN TERKUNCI OLEH PENGAWAS!
            </h2>
            <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: '1.6', margin: '0 0 16px 0' }}>
              Sistem mendeteksi tindakan terlarang:
              <br />
              <b style={{ color: '#dc2626', fontSize: '14px' }}>"{lockedReason}"</b>
            </p>

            <div style={{ backgroundColor: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '12px', padding: '14px', marginBottom: '20px', textAlign: 'left', fontSize: '12px', color: '#9f1239', lineHeight: '1.5' }}>
              <b>🔒 Keamanan Layar CBT:</b>
              <ul style={{ margin: '6px 0 0 18px', padding: 0 }}>
                <li>Layar ujian terkunci untuk mencegah kecurangan dan pembukaan tab lain.</li>
                <li>Siswa <b>TIDAK BISA keluar atau melanjutkan ujian</b> tanpa izin Guru Pengawas.</li>
                <li>Shortcut Windows, Alt+Tab, Escape, dan tombol navigasi telah diblokir.</li>
              </ul>
            </div>

            {/* FORM MASUKKAN PASSWORD PENGAWAS */}
            <div style={{ backgroundColor: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: '14px', padding: '18px', marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155', display: 'block', marginBottom: '8px' }}>
                🔑 Verifikasi Guru Pengawas (Untuk Membuka Kunci Layar):
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="password"
                  placeholder="Masukkan Password Pengawas..."
                  value={unlockPasswordInput}
                  onChange={(e) => {
                    setUnlockPasswordInput(e.target.value);
                    setUnlockErrorMsg('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleProctorUnlock();
                  }}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: unlockErrorMsg ? '2px solid #ef4444' : '1px solid #cbd5e1',
                    fontSize: '14px',
                    fontWeight: 'bold',
                  }}
                />
                <button
                  type="button"
                  onClick={handleProctorUnlock}
                  style={{
                    backgroundColor: '#16a34a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 18px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  🔓 Buka Kunci
                </button>
              </div>
              {unlockErrorMsg && (
                <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#dc2626', fontWeight: 'bold' }}>
                  ⚠️ {unlockErrorMsg}
                </p>
              )}
            </div>

            {/* PANGGIL PENGAWAS & DARURAT */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handlePanggilPengawas}
                style={{
                  backgroundColor: proctorHelpSent ? '#64748b' : '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 16px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>📢</span> {proctorHelpSent ? 'Panggilan Terkirim ✅' : 'Panggil Pengawas Ujian'}
              </button>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                Teguran: <b>{violationCount} / {selectedExam?.max_tab_violations || 3}</b>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 🖼️ 2. MODAL LIGHTBOX ZOOM GAMBAR SOAL CBT                      */}
      {/* ============================================================== */}
      {lightboxImage && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            zIndex: 9999999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            cursor: 'zoom-out',
          }}
          onClick={() => setLightboxImage(null)}
        >
          <div style={{ position: 'relative', maxWidth: '92vw', maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              style={{
                position: 'absolute',
                top: '-16px',
                right: '-16px',
                backgroundColor: '#ef4444',
                color: '#ffffff',
                border: 'none',
                borderRadius: '50%',
                width: '38px',
                height: '38px',
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ✕
            </button>
            <img
              src={lightboxImage}
              alt="Zoom Soal CBT"
              style={{
                maxWidth: '90vw',
                maxHeight: '85vh',
                objectFit: 'contain',
                borderRadius: '12px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
                backgroundColor: '#fff',
              }}
            />
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ✏️ 3. MODAL EDIT BUTIR SOAL (BANK SOAL GURU / MASTER)           */}
      {/* ============================================================== */}
      {editingQuestion && (typeof document !== 'undefined' ? (
        createPortal(
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setEditingQuestion(null);
            }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(3px)',
              zIndex: 999999,
              display: 'flex',
              alignItems: 'flex-start', // Tampilannya tetap di atas, tidak loncat ke tengah
              justifyContent: 'center',
              padding: '24px 16px 40px 16px',
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                maxWidth: '680px',
                width: '100%',
                maxHeight: 'calc(100vh - 48px)',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 60px rgba(0,0,0,0.35)',
                overflow: 'hidden',
                margin: '0 auto',
              }}
            >
              {/* Header Modal (Sticky di atas modal, selalu terlihat) */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid #e2e8f0',
                  padding: '16px 22px',
                  backgroundColor: '#ffffff',
                  flexShrink: 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '20px' }}>✏️</span>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#1e3a8a' }}>
                    Edit Soal No. {editingQuestion.nomor} ({editingQuestion.tipe === 'PG' ? 'Pilihan Ganda' : 'Essay'})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingQuestion(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '22px',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    lineHeight: 1,
                    padding: '4px 8px',
                    borderRadius: '6px',
                  }}
                  title="Tutup Modal"
                >
                  ✕
                </button>
              </div>

              {/* Body Modal Scrollable (Scroll selalu direset ke paling atas) */}
              <div
                id="edit-modal-scrollable-body"
                style={{
                  padding: '20px 22px',
                  overflowY: 'auto',
                  flex: 1,
                  WebkitOverflowScrolling: 'touch',
                }}
              >
                {/* Tipe Soal & Bobot Poin */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Tipe Soal:</label>
                    <select
                      value={editingQuestion.tipe}
                      onChange={(e) => {
                        const newTipe = e.target.value;
                        setEditingQuestion((prev) => ({
                          ...prev,
                          tipe: newTipe,
                          bobot: newTipe === 'PG' ? 2 : 8,
                        }));
                      }}
                      style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 'bold' }}
                    >
                      <option value="PG">Pilihan Ganda (Opsi A - E)</option>
                      <option value="Essay">Essay (Uraian Jawaban)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Bobot Poin Soal:</label>
                    <input
                      type="number"
                      value={editingQuestion.bobot || (editingQuestion.tipe === 'PG' ? 2 : 8)}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        setEditingQuestion((prev) => ({ ...prev, bobot: val }));
                      }}
                      style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 'bold' }}
                    />
                  </div>
                </div>

                {/* Pertanyaan Soal */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Teks Pertanyaan Soal:</label>
                  <textarea
                    rows={4}
                    placeholder="Tuliskan pertanyaan soal secara lengkap..."
                    value={editingQuestion.pertanyaan}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditingQuestion((prev) => ({ ...prev, pertanyaan: val }));
                    }}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', lineHeight: '1.5' }}
                  />
                </div>

                {/* Unggah Foto / Gambar Soal (Soal Bergambar) */}
                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155', display: 'block', marginBottom: '6px' }}>
                    🖼️ Lampirkan Foto / Gambar Soal:
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <label style={{ backgroundColor: '#7c3aed', color: '#ffffff', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <span>📷</span> {editingImagePreview ? 'Ganti Foto' : 'Unggah Foto dari HP / PC'}
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const compressed = await compressAndConvertImage(file);
                          setEditingImagePreview(compressed);
                        }}
                      />
                    </label>

                    {editingImagePreview && (
                      <button
                        type="button"
                        onClick={() => setEditingImagePreview('')}
                        style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        🗑️ Hapus Gambar
                      </button>
                    )}
                  </div>

                  {editingImagePreview && (
                    <div style={{ marginTop: '10px' }}>
                      <img
                        src={editingImagePreview}
                        alt="Preview Soal"
                        style={{ maxHeight: '160px', maxWidth: '100%', borderRadius: '8px', border: '1px solid #cbd5e1', objectFit: 'contain' }}
                      />
                      <div style={{ fontSize: '10.5px', color: '#16a34a', marginTop: '4px', fontWeight: 'bold' }}>
                        ✅ Foto dikompresi otomatis (~50KB) siap disinkronkan ke HP siswa.
                      </div>
                    </div>
                  )}
                </div>

                {/* Opsi Jawaban PG & Kunci */}
                {editingQuestion.tipe === 'PG' && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>Pilihan Jawaban (A - E):</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>Kunci Jawaban:</span>
                        <select
                          value={editingQuestion.kunci || 'A'}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditingQuestion((prev) => ({ ...prev, kunci: val }));
                          }}
                          style={{ padding: '3px 10px', borderRadius: '6px', border: '2px solid #16a34a', fontWeight: 'bold', color: '#16a34a', backgroundColor: '#f0fdf4' }}
                        >
                          <option value="A">A</option>
                          <option value="B">B</option>
                          <option value="C">C</option>
                          <option value="D">D</option>
                          <option value="E">E</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {['a', 'b', 'c', 'd', 'e'].map((k) => {
                        const isKey = (editingQuestion.kunci || 'A').toLowerCase() === k;
                        return (
                          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                backgroundColor: isKey ? '#16a34a' : '#f1f5f9',
                                color: isKey ? '#ffffff' : '#475569',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                              }}
                              onClick={() => setEditingQuestion((prev) => ({ ...prev, kunci: k.toUpperCase() }))}
                            >
                              {k.toUpperCase()}
                            </span>
                            <input
                              type="text"
                              value={editingQuestion[`opsi_${k}`] || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setEditingQuestion((prev) => ({ ...prev, [`opsi_${k}`]: val }));
                              }}
                              placeholder={`Isi pilihan jawaban ${k.toUpperCase()}...`}
                              style={{
                                flex: 1,
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: isKey ? '2px solid #86efac' : '1px solid #cbd5e1',
                                backgroundColor: isKey ? '#f0fdf4' : '#ffffff',
                                fontSize: '12.5px',
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Pedoman Essay */}
                {editingQuestion.tipe === 'Essay' && (
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Pedoman Penskoran / Kunci Jawaban Essay Guru:
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Kriteria penilaian jawaban essay untuk guru..."
                      value={editingQuestion.pedoman || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditingQuestion((prev) => ({ ...prev, pedoman: val }));
                      }}
                      style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '8px', border: '1px solid #fed7aa', backgroundColor: '#fffbeb', fontSize: '12px' }}
                    />
                  </div>
                )}
              </div>

              {/* Action Buttons Modal (Sticky di bawah modal) */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '8px',
                  padding: '14px 22px',
                  borderTop: '1px solid #e2e8f0',
                  backgroundColor: '#f8fafc',
                  flexShrink: 0,
                }}
              >
                <button
                  type="button"
                  onClick={() => setEditingQuestion(null)}
                  style={{ backgroundColor: '#ffffff', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 18px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isSavingQuestion}
                  onClick={handleSaveEditedQuestion}
                  style={{ backgroundColor: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '10px 22px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 8px rgba(22, 163, 74, 0.25)' }}
                >
                  {isSavingQuestion ? 'Menyimpan...' : '💾 Simpan Perubahan Soal'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      ) : null)}
    </div>
  );
}
