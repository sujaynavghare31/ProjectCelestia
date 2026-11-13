/**
 * Numerology engine – public API.
 * Port of Numerology_Calculator_Chaldean_Pythagorean.xlsx (Chaldean + Pythagorean + Lo Shu + Horary).
 * All functions are pure and synchronous: safe to run in a Node API or in the browser.
 */
export * from "./types";
export { TABLES } from "./data/tables";
export * from "./core/math";
export * from "./core/rules";
export * from "./core/date";
export * from "./modules/profile";
export * from "./modules/nameCheck";
export * from "./modules/numberChecks";
export * from "./modules/relationsAndPlaces";
export * from "./modules/business";
export * from "./modules/horary";
export * from "./ui";
