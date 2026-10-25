import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { ActivityHeader } from '../../components/ActivityHeader'
import { AudioButton } from '../../components/AudioButton'
import { ConfettiBurst } from '../../components/ConfettiBurst'
import { PictogramOption } from '../../components/PictogramOption'
import { SentenceStructureBoard, type SentenceBoardSlot } from '../../components/SentenceStructureBoard'
import { builderChoices, builderRoles } from './builderSession'
import type { SentenceBuilderSettings } from '../../domain/activity'
import type { AudioResource, Pictogram } from '../../domain/content'
import type { ActionCompatibility, SentenceDefinition } from '../../domain/sentence'
import { useAudioPlayer } from '../../hooks/useAudioPlayer'
import type { SentencePart } from '../dictation/dictationRounds'
import { sentenceWords } from '../../utils/sentenceAudio'
import { findBuiltSentence } from './sentenceBuilderOptions'

interface SentenceBuilderPlayerProps {
  pictograms: Pictogram[]
  audioResources: AudioResource[]
  sentences: SentenceDefinition[]
  compatibility: ActionCompatibility[]
  settings: SentenceBuilderSettings
  onExit: () => void
}

export function SentenceBuilderPlayer({
  pictograms,
  audioResources,
  sentences,
  compatibility,
  settings,
  onExit,
}: SentenceBuilderPlayerProps) {
  const [selected, setSelected] = useState<Pictogram[]>([])
  const boardRef = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState(0)
  const [round, setRound] = useState(1)
  const [finished, setFinished] = useState(false)
  const [showLabels, setShowLabels] = useState(false)
  const [onlyCompatible, setOnlyCompatible] = useState(true)
  const bank = useMemo(() => builderChoices(pictograms, compatibility, settings), [pictograms, compatibility, settings])
  const pointerStartRef = useRef<{ id: string; x: number; y: number } | undefined>(undefined)
  const draggedRef = useRef(false)
  const suppressClickRef = useRef(false)
  const { audioError, play, playCompactSequence, stop } = useAudioPlayer()
  const stage = selected.length
  const roleSequence = builderRoles(settings.subjectCount, settings.complementCount)
  const selectableParts = roleSequence.length
  const complete = stage >= selectableParts
  const activeRole: SentencePart | undefined = complete ? undefined : roleSequence[stage]
  const previousIdForRole = (role: SentencePart) => {
    for (let index = stage - 1; index >= 0; index -= 1) {
      if (roleSequence[index] === role) return selected[index]?.id ?? ''
      if (role === 'action' && roleSequence[index] === 'subject') break
    }
    return ''
  }
  const activeSubjectId = previousIdForRole('subject')
  const activeActionId = activeRole === 'subject' ? '' : previousIdForRole('action')

  const allowedActions = new Set(bank.rules.filter((rule) =>
    !rule.allowedSubjectIds || rule.allowedSubjectIds.includes(activeSubjectId),
  ).map(({ actionId }) => actionId))
  const allowedComplements = new Set(bank.rules.find(({ actionId }) => actionId === activeActionId)?.allowedComplementIds ?? [])
  const options = activeRole === 'subject' ? bank.subjects
    : activeRole === 'action' ? bank.actions
      : activeRole === 'complement' ? bank.complements
        : pictograms.filter(({ id }) => id === (activeRole === 'conjunction' ? 'y' : activeRole === 'punctuation' ? 'punto' : ''))

  const isSelectable = (pictogram: Pictogram, role: SentencePart = activeRole ?? 'punctuation') =>
    !complete && !finished && role === activeRole && (
      role === 'subject' ? !selected.some((item, index) => roleSequence[index] === 'subject' && item.id === pictogram.id)
        : role === 'action' ? allowedActions.has(pictogram.id)
        : role === 'complement' ? allowedComplements.has(pictogram.id) &&
          !selected.some((item, index) => index > roleSequence.lastIndexOf('subject', stage - 1) && roleSequence[index] === 'complement' && item.id === pictogram.id)
          : true
    )

  const pageSize = 18
  const complementPool = onlyCompatible
    ? bank.complements.filter(({ id }) => allowedComplements.has(id))
    : bank.complements
  const pageCount = Math.max(1, Math.ceil(complementPool.length / pageSize))
  const currentPage = Math.min(page, pageCount - 1)
  const visibleComplements = complementPool.slice(currentPage * pageSize, (currentPage + 1) * pageSize)
  useEffect(() => setPage(0), [activeActionId, onlyCompatible])
  useEffect(() => stop, [stop])
  useEffect(() => {
    const board = boardRef.current
    const active = board?.querySelector('.sentence-board__slot--active')
    if (!board || !active) return
    const bounds = board.getBoundingClientRect()
    const target = active.getBoundingClientRect()
    if (target.right > bounds.right) board.scrollLeft += target.right - bounds.right + 8
    else if (target.left < bounds.left) board.scrollLeft -= bounds.left - target.left + 8
  }, [stage, round, finished])

  const audioFileFor = (pictogram: Pictogram) =>
    audioResources.find((audio) => pictogram.audioIds.includes(audio.id))?.file

  const place = (pictogram: Pictogram) => {
    if (!activeRole || !options.some(({ id }) => id === pictogram.id) || !isSelectable(pictogram)) return
    stop()
    setSelected((current) => [...current, pictogram])
  }

  const placeById = (pictogramId: string) => {
    const pictogram = options.find(({ id }) => id === pictogramId)
    if (pictogram) place(pictogram)
  }

  const pointerDown = (event: PointerEvent<HTMLButtonElement>, pictogram: Pictogram) => {
    suppressClickRef.current = false
    pointerStartRef.current = { id: pictogram.id, x: event.clientX, y: event.clientY }
    draggedRef.current = false
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const pointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const start = pointerStartRef.current
    if (!start) return
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 12) {
      draggedRef.current = true
      event.currentTarget.classList.add('recognition-option--dragging')
    }
  }

  const pointerUp = (event: PointerEvent<HTMLButtonElement>, pictogram: Pictogram) => {
    event.currentTarget.classList.remove('recognition-option--dragging')
    if (draggedRef.current) {
      const dropTarget = document.elementFromPoint(event.clientX, event.clientY)?.closest('.sentence-board')
      if (dropTarget) place(pictogram)
      suppressClickRef.current = true
    }
    pointerStartRef.current = undefined
    draggedRef.current = false
  }

  const removeLast = () => { stop(); setSelected((current) => current.slice(0, -1)) }
  const restart = () => { stop(); setSelected([]); setPage(0) }
  const nextRound = () => {
    restart()
    if (round === settings.roundCount) setFinished(true)
    else setRound((current) => current + 1)
  }

  const playSentence = () => {
    if (!complete) return
    const [subject, action] = selected
    const complementIds = selected
      .filter((_, index) => roleSequence[index] === 'complement')
      .map(({ id }) => id)
    const sentence = settings.subjectCount === 1 ? findBuiltSentence(sentences, subject.id, action.id, complementIds) : undefined
    const fullAudio = audioResources.find(({ id }) => id === sentence?.audioId)?.file
    if (fullAudio) {
      play(fullAudio)
      return
    }
    const spokenParts = sentenceWords(selected)
    const files = spokenParts.flatMap((pictogram) => {
      const file = audioFileFor(pictogram)
      return file ? [file] : []
    })
    if (files.length === spokenParts.length) playCompactSequence(files)
    else play(undefined)
  }

  const slots: SentenceBoardSlot[] = roleSequence.map((role, index) => ({ role, pictogram: selected[index] }))

  const writtenWords = selected
    .filter((_, index) => roleSequence[index] !== 'punctuation')
    .map(({ label }) => label)
  const writtenSentence = `${writtenWords.join(' ')}.`

  const stageTitle = activeRole === 'subject'
    ? 'Elige un sujeto'
    : activeRole === 'action'
      ? 'Elige una acción'
      : activeRole === 'complement'
        ? roleSequence.slice(0, stage).filter((role) => role === 'complement').length > 0
          ? 'Elige otro complemento'
          : 'Elige un complemento'
        : activeRole === 'conjunction'
          ? 'Coloca la y'
          : activeRole === 'punctuation'
            ? 'Coloca el punto'
        : 'Oración construida'

  const renderOption = (pictogram: Pictogram, role: SentencePart) => (
    <PictogramOption
      key={pictogram.id}
      pictogram={pictogram}
      showLabel={showLabels}
      disabled={!isSelectable(pictogram, role)}
      onListen={() => play(audioFileFor(pictogram))}
      selected={selected.some(({ id }) => id === pictogram.id)}
      onSelect={() => {
        if (suppressClickRef.current) {
          suppressClickRef.current = false
          return
        }
        place(pictogram)
      }}
      onPointerDown={(event) => pointerDown(event, pictogram)}
      onPointerMove={pointerMove}
      onPointerUp={(event) => pointerUp(event, pictogram)}
      onPointerCancel={(event) => {
        event.currentTarget.classList.remove('recognition-option--dragging')
        pointerStartRef.current = undefined
        draggedRef.current = false
        suppressClickRef.current = false
      }}
    />
  )

  if (finished) return (
    <main className="screen builder-session-end">
      <ActivityHeader title="Construye tu oración" onBack={onExit} />
      <section aria-live="polite">
        <span className="builder-session-end__icon" aria-hidden="true">✓</span>
        <h2>¡Sesión completada!</h2>
        <p>Has construido {settings.roundCount} {settings.roundCount === 1 ? 'oración' : 'oraciones'}.</p>
        <div className="button-row">
          <button type="button" className="button" onClick={onExit}>Volver al inicio</button>
          <button type="button" className="button button--primary" onClick={() => { restart(); setRound(1); setFinished(false) }}>Repetir sesión</button>
        </div>
      </section>
    </main>
  )

  return (
    <main className="sentence-workspace">
      <header className="sentence-workspace__header">
        <button className="button button--compact" type="button" onClick={onExit}>← Volver</button>
        <h1>CONSTRUYE TU ORACIÓN.</h1>
        <span>Frase {round} de {settings.roundCount}</span>
      </header>
      <ConfettiBurst active={complete} />
      <div className={`sentence-workspace__board ${showLabels ? '' : 'sentence-workspace__board--pictures'}`} ref={boardRef}>
        <SentenceStructureBoard
          slots={slots}
          activeIndex={complete ? undefined : stage}
          onDropPictogram={complete ? undefined : placeById}
          showLabels={showLabels}
        />
      </div>
      <div className="sentence-workspace__status" aria-live="polite">
        <strong>{stageTitle}</strong>
        <span>{complete ? 'Escucha la oración o continúa con la sesión.' : 'Toca un dibujo o arrástralo a la plancha.'}</span>
      </div>
      <div className="sentence-banks">
        <section className="sentence-bank sentence-bank--subjects" aria-label="Sujetos">
          <h2>Sujetos</h2>
          <div className="sentence-bank__grid">{bank.subjects.map((item) => renderOption(item, 'subject'))}</div>
        </section>
        <section className="sentence-bank sentence-bank--actions" aria-label="Acciones">
          <h2>Acciones</h2>
          <div className="sentence-bank__grid">{bank.actions.map((item) => renderOption(item, 'action'))}</div>
        </section>
        {settings.complementCount > 0 && <section className="sentence-bank sentence-bank--complements" aria-label="Complementos">
          <div className="sentence-bank__heading">
            <h2>Complementos</h2>
            {pageCount > 1 && <nav aria-label="Páginas de complementos">
              <button type="button" aria-label="Complementos anteriores" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>←</button>
              <span>{currentPage + 1} / {pageCount}</span>
              <button type="button" aria-label="Más complementos" disabled={currentPage + 1 >= pageCount} onClick={() => setPage(currentPage + 1)}>→</button>
            </nav>}
          </div>
          <label className="sentence-bank__filter">
            <input type="checkbox" checked={onlyCompatible} onChange={(event) => setOnlyCompatible(event.target.checked)} />
            Ocultar complementos incompatibles
          </label>
          {onlyCompatible && !activeActionId ? (
            <p className="sentence-bank__empty" role="status">Elige un verbo para ver sus complementos.</p>
          ) : visibleComplements.length ? (
            <div className="sentence-bank__grid">{visibleComplements.map((item) => renderOption(item, 'complement'))}</div>
          ) : <p className="sentence-bank__empty" role="status">Este verbo no tiene complementos disponibles.</p>}
        </section>}
        <section className="sentence-bank sentence-bank--signs" aria-label="Signos">
          <h2>Signos</h2>
          <div className="sentence-bank__grid">{pictograms.filter(({ id }) => id === 'y' || id === 'punto').map((item) => renderOption(item, item.id === 'y' ? 'conjunction' : 'punctuation'))}</div>
        </section>
      </div>
      <footer className="sentence-workspace__footer">
        <button className="button button--compact" type="button" disabled={!selected.length} onClick={removeLast}>Quitar última</button>
        <button className="button button--compact" type="button" aria-pressed={showLabels} onClick={() => setShowLabels((current) => !current)}>Palabras: {showLabels ? 'visibles' : 'ocultas'}</button>
        {complete && <>
          <AudioButton label="Escuchar frase" ariaLabel="Escuchar la frase completa" onClick={playSentence} />
          <button className="button button--primary button--compact" type="button" onClick={nextRound}>{round === settings.roundCount ? 'Terminar sesión' : 'Siguiente frase'}</button>
        </>}
      </footer>
      {complete && showLabels && <p className="sentence-workspace__sentence">{writtenSentence}</p>}
      <p className={audioError ? 'asset-warning' : 'asset-warning asset-warning--hidden'} role="status">
        {audioError ? 'No se ha podido reproducir uno de los audios.' : '\u00A0'}
      </p>
    </main>
  )
}
