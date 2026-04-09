import { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useLang } from '../contexts/LanguageContext.jsx';
import { api } from '../services/api.js';
import { SUPPORTED_LANGUAGES } from '../i18n/index.js';
import Header from '../components/Header.jsx';

const BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'ReelVault_official_bot';

export default function SettingsScreen() {
  const { profile, signOut, refreshProfile } = useAuth();
  const { lang, changeLang, t } = useLang();

  const [checkingTelegram, setCheckingTelegram] = useState(false);
  const [telegramStatus,   setTelegramStatus]   = useState(null); // null | 'connected' | 'not_connected'
  const [exportCategory,   setExportCategory]   = useState('');
  const [importResult,     setImportResult]     = useState(null);
  const [loading,          setLoading]          = useState({});
  const fileRef = useRef(null);

  function setLoad(key, val) { setLoading(prev => ({ ...prev, [key]: val })); }

  // ── Stripe ──────────────────────────────────────────────────────────────────
  async function handleUpgrade() {
    setLoad('upgrade', true);
    try {
      const { url } = await api.stripe.createCheckout();
      window.location.href = url;
    } catch { setLoad('upgrade', false); }
  }

  async function handleManageSub() {
    setLoad('portal', true);
    try {
      const { url } = await api.stripe.createPortal();
      window.location.href = url;
    } catch { setLoad('portal', false); }
  }

  // ── Telegram check ──────────────────────────────────────────────────────────
  async function handleCheckTelegram() {
    setCheckingTelegram(true);
    await refreshProfile();
    setCheckingTelegram(false);
    setTelegramStatus(profile?.telegram_linked ? 'connected' : 'not_connected');
  }

  async function handleUnlink() {
    if (!confirm(t('telegram_unlink_confirm'))) return;
    // Unlink is done via the bot (/unlink) — inform the user
    alert('To unlink, send /unlink to @' + BOT_USERNAME + ' on Telegram.');
  }

  // ── Export ──────────────────────────────────────────────────────────────────
  async function handleExportAll() {
    setLoad('exportAll', true);
    try {
      const data = await api.export.all();
      downloadJson(data, `reelvault-export-${today()}.json`);
    } catch (e) { alert(e.message); }
    setLoad('exportAll', false);
  }

  async function handleExportByCategory() {
    if (!exportCategory) return;
    setLoad('exportCat', true);
    try {
      const data = await api.export.byCategory(exportCategory);
      downloadJson(data, `reelvault-${exportCategory.toLowerCase()}-${today()}.json`);
    } catch (e) { alert(e.message); }
    setLoad('exportCat', false);
  }

  // ── Import ──────────────────────────────────────────────────────────────────
  async function handleImportFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setLoad('import', true);
    setImportResult(null);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const result = await api.import.fromJson(json);
      setImportResult(result);
    } catch (e) { alert(e.message); }
    setLoad('import', false);
    e.target.value = '';
  }

  function today() { return new Date().toISOString().slice(0, 10); }
  function downloadJson(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  const isPro     = profile?.plan === 'pro';
  const reelCount = 0; // Shown in plan badge; full count would require an extra query

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
              <button className="btn btn-ghost mt-8" onClick={handleUnlink}>{t('telegram_unlink')}</button>
            </div>
          ) : (
            <div className="telegram-onboarding">
              {[1, 2, 3, 4].map(step => (
                <div key={step} className="tg-step">
                  <span className="tg-step-num">{step}</span>
                  <span className="tg-step-text">
                    {step === 1
                      ? <a href={`https://t.me/${BOT_USERNAME}`} target="_blank" rel="noopener noreferrer">{t('telegram_step1', { botUsername: BOT_USERNAME })}</a>
                      : t(`telegram_step${step}`)
                    }
                  </span>
                </div>
              ))}
              <button className="btn btn-ghost mt-12" onClick={handleCheckTelegram} disabled={checkingTelegram}>
                {checkingTelegram ? t('telegram_checking') : t('telegram_check')}
              </button>
              {telegramStatus === 'connected' && <p className="success-text">{t('telegram_connected')}</p>}
              {telegramStatus === 'not_connected' && <p className="hint-text">Not connected yet. Follow the steps above.</p>}
            </div>
          )}
        </section>

        {/* ── Data ─────────────────────────────────────────────────────────── */}
        <section className="settings-section">
          <h2 className="settings-section-title">{t('data_section')}</h2>

          {/* Export full */}
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

          {/* Export by category */}
          <div className="data-row">
            {isPro ? (
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
            ) : null}
          </div>

          {/* Import */}
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
