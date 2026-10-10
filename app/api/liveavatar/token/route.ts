import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.LIVEAVATAR_API_KEY;
    const defaultAvatarId = process.env.LIVEAVATAR_AVATAR_ID || '3fb34e60-2665-4123-98f0-e2054ff243f1';

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Server Error: LIVEAVATAR_API_KEY is not configured in Vercel settings.', code: 'MISSING_API_KEY' },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const avatarId = body.avatarId || defaultAvatarId;

    const res = await fetch('https://api.liveavatar.com/v1/sessions/token', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mode: 'LITE',
        avatar_id: avatarId,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: `LiveAvatar API Error: ${errText}`, code: 'HEYGEN_API_ERROR' },
        { status: res.status }
      );
    }

    const responseData = await res.json();
    const sessionToken =
      responseData.data?.session_token ||
      responseData.data?.sessionToken ||
      responseData.session_token ||
      responseData.sessionToken;

    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Failed to retrieve session_token from LiveAvatar API response.', code: 'INVALID_TOKEN_RESPONSE' },
        { status: 502 }
      );
    }

    return NextResponse.json({ sessionToken });
  } catch (error: any) {
    console.error('LiveAvatar Token Proxy Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error while generating avatar token.', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
