import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { ActivityHeader } from '../../components/ActivityHeader'
import { ConfettiBurst } from '../../components/ConfettiBurst'
import { PictogramOption } from '../../components/PictogramOption'
import { resolveAssetUrl } from '../../content/contentRepository'
import type { VowelSound } from '../../domain/activity'
import type { AudioResource, Pictogram } from '../../domain/content'
import { useAudioPlayer } from '../../hooks/useAudioPlayer'
import { positiveFeedback, wrongFeedbackAudioFile } from '../recognition/recognitionAudio'

interface Props { items: Pictogram[]; sounds: VowelSound[]; audioResources: AudioResource[]; showLabels: boolean; onExit: () => void }

export function VowelSortPlayer({ items, sounds, audioResources, showLabels, onExit }: Props) {
  const [selectedId, setSelectedId] = useState<string>()
  const [placed, setPlaced] = useState<Record<string, VowelSound>>({})
  const [feedback, setFeedback] = useState<string>()
  const pointerRef = useRef<{ id: string; x: number; y: number } | undefined>(undefined)
  const draggedRef = useRef(false)
  const suppressClickRef = useRef(false)
  const pointerPlayedRef = useRef(false)
  const { audioError, play } = useAudioPlayer()
  const complete = items.length > 0 && Object.keys(placed).length === items.length
  const audioFileFor = (pictogram: Pictogram) => audioResources.find((audio) => pictogram.audioIds.includes(audio.id))?.file

  useEffect(() => { play('audio/words/Coloca cada dibujo en su sitio.mp3') }, [play])

  useEffect(() => {
    if (!complete) return
    const positive = positiveFeedback[0]
    setFeedback(positive.text)
    play(positive.file)
  }, [complete, play])

  const place = (id: string, sound: VowelSound) => {
    const pictogram = items.find((item) => item.id === id)
    if (!pictogram || placed[id]) return
    if (pictogram.initialSound !== sound) {
      play(wrongFeedbackAudioFile)
      return
    }
    setPlaced((current) => ({ ...current, [id]: sound }))
    setSelectedId(undefined)
  }

  const pointerDown = (event: PointerEvent<HTMLButtonElement>, pictogram: Pictogram) => {
    pointerRef.current = { id: pictogram.id, x: event.clientX, y: event.clientY }
    pointerPlayedRef.current = true
    draggedRef.current = false
    event.currentTarget.setPointerCapture(event.pointerId)
    play(audioFileFor(pictogram))
  }
  const pointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const start = pointerRef.current
    if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 12) {
      draggedRef.current = true
      event.currentTarget.classList.add('recognition-option--dragging')
    }
  }
  const pointerUp = (event: PointerEvent<HTMLButtonElement>, pictogram: Pictogram) => {
    event.currentTarget.classList.remove('recognition-option--dragging')
    if (draggedRef.current) {
      const zone = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-vowel-zone]')
      if (zone?.dataset.vowelZone) place(pictogram.id, zone.dataset.vowelZone as VowelSound)
      suppressClickRef.current = true
    }
    pointerRef.current = undefined
    draggedRef.current = false
  }

  return (
    <main className="screen vowel-sort-screen">
      <ActivityHeader title="Clasificar por vocal" subtitle={complete ? 'Actividad terminada' : 'Elige un dibujo y su vocal'} onBack={onExit} />
      <ConfettiBurst active={complete} />
      <section className="vowel-sort-items" aria-label="Dibujos para clasificar">
        {items.filter(({ id }) => !placed[id]).map((pictogram) => <PictogramOption
          key={pictogram.id} pictogram={pictogram} showLabel={showLabels} selected={selectedId === pictogram.id}
          onSelect={() => {
            if (suppressClickRef.current) { suppressClickRef.current = false; pointerPlayedRef.current = false; return }
            if (!pointerPlayedRef.current) play(audioFileFor(pictogram))
            pointerPlayedRef.current = false
            setSelectedId(pictogram.id)
          }}
          draggable onDragStart={(event) => { event.dataTransfer.setData('text/rosetta-pictogram', pictogram.id); play(audioFileFor(pictogram)) }}
          onPointerDown={(event) => pointerDown(event, pictogram)} onPointerMove={pointerMove} onPointerUp={(event) => pointerUp(event, pictogram)}
        />)}
        {complete && <p className="vowel-sort-complete">{feedback}</p>}
      </section>
      <section className={`vowel-sort-zones vowel-sort-zones--${sounds.length}`} aria-label="Zonas de vocales">
        {sounds.map((sound) => <button
          className="vowel-sort-zone" type="button" key={sound} data-vowel-zone={sound}
          onClick={() => selectedId && place(selectedId, sound)}
          onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move' }}
          onDrop={(event) => { event.preventDefault(); place(event.dataTransfer.getData('text/rosetta-pictogram'), sound) }}
          aria-label={`Colocar en ${sound.toUpperCase()}`}
        >
          <img className="vowel-sort-zone__vowel" src={resolveAssetUrl(`images/letra ${sound}.png`)} alt={`Letra ${sound.toUpperCase()}`} />
          <span className="vowel-sort-zone__placed">{items.filter(({ id }) => placed[id] === sound).map((item) => <span className="vowel-sort-zone__item" key={item.id}><img src={resolveAssetUrl(item.image)} alt={item.label} />{showLabels && <small>{item.label}</small>}</span>)}</span>
        </button>)}
      </section>
      <p className={audioError ? 'asset-warning' : 'asset-warning asset-warning--hidden'} role="status">{audioError ? 'No se ha podido reproducir uno de los audios.' : '\u00A0'}</p>
    </main>
  )
}
