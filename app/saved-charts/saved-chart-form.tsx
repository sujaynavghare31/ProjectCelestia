"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Crosshair, LoaderCircle, MapPin } from "lucide-react";
import { clearCachedSavedProfiles } from "@/lib/saved-profiles-cache";

interface GeocodeResult {
  label: string;
  city: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

type CreateProfileAction = (formData: FormData) => void | Promise<void>;

const INPUT_CLASS = "mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/40";

export default function SavedChartForm({ action }: { action: CreateProfileAction }) {
  const { userId } = useAuth();
  const [city, setCity] = useState("");
  const [locationSelected, setLocationSelected] = useState(false);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [timezone, setTimezone] = useState("");
  const [locationResults, setLocationResults] = useState<GeocodeResult[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationSearchComplete, setLocationSearchComplete] = useState(false);
  const [currentLocationLoading, setCurrentLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    const query = city.trim();
    if (query.length < 2 || locationSelected) {
      setLocationResults([]);
      setLocationLoading(false);
      setLocationSearchComplete(false);
      setLocationError(null);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLocationLoading(true);
      setLocationSearchComplete(false);
      setLocationError(null);
      try {
        const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        const result = await response.json() as { results?: GeocodeResult[]; error?: string };
        if (!response.ok || result.error) throw new Error(result.error ?? `Place search failed (${response.status}).`);
        if (!Array.isArray(result.results)) throw new Error("Place search returned an invalid result.");
        setLocationResults(result.results);
        setLocationSearchComplete(true);
      } catch (error) {
        if (controller.signal.aborted) return;
        setLocationResults([]);
        setLocationSearchComplete(false);
        setLocationError(error instanceof Error ? error.message : "Unable to search for this location.");
      } finally {
        if (!controller.signal.aborted) setLocationLoading(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [city, locationSelected]);

  const chooseLocation = (location: GeocodeResult) => {
    setLocationSelected(true);
    setCity(location.city);
    setLatitude(String(location.latitude));
    setLongitude(String(location.longitude));
    setTimezone(location.timezone);
    setLocationResults([]);
    setLocationSearchComplete(false);
    setLocationError(null);
  };

  const useCurrentLocation = () => {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError("Location access is unavailable in this browser. Search for a city or enter coordinates instead.");
      return;
    }

    setCurrentLocationLoading(true);
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      const { latitude: currentLatitude, longitude: currentLongitude } = coords;
      void fetch(`/api/geocode?lat=${currentLatitude}&lng=${currentLongitude}&reverse=true`)
        .then(async (response) => {
          const result = await response.json() as { timezone?: string; city?: string; error?: string };
          if (!response.ok || !result.timezone || !result.city) {
            throw new Error(result.error ?? `Current location lookup failed (${response.status}).`);
          }
          chooseLocation({
            label: result.city,
            city: result.city,
            latitude: currentLatitude,
            longitude: currentLongitude,
            timezone: result.timezone,
          });
        })
        .catch((error: unknown) => {
          setLocationError(error instanceof Error ? error.message : "Unable to identify this location. Search for a city or enter coordinates instead.");
        })
        .finally(() => setCurrentLocationLoading(false));
    }, (error) => {
      setLocationError(error.code === error.PERMISSION_DENIED
        ? "Location access was denied. Search for a city or enter coordinates instead."
        : error.code === error.TIMEOUT
          ? "Location lookup timed out. Search for a city or enter coordinates instead."
          : "Your device could not determine its location. Search for a city or enter coordinates instead.");
      setCurrentLocationLoading(false);
    }, { enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000 });
  };

  const handleCityChange = (value: string) => {
    setLocationSelected(false);
    setCity(value);
    setLatitude("");
    setLongitude("");
    setTimezone("");
    setLocationError(null);
  };

  return (
    <form
      action={action}
      onSubmit={() => {
        if (userId) clearCachedSavedProfiles(userId);
      }}
      className="mt-6 grid gap-4 sm:grid-cols-2"
    >
      <label className="text-sm font-medium">
        Chart name <span className="font-normal text-muted-foreground">(optional)</span>
        <input name="chartName" maxLength={100} placeholder="Enter Jataka's name" className={INPUT_CLASS} />
      </label>
      <label className="text-sm font-medium">
        Person name
        <input name="fullName" required maxLength={160} placeholder="Full name" className={INPUT_CLASS} />
      </label>
      <label className="text-sm font-medium">
        Date of birth
        <input name="dob" type="date" required className={INPUT_CLASS} />
      </label>
      <label className="text-sm font-medium">
        Time of birth
        <input name="time" type="time" step={1} required className={INPUT_CLASS} />
      </label>
      <label className="text-sm font-medium">
        Gender
        <select name="sex" defaultValue="male" className={`${INPUT_CLASS} pr-8`}>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="not-applicable">Not specified</option>
        </select>
      </label>
      <div className="relative min-w-0 text-sm font-medium">
        <label htmlFor="saved-chart-city">Birth city</label>
        <div className="relative mt-2">
          <MapPin aria-hidden="true" className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
          <input
            id="saved-chart-city"
            name="city"
            required
            maxLength={160}
            value={city}
            onChange={(event) => handleCityChange(event.target.value)}
            placeholder="Search city or place"
            autoComplete="off"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={locationResults.length > 0}
            aria-controls="saved-chart-location-results"
            aria-describedby={locationError ? "saved-chart-location-error" : undefined}
            className={`${INPUT_CLASS} mt-0 pl-9 pr-11`}
          />
          <button
            type="button"
            onClick={useCurrentLocation}
            disabled={currentLocationLoading}
            title={currentLocationLoading ? "Finding current location" : "Use current location"}
            aria-label={currentLocationLoading ? "Finding current location" : "Use current location"}
            className="absolute right-1 top-1 grid size-8 place-items-center rounded text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-wait disabled:opacity-60"
          >
            {currentLocationLoading ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Crosshair aria-hidden="true" className="size-4" />}
          </button>
        </div>
        {locationLoading && <p role="status" className="mt-1 text-xs text-muted-foreground">Searching places…</p>}
        {locationError && <p id="saved-chart-location-error" role="alert" className="mt-1 text-xs text-rose-700 dark:text-rose-300">{locationError}</p>}
        {locationSearchComplete && locationResults.length === 0 && <p role="status" className="mt-1 text-xs text-muted-foreground">No places found. Try a nearby city or enter coordinates manually.</p>}
        {locationResults.length > 0 && (
          <ul id="saved-chart-location-results" role="listbox" aria-label="Location search results" className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-xl">
            {locationResults.map((location) => (
              <li key={`${location.label}-${location.latitude}-${location.longitude}`} role="option" aria-selected={false}>
                <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => chooseLocation(location)} className="w-full rounded-lg px-3 py-2 text-left transition hover:bg-muted focus-visible:bg-muted focus-visible:outline-none">
                  <span className="block truncate text-sm font-medium text-foreground">{location.city}</span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">{location.label} · {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)} · {location.timezone}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <label className="text-sm font-medium">
        Latitude
        <input name="latitude" type="number" step="any" min="-90" max="90" required value={latitude} onChange={(event) => setLatitude(event.target.value)} placeholder="Choose a city or enter coordinates" className={INPUT_CLASS} />
      </label>
      <label className="text-sm font-medium">
        Longitude
        <input name="longitude" type="number" step="any" min="-180" max="180" required value={longitude} onChange={(event) => setLongitude(event.target.value)} className={INPUT_CLASS} />
      </label>
      <label className="text-sm font-medium sm:col-span-2">
        Timezone
        <input name="timezone" required maxLength={100} value={timezone} onChange={(event) => setTimezone(event.target.value)} placeholder="Selected automatically from the location or enter manually" className={INPUT_CLASS} />
      </label>
      <label className="text-sm font-medium sm:col-span-2">
        Personal notes
        <textarea name="notes" rows={3} maxLength={10000} placeholder="Add context, observations, or questions…" className="mt-2 w-full resize-y rounded-lg border border-border bg-background px-3 py-2.5 text-sm leading-6 outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/40" />
      </label>
      <div className="sm:col-span-2">
        <button type="submit" className="h-10 rounded-lg bg-[#C64F30] px-4 text-sm font-semibold text-white transition hover:bg-[#A94025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C64F30]/40 focus-visible:ring-offset-2">Save chart</button>
      </div>
    </form>
  );
}
