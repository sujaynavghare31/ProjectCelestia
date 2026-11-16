"use client";

import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TABLES,
  bankModule,
  calendarModule,
  citiesModule,
  cleanNumber,
  contextFromProfile,
  houseModule,
  judgeHorary,
  mobileModule,
  nameCheckModule,
  vehicleModule,
} from "@/lib/numerology";
import type { Profile } from "@/lib/numerology";
import { DataTable, Field, PanelHeading, RootSuggestions, SelectField, splitList, TextAreaField, todayISO, Verdict, isValidISODate } from "@/components/numerology/workbench-shared";

type Tool = "name" | "numbers" | "places" | "calendar" | "horary";

const TOOLS: { id: Tool; label: string }[] = [
  { id: "name", label: "Nomenclature Harmony" },
  { id: "numbers", label: "Asset Alignment" },
  { id: "places", label: "Geographic Resonance" },
  { id: "calendar", label: "Chronos Almanac" },
  { id: "horary", label: "Horary Oracle" },
];

const isTool = (value: string): value is Tool => TOOLS.some((tool) => tool.id === value);

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
      <PanelHeading title="Nomenclature Harmony" description="Compare spellings with Chaldean compound values, relationships, and Pythagorean totals." />
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
      <PanelHeading title="Asset Alignment" description="Assess phone numbers, flat or house identifiers, bank accounts, and vehicle registrations. Values are calculated in this browser session and are not saved." />
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
      <PanelHeading title="Geographic Resonance" description="Compare places with your Chaldean name number and personal roots. Choose a preset or enter your own city names." />
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
      <PanelHeading title="Chronos Almanac" description="Review personal-day patterns and the engine's traditional start-date signals for a selected month." />
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
      <PanelHeading title="Horary Oracle" description="Explore the supplied horary numerology rules using the time of the question and a number given spontaneously." />
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
  const [activeTool, setActiveTool] = useState<Tool>("name");
  return (
    <section aria-label="Additional numerology analysis" className="space-y-5">
      <header className="space-y-1.5">
        <h2 className="font-serif text-2xl tracking-wide text-stone-800 dark:text-stone-100">Additional Analysis</h2>
        <p className="max-w-3xl text-sm leading-6 text-stone-600 dark:text-stone-300">Explore complementary readings without leaving your Core Essence profile.</p>
      </header>
      <Tabs value={activeTool} onValueChange={(value) => { if (isTool(value)) setActiveTool(value); }} className="min-w-0">
        <TabsList aria-label="Additional numerology readings" className="h-auto w-full justify-start gap-1 overflow-x-auto border-b border-stone-200 dark:border-amber-900/30">
          {TOOLS.map(({ id, label }) => (
            <TabsTrigger key={id} value={id} className="h-10 shrink-0 px-3 text-sm text-stone-500 hover:text-stone-900 data-[state=active]:text-amber-800 after:bg-transparent data-[state=active]:after:bg-amber-700 dark:text-stone-400 dark:hover:text-stone-100 dark:data-[state=active]:text-amber-200 dark:data-[state=active]:after:bg-amber-500">{label}</TabsTrigger>
          ))}
        </TabsList>
        <div className="border-x border-b border-stone-200 bg-white px-4 py-5 shadow-sm shadow-stone-200/50 sm:px-6 sm:py-7 dark:border-amber-900/30 dark:bg-zinc-900 dark:shadow-none">
          <TabsContent value="name" className="mt-0 focus-visible:outline-none">
            {profile ? <NameAnalysis profile={profile} /> : <p className="text-sm text-stone-600 dark:text-stone-300">Add a valid name and date of birth above to unlock Nomenclature Harmony.</p>}
          </TabsContent>
          <TabsContent value="numbers" className="mt-0 focus-visible:outline-none">
            {profile ? <NumberChecks profile={profile} /> : <p className="text-sm text-stone-600 dark:text-stone-300">Add a valid name and date of birth above to unlock Asset Alignment.</p>}
          </TabsContent>
          <TabsContent value="places" className="mt-0 focus-visible:outline-none">
            {profile ? <PlacesPanel profile={profile} /> : <p className="text-sm text-stone-600 dark:text-stone-300">Add a valid name and date of birth above to unlock Geographic Resonance.</p>}
          </TabsContent>
          <TabsContent value="calendar" className="mt-0 focus-visible:outline-none">
            {profile ? <CalendarPanel profile={profile} /> : <p className="text-sm text-stone-600 dark:text-stone-300">Add a valid name and date of birth above to unlock the Chronos Almanac.</p>}
          </TabsContent>
          <TabsContent value="horary" className="mt-0 focus-visible:outline-none">
            {profile ? <HoraryPanel profile={profile} /> : <p className="text-sm text-stone-600 dark:text-stone-300">Add a valid name and date of birth above to unlock the Horary Oracle.</p>}
          </TabsContent>
        </div>
      </Tabs>
      <p className="border-t border-stone-200 pt-4 text-xs leading-5 text-stone-500 dark:border-amber-900/30 dark:text-stone-400">
        Numerology is a traditional belief system. Results are guidance for reflection only—not medical, legal, financial, or investment advice.
      </p>
    </section>
  );
}
