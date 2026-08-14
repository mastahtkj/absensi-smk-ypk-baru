import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { username, password } = await request.json();

    const { data: guru, error } = await supabase
      .from('guru')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .single();

    if (error || !guru) {
      return NextResponse.json({ success: false, message: 'Username atau password salah' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: guru.id,
        nama: guru.nama,
        username: guru.username,
        role: guru.role || 'guru'
      }
    });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
