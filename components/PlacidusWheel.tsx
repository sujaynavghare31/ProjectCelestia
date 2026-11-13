"use client";

import type { CelestialLanguage, EphemerisResponse, PlanetPosition, ViewPreferences } from "@/lib/kundali-types";
import { useKundaliStore } from "@/lib/kundali-store";
import { planetName, signName } from "@/lib/astrology/localization";

const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const SIGN_GLYPHS = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"];
const PLANET_GLYPHS: Record<string, string> = {
  Sun: "☉", Moon: "☽", Mars: "♂", Mercury: "☿", Jupiter: "♃", Venus: "♀",
  Saturn: "♄", Rahu: "☊", Ketu: "☋", Uranus: "♅", Neptune: "♆", Pluto: "♇",
  Ascendant: "ASC", Chiron: "⚷", Lilith: "⚸", "Part of Fortune": "⊗", Mandi: "Ma", Gulika: "Gu",
};
const SIGN_COLORS = ["#dc6b5b", "#6d9a69", "#bd9849", "#5b8cad"];
const ASPECTS = [
  { angle: 0, orb: 8, color: "hsl(var(--chart-3))" },
  { angle: 60, orb: 5, color: "hsl(var(--chart-2))" },
  { angle: 90, orb: 6, color: "hsl(var(--chart-4))" },
  { angle: 120, orb: 6, color: "hsl(var(--chart-1))" },
  { angle: 180, orb: 8, color: "hsl(var(--chart-5))" },
];

type WheelBody = PlanetPosition & { transit: boolean };
type Point = { x: number; y: number };

function normalizeDegrees(degrees: number) {
  return ((degrees % 360) + 360) % 360;
}

function angularDistance(first: number, second: number) {
  const difference = normalizeDegrees(first - second);
  return Math.min(difference, 360 - difference);
}

function getNavamsaSign(position: PlanetPosition) {
  const segment = Math.min(8, Math.floor(position.degree / (30 / 9)));
  const signStart = position.sign % 3 === 0
    ? position.sign
    : position.sign % 3 === 1
      ? position.sign + 8
      : position.sign + 4;
  return ((signStart + segment) % 12 + 12) % 12;
}

function getBodyText(body: WheelBody, language: CelestialLanguage, usePlanetIcons: boolean) {
  const name = usePlanetIcons
    ? PLANET_GLYPHS[body.name] ?? body.symbol
    : planetName(body.name, language, body.name);
  return `${body.transit ? "T " : ""}${name}${body.motion === "R" ? "R" : ""}`;
}

function ringSegmentPath(start: Point, end: Point, innerEnd: Point, innerStart: Point, outerRadius: number, innerRadius: number, sweep: 0 | 1) {
  return `M ${start.x} ${start.y} A ${outerRadius} ${outerRadius} 0 0 ${sweep} ${end.x} ${end.y} L ${innerEnd.x} ${innerEnd.y} A ${innerRadius} ${innerRadius} 0 0 ${sweep === 0 ? 1 : 0} ${innerStart.x} ${innerStart.y} Z`;
}

function PlacidusWheel({
  ascendant,
  planets,
  points,
  cusps,
  referenceHouse,
  overlay,
  language,
  preferences,
}: {
  ascendant: PlanetPosition;
  planets: PlanetPosition[];
  points: PlanetPosition[];
  cusps: EphemerisResponse["houseCusps"];
  referenceHouse: number;
  overlay?: PlanetPosition[];
  language: CelestialLanguage;
  preferences: ViewPreferences;
}) {
  const hoveredPlanet = useKundaliStore((state) => state.hoveredPlanet);
  const setHoveredPlanet = useKundaliStore((state) => state.setHoveredPlanet);
  const referenceLongitude = cusps.find((cusp) => cusp.house === referenceHouse)?.longitude ?? ascendant.longitude;
  const pointAt = (longitude: number, radius: number): Point => {
    const radians = (180 + normalizeDegrees(longitude - referenceLongitude)) * Math.PI / 180;
    return { x: 400 + radius * Math.cos(radians), y: 400 - radius * Math.sin(radians) };
  };
  const visiblePlanets = planets.filter((planet) => (
    (preferences.showOuterPlanets || !["Uranus", "Neptune", "Pluto"].includes(planet.name))
    && (preferences.showAsteroids || !["Chiron", "Lilith"].includes(planet.name))
  ));
  const visiblePoints = points.filter((planet) => {
    if (planet.name === "Part of Fortune") return preferences.showFortune;
    if (planet.name === "Mandi" || planet.name === "Gulika") return preferences.showUpagrahas;
    if (planet.name === "Chiron" || planet.name === "Lilith") return preferences.showAsteroids;
    return true;
  });
  const chartBodies: WheelBody[] = [
    ...visiblePlanets.map((planet) => ({ ...planet, transit: false })),
    ...visiblePoints.map((planet) => ({ ...planet, transit: false })),
    ...(overlay ?? [])
      .filter((planet) => (
        (preferences.showOuterPlanets || !["Uranus", "Neptune", "Pluto"].includes(planet.name))
        && (preferences.showAsteroids || !["Chiron", "Lilith"].includes(planet.name))
      ))
      .map((planet) => ({ ...planet, transit: true })),
  ];
  const sortedCusps = Array.from({ length: 12 }, (_, index) => (
    cusps.find((cusp) => cusp.house === index + 1)
  )).filter((cusp): cusp is EphemerisResponse["houseCusps"][number] => cusp !== undefined);
  const aspectLines: Array<{ key: string; from: Point; to: Point; color: string }> = [];
  for (let first = 0; first < visiblePlanets.length; first += 1) {
    for (let second = first + 1; second < visiblePlanets.length; second += 1) {
      const from = visiblePlanets[first];
      const to = visiblePlanets[second];
      const separation = angularDistance(from.longitude, to.longitude);
      const aspect = ASPECTS
        .map((candidate) => ({ ...candidate, orbDifference: Math.abs(separation - candidate.angle) }))
        .filter((candidate) => candidate.orbDifference <= candidate.orb)
        .sort((left, right) => left.orbDifference - right.orbDifference)[0];
      if (aspect) {
        aspectLines.push({
          key: `${from.id}-${to.id}`,
          from: pointAt(from.longitude, 148),
          to: pointAt(to.longitude, 148),
          color: aspect.color,
        });
      }
    }
  }

  return (
    <svg
      viewBox="0 0 800 800"
      className="absolute inset-0 h-full w-full object-contain"
      role="img"
      aria-label={`Placidus chart with ${referenceHouse === 1 ? "Ascendant" : `House ${referenceHouse}`} as reference lagna at nine o'clock`}
    >
      <circle cx="400" cy="400" r="374" fill="hsl(var(--card))" stroke="hsl(var(--chart-grid))" strokeWidth="1.5" />
      {Array.from({ length: 12 }, (_, sign) => {
        const start = pointAt(sign * 30, 374);
        const end = pointAt((sign + 1) * 30, 374);
        const innerEnd = pointAt((sign + 1) * 30, 326);
        const innerStart = pointAt(sign * 30, 326);
        const label = pointAt(sign * 30 + 15, 350);
        return (
          <g key={`zodiac-${sign}`} aria-label={signName(SIGNS[sign], language)}>
            <path
              d={ringSegmentPath(start, end, innerEnd, innerStart, 374, 326, 0)}
              className={[
                "fill-rose-100/70 dark:fill-rose-950/35",
                "fill-emerald-100/70 dark:fill-emerald-950/35",
                "fill-amber-100/70 dark:fill-amber-950/35",
                "fill-sky-100/70 dark:fill-sky-950/35",
              ][sign % 4]}
              stroke="hsl(var(--chart-grid))"
              strokeWidth="1.25"
            />
            <text x={label.x} y={label.y + 7} fill={SIGN_COLORS[sign % 4]} fontFamily="serif" fontSize="28" fontWeight="600" textAnchor="middle">
              {`${SIGN_GLYPHS[sign]}\uFE0E`}
            </text>
          </g>
        );
      })}
      <circle cx="400" cy="400" r="326" fill="none" stroke="hsl(var(--chart-grid))" strokeWidth="1.5" />
      {Array.from({ length: 360 }, (_, degree) => {
        const major = degree % 10 === 0;
        const medium = degree % 5 === 0;
        const start = pointAt(degree, 326);
        const end = pointAt(degree, major ? 310 : medium ? 314 : 319);
        return (
          <line
            key={`tick-${degree}`}
            x1={start.x}
            y1={start.y}
            x2={end.x}
            y2={end.y}
            stroke={major ? "hsl(var(--muted-foreground))" : "hsl(var(--chart-grid))"}
            strokeWidth={major ? 1.6 : medium ? 1.1 : 0.75}
          />
        );
      })}
      <circle cx="400" cy="400" r="310" fill="none" stroke="hsl(var(--chart-grid))" strokeWidth="1" />
      {sortedCusps.map((cusp, index) => {
        const next = sortedCusps[(index + 1) % sortedCusps.length];
        const span = normalizeDegrees(next.longitude - cusp.longitude);
        const midpoint = cusp.longitude + span / 2;
        const middleSign = Math.floor(normalizeDegrees(midpoint) / 30);
        const start = pointAt(cusp.longitude, 310);
        const end = pointAt(next.longitude, 310);
        const innerEnd = pointAt(next.longitude, 244);
        const innerStart = pointAt(cusp.longitude, 244);
        const label = pointAt(midpoint, 276);
        const segmentLabel = pointAt(midpoint, 258);
        const relativeHouse = ((cusp.house - referenceHouse + 12) % 12) + 1;
        const majorCusp = [1, 4, 7, 10].includes(cusp.house);
        const largeArc = span > 180 ? 1 : 0;
        return (
          <g key={`house-${cusp.house}`}>
            <path
              d={`M ${start.x} ${start.y} A 310 310 0 ${largeArc} 0 ${end.x} ${end.y} L ${innerEnd.x} ${innerEnd.y} A 244 244 0 ${largeArc} 1 ${innerStart.x} ${innerStart.y} Z`}
              className={[
                "fill-rose-50/65 dark:fill-rose-950/20",
                "fill-emerald-50/65 dark:fill-emerald-950/20",
                "fill-amber-50/65 dark:fill-amber-950/20",
                "fill-sky-50/65 dark:fill-sky-950/20",
              ][middleSign % 4]}
              stroke="hsl(var(--chart-grid))"
              strokeWidth="1"
            />
            <line
              x1={start.x}
              y1={start.y}
              x2={innerStart.x}
              y2={innerStart.y}
              stroke={majorCusp ? "hsl(var(--champagne-gold))" : "hsl(var(--chart-grid))"}
              strokeWidth={majorCusp ? 2.4 : 1}
            />
            {preferences.showHouseLabels && (
              <text x={label.x} y={label.y + 4} fill={relativeHouse === 1 ? "hsl(var(--champagne-gold))" : "hsl(var(--muted-foreground))"} fontSize="16" fontWeight="600" textAnchor="middle">
                H{relativeHouse}
              </text>
            )}
            {majorCusp && (
              <text x={segmentLabel.x} y={segmentLabel.y + 4} fill="hsl(var(--champagne-gold))" fontSize="14" fontWeight="700" textAnchor="middle">
                {cusp.house === 1 ? "ASC" : cusp.house === 4 ? "IC" : cusp.house === 7 ? "DSC" : "MC"}
              </text>
            )}
          </g>
        );
      })}
      <circle cx="400" cy="400" r="244" fill="none" stroke="hsl(var(--chart-grid))" strokeWidth="1.5" />
      {preferences.showEqualHouses && Array.from({ length: 12 }, (_, index) => {
        const longitude = ascendant.longitude + index * 30;
        const start = pointAt(longitude, 244);
        const end = pointAt(longitude, 226);
        return <line key={`equal-house-${index}`} x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 4" strokeWidth="1" />;
      })}
      <circle cx="400" cy="400" r="154" fill="hsl(var(--card))" fillOpacity="0.7" stroke="hsl(var(--chart-grid))" strokeWidth="1" />
      {aspectLines.map((aspect) => (
        <line
          key={aspect.key}
          x1={aspect.from.x}
          y1={aspect.from.y}
          x2={aspect.to.x}
          y2={aspect.to.y}
          stroke={aspect.color}
          strokeOpacity="0.58"
          strokeWidth="1.4"
        />
      ))}
      {chartBodies.map((body, index) => {
        const nearby = chartBodies
          .map((candidate, candidateIndex) => ({ candidate, candidateIndex }))
          .filter(({ candidate }) => angularDistance(candidate.longitude, body.longitude) < 7);
        const rank = nearby.findIndex(({ candidateIndex }) => candidateIndex === index);
        const widths = nearby.map(({ candidate }) => Math.max(24, getBodyText(candidate, language, preferences.usePlanetIcons).length * 9));
        const offset = widths.slice(0, rank).reduce((sum, width) => sum + width, 0)
          + widths[rank] / 2
          - widths.reduce((sum, width) => sum + width, 0) / 2;
        const angle = (180 + normalizeDegrees(body.longitude - referenceLongitude)) * Math.PI / 180;
        const base = pointAt(body.longitude, 218);
        const label = { x: base.x - Math.sin(angle) * offset, y: base.y - Math.cos(angle) * offset };
        const name = body.transit ? `T ${planetName(body.name, language, body.name)}` : planetName(body.name, language, body.name);
        const glyph = PLANET_GLYPHS[body.name] ?? body.symbol;
        const display = preferences.usePlanetIcons ? glyph : name;
        const retrograde = body.motion === "R";
        const vargottama = body.name !== "Ascendant" && body.sign === getNavamsaSign(body);
        const highlighted = hoveredPlanet === null
          || body.name === hoveredPlanet
          || (hoveredPlanet === "Vargottama" && vargottama);
        const color = body.transit
          ? "hsl(var(--champagne-gold))"
          : ["Sun", "Moon", "Ascendant"].includes(body.name)
            ? "hsl(var(--champagne-gold))"
            : ["Uranus", "Neptune", "Pluto", "Chiron", "Lilith"].includes(body.name)
              ? "hsl(var(--muted-foreground))"
              : "hsl(var(--foreground))";
        return (
          <g
            key={`${body.id}-${body.transit ? "transit" : "natal"}`}
            opacity={highlighted ? 1 : 0.35}
            filter={highlighted && hoveredPlanet !== null ? "drop-shadow(0 0 6px hsl(var(--champagne-gold)))" : undefined}
            onMouseEnter={() => setHoveredPlanet(body.name)}
            onMouseLeave={() => setHoveredPlanet(null)}
          >
            {retrograde && <title>Retrograde motion</title>}
            {vargottama && <ellipse cx={label.x} cy={label.y - 4} rx={Math.max(14, display.length * 4.5)} ry="12" fill="none" stroke="hsl(var(--champagne-gold))" strokeWidth="1.5" />}
            <text x={label.x} y={label.y} fill={color} stroke="hsl(var(--card))" strokeWidth="3" strokeLinejoin="round" paintOrder="stroke" fontSize={preferences.usePlanetIcons ? "18" : "16"} fontWeight="600" textAnchor="middle">
              {display}{retrograde && <tspan fill="hsl(var(--retrograde-crimson))" fontSize="9" fontWeight="800" dy="-4">R</tspan>}
            </text>
          </g>
        );
      })}
      <circle cx="400" cy="400" r="3" fill="hsl(var(--champagne-gold))" />
      <text x="400" y="390" fill="hsl(var(--muted-foreground))" fontSize="12" textAnchor="middle">{signName(ascendant.signName, language)}</text>
      <text x="400" y="410" fill="hsl(var(--muted-foreground))" fontSize="11" textAnchor="middle">{`${Math.floor(ascendant.longitude % 30)}° ASC`}</text>
    </svg>
  );
}

export default PlacidusWheel;
