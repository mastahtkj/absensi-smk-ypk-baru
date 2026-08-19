import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const KIRIMI_USER_CODE = process.env.KIRIMI_USER_CODE || 'KMQZ4Y0826';
const KIRIMI_SECRET = process.env.KIRIMI_SECRET || 'b764c93a42e511076a8ddd201717e4a4967ca8271ae1581c3ae33641d9f18e80';
const KIRIMI_DEVICE_ID = process.env.KIRIMI_DEVICE_ID || 'D-QYXDB';
const KIRIMI_API_URL = 'https://api.kirimi.id/v1/send-message';

function formatPhoneNumber(phone) {
  if (!phone) return null;
  let cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (cleaned.startsWith('8')) {
    cleaned = '62' + cleaned;
  }
  return cleaned.length >= 10 ? cleaned : null;
}

async function sendWhatsAppMessage(targetNumber, messageText) {
  const formattedNumber = formatPhoneNumber(targetNumber);
  
  console.log(`[WA LOG] Memproses pengiriman ke: ${targetNumber} (Formatted: ${formattedNumber})`);

  if (!formattedNumber) {
    console.error(`[WA LOG ERROR] Nomor WhatsApp tidak valid atau kosong: ${targetNumber}`);
    return { success: false, reason: 'Nomor tidak valid' };
  }

  const payload = {
    user_code: KIRIMI_USER_CODE,
    secret: KIRIMI_SECRET,
    device_id: KIRIMI_DEVICE_ID,
    to: formattedNumber,
    message: messageText,
  };

  try {
    console.log(`[WA LOG] Mengirim HTTP POST ke Kirimi.id untuk ${formattedNumber}...`);
    
    const response = await fetch(KIRIMI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${KIRIMI_SECRET}`,
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    const rawResponse = await response.text();
    let result;
    try {
      result = JSON.parse(rawResponse);
    } catch {
      result = rawResponse;
    }

    console.log(`[WA LOG RESULT] HTTP Status: ${response.status} | Response Payload:`, JSON.stringify(result));

    return { ok: response.ok, status: response.status, data: result };
  } catch (err) {
    console.error(`[WA LOG EXCEPTION] Failed sending to ${formattedNumber}:`, err.message);
    return { ok: false, error: err.message };
  }
}

export async function POST(request) {
  const requestStartTime = Date.now();
  console.log('==================================================');
  console.log('[API ROUTE] Incoming POST Request to /api/absensi');

  try {
    const body = await request.json();
    console.log('[API ROUTE] Request Body:', JSON.stringify(body));

    const rawUid = body.rfid_uid || body.uid_rfid || body.uid;
    const statusTap = body.status || 'Hadir';

    if (!rawUid) {
      console.warn('[API ROUTE WARNING] Request ditolak: UID RFID tidak ditemukan pada body');
      return NextResponse.json({ success: false, message: 'UID RFID tidak ditemukan' }, { status: 400 });
    }

    const cleanUid = String(rawUid).trim().toUpperCase();
    const waktuWib = new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jakarta',
    });

    console.log(`[API ROUTE] Processing UID: ${cleanUid} | Status: ${statusTap}`);

    // 1. CEK SISWA
    console.log(`[SUPABASE] Mencari data siswa dengan UID: ${cleanUid}`);
    const { data: siswa, error: errSiswa } = await supabase
      .from('tb_siswa')
      .select('id_siswa, uid_rfid, nama_siswa, kelas, jurusan, no_wa_pribadi, no_wa_ortu')
      .eq('uid_rfid', cleanUid)
      .maybeSingle();

    if (errSiswa) console.error('[SUPABASE ERROR] Query Siswa Error:', errSiswa);

    if (siswa) {
      console.log(`[SUPABASE] Siswa ditemukan: ${siswa.nama_siswa} (${siswa.kelas})`);

      await Promise.allSettled([
        supabase.from('absensi').insert([{
          rfid_uid: cleanUid,
          nama: siswa.nama_siswa,
          kelas: siswa.kelas,
          status: statusTap,
          created_at: new Date().toISOString(),
        }]),
        supabase.from('latest_scan').upsert([{ id: 1, uid: cleanUid, updated_at: new Date().toISOString() }])
      ]);

      const pesanWa = `*PRESENSI DIGITAL SMK YPK MEDAN*\n\n📢 *PEMBERITAHUAN PRESENSI SISWA*\n\n👤 *Nama:* ${siswa.nama_siswa}\n🏫 *Kelas:* ${siswa.kelas}\n📚 *Jurusan:* ${siswa.jurusan || '-'}\n⏰ *Waktu:* ${waktuWib} WIB\n📌 *Status:* ${statusTap}\n\n_Telah berhasil melakukan presensi di sekolah._`;

      const listNomor = [siswa.no_wa_ortu, siswa.no_wa_pribadi].filter(Boolean);
      console.log(`[WA LOG] Nomor tujuan siswa/ortu found (${listNomor.length}):`, listNomor);

      let waResults = [];
      if (listNomor.length > 0) {
        // Await pengiriman agar Vercel serverless function tidak keburu terminate
        waResults = await Promise.all(listNomor.map((nomor) => sendWhatsAppMessage(nomor, pesanWa)));
      } else {
        console.warn('[WA LOG WARNING] Tidak ada nomor WA terdaftar untuk siswa ini!');
      }

      console.log(`[API ROUTE] Finished in ${Date.now() - requestStartTime}ms`);
      return NextResponse.json({
        success: true,
        type: 'siswa',
        nama: siswa.nama_siswa,
        target_nomor: listNomor,
        wa_results: waResults
      }, { status: 200 });
    }

    // 2. CEK GURU
    console.log(`[SUPABASE] Mencari data guru dengan UID: ${cleanUid}`);
    const { data: guru, error: errGuru } = await supabase
      .from('tb_guru')
      .select('id_guru, uid_rfid, nama_guru, inisial, role, no_wa_pribadi')
      .eq('uid_rfid', cleanUid)
      .maybeSingle();

    if (errGuru) console.error('[SUPABASE ERROR] Query Guru Error:', errGuru);

    if (guru) {
      console.log(`[SUPABASE] Guru/Staff ditemukan: ${guru.nama_guru}`);
      const jabatan = guru.role === 'admin' ? "MASTER'K" : 'Guru / Staff';

      await Promise.allSettled([
        supabase.from('absensi').insert([{
          rfid_uid: cleanUid,
          nama: guru.nama_guru,
          kelas: jabatan,
          status: statusTap,
          created_at: new Date().toISOString(),
        }]),
        supabase.from('latest_scan').upsert([{ id: 1, uid: cleanUid, updated_at: new Date().toISOString() }])
      ]);

      const pesanWaGuru = `*PRESENSI DIGITAL SMK YPK MEDAN*\n\n👨‍🏫 *PRESENSI KEHADIRAN GURU / STAFF*\n\n👤 *Nama:* ${guru.nama_guru}\n🏷️ *Inisial:* ${guru.inisial || '-'}\n🏫 *Jabatan:* ${guru.role || 'Guru'}\n⏰ *Waktu Tap:* ${waktuWib} WIB\n📌 *Status:* ${statusTap}\n\n_Presensi Anda telah berhasil dicatat._`;

      let waResult = null;
      if (guru.no_wa_pribadi) {
        console.log(`[WA LOG] Memulai pengiriman WA ke Guru: ${guru.no_wa_pribadi}`);
        waResult = await sendWhatsAppMessage(guru.no_wa_pribadi, pesanWaGuru);
      } else {
        console.warn('[WA LOG WARNING] Nomor WA Guru kosong!');
      }

      console.log(`[API ROUTE] Finished in ${Date.now() - requestStartTime}ms`);
      return NextResponse.json({
        success: true,
        type: 'guru',
        nama: guru.nama_guru,
        target_nomor: guru.no_wa_pribadi || 'TIDAK ADA NOMOR',
        wa_result: waResult
      }, { status: 200 });
    }

    // 3. KARTU TIDAK TERDAFTAR
    console.warn(`[SUPABASE] UID ${cleanUid} tidak ditemukan di tb_siswa maupun tb_guru`);
    await supabase.from('latest_scan').upsert([{ id: 1, uid: cleanUid, updated_at: new Date().toISOString() }]);

    console.log(`[API ROUTE] Finished in ${Date.now() - requestStartTime}ms`);
    return NextResponse.json({
      success: false,
      message: 'Kartu RFID Belum Terdaftar!',
      uid: cleanUid,
    }, { status: 404 });

  } catch (err) {
    console.error('[API ROUTE EXCEPTION] Internal Server Error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
