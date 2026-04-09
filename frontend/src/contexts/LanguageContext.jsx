import { createContext, useContext, useEffect, useState } from 'react';
import { t as translate } from '../i18n/index.js';
import { supabase } from '../services/supabase.js';
import { useAuth } from './AuthContext.jsx';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const { session } = useAuth();
  const [lang, setLang] = useState(() => localStorage.getItem('rv_lang') || 'en');

  // Sync language from user profile on login
  useEffect(() => {
    if (!session) return;
    supabase.from('users').select('language').eq('id', session.user.id).single()
      .then(({ data }) => { if (data?.language) changeLang(data.language, false); });
  }, [session?.user?.id]);

  function changeLang(code, persist = true) {
    setLang(code);
    localStorage.setItem('rv_lang', code);
    if (persist && session) {
      supabase.from('users').update({ language: code }).eq('id', session.user.id);
    }
  }

  const t = (key, vars) => translate(lang, key, vars);

  return (
    <LanguageContext.Provider value={{ lang, changeLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  return useContext(LanguageContext);
}
