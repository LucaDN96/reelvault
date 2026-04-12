import { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { useLang } from '../contexts/LanguageContext.jsx';

export default function CreateCollectionSheet({ onClose, onCreated }) {
  const { t } = useLang();
  const [name,   setName]   = useState('');
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleCreate() {
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    try {
      const collection = await api.collections.create(name.trim());
      onCreated(collection);
      onClose();
    } catch (e) {
      setError(e.message || t('error_generic'));
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
          <p className="add-reel-title">{t('collection_new_title')}</p>
          <input
            className="input"
            type="text"
            placeholder={t('collection_new_placeholder')}
            value={name}
            onChange={e => { setName(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && !saving && handleCreate()}
            autoFocus
            maxLength={60}
          />
          {error && <p className="add-reel-error">{error}</p>}
          <button
            className="btn btn-primary"
            onClick={handleCreate}
            disabled={saving || !name.trim()}
          >
            {saving ? '…' : t('collection_new_create')}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>
            {t('delete_confirm_no')}
          </button>
        </div>
      </div>
    </div>
  );
}
