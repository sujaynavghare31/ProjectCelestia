# Dasha and Nadi timing rules

The timing engines are under this directory. They accept one sidereal longitude and speed for each of the nine grahas, an exact ascendant longitude, birth UTC, and an IANA timezone. The Dasha calculations use the existing Swiss Ephemeris longitudes and run in the local application; they do not depend on third-party astrology APIs. Signs are numbered 1–12. Shared date arithmetic, input validation, and defaults are in `core.ts`, `validation.ts`, and `config.ts`.

## Dasha seed and local execution

`TimingInput.dashaSeed` selects the Moon (default), Ascendant, Sun, or natal Ascendant lord longitude. The same seed determines the starting nakshatra/sign and birth balance; it does not change natal planetary placements. The browser dashboard calculates from the existing Swiss Ephemeris chart payload and does not request a Dasha API route.

## Vimshottari and Ashtottari Dasha

Vimshottari uses the 120-year nine-lord sequence. Ashtottari uses the 108-year eight-lord sequence, its assigned nakshatra groups (including the Abhijit interval), and reports when the traditional Rahu/Ascendant-lord eligibility condition is not satisfied. Maha periods are the only precomputed planetary level. Antar and Pratyantar periods are generated as their rows are opened; Sookshma is generated only for an opened Pratyantar row.

## Yogini Dasha

`calculateYoginiDasha` determines the starting Yogini and remaining balance from the selected seed's nakshatra position using the repeating 36-year, eight-Yogini sequence. Subperiods are proportional to each Yogini's cycle length and are expanded by the dashboard on demand. Periods preceding birth retain virtual-start metadata.

## Chara Dasha

`calculateCharaDasha` produces sign-based Maha and Antar periods starting from the selected seed sign. Sign order and duration depend on the configured Chara method, ninth-sign direction, dual-lord selection, and exaltation/debilitation adjustment. Chara intentionally stops at Antar.

## Kalachakra Dasha

The local implementation derives the starting Rashi from the selected seed's Navamsha, applies the Savya/Apasavya sign direction, and uses the specified 12-sign duration table (118 years total). Deha is the starting Navamsha sign and Jeeva is the ninth sign in the chosen direction; Rashi Antars are weighted by the same duration table. The precise Kalachakra pada-to-sequence lookup varies by tradition and was not supplied in the feature specification, so this implementation uses that explicit deterministic convention rather than claiming lineage-specific pada tables.

## Nadi progression

`calculateNadiTimeline` joins annual Bhrigu Chakra Paddhati (BCP) years, running Chara/Yogini periods, BNN transit sign ingress activations, and Jupiter/Saturn Bhrigu Bindu hits. Progressed longitude advances at 1 degree per year; the chart placement advances one sign per 12 years. BCP supports local birthday boundaries or configured year-length boundaries. The production transit provider uses local Swiss Ephemeris Moshier calculations in Lahiri sidereal mode; tests can inject a deterministic provider. The default BNN transit sampling interval is 30 days and is configurable. The dashboard renders progressed Jupiter, Saturn, Rahu, and Ketu in a North Indian diamond chart.

`POST /api/astrology/dasha/chara`, `POST /api/astrology/dasha/yogini`, and `POST /api/astrology/nadi/timeline` validate their JSON inputs with Zod. Nadi transit progression remains server-side and separate from the browser-safe Dasha engine.

Timing rule choices are exposed in `DEFAULT_TIMING_CONFIG` and the super-admin-only `/admin/astrology-config` page. Configuration is saved to the current browser only and is included in subsequent calculations from that browser; server defaults remain unchanged.
