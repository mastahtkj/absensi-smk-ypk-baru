import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const preferredRegion = ['sin1'];
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const KIRIMI_USER_CODE = process.env.KIRIMI_USER_CODE || 'KMQZ4Y0826';
const KIRIMI_SECRET = process.env.KIRIMI_SECRET_KEY || process.env.KIRIMI_SECRET || 'b764c93a42e511076a8ddd201717e4a4967ca8271ae1581c3ae33641d9f18e80';
const KIRIMI_DEVICE_ID = process.env.KIRIMI_DEVICE_ID || 'D-QYXDB';
const KIRIMI_API_URL = 'https://api.kirimi.id/v1/send-message';
const KIRIMI_GROUP_GURU = process.env.KIRIMI_GROUP_GURU || '120363428231610054@g.us';

function formatPhoneNumber(phone) {
  if (!phone) return null;
  let cleaned = String(phone).trim();
  if (cleaned.endsWith('@g.us')) return cleaned;
  cleaned = cleaned.replace(/\D/g, '');
  if (cleaned.startsWith('0')) cleaned = '62' + cleaned.slice(1);
  else if (cleaned.startsWith('8')) cleaned = '62' + cleaned;
  return cleaned.length >= 10 ? cleaned : null;
}

async function sendWhatsAppMessage(targetNumber, messageText) {
  const formattedTarget = formatPhoneNumber(targetNumber);
  if (!formattedTarget) return false;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(KIRIMI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${KIRIMI_SECRET}`,
      },
      body: JSON.stringify({
        user_code: KIRIMI_USER_CODE,
        secret: KIRIMI_SECRET,
        device_id: KIRIMI_DEVICE_ID,
        receiver: formattedTarget,
        phone: formattedTarget,
        target: formattedTarget,
        message: messageText,
      }),
      cache: 'no-store',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (err) {
    console.error('[Kirimi.id Inval WA Error]:', err.message);
    return false;
  }
}

// GET: Ambil daftar inval guru
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tanggal = searchParams.get('tanggal'); // 'YYYY-MM-DD' atau 'all'

    let query = supabase
      .from('tb_inval_guru')
      .select('*')
      .order('created_at', { ascending: false });

    if (tanggal && tanggal !== 'all') {
      query = query.eq('tanggal', tanggal);
    }

    const { data, error } = await query;

    if (error) {
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        console.warn('Tabel tb_inval_guru belum dibuat di Supabase. Mengembalikan array kosong.');
        return NextResponse.json({ success: true, data: [], isTableMissing: true });
      }
      throw error;
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (err) {
    console.error('[GET Inval Guru Error]:', err.message);
    return NextResponse.json({ success: false, error: err.message, data: [] }, { status: 500 });
  }
}

// POST: Tambah penugasan inval guru baru (Mendukung Multi-Input / Batch hingga 11+ jadwal sekaligus)
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      tanggal,
      id_guru_utama,
      nama_guru_utama,
      alasan = 'SAKIT',
      bahan_ajar_url = 'https://bit.ly/cekizindanmateri',
      id_guru_inval,
      nama_guru_inval,
      kelas,
      mapel,
      jam_ke,
      assigned_by,
      assignments, // Array of { id_guru_inval, nama_guru_inval, kelas, mapel, jam_ke }
    } = body;

    const todayDate = tanggal || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
    const updater = assigned_by || 'Admin';

    // 🔍 AMBIL BAHAN AJAR & KETERANGAN TUGAS SECARA OTOMATIS DARI TB_ABSENSI GURU YANG BERHALANGAN
    let autoMateriNama = '';
    let autoMateriUrl = '';
    let autoKeterangan = `Alasan: ${alasan || 'SAKIT'}`;

    try {
      const { data: absensiMatch } = await supabase
        .from('tb_absensi')
        .select('materi_nama, materi_url, keterangan_materi, alasan_izin')
        .ilike('nama', `%${String(nama_guru_utama).trim()}%`)
        .eq('tanggal', todayDate)
        .limit(1)
        .maybeSingle();

      if (absensiMatch) {
        if (absensiMatch.materi_nama) autoMateriNama = absensiMatch.materi_nama;
        if (absensiMatch.materi_url) autoMateriUrl = absensiMatch.materi_url;
        if (absensiMatch.keterangan_materi) autoKeterangan = absensiMatch.keterangan_materi;
        else if (absensiMatch.alasan_izin) autoKeterangan = `Alasan: ${absensiMatch.alasan_izin}`;
      }
    } catch (e) {
      console.warn('Lookup tb_absensi for inval material note:', e);
    }

    let insertPayloads = [];

    // JIKA BATCH MULTI-INPUT (BANYAK JAM/KELAS DALAM 1 KALI SIMPAN)
    if (Array.isArray(assignments) && assignments.length > 0) {
      if (!nama_guru_utama) {
        return NextResponse.json({
          success: false,
          error: 'Nama Guru Utama (yang izin/sakit) wajib diisi!'
        }, { status: 400 });
      }

      insertPayloads = assignments
        .filter((item) => item.jam_ke || item.kelas || item.nama_guru_inval)
        .map((item) => {
          const rawGuru = item.nama_guru_inval ? String(item.nama_guru_inval).trim() : '-';
          const isKosong = rawGuru === '-' || rawGuru === '' || rawGuru.toLowerCase().includes('kosong');
          const cleanGuru = isKosong ? '- (Jam Kosong)' : rawGuru;
          const cleanKelas = item.kelas && item.kelas.trim() !== '' ? String(item.kelas).trim() : '-';
          const cleanMapel = item.mapel && item.mapel.trim() !== '' ? String(item.mapel).trim() : '-';
          const cleanJam = item.jam_ke && item.jam_ke.trim() !== '' ? String(item.jam_ke).trim() : '-';
          const itemAlasan = item.alasan || alasan || 'SAKIT';
          const itemMateriNama = item.materi_nama || body.materi_nama || autoMateriNama || '';
          const itemMateriUrl = item.materi_url || autoMateriUrl || '';
          const itemFileBase64 = item.materi_file_base64 || body.materi_file_base64 || '';
          const itemFileName = item.materi_file_name || body.materi_file_name || '';
          const itemFileType = item.materi_file_type || body.materi_file_type || '';

          return {
            tanggal: todayDate,
            id_guru_utama: id_guru_utama || null,
            nama_guru_utama: String(nama_guru_utama).trim(),
            alasan: itemAlasan,
            id_guru_inval: isKosong ? null : (item.id_guru_inval || null),
            nama_guru_inval: cleanGuru,
            kelas: cleanKelas,
            mapel: cleanMapel,
            jam_ke: cleanJam,
            materi_nama: itemMateriNama,
            materi_url: itemMateriUrl,
            materi_file_base64: itemFileBase64,
            materi_file_name: itemFileName,
            materi_file_type: itemFileType,
            keterangan_tugas: autoKeterangan,
            status_inval: isKosong ? 'Selesai' : 'Ditugaskan',
            assigned_by: updater,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        });

      if (insertPayloads.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Setidaknya 1 baris jadwal penugasan harus diisi!'
        }, { status: 400 });
      }
    } else {
      // SINGLE INPUT
      if (!nama_guru_utama) {
        return NextResponse.json({
          success: false,
          error: 'Nama Guru Utama wajib diisi!'
        }, { status: 400 });
      }

      const rawGuru = nama_guru_inval ? String(nama_guru_inval).trim() : '-';
      const isKosong = rawGuru === '-' || rawGuru === '' || rawGuru.toLowerCase().includes('kosong');
      const cleanGuru = isKosong ? '- (Jam Kosong)' : rawGuru;

      insertPayloads = [{
        tanggal: todayDate,
        id_guru_utama: id_guru_utama || null,
        nama_guru_utama: String(nama_guru_utama).trim(),
        alasan: alasan || 'SAKIT',
        id_guru_inval: isKosong ? null : (id_guru_inval || null),
        nama_guru_inval: cleanGuru,
        kelas: kelas || '-',
        mapel: mapel || '-',
        jam_ke: jam_ke || '-',
        materi_nama: body.materi_nama || autoMateriNama || '',
        materi_url: autoMateriUrl || '',
        materi_file_base64: body.materi_file_base64 || '',
        materi_file_name: body.materi_file_name || '',
        materi_file_type: body.materi_file_type || '',
        keterangan_tugas: autoKeterangan,
        status_inval: isKosong ? 'Selesai' : 'Ditugaskan',
        assigned_by: updater,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }];
    }

    let insertRes = await supabase.from('tb_inval_guru').insert(insertPayloads).select();
    
    // Jika tabel tb_inval_guru belum ada, coba ke inval_guru
    if (insertRes.error && (insertRes.error.message?.includes('does not exist') || insertRes.error.message?.includes('schema cache'))) {
      const fallbackRes = await supabase.from('inval_guru').insert(insertPayloads).select();
      if (!fallbackRes.error) {
        insertRes = fallbackRes;
      }
    }

    if (insertRes.error) {
      if (insertRes.error.message?.includes('does not exist') || insertRes.error.message?.includes('schema cache') || insertRes.error.code === '42P01') {
        return NextResponse.json({
          success: false,
          isTableMissing: true,
          error: "Tabel 'public.tb_inval_guru' belum dibuat di Supabase. Silakan jalankan script SQL di Supabase SQL Editor.",
          sql: `CREATE TABLE IF NOT EXISTS public.tb_inval_guru (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tanggal DATE DEFAULT CURRENT_DATE,
    id_guru_utama BIGINT,
    nama_guru_utama VARCHAR(255) NOT NULL,
    id_guru_inval BIGINT,
    nama_guru_inval VARCHAR(255) NOT NULL,
    kelas VARCHAR(100) NOT NULL,
    mapel VARCHAR(150),
    jam_ke VARCHAR(100),
    materi_nama VARCHAR(255),
    materi_url TEXT,
    keterangan_tugas TEXT,
    status_inval VARCHAR(50) DEFAULT 'Ditugaskan',
    assigned_by VARCHAR(100) DEFAULT 'Admin',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.tb_inval_guru ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.tb_inval_guru TO anon, authenticated, service_role;
DROP POLICY IF EXISTS "Universal access for tb_inval_guru" ON public.tb_inval_guru;
CREATE POLICY "Universal access for tb_inval_guru" ON public.tb_inval_guru FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);`
        }, { status: 500 });
      }
      throw insertRes.error;
    }

    // Catat ke Audit Trail
    const guruInvalNames = [...new Set(insertPayloads.map((p) => p.nama_guru_inval))].join(', ');
    await supabase.from('audit_log_presensi').insert([{
      diubah_oleh: updater,
      role_pengubah: 'Admin/Guru Piket',
      target_nama: guruInvalNames,
      status_lama: 'Belum Ada Inval',
      status_baru: `Penugasan Inval (${insertPayloads.length} Sesi) untuk ${nama_guru_utama}`,
      created_at: new Date().toISOString()
    }]);

    // Ambil inisial guru untuk pesan WhatsApp
    let allGurus = [];
    try {
      const { data: gData } = await supabase.from('tb_guru').select('nama_guru, inisial');
      allGurus = gData || [];
    } catch (e) {
      console.warn('Could not fetch teacher initials for WA:', e.message);
    }

    const guruUtamaMatch = allGurus.find(
      (g) => g.nama_guru && g.nama_guru.trim().toLowerCase() === String(nama_guru_utama).trim().toLowerCase()
    );
    const inisialUtama = guruUtamaMatch?.inisial ? guruUtamaMatch.inisial.trim().toUpperCase() : '';

    // Hitung Hari & Tanggal dalam format Bahasa Indonesia (contoh: RABU / 26-08-2026)
    const [yStr, mStr, dStr] = todayDate.split('-');
    const dateObj = new Date(Number(yStr), Number(mStr) - 1, Number(dStr));
    const namaHariList = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
    const namaHari = namaHariList[dateObj.getDay()] || 'HARI INI';
    const tglIndoFormatted = `${dStr}-${mStr}-${yStr}`;

    // Ambil base URL aplikasi untuk link PDF
    let originUrl = '';
    try {
      originUrl = new URL(request.url).origin;
    } catch (_) {
      originUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    }

    const SESSION_TIMES = {
      1: '07:15 - 07:55',
      2: '07:55 - 08:35',
      3: '08:35 - 09:15',
      4: '09:15 - 09:55',
      5: '10:15 - 10:55',
      6: '10:55 - 11:35',
      7: '11:35 - 12:15',
      8: '13:00 - 13:40',
      9: '13:40 - 14:20',
      10: '14:20 - 15:00',
      11: '15:00 - 15:40',
    };

    // Format Pesan WhatsApp Rekap (SESUAI DENGAN FORM GURU PENGGANTI GAMBAR RESMI)
    let waText = `📋 *Form Guru Pengganti (Inval)*\n` +
      `*SMK YPK MEDAN*\n` +
      `════════════════════════\n` +
      `👨‍🏫 *Guru Tidak Hadir* : *${inisialUtama ? `[${inisialUtama}] ` : ''}${String(nama_guru_utama).toUpperCase()}*\n` +
      `📌 *Alasan* : *${String(alasan || 'SAKIT').toUpperCase()}*\n` +
      `📅 *Hari/ Tanggal* : *${namaHari} / ${tglIndoFormatted}*\n` +
      `────────────────────────\n` +
      `*JADWAL KELAS & GURU PENGGANTI:*\n`;

    insertPayloads.forEach((item) => {
      const jamNum = parseInt(String(item.jam_ke).replace(/\D/g, '')) || item.jam_ke;
      const timeStr = SESSION_TIMES[jamNum] ? ` (${SESSION_TIMES[jamNum]})` : '';
      const isFree = item.nama_guru_inval?.includes('Jam Kosong') || item.nama_guru_inval === '-' || item.kelas === '-';
      const guruInvalMatch = allGurus.find(
        (g) => g.nama_guru && g.nama_guru.trim().toLowerCase() === String(item.nama_guru_inval).trim().toLowerCase()
      );
      const inisInval = guruInvalMatch?.inisial ? guruInvalMatch.inisial.trim().toUpperCase() : '';

      if (isFree) {
        waText += `• *Jam ${item.jam_ke}*${timeStr} : \`-\` (Jam Bebas/Kosong)\n`;
      } else {
        const initialDisplay = inisInval ? `*[${inisInval}]* ` : '';
        waText += `• *Jam ${item.jam_ke}*${timeStr} [🏫 *${item.kelas}*] 👉 *${initialDisplay}${item.nama_guru_inval}*\n`;
      }
    });

    const hasCleanMateriNama = autoMateriNama && !autoMateriNama.includes('bit.ly') && !/^(sakit|izin|lainnya)$/i.test(autoMateriNama.trim());
    const hasCleanMateriUrl = autoMateriUrl && !autoMateriUrl.includes('bit.ly') && !autoMateriUrl.includes('cekizindanmateri');

    if (hasCleanMateriNama || hasCleanMateriUrl) {
      waText += `────────────────────────\n` +
        `📄 *Bahan Ajar / Tugas* : *Ada Bahan Ajar*\n` +
        (hasCleanMateriUrl ? `🔗 *Unduh Materi* : ${autoMateriUrl}\n` : '');
    }

    if (originUrl) {
      const pdfLink = `${originUrl}/api/inval-guru/print?tanggal=${todayDate}&guru=${encodeURIComponent(nama_guru_utama)}`;
      waText += `────────────────────────\n` +
        `🖨️ *Lihat / Unduh Form Resmi (PDF)*:\n` +
        `${pdfLink}\n`;
    }

    waText += `════════════════════════\n` +
      `_Medan, ${tglIndoFormatted}_\n` +
      `*Waka Kurikulum*\n` +
      `_Hendrawan, ST_`;

    if (KIRIMI_GROUP_GURU) {
      await sendWhatsAppMessage(KIRIMI_GROUP_GURU, waText);
    }

    return NextResponse.json({
      success: true,
      data: insertRes.data,
      count: insertPayloads.length,
      message: `Berhasil menyimpan ${insertPayloads.length} jadwal inval untuk ${nama_guru_utama}. Notifikasi WhatsApp telah dikirimkan.`
    });
  } catch (err) {
    console.error('[POST Inval Guru Error]:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// PATCH: Perbarui status inval (misal menjadi 'Selesai' atau 'Sedang Berjalan')
export async function PATCH(request) {
  try {
    const body = await request.json();
    const { id, status_inval, updated_by } = body;

    if (!id || !status_inval) {
      return NextResponse.json({ success: false, error: 'ID dan status_inval wajib diisi!' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('tb_inval_guru')
      .update({
        status_inval,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data,
      message: `Status inval berhasil diubah menjadi ${status_inval}.`
    });
  } catch (err) {
    console.error('[PATCH Inval Guru Error]:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE: Hapus penugasan inval dan kirim notifikasi pembatalan/penghapusan ke WhatsApp
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const idsParam = searchParams.get('ids');
    const tanggal = searchParams.get('tanggal');
    const guruUtama = searchParams.get('guru_utama');
    const deletedBy = searchParams.get('deleted_by') || 'Admin';

    const idsList = idsParam ? idsParam.split(',').map((x) => x.trim()).filter(Boolean) : (id ? [id] : []);

    if (idsList.length === 0 && (!tanggal || !guruUtama)) {
      return NextResponse.json({ success: false, error: 'ID atau Parameter Guru & Tanggal wajib disertakan!' }, { status: 400 });
    }

    let itemsToDelete = [];

    // Ambil data sebelum dihapus untuk notifikasi WhatsApp
    if (idsList.length > 0) {
      const { data: itemData } = await supabase.from('tb_inval_guru').select('*').in('id', idsList);
      if (itemData) itemsToDelete = itemData;
    } else if (tanggal && guruUtama) {
      const { data: batchData } = await supabase
        .from('tb_inval_guru')
        .select('*')
        .eq('tanggal', tanggal)
        .ilike('nama_guru_utama', `%${guruUtama}%`);
      itemsToDelete = batchData || [];
    }

    // Lakukan penghapusan di database
    let deleteQuery = supabase.from('tb_inval_guru').delete();
    if (idsList.length > 0) {
      deleteQuery = deleteQuery.in('id', idsList);
    } else {
      deleteQuery = deleteQuery.eq('tanggal', tanggal).ilike('nama_guru_utama', `%${guruUtama}%`);
    }

    const { error: delError } = await deleteQuery;
    if (delError) {
      // Fallback jika nama tabel inval_guru
      if (delError.message?.includes('does not exist') || delError.message?.includes('schema cache')) {
        let fbQuery = supabase.from('inval_guru').delete();
        if (idsList.length > 0) fbQuery = fbQuery.in('id', idsList);
        else fbQuery = fbQuery.eq('tanggal', tanggal).ilike('nama_guru_utama', `%${guruUtama}%`);
        await fbQuery;
      } else {
        throw delError;
      }
    }

    // Catat ke Audit Trail & Kirim WhatsApp
    if (itemsToDelete.length > 0) {
      const targetNama = itemsToDelete[0]?.nama_guru_utama || 'Inval';
      await supabase.from('audit_log_presensi').insert([{
        diubah_oleh: deletedBy,
        role_pengubah: 'Admin/Guru Piket',
        target_nama: `${itemsToDelete.length} Sesi Inval`,
        status_lama: 'Ditugaskan',
        status_baru: `Dihapus/Dibatalkan (${itemsToDelete.length} Jam)`,
        created_at: new Date().toISOString()
      }]);

      // Kirim Notifikasi Pembatalan ke WhatsApp Group
      const tglItem = itemsToDelete[0]?.tanggal || new Date().toISOString().slice(0, 10);
      const [yStr, mStr, dStr] = tglItem.split('-');
      const dateObj = new Date(Number(yStr), Number(mStr) - 1, Number(dStr));
      const namaHariList = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
      const namaHari = namaHariList[dateObj.getDay()] || 'HARI INI';
      const tglIndoFormatted = `${dStr}-${mStr}-${yStr}`;

      // Kelompokkan per Guru Utama jika ada beberapa guru
      const groupedByGuru = {};
      itemsToDelete.forEach((it) => {
        const gName = it.nama_guru_utama || 'Guru Tidak Hadir';
        if (!groupedByGuru[gName]) groupedByGuru[gName] = [];
        groupedByGuru[gName].push(it);
      });

      let waDeleteText = `❌ *[ PEMBATALAN / PENGHAPUSAN INVAL GURU ]* ❌\n` +
        `*SMK YPK MEDAN*\n` +
        `════════════════════════\n` +
        `Pemberitahuan: Penugasan Guru Pengganti berikut telah *DIHAPUS / DIBATALKAN*:\n\n` +
        `📅 *Hari / Tanggal* : *${namaHari} / ${tglIndoFormatted}*\n` +
        `👤 *Dihapus Oleh*   : *${deletedBy}*\n` +
        `────────────────────────\n`;

      Object.keys(groupedByGuru).forEach((gName) => {
        const list = groupedByGuru[gName];
        waDeleteText += `👨‍🏫 *Guru Tidak Hadir*: *${String(gName).toUpperCase()}*\n`;
        list.sort((a, b) => (parseInt(a.jam_ke) || 0) - (parseInt(b.jam_ke) || 0));
        list.forEach((item) => {
          waDeleteText += `  • Jam ${item.jam_ke} [🏫 ${item.kelas}] 👉 ${item.nama_guru_inval}\n`;
        });
        waDeleteText += `────────────────────────\n`;
      });

      waDeleteText += `_Data jadwal inval telah dibersihkan dari sistem._`;

      if (KIRIMI_GROUP_GURU) {
        await sendWhatsAppMessage(KIRIMI_GROUP_GURU, waDeleteText);
      }
    }

    return NextResponse.json({
      success: true,
      deletedCount: itemsToDelete.length,
      message: `Berhasil menghapus ${itemsToDelete.length} penugasan inval. Notifikasi pembatalan telah dikirimkan ke WhatsApp.`
    });
  } catch (err) {
    console.error('[DELETE Inval Guru Error]:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
