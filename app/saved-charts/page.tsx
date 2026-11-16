import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { ChartSex } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

async function createProfile(formData: FormData) {
  "use server";

  const session = await auth();
  const userId = session?.user?.id;
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

  const session = await auth();
  const userId = session?.user?.id;
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

export default async function SavedChartsPage() {
  const session = await auth();
  const userId = session?.user?.id;
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
            <div className="mt-4 rounded-xl border border-dashed border-border px-5 py-10 text-center">
              <p className="text-sm font-medium">No saved charts yet</p>
              <p className="mt-2 text-sm text-muted-foreground">Open the chart workspace, enter birth details, then choose Save chart.</p>
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
                    <p className="mt-1 text-sm text-muted-foreground">{profile.city || "Coordinates"} · {profile.timezone}</p>
                    <p className="mt-1 font-mono text-xs tabular-nums text-muted-foreground">{profile.latitude.toFixed(4)}, {profile.longitude.toFixed(4)} · {profile.sex === ChartSex.NOT_APPLICABLE ? "Gender not specified" : profile.sex.toLowerCase()}</p>
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
          <form action={createProfile} className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">
              Chart name <span className="font-normal text-muted-foreground">(optional)</span>
              <input name="chartName" maxLength={100} placeholder="Enter Jataka's name" className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/40" />
            </label>
            <label className="text-sm font-medium">
              Person name
              <input name="fullName" required maxLength={160} placeholder="Full name" className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/40" />
            </label>
            <label className="text-sm font-medium">
              Date of birth
              <input name="dob" type="date" required className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/40" />
            </label>
            <label className="text-sm font-medium">
              Time of birth
              <input name="time" type="time" step={1} required className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/40" />
            </label>
            <label className="text-sm font-medium">
              Gender
              <select name="sex" defaultValue="male" className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/40">
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="not-applicable">Not specified</option>
              </select>
            </label>
            <label className="text-sm font-medium">
              Birth city
              <input name="city" required maxLength={160} placeholder="City, country" className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/40" />
            </label>
            <label className="text-sm font-medium">
              Latitude
              <input name="latitude" type="number" step="any" min="-90" max="90" required className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/40" />
            </label>
            <label className="text-sm font-medium">
              Longitude
              <input name="longitude" type="number" step="any" min="-180" max="180" required className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/40" />
            </label>
            <label className="text-sm font-medium sm:col-span-2">
              Timezone
              <input name="timezone" required maxLength={100} placeholder="Asia/Kolkata" className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/40" />
            </label>
            <label className="text-sm font-medium sm:col-span-2">
              Personal notes
              <textarea name="notes" rows={3} maxLength={10000} placeholder="Add context, observations, or questions…" className="mt-2 w-full resize-y rounded-lg border border-border bg-background px-3 py-2.5 text-sm leading-6 outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/40" />
            </label>
            <div className="sm:col-span-2">
              <button type="submit" className="h-10 rounded-lg bg-[#C64F30] px-4 text-sm font-semibold text-white transition hover:bg-[#A94025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C64F30]/40 focus-visible:ring-offset-2">Save chart</button>
            </div>
          </form>
        </details>
      </div>
    </main>
  );
}
