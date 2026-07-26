# Wreck Atlas — Shared Agent Memory

Last updated: 26 July 2026

This is the portable, tool-neutral memory for Wreck Atlas. It is intentionally
kept at the repository root so Codex, Claude, Gemini, Cursor, and other agents
can find the same durable decisions without relying on a vendor-specific memory
system. It is intentionally tracked so future clones and non-Codex tools retain
the same durable decisions.

Read order for any agent:

1. `AGENTS.md` when it exists in the workspace
2. `MEMORIES.md`
3. `PROJECT_HANDOFF.md` when it exists
4. The relevant implementation and runbook files

`MEMORIES.md` is the cross-agent, workspace-visible memory. `AGENTS.md` and
`PROJECT_HANDOFF.md` contain richer local instructions and current state, but
are intentionally ignored by Git. Update this file after durable architectural
or operational lessons. Never store passwords, API secret keys, service-role
keys, OAuth tokens, one-time import tokens, or other credentials here.

## Current durable state

- Product: map-first educational wreck discovery, explicitly not for marine
  navigation.
- Design: Arcade Sonar. The obsolete design comparison lab and superseded
  dark-glass plan have been removed; the live atlas is the reference.
- Application: requires the server-only Supabase-backed UKHO release. The
  local demo repository and mock records have been removed.
- Supabase project: `uvwoscqzvewenfzmqiao`.
- Database: Supabase Postgres with PostGIS and RLS.
- Tables: `public.import_runs`, `public.wrecks`, `public.wreck_aliases`, and
  the public read model `public.wreck_map_points`.
- Applied migrations:
  - `20260725124848_create_wrecks_foundation`
  - `20260725131020_add_public_wreck_visibility_index`
  - `publish_and_expose_wrecks` (public RLS/read model and RPCs)
  - `fix_public_wreck_read_functions` (qualified PostGIS and indexed search)
- Imported source: official July 2026 UKHO `Wrecks.txt`.
- Imported rows: 102,625.
- Unique normalized source IDs: 102,594.
- Repeated source-ID occurrences retained: 31.
- Missing source IDs assigned a deterministic ID: 1.
- Valid PostGIS points with SRID 4326: 102,625.
- Published imported rows: 102,625.
- Public map read-model rows: 102,625.
- Complete raw rows retained: 102,625.
- The temporary import RPC, token table, private schema, and anonymous write
  grants were removed after verification.

The application is connected through server-only REST calls. The browser
receives safe normalized detail fields and a compact published-record cache;
raw/import audit fields remain private. Search runs against that local cache
after load and MapLibre clusters the records in the browser. The current
release was explicitly authorized for publication; future releases still
require review.

Application responses include a restrictive Content Security Policy plus
frame, MIME-sniffing, referrer, and browser-permission headers. Dependency
advisories are resolved with pnpm overrides; the compatibility patch for
`minimatch@3.1.5` allows the secure `brace-expansion` release to work with the
existing ESLint dependency graph.

## Frontend architecture and testing

- Atlas browser implementation is feature-first under `src/features/atlas`:
  `components`, `model`, `data`, and `map` hold the UI, Zustand state/search
  rules, IndexedDB cache, and MapLibre-specific helpers respectively.
- Shared validated wreck and search contracts live in `src/domain/wreck.ts`.
  Server-only Supabase repository and request validation live in
  `src/server/wrecks`; keep those imports out of browser modules.
- `AtlasMap` is still directly imported by the client shell. Keep MapLibre v5,
  source/layer registration in `style.load`, and map-owned camera/clustering.
- Compact cache behavior is cache-first: a validated IndexedDB result renders
  immediately and revalidates with its ETag in the background. If neither
  cache nor initial network data is available, retain the load-error state;
  do not represent it as an empty era.
- Vitest uses jsdom, React Testing Library, jest-dom, V8 coverage, the React
  Vite plugin, and Vite's native TypeScript-path resolution. Run `pnpm test`
  for unit/component behavior, `pnpm test:coverage` for coverage, and
  `pnpm check` for test + lint + build. Tests are colocated beside focused
  model/map/data/components, with global setup in `src/test/setup.ts`.
- `.github/workflows/ci.yml` verifies pushes and pull requests targeting
  `main`, plus manual runs, on Node.js 22. It installs from the frozen pnpm
  lockfile, runs coverage tests, lint, build, and a high-severity dependency
  audit, then retains the coverage report for seven days. It also runs
  Playwright against desktop Chromium and mobile WebKit, performs an automated
  WCAG A/AA pass, and retains the browser report. Actions are pinned to
  immutable commit SHAs and the job has read-only repository permissions.
- Committed atlas state includes selected wreck, era, record kind, and recorded
  depth band in URL parameters. Missing category, depth, year, or name remains
  an explicit unknown state rather than being inferred or discarded.
- The detail surface supports copyable links and positions, nearby records,
  conditional safe source metadata, and a three-state mobile sheet: peek,
  half, and full. The handle supports taps and vertical pointer gestures.
  Opening nearby records or source notes expands the sheet so their content is
  not clipped. Nearby distances compare recorded positions and are never
  navigational guidance.
- The in-map Atlas Guide explains why the project exists, how to read its map
  signals, and the data/licensing limits. The wordmark opens its introduction;
  the source console opens the data section directly. It behaves as a keyboard
  modal: focus is contained while open, Escape closes it, and focus returns to
  its trigger on desktop and mobile.
- “Discover a wreck” chooses from named wreck records and prefers candidates
  with a reported year or normalized depth. It excludes the current selection,
  unidentified wreck labels, and obstruction-only records. This curation
  applies only to discovery; search, filters, and the map continue to preserve
  and expose sparse or unknown source records.
- Vercel Speed Insights is integrated, with local performance measures for
  compact cache reads, fetches, validation, and GeoJSON construction.

## Future-release reconciliation foundation

- Importer and Supabase migration artifacts are now intentionally tracked.
- `scripts/import-ukho/reconcile.mjs` is a pure local comparison engine. It
  matches unique IDs directly, matches repeated IDs only through unique stable
  evidence, refuses ambiguity, flags populated-to-blank changes, and produces
  reviewed inserts and soft-deactivation candidates.
- `20260726073847_create_wreck_release_staging.sql` is a local, unapplied
  migration defining private default-deny staging, review, and prior-revision
  tables. It makes no live data change by itself.
- Do not apply that migration or run a future import until the trusted staging
  writer, review report, short advisory-locked atomic apply transaction,
  compact read-model refresh, rollback tests, advisors, and separate
  publication approval are complete and explicitly authorized.

## Text-source decision

The text release is the canonical import source. The shapefile ZIP and
extracted shapefile directory were moved to Finder Trash. The text ZIP and
`Wrecks.txt` were retained in Downloads.

The text source was chosen because the current application needs point
coordinates and the full attribute set. PostGIS point geometry is generated
from normalized longitude/latitude for spatial indexing and future map
queries; the raw source coordinates remain available for provenance.

## Transformations performed

The importer does not simply remove duplicates. It:

- validates the exact 50-column header and field count;
- parses quoted tab-separated fields;
- trims text and converts blank normalized text fields to `null`;
- converts degree/minute/hemisphere coordinates to decimal degrees;
- accepts and normalizes the two source values with exactly 60 minutes;
- validates latitude/longitude ranges and generates a PostGIS point;
- converts valid bounded measurements to numbers;
- stores anomalous or out-of-range normalized measurements as `null`;
- extracts valid four-digit years;
- converts valid `YYYYMMDD` source dates to ISO dates;
- maps source field names into normalized database columns;
- assigns a deterministic `missing-row-N` ID to a blank source ID;
- assigns `source_record_index` within repeated source IDs;
- sets imported rows to `active = true`, `published = false`;
- retains the complete, untruncated original source row in `wrecks.raw`.

No UKHO source row was discarded merely because its `wreck_id` repeated.
The 31 repeated occurrences were retained as separate rows.

## Duplicate guarantees and limitation

Current database constraints prevent duplicate insertion of:

- the same release checksum: unique `(source, source_checksum)` on
  `import_runs`;
- the same canonical occurrence: unique
  `(source, source_id, source_record_index)` on `wrecks`;
- the same source row within a run: unique
  `(import_run_id, source_row_number)` on `wrecks`.

The completed importer uses `ON CONFLICT DO NOTHING`. This makes an interrupted
load of the same release resumable: accepted batches can be sent again without
creating duplicates.

It is not yet a correct new-release updater. A later file with an existing
`source_id`/`source_record_index` would be ignored rather than updating changed
fields. Occurrence order can also change for repeated source IDs. Therefore:

> Do not run a later UKHO release through the current live-import SQL.

Before the next release, implement a staging-and-reconciliation importer:

1. archive the new source and compute its checksum;
2. skip it if `(source, checksum)` already exists;
3. dry-run and review headers, row count, coordinates, duplicates, and
   anomalies;
4. load rows into a run-scoped staging table;
5. match unique source IDs directly;
6. reconcile repeated IDs using reviewed stable evidence such as coordinates
   and source attributes, flagging ambiguous matches;
7. atomically update matched canonical rows, insert new rows, and mark missing
   rows inactive for review—never hard-delete automatically;
8. record inserted/updated/deactivated/rejected counts;
9. keep new or changed records unpublished until a separate review;
10. publish in a separate transaction only with explicit authorization.

Use an advisory lock or equivalent single-import guard, database unique
constraints, and `INSERT ... ON CONFLICT DO UPDATE` for reviewed stable keys.
Do not rely on an application-side “check then insert.”

## Commands and runbook

Local validation is safe and makes no database changes:

```bash
pnpm import:ukho -- \
  --file /absolute/path/to/Wrecks.txt \
  --dry-run
```

The July 2026 one-time preparation/finalization SQL is release-specific:

```text
scripts/import-ukho/prepare_remote_import.sql
scripts/import-ukho/finalize_remote_import.sql
```

The generic parser/streamer is:

```text
scripts/import-ukho/import.mjs
```

Detailed first-load and recovery instructions are in:

```text
scripts/import-ukho/README.md
```

The completed July 2026 import must not be rerun merely to test the command.
Use `--dry-run` for parser validation.

## Live application connection

The server-only repository is `src/server/wrecks/repository.ts`. It
maps normalized UKHO rows into the Wreck domain contract. The live map loads
`/api/wrecks/compact`, caches validated compact rows in IndexedDB, and uses
MapLibre clustering. Details use `/api/wrecks/:id`; the server-side indexed
search RPC remains as a fallback while the compact cache is unavailable.

## Next work

1. Build the trusted staging writer and reviewed atomic apply phase before
   importing another UKHO file.
2. Define review and publication criteria for future releases.
3. Continue focused desktop/mobile browser QA as concrete issues are found.
4. Establish performance budgets after production Speed Insights has enough
   traffic to provide a baseline.
