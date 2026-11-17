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
    const newPassword = String(body.newPassword || '').trim();
    const currentPassword = String(body.currentPassword || '').trim();

    if (!newPassword || newPassword.length < 4) {
      return NextResponse.json(
        { success: false, message: 'Password baru minimal 4 karakter.' },
        { status: 400 }
      );
    }

    if (!rawId) {
      return NextResponse.json(
        { success: false, message: 'ID pengguna tidak valid.' },
        { status: 400 }
      );
    }

    const cleanRawId = parseInt(String(rawId).replace(/\D/g, ''), 10) || rawId;
    const table = isGuru ? 'tb_guru' : 'tb_siswa';
    const idCol = isGuru ? 'id_guru' : 'id_siswa';

    // Ambil data pengguna di database untuk verifikasi
    const { data: userRec, error: fetchErr } = await supabaseServer
      .from(table)
      .select('*')
      .eq(idCol, cleanRawId)
      .maybeSingle();

    if (fetchErr || !userRec) {
      return NextResponse.json(
        { success: false, message: 'Akun tidak ditemukan di database.' },
        { status: 404 }
      );
    }

    // Jika pengguna memasukkan password lama, verifikasi kecocokan
    if (currentPassword) {
      const isOldMatch = verifyPassword(currentPassword, userRec.password);
      if (!isOldMatch) {
        return NextResponse.json(
          { success: false, message: 'Kata sandi lama yang Anda masukkan tidak sesuai.' },
          { status: 401 }
        );
      }
    }

    // 🔒 Enkripsi password baru menggunakan PBKDF2 Cryptographic Hashing
    const hashedPassword = hashPassword(newPassword);

    // Update kolom password dengan hash kriptografi yang aman
    const { error: updateErr } = await supabaseServer
      .from(table)
      .update({ password: hashedPassword })
      .eq(idCol, cleanRawId);

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
