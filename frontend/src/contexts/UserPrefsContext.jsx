import { createContext, useContext, useState, useEffect } from 'react';

export const FIXED_CATEGORIES = ['Cooking','Design','Music','Travel','Sport','Humor','Fashion','Tech','Other'];

function readTheme() {
  const saved = localStorage.getItem('reelvault-theme');
  if (saved === 'dark' || saved === 'light') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readHiddenCats() {
  try { return JSON.parse(localStorage.getItem('reelvault-hidden-cats') || '[]'); }
  catch { return []; }
}

const Context = createContext(null);

export function UserPrefsProvider({ children }) {
  const [theme,      setThemeState] = useState(readTheme);
  const [hiddenCats, setHiddenCats] = useState(readHiddenCats);

  // Keep <html data-theme> in sync whenever theme state changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('reelvault-theme', next);
    setThemeState(next);
  }

  function toggleHiddenCat(cat) {
    setHiddenCats(prev => {
      const next = prev.includes(cat)
        ? prev.filter(c => c !== cat)
        : [...prev, cat];
      localStorage.setItem('reelvault-hidden-cats', JSON.stringify(next));
      return next;
    });
  }

  return (
    <Context.Provider value={{ theme, toggleTheme, hiddenCats, toggleHiddenCat }}>
      {children}
    </Context.Provider>
  );
}

export const useUserPrefs = () => useContext(Context);
