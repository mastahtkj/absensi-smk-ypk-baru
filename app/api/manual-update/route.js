import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
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
    const jamWibSingkat = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });

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
    const { data: existingLog } = await supabase
      .from('absensi')
      .select('*')
      .ilike('nama', target.nama)
      .gte('created_at', `${todayStr}T00:00:00.000Z`)
      .lte('created_at', `${todayStr}T23:59:59.999Z`)
      .maybeSingle();

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

    let absensiError = null;
    const fullData = {
      status: isPulang ? 'Pulang' : finalStatus,
      tipe: isPulang ? 'pulang_selesai' : 'masuk',
      jam_pulang: isPulang ? (existingLog?.jam_pulang || jamWibSingkat) : null,
      updated_by: updater,
      alasan: alasan || null,
      surat_nama: surat_nama || null,
      surat_url: body.surat_url || null,
      materi_nama: materi_nama || null,
      materi_url: body.materi_url || null,
      keterangan_materi: keterangan_materi || null,
    };

    const basicData = {
      status: isPulang ? 'Pulang' : finalStatus,
      tipe: isPulang ? 'pulang_selesai' : 'masuk',
      jam_pulang: isPulang ? (existingLog?.jam_pulang || jamWibSingkat) : null,
      updated_by: updater,
    };

    if (existingLog) {
      const res = await supabase
        .from('absensi')
        .update({ ...fullData, updated_at: new Date().toISOString() })
        .eq('id', existingLog.id);
      
      if (res.error && (res.error.message?.includes('column') || res.error.code === 'PGRST204')) {
        console.warn('Kolom materi/surat belum ada di DB, menggunakan basic update');
        const fallbackRes = await supabase
          .from('absensi')
          .update({ ...basicData, updated_at: new Date().toISOString() })
          .eq('id', existingLog.id);
        absensiError = fallbackRes.error;
      } else {
        absensiError = res.error;
      }
    } else {
      const res = await supabase
        .from('absensi')
        .insert([{
          rfid_uid: cleanUid,
          nama: target.nama,
          kelas: target.kelas,
          jam_masuk: isPulang ? '-' : jamWibSingkat,
          ...fullData,
        }]);

      if (res.error && (res.error.message?.includes('column') || res.error.code === 'PGRST204')) {
        console.warn('Kolom materi/surat belum ada di DB, menggunakan basic insert');
        const fallbackRes = await supabase
          .from('absensi')
          .insert([{
            rfid_uid: cleanUid,
            nama: target.nama,
            kelas: target.kelas,
            jam_masuk: isPulang ? '-' : jamWibSingkat,
            ...basicData,
          }]);
        absensiError = fallbackRes.error;
      } else {
        absensiError = res.error;
      }
    }

    if (absensiError) {
      throw absensiError;
    }

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
