select conname
from pg_constraint
where conrelid = 'subject_history'::regclass;
