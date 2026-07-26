create schema if not exists private;

revoke all on schema private from public, anon, authenticated;

create table if not exists private.ukho_import_tokens (
  import_run_id uuid primary key references public.import_runs(id) on delete cascade,
  token_hash bytea not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

revoke all on table private.ukho_import_tokens
  from public, anon, authenticated;

drop policy if exists "Temporary July 2026 UKHO text import"
  on public.wrecks;
revoke insert on table public.wrecks from anon;
revoke usage, select on sequence public.wrecks_id_seq from anon;
drop function if exists public.import_ukho_wreck_batch(text, jsonb);
drop function if exists private.import_ukho_wreck_batch(text, jsonb);
drop function if exists private.has_valid_ukho_import_token(uuid);
drop function if exists private.has_valid_ukho_import_token(uuid, text);

alter table public.wrecks
  drop column if exists import_token;

create or replace function private.has_valid_ukho_import_token(
  expected_import_run_id uuid,
  provided_token text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from private.ukho_import_tokens
    where import_run_id = expected_import_run_id
      and expires_at > now()
      and token_hash = extensions.digest(
        coalesce(provided_token, ''),
        'sha256'
      )
  );
$function$;

revoke all on function private.has_valid_ukho_import_token(uuid, text)
  from public, anon, authenticated;

insert into public.import_runs (
  id,
  source,
  source_release,
  source_url,
  source_checksum,
  source_size_bytes,
  status,
  validation_report
)
values (
  'e35bf334-65b9-5e57-ba38-06d6f71a1ea5'::uuid,
  'ukho',
  'July 2026',
  'https://datahub.admiralty.co.uk/portal/sharing/rest/content/items/60c0908526b844a68494c038a457e1a7/data',
  'e35bf33465b97e57fa3806d6f71a1ea55fdf5afa7eb7bde93090db536d663e30',
  18586584,
  'running',
  '{
    "source_format": "UTF-8 TSV",
    "text_size_bytes": 88354763,
    "expected_record_count": 102625,
    "text_only": true
  }'::jsonb
)
on conflict (source, source_checksum) do update
set source_release = excluded.source_release,
    source_url = excluded.source_url,
    source_size_bytes = excluded.source_size_bytes,
    started_at = now(),
    completed_at = null,
    status = 'running',
    validation_report = excluded.validation_report;

create or replace function private.import_ukho_wreck_batch(
  provided_token text,
  batch_records jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
  inserted_count integer;
begin
  if jsonb_typeof(batch_records) is distinct from 'array'
    or jsonb_array_length(batch_records) not between 1 and 1000
  then
    raise exception 'Import batch must contain between 1 and 1000 records';
  end if;

  if not private.has_valid_ukho_import_token(
    'e35bf334-65b9-5e57-ba38-06d6f71a1ea5'::uuid,
    provided_token
  ) then
    raise insufficient_privilege using
      message = 'Invalid or expired UKHO import token';
  end if;

  if exists (
    select 1
    from jsonb_populate_recordset(
      null::public.wrecks,
      batch_records
    ) as candidate
    where candidate.import_run_id is distinct from
        'e35bf334-65b9-5e57-ba38-06d6f71a1ea5'::uuid
      or candidate.source is distinct from 'ukho'
      or candidate.published is distinct from false
      or candidate.active is distinct from true
  ) then
    raise insufficient_privilege using
      message = 'Import batch contains records outside the authorized run';
  end if;

  insert into public.wrecks (
    import_run_id,
    source,
    source_id,
    source_record_index,
    source_row_number,
    source_id_missing,
    name,
    category,
    obstruction_category,
    status,
    classification,
    vessel_type,
    flag,
    longitude,
    latitude,
    position_raw,
    horizontal_datum,
    limits_raw,
    position_method,
    depth_m,
    height_m,
    depth_method,
    depth_quality,
    depth_accuracy,
    water_depth_m,
    water_level_effect,
    vertical_datum,
    reported_year,
    length_m,
    width_m,
    draught_m,
    sonar_length_m,
    sonar_width_m,
    shadow_height_m,
    orientation_degrees,
    tonnage,
    tonnage_type,
    cargo,
    conspic_visual,
    conspic_radar,
    sunk_date_raw,
    sunk_year,
    non_sub_contact,
    bottom_texture,
    scour_dimensions,
    debris_field,
    original_sensor,
    last_sensor,
    original_detection_year_raw,
    last_detection_year_raw,
    original_source,
    markers,
    circumstances_of_loss,
    surveying_details,
    general_comments,
    source_updated_on,
    raw,
    published,
    active
  )
  select
    candidate.import_run_id,
    candidate.source,
    candidate.source_id,
    candidate.source_record_index,
    candidate.source_row_number,
    candidate.source_id_missing,
    candidate.name,
    candidate.category,
    candidate.obstruction_category,
    candidate.status,
    candidate.classification,
    candidate.vessel_type,
    candidate.flag,
    candidate.longitude,
    candidate.latitude,
    candidate.position_raw,
    candidate.horizontal_datum,
    candidate.limits_raw,
    candidate.position_method,
    candidate.depth_m,
    candidate.height_m,
    candidate.depth_method,
    candidate.depth_quality,
    candidate.depth_accuracy,
    candidate.water_depth_m,
    candidate.water_level_effect,
    candidate.vertical_datum,
    candidate.reported_year,
    candidate.length_m,
    candidate.width_m,
    candidate.draught_m,
    candidate.sonar_length_m,
    candidate.sonar_width_m,
    candidate.shadow_height_m,
    candidate.orientation_degrees,
    candidate.tonnage,
    candidate.tonnage_type,
    candidate.cargo,
    candidate.conspic_visual,
    candidate.conspic_radar,
    candidate.sunk_date_raw,
    candidate.sunk_year,
    candidate.non_sub_contact,
    candidate.bottom_texture,
    candidate.scour_dimensions,
    candidate.debris_field,
    candidate.original_sensor,
    candidate.last_sensor,
    candidate.original_detection_year_raw,
    candidate.last_detection_year_raw,
    candidate.original_source,
    candidate.markers,
    candidate.circumstances_of_loss,
    candidate.surveying_details,
    candidate.general_comments,
    candidate.source_updated_on,
    candidate.raw,
    candidate.published,
    candidate.active
  from jsonb_populate_recordset(
    null::public.wrecks,
    batch_records
  ) as candidate
  on conflict (source, source_id, source_record_index) do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$function$;

revoke all on function private.import_ukho_wreck_batch(text, jsonb)
  from public, authenticated;
grant usage on schema private to anon;
grant execute on function private.import_ukho_wreck_batch(text, jsonb)
  to anon;

create or replace function public.import_ukho_wreck_batch(
  provided_token text,
  batch_records jsonb
)
returns integer
language sql
security invoker
set search_path = ''
as $function$
  select private.import_ukho_wreck_batch(
    provided_token,
    batch_records
  );
$function$;

revoke all on function public.import_ukho_wreck_batch(text, jsonb)
  from public, authenticated;
grant execute on function public.import_ukho_wreck_batch(text, jsonb)
  to anon;

with generated as materialized (
  select encode(extensions.gen_random_bytes(32), 'hex') as token
),
stored as (
  insert into private.ukho_import_tokens (
    import_run_id,
    token_hash,
    expires_at
  )
  select
    'e35bf334-65b9-5e57-ba38-06d6f71a1ea5'::uuid,
    extensions.digest(generated.token, 'sha256'),
    now() + interval '30 minutes'
  from generated
  on conflict (import_run_id) do update
  set token_hash = excluded.token_hash,
      expires_at = excluded.expires_at,
      created_at = now()
  returning import_run_id, expires_at
)
select
  generated.token,
  stored.import_run_id,
  stored.expires_at,
  (
    select count(*)::integer
    from public.wrecks
    where import_run_id = stored.import_run_id
  ) as existing_imported_count
from generated
cross join stored;

notify pgrst, 'reload schema';
