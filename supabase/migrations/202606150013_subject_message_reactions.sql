create table if not exists public.subject_message_reactions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  message_id uuid not null references public.subject_messages(id) on delete cascade,
  reaction_code text not null,
  reactor_person_id uuid not null references public.directory_people(id) on delete restrict,
  reactor_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint subject_message_reactions_unique unique (message_id, reaction_code, reactor_person_id),
  constraint subject_message_reactions_code_check check (
    reaction_code in ('thumbs_up', 'thumbs_down', 'grinning', 'party', 'thinking', 'heart', 'rocket', 'eyes')
  )
);

create index if not exists idx_subject_message_reactions_message_created
  on public.subject_message_reactions(message_id, created_at asc);

create index if not exists idx_subject_message_reactions_subject_created
  on public.subject_message_reactions(subject_id, created_at asc);

create or replace function public.trg_validate_subject_message_reaction_consistency()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_message public.subject_messages;
begin
  select sm.*
  into v_message
  from public.subject_messages sm
  where sm.id = new.message_id;

  if v_message.id is null then
    raise exception 'subject message % not found for reaction', new.message_id;
  end if;

  if new.project_id is distinct from v_message.project_id then
    raise exception 'reaction project_id mismatch for message %', new.message_id;
  end if;

  if new.subject_id is distinct from v_message.subject_id then
    raise exception 'reaction subject_id mismatch for message %', new.message_id;
  end if;

  new.reaction_code := lower(btrim(coalesce(new.reaction_code, '')));
  if new.reaction_code = '' then
    raise exception 'reaction_code is required';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_subject_message_reaction_consistency on public.subject_message_reactions;
create trigger trg_validate_subject_message_reaction_consistency
before insert or update on public.subject_message_reactions
for each row execute function public.trg_validate_subject_message_reaction_consistency();

alter table public.subject_message_reactions enable row level security;

drop policy if exists subject_message_reactions_select on public.subject_message_reactions;
create policy subject_message_reactions_select
on public.subject_message_reactions
for select
to authenticated
using (public.can_access_project_subject_conversation(project_id));

drop policy if exists subject_message_reactions_insert on public.subject_message_reactions;
create policy subject_message_reactions_insert
on public.subject_message_reactions
for insert
to authenticated
with check (
  public.can_access_project_subject_conversation(project_id)
  and reactor_person_id = public.current_person_id()
);

drop policy if exists subject_message_reactions_delete on public.subject_message_reactions;
create policy subject_message_reactions_delete
on public.subject_message_reactions
for delete
to authenticated
using (
  public.can_access_project_subject_conversation(project_id)
  and reactor_person_id = public.current_person_id()
);

create or replace function public.toggle_subject_message_reaction(
  p_message_id uuid,
  p_reaction_code text
)
returns setof public.subject_message_reactions
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_message public.subject_messages;
  v_person_id uuid;
  v_code text := lower(btrim(coalesce(p_reaction_code, '')));
  v_removed_count integer := 0;
begin
  if p_message_id is null then
    raise exception 'p_message_id is required';
  end if;

  if v_code = '' then
    raise exception 'p_reaction_code is required';
  end if;

  if v_code not in ('thumbs_up', 'thumbs_down', 'grinning', 'party', 'thinking', 'heart', 'rocket', 'eyes') then
    raise exception 'unsupported reaction code: %', v_code;
  end if;

  select sm.*
  into v_message
  from public.subject_messages sm
  where sm.id = p_message_id
    and sm.deleted_at is null;

  if v_message.id is null then
    raise exception 'subject message % not found', p_message_id;
  end if;

  if not public.can_access_project_subject_conversation(v_message.project_id) then
    raise exception 'not authorized to react to message %', p_message_id;
  end if;

  v_person_id := public.current_person_id();
  if v_person_id is null then
    raise exception 'current person is required';
  end if;

  delete from public.subject_message_reactions smr
  where smr.message_id = v_message.id
    and smr.reaction_code = v_code
    and smr.reactor_person_id = v_person_id;

  get diagnostics v_removed_count = row_count;

  if v_removed_count > 0 then
    return;
  end if;

  return query
  insert into public.subject_message_reactions (
    project_id,
    subject_id,
    message_id,
    reaction_code,
    reactor_person_id,
    reactor_user_id
  ) values (
    v_message.project_id,
    v_message.subject_id,
    v_message.id,
    v_code,
    v_person_id,
    auth.uid()
  )
  returning *;
end;
$$;

grant execute on function public.toggle_subject_message_reaction(uuid, text) to authenticated;
