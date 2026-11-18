import { NextResponse } from 'next/server';
import { supabaseServer } from '../../lib/supabaseServer';
import { verifySessionToken } from '../../lib/cryptoAuth';
import { findAbsensiByName } from '../../lib/absensiQuery';
import { formatWibTime } from '../../utils/waktu';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const cookieToken = req.cookies.get('smk_ypk_auth_token')?.value || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : cookieToken;

    let callerUser = null;
    if (token) {
      callerUser = verifySessionToken(token);
    }

    const body = await req.json();
    const {
      target_nama,
      target_kelas,
      is_guru,
      target_id,
      status,
      updated_by,
      alasan,
      surat_nama,
      materi_nama,
      keterangan_materi,
    } = body;

    if (!status) {
      return NextResponse.json({ success: false, message: 'Status presensi wajib diisi!' }, { status: 400 });
    }

    // 🔒 Pengecekan Otorisasi: Siswa biasa dilarang keras mengubah presensi manual
    if (callerUser && !callerUser.isGuru && callerUser.role === 'siswa') {
      return NextResponse.json(
        { success: false, message: 'Akses ditolak. Siswa tidak memiliki izin mengubah status presensi.' },
        { status: 403 }
      );
    }

    // Jika Siswa Admin (Sadmin), hanya boleh mengubah presensi siswa (bukan guru)
    if (callerUser && !callerUser.isGuru && callerUser.role === 'sadmin' && is_guru) {
      return NextResponse.json(
        { success: false, message: 'Akses ditolak. Siswa Admin tidak memiliki wewenang mengubah status presensi Guru.' },
        { status: 403 }
      );
    }

    const updater = callerUser?.nama || updated_by || 'Admin Portal';
    const jamWibSingkat = formatWibTime(new Date(), true);

    const client = supabaseServer;

    // 1. Cari Target yang Benar & Tepat Sasaran
    let target = null;
    let isTargetGuru = Boolean(is_guru);

    if (isTargetGuru) {
      let q = client.from('tb_guru').select('*');
      if (target_id) q = q.eq('id_guru', target_id);
      else if (target_nama) q = q.ilike('nama_guru', target_nama);

      const { data: guru } = await q.maybeSingle();
      if (guru) {
        target = {
          id: guru.id_guru,
          nama: guru.nama_guru,
          kelas: guru.role === 'admin' ? 'MASTER / ADMIN' : 'Guru / Staff',
        };
      }
    } else {
      let q = client.from('tb_siswa').select('*');
      if (target_id) q = q.eq('id_siswa', target_id);
      else if (target_nama) q = q.ilike('nama_siswa', target_nama);

      const { data: siswa } = await q.maybeSingle();
      if (siswa) {
        target = {
          id: siswa.id_siswa,
          nama: siswa.nama_siswa,
          kelas: siswa.kelas,
        };
      }
    }

    // Fallback jika belum ditemukan lewat query di atas
    if (!target) {
      if (target_nama) {
        target = {
          id: target_id || null,
          nama: target_nama,
          kelas: target_kelas || (isTargetGuru ? 'Guru / Staff' : 'Siswa'),
        };
      }
    }

    if (!target || !target.nama) {
      return NextResponse.json({ success: false, message: 'Data siswa/guru tidak ditemukan.' }, { status: 404 });
    }

    // 2. Cari Log Absensi Khusus Nama Target Hari Ini
    const todayStr = new Date().toISOString().slice(0, 10);
    const { data: existingLog } = await findAbsensiByName(
      client,
      target.nama,
      {
        startOfDay: `${todayStr}T00:00:00.000Z`,
        endOfDay: `${todayStr}T23:59:59.999Z`,
      }
    );

    const oldStatus = existingLog ? existingLog.status : 'Belum Presensi';
    const statusLower = String(status).trim().toLowerCase();
    const isHapusPresensi = statusLower.includes('hapus presensi') || statusLower.includes('hapus status') || statusLower.includes('reset presensi') || statusLower === 'hapus';
    const isHapusPulang = !isHapusPresensi && statusLower.includes('hapus') && statusLower.includes('pulang');
    const isPulang = !isHapusPresensi && !isHapusPulang && statusLower.includes('pulang');

    // 🗑️ 3A. HAPUS STATUS PRESENSI HARI INI (RESET JADI BELUM TAP)
    if (isHapusPresensi) {
      if (existingLog) {
        const { error: delErr } = await client
          .from('absensi')
          .delete()
          .eq('id', existingLog.id);

        if (delErr) throw delErr;
      }

      // Catat ke Audit Trail
      try {
        await client.from('audit_log_presensi').insert([{
          diubah_oleh: updater,
          role_pengubah: isTargetGuru ? 'Guru/Admin' : 'Admin/Wali Kelas',
          target_nama: target.nama,
          status_lama: oldStatus,
          status_baru: 'Presensi Dihapus / Direset (Belum Tap)',
          created_at: new Date().toISOString(),
        }]);
      } catch (e) {}

      return NextResponse.json({
        success: true,
        message: `Status presensi hari ini untuk ${target.nama} berhasil dihapus. Status kembali menjadi Belum Tap.`,
      });
    }

    // 🏠 3B. HAPUS STATUS PULANG (BATALKAN PULANG KEMBALI KE HADIR)
    if (isHapusPulang) {
      if (existingLog) {
        const resetPulangData = {
          status: 'Hadir',
          jam_pulang: null,
          updated_at: new Date().toISOString(),
        };

        const { error: updateErr } = await client
          .from('absensi')
          .update(resetPulangData)
          .eq('id', existingLog.id);

        if (updateErr) throw updateErr;
      }

      try {
        await client.from('audit_log_presensi').insert([{
          diubah_oleh: updater,
          role_pengubah: isTargetGuru ? 'Guru/Admin' : 'Admin/Wali Kelas',
          target_nama: target.nama,
          status_lama: oldStatus,
          status_baru: 'Status Pulang Dihapus (Kembali Hadir)',
          created_at: new Date().toISOString(),
        }]);
      } catch (e) {}

      return NextResponse.json({
        success: true,
        message: `Status pulang ${target.nama} berhasil dibatalkan. Status kini kembali Hadir.`,
      });
    }

    let finalStatus = status;
    const metaObj = {
      alasan: alasan || '',
      surat_nama: surat_nama || '',
      surat_url: body.surat_url || '',
      materi_nama: materi_nama || '',
      materi_url: body.materi_url || '',
      keterangan_materi: keterangan_materi || '',
      updated_by: updater,
    };
    const metaString = JSON.stringify(metaObj);
    const suratFoto = body.surat_url || null;

    if (existingLog) {
      const updatePayload = {
        status: isPulang ? 'Pulang' : finalStatus,
        jam_pulang: isPulang ? (existingLog.jam_pulang || jamWibSingkat) : null,
        foto_url: suratFoto || existingLog.foto_url || null,
        device_info: metaString,
        updated_at: new Date().toISOString(),
      };

      const { error: updateErr } = await client
        .from('absensi')
        .update(updatePayload)
        .eq('id', existingLog.id);

      if (updateErr) throw updateErr;
    } else {
      let numericId = null;
      if (target.id) {
        const parsed = parseInt(String(target.id).replace(/\D/g, ''), 10);
        if (!isNaN(parsed)) numericId = parsed;
      }

      const insertPayload = {
        id_siswa: !isTargetGuru ? numericId : null,
        id_guru: isTargetGuru ? numericId : null,
        nama: target.nama,
        role: isTargetGuru ? 'Guru' : 'Siswa',
        kelas: target.kelas || (isTargetGuru ? 'Guru / Staff' : '-'),
        jurusan: target.jurusan || '-',
        status: isPulang ? 'Pulang' : finalStatus,
        tanggal: todayStr,
        jam_masuk: isPulang ? '-' : jamWibSingkat,
        jam_pulang: isPulang ? jamWibSingkat : null,
        metode: 'Manual',
        foto_url: suratFoto,
        device_info: metaString,
      };

      const { error: insertErr } = await client
        .from('absensi')
        .insert([insertPayload]);

      if (insertErr) throw insertErr;
    }

    // 📡 Siarkan perubahan absensi secara realtime ke channel
    try {
      client.channel('smk_ypk_presence_room').send({
        type: 'broadcast',
        event: 'attendance_logged',
        payload: {
          id_siswa: !isTargetGuru ? target.id : null,
          id_guru: isTargetGuru ? target.id : null,
          nama: target.nama,
          role: isTargetGuru ? 'Guru' : 'Siswa',
          kelas: target.kelas,
          status: isPulang ? 'Pulang' : finalStatus,
          jam_masuk: isPulang ? '-' : jamWibSingkat,
          jam_pulang: isPulang ? jamWibSingkat : null,
          metode: 'Manual',
          created_at: new Date().toISOString(),
          alasan: alasan || '',
          surat_nama: surat_nama || '',
          surat_url: suratFoto || '',
        },
      });
    } catch (eBc) {}

    // 4. Catat ke Audit Trail
    try {
      await client.from('audit_log_presensi').insert([{
        diubah_oleh: updater,
        role_pengubah: isTargetGuru ? 'Guru/Admin' : 'Admin/Wali Kelas',
        target_nama: target.nama,
        status_lama: oldStatus,
        status_baru: isPulang ? 'Pulang' : status,
        created_at: new Date().toISOString(),
      }]);
    } catch (e) {}

    return NextResponse.json({
      success: true,
      message: `Presensi ${target.nama} berhasil diubah menjadi ${isPulang ? 'Pulang' : status}.`,
    });
  } catch (err) {
    console.error('Server error manual update:', err);
    return NextResponse.json(
      { success: false, message: err.message || 'Terjadi kesalahan pada server.' },
      { status: 500 }
    );
  }
}
