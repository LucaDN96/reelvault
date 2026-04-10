import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useLang } from '../contexts/LanguageContext.jsx';
import { api } from '../services/api.js';
import { supabase } from '../services/supabase.js';
import Header from '../components/Header.jsx';
import ReelCard from '../components/ReelCard.jsx';
import ReelModal from '../components/ReelModal.jsx';

const FREE_REEL_LIMIT = 30;
const FREE_BANNER_THRESHOLD = 20;
const BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'ReelVault_official_bot';

// Skeleton heights — vary them so the masonry grid looks natural while loading
const SKELETON_HEIGHTS = [280, 340, 260, 310, 250, 320];

export default function LibraryScreen() {
  const { profile } = useAuth();
  const { t } = useLang();

  const [reels,        setReels]        = useState([]);
  const [categories,   setCategories]   = useState({ fixed: [], custom: [] });
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [activecat,    setActiveCat]    = useState('All');
  const [sort,         setSort]         = useState('newest');
  const [selectedReel, setSelectedReel] = useState(null);
  const [toastKey,     setToastKey]     = useState(null); // store i18n key, resolve at render

  // ── Initial load ────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true);
      const [reelsData, catsData] = await Promise.all([
        api.reels.list({ sort }),
        api.categories.list()
      ]);
      setReels(reelsData);
      setCategories(catsData);
      setLoading(false);
    }
    load();
  }, [sort]);

  // ── Supabase Realtime — subscribe to new reels for this user ────────────
  useEffect(() => {
    if (!profile?.id) return;

    let toastTimer;
    const channel = supabase
      .channel('library-inserts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'reels', filter: `user_id=eq.${profile.id}` },
        (payload) => {
          setReels(prev => {
            // Avoid duplicates (e.g. if the same row arrives twice)
            if (prev.some(r => r.id === payload.new.id)) return prev;
            return [payload.new, ...prev];
          });
          setToastKey('new_reel_toast');
          clearTimeout(toastTimer);
          toastTimer = setTimeout(() => setToastKey(null), 3000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      clearTimeout(toastTimer);
    };
  }, [profile?.id]);

  // ── Derived state ────────────────────────────────────────────────────────
  const allCategories = useMemo(() => {
    return ['All', ...categories.fixed, ...(categories.custom || []).map(c => c.name)];
  }, [categories]);

  const filtered = useMemo(() => {
    let list = reels;
    if (activecat !== 'All') list = list.filter(r => r.category === activecat);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.author?.toLowerCase().includes(q) ||
        r.caption?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [reels, activecat, search]);

  const showFreeBanner = profile?.plan === 'free' && reels.length > FREE_BANNER_THRESHOLD;

  // ── Modal callbacks ──────────────────────────────────────────────────────
  function handleModalDelete(id) {
    setReels(prev => prev.filter(r => r.id !== id));
  }

  function handleModalUpdate(updated) {
    setReels(prev => prev.map(r => r.id === updated.id ? updated : r));
    setSelectedReel(updated);
  }

  return (
    <div className="screen">
      <Header />

      {/* Controls: search + category pills */}
      <div className="library-controls">
        <div className="search-wrap">
          <span className="search-icon-inner">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
          </span>
          <input
            type="search"
            className="input search-input"
            placeholder={t('search_placeholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-row">
          <div className="category-pills">
            {allCategories.map(cat => (
              <button
                key={cat}
                className={`pill ${activecat === cat ? 'pill-active' : ''}`}
                onClick={() => setActiveCat(cat)}
              >
                {cat === 'All' ? t('filter_all') : cat}
              </button>
            ))}
          </div>
          <button
            className="sort-btn"
            onClick={() => setSort(s => s === 'newest' ? 'oldest' : 'newest')}
          >
            {sort === 'newest' ? t('sort_newest') : t('sort_oldest')} ↕
          </button>
        </div>
      </div>

      {/* Masonry grid */}
      <div className="library-content">
        {loading ? (
          <div className="masonry-grid">
            {SKELETON_HEIGHTS.map((h, i) => (
              <div key={i} className="masonry-item skeleton-card">
                <div className="skeleton-thumb" style={{ height: h }} />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎬</div>
            {activecat !== 'All' || search.trim() ? (
              <div className="empty-sub">{t('empty_filtered')}</div>
            ) : (
              <>
                <div className="empty-title">No reels yet</div>
                <div className="empty-sub">{t('empty_state', { botUsername: BOT_USERNAME })}</div>
              </>
            )}
          </div>
        ) : (
          <div className="masonry-grid">
            {filtered.map(reel => (
              <div key={reel.id} className="masonry-item">
                <ReelCard reel={reel} onClick={() => setSelectedReel(reel)} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Free plan banner */}
      {showFreeBanner && (
        <div className="free-banner">
          <span>{t('free_banner', { count: reels.length })}</span>
          <a href="?upgrade=1" className="free-banner-link">{t('free_banner_upgrade')}</a>
        </div>
      )}

      {/* Toast */}
      {toastKey && <div className="toast">{t(toastKey)}</div>}

      {/* Detail modal */}
      {selectedReel && (
        <ReelModal
          reel={selectedReel}
          onClose={() => setSelectedReel(null)}
          onDelete={handleModalDelete}
          onUpdate={handleModalUpdate}
        />
      )}
    </div>
  );
}
