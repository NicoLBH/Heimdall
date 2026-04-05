-- Auth integration migration (idempotent)

-- Add user columns
alter table if exists projects
add column if not exists owner_id uuid references auth.users(id);

alter table if exists documents
add column if not exists created_by uuid references auth.users(id);

alter table if exists subjects
add column if not exists created_by uuid references auth.users(id);

alter table if exists subject_history
add column if not exists actor_user_id uuid references auth.users(id);

-- Enable RLS
alter table projects enable row level security;
alter table documents enable row level security;
alter table subjects enable row level security;
alter table subject_history enable row level security;

-- Policies
drop policy if exists projects_owner_only on projects;
create policy projects_owner_only
on projects
for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists documents_by_project on documents;
create policy documents_by_project
on documents
for all
using (
  project_id in (
    select id from projects where owner_id = auth.uid()
  )
)
with check (
  project_id in (
    select id from projects where owner_id = auth.uid()
  )
);

drop policy if exists subjects_by_project on subjects;
create policy subjects_by_project
on subjects
for all
using (
  project_id in (
    select id from projects where owner_id = auth.uid()
  )
)
with check (
  project_id in (
    select id from projects where owner_id = auth.uid()
  )
);

drop policy if exists history_by_project on subject_history;
create policy history_by_project
on subject_history
for all
using (
  project_id in (
    select id from projects where owner_id = auth.uid()
  )
);
