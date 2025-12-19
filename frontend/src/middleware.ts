import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public paths that don't require authentication
const PUBLIC_PATHS = [
  '/login',
  '/share/', // Public share links
  '/api/', // API routes handled by backend
  '/_next/', // Next.js internals
  '/favicon.ico',
  '/favicon.png',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p) || pathname === p)) {
    return NextResponse.next();
  }

  // Firebase Auth uses client-side auth, so we can't check server-side
  // The auth check is done client-side in the AuthProvider
  // This middleware just ensures basic routing works
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|favicon.png|public).*)',
  ],
};
