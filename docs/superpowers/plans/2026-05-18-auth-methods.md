# Auth Methods Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Email+Password, Google OAuth, and Apple Sign In to ReelVault alongside the existing magic-link flow, using Supabase Auth exclusively on the frontend.

**Architecture:** `AuthContext` gains four new Supabase method wrappers; `AuthScreen` becomes a thin tab shell delegating to `AuthSignInForm` and `AuthSignUpForm`; two new screens (`ForgotPasswordScreen`, `ResetPasswordScreen`) handle the password-reset flow via two new public routes.

**Tech Stack:** React 18, Vite, Supabase JS client (`@supabase/supabase-js`), React Router v6, existing i18n system (`frontend/src/i18n/en.js` / `it.js`), plain CSS (`frontend/src/App.css`).

---

## File Map

| Action | File |
|---|---|
| Modify | `frontend/src/i18n/en.js` |
| Modify | `frontend/src/i18n/it.js` |
| Modify | `frontend/src/App.css` |
| Modify | `frontend/src/contexts/AuthContext.jsx` |
| Create | `frontend/src/components/AuthSignInForm.jsx` |
| Create | `frontend/src/components/AuthSignUpForm.jsx` |
| Modify | `frontend/src/screens/AuthScreen.jsx` |
| Create | `frontend/src/screens/ForgotPasswordScreen.jsx` |
| Create | `frontend/src/screens/ResetPasswordScreen.jsx` |
| Modify | `frontend/src/App.jsx` |

---

## Task 1: Add i18n keys

**Files:**
- Modify: `frontend/src/i18n/en.js`
- Modify: `frontend/src/i18n/it.js`

- [ ] **Step 1: Add new keys to `en.js`**

In `frontend/src/i18n/en.js`, replace the `// Auth` block (lines 2–7) with:

```js
  // Auth
  auth_tagline: 'Save any Instagram reel in 2 seconds. Organized by AI.',
  auth_email_placeholder: 'Enter your email',
  auth_send_magic_link: 'Send magic link',
  auth_check_email: 'Check your email for the login link.',
  auth_sending: 'Sending…',
  auth_sign_in: 'Sign in',
  auth_sign_up: 'Sign up',
  auth_create_account: 'Create account',
  auth_password_placeholder: 'Password',
  auth_forgot_password: 'Forgot password?',
  auth_magic_link_instead: 'Send magic link instead',
  auth_continue_google: 'Continue with Google',
  auth_continue_apple: 'Continue with Apple',
  auth_forgot_title: 'Reset your password',
  auth_forgot_instructions: 'Enter your email and we\'ll send a reset link.',
  auth_send_reset_link: 'Send reset link',
  auth_reset_check_email: 'Check your email for a password reset link.',
  auth_reset_title: 'Set new password',
  auth_new_password: 'New password',
  auth_confirm_password: 'Confirm new password',
  auth_set_password: 'Set new password',
  auth_back_to_signin: 'Back to sign in',
  error_invalid_credentials: 'Incorrect email or password.',
  error_email_taken: 'An account with this email already exists.',
  error_email_not_confirmed: 'Please verify your email before signing in.',
```

- [ ] **Step 2: Add new keys to `it.js`**

In `frontend/src/i18n/it.js`, replace the `// Auth` block (lines 2–7) with:

```js
  // Auth
  auth_tagline: 'Salva qualsiasi reel di Instagram in 2 secondi. Organizzato dall\'AI.',
  auth_email_placeholder: 'Inserisci la tua email',
  auth_send_magic_link: 'Invia il link magico',
  auth_check_email: 'Controlla la tua email per il link di accesso.',
  auth_sending: 'Invio in corso…',
  auth_sign_in: 'Accedi',
  auth_sign_up: 'Registrati',
  auth_create_account: 'Crea account',
  auth_password_placeholder: 'Password',
  auth_forgot_password: 'Password dimenticata?',
  auth_magic_link_instead: 'Invia il link magico invece',
  auth_continue_google: 'Continua con Google',
  auth_continue_apple: 'Continua con Apple',
  auth_forgot_title: 'Reimposta la password',
  auth_forgot_instructions: 'Inserisci la tua email e ti invieremo un link per reimpostare la password.',
  auth_send_reset_link: 'Invia link di reimpostazione',
  auth_reset_check_email: 'Controlla la tua email per il link di reimpostazione della password.',
  auth_reset_title: 'Imposta nuova password',
  auth_new_password: 'Nuova password',
  auth_confirm_password: 'Conferma nuova password',
  auth_set_password: 'Imposta nuova password',
  auth_back_to_signin: 'Torna all\'accesso',
  error_invalid_credentials: 'Email o password errati.',
  error_email_taken: 'Esiste già un account con questa email.',
  error_email_not_confirmed: 'Verifica la tua email prima di accedere.',
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/i18n/en.js frontend/src/i18n/it.js
git commit -m "feat: add auth i18n keys for password/OAuth/reset flows"
```

---

## Task 2: Add CSS classes

**Files:**
- Modify: `frontend/src/App.css`

- [ ] **Step 1: Add new auth CSS after the existing `.auth-sent p` rule**

In `frontend/src/App.css`, after the line `.auth-sent p { color: var(--text-muted); }` (currently line 336), add:

```css
.auth-tabs { display: flex; gap: 0; margin-bottom: 4px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 4px; }
.auth-tab { flex: 1; padding: 8px; border: none; background: transparent; color: var(--text-muted); font-size: 15px; font-weight: 500; border-radius: calc(var(--radius) - 2px); cursor: pointer; transition: background 0.15s, color 0.15s; }
.auth-tab.active { background: var(--purple); color: #fff; }
.auth-divider { display: flex; align-items: center; gap: 10px; color: var(--text-muted); font-size: 13px; }
.auth-divider::before, .auth-divider::after { content: ''; flex: 1; height: 1px; background: var(--border); }
.auth-oauth-btn { display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; padding: 11px 16px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); color: var(--text); font-size: 15px; font-weight: 500; cursor: pointer; transition: background 0.15s; }
.auth-oauth-btn:hover { background: var(--bg); }
.auth-oauth-btn svg { flex-shrink: 0; }
.auth-sub-links { display: flex; flex-direction: column; align-items: center; gap: 6px; margin-top: 4px; }
.auth-sub-links a, .auth-sub-links button { background: none; border: none; color: var(--text-muted); font-size: 14px; cursor: pointer; text-decoration: underline; padding: 0; }
.auth-back-link { display: inline-flex; align-items: center; gap: 6px; color: var(--text-muted); font-size: 14px; cursor: pointer; background: none; border: none; padding: 0; text-decoration: none; align-self: flex-start; }
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/App.css
git commit -m "feat: add auth CSS for tabs, OAuth buttons, divider, sub-links"
```

---

## Task 3: Extend AuthContext

**Files:**
- Modify: `frontend/src/contexts/AuthContext.jsx`

- [ ] **Step 1: Replace `AuthContext.jsx` with the extended version**

```jsx
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
```

- [ ] **Step 2: Verify the dev server compiles without errors**

```bash
cd frontend && npm run dev
```
Expected: Vite starts on port 5173 with no errors. Stop it with Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/contexts/AuthContext.jsx
git commit -m "feat: add signInWithPassword, signUpWithPassword, signInWithOAuth, resetPassword to AuthContext"
```

---

## Task 4: Create AuthSignInForm

**Files:**
- Create: `frontend/src/components/AuthSignInForm.jsx`

- [ ] **Step 1: Create the file**

```jsx
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useLang } from '../contexts/LanguageContext.jsx';

function mapError(message, t) {
  if (!message) return t('error_generic');
  if (message.includes('Invalid login credentials')) return t('error_invalid_credentials');
  if (message.includes('Email not confirmed')) return t('error_email_not_confirmed');
  return t('error_generic');
}

export default function AuthSignInForm() {
  const { signIn, signInWithPassword, signInWithOAuth } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextUrl = searchParams.get('next') || '/app';

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [magicSent, setMagicSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) return;
    if (password.length < 6) { setError(t('error_generic')); return; }
    setLoading(true);
    setError('');
    const { error: err } = await signInWithPassword(email.trim(), password);
    if (err) setError(mapError(err.message, t));
    setLoading(false);
  }

  async function handleMagicLink() {
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    const callbackPath = nextUrl !== '/app'
      ? `/auth/callback?next=${encodeURIComponent(nextUrl)}`
      : '/auth/callback';
    const redirectTo = `${window.location.origin}${callbackPath}`;
    const { error: err } = await signIn(email.trim(), redirectTo);
    if (err) setError(err.message || t('error_generic'));
    else setMagicSent(true);
    setLoading(false);
  }

  async function handleOAuth(provider) {
    const { error: err } = await signInWithOAuth(provider);
    if (err) setError(t('error_generic'));
  }

  if (magicSent) {
    return (
      <div className="auth-sent">
        <div className="auth-sent-icon">📬</div>
        <p>{t('auth_check_email')}</p>
      </div>
    );
  }

  return (
    <div className="auth-form">
      <button type="button" className="auth-oauth-btn" onClick={() => handleOAuth('google')}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
          <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
        </svg>
        {t('auth_continue_google')}
      </button>

      <button type="button" className="auth-oauth-btn" onClick={() => handleOAuth('apple')}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
          <path d="M12.27 0c.07.82-.24 1.63-.68 2.24-.47.64-1.22 1.14-1.97 1.08-.09-.77.27-1.58.72-2.12C10.8.56 11.59.07 12.27 0zm2.66 4.7c-.16.1-1.97 1.13-1.95 3.37.03 2.67 2.35 3.56 2.38 3.57-.03.09-.37 1.27-1.22 2.48-.73 1.06-1.5 2.1-2.68 2.12-1.15.02-1.53-.68-2.85-.68-1.32 0-1.74.66-2.84.7-1.14.04-2.01-1.12-2.75-2.17C1.43 12.04.5 9.36.93 6.77c.43-2.54 2.27-3.88 4.08-3.9 1.12-.02 2.18.74 2.87.74.69 0 1.97-.92 3.33-.78.57.02 2.17.23 3.19 1.73l.53.14z"/>
        </svg>
        {t('auth_continue_apple')}
      </button>

      <div className="auth-divider">{/* or */}or</div>

      <form onSubmit={handleSubmit} style={{ display: 'contents' }}>
        <input
          type="email"
          className="input"
          placeholder={t('auth_email_placeholder')}
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <input
          type="password"
          className="input"
          placeholder={t('auth_password_placeholder')}
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
        {error && <p className="auth-error">{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? t('auth_sending') : t('auth_sign_in')}
        </button>
      </form>

      <div className="auth-sub-links">
        <button type="button" onClick={() => navigate('/app/auth/forgot-password')}>
          {t('auth_forgot_password')}
        </button>
        <button type="button" onClick={handleMagicLink} disabled={loading}>
          {t('auth_magic_link_instead')}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify compilation**

```bash
cd frontend && npm run dev
```
Expected: no errors. Stop with Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/AuthSignInForm.jsx
git commit -m "feat: add AuthSignInForm with password, OAuth, and magic-link fallback"
```

---

## Task 5: Create AuthSignUpForm

**Files:**
- Create: `frontend/src/components/AuthSignUpForm.jsx`

- [ ] **Step 1: Create the file**

```jsx
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useLang } from '../contexts/LanguageContext.jsx';

function mapError(message, t) {
  if (!message) return t('error_generic');
  if (message.includes('User already registered')) return t('error_email_taken');
  return t('error_generic');
}

export default function AuthSignUpForm() {
  const { signUpWithPassword, signInWithOAuth } = useAuth();
  const { t } = useLang();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) return;
    if (password.length < 6) { setError(t('error_generic')); return; }
    setLoading(true);
    setError('');
    const { error: err } = await signUpWithPassword(email.trim(), password);
    if (err) setError(mapError(err.message, t));
    setLoading(false);
  }

  async function handleOAuth(provider) {
    const { error: err } = await signInWithOAuth(provider);
    if (err) setError(t('error_generic'));
  }

  return (
    <div className="auth-form">
      <button type="button" className="auth-oauth-btn" onClick={() => handleOAuth('google')}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
          <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
        </svg>
        {t('auth_continue_google')}
      </button>

      <button type="button" className="auth-oauth-btn" onClick={() => handleOAuth('apple')}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
          <path d="M12.27 0c.07.82-.24 1.63-.68 2.24-.47.64-1.22 1.14-1.97 1.08-.09-.77.27-1.58.72-2.12C10.8.56 11.59.07 12.27 0zm2.66 4.7c-.16.1-1.97 1.13-1.95 3.37.03 2.67 2.35 3.56 2.38 3.57-.03.09-.37 1.27-1.22 2.48-.73 1.06-1.5 2.1-2.68 2.12-1.15.02-1.53-.68-2.85-.68-1.32 0-1.74.66-2.84.7-1.14.04-2.01-1.12-2.75-2.17C1.43 12.04.5 9.36.93 6.77c.43-2.54 2.27-3.88 4.08-3.9 1.12-.02 2.18.74 2.87.74.69 0 1.97-.92 3.33-.78.57.02 2.17.23 3.19 1.73l.53.14z"/>
        </svg>
        {t('auth_continue_apple')}
      </button>

      <div className="auth-divider">or</div>

      <form onSubmit={handleSubmit} style={{ display: 'contents' }}>
        <input
          type="email"
          className="input"
          placeholder={t('auth_email_placeholder')}
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <input
          type="password"
          className="input"
          placeholder={t('auth_password_placeholder')}
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          autoComplete="new-password"
        />
        {error && <p className="auth-error">{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? t('auth_sending') : t('auth_create_account')}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Verify compilation**

```bash
cd frontend && npm run dev
```
Expected: no errors. Stop with Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/AuthSignUpForm.jsx
git commit -m "feat: add AuthSignUpForm with password and OAuth sign-up"
```

---

## Task 6: Refactor AuthScreen to tab shell

**Files:**
- Modify: `frontend/src/screens/AuthScreen.jsx`

- [ ] **Step 1: Replace `AuthScreen.jsx` entirely**

```jsx
import { useState } from 'react';
import { useLang } from '../contexts/LanguageContext.jsx';
import { SUPPORTED_LANGUAGES } from '../i18n/index.js';
import AuthSignInForm from '../components/AuthSignInForm.jsx';
import AuthSignUpForm from '../components/AuthSignUpForm.jsx';

export default function AuthScreen() {
  const { t, lang, changeLang } = useLang();
  const [activeTab, setActiveTab] = useState('signin');

  return (
    <div className="auth-screen">
      <div className="auth-lang-bar">
        {SUPPORTED_LANGUAGES.map(l => (
          <button
            key={l.code}
            className={`lang-btn ${lang === l.code ? 'active' : ''}`}
            onClick={() => changeLang(l.code, false)}
          >
            {l.label}
          </button>
        ))}
      </div>

      <div className="auth-card">
        <div className="auth-logo">ReelVault</div>
        <p className="auth-tagline">{t('auth_tagline')}</p>

        <div className="auth-tabs">
          <button
            className={`auth-tab ${activeTab === 'signin' ? 'active' : ''}`}
            onClick={() => setActiveTab('signin')}
          >
            {t('auth_sign_in')}
          </button>
          <button
            className={`auth-tab ${activeTab === 'signup' ? 'active' : ''}`}
            onClick={() => setActiveTab('signup')}
          >
            {t('auth_sign_up')}
          </button>
        </div>

        {activeTab === 'signin' ? <AuthSignInForm /> : <AuthSignUpForm />}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify in browser**

```bash
cd frontend && npm run dev
```
Open http://localhost:5173/app/auth — confirm: logo, tagline, "Sign in / Sign up" tab toggle, Google + Apple buttons, email + password fields, "Forgot password?" and "Send magic link instead" links. Switch to Sign up tab — confirm Google + Apple buttons + email + password + "Create account" button. Stop with Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/screens/AuthScreen.jsx
git commit -m "feat: refactor AuthScreen to tab shell with AuthSignInForm and AuthSignUpForm"
```

---

## Task 7: Create ForgotPasswordScreen

**Files:**
- Create: `frontend/src/screens/ForgotPasswordScreen.jsx`

- [ ] **Step 1: Create the file**

```jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useLang } from '../contexts/LanguageContext.jsx';

export default function ForgotPasswordScreen() {
  const { resetPassword } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();

  const [email, setEmail]   = useState('');
  const [sent, setSent]     = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    await resetPassword(email.trim()); // always show confirmation — prevents enumeration
    setSent(true);
    setLoading(false);
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <button className="auth-back-link" onClick={() => navigate('/app/auth')}>
          ← {t('auth_back_to_signin')}
        </button>

        <div className="auth-logo">ReelVault</div>
        <p className="auth-tagline">{t('auth_forgot_instructions')}</p>

        {sent ? (
          <div className="auth-sent">
            <div className="auth-sent-icon">📬</div>
            <p>{t('auth_reset_check_email')}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <input
              type="email"
              className="input"
              placeholder={t('auth_email_placeholder')}
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? t('auth_sending') : t('auth_send_reset_link')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/screens/ForgotPasswordScreen.jsx
git commit -m "feat: add ForgotPasswordScreen"
```

---

## Task 8: Create ResetPasswordScreen

**Files:**
- Create: `frontend/src/screens/ResetPasswordScreen.jsx`

- [ ] **Step 1: Create the file**

```jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase.js';
import { useLang } from '../contexts/LanguageContext.jsx';

export default function ResetPasswordScreen() {
  const { t } = useLang();
  const navigate = useNavigate();

  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password.length < 6) { setError(t('error_generic')); return; }
    if (password !== confirm) { setError(t('error_generic')); return; }
    setLoading(true);
    setError('');
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) {
      setError(t('error_generic'));
    } else {
      navigate('/app', { replace: true });
    }
    setLoading(false);
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-logo">ReelVault</div>
        <p className="auth-tagline">{t('auth_reset_title')}</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <input
            type="password"
            className="input"
            placeholder={t('auth_new_password')}
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            minLength={6}
          />
          <input
            type="password"
            className="input"
            placeholder={t('auth_confirm_password')}
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
          />
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? t('auth_sending') : t('auth_set_password')}
          </button>
        </form>

        {error && (
          <div className="auth-sub-links">
            <button type="button" onClick={() => navigate('/app/auth/forgot-password')}>
              {t('auth_back_to_signin')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/screens/ResetPasswordScreen.jsx
git commit -m "feat: add ResetPasswordScreen"
```

---

## Task 9: Register new routes in App.jsx

**Files:**
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Add imports**

In `frontend/src/App.jsx`, add two import lines after the `ConnectTelegramScreen` import (currently line 14):

```jsx
import ForgotPasswordScreen from './screens/ForgotPasswordScreen.jsx';
import ResetPasswordScreen  from './screens/ResetPasswordScreen.jsx';
```

- [ ] **Step 2: Add the two new routes**

In `AppRoutes`, after the `/app/auth` route:

```jsx
      <Route path="/app/auth/forgot-password" element={
        <PublicRoute><ForgotPasswordScreen /></PublicRoute>
      } />
      <Route path="/app/auth/reset-password" element={
        <PublicRoute><ResetPasswordScreen /></PublicRoute>
      } />
```

- [ ] **Step 3: Verify in browser**

```bash
cd frontend && npm run dev
```
- Open http://localhost:5173/app/auth — tabs visible, forms render.
- Open http://localhost:5173/app/auth/forgot-password — back link, email form render.
- Open http://localhost:5173/app/auth/reset-password — new password form renders.
Stop with Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.jsx
git commit -m "feat: register forgot-password and reset-password routes"
```

---

## Task 10: Supabase dashboard checklist (manual)

These steps must be done in the Supabase dashboard — they cannot be automated via code.

- [ ] **Authentication → Providers → Email:** Disable "Confirm email" (so sign-up grants immediate access)
- [ ] **Authentication → Providers → Google:** Enable, add Client ID and Client Secret from Google Cloud Console (OAuth 2.0 credential with redirect URI `https://<your-project>.supabase.co/auth/v1/callback`)
- [ ] **Authentication → Providers → Apple:** Enable, add Service ID, Key ID, and Private Key from Apple Developer account
- [ ] **Authentication → URL Configuration:** Ensure Site URL is set to your production frontend URL and Redirect URLs includes `http://localhost:5173/auth/callback` (dev) and `https://<your-domain>/auth/callback` (prod)

---

## Task 11: Final end-to-end verification

- [ ] **Email + password sign-up:** Go to `/app/auth` → Sign up tab → enter email + password → tap "Create account" → should land on `/app`
- [ ] **Email + password sign-in:** Sign out → Sign in tab → enter same credentials → should land on `/app`
- [ ] **Wrong password:** Enter wrong password → should see "Incorrect email or password."
- [ ] **Magic link fallback:** Sign in tab → enter email → click "Send magic link instead" → should show 📬 confirmation
- [ ] **Forgot password flow:** Click "Forgot password?" → enter email → submit → should see 📬 confirmation
- [ ] **Google OAuth (requires dashboard config):** Click "Continue with Google" → OAuth popup → should land on `/app`
- [ ] **Apple OAuth (requires dashboard config):** Click "Continue with Apple" → OAuth popup → should land on `/app`
- [ ] **Language toggle:** Switch to IT on auth screen → all strings update to Italian
