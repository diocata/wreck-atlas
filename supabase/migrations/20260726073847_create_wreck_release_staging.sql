-- Local-only foundation for reconciling a future UKHO source release.
-- Creating these objects does not ingest, reconcile, publish, or deactivate
-- any wreck. Applying this migration to a remote project requires a separate
-- review and explicit authorization.

create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table private.wreck_release_staging (
  id bigint generated always as identity primary key,
  import_run_id uuid not null
    references public.import_runs(id) on delete restrict,
  source text not null,
  source_id text not null,
  source_record_index smallint not null
    check (source_record_index > 0),
  source_row_number integer not null
    check (source_row_number > 0),
  source_id_missing boolean not null default false,
  payload jsonb not null
    check (jsonb_typeof(payload) = 'object'),
  raw jsonb not null
    check (jsonb_typeof(raw) = 'object'),
  stable_evidence_key text not null
    check (btrim(stable_evidence_key) <> ''),
  normalized_checksum text not null
    check (normalized_checksum ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  unique (import_run_id, source_row_number),
  unique (import_run_id, source_id, source_record_index)
);

comment on table private.wreck_release_staging is
  'Run-scoped normalized source rows. Never exposed through the public API.';
comment on column private.wreck_release_staging.payload is
  'Normalized candidate fields. Complete original values remain in raw.';
comment on column private.wreck_release_staging.stable_evidence_key is
  'Reviewed matching evidence for repeated or missing source IDs; not a canonical identity.';

create table private.wreck_reconciliation_items (
  id bigint generated always as identity primary key,
  import_run_id uuid not null
    references public.import_runs(id) on delete restrict,
  staging_id bigint
    references private.wreck_release_staging(id) on delete restrict,
  wreck_id bigint
    references public.wrecks(id) on delete restrict,
  change_kind text not null
    check (
      change_kind in (
        'unchanged',
        'updated',
        'insert',
        'deactivate',
        'ambiguous'
      )
    ),
  match_method text,
  changed_fields text[] not null default '{}',
  data_loss_fields text[] not null default '{}',
  review_status text not null default 'pending'
    check (
      review_status in (
        'pending',
        'approved',
        'rejected',
        'not_required'
      )
    ),
  review_notes text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  check (staging_id is not null or wreck_id is not null)
);

comment on table private.wreck_reconciliation_items is
  'Auditable proposed matches and changes. Missing records are deactivation candidates, never delete operations.';
comment on column private.wreck_reconciliation_items.data_loss_fields is
  'Fields populated in the current canonical row but blank in the candidate release; these require review.';

create unique index wreck_reconciliation_staging_unique_idx
  on private.wreck_reconciliation_items (import_run_id, staging_id)
  where staging_id is not null;
create unique index wreck_reconciliation_wreck_unique_idx
  on private.wreck_reconciliation_items (import_run_id, wreck_id)
  where wreck_id is not null and change_kind <> 'ambiguous';
create index wreck_reconciliation_review_queue_idx
  on private.wreck_reconciliation_items (
    import_run_id,
    review_status,
    change_kind
  );

create table private.wreck_revisions (
  id bigint generated always as identity primary key,
  wreck_id bigint not null
    references public.wrecks(id) on delete restrict,
  import_run_id uuid not null
    references public.import_runs(id) on delete restrict,
  payload jsonb not null
    check (jsonb_typeof(payload) = 'object'),
  raw jsonb not null
    check (jsonb_typeof(raw) = 'object'),
  archived_at timestamptz not null default now(),
  unique (wreck_id, import_run_id)
);

comment on table private.wreck_revisions is
  'Private immutable prior canonical revisions retained before an approved update.';

alter table private.wreck_release_staging enable row level security;
alter table private.wreck_reconciliation_items enable row level security;
alter table private.wreck_revisions enable row level security;

revoke all on table
  private.wreck_release_staging,
  private.wreck_reconciliation_items,
  private.wreck_revisions
from public, anon, authenticated, service_role;
revoke all on sequence
  private.wreck_release_staging_id_seq,
  private.wreck_reconciliation_items_id_seq,
  private.wreck_revisions_id_seq
from public, anon, authenticated;

grant select, insert, update, delete on table
  private.wreck_release_staging,
  private.wreck_reconciliation_items
to service_role;
grant select, insert on table private.wreck_revisions to service_role;
grant usage, select on sequence
  private.wreck_release_staging_id_seq,
  private.wreck_reconciliation_items_id_seq,
  private.wreck_revisions_id_seq
to service_role;
