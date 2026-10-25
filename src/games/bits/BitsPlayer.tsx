import { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityHeader } from '../../components/ActivityHeader'
import { PictureCard } from '../../components/PictureCard'
import { resolveAssetUrl } from '../../content/contentRepository'
import { contentTypeLabels } from '../../content/contentFilters'
import type { BitsSettings } from '../../domain/activity'
import type { AudioResource, Pictogram } from '../../domain/content'
import { useAudioPlayer } from '../../hooks/useAudioPlayer'
import { prepareBits } from './bitsUtils'

interface BitsPlayerProps {
  pictograms: Pictogram[]
  audioResources: AudioResource[]
  settings: BitsSettings
  onExit: () => void
}

type PlayerIconName = 'previous' | 'next' | 'pause' | 'play' | 'audio'

function PlayerIcon({ name }: { name: PlayerIconName }) {
  if (name === 'audio') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 9v6h4l5 4V5L8 9H4Z" />
        <path d="M16 9.2a4 4 0 0 1 0 5.6M18.5 6.7a7.5 7.5 0 0 1 0 10.6" />
      </svg>
    )
  }
  if (name === 'pause') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6v12M16 6v12" /></svg>
  }
  if (name === 'play') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 9 6-9 6V6Z" /></svg>
  }
  const isNext = name === 'next'
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={isNext ? 'm9 5 7 7-7 7' : 'm15 5-7 7 7 7'} />
    </svg>
  )
}

export function BitsPlayer({ pictograms, audioResources, settings, onExit }: BitsPlayerProps) {
  const bits = useMemo(
    () => prepareBits(pictograms, settings.order, settings.quantity),
    [pictograms, settings.order, settings.quantity],
  )
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(settings.playback === 'manual')
  const [finished, setFinished] = useState(false)
  const { audioError, play: playAudioFile, stop } = useAudioPlayer()

  const current = bits[index]
  const currentAudio = audioResources.find((audio) => current?.audioIds.includes(audio.id))
  const currentSound = current?.initialSound as string | undefined
  const initialSoundImage = resolveAssetUrl(`images/letra ${currentSound}.png`)

  const playAudio = useCallback(() => {
    playAudioFile(currentAudio?.file)
  }, [currentAudio?.file, playAudioFile])

  useEffect(() => {
    if (settings.audioAutoplay && current) playAudio()
    return stop
  }, [current, playAudio, settings.audioAutoplay, stop])

  useEffect(() => {
    if (settings.playback !== 'automatic' || paused || finished) return
    const timer = window.setTimeout(() => {
      if (index === bits.length - 1) setFinished(true)
      else setIndex((value) => value + 1)
    }, settings.intervalMs)
    return () => window.clearTimeout(timer)
  }, [bits.length, finished, index, paused, settings.intervalMs, settings.playback])

  const goPrevious = () => {
    setFinished(false)
    setIndex((value) => Math.max(0, value - 1))
  }
  const goNext = () => {
    if (index === bits.length - 1) setFinished(true)
    else setIndex((value) => value + 1)
  }
  const restart = () => {
    setIndex(0)
    setFinished(false)
    setPaused(settings.playback === 'manual')
  }

  if (finished) {
    return (
      <main className="screen bits-screen">
        <ActivityHeader title="Bits" onBack={onExit} />
        <section className="completion-panel">
          <p>Presentación terminada</p>
          <div className="button-row">
            <button className="button button--primary button--large" type="button" onClick={restart}>Repetir</button>
            <button className="button button--large" type="button" onClick={onExit}>Volver a configurar</button>
          </div>
        </section>
      </main>
    )
  }

  if (!current) return null

  return (
    <main className="screen bits-screen">
      <ActivityHeader
        title={contentTypeLabels[settings.contentType]}
        subtitle={`${index + 1} de ${bits.length}`}
        onBack={onExit}
      />
        {settings.contentType === 'initial-sound-words' && settings.showPersistentSound && currentSound && (
        <div className="persistent-sound">
          <img
            src={initialSoundImage}
            alt={`Letra ${currentSound.toUpperCase()}`}
            draggable="false"
          />
        </div>
      )}
      <div className="bits-stage" aria-live="polite">
        <PictureCard key={current.id} pictogram={current} showLabel={settings.showLabel} />
      </div>
      <nav className="player-controls" aria-label="Controles de la presentación">
        <button className="player-button" type="button" onClick={goPrevious} disabled={index === 0} aria-label="Anterior">
          <PlayerIcon name="previous" />
        </button>
        {settings.playback === 'automatic' && (
          <button className="player-button" type="button" onClick={() => setPaused((value) => !value)} aria-label={paused ? 'Reanudar' : 'Pausa'}>
            <PlayerIcon name={paused ? 'play' : 'pause'} />
          </button>
        )}
        <button className="player-button player-button--audio" type="button" onClick={playAudio} aria-label="Repetir audio">
          <PlayerIcon name="audio" />
          <span>Repetir audio</span>
        </button>
        <button className="player-button" type="button" onClick={goNext} aria-label="Siguiente">
          <PlayerIcon name="next" />
        </button>
      </nav>
      <p className={audioError ? 'asset-warning' : 'asset-warning asset-warning--hidden'} role="status">
        {audioError ? 'No se ha podido reproducir el audio. Pulsa «Repetir audio» para intentarlo de nuevo.' : '\u00A0'}
      </p>
    </main>
  )
}
