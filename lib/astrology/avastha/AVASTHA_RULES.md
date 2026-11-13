# Graha Avastha calculation rules

The calculation engine is `engine.ts` (`ENGINE_VERSION` is returned with every report). All longitudes are sidereal degrees in `[0, 360)` and signs are numbered 1–12. `config.ts` contains the defaults; API callers may override supported options with `POST /api/astrology/avastha`. The ephemeris endpoint also returns this report as `avasthaReport`.

The report currently derives sign, degree, house, nakshatra, pada, and Navamsa position; dignity; retrogression; combustion; planetary-war status; Baladi, Jagradadi, Deeptadi, Lajjitadi, and Shayanadi/Cheshta states; and a weighted strength summary. Rule IDs and reasons accompany the state results for traceability. The existing compact `grahaAvasthas` response remains for compatibility.

Several rules are convention-sensitive. The defaults select compound friendship, BPHS Deeptadi, paksha-based Moon beneficence, 8-number Ketu, and the configured node dignity relationships. Values and switchable conventions are exposed in `DEFAULT_AVASTHA_CONFIG` and the super-admin-only `/admin/astrology-config` page. That page stores overrides in the current browser's local storage; it does not change server-wide defaults.

Planetary war currently uses the lower-longitude rule. Brightness-based victory is intentionally rejected because apparent-brightness input is not part of the ephemeris request. The admin page does not enable that unsupported rule.
