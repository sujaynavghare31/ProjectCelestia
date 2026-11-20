"use client";

import { useEffect, useMemo, useState } from "react";
import { UserButton } from "@clerk/nextjs";
import { ArrowRight, CalendarDays, Compass, Heart, Info, MapPin, Orbit, Plus, Search, Sparkles, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  removeCachedSavedProfile,
  updateCachedSavedProfile,
  writeSavedProfilesCache,
  writeSelectedSavedProfileHandoff,
  type SavedChartActionResult,
  type SavedProfile,
} from "@/lib/saved-profiles-cache";
import { matchesSavedProfileQuery } from "@/lib/saved-profile-search";
import SavedChartForm from "./saved-chart-form";

type SortMode = "updated" | "name" | "birth-date";
type SaveNotesAction = (profileId: string, notes: string) => Promise<SavedChartActionResult<SavedProfile>>;
type DeleteProfileAction = (profileId: string) => Promise<SavedChartActionResult<string>>;

const appNavigationItems = [
  { id: "panchang", label: "Panchang", icon: CalendarDays },
  { id: "kundali", label: "Kundali", icon: Compass },
  { id: "numerology", label: "Numerology", icon: Sparkles },
  { id: "jamakkol", label: "Jamakkol", icon: Orbit },
  { id: "match", label: "Match Making", icon: Heart },
  { id: "about", label: "About", icon: Info },
] as const;

function displayName(profile: SavedProfile) {
  return profile.chartName || profile.fullName;
}

function formatBirthDate(dateOfBirth: string) {
  const date = new Date(`${dateOfBirth}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return dateOfBirth;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatBirthTime(timeOfBirth: string) {
  return /^\d{2}:\d{2}$/.test(timeOfBirth) ? `${timeOfBirth}:00` : timeOfBirth;
}

function SavedChartCard({
  profile,
  onOpen,
  onSaveNotes,
  onDelete,
}: {
  profile: SavedProfile;
  onOpen: () => void;
  onSaveNotes: (profileId: string, notes: string) => Promise<string | null>;
  onDelete: (profile: SavedProfile) => Promise<string | null>;
}) {
  const [editingNotes, setEditingNotes] = useState(false);
  const [draftNotes, setDraftNotes] = useState(profile.notes);
  const [savingNotes, setSavingNotes] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const isDirty = draftNotes !== profile.notes;
  const genderLabel = profile.sex === "not-applicable"
    ? "Not specified"
    : profile.sex.charAt(0).toUpperCase() + profile.sex.slice(1);

  useEffect(() => {
    setDraftNotes(profile.notes);
    if (saved) {
      const timeout = window.setTimeout(() => setSaved(false), 2400);
      return () => window.clearTimeout(timeout);
    }
  }, [profile.notes, saved]);

  const saveNotes = async () => {
    setSavingNotes(true);
    setActionError(null);
    try {
      const error = await onSaveNotes(profile.id, draftNotes);
      if (error) {
        setActionError(error);
        return;
      }
      setSaved(true);
    } finally {
      setSavingNotes(false);
    }
  };

  const removeProfile = async () => {
    setDeleting(true);
    setActionError(null);
    const error = await onDelete(profile);
    if (error) {
      setActionError(error);
      setDeleting(false);
      return;
    }
    setDeleting(false);
    setConfirmDelete(false);
  };

  return (
    <article className="grid min-w-0 gap-5 rounded-2xl border border-stone-200 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5">
      <div className="flex min-w-0 items-start gap-3.5">
        <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-full bg-[#FDF2EC] text-[#C05A3A]">
          <Orbit className="size-5" strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <button type="button" onClick={onOpen} className="max-w-full truncate text-left text-base font-semibold text-slate-900 underline-offset-4 hover:text-[#AA4C30] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C05A3A]/40">
              {displayName(profile)}
            </button>
            <span className="shrink-0 rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-medium capitalize text-stone-600">{genderLabel}</span>
          </div>
          <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-xs leading-5 text-stone-600">
            <MapPin aria-hidden="true" className="size-3.5 shrink-0 text-stone-400" />
            <span title={`${profile.latitude.toFixed(4)}, ${profile.longitude.toFixed(4)}`} className="truncate">
              {profile.city?.trim() || `${profile.latitude.toFixed(4)}, ${profile.longitude.toFixed(4)}`}
            </span>
            <span aria-hidden="true">·</span>
            <span>{formatBirthDate(profile.dateOfBirth)}</span>
            <span aria-hidden="true">·</span>
            <time>{formatBirthTime(profile.timeOfBirth)}</time>
          </div>
          <p className={`mt-2 line-clamp-2 text-sm leading-5 ${profile.notes.trim() ? "text-stone-600" : "italic text-stone-500"}`}>
            {profile.notes.trim() || "No notes added yet"}
          </p>
        </div>
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end">
        <button type="button" onClick={onOpen} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#C05A3A] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#AA4C30] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C05A3A]/40 focus-visible:ring-offset-2">
          Open chart <ArrowRight aria-hidden="true" className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            setActionError(null);
            setDraftNotes(profile.notes);
            setEditingNotes((open) => !open);
          }}
          aria-expanded={editingNotes}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-stone-300 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C05A3A]/40"
        >
          {editingNotes ? "Close notes" : "Edit notes"}
        </button>
        {confirmDelete ? (
          <div className="flex h-10 items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-2 text-xs font-medium text-rose-800">
            <span>Remove?</span>
            <button type="button" disabled={deleting} onClick={() => void removeProfile()} className="rounded-md px-2 py-1 font-semibold hover:bg-rose-100 disabled:opacity-60">
              {deleting ? "Removing…" : "Confirm"}
            </button>
            <button type="button" disabled={deleting} onClick={() => setConfirmDelete(false)} className="rounded-md px-2 py-1 hover:bg-rose-100 disabled:opacity-60">
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            aria-label={`Remove ${displayName(profile)}`}
            title="Remove chart"
            className="grid size-10 shrink-0 place-items-center rounded-xl text-stone-500 transition-colors hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40"
          >
            <Trash2 aria-hidden="true" className="size-4" />
          </button>
        )}
      </div>

      {editingNotes && (
        <div className="min-w-0 border-t border-stone-200 pt-4 sm:col-span-2">
          <label htmlFor={`notes-${profile.id}`} className="block text-sm font-medium text-slate-800">Personal notes</label>
          <textarea
            id={`notes-${profile.id}`}
            rows={3}
            maxLength={10000}
            value={draftNotes}
            onChange={(event) => {
              setDraftNotes(event.target.value);
              setSaved(false);
              setActionError(null);
            }}
            placeholder="Add context, observations, or questions…"
            className="mt-2 w-full resize-y rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm leading-6 text-slate-900 outline-none placeholder:text-stone-500 focus:border-[#C05A3A] focus:ring-2 focus:ring-[#C05A3A]/20"
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            {actionError
              ? <p role="alert" className="text-sm text-rose-700">{actionError}</p>
              : <p aria-live="polite" className="text-xs text-stone-500">{saved && !isDirty ? "Saved ✓" : isDirty ? "Unsaved changes" : "Up to date"}</p>}
            <button type="button" onClick={() => void saveNotes()} disabled={savingNotes || !isDirty} className="h-9 rounded-lg border border-stone-300 bg-white px-3 text-sm font-semibold text-slate-700 transition-colors hover:border-[#C05A3A]/50 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C05A3A]/40 disabled:cursor-not-allowed disabled:opacity-50">
              {savingNotes ? "Saving…" : "Save notes"}
            </button>
          </div>
        </div>
      )}
      {actionError && !editingNotes && <p role="alert" className="text-sm text-rose-700 sm:col-span-2">{actionError}</p>}
    </article>
  );
}

export default function SavedChartsLibrary({
  userId,
  initialProfiles,
  createProfileAction,
  saveProfileNotesAction,
  deleteProfileAction,
}: {
  userId: string;
  initialProfiles: SavedProfile[];
  createProfileAction: (formData: FormData) => Promise<SavedChartActionResult<SavedProfile>>;
  saveProfileNotesAction: SaveNotesAction;
  deleteProfileAction: DeleteProfileAction;
}) {
  const router = useRouter();
  const [profiles, setProfiles] = useState(initialProfiles);
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("updated");
  const [addChartOpen, setAddChartOpen] = useState(false);

  useEffect(() => {
    writeSavedProfilesCache(userId, initialProfiles);
  }, [initialProfiles, userId]);

  const visibleProfiles = useMemo(() => {
    const matching = profiles.filter((profile) => matchesSavedProfileQuery(profile, query));
    return matching.sort((first, second) => {
      if (sortMode === "name") return displayName(first).localeCompare(displayName(second));
      if (sortMode === "birth-date") return second.dateOfBirth.localeCompare(first.dateOfBirth);
      return (second.updatedAt ?? second.dateOfBirth).localeCompare(first.updatedAt ?? first.dateOfBirth);
    });
  }, [profiles, query, sortMode]);

  const openChart = (profile: SavedProfile) => {
    writeSavedProfilesCache(userId, profiles);
    writeSelectedSavedProfileHandoff(userId, profile);
    router.push(`/?chartId=${encodeURIComponent(profile.id)}`);
  };

  const saveNotes = async (profileId: string, notes: string) => {
    const previous = profiles.find(({ id }) => id === profileId);
    if (!previous) return "This chart is no longer in your saved library.";
    const optimistic = { ...previous, notes, updatedAt: new Date().toISOString() };
    setProfiles((current) => [optimistic, ...current.filter(({ id }) => id !== profileId)]);
    updateCachedSavedProfile(userId, optimistic);

    try {
      const result = await saveProfileNotesAction(profileId, notes);
      if (!result.ok) throw new Error(result.error);
      setProfiles((current) => [result.value, ...current.filter(({ id }) => id !== profileId)]);
      updateCachedSavedProfile(userId, result.value);
      return null;
    } catch (reason) {
      setProfiles((current) => [previous, ...current.filter(({ id }) => id !== profileId)]);
      updateCachedSavedProfile(userId, previous);
      return reason instanceof Error ? reason.message : "Notes could not be saved. Try again.";
    }
  };

  const deleteProfile = async (profile: SavedProfile) => {
    try {
      const result = await deleteProfileAction(profile.id);
      if (!result.ok) throw new Error(result.error);
      setProfiles((current) => current.filter(({ id }) => id !== profile.id));
      removeCachedSavedProfile(userId, profile.id);
      return null;
    } catch (reason) {
      return reason instanceof Error ? reason.message : "Chart could not be removed. Try again.";
    }
  };

  const addProfile = (profile: SavedProfile) => {
    setProfiles((current) => [profile, ...current.filter(({ id }) => id !== profile.id)]);
    updateCachedSavedProfile(userId, profile);
    setQuery("");
    setAddChartOpen(false);
  };

  return (
    <main className="min-h-screen bg-[#FAF8F5] text-slate-900">
      <header className="border-b border-stone-200 bg-white">
        <div className="flex min-h-16 flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-6 lg:min-h-[60px] lg:flex-nowrap lg:gap-1.5 lg:px-4 lg:py-0">
          <Link href="/" className="flex min-w-0 items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C05A3A]/40" aria-label="Project Celestia workspace">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#C05A3A] text-white">
              <svg viewBox="0 0 36 36" aria-hidden="true" className="size-5">
                <circle cx="18" cy="18" r="6.5" fill="#f59e0b" />
                <path d="M18 3.5v5M18 27.5v5M3.5 18h5M27.5 18h5M7.75 7.75l3.6 3.6M24.65 24.65l3.6 3.6M28.25 7.75l-3.6 3.6M11.35 24.65l-3.6 3.6" stroke="#fbbf24" strokeWidth="2.2" strokeLinecap="round" />
                <circle cx="27.5" cy="9" r="1.5" fill="#22d3ee" />
              </svg>
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-semibold tracking-[0.02em]">Project Celestia</span>
              <span className="hidden text-[10px] tracking-wide text-stone-600 lg:block">YOUR PERSONAL COSMIC COMPASS</span>
            </span>
          </Link>
          <nav aria-label="Main navigation" className="hidden min-w-0 flex-1 items-center justify-center gap-1 lg:flex">
            {appNavigationItems.map(({ id, label, icon: Icon }) => (
              <Link
                key={id}
                href={id === "kundali" ? "/#kundali-charts" : `/?tab=${id}`}
                className="flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-lg px-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C05A3A]/40"
              >
                <Icon aria-hidden="true" className="size-4 shrink-0" />
                {label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-1 lg:ml-0 lg:gap-2">
            <Link href="/" className="inline-flex min-h-10 items-center rounded-lg px-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C05A3A]/40 lg:hidden">
              Workspace
            </Link>
            <Link href="/saved-charts" aria-current="page" className="hidden min-h-11 items-center rounded-lg bg-[#C05A3A]/10 px-2 py-2 text-xs font-semibold text-[#A7472F] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C05A3A]/40 xl:inline-flex">
              Saved charts
            </Link>
            <UserButton />
          </div>
        </div>
        <nav aria-label="Primary navigation" className="grid w-full grid-cols-5 gap-1 border-t border-stone-200/80 bg-white px-2 py-2 lg:hidden">
          {appNavigationItems.slice(0, 5).map(({ id, label, icon: Icon }) => (
            <Link
              key={id}
              href={id === "kundali" ? "/#kundali-charts" : `/?tab=${id}`}
              className="inline-flex min-h-11 min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded-lg px-0.5 text-[10px] font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C05A3A]/40"
            >
              <Icon aria-hidden="true" className="size-3.5 shrink-0" />
              {label === "Match Making" ? "Match" : label}
            </Link>
          ))}
        </nav>
      </header>

      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Saved charts</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-stone-600">Find a chart, keep its notes close, and open it in your workspace.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Link href="/" className="inline-flex min-h-10 items-center rounded-lg px-2.5 text-sm font-medium text-stone-600 underline-offset-4 transition-colors hover:text-slate-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C05A3A]/40">
              ← Back to workspace
            </Link>
            <span className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600">
              {profiles.length} {profiles.length === 1 ? "chart" : "charts"}
            </span>
            <button type="button" onClick={() => setAddChartOpen((open) => !open)} aria-expanded={addChartOpen} aria-controls="add-saved-chart" className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#C05A3A] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#AA4C30] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C05A3A]/40 focus-visible:ring-offset-2">
              {addChartOpen ? <X aria-hidden="true" className="size-4" /> : <Plus aria-hidden="true" className="size-4" />}
              {addChartOpen ? "Close" : "Add chart"}
            </button>
          </div>
        </div>

        {addChartOpen && (
          <section id="add-saved-chart" aria-label="Add a saved chart" className="mt-6 rounded-2xl border border-stone-200 bg-white p-4 sm:p-6">
            <h2 className="text-lg font-semibold">Add a chart</h2>
            <p className="mt-1 text-sm leading-5 text-stone-600">Enter the birth details you use in your chart workspace.</p>
            <SavedChartForm action={createProfileAction} onSaved={addProfile} />
          </section>
        )}

        <section className="mt-8" aria-label="Saved chart library">
          <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_190px]">
            <label className="relative block min-w-0">
              <span className="sr-only">Search saved charts</span>
              <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-stone-500" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name, city, notes, birth date, or time..."
                className="h-11 w-full min-w-0 rounded-xl border border-stone-300 bg-white pl-10 pr-10 text-sm text-slate-900 outline-none placeholder:text-stone-500 focus:border-[#C05A3A] focus:ring-2 focus:ring-[#C05A3A]/20"
              />
              {query && (
                <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C05A3A]/40">
                  <X aria-hidden="true" className="size-4" />
                </button>
              )}
            </label>
            <label className="sr-only" htmlFor="saved-chart-sort">Sort saved charts</label>
            <select id="saved-chart-sort" value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)} className="h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#C05A3A] focus:ring-2 focus:ring-[#C05A3A]/20">
              <option value="updated">Recently updated</option>
              <option value="name">Name A–Z</option>
              <option value="birth-date">Birth date</option>
            </select>
          </div>

          <div className="mt-4 flex min-h-5 items-center justify-between gap-3">
            <p aria-live="polite" className="text-xs text-stone-600">
              {query.trim() ? `Showing ${visibleProfiles.length} of ${profiles.length} charts` : `${profiles.length} ${profiles.length === 1 ? "saved chart" : "saved charts"}`}
            </p>
          </div>

          {profiles.length === 0 ? (
            <div className="mt-3 rounded-2xl border border-dashed border-stone-300 bg-white px-5 py-12 text-center">
              <span aria-hidden="true" className="mx-auto grid size-12 place-items-center rounded-full bg-[#FDF2EC] text-[#C05A3A]">
                <Orbit className="size-5" />
              </span>
              <h2 className="mt-4 text-lg font-semibold">Your chart library is ready</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-600">Add a birth chart to keep its details and personal notes together.</p>
              <button type="button" onClick={() => setAddChartOpen(true)} className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#C05A3A] px-4 text-sm font-semibold text-white hover:bg-[#AA4C30] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C05A3A]/40 focus-visible:ring-offset-2">
                <Plus aria-hidden="true" className="size-4" /> Add chart
              </button>
            </div>
          ) : visibleProfiles.length === 0 ? (
            <div className="mt-3 rounded-2xl border border-stone-200 bg-white px-5 py-12 text-center">
              <h2 className="text-base font-semibold">No charts match that search</h2>
              <p className="mt-2 text-sm text-stone-600">Try another name, place, date, time, or note.</p>
              <button type="button" onClick={() => setQuery("")} className="mt-4 inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-semibold text-[#A7472F] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C05A3A]/40">
                Clear search
              </button>
            </div>
          ) : (
            <div className="mt-3 grid gap-3">
              {visibleProfiles.map((profile) => (
                <SavedChartCard
                  key={profile.id}
                  profile={profile}
                  onOpen={() => openChart(profile)}
                  onSaveNotes={saveNotes}
                  onDelete={deleteProfile}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
