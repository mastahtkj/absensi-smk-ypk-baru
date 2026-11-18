import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../lib/supabaseServer';
import { hashPassword, verifyPassword } from '../../../lib/cryptoAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const rawId = body.rawId || body.id;
    const isGuru = Boolean(body.isGuru);
    const username = String(body.username || '').trim().toLowerCase();
    const newPassword = String(body.newPassword || '').trim();
    const currentPassword = String(body.currentPassword || '').trim();

    if (!newPassword || newPassword.length < 4) {
      return NextResponse.json(
        { success: false, message: 'Password baru minimal 4 karakter.' },
        { status: 400 }
      );
    }

    if (!rawId && !username) {
      return NextResponse.json(
        { success: false, message: 'ID pengguna atau username tidak valid.' },
        { status: 400 }
      );
    }

    const cleanRawId = parseInt(String(rawId || '').replace(/\D/g, ''), 10) || rawId;
    const table = isGuru ? 'tb_guru' : 'tb_siswa';
    const idCol = isGuru ? 'id_guru' : 'id_siswa';

    // 1. Ambil data pengguna di database untuk verifikasi
    let userRec = null;
    if (cleanRawId) {
      const { data } = await supabaseServer
        .from(table)
        .select('*')
        .eq(idCol, cleanRawId)
        .maybeSingle();
      userRec = data;
    }

    if (!userRec && username) {
      const { data } = await supabaseServer
        .from(table)
        .select('*')
        .eq('username', username)
        .maybeSingle();
      userRec = data;
    }

    if (!userRec) {
      return NextResponse.json(
        { success: false, message: 'Akun tidak ditemukan di database.' },
        { status: 404 }
      );
    }

    // 2. Jika pengguna memasukkan password lama, verifikasi kecocokan
    if (currentPassword) {
      const dbOld = String(userRec.password || userRec.biodata?.password || '').trim();
      const defaultOlds = isGuru ? ['guru123', 'admin123', '123456', '301020'] : ['siswa123', '123456', 'admin123'];
      const isOldMatch = dbOld
        ? verifyPassword(currentPassword, dbOld)
        : defaultOlds.includes(currentPassword);

      if (!isOldMatch) {
        return NextResponse.json(
          { success: false, message: 'Kata sandi lama yang Anda masukkan tidak sesuai.' },
          { status: 401 }
        );
      }
    }

    // 3. 🔒 Enkripsi password baru menggunakan PBKDF2 Cryptographic Hashing
    const hashedPassword = hashPassword(newPassword);

    // Update kolom password dengan hash kriptografi yang aman
    const updatePayload = { password: hashedPassword };

    // Jika akun memiliki biodata JSON, perbarui juga agar konsisten
    if (userRec.biodata && typeof userRec.biodata === 'object') {
      updatePayload.biodata = {
        ...userRec.biodata,
        password: hashedPassword,
        password_updated_at: new Date().toISOString(),
      };
    }

    const actualId = userRec[idCol] || cleanRawId;
    const { error: updateErr } = await supabaseServer
      .from(table)
      .update(updatePayload)
      .eq(idCol, actualId);

    if (updateErr) {
      return NextResponse.json(
        { success: false, message: updateErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Kata sandi berhasil diperbarui dengan enkripsi kriptografi tingkat tinggi.',
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err.message || 'Gagal mengubah kata sandi.' },
      { status: 500 }
    );
  }
}
