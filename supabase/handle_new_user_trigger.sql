-- =====================================================================
-- JALANKAN INI HANYA JIKA query pengecekan sebelumnya mengembalikan KOSONG
-- (artinya kamu belum punya trigger auto-create profiles).
-- Kalau sudah ada trigger lain dengan nama/fungsi berbeda, JANGAN jalankan
-- ini dulu — kirim isi fungsi lamamu supaya digabung, bukan ditimpa.
-- =====================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, role, tier_id, created_at, updated_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', new.email),
    'user',
    (select id from subscription_tiers where code = 'free'),
    now(),
    now()
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
