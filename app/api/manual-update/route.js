import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const KIRIMI_USER_CODE = process.env.KIRIMI_USER_CODE || 'KMQZ4Y0826';
const KIRIMI_SECRET = process.env.KIRIMI_SECRET_KEY || process.env.KIRIMI_SECRET || 'b764c93a42e511076a8ddd201717e4a4967ca8271ae1581c3ae33641d9f18e80';
const KIRIMI_DEVICE_ID = process.env.KIRIMI_DEVICE_ID || 'D-QYXDB';
const KIRIMI_API_URL = 'https://api.kirimi.id/v1/send-message';

const KIRIMI_GROUP_SISWA = process.env.KIRIMI_GROUP_SISWA || '120363428398080899@g.us';
const KIRIMI_GROUP_GURU = process.env.KIRIMI_GROUP_GURU || '120363428231610054@g.us';

function formatPhoneNumber(phone) {
  if (!phone) return null;
  let cleaned = String(phone).trim();
  
  if (cleaned.endsWith('@g.us')) {
    return cleaned;
  }

  cleaned = cleaned.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (cleaned.startsWith('8')) {
    cleaned = '62' + cleaned;
  }
  return cleaned.length >= 10 ? cleaned : null;
}

async function sendWhatsAppMessage(targetNumber, messageText) {
  const formattedTarget = formatPhoneNumber(targetNumber);
  if (!formattedTarget) {
    console.error(`[Kirimi.id Error] Format nomor/grup tidak valid: ${targetNumber}`);
    return false;
  }

  try {
    const payload = {
      user_code: KIRIMI_USER_CODE,
      secret: KIRIMI_SECRET,
      device_id: KIRIMI_DEVICE_ID,
      phone: formattedTarget,
      message: messageText,
    };

    const response = await fetch(KIRIMI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${KIRIMI_SECRET}`,
      },
      body: JSON.stringify(payload),
      cache: 'no-store'
    });

    const resData = await response.json();
    return response.ok;
  } catch (err) {
    console.error('[Kirimi.id Error] Exceptions:', err);
    return false;
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { uid_rfid, status, updated_by } = body;

    if (!uid_rfid || !status) {
      return NextResponse.json({ success: false, message: 'UID RFID dan Status wajib diisi!' }, { status: 400 });
    }

    const cleanUid = String(uid_rfid).trim().toUpperCase();
    const updater = updated_by || 'Admin Portal';

    // 1. Cari Target di tb_siswa
    let target = null;
    let isGuru = false;

    const { data: siswa } = await supabase
      .from('tb_siswa')
      .select('*')
      .ilike('uid_rfid', cleanUid)
      .maybeSingle();

    if (siswa) {
      target = {
        id: siswa.id_siswa,
        nama: siswa.nama_siswa,
        kelas: siswa.kelas,
        no_wa_pribadi: siswa.no_wa_pribadi || siswa.no_wa || siswa.wa_siswa || siswa.no_hp,
        no_wa_ortu: siswa.no_wa_ortu || siswa.wa_ortu || siswa.hp_ortu
      };
    } else {
      // 2. Cari Target di tb_guru jika tidak ditemukan di siswa
      const { data: guru } = await supabase
        .from('tb_guru')
        .select('*')
        .ilike('uid_rfid', cleanUid)
        .maybeSingle();

      if (guru) {
        isGuru = true;
        target = {
          id: guru.id_guru,
          nama: guru.nama_guru,
          kelas: 'Guru / Staff',
          no_wa_pribadi: guru.no_wa_pribadi || guru.no_wa || guru.no_hp
        };
      }
    }

    if (!target) {
      return NextResponse.json({ success: false, message: 'Data siswa/guru dengan UID tersebut tidak ditemukan.' }, { status: 404 });
    }

    // 3. Catat / Update Absensi Ke Database
    const todayStr = new Date().toISOString().slice(0, 10);
    const { data: existingLog } = await supabase
      .from('absensi')
      .select('*')
      .eq('rfid_uid', cleanUid)
      .gte('created_at', `${todayStr}T00:00:00.000Z`)
      .lte('created_at', `${todayStr}T23:59:59.999Z`)
      .maybeSingle();

    const oldStatus = existingLog ? existingLog.status : 'Belum Presensi';

    let absensiError = null;
    if (existingLog) {
      const { error } = await supabase
        .from('absensi')
        .update({ status: status, updated_by: updater })
        .eq('id', existingLog.id);
      absensiError = error;
    } else {
      const { error } = await supabase
        .from('absensi')
        .insert([{
          rfid_uid: cleanUid,
          nama: target.nama,
          kelas: target.kelas,
          status: status,
          updated_by: updater
        }]);
      absensiError = error;
    }

    if (absensiError) {
      throw absensiError;
    }

    // 4. Catat ke Audit Trail
    await supabase.from('audit_log_presensi').insert([{
      diubah_oleh: updater,
      role_pengubah: 'Admin/Guru',
      target_nama: target.nama,
      status_lama: oldStatus,
      status_baru: status,
      created_at: new Date().toISOString()
    }]);

    // 5. Kirim Notifikasi WhatsApp Gateway
    const waktuTercatat = new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' });
    const waText = `🔔 *NOTIFIKASI PRESENSI MANUAL SMK YPK MEDAN*\n\n` +
      `Nama: *${target.nama}*\n` +
      `Kelas/Jabatan: *${target.kelas}*\n` +
      `Status: *${status}*\n` +
      `Waktu: *${waktuTercatat} WIB*\n` +
      `Diperbarui Oleh: *${updater}*\n\n` +
      `_Pesan ini dikirimkan otomatis oleh Sistem Presensi Digital SMK YPK Medan._`;

    // Kirim Ke Nomor Pribadi & Ortu (Jika Siswa)
    if (target.no_wa_pribadi) await sendWhatsAppMessage(target.no_wa_pribadi, waText);
    if (target.no_wa_ortu) await sendWhatsAppMessage(target.no_wa_ortu, waText);

    // Kirim ke Grup Sesuai Kategori
    const groupTarget = isGuru ? KIRIMI_GROUP_GURU : KIRIMI_GROUP_SISWA;
    if (groupTarget) await sendWhatsAppMessage(groupTarget, waText);

    return NextResponse.json({
      success: true,
      message: `Presensi ${target.nama} berhasil diubah menjadi ${status} dan notifikasi WA dikirim.`
    });

  } catch (err) {
    console.error('Server error manual update:', err);
    return NextResponse.json({ success: false, message: err.message || 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
