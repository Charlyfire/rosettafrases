import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { ActivityHeader } from '../../components/ActivityHeader'
import { AudioButton } from '../../components/AudioButton'
import { ConfettiBurst } from '../../components/ConfettiBurst'
import { OptionGrid } from '../../components/OptionGrid'
import { PictogramOption } from '../../components/PictogramOption'
import { SentenceStructureBoard, type SentenceBoardSlot } from '../../components/SentenceStructureBoard'
import type { SentenceBuilderSettings } from '../../domain/activity'
import type { AudioResource, Pictogram } from '../../domain/content'
import type { ActionCompatibility, SentenceDefinition } from '../../domain/sentence'
import { useAudioPlayer } from '../../hooks/useAudioPlayer'
import type { SentencePart } from '../dictation/dictationRounds'
import {
  findBuiltSentence,
  getAllBuilderComplements,
  getBuilderActions,
  getBuilderComplements,
  getBuilderSubjects,
} from './sentenceBuilderOptions'

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
  const [page, setPage] = useState(0)
  const pointerStartRef = useRef<{ id: string; x: number; y: number } | undefined>(undefined)
  const pointerPlayedRef = useRef(false)
  const draggedRef = useRef(false)
  const suppressClickRef = useRef(false)
  const { audioError, play, playSequence, playCompactSequence, stop } = useAudioPlayer()
  const stage = selected.length
  const roleSequence: SentencePart[] = settings.structure === 'subject-action'
    ? ['subject', 'action', 'punctuation']
    : settings.structure === 'subject-action-complement'
      ? ['subject', 'action', 'complement', 'punctuation']
      : settings.structure === 'subject-action-complement-y-complement'
        ? ['subject', 'action', 'complement', 'conjunction', 'complement', 'punctuation']
        : settings.structure === 'subject-action-complement-y-action-complement'
          ? ['subject', 'action', 'complement', 'conjunction', 'action', 'complement', 'punctuation']
          : ['subject', 'action', 'complement', 'conjunction', 'subject', 'action', 'complement', 'punctuation']
  const selectableParts = roleSequence.length
  const complete = stage >= selectableParts
  const activeRole: SentencePart | undefined = complete ? undefined : roleSequence[stage]
  const previousIdForRole = (role: SentencePart) => {
    for (let index = stage - 1; index >= 0; index -= 1) {
      if (roleSequence[index] === role) return selected[index]?.id ?? ''
    }
    return ''
  }
  const activeSubjectId = previousIdForRole('subject')
  const activeActionId = previousIdForRole('action')

  const options = useMemo(() => {
    if (activeRole === 'subject') return getBuilderSubjects(pictograms)
    if (activeRole === 'action') return getBuilderActions(pictograms, compatibility, activeSubjectId, settings.structure)
    if (activeRole === 'complement') return settings.complementScope === 'all'
      ? getAllBuilderComplements(pictograms)
      : getBuilderComplements(pictograms, compatibility, activeActionId)
    if (activeRole === 'conjunction') return pictograms.filter(({ id }) => id === 'y')
    if (activeRole === 'punctuation') return pictograms.filter(({ id }) => id === 'punto')
    return []
  }, [activeActionId, activeRole, activeSubjectId, compatibility, pictograms, selected, settings.complementScope, settings.structure])

  const compatibleComplementIds = useMemo(() => new Set(
    getBuilderComplements(pictograms, compatibility, activeActionId).map(({ id }) => id),
  ), [activeActionId, compatibility, pictograms])

  const isSelectable = (pictogram: Pictogram) =>
    activeRole !== 'complement' || (
      !selected.some((item, index) => roleSequence[index] === 'complement' && item.id === pictogram.id) &&
      (settings.complementScope !== 'all' || compatibleComplementIds.has(pictogram.id))
    )

  const pageSize = settings.rows * 6
  const pageCount = Math.max(1, Math.ceil(options.length / pageSize))
  const visibleOptions = options.slice(page * pageSize, page * pageSize + pageSize)
  useEffect(() => setPage(0), [stage])
  useEffect(() => stop, [stop])

  const audioFileFor = (pictogram: Pictogram) =>
    audioResources.find((audio) => pictogram.audioIds.includes(audio.id))?.file

  const place = (pictogram: Pictogram, playSelection = true) => {
    if (!activeRole || !options.some(({ id }) => id === pictogram.id)) return
    if (!isSelectable(pictogram)) {
      if (playSelection) play(audioFileFor(pictogram))
      return
    }
    if (playSelection) play(audioFileFor(pictogram))
    setSelected((current) => [...current, pictogram])
  }

  const placeById = (pictogramId: string) => {
    const pictogram = options.find(({ id }) => id === pictogramId)
    if (pictogram) place(pictogram, false)
  }

  const pointerDown = (event: PointerEvent<HTMLButtonElement>, pictogram: Pictogram) => {
    pointerStartRef.current = { id: pictogram.id, x: event.clientX, y: event.clientY }
    pointerPlayedRef.current = true
    draggedRef.current = false
    event.currentTarget.setPointerCapture(event.pointerId)
    play(audioFileFor(pictogram))
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
      if (dropTarget) place(pictogram, false)
      suppressClickRef.current = true
    }
    pointerStartRef.current = undefined
    draggedRef.current = false
  }

  const removeLast = () => setSelected((current) => current.slice(0, -1))
  const restart = () => { setSelected([]); setPage(0) }

  const playSentence = () => {
    if (!complete) return
    const [subject, action] = selected
    const complementIds = selected
      .filter((_, index) => roleSequence[index] === 'complement')
      .map(({ id }) => id)
    const isSingleClause = settings.structure !== 'subject-action-complement-y-action-complement' &&
      settings.structure !== 'subject-action-complement-y-subject-action-complement'
    const sentence = isSingleClause ? findBuiltSentence(sentences, subject.id, action.id, complementIds) : undefined
    const fullAudio = audioResources.find(({ id }) => id === sentence?.audioId)?.file
    const punctuation = selected.find((_, index) => roleSequence[index] === 'punctuation')
    const pointFile = punctuation ? audioFileFor(punctuation) : undefined
    if (fullAudio) {
      play(fullAudio, () => pointFile && playSequence([pointFile]))
      return
    }
    const files = selected.flatMap((pictogram) => {
      const file = audioFileFor(pictogram)
      return file ? [file] : []
    })
    if (files.length === selected.length) playCompactSequence(files)
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

  return (
    <main className="screen sentence-builder-screen">
      <ActivityHeader title="Construye tu oración" subtitle={stageTitle} onBack={onExit} />
      <ConfettiBurst active={complete} />
      <SentenceStructureBoard
        slots={slots}
        activeIndex={complete ? undefined : stage}
        onDropPictogram={complete ? undefined : placeById}
        showLabels={settings.showLabels}
      />
      <section className="sentence-builder-toolbar">
        <strong>{stageTitle}</strong>
        {!complete && pageCount > 1 && <span>Página {page + 1} de {pageCount}</span>}
      </section>

      {!complete ? (
        <OptionGrid count={visibleOptions.length} label={stageTitle} className="builder-options" extraClassName={`builder-options--rows-${settings.rows}`}>
          {visibleOptions.map((pictogram) => (
            <PictogramOption
              key={`${activeRole}-${pictogram.id}`}
              pictogram={pictogram}
              showLabel={settings.showLabels}
              unavailable={!isSelectable(pictogram)}
              onSelect={() => {
                if (suppressClickRef.current) {
                  suppressClickRef.current = false
                  pointerPlayedRef.current = false
                  return
                }
                place(pictogram, !pointerPlayedRef.current)
                pointerPlayedRef.current = false
              }}
              onPointerDown={(event) => pointerDown(event, pictogram)}
              onPointerMove={pointerMove}
              onPointerUp={(event) => pointerUp(event, pictogram)}
            />
          ))}
        </OptionGrid>
      ) : (
        <section className="sentence-builder-complete" aria-live="polite">
          {settings.showLabels && <p>{writtenSentence}</p>}
          <AudioButton label="Escuchar frase" ariaLabel="Escuchar la frase completa" onClick={playSentence} />
        </section>
      )}

      <nav className="sentence-builder-controls" aria-label="Controles de construcción">
        {!complete && pageCount > 1 && <button className="button button--compact" type="button" disabled={page === 0} onClick={() => setPage((current) => current - 1)}>Anterior</button>}
        <button className="button button--compact" type="button" disabled={selected.length === 0} onClick={removeLast}>Quitar última</button>
        {complete && <button className="button button--primary button--compact" type="button" onClick={restart}>Crear otra</button>}
        {!complete && pageCount > 1 && <button className="button button--compact" type="button" disabled={page >= pageCount - 1} onClick={() => setPage((current) => current + 1)}>Siguiente</button>}
      </nav>
      <p className={audioError ? 'asset-warning' : 'asset-warning asset-warning--hidden'} role="status">
        {audioError ? 'No se ha podido reproducir uno de los audios.' : '\u00A0'}
      </p>
    </main>
  )
}
