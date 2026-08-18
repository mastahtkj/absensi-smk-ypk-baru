import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function sendWhatsAppNotification(targetNo, message) {
  if (!targetNo) return;
  try {
    fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': process.env.FONNTE_TOKEN || '',
      },
      body: new URLSearchParams({
        target: targetNo,
        message: message,
      }),
    });
  } catch (err) {
    console.error('Gagal kirim WA:', err);
  }
}

export async function POST(request) {
  try {
    const { uid_rfid } = await request.json();

    if (!uid_rfid) {
      return NextResponse.json({ status: 'error', message: 'UID RFID Kosong' }, { status: 400 });
    }

    const waktuSekarang = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    // 1. Cek Data Siswa
    const { data: siswa } = await supabase
      .from('tb_siswa')
      .select('*')
      .eq('uid_rfid', uid_rfid)
      .maybeSingle();

    if (siswa) {
      const pesanWA = `[PRESENSI SMK YPK MEDAN]\nHalo, Siswa/i *${siswa.nama_siswa}* (${siswa.kelas} - ${siswa.jurusan}) telah melakukan TAP Presensi pada pukul *${waktuSekarang} WIB*. Status: HADIR.`;
      
      sendWhatsAppNotification(siswa.no_wa_pribadi, pesanWA);
      sendWhatsAppNotification(siswa.no_wa_ortu, pesanWA);

      return NextResponse.json({
        status: 'success',
        role: 'Siswa',
        nama: siswa.nama_siswa,
        lcd_line1: `Halo, ${siswa.nama_siswa.substring(0, 10)}`,
        lcd_line2: `PRESENSI OK ${waktuSekarang}`,
        wa_status: 'Sent'
      });
    }

    // 2. Cek Data Guru / Admin
    const { data: guru } = await supabase
      .from('tb_guru')
      .select('*')
      .eq('uid_rfid', uid_rfid)
      .maybeSingle();

    if (guru) {
      const pesanWA = `[PRESENSI GURU SMK YPK MEDAN]\nBapak/Ibu *${guru.nama_guru}* (${guru.inisial}) telah hadir di sekolah pada pukul *${waktuSekarang} WIB*. Selamat bertugas!`;
      
      sendWhatsAppNotification(guru.no_wa_pribadi, pesanWA);

      return NextResponse.json({
        status: 'success',
        role: guru.role,
        nama: guru.nama_guru,
        lcd_line1: `Selamat Datang`,
        lcd_line2: `${guru.inisial} - ${waktuSekarang}`,
        wa_status: 'Sent'
      });
    }

    // 3. Jika Belum Terdaftar
    return NextResponse.json({
      status: 'unregistered',
      uid_rfid: uid_rfid,
      lcd_line1: 'KARTU TIDAK',
      lcd_line2: 'TERDAFTAR!',
      message: 'UID belum terdaftar'
    });

  } catch (error) {
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}
