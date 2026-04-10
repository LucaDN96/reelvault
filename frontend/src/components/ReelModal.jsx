import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useLang } from '../contexts/LanguageContext.jsx';

const CATEGORY_COLORS = {
  Cooking: '#e67e22', Design: '#9b59b6', Music: '#3498db',
  Travel: '#27ae60', Sport: '#e74c3c', Humor: '#f39c12',
  Fashion: '#e91e8c', Tech: '#534AB7', Other: '#7f8c8d'
};

// Injects embed.js once, or calls process() if already loaded.
function initInstagramEmbed() {
  if (window.instgrm?.Embeds) {
    window.instgrm.Embeds.process();
    return;
  }
  if (!document.querySelector('script[src*="instagram.com/embed.js"]')) {
    const script = document.createElement('script');
    script.src = 'https://www.instagram.com/embed.js';
    script.async = true;
    document.head.appendChild(script);
    // embed.js calls process() automatically on load
  }
}

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

  // oEmbed state: null = loading, '' = failed (show fallback), string = html
  const [embedHtml,    setEmbedHtml]    = useState(null);
  const [embedFailed,  setEmbedFailed]  = useState(false);

  const noteSaveTimer = useRef(null);

  // Fetch categories
  useEffect(() => {
    api.categories.list().then(setCategories);
  }, []);

  // Fetch oEmbed HTML
  useEffect(() => {
    let cancelled = false;
    api.reels.oembed(reel.url)
      .then(data => {
        if (!cancelled) setEmbedHtml(data.html);
      })
      .catch(() => {
        if (!cancelled) setEmbedFailed(true);
      });
    return () => { cancelled = true; };
  }, [reel.url]);

  // Initialize Instagram embed script after HTML is injected
  useEffect(() => {
    if (embedHtml) initInstagramEmbed();
  }, [embedHtml]);

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

  const color = CATEGORY_COLORS[reel.category] || '#534AB7';
  const isLongCaption = reel.caption && reel.caption.length > 200;
  const showFallback = embedFailed || embedHtml === null && false; // null = still loading

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

        {/* ── Media area: oEmbed → fallback thumbnail ─────────────────────── */}
        {embedHtml ? (
          // Instagram oEmbed embed
          <div className="modal-embed-wrap">
            <div
              className="modal-embed-inner"
              dangerouslySetInnerHTML={{ __html: embedHtml }}
            />
          </div>
        ) : embedFailed ? (
          // Fallback: static thumbnail with play button
          <a
            href={reel.url}
            target="_blank"
            rel="noopener noreferrer"
            className="modal-thumb-wrap"
            onClick={e => e.stopPropagation()}
          >
            {reel.thumbnail
              ? <img src={reel.thumbnail} alt="" className="modal-thumb" />
              : <div className="modal-thumb-placeholder" />
            }
            <div className="modal-play-btn">
              <div className="modal-play-circle">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="rgba(255,255,255,0.95)">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </div>
            </div>
          </a>
        ) : (
          // Loading spinner
          <div className="modal-embed-loading">
            <div className="embed-spinner" />
          </div>
        )}

        {/* ── Scrollable content ──────────────────────────────────────────── */}
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
          {reel.caption && (
            <div className="modal-section">
              <span className="modal-label">Caption</span>
              <p className={`modal-caption ${captionExpanded ? 'expanded' : ''}`}>
                {reel.caption}
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
                {profile?.plan === 'pro' && (
                  <option value="__new__">{t('add_custom_category')}</option>
                )}
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
              {t('open_instagram')}
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
