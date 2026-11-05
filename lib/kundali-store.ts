"use client";

import { create } from "zustand";
import type { ChartStyle, NodeType } from "@/lib/kundali-types";

export interface BirthProfile {
  id: string;
  name: string;
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
  setProfile: (profile: Partial<BirthProfile>) => void;
  setTime: (time: string) => void;
  setLocation: (lat: number, lng: number) => void;
  setChartStyle: (chartStyle: ChartStyle) => void;
  setVarga: (varga: number) => void;
  setDecimalDegrees: (decimal: boolean) => void;
  setNodeType: (nodeType: NodeType) => void;
  setAyanamsa: (ayanamsa: string) => void;
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

export const useKundaliStore = create<KundaliState>((set) => ({
  profile: {
    id: "sujay-navghare",
    name: "Sujay Navghare",
    date: "1996-08-31",
    time: "09:30:00",
    lat: 19.076,
    lng: 72.8777,
    timezone: "Asia/Kolkata",
    city: "Mumbai, India",
  },
  chartStyle: "diamond",
  varga: 1,
  decimalDegrees: false,
  nodeType: "true",
  ayanamsa: "lahiri",
  setProfile: (profile) => set((state) => ({ profile: { ...state.profile, ...profile } })),
  setTime: (time) => set((state) => ({ profile: { ...state.profile, time } })),
  setLocation: (lat, lng) => set((state) => ({ profile: { ...state.profile, lat, lng } })),
  setChartStyle: (chartStyle) => set({ chartStyle }),
  setVarga: (varga) => set({ varga }),
  setDecimalDegrees: (decimalDegrees) => set({ decimalDegrees }),
  setNodeType: (nodeType) => set({ nodeType }),
  setAyanamsa: (ayanamsa) => set({ ayanamsa }),
  adjustTime: (seconds) => set((state) => {
    const shifted = shiftTime(state.profile.date, state.profile.time, seconds);
    return { profile: { ...state.profile, ...shifted } };
  }),
}));
