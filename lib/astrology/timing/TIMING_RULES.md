# Dasha and Nadi timing rules

The timing engines are under this directory. They accept one sidereal longitude and speed for each of the nine grahas, an exact ascendant longitude, birth UTC, and an IANA timezone. The Dasha calculations use the existing Swiss Ephemeris longitudes and run in the local application; they do not depend on third-party astrology APIs. Signs are numbered 1–12. Shared date arithmetic, input validation, and defaults are in `core.ts`, `validation.ts`, and `config.ts`.

## Vimshottari and Ashtottari Dasha

`calculateDashaSystem` derives the Moon's exact nakshatra and elapsed fraction from its sidereal longitude. Vimshottari uses the 120-year nine-lord sequence; Ashtottari uses the 108-year sequence and its nakshatra groups beginning with Krittika. Maha, Antar, and Pratyantar periods are returned with clipped birth periods and their rule reasons. Sookshma periods are calculated only for the active period card or when a Pratyantar row is expanded, avoiding a precomputed fourth-level tree.

## Yogini Dasha

`calculateYoginiDasha` determines the starting Yogini and remaining balance from the Moon's nakshatra position using the repeating 36-year, eight-Yogini sequence. Subperiods are proportional to each Yogini's cycle length. Sookshma dates are generated on demand, and periods preceding birth retain virtual-start metadata.

## Chara Dasha

`calculateCharaDasha` produces sign-based Maha and Antar periods. Sign order and duration depend on the configured Chara method, ninth-sign direction, dual-lord selection, and exaltation/debilitation adjustment. Chara intentionally stops at Antar; its configuration and timeline do not expose Pratyantar or Sookshma periods.

## Nadi progression

`calculateNadiTimeline` joins annual Bhrigu Chakra Paddhati (BCP) years, running Chara/Yogini periods, BNN transit sign ingress activations, and Jupiter/Saturn Bhrigu Bindu hits. Progressed longitude advances at 1 degree per year; the chart placement advances one sign per 12 years. BCP supports local birthday boundaries or configured year-length boundaries. The production transit provider uses local Swiss Ephemeris Moshier calculations in Lahiri sidereal mode; tests can inject a deterministic provider. The default BNN transit sampling interval is 30 days and is configurable. The dashboard renders progressed Jupiter, Saturn, Rahu, and Ketu in a North Indian diamond chart.

`POST /api/astrology/dasha/chara`, `POST /api/astrology/dasha/yogini`, and `POST /api/astrology/nadi/timeline` validate their JSON inputs with Zod. `POST /api/astrology/nadi/timeline` has a bounded server execution time and honors the selected Nadi modules.

Timing rule choices are exposed in `DEFAULT_TIMING_CONFIG` and the super-admin-only `/admin/astrology-config` page. Configuration is saved to the current browser only and is included in subsequent calculations from that browser; server defaults remain unchanged.
