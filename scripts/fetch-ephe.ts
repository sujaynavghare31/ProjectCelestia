import { mkdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = "https://www.astro.com/ftp/swisseph/";
const FILES = [
  "seas_18.se1", "semo_18.se1",
  "ast7/se07066s.se1", "ast1/se01181s.se1",
  "ast0/se00433s.se1", "ast0/se00016s.se1", "ast0/se00010s.se1", "ast0/se00005s.se1", "ast0/se00019s.se1",
  "ast136/s136199s.se1", "ast90/s090377s.se1", "ast136/s136472s.se1", "ast136/s136108s.se1", "ast50/s050000s.se1", "ast90/s090482s.se1",
];

await mkdir("ephe", { recursive: true });
const manifest: Array<{ file: string; bytes: number }> = [];
for (const file of FILES) {
  const response = await fetch(`${ROOT}${file}`);
  if (!response.ok) continue;
  const target = join("ephe", file);
  await mkdir(join("ephe", file.split("/").slice(0, -1).join("/")), { recursive: true }).catch(() => undefined);
  const data = Buffer.from(await response.arrayBuffer());
  await writeFile(target, data);
  manifest.push({ file, bytes: (await stat(target)).size });
}
await writeFile("ephe/manifest.json", `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Downloaded ${manifest.length} ephemeris files.`);
