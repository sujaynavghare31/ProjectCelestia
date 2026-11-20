// Sample chart from the KP software screenshot: 20-Nov-2026 18:10:51 IST, Delhi (Malviya Nagar), KP New ayanamsa 24°8′32″
import { fromSignDMS } from "./lords";
const s = (sign: number, d: number, m: number, sec: number) => fromSignDMS(sign, d, m, sec);
export const SAMPLE = {
  birth: { date: "2026-11-20", time: "18:10:51", tzHours: 5.5, latitude: 28 + 32 / 60 + 8 / 3600, longitude: 77 + 12 / 60 + 50 / 3600 },
  ayanamsa: 24 + 8 / 60 + 32 / 3600,
  planets: {
    Sun: s(7, 4, 3, 41.43), Moon: s(11, 9, 37, 58.4), Mars: s(4, 3, 36, 17.63), Mercury: s(6, 14, 35, 17.5), Jupiter: s(4, 2, 4, 20.65),
    Venus: s(5, 29, 32, 30.62), Saturn: { longitude: s(11, 14, 9, 46.16), retrograde: true }, Rahu: s(10, 0, 53, 49.91),
    Uranus: { longitude: s(1, 9, 45, 36.53), retrograde: true }, Neptune: { longitude: s(11, 7, 36, 43.4), retrograde: true }, Pluto: s(9, 9, 13, 18.26),
  },
  cusps: [s(1, 17, 4, 14.02), s(2, 11, 19, 19.83), s(3, 4, 34, 19.36), s(4, 0, 32, 23.93), s(5, 2, 16, 53.55), s(6, 9, 47, 15.19),
          s(7, 17, 4, 14.02), s(8, 11, 19, 19.83), s(9, 4, 34, 19.36), s(10, 0, 32, 23.93), s(11, 2, 16, 53.55), s(0, 9, 47, 15.19)],
};
