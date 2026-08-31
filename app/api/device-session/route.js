import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(req) {
  try {
    const body = await req.json();
    const { action, id_siswa, uid_rfid, nama_siswa, device_id, device_name, reset_by, removed_by } = body;

    // Normalisasi ID dan UID
    const rawIdSiswa = id_siswa ? parseInt(String(id_siswa).replace(/\D/g, ''), 10) : null;
    const cleanUid = uid_rfid ? String(uid_rfid).trim().toUpperCase() : null;

    if (!rawIdSiswa && !cleanUid) {
      return NextResponse.json({ success: false, message: 'ID Siswa atau UID RFID diperlukan.' }, { status: 400 });
    }

    // 1. ACTION: RESET SEMUA PERANGKAT SISWA (Admin / Guru Piket)
    if (action === 'reset_devices') {
      let deleteQuery = supabase.from('tb_siswa_devices').delete();
      if (rawIdSiswa) {
        deleteQuery = deleteQuery.eq('id_siswa', rawIdSiswa);
      } else if (cleanUid) {
        deleteQuery = deleteQuery.eq('uid_rfid', cleanUid);
      }

      const { error: delErr } = await deleteQuery;
      if (delErr) {
        console.warn('Gagal reset devices:', delErr);
        return NextResponse.json({ success: false, message: 'Gagal mereset perangkat siswa di database.' }, { status: 500 });
      }

      // Catat ke audit log presensi
      try {
        await supabase.from('audit_log_presensi').insert({
          tipe_aksi: 'RESET_DEVICE_LOGIN',
          keterangan: `Reset 2 Perangkat Login Akun Siswa: ${nama_siswa || rawIdSiswa || cleanUid} oleh ${reset_by || 'Admin'}`,
          dilakukan_oleh: reset_by || 'Admin',
          waktu: new Date().toISOString(),
        });
      } catch (e) {}

      return NextResponse.json({
        success: true,
        message: `Seluruh perangkat login untuk ${nama_siswa || 'siswa'} berhasil direset. Akun kini bisa login di perangkat baru (0/2).`,
      });
    }

    // 2. ACTION: HAPUS 1 PERANGKAT SPESIFIK
    if (action === 'remove_device') {
      if (!device_id) {
        return NextResponse.json({ success: false, message: 'Device ID wajib disertakan.' }, { status: 400 });
      }

      let deleteQuery = supabase.from('tb_siswa_devices').delete().eq('device_id', device_id);
      if (rawIdSiswa) deleteQuery = deleteQuery.eq('id_siswa', rawIdSiswa);

      const { error: delErr } = await deleteQuery;
      if (delErr) {
        return NextResponse.json({ success: false, message: 'Gagal menghapus perangkat.' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Perangkat berhasil dihapus dari akun siswa.' });
    }

    // 3. ACTION: AMBIL DAFTAR PERANGKAT TERDAFTAR (GET DEVICES)
    if (action === 'get_devices') {
      let query = supabase.from('tb_siswa_devices').select('*').order('last_login', { ascending: false });
      if (rawIdSiswa) {
        query = query.eq('id_siswa', rawIdSiswa);
      } else if (cleanUid) {
        query = query.eq('uid_rfid', cleanUid);
      }

      const { data: devices, error: getErr } = await query;
      if (getErr) {
        return NextResponse.json({ success: false, message: 'Gagal mengambil daftar perangkat.', devices: [], activeCount: 0 });
      }

      return NextResponse.json({
        success: true,
        devices: devices || [],
        activeCount: (devices || []).length,
      });
    }

    // 4. ACTION DEFAULT: CHECK & REGISTER DEVICE (MAKSIMAL 2 PERANGKAT)
    if (!device_id) {
      return NextResponse.json({ success: false, message: 'Device ID tidak valid.' }, { status: 400 });
    }

    // Ambil daftar perangkat yang sedang terdaftar untuk siswa ini
    let selectQuery = supabase.from('tb_siswa_devices').select('*');
    if (rawIdSiswa) {
      selectQuery = selectQuery.eq('id_siswa', rawIdSiswa);
    } else if (cleanUid) {
      selectQuery = selectQuery.eq('uid_rfid', cleanUid);
    }

    const { data: existingDevices, error: selectErr } = await selectQuery;

    // Jika tabel belum ada atau error database, izinkan login dengan fallback
    if (selectErr) {
      console.warn('Info tb_siswa_devices query:', selectErr);
      return NextResponse.json({
        success: true,
        isFallback: true,
        activeCount: 1,
        message: 'Device verification bypassed (table syncing).',
      });
    }

    const deviceList = existingDevices || [];
    const matchedDevice = deviceList.find((d) => d.device_id === device_id);

    // Kasus A: Perangkat ini SUDAH TERDAFTAR sebelumnya -> Update waktu login terakhir & Izinkan Login
    if (matchedDevice) {
      await supabase
        .from('tb_siswa_devices')
        .update({
          device_name: device_name || matchedDevice.device_name || 'Perangkat Terdaftar',
          last_login: new Date().toISOString(),
          nama_siswa: nama_siswa || matchedDevice.nama_siswa,
        })
        .eq('id', matchedDevice.id);

      return NextResponse.json({
        success: true,
        isExistingDevice: true,
        activeCount: deviceList.length,
        devices: deviceList,
        message: `Perangkat terverifikasi (${deviceList.length}/2).`,
      });
    }

    // Kasus B: Perangkat BARU, dan slot masih tersedia (< 2 perangkat) -> Daftarkan Perangkat & Izinkan Login
    if (deviceList.length < 2) {
      const newDeviceRecord = {
        id_siswa: rawIdSiswa,
        uid_rfid: cleanUid,
        nama_siswa: nama_siswa || 'Siswa',
        device_id: device_id,
        device_name: device_name || 'Perangkat Siswa',
        last_login: new Date().toISOString(),
      };

      const { data: inserted, error: insertErr } = await supabase
        .from('tb_siswa_devices')
        .insert(newDeviceRecord)
        .select()
        .maybeSingle();

      if (insertErr) {
        console.warn('Gagal insert device baru:', insertErr);
        // Fallback jika terjadi error insert agar tidak menghalangi login darurat
        return NextResponse.json({
          success: true,
          activeCount: deviceList.length + 1,
          message: 'Login diizinkan.',
        });
      }

      const allDevices = [...deviceList, inserted || newDeviceRecord];
      return NextResponse.json({
        success: true,
        isNewDevice: true,
        activeCount: allDevices.length,
        devices: allDevices,
        message: `Perangkat baru berhasil didaftarkan (${allDevices.length}/2: HP Siswa / HP Orang Tua).`,
      });
    }

    // Kasus C: Perangkat BARU, tetapi SUDAH 2 PERANGKAT TERDAFTAR -> TOLAK LOGIN! 🚫
    return NextResponse.json({
      success: false,
      code: 'DEVICE_LIMIT_REACHED',
      message: 'Akun siswa hanya dapat login di maksimal 2 perangkat (misal: HP Siswa & HP Orang Tua). Harap hubungi Admin/Guru untuk mereset perangkat jika berganti HP.',
      activeCount: deviceList.length,
      devices: deviceList,
    });
  } catch (error) {
    console.error('Error device-session API:', error);
    return NextResponse.json({ success: false, message: 'Kesalahan internal server pada sesi perangkat.' }, { status: 500 });
  }
}
