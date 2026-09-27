# Apps Script → Next.js parity status

The Apps Script HTML is the behavioral/UI reference. Supabase remains the runtime authority.

| Area | Status | Notes |
|---|---|---|
| Dashboard | ✅ Core parity | Real history, calendar, mastery, wrong reasons, hard items, recent activity |
| Course browser | ✅ Core parity | Real lesson status + progress; mixed unlock semantics |
| Kotoba quiz | ✅ Core parity | Sections, result persistence, wrong reason |
| Mixed Kotoba | ✅ | Server selects 10 使用 / 10 用法 / 10 類義語 and preserves source IDs |
| Bunpou quiz | ✅ Core parity | Four quiz sections |
| Dokkai | ✅ Core flow | Runs integrated session and stores parent as `sesi` |
| Course flashcard | ✅ | Kotoba FSRS + Bunpou history |
| Review Kotoba | ✅ Core parity | Due queue from `user_card_state` |
| Search | ✅ Core parity | Kotoba/Bunpou searchable index |
| Lesson detail | ✅ | Supabase-backed previews and CTAs |
| Desktop/mobile nav | ✅ | Sidebar + mobile bottom navigation |
| Light/dark | ✅ | Persisted locally |
| Apps Script / Spreadsheet learner runtime | ✅ Removed | Next runtime uses Supabase only |
| User Kotoba/Bunpou authoring UI | ⏳ | Database exists; authoring UI still needs migration |
| TTS controls | ⏳ | Not migrated yet |
| Full Apps Script keyboard shortcut set | ◐ | Flashcard flip/Good/Again implemented; quiz shortcuts not yet mirrored |
| Admin question editor | ⏳ | Not migrated |
| Admin other-user dashboard | ⏳ | Not migrated |
| Authentication | ✅ Core ready | Supabase Auth email/password + username/email login, SSR cookies, protected routes, real logout, runtime profile mapping |
| Multi-user RLS | ⏳ Important | Service-role bridge is server-only but not final public architecture |

## Invariants preserved

- stable QuestionID/source IDs
- stable CardID/source IDs
- V3 ClientAttemptKey idempotency
- server-side score validation
- FSRS state consistency and OCC through the existing RPC
- Review Kotoba isolated from normal course mastery
- Mixed Kotoba 10/10/10 selection
- Dokkai stored as one `sesi`
- Spreadsheet remains authoring/ingestion, not learner runtime

## v1.3 UI / Analytics Update — 2026-09-27

Implemented from live UI review:

- Quiz question + answers are grouped inside a dedicated focused quiz card.
- Quiz option styles now use theme tokens instead of dark-only hardcoded colors.
- Kotoba Mixed is flattened to the same visual hierarchy as Flashcard / Arti / Cara Baca.
- Mixed keeps the 30-question + >=90% unlock rule without exposing Penggunaan / 用法 / 類義語 rows on the course card.
- Course/mastery supports the new `mixed` attempt key while retaining legacy three-section fallback.
- Lesson detail no longer renders raw Flashcard / Question previews.
- Lesson detail now shows per-lesson progress, recent history, wrong-reason diagnosis, recent mistakes, hard questions, and deterministic learning insights from Supabase runtime history.
- Header / sidebar / mobile bottom navigation use an opaque chrome background so scrolling content does not visually collide beneath them.
- Dashboard headline metrics are individual cards with icons and spacing before Activity Calendar.

Runtime remains Supabase-only. No Spreadsheet fallback was added.


## Production deployment

- GitHub staging branch: pending local production build.
- Vercel import and custom domain: pending successful staging deployment.
- Vercel env must use the keys listed in `.env.example`; never expose `SUPABASE_SECRET_KEY` to the browser.


## v1.4.1 build fix
- `loginError()` is explicitly typed as `never`, allowing TypeScript control-flow narrowing after redirect guards in `src/app/login/actions.ts`.
