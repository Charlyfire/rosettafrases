import { useState, type DragEvent, type PointerEvent } from 'react'
import { resolveAssetUrl } from '../content/contentRepository'
import type { Pictogram } from '../domain/content'

interface PictogramOptionProps {
  pictogram: Pictogram
  state?: 'idle' | 'correct' | 'try-again'
  disabled?: boolean
  unavailable?: boolean
  selected?: boolean
  showLabel?: boolean
  onSelect: () => void
  draggable?: boolean
  onDragStart?: (event: DragEvent<HTMLButtonElement>) => void
  onPointerDown?: (event: PointerEvent<HTMLButtonElement>) => void
  onPointerMove?: (event: PointerEvent<HTMLButtonElement>) => void
  onPointerUp?: (event: PointerEvent<HTMLButtonElement>) => void
}

export function PictogramOption({
  pictogram,
  state = 'idle',
  disabled,
  unavailable = false,
  selected = false,
  showLabel = false,
  onSelect,
  draggable = false,
  onDragStart,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: PictogramOptionProps) {
  const [imageMissing, setImageMissing] = useState(false)
  return (
    <button
      className={`recognition-option recognition-option--${state} ${showLabel ? 'recognition-option--with-label' : ''} ${unavailable ? 'recognition-option--unavailable' : ''} ${selected ? 'recognition-option--selected' : ''}`}
      type="button"
      disabled={disabled}
      data-unavailable={unavailable || undefined}
      onClick={onSelect}
      draggable={draggable}
      onDragStart={onDragStart}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      aria-label={pictogram.label}
    >
      <span className="recognition-option__visual">
        {!imageMissing ? (
          <img src={resolveAssetUrl(pictogram.image)} alt="" draggable="false" onError={() => setImageMissing(true)} />
        ) : (
          <span className="recognition-option__missing">PNG pendiente</span>
        )}
      </span>
      {showLabel && <strong>{pictogram.label}</strong>}
    </button>
  )
}
