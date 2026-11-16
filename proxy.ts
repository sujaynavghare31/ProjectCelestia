import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    const error = new Error("AUTH_SECRET or NEXTAUTH_SECRET must be configured.");
    console.error("[auth/proxy] Missing authentication secret", error);
    throw error;
  }

  let token: Awaited<ReturnType<typeof getToken>>;
  try {
    token = await getToken({ req: request, secret });
  } catch (error) {
    console.error("[auth/proxy] Session token lookup failed", error);
    throw error;
  }

  if (token?.userId) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("callbackUrl", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/saved-charts/:path*", "/settings/:path*"],
};
