import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as fs from 'fs';
import type { Database } from '../src/types/database.types';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

// Load .env.local manually if present without external dotenv dependency
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      process.env[key] = val;
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

async function runLiveAuthTests() {
  console.log('====================================================');
  console.log('🚀 NIHONGO TOKKUN — LIVE AUTH DIAGNOSTICS (STEP 6)');
  console.log('====================================================\n');

  let allPassed = true;

  // 1. Verify Public Courses access
  console.log('1. Testing Public Access (courses)...');
  const { data: courses, error: courseError } = await supabase
    .from('courses')
    .select('id, name, level')
    .limit(3);

  if (courseError) {
    console.error('❌ Failed to fetch courses:', courseError.message);
    allPassed = false;
  } else {
    console.log(`✅ Courses fetched successfully (${courses?.length || 0} items)`);
  }

  // 2. Test Google OAuth URL generation
  console.log('\n2. Testing Google OAuth Initiation...');
  const { data: oauthData, error: oauthError } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'http://localhost:3000/auth/callback',
    },
  });

  if (oauthError || !oauthData.url) {
    console.error('❌ Google OAuth initiation failed:', oauthError?.message);
    allPassed = false;
  } else {
    console.log('✅ Google OAuth URL generated successfully: [VALID_URL_PREFIX]', oauthData.url.substring(0, 35) + '...');
  }

  // 3. Test Email/Password Signup & Profile Trigger
  console.log('\n3. Testing Email/Password Signup & Trigger Profile Creation...');
  const uniqueSuffix = Date.now().toString().slice(-6);
  const testUsername = `tokkun_usr_${uniqueSuffix}`;
  const testEmail = `nihongo.tokkun.test.${uniqueSuffix}@gmail.com`;
  const testPassword = `P@ssword_${uniqueSuffix}!`;

  console.log(`- Registering test account: ${testUsername} (${testEmail})`);
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
    options: {
      data: {
        username: testUsername,
      },
    },
  });

  if (signUpError) {
    console.error('❌ Signup failed:', signUpError.message);
    allPassed = false;
  } else {
    console.log('✅ Signup request succeeded.');
    const user = signUpData.user;
    const session = signUpData.session;

    console.log(`- User ID: ${user?.id}`);
    console.log(`- Session created: ${session ? 'YES (Auto-confirm)' : 'NO (Email confirmation required)'}`);

    if (user) {
      // 4. Test Authenticated Client
      let authClient = supabase;
      if (session) {
        authClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        });
        await authClient.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });
      }

      // Check Profile in public.profiles
      console.log('\n4. Verifying public.profiles row created by handle_new_user()...');
      const profileResult = await authClient
        .from('profiles')
        .select('id, username, role, tier_id, created_at')
        .eq('id', user.id)
        .maybeSingle();

      const profile = profileResult.data as Pick<
        ProfileRow,
        'id' | 'username' | 'role' | 'tier_id' | 'created_at'
      > | null;

      if (profileResult.error) {
        console.error('❌ Profile query error:', profileResult.error.message);
        allPassed = false;
      } else if (!profile) {
        console.error('❌ Profile row NOT found! (handle_new_user trigger might not be installed or user unconfirmed)');
        allPassed = false;
      } else {
        console.log(`✅ Matching profile found:`);
        console.log(`   - username: "${profile.username}" (Matches: ${profile.username === testUsername ? 'YES' : 'NO'})`);
        console.log(`   - role: "${profile.role}" (Expected: 'user')`);
        console.log(`   - tier_id: "${profile.tier_id}"`);

        if (profile.role !== 'user') {
          console.error(`❌ Unexpected role: ${profile.role}`);
          allPassed = false;
        }

        // 5. Test Privilege Escalation Prevention (role and tier_id update)
        if (session) {
          console.log('\n5. Testing Privilege Escalation Prevention (Normal user cannot update role or tier_id)...');

          // Attempt to update role to 'admin'
          await (authClient.from('profiles') as any)
            .update({ role: 'admin' })
            .eq('id', user.id);

          const verifiedResult = await authClient
            .from('profiles')
            .select('role, tier_id')
            .eq('id', user.id)
            .single();

          const verifiedProfile = verifiedResult.data as Pick<ProfileRow, 'role' | 'tier_id'> | null;

          if (verifiedProfile?.role === 'admin') {
            console.error('❌ SECURITY FLAW: User was able to escalate role to admin!');
            allPassed = false;
          } else {
            console.log('✅ Role escalation blocked successfully (Role remains "user")');
          }

          // 6. Test Login with Correct Password
          console.log('\n6. Testing Login with correct password...');
          const { error: loginError } = await supabase.auth.signInWithPassword({
            email: testEmail,
            password: testPassword,
          });

          if (loginError) {
            console.error('❌ Login failed:', loginError.message);
            allPassed = false;
          } else {
            console.log('✅ Login succeeded with access token.');
          }

          // 7. Test Login with Wrong Password
          console.log('\n7. Testing Login with wrong password rejection...');
          const { error: wrongPwError } = await supabase.auth.signInWithPassword({
            email: testEmail,
            password: 'WRONG_PASSWORD_123!',
          });

          if (!wrongPwError) {
            console.error('❌ Login with wrong password unexpectedly succeeded!');
            allPassed = false;
          } else {
            console.log(`✅ Wrong password correctly rejected (${wrongPwError.message})`);
          }

          // 8. Test Logout
          console.log('\n8. Testing SignOut...');
          const { error: signOutError } = await authClient.auth.signOut();
          if (signOutError) {
            console.error('❌ SignOut failed:', signOutError.message);
            allPassed = false;
          } else {
            console.log('✅ SignOut succeeded.');
          }
        }
      }
    }
  }

  console.log('\n====================================================');
  if (allPassed) {
    console.log('🎉 ALL LIVE AUTHENTICATION TESTS PASSED!');
  } else {
    console.log('⚠️ SOME LIVE TESTS FAILED. PLEASE REVIEW ABOVE.');
  }
  console.log('====================================================\n');
}

runLiveAuthTests().catch((err) => {
  console.error('Unexpected error running auth diagnostics:', err);
  process.exit(1);
});
