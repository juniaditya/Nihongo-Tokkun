import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login'];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
    || pathname.startsWith('/auth/');
}

export async function updateAuthSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    // Let the page render a descriptive environment error in development.
    return response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
        Object.entries(headers ?? {}).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
      },
    },
  });

  // getClaims validates the JWT signature and is the server-side auth gate.
  const { data, error } = await supabase.auth.getClaims();
  const claims = error ? null : data?.claims;
  const pathname = request.nextUrl.pathname;

  if (!claims && !isPublicPath(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.search = '';
    const next = `${pathname}${request.nextUrl.search}`;
    loginUrl.searchParams.set('next', next);
    return NextResponse.redirect(loginUrl);
  }

  if (claims && pathname === '/login') {
    const next = request.nextUrl.searchParams.get('next');
    const destination = request.nextUrl.clone();
    destination.pathname = next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
    destination.search = '';
    return NextResponse.redirect(destination);
  }

  return response;
}
