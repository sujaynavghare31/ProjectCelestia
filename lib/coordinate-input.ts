export function limitCoordinatePrecision(value: string) {
  const negative = value.startsWith("-");
  const cleaned = value.replace(/[^\d.]/g, "");
  const [integer = "", ...fractionParts] = cleaned.split(".");
  const hasDecimal = cleaned.includes(".");
  const fraction = fractionParts.join("").slice(0, 2);

  return `${negative ? "-" : ""}${integer.slice(0, 3)}${hasDecimal ? `.${fraction}` : ""}`;
}

export function parseCoordinateDraft(value: string) {
  if (!value || value === "-" || value === "." || value === "-." || value.endsWith(".")) return Number.NaN;
  return Number(value);
}
