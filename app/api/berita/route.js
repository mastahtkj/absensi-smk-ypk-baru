import { NextResponse } from 'next/server';
import { supabaseServer as supabase } from '@/app/lib/supabaseServer';
import { verifySessionToken } from '@/app/lib/cryptoAuth';

export const runtime = 'nodejs';
export const preferredRegion = ['sin1'];
export const dynamic = 'force-dynamic';

function getSessionUser(request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    let token = '';
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    }
    if (!token) {
      const cookieHeader = request.headers.get('cookie') || '';
      const match = cookieHeader.match(/smk_ypk_auth_token=([^;]+)/);
      if (match) token = decodeURIComponent(match[1]);
    }
    if (!token) return null;
    return verifySessionToken(token);
  } catch (_) {
    return null;
  }
}

export async function GET(request) {
  try {
    const { data, error } = await supabase
      .from('tb_berita')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      const mapped = data.map((item) => ({
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
    }

    // Fallback: ambil dari app_settings jika tb_berita kosong atau terkendala RLS
    try {
      const { data: cfg } = await supabase
        .from('app_settings')
        .select('school_news')
        .eq('id', 'school_config')
        .maybeSingle();

      if (cfg?.school_news && Array.isArray(cfg.school_news) && cfg.school_news.length > 0) {
        return NextResponse.json({ success: true, data: cfg.school_news });
      }
    } catch (e) {}

    return NextResponse.json({ success: true, data: [] });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message, data: [] }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const sessionUser = getSessionUser(request);
    if (sessionUser && (sessionUser.role === 'Siswa' || sessionUser.isStudent || String(sessionUser.id).startsWith('SISWA-')) && sessionUser.role !== 'Admin' && sessionUser.role !== 'siswa_admin') {
      return NextResponse.json({ success: false, message: 'Akses ditolak: Hanya Guru atau Admin yang berhak mempublikasikan berita' }, { status: 403 });
    }

    const body = await request.json();
    if (!body || !body.judul) {
      return NextResponse.json({ success: false, message: 'Judul berita wajib diisi' }, { status: 400 });
    }

    const payload = {
      id: body.id || `NEWS-${Date.now()}`,
      judul: body.judul.trim(),
      kategori: body.kategori || 'Penting',
      target_audience: body.targetAudience || body.target_audience || 'Semua',
      targetAudience: body.targetAudience || body.target_audience || 'Semua',
      ringkasan: body.ringkasan || '',
      konten: body.konten || '',
      gambar_url: body.gambar_url || body.imageUrl || '',
      penulis: body.penulis || 'SMK YPK MEDAN',
      tanggal: body.tanggal || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' }),
      badge_color: body.badgeColor || body.badge_color || '#2563eb',
      badgeColor: body.badgeColor || body.badge_color || '#2563eb',
      send_notification: body.sendNotification ?? true,
      sendNotification: body.sendNotification ?? true,
      updated_at: new Date().toISOString(),
    };

    // 1. Simpan ke app_settings (school_config.school_news) sebagai backup utama
    try {
      const { data: cfg } = await supabase
        .from('app_settings')
        .select('school_news')
        .eq('id', 'school_config')
        .maybeSingle();

      const currentList = Array.isArray(cfg?.school_news) ? cfg.school_news : [];
      const updatedList = [payload, ...currentList.filter((n) => n.id !== payload.id)];
      await supabase.from('app_settings').upsert({
        id: 'school_config',
        school_news: updatedList,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
    } catch (err) {
      console.warn('API /api/berita: app_settings upsert error:', err);
    }

    // 2. Simpan juga ke tb_berita jika tabel tersedia
    try {
      await supabase.from('tb_berita').upsert([payload]);
    } catch (err) {
      console.warn('API /api/berita: tb_berita upsert error:', err);
    }

    return NextResponse.json({ success: true, data: payload });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const sessionUser = getSessionUser(request);
    if (sessionUser && (sessionUser.role === 'Siswa' || sessionUser.isStudent || String(sessionUser.id).startsWith('SISWA-')) && sessionUser.role !== 'Admin' && sessionUser.role !== 'siswa_admin') {
      return NextResponse.json({ success: false, message: 'Akses ditolak: Hanya Guru atau Admin yang berhak menghapus berita' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID berita wajib disertakan' }, { status: 400 });
    }

    // 1. Hapus dari app_settings (school_news)
    try {
      const { data: cfg } = await supabase
        .from('app_settings')
        .select('school_news')
        .eq('id', 'school_config')
        .maybeSingle();

      if (cfg?.school_news && Array.isArray(cfg.school_news)) {
        const updatedList = cfg.school_news.filter((n) => n.id !== id);
        await supabase.from('app_settings').upsert({
          id: 'school_config',
          school_news: updatedList,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
      }
    } catch (e) {}

    // 2. Hapus dari tb_berita
    try {
      await supabase.from('tb_berita').delete().eq('id', id);
    } catch (e) {}

    return NextResponse.json({ success: true, message: 'Berita berhasil dihapus' });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
