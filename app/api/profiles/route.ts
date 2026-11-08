import { NextResponse } from "next/server";
import { getAuthenticatedClerkUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SaveChartInput {
  chartName: string;
  fullName: string;
  date: string;
  time: string;
  lat: number;
  lng: number;
  timezone: string;
  city: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function validateSaveInput(value: unknown): SaveChartInput {
  if (!isRecord(value)) throw new Error("Request body must be a JSON object.");
  const { chartName, fullName, date, time, lat, lng, timezone, city } = value;
  if (typeof chartName !== "string" || !chartName.trim() || chartName.trim().length > 100) throw new Error("Chart Name is required and must be 100 characters or fewer.");
  if (typeof fullName !== "string" || !fullName.trim() || fullName.trim().length > 120) throw new Error("Full name is required and must be 120 characters or fewer.");
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Birth date must use YYYY-MM-DD.");
  const [year, month, day] = date.split("-").map(Number);
  const parsedDate = new Date(Date.UTC(year, month - 1, day));
  if (parsedDate.getUTCFullYear() !== year || parsedDate.getUTCMonth() !== month - 1 || parsedDate.getUTCDate() !== day) throw new Error("Birth date is not a valid calendar date.");
  if (typeof time !== "string" || !/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(time)) throw new Error("Birth time must use HH:MM:SS.");
  if (typeof lat !== "number" || !Number.isFinite(lat) || lat < -90 || lat > 90) throw new Error("Latitude must be from -90 to 90.");
  if (typeof lng !== "number" || !Number.isFinite(lng) || lng < -180 || lng > 180) throw new Error("Longitude must be from -180 to 180.");
  if (typeof timezone !== "string" || timezone.length > 64 || !timezone.trim()) throw new Error("Birth place time zone is required.");
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone.trim() });
  } catch {
    throw new Error("Birth place time zone must be a valid IANA time zone.");
  }
  if (typeof city !== "string" || city.length > 200) throw new Error("City must be 200 characters or fewer.");
  return { chartName: chartName.trim(), fullName: fullName.trim(), date, time, lat, lng, timezone: timezone.trim(), city: city.trim() };
}

async function ensureUser(clerkId: string, email: string) {
  return prisma.user.upsert({
    where: { clerkId },
    update: { email },
    create: { clerkId, email },
  });
}

export async function GET() {
  try {
    const identity = await getAuthenticatedClerkUser();
    if (!identity) return NextResponse.json({ error: "Sign in to view saved charts." }, { status: 401 });

    const profiles = await prisma.profile.findMany({
      ...(identity.isSuperAdmin ? {} : { where: { user: { clerkId: identity.clerkId } } }),
      orderBy: [{ chartName: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        chartName: true,
        fullName: true,
        dateOfBirth: true,
        timeOfBirth: true,
        latitude: true,
        longitude: true,
        timezone: true,
        city: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ profiles });
  } catch (error) {
    console.error("[profiles] Failed to load saved charts", error);
    return NextResponse.json({ error: "Saved charts could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let input: SaveChartInput;
  try {
    input = validateSaveInput(await request.json());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request body must be valid JSON.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const identity = await getAuthenticatedClerkUser();
    if (!identity) return NextResponse.json({ error: "Sign in to save a chart." }, { status: 401 });
    const email = identity.user.primaryEmailAddress?.emailAddress;
    if (!email) return NextResponse.json({ error: "Your account needs a verified email before saving charts." }, { status: 400 });
    const user = await ensureUser(identity.clerkId, email);

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const profile = await prisma.$transaction(async (transaction) => {
          const names = await transaction.profile.findMany({
            where: { userId: user.id, chartName: { startsWith: input.chartName } },
            select: { chartName: true },
          });
          const used = new Set(names.flatMap(({ chartName }) => chartName ? [chartName] : []));
          let chartName = input.chartName;
          for (let sequence = 1; used.has(chartName); sequence += 1) chartName = `${input.chartName} - ${sequence}`;
          return transaction.profile.create({
            data: {
              userId: user.id,
              chartName,
              fullName: input.fullName,
              dateOfBirth: new Date(`${input.date}T00:00:00.000Z`),
              timeOfBirth: input.time,
              latitude: input.lat,
              longitude: input.lng,
              timezone: input.timezone,
              city: input.city,
            },
            select: {
              id: true,
              chartName: true,
              fullName: true,
              dateOfBirth: true,
              timeOfBirth: true,
              latitude: true,
              longitude: true,
              timezone: true,
              city: true,
              createdAt: true,
            },
          });
        }, { isolationLevel: "Serializable" });
        return NextResponse.json({ profile }, { status: 201 });
      } catch (error) {
        const code = isRecord(error) && typeof error.code === "string" ? error.code : "";
        if ((code === "P2002" || code === "P2034") && attempt < 2) continue;
        throw error;
      }
    }
    return NextResponse.json({ error: "Could not reserve a unique chart name. Please try again." }, { status: 409 });
  } catch (error) {
    console.error("[profiles] Failed to save chart", error);
    return NextResponse.json({ error: "Chart could not be saved." }, { status: 500 });
  }
}
