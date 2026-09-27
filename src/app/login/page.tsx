import { LockKeyhole, UserRound, LogIn } from 'lucide-react';
import { loginAction } from './actions';

export const metadata = {
  title: 'Login — 日本語特訓 N2',
};

type LoginPageProps = {
  searchParams: Promise<{ error?: string; next?: string }>;
};

const ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: 'Username/email atau password tidak cocok.',
  profile_not_linked: 'Akun Supabase ini belum terhubung ke profil 日本語特訓.',
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const errorMessage = params.error ? ERROR_MESSAGES[params.error] : null;
  const next = params.next && params.next.startsWith('/') && !params.next.startsWith('//')
    ? params.next
    : '/';

  return (
    <main className="login-screen">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-brand">
          <div className="login-brand-mark">語</div>
          <div>
            <p className="eyebrow">日本語特訓 · JLPT N2</p>
            <h1 id="login-title">Masuk ke akun</h1>
            <p className="muted">Progress, history, dan FSRS akan mengikuti profil Supabase milikmu.</p>
          </div>
        </div>

        {errorMessage && (
          <div className="login-error" role="alert">{errorMessage}</div>
        )}

        <form action={loginAction} className="login-form">
          <input type="hidden" name="next" value={next} />

          <label className="login-field">
            <span>Username atau Email</span>
            <span className="login-input-wrap">
              <UserRound size={18} aria-hidden="true" />
              <input
                name="identifier"
                type="text"
                autoComplete="username"
                placeholder="juniaditya atau email"
                required
                autoFocus
              />
            </span>
          </label>

          <label className="login-field">
            <span>Password</span>
            <span className="login-input-wrap">
              <LockKeyhole size={18} aria-hidden="true" />
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Masukkan password"
                required
              />
            </span>
          </label>

          <button className="login-submit" type="submit">
            <LogIn size={18} aria-hidden="true" />
            Masuk
          </button>
        </form>

        <p className="login-footnote">
          Login menggunakan Supabase Auth. Secret key tetap hanya berada di server.
        </p>
      </section>
    </main>
  );
}
