import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

const KIRIMI_TOKEN = process.env.KIRIMI_TOKEN || "ce587a87163c4eb3a1b72a42b0bbff5a643ef082ed6efdf5c9078129ca66a5e1.51aa1197";
const KIRIMI_DEVICE_ID = process.env.KIRIMI_DEVICE_ID || "698c9497e8ec8e0ef31df251";

async function sendKirimiWA(phone, message) {
  try {
    if (!phone) return false;

    let cleanPhone = phone.toString().replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1);
    }

    const response = await fetch('https://api.kirimi.id/v1/send-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${KIRIMI_TOKEN}`
      },
      body: JSON.stringify({
        device_id: KIRIMI_DEVICE_ID,
        phone: cleanPhone,
        message: message
      })
    });

    return await response.json();
  } catch (error) {
    console.error('❌ Error kirim WhatsApp:', error);
    return false;
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const rawUid = body.rfid_uid || body.uid;
    const statusBody = body.status || 'Hadir';

    if (!rawUid) {
      return NextResponse.json({ error: 'UID RFID tidak ditemukan dalam payload' }, { status: 400 });
    }

    const cleanUid = rawUid.toString().trim().toUpperCase();

    // 1. CARI DATA SISWA DI TABEL rfid_cards (Kompatibel dengan uid & rfid_uid)
    const { data: siswa } = await supabase
      .from('rfid_cards')
      .select('*')
      .or(`uid.eq.${cleanUid},rfid_uid.eq.${cleanUid}`)
      .maybeSingle();

    // 2. KARTU BARU TERDETEKSI
    if (!siswa) {
      await supabase
        .from('rfid_cards')
        .insert([{
          uid: cleanUid,
          rfid_uid: cleanUid,
          nama: 'Kartu Baru (Belum Ditentukan)',
          kelas: '-',
          status_kartu: 'Unassigned',
          created_at: new Date().toISOString()
        }]);

      const adminPhone = "6289650058914"; 
      const messageAdmin = `🔔 *DETEKSI KARTU RFID BARU*\n\n- *UID RFID:* ${cleanUid}\n- *WAKTU:* ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n\nSilakan daftarkan nama siswa di dashboard admin.`;
      
      sendKirimiWA(adminPhone, messageAdmin);

      return NextResponse.json({
        success: true,
        is_new_card: true,
        message: 'Kartu baru berhasil didaftarkan.',
        uid: cleanUid
      }, { status: 200 });
    }

    // 3. PROSES ABSENSI
    const nowWib = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const jam = nowWib.getHours();
    const menit = nowWib.getMinutes();
    
    let finalStatus = statusBody;

    if (!statusBody.includes('(TEST)')) {
      if (jam > 7 || (jam === 7 && menit > 0)) {
        finalStatus = 'Telat';
      } else {
        finalStatus = 'Hadir';
      }
    }

    const waktuStr = nowWib.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const tanggalStr = nowWib.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const { data: logAbsen, error: insertAbsenError } = await supabase
      .from('absensi')
      .insert([{
        rfid_uid: cleanUid,
        nama: siswa.nama || 'Siswa',
        kelas: siswa.kelas || '-',
        status: finalStatus,
        waktu: waktuStr,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (insertAbsenError) {
      return NextResponse.json({ error: 'Gagal mencatat absensi', details: insertAbsenError }, { status: 500 });
    }

    // 4. KIRIM NOTIFIKASI WA KE ORANG TUA / SISWA
    const phoneTarget = siswa.no_hp_ortu || siswa.no_wa || siswa.no_hp;

    if (phoneTarget) {
      const waMessage = finalStatus.includes('Telat')
        ? `⚠️ *NOTIFIKASI KETERLAMBATAN SISWA*\n\nYth. Orang Tua dari:\n👤 *Nama:* ${siswa.nama}\n🏫 *Kelas:* ${siswa.kelas || '-'}\n⏰ *Waktu:* ${waktuStr} WIB\n📅 *Tanggal:* ${tanggalStr}\n📌 *Status:* TERLAMBAT\n\n_SMK YPK MEDAN_`
        : `✅ *NOTIFIKASI KEHADIRAN SISWA*\n\nYth. Orang Tua dari:\n👤 *Nama:* ${siswa.nama}\n🏫 *Kelas:* ${siswa.kelas || '-'}\n⏰ *Waktu:* ${waktuStr} WIB\n📅 *Tanggal:* ${tanggalStr}\n📌 *Status:* HADIR\n\n_SMK YPK MEDAN_`;

      sendKirimiWA(phoneTarget, waMessage);
    }

    return NextResponse.json({
      success: true,
      is_new_card: false,
      message: 'Absensi berhasil dicatat.',
      data: logAbsen
    }, { status: 200 });

  } catch (err) {
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}
