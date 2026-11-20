export type SavedProfileSearchFields = {
  chartName: string | null;
  fullName: string;
  dateOfBirth: string;
  timeOfBirth: string;
  sex: string;
  latitude: number;
  longitude: number;
  timezone: string;
  city: string | null;
  notes: string;
};

function normalizeSearchText(value: string) {
  return value.normalize("NFKD").replace(/\p{M}/gu, "").toLocaleLowerCase();
}

export function matchesSavedProfileQuery(profile: SavedProfileSearchFields, query: string) {
  const terms = normalizeSearchText(query).trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return true;

  const date = new Date(`${profile.dateOfBirth}T00:00:00.000Z`);
  const localizedDates = Number.isNaN(date.getTime())
    ? []
    : [
        date.toLocaleDateString(),
        date.toLocaleDateString("en-GB"),
        date.toLocaleDateString("en-US"),
        date.toLocaleDateString("en-IN"),
      ];
  const searchableFields = [
    profile.chartName,
    profile.fullName,
    profile.city,
    profile.timezone,
    profile.notes,
    profile.dateOfBirth,
    ...localizedDates,
    profile.timeOfBirth,
    profile.sex,
    String(profile.latitude),
    String(profile.longitude),
  ].filter((value): value is string => value !== null);
  const normalizedFields = searchableFields.map(normalizeSearchText);
  const compactFields = normalizedFields.map((value) => value.replace(/[\s\p{P}\p{S}]/gu, ""));
  const searchableText = [...normalizedFields, ...compactFields].join(" ");

  return terms.every((term) => searchableText.includes(term));
}
