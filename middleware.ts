import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || '01agent-jwt-secret-key-2024-muka-ai-very-long-random-string-fallback'
);



export async function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  let verifyError = 'none';
  let payload = null;

  if (token) {
    try {
      const { payload: p } = await jwtVerify(token, secret);
      payload = p;
    } catch (e: any) {
      verifyError = e.message || 'verify_failed';
    }
  } else {
    verifyError = 'no_token_cookie';
  }

  const pathname = request.nextUrl.pathname;
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/api/auth');
  const isAdminRoute = pathname.startsWith('/admin') || pathname.startsWith('/api/admin');

  if (!payload && !isAuthRoute) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized', detail: verifyError }, { status: 401 });
    }
    return NextResponse.redirect(new URL(`/login?err=${verifyError}`, request.url));
  }

  if (payload && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (isAdminRoute && (!payload || !(payload as Record<string, unknown>).isAdmin)) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
