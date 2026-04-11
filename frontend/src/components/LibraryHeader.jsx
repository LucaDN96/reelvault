import { useState } from 'react';
import { useLang } from '../contexts/LanguageContext.jsx';
import { SUPPORTED_LANGUAGES } from '../i18n/index.js';

export default function LibraryHeader({ reelCount, search, onSearchChange, scrolled }) {
  const { lang, changeLang, t } = useLang();
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
              <button className="lib-search-icon-btn" onClick={openSearch} aria-label="Search">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
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
