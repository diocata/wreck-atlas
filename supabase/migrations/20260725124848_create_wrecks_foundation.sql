create extension if not exists postgis with schema extensions;
create extension if not exists pg_trgm with schema extensions;

create table public.import_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  source_release text not null,
  source_url text not null,
  source_checksum text not null,
  source_size_bytes bigint not null check (source_size_bytes >= 0),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  record_count integer check (record_count >= 0),
  unique_source_id_count integer check (unique_source_id_count >= 0),
  duplicate_occurrence_count integer check (duplicate_occurrence_count >= 0),
  inserted_count integer check (inserted_count >= 0),
  updated_count integer check (updated_count >= 0),
  deactivated_count integer check (deactivated_count >= 0),
  rejected_count integer check (rejected_count >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'running', 'completed', 'failed')),
  validation_report jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (source, source_checksum)
);

comment on table public.import_runs is
  'Auditable UKHO and future source import executions. Not exposed to public API roles.';

create table public.wrecks (
  id bigint generated always as identity primary key,
  import_run_id uuid not null references public.import_runs(id) on delete restrict,
  source text not null,
  source_id text not null,
  source_record_index smallint not null default 1
    check (source_record_index > 0),
  source_row_number integer not null
    check (source_row_number > 0),
  source_id_missing boolean not null default false,

  name text,
  category text,
  obstruction_category text,
  status text,
  classification text,
  vessel_type text,
  flag text,

  longitude double precision not null
    check (longitude between -180 and 180),
  latitude double precision not null
    check (latitude between -90 and 90),
  location extensions.geometry(Point, 4326)
    generated always as (
      extensions.st_setsrid(
        extensions.st_makepoint(longitude, latitude),
        4326
      )
    ) stored,
  position_raw text not null,
  horizontal_datum text,
  limits_raw text,
  position_method text,

  depth_m double precision
    check (depth_m is null or depth_m between 0 and 12000),
  height_m double precision
    check (height_m is null or height_m between 0 and 12000),
  depth_method text,
  depth_quality text,
  depth_accuracy text,
  water_depth_m double precision
    check (water_depth_m is null or water_depth_m between 0 and 12000),
  water_level_effect text,
  vertical_datum text,
  reported_year smallint
    check (reported_year is null or reported_year between 1000 and 2200),

  length_m double precision
    check (length_m is null or length_m between 0 and 12000),
  width_m double precision
    check (width_m is null or width_m between 0 and 12000),
  draught_m double precision
    check (draught_m is null or draught_m between 0 and 12000),
  sonar_length_m double precision
    check (sonar_length_m is null or sonar_length_m between 0 and 12000),
  sonar_width_m double precision
    check (sonar_width_m is null or sonar_width_m between 0 and 12000),
  shadow_height_m double precision
    check (shadow_height_m is null or shadow_height_m between 0 and 12000),
  orientation_degrees double precision
    check (
      orientation_degrees is null
      or orientation_degrees between 0 and 360
    ),
  tonnage double precision
    check (tonnage is null or tonnage between 0 and 1000000000000),
  tonnage_type text,
  cargo text,
  conspic_visual text,
  conspic_radar text,

  sunk_date_raw text,
  sunk_year smallint
    check (sunk_year is null or sunk_year between 1000 and 2200),
  non_sub_contact text,
  bottom_texture text,
  scour_dimensions text,
  debris_field text,
  original_sensor text,
  last_sensor text,
  original_detection_year_raw text,
  last_detection_year_raw text,
  original_source text,
  markers text,
  circumstances_of_loss text,
  surveying_details text,
  general_comments text,

  source_updated_on date,
  raw jsonb not null,
  published boolean not null default false,
  active boolean not null default true,
  search_vector tsvector generated always as (
    to_tsvector(
      'simple'::regconfig,
      coalesce(name, '')
        || ' ' || coalesce(vessel_type, '')
        || ' ' || coalesce(category, '')
        || ' ' || coalesce(obstruction_category, '')
    )
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (source, source_id, source_record_index),
  unique (import_run_id, source_row_number)
);

comment on table public.wrecks is
  'Normalized wreck and obstruction records. Educational only; not for marine navigation.';
comment on column public.wrecks.source_record_index is
  'One-based occurrence within a source_id, because UKHO wreck_id is not unique.';
comment on column public.wrecks.raw is
  'Complete untruncated source row retained for provenance and reprocessing.';

create table public.wreck_aliases (
  id bigint generated always as identity primary key,
  wreck_id bigint not null references public.wrecks(id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  source text not null,
  created_at timestamptz not null default now()
);

create index wrecks_import_run_id_idx
  on public.wrecks (import_run_id);
create index wrecks_location_idx
  on public.wrecks using gist (location);
create index wrecks_search_vector_idx
  on public.wrecks using gin (search_vector);
create index wrecks_name_trgm_idx
  on public.wrecks using gin (lower(name) extensions.gin_trgm_ops)
  where name is not null and active;
create index wrecks_category_idx
  on public.wrecks (category)
  where active;
create index wrecks_obstruction_category_idx
  on public.wrecks (obstruction_category)
  where active;
create index wrecks_sunk_year_idx
  on public.wrecks (sunk_year)
  where active;
create index wrecks_depth_m_idx
  on public.wrecks (depth_m)
  where active and depth_m is not null;
create index wreck_aliases_wreck_id_idx
  on public.wreck_aliases (wreck_id);
create unique index wreck_aliases_wreck_name_idx
  on public.wreck_aliases (wreck_id, lower(name));

alter table public.import_runs enable row level security;
alter table public.wrecks enable row level security;
alter table public.wreck_aliases enable row level security;

revoke all on table public.import_runs from public, anon, authenticated;
revoke all on table public.wrecks from public, anon, authenticated;
revoke all on table public.wreck_aliases from public, anon, authenticated;
revoke all on sequence public.wrecks_id_seq from public, anon, authenticated;
revoke all on sequence public.wreck_aliases_id_seq from public, anon, authenticated;

grant all on table public.import_runs to service_role;
grant all on table public.wrecks to service_role;
grant all on table public.wreck_aliases to service_role;
grant usage, select on sequence public.wrecks_id_seq to service_role;
grant usage, select on sequence public.wreck_aliases_id_seq to service_role;

grant select on table public.wrecks to anon, authenticated;
grant select on table public.wreck_aliases to anon, authenticated;

create policy "Published active wrecks are publicly readable"
  on public.wrecks
  for select
  to anon, authenticated
  using (published and active);

create policy "Aliases for published active wrecks are publicly readable"
  on public.wreck_aliases
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.wrecks
      where wrecks.id = wreck_aliases.wreck_id
        and wrecks.published
        and wrecks.active
    )
  );
