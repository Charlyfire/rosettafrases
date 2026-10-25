import { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityHeader } from '../../components/ActivityHeader'
import { AudioButton } from '../../components/AudioButton'
import { Feedback } from '../../components/Feedback'
import { OptionGrid } from '../../components/OptionGrid'
import { PictogramOption } from '../../components/PictogramOption'
import { resolveAssetUrl } from '../../content/contentRepository'
import type { VowelSound } from '../../domain/activity'
import type { AudioResource, Pictogram } from '../../domain/content'
import { useAudioPlayer } from '../../hooks/useAudioPlayer'
import {
  initialSoundInstructionFiles,
  positiveFeedback,
  retryAudioFile,
} from './recognitionAudio'
import type { RecognitionRound } from './recognitionRounds'

interface RecognitionPlayerProps {
  mode: 'listen-and-find' | 'initial-sound'
  rounds: RecognitionRound[]
  audioResources: AudioResource[]
  audioAutoplay: boolean
  targetSound?: VowelSound
  allowRepeatAudio?: boolean
  feedbackAudio?: boolean
  showLabels?: boolean
  onExit: () => void
}

export function RecognitionPlayer({
  mode,
  rounds,
  audioResources,
  audioAutoplay,
  targetSound,
  allowRepeatAudio = true,
  feedbackAudio = true,
  showLabels = false,
  onExit,
}: RecognitionPlayerProps) {
  const [roundIndex, setRoundIndex] = useState(0)
  const [attempts, setAttempts] = useState(0)
  const [wrongId, setWrongId] = useState<string>()
  const [correctId, setCorrectId] = useState<string>()
  const [feedback, setFeedback] = useState<string>()
  const [finished, setFinished] = useState(false)
  const transitionTimerRef = useRef<number | undefined>(undefined)
  const wrongTimerRef = useRef<number | undefined>(undefined)
  const { audioError: audioMissing, play: playFile, stop } = useAudioPlayer()

  const round = rounds[roundIndex]
  const correctPictogram = round?.options.find(({ id }) => id === round.correctId)
  const wordAudio = audioResources.find((audio) =>
    correctPictogram?.audioIds.includes(audio.id),
  )
  const promptFile = mode === 'initial-sound' && targetSound
    ? initialSoundInstructionFiles[targetSound]
    : wordAudio?.file

  const playPrompt = useCallback(() => playFile(promptFile), [playFile, promptFile])

  useEffect(() => {
    if (audioAutoplay && round && !finished) playPrompt()
    return () => {
      stop()
      window.clearTimeout(transitionTimerRef.current)
      window.clearTimeout(wrongTimerRef.current)
    }
  }, [audioAutoplay, finished, playPrompt, round, stop])

  const nextRound = () => {
    if (roundIndex >= rounds.length - 1) {
      setFinished(true)
      return
    }
    setRoundIndex((index) => index + 1)
    setAttempts(0)
    setWrongId(undefined)
    setCorrectId(undefined)
    setFeedback(undefined)
  }

  const handleSelect = (pictogram: Pictogram) => {
    if (!round || correctId) return
    if (pictogram.id === round.correctId) {
      const positive = positiveFeedback[roundIndex % positiveFeedback.length]
      setCorrectId(pictogram.id)
      setWrongId(undefined)
      setFeedback(positive.text)
      if (feedbackAudio) playFile(positive.file)
      transitionTimerRef.current = window.setTimeout(nextRound, 1200)
      return
    }

    const nextAttempts = attempts + 1
    setAttempts(nextAttempts)
    setWrongId(pictogram.id)
    wrongTimerRef.current = window.setTimeout(() => setWrongId(undefined), 420)
    if (nextAttempts >= 2) {
      playFile(retryAudioFile, playPrompt)
    }
  }

  const restart = () => {
    setRoundIndex(0)
    setAttempts(0)
    setWrongId(undefined)
    setCorrectId(undefined)
    setFeedback(undefined)
    setFinished(false)
  }

  if (finished) {
    return (
      <main className="screen recognition-screen">
        <ActivityHeader title="Reconocer" onBack={onExit} />
        <section className="completion-panel">
          <p>Actividad terminada</p>
          <div className="button-row">
            <button className="button button--primary button--large" type="button" onClick={restart}>Repetir</button>
            <button className="button button--large" type="button" onClick={onExit}>Volver a configurar</button>
          </div>
        </section>
      </main>
    )
  }

  if (!round) return null

  const title = mode === 'initial-sound' ? 'Sonido inicial' : 'Escucha y encuentra'
  return (
    <main className="screen recognition-screen">
      <ActivityHeader title={title} subtitle={`${roundIndex + 1} de ${rounds.length}`} onBack={onExit} />
      <section className="recognition-prompt">
        {mode === 'initial-sound' && targetSound && (
          <div className="recognition-letter">
            <img src={resolveAssetUrl(`images/letra ${targetSound}.png`)} alt={`Letra ${targetSound.toUpperCase()}`} />
          </div>
        )}
        {allowRepeatAudio && <AudioButton label={mode === 'initial-sound' && targetSound ? `¿Cuál empieza por ${targetSound.toUpperCase()}?` : 'Escuchar otra vez'} ariaLabel="Repetir consigna" onClick={playPrompt} />}
      </section>

      <OptionGrid count={round.options.length} label="Opciones">
        {round.options.map((pictogram) => (
          <PictogramOption
            key={`${round.id}-${pictogram.id}`}
            pictogram={pictogram}
            showLabel={showLabels}
            disabled={Boolean(correctId)}
            state={correctId === pictogram.id ? 'correct' : wrongId === pictogram.id ? 'try-again' : 'idle'}
            onSelect={() => handleSelect(pictogram)}
          />
        ))}
      </OptionGrid>

      <Feedback message={feedback} />
      <p className={audioMissing ? 'asset-warning' : 'asset-warning asset-warning--hidden'} role="status">
        {audioMissing ? 'Hay un audio pendiente o el navegador ha bloqueado su reproducción.' : '\u00A0'}
      </p>
    </main>
  )
}
