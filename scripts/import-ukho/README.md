# UKHO text import

This importer reads the official UTF-8, tab-separated `Wrecks.txt` release and
loads normalized records into Supabase while retaining every complete source
row in `wrecks.raw`.

It deliberately does not use the shapefile export. The text release preserves
all attributes and includes records that are absent from the Points/Areas
shapefile bundle.

The import is not for marine navigation.

## Validate locally

```bash
pnpm import:ukho -- \
  --file /absolute/path/to/Wrecks.txt \
  --dry-run
```

The command rejects unexpected headers, field counts, or unusable coordinates.
It reports duplicates, synthetic IDs for blank source IDs, normalized
60-minute coordinates, out-of-range measurements retained only in `raw`, and
invalid source update dates.

## Transformations

This is a normalization import, not a duplicate-removal pass:

- the exact 50-column header/order and every row's field count are validated;
- quoted TSV fields are parsed;
- normalized text is trimmed and blanks become `null`;
- degree/minute/hemisphere coordinates become decimal longitude/latitude;
- exactly 60 coordinate minutes are normalized arithmetically and reported;
- unusable coordinates stop the import;
- bounded measurements become numbers, while anomalies become normalized
  `null` values and remain unchanged in `raw`;
- valid four-digit years are extracted;
- valid source dates change from `YYYYMMDD` to ISO `YYYY-MM-DD`;
- normalized database field names are populated;
- a blank source ID becomes `missing-row-<source-row-number>`;
- repeated source IDs receive a one-based `source_record_index`;
- rows start as `active = true`, `published = false`;
- the complete original source row is retained in `wrecks.raw`;
- Postgres generates the PostGIS `geometry(Point, 4326)` and search vector.

The July 2026 import did not discard the 31 repeated `wreck_id` occurrences.
All 102,625 source rows were retained.

## Load Supabase

The checked-in preparation and finalization SQL are an auditable record of the
completed July 2026 import. They are deliberately scoped to that release,
checksum, run ID, and expected record count; update and review them before a
future release.

A live import requires:

- the foundation migration in `supabase/migrations`
- `prepare_remote_import.sql` executed once to create the matching
  `import_runs` row
- the one-time, 30-minute import token returned by that SQL
- the project URL and publishable key

Preparation installs a short-lived, token-validated batch function in the
unexposed `private` schema. A security-invoker RPC wrapper accepts only the
authorized run, `source = 'ukho'`, and unpublished/active rows. It grants no
direct table inserts to anonymous users and requires no service-role secret.

```bash
SUPABASE_URL=https://project-ref.supabase.co \
SUPABASE_PUBLISHABLE_KEY=... \
UKHO_IMPORT_RUN_ID=... \
UKHO_IMPORT_TOKEN=... \
pnpm import:ukho -- --file /absolute/path/to/Wrecks.txt
```

The importer is resumable for the same release: duplicate
`(source, source_id, source_record_index)` rows are ignored, while other
uniqueness violations still fail. This prevents a repeated accepted batch from
creating extra rows after a network failure.

After the database contains the exact expected count, execute
`finalize_remote_import.sql`. It marks the run complete and removes the RPC
wrapper, private function, token table, private schema, and temporary grants.

Imported records default to `published = false`; publishing is a separate
review decision. Never retain or expose the one-time token, and never use a
service-role or secret key in the browser.

## Verified July 2026 run

- ZIP SHA-256:
  `e35bf33465b97e57fa3806d6f71a1ea55fdf5afa7eb7bde93090db536d663e30`
- Source rows: 102,625
- Unique normalized source IDs: 102,594
- Duplicate ID occurrences retained: 31
- Blank source IDs assigned a deterministic synthetic ID: 1
- Valid PostGIS points using SRID 4326: 102,625
- Published records: 0
- Complete raw source rows retained: 102,625

## Later source releases

The current live preparation and finalization SQL is not a generic update
workflow. It is hard-coded to the completed July 2026 checksum, run ID, and
counts. More importantly, its conflict behavior is insert-or-ignore. Feeding a
new release to it would ignore changed rows whose
`(source, source_id, source_record_index)` already exists.

Do not run a later UKHO file live until a staging/reconciliation workflow is
implemented. That workflow must:

1. archive the new release and calculate its checksum;
2. reject an already-recorded `(source, source_checksum)`;
3. run this parser in `--dry-run` mode and review its report;
4. load the release into a run-scoped staging table;
5. match IDs that are unique in both releases;
6. reconcile repeated IDs using reviewed stable evidence such as coordinates
   and source attributes, sending ambiguous matches to review;
7. atomically update matched rows, insert genuinely new rows, and mark missing
   rows inactive for review;
8. keep new or changed rows unpublished pending a separate approval;
9. record inserted, updated, deactivated, and rejected counts;
10. use a database import lock and database constraints to prevent concurrent
    or duplicate imports.

The existing unique constraints still provide useful defense:

- `import_runs (source, source_checksum)` prevents importing the exact release
  twice;
- `wrecks (source, source_id, source_record_index)` prevents duplicate
  canonical occurrences;
- `wrecks (import_run_id, source_row_number)` prevents the same staged/run row
  from being accepted twice.

The next updater should use reviewed `INSERT ... ON CONFLICT DO UPDATE`
semantics for stable matches. It must not use a separate
application-side check-then-insert.

### Local reconciliation foundation

The repository now includes a local-only foundation for that future workflow:

- `reconcile.mjs` compares normalized current and candidate records without
  mutating either release;
- it matches IDs that are unique in both releases directly;
- repeated IDs are matched only with unique stable evidence such as recorded
  coordinates and source attributes;
- a final remaining one-to-one occurrence can be paired only after all stable
  matches have been removed;
- indistinguishable repeated occurrences remain explicitly ambiguous;
- populated fields that become blank are listed in `dataLossFields`;
- absent current records become reviewed deactivation candidates, never delete
  operations;
- rows without source IDs are matched only by stable evidence and otherwise
  remain reviewed insert/deactivation candidates.

The migration
`supabase/migrations/20260726073847_create_wreck_release_staging.sql` is also
present locally. It defines private, default-deny staging, reconciliation, and
revision-history tables. It does not import, reconcile, publish, update, or
deactivate data and has **not** been applied to the remote project.

The current automated tests cover unique-ID updates, populated-to-blank field
detection, repeated IDs reordered between releases, indistinguishable
duplicate evidence, new records, soft-deactivation candidates, and stable
evidence normalization.

This is not yet permission to run a future release. Before any remote
migration or import, still implement and review the trusted staging writer,
review report, atomic apply transaction with a transaction-scoped advisory
lock, compact read-model refresh, rollback verification, and separate
publication approval.
