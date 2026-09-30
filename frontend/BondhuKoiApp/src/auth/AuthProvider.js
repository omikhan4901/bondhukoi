import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { api, ApiError } from '../lib/api';
import { config } from '../lib/config';
import { demoSession } from '../lib/demo';
import { queryClient } from '../lib/queries';

const AuthContext = createContext(null);

/** Turns Supabase Auth's messages into plain words. */
function explain(error) {
  const m = (error?.message || '').toLowerCase();
  if (m.includes('invalid login credentials')) return 'That email and password don’t match.';
  if (m.includes('email not confirmed')) return 'Confirm your email first: enter the code we sent you.';
  if (m.includes('token has expired') || m.includes('otp') || m.includes('invalid token')) return 'That code is wrong or has expired. Ask for a new one.';
  if (m.includes('rate limit') || m.includes('too many')) return 'Too many tries. Wait a minute and try again.';
  if (m.includes('password should') || m.includes('weak')) return 'Use at least 10 characters, with letters and numbers.';
  if (m.includes('already registered')) return 'That email already has an account. Sign in instead.';
  if (m.includes('database error')) return 'Sign-up isn’t available for this email right now.';
  if (m.includes('network') || m.includes('fetch')) return 'You’re offline. Check your connection and try again.';
  return error?.message || 'Something went wrong. Please try again.';
}

const fail = (error) => {
  throw new ApiError(explain(error), { code: 'auth' });
};

export function AuthProvider({ children }) {
  const [session, setSession] = useState(config.demo && !config.demoSignedOut ? demoSession : null);
  const [ready, setReady] = useState(config.demo);

  useEffect(() => {
    if (config.demo) return undefined;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (!next) queryClient.clear();
    });
    return () => data.subscription.unsubscribe();
  }, []);

  /** Checks the email with the API first, so a refusal comes with a clear reason. */
  const signUp = useCallback(async ({ name, email, password, inviteCode }) => {
    const check = await api('/api/signup-check', { method: 'POST', body: { email, ...(inviteCode ? { inviteCode } : {}) } });
    if (!check.ok) throw new ApiError(check.message, { code: check.reason });
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name: name.trim(), ...(inviteCode ? { invite_code: inviteCode.trim().toUpperCase() } : {}) } },
    });
    if (error) fail(error);
    // Supabase answers an existing, confirmed email with a user that has no identities.
    if (data.user && data.user.identities?.length === 0) fail({ message: 'already registered' });
    return data;
  }, []);

  const verifySignUp = useCallback(async (email, token) => {
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'signup' });
    if (error) fail(error);
  }, []);

  const resendSignUp = useCallback(async (email) => {
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (error) fail(error);
  }, []);

  const signIn = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) fail(error);
  }, []);

  const sendReset = useCallback(async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) fail(error);
  }, []);

  const verifyReset = useCallback(async (email, token) => {
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'recovery' });
    if (error) fail(error);
  }, []);

  const setPassword = useCallback(async (password) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) fail(error);
  }, []);

  const signOut = useCallback(async () => {
    if (config.demo) return;
    await supabase.auth.signOut();
    queryClient.clear();
  }, []);

  const value = useMemo(
    () => ({ session, ready, signedIn: Boolean(session), signUp, verifySignUp, resendSignUp, signIn, sendReset, verifyReset, setPassword, signOut }),
    [session, ready, signUp, verifySignUp, resendSignUp, signIn, sendReset, verifyReset, setPassword, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
