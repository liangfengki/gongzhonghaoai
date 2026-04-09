import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const VALID_CODES = new Set([
  "WTEMG67Z", "B692TUGY", "6PFSHSXN", "2VWEVJKN", "NJTSLQ8Q", "B3CUT5KM",
  "DWG6G7P3", "XVZ93W8N", "WDPT2JKF", "XQJAWADB", "ECCZ53YL", "8KGHW2BB",
  "JSVDJB84", "7699FN5C", "UWWFRZWS", "FPSFEXDB", "QWV78YRG", "WXWZB9Z5",
  "XKB346ML", "UWNB9S83", "7DRSHF8A", "UJDYXEA4", "2ETHHZ56", "B77T34V5",
  "M6PDD7AG", "7V6CN4CU", "FF4NDVSQ", "Q8AXGM4M", "9Q8EFZ82", "J7R75QW9",
  "M8Z3X346", "AS2LV7HL", "GCUHDTDM", "QQ6ET3A2", "MKW962YD", "RRACXZ8X",
  "L5ZM97B7", "QDUZLJW7", "RETJGWCC", "3L4K3W34", "99F4US37", "K34H2SHW",
  "YY63WQ83", "VL4YPWRD", "EZQ8TEVF", "5PN4K7BZ", "68653ZXS", "42HX4HS6",
  "JDFRXMZ7", "67CBU84Z"
]);

function clearAuthCookies(response: NextResponse) {
  response.cookies.delete('auth_code');
  response.cookies.delete('device_id');
  response.cookies.delete('code_usage');
  return response;
}

export function middleware(request: NextRequest) {
  const authCode = request.cookies.get('auth_code')?.value;
  const isValidCode = authCode ? VALID_CODES.has(authCode) : false;

  const isAuthRoute = request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/api/auth');

  if (!isValidCode && !isAuthRoute) {
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return clearAuthCookies(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
    }
    return clearAuthCookies(NextResponse.redirect(new URL('/login', request.url)));
  }

  if (isValidCode && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
