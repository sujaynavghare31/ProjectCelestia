import { describe, expect, it } from "vitest";
import { charaKarakas, signRanks, stronger, trikonaStart, brahma } from "../core";
import { arudhaLagnas, grahaArudhas } from "../arudha";
import { charaKnRao, charaParashara, sthira, shoola, navamsaDasha, brahmaDasha, mandooka, trikonaDasha, drigDasha } from "../dashas";
import { specialLagnas } from "../specialLagnas";
import { sunUpagrahas } from "../upagrahas";
import { argalaTable } from "../argala";
import { navamsa } from "../constants";

const planets = [94.7330555555556,135.295833333333,93.7852777777778,119.803333333333,290.190277777778,52.62,207.834444444444,20.8458333333333,200.845833333333];
const lagna = 153.303611111111;
const birth = Date.UTC(1985,6,21,5,0);
const asOf = Date.UTC(2026,10,19);

describe("Jaimini sample chart", () => {
  it("calculates karakas and key signs", () => {
    const karakas = charaKarakas(planets,7);
    expect(karakas.map((k)=>k.name)).toEqual(["AK","AmK","BK","MK","PK","GK","DK"]);
    expect(karakas.map((k)=>k.planet)).toEqual([3,6,5,4,1,0,2]);
    expect(planets.map(navamsa)).toEqual([4,4,4,11,3,3,2,6,0]);
    expect(stronger(5,11,planets)).toBe(5);
    expect(trikonaStart(5,planets)).toBe(1);
    expect(brahma(5,5,planets)).toBe(6);
  });
  it("returns expected arudha signs", () => {
    expect(arudhaLagnas(5,planets)).toEqual([1,8,11,10,0,2,7,3,10,4,5,2]);
    expect(grahaArudhas(planets)).toEqual([5,2,6,1,7,11,9,8,8]);
  });
  it("returns exact sign-strength ranks", () => {
    expect(signRanks(planets)).toEqual([6,3,9,1,4,9,2,7,11,5,8,11]);
  });
  it("calculates rashi dasha sequences", () => {
    expect(charaKnRao(lagna,planets,birth,asOf).periods.slice(0,12).map((p)=>p.years)).toEqual([2,7,7,0,4,5,1,2,12,1,11,1]);
    expect(charaParashara(lagna,planets,birth,asOf).periods.slice(0,12).map((p)=>p.years)).toEqual([2,11,11,1,12,2,1,9,4,0,3,7]);
    expect(sthira(6,planets,birth,asOf).periods.map((p)=>p.years)).toEqual([7,8,9,7,8,9,7,8,9,7,8,9]);
    expect(shoola(5,birth,asOf).periods.map((p)=>p.years)).toEqual(Array(12).fill(9));
    expect(navamsaDasha(lagna,birth,asOf).periods.map((p)=>p.years)).toEqual(Array(12).fill(9));
    expect(brahmaDasha(6,planets,birth,asOf).periods.map((p)=>p.years)).toEqual([2,3,4,5,5,7,2,11,12,5,1,10]);
    expect(mandooka(5,birth,asOf).periods.map((p)=>p.years)).toEqual([9,9,9,9,8,8,8,8,7,7,7,7]);
    expect(trikonaDasha(lagna,planets,birth,asOf).periods.map((p)=>p.years)).toEqual([12,4,2,2,0,11,1,3,11,9,7,1]);
    expect(drigDasha(lagna,planets,birth,asOf).periods.map((p)=>p.years)).toEqual([12,9,3,11,1,2,0,1,11,2,4,7]);
  });
  it("calculates special lagnas and shadow planets", () => {
    const result=specialLagnas({
      lagnaLongitude:lagna,
      moonLongitude:135.295833333333,
      sunLongitude:94.7330555555556,
      sunriseSunLongitude:94.7330555555556,
      rahuLongitude:20.8458333333333,
      birthMinutes:630,
      sunriseMinutes:371.3,
    });
    expect(result.bl).toBeCloseTo(159.408055555556,3);
    expect(result.hl).toBeCloseTo(224.083055555556,3);
    expect(result.gl).toBeCloseTo(58.108055555556,3);
    expect(result.il).toBeCloseTo(285.295833333333, 6);
    const upagrahas = sunUpagrahas(94.7330555555556);
    expect(Object.values(upagrahas).map((value) => Number(value.toFixed(3)))).toEqual([
      228.066,131.934,311.934,48.066,64.733,
    ]); /* toBeCloseTo values are covered above; exact floating-point differs below */
  });
  it("calculates Argala net values", () => {
    expect(argalaTable(5,planets).map((r)=>r.net)).toEqual([2,1,0,2,1,1,2,3,1,2,3,0]);
  });
});
