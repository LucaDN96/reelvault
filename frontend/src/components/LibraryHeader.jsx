import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../contexts/LanguageContext.jsx';
import { SUPPORTED_LANGUAGES } from '../i18n/index.js';

export default function LibraryHeader({ reelCount, search, onSearchChange, scrolled }) {
  const { lang, changeLang, t } = useLang();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);

  function openSearch() { setSearchOpen(true); }
  function closeSearch() { setSearchOpen(false); onSearchChange(''); }

  return (
    <header className={`lib-header ${scrolled ? 'lib-header-scrolled' : ''}`}>
      {searchOpen ? (
        <div className="lib-search-bar">
          <button className="lib-search-back" onClick={closeSearch} aria-label="Close search">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <input
            className="lib-search-input"
            type="search"
            placeholder={t('search_placeholder')}
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            autoFocus
          />
          {search && (
            <button className="lib-search-clear" onClick={() => onSearchChange('')} aria-label="Clear">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="lib-header-top">
            <span className="lib-logo">ReelVault</span>
            <div className="lib-header-actions">
              {/* Lang switcher — desktop only */}
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
              {/* Search icon — always visible */}
              <button className="lib-search-icon-btn" onClick={openSearch} aria-label="Search">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                </svg>
              </button>
              {/* Settings gear — desktop only (on mobile it's in the bottom nav) */}
              <button className="lib-search-icon-btn header-desktop-only" onClick={() => navigate('/app/settings')} aria-label="Settings">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
                </svg>
              </button>
            </div>
          </div>
          <div className="lib-subtitle">
            <span className="lib-count">{t('saved_count', { count: reelCount })}</span>
            <span className="lib-ai-badge">✦ {t('ai_active')}</span>
          </div>
        </>
      )}
    </header>
  );
}
