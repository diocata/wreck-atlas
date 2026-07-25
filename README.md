# Wreck Atlas

Wreck Atlas is an educational, map-first experience for discovering documented
shipwrecks and understanding the records behind them. The app is connected to
the project-scoped Supabase Postgres/PostGIS dataset and keeps a 20-record local
demo fallback for offline development.

> Wreck Atlas is for exploration and education. It is **not for marine
> navigation**.

## MVP

The atlas currently includes:

- A full-screen MapLibre map with an OpenFreeMap basemap
- Clustered sonar-style wreck targets and selected-target states
- Search with keyboard navigation and map fly-to
- Era filtering
- Contextual wreck stories, facts, survey notes, and provenance
- Desktop and mobile detail layouts
- Source attribution and persistent navigation warnings
- Loading, empty, and request-failure states

The interface uses the selected **Arcade Sonar** visual direction: a light
chart-style map, cyan discoverable targets, and a yellow lock-on state for the
selected wreck.

## Run locally

Requires Node.js 20.9+ and pnpm.

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

The visual direction comparison route remains available at
[http://localhost:3000/design-lab](http://localhost:3000/design-lab).

Live mode reads `public.wrecks` through server-only Next.js repository code and
PostGIS vector-tile/search functions. Copy `.env.example` to `.env.local` and
set the publishable Supabase key to use live mode; never put a service-role key
in the browser or repository. Set `WRECK_DATA_SOURCE=demo` to force the local
records.

## Checks

```bash
pnpm lint
pnpm build
```

## Project continuity

Cross-agent architectural and operational memory is stored in
[`MEMORIES.md`](MEMORIES.md). Local workspace-specific instructions and the
detailed handoff live in `AGENTS.md` and `PROJECT_HANDOFF.md` when present.

## Application shape

```text
src/
  app/                 Next.js pages and API route handlers
  components/atlas/    Map, toolbar, status, and wreck details
  data/                Representative local wreck records
  lib/                 Domain schemas, validation, and repository
  stores/              Page-scoped atlas state
scripts/import-ukho/   Manual UKHO text validation and import workflow
supabase/              Supabase configuration and database migrations
```

Available API routes:

- `GET /api/wrecks?era=all|before-1900|1900-1945|after-1945`
- `GET /api/wrecks/:id`
- `GET /api/search?q=...`
- `GET /api/wrecks/tiles/:z/:x/:y?era=...` (live vector tiles)

## Data notice

The project-scoped Supabase database contains 102,625 validated records from
the July 2026 UKHO text release. All imported records are now published for
read-only public application access through safe normalized columns and a
compact map table. Complete raw source rows remain private, and PostGIS point
geometry powers spatial indexing, server-side clustering, and vector tiles. See
[`scripts/import-ukho/README.md`](scripts/import-ukho/README.md) for the manual,
reviewable import workflow.

Consult the
[UKHO Global Wrecks and Obstructions source](https://www.admiralty.co.uk/access-data/marine-data)
and its current licence information for the authoritative release.

Map data and imagery are provided by
[OpenFreeMap](https://openfreemap.org/) and
[OpenStreetMap contributors](https://www.openstreetmap.org/copyright).

## Current limitations

- Selection and era filters are not yet URL-backed
- Depth and category filters are not implemented
- The current published release is read-only; an updated UKHO release still
  needs a staging/reconciliation workflow before it can replace this data
- Source updates are manual rather than scheduled
- There are no automated tests, accounts, favourites, or submissions
- The project has not been deployed for production use

The next product slice is a focused desktop/mobile browser QA pass followed by
shareable URL-backed wreck selection and era state.
