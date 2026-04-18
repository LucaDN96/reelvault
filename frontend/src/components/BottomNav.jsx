import { useNavigate, useLocation } from 'react-router-dom';
import { useLang } from '../contexts/LanguageContext.jsx';

export default function BottomNav({ onAdd }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { t }     = useLang();

  const isLibrary     = location.pathname === '/app';
  const isCollections = location.pathname.startsWith('/app/collections');
  const isCategories  = location.pathname === '/app/categories';
  const isSettings    = location.pathname === '/app/settings';

  return (
    <nav className="bottom-nav">
      {/* Library */}
      <button
        className={`bottom-nav-item ${isLibrary ? 'active' : ''}`}
        onClick={() => navigate('/app')}
      >
        <div className="bottom-nav-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1"/>
            <rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/>
            <rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
        </div>
        <span className="bottom-nav-label">{t('nav_library')}</span>
      </button>

      {/* Collections */}
      <button
        className={`bottom-nav-item ${isCollections ? 'active' : ''}`}
        onClick={() => navigate('/app/collections')}
      >
        <div className="bottom-nav-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 00-3-3.87"/>
            <path d="M16 3.13a4 4 0 010 7.75"/>
          </svg>
        </div>
        <span className="bottom-nav-label">{t('nav_collections')}</span>
      </button>

      {/* Add FAB — center */}
      <div className="bottom-nav-add">
        <button className="add-fab" onClick={onAdd} aria-label="Add reel">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </button>
      </div>

      {/* Categories */}
      <button
        className={`bottom-nav-item ${isCategories ? 'active' : ''}`}
        onClick={() => navigate('/app/categories')}
      >
        <div className="bottom-nav-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
            <line x1="7" y1="7" x2="7.01" y2="7"/>
          </svg>
        </div>
        <span className="bottom-nav-label">{t('nav_categories')}</span>
      </button>

      {/* Settings */}
      <button
        className={`bottom-nav-item ${isSettings ? 'active' : ''}`}
        onClick={() => navigate('/app/settings')}
      >
        <div className="bottom-nav-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
          </svg>
        </div>
        <span className="bottom-nav-label">{t('settings_title')}</span>
      </button>
    </nav>
  );
}
