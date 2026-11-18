import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, rawId, role, lat, lng } = body;

    if (lat === undefined || lng === undefined) {
      return NextResponse.json({ success: false, message: 'Koordinat lat/lng tidak valid.' }, { status: 400 });
    }

    const cleanRawId = parseInt(String(rawId || userId || '').replace(/\D/g, ''), 10);
    const isGuru = Boolean(
      role === 'guru' ||
      role === 'admin' ||
      role === 'master' ||
      String(userId || '').toUpperCase().startsWith('GURU-')
    );

    const table = isGuru ? 'tb_guru' : 'tb_siswa';
    const idCol = isGuru ? 'id_guru' : 'id_siswa';

    if (!cleanRawId) {
      return NextResponse.json({ success: false, message: 'ID pengguna tidak valid.' }, { status: 400 });
    }

    // Ambil biodata saat ini
    const { data: userRec } = await supabaseServer
      .from(table)
      .select('biodata')
      .eq(idCol, cleanRawId)
      .maybeSingle();

    const currentBio = userRec?.biodata || {};
    const updatedBio = {
      ...currentBio,
      last_coords: {
        lat: Number(lat),
        lng: Number(lng),
        updatedAt: new Date().toISOString(),
        timestamp: Date.now(),
      },
    };

    const { error } = await supabaseServer
      .from(table)
      .update({ biodata: updatedBio })
      .eq(idCol, cleanRawId);

    if (error) {
      console.warn('Gagal update last_coords:', error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, last_coords: updatedBio.last_coords });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
