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

      // After magic link callback, forward to the ?next= destination.
      // AuthCallback is the fallback for the case where there is no ?next=.
      if (event === 'SIGNED_IN') {
        const params = new URLSearchParams(window.location.search);
        const next = params.get('next');
        if (next) navigate(next, { replace: true });
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

  async function signIn(email, redirectTo) {
    return supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo || `${window.location.origin}/app` }
    });
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ session, profile, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
