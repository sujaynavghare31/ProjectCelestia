"use client";

import { useMemo, useState } from "react";
import { TABLES, businessModule, contextFromProfile } from "@/lib/numerology";
import type { Profile } from "@/lib/numerology";
import { DataTable, Field, PanelHeading, SelectField, splitList, TextAreaField, Verdict } from "@/components/numerology/workbench-shared";

export default function EnterpriseCommerceTab({ profile }: { profile: Profile | null }) {
  const [industry, setIndustry] = useState(TABLES.industries[0]?.industry ?? "");
  const [startDate, setStartDate] = useState("");
  const [namesText, setNamesText] = useState("");
  const [unit, setUnit] = useState("");
  const [building, setBuilding] = useState("");
  const [phone, setPhone] = useState("");
  const [headcount, setHeadcount] = useState("");
  const context = useMemo(() => profile ? contextFromProfile(profile) : null, [profile]);
  const result = useMemo(() => {
    if (!profile || !context) return null;
    return businessModule(context, {
      industry,
      startDate: startDate || undefined,
      names: splitList(namesText),
      addresses: unit.trim() ? [{ unit, building }] : [],
      phones: phone.trim() ? [{ number: phone }] : [],
      teams: Number(headcount) > 0 ? [{ team: "Current team", headcount: Number(headcount) }] : [],
    }, profile.lucky.datesEveryMonth);
  }, [building, context, headcount, industry, namesText, phone, profile, startDate, unit]);

  return (
    <div className="space-y-6">
      <PanelHeading title="Enterprise & Commerce" description="Explore traditional numerology signals for business names, industry, office identifiers, phone numbers, team size, and timing." />
      {!profile || !result ? (
        <p className="border-t border-stone-200 py-6 text-sm text-stone-600 dark:border-amber-900/30 dark:text-stone-300">Add a valid name and date of birth above to personalize enterprise readings.</p>
      ) : (
        <>
          <div className="grid gap-x-5 gap-y-4 md:grid-cols-2 xl:grid-cols-3">
            <SelectField label="Industry" value={industry} onChange={setIndustry}>
              {TABLES.industries.map(({ industry: name }) => <option key={name} value={name}>{name}</option>)}
            </SelectField>
            <Field label="Start / incorporation date (optional)" type="date" value={startDate} onChange={setStartDate} />
            <Field label="Team headcount (optional)" type="number" min={1} max={100000} inputMode="numeric" value={headcount} onChange={setHeadcount} placeholder="e.g. 8" />
            <TextAreaField label="Business names · one per line" value={namesText} onChange={setNamesText} placeholder={"Celestia Studio\nNorth Star Design"} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Unit / suite" value={unit} onChange={setUnit} placeholder="A-302" />
              <Field label="Building (optional)" value={building} onChange={setBuilding} placeholder="Tower 3" />
            </div>
            <Field label="Business phone (optional)" value={phone} onChange={setPhone} inputMode="numeric" placeholder="Phone number" />
          </div>

          <dl className="grid gap-x-6 sm:grid-cols-3">
            {[
              { label: "Industry roots", value: result.industryRoots },
              { label: "Owner-favourable roots", value: result.ownerFavourableRoots.join(", ") || "—" },
              { label: "Favourable launch days", value: `${result.launch.weekday} · ${result.launch.dates.join(", ")}` },
            ].map((item) => (
              <div key={item.label} className="border-t border-stone-200 py-3 dark:border-amber-900/30">
                <dt className="text-xs text-stone-500 dark:text-stone-400">{item.label}</dt>
                <dd className="mt-1 text-sm font-medium text-stone-800 dark:text-stone-100">{item.value}</dd>
              </div>
            ))}
          </dl>
          {result.businessDestiny !== null && <p className="border-y border-stone-200 py-3 text-sm text-stone-700 dark:border-amber-900/30 dark:text-stone-200">Business destiny {result.businessDestiny} · {result.destinyNote}</p>}

          <div className="grid gap-x-8 xl:grid-cols-2">
            <section className="min-w-0">
              <h4 className="font-serif text-lg tracking-wide text-stone-800 dark:text-stone-100">Name options</h4>
              <DataTable rows={result.names} empty="Add one or more names to evaluate." columns={[
                { key: "name", label: "Name" }, { key: "root", label: "Root" }, { key: "rating", label: "Compound" },
                { key: "industryFit", label: "Industry fit", render: (row) => row.industryFit ? "Yes" : "No" },
                { key: "score", label: "Score", render: (row) => row.score.toFixed(1) }, { key: "verdict", label: "Assessment", render: (row) => <Verdict value={row.verdict} /> },
              ]} />
            </section>
            <section className="min-w-0">
              <h4 className="font-serif text-lg tracking-wide text-stone-800 dark:text-stone-100">Office identifier</h4>
              <DataTable rows={result.addresses} empty="Enter a unit or suite number to evaluate." columns={[
                { key: "unit", label: "Unit" }, { key: "root", label: "Root" }, { key: "commercialMeaning", label: "Meaning" },
                { key: "score", label: "Score", render: (row) => row.score.toFixed(1) }, { key: "verdict", label: "Assessment", render: (row) => <Verdict value={row.verdict} /> },
              ]} />
            </section>
            <section className="min-w-0">
              <h4 className="font-serif text-lg tracking-wide text-stone-800 dark:text-stone-100">Business phone</h4>
              <DataTable rows={result.phones} empty="Enter a business phone to evaluate." columns={[
                { key: "number", label: "Number", render: (row) => `•••• ${row.number.replace(/\D/g, "").slice(-4) || "—"}` },
                { key: "root", label: "Root" }, { key: "score", label: "Score", render: (row) => row.score.toFixed(1) },
                { key: "verdict", label: "Assessment", render: (row) => <Verdict value={row.verdict} /> },
              ]} />
            </section>
            <section className="min-w-0">
              <h4 className="font-serif text-lg tracking-wide text-stone-800 dark:text-stone-100">Team size</h4>
              <DataTable rows={result.teams} empty="Enter a team headcount to see nearby suggestions." columns={[
                { key: "headcount", label: "Current" }, { key: "root", label: "Root" }, { key: "status", label: "Fit" }, { key: "suggestion", label: "Suggestion" },
              ]} />
            </section>
          </div>
          <p className="border-t border-stone-200 pt-3 text-xs leading-5 text-stone-500 dark:border-amber-900/30 dark:text-stone-400">{result.cabin}</p>
        </>
      )}
    </div>
  );
}
