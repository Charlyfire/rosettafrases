import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityHeader } from '../../components/ActivityHeader'
import { AudioButton } from '../../components/AudioButton'
import { Feedback } from '../../components/Feedback'
import { OptionGrid } from '../../components/OptionGrid'
import { PictogramOption } from '../../components/PictogramOption'
import { resolveAssetUrl } from '../../content/contentRepository'
import type { InitialSoundVariant } from '../../domain/activity'
import type { AudioResource, Pictogram } from '../../domain/content'
import { useAudioPlayer } from '../../hooks/useAudioPlayer'
import type { InitialSoundRound } from './initialSoundRounds'
import {
  findWordsInstructionFiles,
  listenHowItStartsAudioFile,
  positiveFeedback,
  retryAudioFile,
  sameSoundInstructionAudioFile,
  wrongFeedbackAudioFile,
} from './recognitionAudio'

interface InitialSoundPlayerProps {
  variant: InitialSoundVariant
  rounds: InitialSoundRound[]
  audioResources: AudioResource[]
  audioAutoplay: boolean
  showVowelSupport: boolean
  feedbackAudio: boolean
  showLabels: boolean
  onExit: () => void
}

const variantTitles: Record<InitialSoundVariant, string> = {
  'which-vowel': '¿Por qué empieza?',
  'find-words': 'Busca las palabras',
  'same-sound': '¿Empiezan igual?',
  'listen-start': 'Escucha cómo empieza',
}

function ModelPicture({ pictogram, showLabel }: { pictogram: Pictogram; showLabel: boolean }) {
  return (
    <figure className={showLabel ? 'initial-model__picture' : 'initial-model__picture initial-model__picture--without-label'}>
      <img src={resolveAssetUrl(pictogram.image)} alt={pictogram.label} draggable="false" />
      {showLabel && <figcaption>{pictogram.label}</figcaption>}
    </figure>
  )
}

export function InitialSoundPlayer({
  variant, rounds, audioResources, audioAutoplay, showVowelSupport, feedbackAudio, showLabels, onExit,
}: InitialSoundPlayerProps) {
  const [roundIndex, setRoundIndex] = useState(0)
  const [attempts, setAttempts] = useState(0)
  const [wrongId, setWrongId] = useState<string>()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [feedback, setFeedback] = useState<string>()
  const [complete, setComplete] = useState(false)
  const [finished, setFinished] = useState(false)
  const advanceTimerRef = useRef<number | undefined>(undefined)
  const wrongTimerRef = useRef<number | undefined>(undefined)
  const { audioError, play, playSequence } = useAudioPlayer()
  const round = rounds[roundIndex]

  const audioFileFor = useCallback((pictogram?: Pictogram) => {
    const resource = audioResources.find((audio) => pictogram?.audioIds.includes(audio.id))
    return resource?.file
  }, [audioResources])

  const promptFiles = useMemo(() => {
    if (!round) return []
    if (round.kind === 'find-words') return [findWordsInstructionFiles[round.targetSound]]
    if (round.kind === 'same-sound') {
      return [sameSoundInstructionAudioFile, ...round.models.flatMap((model) => audioFileFor(model) ? [audioFileFor(model) as string] : [])]
    }
    const wordFile = audioFileFor(round.model)
    if (variant === 'which-vowel') {
      return [listenHowItStartsAudioFile, ...(wordFile ? [wordFile] : [])]
    }
    if (variant !== 'listen-start') return wordFile ? [wordFile] : []
    const vowel = round.options.find(({ id }) => id === round.correctId)
    const vowelFile = audioFileFor(vowel)
    const isIsolatedVowel = round.model.categories.includes('vowel')
    return [
      listenHowItStartsAudioFile,
      ...(vowelFile ? [vowelFile] : []),
      ...(!isIsolatedVowel && wordFile ? [wordFile] : []),
    ]
  }, [audioFileFor, round, variant])

  const playPrompt = useCallback(() => playSequence(promptFiles), [playSequence, promptFiles])

  useEffect(() => {
    if (audioAutoplay && round && !complete && !finished) playPrompt()
  }, [audioAutoplay, complete, finished, playPrompt, round])

  useEffect(() => () => {
    window.clearTimeout(advanceTimerRef.current)
    window.clearTimeout(wrongTimerRef.current)
  }, [])

  const nextRound = () => {
    if (roundIndex >= rounds.length - 1) {
      setFinished(true)
      return
    }
    setRoundIndex((index) => index + 1)
    setAttempts(0)
    setWrongId(undefined)
    setSelectedIds([])
    setFeedback(undefined)
    setComplete(false)
  }

  const finishRound = () => {
    const positive = positiveFeedback[roundIndex % positiveFeedback.length]
    setComplete(true)
    setFeedback(positive.text)
    if (feedbackAudio) play(positive.file)
    advanceTimerRef.current = window.setTimeout(nextRound, 1200)
  }

  const wrongAttempt = (id: string) => {
    const nextAttempts = attempts + 1
    setAttempts(nextAttempts)
    setWrongId(id)
    wrongTimerRef.current = window.setTimeout(() => setWrongId(undefined), 420)
    if (nextAttempts >= 2) play(retryAudioFile, playPrompt)
    else play(wrongFeedbackAudioFile)
  }

  const selectPictogram = (pictogram: Pictogram) => {
    if (!round || complete) return
    if (round.kind === 'vowel-choice') {
      if (pictogram.id === round.correctId) {
        setSelectedIds([pictogram.id])
        finishRound()
      } else wrongAttempt(pictogram.id)
      return
    }
    if (round.kind === 'find-words') {
      if (!round.correctIds.includes(pictogram.id)) {
        wrongAttempt(pictogram.id)
        return
      }
      const next = [...new Set([...selectedIds, pictogram.id])]
      setSelectedIds(next)
      if (round.correctIds.every((id) => next.includes(id))) finishRound()
    }
  }

  const selectBinary = (answer: 'yes' | 'no') => {
    if (!round || round.kind !== 'same-sound' || complete) return
    if (answer === round.correctAnswer) {
      setSelectedIds([answer])
      finishRound()
    } else wrongAttempt(answer)
  }

  const restart = () => {
    setRoundIndex(0); setAttempts(0); setWrongId(undefined); setSelectedIds([])
    setFeedback(undefined); setComplete(false); setFinished(false)
  }

  if (finished) return (
    <main className="screen recognition-screen"><ActivityHeader title="Sonido inicial" onBack={onExit} /><section className="completion-panel"><p>Actividad terminada</p><div className="button-row"><button className="button button--primary button--large" type="button" onClick={restart}>Repetir</button><button className="button button--large" type="button" onClick={onExit}>Volver a configurar</button></div></section></main>
  )
  if (!round) return null

  const targetSound = round.kind === 'find-words' ? round.targetSound : undefined
  return (
    <main className={`screen recognition-screen initial-sound-screen initial-sound-screen--${variant}`}>
      <ActivityHeader title={variantTitles[variant]} subtitle={`${roundIndex + 1} de ${rounds.length}`} onBack={onExit} />
      <section className="recognition-prompt">
        {round.kind === 'find-words' && showVowelSupport && targetSound && <div className="recognition-letter"><img src={resolveAssetUrl(`images/letra ${targetSound}.png`)} alt={`Letra ${targetSound.toUpperCase()}`} /></div>}
        <AudioButton label={round.kind === 'find-words' ? `Palabras que empiezan por ${targetSound?.toUpperCase()}` : 'Escuchar otra vez'} ariaLabel="Repetir consigna" onClick={playPrompt} />
      </section>
      <section className={`initial-activity-stage initial-activity-stage--${round.kind} ${round.kind === 'vowel-choice' ? 'initial-activity-stage--vowel-row' : ''}`}>
        {round.kind === 'vowel-choice' && <div className="initial-model"><ModelPicture pictogram={round.model} showLabel={showLabels} /></div>}
        {round.kind === 'same-sound' && <div className="same-sound-models">{round.models.map((model) => <ModelPicture pictogram={model} showLabel={showLabels} key={model.id} />)}</div>}
        {round.kind !== 'same-sound' ? (
          <OptionGrid count={round.options.length} label="Opciones">
            {round.options.map((pictogram) => <PictogramOption key={pictogram.id} pictogram={pictogram} showLabel={showLabels} disabled={complete || selectedIds.includes(pictogram.id)} state={selectedIds.includes(pictogram.id) ? 'correct' : wrongId === pictogram.id ? 'try-again' : 'idle'} onSelect={() => selectPictogram(pictogram)} />)}
          </OptionGrid>
        ) : (
          <div className="binary-options" aria-label="Respuesta">
            {(['yes', 'no'] as const).map((answer) => <button className={`binary-option binary-option--${answer} ${selectedIds.includes(answer) ? 'binary-option--correct' : ''} ${wrongId === answer ? 'binary-option--try-again' : ''}`} type="button" key={answer} onClick={() => selectBinary(answer)} disabled={complete} aria-label={answer === 'yes' ? 'Empiezan igual' : 'No empiezan igual'}>{answer === 'yes' ? '✓' : '✕'}</button>)}
          </div>
        )}
      </section>
      <Feedback message={feedback} />
      <p className={audioError ? 'asset-warning' : 'asset-warning asset-warning--hidden'} role="status">{audioError ? 'Hay un audio pendiente o el navegador ha bloqueado su reproducción.' : '\u00A0'}</p>
    </main>
  )
}
