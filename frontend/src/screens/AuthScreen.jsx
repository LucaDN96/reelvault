import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useLang } from '../contexts/LanguageContext.jsx';
import { SUPPORTED_LANGUAGES } from '../i18n/index.js';

export default function AuthScreen() {
  const { signIn }  = useAuth();
  const { lang, changeLang, t } = useLang();
  const [searchParams] = useSearchParams();
  const nextUrl = searchParams.get('next') || '/app';
  const [email, setEmail]       = useState('');
  const [sent, setSent]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');

    const redirectTo = `${window.location.origin}${nextUrl}`;
    const { error: err } = await signIn(email.trim(), redirectTo);
    if (err) {
      setError(err.message || t('error_generic'));
    } else {
      setSent(true);
    }
    setLoading(false);
  }

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

        {sent ? (
          <div className="auth-sent">
            <div className="auth-sent-icon">📬</div>
            <p>{t('auth_check_email')}</p>
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
            {error && <p className="auth-error">{error}</p>}
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? t('auth_sending') : t('auth_send_magic_link')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
