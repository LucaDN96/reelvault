const CATEGORY_COLORS = {
  Cooking: '#e67e22', Design: '#9b59b6', Music: '#3498db',
  Travel: '#27ae60', Sport: '#e74c3c', Humor: '#f39c12',
  Fashion: '#e91e8c', Tech: '#534AB7', Other: '#7f8c8d'
};

export default function ReelCard({ reel, onClick }) {
  const color = CATEGORY_COLORS[reel.category] || '#534AB7';

  return (
    <article className="reel-card" onClick={onClick}>
      <div className="reel-thumb-wrap">
        {reel.thumbnail
          ? <img src={reel.thumbnail} alt="" className="reel-thumb" loading="lazy" />
          : <div className="reel-thumb-placeholder" />
        }
        <div className="reel-card-gradient" />
        <div className="play-icon">▶</div>
        <div className="reel-card-overlay">
          <span className="reel-author">{reel.author || 'Unknown'}</span>
          <span
            className="category-badge"
            style={{ background: 'rgba(255,255,255,0.18)', color: '#fff', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.25)' }}
          >
            {reel.category}
          </span>
        </div>
      </div>
    </article>
  );
}
