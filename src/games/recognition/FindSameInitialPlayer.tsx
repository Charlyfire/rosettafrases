import { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityHeader } from '../../components/ActivityHeader'
import { AudioButton } from '../../components/AudioButton'
import { Feedback } from '../../components/Feedback'
import { OptionGrid } from '../../components/OptionGrid'
import { PictogramOption } from '../../components/PictogramOption'
import { resolveAssetUrl } from '../../content/contentRepository'
import type { AudioResource, Pictogram } from '../../domain/content'
import { useAudioPlayer } from '../../hooks/useAudioPlayer'
import type { FindSameInitialRound } from './findSameInitialRounds'
import { positiveFeedback, retryAudioFile, wrongFeedbackAudioFile } from './recognitionAudio'

interface Props {
  rounds: FindSameInitialRound[]
  audioResources: AudioResource[]
  audioAutoplay: boolean
  showVowelSupport: boolean
  showLabels: boolean
  onExit: () => void
}

export function FindSameInitialPlayer({ rounds, audioResources, audioAutoplay, showVowelSupport, showLabels, onExit }: Props) {
  const [roundIndex, setRoundIndex] = useState(0)
  const [attempts, setAttempts] = useState(0)
  const [wrongId, setWrongId] = useState<string>()
  const [correctId, setCorrectId] = useState<string>()
  const [feedback, setFeedback] = useState<string>()
  const [finished, setFinished] = useState(false)
  const advanceRef = useRef<number | undefined>(undefined)
  const wrongRef = useRef<number | undefined>(undefined)
  const { audioError, play, playSequence } = useAudioPlayer()
  const round = rounds[roundIndex]
  const audioFileFor = useCallback((pictogram?: Pictogram) =>
    audioResources.find((audio) => pictogram?.audioIds.includes(audio.id))?.file,
  [audioResources])
  const playPrompt = useCallback(() => {
    const modelFile = audioFileFor(round?.model)
    playSequence(['audio/words/Busca otra palabra que empiece igual.mp3', ...(modelFile ? [modelFile] : [])])
  }, [audioFileFor, playSequence, round])

  const nextRound = useCallback(() => {
    if (roundIndex >= rounds.length - 1) { setFinished(true); return }
    setRoundIndex((index) => index + 1); setAttempts(0); setWrongId(undefined)
    setCorrectId(undefined); setFeedback(undefined)
  }, [roundIndex, rounds.length])

  useEffect(() => { if (audioAutoplay && round && !correctId && !finished) playPrompt() }, [audioAutoplay, correctId, finished, playPrompt, round])
  useEffect(() => () => { window.clearTimeout(advanceRef.current); window.clearTimeout(wrongRef.current) }, [])

  const choose = (pictogram: Pictogram) => {
    if (!round || correctId) return
    if (pictogram.id === round.correctId) {
      const positive = positiveFeedback[roundIndex % positiveFeedback.length]
      setCorrectId(pictogram.id); setFeedback(positive.text); play(positive.file)
      advanceRef.current = window.setTimeout(nextRound, 1200)
      return
    }
    const nextAttempts = attempts + 1
    setAttempts(nextAttempts); setWrongId(pictogram.id)
    wrongRef.current = window.setTimeout(() => setWrongId(undefined), 420)
    if (nextAttempts >= 2) play(retryAudioFile, playPrompt)
    else play(wrongFeedbackAudioFile)
  }

  if (finished) return <main className="screen recognition-screen"><ActivityHeader title="Busca otra que empiece igual" onBack={onExit} /><section className="completion-panel"><p>Actividad terminada</p><button className="button button--large" type="button" onClick={onExit}>Volver a configurar</button></section></main>
  if (!round) return null

  return (
    <main className="screen recognition-screen find-same-screen">
      <ActivityHeader title="Busca otra que empiece igual" subtitle={`${roundIndex + 1} de ${rounds.length}`} onBack={onExit} />
      <section className="recognition-prompt">
        {showVowelSupport && <div className="recognition-letter"><img src={resolveAssetUrl(`images/letra ${round.targetSound}.png`)} alt={`Letra ${round.targetSound.toUpperCase()}`} /></div>}
        <AudioButton label="Escuchar otra vez" ariaLabel="Repetir la palabra modelo" onClick={playPrompt} />
      </section>
      <section className="find-same-stage">
        <figure className="initial-model__picture find-same-model"><img src={resolveAssetUrl(round.model.image)} alt={round.model.label} />{showLabels && <figcaption>{round.model.label}</figcaption>}</figure>
        <OptionGrid count={round.options.length} label="Busca otra palabra">
          {round.options.map((pictogram) => <PictogramOption key={pictogram.id} pictogram={pictogram} showLabel={showLabels} disabled={Boolean(correctId)} state={correctId === pictogram.id ? 'correct' : wrongId === pictogram.id ? 'try-again' : 'idle'} onSelect={() => choose(pictogram)} />)}
        </OptionGrid>
      </section>
      <Feedback message={feedback} />
      <p className={audioError ? 'asset-warning' : 'asset-warning asset-warning--hidden'} role="status">{audioError ? 'No se ha podido reproducir uno de los audios.' : '\u00A0'}</p>
    </main>
  )
}
