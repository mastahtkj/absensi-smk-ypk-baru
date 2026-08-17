// Gantilah blok pengiriman WA pada route.js dari Synchronous menjadi Asynchronous (Background)

// ❌ CARA LAMA (Membuat ESP Timeout/Gagal Koneksi):
// waSentStatus = await sendKirimiWA(noWaTarget, pesanWA);

// ✅ CARA BARU (Proses WA berjalan di background, ESP langsung dapat respon 200 OK):
if (noWaTarget) {
  const waktuTap = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
  const pesanWA = `*PRESENSI DIGITAL SMK YPK MEDAN*\n\n` +
    `Pemberitahuan presensi kehadiran:\n\n` +
    `👤 *Nama:* ${namaUser}\n` +
    `🏫 *Kelas/Jabatan:* ${kelasUser}\n` +
    `⏰ *Waktu Tap:* ${waktuTap} WIB\n` +
    `📌 *Status Presensi:* *${finalStatus.toUpperCase()}*\n\n` +
    `_Pesan ini dikirim otomatis oleh sistem presensi RFID sekolah._`;

  // Jalankan fungsi tanpa await agar ESP langsung menerima respon detik itu juga
  sendKirimiWA(noWaTarget, pesanWA).then(async (isSent) => {
    if (isSent && absensiLog?.id) {
      await supabase.from('absensi').update({ wa_sent: true }).eq('id', absensiLog.id);
    }
  });
}

return NextResponse.json({
  success: true,
  nama: namaUser,
  kelas: kelasUser,
  status: finalStatus
}, { status: 200 });
