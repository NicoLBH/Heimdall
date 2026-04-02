create or replace function public.find_parent_subject_candidates(
  p_project_id uuid,
  p_query_title text,
  p_limit integer default 10
)
returns table (
  subject_id uuid,
  current_title text,
  current_description text,
  priority text,
  status text,
  situation_id uuid,
  parent_subject_id uuid,
  similarity_score real
)
language sql
stable
as $$
  select
    s.id as subject_id,
    s.current_title,
    s.current_description,
    s.priority,
    s.status,
    s.situation_id,
    s.parent_subject_id,
    similarity(s.current_title, p_query_title) as similarity_score
  from public.subjects s
  where s.project_id = p_project_id
    and s.status = 'open'
    and s.current_title is not null
    and p_query_title is not null
    and length(trim(p_query_title)) > 0
  order by
    case when s.parent_subject_id is null then 0 else 1 end asc,
    similarity(s.current_title, p_query_title) desc,
    s.updated_at desc nulls last,
    s.created_at desc
  limit greatest(p_limit, 1);
$$;
