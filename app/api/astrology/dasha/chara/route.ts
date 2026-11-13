import { NextResponse } from "next/server";
import { calculateCharaDasha } from "@/lib/astrology/timing/chara";
import { timingInputSchema } from "@/lib/astrology/timing/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = timingInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid Chara Dasha input.", details: parsed.error.issues }, { status: 400 });
  }
  try {
    return NextResponse.json({ periods: calculateCharaDasha(parsed.data) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Chara Dasha calculation failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
