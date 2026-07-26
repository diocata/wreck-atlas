create index wreck_map_points_name_trgm_idx
  on public.wreck_map_points
  using gin (lower(name) extensions.gin_trgm_ops)
  where published and active;

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
    points.wreck_id::text,
    points.name,
    extensions.st_x(points.location),
    extensions.st_y(points.location),
    points.sunk_year,
    points.category
  from public.wreck_map_points as points
  where points.published
    and points.active
    and lower(points.name)
      like '%' || lower(btrim(search_term)) || '%'
  order by
    case
      when lower(points.name) = lower(btrim(search_term)) then 0
      when lower(points.name)
        like lower(btrim(search_term)) || '%' then 1
      else 2
    end,
    extensions.similarity(
      lower(points.name),
      lower(btrim(search_term))
    ) desc,
    points.name,
    points.wreck_id
  limit least(greatest(coalesce(result_limit, 6), 1), 20);
$function$;

analyze public.wreck_map_points;
notify pgrst, 'reload schema';
