do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'subject_history_actor_type_check'
  ) then
    alter table subject_history
    add constraint subject_history_actor_type_check
    check (
      actor_type in ('system', 'llm', 'user', 'workflow')
    );
  end if;
end $$;
