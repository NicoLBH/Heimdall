alter table public.lot_catalog
  add column if not exists is_custom boolean not null default false,
  add column if not exists created_by_project_id uuid null references public.projects(id) on delete cascade;

create index if not exists idx_lot_catalog_created_by_project_id
  on public.lot_catalog(created_by_project_id);

update public.lot_catalog
set group_label = case group_code
  when 'groupe-maitrise-ouvrage' then 'Maîtrise d''ouvrage'
  when 'groupe-maitrise-oeuvre' then 'Maîtrise d''oeuvre'
  when 'groupe-entreprise' then 'Entreprises'
  when 'groupe-divers' then 'Divers'
  else group_label
end;

update public.lot_catalog
set label = 'Lot Electricité'
where code = 'lot-electricite';

create or replace function public.add_custom_project_lot(
  p_project_id uuid,
  p_group_code text,
  p_label text
)
returns table (
  id uuid,
  project_id uuid,
  lot_catalog_id uuid,
  activated boolean,
  created_at timestamptz,
  updated_at timestamptz,
  lot_catalog jsonb
)
language plpgsql
as $$
declare
  v_group_code text := trim(coalesce(p_group_code, ''));
  v_label text := trim(coalesce(p_label, ''));
  v_group_label text;
  v_catalog_id uuid;
  v_sort_order integer;
  v_code text;
begin
  if p_project_id is null then
    raise exception 'project_id requis';
  end if;

  if v_group_code not in ('groupe-maitrise-ouvrage', 'groupe-maitrise-oeuvre', 'groupe-entreprise', 'groupe-divers') then
    raise exception 'group_code invalide';
  end if;

  if v_label = '' then
    raise exception 'label requis';
  end if;

  if length(v_label) > 120 then
    raise exception 'label trop long';
  end if;

  v_group_label := case v_group_code
    when 'groupe-maitrise-ouvrage' then 'Maîtrise d''ouvrage'
    when 'groupe-maitrise-oeuvre' then 'Maîtrise d''oeuvre'
    when 'groupe-entreprise' then 'Entreprises'
    when 'groupe-divers' then 'Divers'
  end;

  select coalesce(max(sort_order), case v_group_code
    when 'groupe-maitrise-ouvrage' then 0
    when 'groupe-maitrise-oeuvre' then 100
    when 'groupe-entreprise' then 300
    when 'groupe-divers' then 500
    else 0
  end) + 10
  into v_sort_order
  from public.lot_catalog
  where group_code = v_group_code;

  v_code := concat(
    'custom-',
    encode(gen_random_bytes(6), 'hex')
  );

  insert into public.lot_catalog (
    group_code,
    group_label,
    code,
    label,
    default_activated,
    sort_order,
    is_custom,
    created_by_project_id
  )
  values (
    v_group_code,
    v_group_label,
    v_code,
    v_label,
    false,
    v_sort_order,
    true,
    p_project_id
  )
  returning public.lot_catalog.id into v_catalog_id;

  insert into public.project_lots (
    project_id,
    lot_catalog_id,
    activated
  )
  values (
    p_project_id,
    v_catalog_id,
    true
  );

  return query
  select
    pl.id,
    pl.project_id,
    pl.lot_catalog_id,
    pl.activated,
    pl.created_at,
    pl.updated_at,
    jsonb_build_object(
      'id', lc.id,
      'group_code', lc.group_code,
      'group_label', lc.group_label,
      'code', lc.code,
      'label', lc.label,
      'default_activated', lc.default_activated,
      'sort_order', lc.sort_order,
      'is_custom', lc.is_custom,
      'created_by_project_id', lc.created_by_project_id
    ) as lot_catalog
  from public.project_lots pl
  join public.lot_catalog lc on lc.id = pl.lot_catalog_id
  where pl.project_id = p_project_id
    and pl.lot_catalog_id = v_catalog_id;
end;
$$;

create or replace function public.delete_custom_project_lot(
  p_project_lot_id uuid,
  p_project_id uuid
)
returns boolean
language plpgsql
as $$
declare
  v_catalog_id uuid;
begin
  select pl.lot_catalog_id
  into v_catalog_id
  from public.project_lots pl
  join public.lot_catalog lc on lc.id = pl.lot_catalog_id
  where pl.id = p_project_lot_id
    and pl.project_id = p_project_id
    and lc.is_custom = true
    and lc.created_by_project_id = p_project_id;

  if v_catalog_id is null then
    return false;
  end if;

  delete from public.lot_catalog
  where id = v_catalog_id
    and is_custom = true
    and created_by_project_id = p_project_id;

  return found;
end;
$$;
