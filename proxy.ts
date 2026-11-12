import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const proxy = process.env.CLERK_SECRET_KEY
  ? clerkMiddleware()
  : () => NextResponse.next();

export default proxy;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
