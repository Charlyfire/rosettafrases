import { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityHeader } from '../../components/ActivityHeader'
import { AudioButton } from '../../components/AudioButton'
import { Feedback } from '../../components/Feedback'
import { OptionGrid } from '../../components/OptionGrid'
import { PictogramOption } from '../../components/PictogramOption'
import type { IntruderDifficulty } from '../../domain/activity'
import { resolveAssetUrl } from '../../content/contentRepository'
import { useAudioPlayer } from '../../hooks/useAudioPlayer'
import { positiveFeedback, retryAudioFile, wrongFeedbackAudioFile } from './recognitionAudio'
import type { IntruderRound } from './intruderRounds'

interface Props { rounds: IntruderRound[]; difficulty: IntruderDifficulty; showLabels: boolean; onExit: () => void }

export function IntruderPlayer({ rounds, difficulty, showLabels, onExit }: Props) {
  const [index, setIndex] = useState(0)
  const [attempts, setAttempts] = useState(0)
  const [correct, setCorrect] = useState(false)
  const advanceTimer = useRef<number | undefined>(undefined)
  const round = rounds[index]
  const { audioError, play } = useAudioPlayer()
  const instruction = round ? `audio/words/Todos empiezan por ${round.targetSound.toUpperCase()} menos uno.mp3` : undefined
  const playPrompt = useCallback(() => play(instruction), [instruction, play])

  useEffect(() => { if (round && !correct) playPrompt() }, [correct, playPrompt, round])
  useEffect(() => () => window.clearTimeout(advanceTimer.current), [])

  const choose = (id: string) => {
    if (!round || correct) return
    if (id === round.correctId) {
      setCorrect(true)
      play(positiveFeedback[index % positiveFeedback.length].file)
      advanceTimer.current = window.setTimeout(() => {
        setIndex((current) => current + 1)
        setAttempts(0)
        setCorrect(false)
      }, 900)
      return
    }
    const next = attempts + 1
    setAttempts(next)
    if (next >= 2) play(retryAudioFile, playPrompt)
    else play(wrongFeedbackAudioFile)
  }

  if (index >= rounds.length) return <main className="screen recognition-screen"><ActivityHeader title="Intruso" onBack={onExit} /><section className="completion-panel"><p>Actividad terminada</p><button className="button button--large" onClick={onExit}>Volver a configurar</button></section></main>
  return <main className="screen recognition-screen">
    <ActivityHeader title="¿Cuál es diferente?" subtitle={`${index + 1} de ${rounds.length}`} onBack={onExit} />
    <div className="recognition-prompt">
      {difficulty === 'clear' && <span className="recognition-letter"><img src={resolveAssetUrl(`images/letra ${round.targetSound}.png`)} alt={`Letra ${round.targetSound.toUpperCase()}`} /></span>}
      <AudioButton label="Escuchar otra vez" ariaLabel="Repetir consigna" onClick={playPrompt} />
    </div>
    <OptionGrid count={round.options.length} label="Elige el intruso">
      {round.options.map((item) => <PictogramOption key={item.id} pictogram={item} showLabel={showLabels} state={correct && item.id === round.correctId ? 'correct' : 'idle'} disabled={correct} onSelect={() => choose(item.id)} />)}
    </OptionGrid>
    <Feedback message={correct ? 'Eso es' : undefined} />
    {audioError && <p className="asset-warning" role="status">No se ha podido reproducir uno de los audios.</p>}
  </main>
}
