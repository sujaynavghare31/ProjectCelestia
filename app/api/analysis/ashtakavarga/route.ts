import { NextResponse } from "next/server";
import { calculateAshtakavarga } from "../../../../lib/astrology/ashtakavarga";

export const dynamic = "force-dynamic";

interface SignPosition {
  name: string;
  sign: number;
}

function isSignPosition(value: unknown): value is SignPosition {
  if (!value || typeof value !== "object") return false;
  const position = value as Record<string, unknown>;
  return typeof position.name === "string"
    && position.name.length > 0
    && position.name.length <= 40
    && typeof position.sign === "number"
    && Number.isInteger(position.sign)
    && position.sign >= 0
    && position.sign <= 11;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "A chart is required." }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  if (!Array.isArray(input.planets) || input.planets.length > 32 || !input.planets.every(isSignPosition) || !isSignPosition(input.ascendant)) {
    return NextResponse.json({ error: "Chart positions must include valid planet and ascendant signs." }, { status: 400 });
  }

  return NextResponse.json(calculateAshtakavarga(input.planets, input.ascendant));
}
