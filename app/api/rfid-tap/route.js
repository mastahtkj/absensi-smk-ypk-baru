import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Mengambil dari ENV Vercel (Mendukung KIRIMI_SECRET maupun KIRIMI_SECRET_KEY)
const KIRIMI_USER_CODE = process.env.KIRIMI_USER_CODE || 'KMQZ4Y0826';
const KIRIMI_SECRET = process.env.KIRIMI_SECRET_KEY || process.env.KIRIMI_SECRET || 'b764c93a42e511076a8ddd201717e4a4967ca8271ae1581c3ae33641d9f18e80';
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
  if (!formattedNumber) {
    console.error(`[Kirimi.id Error] Nomor WhatsApp tidak valid: ${targetNumber}`);
    return false;
  }

  try {
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
        receiver: formattedNumber, // 👈 PERBAIKAN: Kirimi.id menggunakan 'receiver'
        to: formattedNumber,       // Tetap disertakan sebagai fallback
        message: messageText,
      }),
      cache: 'no-store',
    });

    const result = await response.json().catch(() => ({}));
    console.log(`[Kirimi.id Success] Status ${response.status} to ${formattedNumber}:`, result);
    return response.ok;
  } catch (err) {
    console.error(`[Kirimi.id Exception] Failed to send to ${formattedNumber}:`, err.message);
    return false;
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const rawUid = body.rfid_uid || body.uid_rfid || body.uid;
    const statusTap = body.status || 'Hadir';

    if (!rawUid) {
      return NextResponse.json({ success: false, message: 'UID RFID tidak ditemukan' }, { status: 400 });
    }

    const cleanUid = String(rawUid).trim().toUpperCase();
    const waktuWib = new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jakarta',
    });

    // 1. CEK SISWA
    const { data: siswa } = await supabase
      .from('tb_siswa')
      .select('id_siswa, uid_rfid, nama_siswa, kelas, jurusan, no_wa_pribadi, no_wa_ortu')
      .eq('uid_rfid', cleanUid)
      .maybeSingle();

    if (siswa) {
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

      if (listNomor.length > 0) {
        await Promise.allSettled(listNomor.map((nomor) => sendWhatsAppMessage(nomor, pesanWa)));
      }

      const inisialSiswa = siswa.nama_siswa.trim().split(' ')[0];

      return NextResponse.json({
        success: true,
        type: 'siswa',
        nama: siswa.nama_siswa,
        inisial: inisialSiswa,
        target_nomor: listNomor,
      }, { status: 200 });
    }

    // 2. CEK GURU
    const { data: guru } = await supabase
      .from('tb_guru')
      .select('id_guru, uid_rfid, nama_guru, inisial, role, no_wa_pribadi')
      .eq('uid_rfid', cleanUid)
      .maybeSingle();

    if (guru) {
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

      if (guru.no_wa_pribadi) {
        await sendWhatsAppMessage(guru.no_wa_pribadi, pesanWaGuru);
      }

      return NextResponse.json({
        success: true,
        type: 'guru',
        nama: guru.nama_guru,
        inisial: guru.inisial || guru.nama_guru.trim().split(' ')[0],
        target_nomor: guru.no_wa_pribadi || 'TIDAK ADA NOMOR',
      }, { status: 200 });
    }

    // 3. KARTU TIDAK TERDAFTAR
    await supabase.from('latest_scan').upsert([{ id: 1, uid: cleanUid, updated_at: new Date().toISOString() }]);

    return NextResponse.json({
      success: false,
      message: 'Kartu RFID Belum Terdaftar!',
      uid: cleanUid,
    }, { status: 404 });

  } catch (err) {
    console.error('[API Error]:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
