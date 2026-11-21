import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { metric } from "@vercel/functions";
import { ChartSex } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import type { SavedChartActionResult, SavedProfile } from "@/lib/saved-profiles-cache";
import SavedChartsLibrary from "./saved-charts-library";

export const preferredRegion = ["bom1"];

const profileSelect = {
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
  updatedAt: true,
} as const;

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
  updatedAt: Date;
}): SavedProfile {
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
    updatedAt: profile.updatedAt.toISOString(),
  };
}

async function getAuthenticatedDatabaseUserId() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return null;
  const user = await prisma.user.findUnique({
    where: { clerkId: clerkUserId },
    select: { id: true },
  });
  return user?.id ?? null;
}

async function withSavedChartMetric<T extends { ok: boolean }>(
  action: "create" | "edit_notes" | "delete",
  operation: () => Promise<T>,
) {
  const startedAt = performance.now();
  let outcome = "success";
  try {
    const result = await operation();
    if (!result.ok) outcome = "rejected";
    return result;
  } catch (error) {
    outcome = "error";
    throw error;
  } finally {
    metric("saved_charts.mutation", 1, { action, outcome });
    metric("saved_charts.mutation_duration_ms", performance.now() - startedAt, { action, outcome });
  }
}

async function createProfile(formData: FormData): Promise<SavedChartActionResult<SavedProfile>> {
  "use server";

  return withSavedChartMetric("create", async () => {
    const userId = await getAuthenticatedDatabaseUserId();
    if (!userId) return { ok: false, error: "Sign in again before adding a chart." };

    const chartName = String(formData.get("chartName") ?? "").trim();
    const fullName = String(formData.get("fullName") ?? "").trim();
    const dobInput = String(formData.get("dob") ?? "");
    const timeOfBirth = String(formData.get("time") ?? "");
    const city = String(formData.get("city") ?? "").trim();
    const timezone = String(formData.get("timezone") ?? "").trim();
    const latitude = Number(formData.get("latitude"));
    const longitude = Number(formData.get("longitude"));
    const sex = String(formData.get("sex") ?? "");
    const notes = String(formData.get("notes") ?? "");
    const dateOfBirth = new Date(`${dobInput}T00:00:00.000Z`);

    if (chartName.length > 100) return { ok: false, error: "Chart name must be 100 characters or fewer." };
    if (!fullName || fullName.length > 160) return { ok: false, error: "Enter a name with no more than 160 characters." };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dobInput) || Number.isNaN(dateOfBirth.getTime()) || dateOfBirth.toISOString().slice(0, 10) !== dobInput) {
      return { ok: false, error: "Enter a valid date of birth." };
    }
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(timeOfBirth)) return { ok: false, error: "Enter a valid birth time." };
    if (!city || city.length > 160) return { ok: false, error: "Enter a city with no more than 160 characters." };
    if (!timezone || timezone.length > 100) return { ok: false, error: "Enter a valid timezone." };
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) return { ok: false, error: "Latitude must be between -90 and 90." };
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) return { ok: false, error: "Longitude must be between -180 and 180." };
    if (sex !== "male" && sex !== "female" && sex !== "not-applicable") return { ok: false, error: "Choose a valid gender." };
    if (notes.length > 10000) return { ok: false, error: "Notes must be 10,000 characters or fewer." };

    const profile = await prisma.profile.create({
      data: {
        userId,
        chartName: chartName || null,
        fullName,
        dateOfBirth,
        timeOfBirth,
        sex: sex === "male" ? ChartSex.MALE : sex === "female" ? ChartSex.FEMALE : ChartSex.NOT_APPLICABLE,
        latitude,
        longitude,
        timezone,
        city,
        notes,
      },
      select: profileSelect,
    });
    revalidatePath("/saved-charts");
    return { ok: true, value: serializeProfile(profile) };
  });
}

async function saveProfileNotes(profileId: string, notes: string): Promise<SavedChartActionResult<SavedProfile>> {
  "use server";

  return withSavedChartMetric("edit_notes", async () => {
    const userId = await getAuthenticatedDatabaseUserId();
    if (!userId) return { ok: false, error: "Sign in again before editing chart notes." };
    if (!profileId || profileId.length > 100) return { ok: false, error: "This saved chart could not be found." };
    if (notes.length > 10000) return { ok: false, error: "Notes must be 10,000 characters or fewer." };

    const { count } = await prisma.profile.updateMany({
      where: { id: profileId, userId },
      data: { notes },
    });
    if (count !== 1) return { ok: false, error: "This chart could not be found in your saved profiles." };

    const profile = await prisma.profile.findFirst({
      where: { id: profileId, userId },
      select: profileSelect,
    });
    if (!profile) return { ok: false, error: "The updated chart could not be confirmed." };

    revalidatePath("/saved-charts");
    return { ok: true, value: serializeProfile(profile) };
  });
}

async function deleteProfile(profileId: string): Promise<SavedChartActionResult<string>> {
  "use server";

  return withSavedChartMetric("delete", async () => {
    const userId = await getAuthenticatedDatabaseUserId();
    if (!userId) return { ok: false, error: "Sign in again before removing a chart." };
    if (!profileId || profileId.length > 100) return { ok: false, error: "This saved chart could not be found." };

    const { count } = await prisma.profile.deleteMany({ where: { id: profileId, userId } });
    if (count !== 1) return { ok: false, error: "This chart could not be found in your saved profiles." };

    revalidatePath("/saved-charts");
    return { ok: true, value: profileId };
  });
}

export default async function SavedChartsPage() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) redirect("/login?callbackUrl=/saved-charts");

  const savedCharts = await prisma.user.findUnique({
    where: { clerkId: clerkUserId },
    select: {
      profiles: {
        orderBy: { updatedAt: "desc" },
        take: 200,
        select: profileSelect,
      },
    },
  });
  const profiles = savedCharts?.profiles.map(serializeProfile) ?? [];

  return (
    <SavedChartsLibrary
      userId={clerkUserId}
      initialProfiles={profiles}
      createProfileAction={createProfile}
      saveProfileNotesAction={saveProfileNotes}
      deleteProfileAction={deleteProfile}
    />
  );
}
