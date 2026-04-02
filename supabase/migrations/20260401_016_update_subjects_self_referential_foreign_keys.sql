alter table public.subjects
  drop constraint if exists subjects_situation_id_fkey,
  drop constraint if exists subjects_milestone_id_fkey,
  drop constraint if exists subjects_parent_subject_id_fkey,
  drop constraint if exists subjects_duplicate_of_subject_id_fkey,
  drop constraint if exists subjects_replaced_by_subject_id_fkey;

alter table public.subjects
  add constraint subjects_parent_subject_id_fkey
    foreign key (parent_subject_id) references public.subjects(id) on delete set null,
  add constraint subjects_duplicate_of_subject_id_fkey
    foreign key (duplicate_of_subject_id) references public.subjects(id) on delete set null,
  add constraint subjects_replaced_by_subject_id_fkey
    foreign key (replaced_by_subject_id) references public.subjects(id) on delete set null;
