-- Ensure project creator/owner is automatically represented as a collaborator.
-- Also backfills existing projects where owner is missing from collaborators.

create or replace function public.ensure_project_owner_collaborator(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_project record;
  v_owner_email text;
  v_owner_person_id uuid;
  v_owner_lot_id uuid;
begin
  if p_project_id is null then
    return;
  end if;

  select p.id, p.owner_id
    into v_project
  from public.projects p
  where p.id = p_project_id;

  if v_project.id is null or v_project.owner_id is null then
    return;
  end if;

  -- Ensure project lots exist for this project (idempotent).
  perform public.seed_project_lots_for_project(v_project.id);

  select nullif(btrim(au.email), '')
    into v_owner_email
  from auth.users au
  where au.id = v_project.owner_id;

  if v_owner_email is null then
    return;
  end if;

  insert into public.directory_people (email, linked_user_id, created_by_user_id)
  values (v_owner_email, v_project.owner_id, v_project.owner_id)
  on conflict (email_normalized) do update
  set linked_user_id = coalesce(public.directory_people.linked_user_id, excluded.linked_user_id),
      created_by_user_id = coalesce(public.directory_people.created_by_user_id, excluded.created_by_user_id);

  select dp.id
    into v_owner_person_id
  from public.directory_people dp
  where dp.email_normalized = lower(v_owner_email)
  limit 1;

  if v_owner_person_id is null then
    return;
  end if;

  -- Keep creator visible in collaborator list if they are already assigned to any role.
  if exists (
    select 1
    from public.project_collaborators pc
    where pc.project_id = v_project.id
      and pc.person_id = v_owner_person_id
      and lower(coalesce(pc.status, 'actif')) <> 'retiré'
  ) then
    return;
  end if;

  select pl.id
    into v_owner_lot_id
  from public.project_lots pl
  join public.lot_catalog lc on lc.id = pl.lot_catalog_id
  where pl.project_id = v_project.id
    and lc.code = 'maitre-ouvrage'
  limit 1;

  if v_owner_lot_id is null then
    return;
  end if;

  insert into public.project_collaborators (
    project_id,
    person_id,
    collaborator_user_id,
    collaborator_email,
    project_lot_id,
    invited_by_user_id,
    status
  )
  values (
    v_project.id,
    v_owner_person_id,
    v_project.owner_id,
    v_owner_email,
    v_owner_lot_id,
    v_project.owner_id,
    'Actif'
  )
  on conflict (project_id, person_id, project_lot_id) do update
  set collaborator_user_id = coalesce(public.project_collaborators.collaborator_user_id, excluded.collaborator_user_id),
      collaborator_email = coalesce(nullif(btrim(public.project_collaborators.collaborator_email), ''), excluded.collaborator_email),
      invited_by_user_id = coalesce(public.project_collaborators.invited_by_user_id, excluded.invited_by_user_id),
      status = case
        when lower(coalesce(public.project_collaborators.status, '')) = 'retiré' then 'Actif'
        else public.project_collaborators.status
      end,
      removed_at = case
        when lower(coalesce(public.project_collaborators.status, '')) = 'retiré' then null
        else public.project_collaborators.removed_at
      end;
end;
$$;

create or replace function public.trg_ensure_project_owner_collaborator()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  perform public.ensure_project_owner_collaborator(new.id);
  return new;
end;
$$;

drop trigger if exists trg_projects_seed_owner_collaborator on public.projects;
create trigger trg_projects_seed_owner_collaborator
after insert on public.projects
for each row execute function public.trg_ensure_project_owner_collaborator();

-- Backfill legacy projects.
select public.ensure_project_owner_collaborator(p.id)
from public.projects p;
