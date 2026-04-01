create index if not exists idx_subject_history_subject_id
  on public.subject_history(subject_id);

create index if not exists idx_subject_history_subject_created_at_desc
  on public.subject_history(subject_id, created_at desc);

create index if not exists idx_subject_history_project_id
  on public.subject_history(project_id);
