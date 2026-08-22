import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Return data rekap bersih untuk ESP8266 (Bisa disesuaikan angkanya)
    return NextResponse.json({
      hadir: 0,
      sakit: 0,
      izin: 0,
      alpha: 0,
      total_siswa: 91
    }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ 
      error: "Gagal memuat rekap", 
      details: error.message 
    }, { status: 500 });
  }
}
