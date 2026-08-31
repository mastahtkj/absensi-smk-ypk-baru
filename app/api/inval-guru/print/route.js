import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const preferredRegion = ['sin1'];
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const SESSION_TIMETABLE = {
  1: { start: '07:15', end: '07:55', label: '07:15 - 07:55' },
  2: { start: '07:55', end: '08:35', label: '07:55 - 08:35' },
  3: { start: '08:35', end: '09:15', label: '08:35 - 09:15' },
  4: { start: '09:15', end: '09:55', label: '09:15 - 09:55' },
  5: { start: '10:15', end: '10:55', label: '10:15 - 10:55' },
  6: { start: '10:55', end: '11:35', label: '10:55 - 11:35' },
  7: { start: '11:35', end: '12:15', label: '11:35 - 12:15' },
  8: { start: '13:00', end: '13:40', label: '13:00 - 13:40' },
  9: { start: '13:40', end: '14:20', label: '13:40 - 14:20' },
  10: { start: '14:20', end: '15:00', label: '14:20 - 15:00' },
  11: { start: '15:00', end: '15:40', label: '15:00 - 15:40' },
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tanggal = searchParams.get('tanggal') || new Date().toISOString().slice(0, 10);
    const guruFilter = searchParams.get('guru');
    const autoPrint = searchParams.get('auto') === 'true';

    // Ambil data penugasan inval
    let query = supabase
      .from('tb_inval_guru')
      .select('*')
      .eq('tanggal', tanggal)
      .order('jam_ke', { ascending: true });

    if (guruFilter) {
      query = query.ilike('nama_guru_utama', `%${guruFilter.trim()}%`);
    }

    let { data: invalList, error } = await query;
    if (error && error.message?.includes('tb_inval_guru')) {
      const fallbackQuery = supabase
        .from('inval_guru')
        .select('*')
        .eq('tanggal', tanggal)
        .order('jam_ke', { ascending: true });
      const fallbackRes = await fallbackQuery;
      if (!fallbackRes.error) invalList = fallbackRes.data;
    }

    // Ambil inisial guru & data absensi (materi upload guru)
    let guruInitialsMap = {};
    let teacherAbsensiMap = {};
    try {
      const [gRes, absRes] = await Promise.all([
        supabase.from('tb_guru').select('nama_guru, inisial'),
        supabase.from('tb_absensi').select('nama, materi_nama, materi_url, keterangan_materi, alasan_izin').eq('tanggal', tanggal),
      ]);

      if (gRes.data) {
        gRes.data.forEach((g) => {
          if (g.nama_guru) guruInitialsMap[g.nama_guru.trim().toLowerCase()] = g.inisial ? g.inisial.trim().toUpperCase() : '';
        });
      }
      if (absRes.data) {
        absRes.data.forEach((a) => {
          if (a.nama) teacherAbsensiMap[a.nama.trim().toLowerCase()] = a;
        });
      }
    } catch (e) {
      console.warn('Initials/absensi fetch error:', e.message);
    }

    const items = invalList || [];

    // Grouping per guru utama
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

    // Format Tanggal & Hari
    const [yStr, mStr, dStr] = tanggal.split('-');
    const dateObj = new Date(Number(yStr), Number(mStr) - 1, Number(dStr));
    const namaHariList = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
    const namaHari = namaHariList[dateObj.getDay()] || 'HARI INI';
    const formattedDate = `${dStr}-${mStr}-${yStr}`;

    // Render HTML untuk setiap form guru
    let sheetsHtml = '';

    if (teacherKeys.length === 0) {
      sheetsHtml = `
        <div class="empty-state">
          <h2>Tidak Ada Data Penugasan Inval</h2>
          <p>Belum ada jadwal guru pengganti yang tercatat pada tanggal <b>${formattedDate}</b>.</p>
        </div>
      `;
    } else {
      teacherKeys.forEach((teacherName, tIdx) => {
        const teacherSessions = groupedByTeacher[teacherName];
        const firstSession = teacherSessions[0] || {};
        const inisialUtama = guruInitialsMap[teacherName.trim().toLowerCase()] || '';
        const teacherAbs = teacherAbsensiMap[teacherName.trim().toLowerCase()] || {};
        const alasanRaw = firstSession.keterangan_tugas?.replace('Alasan:', '').trim() || firstSession.alasan || teacherAbs.alasan_izin || 'SAKIT';
        const alasanDisplay = alasanRaw.toUpperCase();

        let rowsHtml = '';
        for (let jam = 1; jam <= 11; jam++) {
          const match = teacherSessions.find((s) => {
            const num = parseInt(String(s.jam_ke).replace(/\D/g, ''));
            return num === jam;
          });

          const timeInfo = SESSION_TIMETABLE[jam]?.label || '';
          const kelas = match ? (match.kelas && match.kelas !== '-' ? match.kelas : '-') : '-';
          
          let penggantiStr = '-';
          let bahanAjarCell = '-';

          if (match) {
            const rawPengganti = match.nama_guru_inval || '';
            const isFree = rawPengganti.includes('Jam Kosong') || rawPengganti === '-' || match.kelas === '-';
            if (!isFree) {
              const inisInval = guruInitialsMap[rawPengganti.trim().toLowerCase()] || '';
              penggantiStr = inisInval ? inisInval : rawPengganti;
            } else {
              penggantiStr = '-';
            }

            const materiUrl = match.materi_url || teacherAbs.materi_url || '';
            const materiNama = match.materi_nama || teacherAbs.materi_nama || '';
            const hasUrl = Boolean(materiUrl && !materiUrl.includes('bit.ly') && !materiUrl.includes('cekizindanmateri'));
            const hasNama = Boolean(materiNama && !materiNama.includes('bit.ly') && !materiNama.includes('cekizindanmateri') && materiNama.trim() !== '-' && !/^(sakit|izin|lainnya)$/i.test(materiNama.trim()));
            const ket = String(match.keterangan_tugas || teacherAbs.keterangan_materi || '').trim();
            const isReasonOnly = !ket || /^alasan\s*:\s*(sakit|izin|lainnya|.*)$/i.test(ket) || /^(sakit|izin|lainnya)$/i.test(ket);

            if (hasUrl || hasNama) {
              bahanAjarCell = 'Ada Bahan Ajar';
            } else if (!isReasonOnly && ket && !ket.includes('bit.ly')) {
              bahanAjarCell = ket.replace(/^alasan\s*:\s*/i, '').trim() || '-';
            } else {
              bahanAjarCell = '-';
            }
          }

          rowsHtml += `
            <tr>
              <td class="col-jam">${jam}</td>
              <td class="col-waktu">${timeInfo}</td>
              <td class="col-kelas">${kelas}</td>
              <td class="col-pengganti">${penggantiStr}</td>
              <td class="col-materi">${bahanAjarCell}</td>
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

            <div class="form-title">Form Guru Pengganti</div>

            <!-- META INFORMASI -->
            <table class="meta-table">
              <tr>
                <td style="width: 150px;">Guru Tidak Hadir</td>
                <td style="width: 15px;">:</td>
                <td class="meta-val"><b>${inisialUtama ? `[${inisialUtama}] ` : ''}${teacherName.toUpperCase()}</b></td>
              </tr>
              <tr>
                <td>Alasan</td>
                <td>:</td>
                <td class="meta-val"><b>${alasanDisplay}</b></td>
              </tr>
              <tr>
                <td>Hari/ Tanggal</td>
                <td>:</td>
                <td class="meta-val"><b>${namaHari} / ${formattedDate}</b></td>
              </tr>
            </table>

            <!-- TABEL 11 JAM PELAJARAN -->
            <table class="main-table">
              <thead>
                <tr>
                  <th style="width: 45px;">Jam</th>
                  <th style="width: 100px;">Waktu (40')</th>
                  <th style="width: 110px;">Kelas</th>
                  <th style="width: 110px;">Pengganti</th>
                  <th>Bahan Ajar / Materi</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>

            <!-- TANDA TANGAN WAKA KURIKULUM -->
            <div class="signature-container">
              <div class="signature-box">
                <div>Medan, ${formattedDate}</div>
                <div style="font-weight: bold; margin-top: 4px;">Waka Kurikulum</div>
                <div class="signature-space"></div>
                <div class="signature-name">Hendrawan, ST</div>
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
              margin: 12mm 15mm;
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
              color: #000;
            }
            
            /* TOP TOOLBAR (HIDDEN SAAT PRINT) */
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
              box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2);
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
              border-radius: 6px;
              border: none;
              font-size: 13px;
              font-weight: bold;
              cursor: pointer;
              transition: all 0.2s;
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

            /* LEMBAR DOKUMEN A4 */
            .sheet-wrapper {
              display: flex;
              flex-direction: column;
              align-items: center;
              padding: 24px 10px 60px 10px;
            }
            .sheet {
              background-color: #ffffff;
              width: 210mm;
              min-height: 297mm;
              padding: 15mm 20mm;
              margin-bottom: 24px;
              box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3);
              position: relative;
            }

            /* KOP SURAT RESMI */
            .kop-container {
              display: flex;
              align-items: center;
              border-bottom: 3px double #000000;
              padding-bottom: 8px;
              margin-bottom: 14px;
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

            .form-title {
              text-align: center;
              margin: 10px 0 14px 0;
              font-size: 17px;
              font-weight: 900;
              text-decoration: underline;
              letter-spacing: 0.5px;
            }

            .meta-table {
              width: 100%;
              margin-bottom: 12px;
              font-size: 13.5px;
              font-weight: bold;
            }
            .meta-table td {
              padding: 3px 0;
              vertical-align: top;
            }
            .meta-val {
              border-bottom: 1px solid #000000;
              padding-left: 6px;
            }

            .main-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 14px;
            }
            .main-table th {
              border: 1.5px solid #000000;
              padding: 6px 4px;
              font-size: 13px;
              background-color: #f1f5f9;
              text-align: center;
              font-weight: 900;
            }
            .main-table td {
              border: 1.5px solid #000000;
              padding: 5px 6px;
              font-size: 12.5px;
            }
            .col-jam {
              text-align: center;
              font-weight: 900;
              font-size: 13px;
            }
            .col-waktu {
              text-align: center;
              font-size: 11px;
              color: #334155;
              font-weight: bold;
              white-space: nowrap;
            }
            .col-kelas {
              text-align: center;
              font-weight: 900;
            }
            .col-pengganti {
              text-align: center;
              font-weight: 900;
              font-size: 13px;
            }
            .col-materi {
              font-size: 12px;
            }

            .signature-container {
              display: flex;
              justify-content: flex-end;
              margin-top: 10px;
            }
            .signature-box {
              width: 220px;
              text-align: center;
              font-size: 13px;
            }
            .signature-space {
              height: 52px;
            }
            .signature-name {
              font-weight: 900;
              border-bottom: 1.5px solid #000000;
              display: inline-block;
              padding: 0 4px;
            }

            .empty-state {
              background-color: #ffffff;
              padding: 40px;
              border-radius: 12px;
              text-align: center;
              margin-top: 40px;
              box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            }

            /* PRINT STYLES */
            @media print {
              body {
                background: none;
                padding: 0;
              }
              .no-print {
                display: none !important;
              }
              .sheet-wrapper {
                padding: 0;
              }
              .sheet {
                box-shadow: none;
                margin: 0;
                padding: 0;
                width: 100%;
                min-height: auto;
              }
              .page-break {
                page-break-after: always;
                break-after: page;
              }
            }
          </style>
        </head>
        <body>
          <!-- TOOLBAR ATAS (HANYA MUNCUL DI TAMPILAN WEB) -->
          <div class="top-toolbar no-print">
            <div class="toolbar-title">
              <span>📋 Form Guru Pengganti (Inval)</span>
              <span style="font-size: 12px; opacity: 0.8; font-weight: normal;">• ${formattedDate} (${teacherKeys.length} Guru)</span>
            </div>
            <div class="toolbar-actions">
              <button onclick="window.print()" class="btn-action btn-print">
                🖨️ Cetak / Simpan PDF
              </button>
              <button onclick="window.close()" class="btn-action btn-close">
                ✕ Tutup
              </button>
            </div>
          </div>

          <div class="sheet-wrapper">
            ${sheetsHtml}
          </div>

          ${autoPrint ? `
            <script>
              window.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => {
                  window.print();
                }, 400);
              });
            </script>
          ` : ''}
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
    console.error('Print route error:', err);
    return new NextResponse(`Error generating print sheet: ${err.message}`, { status: 500 });
  }
}
