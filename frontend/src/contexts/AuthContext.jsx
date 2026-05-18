import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [session,  setSession]  = useState(undefined); // undefined = loading
  const [profile,  setProfile]  = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadProfile(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (session) loadProfile(session.user.id);
      else setProfile(null);

      if (event === 'SIGNED_IN') {
        const params = new URLSearchParams(window.location.search);
        const next = params.get('next');
        if (next) navigate(next, { replace: true });
      }

      if (event === 'PASSWORD_RECOVERY') {
        navigate('/app/auth/reset-password', { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(userId) {
    const { data } = await supabase.from('users').select('*').eq('id', userId).single();
    setProfile(data);
  }

  async function refreshProfile() {
    if (!session) return;
    await loadProfile(session.user.id);
  }

  // Magic link (existing)
  async function signIn(email, redirectTo) {
    return supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo || `${window.location.origin}/app` }
    });
  }

  async function signInWithPassword(email, password) {
    return supabase.auth.signInWithPassword({ email, password });
  }

  async function signUpWithPassword(email, password) {
    return supabase.auth.signUp({ email, password });
  }

  async function signInWithOAuth(provider) {
    return supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    });
  }

  async function resetPassword(email) {
    return supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/app/auth/reset-password`
    });
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ session, profile, signIn, signInWithPassword, signUpWithPassword, signInWithOAuth, resetPassword, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
