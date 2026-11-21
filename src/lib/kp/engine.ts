// ---------------------------------------------------------------------------
// KP engine — planets & cusps table, significators (4-level), Nadi significators,
// cusp significators (A/B/C/D), aspects, ruling planets, bhava-chalit, transit, Vimshottari.
// Pure TypeScript. All longitudes SIDEREAL (KP ayanamsa) in degrees.
// ---------------------------------------------------------------------------
import { ABBR, DASHA_ORDER, GRAHAS, OUTERS, ROMAN, SIGN_LORD, WEEKDAY_LORD, norm360, type Body, type Graha, type Outer } from "./constants";
import { kpLords, dmsInSign, type KpLords } from "./lords";
import { ASPECT_ANGLES, DEFAULT_ASPECTS, aspectDistance, conjunct, orbOf, type AspectOptions } from "./aspects";
import { kpCusps, utcMillis, type BirthMoment } from "./placidus";
import { dashaAt, dashaBalance, vimshottari, vimshottariFromMoment, type DashaOptions } from "./dasha";

export interface PlanetInput { longitude: number; speed?: number; retrograde?: boolean }
export interface KpInput {
  /** Sidereal longitudes (KP ayanamsa). Ketu optional (= Rahu + 180). Uranus/Neptune/Pluto optional. */
  planets: Partial<Record<Graha | Outer, PlanetInput | number>> & { Sun: PlanetInput | number; Moon: PlanetInput | number; Rahu: PlanetInput | number };
  /** 12 sidereal Placidus cusps (house 1..12). If omitted, give `birth` + `ayanamsa` and they are computed. */
  cusps?: number[];
  birth?: BirthMoment;
  ayanamsa?: number;
  /** Use geocentric latitude for computed cusps (default true, like KP softwares). */
  geocentricLatitude?: boolean;
  /** Local weekday (0 = Sunday) of the chart day — KP day starts at sunrise; pass the vedic weekday. If omitted it is derived from birth date/time and `sunrise`. */
  weekday?: number;
  /** "HH:MM" local sunrise used to decide the vedic weekday (default "06:00"). */
  sunrise?: string;
  aspects?: AspectOptions;
  dasha?: DashaOptions;
}

export interface PlanetRow extends KpLords {
  body: Body; abbr: string; retrograde: boolean; degreeText: string;
  occupies: number;                 // bhava (cusp-to-cusp) house
  owns: number[];                   // houses whose cusp sign is ruled by this planet
  significators: number[];          // 4-level KP significators (A..D order, unique)
  levels: { a: number[]; b: number[]; c: number[]; d: number[] };
  nadi: number[];                   // Nadi significators (own occupation + ownership; nodes add agents)
  starLordOfCusps: number[]; subLordOfCusps: number[];
  conjunctOrAspectedBy: Body[]; aspectsTo: (Body | string)[];
  selfStar: boolean;                // "#" planet in its own star
  noPlanetInStar: boolean;          // "*" no planet in its star
}

const lonOf = (p: PlanetInput | number) => (typeof p === "number" ? p : p.longitude);
const retroOf = (p: PlanetInput | number, b: Body) =>
  b === "Rahu" || b === "Ketu" ? true : typeof p === "number" ? false : p.retrograde ?? (p.speed !== undefined ? p.speed < 0 : false);
const uniq = <T,>(a: T[]) => [...new Set(a)];

/** Bhava (house) of a longitude: house n runs from cusp n up to (not incl.) cusp n+1. */
export function bhavaOf(lon: number, cusps: number[]): number {
  const L = norm360(lon);
  for (let h = 0; h < 12; h++) {
    const s = norm360(cusps[h]), span = norm360(cusps[(h + 1) % 12] - s);
    if (norm360(L - s) < span) return h + 1;
  }
  return 12;
}

export function kpChart(input: KpInput) {
  const ao = { ...DEFAULT_ASPECTS, ...input.aspects };
  const cusps = input.cusps ?? (input.birth && input.ayanamsa != null ? kpCusps(input.birth, input.ayanamsa, { geocentricLatitude: input.geocentricLatitude }) : null);
  if (!cusps || cusps.length !== 12) throw new Error("Give 12 sidereal cusps, or birth + ayanamsa");

  // ---- positions
  const raw: Partial<Record<Body, PlanetInput | number>> = { ...input.planets };
  if (raw.Ketu === undefined) raw.Ketu = norm360(lonOf(raw.Rahu!) + 180);
  const bodies = [...GRAHAS, ...OUTERS.filter((o) => raw[o] !== undefined)] as Body[];
  const lon: Partial<Record<Body, number>> = {};
  for (const b of bodies) lon[b] = norm360(lonOf(raw[b]!));
  // Part of Fortune = Asc + Moon − Sun
  lon.Fortuna = norm360(cusps[0] + lon.Moon! - lon.Sun!);

  const occ = (b: Body) => bhavaOf(lon[b]!, cusps);
  const cuspLords = cusps.map((c) => kpLords(c));
  const owns = (g: Body) => cuspLords.map((c, i) => (c.signLord === g ? i + 1 : 0)).filter(Boolean);
  const lordsOf: Partial<Record<Body, KpLords>> = {};
  for (const b of [...bodies, "Fortuna" as Body]) lordsOf[b] = kpLords(lon[b]!);
  const inStarOf = (g: Graha) => GRAHAS.filter((p) => lordsOf[p]!.starLord === g);

  // ---- aspects (planets & cusps)
  const receivedBy = (target: Body): Body[] => bodies.filter((b) => b !== target && (
    conjunct(b, lon[b]!, target, lon[target]!, ao) || aspectDistance(b, lon[b]!, lon[target]!) <= orbOf(b, ao)));
  const aspectsTo = (from: Body): (Body | string)[] => {
    const res: (Body | string)[] = [];
    for (const t of bodies) if (t !== from && aspectDistance(from, lon[from]!, lon[t]!) <= orbOf(from, ao)) res.push(t);
    cusps.forEach((c, i) => { if (aspectDistance(from, lon[from]!, c) <= orbOf(from, ao)) res.push(i === 0 ? "Asc" : ROMAN[i]); });
    return res;
  };

  // ---- 4-level significators
  const level = (g: Graha) => {
    const st = lordsOf[g]!.starLord;
    const a = [occ(st)], b = [occ(g)], c = owns(st), d = owns(g);
    return { a, b, c, d, all: uniq([...a, ...b, ...c, ...d]) };
  };
  // ---- Nadi: own occupation + own ownership; nodes also represent sign lord + conjoined/aspecting planets
  const nadiBase = (g: Body) => uniq([occ(g), ...owns(g)]).sort((x, y) => x - y);
  const nadi = (g: Body): number[] => {
    if (g !== "Rahu" && g !== "Ketu") return nadiBase(g);
    const agents: Body[] = [SIGN_LORD[lordsOf[g]!.signIndex], ...receivedBy(g).filter((b): b is Graha => (GRAHAS as Body[]).includes(b) && b !== "Rahu" && b !== "Ketu")];
    return uniq([occ(g), ...agents.flatMap(nadiBase)]).sort((x, y) => x - y);
  };

  const planetRows: PlanetRow[] = [...bodies, "Fortuna" as Body].map((b) => {
    const L = lordsOf[b]!;
    const isG = (GRAHAS as Body[]).includes(b);
    const lv = isG ? level(b as Graha) : { a: [], b: [], c: [], d: [], all: [] as number[] };
    return {
      ...L, body: b, abbr: ABBR[b], retrograde: b === "Fortuna" ? false : retroOf(raw[b]!, b), degreeText: dmsInSign(lon[b]!),
      occupies: occ(b), owns: isG ? owns(b) : [],
      significators: lv.all, levels: { a: lv.a, b: lv.b, c: lv.c, d: lv.d },
      nadi: isG ? nadi(b) : [],
      starLordOfCusps: cuspLords.map((c, i) => (c.starLord === b ? i + 1 : 0)).filter(Boolean),
      subLordOfCusps: cuspLords.map((c, i) => (c.subLord === b ? i + 1 : 0)).filter(Boolean),
      conjunctOrAspectedBy: b === "Fortuna" ? [] : receivedBy(b),
      aspectsTo: b === "Fortuna" ? [] : aspectsTo(b),
      selfStar: isG && L.starLord === b,
      noPlanetInStar: isG && inStarOf(b as Graha).length === 0,
    };
  });

  // ---- cusp table
  const occupantsOf = (h: number) => GRAHAS.filter((g) => occ(g) === h).sort((x, y) => norm360(lon[x]! - cusps[h - 1]) - norm360(lon[y]! - cusps[h - 1]));
  const cuspRows = cusps.map((c, i) => {
    const h = i + 1, L = cuspLords[i];
    const B = occupantsOf(h);
    const A = uniq(B.flatMap((o) => inStarOf(o)));
    const C = inStarOf(L.signLord);
    const D = [L.signLord];
    const aspBy = bodies.filter((b) => aspectDistance(b, lon[b]!, c) <= orbOf(b, ao));
    const cuspal = bodies.filter((b) => aspectDistance(b, lon[b]!, c) <= ao.cuspalOrb);
    return {
      house: h, roman: ROMAN[i], ...L, degreeText: dmsInSign(c),
      a: A, b: B, c: C, d: D, significators: uniq([...A, ...B, ...C, ...D]),
      aspectedBy: aspBy, cuspalAspect: cuspal,
    };
  });

  // ---- nadi table (planet, its star lord, its sub lord — each with their nadi houses)
  const nadiRows = GRAHAS.map((g) => {
    const r = planetRows.find((p) => p.body === g)!;
    const sl = r.starLord, sub = r.subLord;
    return { planet: g, mark: r.selfStar ? "#" : r.noPlanetInStar ? "*" : "", significators: r.nadi,
      starLord: sl, starLordSignificators: planetRows.find((p) => p.body === sl)!.nadi,
      subLord: sub, subLordSignificators: planetRows.find((p) => p.body === sub)!.nadi };
  });

  // ---- ruling planets (moment of the chart)
  const weekday = input.weekday ?? (input.birth ? vedicWeekday(input.birth.date, input.birth.time, input.sunrise ?? "06:00") : null);
  const ruling = rulingPlanets(lon.Moon!, cusps[0], weekday, lon.Rahu!, lon.Ketu!);

  // ---- dasha
  const birthMs = input.birth ? utcMillis(input.birth.date, input.birth.time, input.birth.tzHours) : null;
  const dasha = birthMs != null
    ? vimshottariFromMoment(lon.Moon!, birthMs, input.dasha)
    : null;

  return {
    cusps: cuspRows, planets: planetRows, nadi: nadiRows, ruling, dasha,
    bhavaChalit: Object.fromEntries(Array.from({ length: 12 }, (_, i) => [i + 1, [...bodies].filter((b) => occ(b) === i + 1)])) as Record<number, Body[]>,
    fortuna: lon.Fortuna!,
    options: { aspects: ao },
    notes: [
      "# = planet in its own star, * = no planet in its star. Significators: A occupation of star lord, B occupation of planet, C houses owned by star lord, D houses owned by planet.",
      "Cusp significators: A planets in the star of occupants, B occupants, C planets in the star of the cusp sign lord, D cusp sign lord.",
      "Aspects: Vedic graha-drishti measured in degrees (Mars 4/7/8, Jupiter 5/7/9, Saturn 3/7/10, others 7th), orb 8° (outer planets 5°). Nodes only conjoin.",
    ],
  };
}

/** Vedic weekday (0 = Sunday): before sunrise it is still the previous day. */
export function vedicWeekday(date: string, time: string, sunrise = "06:00"): number {
  const [y, m, d] = date.split("-").map(Number);
  const toMin = (t: string) => { const [h, mi] = t.split(":").map(Number); return h * 60 + mi; };
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return toMin(time) < toMin(sunrise) ? (wd + 6) % 7 : wd;
}

/** KP Ruling Planets: day lord, Moon sign/star/sub lords, Lagna sign/star/sub lords, + nodes whose sign lord is an RP. */
export function rulingPlanets(moonLon: number, ascLon: number, weekday: number | null, rahuLon: number, ketuLon: number) {
  const mo = kpLords(moonLon), as = kpLords(ascLon);
  const dayLord = weekday == null ? null : WEEKDAY_LORD[weekday];
  const core: Graha[] = [mo.signLord, mo.starLord, mo.subLord, as.signLord, as.starLord, as.subLord, ...(dayLord ? [dayLord] : [])];
  const nodes: Graha[] = [];
  if (core.includes(SIGN_LORD[Math.floor(norm360(rahuLon) / 30)])) nodes.push("Rahu");
  if (core.includes(SIGN_LORD[Math.floor(norm360(ketuLon) / 30)])) nodes.push("Ketu");
  // strength order used by KP: Asc star > Asc sign > Moon star > Moon sign > day lord (sub lords last)
  const ordered = uniq([as.starLord, as.signLord, mo.starLord, mo.signLord, ...(dayLord ? [dayLord] : []), as.subLord, mo.subLord, ...nodes]);
  return {
    dayLord, moon: { sign: mo.signLord, star: mo.starLord, sub: mo.subLord }, asc: { sign: as.signLord, star: as.starLord, sub: as.subLord },
    nodes, all: ordered,
  };
}

/** Transit: current planets placed in the NATAL cusps (house number), with KP lords. */
export function kpTransit(transitPlanets: KpInput["planets"], natalCusps: number[]) {
  const raw: Partial<Record<Body, PlanetInput | number>> = { ...transitPlanets };
  if (raw.Ketu === undefined) raw.Ketu = norm360(lonOf(raw.Rahu!) + 180);
  return ([...GRAHAS, ...OUTERS] as Body[]).filter((b) => raw[b] !== undefined).map((b) => {
    const L = kpLords(lonOf(raw[b]!));
    return { body: b, ...L, degreeText: dmsInSign(L.longitude), retrograde: retroOf(raw[b]!, b), natalHouse: bhavaOf(L.longitude, natalCusps) };
  });
}

export { dashaAt, dashaBalance, vimshottari, vimshottariFromMoment, kpLords, kpCusps, ASPECT_ANGLES, DASHA_ORDER };
