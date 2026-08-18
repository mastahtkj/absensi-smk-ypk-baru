import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// KREDENSIAL KIRIMI.ID
const KIRIMI_USER_CODE = 'KMQZ4Y0826';
const KIRIMI_SECRET = '0a2eae1b7a76fb9709f691fa0ebcff536c86aa1b3247f45eee8ab05e53aae3b1';

// Formatter Nomor Telepon ke Format Internasional (628xxx)
function formatPhoneNumber(phone) {
  if (!phone) return null;
  let cleaned = phone.toString().replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  }
  return cleaned;
}

export async function POST(request) {
  try {
    let uid = '';

    // Parse data dari ESP8266 (dukungan JSON maupun Form Data)
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await request.json();
      uid = body.uid || body.rfid_uid || '';
    } else {
      const formData = await request.formData();
      uid = formData.get('uid') || formData.get('rfid_uid') || '';
    }

    uid = uid.toString().trim().toUpperCase();

    if (!uid) {
      return NextResponse.json({ success: false, message: 'UID tidak ditemukan' }, { status: 400 });
    }

    // 1. Update tabel latest_scan untuk mode registrasi
    await supabase.from('latest_scan').upsert({ id: 1, uid, updated_at: new Date().toISOString() });

    // 2. Cari UID di tabel rfid_cards (Siswa)
    let { data: targetData } = await supabase
      .from('rfid_cards')
      .select('*')
      .eq('rfid_uid', uid)
      .maybeSingle();

    let isGuru = false;

    // Jika tidak ditemukan di Siswa, cari di tabel guru
    if (!targetData) {
      const { data: guruData } = await supabase
        .from('guru')
        .select('*')
        .eq('rfid_uid', uid)
        .maybeSingle();

      if (guruData) {
        targetData = guruData;
        isGuru = true;
      }
    }

    // Jika UID belum terdaftar pada siswa/guru manapun
    if (!targetData) {
      return NextResponse.json({
        success: true,
        message: 'Kartu berhasil ditiap (Belum Terdaftar)',
        registered: false,
        uid
      });
    }

    // 3. Tentukan Waktu & Status Presensi
    const now = new Date();
    const wibOffset = 7 * 60 * 60 * 1000;
    const wibTime = new Date(now.getTime() + wibOffset);
    const jam = wibTime.getUTCHours();
    const menit = wibTime.getUTCMinutes();

    // Batas jam masuk (Contoh: > 07:15 dianggap Telat)
    let status = 'Hadir';
    if (jam > 7 || (jam === 7 && menit > 15)) {
      status = 'Hadir (Telat)';
    }

    const nama = targetData.nama;
    const kelas = isGuru ? 'Guru / Staff' : (targetData.kelas || '-');
    const noWaRaw = isGuru ? targetData.no_wa : (targetData.no_hp_ortu || targetData.no_wa);
    const noWa = formatPhoneNumber(noWaRaw);

    // 4. Simpan ke Tabel Absensi
    const { data: newAbsensi, error: absensiErr } = await supabase
      .from('absensi')
      .insert({
        rfid_uid: uid,
        nama,
        kelas,
        status,
        wa_sent: false
      })
      .select()
      .single();

    if (absensiErr) {
      throw absensiErr;
    }

    // 5. Kirim Notifikasi WhatsApp via Kirimi.id
    let waSentStatus = false;

    if (noWa) {
      const waktuFormat = `${String(jam).padStart(2, '0')}:${String(menit).padStart(2, '0')} WIB`;
      const pesanWa = `*PRESENSI DIGITAL SMK YPK MEDAN*\n\n` +
        `Halo Bapak/Ibu,\n` +
        `Pemberitahuan presensi kehadiran sekolah:\n\n` +
        `👤 *Nama:* ${nama}\n` +
        `🏫 *Kelas/Jabatan:* ${kelas}\n` +
        `🕒 *Waktu Tap:* ${waktuFormat}\n` +
        `📌 *Status:* ${status}\n\n` +
        `_Pesan ini dikirim otomatis oleh sistem presensi RFID._`;

      try {
        const kirimiRes = await fetch('https://api.kirimi.id/v1/send-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_code: KIRIMI_USER_CODE,
            secret: KIRIMI_SECRET,
            phone: noWa,
            number: noWa,
            message: pesanWa
          })
        });

        const kirimiResult = await kirimiRes.json();

        if (kirimiRes.ok && (kirimiResult.status === true || kirimiResult.code === 200 || kirimiResult.success)) {
          waSentStatus = true;
          // Perbarui status wa_sent di tabel absensi
          await supabase.from('absensi').update({ wa_sent: true }).eq('id', newAbsensi.id);
        } else {
          console.error('Gagal Kirimi.id Response:', kirimiResult);
        }
      } catch (waErr) {
        console.error('Error saat menghubungi Kirimi.id API:', waErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Presensi berhasil dicatat',
      registered: true,
      data: {
        nama,
        kelas,
        status,
        wa_sent: waSentStatus
      }
    });

  } catch (error) {
    console.error('Server Error /api/rfid-tap:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
