import { describe, expect, it } from "vitest";
import { buildChartModel } from "./chartModel";
import { SAMPLE } from "./sample";
import { formatAyanamsa } from "./ayanamsa";

const ayanamsa = {
  kind: "KP_NEW" as const,
  value: SAMPLE.ayanamsa,
  text: formatAyanamsa(SAMPLE.ayanamsa),
  at: "2026-11-20T12:40:51.000Z",
};
const sayanaPlanets = Object.fromEntries(
  Object.entries(SAMPLE.planets).map(([key, value]) => [
    key,
    typeof value === "number"
      ? value + SAMPLE.ayanamsa
      : { ...value, longitude: value.longitude + SAMPLE.ayanamsa },
  ]),
);

describe("KP chart model", () => {
  it("derives every nirayana position from sayana minus the selected KP ayanamsa", () => {
    const model = buildChartModel({
      mode: "natal",
      sayanaPlanets,
      sayanaCusps: SAMPLE.cusps.map((cusp) => cusp + SAMPLE.ayanamsa),
      ayanamsa,
      lagnaSayana: SAMPLE.cusps[0] + SAMPLE.ayanamsa,
    });

    for (const body of model.bodies) {
      expect(body.nirayana).toBeCloseTo((body.sayana - ayanamsa.value + 360) % 360, 10);
    }
    for (const cusp of model.cusps) {
      expect(cusp.nirayana).toBeCloseTo(
        (SAMPLE.cusps[cusp.house - 1] + 360) % 360,
        10,
      );
    }
  });

  it("keeps the KP Bhava-Chalit placements in the same model used by the tables", () => {
    const model = buildChartModel({
      mode: "natal",
      sayanaPlanets,
      sayanaCusps: SAMPLE.cusps.map((cusp) => cusp + SAMPLE.ayanamsa),
      ayanamsa,
      lagnaSayana: SAMPLE.cusps[0] + SAMPLE.ayanamsa,
    });
    const placement = Object.fromEntries(model.bodies.map((body) => [body.key, body.bhava]));

    expect(model.bodies.filter(({ key }) => key !== "Asc")).toHaveLength(12);
    expect(placement).toMatchObject({
      Mars: 4, Jupiter: 4, Ketu: 4, Venus: 5, Sun: 6, Mercury: 6,
      Pluto: 9, Rahu: 10, Moon: 11, Saturn: 11, Neptune: 11, Uranus: 12,
    });
    expect(model.points[0]?.bhava).toBe(5);
    expect(model.bodies.find(({ key }) => key === "Moon")?.signIndex).toBe(11);
    expect(model.bodies.find(({ key }) => key === "Saturn")?.signIndex).toBe(11);
  });

  it("shifts every sidereal body and cusp by the same selected-ayanamsa delta", () => {
    const newModel = buildChartModel({
      mode: "natal",
      sayanaPlanets,
      sayanaCusps: SAMPLE.cusps.map((cusp) => cusp + SAMPLE.ayanamsa),
      ayanamsa,
      lagnaSayana: SAMPLE.cusps[0] + SAMPLE.ayanamsa,
    });
    const oldValue = SAMPLE.ayanamsa + 0.125;
    const oldModel = buildChartModel({
      mode: "natal",
      sayanaPlanets,
      sayanaCusps: SAMPLE.cusps.map((cusp) => cusp + SAMPLE.ayanamsa),
      ayanamsa: { ...ayanamsa, kind: "KP_OLD", value: oldValue },
      lagnaSayana: SAMPLE.cusps[0] + SAMPLE.ayanamsa,
    });
    const expectedDelta = oldValue - SAMPLE.ayanamsa;

    newModel.bodies.forEach((body, index) => {
      expect(((body.nirayana - oldModel.bodies[index].nirayana + 540) % 360) - 180).toBeCloseTo(expectedDelta, 10);
    });
    newModel.cusps.forEach((cusp, index) => {
      expect(((cusp.nirayana - oldModel.cusps[index].nirayana + 540) % 360) - 180).toBeCloseTo(expectedDelta, 10);
    });
  });
});
