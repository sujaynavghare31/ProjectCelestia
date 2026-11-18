import { COLORS, colorForPoint, type JamakkolResult, type Point } from "./jamakkol";

const ABBR = ["Ari", "Tau", "Gem", "Can", "Leo", "Vir", "Lib", "Sco", "Sag", "Cap", "Aqu", "Pis"];
const GRID: (number | null)[][] = [[11, 0, 1, 2], [10, null, null, 3], [9, null, null, 4], [8, 7, 6, 5]];
const CHART_COLORS = {
  canvas: "#FFFBEB",
  surface: "#FFFCF5",
  house: "#955643",
  heading: "#3D6158",
};
const SIGN_ELEMENT_FILLS = ["#FFF4F3", "#F9FDEB", "#F5FAFC", "#F2FDFC"] as const;
const SHORT: Record<string, string> = {
  Udayam: "UD", Aarudam: "AR", Kavippu: "KV", Sun: "SU", Moon: "MO", Mars: "MA",
  Mercury: "ME", Jupiter: "JU", Venus: "VE", Saturn: "SA", Rahu: "RA", Ketu: "KE", Ascendant: "ASC", Mandi: "md",
};
const FULL_POINT_NAMES: Record<string, string> = {
  Udayam: "UD - Udayam",
  Aarudam: "AR - Aarudam",
  Kavippu: "KV - Kavippu",
};
const JAMA_BORDER_NAMES: Record<string, string> = {
  Sun: "J.SU", Mars: "J.MA", Jupiter: "J.JU", Mercury: "J.ME",
  Venus: "J.VE", Saturn: "J.SA", Moon: "J.MO", "Pambu (Rahu)": "J.SN",
};
const escapeXml = (value: string) => value.replace(/[&<>]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[character]!);
const absoluteDegMin = (longitude: number) => {
  const degree = Math.floor(longitude);
  const minutes = Math.floor((longitude - degree) * 60);
  return `${degree}° ${String(minutes).padStart(2, "0")}′`;
};
const degSec = (longitude: number) => {
  let totalSeconds = Math.round(longitude * 3600);
  const degrees = Math.floor((totalSeconds / 3600) % 30);
  totalSeconds %= 3600;
  if (totalSeconds < 0) totalSeconds += 3600;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${degrees}° ${String(minutes).padStart(2, "0")}′ ${String(seconds).padStart(2, "0")}″`;
};
const pointLabel = (point: Point) => FULL_POINT_NAMES[point.name] ?? SHORT[point.name] ?? point.short;

export interface JamakkolChartOptions {
  size?: number;
  title?: string;
  utcLabel?: string;
}

export function renderJamakkolChart(result: JamakkolResult, options: JamakkolChartOptions = {}) {
  const size = options.size ?? 640;
  const band = 46;
  const chartSize = 640;
  const scale = size / (chartSize + band * 2);
  const cell = chartSize / 4;
  const x = (column: number) => band + column * cell;
  const y = (row: number) => band + row * cell;
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${chartSize + band * 2} ${chartSize + band * 2}" width="${size}" height="${size}" role="img" aria-label="Jamakkol South Indian chart">`,
    `<rect width="${chartSize + band * 2}" height="${chartSize + band * 2}" fill="${CHART_COLORS.canvas}" stroke="${COLORS.border}" stroke-width="2"/>`,
    `<rect x="${band}" y="${band}" width="${chartSize}" height="${chartSize}" fill="${CHART_COLORS.surface}" stroke="${COLORS.border}" stroke-width="2"/>`,
  ];

  GRID.forEach((row, rowIndex) => row.forEach((signIndex, columnIndex) => {
    if (signIndex === null) return;
    const boxX = x(columnIndex);
    const boxY = y(rowIndex);
    const box = result.boxes[signIndex];
    parts.push(`<rect x="${boxX}" y="${boxY}" width="${cell}" height="${cell}" fill="${SIGN_ELEMENT_FILLS[signIndex % SIGN_ELEMENT_FILLS.length]}" stroke="${COLORS.border}" stroke-width="1.2"/>`);
    parts.push(`<text x="${boxX + 6}" y="${boxY + 15}" fill="${COLORS.sign.text}" font-size="12">${ABBR[signIndex]}</text>`);
    parts.push(`<text x="${boxX + cell - 8}" y="${boxY + cell - 8}" fill="${CHART_COLORS.house}" font-size="12" text-anchor="end">${box.house}</text>`);
    if (box.asc) parts.push(`<text x="${boxX + cell - 6}" y="${boxY + 16}" fill="${COLORS.border}" font-size="12" font-weight="700" text-anchor="end">ASC</text>`);
    const points = result.points.filter((point) => point.category === "points" && point.signIndex === signIndex);
    const upagrahas = result.points.filter((point) => point.category === "upagraha" && point.signIndex === signIndex);
    const gochara = result.gochara.filter((point) => point.signIndex === signIndex);
    const lines = [...points, ...gochara, ...upagrahas].map((point) => ({
      text: point.retrograde && !FULL_POINT_NAMES[point.name] ? `(${SHORT[point.name] ?? point.short})` : pointLabel(point),
      color: colorForPoint(point),
    }));
    const lineHeight = lines.length ? Math.min(20, (cell - 24) / lines.length) : 0;
    const fontSize = Math.min(15, Math.max(9, lineHeight * 0.74));
    const startY = boxY + cell / 2 - ((lines.length - 1) * lineHeight) / 2 + fontSize / 3;
    lines.forEach((line, index) => parts.push(`<text x="${boxX + cell / 2}" y="${startY + index * lineHeight}" fill="${line.color}" font-size="${fontSize}" font-weight="700" text-anchor="middle">${escapeXml(line.text)}</text>`));
  }));

  const centerX = band + chartSize / 2;
  const titleY = y(1) + 18;
  const title = options.title ?? `JAMAKKOL HORARY, ${result.jamam.weekday} ${result.jamam.half} Jamam # ${result.jamam.number}`;
  const utcLabel = options.utcLabel ?? `UTC${(result.input.tz ?? 5.5) >= 0 ? "+" : "-"}${String(Math.floor(Math.abs(result.input.tz ?? 5.5))).padStart(2, "0")}:${String(Math.round((Math.abs(result.input.tz ?? 5.5) % 1) * 60)).padStart(2, "0")}`;
  const [year, month, day] = result.input.date.split("-").map(Number);
  const monthName = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][month - 1];
  const [hours, minutes, seconds = "0"] = result.input.time.split(":").map(String);
  const hour = Number(hours);
  const time = `${String(((hour + 11) % 12) + 1).padStart(2, "0")}:${minutes}:${seconds} ${hour < 12 ? "AM" : "PM"}`;
  const heading = [
    title,
    `${result.jamam.weekday}, ${String(day).padStart(2, "0")}-${monthName}-${year} ${time} (${utcLabel})`,
    result.input.place ?? "",
    `${(result.input.lat ?? 0).toFixed(5)} / ${(result.input.lon ?? 0).toFixed(5)}`,
  ];
  heading.forEach((text, index) => text && parts.push(`<text x="${centerX}" y="${titleY + index * 15}" fill="${CHART_COLORS.heading}" font-size="12" font-weight="700" text-anchor="middle">${escapeXml(text)}</text>`));

  const tablePoints: Point[] = result.points.filter((point) => point.category !== "jama");
  if (result.ascendant) tablePoints.push(result.ascendant);
  tablePoints.sort((left, right) => left.longitude - right.longitude);
  const half = Math.ceil(tablePoints.length / 2);
  const tableY = titleY + 78;
  tablePoints.forEach((point, index) => {
    const columnX = index < half ? centerX - 160 : centerX;
    const rowY = tableY + (index % half) * 18;
    const isFullPointName = !!FULL_POINT_NAMES[point.name];
    const labelWidth = isFullPointName ? 76 : 36;
    parts.push(`<text x="${columnX}" y="${rowY}" fill="${colorForPoint(point)}" font-size="${isFullPointName ? 10.5 : 13}" font-weight="700">${pointLabel(point)}</text>`);
    parts.push(`<text x="${columnX + labelWidth}" y="${rowY}" fill="${colorForPoint(point)}" font-size="${isFullPointName ? 11.5 : 12.5}" font-weight="700" font-family="Consolas,Menlo,monospace">${degSec(point.longitude)}</text>`);
  });

  const signCells = new Map<number, { row: number; column: number }>();
  GRID.forEach((row, rowIndex) => row.forEach((signIndex, columnIndex) => {
    if (signIndex !== null) signCells.set(signIndex, { row: rowIndex, column: columnIndex });
  }));
  const bandTop = 22;
  result.jamaGrahas.forEach((point) => {
    const cellPosition = signCells.get(point.signIndex);
    if (!cellPosition) return;
    const { row, column } = cellPosition;
    const centerX = x(column) + cell / 2;
    const centerY = y(row) + cell / 2;
    const name = JAMA_BORDER_NAMES[point.name.replace("Jama ", "")] ?? point.short;
    const label = `${name} ${absoluteDegMin(point.longitude)}`;
    const color = colorForPoint(point);
    if (row === 0) parts.push(`<text x="${centerX}" y="${bandTop}" fill="${color}" font-size="12" font-weight="700" text-anchor="middle">${label} ←</text>`);
    if (row === 3) parts.push(`<text x="${centerX}" y="${band + chartSize + 24}" fill="${color}" font-size="12" font-weight="700" text-anchor="middle">${label} →</text>`);
    if (column === 3) parts.push(`<text transform="translate(${chartSize + band + 20},${centerY}) rotate(90)" fill="${color}" font-size="12" font-weight="700" text-anchor="middle">${label} ←</text>`);
    if (column === 0) parts.push(`<text transform="translate(18,${centerY}) rotate(-90)" fill="${color}" font-size="12" font-weight="700" text-anchor="middle">${label} ←</text>`);
  });

  parts.push("</svg>");
  return parts.join("");
}
