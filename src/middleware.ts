import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Redirect to appropriate dashboard based on role
    if (pathname === '/dashboard') {
      if (token?.role === 'ADMIN') {
        return NextResponse.redirect(new URL('/admin', req.url));
      } else if (token?.role === 'MIDWIFE') {
        return NextResponse.redirect(new URL('/midwife', req.url));
      } else {
        return NextResponse.redirect(new URL('/mother', req.url));
      }
    }

    // Role-based access control
    if (pathname.startsWith('/admin') && token?.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/mother', req.url));
    }

    if (pathname.startsWith('/midwife') && !['MIDWIFE', 'ADMIN'].includes(token?.role as string)) {
      return NextResponse.redirect(new URL('/mother', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;
        
        // Allow public routes
        if (
          pathname === '/' ||
          pathname.startsWith('/login') ||
          pathname.startsWith('/register') ||
          pathname.startsWith('/forgot-password') ||
          pathname.startsWith('/api/auth') ||
          pathname.startsWith('/api/users') // For registration
        ) {
          return true;
        }

        // Require auth for all other routes
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
