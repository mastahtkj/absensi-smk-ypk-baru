import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wpyfwkcevgdhkazeesdq.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * 📢 KIRIM ULANG NOTIFIKASI PRESENSI (REALTIME DI DALAM APLIKASI)
 *
 * SEBELUMNYA endpoint ini mengirim ke grup WhatsApp lewat gateway Kirimi.id.
 * Gateway tersebut sudah DIHAPUS (tidak dipakai lagi), sehingga notifikasi
 * sekarang dikirim langsung ke aplikasi:
 *   1. Broadcast realtime ke channel `smk_ypk_global_notifications_sync`
 *      -> lonceng notifikasi pada SEMUA perangkat yang sedang terbuka.
 *   2. Disimpan ke `tb_berita` -> menjadi pengumuman di Beranda &
 *      tetap terbaca ketika aplikasi sedang tertutup.
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const {
      type = 'siswa',
      nama = '',
      kelas = '',
      jurusan = '',
      status = '',
      jam_masuk = '',
      jam_pulang = '',
      items = null,
    } = body || {};

    const isGuru = type === 'guru';
    const now = new Date();
    const timeLabel = now.toLocaleTimeString('en-GB', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    const dateLabel = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });

    let judul = '';
    let ringkasan = '';

    if (Array.isArray(items) && items.length > 0) {
      judul = `Rekap Presensi ${items.length} Siswa - ${dateLabel}`;
      const baris = items
        .slice(0, 60)
        .map(
          (i, idx) =>
            `${idx + 1}. ${i.nama || '-'} (${i.kelas || '-'}) | Masuk ${i.jam_masuk || '-'} | Pulang ${i.jam_pulang || '-'} | ${i.status || 'Hadir'}`
        )
        .join('\n');
      ringkasan = `Rekapitulasi presensi ${items.length} siswa:\n\n${baris}${items.length > 60 ? `\n... (+${items.length - 60} lainnya)` : ''}`;
    } else {
      judul = `Presensi ${isGuru ? 'Guru' : 'Siswa'}: ${nama || '-'}`;
      ringkasan = [
        `Nama      : ${nama || '-'}`,
        `Kelas     : ${kelas || '-'}`,
        `Jurusan   : ${jurusan || '-'}`,
        `Status    : ${status || 'Hadir'}`,
        `Masuk     : ${jam_masuk || '-'}`,
        `Pulang    : ${jam_pulang || '-'}`,
        `Waktu     : ${timeLabel} WIB`,
      ].join('\n');
    }

    const payload = {
      id: `PRESENSI-BROADCAST-${Date.now()}`,
      judul,
      kategori: 'Presensi',
      ringkasan,
      konten: ringkasan,
      gambar_url: '',
      penulis: 'Sistem Presensi Wajah AI',
      tanggal: dateLabel,
      target_audience: isGuru ? 'Guru' : 'Siswa',
      badge_color: '#10b981',
      send_notification: true,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    // 1. Broadcast realtime ke seluruh perangkat terbuka
    let broadcastOk = false;
    try {
      await supabase.channel('smk_ypk_global_notifications_sync').send({
        type: 'broadcast',
        event: 'presensi_broadcast',
        payload: {
          type: 'presensi',
          judul,
          ringkasan,
          target_audience: isGuru ? 'Guru' : 'Siswa',
          nama,
          kelas,
          status,
          jam_masuk,
          jam_pulang,
          waktu: `${timeLabel} WIB`,
          created_at: now.toISOString(),
        },
      });
      broadcastOk = true;
    } catch (e) {
      console.warn('Broadcast realtime gagal:', e?.message);
    }

    // 2. Simpan sebagai berita/pengumuman agar tetap terbaca saat app ditutup
    let saved = false;
    try {
      const { error } = await supabase.from('tb_berita').upsert(payload, { onConflict: 'id' });
      if (!error) saved = true;
      else console.warn('Simpan pengumuman gagal:', error.message);
    } catch (e) {
      console.warn('Simpan pengumuman gagal:', e?.message);
    }

    return NextResponse.json({
      success: broadcastOk || saved,
      broadcast: broadcastOk,
      saved,
      message:
        'Notifikasi presensi berhasil dikirim ke seluruh perangkat aplikasi (realtime + pengumuman Beranda).',
    });
  } catch (err) {
    console.error('resend-wa (notifikasi internal) error:', err);
    return NextResponse.json(
      { success: false, message: err?.message || 'Terjadi kesalahan saat mengirim notifikasi.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Layanan notifikasi internal aktif (WhatsApp Gateway / Kirimi sudah dihapus).',
  });
}