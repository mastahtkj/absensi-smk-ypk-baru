/**
 * 📄 AI OCR & DOCUMENT PARSER FOR ATTENDANCE SHEETS (JPG, PNG, PDF)
 * Extracts student & teacher names automatically from scanned photos or PDF documents.
 */

// CDN Loaders for Tesseract.js and PDF.js
const TESSERACT_CDN = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

export function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('Browser only'));
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (existing.getAttribute('data-loaded') === 'true') {
        return resolve();
      }
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', (err) => reject(err));
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.setAttribute('data-loaded', 'true');
      resolve();
    };
    script.onerror = (err) => reject(err);
    document.head.appendChild(script);
  });
}

/**
 * Filter dan bersihkan baris teks agar hanya menyisakan nama siswa/guru yang valid
 */
export function extractNamesFromText(rawText) {
  if (!rawText || typeof rawText !== 'string') return [];

  // Daftar kata kunci header, kolom, & istilah absensi yang harus dibuang
  const IGNORE_PATTERNS = [
    /^no\.?$/i,
    /^nama(\s+siswa|\s+guru|\s+lengkap)?$/i,
    /^(l|p|l\/p|jk)$/i,
    /^(nis|nisn|nip|nik)$/i,
    /^(h|s|i|a|alpa|izin|sakit|hadir)$/i,
    /daftar\s+hadir/i,
    /absensi/i,
    /smk\s+ypk/i,
    /yayasan\s+pendidikan/i,
    /tahun\s+pelajaran/i,
    /tahun\s+ajaran/i,
    /semester/i,
    /wali\s+kelas/i,
    /guru\s+mata\s+pelajaran/i,
    /tanda\s+tangan/i,
    /paraf/i,
    /keterangan/i,
    /kehadiran/i,
    /jumlah/i,
    /persentase/i,
    /rekapitulasi/i,
    /total/i,
    /halaman/i,
    /page\s+\d+/i,
    /senin|selasa|rabu|kamis|jumat|sabtu|minggu/i,
    /januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember/i,
  ];

  const lines = rawText
    .split(/[\r\n]+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const candidates = [];
  const seen = new Set();

  for (let line of lines) {
    // 1. Bersihkan karakter non-alfabet di awal (nomor urut seperti "1.", "01)", "1 -", bullet points)
    let cleaned = line
      .replace(/^[\s\d\.\,\-\)\(\[\]\*\#\:\;\>\|\\\/]+/, '')
      .replace(/[\d\.\,\-\)\(\[\]\*\#\:\;\>\|\\\/]+$/, '')
      .replace(/[\|_~`^]+/g, ' ')
      .trim();

    // 2. Bersihkan karakter aneh di tengah jika ada
    cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();

    // 3. Nama valid harus memiliki minimal 3 huruf dan tidak hanya angka/simbol
    const letterCount = (cleaned.match(/[a-zA-Z]/g) || []).length;
    if (letterCount < 3 || cleaned.length < 3) continue;

    // 4. Periksa apakah baris ini adalah header atau kata yang diabaikan
    const isIgnore = IGNORE_PATTERNS.some((pattern) => pattern.test(cleaned));
    if (isIgnore) continue;

    // Jika mengandung kata kunci header di tengah baris pendek (< 25 karakter)
    if (
      cleaned.length < 25 &&
      /(daftar\s+hadir|absensi|wali\s+kelas|tanda\s+tangan|tgl\s*:|kelas\s*:|jurusan\s*:)/i.test(cleaned)
    ) {
      continue;
    }

    // 5. Normalisasi ke UPPERCASE
    const upperName = cleaned.toUpperCase().trim();

    // Abaikan jika sudah pernah ditambahkan
    if (!seen.has(upperName)) {
      seen.add(upperName);
      candidates.push(upperName);
    }
  }

  return candidates;
}

/**
 * Ekstraksi teks dari file Gambar (JPG, PNG, JPEG, WEBP) menggunakan Tesseract OCR
 */
export async function parseImageWithOcr(imageSource, onProgress) {
  try {
    if (onProgress) onProgress('Memuat Mesin AI OCR...');
    await loadScript(TESSERACT_CDN);

    if (!window.Tesseract) {
      throw new Error('Gagal memuat modul OCR Tesseract.');
    }

    if (onProgress) onProgress('Menganalisis & membaca teks dari gambar...');
    const result = await window.Tesseract.recognize(
      imageSource,
      'ind', // Bahasa Indonesia
      {
        logger: (m) => {
          if (m && m.status === 'recognizing text' && onProgress) {
            const pct = Math.round((m.progress || 0) * 100);
            onProgress(`Membaca teks dari gambar (${pct}%)...`);
          }
        },
      }
    );

    const rawText = result?.data?.text || '';
    const names = extractNamesFromText(rawText);
    return { rawText, names };
  } catch (err) {
    console.error('OCR recognition error:', err);
    // Fallback coba bahasa inggris jika ind belum terunduh
    try {
      const fallbackResult = await window.Tesseract.recognize(imageSource, 'eng');
      const rawText = fallbackResult?.data?.text || '';
      const names = extractNamesFromText(rawText);
      return { rawText, names };
    } catch (e2) {
      throw err;
    }
  }
}

/**
 * Ekstraksi teks dari file Dokumen PDF menggunakan PDF.js (Text Layer + Canvas OCR fallback)
 */
export async function parsePdfDocument(pdfFileOrUrl, onProgress) {
  if (onProgress) onProgress('Membuka file PDF...');
  await loadScript(PDFJS_CDN);

  if (!window.pdfjsLib) {
    throw new Error('Gagal memuat modul pembaca PDF.');
  }

  window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN;

  let pdfData = pdfFileOrUrl;
  if (pdfFileOrUrl instanceof File || pdfFileOrUrl instanceof Blob) {
    pdfData = await pdfFileOrUrl.arrayBuffer();
  }

  const loadingTask = window.pdfjsLib.getDocument({ data: pdfData });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;

  let fullText = '';

  for (let pageNum = 1; pageNum <= Math.min(numPages, 10); pageNum++) {
    if (onProgress) onProgress(`Membaca halaman ${pageNum} dari ${numPages}...`);
    const page = await pdf.getPage(pageNum);

    // 1. Coba ekstraksi langsung dari Text Content (Digital PDF)
    const textContent = await page.getTextContent();
    const pageStrings = textContent.items.map((item) => item.str).join('\n');
    fullText += '\n' + pageStrings;

    // 2. Jika halaman tidak memiliki text layer (PDF hasil foto/scan kamera):
    if (pageStrings.trim().length < 20) {
      if (onProgress) onProgress(`Memindai gambar pindaian halaman ${pageNum} via OCR...`);
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: ctx, viewport: viewport }).promise;
      const dataUrl = canvas.toDataURL('image/png');
      const ocrRes = await parseImageWithOcr(dataUrl, onProgress);
      fullText += '\n' + ocrRes.rawText;
    }
  }

  const names = extractNamesFromText(fullText);
  return { rawText: fullText, names };
}

/**
 * Entry point umum: otomatis mendeteksi apakah file adalah Gambar atau PDF
 */
export async function parseDocumentFile(file, onProgress) {
  if (!file) throw new Error('File tidak ditemukan');

  const fileType = file.type || '';
  const fileName = (file.name || '').toLowerCase();

  if (fileType.includes('pdf') || fileName.endsWith('.pdf')) {
    return parsePdfDocument(file, onProgress);
  } else if (fileType.startsWith('image/') || /\.(jpg|jpeg|png|webp|bmp)$/i.test(fileName)) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const res = await parseImageWithOcr(e.target.result, onProgress);
          resolve(res);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  } else {
    throw new Error('Format file tidak didukung. Harap unggah berkas Gambar (JPG, PNG) atau PDF.');
  }
}
