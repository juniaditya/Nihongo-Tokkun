-- =====================================================================
-- MIGRATION: Fitur tambahan untuk web app (jalankan lewat Supabase SQL Editor)
-- Urutan eksekusi penting — jalankan dari atas ke bawah dalam 1 kali run,
-- atau per section kalau mau cek satu-satu.
-- =====================================================================


-- =====================================================================
-- 1. SUBSCRIPTION TIERS (guest tidak punya row profil, jadi cuma free/premium
--    yang perlu tabel; role admin tetap dari kolom profiles.role yang sudah ada)
-- =====================================================================

create table if not exists subscription_tiers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,           -- kode internal, jangan diubah: 'free' / 'premium'
  name text not null,                  -- nama tampilan, BEBAS diubah admin kapan saja
  description text,
  sort_order int4 not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into subscription_tiers (code, name, sort_order)
values
  ('free', 'Gratis', 1),
  ('premium', 'Berlangganan', 2)
on conflict (code) do nothing;

alter table profiles
  add column if not exists tier_id uuid references subscription_tiers(id);

-- Default semua profil lama ke tier 'free' kalau masih kosong
update profiles
set tier_id = (select id from subscription_tiers where code = 'free')
where tier_id is null;

-- CATATAN: kalau kamu sudah punya trigger `handle_new_user` yang bikin row
-- `profiles` otomatis saat user baru daftar (pola umum Supabase), tambahkan
-- baris berikut di dalam trigger itu supaya user baru otomatis dapat tier 'free':
--   tier_id = (select id from subscription_tiers where code = 'free')
-- Saya tidak menimpa trigger itu di sini karena tidak tahu isi persis punyamu.

alter table subscription_tiers enable row level security;

create policy subscription_tiers_select_all
  on subscription_tiers for select
  to authenticated, anon
  using (is_active = true);

create policy subscription_tiers_admin_write
  on subscription_tiers for all
  to authenticated
  using (is_admin())
  with check (is_admin());


-- =====================================================================
-- 2. GUEST ACCESS + TIMER PER SESI (kolom baru di lessons)
-- =====================================================================

alter table lessons
  add column if not exists is_guest_accessible boolean not null default false;

alter table lessons
  add column if not exists time_limit_seconds int4;  -- NULL = tanpa batas waktu

comment on column lessons.is_guest_accessible is 'Jika true, lesson ini bisa diakses tanpa login (guest)';
comment on column lessons.time_limit_seconds is 'Batas waktu per sesi latihan dalam detik, admin-configurable. NULL = tanpa timer';

-- Contoh: buka lesson pertama tiap course untuk guest (sesuaikan manual di UI admin nanti)
-- update lessons set is_guest_accessible = true where number = 1;

-- --- RLS tambahan untuk akses anon (guest) ---
-- Lessons: anon boleh lihat row yang ditandai guest-accessible
create policy lessons_select_anon
  on lessons for select
  to anon
  using (is_guest_accessible = true);

-- Kotoba/Bunpou/Dokkai/Questions/Options/Flashcards: anon boleh lihat isi
-- lesson yang guest-accessible saja (join by lesson_id)
create policy kotoba_select_anon
  on kotoba for select
  to anon
  using (
    is_active = true
    and exists (select 1 from lessons l where l.id = kotoba.lesson_id and l.is_guest_accessible = true)
  );

create policy bunpou_select_anon
  on bunpou for select
  to anon
  using (
    is_active = true
    and exists (select 1 from lessons l where l.id = bunpou.lesson_id and l.is_guest_accessible = true)
  );

create policy passages_select_anon
  on dokkai_passages for select
  to anon
  using (
    is_active = true
    and exists (select 1 from lessons l where l.id = dokkai_passages.lesson_id and l.is_guest_accessible = true)
  );

create policy questions_select_anon
  on questions for select
  to anon
  using (
    is_active = true
    and exists (select 1 from lessons l where l.id = questions.lesson_id and l.is_guest_accessible = true)
  );

create policy options_select_anon
  on question_options for select
  to anon
  using (
    exists (
      select 1 from questions q
      join lessons l on l.id = q.lesson_id
      where q.id = question_options.question_id and l.is_guest_accessible = true
    )
  );

create policy flashcards_select_anon
  on flashcards for select
  to anon
  using (
    is_active = true
    and exists (select 1 from lessons l where l.id = flashcards.lesson_id and l.is_guest_accessible = true)
  );


-- =====================================================================
-- 3. LESSON COMPLETION TRACKING (per lesson + per question_type)
-- =====================================================================

create table if not exists lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references lessons(id) on delete cascade,
  status text not null default 'not_started',   -- not_started | in_progress | completed
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

create table if not exists lesson_type_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references lessons(id) on delete cascade,
  question_type text not null,           -- contoh: '意味', '読み方', dst — harus cocok questions.question_type
  best_score numeric,                    -- persentase terbaik yang pernah dicapai
  passed boolean not null default false, -- true jika best_score >= passing_grade_percent (lihat app_config)
  attempts_count int4 not null default 0,
  last_attempt_at timestamptz,
  primary key (user_id, lesson_id, question_type)
);

alter table lesson_progress enable row level security;
alter table lesson_type_progress enable row level security;

create policy lesson_progress_own_or_admin
  on lesson_progress for all
  to authenticated
  using (user_id = auth.uid() or is_admin())
  with check (user_id = auth.uid() or is_admin());

create policy lesson_type_progress_own_or_admin
  on lesson_type_progress for all
  to authenticated
  using (user_id = auth.uid() or is_admin())
  with check (user_id = auth.uid() or is_admin());

-- Trigger: setiap kali lesson_type_progress di-upsert, cek apakah SEMUA
-- question_type aktif pada lesson itu sudah passed=true. Kalau ya, tandai
-- lesson_progress = 'completed'. Kalau tidak, 'in_progress'.
-- (Aturan "gagal 90% harus ulang semua tipe" berarti app harus me-reset
--  passed=false untuk semua question_type di lesson itu saat 1 tipe gagal —
--  itu logic di sisi aplikasi, bukan di trigger ini.)

create or replace function fn_update_lesson_progress()
returns trigger
language plpgsql
security definer
as $$
declare
  total_types int;
  passed_types int;
begin
  select count(distinct question_type) into total_types
  from questions
  where lesson_id = new.lesson_id and is_active = true;

  select count(*) into passed_types
  from lesson_type_progress
  where user_id = new.user_id and lesson_id = new.lesson_id and passed = true;

  insert into lesson_progress (user_id, lesson_id, status, completed_at)
  values (
    new.user_id,
    new.lesson_id,
    case when total_types > 0 and passed_types >= total_types then 'completed' else 'in_progress' end,
    case when total_types > 0 and passed_types >= total_types then now() else null end
  )
  on conflict (user_id, lesson_id) do update
    set status = excluded.status,
        completed_at = excluded.completed_at,
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists trg_lesson_type_progress_after on lesson_type_progress;
create trigger trg_lesson_type_progress_after
after insert or update on lesson_type_progress
for each row execute function fn_update_lesson_progress();


-- =====================================================================
-- 4. APP CONFIG (nilai kelulusan & setting global lain, admin-editable)
-- =====================================================================

create table if not exists app_config (
  key text primary key,
  value text not null,
  description text,
  updated_at timestamptz not null default now()
);

insert into app_config (key, value, description) values
  ('passing_grade_percent', '90', 'Nilai minimum kelulusan tiap question_type dalam 1 lesson (%)')
on conflict (key) do nothing;

alter table app_config enable row level security;

create policy app_config_select_all
  on app_config for select
  to authenticated, anon
  using (true);

create policy app_config_admin_write
  on app_config for all
  to authenticated
  using (is_admin())
  with check (is_admin());


-- =====================================================================
-- 5. MISTAKE REASON PRESETS (untuk dropdown alasan salah + opsi "Lainnya")
-- =====================================================================

create table if not exists mistake_reason_presets (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  sort_order int4 not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into mistake_reason_presets (label, sort_order) values
  ('Salah baca kanji', 1),
  ('Lupa arti kata', 2),
  ('Salah pakai grammar', 3),
  ('Terburu-buru / ceroboh', 4),
  ('Tidak paham konteks kalimat', 5)
on conflict do nothing;

alter table mistake_reason_presets enable row level security;

create policy mistake_reason_presets_select_all
  on mistake_reason_presets for select
  to authenticated
  using (is_active = true);

create policy mistake_reason_presets_admin_write
  on mistake_reason_presets for all
  to authenticated
  using (is_admin())
  with check (is_admin());

-- Pemakaian: mistake_logs.reason diisi dengan label preset yang dipilih.
-- Kalau user pilih "Lainnya", mistake_logs.reason = 'Lainnya' dan
-- mistake_logs.custom_reason (sudah ada di schema) diisi teks bebas user.


-- =====================================================================
-- 6. KOTOBA RELATIONS — batasi relation_type, generik, dua arah
-- =====================================================================

alter table kotoba_relations drop constraint if exists kotoba_relations_type_check;
alter table kotoba_relations
  add constraint kotoba_relations_type_check
  check (relation_type in ('related_kanji', 'synonym', 'antonym', 'confusable', 'other'));

-- Dua arah: cukup query OR di kedua kolom, tidak perlu 2 row per pasangan:
--   select * from kotoba_relations
--   where kotoba_id = :id or related_kotoba_id = :id;
-- Tampilkan `related_kotoba_id` (atau `kotoba_id` kalau match-nya di kolom itu)
-- sebagai "kata terkait" di popup. relation_type murni label, belum ada logic khusus.


-- =====================================================================
-- 7. STREAK HARIAN
-- =====================================================================

create table if not exists user_streaks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_streak int4 not null default 0,
  longest_streak int4 not null default 0,
  last_active_date date,
  updated_at timestamptz not null default now()
);

alter table user_streaks enable row level security;

create policy user_streaks_own_or_admin
  on user_streaks for all
  to authenticated
  using (user_id = auth.uid() or is_admin())
  with check (user_id = auth.uid() or is_admin());

-- Trigger otomatis update streak saat practice_sessions selesai.
-- Sesuaikan 'Asia/Jakarta' jika mau pakai timezone lain sebagai acuan "hari".
create or replace function fn_update_streak()
returns trigger
language plpgsql
security definer
as $$
declare
  last_date date;
  today date := (new.completed_at at time zone 'Asia/Jakarta')::date;
begin
  if new.completed_at is null then
    return new;
  end if;

  select last_active_date into last_date from user_streaks where user_id = new.user_id;

  if last_date is null then
    insert into user_streaks (user_id, current_streak, longest_streak, last_active_date)
    values (new.user_id, 1, 1, today)
    on conflict (user_id) do nothing;
  elsif last_date = today then
    null; -- sudah dihitung hari ini, tidak diubah
  elsif last_date = today - 1 then
    update user_streaks
    set current_streak = current_streak + 1,
        longest_streak = greatest(longest_streak, current_streak + 1),
        last_active_date = today,
        updated_at = now()
    where user_id = new.user_id;
  else
    update user_streaks
    set current_streak = 1,
        last_active_date = today,
        updated_at = now()
    where user_id = new.user_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_practice_sessions_streak on practice_sessions;
create trigger trg_practice_sessions_streak
after insert or update of completed_at on practice_sessions
for each row
when (new.completed_at is not null)
execute function fn_update_streak();


-- =====================================================================
-- 8. LEADERBOARD VIEWS (agregat saja, tidak expose data mentah user lain)
-- =====================================================================
-- PENTING: view ini dibuat oleh role default (biasanya `postgres`) yang
-- bypass RLS, sehingga bisa mengagregasi practice_sessions milik SEMUA user
-- meski RLS tabel aslinya membatasi ke "milik sendiri". Yang di-expose ke
-- client HANYA angka ringkasan (skor, persentase, waktu), bukan jawaban
-- per soal — jadi aman secara privasi.

create or replace view v_user_global_stats as
select
  user_id,
  count(*) filter (where completed_at is not null) as sessions_completed,
  coalesce(sum(correct_answers), 0) as total_correct,
  coalesce(sum(total_questions), 0) as total_questions,
  case when sum(total_questions) > 0
    then round(100.0 * sum(correct_answers) / sum(total_questions), 2)
    else 0
  end as accuracy_percent,
  coalesce(sum(extract(epoch from (completed_at - started_at))), 0)::bigint as total_time_seconds
from practice_sessions
where completed_at is not null
group by user_id;

create or replace view v_user_course_stats as
select
  ps.user_id,
  l.course_id,
  count(*) filter (where ps.completed_at is not null) as sessions_completed,
  coalesce(sum(ps.correct_answers), 0) as total_correct,
  coalesce(sum(ps.total_questions), 0) as total_questions,
  case when sum(ps.total_questions) > 0
    then round(100.0 * sum(ps.correct_answers) / sum(ps.total_questions), 2)
    else 0
  end as accuracy_percent,
  coalesce(sum(extract(epoch from (ps.completed_at - ps.started_at))), 0)::bigint as total_time_seconds
from practice_sessions ps
join lessons l on l.id = ps.lesson_id
where ps.completed_at is not null
group by ps.user_id, l.course_id;

grant select on v_user_global_stats to authenticated;
grant select on v_user_course_stats to authenticated;

-- Pemakaian di frontend untuk tab leaderboard:
--   "Total Skor"   -> order by total_correct desc
--   "Persentase"   -> order by accuracy_percent desc
--   "Waktu Belajar"-> order by total_time_seconds desc
-- Global: query v_user_global_stats. Per course: query v_user_course_stats
-- filter course_id, lalu join ke profiles untuk nama/avatar.


-- =====================================================================
-- SELESAI. Ringkasan objek baru:
-- Tabel   : subscription_tiers, lesson_progress, lesson_type_progress,
--           app_config, mistake_reason_presets, user_streaks
-- Kolom   : profiles.tier_id, lessons.is_guest_accessible,
--           lessons.time_limit_seconds
-- View    : v_user_global_stats, v_user_course_stats
-- Trigger : fn_update_lesson_progress, fn_update_streak
-- =====================================================================
