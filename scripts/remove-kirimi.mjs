// =============================================================
//  Script satu kali: hapus integrasi gateway WhatsApp Kirimi.id
//  dari API routes. Notifikasi diganti ke realtime in-app broadcast.
// =============================================================
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const report = [];

function edit(relPath, fn) {
  const p = path.join(root, relPath);
  if (!fs.existsSync(p)) {
    report.push(`LEWAT (file tidak ada): ${relPath}`);
    return;
  }
  // Normalisasi line-ending CRLF -> LF agar pencocokan teks konsisten
  const before = fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
  const after = fn(before);
  fs.writeFileSync(p, after, 'utf8');
  report.push(`DIPROSES: ${relPath} (${before.length} -> ${after.length} karakter)`);
}

function cutBetween(src, startText, endText, label) {
  const start = src.indexOf(startText);
  if (start === -1) {
    report.push(`  LEWAT: ${label} (start tidak ditemukan)`);
    return src;
  }
  const end = src.indexOf(endText, start);
  if (end === -1) {
    report.push(`  LEWAT: ${label} (end tidak ditemukan)`);
    return src;
  }
  report.push(`  DIPOTONG: ${label}`);
  return src.slice(0, start) + src.slice(end + endText.length);
}

// ------------------------------------------------------------------
// 1. app/api/cron/rekap-guru/route.js
// ------------------------------------------------------------------
edit('app/api/cron/rekap-guru/route.js', (src) => {
  let s = src;

  // a) Hapus konstanta Kirimi
  s = s.replace(
    /const KIRIMI_USER_CODE = [\s\S]*?const KIRIMI_GROUP_GURU = [^\n]*\n/,
    ''
  );

  // b) Hapus fungsi sendWhatsAppMessage
  s = cutBetween(
    s,
    'async function sendWhatsAppMessage(targetNumber, messageText) {',
    "\n}\n",
    'fungsi sendWhatsAppMessage (rekap-guru)'
  );

  // c) Ganti pengiriman WA dengan broadcast realtime in-app
  const oldSend = `  // 5. Kirim Pesan ke Grup WhatsApp Guru
  const sendSuccess = await sendWhatsAppMessage(KIRIMI_GROUP_GURU, waMessage);

  return {
    success: true,
    sentToWa: sendSuccess,
    targetGroup: KIRIMI_GROUP_GURU,`;
  const newSend = `  // 5. Kirim Rekap ke APLIKASI (realtime broadcast, tanpa WhatsApp/Kirimi)
  let broadcastSuccess = false;
  try {
    await supabase.channel('smk_ypk_global_notifications_sync').send({
      type: 'broadcast',
      event: 'rekap_guru',
      payload: {
        type: 'rekap_guru',
        judul: \`Rekap Presensi Guru & Staff - \${jakartaDateStr}\`,
        ringkasan: waMessage,
        tanggal: jakartaDateStr,
        waktu: \`\${jakartaTimeStr} WIB\`,
        totalGuru,
        countHadir,
        countTelat,
        countSakit,
        countIzin,
        countAlpa,
        persentase,
        created_at: new Date().toISOString(),
      },
    });
    broadcastSuccess = true;
  } catch (e) {
    console.warn('[Rekap Guru] Broadcast realtime gagal:', e?.message);
  }

  return {
    success: true,
    sentToWa: broadcastSuccess,
    broadcast: broadcastSuccess,
    targetGroup: 'Aplikasi Super App (realtime)',`;
  if (s.includes(oldSend)) {
    s = s.replace(oldSend, newSend);
    report.push('  DIUBAH: pengiriman rekap guru -> broadcast realtime');
  } else {
    report.push('  LEWAT: blok pengiriman rekap guru tidak cocok');
  }

  return s;
});

// ------------------------------------------------------------------
// 2. app/api/inval-guru/route.js
// ------------------------------------------------------------------
edit('app/api/inval-guru/route.js', (src) => {
  let s = src;

  // a) Hapus konstanta Kirimi
  s = s.replace(
    /const KIRIMI_USER_CODE = [\s\S]*?const KIRIMI_GROUP_GURU = [^\n]*\n/,
    ''
  );

  // b) Hapus fungsi sendWhatsAppMessage
  s = cutBetween(
    s,
    'async function sendWhatsAppMessage(targetNumber, messageText) {',
    "\n}\n",
    'fungsi sendWhatsAppMessage (inval-guru)'
  );

  // c) Ganti pengiriman WA -> broadcast realtime
  const oldBlock = `    if (KIRIMI_GROUP_GURU) {
      await sendWhatsAppMessage(KIRIMI_GROUP_GURU, waText);
    }`;
  const newBlock = `    // Broadcast realtime ke aplikasi (gateway WhatsApp/Kirimi sudah dihapus)
    try {
      await supabase.channel('smk_ypk_global_notifications_sync').send({
        type: 'broadcast',
        event: 'inval_guru',
        payload: {
          type: 'inval_guru',
          judul: 'Informasi Tugas Inval Guru',
          ringkasan: waText,
          created_at: new Date().toISOString(),
        },
      });
    } catch (e) {
      console.warn('[Inval Guru] Broadcast realtime gagal:', e?.message);
    }`;
  if (s.includes(oldBlock)) {
    s = s.replace(oldBlock, newBlock);
    report.push('  DIUBAH: kirim invalidasi guru -> broadcast realtime');
  } else {
    report.push('  LEWAT: blok kirim invalidasi guru tidak cocok');
  }

  const oldDelete = `      if (KIRIMI_GROUP_GURU) {
        await sendWhatsAppMessage(KIRIMI_GROUP_GURU, waDeleteText);
      }`;
  const newDelete = `      try {
        await supabase.channel('smk_ypk_global_notifications_sync').send({
          type: 'broadcast',
          event: 'inval_guru_dibatalkan',
          payload: {
            type: 'inval_guru',
            judul: 'Pembatalan Tugas Inval Guru',
            ringkasan: waDeleteText,
            created_at: new Date().toISOString(),
          },
        });
      } catch (e) {
        console.warn('[Inval Guru] Broadcast realtime gagal:', e?.message);
      }`;
  if (s.includes(oldDelete)) {
    s = s.replace(oldDelete, newDelete);
    report.push('  DIUBAH: pembatalan invalidasi guru -> broadcast realtime');
  } else {
    report.push('  LEWAT: blok pembatalan invalidasi guru tidak cocok');
  }

  return s;
});

console.log('=== Laporan penghapusan integrasi Kirimi.id ===');
report.forEach((r) => console.log(' - ' + r));
console.log('Selesai.');