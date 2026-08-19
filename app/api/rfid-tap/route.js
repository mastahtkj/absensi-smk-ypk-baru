import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const KIRIMI_USER_CODE = 'KMQZ4Y0826';
const KIRIMI_SECRET = '1e0a02ea9b9d4cd0a7320693ef8c7fee86197239da75f7cc01e94d32cde0190d';
const KIRIMI_DEVICE_ID = 'D-H7IJQ';
const KIRIMI_API_URL = 'https://api.kirimi.id/v1/send-message';

function formatPhoneNumber(phone) {
  if (!phone) return null;
  let cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  }
  return cleaned.length >= 10 ? cleaned : null;
}

// Fungsi Kirim WA dengan Timeout Safety 1.5 detik
async function sendWhatsAppMessage(targetNumber, messageText) {
  const formattedNumber = formatPhoneNumber(targetNumber);
  if (!formattedNumber) {
    console.error(`[Kirimi.id] Nomor HP tidak valid: ${targetNumber}`);
    return false;
  }

  const fetchPromise = fetch(KIRIMI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${KIRIMI_SECRET}`,
      'x-api-key': KIRIMI_SECRET,
    },
    body: JSON.stringify({
      user_code: KIRIMI_USER_CODE,
      secret: KIRIMI_SECRET,
      api_key: KIRIMI_SECRET,
      device_id: KIRIMI_DEVICE_ID,
      device: KIRIMI_DEVICE_ID,
      to: formattedNumber,
      phone: formattedNumber,
      message: messageText,
    }),
    cache: 'no-store',
  }).then(async (res) => {
    const result = await res.json().catch(() => ({}));
    console.log(`[Kirimi.id Response] Status ${res.status} Ke ${formattedNumber}:`, result);
    return res.ok;
  }).catch((err) => {
    console.error(`[Kirimi.id Exception] Ke ${formattedNumber}:`, err.message);
    return false;
  });

  const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve('TIMEOUT'), 1500));

  return Promise.race([fetchPromise, timeoutPromise]);
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

    // 1. CARI DATA SISWA
    const { data: siswa } = await supabase
      .from('tb_siswa')
      .select('id_siswa, uid_rfid, nama_siswa, kelas, jurusan, no_wa_pribadi, no_wa_ortu')
      .eq('uid_rfid', cleanUid)
      .maybeSingle();

    if (siswa) {
      const waktuWib = new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta',
      });

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

      const pesanWa = `*PRESENSI DIGITAL SMK YPK MEDAN*\n\n📢 *PEMBERITAHUAN PRESENSI SISWA*\n\n👤 *Nama:* ${siswa.nama_siswa}\n🏫 *Kelas:* ${siswa.kelas}\n📚 *Jurusan:* ${siswa.jurusan}\n⏰ *Waktu:* ${waktuWib} WIB\n📌 *Status:* ${statusTap}\n\n_Telah berhasil melakukan presensi di sekolah._\n_Terima Kasih._`;

      const listNomor = [siswa.no_wa_ortu, siswa.no_wa_pribadi].filter(Boolean);

      if (listNomor.length > 0) {
        await Promise.allSettled(listNomor.map((nomor) => sendWhatsAppMessage(nomor, pesanWa)));
      }

      return NextResponse.json({
        success: true,
        type: 'siswa',
        nama: siswa.nama_siswa,
        kelas: siswa.kelas,
        jurusan: siswa.jurusan || '-', // ✨ DITAMBAHKAN
        status: statusTap,
        target_nomor: listNomor,
      }, { status: 200 });
    }

    // 2. CARI DATA GURU
    const { data: guru } = await supabase
      .from('tb_guru')
      .select('id_guru, uid_rfid, nama_guru, inisial, role, no_wa_pribadi')
      .eq('uid_rfid', cleanUid)
      .maybeSingle();

    if (guru) {
      const waktuWib = new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta',
      });

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

      const pesanWaGuru = `*PRESENSI DIGITAL SMK YPK MEDAN*\n\n👨‍🏫 *PRESENSI KEHADIRAN GURU / STAFF*\n\n👤 *Nama:* ${guru.nama_guru}\n🏷️ *Inisial:* ${guru.inisial || '-'}\n🏫 *Jabatan:* ${guru.role || 'Guru'}\n⏰ *Waktu Tap:* ${waktuWib} WIB\n📌 *Status:* ${statusTap}\n\n_Presensi Anda telah berhasil dicatat._\n_Selamat bertugas!_`;

      if (guru.no_wa_pribadi) {
        await sendWhatsAppMessage(guru.no_wa_pribadi, pesanWaGuru);
      }

      return NextResponse.json({
        success: true,
        type: 'guru',
        nama: guru.nama_guru,
        inisial: guru.inisial || '-', // ✨ DITAMBAHKAN
        role: guru.role || 'Guru',    // ✨ DITAMBAHKAN
        status: statusTap,
        target_nomor: guru.no_wa_pribadi || 'TIDAK ADA NOMOR',
      }, { status: 200 });
    }

    // 3. KARTU BELUM TERDAFTAR
    await supabase.from('latest_scan').upsert([{ id: 1, uid: cleanUid, updated_at: new Date().toISOString() }]);

    return NextResponse.json({
      success: false,
      message: 'Kartu RFID Belum Terdaftar!',
      uid: cleanUid,
    }, { status: 404 });

  } catch (err) {
    console.error('[API Server Error]:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
