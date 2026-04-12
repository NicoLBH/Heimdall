begin;

create table if not exists public.project_labels (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  label_key text not null,
  name text not null,
  description text,
  text_color text not null,
  background_color text not null,
  border_color text not null,
  hex_color text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_labels_name_not_blank_check
    check (length(btrim(coalesce(name, ''))) > 0),
  constraint project_labels_label_key_not_blank_check
    check (length(btrim(coalesce(label_key, ''))) > 0),
  constraint project_labels_name_length_check
    check (char_length(name) <= 120)
);

create table if not exists public.subject_labels (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  label_id uuid not null references public.project_labels(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint subject_labels_subject_id_label_id_key unique (subject_id, label_id)
);

create unique index if not exists idx_project_labels_project_id_label_key_unique
  on public.project_labels (
    project_id,
    lower(trim(regexp_replace(label_key, '\s+', ' ', 'g')))
  );

create unique index if not exists idx_project_labels_project_id_name_unique
  on public.project_labels (
    project_id,
    lower(trim(regexp_replace(name, '\s+', ' ', 'g')))
  );

create index if not exists idx_project_labels_project_id
  on public.project_labels(project_id);

create index if not exists idx_project_labels_name
  on public.project_labels(name);

create index if not exists idx_project_labels_sort_order
  on public.project_labels(project_id, sort_order, name);

create index if not exists idx_subject_labels_project_id
  on public.subject_labels(project_id);

create index if not exists idx_subject_labels_subject_id
  on public.subject_labels(subject_id);

create index if not exists idx_subject_labels_label_id
  on public.subject_labels(label_id);

drop trigger if exists trg_project_labels_updated_at on public.project_labels;
create trigger trg_project_labels_updated_at
before update on public.project_labels
for each row execute function public.set_updated_at();

alter table if exists public.project_labels enable row level security;
alter table if exists public.subject_labels enable row level security;

drop policy if exists "project_labels_open_all" on public.project_labels;
create policy "project_labels_open_all"
on public.project_labels
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "subject_labels_open_all" on public.subject_labels;
create policy "subject_labels_open_all"
on public.subject_labels
for all
to anon, authenticated
using (true)
with check (true);

comment on table public.project_labels is
  'Liste des labels backend propres à un projet.';

comment on column public.project_labels.project_id is
  'Projet propriétaire du label. Un label ne peut appartenir qu''à un seul projet.';

comment on column public.project_labels.label_key is
  'Clé métier stable et normalisée du label, distincte du nom affiché modifiable.';

comment on column public.project_labels.name is
  'Nom affiché du label côté UI.';

comment on column public.project_labels.description is
  'Description optionnelle affichable dans l''UI Labels.';

comment on column public.project_labels.text_color is
  'Couleur de texte du badge de label, stockée telle quelle.';

comment on column public.project_labels.background_color is
  'Couleur de fond du badge de label, stockée telle quelle.';

comment on column public.project_labels.border_color is
  'Couleur de bordure du badge de label, stockée telle quelle.';

comment on column public.project_labels.hex_color is
  'Couleur hexadécimale de référence du label.';

comment on column public.project_labels.sort_order is
  'Ordre d''affichage prioritaire des labels dans le projet.';

comment on table public.subject_labels is
  'Jointure many-to-many entre sujets et labels. Source de vérité backend des rattachements label/sujet.';

comment on column public.subject_labels.project_id is
  'Projet du rattachement. Doit correspondre à la fois au projet du sujet et du label.';

comment on column public.subject_labels.subject_id is
  'Sujet rattaché à un ou plusieurs labels.';

comment on column public.subject_labels.label_id is
  'Label du projet affecté au sujet.';

create or replace function public.enforce_subject_labels_project_consistency()
returns trigger
language plpgsql
as $$
declare
  v_subject_project_id uuid;
  v_label_project_id uuid;
begin
  select s.project_id
  into v_subject_project_id
  from public.subjects s
  where s.id = new.subject_id;

  if v_subject_project_id is null then
    raise exception 'subject_labels: sujet introuvable pour subject_id=%', new.subject_id
      using errcode = '23503';
  end if;

  select l.project_id
  into v_label_project_id
  from public.project_labels l
  where l.id = new.label_id;

  if v_label_project_id is null then
    raise exception 'subject_labels: label introuvable pour label_id=%', new.label_id
      using errcode = '23503';
  end if;

  if new.project_id is distinct from v_subject_project_id then
    raise exception 'subject_labels: project_id (%) incohérent avec le projet du sujet (%)', new.project_id, v_subject_project_id
      using errcode = '23514';
  end if;

  if new.project_id is distinct from v_label_project_id then
    raise exception 'subject_labels: project_id (%) incohérent avec le projet du label (%)', new.project_id, v_label_project_id
      using errcode = '23514';
  end if;

  if v_subject_project_id is distinct from v_label_project_id then
    raise exception 'subject_labels: le sujet (%) et le label (%) n''appartiennent pas au même projet', new.subject_id, new.label_id
      using errcode = '23514';
  end if;

  return new;
end;
$$;

comment on function public.enforce_subject_labels_project_consistency() is
  'Valide avant insert/update que subject_labels.project_id correspond au projet du sujet et du label, et que sujet et label appartiennent au même projet.';

drop trigger if exists trg_subject_labels_project_consistency on public.subject_labels;
create trigger trg_subject_labels_project_consistency
before insert or update on public.subject_labels
for each row execute function public.enforce_subject_labels_project_consistency();

create or replace function public.ensure_default_project_labels(p_project_id uuid)
returns void
language plpgsql
security invoker
as $$
begin
  if p_project_id is null then
    return;
  end if;

  insert into public.project_labels (
    project_id,
    label_key,
    name,
    description,
    text_color,
    background_color,
    border_color,
    hex_color,
    sort_order
  )
  select
    p_project_id,
    v.label_key,
    v.name,
    v.description,
    v.text_color,
    v.background_color,
    v.border_color,
    v.hex_color,
    v.sort_order
  from (
    values
      ('bloquant', 'bloquant', 'Empêche l''avancement ou la décision.', 'rgb(254, 155, 156)', 'rgba(182, 2, 5, 0.18)', 'rgba(254, 155, 156, 0.3)', '#b60205', 10),
      ('critique', 'critique', 'Point majeur à traiter en priorité.', 'rgb(247, 140, 104)', 'rgba(217, 63, 11, 0.18)', 'rgba(247, 140, 104, 0.3)', '#d93f0b', 20),
      ('sensible', 'sensible', 'Sujet délicat nécessitant de la vigilance.', 'rgb(219, 207, 250)', 'rgba(83, 25, 231, 0.18)', 'rgba(219, 207, 250, 0.3)', '#5319e7', 30),
      ('non conforme', 'non conforme', 'Écart constaté par rapport aux exigences.', 'rgb(254, 155, 156)', 'rgba(182, 2, 5, 0.18)', 'rgba(254, 155, 156, 0.3)', '#b60205', 40),
      ('incident', 'incident', 'Événement ou anomalie signalé(e).', 'rgb(247, 140, 104)', 'rgba(217, 63, 11, 0.18)', 'rgba(247, 140, 104, 0.3)', '#d93f0b', 50),
      ('réserve', 'réserve', 'Point à lever ou à suivre avant clôture.', 'rgb(228, 230, 107)', 'rgba(228, 230, 105, 0.18)', 'rgba(228, 230, 107, 0.3)', '#fbca04', 60),
      ('question', 'question', 'Clarification attendue sur ce point.', 'rgb(219, 130, 229)', 'rgba(216, 118, 227, 0.18)', 'rgba(219, 130, 229, 0.3)', '#d876e3', 70),
      ('à arbitrer', 'à arbitrer', 'Décision de pilotage ou d''arbitrage requise.', 'rgb(108, 167, 255)', 'rgba(0, 82, 204, 0.18)', 'rgba(108, 167, 255, 0.3)', '#0052cc', 80),
      ('validation requise', 'validation requise', 'Validation formelle attendue.', 'rgb(192, 219, 221)', 'rgba(191, 218, 220, 0.18)', 'rgba(192, 219, 221, 0.3)', '#bfdadc', 90),
      ('à préciser', 'à préciser', 'Informations complémentaires nécessaires.', 'rgb(107, 167, 236)', 'rgba(29, 118, 219, 0.18)', 'rgba(107, 167, 236, 0.3)', '#1d76db', 100),
      ('information', 'information', 'Point purement informatif.', 'rgb(0, 232, 253)', 'rgba(0, 107, 117, 0.18)', 'rgba(0, 232, 253, 0.3)', '#006b75', 110),
      ('refusé', 'refusé', 'Demande ou proposition rejetée.', 'rgb(254, 155, 156)', 'rgba(182, 2, 5, 0.18)', 'rgba(254, 155, 156, 0.3)', '#b60205', 120),
      ('variante', 'variante', 'Solution alternative proposée.', 'rgb(107, 167, 236)', 'rgba(29, 118, 219, 0.18)', 'rgba(107, 167, 236, 0.3)', '#1d76db', 130),
      ('modification', 'modification', 'Évolution demandée sur l''existant.', 'rgb(108, 167, 255)', 'rgba(0, 82, 204, 0.18)', 'rgba(108, 167, 255, 0.3)', '#0052cc', 140),
      ('optimisation', 'optimisation', 'Amélioration possible identifiée.', 'rgb(23, 230, 37)', 'rgba(14, 138, 22, 0.18)', 'rgba(23, 230, 37, 0.3)', '#0e8a16', 150),
      ('correction', 'correction', 'Action corrective à mettre en œuvre.', 'rgb(194, 224, 198)', 'rgba(194, 224, 198, 0.18)', 'rgba(194, 224, 198, 0.3)', '#bfdadc', 160),
      ('action moa', 'action MOA', 'Action attendue de la maîtrise d''ouvrage.', 'rgb(192, 213, 242)', 'rgba(191, 212, 242, 0.18)', 'rgba(192, 213, 242, 0.3)', '#c5def5', 170),
      ('action moe', 'action MOE', 'Action attendue de la maîtrise d''œuvre.', 'rgb(192, 213, 242)', 'rgba(191, 212, 242, 0.18)', 'rgba(192, 213, 242, 0.3)', '#c5def5', 180),
      ('action entreprise', 'action Entreprise', 'Action attendue de l''entreprise travaux.', 'rgb(192, 213, 242)', 'rgba(191, 212, 242, 0.18)', 'rgba(192, 213, 242, 0.3)', '#c5def5', 190),
      ('action bet', 'action BET', 'Action attendue du bureau d''études.', 'rgb(192, 213, 242)', 'rgba(191, 212, 242, 0.18)', 'rgba(192, 213, 242, 0.3)', '#c5def5', 200),
      ('coordination', 'coordination', 'Coordination nécessaire entre acteurs.', 'rgb(219, 207, 250)', 'rgba(83, 25, 231, 0.18)', 'rgba(219, 207, 250, 0.3)', '#5319e7', 210),
      ('doublon', 'doublon', 'Sujet déjà couvert ailleurs.', 'rgb(208, 212, 216)', 'rgba(0, 0, 0, 0)', 'rgba(208, 212, 216, 0.3)', '#6e7781', 220),
      ('hors périmètre', 'hors périmètre', 'En dehors du périmètre de traitement.', 'rgb(208, 212, 216)', 'rgba(0, 0, 0, 0)', 'rgba(208, 212, 216, 0.3)', '#6e7781', 230),
      ('sans suite', 'sans suite', 'Point clos sans action complémentaire.', 'rgb(208, 212, 216)', 'rgba(0, 0, 0, 0)', 'rgba(208, 212, 216, 0.3)', '#6e7781', 240)
  ) as v(label_key, name, description, text_color, background_color, border_color, hex_color, sort_order)
  where not exists (
    select 1
    from public.project_labels l
    where l.project_id = p_project_id
      and lower(trim(regexp_replace(coalesce(l.label_key, ''), '\s+', ' ', 'g')))
        = lower(trim(regexp_replace(v.label_key, '\s+', ' ', 'g')))
  );
end;
$$;

comment on function public.ensure_default_project_labels(uuid) is
  'Assure la présence des labels backend par défaut d''un projet, de manière idempotente.';

create or replace function public.handle_project_default_labels()
returns trigger
language plpgsql
as $$
begin
  perform public.ensure_default_project_labels(new.id);
  return new;
end;
$$;

drop trigger if exists trg_projects_default_labels on public.projects;
create trigger trg_projects_default_labels
after insert on public.projects
for each row execute function public.handle_project_default_labels();

select public.ensure_default_project_labels(p.id)
from public.projects p;

commit;
