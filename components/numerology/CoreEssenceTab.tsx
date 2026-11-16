"use client";

import type { Profile } from "@/lib/numerology";
import { PanelHeading } from "@/components/numerology/workbench-shared";

export default function CoreEssenceTab({ profile }: { profile: Profile | null }) {
  if (!profile) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/80 px-6 py-10 text-center">
        <h3 className="font-serif text-xl tracking-wide text-stone-800 dark:text-stone-100">Your Core Essence awaits</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-600 dark:text-stone-300">Add your name and date of birth above to reveal your personal numerology reading.</p>
      </div>
    );
  }

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
    <div className="space-y-7">
      <PanelHeading title="In-Depth Reading" description="A longer-form interpretation across Chaldean, Pythagorean, and Lo Shu traditions." />
      <dl className="grid grid-cols-2 gap-x-6 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((item) => (
          <div key={item.label} className="border-t border-stone-200 py-3 dark:border-amber-900/30">
            <dt className="text-xs text-stone-500 dark:text-stone-400">{item.label}</dt>
            <dd className="mt-1 font-serif text-2xl tabular-nums text-stone-800 dark:text-stone-100">{item.value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <section>
          <h4 className="font-serif text-lg tracking-wide text-stone-800 dark:text-stone-100">Lo Shu digit readings</h4>
          <div className="mt-3 divide-y divide-stone-200/80 dark:divide-amber-900/20">
            {loShu.digits.map((digit) => (
              <div key={digit.digit} className="grid gap-2 py-3 sm:grid-cols-[minmax(7rem,0.65fr)_minmax(0,1fr)]">
                <div>
                  <p className="text-sm font-medium text-stone-800 dark:text-stone-100">{digit.digit} <span className="font-normal text-stone-500 dark:text-stone-400">· {digit.planet}</span></p>
                  <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">{digit.count} present · {digit.status}</p>
                </div>
                <p className="text-sm leading-6 text-stone-600 dark:text-stone-300">{digit.remedy ?? digit.excessEffect ?? digit.missingEffect}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="space-y-7">
          <section>
            <h4 className="font-serif text-lg tracking-wide text-stone-800 dark:text-stone-100">Planes of expression</h4>
            <div className="mt-3 divide-y divide-stone-200/80 dark:divide-amber-900/20">
              {loShu.planes.map((plane) => (
                <div key={plane.name} className="flex items-start justify-between gap-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-stone-800 dark:text-stone-100">{plane.name} <span className="font-normal text-stone-500 dark:text-stone-400">· {plane.digits.join("–")}</span></p>
                    <p className="mt-1 text-sm leading-6 text-stone-600 dark:text-stone-300">{plane.reading}</p>
                  </div>
                  <span className="shrink-0 text-xs text-stone-500 dark:text-stone-400">{plane.status}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h4 className="font-serif text-lg tracking-wide text-stone-800 dark:text-stone-100">Number influences</h4>
            <div className="mt-3 divide-y divide-stone-200/80 dark:divide-amber-900/20">
              {[
                { label: "Moolank", value: report.byMoolank },
                { label: "Bhagyank", value: report.byBhagyank },
                { label: "Name number", value: report.byNameNumber },
              ].map(({ label, value }) => (
                <div key={label} className="py-3">
                  <p className="text-xs text-stone-500 dark:text-stone-400">{label} · {value.planet}</p>
                  <p className="mt-1 text-sm font-medium text-stone-800 dark:text-stone-100">{value.keyword}</p>
                  <p className="mt-1 text-sm leading-6 text-stone-600 dark:text-stone-300">{value.strengths}</p>
                  <p className="mt-1 text-sm leading-6 text-stone-600 dark:text-stone-300">{value.weaknesses}</p>
                </div>
              ))}
              <div className="py-3">
                <p className="text-xs text-stone-500 dark:text-stone-400">Life path meaning · {pythagorean.lifePath}</p>
                <p className="mt-1 text-sm font-medium text-stone-800 dark:text-stone-100">{pythagorean.lifePathMeaning.keyword}</p>
                <p className="mt-1 text-sm leading-6 text-stone-600 dark:text-stone-300">{pythagorean.lifePathMeaning.strengths} · Challenges: {pythagorean.lifePathMeaning.challenges}</p>
              </div>
            </div>
          </section>
        </div>
      </div>

      <p className="border-t border-stone-200 pt-4 text-sm leading-6 text-stone-600 dark:border-amber-900/30 dark:text-stone-300">
        Supportive days: {profile.lucky.days}. Colors: {profile.lucky.colours}. Frequencies to temper: {profile.lucky.avoidColours}. Gemstone: {profile.lucky.gemstone}. Direction: {profile.lucky.direction}.
      </p>
    </div>
  );
}
