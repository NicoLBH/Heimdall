begin;

create table if not exists public.situation_subjects (
  id uuid primary key default gen_random_uuid(),
  situation_id uuid not null references public.situations(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint situation_subjects_situation_id_subject_id_key unique (situation_id, subject_id)
);

create index if not exists idx_situation_subjects_situation_id
  on public.situation_subjects(situation_id);

create index if not exists idx_situation_subjects_subject_id
  on public.situation_subjects(subject_id);

alter table if exists public.situation_subjects enable row level security;

drop policy if exists "situation_subjects_open_all" on public.situation_subjects;
create policy "situation_subjects_open_all"
on public.situation_subjects
for all
to anon, authenticated
using (true)
with check (true);

comment on table public.situation_subjects is
  'Jointure many-to-many entre situations et sujets pour le mode manual.';

comment on column public.situation_subjects.situation_id is
  'Situation porteuse du regroupement manuel.';

comment on column public.situation_subjects.subject_id is
  'Sujet explicitement rattaché à une situation manuelle.';

create or replace function public.ensure_default_project_situations(p_project_id uuid)
returns void
language plpgsql
security invoker
as $$
begin
  if p_project_id is null then
    return;
  end if;

  insert into public.situations (
    project_id,
    title,
    description,
    objective_text,
    status,
    progress_percent,
    mode,
    filter_definition
  )
  select
    p_project_id,
    'Tous les sujets ouverts',
    'Situation système créée automatiquement pour regrouper tous les sujets ouverts du projet.',
    'Tous les sujets ouverts',
    'open',
    0,
    'automatic',
    jsonb_build_object('status', jsonb_build_array('open'))
  where not exists (
    select 1
    from public.situations s
    where s.project_id = p_project_id
      and lower(trim(coalesce(s.title, ''))) = lower('Tous les sujets ouverts')
  );
end;
$$;

comment on function public.ensure_default_project_situations(uuid) is
  'Assure la présence des situations système minimales d''un projet, de manière idempotente.';

create or replace function public.handle_project_default_situations()
returns trigger
language plpgsql
as $$
begin
  perform public.ensure_default_project_situations(new.id);
  return new;
end;
$$;

drop trigger if exists trg_projects_default_situations on public.projects;
create trigger trg_projects_default_situations
after insert on public.projects
for each row execute function public.handle_project_default_situations();

select public.ensure_default_project_situations(p.id)
from public.projects p;

commit;
