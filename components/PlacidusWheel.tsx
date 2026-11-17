"use client";

import type { CelestialLanguage, EphemerisResponse, PlanetPosition, ViewPreferences } from "@/lib/kundali-types";
import { useKundaliStore } from "@/lib/kundali-store";
import { formatPlanetDegree, planetChartDisplayName, planetChartName, signName } from "@/lib/astrology/localization";
import { cuspLabels } from "@/lib/astrology/cusp-labels";

const CENTER = 500;
const ZODIAC_OUTER_RADIUS = 472;
const ZODIAC_INNER_RADIUS = 400;
const DEGREE_RADIUS = 389;
const HOUSE_OUTER_RADIUS = 374;
const HOUSE_INNER_RADIUS = 238;
const ASPECT_RADIUS = 184;
const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const SIGN_GLYPHS = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"];
const PLANET_GLYPHS: Record<string, string> = {
  Sun: "☉", Moon: "☽", Mars: "♂", Mercury: "☿", Jupiter: "♃", Venus: "♀",
  Saturn: "♄", Rahu: "☊", Ketu: "☋", Uranus: "♅", Neptune: "♆", Pluto: "♇",
  Ascendant: "ASC", Chiron: "⚷", Lilith: "⚸", "Part of Fortune": "⊗", Mandi: "Ma", Gulika: "Gu",
};
const ELEMENT_GRADIENTS = [
  { id: "fire-glow", signs: [0, 4, 8], color: "#fb7185" },
  { id: "earth-glow", signs: [1, 5, 9], color: "#84cc16" },
  { id: "air-glow", signs: [2, 6, 10], color: "#38bdf8" },
  { id: "water-glow", signs: [3, 7, 11], color: "#2dd4bf" },
];
const ASPECTS = [
  { angle: 0, orb: 8, color: "#b99a62" },
  { angle: 60, orb: 5, color: "#56a8a5" },
  { angle: 90, orb: 6, color: "#e47783" },
  { angle: 120, orb: 6, color: "#72b89d" },
  { angle: 180, orb: 8, color: "#df6f7a" },
];

type WheelBody = PlanetPosition & { transit: boolean };
type Point = { x: number; y: number };
type AspectLine = { key: string; from: Point; to: Point; color: string };
type BodyPlacement = { body: WheelBody; point: Point; degreePoint: Point };

function normalizeDegrees(degrees: number) {
  return ((degrees % 360) + 360) % 360;
}

function polarToCartesian(longitude: number, radius: number, referenceLongitude: number): Point {
  const radians = (180 + normalizeDegrees(longitude - referenceLongitude)) * Math.PI / 180;
  return {
    x: CENTER + radius * Math.cos(radians),
    y: CENTER - radius * Math.sin(radians),
  };
}

function angularDistance(first: number, second: number) {
  const difference = normalizeDegrees(first - second);
  return Math.min(difference, 360 - difference);
}

function ringSegmentPath(startLongitude: number, endLongitude: number, outerRadius: number, innerRadius: number, referenceLongitude: number) {
  const start = polarToCartesian(startLongitude, outerRadius, referenceLongitude);
  const end = polarToCartesian(endLongitude, outerRadius, referenceLongitude);
  const innerEnd = polarToCartesian(endLongitude, innerRadius, referenceLongitude);
  const innerStart = polarToCartesian(startLongitude, innerRadius, referenceLongitude);
  const span = normalizeDegrees(endLongitude - startLongitude);
  const largeArc = span > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${outerRadius} ${outerRadius} 0 ${largeArc} 0 ${end.x} ${end.y} L ${innerEnd.x} ${innerEnd.y} A ${innerRadius} ${innerRadius} 0 ${largeArc} 1 ${innerStart.x} ${innerStart.y} Z`;
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

function bodyName(body: WheelBody, language: CelestialLanguage, usePlanetIcons: boolean) {
  return planetChartDisplayName(body.name, language, usePlanetIcons, PLANET_GLYPHS[body.name] ?? body.symbol, body.name);
}

function getBodyPlacements(bodies: WheelBody[], referenceLongitude: number): BodyPlacement[] {
  const sorted = bodies
    .map((body, index) => ({ body, index }))
    .sort((left, right) => normalizeDegrees(left.body.longitude) - normalizeDegrees(right.body.longitude));
  const placed: Point[] = [];
  const radialSlots = [320, 344, 296, 368, 272, 382, 248, 396, 224, 410, 200];
  const angularOffsets = [0, -1.2, 1.2, -2.4, 2.4, -3.6, 3.6, -4.8, 4.8, -6, 6];
  const placements = new Map<number, BodyPlacement>();

  for (const { body, index } of sorted) {
    let point: Point | undefined;
    for (const angularOffset of angularOffsets) {
      for (const radius of radialSlots) {
        const candidate = polarToCartesian(body.longitude + angularOffset, radius, referenceLongitude);
        if (placed.every((other) => Math.hypot(candidate.x - other.x, candidate.y - other.y) >= 23)) {
          point = candidate;
          break;
        }
      }
      if (point) break;
    }

    point ??= polarToCartesian(body.longitude, 320, referenceLongitude);
    placed.push(point);
    const displayPoint = body.transit ? { x: point.x, y: point.y + 10 } : point;
    placements.set(index, {
      body,
      point: displayPoint,
      degreePoint: polarToCartesian(body.longitude, DEGREE_RADIUS, referenceLongitude),
    });
  }

  return bodies.map((_, index) => placements.get(index)!);
}

function getAspectLines(planets: PlanetPosition[], referenceLongitude: number): AspectLine[] {
  const lines: AspectLine[] = [];
  for (let first = 0; first < planets.length; first += 1) {
    for (let second = first + 1; second < planets.length; second += 1) {
      const from = planets[first];
      const to = planets[second];
      const separation = angularDistance(from.longitude, to.longitude);
      const aspect = ASPECTS
        .map((candidate) => ({ ...candidate, difference: Math.abs(separation - candidate.angle) }))
        .filter((candidate) => candidate.difference <= candidate.orb)
        .sort((left, right) => left.difference - right.difference)[0];
      if (!aspect) continue;

      lines.push({
        key: `${from.id}-${to.id}`,
        from: polarToCartesian(from.longitude, ASPECT_RADIUS, referenceLongitude),
        to: polarToCartesian(to.longitude, ASPECT_RADIUS, referenceLongitude),
        color: aspect.color,
      });
    }
  }
  return lines;
}

function PlacidusWheel({
  ascendant,
  planets,
  points,
  cusps,
  referenceHouse,
  overlay,
  labelPlanetsAsTransit = false,
  language,
  preferences,
}: {
  ascendant: PlanetPosition;
  planets: PlanetPosition[];
  points: PlanetPosition[];
  cusps: EphemerisResponse["houseCusps"];
  referenceHouse: number;
  overlay?: PlanetPosition[];
  labelPlanetsAsTransit?: boolean;
  language: CelestialLanguage;
  preferences: ViewPreferences;
}) {
  const hoveredPlanet = useKundaliStore((state) => state.hoveredPlanet);
  const setHoveredPlanet = useKundaliStore((state) => state.setHoveredPlanet);
  const referenceLongitude = cusps.find((cusp) => cusp.house === referenceHouse)?.longitude ?? ascendant.longitude;
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
    ...visiblePlanets.map((planet) => ({ ...planet, transit: labelPlanetsAsTransit && planet.name !== "Ascendant" })),
    ...visiblePoints.map((planet) => ({ ...planet, transit: labelPlanetsAsTransit })),
    ...(overlay ?? [])
      .filter((planet) => (
        (preferences.showOuterPlanets || !["Uranus", "Neptune", "Pluto"].includes(planet.name))
        && (preferences.showAsteroids || !["Chiron", "Lilith"].includes(planet.name))
      ))
      .map((planet) => ({ ...planet, transit: true })),
  ];
  const sortedCusps = Array.from({ length: 12 }, (_, index) => cusps.find((cusp) => cusp.house === index + 1))
    .filter((cusp): cusp is EphemerisResponse["houseCusps"][number] => cusp !== undefined);
  const cuspLabelResult = cusps.length === 12
    ? cuspLabels(
      cusps.map((cusp) => cusp.longitude),
      {
        signStyle: preferences.cuspLabelSignStyle,
        degreeFormat: preferences.cuspLabelDegreeFormat,
        showHouseNumber: true,
      },
      ascendant.longitude,
    )
    : null;
  const bodyPlacements = getBodyPlacements(chartBodies, referenceLongitude);
  const aspectLines = getAspectLines(visiblePlanets, referenceLongitude);
  const ascendantName = preferences.usePlanetIcons
    ? PLANET_GLYPHS.Ascendant
    : planetChartName("Ascendant", language, "Ascendant");

  return (
    <svg
      viewBox="0 0 1000 1000"
      className="absolute inset-0 h-full w-full object-contain"
      role="img"
      aria-label={`Placidus chart with ${referenceHouse === 1 ? "Ascendant" : `House ${referenceHouse}`} as reference lagna at nine o'clock`}
    >
      <defs>
        <filter id="planet-shadow" x="-80%" y="-80%" width="260%" height="260%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0f172a" floodOpacity="0.18" />
        </filter>
        {ELEMENT_GRADIENTS.map(({ id, color }) => (
          <radialGradient key={id} id={id} cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor={color} stopOpacity="0.44" />
            <stop offset="100%" stopColor={color} stopOpacity="0.08" />
          </radialGradient>
        ))}
        {aspectLines.map((aspect, index) => (
          <linearGradient
            key={aspect.key}
            id={`aspect-gradient-${index}`}
            gradientUnits="userSpaceOnUse"
            x1={aspect.from.x}
            y1={aspect.from.y}
            x2={aspect.to.x}
            y2={aspect.to.y}
          >
            <stop offset="0%" stopColor={aspect.color} stopOpacity="0.62" />
            <stop offset="50%" stopColor={aspect.color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={aspect.color} stopOpacity="0.62" />
          </linearGradient>
        ))}
      </defs>

      <circle cx={CENTER} cy={CENTER} r={ZODIAC_OUTER_RADIUS} fill="hsl(var(--card))" fillOpacity="0.5" stroke="hsl(var(--chart-grid))" strokeWidth="1.5" />
      {Array.from({ length: 12 }, (_, sign) => {
        const label = polarToCartesian(sign * 30 + 15, (ZODIAC_OUTER_RADIUS + ZODIAC_INNER_RADIUS) / 2, referenceLongitude);
        const gradient = ELEMENT_GRADIENTS.find((element) => element.signs.includes(sign))!;
        return (
          <g key={`zodiac-${sign}`} aria-label={signName(SIGNS[sign], language)}>
            <path
              d={ringSegmentPath(sign * 30, (sign + 1) * 30, ZODIAC_OUTER_RADIUS, ZODIAC_INNER_RADIUS, referenceLongitude)}
              fill={`url(#${gradient.id})`}
              fillOpacity="0.46"
              stroke="hsl(var(--chart-grid))"
              strokeOpacity="0.75"
              strokeWidth="1"
            />
            <text
              x={label.x}
              y={label.y + (preferences.showSignNumbers ? 4 : 7)}
              fill="hsl(var(--foreground))"
              fontFamily={preferences.useSignIcons ? "serif" : undefined}
              fontSize={preferences.useSignIcons ? "31" : "15"}
              fontWeight="600"
              textAnchor="middle"
            >
              {preferences.useSignIcons ? `${SIGN_GLYPHS[sign]}\uFE0E` : signName(SIGNS[sign], language)}
            </text>
            {preferences.showSignNumbers && (
              <text x={label.x} y={label.y + 22} fill="hsl(var(--muted-foreground))" fontSize="11" fontWeight="500" textAnchor="middle">
                {sign + 1}
              </text>
            )}
          </g>
        );
      })}

      <circle cx={CENTER} cy={CENTER} r={ZODIAC_INNER_RADIUS} fill="none" stroke="hsl(var(--chart-grid))" strokeWidth="1.5" />
      <circle cx={CENTER} cy={CENTER} r={DEGREE_RADIUS} fill="none" stroke="hsl(var(--chart-grid))" strokeOpacity="0.6" strokeWidth="1" />
      {Array.from({ length: 360 }, (_, degree) => {
        const major = degree % 10 === 0;
        const medium = degree % 5 === 0;
        const dot = polarToCartesian(degree, DEGREE_RADIUS, referenceLongitude);
        return (
          <circle
            key={`degree-${degree}`}
            cx={dot.x}
            cy={dot.y}
            r={major ? 2 : medium ? 1.4 : 0.8}
            fill={major ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))"}
            fillOpacity={major ? 0.8 : medium ? 0.65 : 0.42}
          />
        );
      })}

      <circle cx={CENTER} cy={CENTER} r={HOUSE_OUTER_RADIUS} fill="none" stroke="hsl(var(--chart-grid))" strokeWidth="1" />
      {sortedCusps.map((cusp, index) => {
        const next = sortedCusps[(index + 1) % sortedCusps.length];
        if (!next) return null;
        const span = normalizeDegrees(next.longitude - cusp.longitude);
        const midpoint = cusp.longitude + span / 2;
        const outer = polarToCartesian(cusp.longitude, HOUSE_OUTER_RADIUS, referenceLongitude);
        const inner = polarToCartesian(cusp.longitude, HOUSE_INNER_RADIUS, referenceLongitude);
        const label = polarToCartesian(midpoint, 296, referenceLongitude);
        const cuspPoint = polarToCartesian(cusp.longitude, ZODIAC_INNER_RADIUS, referenceLongitude);
        const relativeHouse = ((cusp.house - referenceHouse + 12) % 12) + 1;
        const majorAxis = [1, 4, 7, 10].includes(cusp.house);
        const markerSize = majorAxis ? 5 : 3.5;
        return (
          <g key={`house-${cusp.house}`}>
            <line
              x1={outer.x}
              y1={outer.y}
              x2={inner.x}
              y2={inner.y}
              stroke={majorAxis ? "hsl(var(--champagne-gold))" : "hsl(var(--chart-grid))"}
              strokeDasharray={majorAxis ? undefined : "4 4"}
              strokeWidth={majorAxis ? 2.2 : 1}
            />
            {majorAxis && (
              <>
                <path
                  d={`M ${cuspPoint.x} ${cuspPoint.y - markerSize} L ${cuspPoint.x + markerSize} ${cuspPoint.y} L ${cuspPoint.x} ${cuspPoint.y + markerSize} L ${cuspPoint.x - markerSize} ${cuspPoint.y} Z`}
                  fill="hsl(var(--champagne-gold))"
                />
                <text x={label.x} y={label.y + 4} fill="hsl(var(--champagne-gold))" fontSize="12" fontWeight="700" textAnchor="middle">
                  {cusp.house === 1 ? "ASC" : cusp.house === 4 ? "IC" : cusp.house === 7 ? "DSC" : "MC"}
                </text>
              </>
            )}
            {preferences.showHouseLabels && (
              <text x={label.x} y={label.y + (majorAxis ? 20 : 4)} fill="hsl(var(--foreground))" fontSize="13" fontWeight="600" textAnchor="middle">
                H{relativeHouse}
              </text>
            )}
            {preferences.showBhavaCusps && cuspLabelResult && (() => {
              const label = cuspLabelResult.cusps[cusp.house - 1];
              if (!label) return null;
              return (
                <text
                  x={outer.x}
                  y={outer.y + 3}
                  fill={preferences.cuspLabelStyle === "line" ? "#0f172a" : "hsl(var(--foreground))"}
                  fontSize="9"
                  fontWeight="600"
                  textAnchor="middle"
                  stroke={preferences.cuspLabelStyle === "line" ? "#FDE047" : "hsl(var(--card))"}
                  strokeWidth={preferences.cuspLabelStyle === "line" ? "7" : "3"}
                  strokeLinecap="round"
                  paintOrder="stroke"
                  fontFamily={preferences.cuspLabelSignStyle === "glyph" ? "Segoe UI Symbol, Noto Sans Symbols 2, DejaVu Sans, sans-serif" : undefined}
                >
                  {label.label}
                </text>
              );
            })()}
          </g>
        );
      })}
      <circle cx={CENTER} cy={CENTER} r={HOUSE_INNER_RADIUS} fill="hsl(var(--card))" fillOpacity="0.26" stroke="hsl(var(--chart-grid))" strokeWidth="1.3" />

      {preferences.showSignDivisions && Array.from({ length: 12 }, (_, sign) => {
        const point = polarToCartesian(sign * 30, HOUSE_INNER_RADIUS, referenceLongitude);
        const outer = polarToCartesian(sign * 30, HOUSE_OUTER_RADIUS, referenceLongitude);
        return <line key={`sign-division-${sign}`} x1={point.x} y1={point.y} x2={outer.x} y2={outer.y} stroke="hsl(var(--muted-foreground))" strokeDasharray="2 4" strokeOpacity="0.55" strokeWidth="1" />;
      })}
      {preferences.showEqualHouses && Array.from({ length: 12 }, (_, index) => {
        const longitude = ascendant.longitude + index * 30;
        const start = polarToCartesian(longitude, HOUSE_INNER_RADIUS, referenceLongitude);
        const end = polarToCartesian(longitude, HOUSE_INNER_RADIUS - 16, referenceLongitude);
        return <line key={`equal-house-${index}`} x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 4" strokeWidth="1" />;
      })}

      {aspectLines.map((aspect, index) => (
        <path
          key={aspect.key}
          d={`M ${aspect.from.x} ${aspect.from.y} Q ${CENTER} ${CENTER} ${aspect.to.x} ${aspect.to.y}`}
          fill="none"
          stroke={`url(#aspect-gradient-${index})`}
          strokeWidth="1.5"
          pointerEvents="none"
        />
      ))}
      <circle cx={CENTER} cy={CENTER} r="188" fill="none" stroke="hsl(var(--chart-grid))" strokeOpacity="0.5" strokeWidth="1" />

      {bodyPlacements.map(({ body, point, degreePoint }, index) => {
        const glyph = PLANET_GLYPHS[body.name] ?? body.symbol;
        const displayName = bodyName(body, language, preferences.usePlanetIcons);
        const display = `${body.transit ? "T " : ""}${displayName} · ${formatPlanetDegree(body.degree)}`;
        const retrograde = body.motion === "R";
        const vargottama = body.name !== "Ascendant" && body.sign === getNavamsaSign(body);
        const highlighted = hoveredPlanet === null
          || body.name === hoveredPlanet
          || (hoveredPlanet === "Vargottama" && vargottama);
        const glyphSize = glyph.length > 2 ? 6.5 : 10;

        return (
          <g
            key={`${body.id}-${body.transit ? "transit" : "natal"}-${index}`}
            opacity={highlighted ? 1 : 0.35}
            tabIndex={0}
            role="img"
            aria-label={display}
            onMouseEnter={() => setHoveredPlanet(body.name)}
            onMouseLeave={() => setHoveredPlanet(null)}
            onFocus={() => setHoveredPlanet(body.name)}
            onBlur={() => setHoveredPlanet(null)}
          >
            <title>{`${display}${retrograde ? " · Retrograde" : ""}${vargottama ? " · Vargottama" : ""}`}</title>
            <line
              x1={point.x}
              y1={point.y}
              x2={degreePoint.x}
              y2={degreePoint.y}
              stroke="hsl(var(--muted-foreground))"
              strokeOpacity="0.65"
              strokeWidth="0.5"
            />
            <circle cx={degreePoint.x} cy={degreePoint.y} r="2" fill="hsl(var(--foreground))" fillOpacity="0.8" />
            {vargottama && <circle cx={point.x} cy={point.y} r="16" fill="none" stroke="hsl(var(--chart-3))" strokeWidth="1" />}
            <circle
              cx={point.x}
              cy={point.y}
              r="11"
              className="fill-white dark:fill-slate-800"
              stroke={body.transit ? "hsl(var(--chart-1))" : "hsl(var(--chart-grid))"}
              strokeWidth={body.transit ? "1.5" : "1"}
              filter="url(#planet-shadow)"
            />
            <text
              x={point.x}
              y={point.y + 3.2}
              fill={body.transit ? "hsl(var(--muted-foreground))" : "hsl(var(--foreground))"}
              fillOpacity={body.transit ? 0.8 : 1}
              fontSize={glyphSize}
              fontWeight="700"
              textAnchor="middle"
            >
              {body.transit ? "T " : ""}{glyph}{retrograde ? <tspan fontSize="6" dy="-6">R</tspan> : null}
            </text>
          </g>
        );
      })}

      <circle cx={CENTER} cy={CENTER} r="3" fill="hsl(var(--champagne-gold))" />
      <text x={CENTER} y={CENTER - 10} fill="hsl(var(--foreground))" fontSize="13" fontWeight="600" textAnchor="middle">
        {signName(ascendant.signName, language)}
      </text>
      <text x={CENTER} y={CENTER + 11} fill="hsl(var(--muted-foreground))" fontSize="11" textAnchor="middle">
        {`${ascendantName} · ${formatPlanetDegree(ascendant.degree)}`}
      </text>
    </svg>
  );
}

export default PlacidusWheel;
