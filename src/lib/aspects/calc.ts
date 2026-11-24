import { ASPECT_SET, DEFAULT_ORBS, type AspectKey, type OrbSettings } from "./aspectSet";

export type AspectBody = { id: string; name: string; longitude: number; speed?: number; kind: "luminary" | "planet" | "angle" | "small" };
export type AspectHit = {
  a: string;
  b: string;
  aspect: AspectKey;
  angle: number;
  orb: number;
  applying: boolean | null;
  exactness: number;
};

export function norm360(value: number) {
  return ((value % 360) + 360) % 360;
}

export function separation(a: number, b: number) {
  return Math.abs(norm360(b - a + 180) - 180);
}

export function bodyOrb(body: AspectBody) {
  if (body.kind === "luminary") return "luminaries";
  if (body.kind === "angle") return "angles";
  if (body.kind === "small") return "small";
  return "planets";
}

export function pairOrb(a: AspectBody, b: AspectBody, aspectKey: AspectKey, orbs: OrbSettings = DEFAULT_ORBS) {
  const setting = orbs[aspectKey];
  const luminaryCap = setting.luminaries;
  const larger = Math.max(setting[bodyOrb(a)], setting[bodyOrb(b)]);
  let orb = Math.min(larger, luminaryCap);
  if (a.name === "Chiron" || b.name === "Chiron") orb += 1;
  return orb;
}

export function calculateAspects(
  bodies: AspectBody[],
  enabled: Set<AspectKey>,
  orbs: OrbSettings = DEFAULT_ORBS,
  excludeFormulaPairs = true,
): AspectHit[] {
  const hits: AspectHit[] = [];
  for (let i = 0; i < bodies.length; i += 1) {
    for (let j = i + 1; j < bodies.length; j += 1) {
      const a = bodies[i];
      const b = bodies[j];
      if (a.id === b.id) continue;
      if ((a.name === "ASC" && b.name === "DSC") || (a.name === "MC" && b.name === "IC")) continue;
      if (a.name === "South Node" && b.name === "South Node") continue;
      if (a.name === "Black Moon Lilith" && b.name === "Priapus") continue;
      if (excludeFormulaPairs && a.name === "Part of Fortune" && ["Sun", "Moon", "ASC"].includes(b.name)) continue;
      if (excludeFormulaPairs && b.name === "Part of Fortune" && ["Sun", "Moon", "ASC"].includes(a.name)) continue;

      const sep = separation(a.longitude, b.longitude);
      let tightest: { aspect: (typeof ASPECT_SET)[number]; delta: number; signed: number } | null = null;
      for (const aspect of ASPECT_SET) {
        if (!enabled.has(aspect.key)) continue;
        const delta = Math.abs(sep - aspect.angle);
        const orb = pairOrb(a, b, aspect.key, orbs);
        if (delta <= orb && (!tightest || delta < tightest.delta)) {
          tightest = { aspect, delta, signed: sep - aspect.angle };
        }
      }
      if (!tightest) continue;
      const orbLimit = pairOrb(a, b, tightest.aspect.key, orbs);
      const decreasing = (a.speed ?? 0) !== (b.speed ?? 0)
        ? (tightest.signed * ((b.speed ?? 0) - (a.speed ?? 0)) < 0)
        : null;
      hits.push({
        a: a.id,
        b: b.id,
        aspect: tightest.aspect.key,
        angle: tightest.aspect.angle,
        orb: tightest.signed,
        applying: a.kind === "angle" || b.kind === "angle" ? null : decreasing,
        exactness: Math.max(0, Math.min(100, (1 - tightest.delta / orbLimit) * 100)),
      });
    }
  }
  return hits;
}
