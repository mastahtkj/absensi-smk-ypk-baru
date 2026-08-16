import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

const KIRIMI_USER_CODE = 'KMQZ4Y0826';
const KIRIMI_SECRET_KEY = '0a2eae1b7a76fb9709f691fa0ebcff536c86aa1b3247f45eee8ab05e53aae3b1';

// Helper Kirim WA via Kirimi.id (Siswa & Guru)
async function sendKirimiWA(phone, message) {
  try {
    if (!phone) return;
    let cleanPhone = phone.toString().replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.slice(1);

    await fetch('https://dash.kirimi.id/api/v2/send-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Code': KIRIMI_USER_CODE,
        'Secret-Key': KIRIMI_SECRET_KEY
      },
      body: JSON.stringify({
        phone: cleanPhone,
        message: message
      })
    });
  } catch (err) {
    console.error('Gagal Mengirim WhatsApp:', err);
  }
}

export async function POST(request) {
  try {
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ success: false, message: 'Supabase Env Variable Belum Diset' }, { status: 500 });
    }

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
    const waktuTap = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    // 0. SIMPAN TAP TERAKHIR UNTUK FITUR REGISTRASI KARTU BARU IN REAL-TIME
    try {
      await supabase
        .from('latest_scan')
        .upsert({ id: 1, uid: cleanUid, updated_at: new Date().toISOString() });
    } catch (e) {
      console.warn("Lompat update latest_scan:", e);
    }

    // 1. CEK KARTU DI TABEL GURU TERLEBIH DAHULU
    const { data: guruData } = await supabase
      .from('guru')
      .select('*')
      .or(`rfid_uid.eq.${cleanUid},uid.eq.${cleanUid}`)
      .maybeSingle();

    if (guruData) {
      const namaKelas = guruData.role === 'admin' ? "MASTER'K" : 'Guru / Staff';
      
      const { data: logAbsenGuru, error: errInsertGuru } = await supabase
        .from('absensi')
        .insert([{
          rfid_uid: cleanUid,
          nama: guruData.nama,
          kelas: namaKelas,
          status: statusBody,
          created_at: new Date().toISOString()
        }])
        .select()
        .maybeSingle();

      if (errInsertGuru) console.error("Error absensi guru:", errInsertGuru);

      // KIRIM WA NOTIFIKASI GURU
      const phoneNoGuru = guruData.no_wa;
      if (phoneNoGuru) {
        const msgGuru = `*PRESENSI GURU / STAFF SMK YPK MEDAN*\n\n` +
          `Yth. Bapak/Ibu *${guruData.nama}*,\n` +
          `Presensi kehadiran Anda telah berhasil dicatat:\n\n` +
          `⏰ *Waktu Tap:* ${waktuTap} WIB\n` +
          `📌 *Status Presensi:* ${statusBody}\n\n` +
          `Terima kasih. Selamat bertugas!`;
        sendKirimiWA(phoneNoGuru, msgGuru).catch(() => null);
      }

      return NextResponse.json({
        success: true,
        role: 'guru',
        nama: guruData.nama,
        message: 'Absensi Guru Berhasil Recorded',
        data: logAbsenGuru
      }, { status: 200 });
    }

    // 2. CEK KARTU DI TABEL rfid_cards (SISWA)
    const { data: siswaData } = await supabase
      .from('rfid_cards')
      .select('*')
      .or(`rfid_uid.eq.${cleanUid},uid.eq.${cleanUid}`)
      .maybeSingle();

    if (siswaData) {
      const { data: logAbsen, error: errInsert } = await supabase
        .from('absensi')
        .insert([{
          rfid_uid: cleanUid,
          nama: siswaData.nama,
          kelas: siswaData.kelas,
          status: statusBody,
          created_at: new Date().toISOString()
        }])
        .select()
        .maybeSingle();

      if (errInsert) console.error("Error insert absensi:", errInsert);

      // KIRIM WA NOTIFIKASI SISWA KE ORANG TUA / WA SISWA
      const phoneNoSiswa = siswaData.no_hp_ortu || siswaData.no_wa;
      if (phoneNoSiswa) {
        const msgSiswa = `*PRESENSI DIGITAL SMK YPK MEDAN*\n\n` +
          `Yth. Bapak/Ibu Orang Tua/Wali,\n` +
          `Pemberitahuan presensi kehadiran putra/putri Anda:\n\n` +
          `👤 *Nama Siswa:* ${siswaData.nama}\n` +
          `🏫 *Kelas:* ${siswaData.kelas || '-'}\n` +
          `⏰ *Waktu Tap:* ${waktuTap} WIB\n` +
          `📌 *Status Presensi:* ${statusBody}\n\n` +
          `Terima kasih. Pesan ini dikirim otomatis oleh sistem presensi RFID sekolah.`;
        sendKirimiWA(phoneNoSiswa, msgSiswa).catch(() => null);
      }

      return NextResponse.json({
        success: true,
        role: 'siswa',
        nama: siswaData.nama,
        message: 'Absensi Siswa Berhasil Recorded',
        data: logAbsen
      }, { status: 200 });
    }

    // 3. KARTU BELUM TERDAFTAR (UNREGISTERED CARD)
    return NextResponse.json({
      success: true,
      is_new_card: true,
      uid: cleanUid,
      message: 'Kartu RFID belum terikat ke Siswa/Guru'
    }, { status: 200 });

  } catch (err) {
    console.error("Internal Server Error:", err);
    return NextResponse.json({
      success: false,
      error: err.message
    }, { status: 500 });
  }
}
