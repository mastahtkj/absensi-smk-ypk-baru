import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const KIRIMI_USER_CODE = process.env.KIRIMI_USER_CODE || 'KMQZ4Y0826';
const KIRIMI_SECRET_KEY = process.env.KIRIMI_SECRET_KEY || '0a2eae1b7a76fb9709f691fa0ebcff536c86aa1b3247f45eee8ab05e53aae3b1';

async function sendKirimiWA(phone, message) {
  if (!phone) {
    console.log('⚠️ [WA DEBUG] Nomor telepon kosong, pengiriman dibatalkan.');
    return null;
  }

  let formattedPhone = String(phone).replace(/[^0-9]/g, '');
  if (formattedPhone.startsWith('0')) {
    formattedPhone = '62' + formattedPhone.slice(1);
  }

  console.log(`📡 [WA DEBUG] Mengirim WA ke: ${formattedPhone}`);

  try {
    const res = await fetch('https://dash.kirimi.id/api/v1/send-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'user-code': KIRIMI_USER_CODE,
        'secret-key': KIRIMI_SECRET_KEY,
      },
      body: JSON.stringify({
        phone: formattedPhone,
        message: message,
      }),
    });

    const result = await res.json();
    console.log('📩 [WA DEBUG] Respon dari Kirimi.id:', JSON.stringify(result));
    return result;
  } catch (err) {
    console.error('❌ [WA DEBUG] Error Fetch Kirimi.id:', err.message);
    return null;
  }
}

export async function POST(request) {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Server Config Error: URL/Key Supabase Kosong' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const body = await request.json().catch(() => ({}));
    const { rfid_uid, status, action, target, message } = body;

    if (action === 'SEND_WA_ONLY') {
      const waResult = await sendKirimiWA(target, message);
      return NextResponse.json({ success: true, wa_result: waResult }, { status: 200 });
    }

    if (!rfid_uid) {
      return NextResponse.json({ error: 'rfid_uid wajib diisi!' }, { status: 400 });
    }

    const cleanUid = String(rfid_uid).toUpperCase().trim();
    console.log(`🔍 [SCAN DEBUG] UID Diterima dari Alat: "${cleanUid}"`);

    let isNewCard = false;
    let namaUser = '';
    let kelasUser = '';
    let nomorHpUser = null;
    let isExemptFromTimeLimit = false;

    // 1. STEP 1: PRIORITAS CEK TABEL GURU TERLEBIH DAHULU
    const { data: guru } = await supabase
      .from('guru')
      .select('*')
      .eq('rfid_uid', cleanUid)
      .maybeSingle();

    if (guru) {
      console.log('✅ [SCAN DEBUG] Terdeteksi sebagai GURU:', guru.nama, '| No WA:', guru.no_wa);
      namaUser = guru.nama || `Guru (${guru.username})`;
      kelasUser = guru.role === 'admin' ? 'MASTER\'K' : 'GURU / STAFF';
      nomorHpUser = guru.no_wa || null;
      isExemptFromTimeLimit = true;
    } else {
      // 2. STEP 2: CEK TABEL SISWA (`rfid_cards`)
      const { data: siswa } = await supabase
        .from('rfid_cards')
        .select('*')
        .eq('uid', cleanUid)
        .maybeSingle();

      if (siswa) {
        console.log('✅ [SCAN DEBUG] Terdeteksi sebagai SISWA:', siswa.nama);
        namaUser = siswa.nama || cleanUid;
        kelasUser = siswa.kelas || 'Siswa';
        nomorHpUser = siswa.no_wa || null;
        if (siswa.kelas && siswa.kelas.toUpperCase().includes('MASTER')) {
          isExemptFromTimeLimit = true;
        }
      } else {
        // 3. STEP 3: DAFTARKAN KARTU BARU JIKA TIDAK ADA DI KEDUA TABEL
        console.log('⚠️ [SCAN DEBUG] UID tidak ditemukan di Guru maupun Siswa! Mendaftarkan kartu baru...');
        isNewCard = true;
        namaUser = `Siswa Baru (${cleanUid})`;
        kelasUser = 'Belum Diatur';

        await supabase.from('rfid_cards').insert([{ uid: cleanUid, nama: namaUser, kelas: kelasUser }]);
      }
    }

    // Hitung status absensi
    let finalStatus = status || 'Hadir';
    if (!isExemptFromTimeLimit) {
      const now = new Date();
      const jamSekarang = parseInt(now.toLocaleTimeString('id-ID', { hour: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' }), 10);
      const menitSekarang = parseInt(now.toLocaleTimeString('id-ID', { minute: '2-digit', timeZone: 'Asia/Jakarta' }), 10);
      if (jamSekarang * 60 + menitSekarang > 7 * 60) finalStatus = 'Telat';
    }

    // Insert Log ke tabel absensi
    const { data: newLog, error: errLog } = await supabase
      .from('absensi')
      .insert([{ rfid_uid: cleanUid, nama: namaUser, kelas: kelasUser, status: finalStatus }])
      .select();

    if (errLog) {
      console.error('❌ Error Insert Log:', errLog.message);
      return NextResponse.json({ error: 'Gagal Simpan Absensi', details: errLog.message }, { status: 500 });
    }

    // Eksekusi pengiriman WA
    if (nomorHpUser) {
      const jamFormat = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
      const pesanWA = isExemptFromTimeLimit
        ? `[NOTIFIKASI ABSENSI GURU SMK YPK]\nYth. Bapak/Ibu *${namaUser}*, kehadiran Anda telah tercatat pada pukul ${jamFormat} WIB dengan status: *${finalStatus.toUpperCase()}*. Terima kasih.`
        : `[NOTIFIKASI ABSENSI SMK YPK]\nSiswa a.n *${namaUser}* (${kelasUser}) telah melakukan absensi status: *${finalStatus.toUpperCase()}* pada pukul ${jamFormat} WIB.`;

      await sendKirimiWA(nomorHpUser, pesanWA);
    } else {
      console.log('⚠️ [WA DEBUG] Nomor WA tidak terdaftar untuk pengguna ini.');
    }

    return NextResponse.json({ success: true, message: 'Absensi berhasil dicatat!', is_new_card: isNewCard, data: newLog ? newLog[0] : null }, { status: 200 });
  } catch (error) {
    console.error('💥 API Crash Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
