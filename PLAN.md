# Wreck Atlas — Product and Implementation Plan

## 1. Product vision

Wreck Atlas is a map-first exploration experience for discovering documented
shipwrecks around the world.

The product should feel like a calm, futuristic instrument rather than a
traditional website or dashboard:

- The map is the interface.
- Search, filters, selection, and wreck details happen on the same surface.
- Navigation chrome is kept to a minimum.
- Every record shows its source and confidence context.
- The product is explicitly educational and **not for marine navigation**.

The first release is a non-commercial, public-interest atlas. Optional
donations are compatible with that direction, but advertising, affiliate
links, sponsorships, or paid features would require revisiting hosting plans
and product policies.

## 2. Development workflow

Where selectable models are available, use:

- **GPT-5.6 SOL** for product reasoning, architecture, data modelling, security
  review, and code review.
- **GPT-5.6 TERRA** for implementation, styling, tests, and mechanical code
  changes.

This is a cost-efficiency preference for development, not an application
runtime dependency. Every TERRA implementation slice should be grounded in an
agreed plan and should receive a SOL review when the change is architecturally
meaningful.

## 3. Experience principles

1. **Map first:** the first viewport is the atlas, not a landing page.
2. **One surface:** opening a wreck does not navigate away from the map.
3. **Progressive detail:** map markers are light; long narratives load only
   after selection.
4. **Few controls:** one search field, one compact filter trigger, map controls,
   and the contextual wreck panel.
5. **Source-forward:** attribution, source release date, and the navigation
   disclaimer are always discoverable.
6. **Fast motion:** animation explains state changes; it is never decorative.
7. **Accessible by default:** keyboard controls, visible focus, sufficient
   contrast, reduced-motion support, and a usable mobile bottom sheet.

## 4. Visual direction

- Near-black navy ocean canvas
- Sea-glass cyan as the primary interactive accent
- Warm amber reserved for warnings or exceptional states
- Fine grid lines and restrained glow
- Translucent panels with strong text contrast
- Geist Sans for interface text and Geist Mono for coordinates/source metadata
- Lucide icons
- No large UI kit in the first version

### Desktop sketch

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  ✦ WRECK ATLAS     Search a wreck or place…                  Filters   Info │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                         FULL INTERACTIVE MAP                                │
│                                                                             │
│     clusters         selected marker                     ┌────────────────┐ │
│           ●                 ◉                             │ WRECK DETAIL   │ │
│                                                         │ Name / year    │ │
│                                                         │ Depth / type   │ │
│                                                         │ Loss summary   │ │
│                                                         │ Source         │ │
│                                                         └────────────────┘ │
│  UKHO · OGL v3 · Source release date · Not for navigation                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Mobile sketch

```text
┌──────────────────────┐
│ ✦  Search…    Filter │
├──────────────────────┤
│                      │
│        MAP           │
│                      │
│          ◉           │
│                      │
├──────────────────────┤
│  drag handle         │
│  Wreck name · year   │
│  depth · category    │
│  concise loss story  │
└──────────────────────┘
```

## 5. MVP interactions

The first usable version will:

1. Render a global dark map.
2. Display representative wreck records as clustered markers.
3. Expand clusters naturally as the user zooms.
4. Open a contextual wreck panel when a marker is selected.
5. Search by wreck name and fly to the selected location.
6. Filter by era, depth, and category using compact controls.
7. Expand the selected record to show circumstances of loss and survey notes.
8. Preserve a stable shareable URL for a selected wreck.
9. Show source attribution, data status, and “not for navigation.”
10. Use a right-side contextual panel on desktop and a bottom sheet on mobile.

Not in the first version:

- Accounts or authentication
- Favourites
- Community edits or uploads
- AI-generated narratives
- Image ingestion
- Editorial collections
- Advertising or affiliate monetisation
- A custom vector-tile server

## 6. Technical stack

| Layer | Initial choice | Notes |
| --- | --- | --- |
| Application | Next.js App Router + TypeScript | Server-rendered shell and detail metadata |
| Styling | Tailwind CSS + product-specific CSS | Tokens and layout without a heavy component system |
| Map | MapLibre GL JS | Client-only component |
| Prototype basemap | OpenFreeMap | No API key; attribution required; no SLA |
| Client coordination | Zustand | Small, page-scoped store only |
| Validation | Zod | API and importer boundaries |
| Production database | Supabase Postgres + PostGIS | Added after the local vertical prototype |
| Application API | Next.js Route Handlers | Stable contract in front of repositories |
| Source import | Scheduled GitHub Action | Monthly check for the quarterly UKHO release |
| Deployment | Vercel | Hobby while genuinely personal/non-commercial |

## 7. State management boundaries

Zustand is useful for coordinating the map, search, filters, and contextual
panel, but it must stay small.

### Zustand owns

- `selectedWreckId`
- `detailPanelState`
- `filterPanelOpen`
- Current temporary filter draft
- UI actions that coordinate separate client components

### URL search parameters own

- Shareable selected wreck ID
- Committed era filter
- Committed depth filter
- Committed category filter
- Optional map centre/zoom if deep-linked views become useful

### MapLibre owns

- Map instance
- Camera state during panning and zooming
- Hover state
- Cluster rendering

### Server/data layer owns

- Wreck records
- Request caching
- Source import state
- Authentication/session state if it is introduced later

The Zustand store must be created per atlas surface through a client provider.
React Server Components must not read or mutate it.

## 8. Application structure

```text
src/
  app/
    page.tsx
    layout.tsx
    globals.css
    api/
      wrecks/
        route.ts
        [id]/
          route.ts
      search/
        route.ts
  components/
    atlas/
      atlas-shell.tsx
      atlas-map.tsx
      atlas-toolbar.tsx
      filter-popover.tsx
      search-control.tsx
      wreck-detail-panel.tsx
      source-status.tsx
  data/
    demo-wrecks.ts
  lib/
    domain/
      wreck.ts
    repositories/
      wreck-repository.ts
      demo-wreck-repository.ts
      supabase-wreck-repository.ts
    validation/
      wreck-query.ts
  stores/
    atlas-store.ts
    atlas-store-provider.tsx
scripts/
  import-ukho/
    README.md
    download.ts
    parse.ts
    validate.ts
    publish.ts
supabase/
  migrations/
public/
```

The first implementation may keep tightly related atlas components together,
but the public contracts above should remain recognisable.

## 9. Data sources

### Primary source

UK Hydrographic Office Global Wrecks and Obstructions:

- Product page:
  <https://www.admiralty.co.uk/access-data/marine-data>
- Current text download item:
  <https://datahub.admiralty.co.uk/portal/sharing/rest/content/items/60c0908526b844a68494c038a457e1a7/data>
- Licence:
  <https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/>

The dataset is a bulk quarterly source, not a live application API. The
application never downloads or parses it during a visitor request.

### Prototype/backup access

EMODnet exposes a processed WFS layer:

```text
https://ows.emodnet-humanactivities.eu/wfs
```

Layer:

```text
emodnet:wwshipwrecks
```

The direct UKHO release remains the source of truth because it is more complete.

### Later enrichment

- Wikidata structured data under CC0
- Wikimedia Commons images with per-file licence tracking
- NOAA and national heritage sources for regional status

No enrichment source may silently overwrite the official source record.

## 10. Prototype API

The UI will use the same contracts before and after Supabase is connected.

### `GET /api/wrecks`

Returns a compact GeoJSON feature collection suitable for map rendering.

Initially backed by local demo records. Later it can accept:

```text
bbox=west,south,east,north
zoom=number
era=before-1900|1900-1945|after-1945
maxDepth=number
category=string
```

Only lightweight marker fields are returned:

```text
id
coordinates
name
category
sunkYear
depthM
storyReady
```

### `GET /api/wrecks/:id`

Returns the complete record, including narrative, survey notes, source metadata,
and attribution.

### `GET /api/search?q=…`

Returns a small ranked result set containing enough information to select and
fly to a wreck.

## 11. Production database

### `wrecks`

```text
id uuid primary key
source text not null
source_id text not null
name text
category text
status text
vessel_type text
flag text
location geometry(Point, 4326) not null
depth_m numeric
sunk_date_raw text
sunk_year smallint
cargo text
circumstances_of_loss text
surveying_details text
reported_year smallint
source_updated_at timestamptz
raw jsonb not null
published boolean not null default false
active boolean not null default true
created_at timestamptz not null
updated_at timestamptz not null
```

Constraints and indexes:

- Unique `(source, source_id)`
- GiST index on `location`
- Trigram or full-text index on name
- Indexes on `category`, `sunk_year`, and `depth_m`
- Coordinate validity checks

### `wreck_aliases`

```text
wreck_id uuid
name text
source text
```

### `wreck_media` — later

```text
wreck_id uuid
url text
source_page text
creator text
licence text
attribution text
```

### `import_runs`

```text
id uuid primary key
source text
source_checksum text unique
downloaded_at timestamptz
completed_at timestamptz
record_count integer
inserted_count integer
updated_count integer
deactivated_count integer
status text
validation_report jsonb
```

### Security

- Enable RLS on every exposed table.
- Public users may select only `published = true AND active = true` records.
- Public users cannot insert, update, or delete source data.
- The importer uses a server-only secret or direct database connection.
- Never expose a Supabase secret/service-role key to the browser.
- Privileged functions belong in an unexposed schema.

## 12. UKHO import pipeline

```text
Scheduled monthly check
        ↓
Download ZIP and calculate checksum
        ↓
Stop if checksum was already imported
        ↓
Extract and parse TSV into a staging table/file
        ↓
Validate headers, IDs, coordinates, counts, and field formats
        ↓
Normalize while retaining raw values
        ↓
Transactional upsert into Postgres
        ↓
Mark missing records inactive for review; never hard-delete automatically
        ↓
Write import report and publish lightweight map artifact
```

Reject a source release automatically when:

- Expected headers change unexpectedly
- Source IDs are duplicated
- Coordinates fall outside valid ranges
- The file is incomplete
- Row count changes beyond an agreed safety threshold
- Normalisation failures exceed a threshold

The previous successful release remains active until the new transaction and
validation complete successfully.

## 13. Map delivery strategy

### Prototype

- Local demo records
- Local Route Handler returns GeoJSON
- MapLibre clusters in the browser

### First production dataset

- Produce a compact, cacheable global marker artifact from the successful
  import.
- Keep long descriptions and survey notes in Supabase.
- Fetch full details only after selection.

### Later, only if metrics justify it

- Replace global GeoJSON with PMTiles.
- Add bounding-box PostGIS queries for dense regional exploration.
- Consider a paid/SLA-backed basemap or self-hosted Protomaps.

Do not build a tile server before real performance evidence requires it.

## 14. Loading, failure, and empty states

- The map shell renders immediately.
- A quiet status indicator reports map-data loading.
- When the data API fails, keep the basemap usable and display a compact retry
  action.
- Empty filters explain that no wrecks match and offer to clear filters.
- Missing detail records close the panel without breaking the map.
- Source release and import status are visible from the information control.

## 15. Accessibility and responsive behaviour

- All controls have accessible names and visible focus.
- Search suggestions support arrow keys, Enter, and Escape.
- The wreck panel traps focus only when presented as a modal on small screens.
- Map-only information also appears as readable text in the selected panel.
- Target sizes remain usable on touch screens.
- Motion respects `prefers-reduced-motion`.
- Mobile filters open in a compact sheet, not a nested menu system.
- Attribution must remain visible and unobscured.

## 16. Performance targets

- The map shell becomes interactive without waiting for wreck narratives.
- No full raw dataset is included in the client bundle.
- MapLibre is dynamically loaded as a client-only dependency.
- Only the selected wreck detail request returns narrative text.
- Marker responses are cacheable.
- Avoid writing camera movement to React or Zustand on every frame.
- Avoid unnecessary map re-creation when filters change.

## 17. Deployment and operating costs

### Prototype

- Vercel Hobby while the project is personal and non-commercial
- Supabase Free after the database milestone
- OpenFreeMap public tiles

### Revenue-generating or professionally operated version

- Upgrade Vercel to Pro before ads, affiliate links, paid services, or paid
  development/operation are introduced.
- Supabase Pro is recommended for an always-on production database and backups.
- Revisit basemap SLA and bandwidth strategy.

Optional donations alone are not considered commercial usage under Vercel’s
current fair-use guidance, but the terms should be checked again before launch.

## 18. Milestones

### Milestone 1 — Interactive local vertical prototype

- Scaffold current Next.js App Router
- Establish visual tokens and full-screen layout
- Add MapLibre with OpenFreeMap
- Add 20–50 clearly labelled demo wreck records
- Add prototype API routes
- Implement clustering, selection, search, and an era filter
- Add the desktop side panel/mobile bottom sheet
- Add attribution and navigation disclaimer
- Work without environment variables
- Pass build and lint

### Milestone 2 — Production data foundation

- Create/connect Supabase project
- Add migrations, PostGIS, indexes, and RLS
- Implement the UKHO parser and validation report
- Run a manual dry import
- Add the Supabase repository implementation
- Verify representative spatial and search queries

### Milestone 3 — Automated dataset publishing

- Add checksum-based scheduled import
- Add staging and transactional publication
- Generate the compact map artifact
- Track source release status
- Add rollback and failure reporting

### Milestone 4 — Public-quality release

- Stable share URLs and metadata
- Accessibility and keyboard review
- Loading, error, and empty states
- Mobile and performance review
- Licence and methodology pages/panels
- Vercel deployment

### Milestone 5 — Evidence-led enrichment

- Wikidata matching
- Correctly licensed Commons media
- Protected-site overlays
- Editorial stories and collections
- Monetisation experiments only after real usage evidence

## 19. Milestone 1 acceptance criteria

- The application starts locally with one command.
- The first viewport is the atlas, with no landing-page detour.
- There is no primary hamburger menu or dashboard sidebar.
- Map pan, zoom, clustering, selection, and search work.
- At least one committed filter visibly changes the marker set.
- Selecting a wreck opens details without full-page navigation.
- Desktop uses a contextual side panel; mobile uses a bottom sheet.
- Search and controls are keyboard accessible.
- Reduced-motion preferences are respected.
- UKHO attribution and “not for navigation” are visible.
- The prototype behaves sensibly if its data request fails.
- No Supabase environment variables are required yet.
- No server credential can reach the client.
- `pnpm build` and lint succeed.

## 20. Immediate implementation slice

The first code slice should be a complete, judgeable vertical demo:

1. Next.js project setup
2. Product metadata and global visual tokens
3. Demo wreck domain model and data
4. Prototype `/api/wrecks`, `/api/wrecks/:id`, and `/api/search`
5. Full-screen MapLibre atlas
6. Page-scoped Zustand coordination
7. Search, selection, one era filter, and contextual details
8. Desktop/mobile responsive treatment
9. Attribution and disclaimer
10. Build, lint, and interaction verification

The implementation should favour a coherent experience over empty production
infrastructure. Supabase and the full UKHO import begin only after this vertical
prototype is enjoyable to use.
