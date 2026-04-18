import { useNavigate, useLocation } from 'react-router-dom';
import { useLang } from '../contexts/LanguageContext.jsx';
import { SUPPORTED_LANGUAGES } from '../i18n/index.js';

export default function Header({
  showBack = false,
  showSettings = true,
  // Library passes these to put the search in the header center
  search,
  onSearchChange,
  scrolled = false,
}) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { lang, changeLang, t } = useLang();

  const isSettings = location.pathname === '/app/settings';
  const hasSearch  = onSearchChange !== undefined;

  return (
    <header className={`header ${scrolled ? 'header-scrolled' : ''}`}>
      {/* Left */}
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

      {/* Center — search pill (only on library) */}
      {hasSearch && (
        <div className="header-search">
          <span className="header-search-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
          </span>
          <input
            type="search"
            className="header-search-input"
            placeholder={t('search_placeholder')}
            value={search}
            onChange={e => onSearchChange(e.target.value)}
          />
        </div>
      )}

      {/* Right — lang switcher + gear are desktop-only; bottom nav handles them on mobile */}
      <div className="header-right">
        <div className="lang-switcher header-desktop-only">
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
          <button className="icon-btn header-desktop-only" onClick={() => navigate('/app/settings')} aria-label="Settings">
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
