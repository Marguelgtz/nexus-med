import { NextRequest, NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/')) return NextResponse.next();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nexus-path', request.nextUrl.pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
};

