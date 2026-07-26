revoke select on table public.wrecks from anon, authenticated;

grant select (
  id,
  source,
  source_id,
  source_record_index,
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
  published,
  active
) on public.wrecks to anon, authenticated;

create table if not exists public.wreck_map_points (
  wreck_id bigint primary key
    references public.wrecks(id) on delete cascade,
  name text not null,
  category text not null,
  sunk_year smallint,
  depth_m double precision,
  location extensions.geometry(Point, 4326) not null,
  published boolean not null,
  active boolean not null
);

comment on table public.wreck_map_points is
  'Compact public map artifact for PostGIS vector-tile generation.';

create index if not exists wreck_map_points_location_idx
  on public.wreck_map_points using gist (location)
  where published and active;
create index if not exists wreck_map_points_sunk_year_idx
  on public.wreck_map_points (sunk_year)
  where published and active and sunk_year is not null;

alter table public.wreck_map_points enable row level security;

revoke all on table public.wreck_map_points
  from public, anon, authenticated;
grant all on table public.wreck_map_points to service_role;
grant select on table public.wreck_map_points to anon, authenticated;

drop policy if exists "Published active map points are publicly readable"
  on public.wreck_map_points;
create policy "Published active map points are publicly readable"
  on public.wreck_map_points
  for select
  to anon, authenticated
  using (published and active);

update public.wrecks
set published = true,
    updated_at = now()
where import_run_id = 'e35bf334-65b9-5e57-ba38-06d6f71a1ea5'::uuid
  and active
  and not published;

insert into public.wreck_map_points (
  wreck_id,
  name,
  category,
  sunk_year,
  depth_m,
  location,
  published,
  active
)
select
  id,
  coalesce(
    nullif(btrim(name), ''),
    'UNIDENTIFIED WRECK ' || source_id
  ),
  coalesce(
    nullif(btrim(category), ''),
    nullif(btrim(obstruction_category), ''),
    nullif(btrim(classification), ''),
    'Unclassified record'
  ),
  sunk_year,
  depth_m,
  location,
  published,
  active
from public.wrecks
where published and active
on conflict (wreck_id) do nothing;

create or replace function public.get_public_wreck_tile(
  tile_z integer,
  tile_x integer,
  tile_y integer,
  era_filter text default 'all'
)
returns text
language plpgsql
stable
security invoker
set search_path = ''
as $function$
declare
  tile_data bytea;
begin
  if tile_z not between 0 and 14
    or tile_x < 0
    or tile_y < 0
    or tile_x >= power(2, tile_z)::integer
    or tile_y >= power(2, tile_z)::integer
  then
    raise exception 'Invalid vector tile coordinates';
  end if;

  if era_filter not in (
    'all',
    'before-1900',
    '1900-1945',
    'after-1945'
  ) then
    raise exception 'Invalid era filter';
  end if;

  with bounds as materialized (
    select
      extensions.st_tileenvelope(tile_z, tile_x, tile_y) as geometry,
      40075016.68557849 / power(2, tile_z) as tile_width
  ),
  candidates as materialized (
    select
      points.wreck_id::text as id,
      points.name,
      points.category,
      points.sunk_year,
      points.depth_m,
      extensions.st_transform(points.location, 3857) as projected
    from public.wreck_map_points as points
    cross join bounds
    where points.published
      and points.active
      and points.location
        && extensions.st_transform(bounds.geometry, 4326)
      and (
        era_filter = 'all'
        or (
          era_filter = 'before-1900'
          and points.sunk_year < 1900
        )
        or (
          era_filter = '1900-1945'
          and points.sunk_year between 1900 and 1945
        )
        or (
          era_filter = 'after-1945'
          and points.sunk_year > 1945
        )
      )
  ),
  low_zoom as (
    select
      null::text as id,
      true as cluster,
      count(*)::integer as point_count,
      null::text as name,
      null::text as category,
      null::smallint as sunk_year,
      null::double precision as depth_m,
      extensions.st_setsrid(
        extensions.st_makepoint(
          avg(extensions.st_x(candidates.projected)),
          avg(extensions.st_y(candidates.projected))
        ),
        3857
      ) as projected
    from candidates
    cross join bounds
    where tile_z < 8
    group by
      floor(
        extensions.st_x(candidates.projected)
          / (bounds.tile_width / 32)
      ),
      floor(
        extensions.st_y(candidates.projected)
          / (bounds.tile_width / 32)
      )
  ),
  high_zoom as (
    select
      candidates.id,
      false as cluster,
      1::integer as point_count,
      candidates.name,
      candidates.category,
      candidates.sunk_year,
      candidates.depth_m,
      candidates.projected
    from candidates
    where tile_z >= 8
  ),
  tile_features as (
    select * from low_zoom
    union all
    select * from high_zoom
  ),
  mvt_rows as (
    select
      tile_features.id,
      tile_features.cluster,
      tile_features.point_count,
      tile_features.name,
      tile_features.category,
      tile_features.sunk_year as "sunkYear",
      tile_features.depth_m as "depthM",
      extensions.st_asmvtgeom(
        tile_features.projected,
        bounds.geometry,
        4096,
        64,
        true
      ) as geometry
    from tile_features
    cross join bounds
  )
  select extensions.st_asmvt(
    mvt_rows,
    'wrecks',
    4096,
    'geometry'
  )
  into tile_data
  from mvt_rows;

  return encode(coalesce(tile_data, ''::bytea), 'base64');
end;
$function$;

revoke all on function public.get_public_wreck_tile(
  integer,
  integer,
  integer,
  text
) from public;
grant execute on function public.get_public_wreck_tile(
  integer,
  integer,
  integer,
  text
) to anon, authenticated, service_role;

create or replace function public.search_public_wrecks(
  search_term text,
  result_limit integer default 6
)
returns table (
  id text,
  name text,
  longitude double precision,
  latitude double precision,
  sunk_year smallint,
  vessel_type text
)
language sql
stable
security invoker
set search_path = ''
as $function$
  select
    wrecks.id::text,
    coalesce(
      nullif(btrim(wrecks.name), ''),
      'UNIDENTIFIED WRECK ' || wrecks.source_id
    ),
    wrecks.longitude,
    wrecks.latitude,
    wrecks.sunk_year,
    coalesce(
      nullif(btrim(wrecks.vessel_type), ''),
      nullif(btrim(wrecks.classification), ''),
      'Wreck or obstruction'
    )
  from public.wrecks
  where wrecks.published
    and wrecks.active
    and wrecks.name is not null
    and lower(wrecks.name)
      like '%' || lower(btrim(search_term)) || '%'
  order by
    case
      when lower(wrecks.name) = lower(btrim(search_term)) then 0
      when lower(wrecks.name)
        like lower(btrim(search_term)) || '%' then 1
      else 2
    end,
    extensions.similarity(
      lower(wrecks.name),
      lower(btrim(search_term))
    ) desc,
    wrecks.name,
    wrecks.id
  limit least(greatest(coalesce(result_limit, 6), 1), 20);
$function$;

revoke all on function public.search_public_wrecks(text, integer)
  from public;
grant execute on function public.search_public_wrecks(text, integer)
  to anon, authenticated, service_role;

analyze public.wrecks;
analyze public.wreck_map_points;
notify pgrst, 'reload schema';
