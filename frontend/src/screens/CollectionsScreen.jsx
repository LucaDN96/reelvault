import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';
import { useLang } from '../contexts/LanguageContext.jsx';
import BottomNav from '../components/BottomNav.jsx';
import AddReelSheet from '../components/AddReelSheet.jsx';
import CreateCollectionSheet from '../components/CreateCollectionSheet.jsx';

export default function CollectionsScreen() {
  const { t }    = useLang();
  const navigate = useNavigate();

  const [collections,     setCollections]     = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [showCreate,      setShowCreate]      = useState(false);
  const [showAddReel,     setShowAddReel]     = useState(false);

  useEffect(() => {
    api.collections.list()
      .then(setCollections)
      .finally(() => setLoading(false));
  }, []);

  function handleCreated(collection) {
    setCollections(prev => [{ ...collection, role: 'owner', member_count: 1, reel_count: 0 }, ...prev]);
  }

  return (
    <div className="screen">
      <div className="lib-header">
        <div className="lib-header-top">
          <span className="lib-logo">Collections</span>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
            {t('collections_new')}
          </button>
        </div>
      </div>

      <div className="library-content">
        {loading ? (
          <div className="center-message">{t('loading')}</div>
        ) : collections.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🗂️</div>
            <p className="empty-title">{t('collections_empty').split('.')[0]}.</p>
            <p className="empty-sub">{t('collections_empty').split('.').slice(1).join('.').trim()}</p>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              {t('collections_new')} Collection
            </button>
          </div>
        ) : (
          <div className="coll-list">
            {collections.map(c => (
              <button
                key={c.id}
                className="coll-list-item"
                onClick={() => navigate(`/app/collections/${c.id}`)}
              >
                <div className="coll-list-body">
                  <span className="coll-list-name">{c.name}</span>
                  <span className="coll-list-meta">
                    {t('collection_reels_count', { count: c.reel_count })}
                    {' · '}
                    {t('collection_members', { count: c.member_count })}
                  </span>
                  {c.role !== 'owner' && (
                    <span className="coll-list-owner">{t('collection_created_by', { email: c.created_by_email || '' })}</span>
                  )}
                </div>
                <div className="coll-list-chevron">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <BottomNav onAdd={() => setShowAddReel(true)} />

      {showCreate && (
        <CreateCollectionSheet
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
      {showAddReel && (
        <AddReelSheet
          onClose={() => setShowAddReel(false)}
          onSaved={() => {}}
        />
      )}
    </div>
  );
}
