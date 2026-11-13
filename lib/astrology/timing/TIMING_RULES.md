# Chara, Yogini, and Nadi timing rules

The pure timing engines are under this directory. They accept one sidereal longitude and speed for each of the nine grahas, an exact ascendant longitude, birth UTC, and an IANA timezone. Signs are numbered 1–12. Shared date arithmetic, input validation, and defaults are in `core.ts`, `validation.ts`, and `config.ts`.

## Chara Dasha

`calculateCharaDasha` produces sign-based Mahadasha periods, configured Antar/Pratyantar levels, sign details, karaka information, rule reasons, and clipped periods for the requested range. Sign order and duration depend on the configured Chara method, direction, dual-lord selection, and exaltation/debilitation adjustment.

## Yogini Dasha

`calculateYoginiDasha` determines the starting Yogini and remaining balance from the Moon's nakshatra position. The repeating 36-year cycle is subdivided proportionally into eight Yogini subperiods. Periods preceding birth are clipped while retaining virtual-start metadata.

## Nadi progression

`calculateNadiTimeline` joins annual Bhrigu Chakra Paddhati (BCP) years, running Chara/Yogini periods, BNN transit sign ingress activations, and Jupiter/Saturn Bhrigu Bindu hits. BCP supports local birthday boundaries or configured year-length boundaries. The production transit provider uses Swiss Ephemeris Moshier calculations in Lahiri sidereal mode; tests can inject a deterministic provider. The default BNN transit sampling interval is 30 days and is configurable.

`POST /api/astrology/dasha/chara`, `POST /api/astrology/dasha/yogini`, and `POST /api/astrology/nadi/timeline` validate their JSON inputs with Zod. `POST /api/astrology/nadi/timeline` has a bounded server execution time and honors the selected Nadi modules.

Timing rule choices are exposed in `DEFAULT_TIMING_CONFIG` and the super-admin-only `/admin/astrology-config` page. Configuration is saved to the current browser only and is included in subsequent calculations from that browser; server defaults remain unchanged.
