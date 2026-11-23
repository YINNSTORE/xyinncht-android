import { NextRequest, NextResponse } from 'next/server';

// Semua halaman kecuali /login butuh cookie sesi admin. Keabsahan token diperiksa oleh API.
export function middleware(req: NextRequest) {
  const has = req.cookies.get('xc_admin');
  if (!has && !req.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  return NextResponse.next();
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
