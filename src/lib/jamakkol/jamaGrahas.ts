export const JAMA_NAMES = ["Sun", "Mars", "Jupiter", "Mercury", "Venus", "Saturn", "Moon", "Snake"] as const;
export const JAMA_SHORT = ["SU", "MA", "JU", "ME", "VE", "SA", "MO", "SN"] as const;
export const JAMA_TAMIL_SIGNS = ["Mesham", "Rishabam", "Mithunam", "Kadagam", "Simmam", "Kanni", "Thulam", "Viruchigam", "Dhanusu", "Makaram", "Kumbam", "Meenam"] as const;
export const JAMA_WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

const LORD_INDEX = [0, 6, 1, 3, 2, 4, 5] as const;
const EXALT_SIGN = [0, 1, 9, 5, 3, 11, 6, 1] as const;

export interface JamaGraha {
  k: number;
  name: (typeof JAMA_NAMES)[number];
  short: (typeof JAMA_SHORT)[number];
  longitude: number;
  signIndex: number;
  sign: (typeof JAMA_TAMIL_SIGNS)[number];
  degreeInSign: number;
  exalted: boolean;
}

export interface JamaGrahasResult {
  weekday: (typeof JAMA_WEEKDAYS)[number];
  half: "Day" | "Night";
  jamam: number;
  minutesElapsed: number;
  grahas: JamaGraha[];
}

export function jamaGrahas(date: string, time: string): JamaGrahasResult {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(time);
  if (!dateMatch || !timeMatch) throw new Error("Jamakkol date and time must use YYYY-MM-DD and HH:MM[:SS].");

  const [, yearText, monthText, dayText] = dateMatch;
  const [, hourText, minuteText, secondText = "0"] = timeMatch;
  const h = Number(hourText), m = Number(minuteText), s = Number(secondText);
  if (h > 23 || m > 59 || s > 59) throw new Error("Invalid Jamakkol local time.");

  const mins = h * 60 + m + s / 60;
  const year = Number(yearText), month = Number(monthText), day = Number(dayText);
  const calendar = new Date(Date.UTC(year, month - 1, day));
  if (calendar.getUTCFullYear() !== year || calendar.getUTCMonth() !== month - 1 || calendar.getUTCDate() !== day) {
    throw new Error("Invalid Jamakkol local date.");
  }
  let weekdayIndex = calendar.getUTCDay();
  if (mins < 360) weekdayIndex = (weekdayIndex + 6) % 7;
  const li = LORD_INDEX[weekdayIndex];
  const el = ((((mins - 360) % 720) + 720) % 720);
  const half: "Day" | "Night" = mins >= 360 && mins < 1080 ? "Day" : "Night";
  const jamam = Math.floor(el / 90) + 1;

  const grahas = JAMA_NAMES.map((name, k): JamaGraha => {
    const longitude = (((360 - el * 0.5 - 45 * (k - li)) % 360) + 360) % 360;
    const signIndex = Math.floor(longitude / 30);
    const degreeInSign = longitude - signIndex * 30;
    return {
      k,
      name,
      short: JAMA_SHORT[k],
      longitude,
      signIndex,
      sign: JAMA_TAMIL_SIGNS[signIndex],
      degreeInSign,
      exalted: signIndex === EXALT_SIGN[k],
    };
  });

  return { weekday: JAMA_WEEKDAYS[weekdayIndex], half, jamam, minutesElapsed: el, grahas };
}

export function localNow(timeZone: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}:${values.second}`,
  };
}

export function formatJama(longitude: number) {
  const totalMinutes = Math.floor((((longitude % 360) + 360) % 360) * 60 + 1e-7) % (360 * 60);
  const signIndex = Math.floor(totalMinutes / (30 * 60));
  const degrees = Math.floor((totalMinutes % (30 * 60)) / 60);
  const minutes = totalMinutes % 60;
  return `${JAMA_TAMIL_SIGNS[signIndex]} ${degrees}°${String(minutes).padStart(2, "0")}′`;
}
