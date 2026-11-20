import { NextResponse } from "next/server";
import { metric } from "@vercel/functions";
import { ChartSex } from "../../../lib/generated/prisma/enums";
import { ClerkAccountConflictError, getCurrentDatabaseUser } from "@/lib/clerk-user";
import { prisma } from "@/lib/prisma";

type ProfileMethod = "GET" | "POST" | "DELETE";
type ProfileHandler = () => Promise<NextResponse>;

async function withProfileMetrics(method: ProfileMethod, handler: ProfileHandler) {
  const startedAt = performance.now();
  let outcome: "success" | "rejected" | "error" = "success";

  try {
    const response = await handler();
    if (!response.ok) outcome = response.status >= 500 ? "error" : "rejected";
    return response;
  } catch (error) {
    outcome = "error";
    if (error instanceof ClerkAccountConflictError) {
      outcome = "rejected";
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error(`[profiles] ${method} request failed`, error);
    return NextResponse.json(
      { error: "Saved charts are temporarily unavailable. Please try again." },
      { status: 500 },
    );
  } finally {
    metric("profiles.request", 1, { method, outcome });
    metric("profiles.duration_ms", performance.now() - startedAt, { method });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isUniqueConstraintError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

function serializeProfile(profile: {
  id: string;
  chartName: string | null;
  fullName: string;
  dateOfBirth: Date;
  timeOfBirth: string;
  sex: ChartSex;
  latitude: number;
  longitude: number;
  timezone: string;
  city: string | null;
  notes: string;
}) {
  return {
    id: profile.id,
    chartName: profile.chartName,
    fullName: profile.fullName,
    dateOfBirth: profile.dateOfBirth.toISOString().slice(0, 10),
    timeOfBirth: profile.timeOfBirth,
    sex: profile.sex === ChartSex.MALE ? "male" : profile.sex === ChartSex.FEMALE ? "female" : "not-applicable",
    latitude: profile.latitude,
    longitude: profile.longitude,
    timezone: profile.timezone,
    city: profile.city,
    notes: profile.notes,
  };
}

async function getProfiles() {
  const user = await getCurrentDatabaseUser();
  const userId = user?.id;
  if (!userId) return NextResponse.json({ error: "Sign in to load saved charts." }, { status: 401 });

  const profiles = await prisma.profile.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      chartName: true,
      fullName: true,
      dateOfBirth: true,
      timeOfBirth: true,
      sex: true,
      latitude: true,
      longitude: true,
      timezone: true,
      city: true,
      notes: true,
    },
  });

  return NextResponse.json({ profiles: profiles.map(serializeProfile) });
}

export function GET() {
  return withProfileMetrics("GET", getProfiles);
}

async function deleteProfile(request: Request) {
  const user = await getCurrentDatabaseUser();
  const userId = user?.id;
  if (!userId) return NextResponse.json({ error: "Sign in to remove saved charts." }, { status: 401 });

  const id = new URL(request.url).searchParams.get("id")?.trim() ?? "";
  if (!id || id.length > 100) return NextResponse.json({ error: "This saved chart could not be found." }, { status: 400 });

  const { count } = await prisma.profile.deleteMany({ where: { id, userId } });
  if (count !== 1) return NextResponse.json({ error: "This saved chart could not be found in your account." }, { status: 404 });

  return NextResponse.json({ id });
}

export function DELETE(request: Request) {
  return withProfileMetrics("DELETE", () => deleteProfile(request));
}

async function saveProfile(request: Request) {
  const user = await getCurrentDatabaseUser();
  const userId = user?.id;
  if (!userId) return NextResponse.json({ error: "Sign in to save this chart." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter valid chart details." }, { status: 400 });
  }
  if (!isRecord(body)) return NextResponse.json({ error: "Enter valid chart details." }, { status: 400 });

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const date = typeof body.date === "string" ? body.date : "";
  const time = typeof body.time === "string" ? body.time : "";
  const city = typeof body.city === "string" ? body.city.trim() : "";
  const timezone = typeof body.timezone === "string" ? body.timezone.trim() : "";
  const notes = typeof body.notes === "string" ? body.notes : "";
  const sex = body.sex;
  const latitude = body.lat;
  const longitude = body.lng;
  const id = typeof body.id === "string" ? body.id : "";
  const dateOfBirth = new Date(`${date}T00:00:00.000Z`);

  if (name.length > 100) return NextResponse.json({ error: "Chart name must be 100 characters or fewer." }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(dateOfBirth.getTime()) || dateOfBirth.toISOString().slice(0, 10) !== date) {
    return NextResponse.json({ error: "Enter a valid birth date." }, { status: 400 });
  }
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(time)) {
    return NextResponse.json({ error: "Enter a valid birth time." }, { status: 400 });
  }
  if (!Number.isFinite(latitude) || Number(latitude) < -90 || Number(latitude) > 90) {
    return NextResponse.json({ error: "Latitude must be between -90 and 90." }, { status: 400 });
  }
  if (!Number.isFinite(longitude) || Number(longitude) < -180 || Number(longitude) > 180) {
    return NextResponse.json({ error: "Longitude must be between -180 and 180." }, { status: 400 });
  }
  if (city.length > 160 || !timezone || timezone.length > 100) {
    return NextResponse.json({ error: "Enter a valid city and timezone." }, { status: 400 });
  }
  if (notes.length > 10000) return NextResponse.json({ error: "Notes must be 10,000 characters or fewer." }, { status: 400 });
  if (sex !== "male" && sex !== "female" && sex !== "not-applicable") {
    return NextResponse.json({ error: "Choose a valid gender option." }, { status: 400 });
  }
  if (id.length > 100) return NextResponse.json({ error: "This saved chart could not be found." }, { status: 400 });

  const profileData = {
    chartName: name || null,
    fullName: name || city || "Untitled Jataka",
    dateOfBirth,
    timeOfBirth: time,
    sex: sex === "male" ? ChartSex.MALE : sex === "female" ? ChartSex.FEMALE : ChartSex.NOT_APPLICABLE,
    latitude: Number(latitude),
    longitude: Number(longitude),
    timezone,
    city: city || null,
    notes,
  };

  let profileId = id;
  try {
    if (id) {
      const { count } = await prisma.profile.updateMany({
        where: { id, userId },
        data: profileData,
      });
      if (count !== 1) {
        return NextResponse.json({ error: "This saved chart could not be found in your account." }, { status: 404 });
      }
    } else {
      const created = await prisma.profile.create({ data: { ...profileData, userId }, select: { id: true } });
      profileId = created.id;
    }
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json({ error: "A chart with this name already exists. Choose a different chart name." }, { status: 409 });
    }
    throw error;
  }

  const saved = await prisma.profile.findFirst({
    where: { id: profileId, userId },
    select: {
      id: true,
      chartName: true,
      fullName: true,
      dateOfBirth: true,
      timeOfBirth: true,
      sex: true,
      latitude: true,
      longitude: true,
      timezone: true,
      city: true,
      notes: true,
    },
  });
  if (!saved) return NextResponse.json({ error: "Chart save could not be confirmed." }, { status: 500 });

  return NextResponse.json({ profile: serializeProfile(saved) }, { status: id ? 200 : 201 });
}

export function POST(request: Request) {
  return withProfileMetrics("POST", () => saveProfile(request));
}
