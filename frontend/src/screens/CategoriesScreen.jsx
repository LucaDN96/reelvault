import { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { useLang } from '../contexts/LanguageContext.jsx';
import { useUserPrefs, FIXED_CATEGORIES } from '../contexts/UserPrefsContext.jsx';
import Header from '../components/Header.jsx';

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  );
}
function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

export default function CategoriesScreen() {
  const { t } = useLang();
  const { hiddenCats, toggleHiddenCat } = useUserPrefs();

  const [customCategories, setCustomCategories] = useState([]);
  const [newCatMode,       setNewCatMode]        = useState(false);
  const [newCatName,       setNewCatName]        = useState('');
  const [loading,          setLoading]           = useState({});

  useEffect(() => {
    api.categories.list().then(data => setCustomCategories(data.custom || []));
  }, []);

  function setLoad(key, val) { setLoading(prev => ({ ...prev, [key]: val })); }

  async function handleAddCategory() {
    if (!newCatName.trim()) return;
    setLoad('add', true);
    try {
      const created = await api.categories.create(newCatName.trim());
      setCustomCategories(prev => [...prev, created]);
      setNewCatName('');
      setNewCatMode(false);
    } catch (e) { alert(e.message); }
    setLoad('add', false);
  }

  async function handleDeleteCategory(id) {
    if (!confirm('Delete this category?')) return;
    await api.categories.delete(id);
    setCustomCategories(prev => prev.filter(c => c.id !== id));
  }

  return (
    <div className="screen">
      <Header showBack showSettings={false} />

      <div className="settings-content">
        <h1 className="settings-title">{t('categories_title')}</h1>

        {/* Fixed categories — hide/show in filter bar */}
        <section className="settings-section">
          <h2 className="settings-section-title">{t('fixed_categories_section')}</h2>
          <p className="hint-text">{t('categories_hint')}</p>
          <div className="cat-toggle-list" style={{ marginTop: 8 }}>
            {FIXED_CATEGORIES.map(cat => (
              <div key={cat} className="cat-toggle-row">
                <span className="cat-toggle-name">{cat}</span>
                <button
                  className={`eye-btn ${hiddenCats.includes(cat) ? 'eye-hidden' : ''}`}
                  onClick={() => toggleHiddenCat(cat)}
                  title={hiddenCats.includes(cat) ? 'Show in filter bar' : 'Hide from filter bar'}
                >
                  {hiddenCats.includes(cat) ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Custom categories */}
        <section className="settings-section">
          <h2 className="settings-section-title">{t('custom_categories_section')}</h2>

          {customCategories.length > 0 && (
            <div className="cat-toggle-list" style={{ marginBottom: 10 }}>
              {customCategories.map(cat => (
                <div key={cat.id} className="cat-toggle-row">
                  <span className="cat-toggle-name">{cat.name}</span>
                  <button
                    className="eye-btn"
                    style={{ color: 'var(--danger)' }}
                    onClick={() => handleDeleteCategory(cat.id)}
                    title="Delete category"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {newCatMode ? (
            <div className="new-cat-row">
              <input
                className="input"
                placeholder={t('new_category_placeholder')}
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                autoFocus
              />
              <button className="btn btn-primary btn-sm" onClick={handleAddCategory} disabled={loading.add}>
                {loading.add ? '…' : t('category_add')}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setNewCatMode(false); setNewCatName(''); }}>
                ✕
              </button>
            </div>
          ) : (
            <button className="btn btn-ghost btn-sm" onClick={() => setNewCatMode(true)}>
              + {t('new_category')}
            </button>
          )}
        </section>
      </div>
    </div>
  );
}
