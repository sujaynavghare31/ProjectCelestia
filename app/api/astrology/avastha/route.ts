import { NextResponse } from "next/server";
import { calculateAvasthaReport } from "@/lib/astrology/avastha/engine";
import { avasthaInputSchema } from "@/lib/astrology/avastha/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = avasthaInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid Avastha calculation input.", details: parsed.error.issues }, { status: 400 });
  }
  try {
    return NextResponse.json(calculateAvasthaReport(parsed.data));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Avastha calculation failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
