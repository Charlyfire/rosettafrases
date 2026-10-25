import { useCallback, useEffect, useMemo, useState, type DragEvent } from 'react'
import { ActivityHeader } from '../../components/ActivityHeader'
import { AudioButton } from '../../components/AudioButton'
import { Feedback } from '../../components/Feedback'
import { PictogramOption } from '../../components/PictogramOption'
import { SentenceStructureBoard, type SentenceBoardSlot } from '../../components/SentenceStructureBoard'
import { resolveAssetUrl } from '../../content/contentRepository'
import type { AudioResource, Pictogram } from '../../domain/content'
import { useAudioPlayer } from '../../hooks/useAudioPlayer'
import { positiveFeedback, retryAudioFile, wrongFeedbackAudioFile } from '../recognition/recognitionAudio'
import type { SentenceGameMode, SentenceGameRound } from './sentenceGameRounds'

interface Props { mode: SentenceGameMode; rounds: SentenceGameRound[]; audioResources: AudioResource[]; showLabels: boolean; onExit: () => void }

const titles: Record<SentenceGameMode, string> = {
  'complete-dictation': 'Dictado completo',
  'sentence-order': 'Ordenar frase',
  'scene-sentence': 'Construye la frase',
}

export function SentenceGamePlayer({ mode, rounds, audioResources, showLabels, onExit }: Props) {
  const [roundIndex, setRoundIndex] = useState(0)
  const [selected, setSelected] = useState<typeof rounds[number]['parts']>([])
  const [attempts, setAttempts] = useState(0)
  const [feedback, setFeedback] = useState<string>()
  const [oralReady, setOralReady] = useState(false)
  const round = rounds[roundIndex]
  const { audioError, play, playCompactSequence, stop } = useAudioPlayer()
  const audioById = useMemo(() => new Map(audioResources.map((item) => [item.id, item.file])), [audioResources])
  const sentenceAudio = round?.audioId ? audioById.get(round.audioId) : undefined
  const audioFileFor = useCallback((pictogram: Pictogram) =>
    pictogram.audioIds.map((id) => audioById.get(id)).find(Boolean), [audioById])
  const partAudioFiles = useMemo(() => (round?.parts ?? []).flatMap((part) => audioFileFor(part) ? [audioFileFor(part) as string] : []), [audioFileFor, round])
  const pointAudioFile = useMemo(() => {
    const point = round?.parts.find(({ id }) => id === 'punto')
    return point ? audioFileFor(point) : undefined
  }, [audioFileFor, round])
  const complete = Boolean(round && selected.length === round.parts.length)

  const playSentence = useCallback(() => {
    if (sentenceAudio) play(sentenceAudio, () => pointAudioFile && play(pointAudioFile))
    else if (mode !== 'complete-dictation' && round && partAudioFiles.length === round.parts.length) playCompactSequence(partAudioFiles)
  }, [mode, partAudioFiles, play, playCompactSequence, pointAudioFile, round, sentenceAudio])

  useEffect(() => {
    stop()
    setSelected([])
    setAttempts(0)
    setFeedback(undefined)
    setOralReady(Boolean(sentenceAudio))
    if (mode === 'complete-dictation' && sentenceAudio) playSentence()
  }, [mode, playSentence, roundIndex, sentenceAudio, stop])

  const choose = (id: string) => {
    if (!round || complete) return
    const expected = round.parts[selected.length]
    if (id !== expected.id) {
      const chosen = round.options.find((item) => item.id === id)
      const next = attempts + 1
      setAttempts(next)
      const afterWord = () => next >= 2
        ? play(retryAudioFile, mode === 'complete-dictation' ? playSentence : undefined)
        : play(wrongFeedbackAudioFile)
      const chosenAudio = chosen ? audioFileFor(chosen) : undefined
      if (chosenAudio) play(chosenAudio, afterWord)
      else afterWord()
      return
    }
    setSelected((current) => [...current, expected])
    setAttempts(0)
    play(audioFileFor(expected))
    if (selected.length + 1 === round.parts.length) {
      setFeedback(positiveFeedback[0].text)
      if (expected.id !== 'punto') play(positiveFeedback[0].file)
    }
  }

  if (!round) return <main className="screen"><ActivityHeader title={titles[mode]} onBack={onExit} /><section className="completion-panel"><p>Actividad terminada</p><button className="button button--large" onClick={onExit}>Volver a configurar</button></section></main>
  if (mode === 'complete-dictation' && !sentenceAudio && !oralReady) {
    const teacherWords = round.parts.filter(({ id }) => id !== 'punto').map(({ label }) => label).join(' ')
    return <main className="screen sentence-game-screen teacher-oral-screen">
      <ActivityHeader title="Dictado completo" subtitle={`${roundIndex + 1} de ${rounds.length}`} onBack={onExit} />
      <section className="teacher-oral-card"><span>Solo para el docente</span><p>{teacherWords}.</p><button className="button button--primary button--large" onClick={() => setOralReady(true)}>Ocultar e iniciar</button></section>
    </main>
  }
  const roles = round.roles
  const slots: SentenceBoardSlot[] = roles.map((role, index) => ({ role, pictogram: selected[index] }))
  const remaining = round.options.filter((item) => !selected.some(({ id }) => id === item.id))

  return <main className={`screen sentence-game-screen sentence-game-screen--${mode}`}>
    <ActivityHeader title={titles[mode]} subtitle={`${roundIndex + 1} de ${rounds.length}`} onBack={onExit} />
    {mode === 'scene-sentence' && round.sceneImage && <img className="sentence-game-scene" src={resolveAssetUrl(round.sceneImage)} alt="Escena de la frase" />}
    {mode === 'complete-dictation' && (sentenceAudio
      ? <AudioButton label="Escuchar frase" ariaLabel="Repetir la frase completa" onClick={playSentence} />
      : <p className="teacher-oral-prompt">Dictado oral del docente</p>)}
    <SentenceStructureBoard slots={slots} activeIndex={complete ? undefined : selected.length} onDropPictogram={complete ? undefined : choose} showLabels={showLabels} />
    {!complete && <section className={`sentence-game-options sentence-game-options--${Math.min(remaining.length, 8)}`} aria-label="Pictogramas disponibles">
      {remaining.map((item) => <PictogramOption key={item.id} pictogram={item} showLabel={showLabels} onSelect={() => choose(item.id)} draggable onDragStart={(event: DragEvent<HTMLButtonElement>) => event.dataTransfer.setData('text/rosetta-pictogram', item.id)} />)}
    </section>}
    {complete && <nav className="game-controls"><button className="button" onClick={() => { setSelected([]); setFeedback(undefined) }}>Repetir</button>{(sentenceAudio || (mode !== 'complete-dictation' && partAudioFiles.length === round.parts.length)) && <AudioButton label="Leer frase" ariaLabel="Leer la frase completa" onClick={playSentence} />}<button className="button button--primary" onClick={() => setRoundIndex((value) => value + 1)}>Siguiente frase</button></nav>}
    <Feedback message={feedback} />
    {audioError && <p className="asset-warning" role="status">No se ha podido reproducir uno de los audios.</p>}
  </main>
}
