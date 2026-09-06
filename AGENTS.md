You are developing a production-quality JLPT Japanese learning web application.

The primary source of truth is:

docs/PRD_JLPT_Learning_App.md

Read it before implementing any feature.

The existing Supabase database is authoritative for actual table/column names. Never invent database columns, tables, RPCs, or relationships without verifying them first.

TECH STACK

* Next.js App Router
* TypeScript
* Tailwind CSS
* Supabase Postgres
* Supabase Auth
* Supabase Realtime
* @supabase/supabase-js
* @supabase/ssr when required for Next.js authentication/session handling
* Vercel
* GitHub
* No React Query/SWR for MVP
* No custom backend unless technically necessary
* No Prisma
* No separate Express server
* No Firebase

ARCHITECTURAL PRINCIPLES

1. Supabase is the single data source.
2. RLS is the primary authorization layer.
3. Never use the Supabase service-role key in browser/client code.
4. Never bypass RLS for ordinary application features.
5. Do not hardcode passing grade. Read passing_grade_percent from app_config.
6. Guest progress must never be persisted.
7. User progress must be scoped to auth.uid().
8. Admin UI belongs to the same Next.js application under /admin.
9. Role and subscription tier are separate concepts.
10. Client users must never be able to assign themselves admin or premium access.
11. Japanese text must use Noto Sans JP.
12. UI language is Indonesian.
13. Dark mode is default.
14. Support light mode.
15. Desktop uses sidebar navigation.
16. Mobile below 900px uses bottom navigation.
17. Preserve responsive behavior.
18. Use reusable components rather than duplicate implementations.

PRACTICE BUSINESS RULES

* A lesson contains multiple question_type sessions.
* Each question_type is practiced separately.
* Never add a Practice All mode.
* Four-option multiple choice only for MVP.
* Each answer must create question_attempts for authenticated users.
* passing_grade_percent comes from app_config.
* If any question type fails the passing grade, all question types for that lesson must have their current passed state reset according to the PRD.
* best historical scores must not accidentally be destroyed unless explicitly required by the schema/business rules.
* lesson completion occurs only after all required question types pass.

GUEST RULES

* Guest may view the public experience.
* Guest may access only lessons where is_guest_accessible = true.
* Guest attempts must not create practice_sessions, question_attempts, mistake_logs, flashcard_reviews, lesson_progress, or lesson_type_progress.

FLASHCARD RULES

* Kotoba and Bunpou have flashcards.
* Dokkai has no flashcards.
* Show every standard flashcard belonging to the lesson in the lesson flashcard session.
* supplementary vocabulary is separate.
* UI rating buttons are Again and Good.
* Store authenticated reviews according to the existing database implementation.
* Web Speech API ja-JP is used for pronunciation.

DESIGN

Follow the PRD design system:

* playful game-like learning experience
* dark glassmorphism
* indigo/pink gradient accents
* strong category differentiation
* readable Japanese typography
* subtle micro-interactions
* responsive layout
* accessible contrast
* visible focus states
* keyboard-friendly interaction

CODE QUALITY

* Strict TypeScript.
* Avoid any unless unavoidable.
* Centralize database types.
* Prefer Server Components where appropriate.
* Use Client Components only when interactivity/browser APIs require them.
* Separate UI components from domain/business logic.
* Avoid giant components.
* Handle loading, empty and error states.
* Do not silently swallow Supabase errors.
* No secrets committed to Git.

WORKFLOW FOR EVERY FEATURE

Before editing:

1. Read relevant PRD section.
2. Inspect relevant existing code.
3. Inspect database types/schema if data is involved.
4. Write a short implementation plan.

After editing:

1. Run lint.
2. Run TypeScript checks.
3. Run tests if available.
4. Run production build.
5. Test the feature in the browser.
6. Test responsive desktop/mobile behavior.
7. Check console errors.
8. Report files changed.
9. Report assumptions.
10. Report unresolved issues.

Do not implement unrelated features while working on a specific task.

If the PRD conflicts with the live database, stop that portion of implementation and clearly document the conflict instead of inventing a workaround.
