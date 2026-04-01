alter table subject_history
add constraint subject_history_event_type_check
check (
  event_type in (
    'subject_created',
    'subject_enriched',
    'subject_reopened',
    'subject_marked_duplicate',
    'subject_child_created',
    'subject_link_created',
    'status_changed',
    'priority_changed',
    'title_changed',
    'parent_changed',
    'situation_changed'
  )
);
