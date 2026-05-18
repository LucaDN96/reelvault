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
    if (password.length < 6) { setError(t('error_password_too_short')); return; }
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
