create index wrecks_public_visibility_idx
  on public.wrecks (id)
  where published and active;
