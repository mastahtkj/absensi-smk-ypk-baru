import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // Sesuaikan path prisma client Anda

export async function GET() {
  try {
    // Ambil tanggal hari ini (format YYYY-MM-DD)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const countHadir = await prisma.presensi.count({
      where: { createdAt: { gte: today }, status: 'Hadir' }
    });
    const countSakit = await prisma.presensi.count({
      where: { createdAt: { gte: today }, status: 'Sakit' }
    });
    const countIzin = await prisma.presensi.count({
      where: { createdAt: { gte: today }, status: 'Izin' }
    });
    const countAlpha = await prisma.presensi.count({
      where: { createdAt: { gte: today }, status: 'Alpha' }
    });

    const totalSiswa = await prisma.siswa.count();

    return NextResponse.json({
      hadir: countHadir,
      sakit: countSakit,
      izin: countIzin,
      alpha: countAlpha,
      total_siswa: totalSiswa
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
