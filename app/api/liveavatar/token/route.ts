import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.LIVEAVATAR_API_KEY;
    const defaultAvatarId = process.env.LIVEAVATAR_AVATAR_ID || '3fb34e60-2665-4123-98f0-e2054ff243f1';

    if (!apiKey) {
      return NextResponse.json(
        { error: 'LIVEAVATAR_API_KEY is missing in Vercel Environment Variables.' },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const avatarId = body.avatarId || defaultAvatarId;

    const res = await fetch('https://api.heygen.com/v1/streaming.create_token', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        avatar_id: avatarId,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: `HeyGen API Token Error: ${errText}` },
        { status: res.status }
      );
    }

    const responseData = await res.json();
    const sessionToken = responseData.data?.token || responseData.token || responseData.data?.session_token;

    if (!sessionToken) {
      return NextResponse.json(
        { error: 'No token received from HeyGen API.' },
        { status: 502 }
      );
    }

    return NextResponse.json({ sessionToken });
  } catch (error: any) {
    console.error('LiveAvatar Token Proxy Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error while generating avatar token.' },
      { status: 500 }
    );
  }
}
