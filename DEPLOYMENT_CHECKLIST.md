# Production Deployment Checklist

## 1. Local auth/build gate

This release uses Supabase Auth with cookie-based SSR. It no longer uses `APP_USERNAME` or `APP_DISPLAY_NAME`.

Install/update the auth dependency and lockfile once:

```powershell
npm.cmd install @supabase/ssr@0.12.7
```

Create `.env.local` from `.env.example` and fill these values:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
ENABLE_PERSONAL_WRITES=true
```

Never commit `.env.local` or the secret key.

Run:

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run dev
```

Smoke test:
- unauthenticated `/` redirects to `/login`
- login accepts username or email + existing Supabase password
- successful login opens the app
- logout returns to `/login`
- Dashboard and Course read the authenticated user's history
- quiz/flashcard writes still persist to Supabase

## 2. GitHub staging branch

Existing repository:

```text
juniaditya/Nihongo-Tokkun
```

Do not overwrite `main` until the auth-enabled build is verified.

From the local project, inspect Git first:

```powershell
git status
git remote -v
git branch --show-current
```

If `origin` is already the repository above:

```powershell
git switch -c nextjs-parity-auth
git add .
git commit -m "feat: migrate parity app to Supabase Auth"
git push -u origin nextjs-parity-auth
```

If the folder is not yet connected to that repository, configure the remote only after checking `git remote -v` to avoid overwriting another remote accidentally.

After the Vercel preview deployment passes smoke tests, merge the staging branch into `main`.

## 3. Vercel preview deployment

Import the GitHub repository into Vercel and deploy `nextjs-parity-auth` as a preview first.

Set these Vercel Environment Variables for Preview (and later Production):

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY
ENABLE_PERSONAL_WRITES=true
```

The secret key is server-only. Never name it `NEXT_PUBLIC_SUPABASE_SECRET_KEY`.

Verify login, Dashboard, Course, quiz, flashcards, Review Kotoba, logout, and direct-route refresh on the Vercel preview URL.

## 4. Production + custom domain

After preview passes:
- merge the staging branch to `main`
- set Vercel Production Branch to `main`
- deploy Production
- add the custom domain in Vercel Project Settings -> Domains
- apply the DNS records Vercel gives you at the domain registrar
- once HTTPS is active, set the final custom domain as the Supabase Auth Site URL and include it in Redirect URLs

Keep the Vercel preview URL in Supabase Redirect URLs while testing preview deployments if password recovery or OAuth is later enabled.
