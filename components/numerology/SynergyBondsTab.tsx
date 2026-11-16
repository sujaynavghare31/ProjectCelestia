"use client";

import { useMemo, useState } from "react";
import { childNameModule, contextFromProfile, partnerModule } from "@/lib/numerology";
import type { Profile } from "@/lib/numerology";
import { DataTable, Field, PanelHeading, splitList, TextAreaField, Verdict } from "@/components/numerology/workbench-shared";

export default function SynergyBondsTab({ profile }: { profile: Profile | null }) {
  const [mode, setMode] = useState<"partner" | "child">("partner");
  const [partnerName, setPartnerName] = useState("");
  const [partnerDob, setPartnerDob] = useState("");
  const [childDob, setChildDob] = useState("");
  const [surname, setSurname] = useState("");
  const [firstNames, setFirstNames] = useState("");
  const context = useMemo(() => profile ? contextFromProfile(profile) : null, [profile]);
  const partner = useMemo(
    () => profile && context && isValidDate(partnerDob) ? partnerModule(context, [{ name: partnerName, dob: partnerDob }]).checks[0] : null,
    [context, partnerDob, partnerName, profile],
  );
  const partnerGuidance = useMemo(() => context ? partnerModule(context, []) : null, [context]);
  const child = useMemo(
    () => isValidDate(childDob) ? childNameModule(surname, childDob, splitList(firstNames)) : null,
    [childDob, firstNames, surname],
  );

  return (
    <div className="space-y-6">
      <PanelHeading title="Synergy & Bonds" description="Explore traditional number comparisons for partners and reflective name ideas for a child." />
      {!profile || !partnerGuidance ? (
        <p className="border-t border-stone-200 py-6 text-sm text-stone-600 dark:border-amber-900/30 dark:text-stone-300">Add a valid name and date of birth above to personalize relationship readings.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-5 border-b border-stone-200 dark:border-amber-900/30" role="group" aria-label="Relationship reading">
            {(["partner", "child"] as const).map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={mode === item}
                onClick={() => setMode(item)}
                className={`border-b-2 px-1 py-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${mode === item ? "border-primary text-accent-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                {item === "partner" ? "Partner comparison" : "Child-name ideas"}
              </button>
            ))}
          </div>
          {mode === "partner" ? (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Partner name (optional)" value={partnerName} onChange={setPartnerName} placeholder="Name" />
                <Field label="Partner date of birth" type="date" value={partnerDob} onChange={setPartnerDob} />
              </div>
              <div className="grid gap-x-6 gap-y-3 border-y border-stone-200 py-4 text-sm dark:border-amber-900/30 sm:grid-cols-3">
                <p className="text-stone-600 dark:text-stone-300">Ideal Moolank <strong className="text-stone-800 dark:text-stone-100">{partnerGuidance.idealPartnerMoolank.join(", ") || "—"}</strong></p>
                <p className="text-stone-600 dark:text-stone-300">Ideal Bhagyank <strong className="text-stone-800 dark:text-stone-100">{partnerGuidance.idealPartnerBhagyank.join(", ") || "—"}</strong></p>
                <p className="text-stone-600 dark:text-stone-300">Good birth dates <strong className="text-stone-800 dark:text-stone-100">{partnerGuidance.bestPartnerBirthDates.join(", ")}</strong></p>
              </div>
              {partner ? (
                <div className="grid gap-x-8 md:grid-cols-[minmax(0,1.2fr)_minmax(12rem,0.8fr)]">
                  <div className="border-y border-stone-200 py-4 dark:border-amber-900/30">
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      <p className="text-sm text-stone-500 dark:text-stone-400">{partnerName.trim() || "Partner"} · {partner.partnerNature}</p>
                      <Verdict value={partner.verdict} />
                    </div>
                    <p className="mt-2 font-serif text-2xl text-stone-800 dark:text-stone-100">{partner.percent}% compatibility</p>
                    <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-300">Moolank pair {partner.moolankPair} · Bhagyank pair {partner.bhagyankPair} · Cross fit {partner.cross} · Name fit {partner.namePair}</p>
                    <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">Fills {partner.fillsYourMissingLoShu} of your missing Lo Shu digits.</p>
                  </div>
                  <dl className="grid grid-cols-3 gap-3 border-b border-stone-200 py-4 dark:border-amber-900/30 md:grid-cols-1">
                    <div><dt className="text-xs text-stone-500 dark:text-stone-400">Moolank</dt><dd className="mt-1 text-sm font-medium text-stone-800 dark:text-stone-100">{partner.moolank}</dd></div>
                    <div><dt className="text-xs text-stone-500 dark:text-stone-400">Bhagyank</dt><dd className="mt-1 text-sm font-medium text-stone-800 dark:text-stone-100">{partner.bhagyank}</dd></div>
                    <div><dt className="text-xs text-stone-500 dark:text-stone-400">Name number</dt><dd className="mt-1 text-sm font-medium text-stone-800 dark:text-stone-100">{partner.nameNumber ?? "—"}</dd></div>
                  </dl>
                </div>
              ) : <p className="text-sm text-stone-500 dark:text-stone-400">Add a valid date of birth to calculate a comparison.</p>}
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Child date of birth" type="date" value={childDob} onChange={setChildDob} />
                <Field label="Family surname" value={surname} onChange={setSurname} placeholder="Surname" />
              </div>
              <TextAreaField label="First names to compare · one per line" value={firstNames} onChange={setFirstNames} placeholder={"Aarav\nAnaya"} />
              {child && (
                <div>
                  <p className="mb-2 text-sm leading-6 text-stone-600 dark:text-stone-300">Suggested starting letters: <strong className="text-stone-800 dark:text-stone-100">{child.suggestedStartingLetters.join(", ") || "—"}</strong> · Ideal roots: <strong className="text-stone-800 dark:text-stone-100">{child.idealNameRoots.join(", ") || "—"}</strong></p>
                  <DataTable rows={child.names} empty="Add first-name options above." columns={[
                    { key: "fullName", label: "Full name" }, { key: "fullTotal", label: "Chaldean total" }, { key: "root", label: "Root" },
                    { key: "startsWithSuggestedLetter", label: "Suggested initial", render: (row) => row.startsWithSuggestedLetter ? "Yes" : "No" },
                    { key: "score", label: "Score", render: (row) => row.score.toFixed(1) },
                    { key: "verdict", label: "Assessment", render: (row) => <Verdict value={row.verdict} /> },
                  ]} />
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
