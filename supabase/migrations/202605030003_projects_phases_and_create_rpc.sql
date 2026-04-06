alter table if exists public.projects
  add column if not exists postal_code text,
  add column if not exists city text,
  add column if not exists project_owner_name text,
  add column if not exists current_phase_code text not null default 'PC';

alter table if exists public.projects
  drop constraint if exists projects_current_phase_code_check;

alter table if exists public.projects
  add constraint projects_current_phase_code_check
  check (current_phase_code in ('PC', 'AT', 'APS', 'APD', 'PRO', 'DCE', 'MARCHE', 'EXE', 'DOE', 'GPA', 'EXPLOIT'));

create table if not exists public.project_phases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  phase_code text not null,
  phase_label text not null,
  phase_order integer not null,
  phase_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_phases_phase_code_check
    check (phase_code in ('PC', 'AT', 'APS', 'APD', 'PRO', 'DCE', 'MARCHE', 'EXE', 'DOE', 'GPA', 'EXPLOIT')),
  constraint project_phases_phase_order_check
    check (phase_order >= 1),
  constraint project_phases_project_id_phase_code_key unique (project_id, phase_code)
);

create index if not exists idx_project_phases_project_id
  on public.project_phases(project_id);

create index if not exists idx_project_phases_project_id_phase_order
  on public.project_phases(project_id, phase_order);

alter table if exists public.project_phases enable row level security;

drop policy if exists project_phases_by_project on public.project_phases;
create policy project_phases_by_project
on public.project_phases
for all
using (
  project_id in (
    select id from public.projects where owner_id = auth.uid()
  )
)
with check (
  project_id in (
    select id from public.projects where owner_id = auth.uid()
  )
);

create or replace function public.create_project_with_default_phases(
  p_project_name text,
  p_description text default null,
  p_city text default null,
  p_postal_code text default null,
  p_project_owner_name text default null,
  p_current_phase_code text default 'PC'
)
returns public.projects
language plpgsql
security invoker
as $$
declare
  v_phase_code text := upper(trim(coalesce(p_current_phase_code, 'PC')));
  v_project_name text := trim(coalesce(p_project_name, ''));
  v_city text := trim(coalesce(p_city, ''));
  v_postal_code text := trim(coalesce(p_postal_code, ''));
  v_project_owner_name text := trim(coalesce(p_project_owner_name, ''));
  v_display_name text;
  v_project public.projects;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if v_phase_code = '' then
    v_phase_code := 'PC';
  end if;

  if v_phase_code not in ('PC', 'AT', 'APS', 'APD', 'PRO', 'DCE', 'MARCHE', 'EXE', 'DOE', 'GPA', 'EXPLOIT') then
    raise exception 'Unsupported phase code: %', v_phase_code;
  end if;

  if v_project_name = '' then
    raise exception 'Project name is required';
  end if;

  if v_city = '' then
    raise exception 'City is required';
  end if;

  if v_postal_code = '' then
    raise exception 'Postal code is required';
  end if;

  if v_project_owner_name = '' then
    raise exception 'Project owner name is required';
  end if;

  v_display_name := concat_ws('_', v_postal_code, v_city, v_project_owner_name, v_project_name);

  insert into public.projects (
    name,
    description,
    postal_code,
    city,
    project_owner_name,
    current_phase_code,
    owner_id
  )
  values (
    v_display_name,
    nullif(trim(coalesce(p_description, '')), ''),
    v_postal_code,
    v_city,
    v_project_owner_name,
    v_phase_code,
    auth.uid()
  )
  returning * into v_project;

  insert into public.project_phases (project_id, phase_code, phase_label, phase_order, phase_date)
  values
    (v_project.id, 'PC', 'Permis de Construire', 1, null),
    (v_project.id, 'AT', 'Autorisation de Travaux', 2, null),
    (v_project.id, 'APS', 'Avant Projet Sommaire', 3, null),
    (v_project.id, 'APD', 'Avant Projet Détaillé', 4, null),
    (v_project.id, 'PRO', 'Projet', 5, null),
    (v_project.id, 'DCE', 'Dossier de Consultation des Entreprises', 6, null),
    (v_project.id, 'MARCHE', 'Marchés', 7, null),
    (v_project.id, 'EXE', 'Exécution', 8, null),
    (v_project.id, 'DOE', 'Dossier des Ouvrages Exécutés', 9, null),
    (v_project.id, 'GPA', 'Année de Garantie de Parfait Achèvement', 10, null),
    (v_project.id, 'EXPLOIT', 'Exploitation', 11, null)
  on conflict (project_id, phase_code) do nothing;

  return v_project;
end;
$$;
