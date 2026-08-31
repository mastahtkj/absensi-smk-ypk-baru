import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(req) {
  try {
    const body = await req.json();
    const { uid_rfid, status, updated_by, alasan, surat_nama, materi_nama, keterangan_materi } = body;

    if (!uid_rfid || !status) {
      return NextResponse.json({ success: false, message: 'UID RFID dan Status wajib diisi!' }, { status: 400 });
    }

    const cleanUid = String(uid_rfid).trim().toUpperCase();
    const updater = updated_by || 'Admin Portal';
    const jamWibSingkat = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });

    // 1. Cari Target di tb_siswa
    let target = null;
    let isGuru = false;

    const { data: siswa } = await supabase
      .from('tb_siswa')
      .select('*')
      .ilike('uid_rfid', cleanUid)
      .maybeSingle();

    if (siswa) {
      target = {
        id: siswa.id_siswa,
        nama: siswa.nama_siswa,
        kelas: siswa.kelas,
      };
    } else {
      // 2. Cari Target di tb_guru jika tidak ditemukan di siswa
      const { data: guru } = await supabase
        .from('tb_guru')
        .select('*')
        .ilike('uid_rfid', cleanUid)
        .maybeSingle();

      if (guru) {
        isGuru = true;
        target = {
          id: guru.id_guru,
          nama: guru.nama_guru,
          kelas: guru.role === 'admin' ? 'MASTER / ADMIN' : 'Guru / Staff',
        };
      }
    }

    if (!target) {
      return NextResponse.json({ success: false, message: 'Data siswa/guru dengan UID tersebut tidak ditemukan.' }, { status: 404 });
    }

    // 3. Catat / Update Absensi Ke Database
    const todayStr = new Date().toISOString().slice(0, 10);
    const { data: existingLog } = await supabase
      .from('absensi')
      .select('*')
      .eq('rfid_uid', cleanUid)
      .gte('created_at', `${todayStr}T00:00:00.000Z`)
      .lte('created_at', `${todayStr}T23:59:59.999Z`)
      .maybeSingle();

    const oldStatus = existingLog ? existingLog.status : 'Belum Presensi';
    const isHapusPulang = String(status).trim().toLowerCase().includes('hapus') && String(status).trim().toLowerCase().includes('pulang');
    const isPulang = !isHapusPulang && String(status).trim().toLowerCase().includes('pulang');

    let finalStatus = status;
    if (isHapusPulang) {
      finalStatus = (existingLog?.status && !existingLog.status.toLowerCase().includes('pulang')) ? existingLog.status : 'Hadir';
    }

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

    // 4. Catat ke Audit Trail
    await supabase.from('audit_log_presensi').insert([{
      diubah_oleh: updater,
      role_pengubah: isGuru ? 'Guru/Admin' : 'Admin/Wali Kelas',
      target_nama: target.nama,
      status_lama: oldStatus,
      status_baru: isHapusPulang ? 'Status Pulang Dihapus (Hadir)' : (isPulang ? 'Pulang' : status),
      created_at: new Date().toISOString()
    }]);

    return NextResponse.json({
      success: true,
      message: isHapusPulang
        ? `Status pulang ${target.nama} berhasil dihapus/dibatalkan.`
        : `Presensi ${target.nama} berhasil diubah menjadi ${isPulang ? 'Pulang' : status}.`
    });

  } catch (err) {
    console.error('Server error manual update:', err);
    return NextResponse.json({ success: false, message: err.message || 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
