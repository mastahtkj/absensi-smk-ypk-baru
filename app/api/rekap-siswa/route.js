import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

function getTodayBoundaryWIB() {
  const now = new Date();
  const options = { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' };
  const formatter = new Intl.DateTimeFormat('en-CA', options);
  const tanggalWib = formatter.format(now);

  const startOfDay = new Date(`${tanggalWib}T00:00:00.000+07:00`).toISOString();
  const endOfDay = new Date(`${tanggalWib}T23:59:59.999+07:00`).toISOString();

  return { startOfDay, endOfDay };
}

export async function GET() {
  try {
    const { startOfDay, endOfDay } = getTodayBoundaryWIB();

    const { data: absensiHariIni, error: errorAbsensi } = await supabase
      .from('absensi')
      .select('status, rfid_uid')
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay);

    if (errorAbsensi) {
      console.error('[Supabase Error - Absensi]:', errorAbsensi.message);
      return NextResponse.json({ success: false, message: 'Gagal mengambil data absensi' }, { status: 500 });
    }

    const { data: totalSiswa, error: errorSiswa } = await supabase
      .from('tb_siswa')
      .select('uid_rfid');

    if (errorSiswa) {
      console.error('[Supabase Error - Siswa]:', errorSiswa.message);
    }

    let hadir = 0;
    let sakit = 0;
    let izin = 0;
    let alpha = 0;

    if (absensiHariIni && absensiHariIni.length > 0) {
      absensiHariIni.forEach((row) => {
        const st = (row.status || '').toLowerCase();
        if (st.includes('hadir')) {
          hadir++;
        } else if (st.includes('sakit')) {
          sakit++;
        } else if (st.includes('izin')) {
          izin++;
        } else if (st.includes('alpha') || st.includes('alpa')) {
          alpha++;
        }
      });
    }

    const totalSiswaTerdaftar = totalSiswa ? totalSiswa.length : 0;
    if (totalSiswaTerdaftar > 0 && alpha === 0) {
      const siswaSudahPresensi = hadir + sakit + izin;
      alpha = Math.max(0, totalSiswaTerdaftar - siswaSudahPresensi);
    }

    return NextResponse.json({
      success: true,
      hadir: hadir,
      sakit: sakit,
      izin: izin,
      alpha: alpha,
      total_siswa: totalSiswaTerdaftar,
      updated_at: new Date().toISOString()
    }, { status: 200 });

  } catch (err) {
    console.error('[API Rekap Error]:', err);
    return NextResponse.json({ success: false, message: 'Server Internal Error' }, { status: 500 });
  }
}
