import { useEffect, useState, type DragEvent, type PointerEvent } from 'react'
import { AudioButton } from './AudioButton'
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
  onListen?: () => void
  listenDisabled?: boolean
  draggable?: boolean
  onDragStart?: (event: DragEvent<HTMLButtonElement>) => void
  onPointerDown?: (event: PointerEvent<HTMLButtonElement>) => void
  onPointerMove?: (event: PointerEvent<HTMLButtonElement>) => void
  onPointerCancel?: (event: PointerEvent<HTMLButtonElement>) => void
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
  onListen,
  listenDisabled,
  draggable = false,
  onDragStart,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: PictogramOptionProps) {
  const [imageMissing, setImageMissing] = useState(false)
  useEffect(() => setImageMissing(false), [pictogram.image])
  const picture = (
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
      onPointerCancel={onPointerCancel}
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
  if (!onListen) return picture
  return (
    <div className="pictogram-card">
      {picture}
      <AudioButton className="pictogram-card__listen" label={listenDisabled ? 'Audio pendiente' : 'Escuchar'} ariaLabel={listenDisabled ? `Audio pendiente: ${pictogram.label}` : `Escuchar ${pictogram.label}`} disabled={listenDisabled} onClick={onListen} />
    </div>
  )
}
