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

    // Call the dedicated LiveAvatar token endpoint on api.liveavatar.com
    const res = await fetch('https://api.liveavatar.com/v1/sessions/token', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        avatar_id: avatarId,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: `LiveAvatar API Error (${res.status}): ${errText}` },
        { status: res.status }
      );
    }

    const responseData = await res.json();
    const sessionToken =
      responseData.data?.session_token ||
      responseData.data?.token ||
      responseData.session_token ||
      responseData.token;

    if (!sessionToken) {
      return NextResponse.json(
        { error: 'No session token returned by LiveAvatar API.' },
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
