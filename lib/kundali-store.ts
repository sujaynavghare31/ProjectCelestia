"use client";

import { create } from "zustand";
import type { ChartStyle, CelestialLanguage, NodeType, ViewPreferences, ZodiacMode } from "@/lib/kundali-types";

export interface BirthProfile {
  id: string;
  name: string;
  sex: "male" | "female" | "not-applicable";
  date: string;
  time: string;
  lat: number;
  lng: number;
  timezone: string;
  city: string;
}

interface KundaliState {
  profile: BirthProfile;
  chartStyle: ChartStyle;
  varga: number;
  decimalDegrees: boolean;
  nodeType: NodeType;
  ayanamsa: string;
  zodiacMode: ZodiacMode;
  customAyanamsaDegrees: number;
  language: CelestialLanguage;
  viewPreferences: ViewPreferences;
  hoveredPlanet: string | null;
  setHoveredPlanet: (planet: string | null) => void;
  setProfile: (profile: Partial<BirthProfile>) => void;
  setTime: (time: string) => void;
  setLocation: (lat: number, lng: number) => void;
  setChartStyle: (chartStyle: ChartStyle) => void;
  setVarga: (varga: number) => void;
  setDecimalDegrees: (decimal: boolean) => void;
  setNodeType: (nodeType: NodeType) => void;
  setAyanamsa: (ayanamsa: string) => void;
  setZodiacMode: (zodiacMode: ZodiacMode) => void;
  setCustomAyanamsaDegrees: (degrees: number) => void;
  setLanguage: (language: CelestialLanguage) => void;
  setViewPreference: <K extends keyof ViewPreferences>(key: K, value: ViewPreferences[K]) => void;
  adjustTime: (seconds: number) => void;
}

function shiftBirthDate(date: string, dayOffset: number) {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return date;
  const shifted = new Date(0);
  shifted.setUTCFullYear(year, month - 1, day + dayOffset);
  return `${String(shifted.getUTCFullYear()).padStart(4, "0")}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}-${String(shifted.getUTCDate()).padStart(2, "0")}`;
}

function shiftTime(date: string, time: string, seconds: number) {
  const [hours = 0, minutes = 0, currentSeconds = 0] = time.split(":").map(Number);
  const rawTotal = (hours * 60 + minutes) * 60 + currentSeconds + seconds;
  const dayOffset = Math.floor(rawTotal / 86400);
  const total = ((rawTotal % 86400) + 86400) % 86400;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return {
    date: shiftBirthDate(date, dayOffset),
    time: [h, m, s].map((part) => String(part).padStart(2, "0")).join(":"),
  };
}

export function getCurrentBirthDateTime(now: Date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now).map(({ type, value }) => [type, value]),
  );

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}:${parts.second}`,
  };
}

export function getBirthDateTimeDefaults(
  profile: Pick<BirthProfile, "date" | "time">,
  now: Date = new Date(),
) {
  const isLegacySampleProfile = profile.date === "1996-08-31"
    && profile.time === "09:30:00";

  if (!isLegacySampleProfile && profile.date && profile.time) return null;

  const current = getCurrentBirthDateTime(now);
  return {
    date: isLegacySampleProfile || !profile.date ? current.date : profile.date,
    time: isLegacySampleProfile || !profile.time ? current.time : profile.time,
  };
}

export const useKundaliStore = create<KundaliState>((set) => ({
  profile: {
    id: "sujay-navghare",
    name: "Current transit",
    sex: "not-applicable",
    date: "",
    time: "",
    lat: 19.076,
    lng: 72.8777,
    timezone: "Asia/Kolkata",
    city: "Mumbai",
  },
  chartStyle: "diamond",
  varga: 9,
  decimalDegrees: false,
  nodeType: "true",
  ayanamsa: "lahiri",
  zodiacMode: "sidereal",
  customAyanamsaDegrees: 0,
  language: "initials",
  viewPreferences: {
    showHouseLabels: false,
    showOuterPlanets: true,
    showAsteroids: false,
    showUpagrahas: true,
    showFortune: false,
    usePlanetIcons: false,
    useSignIcons: false,
    showEqualHouses: false,
    showSignDivisions: false,
    showSignNumbers: true,
    showBhavaCusps: false,
  },
  hoveredPlanet: null,
  setHoveredPlanet: (hoveredPlanet) => set({ hoveredPlanet }),
  setProfile: (profile) => set((state) => ({ profile: { ...state.profile, ...profile } })),
  setTime: (time) => set((state) => ({ profile: { ...state.profile, time } })),
  setLocation: (lat, lng) => set((state) => ({ profile: { ...state.profile, lat, lng } })),
  setChartStyle: (chartStyle) => set({ chartStyle }),
  setVarga: (varga) => set({ varga }),
  setDecimalDegrees: (decimalDegrees) => set({ decimalDegrees }),
  setNodeType: (nodeType) => set({ nodeType }),
  setAyanamsa: (ayanamsa) => set({ ayanamsa }),
  setZodiacMode: (zodiacMode) => set({ zodiacMode }),
  setCustomAyanamsaDegrees: (customAyanamsaDegrees) => set({ customAyanamsaDegrees }),
  setLanguage: (language) => set({ language }),
  setViewPreference: (key, value) => set((state) => ({
    viewPreferences: { ...state.viewPreferences, [key]: value },
  })),
  adjustTime: (seconds) => set((state) => {
    const shifted = shiftTime(state.profile.date, state.profile.time, seconds);
    return { profile: { ...state.profile, ...shifted } };
  }),
}));
