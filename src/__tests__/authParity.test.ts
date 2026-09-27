import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..', '..');
const read = (path: string) => readFileSync(join(root, 'src', path), 'utf8');

describe('Supabase Auth production gate', () => {
  test('proxy protects app routes using getClaims', () => {
    const source = read('server/supabase/authProxy.ts');
    assert.match(source, /auth\.getClaims\(\)/);
    assert.match(source, /\/login/);
  });

  test('login supports username or email and password', () => {
    const source = read('app/login/actions.ts');
    assert.match(source, /username_normalized/);
    assert.match(source, /signInWithPassword/);
  });

  test('runtime identity no longer depends on APP_USERNAME', () => {
    const source = read('server/runtimeUser.ts');
    assert.doesNotMatch(source, /APP_USERNAME|APP_DISPLAY_NAME/);
    assert.match(source, /auth_user_id/);
  });

  test('quiz and flashcard writes derive username from authenticated runtime profile', () => {
    assert.match(read('app/api/quiz-attempt/route.ts'), /await getRuntimeUsername\(\)/);
    assert.match(read('app/api/flashcard-attempt/route.ts'), /await getRuntimeUsername\(\)/);
  });

  test('logout route signs out the Supabase session', () => {
    assert.match(read('app/auth/signout/route.ts'), /auth\.signOut\(\)/);
  });
});
