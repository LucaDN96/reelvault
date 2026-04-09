import { useNavigate } from 'react-router-dom';

const CATEGORY_COLORS = {
  Cooking: '#e67e22', Design: '#9b59b6', Music: '#3498db',
  Travel: '#27ae60', Sport: '#e74c3c', Humor: '#f39c12',
  Fashion: '#e91e8c', Tech: '#534AB7', Other: '#7f8c8d'
};

export default function ReelCard({ reel }) {
  const navigate = useNavigate();
  const color = CATEGORY_COLORS[reel.category] || '#534AB7';

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  return (
    <article className="reel-card" onClick={() => navigate(`/app/reel/${reel.id}`)}>
      <div className="reel-thumb-wrap">
        {reel.thumbnail
          ? <img src={reel.thumbnail} alt="" className="reel-thumb" loading="lazy" />
          : <div className="reel-thumb-placeholder" />
        }
        <div className="play-icon">▶</div>
      </div>

      <div className="reel-card-body">
        <div className="reel-author">{reel.author || 'Unknown'}</div>
        <div className="reel-caption">{reel.caption || <em>No caption</em>}</div>
        {reel.note && <div className="reel-note">{reel.note}</div>}
        <div className="reel-footer">
          <span className="category-badge" style={{ background: color + '22', color }}>
            {reel.category}
          </span>
          <span className="reel-date">{formatDate(reel.date_saved)}</span>
        </div>
      </div>
    </article>
  );
}
