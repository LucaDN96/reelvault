import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase.js';
import { api } from '../services/api.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useLang } from '../contexts/LanguageContext.jsx';
import Header from '../components/Header.jsx';

export default function DetailScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { t } = useLang();

  const [reel,          setReel]          = useState(null);
  const [categories,    setCategories]    = useState({ fixed: [], custom: [] });
  const [note,          setNote]          = useState('');
  const [noteSaved,     setNoteSaved]     = useState(false);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [newCatMode,    setNewCatMode]    = useState(false);
  const [newCatName,    setNewCatName]    = useState('');
  const [loading,       setLoading]       = useState(true);
  const noteSaveTimer = useRef(null);

  useEffect(() => {
    async function load() {
      const [{ data: reelData }, catsData] = await Promise.all([
        supabase.from('reels').select('*').eq('id', id).single(),
        api.categories.list()
      ]);
      if (!reelData) { navigate('/app'); return; }
      setReel(reelData);
      setNote(reelData.note || '');
      setCategories(catsData);
      setLoading(false);
    }
    load();
  }, [id]);

  const allCategories = [
    ...categories.fixed,
    ...(categories.custom || []).map(c => ({ id: c.id, name: c.name, isCustom: true }))
  ];

  async function handleCategoryChange(e) {
    const category = e.target.value;
    if (category === '__new__') { setNewCatMode(true); return; }

    const isCustom = (categories.custom || []).some(c => c.name === category);
    const updated  = await api.reels.update(id, { category, is_custom_category: isCustom });
    setReel(updated);
  }

  async function handleCreateCategory() {
    if (!newCatName.trim()) return;
    const created = await api.categories.create(newCatName.trim());
    const updated  = await api.reels.update(id, { category: created.name, is_custom_category: true });
    setReel(updated);
    setCategories(prev => ({ ...prev, custom: [...(prev.custom || []), created] }));
    setNewCatMode(false);
    setNewCatName('');
  }

  function handleNoteChange(e) {
    const val = e.target.value;
    setNote(val);
    setNoteSaved(false);
    clearTimeout(noteSaveTimer.current);
  }

  async function handleNoteBlur() {
    clearTimeout(noteSaveTimer.current);
    await api.reels.update(id, { note });
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
  }

  async function handleDelete() {
    await api.reels.delete(id);
    navigate('/app');
  }

  if (loading) return <div className="screen"><Header showBack /><div className="center-message">{t('loading')}</div></div>;
  if (!reel) return null;

  const isLongCaption = reel.caption && reel.caption.length > 200;

  return (
    <div className="screen">
      <Header showBack />

      <div className="detail-content">
        {/* Thumbnail */}
        <div className="detail-thumb-wrap" onClick={() => window.open(reel.url, '_blank')}>
          {reel.thumbnail
            ? <img src={reel.thumbnail} alt="" className="detail-thumb" />
            : <div className="detail-thumb-placeholder" />
          }
          <div className="detail-play-icon">▶</div>
        </div>

        {/* Meta */}
        <div className="detail-meta">
          <div className="detail-author">{reel.author || 'Unknown'}</div>
          <div className="detail-date">
            {t('date_saved')}: {new Date(reel.date_saved).toLocaleDateString()}
          </div>
        </div>

        {/* Caption */}
        {reel.caption && (
          <div className="detail-section">
            <p className={`detail-caption ${captionExpanded ? 'expanded' : ''}`}>
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
        <div className="detail-section">
          <label className="detail-label">{t('category_label')}</label>
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
        <div className="detail-section">
          <label className="detail-label">
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
        <div className="detail-actions">
          <a href={reel.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
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
  );
}
