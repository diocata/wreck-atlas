do $block$
declare
  imported_count integer;
begin
  select count(*)::integer
  into imported_count
  from public.wrecks
  where import_run_id = 'e35bf334-65b9-5e57-ba38-06d6f71a1ea5'::uuid;

  if imported_count <> 102625 then
    raise exception
      'Expected 102625 imported UKHO records, found %',
      imported_count;
  end if;

  update public.import_runs
  set completed_at = now(),
      record_count = 102625,
      unique_source_id_count = 102594,
      duplicate_occurrence_count = 31,
      inserted_count = imported_count,
      updated_count = 0,
      deactivated_count = 0,
      rejected_count = 0,
      status = 'completed',
      validation_report = validation_report || '{
        "validated_field_count": 50,
        "missing_source_id_count": 1,
        "normalized_sixty_minute_coordinate_count": 2,
        "invalid_source_updated_date_count": 1,
        "normalized_measurement_anomaly_fields": [
          "depth",
          "water_depth",
          "shadow_height",
          "sonar_length"
        ],
        "published": false,
        "not_for_navigation": true
      }'::jsonb
  where id = 'e35bf334-65b9-5e57-ba38-06d6f71a1ea5'::uuid;
end;
$block$;

drop policy if exists "Temporary July 2026 UKHO text import"
  on public.wrecks;
revoke insert on table public.wrecks from anon;
revoke usage, select on sequence public.wrecks_id_seq from anon;
revoke execute on function public.import_ukho_wreck_batch(text, jsonb)
  from anon;
drop function public.import_ukho_wreck_batch(text, jsonb);
revoke execute on function private.import_ukho_wreck_batch(text, jsonb)
  from anon;
drop function private.import_ukho_wreck_batch(text, jsonb);

delete from private.ukho_import_tokens
where import_run_id = 'e35bf334-65b9-5e57-ba38-06d6f71a1ea5'::uuid;

drop function private.has_valid_ukho_import_token(uuid, text);
drop table private.ukho_import_tokens;
revoke usage on schema private from anon;
drop schema private;

analyze public.wrecks;
notify pgrst, 'reload schema';

select
  runs.id,
  runs.status,
  runs.record_count,
  runs.unique_source_id_count,
  runs.duplicate_occurrence_count,
  runs.inserted_count,
  count(wrecks.id)::integer as verified_wreck_count,
  count(wrecks.id) filter (where wrecks.published)::integer
    as published_wreck_count,
  count(wrecks.id) filter (
    where extensions.st_srid(wrecks.location) = 4326
  )::integer as srid_4326_count
from public.import_runs as runs
left join public.wrecks as wrecks
  on wrecks.import_run_id = runs.id
where runs.id = 'e35bf334-65b9-5e57-ba38-06d6f71a1ea5'::uuid
group by runs.id;
