-- schema.sql
-- JLPT learning platform: normalized Supabase/PostgreSQL schema
-- Content flow: Google Sheets / Excel -> importer -> Supabase -> website
-- Auth: Supabase Auth (auth.users). Do NOT migrate PasswordHash/Salt/ResetToken.

create extension if not exists pgcrypto;

-- =========================================================
-- Generic updated_at trigger
-- =========================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================
-- Courses / Lessons
-- =========================================================
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  level text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  category text not null check (lower(category) in ('kotoba','bunpou','dokkai')),
  number integer not null check (number > 0),
  title text,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(course_id, category, number)
);

-- =========================================================
-- Kotoba
-- =========================================================
create table if not exists public.kotoba (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  word text not null,
  reading text,
  meaning text,
  explanation text,
  is_supplementary boolean not null default false,
  legacy_id text unique,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(lesson_id, word)
);
-- Catatan: soal pilihan ganda utk section penggunaan_kalimat / cara_pakai / sinonim
-- TIDAK disimpan flat di sini. Semua masuk questions + question_options
-- (question_type = 'penggunaan_kalimat' | 'cara_pakai' | 'sinonim', kotoba_id = FK ke sini),
-- karena 1 kotoba bisa punya lebih dari 1 soal per section.
-- is_supplementary: false = flashcard_wajib (master resmi lesson), true = kotoba_tambahan (ekstra temuan user).

create table if not exists public.kotoba_relations (
  id uuid primary key default gen_random_uuid(),
  kotoba_id uuid not null references public.kotoba(id) on delete cascade,
  related_kotoba_id uuid not null references public.kotoba(id) on delete cascade,
  relation_type text not null check (
    lower(relation_type) in ('synonym','antonym','similar','usage_difference','related')
  ),
  explanation text,
  created_at timestamptz not null default now(),
  unique(kotoba_id, related_kotoba_id, relation_type),
  check (kotoba_id <> related_kotoba_id)
);

-- =========================================================
-- Bunpou
-- =========================================================
create table if not exists public.bunpou (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  grammar text not null,
  function text,
  examples text,
  formula text,
  meaning text,
  key_difference text,
  is_supplementary boolean not null default false,
  legacy_id text unique,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(lesson_id, grammar)
);
-- is_supplementary: false = grammar_wajib (master resmi lesson), true = grammar_tambahan (ekstra temuan user).

-- =========================================================
-- Dokkai passages
-- =========================================================
create table if not exists public.dokkai_passages (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  passage_type text not null check (
    lower(passage_type) in ('tanbun','chuubun','tougou','chobun','jouhou')
  ),
  title text,
  passage text,
  passage_a text,
  passage_b text,
  legacy_id text unique,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================
-- Unified question bank
-- =========================================================
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  kotoba_id uuid references public.kotoba(id) on delete cascade,
  bunpou_id uuid references public.bunpou(id) on delete cascade,
  passage_id uuid references public.dokkai_passages(id) on delete cascade,
  question_type text not null,
  question_text text not null,
  explanation text,
  legacy_id text unique,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    num_nonnulls(kotoba_id, bunpou_id, passage_id) = 1
  )
);

create table if not exists public.question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  option_text text not null,
  option_order integer not null check (option_order >= 1),
  is_correct boolean not null default false,
  explanation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(question_id, option_order)
);

-- =========================================================
-- Flashcards
-- =========================================================
create table if not exists public.flashcards (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  kotoba_id uuid references public.kotoba(id) on delete cascade,
  bunpou_id uuid references public.bunpou(id) on delete cascade,
  front text not null,
  reading text,
  meaning text,
  explanation text,
  legacy_id text unique,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (num_nonnulls(kotoba_id, bunpou_id) = 1)
);

-- =========================================================
-- User profile
-- =========================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  role text not null default 'user' check (lower(role) in ('user','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================
-- Practice / attempts
-- =========================================================
create table if not exists public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid references public.lessons(id) on delete set null,
  category text check (lower(category) in ('kotoba','bunpou','dokkai')),
  section text,
  total_questions integer not null default 0 check (total_questions >= 0),
  correct_answers integer not null default 0 check (correct_answers >= 0),
  score numeric(6,2),
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.question_attempts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.practice_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  selected_option_id uuid references public.question_options(id) on delete set null,
  is_correct boolean,
  answered_at timestamptz not null default now(),
  response_time_ms integer check (response_time_ms is null or response_time_ms >= 0)
);

create table if not exists public.mistake_logs (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.question_attempts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text,
  custom_reason text,
  created_at timestamptz not null default now()
);

-- =========================================================
-- Flashcard reviews
-- =========================================================
create table if not exists public.flashcard_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  flashcard_id uuid not null references public.flashcards(id) on delete cascade,
  rating text not null check (lower(rating) in ('again','hard','good','easy')),
  reviewed_at timestamptz not null default now(),
  next_review_at timestamptz,
  review_count integer not null default 1 check (review_count >= 1)
);

-- =========================================================
-- Optional edit locks
-- =========================================================
create table if not exists public.edit_locks (
  target_key text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  locked_at timestamptz not null default now(),
  last_active_at timestamptz not null default now()
);

-- =========================================================
-- Indexes
-- =========================================================
create index if not exists idx_lessons_course on public.lessons(course_id);
create index if not exists idx_lessons_category_number on public.lessons(category, number);

create index if not exists idx_kotoba_lesson on public.kotoba(lesson_id);
create index if not exists idx_kotoba_word on public.kotoba(word);
create index if not exists idx_kotoba_relations_kotoba on public.kotoba_relations(kotoba_id);
create index if not exists idx_kotoba_relations_related on public.kotoba_relations(related_kotoba_id);

create index if not exists idx_bunpou_lesson on public.bunpou(lesson_id);

create index if not exists idx_passages_lesson on public.dokkai_passages(lesson_id);
create index if not exists idx_passages_type on public.dokkai_passages(passage_type);

create index if not exists idx_questions_lesson on public.questions(lesson_id);
create index if not exists idx_questions_kotoba on public.questions(kotoba_id);
create index if not exists idx_questions_bunpou on public.questions(bunpou_id);
create index if not exists idx_questions_passage on public.questions(passage_id);
create index if not exists idx_questions_type on public.questions(question_type);

create index if not exists idx_options_question on public.question_options(question_id);

create index if not exists idx_flashcards_lesson on public.flashcards(lesson_id);
create index if not exists idx_flashcards_kotoba on public.flashcards(kotoba_id);
create index if not exists idx_flashcards_bunpou on public.flashcards(bunpou_id);

create index if not exists idx_attempts_user on public.question_attempts(user_id);
create index if not exists idx_attempts_question on public.question_attempts(question_id);
create index if not exists idx_attempts_session on public.question_attempts(session_id);

create index if not exists idx_flashcard_reviews_user on public.flashcard_reviews(user_id);
create index if not exists idx_flashcard_reviews_due on public.flashcard_reviews(user_id, next_review_at);

-- =========================================================
-- updated_at triggers
-- =========================================================
drop trigger if exists trg_courses_updated_at on public.courses;
create trigger trg_courses_updated_at
before update on public.courses
for each row execute function public.set_updated_at();

drop trigger if exists trg_lessons_updated_at on public.lessons;
create trigger trg_lessons_updated_at
before update on public.lessons
for each row execute function public.set_updated_at();

drop trigger if exists trg_kotoba_updated_at on public.kotoba;
create trigger trg_kotoba_updated_at
before update on public.kotoba
for each row execute function public.set_updated_at();

drop trigger if exists trg_bunpou_updated_at on public.bunpou;
create trigger trg_bunpou_updated_at
before update on public.bunpou
for each row execute function public.set_updated_at();

drop trigger if exists trg_passages_updated_at on public.dokkai_passages;
create trigger trg_passages_updated_at
before update on public.dokkai_passages
for each row execute function public.set_updated_at();

drop trigger if exists trg_questions_updated_at on public.questions;
create trigger trg_questions_updated_at
before update on public.questions
for each row execute function public.set_updated_at();

drop trigger if exists trg_options_updated_at on public.question_options;
create trigger trg_options_updated_at
before update on public.question_options
for each row execute function public.set_updated_at();

drop trigger if exists trg_flashcards_updated_at on public.flashcards;
create trigger trg_flashcards_updated_at
before update on public.flashcards
for each row execute function public.set_updated_at();

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- =========================================================
-- RLS
-- =========================================================
alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.kotoba enable row level security;
alter table public.kotoba_relations enable row level security;
alter table public.bunpou enable row level security;
alter table public.dokkai_passages enable row level security;
alter table public.questions enable row level security;
alter table public.question_options enable row level security;
alter table public.flashcards enable row level security;
alter table public.profiles enable row level security;
alter table public.practice_sessions enable row level security;
alter table public.question_attempts enable row level security;
alter table public.mistake_logs enable row level security;
alter table public.flashcard_reviews enable row level security;
alter table public.edit_locks enable row level security;

-- Helper: admin check
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and lower(role) = 'admin'
  );
$$;

-- Remove policies so this script can be safely re-run.
do $$
declare
  r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'courses','lessons','kotoba','kotoba_relations','bunpou',
        'dokkai_passages','questions','question_options','flashcards',
        'profiles','practice_sessions','question_attempts','mistake_logs',
        'flashcard_reviews','edit_locks'
      )
  loop
    execute format('drop policy if exists %I on %I.%I',
                   r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- Publicly readable learning content; writes restricted to admin.
create policy courses_select_authenticated on public.courses
for select to authenticated using (true);
create policy courses_admin_write on public.courses
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy lessons_select_authenticated on public.lessons
for select to authenticated using (true);
create policy lessons_admin_write on public.lessons
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy kotoba_select_authenticated on public.kotoba
for select to authenticated using (is_active = true or public.is_admin());
create policy kotoba_admin_write on public.kotoba
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy kotoba_relations_select_authenticated on public.kotoba_relations
for select to authenticated using (true);
create policy kotoba_relations_admin_write on public.kotoba_relations
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy bunpou_select_authenticated on public.bunpou
for select to authenticated using (is_active = true or public.is_admin());
create policy bunpou_admin_write on public.bunpou
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy passages_select_authenticated on public.dokkai_passages
for select to authenticated using (is_active = true or public.is_admin());
create policy passages_admin_write on public.dokkai_passages
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy questions_select_authenticated on public.questions
for select to authenticated using (is_active = true or public.is_admin());
create policy questions_admin_write on public.questions
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy options_select_authenticated on public.question_options
for select to authenticated using (true);
create policy options_admin_write on public.question_options
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy flashcards_select_authenticated on public.flashcards
for select to authenticated using (is_active = true or public.is_admin());
create policy flashcards_admin_write on public.flashcards
for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Profiles: user sees own profile; admin sees all.
create policy profiles_select_own_or_admin on public.profiles
for select to authenticated
using (id = auth.uid() or public.is_admin());

create policy profiles_update_own_or_admin on public.profiles
for update to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

create policy profiles_insert_admin on public.profiles
for insert to authenticated
with check (public.is_admin());

-- Practice data: strictly per-user, admin may inspect/manage.
create policy sessions_own_or_admin on public.practice_sessions
for all to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

create policy attempts_own_or_admin on public.question_attempts
for all to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

create policy mistakes_own_or_admin on public.mistake_logs
for all to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

create policy reviews_own_or_admin on public.flashcard_reviews
for all to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

create policy locks_authenticated on public.edit_locks
for all to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

-- IMPORTANT:
-- The importer must use the Supabase service-role key ONLY server-side/local admin tooling.
-- Never put service_role in browser/frontend code.
