import { useState } from 'react'
import { resolveAssetUrl } from '../content/contentRepository'
import type { Pictogram } from '../domain/content'

interface PictureCardProps {
  pictogram: Pictogram
  showLabel?: boolean
}

export function PictureCard({ pictogram, showLabel = true }: PictureCardProps) {
  const [failed, setFailed] = useState(false)

  return (
    <figure className={showLabel ? 'picture-card' : 'picture-card picture-card--without-label'}>
      <div className="picture-card__visual">
        {!failed ? (
          <img
            key={pictogram.image}
            src={resolveAssetUrl(pictogram.image)}
            alt={pictogram.label}
            draggable="false"
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="picture-card__missing" role="status">
            <span>PNG pendiente</span>
            <small>{pictogram.image}</small>
          </div>
        )}
      </div>
      {showLabel && <figcaption>{pictogram.label}</figcaption>}
    </figure>
  )
}
