// Small presentation helpers for the portal (framework-agnostic).

/** Map any verdict string from the engine to a CSS modifier: nm-badge--{excellent|good|average|bad} */
export function verdictClass(verdict: string): "excellent" | "good" | "average" | "bad" {
  const v = verdict.trim();
  if (/^(Excellent|★|YES – s|Favourable|Complete)/.test(v)) return "excellent";
  if (/^(Good|YES – l|Supportive)/.test(v)) return "good";
  if (/^(Average|MIXED|Light|Partial|Neutral)/.test(v)) return "average";
  return "bad";
}

/** Score as a 0..100 percentage for progress bars (score10 → ×10; percent passes through). */
export const scorePercent = (score: number, max = 10) => Math.max(0, Math.min(100, (score / max) * 100));
