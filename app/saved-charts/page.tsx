import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChartSex } from "@/lib/generated/prisma/enums";
import { getCurrentDatabaseUser } from "@/lib/clerk-user";
import { prisma } from "@/lib/prisma";
import RemoveChartButton from "./remove-chart-button";
import SavedChartForm from "./saved-chart-form";

async function createProfile(formData: FormData) {
  "use server";

  const user = await getCurrentDatabaseUser();
  const userId = user?.id;
  if (!userId) redirect("/login?callbackUrl=/saved-charts");

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

  if (chartName.length > 100) throw new Error("Chart name must be 100 characters or fewer.");
  if (!fullName || fullName.length > 160) throw new Error("Enter a name with no more than 160 characters.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dobInput) || Number.isNaN(dateOfBirth.getTime()) || dateOfBirth.toISOString().slice(0, 10) !== dobInput) {
    throw new Error("Enter a valid date of birth.");
  }
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(timeOfBirth)) throw new Error("Enter a valid birth time.");
  if (!city || city.length > 160) throw new Error("Enter a city with no more than 160 characters.");
  if (!timezone || timezone.length > 100) throw new Error("Enter a valid timezone.");
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) throw new Error("Latitude must be between -90 and 90.");
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) throw new Error("Longitude must be between -180 and 180.");
  if (sex !== "male" && sex !== "female" && sex !== "not-applicable") throw new Error("Choose a valid gender.");
  if (notes.length > 10000) throw new Error("Notes must be 10,000 characters or fewer.");

  await prisma.profile.create({
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
  });
  revalidatePath("/saved-charts");
}

async function saveProfileNotes(formData: FormData) {
  "use server";

  const user = await getCurrentDatabaseUser();
  const userId = user?.id;
  if (!userId) redirect("/login?callbackUrl=/saved-charts");

  const profileId = String(formData.get("profileId") ?? "");
  const notes = String(formData.get("notes") ?? "");
  if (notes.length > 10000) throw new Error("Notes must be 10,000 characters or fewer.");
  const { count } = await prisma.profile.updateMany({
    where: { id: profileId, userId },
    data: { notes },
  });
  if (count !== 1) throw new Error("This chart could not be found in your saved profiles.");
  revalidatePath("/saved-charts");
}

async function deleteProfile(formData: FormData) {
  "use server";

  const user = await getCurrentDatabaseUser();
  const userId = user?.id;
  if (!userId) redirect("/login?callbackUrl=/saved-charts");

  const profileId = String(formData.get("profileId") ?? "");
  if (!profileId || profileId.length > 100) throw new Error("This saved chart could not be found.");

  const { count } = await prisma.profile.deleteMany({ where: { id: profileId, userId } });
  if (count !== 1) throw new Error("This saved chart could not be found in your account.");
  revalidatePath("/saved-charts");
}

export default async function SavedChartsPage() {
  const user = await getCurrentDatabaseUser();
  const userId = user?.id;
  if (!userId) redirect("/login?callbackUrl=/saved-charts");

  const profiles = await prisma.profile.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link href="/" className="text-sm font-medium text-stone-800 hover:underline dark:text-stone-100">Project Celestia</Link>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Saved charts</h1>
            <p className="mt-2 text-sm text-muted-foreground">Your birth details and notes stay together in one private library.</p>
          </div>
          <div className="flex items-center gap-3">
            <p className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">{profiles.length} {profiles.length === 1 ? "chart" : "charts"}</p>
            <Link href="/#kundali-charts" className="inline-flex h-9 items-center rounded-lg bg-[#C64F30] px-3 text-xs font-semibold text-white transition hover:bg-[#A94025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C64F30]/40">Open chart workspace</Link>
          </div>
        </header>

        <section className="mt-9" aria-labelledby="your-charts-title">
          <h2 id="your-charts-title" className="text-lg font-semibold">Your charts</h2>
          {profiles.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-border bg-card/60 px-5 py-10 text-center sm:py-12">
              <div aria-hidden="true" className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#C64F30]/10 text-xl text-[#C64F30]">✦</div>
              <h3 className="mt-4 text-base font-semibold">You don’t have any saved charts yet</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">Create and save your first birth chart to keep your details together and continue your journey with Jyotishi.</p>
              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <Link href="/#kundali-charts" className="inline-flex h-10 items-center justify-center rounded-lg bg-[#C64F30] px-4 text-sm font-semibold text-white transition hover:bg-[#A94025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C64F30]/40">Create and save your first chart</Link>
                <Link href="/" className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">Go to homepage</Link>
              </div>
            </div>
          ) : (
            <div className="mt-4 divide-y divide-border rounded-2xl border border-border bg-card">
              {profiles.map((profile) => (
                <article key={profile.id} className="grid gap-5 p-5 sm:grid-cols-[minmax(0,1fr)_minmax(280px,0.9fr)] sm:p-6">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold">{profile.chartName || profile.fullName}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{profile.fullName}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {profile.dateOfBirth.toLocaleDateString(undefined, { dateStyle: "long", timeZone: "UTC" })} · {profile.timeOfBirth}
                    </p>
                    <p className="mt-1 font-mono text-xs tabular-nums text-muted-foreground">{profile.latitude.toFixed(4)}, {profile.longitude.toFixed(4)} · {profile.sex === ChartSex.NOT_APPLICABLE ? "Gender not specified" : profile.sex.toLowerCase()}</p>
                    <form action={deleteProfile} className="mt-4">
                      <input type="hidden" name="profileId" value={profile.id} />
                      <RemoveChartButton />
                    </form>
                  </div>
                  <form action={saveProfileNotes} className="min-w-0">
                    <input type="hidden" name="profileId" value={profile.id} />
                    <label className="block text-sm font-medium">
                      Personal notes
                      <textarea name="notes" rows={3} maxLength={10000} defaultValue={profile.notes} placeholder="Add context, observations, or questions…" className="mt-2 w-full resize-y rounded-lg border border-border bg-background px-3 py-2.5 text-sm leading-6 outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/40" />
                    </label>
                    <button type="submit" className="mt-3 h-9 rounded-lg border border-border bg-background px-3 text-sm font-medium transition hover:border-primary/40 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">Save notes</button>
                  </form>
                </article>
              ))}
            </div>
          )}
        </section>

        <details className="mt-10 rounded-2xl border border-border bg-card p-5 sm:p-7">
          <summary className="cursor-pointer text-lg font-semibold">Add a chart here</summary>
          <p className="mt-1 text-sm text-muted-foreground">Enter the same profile details you use in the chart workspace.</p>
          <SavedChartForm action={createProfile} />
        </details>
      </div>
    </main>
  );
}
