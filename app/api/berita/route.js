import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const preferredRegion = ['sin1'];
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET(request) {
  try {
    const { data, error } = await supabase
      .from('tb_berita')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, message: error.message, data: [] }, { status: 200 });
    }

    const mapped = (data || []).map((item) => ({
      id: item.id,
      judul: item.judul,
      kategori: item.kategori || 'Penting',
      targetAudience: item.target_audience || item.targetAudience || 'Semua',
      ringkasan: item.ringkasan || '',
      konten: item.konten || '',
      gambar_url: item.gambar_url || item.imageUrl || '',
      penulis: item.penulis || 'SMK YPK MEDAN',
      tanggal: item.tanggal || '',
      badgeColor: item.badge_color || item.badgeColor || '#2563eb',
      sendNotification: item.send_notification ?? true,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));

    return NextResponse.json({ success: true, data: mapped });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message, data: [] }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body || !body.judul) {
      return NextResponse.json({ success: false, message: 'Judul berita wajib diisi' }, { status: 400 });
    }

    const payload = {
      id: body.id || `NEWS-${Date.now()}`,
      judul: body.judul.trim(),
      kategori: body.kategori || 'Penting',
      target_audience: body.targetAudience || body.target_audience || 'Semua',
      ringkasan: body.ringkasan || '',
      konten: body.konten || '',
      gambar_url: body.gambar_url || body.imageUrl || '',
      penulis: body.penulis || 'SMK YPK MEDAN',
      tanggal: body.tanggal || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' }),
      badge_color: body.badgeColor || body.badge_color || '#2563eb',
      send_notification: body.sendNotification ?? true,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from('tb_berita').upsert([payload]).select();

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID berita wajib disertakan' }, { status: 400 });
    }

    const { error } = await supabase.from('tb_berita').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Berita berhasil dihapus' });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
