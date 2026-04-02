alter table public.subject_history
  drop constraint if exists subject_history_actor_type_check;

alter table public.subject_history
  add constraint subject_history_actor_type_check
  check (
    actor_type in ('system', 'workflow', 'user', 'assistant')
  );
