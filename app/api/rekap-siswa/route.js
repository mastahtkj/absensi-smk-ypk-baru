// Contoh Perbaikan di Next.js (app/api/rekap-siswa/route.js)
import { NextResponse } from 'next/server';
import { db } from '@/lib/db'; // sesuaikan dengan koneksi database Anda

export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD

    // Hitung presensi khusus hari ini
    const countHadir = await db.presensi.count({ where: { tanggal: today, status: 'Hadir' } });
    const countSakit = await db.presensi.count({ where: { tanggal: today, status: 'Sakit' } });
    const countIzin  = await db.presensi.count({ where: { tanggal: today, status: 'Izin' } });
    const countAlpha = await db.presensi.count({ where: { tanggal: today, status: 'Alpha' } });
    
    const totalSiswa = await db.siswa.count();

    return NextResponse.json({
      hadir: countHadir,
      sakit: countSakit,
      izin: countIzin,
      alpha: countAlpha, // Pastikan tidak di-hardcode ke 68
      total_siswa: totalSiswa
    });
  } catch (error) {
    return NextResponse.json({ error: "Gagal memuat rekap" }, { status: 500 });
  }
}
