import { NextResponse } from "next/server";
import { addDashaHorizon, calculateDashaSystem } from "@/lib/astrology/timing/DashaEngine";
import { calculateNadiSystem } from "@/lib/astrology/timing/NadiEngine";
import type { DashaSystem } from "@/lib/astrology/timing/DashaEngine";
import { timingInputSchema } from "@/lib/astrology/timing/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const SYSTEMS = new Set(["vimshottari", "yogini", "ashtottari", "chara", "kalachakra", "nadi"]);

export async function POST(
  request: Request,
  context: { params: Promise<{ system: string }> },
) {
  const { system } = await context.params;
  if (!SYSTEMS.has(system)) {
    return NextResponse.json({ error: `Unsupported Dasha system "${system}".` }, { status: 404 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = timingInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid Dasha input.", details: parsed.error.issues }, { status: 400 });
  }
  try {
    const input = addDashaHorizon(parsed.data, system === "vimshottari" ? 120 : 100);
    const result = system === "nadi"
      ? await calculateNadiSystem(input)
      : calculateDashaSystem(system as DashaSystem, input);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Dasha calculation failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
