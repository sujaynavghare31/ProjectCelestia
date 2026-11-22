export type PlaceSource = "search" | "offline" | "recent" | "popular" | "custom";

export interface Place {
  name: string;
  admin?: string;
  country: string;
  countryCode?: string;
  latitude: number;
  longitude: number;
  timezone: string;
  source: PlaceSource;
}

export const DEFAULT_PLACE: Place = {
  name: "Mumbai",
  admin: "Maharashtra",
  country: "India",
  countryCode: "IN",
  latitude: 19.076,
  longitude: 72.8777,
  timezone: "Asia/Kolkata",
  source: "popular",
};

export function formatPlaceLabel(place: Pick<Place, "name" | "admin" | "country">) {
  return [place.name, place.admin || place.country].filter(Boolean).join(", ");
}
