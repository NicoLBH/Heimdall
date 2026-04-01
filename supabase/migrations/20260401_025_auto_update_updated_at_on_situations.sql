create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_situations_updated_at on public.situations;

create trigger trg_situations_updated_at
before update on public.situations
for each row
execute function public.set_updated_at();
