import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJWT } from '@/lib/jwt';
import type { JWTPayload } from '@/lib/jwt';

export async function middleware(request: NextRequest) {
  console.log("Middleware Debug: Request to", request.nextUrl.pathname);
  const token = request.cookies.get('auth_token')?.value;
  console.log("Middleware Debug: Token found:", token ? "YES (length: " + token.length + ")" : "NO");
  let payload: JWTPayload | null = null;
  if (token) {
    console.log("Middleware Debug: About to verify JWT");
    payload = await verifyJWT(token);
    console.log("Middleware Debug: JWT verification result:", payload ? "SUCCESS" : "FAILED");
  }


  const pathname = request.nextUrl.pathname;
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/api/auth');
  const isAdminRoute = pathname.startsWith('/admin') || pathname.startsWith('/api/admin');

  if (!payload && !isAuthRoute) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (payload && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (isAdminRoute && (!payload || !payload.isAdmin)) {
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
