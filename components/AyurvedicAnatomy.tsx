"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useState } from "react";
import { Activity, Flame, Leaf, Sparkles } from "lucide-react";
import type { PlanetPosition } from "@/lib/kundali-types";
import { calculateDosha, type DoshaName } from "@/lib/astrology/dosha";

const SIGN_NAMES = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"] as const;
const SIGN_LORDS: Record<string, string> = {
  Aries: "Mars", Taurus: "Venus", Gemini: "Mercury", Cancer: "Moon", Leo: "Sun", Virgo: "Mercury",
  Libra: "Venus", Scorpio: "Mars", Sagittarius: "Jupiter", Capricorn: "Saturn", Aquarius: "Saturn", Pisces: "Jupiter",
};
const MAJOR_TRANSITS = new Set(["Saturn", "Jupiter", "Rahu", "Ketu"]);

const MATRIX_ROWS = [
  { element: "Fire", dosha: "Pitta", signs: [0, 4, 8], className: "text-red-700" },
  { element: "Earth", dosha: "Kapha", signs: [1, 5, 9], className: "text-emerald-700" },
  { element: "Air", dosha: "Vata", signs: [2, 6, 10], className: "text-slate-600" },
  { element: "Water", dosha: "Kapha", signs: [3, 7, 11], className: "text-blue-600" },
] as const;
const MODALITIES = [
  { name: "Cardinal", translation: "चर", signs: [0, 3, 6, 9] },
  { name: "Fixed", translation: "स्थिर", signs: [1, 4, 7, 10] },
  { name: "Mutable", translation: "द्विस्वभाव", signs: [2, 5, 8, 11] },
] as const;

interface AnatomyZone {
  house: number;
  name: string;
  focus: string;
}

const ZONES: readonly AnatomyZone[] = [
  { house: 1, name: "Head", focus: "Vitality and orientation" },
  { house: 2, name: "Lower Jaw & Throat", focus: "Voice and nourishment" },
  { house: 3, name: "Shoulders, Arms & Hands", focus: "Movement and circulation" },
  { house: 4, name: "Chest", focus: "Heart and emotional grounding" },
  { house: 5, name: "Back & Upper Abdomen", focus: "Radiance and transformation" },
  { house: 6, name: "Abdomen & Intestines", focus: "Assimilation and daily rhythm" },
  { house: 7, name: "Sexual & Excretory System", focus: "Exchange and equilibrium" },
  { house: 8, name: "Sexual & Excretory System", focus: "Release and regeneration" },
  { house: 9, name: "Thighs", focus: "Mobility and expansion" },
  { house: 10, name: "Knees", focus: "Endurance and support" },
  { house: 11, name: "Shins & Calves", focus: "Circulation below the knee" },
  { house: 12, name: "Feet", focus: "Rest and integration" },
];

interface AnatomyNode {
  house: number;
  label: string;
  top: `${number}%`;
  left: `${number}%`;
}

const ANATOMY_NODES: readonly AnatomyNode[] = [
  { house: 1, label: "Head", top: "11%", left: "50%" },
  { house: 2, label: "Lower jaw and throat", top: "22%", left: "50%" },
  { house: 3, label: "Shoulders and upper arms", top: "29%", left: "35%" },
  { house: 3, label: "Shoulders and upper arms", top: "29%", left: "65%" },
  { house: 3, label: "Elbows and forearms", top: "45%", left: "29%" },
  { house: 3, label: "Elbows and forearms", top: "45%", left: "71%" },
  { house: 3, label: "Hands", top: "57%", left: "22%" },
  { house: 3, label: "Hands", top: "57%", left: "78%" },
  { house: 4, label: "Chest", top: "32%", left: "50%" },
  { house: 5, label: "Back and upper abdomen", top: "39%", left: "50%" },
  { house: 6, label: "Abdomen and intestines", top: "47%", left: "50%" },
  { house: 7, label: "Sexual and excretory system", top: "55%", left: "46%" },
  { house: 8, label: "Sexual and excretory system", top: "55%", left: "54%" },
  { house: 9, label: "Thighs", top: "66%", left: "43%" },
  { house: 9, label: "Thighs", top: "66%", left: "57%" },
  { house: 10, label: "Knees", top: "75%", left: "43%" },
  { house: 10, label: "Knees", top: "75%", left: "57%" },
  { house: 11, label: "Shins and calves", top: "84%", left: "43%" },
  { house: 11, label: "Shins and calves", top: "84%", left: "57%" },
  { house: 12, label: "Feet", top: "93%", left: "45%" },
  { house: 12, label: "Feet", top: "93%", left: "55%" },
];

const DOSHA_TONE: Record<DoshaName, { icon: typeof Sparkles; badge: string }> = {
  Vata: { icon: Sparkles, badge: "bg-emerald-100/70 text-emerald-800" },
  Pitta: { icon: Flame, badge: "bg-[#F7EBE8] text-[#C05A3A]" },
  Kapha: { icon: Leaf, badge: "bg-stone-200/70 text-stone-700" },
};

function getRelativeHouse(sign: number, ascendantSign: number | null) {
  if (ascendantSign === null) return null;
  return ((sign - ascendantSign + 12) % 12) + 1;
}

function planetHouse(planet: PlanetPosition, ascendantSign: number | null, natalHouseForSign: (sign: number) => number | null) {
  return getRelativeHouse(planet.sign, ascendantSign) ?? (planet.house > 0 ? planet.house : natalHouseForSign(planet.sign));
}

function elementForSign(sign: number) {
  if ([0, 4, 8].includes(sign)) return "Fire";
  if ([1, 5, 9].includes(sign)) return "Earth";
  if ([2, 6, 10].includes(sign)) return "Air";
  return "Water";
}

function impactText(zone: AnatomyZone, sign: string, transitPlanets: PlanetPosition[], dosha: DoshaName | null) {
  if (!transitPlanets.length) return "No current transit is activating this zone. Let the natal pattern be a quiet reference for your daily rhythm.";
  const elements = [...new Set(transitPlanets.map((planet) => elementForSign(planet.sign)))].join(" and ");
  const names = transitPlanets.map((planet) => `${planet.name} (${elementForSign(planet.sign)})`).join(", ");
  const guidance = dosha === "Pitta" || elements.includes("Fire") ? "Cooling, spacious routines may help preserve balance." : dosha === "Vata" ? "Warmth, regular meals, and grounding pauses may help settle the current." : "Gentle movement and light, consistent routines may help the energy circulate.";
  return `Transiting ${names} in your House ${zone.house} (${sign}) brings ${elements.toLowerCase()} emphasis to the ${zone.name.toLowerCase()}. ${guidance}`;
}

function Matrix({ planets }: { planets: PlanetPosition[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="border-b border-stone-200 text-[11px] uppercase tracking-[0.14em] text-stone-500">
          <tr>
            <th className="px-4 py-4 font-medium">Element · Dosha</th>
            {MODALITIES.map((modality) => <th key={modality.name} className="px-4 py-4 font-medium">{modality.name} <span className="normal-case tracking-normal">({modality.translation})</span></th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {MATRIX_ROWS.map((row) => (
            <tr key={row.element}>
              <th className={`whitespace-nowrap px-4 py-4 font-medium ${row.className}`}>{row.element} <span className="text-xs font-normal text-stone-500">· {row.dosha}</span></th>
              {MODALITIES.map((modality) => {
                const occupants = planets.filter((planet) => row.signs.some((sign) => sign === planet.sign) && modality.signs.some((sign) => sign === planet.sign));
                return <td key={modality.name} className="px-4 py-4"><div className="flex flex-wrap gap-1.5">{occupants.length ? occupants.map((planet) => <span key={planet.id} className="rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-700">{planet.name}</span>) : <span className="text-stone-300">—</span>}</div></td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AyurvedicAnatomy({
  natalAscendantSign,
  natalHouseForSign,
  birthPlanets,
  transitPlanets,
  transitLoading,
  transitError,
}: {
  natalAscendantSign: number | null;
  natalHouseForSign: (sign: number) => number | null;
  birthPlanets: PlanetPosition[];
  transitPlanets: PlanetPosition[];
  transitLoading: boolean;
  transitError: string | null;
}) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [activeHouse, setActiveHouse] = useState(1);
  const dosha = useMemo(() => calculateDosha(natalAscendantSign, birthPlanets), [natalAscendantSign, birthPlanets]);
  const zone = ZONES[activeHouse - 1];
  const signIndex = natalAscendantSign === null ? null : (natalAscendantSign + activeHouse - 1) % 12;
  const sign = signIndex === null ? "—" : SIGN_NAMES[signIndex];
  const lord = signIndex === null ? "—" : SIGN_LORDS[sign];
  const natalInHouse = birthPlanets.filter((planet) => planetHouse(planet, natalAscendantSign, natalHouseForSign) === activeHouse);
  const transitInHouse = transitPlanets.filter((planet) => planetHouse(planet, natalAscendantSign, natalHouseForSign) === activeHouse);
  const activeMajorTransitHouses = new Set(transitPlanets.filter((planet) => MAJOR_TRANSITS.has(planet.name)).map((planet) => planetHouse(planet, natalAscendantSign, natalHouseForSign)));
  const doshaTone = dosha.dominant ? DOSHA_TONE[dosha.dominant] : DOSHA_TONE.Vata;
  const DominantIcon = doshaTone.icon;
  const isLightTheme = mounted && resolvedTheme === "light";
  const imageSrc = isLightTheme ? "/kalapurusha-light.png" : "/kalapurusha-dark.png";
  const imageAspectRatio = isLightTheme ? "768 / 1446" : "768 / 1376";

  useEffect(() => setMounted(true), []);

  return (
    <section className="space-y-6 rounded-[1.5rem] bg-[#FDFBF7] p-5 text-stone-800 sm:p-7" aria-labelledby="ayurvedic-anatomy-heading">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="ayurvedic-anatomy-heading" className="font-serif text-2xl tracking-wide text-stone-900 sm:text-3xl">Ayurvedic Anatomy &amp; Transit</h2>
          <p className="mt-2 max-w-[62ch] text-sm leading-6 text-stone-600">Read the body as a symbolic map of elemental exchange, with current sky movements held against your natal lagna.</p>
        </div>
        <div className={`flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium uppercase tracking-[0.14em] ${doshaTone.badge}`}><DominantIcon className="size-4" /> {dosha.dominant ? `${dosha.dominant} dominant` : "Chart pending"}</div>
      </header>

      <div>
        <div className="mb-3 flex items-baseline justify-between gap-3"><h3 className="font-serif text-xl tracking-wide text-stone-900">Element &amp; Dosha Matrix</h3><span className="text-xs text-stone-500">Natal placements</span></div>
        <Matrix planets={birthPlanets} />
      </div>

      <div className="grid items-start gap-8 xl:grid-cols-[minmax(210px,0.75fr)_minmax(230px,0.8fr)_minmax(320px,1.25fr)]">
        <div className="order-2 xl:order-1">
          <div className="mb-4 flex items-center justify-between"><h3 className="font-serif text-xl tracking-wide text-stone-900">Anatomical Zones</h3><Activity className="size-4 text-[#C05A3A]" /></div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-2">
            {ZONES.map((item) => <button key={item.house} type="button" onClick={() => setActiveHouse(item.house)} aria-pressed={activeHouse === item.house} className={`rounded-xl px-3 py-3 text-left text-xs transition-colors ${activeHouse === item.house ? "bg-[#C05A3A] text-white shadow-sm" : "bg-white/90 text-stone-600 hover:bg-[#F7EBE8]"}`}><span className="block text-[10px] uppercase tracking-[0.14em] opacity-70">House {item.house}</span><span className="mt-1 block leading-5">{item.name}</span></button>)}
          </div>
        </div>

        <div className="order-1 xl:order-2">
          <div style={{ aspectRatio: imageAspectRatio }} className="relative mx-auto w-full max-w-md overflow-hidden rounded-[1.5rem] border border-stone-200 bg-[#07141d] shadow-[0_16px_34px_rgba(31,53,57,0.14)]">
            <Image src={imageSrc} alt="Kalapurusha elemental anatomy map" fill priority sizes="(min-width: 1280px) 24vw, 90vw" className="object-cover object-center" />
            {ANATOMY_NODES.map((node) => {
              const isActive = node.house === activeHouse;
              const hasMajorTransit = activeMajorTransitHouses.has(node.house);
              return <button key={`${node.house}-${node.top}-${node.left}`} type="button" aria-label={`House ${node.house}: ${node.label}${hasMajorTransit ? ", active major transit" : ""}`} aria-pressed={isActive} onClick={() => setActiveHouse(node.house)} className={`absolute z-10 size-9 -translate-x-1/2 -translate-y-1/2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D8B77A] ${hasMajorTransit ? "animate-pulse shadow-[0_0_15px_rgba(192,90,58,0.75)]" : ""}`} style={{ top: node.top, left: node.left }}><span className={`absolute left-1/2 top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors ${isActive ? "bg-[#C05A3A]" : hasMajorTransit ? "bg-[#D8B77A]" : "bg-white/70"}`} /></button>;
            })}
          </div>
          <p className="mt-3 text-center text-xs uppercase tracking-[0.14em] text-stone-500">Select a point to explore</p>
        </div>

        <aside className="order-3 rounded-2xl border border-stone-200 bg-white/90 p-5 shadow-sm backdrop-blur" aria-live="polite">
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-[10px] uppercase tracking-[0.16em] text-stone-500">Active zone · House {activeHouse}</p><h3 className="mt-1 font-serif text-2xl tracking-wide text-stone-900">{zone.name}</h3><p className="mt-1 text-xs text-stone-500">{zone.focus}</p></div>
            <select aria-label="Select anatomical house" value={activeHouse} onChange={(event) => setActiveHouse(Number(event.target.value))} className="rounded-lg border border-stone-200 bg-stone-50 px-2 py-2 text-xs text-stone-700 xl:hidden">{ZONES.map((item) => <option key={item.house} value={item.house}>House {item.house}</option>)}</select>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-stone-600"><span className="rounded-full bg-stone-100 px-3 py-1.5">House {activeHouse}</span><span className="text-stone-300">→</span><span className="rounded-full bg-stone-100 px-3 py-1.5">{sign} (Rashi)</span><span className="text-stone-300">→</span><span className="rounded-full bg-stone-100 px-3 py-1.5">Ruled by {lord}</span></div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-xl bg-stone-50 p-4"><h4 className="text-xs font-medium uppercase tracking-[0.14em] text-stone-600">Natal status</h4>{natalInHouse.length ? <ul className="mt-3 space-y-2 text-sm text-stone-700">{natalInHouse.map((planet) => <li key={planet.id} className="flex justify-between gap-2"><span>{planet.name}</span><span className="text-xs text-stone-500">{planet.signName}</span></li>)}</ul> : <p className="mt-3 text-sm text-stone-500">No natal placements.</p>}</div>
            <div className="rounded-xl bg-[#F7EBE8] p-4"><div className="flex items-center justify-between gap-2"><h4 className="text-xs font-medium uppercase tracking-[0.14em] text-[#9F4A32]">Current transit</h4>{transitLoading && <span className="text-[10px] text-[#9F4A32]">Updating…</span>}</div>{transitError ? <p className="mt-3 text-sm text-[#9F4A32]">{transitError}</p> : transitInHouse.length ? <ul className="mt-3 space-y-2 text-sm text-stone-700">{transitInHouse.map((planet) => <li key={planet.id} className="flex justify-between gap-2"><span>{planet.name}</span><span className="text-xs text-[#9F4A32]">{planet.signName}</span></li>)}</ul> : <p className="mt-3 text-sm text-stone-600">No current placements.</p>}</div>
          </div>
          <div className="mt-4 border-t border-stone-200 pt-4"><h4 className="text-xs font-medium uppercase tracking-[0.14em] text-stone-600">Elemental / Ayurvedic impact</h4><p className="mt-2 text-sm leading-6 text-stone-600">{impactText(zone, sign, transitInHouse, dosha.dominant)}</p></div>
        </aside>
      </div>
      <p className="border-t border-stone-200 pt-4 text-center text-[11px] leading-5 tracking-wide text-stone-500">Ayurvedic correspondences are traditional philosophical reflections on elemental balance and are not medical advice.</p>
    </section>
  );
}
