import createIntlMiddleware from 'next-intl/middleware';
import type { NextRequest } from 'next/server';
import { routing } from '@/i18n/routing';
import { updateAdminSession } from '@/lib/supabase/middleware';

const intlMiddleware = createIntlMiddleware(routing);

export async function middleware(request: NextRequest) {
  // Admin area: French only, outside i18n routing, protected by Supabase Auth
  if (request.nextUrl.pathname.startsWith('/admin')) {
    return updateAdminSession(request);
  }
  return intlMiddleware(request);
}

export const config = {
  // Everything except API routes, Next internals and static files
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
