const CATEGORY_COLORS = {
  Cooking: '#e67e22', Design: '#9b59b6', Music: '#3498db',
  Travel: '#27ae60', Sport: '#e74c3c', Humor: '#f39c12',
  Fashion: '#e91e8c', Tech: '#534AB7', Other: '#7f8c8d'
};

const isReel = (media_type) => !media_type || media_type === 'reel' || media_type === 'unknown';

export default function ReelCard({ reel, onClick }) {
  return (
    <article className="reel-card" onClick={onClick}>
      <div className="reel-thumb-wrap">
        {reel.thumbnail
          ? <img src={reel.thumbnail} alt="" className="reel-thumb" loading="lazy" />
          : <div className="reel-thumb-placeholder" />
        }
        <div className="reel-card-gradient" />

        {/* Media type badge — top-left */}
        <div className="card-type-badge">
          {isReel(reel.media_type) ? '🎬' : '📷'}
        </div>

        {/* ⋯ icon — appears on hover via CSS */}
        <div className="reel-card-menu">⋯</div>

        {/* Play / photo indicator — center */}
        <div className="card-center-icon">
          {isReel(reel.media_type) ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="rgba(255,255,255,0.9)">
              <path d="M8 5v14l11-7z"/>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
            </svg>
          )}
        </div>

        {/* Author + category on bottom gradient */}
        <div className="reel-card-overlay">
          <span className="reel-author">{reel.author || 'Unknown'}</span>
          <span
            className="category-badge"
            style={{
              background: 'rgba(255,255,255,0.18)',
              color: '#fff',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              border: '1px solid rgba(255,255,255,0.22)',
            }}
          >
            {reel.category}
          </span>
        </div>
      </div>
    </article>
  );
}
