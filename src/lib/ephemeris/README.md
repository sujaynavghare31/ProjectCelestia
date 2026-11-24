# Local ephemeris runtime

The runtime loads immutable year files from `/ephem/v1/`, verifies their manifest size and SHA-256 checksum, and caches up to 16 year/group files in memory. Longitudes are unwrapped before cubic interpolation; UTC instants are converted to TT before sampling.

Each manifest year may contain a `planets` and/or `asteroids` entry. Each referenced JSON file uses schema 1 with `year`, `t0` (JD TT), and `bodies`; each body has a `step`, `lon`, and `lat` array. Files need enough padding around the year to provide four samples at both boundaries.

`positionAt` and `positionsAt` accept fallback adapters so the runtime does not make assumptions about the app's API contract. The current chart endpoint returns a complete chart, not the per-body `Position` contract, so an application adapter is required before connecting existing consumers.

No generated `/ephem/v1/` data or JPL/SPK inputs are currently checked in. Until a verified offline generator produces those files and the application adapters are integrated, existing dashboard requests continue using their current implementation; this runtime is not yet a replacement for them.
