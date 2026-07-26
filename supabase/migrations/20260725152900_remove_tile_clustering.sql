-- Remove grid-based clustering from vector tiles.
-- Every wreck is now its own individual point feature at all zoom levels.
-- MapLibre handles visual density through zoom-adaptive dot sizing.

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
      extensions.st_tileenvelope(tile_z, tile_x, tile_y) as geometry
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
      and extensions.st_intersects(
        points.location,
        extensions.st_transform(bounds.geometry, 4326)
      )
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
  mvt_rows as (
    select
      candidates.id,
      candidates.name,
      candidates.category,
      candidates.sunk_year as "sunkYear",
      candidates.depth_m as "depthM",
      extensions.st_asmvtgeom(
        candidates.projected,
        bounds.geometry,
        4096,
        64,
        true
      ) as geometry
    from candidates
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
