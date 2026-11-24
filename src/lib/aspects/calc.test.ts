import { describe, expect, it } from "vitest";
import { calculateAspects, type AspectBody } from "./calc";
import { ASPECT_SET } from "./aspectSet";

const enabled = new Set(ASPECT_SET.map((aspect) => aspect.key));
const body = (id: string, longitude: number, kind: AspectBody["kind"] = "planet", speed = 0): AspectBody =>
  ({ id, name: id, longitude, speed, kind });

describe("western aspect calculation", () => {
  it("finds quintile and bi-quintile at the requested offsets", () => {
    const hits = calculateAspects([body("A", 0), body("B", 72.5)], enabled);
    expect(hits.find((hit) => hit.a === "A" && hit.b === "B")?.aspect).toBe("quintile");

    const bi = calculateAspects([body("A", 10), body("B", 154.8)], enabled);
    expect(bi.find((hit) => hit.a === "A" && hit.b === "B")?.aspect).toBe("bi-quintile");
  });

  it("keeps ASC-MC and labels angle aspects exact-by-angle", () => {
    const hits = calculateAspects([
      { id: "asc", name: "ASC", longitude: 10, speed: 0, kind: "angle" },
      { id: "mc", name: "MC", longitude: 100, speed: 0, kind: "angle" },
    ], enabled);
    expect(hits).toHaveLength(1);
    expect(hits[0].applying).toBeNull();
  });

  it("turning quintile off removes it", () => {
    const withoutQuintile = new Set(enabled);
    withoutQuintile.delete("quintile");
    const hits = calculateAspects([body("A", 0), body("B", 72.5)], withoutQuintile);
    expect(hits).toHaveLength(0);
  });
});
