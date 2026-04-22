import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const VERCEL_PREVIEW = /^https:\/\/[a-z0-9-]+\.vercel\.app$/;

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (VERCEL_PREVIEW.test(origin)) return true;
  return false;
}

export function proxy(request: NextRequest) {
  const origin = request.headers.get('origin');
  const allowed = isAllowedOrigin(origin);

  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: allowed
        ? {
            'Access-Control-Allow-Origin': origin!,
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '86400',
            Vary: 'Origin',
          }
        : {},
    });
  }

  const response = NextResponse.next();
  if (allowed) {
    response.headers.set('Access-Control-Allow-Origin', origin!);
    response.headers.set('Vary', 'Origin');
  }
  return response;
}

export const config = {
  matcher: ['/api/public/:path*'],
};
