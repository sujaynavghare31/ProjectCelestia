import type { JamakkolResult, Point } from "./jamakkol";

const ABBR = ["Ari", "Tau", "Gem", "Can", "Leo", "Vir", "Lib", "Sco", "Sag", "Cap", "Aqu", "Pis"];
const GRID: (number | null)[][] = [[11, 0, 1, 2], [10, null, null, 3], [9, null, null, 4], [8, 7, 6, 5]];
const SHORT: Record<string, string> = {
  Udayam: "UD", Aarudam: "AR", Kavippu: "KV", Sun: "SU", Moon: "MO", Mars: "MA",
  Mercury: "ME", Jupiter: "JU", Venus: "VE", Saturn: "SA", Rahu: "RA", Ketu: "KE", Ascendant: "ASC",
};

const escapeXml = (value: string) => value.replace(/[&<>]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[character]!);
const degMin = (longitude: number) => {
  const degree = Math.floor(longitude % 30);
  const minutes = Math.floor(((longitude % 30) - degree) * 60);
  return `${degree}°${String(minutes).padStart(2, "0")}′`;
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
    `<rect width="${chartSize + band * 2}" height="${chartSize + band * 2}" fill="#FFFDD0" stroke="#1E3A8A" stroke-width="2"/>`,
    `<rect x="${band}" y="${band}" width="${chartSize}" height="${chartSize}" fill="#FFFFFF" stroke="#1E3A8A" stroke-width="2"/>`,
  ];

  GRID.forEach((row, rowIndex) => row.forEach((signIndex, columnIndex) => {
    if (signIndex === null) return;
    const boxX = x(columnIndex);
    const boxY = y(rowIndex);
    const box = result.boxes[signIndex];
    parts.push(`<rect x="${boxX}" y="${boxY}" width="${cell}" height="${cell}" fill="none" stroke="#1E3A8A" stroke-width="1.2"/>`);
    parts.push(`<text x="${boxX + 6}" y="${boxY + 15}" fill="#A3A9C9" font-size="12">${ABBR[signIndex]}</text>`);
    parts.push(`<text x="${boxX + cell - 8}" y="${boxY + cell - 8}" fill="#E0866E" font-size="12" text-anchor="end">${box.house}</text>`);
    if (box.asc) parts.push(`<text x="${boxX + cell - 6}" y="${boxY + 16}" fill="#1E3A8A" font-size="12" font-weight="700" text-anchor="end">ASC</text>`);
    const points = result.points.filter((point) => point.category === "points" && point.signIndex === signIndex);
    const gochara = result.gochara.filter((point) => point.signIndex === signIndex);
    const lines: Array<{ text: string; color: string }> = [];
    if (points.length) lines.push({ text: points.map((point) => SHORT[point.name] ?? point.short).join("   "), color: "#C2410C" });
    if (gochara.length) lines.push({
      text: gochara.map((point) => point.retrograde ? `(${SHORT[point.name] ?? point.short})` : SHORT[point.name] ?? point.short).join("   "),
      color: "#16A34A",
    });
    const lineHeight = 24;
    const startY = boxY + cell / 2 - ((lines.length - 1) * lineHeight) / 2 + 6;
    lines.forEach((line, index) => parts.push(`<text x="${boxX + cell / 2}" y="${startY + index * lineHeight}" fill="${line.color}" font-size="19" font-weight="700" text-anchor="middle">${escapeXml(line.text)}</text>`));
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
  heading.forEach((text, index) => text && parts.push(`<text x="${centerX}" y="${titleY + index * 15}" fill="#6B7AB8" font-size="12" font-weight="700" text-anchor="middle">${escapeXml(text)}</text>`));

  const tablePoints: Point[] = result.points.filter((point) => point.category !== "jama");
  if (result.ascendant) tablePoints.push(result.ascendant);
  tablePoints.sort((left, right) => left.longitude - right.longitude);
  const half = Math.ceil(tablePoints.length / 2);
  const tableY = titleY + 78;
  tablePoints.forEach((point, index) => {
    const columnX = index < half ? centerX - 148 : centerX + 8;
    const rowY = tableY + (index % half) * 18;
    parts.push(`<text x="${columnX}" y="${rowY}" fill="#6B7AB8" font-size="13" font-weight="700">${SHORT[point.name] ?? point.short}</text>`);
    parts.push(`<text x="${columnX + 36}" y="${rowY}" fill="#6B7AB8" font-size="12.5" font-weight="700" font-family="Consolas,Menlo,monospace">${degSec(point.longitude)}</text>`);
  });

  const bandTop = 22;
  result.jamaGrahas.forEach((point) => {
    const index = result.jamaGrahas.indexOf(point);
    const jamaNames = ["J.SU", "J.MA", "J.JU", "J.ME", "J.VE", "J.SA", "J.MO", "J.SN"];
    const top = index < 2;
    const right = index >= 2 && index < 4;
    const bottom = index >= 4 && index < 6;
    const left = index >= 6;
    if (top) parts.push(`<text x="${band + chartSize / 2 + (index === 0 ? -180 : 180)}" y="${bandTop}" fill="#1E3A8A" font-size="12" font-weight="700" text-anchor="middle">${jamaNames[index]} ${degMin(point.longitude)} ↓</text>`);
    if (right) parts.push(`<text transform="translate(${chartSize + band + 20},${band + chartSize / 2 + (index === 2 ? -180 : 180)}) rotate(90)" fill="#1E3A8A" font-size="12" font-weight="700" text-anchor="middle">${jamaNames[index]} ${degMin(point.longitude)} ↑</text>`);
    if (bottom) parts.push(`<text x="${band + chartSize / 2 + (index === 4 ? -180 : 180)}" y="${band + chartSize + 24}" fill="#1E3A8A" font-size="12" font-weight="700" text-anchor="middle">${jamaNames[index]} ${degMin(point.longitude)} →</text>`);
    if (left) parts.push(`<text transform="translate(18,${band + chartSize / 2 + (index === 6 ? -180 : 180)}) rotate(-90)" fill="#1E3A8A" font-size="12" font-weight="700" text-anchor="middle">${jamaNames[index]} ${degMin(point.longitude)} ←</text>`);
  });

  parts.push("</svg>");
  return parts.join("");
}
