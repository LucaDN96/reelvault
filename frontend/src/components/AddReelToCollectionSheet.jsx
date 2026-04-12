import { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { useLang } from '../contexts/LanguageContext.jsx';

export default function AddReelToCollectionSheet({ collectionId, existingReelIds, onClose, onAdded }) {
  const { t } = useLang();
  const [reels,   setReels]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding,  setAdding]  = useState(null); // reel id being added
  const [errors,  setErrors]  = useState({});

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

  useEffect(() => {
    api.reels.list({ sort: 'newest' })
      .then(data => setReels(data.filter(r => !existingReelIds.includes(r.id))))
      .finally(() => setLoading(false));
  }, []);

  async function handleAdd(reel) {
    setAdding(reel.id);
    setErrors(prev => ({ ...prev, [reel.id]: '' }));
    try {
      await api.collections.addReel(collectionId, reel.id);
      onAdded(reel);
      setReels(prev => prev.filter(r => r.id !== reel.id));
    } catch (e) {
      if (e.status === 409) {
        setErrors(prev => ({ ...prev, [reel.id]: t('collection_reel_already_added') }));
        setReels(prev => prev.filter(r => r.id !== reel.id));
      } else {
        setErrors(prev => ({ ...prev, [reel.id]: t('error_generic') }));
      }
    }
    setAdding(null);
  }

  return (
    <div
      className="modal-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal-sheet" role="dialog" aria-modal="true" style={{ maxHeight: '80dvh' }}>
        <div className="modal-handle" />
        <div style={{ padding: '4px 20px 12px', flexShrink: 0 }}>
          <p className="add-reel-title">{t('collection_add_reel')}</p>
        </div>

        {loading ? (
          <div className="center-message">{t('loading')}</div>
        ) : reels.length === 0 ? (
          <div className="center-message">{t('collection_empty_reels')}</div>
        ) : (
          <div className="reel-list" style={{ overflow: 'auto', flex: 1, padding: '0 12px calc(20px + var(--safe-bottom))' }}>
            {reels.map(reel => (
              <article
                key={reel.id}
                className="reel-list-item"
                onClick={() => adding !== reel.id && handleAdd(reel)}
                style={{ opacity: adding === reel.id ? 0.6 : 1 }}
              >
                <div className="reel-list-thumb">
                  {reel.thumbnail
                    ? <img src={reel.thumbnail} alt="" className="reel-list-thumb-img" loading="lazy" />
                    : <div className="reel-list-thumb-placeholder" />
                  }
                  <div className="reel-list-thumb-overlay">
                    {adding === reel.id
                      ? <span style={{ fontSize: 18, color: '#fff' }}>…</span>
                      : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.92)" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                    }
                  </div>
                </div>
                <div className="reel-list-body">
                  <div className="reel-list-top">
                    <span className="reel-list-author">{reel.author || 'Unknown'}</span>
                    {reel.caption && <span className="reel-list-caption">{reel.caption}</span>}
                  </div>
                  {errors[reel.id]
                    ? <span style={{ fontSize: 11, color: 'var(--danger)' }}>{errors[reel.id]}</span>
                    : <span className="reel-list-badge">✦ {reel.category}</span>
                  }
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
