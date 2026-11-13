# Graha Avastha calculation rules

The calculation engine is `engine.ts` (`ENGINE_VERSION` is returned with every report). All longitudes are sidereal degrees in `[0, 360)` and signs are numbered 1–12. `config.ts` contains the defaults; API callers may override supported options with `POST /api/astrology/avastha`. The ephemeris endpoint also returns this report as `avasthaReport`.

The report currently derives sign, degree, house, nakshatra, pada, and Navamsa position; dignity; retrogression; combustion; planetary-war status; Baladi, Jagradadi, Deeptadi, Lajjitadi, and Shayanadi/Cheshta states; and a weighted strength summary. Rahu and Ketu receive only Baladi and Jagradadi states; Deeptadi, Lajjitadi, Shayanadi, and the dependent strength summary are omitted. Rule IDs and reasons accompany the state results for traceability. The existing compact `grahaAvasthas` response remains for compatibility.

Several rules are convention-sensitive. The defaults select compound friendship, BPHS Deeptadi, paksha-based Moon beneficence, 9-number Ketu, and the configured node dignity relationships. Values and switchable conventions are exposed in `DEFAULT_AVASTHA_CONFIG` and the super-admin-only `/admin/astrology-config` page. That page stores overrides in the current browser's local storage; it does not change server-wide defaults.

Planetary war currently uses the lower-longitude rule. Brightness-based victory is intentionally rejected because apparent-brightness input is not part of the ephemeris request. The admin page does not enable that unsupported rule.

Shayanadi uses the planet's sidereal Nakshatra, its Navamsha index within the sign, the Moon's birth Nakshatra, local sunrise-to-birth Ghatis, and the sidereal Ascendant sign. Swiss Ephemeris supplies local sunrise; the default Ghati convention rounds elapsed Ghatis to the nearest integer, and the admin setting can select `nearest`, `ceil`, `floor`, or `exact`. Formula inputs are range-checked, Ghati zero is valid, and a zero modulo result is represented as remainder 12 (`Nidra`). Ketu's default planet number is 9; the admin setting retains 8 as an explicit alternate convention.

Jagradadi uses the five-fold natural-plus-temporary friendship relation. Neecha Bhanga is applied to alertness when the lord of the debilitation sign or the lord of the planet's exaltation sign is in a kendra from the Ascendant or Moon; the dignity field still reports the original debilitation, while the Jagradadi rule and reason identify its cancellation. The compact legacy response is mapped from the same detailed report to prevent conflicting states.

The engine does not claim full Jagannatha Hora parity for its Shayanadi Cheshta/intensity matrix: the available input specification does not define the 1–5 intensity rules or ray data required to reproduce it. The existing name-initial Cheshta classification remains separately traceable.
