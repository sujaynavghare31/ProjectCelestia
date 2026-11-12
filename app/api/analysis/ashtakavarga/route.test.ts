import { describe, expect, it } from "vitest";
import { POST } from "./route";

const positions = [
  { name: "Sun", sign: 0 },
  { name: "Moon", sign: 1 },
  { name: "Mars", sign: 2 },
  { name: "Mercury", sign: 3 },
  { name: "Jupiter", sign: 4 },
  { name: "Venus", sign: 5 },
  { name: "Saturn", sign: 6 },
];

function request(body: unknown) {
  return new Request("http://localhost/api/analysis/ashtakavarga", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/analysis/ashtakavarga", () => {
  it("calculates the bindus when the deferred analysis is requested", async () => {
    const response = await POST(request({ planets: positions, ascendant: { name: "Ascendant", sign: 7 } }));
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.rows).toHaveLength(7);
    expect(result.sarvashtakavarga).toHaveLength(12);
    expect(result.sarvashtakavarga.reduce((sum: number, value: number) => sum + value, 0))
      .toBe(result.rows.reduce((sum: number, row: { total: number }) => sum + row.total, 0));
  });

  it("rejects malformed planetary positions", async () => {
    const response = await POST(request({
      planets: [{ name: "Sun", sign: 12 }],
      ascendant: { name: "Ascendant", sign: 0 },
    }));

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: expect.any(String) });
  });
});
