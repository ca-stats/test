import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { pin } = await req.json();

  if (pin !== process.env.AUTH_PIN) {
    return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });

  response.cookies.set('auth_token', process.env.AUTH_SECRET!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8, // 8 hours
    path: '/',
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('auth_token');
  return response;
}
