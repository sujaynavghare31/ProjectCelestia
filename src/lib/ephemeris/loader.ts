import type {
  EphemerisFileManifest,
  EphemerisGroup,
  EphemerisManifest,
  EphemerisYearData,
} from "./types";

const MAX_CACHED_FILES = 16;
const RETRIES = 1;

export class EphemerisAssetError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "EphemerisAssetError";
  }
}

const yearCache = new Map<string, EphemerisYearData>();
let manifestPromise: Promise<EphemerisManifest> | undefined;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function validateManifest(value: unknown): EphemerisManifest {
  if (!isRecord(value) || value.schema !== 1 || !isRecord(value.years)) {
    throw new EphemerisAssetError("The local ephemeris manifest has an unsupported shape.");
  }
  return value as unknown as EphemerisManifest;
}

function validateYearData(value: unknown, year: number): EphemerisYearData {
  if (!isRecord(value) || value.schema !== 1 || value.year !== year || !Number.isFinite(value.t0) || !isRecord(value.bodies)) {
    throw new EphemerisAssetError(`The local ephemeris file for ${year} has an unsupported shape.`);
  }
  return value as unknown as EphemerisYearData;
}

async function retry<T>(operation: () => Promise<T>, description: string): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRIES; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
    }
  }
  throw new EphemerisAssetError(`${description} failed after ${RETRIES + 1} attempts.`, { cause: lastError });
}

async function fetchManifest(): Promise<EphemerisManifest> {
  if (!manifestPromise) {
    manifestPromise = retry(async () => {
      const response = await fetch("/ephem/v1/manifest.json", { cache: "force-cache" });
      if (!response.ok) throw new Error(`Manifest request failed (${response.status}).`);
      return validateManifest(await response.json());
    }, "Local ephemeris manifest").catch((error: unknown) => {
      manifestPromise = undefined;
      throw error;
    });
  }
  return manifestPromise;
}

async function verifyFile(bytes: ArrayBuffer, metadata: EphemerisFileManifest): Promise<void> {
  if (metadata.bytes !== bytes.byteLength) {
    throw new Error(`Ephemeris file size mismatch for ${metadata.file}.`);
  }
  if (!globalThis.crypto?.subtle) return;

  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const checksum = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  if (checksum.toLowerCase() !== metadata.sha256.toLowerCase()) {
    throw new Error(`Ephemeris checksum mismatch for ${metadata.file}.`);
  }
}

function remember(key: string, data: EphemerisYearData): void {
  yearCache.delete(key);
  yearCache.set(key, data);
  while (yearCache.size > MAX_CACHED_FILES) {
    const oldest = yearCache.keys().next().value;
    if (oldest !== undefined) yearCache.delete(oldest);
  }
}

export async function loadEphemerisYear(
  year: number,
  group: EphemerisGroup,
): Promise<EphemerisYearData | null> {
  if (!Number.isInteger(year)) throw new Error("Ephemeris year must be an integer.");
  const key = `${year}/${group}`;
  const cached = yearCache.get(key);
  if (cached) {
    yearCache.delete(key);
    yearCache.set(key, cached);
    return cached;
  }

  const manifest = await fetchManifest();
  const metadata = manifest.years[String(year)]?.[group];
  if (!metadata) return null;

  const url = `/ephem/v1/${metadata.file.replace(/^\/+/, "")}`;
  const data = await retry(async () => {
    const response = await fetch(url, { cache: "force-cache" });
    if (!response.ok) throw new Error(`Ephemeris file request failed (${response.status}).`);
    const bytes = await response.arrayBuffer();
    await verifyFile(bytes, metadata);
    return validateYearData(JSON.parse(new TextDecoder().decode(bytes)) as unknown, year);
  }, `Local ephemeris file ${metadata.file}`);
  remember(key, data);
  return data;
}

export function clearEphemerisCache(): void {
  yearCache.clear();
  manifestPromise = undefined;
}
