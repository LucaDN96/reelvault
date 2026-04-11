import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useLang } from '../contexts/LanguageContext.jsx';
import { useUserPrefs } from '../contexts/UserPrefsContext.jsx';
import { api } from '../services/api.js';
import { supabase } from '../services/supabase.js';
import LibraryHeader from '../components/LibraryHeader.jsx';
import BottomNav from '../components/BottomNav.jsx';
import ReelCard from '../components/ReelCard.jsx';
import ReelModal from '../components/ReelModal.jsx';
import AddReelSheet from '../components/AddReelSheet.jsx';

const FREE_BANNER_THRESHOLD = 20;
const BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'ReelVault_official_bot';
const SKELETON_COUNT = 5;

export default function LibraryScreen() {
  const { profile }    = useAuth();
  const { t }          = useLang();
  const { hiddenCats } = useUserPrefs();

  const [reels,        setReels]        = useState([]);
  const [categories,   setCategories]   = useState({ fixed: [], custom: [] });
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [activecat,    setActiveCat]    = useState('All');
  const [sort,         setSort]         = useState('newest');
  const [selectedReel, setSelectedReel] = useState(null);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [toastKey,     setToastKey]     = useState(null);
  const [scrolled,     setScrolled]     = useState(false);

  // ── Load ────────────────────────────────────────────────────────────────
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

  // ── Realtime: prepend new reels ─────────────────────────────────────────
  useEffect(() => {
    if (!profile?.id) return;
    let toastTimer;
    const channel = supabase
      .channel('library-inserts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'reels', filter: `user_id=eq.${profile.id}` },
        (payload) => {
          setReels(prev => prev.some(r => r.id === payload.new.id) ? prev : [payload.new, ...prev]);
          setToastKey('new_reel_toast');
          clearTimeout(toastTimer);
          toastTimer = setTimeout(() => setToastKey(null), 3000);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); clearTimeout(toastTimer); };
  }, [profile?.id]);

  // ── Derived ──────────────────────────────────────────────────────────────
  const allCategories = useMemo(() => {
    const visible = (categories.fixed || []).filter(c => !hiddenCats.includes(c));
    const custom  = (categories.custom || []).map(c => c.name);
    return ['All', ...visible, ...custom];
  }, [categories, hiddenCats]);

  useEffect(() => {
    if (activecat !== 'All' && !allCategories.includes(activecat)) setActiveCat('All');
  }, [allCategories]);

  const filtered = useMemo(() => {
    let list = reels;
    if (activecat !== 'All') list = list.filter(r => r.category === activecat);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.author?.toLowerCase().includes(q) || r.caption?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [reels, activecat, search]);

  const showFreeBanner = profile?.plan === 'free' && reels.length > FREE_BANNER_THRESHOLD;

  // ── Modal callbacks ───────────────────────────────────────────────────────
  function handleModalDelete(id) { setReels(prev => prev.filter(r => r.id !== id)); }
  function handleModalUpdate(updated) {
    setReels(prev => prev.map(r => r.id === updated.id ? updated : r));
    setSelectedReel(updated);
  }

  // ── Add reel callback ─────────────────────────────────────────────────────
  function handleReelSaved(reel) {
    setReels(prev => prev.some(r => r.id === reel.id) ? prev : [reel, ...prev]);
  }

  return (
    <div className="screen">
      <LibraryHeader
        reelCount={reels.length}
        search={search}
        onSearchChange={setSearch}
        scrolled={scrolled}
      />

      {/* Category filter bar */}
      <div className="category-bar">
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
          title={sort === 'newest' ? t('sort_newest') : t('sort_oldest')}
        >
          ↕
        </button>
      </div>

      {/* Scrollable list */}
      <div
        className="library-content"
        onScroll={e => setScrolled(e.currentTarget.scrollTop > 4)}
      >
        {loading ? (
          <div className="reel-list">
            {Array.from({ length: SKELETON_COUNT }, (_, i) => (
              <div key={i} className="skeleton-list-item">
                <div className="skeleton-square" />
                <div className="skeleton-lines">
                  <div className="skeleton-line skeleton-line-lg" />
                  <div className="skeleton-line skeleton-line-md" />
                  <div className="skeleton-line skeleton-line-sm" />
                  <div className="skeleton-line skeleton-line-xs" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📱</div>
            <div className="empty-title">
              {activecat !== 'All' || search.trim() ? t('empty_filtered') : t('empty_headline')}
            </div>
            {!search.trim() && activecat === 'All' && (
              <>
                <div className="empty-sub">{t('empty_sub', { botUsername: BOT_USERNAME })}</div>
                <a
                  href={`https://t.me/${BOT_USERNAME}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                  style={{ marginTop: 8 }}
                >
                  {t('empty_cta')}
                </a>
              </>
            )}
          </div>
        ) : (
          <div className="reel-list">
            {filtered.map(reel => (
              <ReelCard key={reel.id} reel={reel} onClick={() => setSelectedReel(reel)} />
            ))}
          </div>
        )}
      </div>

      {showFreeBanner && (
        <div className="free-banner">
          <span>{t('free_banner', { count: reels.length })}</span>
          <a href="?upgrade=1" className="free-banner-link">{t('free_banner_upgrade')}</a>
        </div>
      )}

      {toastKey && <div className="toast">{t(toastKey)}</div>}

      <BottomNav onAdd={() => setShowAddSheet(true)} />

      {selectedReel && (
        <ReelModal
          reel={selectedReel}
          onClose={() => setSelectedReel(null)}
          onDelete={handleModalDelete}
          onUpdate={handleModalUpdate}
        />
      )}

      {showAddSheet && (
        <AddReelSheet
          onClose={() => setShowAddSheet(false)}
          onSaved={handleReelSaved}
        />
      )}
    </div>
  );
}
