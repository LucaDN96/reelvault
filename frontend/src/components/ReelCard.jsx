import { useState } from 'react';
import { cleanCaption } from '../utils/caption.js';
import { thumbnailSrc } from '../utils/thumbnail.js';

const isReelType = (t) => !t || t === 'reel' || t === 'unknown';

export default function ReelCard({ reel, onClick }) {
  const [imgError, setImgError] = useState(false);
  const src = thumbnailSrc(reel.thumbnail);
  const showImg = src && !imgError;

  return (
    <article className="reel-list-item" onClick={onClick}>
      {/* Square thumbnail */}
      <div className="reel-list-thumb">
        {showImg
          ? <img
              src={src}
              alt=""
              className="reel-list-thumb-img"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          : <div className="reel-list-thumb-placeholder" />
        }
        <div className="reel-list-thumb-overlay">
          {isReelType(reel.media_type) ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="rgba(255,255,255,0.92)">
              <path d="M8 5v14l11-7z"/>
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.92)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          )}
        </div>
      </div>

      {/* Text content */}
      <div className="reel-list-body">
        <div className="reel-list-top">
          <span className="reel-list-author">{reel.author || 'Unknown'}</span>
          {reel.caption && (
            <span className="reel-list-caption">{cleanCaption(reel.caption)}</span>
          )}
          <span className="reel-list-date">
            {new Date(reel.date_saved).toLocaleDateString()}
          </span>
        </div>
        <span className="reel-list-badge">✦ {reel.category}</span>
      </div>
    </article>
  );
}
