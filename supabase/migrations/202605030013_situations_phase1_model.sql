begin;

alter table public.situations
  add column if not exists mode text,
  add column if not exists filter_definition jsonb;

update public.situations
set
  status = case
    when status = 'closed' then 'closed'
    else 'open'
  end,
  mode = coalesce(nullif(trim(mode), ''), 'manual'),
  filter_definition = case
    when filter_definition is null then null
    when jsonb_typeof(filter_definition) = 'object' then filter_definition
    else null
  end,
  closed_at = case
    when (case when status = 'closed' then 'closed' else 'open' end) = 'closed' then coalesce(closed_at, now())
    else null
  end;

alter table public.situations
  alter column mode set default 'manual',
  alter column mode set not null;

alter table public.situations
  drop constraint if exists situations_status_check,
  drop constraint if exists situations_progress_percent_check,
  drop constraint if exists situations_mode_check,
  drop constraint if exists situations_filter_definition_check;

alter table public.situations
  add constraint situations_status_check
    check (status in ('open', 'closed')),
  add constraint situations_progress_percent_check
    check (progress_percent >= 0 and progress_percent <= 100),
  add constraint situations_mode_check
    check (mode in ('manual', 'automatic')),
  add constraint situations_filter_definition_check
    check (
      filter_definition is null
      or jsonb_typeof(filter_definition) = 'object'
    );

comment on column public.situations.objective_text is
  'Description rapide et opérationnelle de la situation.';

comment on column public.situations.progress_percent is
  'Taux d''avancement de la situation, borné entre 0 et 100.';

comment on column public.situations.mode is
  'Mode métier de la situation: manual (liste explicite de sujets) ou automatic (sujets résolus par filter_definition).';

comment on column public.situations.filter_definition is
  'JSONB des critères métier pour une situation automatique. Format minimal attendu: {"status":["open"],"priorities":[],"objectiveIds":[],"labelIds":[],"assigneeIds":[],"blockedOnly":false}';

commit;
