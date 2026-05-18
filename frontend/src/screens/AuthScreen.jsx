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
