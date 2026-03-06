import { NextRequest, NextResponse } from 'next/server';

const protectedPrefixes = ['/dashboard', '/settings'];

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isProtected = protectedPrefixes.some((p) => path.startsWith(p));

  if (isProtected) {
    const authToken = req.cookies.get('auth_token')?.value;
    if (authToken !== process.env.AUTH_SECRET) {
      return NextResponse.redirect(new URL('/login', req.nextUrl));
    }
  }

  if (path === '/login') {
    const authToken = req.cookies.get('auth_token')?.value;
    if (authToken === process.env.AUTH_SECRET) {
      return NextResponse.redirect(new URL('/dashboard', req.nextUrl));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
