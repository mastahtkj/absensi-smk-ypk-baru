import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    // ... logika presensi / supabase Anda ...

    if (noWaTarget) {
      const waktuTap = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
      const pesanWA = `*PRESENSI DIGITAL SMK YPK MEDAN*\n\n` +
        `Pemberitahuan presensi kehadiran:\n\n` +
        `👤 *Nama:* ${namaUser}\n` +
        `🏫 *Kelas/Jabatan:* ${kelasUser}\n` +
        `⏰ *Waktu Tap:* ${waktuTap} WIB\n` +
        `📌 *Status Presensi:* *${finalStatus.toUpperCase()}*\n\n` +
        `_Pesan ini dikirim otomatis oleh sistem presensi RFID sekolah._`;

      sendKirimiWA(noWaTarget, pesanWA).then(async (isSent) => {
        if (isSent && absensiLog?.id) {
          await supabase.from('absensi').update({ wa_sent: true }).eq('id', absensiLog.id);
        }
      });
    }

    // Return diletakkan DI DALAM fungsi POST
    return NextResponse.json({
      success: true,
      nama: namaUser,
      kelas: kelasUser,
      status: finalStatus
    }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
} // <-- Tanda penutup fungsi POST harus berada di paling bawah file
