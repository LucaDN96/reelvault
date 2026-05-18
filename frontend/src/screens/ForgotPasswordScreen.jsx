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
