alter table subject_history
add column if not exists actor_type text not null default 'system';

alter table subject_history
add column if not exists actor_label text null;
