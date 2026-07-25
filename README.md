# Wreck Atlas

Wreck Atlas is an educational, map-first experience for discovering documented
shipwrecks and understanding the records behind them. The current MVP is a
local vertical prototype built around 20 representative wrecks.

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

The MVP does not require environment variables or an external database. Its
records are local and served through the same API boundaries intended for a
future production repository.

## Checks

```bash
pnpm lint
pnpm build
```

## Application shape

```text
src/
  app/                 Next.js pages and API route handlers
  components/atlas/    Map, toolbar, status, and wreck details
  data/                Representative local wreck records
  lib/                 Domain schemas, validation, and repository
  stores/              Page-scoped atlas state
```

Available API routes:

- `GET /api/wrecks?era=all|before-1900|1900-1945|after-1945`
- `GET /api/wrecks/:id`
- `GET /api/search?q=...`

## Data notice

The bundled records are a deliberately limited prototype extract and reference
set, not a production dataset. Source-derived UKHO records are identified in
the detail panel, while several well-known wrecks are explicitly marked as
approximate prototype reference records.

Consult the
[UKHO Global Wrecks and Obstructions source](https://www.admiralty.co.uk/access-data/marine-data)
and its current licence information for the authoritative release.

Map data and imagery are provided by
[OpenFreeMap](https://openfreemap.org/) and
[OpenStreetMap contributors](https://www.openstreetmap.org/copyright).

## Current limitations

- Selection and era filters are not yet URL-backed
- Depth and category filters are not implemented
- There is no production database or UKHO import pipeline
- There are no automated tests, accounts, favourites, or submissions
- The project has not been deployed for production use

The next product slice is a focused desktop/mobile browser QA pass followed by
shareable URL-backed wreck selection and era state.
