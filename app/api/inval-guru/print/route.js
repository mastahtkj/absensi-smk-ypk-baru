import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const preferredRegion = ['sin1'];
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tanggal = searchParams.get('tanggal') || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
    const guruFilter = searchParams.get('guru');
    const autoPrint = searchParams.get('auto') === 'true';

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

    // 2. Ambil peta inisial guru & absensi materi
    let guruInitialsMap = {};
    let teacherAbsensiMap = {};
    try {
      const [gRes, absRes] = await Promise.all([
        supabase.from('tb_guru').select('nama_guru, inisial'),
        supabase.from('tb_absensi').select('nama, materi_nama, materi_url, keterangan_materi, alasan_izin').eq('tanggal', tanggal),
      ]);

      if (gRes.data) {
        gRes.data.forEach((g) => {
          if (g.nama_guru) {
            const cleanName = g.nama_guru.trim().toLowerCase();
            guruInitialsMap[cleanName] = g.inisial ? g.inisial.trim().toUpperCase() : '';
          }
        });
      }
      if (absRes.data) {
        absRes.data.forEach((a) => {
          if (a.nama) {
            teacherAbsensiMap[a.nama.trim().toLowerCase()] = a;
          }
        });
      }
    } catch (e) {
      console.warn('Initials/absensi fetch error:', e.message);
    }

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
    let namaHari = 'HARI INI';
    let formattedDate = tanggal;
    try {
      const [yStr, mStr, dStr] = tanggal.split('-');
      const dateObj = new Date(Number(yStr), Number(mStr) - 1, Number(dStr));
      const namaHariList = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
      namaHari = namaHariList[dateObj.getDay()] || 'HARI INI';
      formattedDate = `${dStr}-${mStr}-${yStr}`;
    } catch (e) {}

    // Render Form Guru Pengganti untuk setiap Guru Tidak Hadir
    let sheetsHtml = '';

    if (teacherKeys.length === 0) {
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
          <div style="text-align:center; padding: 40px 20px; color: #64748b;">
            <h3>Tidak Ada Jadwal Guru Pengganti / Inval</h3>
            <p>Pada tanggal <b>${formattedDate}</b> seluruh Bapak/Ibu Guru hadir sesuai jadwal KBM normal.</p>
          </div>
        </div>
      `;
    } else {
      teacherKeys.forEach((teacherName, tIdx) => {
        const teacherSessions = groupedByTeacher[teacherName] || [];
        const firstSession = teacherSessions[0] || {};
        const inisialUtama = guruInitialsMap[teacherName.trim().toLowerCase()] || '';
        const teacherAbs = teacherAbsensiMap[teacherName.trim().toLowerCase()] || {};
        
        const alasanRaw = firstSession.alasan || teacherAbs.alasan_izin || firstSession.keterangan_tugas?.replace('Alasan:', '').trim() || 'SAKIT';
        const alasanDisplay = alasanRaw.toUpperCase();

        const bahanAjarLinkGlobal = firstSession.bahan_ajar_url || firstSession.materi_url || teacherAbs.materi_url || 'https://bit.ly/cekizindanmateri';

        let rowsHtml = '';
        for (let jam = 1; jam <= 11; jam++) {
          // Cari sesi penugasan yang mencakup jam ini
          const match = teacherSessions.find((s) => {
            const rawJam = String(s.jam_ke || '').trim();
            if (rawJam.includes('-')) {
              const [startJ, endJ] = rawJam.split('-').map((n) => parseInt(n.replace(/\D/g, '')));
              return jam >= startJ && jam <= endJ;
            }
            const num = parseInt(rawJam.replace(/\D/g, ''));
            return num === jam;
          });

          let kelasStr = '';
          let penggantiStr = '';
          let bahanAjarCell = '';

          if (match) {
            kelasStr = match.kelas && match.kelas !== '-' ? match.kelas : '-';
            
            const rawPengganti = match.nama_guru_inval || match.guru_inval || '';
            const isFree = rawPengganti.includes('Jam Kosong') || rawPengganti === '-' || match.kelas === '-';
            
            if (!isFree && rawPengganti) {
              const inisInval = guruInitialsMap[rawPengganti.trim().toLowerCase()] || '';
              penggantiStr = inisInval ? inisInval : rawPengganti;
            } else {
              penggantiStr = isFree ? '-' : '';
            }

            const materiJudul = match.materi_nama || teacherAbs.materi_nama || '';
            if (materiJudul && materiJudul.trim() !== '-' && !/^(sakit|izin|lainnya)$/i.test(materiJudul.trim())) {
              bahanAjarCell = materiJudul;
            }
          }

          rowsHtml += `
            <tr>
              <td class="col-jam">${jam}</td>
              <td class="col-kelas">${kelasStr}</td>
              <td class="col-pengganti">${penggantiStr}</td>
              <td class="col-bahan">${bahanAjarCell}</td>
            </tr>
          `;
        }

        const isLast = tIdx === teacherKeys.length - 1;

        sheetsHtml += `
          <div class="sheet ${!isLast ? 'page-break' : ''}">
            <!-- KOP SURAT RESMI SEKOLAH (SESUAI REKAP ABSENSI) -->
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

            <!-- META INFORMASI KETIDAKHADIRAN -->
            <div class="meta-section">
              <div class="meta-row">
                <div class="meta-label">Guru Tidak Hadir</div>
                <div class="meta-colon">:</div>
                <div class="meta-value">${inisialUtama ? `<span class="inisial-tag">${inisialUtama}</span> - ` : ''}<b>${teacherName.toUpperCase()}</b></div>
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

            <!-- TABEL 4 KOLOM PERSIS SEPERTI GAMBAR FORMULIR ASLI -->
            <table class="main-table">
              <thead>
                <tr>
                  <th style="width: 55px;">Jam</th>
                  <th style="width: 140px;">Kelas</th>
                  <th style="width: 140px;">Pengganti</th>
                  <th>Bahan Ajar</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>

            <!-- FOOTER LINK BAHAN AJAR & TANDA TANGAN WAKA KURIKULUM HENDRAWAN -->
            <div class="footer-row">
              <div class="footer-bahan">
                Bahan Ajar : <span class="link-text">${bahanAjarLinkGlobal}</span>
              </div>

              <div class="signature-box">
                <div class="signature-date">Medan, <span class="date-line">${formattedDate}</span></div>
                <div class="signature-title">Waka Kurikulum</div>
                <div class="signature-space">
                  <!-- SVG TANDA TANGAN ASLI HENDRAWAN -->
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
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
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
              background-color: #525659;
              color: #000000;
            }
            
            /* TOP TOOLBAR BROWSER */
            .top-toolbar {
              position: sticky;
              top: 0;
              left: 0;
              right: 0;
              background-color: #1e293b;
              color: #ffffff;
              padding: 12px 24px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              box-shadow: 0 4px 10px rgba(0,0,0,0.3);
              z-index: 1000;
            }
            .toolbar-title {
              font-size: 15px;
              font-weight: bold;
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .toolbar-actions {
              display: flex;
              gap: 10px;
            }
            .btn-action {
              padding: 8px 16px;
              border-radius: 8px;
              border: none;
              font-size: 13px;
              font-weight: bold;
              cursor: pointer;
              transition: all 0.15s;
              display: flex;
              align-items: center;
              gap: 6px;
            }
            .btn-print {
              background-color: #2563eb;
              color: #ffffff;
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

            /* CONTAINER LEMBAR A4 */
            .sheet-wrapper {
              display: flex;
              flex-direction: column;
              align-items: center;
              padding: 20px 10px 60px 10px;
            }
            .sheet {
              background-color: #ffffff;
              width: 210mm;
              min-height: 297mm;
              padding: 14mm 18mm;
              margin-bottom: 24px;
              box-shadow: 0 8px 24px rgba(0,0,0,0.25);
              position: relative;
            }

            /* KOP SURAT RESMI SEKOLAH */
            .kop-container {
              display: flex;
              align-items: center;
              border-bottom: 3px double #000000;
              padding-bottom: 8px;
              margin-bottom: 12px;
            }
            .kop-logo {
              width: 72px;
              height: 72px;
              margin-right: 14px;
              object-fit: contain;
            }
            .kop-text {
              text-align: center;
              flex: 1;
            }
            .kop-text h2 {
              margin: 0;
              font-size: 14px;
              font-weight: bold;
              letter-spacing: 0.5px;
            }
            .kop-text h1 {
              margin: 2px 0;
              font-size: 19px;
              font-weight: 900;
              letter-spacing: 1px;
            }
            .kop-text p {
              margin: 0;
              font-size: 10.5px;
              line-height: 1.3;
            }
            .kop-sub {
              font-style: italic;
              margin-top: 2px !important;
            }

            /* FORM TITLE */
            .form-title {
              text-align: center;
              margin: 8px 0 14px 0;
              font-size: 16px;
              font-weight: 900;
              letter-spacing: 0.5px;
            }

            /* META INFORMASI GURU TIDAK HADIR */
            .meta-section {
              margin-bottom: 14px;
              font-size: 13.5px;
            }
            .meta-row {
              display: flex;
              align-items: flex-end;
              margin-bottom: 6px;
            }
            .meta-label {
              width: 140px;
              font-weight: bold;
            }
            .meta-colon {
              width: 15px;
              font-weight: bold;
            }
            .meta-value {
              flex: 1;
              border-bottom: 1.5px solid #000000;
              padding-left: 6px;
              padding-bottom: 1px;
              font-size: 13.5px;
            }
            .inisial-tag {
              display: inline-block;
              background-color: #f1f5f9;
              border: 1px solid #94a3b8;
              padding: 0 6px;
              border-radius: 4px;
              font-weight: 900;
              font-size: 12px;
            }

            /* TABEL 4 KOLOM PERSIS FORM */
            .main-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 14px;
            }
            .main-table th {
              border: 1.5px solid #000000;
              padding: 6px 4px;
              font-size: 13px;
              background-color: #ffffff;
              text-align: center;
              font-weight: 900;
            }
            .main-table td {
              border: 1.5px solid #000000;
              padding: 5.5px 6px;
              font-size: 13px;
              height: 28px;
            }
            .col-jam {
              text-align: center;
              font-weight: 900;
              font-size: 13.5px;
            }
            .col-kelas {
              text-align: center;
              font-weight: 800;
              font-size: 13px;
            }
            .col-pengganti {
              text-align: center;
              font-weight: 800;
              font-size: 13px;
            }
            .col-bahan {
              font-size: 12px;
              padding-left: 8px;
            }

            /* FOOTER: BAHAN AJAR LINK & TTD WAKA KURIKULUM HENDRAWAN */
            .footer-row {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              margin-top: 14px;
              padding: 0 4px;
            }
            .footer-bahan {
              font-size: 13px;
              font-weight: bold;
            }
            .link-text {
              font-weight: normal;
              text-decoration: underline;
            }

            .signature-box {
              width: 220px;
              text-align: center;
              font-size: 13px;
            }
            .signature-date {
              margin-bottom: 3px;
            }
            .date-line {
              font-weight: bold;
              border-bottom: 1px dotted #000;
              padding: 0 4px;
            }
            .signature-title {
              font-weight: bold;
              margin-bottom: 2px;
            }
            .signature-space {
              height: 54px;
              display: flex;
              align-items: center;
              justify-content: center;
              position: relative;
            }
            .sig-svg {
              width: 130px;
              height: 48px;
            }
            .signature-name {
              font-weight: 900;
              font-size: 14px;
              border-bottom: 1.5px solid #000000;
              display: inline-block;
              padding: 0 10px 1px 10px;
            }

            /* CETAK PRINT STYLE */
            @media print {
              .top-toolbar {
                display: none !important;
              }
              body {
                background-color: #ffffff !important;
              }
              .sheet-wrapper {
                padding: 0 !important;
              }
              .sheet {
                box-shadow: none !important;
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
                min-height: auto !important;
              }
              .page-break {
                page-break-after: always !important;
                break-after: page !important;
              }
            }
          </style>
        </head>
        <body>
          <!-- TOP ACTION TOOLBAR -->
          <div class="top-toolbar">
            <div class="toolbar-title">
              <span>🖨️</span>
              <span>Form Guru Pengganti - SMK YPK Medan (${formattedDate})</span>
            </div>
            <div class="toolbar-actions">
              <button class="btn-action btn-print" onclick="window.print()">
                <span>🖨️</span>
                <span>Cetak / Simpan PDF</span>
              </button>
              <button class="btn-action btn-close" onclick="window.close()">
                <span>✕</span>
                <span>Tutup</span>
              </button>
            </div>
          </div>

          <div class="sheet-wrapper">
            ${sheetsHtml}
          </div>

          ${autoPrint ? `<script>window.addEventListener('load', () => setTimeout(() => window.print(), 500));</script>` : ''}
        </body>
      </html>
    `;

    return new NextResponse(htmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (err) {
    console.error('[Inval Print Route Error]:', err);
    return new NextResponse(`<h3>Terjadi kesalahan saat memuat cetak form inval: ${err.message}</h3>`, {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}
