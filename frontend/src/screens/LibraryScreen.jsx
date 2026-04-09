import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useLang } from '../contexts/LanguageContext.jsx';
import { api } from '../services/api.js';
import Header from '../components/Header.jsx';
import ReelCard from '../components/ReelCard.jsx';

const FREE_REEL_LIMIT = 30;
const FREE_BANNER_THRESHOLD = 20;

export default function LibraryScreen() {
  const { profile } = useAuth();
  const { t } = useLang();

  const [reels,      setReels]      = useState([]);
  const [categories, setCategories] = useState({ fixed: [], custom: [] });
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [activecat,  setActiveCat]  = useState('All');
  const [sort,       setSort]       = useState('newest');

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

  return (
    <div className="screen">
      <Header />

      <div className="library-controls">
        <div className="search-wrap">
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

      <div className="library-content">
        {loading ? (
          <div className="center-message">{t('loading')}</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            {activecat !== 'All' || search ? t('empty_filtered') : t('empty_state')}
          </div>
        ) : (
          <div className="reel-grid">
            {filtered.map(reel => <ReelCard key={reel.id} reel={reel} />)}
          </div>
        )}
      </div>

      {showFreeBanner && (
        <div className="free-banner">
          <span>{t('free_banner', { count: reels.length })}</span>
          <a href="?upgrade=1" className="free-banner-link">{t('free_banner_upgrade')}</a>
        </div>
      )}
    </div>
  );
}
