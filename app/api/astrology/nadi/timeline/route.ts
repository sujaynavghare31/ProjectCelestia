import { NextResponse } from "next/server";
import { calculateNadiTimeline } from "@/lib/astrology/timing/timeline";
import { calculateSwissTransit } from "@/lib/astrology/timing/swiss-transit-provider";
import { timingInputSchema } from "@/lib/astrology/timing/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = timingInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid Nadi timeline input.", details: parsed.error.issues }, { status: 400 });
  }
  try {
    const timeline = await calculateNadiTimeline(parsed.data, calculateSwissTransit);
    return NextResponse.json({ timeline });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nadi timeline calculation failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
