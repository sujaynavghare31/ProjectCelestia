# Project Celestia

Project Celestia is a Royal Cosmos astrology dashboard for exploring Vedic astrology charts, planetary positions, divisional charts, dashas, strengths, yogas, and related analytical systems.

The application is built with Next.js and React, uses Swiss Ephemeris for astronomical calculations, and provides a responsive light/dark dashboard with interactive charts and tables.

## Features

- Current-transit chart initialization using the current date and load time
- Birth-chart and transit-chart workflows with Mumbai as the default city
- D1 Rashi, Bhava Chalit, and grouped divisional-chart selection from D2 through D60
- Panchang and planetary-position summaries
- Vimshottari Dasha timeline with Mahadasha Lagna visualization
- Shadbala planetary-strength dashboard with interactive Recharts visualizations
- Bhavabala house-strength dashboard
- Kundali Yoga and Dosha indicators
- Upagraha details, including longitude and nakshatra information
- Indian Drishti and Western aspect grids
- Element and modality matrix
- Ashtakavarga Bhinna Bindus table
- Interactive D1 and auxiliary-chart highlighting
- Royal Cosmos semantic theme tokens and light/dark mode
- Optional Clerk authentication for saved profiles and feedback
- Prisma/PostgreSQL persistence for users, chart profiles, and feedback

## Technology

- Next.js 16 with the App Router
- React 19 and TypeScript
- Tailwind CSS 4
- Zustand for client-side chart state
- Recharts for data visualizations
- Radix UI Select primitives
- Swiss Ephemeris for planetary calculations
- Prisma 7 with PostgreSQL
- Clerk for authentication
- Vitest for tests

## Requirements

- Node.js 20 or newer
- npm
- PostgreSQL database
- Clerk application credentials for authenticated features
- Swiss Ephemeris data files available to the runtime when required

## Getting started

Clone the repository and install dependencies:

```bash
git clone https://github.com/sujaynavghare31/ProjectCelestia.git
cd ProjectCelestia
npm install
```

Create a local `.env.local` file:

```env
DATABASE_URL="postgresql://postgres:<URL_ENCODED_PASSWORD>@localhost:5432/postgres?schema=public"
```

Add the Clerk variables supplied by your Clerk project when authentication is enabled. Do not commit `.env.local` or any credentials.

Generate the Prisma client and apply the schema:

```bash
npm run db:generate
npm run db:push
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Create a production build |
| `npm start` | Start the production server after building |
| `npm test` | Run the Vitest test suite |
| `npm run db:generate` | Generate the Prisma client |
| `npm run db:push` | Push the Prisma schema to the configured database |

For a local production check:

```bash
npm run build
DATABASE_URL="postgresql://postgres:<URL_ENCODED_PASSWORD>@localhost:5432/postgres?schema=public" npm start
```

## Project structure

```text
app/
  api/
    ephemeris/       Planetary and astrology calculation endpoint
    geocode/         City and coordinate lookup endpoint
    profiles/        Saved chart profile endpoint
  page.tsx           Application shell and dashboard entry point
  globals.css        Theme tokens and shared chart colors
components/
  kundali-dashboard.tsx
                     Main chart dashboard and analytical modules
  medical-astrology-visualizer.tsx
                     Kalapurusha visualization
  ui/select.tsx      Radix-based Select primitives
lib/
  astrology/         Calculation services and focused unit tests
  kundali-store.ts   Zustand chart state
  kundali-types.ts   Shared ephemeris and chart types
  prisma.ts          Prisma client setup
prisma/
  schema.prisma      PostgreSQL persistence schema
public/
  kalapurusha-*.png  Medical astrology visual assets
```

## Calculation notes

The dashboard uses Swiss Ephemeris-backed calculations through `/api/ephemeris`. The default chart mode is a current transit chart; birth-chart calculations are performed explicitly from the submitted birth details.

Some dashboard modules are presentation-oriented analytical views. In particular, the current Shadbala display uses a dashboard-side strength model for visualization and should not be treated as a complete traditional Shadbala authority without further domain validation.

The runtime may log a non-blocking Chiron warning when the optional `seas_18.se1` Swiss Ephemeris file is unavailable. The core planetary chart remains available.

## Testing and quality checks

Run the test suite:

```bash
npm test -- --run
```

Before opening a pull request, also run:

```bash
DATABASE_URL="postgresql://postgres:<URL_ENCODED_PASSWORD>@localhost:5432/postgres?schema=public" npm run build
git diff --check
```

## Deployment

Build the application in the target environment, provide the production PostgreSQL `DATABASE_URL`, configure Clerk credentials, and start the compiled app with:

```bash
npm run build
npm start
```

Ensure Swiss Ephemeris data files are installed and discoverable by the deployment runtime if the deployment requires the optional astronomical datasets.

## Contributing

1. Create a focused branch from `main`.
2. Make the smallest complete change that addresses the issue.
3. Run the tests, production build, and whitespace check.
4. Describe user-visible changes and validation steps in the pull request.
5. Never commit credentials, local environment files, generated secrets, or private database URLs.

## License

No license is currently declared for this repository. Contact the repository owner before redistributing or reusing the source.
