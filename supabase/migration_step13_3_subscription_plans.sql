-- Manual plans are separate from existing tiers; no existing access is rewritten.
begin;
create table public.user_subscriptions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  plan_type text not null check (plan_type in ('jlpt_intensive', 'nihongo_regular')),
  jlpt_level text check (jlpt_level in ('N5','N4','N3','N2','N1')),
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint intensive_requires_level check (plan_type <> 'jlpt_intensive' or jlpt_level is not null),
  constraint valid_subscription_expiry check (expires_at is null or expires_at > started_at)
);
create function public.calculate_subscription_expiry()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  new.expires_at := case when new.plan_type = 'jlpt_intensive'
    then new.started_at + interval '4 months' else null end;
  new.updated_at := now();
  return new;
end;
$$;
create trigger trg_calculate_subscription_expiry before insert or update on public.user_subscriptions
for each row execute function public.calculate_subscription_expiry();
alter table public.user_subscriptions enable row level security;
revoke all on public.user_subscriptions from anon, authenticated;
grant select, insert, update on public.user_subscriptions to authenticated;
create policy subscription_read_own on public.user_subscriptions for select to authenticated
using (user_id = auth.uid() or public.is_admin());
create policy subscription_admin_insert on public.user_subscriptions for insert to authenticated
with check (public.is_admin());
create policy subscription_admin_update on public.user_subscriptions for update to authenticated
using (public.is_admin()) with check (public.is_admin());
commit;
