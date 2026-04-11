import { useNavigate, useLocation } from 'react-router-dom';
import { useLang } from '../contexts/LanguageContext.jsx';

export default function BottomNav({ onAdd }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLang();

  const isLibrary    = location.pathname === '/app';
  const isCategories = location.pathname === '/app/categories';

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

      {/* Add */}
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
    </nav>
  );
}
