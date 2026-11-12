import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  return NextResponse.json({
    success: true,
    message: 'Layanan WhatsApp Gateway telah dinonaktifkan. Semua notifikasi otomatis dialihkan langsung ke Aplikasi Super App & Akun Pengguna.',
  }, { status: 200 });
}


export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'WhatsApp Gateway nonaktif.',
  }, { status: 200 });
}

async function dummyOldFunc() {
  const type = 'none';
  const custom_message = null;
  const nama = '';
  const kelas = '';
  const jurusan = '';
  const status = '';
  const inisial = '';
  const jam_masuk = '';
  const jam_pulang = '';
  const rfid_uid = '';
  const KIRIMI_GROUP_GURU = '';
  const KIRIMI_GROUP_SISWA = '';
  const sendWhatsAppMessage = async () => false;
  const supabase = { from: () => ({ select: () => ({ ilike: () => ({ maybeSingle: () => Promise.resolve({ data: null }), limit: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }) }) }) };
  try {
    const randomRef = 'REF';
    const isGuru = false;
    let namaGuruDb = '';


    return null;
  } catch (err) {
    return null;
  }
}
