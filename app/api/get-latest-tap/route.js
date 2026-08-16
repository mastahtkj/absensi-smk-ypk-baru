import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET() {
  try {
    // 1. Cek tabel latest_scan
    const { data: latestScan } = await supabase
      .from('latest_scan')
      .select('uid')
      .eq('id', 1)
      .maybeSingle();

    if (latestScan?.uid) {
      return NextResponse.json({ success: true, uid: latestScan.uid });
    }

    // 2. Fallback cek dari log absensi terakhir
    const { data: latestAbsensi } = await supabase
      .from('absensi')
      .select('rfid_uid')
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestAbsensi?.rfid_uid) {
      return NextResponse.json({ success: true, uid: latestAbsensi.rfid_uid });
    }

    return NextResponse.json({ success: false, uid: null });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
