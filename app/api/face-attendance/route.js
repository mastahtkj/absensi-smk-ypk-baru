import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const preferredRegion = ['sin1'];
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wpyfwkcevgdhkazeesdq.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

function getTodayBoundaryWIB() {
  const now = new Date();
  const options = { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' };
  const formatter = new Intl.DateTimeFormat('en-CA', options);
  const tanggalWib = formatter.format(now);

  const startOfDay = new Date(`${tanggalWib}T00:00:00.000+07:00`).toISOString();
  const endOfDay = new Date(`${tanggalWib}T23:59:59.999+07:00`).toISOString();

  return { startOfDay, endOfDay, tanggalWib };
}

// POST: Rekam Presensi Wajah AI
export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, nama, kelas, mode = 'masuk', confidence = 95 } = body;

    if (typeof nama !== 'string' || !nama.trim() || !['masuk', 'pulang'].includes(mode)) {
      return NextResponse.json({ success: false, message: 'Nama dan mode presensi yang valid wajib diisi.' }, { status: 400 });
    }

    const { startOfDay, endOfDay, tanggalWib } = getTodayBoundaryWIB();
    const now = new Date();
    const jamStr = now.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Jakarta',
    });

    const isGuru = Boolean(
      kelas &&
      (kelas.toLowerCase().includes('guru') ||
        kelas.toLowerCase().includes('staff') ||
        kelas.toLowerCase().includes('admin') ||
        kelas.toLowerCase().includes('master'))
    );

    let status = 'Hadir';
    if (!isGuru && mode === 'masuk') {
      const jakartaTime = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
      }).format(now);
      const [hour, minute] = jakartaTime.split(':').map(Number);
      const curMin = hour * 60 + minute;
      if (curMin > 450) { // Lewat 07:30 WIB
        status = 'Terlambat';
      }
    }
    if (mode === 'pulang') {
      status = 'Pulang';
    }

    // Cek apakah sudah ada log hari ini untuk identitas yang sama.
    let existingQuery = supabase
      .from('absensi')
      .select('*')
      .ilike('nama', nama.trim())
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)
      .order('created_at', { ascending: false })
      .limit(1);
    if (kelas) existingQuery = existingQuery.eq('kelas', kelas);
    const { data: existingLogs, error: lookupErr } = await existingQuery;
    if (lookupErr) {
      console.error('Face attendance lookup error:', lookupErr);
      return NextResponse.json({ success: false, message: 'Gagal memeriksa presensi hari ini.' }, { status: 500 });
    }

    const existingLog = existingLogs && existingLogs.length > 0 ? existingLogs[0] : null;

    if (existingLog) {
      if (mode === 'pulang') {
        const { error: updateErr } = await supabase
          .from('absensi')
          .update({
            status: 'Pulang',
            jam_pulang: jamStr,
            tipe: 'pulang_selesai',
            updated_at: now.toISOString(),
          })
          .eq('id', existingLog.id);
        if (updateErr) {
          console.error('Face attendance checkout update error:', updateErr);
          return NextResponse.json({ success: false, message: 'Gagal menyimpan presensi pulang.' }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          action: 'pulang',
          nama,
          kelas,
          jam: jamStr,
          status: 'Pulang',
          message: `Presensi Pulang berhasil dicatat pada ${jamStr} WIB.`,
        });
      } else {
        return NextResponse.json({
          success: true,
          already_presensi: true,
          action: 'sudah_presensi',
          nama,
          kelas,
          jam: existingLog.jam_masuk || jamStr,
          status: existingLog.status,
          message: `Anda sudah presensi Masuk hari ini pada ${existingLog.jam_masuk || jamStr} WIB.`,
        });
      }
    }

    // Insert Presensi Baru
    const insertData = {
      nama,
      kelas: kelas || (isGuru ? 'Guru / Staff' : 'Siswa'),
      status,
      tipe: mode === 'pulang' ? 'pulang_selesai' : 'masuk',
      jam_masuk: mode === 'masuk' ? jamStr : undefined,
      jam_pulang: mode === 'pulang' ? jamStr : undefined,
      rfid_uid: null,
      created_at: now.toISOString(),
    };

    // Tidak meminta row hasil insert: beberapa instalasi hanya memberi izin INSERT,
    // sementara RETURNING/SELECT ditolak oleh policy RLS.
    const { error: insertErr } = await supabase.from('absensi').insert([insertData]);

    if (insertErr) {
      console.error('Insert absensi error:', insertErr);
      return NextResponse.json({ success: false, message: 'Gagal menyimpan presensi ke database.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      action: mode,
      nama,
      kelas,
      jam: jamStr,
      status,
      confidence,
      attendance: insertData,
      message: `Presensi ${mode === 'masuk' ? 'Masuk' : 'Pulang'} berhasil dicatat via Face Recognition AI.`,
    });
  } catch (err) {
    console.error('Face attendance API error:', err);
    return NextResponse.json({ success: false, message: 'Server Internal Error' }, { status: 500 });
  }
}
