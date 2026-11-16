import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter valid account details." }, { status: 400 });
  }

  if (!isRecord(body)) {
    return NextResponse.json({ error: "Enter valid account details." }, { status: 400 });
  }

  const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
    return NextResponse.json({ error: "Username must be 3–32 characters using letters, numbers, dots, underscores, or hyphens." }, { status: 400 });
  }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (password.length < 8 || password.length > 128) {
    return NextResponse.json({ error: "Password must be between 8 and 128 characters." }, { status: 400 });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.create({
      data: { username, email, passwordHash },
      select: { id: true },
    });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "That username or email is already in use. Try signing in instead." }, { status: 409 });
    }
    console.error("[auth/register] Account creation failed", error);
    return NextResponse.json(
      { error: "Account creation is temporarily unavailable. Please try again later." },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
