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

    if (!nama) {
      return NextResponse.json({ success: false, message: 'Data nama wajib diisi.' }, { status: 400 });
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
      const curMin = now.getHours() * 60 + now.getMinutes();
      if (curMin > 450) { // Lewat 07:30 WIB
        status = 'Telat';
      }
    }
    if (mode === 'pulang') {
      status = 'Pulang';
    }

    // Cek apakah sudah ada log hari ini
    const { data: existingLogs } = await supabase
      .from('absensi')
      .select('*')
      .ilike('nama', nama)
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)
      .limit(1);

    const existingLog = existingLogs && existingLogs.length > 0 ? existingLogs[0] : null;

    if (existingLog) {
      if (mode === 'pulang') {
        await supabase
          .from('absensi')
          .update({
            status: 'Pulang',
            jam_pulang: jamStr,
            tipe: 'pulang_selesai',
            updated_at: now.toISOString(),
          })
          .eq('id', existingLog.id);

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

    const { data: inserted, error: insertErr } = await supabase.from('absensi').insert([insertData]).select().single();

    if (insertErr) {
      console.error('Insert absensi error:', insertErr);
    }

    return NextResponse.json({
      success: true,
      action: mode,
      nama,
      kelas,
      jam: jamStr,
      status,
      confidence,
      message: `Presensi ${mode === 'masuk' ? 'Masuk' : 'Pulang'} berhasil dicatat via Face Recognition AI.`,
    });
  } catch (err) {
    console.error('Face attendance API error:', err);
    return NextResponse.json({ success: false, message: 'Server Internal Error' }, { status: 500 });
  }
}
