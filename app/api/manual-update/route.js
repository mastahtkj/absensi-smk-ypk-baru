import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { findAbsensiByName } from '../../lib/absensiQuery';
import { formatWibTime } from '../../utils/waktu';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wpyfwkcevgdhkazeesdq.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      uid_rfid,
      target_nama,
      target_kelas,
      is_guru,
      target_id,
      status,
      updated_by,
      alasan,
      surat_nama,
      materi_nama,
      keterangan_materi
    } = body;

    if (!status) {
      return NextResponse.json({ success: false, message: 'Status presensi wajib diisi!' }, { status: 400 });
    }

    const cleanUid = uid_rfid ? String(uid_rfid).trim().toUpperCase() : '-';
    const updater = updated_by || 'Admin Portal';
    // ⚠️ Format TIME PostgreSQL butuh "HH:MM:SS" (kolon), bukan "23.48".
    const jamWibSingkat = formatWibTime(new Date(), true);

    // 1. Cari Target yang Benar & Tepat Sasaran
    let target = null;
    let isTargetGuru = Boolean(is_guru);

    if (isTargetGuru) {
      // Cari khusus di tb_guru
      let q = supabase.from('tb_guru').select('*');
      if (target_id) q = q.eq('id_guru', target_id);
      else if (target_nama) q = q.ilike('nama_guru', target_nama);
      else if (cleanUid !== '-') q = q.ilike('uid_rfid', cleanUid);
      
      const { data: guru } = await q.maybeSingle();
      if (guru) {
        target = {
          id: guru.id_guru,
          nama: guru.nama_guru,
          kelas: guru.role === 'admin' ? 'MASTER / ADMIN' : 'Guru / Staff',
        };
      }
    } else {
      // Cari khusus di tb_siswa
      let q = supabase.from('tb_siswa').select('*');
      if (target_id) q = q.eq('id_siswa', target_id);
      else if (target_nama) q = q.ilike('nama_siswa', target_nama);
      else if (cleanUid !== '-') q = q.ilike('uid_rfid', cleanUid);
      
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
      } else if (cleanUid !== '-') {
        // Coba cari di tb_guru lalu tb_siswa
        const { data: guru } = await supabase.from('tb_guru').select('*').ilike('uid_rfid', cleanUid).maybeSingle();
        if (guru) {
          isTargetGuru = true;
          target = { id: guru.id_guru, nama: guru.nama_guru, kelas: guru.role === 'admin' ? 'MASTER / ADMIN' : 'Guru / Staff' };
        } else {
          const { data: siswa } = await supabase.from('tb_siswa').select('*').ilike('uid_rfid', cleanUid).maybeSingle();
          if (siswa) {
            target = { id: siswa.id_siswa, nama: siswa.nama_siswa, kelas: siswa.kelas };
          }
        }
      }
    }

    if (!target || !target.nama) {
      return NextResponse.json({ success: false, message: 'Data siswa/guru tidak ditemukan.' }, { status: 404 });
    }

    // 2. Cari Log Absensi Khusus Nama Target Hari Ini (Hindari tumpang tindih nama/RFID)
    const todayStr = new Date().toISOString().slice(0, 10);
    const { data: existingLog } = await findAbsensiByName(
      supabase,
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
        const { error: delErr } = await supabase
          .from('absensi')
          .delete()
          .eq('id', existingLog.id);

        if (delErr) {
          throw delErr;
        }
      }

      // Catat ke Audit Trail (Safe)
      try {
        await supabase.from('audit_log_presensi').insert([{
          diubah_oleh: updater,
          role_pengubah: isTargetGuru ? 'Guru/Admin' : 'Admin/Wali Kelas',
          target_nama: target.nama,
          status_lama: oldStatus,
          status_baru: 'Presensi Dihapus / Direset (Belum Tap)',
          created_at: new Date().toISOString()
        }]);
      } catch (e) {}

      return NextResponse.json({
        success: true,
        message: `Status presensi hari ini untuk ${target.nama} berhasil dihapus. Status kembali menjadi Belum Tap.`
      });
    }

    // 🏠 3B. HAPUS STATUS PULANG (BATALKAN PULANG KEMBALI KE HADIR)
    if (isHapusPulang) {
      if (existingLog) {
        const resetPulangData = {
          status: 'Hadir',
          tipe: 'masuk',
          jam_pulang: null,
          updated_by: updater,
          updated_at: new Date().toISOString(),
        };

        const { error: updateErr } = await supabase
          .from('absensi')
          .update(resetPulangData)
          .eq('id', existingLog.id);

        if (updateErr) {
          throw updateErr;
        }
      }

      // Catat ke Audit Trail (Safe)
      try {
        await supabase.from('audit_log_presensi').insert([{
          diubah_oleh: updater,
          role_pengubah: isTargetGuru ? 'Guru/Admin' : 'Admin/Wali Kelas',
          target_nama: target.nama,
          status_lama: oldStatus,
          status_baru: 'Status Pulang Dihapus (Kembali Hadir)',
          created_at: new Date().toISOString()
        }]);
      } catch (e) {}

      return NextResponse.json({
        success: true,
        message: `Status pulang ${target.nama} berhasil dibatalkan. Status kini kembali Hadir.`
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
      rfid_uid: cleanUid,
    };
    const metaString = JSON.stringify(metaObj);
    const suratFoto = body.surat_url || null;

    if (existingLog) {
      const updatePayload = {
        status: isPulang ? 'Pulang' : finalStatus,
        jam_pulang: isPulang ? (existingLog.jam_pulang || jamWibSingkat) : null,
        foto_url: suratFoto || existingLog.foto_url || null,
        device_info: metaString,
      };

      const { error: updateErr } = await supabase
        .from('absensi')
        .update(updatePayload)
        .eq('id', existingLog.id);

      if (updateErr) {
        throw updateErr;
      }
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

      const { error: insertErr } = await supabase
        .from('absensi')
        .insert([insertPayload]);

      if (insertErr) {
        throw insertErr;
      }
    }

    // 📡 Siarkan perubahan absensi secara realtime ke seluruh client & HP siswa
    try {
      supabase.channel('smk_ypk_presence_room').send({
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

    // 4. Catat ke Audit Trail (Safe)
    try {
      await supabase.from('audit_log_presensi').insert([{
        diubah_oleh: updater,
        role_pengubah: isTargetGuru ? 'Guru/Admin' : 'Admin/Wali Kelas',
        target_nama: target.nama,
        status_lama: oldStatus,
        status_baru: isPulang ? 'Pulang' : status,
        created_at: new Date().toISOString()
      }]);
    } catch (e) {}

    return NextResponse.json({
      success: true,
      message: `Presensi ${target.nama} berhasil diubah menjadi ${isPulang ? 'Pulang' : status}.`
    });

  } catch (err) {
    console.error('Server error manual update:', err);
    return NextResponse.json({ success: false, message: err.message || 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
