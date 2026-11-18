import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 📸 API PENDAFTARAN & PEMBARUAN BIOMETRIK WAJAH RESMI (SMK YPK MEDAN)
 * 
 * Menyimpan vektor biometrik 128-D ResNet-34 dan snapshot foto wajah
 * secara permanen ke Supabase Cloud (tb_siswa atau tb_guru)
 * dengan Service Role Key (bypasses RLS) dan menyiarkan pembaruan
 * ke seluruh terminal scanner yang sedang aktif.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      userId,
      rawId,
      nama,
      username,
      isGuru,
      descriptor,
      photoUrl,
      kelas,
      jurusan,
      metadata = {},
    } = body;

    // 1. Validasi vektor biometrik
    if (!descriptor || !Array.isArray(descriptor) || descriptor.length < 128) {
      return NextResponse.json(
        { success: false, message: 'Vektor biometrik tidak valid (minimal 128 float).' },
        { status: 400 }
      );
    }

    if (!nama && !rawId && !userId && !username) {
      return NextResponse.json(
        { success: false, message: 'Identitas pengguna (nama/ID/username) wajib disertakan.' },
        { status: 400 }
      );
    }

    const table = isGuru ? 'tb_guru' : 'tb_siswa';
    const idCol = isGuru ? 'id_guru' : 'id_siswa';
    const nameCol = isGuru ? 'nama_guru' : 'nama_siswa';

    const cleanRawId = parseInt(String(rawId || userId || '').replace(/\D/g, ''), 10) || null;
    const cleanNama = String(nama || '').trim();
    const cleanUsername = String(username || '').trim().toLowerCase();

    // 2. Cari data pengguna di database untuk mendapatkan biodata eksisting
    let existingUser = null;

    if (cleanRawId) {
      const { data: byId } = await supabaseServer
        .from(table)
        .select('*')
        .eq(idCol, cleanRawId)
        .maybeSingle();
      if (byId) existingUser = byId;
    }

    if (!existingUser && cleanUsername) {
      const { data: byUser } = await supabaseServer
        .from(table)
        .select('*')
        .eq('username', cleanUsername)
        .maybeSingle();
      if (byUser) existingUser = byUser;
    }

    if (!existingUser && cleanNama) {
      const { data: byName } = await supabaseServer
        .from(table)
        .select('*')
        .ilike(nameCol, cleanNama)
        .maybeSingle();
      if (byName) existingUser = byName;
    }

    if (!existingUser) {
      return NextResponse.json(
        { success: false, message: `Akun ${cleanNama || cleanUsername || cleanRawId} tidak ditemukan di tabel ${table}.` },
        { status: 404 }
      );
    }

    const targetDbId = existingUser[idCol];

    // 3. Susun data biodata terbaru (menggabungkan biodata lama dengan sampel biometrik baru)
    let currentBio = existingUser.biodata;
    if (typeof currentBio === 'string') {
      try { currentBio = JSON.parse(currentBio); } catch (e) { currentBio = {}; }
    }
    if (!currentBio || typeof currentBio !== 'object') currentBio = {};

    const updatedBiodata = {
      ...currentBio,
      ...metadata,
      face_descriptor: descriptor,
      face_legacy_descriptor: descriptor,
      face_photo_url: photoUrl || currentBio.face_photo_url || null,
      face_snapshot: photoUrl || currentBio.face_snapshot || null,
      face_registered_at: new Date().toISOString(),
    };

    // 4. Update data ke Supabase (Kolom face_descriptor + kolom biodata)
    const updatePayload = {
      face_descriptor: descriptor,
      biodata: updatedBiodata,
    };

    const { error: updateErr } = await supabaseServer
      .from(table)
      .update(updatePayload)
      .eq(idCol, targetDbId);

    if (updateErr) {
      console.error(`[API register-face] Gagal update ${table}:`, updateErr);
      return NextResponse.json(
        { success: false, message: `Gagal menyimpan ke database: ${updateErr.message}` },
        { status: 500 }
      );
    }

    // 5. Siarkan event realtime ke semua client aktif (Scanner Terminal & Aplikasi Siswa)
    try {
      await supabaseServer.channel('smk_ypk_presence_room').send({
        type: 'broadcast',
        event: 'face_registered',
        payload: {
          user_id: existingUser[idCol],
          rawId: targetDbId,
          id: isGuru ? `GURU-${targetDbId}` : `SISWA-${targetDbId}`,
          nama: existingUser[nameCol],
          role: isGuru ? 'guru' : 'siswa',
          kelas: existingUser.kelas || kelas || '',
          jurusan: existingUser.jurusan || jurusan || '',
          face_descriptor: descriptor,
          face_photo_url: photoUrl || '',
          biodata: updatedBiodata,
          timestamp: Date.now(),
        },
      });
    } catch (bcErr) {
      console.warn('[API register-face] Realtime broadcast warning:', bcErr);
    }

    // 6. Sinkronkan langsung ke server AI InsightFace Python lokal (jika online di port 5000)
    try {
      const insightUrl = process.env.INSIGHTFACE_SERVER_URL || 'http://127.0.0.1:5000';
      const c = new AbortController();
      const t = setTimeout(() => c.abort(), 1500);
      await fetch(`${insightUrl}/api/register_or_update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: isGuru ? `GURU-${targetDbId}` : `SISWA-${targetDbId}`,
          raw_id: targetDbId,
          nama: existingUser[nameCol],
          role: isGuru ? 'Guru' : 'Siswa',
          kelas: existingUser.kelas || kelas || '',
          jurusan: existingUser.jurusan || jurusan || '',
          descriptor,
        }),
        signal: c.signal,
      }).catch(() => {});
      clearTimeout(t);
    } catch (ifErr) {}

    return NextResponse.json({
      success: true,
      message: `Biometrik wajah untuk ${existingUser[nameCol]} berhasil didaftarkan dan disinkronkan ke seluruh terminal scanner.`,
      user: {
        id: targetDbId,
        nama: existingUser[nameCol],
        role: isGuru ? 'Guru' : 'Siswa',
        kelas: existingUser.kelas || '',
      },
    });
  } catch (error) {
    console.error('[API register-face] Server exception:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Terjadi kesalahan pada server.' },
      { status: 500 }
    );
  }
}
