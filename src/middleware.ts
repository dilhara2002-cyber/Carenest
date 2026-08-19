import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Public paths that don't require authentication
const publicPaths = ['/', '/login', '/register', '/forgot-password'];

function isPublicPath(pathname: string): boolean {
  return publicPaths.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );
}

export default async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Never run middleware on API routes or static assets
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Allow public routes without any token processing
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Get JWT token directly (lightweight, no withAuth wrapper)
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // No token = not authenticated → redirect to login
  if (!token) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect /dashboard to role-specific dashboard
  if (pathname === '/dashboard') {
    if (token.role === 'ADMIN') {
      return NextResponse.redirect(new URL('/admin', req.url));
    } else if (token.role === 'MIDWIFE') {
      return NextResponse.redirect(new URL('/midwife', req.url));
    } else {
      return NextResponse.redirect(new URL('/mother', req.url));
    }
  }

  // Role-based access control
  if (pathname.startsWith('/admin') && token.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/mother', req.url));
  }

  if (pathname.startsWith('/midwife') && !['MIDWIFE', 'ADMIN'].includes(token.role as string)) {
    return NextResponse.redirect(new URL('/mother', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - api routes
     * - Next.js internals
     * - static files
     */
    '/((?!api|_next/static|_next/image|favicon.ico|icon.png|robots.txt|sitemap.xml).*)',
  ],
};
