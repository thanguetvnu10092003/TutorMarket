import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    // console.log('Middleware Path:', pathname);
    // console.log('Token Status:', token ? { isVerified: token.isVerified, hasPassword: token.hasPassword } : 'No Token');

    // Redirect to verify-email if not verified or isVerified is missing
    if (
      token && 
      token.isVerified !== true && 
      pathname !== '/auth/verify-email' &&
      !pathname.startsWith('/api/')
    ) {
      return NextResponse.redirect(new URL('/auth/verify-email', req.url));
    }

    // Redirect to set-password if they haven't set a password yet
    // Only happens AFTER verification now based on user requirement
    if (
      token && 
      token.isVerified === true &&
      token.hasPassword === false && 
      pathname !== '/auth/set-password' &&
      !pathname.startsWith('/api/')
    ) {
      return NextResponse.redirect(new URL('/auth/set-password', req.url));
    }

    // Redirect to choose-role if they haven't chosen a role yet
    // Only happens AFTER verification and password setup
    if (
      token &&
      token.isVerified === true &&
      token.hasPassword === true &&
      token.hasChosenRole === false &&
      pathname !== '/auth/choose-role' &&
      !pathname.startsWith('/api/')
    ) {
      return NextResponse.redirect(new URL('/auth/choose-role', req.url));
    }

    // Redirect tutors to onboarding wizard if not yet completed
    if (
      token &&
      token.isVerified === true &&
      token.hasPassword === true &&
      token.hasChosenRole === true &&
      token.role === 'TUTOR' &&
      token.onboardingCompleted === false &&
      !pathname.startsWith('/onboarding/') &&
      !pathname.startsWith('/api/') &&
      pathname !== '/auth/login'
    ) {
      return NextResponse.redirect(new URL('/onboarding/tutor', req.url));
    }

    // Role-based route protection
    const protectedRoutes = {
      '/dashboard/student': ['STUDENT', 'ADMIN'],
      '/dashboard/tutor': ['TUTOR', 'ADMIN'],
      '/dashboard/admin': ['ADMIN'],
      '/admin': ['ADMIN'],
    };

    for (const [route, allowedRoles] of Object.entries(protectedRoutes)) {
      if (pathname.startsWith(route)) {
        if (!token || !allowedRoles.includes(token.role as string)) {
          return NextResponse.redirect(new URL('/', req.url));
        }
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const { pathname } = req.nextUrl;
        
        // Define public pages that don't require login at all
        const publicPages = [
          '/',
          '/auth/login',
          '/auth/register',
          '/auth/verify-email',
          '/auth/set-password',
          '/auth/choose-role',
          '/tutors',
          '/how-it-works',
          '/become-a-tutor'
        ];

        const isPublicPage = publicPages.some(page => 
          pathname === page || pathname.startsWith(`${page}/`)
        );

        if (isPublicPage) return true;
        
        // Everything else requires a token
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
