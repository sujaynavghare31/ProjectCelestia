"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  Building2,
  CalendarDays,
  Heart,
  MapPin,
  MessageCircleQuestion,
  Smartphone,
  Sparkles,
  UserRound,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TABLES,
  bankModule,
  businessModule,
  calendarModule,
  childNameModule,
  citiesModule,
  cleanNumber,
  contextFromProfile,
  houseModule,
  judgeHorary,
  mobileModule,
  nameCheckModule,
  partnerModule,
  vehicleModule,
  verdictClass,
} from "@/lib/numerology";
import type { Profile } from "@/lib/numerology";

type Tool =
  | "profile"
  | "name"
  | "numbers"
  | "business"
  | "relationships"
  | "places"
  | "calendar"
  | "horary";

const TOOLS: { id: Tool; label: string; icon: typeof Sparkles }[] = [
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "name", label: "Name analysis", icon: Sparkles },
  { id: "numbers", label: "Number checks", icon: Smartphone },
  { id: "business", label: "Business", icon: Building2 },
  { id: "relationships", label: "Relationships", icon: Heart },
  { id: "places", label: "Cities", icon: MapPin },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "horary", label: "Prashna", icon: MessageCircleQuestion },
];
const isTool = (value: string): value is Tool => TOOLS.some((tool) => tool.id === value);

const controlClass =
  "mt-1.5 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60";
const textAreaClass =
  "mt-1.5 min-h-24 w-full resize-y rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15";

function todayISO() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

function isValidISODate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function splitList(value: string) {
  return value.split(/[\n,;]+/).map((item) => item.trim()).filter(Boolean);
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  min,
  max,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  inputMode?: "text" | "numeric" | "decimal";
}) {
  return (
    <label className="block min-w-0 text-xs font-medium text-muted-foreground">
      {label}
      <input
        className={controlClass}
        type={type}
        value={value}
        min={min}
        max={max}
        inputMode={inputMode}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block min-w-0 text-xs font-medium text-muted-foreground">
      {label}
      <textarea className={textAreaClass} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="block min-w-0 text-xs font-medium text-muted-foreground">
      {label}
      <select className={controlClass} value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
    </label>
  );
}

function PanelHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}

function Verdict({ value }: { value: string }) {
  const kind = verdictClass(value);
  const styles = {
    excellent: "bg-emerald-100 text-emerald-900 dark:bg-emerald-400/10 dark:text-emerald-300",
    good: "bg-cyan-100 text-cyan-900 dark:bg-cyan-400/10 dark:text-cyan-300",
    average: "bg-amber-100 text-amber-950 dark:bg-amber-400/10 dark:text-amber-200",
    bad: "bg-rose-100 text-rose-900 dark:bg-rose-400/10 dark:text-rose-300",
  };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${styles[kind]}`}>{value}</span>;
}

function ScoreSummary({ score, verdict, label = "Score" }: { score: number; verdict: string; label?: string }) {
  const percent = Math.max(0, Math.min(100, (score / 10) * 100));
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-sm font-semibold tabular-nums">{score.toFixed(1)} / 10</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${percent}%` }} />
      </div>
      <div className="mt-2"><Verdict value={verdict} /></div>
    </div>
  );
}

function DataTable<Row extends object>({
  rows,
  columns,
  empty = "No results yet.",
}: {
  rows: Row[];
  columns: { key: keyof Row; label: string; render?: (row: Row) => ReactNode }[];
  empty?: string;
}) {
  if (!rows.length) return <p className="rounded-lg bg-muted/30 px-3 py-4 text-xs text-muted-foreground">{empty}</p>;
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[560px] border-collapse text-left text-xs">
        <thead className="bg-muted/50 text-[10px] uppercase tracking-wide text-muted-foreground">
          <tr>{columns.map((column) => <th key={String(column.key)} className="px-3 py-2.5 font-semibold">{column.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${index}-${String(row[columns[0].key] ?? "")}`} className="border-t border-border/70 align-top">
              {columns.map((column) => (
                <td key={String(column.key)} className="px-3 py-2.5 text-foreground">
                  {column.render ? column.render(row) : String(row[column.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RootSuggestions({ values }: { values: { best: number[]; good: number[]; avoid: number[]; digitsToInclude: number[]; digitsToMinimise: number[] } }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 rounded-lg bg-muted/30 px-3 py-2.5 text-xs">
      <span><span className="font-medium text-emerald-700 dark:text-emerald-300">Best:</span> {values.best.join(", ") || "—"}</span>
      <span><span className="font-medium text-cyan-700 dark:text-cyan-300">Good:</span> {values.good.join(", ") || "—"}</span>
      <span><span className="font-medium text-rose-700 dark:text-rose-300">Use care:</span> {values.avoid.join(", ") || "—"}</span>
      <span><span className="font-medium">Add:</span> {values.digitsToInclude.join(", ") || "—"}</span>
      <span><span className="font-medium">Minimise:</span> {values.digitsToMinimise.join(", ") || "—"}</span>
    </div>
  );
}

function ProfileReport({ profile }: { profile: Profile }) {
  const { loShu, report, pythagorean } = profile;
  const stats = [
    { label: "Expression", value: pythagorean.expression },
    { label: "Soul urge", value: pythagorean.soulUrge },
    { label: "Personality", value: pythagorean.personality },
    { label: "Life path", value: pythagorean.lifePath },
    { label: "Birthday", value: pythagorean.birthday },
    { label: "Maturity", value: pythagorean.maturity },
  ];
  return (
    <div className="space-y-5">
      <PanelHeading title="Your numerology profile" description="A fuller reading from the supplied Chaldean, Pythagorean, and Lo Shu rules." />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((item) => (
          <div key={item.label} className="rounded-lg border border-border bg-card px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground">{item.label}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{item.value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <h4 className="text-xs font-semibold">Lo Shu digit readings</h4>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[540px] border-collapse text-left text-xs">
              <thead className="bg-muted/50 text-[10px] uppercase tracking-wide text-muted-foreground">
                <tr><th className="px-3 py-2">Number</th><th className="px-3 py-2">Count</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Guidance</th></tr>
              </thead>
              <tbody>
                {loShu.digits.map((digit) => (
                  <tr key={digit.digit} className="border-t border-border/70">
                    <td className="px-3 py-2 font-semibold">{digit.digit} <span className="font-normal text-muted-foreground">{digit.planet}</span></td>
                    <td className="px-3 py-2 tabular-nums">{digit.count}</td>
                    <td className="px-3 py-2">{digit.status}</td>
                    <td className="max-w-[360px] px-3 py-2 text-muted-foreground">{digit.remedy ?? digit.excessEffect ?? digit.missingEffect}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <h4 className="mb-2 text-xs font-semibold">Planes</h4>
            <div className="space-y-2">
              {loShu.planes.map((plane) => (
                <div key={plane.name} className="flex items-start justify-between gap-3 rounded-lg bg-muted/30 px-3 py-2.5">
                  <div><p className="text-xs font-medium">{plane.name} <span className="font-normal text-muted-foreground">· {plane.digits.join("–")}</span></p><p className="mt-1 text-xs text-muted-foreground">{plane.reading}</p></div>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{plane.status}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { label: "Moolank", value: report.byMoolank },
              { label: "Bhagyank", value: report.byBhagyank },
              { label: "Name number", value: report.byNameNumber },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg border border-border p-3">
                <p className="text-[11px] font-medium text-muted-foreground">{label} · {value.planet}</p>
                <p className="mt-1 text-xs font-semibold">{value.keyword}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{value.strengths}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{value.weaknesses}</p>
              </div>
            ))}
            <div className="rounded-lg border border-border p-3 sm:col-span-2">
              <p className="text-[11px] font-medium text-muted-foreground">Life path meaning · {pythagorean.lifePath}</p>
              <p className="mt-1 text-xs font-semibold">{pythagorean.lifePathMeaning.keyword}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{pythagorean.lifePathMeaning.strengths} · Challenges: {pythagorean.lifePathMeaning.challenges}</p>
            </div>
          </div>
        </div>
      </div>
      <p className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
        Supportive days: {profile.lucky.days}. Colors: {profile.lucky.colours}. Avoid colors: {profile.lucky.avoidColours}. Gemstone: {profile.lucky.gemstone}. Direction: {profile.lucky.direction}.
      </p>
    </div>
  );
}

function NameAnalysis({ profile }: { profile: Profile }) {
  const [alternativesText, setAlternativesText] = useState("");
  const context = useMemo(() => contextFromProfile(profile), [profile]);
  const result = useMemo(
    () => profile.input.fullName.trim() ? nameCheckModule(context, profile.input.fullName, splitList(alternativesText)) : null,
    [alternativesText, context, profile.input.fullName],
  );
  if (!result) return <p className="text-xs text-muted-foreground">Enter a name above to analyze spelling options.</p>;
  const topLetters = result.addOneLetter.slice().sort((a, b) => b.score - a.score).slice(0, 10);
  const targetRows = result.nearestTargets.slice().sort((a, b) => b.score - a.score).slice(0, 8);
  return (
    <div className="space-y-4">
      <PanelHeading title="Name analysis" description="Compare spellings with Chaldean compound values, relationships, and Pythagorean totals." />
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.65fr)]">
        <div className="rounded-lg border border-border p-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-xs text-muted-foreground">Current spelling</p><p className="mt-1 text-base font-semibold">{result.current.name}</p></div>
            <Verdict value={result.current.verdict} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <p>Total <strong>{result.current.total}</strong></p><p>Root <strong>{result.current.root}</strong></p>
            <p>Compound <strong>{result.current.rating}</strong></p><p>Score <strong>{result.current.score.toFixed(1)}/10</strong></p>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{result.current.compoundMeaning}</p>
          <p className="mt-1 text-xs text-muted-foreground">Moolank: {result.current.vsMoolank} · Bhagyank: {result.current.vsBhagyank} · Pythagorean: {result.current.pythTotal} / {result.current.pythRoot}</p>
        </div>
        <div className="space-y-2">
          <RootSuggestions values={result.idealNameRoots} />
          <TextAreaField label="Alternative spellings (one per line)" value={alternativesText} onChange={setAlternativesText} placeholder={"Rahul Sharma\nRahul Kumarr Sharma"} />
        </div>
      </div>
      <DataTable
        rows={result.alternatives}
        empty="Add alternative spellings above to compare them."
        columns={[
          { key: "name", label: "Spelling" },
          { key: "total", label: "Chaldean total" },
          { key: "root", label: "Root" },
          { key: "rating", label: "Compound" },
          { key: "score", label: "Score", render: (row) => row.score.toFixed(1) },
          { key: "verdict", label: "Assessment", render: (row) => <Verdict value={row.verdict} /> },
        ]}
      />
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="space-y-2"><h4 className="text-xs font-semibold">Promising one-letter additions</h4>
          <DataTable rows={topLetters} columns={[
            { key: "letter", label: "Letter" }, { key: "value", label: "Value" }, { key: "total", label: "New total" },
            { key: "rating", label: "Rating" }, { key: "score", label: "Score", render: (row) => row.score.toFixed(1) },
          ]} />
        </div>
        <div className="space-y-2"><h4 className="text-xs font-semibold">Nearby totals</h4>
          <DataTable rows={targetRows} columns={[
            { key: "how", label: "Adjustment" }, { key: "total", label: "Target" }, { key: "rating", label: "Rating" },
            { key: "score", label: "Score", render: (row) => row.score.toFixed(1) },
          ]} />
        </div>
      </div>
    </div>
  );
}

type NumberMode = "mobile" | "house" | "bank" | "vehicle";
const NUMBER_MODES: { id: NumberMode; label: string }[] = [
  { id: "mobile", label: "Mobile" },
  { id: "house", label: "House / flat" },
  { id: "bank", label: "Bank account" },
  { id: "vehicle", label: "Vehicle" },
];

function NumberChecks({ profile }: { profile: Profile }) {
  const [mode, setMode] = useState<NumberMode>("mobile");
  const [valuesText, setValuesText] = useState("");
  const [bankName, setBankName] = useState("");
  const context = useMemo(() => contextFromProfile(profile), [profile]);
  const values = useMemo(() => splitList(valuesText), [valuesText]);
  const mobile = useMemo(() => mobileModule(context, values), [context, values]);
  const houses = useMemo(() => houseModule(context, values), [context, values]);
  const banks = useMemo(() => bankModule(context, values.map((accountNumber) => ({ accountNumber, bankName })), profile.lucky.datesEveryMonth), [bankName, context, profile.lucky.datesEveryMonth, values]);
  const vehicles = useMemo(() => vehicleModule(context, values.map((plate) => ({ plate })), profile.lucky.datesEveryMonth), [context, profile.lucky.datesEveryMonth, values]);
  return (
    <div className="space-y-4">
      <PanelHeading title="Number checks" description="Assess phone numbers, flat or house identifiers, bank accounts, and vehicle registrations. Values are calculated in this browser session and are not saved." />
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Number check type">
        {NUMBER_MODES.map(({ id, label }) => (
          <button key={id} type="button" aria-pressed={mode === id} onClick={() => setMode(id)} className={`rounded-lg px-3 py-2 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${mode === id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>{label}</button>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.7fr)]">
        <TextAreaField
          label={mode === "mobile" ? "Phone numbers · one per line" : mode === "house" ? "House / flat numbers · one per line" : mode === "bank" ? "Account numbers · one per line" : "Registration plates · one per line"}
          value={valuesText}
          onChange={setValuesText}
          placeholder={mode === "mobile" ? "98111 22334\n0012345678" : mode === "house" ? "A-302\n12/4" : mode === "bank" ? "0012345678" : "MH12AB1234"}
        />
        {mode === "bank" ? (
          <Field label="Bank name (optional)" value={bankName} onChange={setBankName} placeholder="Bank name" />
        ) : mode === "mobile" ? <RootSuggestions values={mobile.suggestions} />
          : mode === "vehicle" ? <RootSuggestions values={vehicles.suggestions} />
            : <p className="self-center text-xs text-muted-foreground">Main-door direction: {houses.mainDoorDirection}</p>}
      </div>
      {mode === "mobile" && <DataTable rows={mobile.checks} empty="Enter at least one phone number to see its score." columns={[
        { key: "number", label: "Number", render: (row) => `•••• ${cleanNumber(row.number).slice(-4) || "—"}` },
        { key: "root", label: "Root" }, { key: "compoundRating", label: "Compound" }, { key: "zeros", label: "Zeros" },
        { key: "enemyDigits", label: "Enemy digits" }, { key: "score", label: "Score", render: (row) => row.score.toFixed(1) },
        { key: "verdict", label: "Assessment", render: (row) => <Verdict value={row.verdict} /> },
      ]} />}
      {mode === "house" && <DataTable rows={houses.checks} empty="Enter a house or flat number to see its reading." columns={[
        { key: "number", label: "House / flat" }, { key: "total", label: "Total" }, { key: "root", label: "Root" },
        { key: "meaning", label: "House meaning" }, { key: "score", label: "Score", render: (row) => row.score.toFixed(1) },
        { key: "verdict", label: "Assessment", render: (row) => <Verdict value={row.verdict} /> },
      ]} />}
      {mode === "bank" && (
        <div className="space-y-3">
          <RootSuggestions values={banks.suggestions} />
          <p className="text-xs text-muted-foreground">Best opening day: {banks.bestWeekdayToOpen} · Wealth corner: {banks.wealthCorner}</p>
          <DataTable rows={banks.checks} empty="Enter an account number to see its reading." columns={[
            { key: "accountNumber", label: "Account", render: (row) => `•••• ${cleanNumber(row.accountNumber).slice(-4) || "—"}` },
            { key: "root", label: "Root" }, { key: "last4Root", label: "Last-four root" }, { key: "zeros", label: "Zeros" },
            { key: "score", label: "Score", render: (row) => row.score.toFixed(1) },
            { key: "verdict", label: "Assessment", render: (row) => <Verdict value={row.verdict} /> },
            { key: "remarks", label: "Notes" },
          ]} />
        </div>
      )}
      {mode === "vehicle" && (
        <div className="space-y-3">
          <RootSuggestions values={vehicles.suggestions} />
          <p className="text-xs text-muted-foreground">Supportive colors: {vehicles.luckyColours} · Delivery day: {vehicles.bestWeekday} · Parking direction: {vehicles.parkingDirection}</p>
          <DataTable rows={vehicles.checks} empty="Enter a registration plate to see its reading." columns={[
            { key: "plate", label: "Plate" }, { key: "fourDigits", label: "Scored digits" }, { key: "root", label: "Root" },
            { key: "plateRoot", label: "Full plate root" }, { key: "score", label: "Score", render: (row) => row.score.toFixed(1) },
            { key: "verdict", label: "Assessment", render: (row) => <Verdict value={row.verdict} /> },
          ]} />
          <DataTable rows={vehicles.fancyNumbers.filter((item) => item.score >= 6.5).slice(0, 8)} empty="No especially high-scoring fancy numbers are listed." columns={[
            { key: "number", label: "Example number" }, { key: "root", label: "Root" }, { key: "score", label: "Score" },
            { key: "verdict", label: "Assessment", render: (row) => <Verdict value={row.verdict} /> },
          ]} />
        </div>
      )}
      {mode === "house" && <p className="text-xs text-muted-foreground">Main-door direction: {houses.mainDoorDirection}</p>}
    </div>
  );
}

function BusinessPanel({ profile }: { profile: Profile }) {
  const [industry, setIndustry] = useState(TABLES.industries[0]?.industry ?? "");
  const [startDate, setStartDate] = useState("");
  const [namesText, setNamesText] = useState("");
  const [unit, setUnit] = useState("");
  const [building, setBuilding] = useState("");
  const [phone, setPhone] = useState("");
  const [headcount, setHeadcount] = useState("");
  const context = useMemo(() => contextFromProfile(profile), [profile]);
  const result = useMemo(() => businessModule(context, {
    industry,
    startDate: startDate || undefined,
    names: splitList(namesText),
    addresses: unit.trim() ? [{ unit, building }] : [],
    phones: phone.trim() ? [{ number: phone }] : [],
    teams: Number(headcount) > 0 ? [{ team: "Current team", headcount: Number(headcount) }] : [],
  }, profile.lucky.datesEveryMonth), [building, context, headcount, industry, namesText, phone, profile.lucky.datesEveryMonth, startDate, unit]);
  return (
    <div className="space-y-4">
      <PanelHeading title="Business & office" description="Compare an industry, business name, office identifier, business phone, team size, and optional start date." />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <SelectField label="Industry" value={industry} onChange={setIndustry}>
          {TABLES.industries.map(({ industry: name }) => <option key={name} value={name}>{name}</option>)}
        </SelectField>
        <Field label="Start / incorporation date (optional)" type="date" value={startDate} onChange={setStartDate} />
        <Field label="Team headcount (optional)" type="number" min={1} max={100000} inputMode="numeric" value={headcount} onChange={setHeadcount} placeholder="e.g. 8" />
        <TextAreaField label="Business names · one per line" value={namesText} onChange={setNamesText} placeholder={"Celestia Studio\nNorth Star Design"} />
        <div className="grid grid-cols-2 gap-2">
          <Field label="Unit / suite" value={unit} onChange={setUnit} placeholder="A-302" />
          <Field label="Building (optional)" value={building} onChange={setBuilding} placeholder="Tower 3" />
        </div>
        <Field label="Business phone (optional)" value={phone} onChange={setPhone} inputMode="numeric" placeholder="Phone number" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border p-3"><p className="text-xs text-muted-foreground">Industry roots</p><p className="mt-1 text-sm font-medium">{result.industryRoots}</p></div>
        <div className="rounded-lg border border-border p-3"><p className="text-xs text-muted-foreground">Owner-favourable roots</p><p className="mt-1 text-sm font-medium">{result.ownerFavourableRoots.join(", ") || "—"}</p></div>
        <div className="rounded-lg border border-border p-3"><p className="text-xs text-muted-foreground">Favourable launch days</p><p className="mt-1 text-sm font-medium">{result.launch.weekday}</p><p className="mt-1 text-xs text-muted-foreground">Dates: {result.launch.dates.join(", ")}</p></div>
      </div>
      {result.businessDestiny !== null && <p className="rounded-lg bg-muted/30 px-3 py-2.5 text-xs">Business destiny {result.businessDestiny} · {result.destinyNote}</p>}
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="space-y-2"><h4 className="text-xs font-semibold">Name options</h4><DataTable rows={result.names} empty="Add one or more names to evaluate." columns={[
          { key: "name", label: "Name" }, { key: "root", label: "Root" }, { key: "rating", label: "Compound" },
          { key: "industryFit", label: "Industry fit", render: (row) => row.industryFit ? "Yes" : "No" },
          { key: "score", label: "Score", render: (row) => row.score.toFixed(1) }, { key: "verdict", label: "Assessment", render: (row) => <Verdict value={row.verdict} /> },
        ]} /></div>
        <div className="space-y-2"><h4 className="text-xs font-semibold">Office identifier</h4><DataTable rows={result.addresses} empty="Enter a unit or suite number to evaluate." columns={[
          { key: "unit", label: "Unit" }, { key: "root", label: "Root" }, { key: "commercialMeaning", label: "Meaning" },
          { key: "score", label: "Score", render: (row) => row.score.toFixed(1) }, { key: "verdict", label: "Assessment", render: (row) => <Verdict value={row.verdict} /> },
        ]} /></div>
        <div className="space-y-2"><h4 className="text-xs font-semibold">Business phone</h4><DataTable rows={result.phones} empty="Enter a business phone to evaluate." columns={[
          { key: "number", label: "Number", render: (row) => `•••• ${row.number.replace(/\D/g, "").slice(-4) || "—"}` },
          { key: "root", label: "Root" }, { key: "score", label: "Score", render: (row) => row.score.toFixed(1) },
          { key: "verdict", label: "Assessment", render: (row) => <Verdict value={row.verdict} /> },
        ]} /></div>
        <div className="space-y-2"><h4 className="text-xs font-semibold">Team size</h4><DataTable rows={result.teams} empty="Enter a team headcount to see nearby suggestions." columns={[
          { key: "headcount", label: "Current" }, { key: "root", label: "Root" }, { key: "status", label: "Fit" }, { key: "suggestion", label: "Suggestion" },
        ]} /></div>
      </div>
      <p className="text-xs text-muted-foreground">{result.cabin}</p>
    </div>
  );
}

function RelationshipsPanel({ profile }: { profile: Profile }) {
  const [mode, setMode] = useState<"partner" | "child">("partner");
  const [partnerName, setPartnerName] = useState("");
  const [partnerDob, setPartnerDob] = useState("");
  const [childDob, setChildDob] = useState("");
  const [surname, setSurname] = useState("");
  const [firstNames, setFirstNames] = useState("");
  const context = useMemo(() => contextFromProfile(profile), [profile]);
  const partner = useMemo(
    () => isValidISODate(partnerDob) ? partnerModule(context, [{ name: partnerName, dob: partnerDob }]).checks[0] : null,
    [context, partnerDob, partnerName],
  );
  const partnerGuidance = useMemo(() => partnerModule(context, []), [context]);
  const child = useMemo(
    () => isValidISODate(childDob) ? childNameModule(surname, childDob, splitList(firstNames)) : null,
    [childDob, firstNames, surname],
  );
  return (
    <div className="space-y-4">
      <PanelHeading title="Relationships & child names" description="Compare a partner's numbers or shortlist child-name options. Dates and names stay in this browser session." />
      <div className="flex gap-1.5" role="group" aria-label="Relationship tool">
        {(["partner", "child"] as const).map((item) => <button key={item} type="button" aria-pressed={mode === item} onClick={() => setMode(item)} className={`rounded-lg px-3 py-2 text-xs font-medium ${mode === item ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}>{item === "partner" ? "Partner comparison" : "Child-name ideas"}</button>)}
      </div>
      {mode === "partner" ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Partner name (optional)" value={partnerName} onChange={setPartnerName} placeholder="Name" /><Field label="Partner date of birth" type="date" value={partnerDob} onChange={setPartnerDob} /></div>
          <div className="flex flex-wrap gap-4 rounded-lg bg-muted/30 px-3 py-2.5 text-xs"><span>Ideal Moolank: <strong>{partnerGuidance.idealPartnerMoolank.join(", ") || "—"}</strong></span><span>Ideal Bhagyank: <strong>{partnerGuidance.idealPartnerBhagyank.join(", ") || "—"}</strong></span><span>Good birth dates: <strong>{partnerGuidance.bestPartnerBirthDates.join(", ")}</strong></span></div>
          {partner ? <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_200px]">
            <div className="rounded-lg border border-border p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-xs text-muted-foreground">{partnerName.trim() || "Partner"} · {partner.partnerNature}</p><p className="mt-1 text-lg font-semibold">{partner.percent}% compatibility</p></div><Verdict value={partner.verdict} /></div><p className="mt-3 text-xs text-muted-foreground">Moolank pair {partner.moolankPair} · Bhagyank pair {partner.bhagyankPair} · Cross fit {partner.cross} · Name fit {partner.namePair}</p><p className="mt-1 text-xs text-muted-foreground">Fills {partner.fillsYourMissingLoShu} of your missing Lo Shu digits.</p></div>
            <div className="rounded-lg border border-border p-4"><p className="text-xs text-muted-foreground">Partner numbers</p><p className="mt-2 text-sm">Moolank <strong>{partner.moolank}</strong></p><p className="mt-1 text-sm">Bhagyank <strong>{partner.bhagyank}</strong></p><p className="mt-1 text-sm">Name <strong>{partner.nameNumber ?? "—"}</strong></p></div>
          </div> : <p className="text-xs text-muted-foreground">Add a valid date of birth to calculate a comparison.</p>}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Child date of birth" type="date" value={childDob} onChange={setChildDob} /><Field label="Family surname" value={surname} onChange={setSurname} placeholder="Surname" /></div>
          <TextAreaField label="First names to compare · one per line" value={firstNames} onChange={setFirstNames} placeholder={"Aarav\nAnaya"} />
          {child && <div className="space-y-3"><p className="text-xs text-muted-foreground">Suggested starting letters: <strong>{child.suggestedStartingLetters.join(", ") || "—"}</strong> · Ideal roots: <strong>{child.idealNameRoots.join(", ") || "—"}</strong></p><DataTable rows={child.names} empty="Add first-name options above." columns={[
            { key: "fullName", label: "Full name" }, { key: "fullTotal", label: "Chaldean total" }, { key: "root", label: "Root" },
            { key: "startsWithSuggestedLetter", label: "Suggested initial", render: (row) => row.startsWithSuggestedLetter ? "Yes" : "No" },
            { key: "score", label: "Score", render: (row) => row.score.toFixed(1) },
            { key: "verdict", label: "Assessment", render: (row) => <Verdict value={row.verdict} /> },
          ]} /></div>}
        </div>
      )}
    </div>
  );
}

function PlacesPanel({ profile }: { profile: Profile }) {
  const [citiesText, setCitiesText] = useState("");
  const [search, setSearch] = useState("");
  const context = useMemo(() => contextFromProfile(profile), [profile]);
  const result = useMemo(() => citiesModule(context, splitList(citiesText)), [citiesText, context]);
  const presets = useMemo(() => citiesModule(context).presetList
    .filter((city) => !search.trim() || city.city.toLowerCase().includes(search.trim().toLowerCase()))
    .slice(0, 8), [context, search]);
  const addCity = (city: string) => {
    const current = splitList(citiesText);
    if (!current.some((item) => item.toLowerCase() === city.toLowerCase())) setCitiesText([...current, city].join("\n"));
  };
  return (
    <div className="space-y-4">
      <PanelHeading title="City compatibility" description="Compare places with your Chaldean name number and personal roots. Choose a preset or enter your own city names." />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="space-y-3">
          <Field label="Find a preset city" value={search} onChange={setSearch} placeholder="Search cities" />
          <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
            {presets.length ? presets.map((city) => <button key={city.city} type="button" onClick={() => addCity(city.city)} className="flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-2 text-left text-xs transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"><span>{city.city}</span><span className="text-muted-foreground">{city.root} · {city.verdict}</span></button>) : <p className="px-2 py-3 text-xs text-muted-foreground">No preset cities match this search.</p>}
          </div>
        </div>
        <TextAreaField label="Cities to compare · one per line" value={citiesText} onChange={setCitiesText} placeholder={"Mumbai\nLondon"} />
      </div>
      <DataTable rows={result.checked} empty="Choose a preset or enter a city to see its vibration." columns={[
        { key: "city", label: "City" }, { key: "total", label: "Name total" }, { key: "root", label: "Root" },
        { key: "brings", label: "Place vibration" }, { key: "watchOut", label: "Consideration" },
        { key: "score", label: "Score", render: (row) => row.score.toFixed(1) },
        { key: "verdict", label: "Assessment", render: (row) => <Verdict value={row.verdict} /> },
      ]} />
    </div>
  );
}

function CalendarPanel({ profile }: { profile: Profile }) {
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const context = useMemo(() => contextFromProfile(profile), [profile]);
  const monthNumber = Number(month);
  const yearNumber = Number(year);
  const result = useMemo(
    () => Number.isInteger(monthNumber) && monthNumber >= 1 && monthNumber <= 12 && Number.isInteger(yearNumber) && yearNumber >= 1900 && yearNumber <= 2100
      ? calendarModule(context, profile.input.dob, monthNumber, yearNumber)
      : null,
    [context, monthNumber, profile.input.dob, yearNumber],
  );
  return (
    <div className="space-y-4">
      <PanelHeading title="Lucky-date calendar" description="Review personal-day patterns and the engine's traditional start-date signals for a selected month." />
      <div className="grid gap-3 sm:grid-cols-[180px_160px]">
        <SelectField label="Month" value={month} onChange={setMonth}>{Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{new Date(2026, index, 1).toLocaleString("en", { month: "long" })}</option>)}</SelectField>
        <Field label="Year" type="number" min={1900} max={2100} value={year} onChange={setYear} />
      </div>
      {result ? (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-border p-3"><p className="text-xs text-muted-foreground">Personal year / month</p><p className="mt-1 text-sm font-semibold">{result.personalYear} / {result.personalMonth} · {result.monthTheme}</p></div>
            <div className="rounded-lg border border-border p-3"><p className="text-xs text-muted-foreground">Trading aptitude (traditional)</p><p className="mt-1 text-sm font-semibold">{result.aptitude} / 3</p></div>
            <div className="rounded-lg border border-border p-3"><p className="text-xs text-muted-foreground">Month guidance</p><p className="mt-1 text-xs leading-relaxed">{result.suitability}</p></div>
          </div>
          <DataTable rows={result.days} columns={[
            { key: "day", label: "Day" }, { key: "weekday", label: "Weekday" }, { key: "dateRoot", label: "Date root" },
            { key: "universal", label: "Universal" }, { key: "personal", label: "Personal" },
            { key: "score", label: "Score" }, { key: "verdict", label: "Start-date reading" }, { key: "signal", label: "Intraday signal" },
          ]} />
          <p className="rounded-lg border border-amber-300/70 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">{result.disclaimer} This calendar is not financial, investment, or trading advice.</p>
        </>
      ) : <p role="alert" className="text-xs text-rose-700 dark:text-rose-300">Choose a month and a year from 1900–2100.</p>}
    </div>
  );
}

function HoraryPanel({ profile }: { profile: Profile }) {
  const [date, setDate] = useState(todayISO);
  const [time, setTime] = useState("10:30");
  const [sunrise, setSunrise] = useState("06:15");
  const [category, setCategory] = useState(TABLES.horaryCategories[0]?.question ?? "");
  const [number, setNumber] = useState("23");
  const [text, setText] = useState("");
  const context = useMemo(() => contextFromProfile(profile), [profile]);
  const selectedCategory = TABLES.horaryCategories.find((item) => item.question === category);
  const numericNumber = Number(number);
  const validTime = (value: string) => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
  const result = useMemo(() => {
    if (!isValidISODate(date) || !validTime(time) || !validTime(sunrise) || !Number.isInteger(numericNumber) || numericNumber < 1 || numericNumber > 249 || !category) return null;
    return judgeHorary({ date, time, category, number: numericNumber, text, querentDob: profile.input.dob }, sunrise);
  }, [category, date, numericNumber, profile.input.dob, sunrise, text, time]);
  const sensitive = selectedCategory && ["Health", "Legal", "Missing", "Finance"].includes(selectedCategory.group);
  const categoriesByGroup = useMemo(() => TABLES.horaryCategories.reduce<Record<string, typeof TABLES.horaryCategories>>((groups, item) => {
    (groups[item.group] ??= []).push(item);
    return groups;
  }, {}), []);
  return (
    <div className="space-y-4">
      <PanelHeading title="Prashna · question numbers" description="Explore the supplied horary numerology rules using the time of the question and a number given spontaneously." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Field label="Question date" type="date" value={date} onChange={setDate} />
        <Field label="Local question time" type="time" value={time} onChange={setTime} />
        <Field label="Sunrise (local)" type="time" value={sunrise} onChange={setSunrise} />
        <SelectField label="Question category" value={category} onChange={setCategory}>
          {Object.entries(categoriesByGroup).map(([group, items]) => <optgroup key={group} label={group}>{items.map((item) => <option key={item.question} value={item.question}>{item.question}</option>)}</optgroup>)}
        </SelectField>
        <Field label="Spontaneous number · 1–249" type="number" min={1} max={249} inputMode="numeric" value={number} onChange={setNumber} />
        <Field label="Question text (optional)" value={text} onChange={setText} placeholder="A short description" />
      </div>
      {sensitive && <p role="note" className="rounded-lg border border-amber-300/70 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">Traditional numerology only; this cannot assess or replace qualified medical, legal, missing-person, or financial support. Contact the appropriate professional or emergency service for urgent matters.</p>}
      {!result ? <p role="alert" className="text-xs text-rose-700 dark:text-rose-300">Check the dates, time, and enter a whole number from 1 to 249.</p> : (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
            <div className="rounded-lg border border-border p-4">
              <p className="text-xs text-muted-foreground">{result.category.group} · {result.category.question}</p>
              <p className="mt-1 text-lg font-semibold">{result.verdict}</p>
              <p className="mt-1 text-xs text-muted-foreground">{result.yesMeans} · Traditional confidence: {Math.round(result.confidence * 100)}%</p>
              <p className="mt-3 text-sm font-medium">Timing: {result.timing.text}</p>
              <p className="mt-1 text-xs text-muted-foreground">Likely date in this system: {result.timing.likelyDate} ({result.timing.likelyWeekday})</p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="text-xs font-medium">Question indicators</p>
              <p className="mt-2 text-xs">Prashna root <strong>{result.numbers.root}</strong> · {result.numbers.compoundMeaning}</p>
              <p className="mt-1 text-xs">Hora lord <strong>{result.numbers.horaPlanet}</strong> · universal day {result.numbers.universal}</p>
              <p className="mt-1 text-xs">Direction {result.place.direction} · secondary {result.place.secondaryDirection}</p>
            </div>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="space-y-2"><h4 className="text-xs font-semibold">Score breakdown</h4><DataTable rows={result.breakdown} columns={[
              { key: "factor", label: "Factor" }, { key: "number", label: "Number" }, { key: "points", label: "Points" },
            ]} /></div>
            <div className="space-y-2"><h4 className="text-xs font-semibold">Aspects</h4><DataTable rows={result.aspects} columns={[
              { key: "aspect", label: "Pair" }, { key: "relation", label: "Relation" }, { key: "reading", label: "Reading" },
            ]} /></div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg bg-muted/30 p-3"><p className="text-xs font-semibold">Traditional significations</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Prashna: {result.significations.prashna}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Hora: {result.significations.hora}</p>{result.place.whereToLook && <p className="mt-1 text-xs text-muted-foreground">Where to look: {result.place.whereToLook}</p>}</div>
            <div className="rounded-lg bg-muted/30 p-3"><p className="text-xs font-semibold">Reflection & remedies</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{result.remedies.categoryAdvice || "Use this reading as a prompt for reflection."}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{result.remedies.deityForQuestion}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{result.remedies.planetRemedy}</p></div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NumerologyWorkbench({ profile }: { profile: Profile | null }) {
  const [activeTool, setActiveTool] = useState<Tool>("profile");
  const activeLabel = TOOLS.find(({ id }) => id === activeTool)?.label ?? "Profile";
  return (
    <section aria-label="Numerology tools" className="mt-5 space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Numerology tools</CardTitle>
          <p className="text-xs leading-relaxed text-muted-foreground">Use the workbook-backed calculations for names, practical numbers, business, relationships, dates, places, and Prashna.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="sm:hidden">
            <SelectField label="Choose a tool" value={activeTool} onChange={(value) => { if (isTool(value)) setActiveTool(value); }}>
              {TOOLS.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
            </SelectField>
          </div>
          <div className="hidden gap-1.5 overflow-x-auto border-b border-border pb-2 sm:flex" role="group" aria-label="Numerology tools">
            {TOOLS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                aria-pressed={activeTool === id}
                onClick={() => setActiveTool(id)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${activeTool === id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
              >
                <Icon className="size-3.5" aria-hidden="true" />{label}
              </button>
            ))}
          </div>
          <div role="region" aria-label={activeLabel} className="min-w-0">
            {!profile ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
                <p className="text-sm font-medium">Add a valid name and date of birth</p>
                <p className="mt-1 text-xs text-muted-foreground">Use the profile fields above to unlock personalized calculations.</p>
              </div>
            ) : activeTool === "profile" ? <ProfileReport profile={profile} />
              : activeTool === "name" ? <NameAnalysis profile={profile} />
                : activeTool === "numbers" ? <NumberChecks profile={profile} />
                  : activeTool === "business" ? <BusinessPanel profile={profile} />
                    : activeTool === "relationships" ? <RelationshipsPanel profile={profile} />
                      : activeTool === "places" ? <PlacesPanel profile={profile} />
                        : activeTool === "calendar" ? <CalendarPanel profile={profile} />
                          : <HoraryPanel profile={profile} />}
          </div>
          <p className="border-t border-border pt-3 text-[11px] leading-relaxed text-muted-foreground">
            Numerology is a traditional belief system. Results are guidance for reflection only—not medical, legal, financial, or investment advice.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
