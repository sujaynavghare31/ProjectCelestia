// Translate presentation labels only; calculation data remains in its existing form.
export type JamakkolLanguage = "en" | "ta";

export const JAMAKKOL_COPY = {
  en: {
    chartTitle: "JAMAKKOL HORARY",
    heading: "Jamakkol Prasannam",
    calculatedFor: "Calculated for",
    unavailable: "Jamakkol needs a completed planetary calculation. Submit the chart details and try again.",
    displayLanguage: "Jamakkol language",
    jamaGrahas: "Jama Grahas",
    graha: "Graha",
    sign: "Sign",
    degree: "Degree",
    exalted: "Exalted",
    positions: "Positions",
    panchang: "Panchang",
    sunriseSunset: "Sunrise / sunset",
    tamilMonth: "Tamil month",
    moonSign: "Moon sign",
    sunSign: "Sun sign",
    horaLord: "Hora lord",
    jamakkolDay: "Jamakkol day",
    ayanamsa: "Ayanamsa",
    vara: "Vara",
    tithi: "Tithi",
    nakshatra: "Nakshatra",
    yoga: "Yoga",
    karana: "Karana",
    rahuKalam: "Rahu kalam",
    yamagandam: "Yamagandam",
    gulikaKalam: "Gulika kalam",
    none: "None",
    kavippu: "Kavippu",
    count: "count",
    point: "Point",
    type: "Type",
    nakshatraPada: "Nakshatra · Pada",
    legend: "Jamakkol chart legend",
    udayam: "Udayam",
    aarudam: "Aarudam",
  },
  ta: {
    chartTitle: "ஜாமக்கோள் பிரசன்னம்",
    heading: "ஜாமக்கோள் பிரசன்னம்",
    calculatedFor: "கணக்கிடப்பட்ட விவரம்",
    unavailable: "ஜாமக்கோள் கணக்கைக் காண, முதலில் ஜாதக விவரங்களைச் சமர்ப்பிக்கவும்.",
    displayLanguage: "ஜாமக்கோள் மொழி",
    jamaGrahas: "ஜாம கிரகங்கள்",
    graha: "கிரகம்",
    sign: "ராசி",
    degree: "பாகை",
    exalted: "உச்சம்",
    positions: "கிரக நிலைகள்",
    panchang: "பஞ்சாங்கம்",
    sunriseSunset: "சூரிய உதயம் / அஸ்தமனம்",
    tamilMonth: "தமிழ் மாதம்",
    moonSign: "சந்திர ராசி",
    sunSign: "சூரிய ராசி",
    horaLord: "ஹோரா அதிபதி",
    jamakkolDay: "ஜாமக்கோள் நாள்",
    ayanamsa: "அயனாம்சம்",
    vara: "கிழமை",
    tithi: "திதி",
    nakshatra: "நட்சத்திரம்",
    yoga: "யோகம்",
    karana: "கரணம்",
    rahuKalam: "ராகு காலம்",
    yamagandam: "எமகண்டம்",
    gulikaKalam: "குளிகை காலம்",
    none: "இல்லை",
    kavippu: "கவிப்பு",
    count: "எண்ணிக்கை",
    point: "குறிப்பு",
    type: "வகை",
    nakshatraPada: "நட்சத்திரம் · பாதம்",
    legend: "ஜாமக்கோள் வரைபடக் குறியீடுகள்",
    udayam: "உதயம்",
    aarudam: "ஆரூடம்",
  },
} as const;

const TAMIL_SIGNS: Record<string, string> = {
  Mesham: "மேஷம்",
  Rishabam: "ரிஷபம்",
  Mithunam: "மிதுனம்",
  Kadagam: "கடகம்",
  Simmam: "சிம்மம்",
  Kanni: "கன்னி",
  Thulam: "துலாம்",
  Viruchigam: "விருச்சிகம்",
  Dhanusu: "தனுசு",
  Makaram: "மகரம்",
  Kumbam: "கும்பம்",
  Meenam: "மீனம்",
};

const TAMIL_PLANETS: Record<string, string> = {
  Sun: "சூரியன்",
  Moon: "சந்திரன்",
  Mars: "செவ்வாய்",
  Mercury: "புதன்",
  Jupiter: "குரு",
  Venus: "சுக்கிரன்",
  Saturn: "சனி",
  Rahu: "ராகு",
  Ketu: "கேது",
  Mandi: "மாந்தி",
  Snake: "ராகு",
  "Pambu (Rahu)": "ராகு",
};

const TAMIL_PLANET_SHORT: Record<string, string> = {
  SU: "சூ",
  MO: "சந்",
  MA: "செ",
  ME: "பு",
  JU: "கு",
  VE: "சுக்",
  SA: "ச",
  RA: "ரா",
  KE: "கே",
  SN: "ரா",
  ASC: "லக்",
  Mandi: "மா",
};

const TAMIL_WEEKDAYS: Record<string, string> = {
  Sunday: "ஞாயிறு",
  Monday: "திங்கள்",
  Tuesday: "செவ்வாய்",
  Wednesday: "புதன்",
  Thursday: "வியாழன்",
  Friday: "வெள்ளி",
  Saturday: "சனி",
};

const TAMIL_MONTHS: Record<string, string> = {
  Chithirai: "சித்திரை",
  Vaikasi: "வைகாசி",
  Aani: "ஆனி",
  Aadi: "ஆடி",
  Aavani: "ஆவணி",
  Purattasi: "புரட்டாசி",
  Aippasi: "ஐப்பசி",
  Karthigai: "கார்த்திகை",
  Margazhi: "மார்கழி",
  Thai: "தை",
  Maasi: "மாசி",
  Panguni: "பங்குனி",
};

const TAMIL_NAKSHATRAS: Record<string, string> = {
  Ashwini: "அசுவினி",
  Bharani: "பரணி",
  Krittika: "கார்த்திகை",
  Rohini: "ரோகிணி",
  Mrigashira: "மிருகசீரிடம்",
  Ardra: "திருவாதிரை",
  Punarvasu: "புனர்பூசம்",
  Pushya: "பூசம்",
  Ashlesha: "ஆயில்யம்",
  Magha: "மகம்",
  "Purva Phalguni": "பூரம்",
  "Uttara Phalguni": "உத்திரம்",
  Hasta: "அஸ்தம்",
  Chitra: "சித்திரை",
  Swati: "சுவாதி",
  Vishakha: "விசாகம்",
  Anuradha: "அனுஷம்",
  Jyeshtha: "கேட்டை",
  Mula: "மூலம்",
  "Purva Ashadha": "பூராடம்",
  "Uttara Ashadha": "உத்திராடம்",
  Shravana: "திருவோணம்",
  Dhanishta: "அவிட்டம்",
  Shatabhisha: "சதயம்",
  "Purva Bhadrapada": "பூரட்டாதி",
  "Uttara Bhadrapada": "உத்திரட்டாதி",
  Revati: "ரேவதி",
};

const TAMIL_TITHIS: Record<string, string> = {
  Pratipada: "பிரதமை",
  Dwitiya: "துவிதியை",
  Tritiya: "திரிதியை",
  Chaturthi: "சதுர்த்தி",
  Panchami: "பஞ்சமி",
  Shashthi: "சஷ்டி",
  Saptami: "சப்தமி",
  Ashtami: "அஷ்டமி",
  Navami: "நவமி",
  Dashami: "தசமி",
  Ekadashi: "ஏகாதசி",
  Dwadashi: "துவாதசி",
  Trayodashi: "திரயோதசி",
  Chaturdashi: "சதுர்த்தசி",
  Purnima: "பௌர்ணமி",
  Amavasya: "அமாவாசை",
};

const TAMIL_YOGAS: Record<string, string> = {
  Vishkambha: "விஷ்கம்பம்",
  Priti: "பிரீதி",
  Ayushman: "ஆயுஷ்மான்",
  Saubhagya: "சௌபாக்கியம்",
  Shobhana: "சோபனம்",
  Atiganda: "அதிகண்டம்",
  Sukarma: "சுகர்மம்",
  Dhriti: "த்ருதி",
  Shula: "சூலம்",
  Ganda: "கண்டம்",
  Vriddhi: "விருத்தி",
  Dhruva: "துருவம்",
  Vyaghata: "வியாகாதம்",
  Harshana: "ஹர்ஷணம்",
  Vajra: "வஜ்ரம்",
  Siddhi: "சித்தி",
  Vyatipata: "வியதீபாதம்",
  Variyan: "வரியான்",
  Parigha: "பரிகம்",
  Shiva: "சிவம்",
  Siddha: "சித்தம்",
  Sadhya: "சாத்யம்",
  Shubha: "சுபம்",
  Shukla: "சுக்லம்",
  Brahma: "பிரம்மம்",
  Indra: "இந்திரம்",
  Vaidhriti: "வைதிருதி",
};

const TAMIL_KARANAS: Record<string, string> = {
  Kimstughna: "கிம்ஸ்துக்னம்",
  Bava: "பவம்",
  Balava: "பாலவம்",
  Kaulava: "கௌலவம்",
  Taitila: "தைதுலம்",
  Garaja: "கரஜை",
  Vanija: "வணிஜை",
  Vishti: "விஷ்டி",
  Shakuni: "சகுனி",
  Chatushpada: "சதுஷ்பாதம்",
  Naga: "நாகம்",
};

const TAMIL_POINT_NAMES: Record<string, string> = {
  Udayam: "உதயம்",
  Aarudam: "ஆரூடம்",
  Kavippu: "கவிப்பு",
  Ascendant: "லக்னம்",
  "Mesha Veedhi": "மேஷ வீதி",
  "Rishabha Veedhi": "ரிஷப வீதி",
  "Mithuna Veedhi": "மிதுன வீதி",
};

const TAMIL_CATEGORIES: Record<string, string> = {
  Jama: "ஜாமம்",
  Gochara: "கோச்சாரம்",
  Upagraha: "உபகிரகம்",
  "Udayam · Aarudam · Kavippu": "உதயம் · ஆரூடம் · கவிப்பு",
};

export function translateSign(value: string, language: JamakkolLanguage) {
  if (language === "en") return value;
  const signName = value.split(" ")[0];
  return TAMIL_SIGNS[signName] ?? value;
}

export function translatePlanet(value: string, language: JamakkolLanguage) {
  if (language === "en") return value;
  const jamaPrefix = value.startsWith("Jama ");
  const planetName = jamaPrefix ? value.slice(5) : value;
  const translated = TAMIL_PLANETS[planetName] ?? value;
  return jamaPrefix ? `ஜாம ${translated}` : translated;
}

export function translatePlanetShort(value: string, language: JamakkolLanguage) {
  return language === "ta" ? TAMIL_PLANET_SHORT[value] ?? value : value;
}

export function translateWeekday(value: string, language: JamakkolLanguage) {
  return language === "ta" ? TAMIL_WEEKDAYS[value] ?? value : value;
}

export function translatePoint(value: string, language: JamakkolLanguage) {
  if (language === "en") return value;
  const pointName = TAMIL_POINT_NAMES[value];
  if (pointName) return pointName;
  return translatePlanet(value, language);
}

export function translateNakshatraPada(value: string, language: JamakkolLanguage) {
  if (language === "en") return value;
  const match = /^(.*)-([1-4])$/.exec(value);
  if (!match) return TAMIL_NAKSHATRAS[value] ?? value;
  const [, nakshatra, pada] = match;
  return `${TAMIL_NAKSHATRAS[nakshatra] ?? nakshatra} - ${pada}`;
}

export function translatePanchangValue(key: string, value: string, language: JamakkolLanguage) {
  if (language === "en") return value;
  if (key === "vara") return translateWeekday(value, language);
  if (key === "tamilMonth") return TAMIL_MONTHS[value] ?? value;
  if (key === "nakshatra") return translateNakshatraPada(value, language);
  if (key === "moonSign" || key === "sunSign") return translateSign(value, language);
  if (key === "horaLord") return translatePlanet(value, language);
  if (key === "yoga") return TAMIL_YOGAS[value] ?? value;
  if (key === "karana") return TAMIL_KARANAS[value] ?? value;
  if (key === "tithi") {
    const [phase, tithi] = value.split(" ");
    const translatedTithi = TAMIL_TITHIS[tithi] ?? TAMIL_TITHIS[value] ?? value;
    if (phase === "Shukla") return `வளர்பிறை ${translatedTithi}`;
    if (phase === "Krishna") return `தேய்பிறை ${translatedTithi}`;
    return translatedTithi;
  }
  if (key === "jamakkolDay") {
    const match = /^(.+) · (Day|Night) #(\d+) \((.+)–(.+)\)$/.exec(value);
    if (!match) return value;
    const [, weekday, half, number, start, end] = match;
    return `${translateWeekday(weekday, language)} · ${half === "Day" ? "பகல்" : "இரவு"} ஜாமம் #${number} (${start}–${end})`;
  }
  return value;
}

export function translateCategory(value: string, language: JamakkolLanguage) {
  return language === "ta" ? TAMIL_CATEGORIES[value] ?? value : value;
}

export function translatePointName(value: string, language: JamakkolLanguage) {
  if (language === "en") return value;
  if (TAMIL_POINT_NAMES[value]) return TAMIL_POINT_NAMES[value];
  return translatePlanet(value, language);
}

export function translateExalted(language: JamakkolLanguage) {
  return language === "ta" ? "உச்சம்" : "Ex";
}

export function translateJamakkolHalf(value: "Day" | "Night", language: JamakkolLanguage) {
  if (language === "en") return value;
  return value === "Day" ? "பகல்" : "இரவு";
}
