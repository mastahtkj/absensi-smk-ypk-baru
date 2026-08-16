import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

const KIRIMI_TOKEN = process.env.KIRIMI_TOKEN || "ce587a87163c4eb3a1b72a42b0bbff5a643ef082ed6efdf5c9078129ca66a5e1.51aa1197";
const KIRIMI_DEVICE_ID = process.env.KIRIMI_DEVICE_ID || "698c9497e8ec8e0ef31df251";

// Helper Kirim WhatsApp (Non-blocking)
async function sendKirimiWA(phone, message) {
  try {
    if (!phone) return;
    let cleanPhone = phone.toString().replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.slice(1);

    await fetch('https://api.kirimi.id/v1/send-message', {
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
  } catch (err) {
    console.error('WA Send Error:', err);
  }
}

export async function POST(request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, message: 'Invalid JSON Payload' }, { status: 400 });
    }

    const rawUid = body.rfid_uid || body.uid;
    if (!rawUid) {
      return NextResponse.json({ success: false, message: 'UID RFID Kosong' }, { status: 400 });
    }

    const cleanUid = rawUid.toString().trim().toUpperCase();
    const statusBody = body.status || 'Hadir';

    // 0. SIMPAN UID TERAKHIR KE TABEL latest_scan UNTUK DASHBOARD REAL-TIME
    const { error: errLatest } = await supabase
      .from('latest_scan')
      .upsert({ id: 1, uid: cleanUid, updated_at: new Date().toISOString() });

    if (errLatest) {
      console.error("Error update latest_scan:", errLatest);
    }

    // 1. CEK DAHULU DI TABEL SISWA
    const { data: siswaData } = await supabase
      .from('siswa')
      .select('*')
      .or(`rfid_uid.eq.${cleanUid},uid.eq.${cleanUid}`)
      .maybeSingle();

    if (siswaData) {
      // Catat ke absensi_siswa
      const { data: logAbsen, error: errInsert } = await supabase
        .from('absensi_siswa')
        .insert([{
          rfid_uid: cleanUid,
          status: statusBody,
          created_at: new Date().toISOString()
        }])
        .select()
        .maybeSingle();

      if (errInsert) console.error("Error absensi_siswa:", errInsert);

      // Kirim WA Notifikasi Ortus
      const phoneNo = siswaData.no_hp_ortu || siswaData.no_wa || siswaData.no_hp;
      if (phoneNo) {
        const msg = `✅ *NOTIFIKASI ABSENSI SISWA*\n\nNama: ${siswaData.nama}\nKelas: ${siswaData.kelas || '-'}\nStatus: ${statusBody}\nWaktu: ${new Date().toLocaleTimeString('id-ID')}`;
        sendKirimiWA(phoneNo, msg).catch(() => null);
      }

      return NextResponse.json({
        success: true,
        role: 'siswa',
        nama: siswaData.nama,
        message: 'Absensi Siswa Berhasil Recorded',
        data: logAbsen
      }, { status: 200 });
    }

    // 2. CEK DI TABEL GURU
    const { data: guruData } = await supabase
      .from('guru')
      .select('*')
      .or(`rfid_uid.eq.${cleanUid},uid.eq.${cleanUid}`)
      .maybeSingle();

    if (guruData) {
      // Catat ke absensi_guru
      const { data: logAbsenGuru, error: errInsertGuru } = await supabase
        .from('absensi_guru')
        .insert([{
          rfid_uid: cleanUid,
          status: statusBody,
          keterangan: 'Tap Kartu Mesin',
          created_at: new Date().toISOString()
        }])
        .select()
        .maybeSingle();

      if (errInsertGuru) console.error("Error absensi_guru:", errInsertGuru);

      return NextResponse.json({
        success: true,
        role: 'guru',
        nama: guruData.nama,
        message: 'Absensi Guru Berhasil Recorded',
        data: logAbsenGuru
      }, { status: 200 });
    }

    // 3. KARTU UNREGISTERED / KARTU BARU (UNTUK DRAFT REGISTRASI)
    return NextResponse.json({
      success: true,
      is_new_card: true,
      uid: cleanUid,
      message: 'Kartu belum terikat ke Siswa/Guru'
    }, { status: 200 });

  } catch (err) {
    console.error("Internal Server Error:", err);
    return NextResponse.json({
      success: false,
      error: err.message
    }, { status: 200 });
  }
}
