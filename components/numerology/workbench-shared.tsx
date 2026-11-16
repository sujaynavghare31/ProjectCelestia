"use client";

import type { ReactNode } from "react";
import { verdictClass } from "@/lib/numerology/ui";

const controlClass =
  "mt-1.5 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60";
const textAreaClass =
  "mt-1.5 min-h-24 w-full resize-y rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/40";

export function todayISO() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

export function isValidISODate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function splitList(value: string) {
  return value.split(/[\n,;]+/).map((item) => item.trim()).filter(Boolean);
}

export function Field({
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
    <label className="block min-w-0 text-xs font-medium text-stone-600 dark:text-stone-300">
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

export function TextAreaField({
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
    <label className="block min-w-0 text-xs font-medium text-stone-600 dark:text-stone-300">
      {label}
      <textarea className={textAreaClass} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

export function SelectField({
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
    <label className="block min-w-0 text-xs font-medium text-stone-600 dark:text-stone-300">
      {label}
      <select className={controlClass} value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
    </label>
  );
}

export function PanelHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-5">
      <h3 className="font-serif text-xl tracking-wide text-stone-800 dark:text-stone-100">{title}</h3>
      <p className="mt-1.5 max-w-3xl text-sm leading-6 text-stone-600 dark:text-stone-300">{description}</p>
    </div>
  );
}

export function Verdict({ value }: { value: string }) {
  const kind = verdictClass(value);
  const styles = {
    excellent: "bg-emerald-50 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-200",
    good: "bg-sky-50 text-sky-800 dark:bg-sky-400/10 dark:text-sky-200",
    average: "bg-amber-50 text-amber-900 dark:bg-amber-400/10 dark:text-amber-100",
    bad: "bg-rose-50 text-rose-800 dark:bg-rose-400/10 dark:text-rose-200",
  };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${styles[kind]}`}>{value}</span>;
}

export function DataTable<Row extends object>({
  rows,
  columns,
  empty = "No results yet.",
}: {
  rows: Row[];
  columns: { key: keyof Row; label: string; render?: (row: Row) => ReactNode }[];
  empty?: string;
}) {
  if (!rows.length) return <p className="rounded-lg bg-stone-100/70 px-4 py-4 text-sm text-stone-600 dark:bg-zinc-900 dark:text-stone-300">{empty}</p>;
  return (
    <div className="divide-y divide-stone-200/80 dark:divide-amber-900/20" role="list">
      {rows.map((row, index) => (
        <div key={`${index}-${String(row[columns[0].key] ?? "")}`} className="grid gap-x-5 gap-y-2 py-4 sm:grid-cols-[minmax(9rem,0.75fr)_minmax(0,2fr)]" role="listitem">
          <div className="text-sm font-medium text-stone-800 dark:text-stone-100">{columns[0].render ? columns[0].render(row) : String(row[columns[0].key] ?? "—")}</div>
          <dl className="grid min-w-0 gap-x-5 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
            {columns.slice(1).map((column) => (
              <div key={String(column.key)} className="min-w-0">
                <dt className="text-[11px] uppercase tracking-wide text-stone-500 dark:text-stone-400">{column.label}</dt>
                <dd className="mt-0.5 break-words text-sm text-stone-700 dark:text-stone-200">
                  {column.render ? column.render(row) : String(row[column.key] ?? "—")}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}

export function RootSuggestions({ values }: { values: { best: number[]; good: number[]; avoid: number[]; digitsToInclude: number[]; digitsToMinimise: number[] } }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 rounded-lg bg-stone-100/70 px-3 py-2.5 text-xs text-stone-700 dark:bg-zinc-900 dark:text-stone-200">
      <span><span className="font-medium text-emerald-800 dark:text-emerald-200">Best:</span> {values.best.join(", ") || "—"}</span>
      <span><span className="font-medium text-sky-800 dark:text-sky-200">Good:</span> {values.good.join(", ") || "—"}</span>
      <span><span className="font-medium text-rose-800 dark:text-rose-200">Use care:</span> {values.avoid.join(", ") || "—"}</span>
      <span><span className="font-medium">Add:</span> {values.digitsToInclude.join(", ") || "—"}</span>
      <span><span className="font-medium">Minimise:</span> {values.digitsToMinimise.join(", ") || "—"}</span>
    </div>
  );
}
