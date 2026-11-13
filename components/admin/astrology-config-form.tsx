"use client";

import { useEffect, useState } from "react";
import { DEFAULT_AVASTHA_CONFIG, type AvasthaConfig } from "@/lib/astrology/avastha/config";
import { GRAHAS, type Graha } from "@/lib/astrology/avastha/types";
import { ASTROLOGY_CONFIG_STORAGE_KEY, readSavedAstrologyConfig, writeSavedAstrologyConfig, type SavedAstrologyConfig } from "@/lib/astrology/config-storage";
import { DEFAULT_TIMING_CONFIG } from "@/lib/astrology/timing/config";
import type { TimingConfig } from "@/lib/astrology/timing/types";

const DEFAULTS: { avastha: AvasthaConfig; timing: TimingConfig } = { avastha: DEFAULT_AVASTHA_CONFIG, timing: DEFAULT_TIMING_CONFIG };

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-xs"><span>{label}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="size-4 accent-cyan-700" /></label>;
}

function NumberField({ label, value, min, max, step = 1, onChange }: { label: string; value: number; min?: number; max?: number; step?: number; onChange: (value: number) => void }) {
  return <label className="grid gap-1 text-xs text-muted-foreground">{label}<input type="number" value={value} min={min} max={max} step={step} onChange={(event) => onChange(Number(event.target.value))} className="h-8 rounded-md border border-input bg-background px-2 text-foreground" /></label>;
}

function Choice<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: readonly T[]; onChange: (value: T) => void }) {
  return <label className="grid gap-1 text-xs text-muted-foreground">{label}<select value={value} onChange={(event) => onChange(event.target.value as T)} className="h-8 rounded-md border border-input bg-background px-2 text-foreground">{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
}

function GrahaList({ label, value, onChange }: { label: string; value: Graha[]; onChange: (value: Graha[]) => void }) {
  return <fieldset className="rounded-lg border border-border p-3"><legend className="px-1 text-xs text-muted-foreground">{label}</legend><div className="flex flex-wrap gap-x-3 gap-y-2">{GRAHAS.map((graha) => <label key={graha} className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={value.includes(graha)} onChange={(event) => onChange(event.target.checked ? [...value, graha] : value.filter((item) => item !== graha))} className="size-3.5 accent-cyan-700" />{graha}</label>)}</div></fieldset>;
}

export default function AstrologyConfigForm() {
  const [config, setConfig] = useState(DEFAULTS);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  const [nameMapText, setNameMapText] = useState(JSON.stringify(DEFAULT_AVASTHA_CONFIG.nameLetterAnkas, null, 2));
  const updateAvastha = <K extends keyof AvasthaConfig>(key: K, value: AvasthaConfig[K]) => {
    setConfig((current) => ({ ...current, avastha: { ...current.avastha, [key]: value } }));
  };
  const updateTiming = <K extends keyof TimingConfig>(key: K, value: TimingConfig[K]) => {
    setConfig((current) => ({ ...current, timing: { ...current.timing, [key]: value } }));
  };

  useEffect(() => {
    try {
      const saved = readSavedAstrologyConfig();
      if (saved) {
        setConfig({
          avastha: { ...DEFAULT_AVASTHA_CONFIG, ...saved.avastha } as AvasthaConfig,
          timing: { ...DEFAULT_TIMING_CONFIG, ...saved.timing } as TimingConfig,
        });
        setNameMapText(JSON.stringify({ ...DEFAULT_AVASTHA_CONFIG.nameLetterAnkas, ...saved.avastha.nameLetterAnkas }, null, 2));
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not read the saved configuration.");
    } finally {
      setReady(true);
    }
  }, []);

  const save = () => {
    try {
      const nameLetterAnkas = JSON.parse(nameMapText) as Record<string, number>;
      const next = { ...config, avastha: { ...config.avastha, nameLetterAnkas } };
      writeSavedAstrologyConfig(next);
      setConfig(next);
      setNotice(`Configuration saved in this browser (${ASTROLOGY_CONFIG_STORAGE_KEY}).`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not save the configuration.");
    }
  };

  const reset = () => {
    setConfig(DEFAULTS);
    setNameMapText(JSON.stringify(DEFAULT_AVASTHA_CONFIG.nameLetterAnkas, null, 2));
    try {
      window.localStorage.removeItem(ASTROLOGY_CONFIG_STORAGE_KEY);
      setNotice("Default configuration restored.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not restore defaults.");
    }
  };

  if (!ready) return <p role="status" className="text-sm text-muted-foreground">Loading saved configuration…</p>;

  return (
    <div className="space-y-5">
      <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
        These settings are saved in this browser and applied to calculations started from this browser. They do not change defaults for other users or devices.
      </p>
      <section className="space-y-3 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Graha Avastha</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <Choice label="Friendship mode" value={config.avastha.friendshipMode} options={["compound", "natural"] as const} onChange={(value) => updateAvastha("friendshipMode", value)} />
          <Choice label="Deeptadi tradition" value={config.avastha.deeptadiVariant} options={["BPHS", "Phaladeepika"] as const} onChange={(value) => updateAvastha("deeptadiVariant", value)} />
          <Choice label="Moon benefic rule" value={config.avastha.moonBeneficRule} options={["paksha", "shuklaAshtami"] as const} onChange={(value) => updateAvastha("moonBeneficRule", value)} />
          <Choice label="Ketu numbering" value={String(config.avastha.ketuNumber)} options={["8", "9"]} onChange={(value) => updateAvastha("ketuNumber", Number(value) as 8 | 9)} />
          <Choice label="Navamsa mode" value={config.avastha.navamsaMode} options={["indexInSign", "navamsaSign"] as const} onChange={(value) => updateAvastha("navamsaMode", value)} />
          <Choice label="Ghati rounding" value={config.avastha.ghatiRounding} options={["ceil", "floor", "exact"] as const} onChange={(value) => updateAvastha("ghatiRounding", value)} />
          <Choice label="Planetary war winner" value="lowerLongitude" options={["lowerLongitude"] as const} onChange={(value) => updateAvastha("yuddhaWinnerRule", value)} />
          <NumberField label="Vriddha strength (%)" value={config.avastha.vriddhaResultPercent} min={0} max={100} step={0.5} onChange={(value) => updateAvastha("vriddhaResultPercent", value)} />
          <NumberField label="Conjunction orb (degrees)" value={config.avastha.conjunctionOrb ?? 8} min={0} max={15} step={0.1} onChange={(value) => updateAvastha("conjunctionOrb", value)} />
          <NumberField label="Rahu exaltation sign (1–12)" value={config.avastha.rahuExaltSign} min={1} max={12} onChange={(value) => updateAvastha("rahuExaltSign", value)} />
          <NumberField label="Ketu exaltation sign (1–12)" value={config.avastha.ketuExaltSign} min={1} max={12} onChange={(value) => updateAvastha("ketuExaltSign", value)} />
          <NumberField label="Rahu debilitation sign (1–12)" value={config.avastha.rahuDebilSign} min={1} max={12} onChange={(value) => updateAvastha("rahuDebilSign", value)} />
          <NumberField label="Ketu debilitation sign (1–12)" value={config.avastha.ketuDebilSign} min={1} max={12} onChange={(value) => updateAvastha("ketuDebilSign", value)} />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Toggle label="Include node aspects" checked={config.avastha.nodeAspects} onChange={(value) => updateAvastha("nodeAspects", value)} />
          <Toggle label="Include nodes in Baladi" checked={config.avastha.includeNodesInBaladi} onChange={(value) => updateAvastha("includeNodesInBaladi", value)} />
          <Toggle label="Moolatrikona counts as Jagrat" checked={config.avastha.jagratIncludesMoolatrikona} onChange={(value) => updateAvastha("jagratIncludesMoolatrikona", value)} />
          <Toggle label="Defeated war counts as Vikala" checked={config.avastha.vikalaIncludesDefeatedWar} onChange={(value) => updateAvastha("vikalaIncludesDefeatedWar", value)} />
          <Toggle label="Use extended watery signs" checked={config.avastha.wateryExtended} onChange={(value) => updateAvastha("wateryExtended", value)} />
          <Toggle label="Kshobhita uses combustion orb" checked={config.avastha.kshobhitaUseCombustionOrb} onChange={(value) => updateAvastha("kshobhitaUseCombustionOrb", value)} />
        </div>
        <p className="text-[11px] text-muted-foreground">Brightness-based Graha Yuddha is disabled because apparent-brightness input is not currently calculated.</p>
        {(["nodeFriends", "nodeNeutral", "nodeEnemies"] as const).map((key) => (
          <GrahaList key={key} label={key.replace("node", "Node ")} value={config.avastha[key]} onChange={(value) => updateAvastha(key, value)} />
        ))}
        <div className="grid gap-2 sm:grid-cols-2">
          {Object.entries(config.avastha.deeptadiPercentages).map(([state, value]) => (
            <NumberField key={state} label={`${state} result (%)`} value={value} min={0} max={100} step={1} onChange={(next) => updateAvastha("deeptadiPercentages", { ...config.avastha.deeptadiPercentages, [state]: next })} />
          ))}
          {(Object.keys(config.avastha.strengthWeights) as Array<keyof AvasthaConfig["strengthWeights"]>).map((key) => (
            <NumberField key={key} label={`${key} strength weight`} value={config.avastha.strengthWeights[key]} min={0} max={100} onChange={(value) => updateAvastha("strengthWeights", { ...config.avastha.strengthWeights, [key]: value })} />
          ))}
          {(["rahuMoolatrikonaSigns", "ketuMoolatrikonaSigns", "rahuOwnSigns", "ketuOwnSigns"] as const).map((key) => (
            <label key={key} className="grid gap-1 text-xs text-muted-foreground">{key} (sign numbers, comma separated)<input value={config.avastha[key].join(",")} onChange={(event) => updateAvastha(key, event.target.value.split(",").map((item) => Number(item.trim())).filter(Number.isInteger))} className="h-8 rounded-md border border-input bg-background px-2 text-foreground" /></label>
          ))}
        </div>
        <label className="grid gap-1 text-xs text-muted-foreground">Name-letter Anka mapping (JSON)<textarea value={nameMapText} onChange={(event) => setNameMapText(event.target.value)} rows={4} className="rounded-md border border-input bg-background p-2 font-mono text-xs text-foreground" /></label>
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Chara, Yogini & Nadi timing</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <Choice label="Year length" value={config.timing.yearLength} options={["solar365.2425", "savana360", "sidereal365.256363"] as const} onChange={(value) => updateTiming("yearLength", value)} />
          <Choice label="Chara method" value={config.timing.charaMethod} options={["KNRao", "Iranganti"] as const} onChange={(value) => updateTiming("charaMethod", value)} />
          <Choice label="Dual-lord rule" value={config.timing.dualLordRule} options={["KNRao", "custom"] as const} onChange={(value) => updateTiming("dualLordRule", value)} />
          <Choice label="Antardasha direction" value={config.timing.adDirection} options={["byMDSign", "sameAsMD"] as const} onChange={(value) => updateTiming("adDirection", value)} />
          <Choice label="Karaka scheme" value={String(config.timing.karakaScheme)} options={["7", "8"]} onChange={(value) => updateTiming("karakaScheme", Number(value) as 7 | 8)} />
          <Choice label="Sankata lord" value={config.timing.sankataLord} options={["Rahu", "Ketu"] as const} onChange={(value) => updateTiming("sankataLord", value)} />
          <Choice label="BCP boundary" value={config.timing.bcpYearBoundary} options={["birthday", "solarReturn"] as const} onChange={(value) => updateTiming("bcpYearBoundary", value)} />
          <Choice label="Jeeva karaka" value={config.timing.jeevaKaraka ?? "By gender/default"} options={["By gender/default", "Jupiter", "Venus"]} onChange={(value) => updateTiming("jeevaKaraka", value === "By gender/default" ? undefined : value as "Jupiter" | "Venus")} />
          <NumberField label="BNN transit step (days)" value={config.timing.bnnStepDays} min={1} max={366} onChange={(value) => updateTiming("bnnStepDays", value)} />
          <NumberField label="Bhrigu Bindu orb (degrees)" value={config.timing.bbOrb} min={0} max={15} step={0.1} onChange={(value) => updateTiming("bbOrb", value)} />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Toggle label="Adjust Chara duration for exaltation/debilitation" checked={config.timing.charaExaltAdjust} onChange={(value) => updateTiming("charaExaltAdjust", value)} />
          <Toggle label="Progress natal planets with BCP" checked={config.timing.bcpPlanetProgression} onChange={(value) => updateTiming("bcpPlanetProgression", value)} />
          <Toggle label="Include retrograde previous-sign activation" checked={config.timing.bnnIncludeRetroPrevSign} onChange={(value) => updateTiming("bnnIncludeRetroPrevSign", value)} />
          <Toggle label="Include sign exchange in BNN" checked={config.timing.bnnExchange} onChange={(value) => updateTiming("bnnExchange", value)} />
        </div>
        <GrahaList label="BNN transit planets" value={config.timing.bnnTransitPlanets} onChange={(value) => updateTiming("bnnTransitPlanets", value)} />
        <fieldset className="rounded-lg border border-border p-3"><legend className="px-1 text-xs text-muted-foreground">Nadi modules</legend><div className="flex flex-wrap gap-x-4 gap-y-2">{(["BCP", "BNN_TRANSIT", "BHRIGU_BINDU"] as const).map((module) => <label key={module} className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={config.timing.nadiModules.includes(module)} onChange={(event) => updateTiming("nadiModules", event.target.checked ? [...config.timing.nadiModules, module] : config.timing.nadiModules.filter((item) => item !== module))} className="size-3.5 accent-cyan-700" />{module}</label>)}</div></fieldset>
      </section>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={save} className="h-9 rounded-lg bg-cyan-700 px-4 text-sm font-semibold text-white hover:bg-cyan-800">Save settings in this browser</button>
        <button type="button" onClick={reset} className="h-9 rounded-lg border border-border px-4 text-sm hover:bg-muted">Restore defaults</button>
        {notice && <p role="status" className="text-xs text-muted-foreground">{notice}</p>}
      </div>
    </div>
  );
}
