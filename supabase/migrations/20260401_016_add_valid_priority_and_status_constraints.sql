alter table public.subjects
  drop constraint if exists subjects_priority_check;

alter table public.subjects
  add constraint subjects_priority_check
  check (priority in ('low', 'medium', 'high', 'critical'));

alter table public.subjects
  drop constraint if exists subjects_status_check;

alter table public.subjects
  add constraint subjects_status_check
  check (status in ('open', 'closed', 'closed_duplicate', 'closed_invalid', 'closed_replaced'));
