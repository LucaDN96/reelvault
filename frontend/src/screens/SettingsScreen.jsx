import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useLang } from '../contexts/LanguageContext.jsx';
import { useUserPrefs, FIXED_CATEGORIES } from '../contexts/UserPrefsContext.jsx';
import { api } from '../services/api.js';
import { SUPPORTED_LANGUAGES } from '../i18n/index.js';
import Header from '../components/Header.jsx';

const BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'ReelVault_official_bot';

// Eye / Eye-off icons
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

export default function SettingsScreen() {
  const { profile, signOut, refreshProfile } = useAuth();
  const { lang, changeLang, t }              = useLang();
  const { theme, toggleTheme, hiddenCats, toggleHiddenCat } = useUserPrefs();

  const [checkingTelegram, setCheckingTelegram] = useState(false);
  const [exportCategory,   setExportCategory]   = useState('');
  const [importResult,     setImportResult]      = useState(null);
  const [loading,          setLoading]           = useState({});

  // Categories section state
  const [customCategories, setCustomCategories] = useState([]);
  const [newCatMode,       setNewCatMode]        = useState(false);
  const [newCatName,       setNewCatName]        = useState('');

  const fileRef = useRef(null);

  useEffect(() => {
    api.categories.list().then(data => setCustomCategories(data.custom || []));
  }, []);

  function setLoad(key, val) { setLoading(prev => ({ ...prev, [key]: val })); }

  // ── Stripe ───────────────────────────────────────────────────────────────
  async function handleUpgrade() {
    setLoad('upgrade', true);
    try { const { url } = await api.stripe.createCheckout(); window.location.href = url; }
    catch { setLoad('upgrade', false); }
  }
  async function handleManageSub() {
    setLoad('portal', true);
    try { const { url } = await api.stripe.createPortal(); window.location.href = url; }
    catch { setLoad('portal', false); }
  }

  // ── Telegram ─────────────────────────────────────────────────────────────
  async function handleUnlink() {
    if (!confirm(t('telegram_unlink_confirm'))) return;
    setLoad('unlink', true);
    try { await api.telegram.unlink(); await refreshProfile(); }
    catch (e) { alert(e.message); }
    setLoad('unlink', false);
  }

  // ── Export ───────────────────────────────────────────────────────────────
  async function handleExportAll() {
    setLoad('exportAll', true);
    try { downloadJson(await api.export.all(), `reelvault-export-${today()}.json`); }
    catch (e) { alert(e.message); }
    setLoad('exportAll', false);
  }
  async function handleExportByCategory() {
    if (!exportCategory) return;
    setLoad('exportCat', true);
    try { downloadJson(await api.export.byCategory(exportCategory), `reelvault-${exportCategory.toLowerCase()}-${today()}.json`); }
    catch (e) { alert(e.message); }
    setLoad('exportCat', false);
  }

  // ── Import ───────────────────────────────────────────────────────────────
  async function handleImportFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setLoad('import', true);
    setImportResult(null);
    try {
      const result = await api.import.fromJson(JSON.parse(await file.text()));
      setImportResult(result);
    } catch (e) { alert(e.message); }
    setLoad('import', false);
    e.target.value = '';
  }

  // ── Custom categories ────────────────────────────────────────────────────
  async function handleAddCategory() {
    if (!newCatName.trim()) return;
    setLoad('addCat', true);
    try {
      const created = await api.categories.create(newCatName.trim());
      setCustomCategories(prev => [...prev, created]);
      setNewCatName('');
      setNewCatMode(false);
    } catch (e) { alert(e.message); }
    setLoad('addCat', false);
  }
  async function handleDeleteCategory(id) {
    if (!confirm('Delete this category?')) return;
    await api.categories.delete(id);
    setCustomCategories(prev => prev.filter(c => c.id !== id));
  }

  function today() { return new Date().toISOString().slice(0, 10); }
  function downloadJson(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  const isPro = profile?.plan === 'pro';

  return (
    <div className="screen">
      <Header showBack showSettings={false} />

      <div className="settings-content">
        <h1 className="settings-title">{t('settings_title')}</h1>

        {/* ── Account ──────────────────────────────────────────────────────── */}
        <section className="settings-section">
          <h2 className="settings-section-title">{t('account_section')}</h2>
          <div className="settings-row">
            <span className="settings-label">Email</span>
            <span className="settings-value">{profile?.email}</span>
          </div>
          <div className="settings-row">
            <span className="settings-label">Language</span>
            <div className="lang-switcher">
              {SUPPORTED_LANGUAGES.map(l => (
                <button key={l.code} className={`lang-btn ${lang === l.code ? 'active' : ''}`} onClick={() => changeLang(l.code)}>
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── Appearance ───────────────────────────────────────────────────── */}
        <section className="settings-section">
          <h2 className="settings-section-title">{t('appearance_section')}</h2>
          <div className="settings-row">
            <span className="settings-label">{t('dark_mode')}</span>
            <button className="theme-toggle" onClick={toggleTheme}>
              {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
            </button>
          </div>
        </section>

        {/* ── Categories ───────────────────────────────────────────────────── */}
        <section className="settings-section">
          <h2 className="settings-section-title">{t('categories_section')}</h2>
          <p className="hint-text">{t('categories_hint')}</p>

          {/* Fixed category visibility toggles */}
          <div className="cat-toggle-list">
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

          {/* Custom categories — Pro only */}
          <div style={{ marginTop: 8 }}>
            <div className="settings-section-title" style={{ marginBottom: 8 }}>Custom categories</div>
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

            {isPro ? (
              newCatMode ? (
                <div className="new-cat-row">
                  <input
                    className="input"
                    placeholder={t('new_category_placeholder')}
                    value={newCatName}
                    onChange={e => setNewCatName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                    autoFocus
                  />
                  <button className="btn btn-primary btn-sm" onClick={handleAddCategory} disabled={loading.addCat}>
                    {loading.addCat ? '…' : t('category_add')}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setNewCatMode(false); setNewCatName(''); }}>
                    ✕
                  </button>
                </div>
              ) : (
                <button className="btn btn-ghost btn-sm" onClick={() => setNewCatMode(true)}>
                  + {t('new_category')}
                </button>
              )
            ) : (
              <div className="pro-locked">
                <span className="lock-icon">🔒</span>
                <span>{t('custom_categories_pro_locked')}</span>
                <button className="btn btn-primary btn-sm" onClick={handleUpgrade}>{t('upgrade_prompt')}</button>
              </div>
            )}
          </div>
        </section>

        {/* ── Plan ─────────────────────────────────────────────────────────── */}
        <section className="settings-section">
          <h2 className="settings-section-title">{t('plan_section')}</h2>
          {isPro ? (
            <div>
              <div className="plan-badge plan-badge-pro">{t('plan_pro_badge')}</div>
              <button className="btn btn-ghost mt-12" onClick={handleManageSub} disabled={loading.portal}>
                {loading.portal ? t('loading') : t('manage_sub')}
              </button>
            </div>
          ) : (
            <div>
              <div className="plan-badge plan-badge-free">{t('plan_free_badge', { count: profile?.reel_count || 0 })}</div>
              <div className="progress-bar-wrap">
                <div className="progress-bar" style={{ width: `${Math.min(100, ((profile?.reel_count || 0) / 30) * 100)}%` }} />
              </div>
              <button className="btn btn-primary mt-12" onClick={handleUpgrade} disabled={loading.upgrade}>
                {loading.upgrade ? t('loading') : t('upgrade_btn')}
              </button>
            </div>
          )}
        </section>

        {/* ── Telegram ─────────────────────────────────────────────────────── */}
        <section className="settings-section">
          <h2 className="settings-section-title">{t('telegram_section')}</h2>
          {profile?.telegram_linked ? (
            <div>
              <div className="telegram-connected">{t('telegram_connected')} — {profile.email}</div>
              <button className="btn btn-ghost mt-8" onClick={handleUnlink} disabled={loading.unlink}>
                {loading.unlink ? t('loading') : t('telegram_unlink')}
              </button>
            </div>
          ) : (
            <div className="telegram-onboarding">
              <p className="hint-text" style={{ marginBottom: 12 }}>
                Open the bot on Telegram — it will send you a one-click connect link.
              </p>
              <a
                href={`https://t.me/${BOT_USERNAME}?start=connect`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{ textDecoration: 'none' }}
              >
                Open @{BOT_USERNAME}
              </a>
              <button className="btn btn-ghost mt-8" onClick={refreshProfile}>
                ↻ Check connection
              </button>
            </div>
          )}
        </section>

        {/* ── Data ─────────────────────────────────────────────────────────── */}
        <section className="settings-section">
          <h2 className="settings-section-title">{t('data_section')}</h2>
          <div className="data-row">
            {isPro ? (
              <button className="btn btn-ghost" onClick={handleExportAll} disabled={loading.exportAll}>
                {loading.exportAll ? t('loading') : t('export_library')}
              </button>
            ) : (
              <div className="pro-locked">
                <span className="lock-icon">🔒</span>
                <span>{t('export_pro_locked')}</span>
                <button className="btn btn-primary btn-sm" onClick={handleUpgrade}>{t('upgrade_prompt')}</button>
              </div>
            )}
          </div>
          {isPro && (
            <div className="data-row">
              <div className="export-cat-row">
                <select className="select select-sm" value={exportCategory} onChange={e => setExportCategory(e.target.value)}>
                  <option value="">{t('export_by_category')}</option>
                  {['Cooking','Design','Music','Travel','Sport','Humor','Fashion','Tech','Other'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <button className="btn btn-ghost btn-sm" onClick={handleExportByCategory} disabled={!exportCategory || loading.exportCat}>
                  {loading.exportCat ? t('loading') : t('export_btn')}
                </button>
              </div>
            </div>
          )}
          <div className="data-row">
            {isPro ? (
              <div>
                <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportFile} />
                <button className="btn btn-ghost" onClick={() => fileRef.current?.click()} disabled={loading.import}>
                  {loading.import ? t('loading') : t('import_json')}
                </button>
                {importResult && (
                  <p className="success-text">{t('import_success', { count: importResult.imported, skipped: importResult.skipped })}</p>
                )}
              </div>
            ) : (
              <div className="pro-locked">
                <span className="lock-icon">🔒</span>
                <span>{t('import_pro_locked')}</span>
              </div>
            )}
          </div>
        </section>

        {/* Logout */}
        <section className="settings-section">
          <button className="btn btn-danger" onClick={signOut}>{t('logout')}</button>
        </section>
      </div>
    </div>
  );
}
