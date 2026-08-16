import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const body = await req.json();
    const { user_code, secret, device_id, phone, message } = body;

    const res = await fetch('https://api.kirimi.id/v1/send-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_code,
        secret,
        device_id,
        phone,
        message,
      }),
    });

    const result = await res.json();
    return NextResponse.json(result, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
