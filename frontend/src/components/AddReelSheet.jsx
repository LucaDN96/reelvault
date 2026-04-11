import { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { useLang } from '../contexts/LanguageContext.jsx';

export default function AddReelSheet({ onClose, onSaved }) {
  const { t } = useLang();
  const [url,    setUrl]    = useState('');
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Close on Escape
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleSave() {
    const trimmed = url.trim();
    if (!trimmed) return;
    if (!/instagram\.com\/(reel|p|reels)\//i.test(trimmed)) {
      setError(t('add_reel_invalid'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      const reel = await api.reels.saveFromUrl(trimmed);
      onSaved(reel);
      onClose();
    } catch (e) {
      if (e.status === 409) setError(t('add_reel_duplicate'));
      else if (e.status === 403) setError(t('add_reel_limit'));
      else setError(t('add_reel_error'));
      setSaving(false);
    }
  }

  return (
    <div
      className="modal-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal-sheet add-reel-sheet" role="dialog" aria-modal="true">
        <div className="modal-handle" />
        <div className="add-reel-body">
          <p className="add-reel-title">{t('add_reel_title')}</p>
          <input
            className="input"
            type="url"
            inputMode="url"
            placeholder={t('add_reel_placeholder')}
            value={url}
            onChange={e => { setUrl(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && !saving && handleSave()}
            autoFocus
          />
          {error && <p className="add-reel-error">{error}</p>}
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving || !url.trim()}
          >
            {saving ? t('add_reel_saving') : t('add_reel_save')}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>
            {t('delete_confirm_no')}
          </button>
        </div>
      </div>
    </div>
  );
}
