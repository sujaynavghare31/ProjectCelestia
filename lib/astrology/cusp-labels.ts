export const CUSP_SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"] as const;
export const CUSP_SIGN_SHORT = ["Ar", "Ta", "Ge", "Cn", "Le", "Vi", "Li", "Sc", "Sg", "Cp", "Aq", "Pi"] as const;
export const CUSP_SIGN_HI = ["मेष", "वृषभ", "मिथुन", "कर्क", "सिंह", "कन्या", "तुला", "वृश्चिक", "धनु", "मकर", "कुंभ", "मीन"] as const;
export const CUSP_SIGN_GLYPH = ["♈︎", "♉︎", "♊︎", "♋︎", "♌︎", "♍︎", "♎︎", "♏︎", "♐︎", "♑︎", "♒︎", "♓︎"] as const;

export type CuspSignStyle = "short" | "full" | "number" | "hindi" | "glyph";
export type CuspDegreeFormat = "dms" | "dm" | "decimal" | "compact";

export interface CuspLabelOptions {
  signStyle?: CuspSignStyle;
  degreeFormat?: CuspDegreeFormat;
  prefix?: string;
  showHouseNumber?: boolean;
}

export interface CuspLabel {
  house: number;
  longitude: number;
  signIndex: number;
  sign: string;
  degInSign: number;
  label: string;
  box: number;
  shifted: boolean;
  endLongitude: number;
  span: number;
}

export interface CuspBox {
  box: number;
  signIndex: number;
  signNumber: number;
  cusps: CuspLabel[];
  intercepted: boolean;
}

export const norm360 = (value: number) => ((value % 360) + 360) % 360;

export function formatCuspDegree(degrees: number, format: CuspDegreeFormat = "dms") {
  if (format === "decimal") return `${degrees.toFixed(2)}°`;
  const precision = format === "dm" ? 60 : 3600;
  const rounded = Math.round(degrees * precision);
  const wholeDegrees = Math.floor(rounded / precision);
  const minutes = Math.floor((rounded % precision) / (precision === 60 ? 1 : 60));
  const seconds = precision === 3600 ? rounded % 60 : 0;
  if (format === "compact") return `${wholeDegrees}°${minutes}′${seconds ? `${seconds}″` : ""}`;
  if (format === "dm") return `${wholeDegrees}°${String(minutes).padStart(2, "0")}′`;
  return `${wholeDegrees}°${String(minutes).padStart(2, "0")}′${String(seconds).padStart(2, "0")}″`;
}

function signText(signIndex: number, style: CuspSignStyle) {
  if (style === "full") return CUSP_SIGNS[signIndex];
  if (style === "number") return String(signIndex + 1);
  if (style === "hindi") return CUSP_SIGN_HI[signIndex];
  if (style === "glyph") return CUSP_SIGN_GLYPH[signIndex];
  return CUSP_SIGN_SHORT[signIndex];
}

function signPosition(longitude: number, format: CuspDegreeFormat) {
  const step = format === "decimal" ? 0.01 : format === "dm" ? 1 / 60 : 1 / 3600;
  const rounded = norm360(Math.round(norm360(longitude) / step) * step);
  const signIndex = Math.floor(rounded / 30 + 1e-12) % 12;
  return { signIndex, degInSign: rounded - signIndex * 30 };
}

export function cuspLabels(cusps: number[], options: CuspLabelOptions = {}, ascendant = cusps[0]) {
  if (cusps.length !== 12 || cusps.some((cusp) => !Number.isFinite(cusp))) {
    throw new Error("cuspLabels requires twelve finite cusp longitudes.");
  }
  const signStyle = options.signStyle ?? "short";
  const degreeFormat = options.degreeFormat ?? "dms";
  const prefix = options.prefix ?? "C";
  const showHouseNumber = options.showHouseNumber ?? true;
  const lagnaSign = signPosition(ascendant, degreeFormat).signIndex;
  const boxForSign = (signIndex: number) => ((signIndex - lagnaSign + 12) % 12) + 1;
  const labels = cusps.map((longitude, index) => {
    const position = signPosition(longitude, degreeFormat);
    const next = norm360(cusps[(index + 1) % 12]);
    const box = boxForSign(position.signIndex);
    return {
      house: index + 1,
      longitude: norm360(longitude),
      signIndex: position.signIndex,
      sign: CUSP_SIGNS[position.signIndex],
      degInSign: position.degInSign,
      label: `${showHouseNumber ? `${prefix}${index + 1} ` : ""}${signText(position.signIndex, signStyle)} ${formatCuspDegree(position.degInSign, degreeFormat)}`,
      box,
      shifted: box !== index + 1,
      endLongitude: next,
      span: norm360(next - norm360(longitude)),
    } satisfies CuspLabel;
  });
  const boxes = Array.from({ length: 12 }, (_, index) => {
    const signIndex = (lagnaSign + index) % 12;
    const boxCusps = labels.filter((cusp) => cusp.signIndex === signIndex).sort((a, b) => a.degInSign - b.degInSign);
    return { box: index + 1, signIndex, signNumber: signIndex + 1, cusps: boxCusps, intercepted: boxCusps.length === 0 };
  });
  return {
    lagnaSignIndex: lagnaSign,
    cusps: labels,
    boxes,
    bySign: Array.from({ length: 12 }, (_, signIndex) => boxes.find((box) => box.signIndex === signIndex)!),
    interceptedSigns: boxes.filter((box) => box.intercepted).map((box) => CUSP_SIGNS[box.signIndex]),
    signsWithTwoCusps: boxes.filter((box) => box.cusps.length > 1).map((box) => CUSP_SIGNS[box.signIndex]),
  };
}

export function bhavaOf(longitude: number, cusps: number[]) {
  const value = norm360(longitude);
  for (let index = 0; index < 12; index += 1) {
    const start = norm360(cusps[index]);
    const span = norm360(cusps[(index + 1) % 12] - start);
    if (norm360(value - start) < span || span === 0) return index + 1;
  }
  return 12;
}

export function bhavaChalit(
  planets: Array<{ name: string; longitude: number }>,
  cusps: number[],
  ascendant = cusps[0],
) {
  const lagnaSign = Math.floor(norm360(ascendant) / 30);
  return planets.map((planet) => {
    const wholeSignHouse = ((Math.floor(norm360(planet.longitude) / 30) - lagnaSign + 12) % 12) + 1;
    const bhavaHouse = bhavaOf(planet.longitude, cusps);
    return { ...planet, wholeSignHouse, bhavaHouse, moved: wholeSignHouse !== bhavaHouse };
  });
}

export const NORTH_START_EDGES: Record<number, [[number, number], [number, number]]> = {
  1: [[0.5, 0], [0.75, 0.25]], 2: [[0.5, 0], [0.25, 0.25]], 3: [[0, 0], [0.25, 0.25]], 4: [[0, 0.5], [0.25, 0.25]],
  5: [[0, 0.5], [0.25, 0.75]], 6: [[0, 1], [0.25, 0.75]], 7: [[0.5, 1], [0.25, 0.75]], 8: [[0.5, 1], [0.75, 0.75]],
  9: [[1, 1], [0.75, 0.75]], 10: [[1, 0.5], [0.75, 0.75]], 11: [[1, 0.5], [0.75, 0.25]], 12: [[1, 0], [0.75, 0.25]],
};

export function northCuspAnchor(cusp: CuspLabel, size = 340, gap = 8) {
  const [[x1, y1], [x2, y2]] = NORTH_START_EDGES[cusp.house];
  const midpoint = { x: (x1 + x2) * size / 2, y: (y1 + y2) * size / 2 };
  let angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
  if (angle > 90) angle -= 180;
  if (angle < -90) angle += 180;
  const dx = -(y2 - y1);
  const dy = x2 - x1;
  const length = Math.hypot(dx, dy);
  const nx = dx / length;
  const ny = dy / length;
  return {
    x: midpoint.x + nx * gap,
    y: midpoint.y + ny * gap,
    angle,
    tick: [[midpoint.x - nx * 4, midpoint.y - ny * 4], [midpoint.x + nx * 4, midpoint.y + ny * 4]] as [[number, number], [number, number]],
  };
}
