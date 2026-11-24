import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
  matcher: '/item/:path*',
};

export function middleware(request: NextRequest) {
  const url = new URL(request.url);
  const product = url.searchParams.get('product');

  if (product && !url.pathname.startsWith('/api/')) {
    const rewrittenUrl = new URL(`/api/item?product=${encodeURIComponent(product)}`, url.origin);
    return NextResponse.rewrite(rewrittenUrl);
  }

  return NextResponse.next();
}