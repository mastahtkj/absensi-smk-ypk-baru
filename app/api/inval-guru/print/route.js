import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const preferredRegion = ['sin1'];
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper untuk menghasilkan 2 huruf inisial guru
function generateFallbackInitials(name) {
  if (!name) return '-';
  const clean = name.replace(/^(Drs\.|Dr\.|H\.|Hj\.|Ir\.|ST|S\.Pd|S\.Kom|M\.Kom|S\.E|M\.Pd|S\.Si)\s*/gi, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  if (parts.length === 1 && parts[0].length >= 2) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return clean.substring(0, 2).toUpperCase() || '-';
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const d = new Date();
    const defaultToday = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const tanggal = searchParams.get('tanggal') || defaultToday;
    const guruFilter = searchParams.get('guru');

    // 1. Ambil data penugasan inval
    let query = supabase
      .from('tb_inval_guru')
      .select('*')
      .order('jam_ke', { ascending: true });

    if (tanggal && tanggal !== 'all') {
      query = query.eq('tanggal', tanggal);
    }

    if (guruFilter && guruFilter !== 'all') {
      query = query.ilike('nama_guru_utama', `%${guruFilter.trim()}%`);
    }

    let { data: invalList, error } = await query;
    if (error && error.message?.includes('tb_inval_guru')) {
      let fallbackQuery = supabase
        .from('inval_guru')
        .select('*')
        .order('jam_ke', { ascending: true });
      if (tanggal && tanggal !== 'all') fallbackQuery = fallbackQuery.eq('tanggal', tanggal);
      if (guruFilter && guruFilter !== 'all') fallbackQuery = fallbackQuery.ilike('nama_guru_utama', `%${guruFilter.trim()}%`);
      const fallbackRes = await fallbackQuery;
      if (!fallbackRes.error) invalList = fallbackRes.data;
    }

    // 2. Ambil seluruh database guru untuk mapping inisial resmi
    let guruInitialsMap = {};
    try {
      const { data: gData } = await supabase.from('tb_guru').select('nama_guru, inisial');
      if (gData && Array.isArray(gData)) {
        gData.forEach((g) => {
          if (g.nama_guru) {
            const cleanName = g.nama_guru.trim().toLowerCase();
            const initVal = g.inisial ? g.inisial.trim().toUpperCase() : generateFallbackInitials(g.nama_guru);
            guruInitialsMap[cleanName] = initVal;
          }
        });
      }
    } catch (e) {
      console.warn('Initials fetch error:', e.message);
    }

    // Mapping inisial manual tambahan untuk guru SMK YPK Medan
    const KNOWN_INITIALS = {
      'hendrawan': 'HR',
      'hendrawan, st': 'HR',
      'hendrawan st': 'HR',
      'alzalika': 'AL',
      'alzalika nazwa': 'AL',
      'aisha': 'AI',
      'rizky arka': 'AR',
      'indira': 'IN',
      'aini': 'AN',
      'tajie': 'TA',
      'ahmadinized': 'AH',
      'nazwa syifa': 'NS',
      'cut razki': 'CR',
      'cut razki andhira': 'CR',
      'ira ulandari': 'IU',
      'yenni': 'YN',
      'dede': 'DD',
      'iqbal': 'IQ',
    };

    const getTeacherInitial = (nameStr) => {
      if (!nameStr) return '-';
      const clean = nameStr.trim().toLowerCase();
      if (guruInitialsMap[clean]) return guruInitialsMap[clean];
      for (const [k, v] of Object.entries(KNOWN_INITIALS)) {
        if (clean.includes(k)) return v;
      }
      return generateFallbackInitials(nameStr);
    };

    const items = invalList || [];

    // 3. Grouping per Guru Utama yang tidak hadir
    const groupedByTeacher = {};
    if (items.length > 0) {
      items.forEach((item) => {
        const teacher = item.nama_guru_utama || 'Guru Tidak Diketahui';
        if (!groupedByTeacher[teacher]) {
          groupedByTeacher[teacher] = [];
        }
        groupedByTeacher[teacher].push(item);
      });
    }

    const teacherKeys = Object.keys(groupedByTeacher).sort((a, b) => a.localeCompare(b, 'id', { sensitivity: 'base' }));

    // Format Tanggal & Hari Resmi
    let namaHari = 'SENIN';
    let formattedDate = tanggal;
    try {
      const [yStr, mStr, dStr] = tanggal.split('-');
      const dateObj = new Date(Number(yStr), Number(mStr) - 1, Number(dStr));
      const namaHariList = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
      namaHari = namaHariList[dateObj.getDay()] || 'SENIN';
      formattedDate = `${dStr}-${mStr}-${yStr}`;
    } catch (e) {}

    // Render Lembaran Form Guru Pengganti
    let sheetsHtml = '';

    if (teacherKeys.length === 0) {
      // TAMPILAN FORM KOSONG / TEMPLATE RESMI KETIKA BELUM ADA DATA
      let blankRows = '';
      for (let j = 1; j <= 11; j++) {
        blankRows += `
          <tr>
            <td class="col-jam">${j}</td>
            <td class="col-kelas">-</td>
            <td class="col-pengganti">-</td>
            <td class="col-bahan">-</td>
          </tr>
        `;
      }

      sheetsHtml = `
        <div class="sheet">
          <!-- KOP SURAT RESMI -->
          <div class="kop-container">
            <img src="/logko.png" alt="Logo SMK YPK" class="kop-logo" onerror="this.style.display='none'" />
            <div class="kop-text">
              <h2>YAYASAN PENDIDIKAN KELUARGA MEDAN</h2>
              <h1>SMK YPK MEDAN</h1>
              <p>Jl. Sakti Lubis Gg. Amal No. 25 &amp; Gg. Pegawai No. 8, Siti Rejo I, Kec. Medan Kota, Kota Medan, Sumatera Utara 20219</p>
              <p class="kop-sub">Email: smkypkmedan@gmail.com | Akreditasi A | Program Keahlian: TJKT, AKL, MPLB, PM</p>
            </div>
          </div>

          <div class="form-title">Form Guru Pengganti</div>

          <div class="meta-section">
            <div class="meta-row">
              <div class="meta-label">Guru Tidak Hadir</div>
              <div class="meta-colon">:</div>
              <div class="meta-value">....................................................................</div>
            </div>
            <div class="meta-row">
              <div class="meta-label">Alasan</div>
              <div class="meta-colon">:</div>
              <div class="meta-value">SAKIT / IZIN / DINAS LUAR</div>
            </div>
            <div class="meta-row">
              <div class="meta-label">Hari/ Tanggal</div>
              <div class="meta-colon">:</div>
              <div class="meta-value"><b>${namaHari} / ${formattedDate}</b></div>
            </div>
          </div>

          <table class="main-table">
            <thead>
              <tr>
                <th style="width: 12%;">Jam</th>
                <th style="width: 25%;">Kelas</th>
                <th style="width: 25%;">Pengganti</th>
                <th style="width: 38%;">Bahan Ajar</th>
              </tr>
            </thead>
            <tbody>
              ${blankRows}
            </tbody>
          </table>

          <div class="footer-row">
            <div class="footer-bahan">
              Bahan Ajar : <span class="link-text">https://bit.ly/cekizindanmateri</span>
            </div>

            <div class="signature-box">
              <div class="signature-date">Medan, <span class="date-line">${formattedDate}</span></div>
              <div class="signature-title">Waka Kurikulum</div>
              <div class="signature-space">
                <svg class="sig-svg" viewBox="0 0 140 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M28 44 C22 35, 24 15, 30 12 C36 9, 32 44, 35 46 C38 48, 48 30, 52 35 C56 40, 68 33, 85 34 C100 35, 115 32, 128 34 M72 43 C85 43, 105 43, 118 43" stroke="#000000" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <div class="signature-name">Hendrawan</div>
            </div>
          </div>
        </div>
      `;
    } else {
      teacherKeys.forEach((teacherName, tIdx) => {
        const teacherSessions = groupedByTeacher[teacherName] || [];
        const firstSession = teacherSessions[0] || {};
        const inisialUtama = getTeacherInitial(teacherName);
        const alasanRaw = firstSession.alasan || 'SAKIT';
        const alasanDisplay = alasanRaw.toUpperCase();
        const bahanAjarLinkGlobal = firstSession.bahan_ajar_url || firstSession.materi_url || 'https://bit.ly/cekizindanmateri';

        let rowsHtml = '';
        for (let jam = 1; jam <= 11; jam++) {
          // Cari sesi yang mencakup jam ini
          const match = teacherSessions.find((s) => {
            const rawJam = String(s.jam_ke || '').trim();
            if (rawJam.includes('-')) {
              const [startJ, endJ] = rawJam.split('-').map((n) => parseInt(n.replace(/\D/g, '')));
              if (!isNaN(startJ) && !isNaN(endJ)) {
                return jam >= startJ && jam <= endJ;
              }
            }
            const num = parseInt(rawJam.replace(/\D/g, ''));
            return num === jam;
          });

          let kelasStr = '-';
          let penggantiStr = '-';
          let bahanAjarCell = '';

          if (match) {
            kelasStr = match.kelas && match.kelas !== '-' ? match.kelas : '-';
            
            const rawPengganti = match.nama_guru_inval || match.guru_inval || '';
            const isKosong = rawPengganti.includes('Kosong') || rawPengganti === '-' || match.kelas === '-';
            
            if (!isKosong && rawPengganti) {
              // 🌟 TAMPILKAN HANYA INISIAL GURU PENGGANTI SESUAI PERMINTAAN USER
              penggantiStr = getTeacherInitial(rawPengganti);
            } else {
              penggantiStr = '-';
            }

            const materiJudul = match.materi_nama || '';
            if (materiJudul && materiJudul.trim() !== '-' && !/^(sakit|izin|lainnya)$/i.test(materiJudul.trim())) {
              bahanAjarCell = materiJudul;
            }
          }

          rowsHtml += `
            <tr>
              <td class="col-jam">${jam}</td>
              <td class="col-kelas">${kelasStr}</td>
              <td class="col-pengganti"><b>${penggantiStr}</b></td>
              <td class="col-bahan">${bahanAjarCell}</td>
            </tr>
          `;
        }

        const isLast = tIdx === teacherKeys.length - 1;

        sheetsHtml += `
          <div class="sheet ${!isLast ? 'page-break' : ''}">
            <!-- KOP SURAT RESMI -->
            <div class="kop-container">
              <img src="/logko.png" alt="Logo SMK YPK" class="kop-logo" onerror="this.style.display='none'" />
              <div class="kop-text">
                <h2>YAYASAN PENDIDIKAN KELUARGA MEDAN</h2>
                <h1>SMK YPK MEDAN</h1>
                <p>Jl. Sakti Lubis Gg. Amal No. 25 &amp; Gg. Pegawai No. 8, Siti Rejo I, Kec. Medan Kota, Kota Medan, Sumatera Utara 20219</p>
                <p class="kop-sub">Email: smkypkmedan@gmail.com | Akreditasi A | Program Keahlian: TJKT, AKL, MPLB, PM</p>
              </div>
            </div>

            <!-- JUDUL FORM RESMI -->
            <div class="form-title">Form Guru Pengganti</div>

            <!-- META INFORMASI -->
            <div class="meta-section">
              <div class="meta-row">
                <div class="meta-label">Guru Tidak Hadir</div>
                <div class="meta-colon">:</div>
                <div class="meta-value">
                  <span class="inisial-tag">${inisialUtama}</span> - <b>${teacherName.toUpperCase()}</b>
                </div>
              </div>
              <div class="meta-row">
                <div class="meta-label">Alasan</div>
                <div class="meta-colon">:</div>
                <div class="meta-value"><b>${alasanDisplay}</b></div>
              </div>
              <div class="meta-row">
                <div class="meta-label">Hari/ Tanggal</div>
                <div class="meta-colon">:</div>
                <div class="meta-value"><b>${namaHari} / ${formattedDate}</b></div>
              </div>
            </div>

            <!-- TABEL 4 KOLOM (JAM 1 S.D. 11) -->
            <table class="main-table">
              <thead>
                <tr>
                  <th style="width: 12%;">Jam</th>
                  <th style="width: 25%;">Kelas</th>
                  <th style="width: 25%;">Pengganti</th>
                  <th style="width: 38%;">Bahan Ajar</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>

            <!-- FOOTER & TTD HENDRAWAN -->
            <div class="footer-row">
              <div class="footer-bahan">
                Bahan Ajar : <span class="link-text">${bahanAjarLinkGlobal}</span>
              </div>

              <div class="signature-box">
                <div class="signature-date">Medan, <span class="date-line">${formattedDate}</span></div>
                <div class="signature-title">Waka Kurikulum</div>
                <div class="signature-space">
                  <svg class="sig-svg" viewBox="0 0 140 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M28 44 C22 35, 24 15, 30 12 C36 9, 32 44, 35 46 C38 48, 48 30, 52 35 C56 40, 68 33, 85 34 C100 35, 115 32, 128 34 M72 43 C85 43, 105 43, 118 43" stroke="#000000" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
                <div class="signature-name">Hendrawan</div>
              </div>
            </div>
          </div>
        `;
      });
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="id">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=3.0, user-scalable=yes" />
          <title>Form Guru Pengganti - SMK YPK Medan (${formattedDate})</title>
          <link rel="icon" href="/logko.png" />
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm 15mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            body {
              font-family: Arial, Helvetica, sans-serif;
              margin: 0;
              padding: 0;
              background-color: #f1f5f9;
              color: #0f172a;
              -webkit-font-smoothing: antialiased;
            }
            
            /* TOP TOOLBAR BROWSER (RESPONSIF MOBILE & DESKTOP) */
            .top-toolbar {
              position: sticky;
              top: 0;
              left: 0;
              right: 0;
              background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
              color: #ffffff;
              padding: 10px 14px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              box-shadow: 0 4px 12px rgba(0,0,0,0.25);
              z-index: 1000;
              flex-wrap: wrap;
              gap: 8px;
            }
            .toolbar-title {
              font-size: 13.5px;
              font-weight: 800;
              display: flex;
              align-items: center;
              gap: 6px;
            }
            .toolbar-actions {
              display: flex;
              gap: 8px;
              align-items: center;
            }
            .btn-action {
              padding: 8px 14px;
              border-radius: 8px;
              border: none;
              font-size: 12.5px;
              font-weight: 800;
              cursor: pointer;
              transition: all 0.15s;
              display: inline-flex;
              align-items: center;
              gap: 6px;
              text-decoration: none;
            }
            .btn-print {
              background-color: #2563eb;
              color: #ffffff;
              box-shadow: 0 2px 8px rgba(37,99,235,0.4);
            }
            .btn-print:hover {
              background-color: #1d4ed8;
            }
            .btn-close {
              background-color: #475569;
              color: #ffffff;
            }
            .btn-close:hover {
              background-color: #334155;
            }

            /* CONTAINER LEMBAR FORM (RESPONSIF FIT-TO-SCREEN DI HP) */
            .sheet-wrapper {
              display: flex;
              flex-direction: column;
              align-items: center;
              padding: 14px 8px 60px;
              width: 100%;
              box-sizing: border-box;
            }
            .sheet {
              background-color: #ffffff;
              width: 100%;
              max-width: 210mm;
              padding: 16px 14px;
              margin-bottom: 20px;
              box-shadow: 0 4px 16px rgba(0,0,0,0.1);
              border-radius: 8px;
              position: relative;
              box-sizing: border-box;
            }

            @media screen and (min-width: 768px) {
              .sheet {
                padding: 12mm 16mm;
                min-height: 285mm;
                border-radius: 4px;
              }
            }

            /* KOP SURAT RESMI */
            .kop-container {
              display: flex;
              align-items: center;
              border-bottom: 3px double #000000;
              padding-bottom: 8px;
              margin-bottom: 10px;
            }
            .kop-logo {
              width: 58px;
              height: 58px;
              margin-right: 10px;
              object-fit: contain;
              flex-shrink: 0;
            }
            @media screen and (min-width: 768px) {
              .kop-logo {
                width: 70px;
                height: 70px;
                margin-right: 14px;
              }
            }
            .kop-text {
              text-align: center;
              flex: 1;
            }
            .kop-text h2 {
              margin: 0;
              font-size: 11.5px;
              font-weight: 800;
              letter-spacing: 0.5px;
            }
            .kop-text h1 {
              margin: 2px 0;
              font-size: 16px;
              font-weight: 900;
              letter-spacing: 1px;
            }
            @media screen and (min-width: 768px) {
              .kop-text h2 { font-size: 14px; }
              .kop-text h1 { font-size: 19px; }
            }
            .kop-text p {
              margin: 0;
              font-size: 9.5px;
              line-height: 1.25;
            }
            .kop-sub {
              font-style: italic;
              margin-top: 2px !important;
            }

            /* FORM TITLE */
            .form-title {
              text-align: center;
              margin: 6px 0 12px 0;
              font-size: 15px;
              font-weight: 900;
              letter-spacing: 0.5px;
              text-transform: capitalize;
            }
            @media screen and (min-width: 768px) {
              .form-title { font-size: 17px; margin: 8px 0 14px 0; }
            }

            /* META INFORMASI GURU TIDAK HADIR */
            .meta-section {
              margin-bottom: 12px;
              font-size: 12.5px;
            }
            @media screen and (min-width: 768px) {
              .meta-section { font-size: 13.5px; }
            }
            .meta-row {
              display: flex;
              align-items: flex-end;
              margin-bottom: 5px;
            }
            .meta-label {
              width: 125px;
              font-weight: bold;
              flex-shrink: 0;
            }
            .meta-colon {
              width: 12px;
              font-weight: bold;
              flex-shrink: 0;
            }
            .meta-value {
              flex: 1;
              border-bottom: 1.5px solid #000000;
              padding-left: 4px;
              padding-bottom: 1px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .inisial-tag {
              display: inline-block;
              background-color: #f1f5f9;
              border: 1px solid #64748b;
              padding: 0 5px;
              border-radius: 4px;
              font-weight: 900;
              font-size: 11.5px;
            }

            /* TABEL 4 KOLOM PERSIS FORMAT FISIK */
            .main-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 12px;
              table-layout: fixed;
            }
            .main-table th {
              border: 1.5px solid #000000;
              padding: 5px 3px;
              font-size: 12px;
              background-color: #ffffff;
              text-align: center;
              font-weight: 900;
            }
            .main-table td {
              border: 1.5px solid #000000;
              padding: 4.5px 3px;
              font-size: 11.5px;
              height: 22px;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
            @media screen and (min-width: 768px) {
              .main-table th { font-size: 13px; padding: 6px 4px; }
              .main-table td { font-size: 12.5px; padding: 5px 4px; height: 25px; }
            }
            .col-jam {
              text-align: center;
              font-weight: 900;
            }
            .col-kelas {
              text-align: center;
              font-weight: 700;
            }
            .col-pengganti {
              text-align: center;
              font-weight: 900;
              color: #000000;
              letter-spacing: 0.5px;
            }
            .col-bahan {
              text-align: left;
              padding-left: 6px !important;
            }

            /* FOOTER & SIGNATURE */
            .footer-row {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-top: 10px;
              font-size: 11.5px;
              gap: 10px;
            }
            @media screen and (min-width: 768px) {
              .footer-row { font-size: 12.5px; margin-top: 14px; }
            }
            .footer-bahan {
              font-weight: bold;
              flex: 1;
              word-break: break-all;
            }
            .link-text {
              text-decoration: underline;
              font-weight: normal;
            }
            .signature-box {
              width: 170px;
              text-align: center;
              flex-shrink: 0;
            }
            .signature-date {
              margin-bottom: 2px;
            }
            .signature-title {
              font-weight: bold;
              margin-bottom: 2px;
            }
            .signature-space {
              height: 44px;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .sig-svg {
              width: 90px;
              height: 38px;
            }
            .signature-name {
              font-weight: bold;
              border-bottom: 1.5px solid #000000;
              display: inline-block;
              padding-bottom: 1px;
              min-width: 110px;
            }

            /* PRINT CSS KHUSUS KERTAS A4 */
            @media print {
              body {
                background-color: #ffffff !important;
                color: #000000 !important;
              }
              .top-toolbar, .no-print {
                display: none !important;
              }
              .sheet-wrapper {
                padding: 0 !important;
                margin: 0 !important;
                display: block !important;
              }
              .sheet {
                width: 100% !important;
                max-width: 100% !important;
                min-height: auto !important;
                padding: 0 !important;
                margin: 0 !important;
                box-shadow: none !important;
                border-radius: 0 !important;
              }
              .page-break {
                page-break-after: always;
                break-after: page;
              }
            }
          </style>
        </head>
        <body>
          <!-- TOP TOOLBAR -->
          <div class="top-toolbar no-print">
            <div class="toolbar-title">
              <span>📄</span>
              <span>Form Guru Pengganti (${formattedDate})</span>
            </div>
            <div class="toolbar-actions">
              <button type="button" class="btn-action btn-print" onclick="window.print()">
                <span>🖨️</span>
                <span>Cetak / Simpan PDF</span>
              </button>
              <button type="button" class="btn-action btn-close" onclick="window.close()">
                <span>✕</span>
                <span>Tutup</span>
              </button>
            </div>
          </div>

          <!-- WRAPPER LEMBAR FORM -->
          <div class="sheet-wrapper">
            ${sheetsHtml}
          </div>

          <script>
            // Auto focus on print toolbar
            window.addEventListener('load', function() {
              const urlParams = new URLSearchParams(window.location.search);
              if (urlParams.get('auto') === 'true') {
                setTimeout(function() { window.print(); }, 400);
              }
            });
          </script>
        </body>
      </html>
    `;

    return new NextResponse(htmlContent, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (err) {
    return new NextResponse(`Error generating form: ${err.message}`, { status: 500 });
  }
}
