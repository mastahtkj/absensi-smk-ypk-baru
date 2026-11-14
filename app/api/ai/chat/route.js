import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_BASE_URL = 'https://joinbareng.com/api/ai-proxy-v2/v1';
const DEFAULT_MODEL = 'gpt-5.4-mini';
const MAX_REQUESTS_PER_MINUTE = 8;
const rateBuckets = new Map();

const SYSTEM_PROMPTS = {
  tutor: [
    'Anda adalah Asisten AI SMK YPK Medan yang ramah dan membantu proses belajar.',
    'Jawab dalam bahasa yang dipakai pengguna, utamakan bahasa Indonesia yang jelas, akurat, dan sesuai tingkat SMK.',
    'Jelaskan langkah demi langkah dan akui bila tidak yakin. Jangan mengarang kebijakan atau data resmi sekolah.',
    'Jangan meminta atau mengulang kata sandi, nomor identitas, data kesehatan, atau data pribadi siswa.',
  ].join(' '),
  exam: [
    'Anda adalah guru penyusun soal SMK yang teliti. Hasilkan hanya JSON valid tanpa markdown atau teks tambahan.',
    'Ikuti jumlah, topik, jurusan, tingkat, tingkat kesulitan, dan format yang diminta pengguna.',
    'Pastikan setiap soal pilihan ganda memiliki lima opsi, satu kunci yang benar, dan tidak ada soal duplikat.',
    'Jangan menambahkan data siswa atau data pribadi.',
  ].join(' '),
};

function getClientKey(request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || request.headers.get('x-real-ip') || 'unknown';
}

function isRateLimited(request) {
  const now = Date.now();
  if (rateBuckets.size > 500) {
    for (const [key, bucket] of rateBuckets) {
      if (bucket.resetAt <= now) rateBuckets.delete(key);
    }
  }
  const key = getClientKey(request);
  const current = rateBuckets.get(key);
  if (!current || current.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  current.count += 1;
  return current.count > MAX_REQUESTS_PER_MINUTE;
}

export async function GET() {
  return NextResponse.json({
    configured: Boolean(process.env.JOINBARENG_API_KEY),
    provider: 'JoinBareng',
    model: process.env.JOINBARENG_MODEL || DEFAULT_MODEL,
  });
}

export async function POST(request) {
  const origin = request.headers.get('origin');
  const host = (request.headers.get('x-forwarded-host') || request.headers.get('host') || '').split(',')[0].trim();
  if (origin && host) {
    try {
      if (new URL(origin).host !== host) {
        return NextResponse.json({ error: 'Permintaan lintas situs ditolak.' }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: 'Asal permintaan tidak valid.' }, { status: 403 });
    }
  }

  if (isRateLimited(request)) {
    return NextResponse.json({ error: 'Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.' }, { status: 429 });
  }

  const apiKey = process.env.JOINBARENG_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      error: 'API JoinBareng belum dikonfigurasi. Tambahkan JOINBARENG_API_KEY pada Environment Variables di Vercel lalu deploy ulang.',
    }, { status: 503 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Format permintaan tidak valid.' }, { status: 400 });
  }

  const purpose = body?.purpose === 'exam' ? 'exam' : 'tutor';
  const messages = body?.messages;
  if (!Array.isArray(messages) || messages.length < 1 || messages.length > 12) {
    return NextResponse.json({ error: 'Riwayat percakapan tidak valid.' }, { status: 400 });
  }

  const normalizedMessages = [];
  let totalLength = 0;
  for (const message of messages) {
    if (!message || !['user', 'assistant'].includes(message.role) || typeof message.content !== 'string') {
      return NextResponse.json({ error: 'Isi percakapan tidak valid.' }, { status: 400 });
    }
    const content = message.content.trim();
    if (!content || content.length > 8000) {
      return NextResponse.json({ error: 'Pesan kosong atau terlalu panjang.' }, { status: 400 });
    }
    totalLength += content.length;
    normalizedMessages.push({ role: message.role, content });
  }

  if (totalLength > 20_000 || normalizedMessages.at(-1)?.role !== 'user') {
    return NextResponse.json({ error: 'Ukuran percakapan melewati batas atau pesan terakhir tidak valid.' }, { status: 400 });
  }

  const baseUrl = (process.env.JOINBARENG_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
  let parsedBaseUrl;
  try {
    parsedBaseUrl = new URL(baseUrl);
  } catch {
    return NextResponse.json({ error: 'Alamat API JoinBareng tidak valid.' }, { status: 500 });
  }
  if (parsedBaseUrl.protocol !== 'https:' || parsedBaseUrl.hostname !== 'joinbareng.com') {
    return NextResponse.json({ error: 'Alamat API harus menggunakan domain JoinBareng melalui HTTPS.' }, { status: 500 });
  }

  const model = process.env.JOINBARENG_MODEL || DEFAULT_MODEL;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), purpose === 'exam' ? 90_000 : 45_000);

  try {
    const upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: SYSTEM_PROMPTS[purpose] }, ...normalizedMessages],
        max_completion_tokens: purpose === 'exam' ? 8000 : 1200,
      }),
      signal: controller.signal,
      cache: 'no-store',
    });

    if (!upstream.ok) {
      const status = upstream.status;
      const message = status === 401 || status === 403
        ? 'Kunci API JoinBareng ditolak. Periksa atau ganti kunci pada Environment Variables Vercel.'
        : status === 429
          ? 'Kuota atau batas permintaan API JoinBareng tercapai.'
          : `Layanan AI JoinBareng sedang bermasalah (HTTP ${status}). Coba lagi nanti.`;
      return NextResponse.json({ error: message }, { status: status === 429 ? 429 : 502 });
    }

    const result = await upstream.json();
    const response = result?.choices?.[0]?.message?.content;
    const content = Array.isArray(response)
      ? response.map((part) => part?.text || '').join('')
      : response;
    if (typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ error: 'Layanan AI tidak mengembalikan jawaban.' }, { status: 502 });
    }

    return NextResponse.json({ content: content.trim(), model, usage: result.usage || null });
  } catch (error) {
    const message = error?.name === 'AbortError'
      ? 'Permintaan AI melewati batas waktu. Coba lagi dengan permintaan lebih singkat.'
      : 'Tidak dapat terhubung ke layanan AI JoinBareng saat ini.';
    return NextResponse.json({ error: message }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
