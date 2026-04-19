import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api.js';
import { cleanCaption } from '../utils/caption.js';
import { thumbnailSrc } from '../utils/thumbnail.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useLang } from '../contexts/LanguageContext.jsx';

const CATEGORY_COLORS = {
  Cooking: '#e67e22', Design: '#9b59b6', Music: '#3498db',
  Travel: '#27ae60', Sport: '#e74c3c', Humor: '#f39c12',
  Fashion: '#e91e8c', Tech: '#534AB7', Other: '#7f8c8d'
};

export default function ReelModal({ reel: initialReel, onClose, onDelete, onUpdate }) {
  const { profile } = useAuth();
  const { t } = useLang();
  const [reel,            setReel]            = useState(initialReel);
  const [categories,      setCategories]      = useState({ fixed: [], custom: [] });
  const [note,            setNote]            = useState(initialReel.note || '');
  const [noteSaved,       setNoteSaved]       = useState(false);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [confirmDelete,   setConfirmDelete]   = useState(false);
  const [newCatMode,      setNewCatMode]      = useState(false);
  const [newCatName,      setNewCatName]      = useState('');
  const noteSaveTimer = useRef(null);

  useEffect(() => {
    api.categories.list().then(setCategories);
  }, []);

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

  async function handleCategoryChange(e) {
    const category = e.target.value;
    if (category === '__new__') { setNewCatMode(true); return; }
    const isCustom = (categories.custom || []).some(c => c.name === category);
    const updated = await api.reels.update(reel.id, { category, is_custom_category: isCustom });
    setReel(updated);
    onUpdate?.(updated);
  }

  async function handleCreateCategory() {
    if (!newCatName.trim()) return;
    const created = await api.categories.create(newCatName.trim());
    const updated = await api.reels.update(reel.id, { category: created.name, is_custom_category: true });
    setReel(updated);
    onUpdate?.(updated);
    setCategories(prev => ({ ...prev, custom: [...(prev.custom || []), created] }));
    setNewCatMode(false);
    setNewCatName('');
  }

  function handleNoteChange(e) {
    setNote(e.target.value);
    setNoteSaved(false);
    clearTimeout(noteSaveTimer.current);
  }

  async function handleNoteBlur() {
    clearTimeout(noteSaveTimer.current);
    await api.reels.update(reel.id, { note });
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
  }

  async function handleDelete() {
    await api.reels.delete(reel.id);
    onDelete(reel.id);
    onClose();
  }

  const [thumbError, setThumbError] = useState(false);
  const color        = CATEGORY_COLORS[reel.category] || '#534AB7';
  const caption       = cleanCaption(reel.caption);
  const isLongCaption = caption && caption.length > 200;
  const isReelType    = !reel.media_type || reel.media_type === 'reel' || reel.media_type === 'unknown';
  const thumbSrc      = thumbnailSrc(reel.thumbnail);
  const showThumb     = thumbSrc && !thumbError;

  return (
    <div
      className="modal-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal-sheet" role="dialog" aria-modal="true">
        <div className="modal-handle" />

        {/* Close button */}
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>

        {/* Thumbnail — tap anywhere to open in Instagram */}
        <a
          href={reel.url}
          target="_blank"
          rel="noopener noreferrer"
          className="modal-thumb-wrap"
          onClick={e => e.stopPropagation()}
        >
          {showThumb
            ? <img
                src={thumbSrc}
                alt=""
                className="modal-thumb"
                onError={() => setThumbError(true)}
              />
            : <div className="modal-thumb-placeholder" />
          }
          <div className="modal-play-btn">
            <div className="modal-play-circle">
              {isReelType ? (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="rgba(255,255,255,0.95)">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.95)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                </svg>
              )}
            </div>
          </div>
        </a>

        {/* Scrollable content */}
        <div className="modal-body">

          {/* Meta */}
          <div className="modal-meta">
            <div>
              <div className="modal-author">{reel.author || 'Unknown'}</div>
              <div className="modal-date">
                {t('date_saved')}: {new Date(reel.date_saved).toLocaleDateString()}
              </div>
            </div>
            <span className="category-badge" style={{ background: color + '1A', color }}>
              {reel.category}
            </span>
          </div>

          {/* Caption */}
          {caption && (
            <div className="modal-section">
              <span className="modal-label">Caption</span>
              <p className={`modal-caption ${captionExpanded ? 'expanded' : ''}`}>
                {caption}
              </p>
              {isLongCaption && (
                <button className="text-btn" onClick={() => setCaptionExpanded(x => !x)}>
                  {captionExpanded ? 'Show less' : 'Show more'}
                </button>
              )}
            </div>
          )}

          {/* Category */}
          <div className="modal-section">
            <label className="modal-label">{t('category_label')}</label>
            {newCatMode ? (
              <div className="new-cat-row">
                <input
                  className="input"
                  placeholder={t('new_category_placeholder')}
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreateCategory()}
                  autoFocus
                />
                <button className="btn btn-primary btn-sm" onClick={handleCreateCategory}>Add</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setNewCatMode(false)}>Cancel</button>
              </div>
            ) : (
              <select className="select" value={reel.category} onChange={handleCategoryChange}>
                {categories.fixed.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                {(categories.custom || []).map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
                <option value="__new__">{t('add_custom_category')}</option>
              </select>
            )}
          </div>

          {/* Notes */}
          <div className="modal-section">
            <label className="modal-label">
              Notes {noteSaved && <span className="note-saved">{t('note_saved')}</span>}
            </label>
            <textarea
              className="textarea"
              placeholder={t('note_placeholder')}
              value={note}
              onChange={handleNoteChange}
              onBlur={handleNoteBlur}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="modal-actions">
            <a
              href={reel.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              onClick={e => e.stopPropagation()}
            >
              {isReelType ? t('open_instagram') : t('open_instagram_post')}
            </a>

            {!confirmDelete ? (
              <button className="btn btn-danger" onClick={() => setConfirmDelete(true)}>
                {t('delete_reel')}
              </button>
            ) : (
              <div className="confirm-row">
                <span>{t('delete_confirm')}</span>
                <button className="btn btn-danger btn-sm" onClick={handleDelete}>{t('delete_confirm_yes')}</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(false)}>{t('delete_confirm_no')}</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
