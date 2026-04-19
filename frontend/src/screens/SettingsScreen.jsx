import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useLang } from '../contexts/LanguageContext.jsx';
import { useUserPrefs } from '../contexts/UserPrefsContext.jsx';
import { api } from '../services/api.js';
import { SUPPORTED_LANGUAGES } from '../i18n/index.js';
import Header from '../components/Header.jsx';

const BOT_USERNAME  = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'ReelVault_official_bot';
const BACKEND_URL   = import.meta.env.VITE_BACKEND_URL || 'https://reelvault-production.up.railway.app';

export default function SettingsScreen() {
  const { profile, signOut, refreshProfile } = useAuth();
  const { lang, changeLang, t }              = useLang();
  const { theme, toggleTheme } = useUserPrefs();

  const [checkingTelegram, setCheckingTelegram] = useState(false);
  const [exportCategory,   setExportCategory]   = useState('');
  const [importResult,     setImportResult]      = useState(null);
  const [loading,          setLoading]           = useState({});
  const [shortcutToken,    setShortcutToken]     = useState(null);
  const [tokenVisible,     setTokenVisible]      = useState(false);
  const [tokenCopied,      setTokenCopied]       = useState(false);
  const [refreshResult,    setRefreshResult]     = useState(null);

  const fileRef = useRef(null);

  useEffect(() => {
    api.shortcuts.getToken()
      .then(({ token }) => setShortcutToken(token))
      .catch(() => {}); // non-critical — fail silently
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

  // ── Refresh thumbnails ───────────────────────────────────────────────────
  async function handleRefreshThumbnails() {
    setLoad('refresh', true);
    setRefreshResult(null);
    try {
      const result = await api.reels.refreshAll();
      setRefreshResult(result);
    } catch (e) { alert(e.message); }
    setLoad('refresh', false);
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

  async function handleCopyToken() {
    if (!shortcutToken) return;
    try {
      await navigator.clipboard.writeText(shortcutToken);
      setTokenCopied(true);
      setTimeout(() => setTokenCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
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

        {/* ── iOS Shortcut ─────────────────────────────────────────────────── */}
        <section className="settings-section">
          <h2 className="settings-section-title">{t('ios_shortcut_section')}</h2>
          <p className="hint-text">{t('ios_shortcut_tagline')}</p>

          {/* Steps */}
          <div className="shortcut-steps">
            <div className="shortcut-step">
              <span className="shortcut-step-num">1</span>
              <span className="shortcut-step-text">{t('ios_shortcut_step1')}</span>
            </div>
            <div className="shortcut-step">
              <span className="shortcut-step-num">2</span>
              <span className="shortcut-step-text">{t('ios_shortcut_step2')}</span>
            </div>
            <div className="shortcut-step">
              <span className="shortcut-step-num">3</span>
              <span className="shortcut-step-text">{t('ios_shortcut_step3')}</span>
            </div>
          </div>

          {/* Token field */}
          <div style={{ marginTop: 4 }}>
            <span className="settings-label" style={{ display: 'block', marginBottom: 6 }}>{t('ios_shortcut_token_label')}</span>
            <div className="shortcut-token-row">
              <code className="shortcut-token-value">
                {shortcutToken
                  ? (tokenVisible ? shortcutToken : '•'.repeat(shortcutToken.length))
                  : '—'}
              </code>
              <button
                className="icon-btn"
                onClick={() => setTokenVisible(v => !v)}
                aria-label={tokenVisible ? 'Hide token' : 'Show token'}
                disabled={!shortcutToken}
              >
                {tokenVisible
                  ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                }
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={handleCopyToken}
                disabled={!shortcutToken}
              >
                {tokenCopied ? t('ios_shortcut_copied') : t('ios_shortcut_copy')}
              </button>
            </div>
          </div>

          {/* Install button */}
          <a
            href={shortcutToken ? `${BACKEND_URL}/shortcuts/download?token=${shortcutToken}` : '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={{ textDecoration: 'none', marginTop: 4, opacity: shortcutToken ? 1 : 0.5, pointerEvents: shortcutToken ? 'auto' : 'none' }}
          >
            {t('ios_shortcut_install')}
          </a>
          <p className="hint-text" style={{ marginTop: 6 }}>{t('ios_shortcut_install_hint')}</p>
        </section>

        {/* ── Data ─────────────────────────────────────────────────────────── */}
        <section className="settings-section">
          <h2 className="settings-section-title">{t('data_section')}</h2>

          {/* Refresh thumbnails */}
          <div className="data-row">
            <div>
              <button className="btn btn-ghost" onClick={handleRefreshThumbnails} disabled={loading.refresh}>
                {loading.refresh ? t('refreshing') : t('refresh_thumbnails')}
              </button>
              <p className="hint-text" style={{ marginTop: 4 }}>{t('refresh_thumbnails_hint')}</p>
              {refreshResult && (
                <p className="success-text">
                  {refreshResult.total === 0
                    ? t('refresh_thumbnails_none')
                    : t('refresh_thumbnails_result', { count: refreshResult.refreshed, total: refreshResult.total })}
                </p>
              )}
            </div>
          </div>

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
