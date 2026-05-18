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
