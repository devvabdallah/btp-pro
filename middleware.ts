import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Whitelist: routes publiques qui ne doivent jamais être bloquées
  if (
    pathname === '/stripe/success' ||
    pathname.startsWith('/api/stripe/finalize-checkout')
  ) {
    return NextResponse.next();
  }

  // Ne protéger QUE /dashboard
  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/stripe/:path*", "/api/stripe/:path*"],
};
