import { useState } from 'react'
import { resolveAssetUrl } from '../content/contentRepository'
import type { Pictogram } from '../domain/content'
import type { SentencePart } from '../games/dictation/dictationRounds'

export interface SentenceBoardSlot {
  role: SentencePart
  pictogram?: Pictogram
}

interface SentenceStructureBoardProps {
  slots: SentenceBoardSlot[]
  activeIndex?: number
  onDropPictogram?: (pictogramId: string) => void
  ariaLabel?: string
  showLabels?: boolean
  onSelectSlot?: (index: number) => void
}

const roleLabels: Record<SentencePart, string> = {
  subject: 'Sujeto',
  action: 'Acción',
  complement: 'Complemento',
  conjunction: 'Conjunción',
  punctuation: 'Final',
}

function BoardImage({ pictogram }: { pictogram: Pictogram }) {
  const [missing, setMissing] = useState(false)
  if (missing) return <span className="sentence-board__missing">PNG pendiente</span>
  return (
    <img
      src={resolveAssetUrl(pictogram.image)}
      alt=""
      draggable="false"
      onError={() => setMissing(true)}
    />
  )
}

export function SentenceStructureBoard({
  slots,
  activeIndex,
  onDropPictogram,
  ariaLabel = 'Plancha de estructura de la oración',
  showLabels = true,
  onSelectSlot,
}: SentenceStructureBoardProps) {
  const canDrop = activeIndex !== undefined && Boolean(onDropPictogram)
  return (
    <section
      className={canDrop ? 'sentence-board sentence-board--droppable' : 'sentence-board'}
      aria-label={ariaLabel}
      onDragOver={(event) => {
        if (!canDrop) return
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
      }}
      onDrop={(event) => {
        if (!canDrop || !onDropPictogram) return
        event.preventDefault()
        const pictogramId = event.dataTransfer.getData('text/rosetta-pictogram')
        if (pictogramId) onDropPictogram(pictogramId)
      }}
    >
      <span className="sentence-board__marker sentence-board__marker--start" aria-hidden="true" />
      <span className="sentence-board__guide" aria-hidden="true" />
      <div className="sentence-board__slots">
        {slots.map(({ role, pictogram }, index) => (
          <div
            className={`sentence-board__slot sentence-board__slot--${role} ${index === activeIndex ? 'sentence-board__slot--active' : ''}`}
            key={`${role}-${index}`}
            aria-label={`${roleLabels[role]}: ${pictogram?.label ?? 'vacío'}`}
            aria-current={index === activeIndex ? 'step' : undefined}
          >
            <span>{roleLabels[role]}</span>
            <div className="sentence-board__visual">{pictogram && <BoardImage key={pictogram.id} pictogram={pictogram} />}</div>
            <strong>{showLabels ? pictogram?.label ?? '\u00A0' : '\u00A0'}</strong>
            {pictogram && onSelectSlot && <button
              type="button"
              className="sentence-board__edit"
              aria-label={`Cambiar ${roleLabels[role].toLowerCase()}: ${pictogram.label}`}
              aria-pressed={index === activeIndex}
              onClick={() => onSelectSlot(index)}
            />}
          </div>
        ))}
      </div>
      <span className="sentence-board__marker sentence-board__marker--end" aria-hidden="true" />
    </section>
  )
}
