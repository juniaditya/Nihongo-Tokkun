# 日本語特訓 N2 — Next.js / Vercel Frontend

Next.js production-frontend migration for the mature Google Apps Script version of 日本語特訓.

## Architecture

```text
Google Sheets
  └─ content authoring / ingestion only
       ↓
Supabase
  ├─ canonical content
  ├─ quiz attempts + answer history
  ├─ flashcard attempts + history
  ├─ FSRS user_card_state
  └─ user material
       ↓
Next.js App Router
       ↓
Vercel
```

There are **no Google Spreadsheet runtime reads/writes** in the Next.js learner flow.

## Current user-facing parity

Implemented in this revision:

- Dashboard backed by real Supabase history
- Course browser with Kotoba / Bunpou / Dokkai progress
- Kotoba mixed quiz unlock + fixed 10/10/10 selection
- Quiz persistence through `save_quiz_attempt_v3`
- Wrong-answer reason capture
- Dokkai integrated session persistence (`bagian = sesi`)
- Kotoba/Bunpou flashcard sessions
- Review Kotoba due queue
- FSRS state updates through `save_flashcard_attempt_v3`
- Search Kotoba/Bunpou
- Lesson detail pages
- Desktop sidebar + mobile bottom navigation
- Light/dark theme
- Noto Sans JP

See `PARITY_STATUS.md` for remaining migration work.

## Environment variables

Copy `.env.example` to `.env.local` locally. In Vercel, add the same values under **Project → Settings → Environment Variables**.

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
ENABLE_PERSONAL_WRITES=true
```

### Security warning

`SUPABASE_SECRET_KEY` is a **server-only service credential**. Never rename it to `NEXT_PUBLIC_*`, never embed it in a Client Component, and never commit it.

Authentication now uses Supabase Auth with cookie-based SSR. Runtime identity is derived from the authenticated `auth.users` account and mapped through `public.profiles.auth_user_id` to the existing runtime `username`. The Supabase secret key remains server-only and must never use a `NEXT_PUBLIC_` prefix.

Set `ENABLE_PERSONAL_WRITES=true` only when the deployment itself is protected and you intentionally want quiz/flashcard writes enabled.

## Required database objects

This frontend expects the production Supabase schema already used by the Apps Script app, including:

- `lessons`
- `questions`
- `question_options`
- `passages`
- `flashcards`
- `attempts`
- `answer_history`
- `flashcard_attempts`
- `flashcard_history`
- `user_card_state`
- `user_kotoba`
- `user_bunpou`
- RPC `save_quiz_attempt_v3`
- RPC `save_flashcard_attempt_v3`

Stable `source_id`, `card_id`, `attempt_id`, and `client_attempt_key` semantics are preserved.

## Local verification

```bash
npm ci
npm test
npm run build
npm run dev
```

Then open `http://localhost:3000`.

Recommended smoke test:

1. Dashboard shows historical attempts.
2. Course cards show existing progress.
3. Complete one small quiz and confirm a new row in `attempts` + children in `answer_history`.
4. Complete one flashcard session and confirm `flashcard_attempts`, `flashcard_history`, and `user_card_state` update.
5. Confirm Google Spreadsheet runtime sheets are not recreated.

## Deploy to Vercel

1. Put this source in a Git repository.
2. Import the repository into Vercel.
3. Add the environment variables above.
4. Verify login/logout and per-user data isolation before promoting the deployment to production.
5. Run a production smoke test after deployment.

No Spreadsheet credential is required by the Next.js learner frontend.


## GitHub + Vercel production flow

Recommended release order:

1. Install the SSR auth dependency and refresh the lockfile: `npm install @supabase/ssr@0.12.7`.
2. Run `npm test` and `npm run build`.
3. Verify login/logout locally with an existing Supabase Auth account linked to `public.profiles.auth_user_id`.
4. Push to a staging branch first; do not overwrite a known-good production branch before validation.
5. Import the GitHub repository into Vercel.
6. Configure the four environment variables from `.env.example` in Vercel.
7. After the Vercel deployment is healthy, attach the custom domain and add it to Supabase Auth URL configuration.

Never commit `.env.local`, Supabase secret keys, Vercel tokens, or other credentials.
