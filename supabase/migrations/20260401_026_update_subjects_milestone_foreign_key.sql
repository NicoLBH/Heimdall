alter table public.subjects
  drop constraint if exists subjects_milestone_id_fkey;

alter table public.subjects
  add constraint subjects_milestone_id_fkey
  foreign key (milestone_id) references public.milestones(id) on delete set null;
