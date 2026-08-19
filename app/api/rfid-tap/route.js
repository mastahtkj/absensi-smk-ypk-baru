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
        to: formattedNumber,
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
    const targetNama = body.nama;
    const statusTap = body.status || 'Hadir';
    const updatedBy = body.updated_by || null;
    const isResendOnly = Boolean(body.resend);

    const waktuWib = new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jakarta',
    });

    let targetUser = null;
    let userType = null;

    // Cari Target berdasarkan UID jika ada, atau berdasarkan Nama
    if (rawUid && String(rawUid).trim() !== '') {
      const cleanUid = String(rawUid).trim().toUpperCase();

      const { data: siswa } = await supabase
        .from('tb_siswa')
        .select('*')
        .eq('uid_rfid', cleanUid)
        .maybeSingle();

      if (siswa) {
        targetUser = siswa;
        userType = 'siswa';
      } else {
        const { data: guru } = await supabase
          .from('tb_guru')
          .select('*')
          .eq('uid_rfid', cleanUid)
          .maybeSingle();

        if (guru) {
          targetUser = guru;
          userType = 'guru';
        }
      }
    }

    if (!targetUser && targetNama) {
      const { data: siswa } = await supabase
        .from('tb_siswa')
        .select('*')
        .ilike('nama_siswa', targetNama.trim())
        .maybeSingle();

      if (siswa) {
        targetUser = siswa;
        userType = 'siswa';
      } else {
        const { data: guru } = await supabase
          .from('tb_guru')
          .select('*')
          .ilike('nama_guru', targetNama.trim())
          .maybeSingle();

        if (guru) {
          targetUser = guru;
          userType = 'guru';
        }
      }
    }

    if (!targetUser) {
      if (rawUid) {
        const cleanUid = String(rawUid).trim().toUpperCase();
        await supabase.from('latest_scan').upsert([{ id: 1, uid: cleanUid, updated_at: new Date().toISOString() }]);
      }
      return NextResponse.json({ success: false, message: 'Data Anggota / Kartu RFID tidak ditemukan!' }, { status: 404 });
    }

    const finalUid = targetUser.uid_rfid || rawUid || 'MANUAL_ENTRY';

    // Jika bukan pengiriman ulang (resend), perbarui / masukkan ke database absensi
    if (!isResendOnly) {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

      const { data: existing } = await supabase
        .from('absensi')
        .select('id')
        .or(`nama.eq."${targetUser.nama_siswa || targetUser.nama_guru}",rfid_uid.eq."${finalUid}"`)
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('absensi')
          .update({
            status: statusTap,
            updated_by: updatedBy,
            created_at: new Date().toISOString()
          })
          .eq('id', existing.id);
      } else {
        await supabase.from('absensi').insert([{
          rfid_uid: finalUid,
          nama: targetUser.nama_siswa || targetUser.nama_guru,
          kelas: targetUser.kelas || (targetUser.role === 'admin' ? "MASTER'K" : 'Guru / Staff'),
          status: statusTap,
          updated_by: updatedBy,
          created_at: new Date().toISOString(),
        }]);
      }

      if (finalUid !== 'MANUAL_ENTRY') {
        await supabase.from('latest_scan').upsert([{ id: 1, uid: finalUid, updated_at: new Date().toISOString() }]);
      }
    }

    // Kirim WhatsApp
    if (userType === 'siswa') {
      const pesanWa = `*PRESENSI DIGITAL SMK YPK MEDAN*\n\n📢 *PEMBERITAHUAN PRESENSI SISWA*\n\n👤 *Nama:* ${targetUser.nama_siswa}\n🏫 *Kelas:* ${targetUser.kelas}\n📚 *Jurusan:* ${targetUser.jurusan || '-'}\n⏰ *Waktu:* ${waktuWib} WIB\n📌 *Status:* ${statusTap}\n\n_Telah dicatat dalam sistem presensi sekolah._`;

      const listNomor = [targetUser.no_wa_ortu, targetUser.no_wa_pribadi].filter(Boolean);
      if (listNomor.length > 0) {
        Promise.allSettled(listNomor.map((nomor) => sendWhatsAppMessage(nomor, pesanWa)));
      }

      return NextResponse.json({
        success: true,
        type: 'siswa',
        nama: targetUser.nama_siswa,
        target_nomor: listNomor,
      }, { status: 200 });
    } else {
      const jabatan = targetUser.role === 'admin' ? "MASTER'K" : 'Guru / Staff';
      const pesanWaGuru = `*PRESENSI DIGITAL SMK YPK MEDAN*\n\n👨‍🏫 *PRESENSI KEHADIRAN GURU / STAFF*\n\n👤 *Nama:* ${targetUser.nama_guru}\n🏷️ *Inisial:* ${targetUser.inisial || '-'}\n🏫 *Jabatan:* ${jabatan}\n⏰ *Waktu:* ${waktuWib} WIB\n📌 *Status:* ${statusTap}\n\n_Presensi Anda telah dicatat dalam sistem._`;

      if (targetUser.no_wa_pribadi) {
        sendWhatsAppMessage(targetUser.no_wa_pribadi, pesanWaGuru);
      }

      return NextResponse.json({
        success: true,
        type: 'guru',
        nama: targetUser.nama_guru,
        target_nomor: targetUser.no_wa_pribadi || 'TIDAK ADA NOMOR',
      }, { status: 200 });
    }

  } catch (err) {
    console.error('[API Error]:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
