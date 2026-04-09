import { useNavigate, useLocation } from 'react-router-dom';
import { useLang } from '../contexts/LanguageContext.jsx';
import { SUPPORTED_LANGUAGES } from '../i18n/index.js';

export default function Header({ showBack, showSettings = true }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { lang, changeLang } = useLang();

  const isSettings = location.pathname === '/app/settings';

  return (
    <header className="header">
      <div className="header-left">
        {showBack ? (
          <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Back">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
        ) : (
          <span className="logo" onClick={() => navigate('/app')}>ReelVault</span>
        )}
      </div>

      <div className="header-right">
        <div className="lang-switcher">
          {SUPPORTED_LANGUAGES.map(l => (
            <button
              key={l.code}
              className={`lang-btn ${lang === l.code ? 'active' : ''}`}
              onClick={() => changeLang(l.code)}
            >
              {l.label}
            </button>
          ))}
        </div>

        {showSettings && !isSettings && (
          <button className="icon-btn" onClick={() => navigate('/app/settings')} aria-label="Settings">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
          </button>
        )}
      </div>
    </header>
  );
}
