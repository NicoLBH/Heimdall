-- Public profile + avatars storage (idempotent)

create table if not exists public.user_public_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  public_email text,
  bio text,
  company text,
  avatar_storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_public_profiles enable row level security;

create index if not exists idx_user_public_profiles_public_email
  on public.user_public_profiles(public_email);

create index if not exists idx_user_public_profiles_company
  on public.user_public_profiles(company);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_public_profiles_updated_at on public.user_public_profiles;
create trigger trg_user_public_profiles_updated_at
before update on public.user_public_profiles
for each row execute function public.set_updated_at();

drop policy if exists user_public_profiles_owner_select on public.user_public_profiles;
create policy user_public_profiles_owner_select
on public.user_public_profiles
for select
using (auth.uid() = user_id);

drop policy if exists user_public_profiles_owner_insert on public.user_public_profiles;
create policy user_public_profiles_owner_insert
on public.user_public_profiles
for insert
with check (auth.uid() = user_id);

drop policy if exists user_public_profiles_owner_update on public.user_public_profiles;
create policy user_public_profiles_owner_update
on public.user_public_profiles
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists user_public_profiles_owner_delete on public.user_public_profiles;
create policy user_public_profiles_owner_delete
on public.user_public_profiles
for delete
using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', false)
on conflict (id) do nothing;

drop policy if exists storage_avatars_owner_select on storage.objects;
create policy storage_avatars_owner_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists storage_avatars_owner_insert on storage.objects;
create policy storage_avatars_owner_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists storage_avatars_owner_update on storage.objects;
create policy storage_avatars_owner_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists storage_avatars_owner_delete on storage.objects;
create policy storage_avatars_owner_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);
