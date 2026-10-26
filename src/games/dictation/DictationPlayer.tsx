import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityHeader } from '../../components/ActivityHeader'
import { AudioButton } from '../../components/AudioButton'
import { ConfettiBurst } from '../../components/ConfettiBurst'
import { SentenceBoardViewport } from '../../components/SentenceBoardViewport'
import { resolveAssetUrl } from '../../content/contentRepository'
import type { AudioResource, Pictogram } from '../../domain/content'
import { positiveFeedback, retryAudioFile, wrongFeedbackAudioFile } from '../recognition/recognitionAudio'
import { sentenceWords, sentencePauses } from '../../utils/sentenceAudio'
import { useAudioPlayer } from '../../hooks/useAudioPlayer'
import type { DictationRound, SentencePart } from './dictationRounds'

interface DictationPlayerProps {
  rounds: DictationRound[]
  audioResources: AudioResource[]
  audioAutoplay: boolean
  showLabels: boolean
  onExit: () => void
}

const roleLabels: Record<SentencePart, string> = {
  subject: 'Personaje',
  action: 'Acción',
  complement: 'Complemento',
  conjunction: 'Conjunción',
  comma: 'Coma',
  punctuation: 'Final',
}

function DictationImage({ pictogram }: { pictogram: Pictogram }) {
  const [missing, setMissing] = useState(false)
  if (missing) return <span className="dictation-image-missing">PNG pendiente</span>
  return (
    <img
      src={resolveAssetUrl(pictogram.image)}
      alt=""
      draggable="false"
      onError={() => setMissing(true)}
    />
  )
}

export function DictationPlayer({ rounds, audioResources, audioAutoplay, showLabels, onExit }: DictationPlayerProps) {
  const [roundIndex, setRoundIndex] = useState(0)
  const [stepIndex, setStepIndex] = useState(0)
  const [selected, setSelected] = useState<Pictogram[]>([])
  const [attempts, setAttempts] = useState(0)
  const [wrongId, setWrongId] = useState<string>()
  const [feedback, setFeedback] = useState<string>()
  const [sentenceComplete, setSentenceComplete] = useState(false)
  const [finished, setFinished] = useState(false)
  const timerRef = useRef<number | undefined>(undefined)
  const { audioError: audioMissing, play: playFile, playCompactSequence, stop } = useAudioPlayer()

  const round = rounds[roundIndex]
  const step = round?.steps[stepIndex]
  const target = step?.options.find(({ id }) => id === step.correctId)
  const targetAudio = audioResources.find((audio) => target?.audioIds.includes(audio.id))
  const sentenceAudio = audioResources.find(({ id }) => id === round?.sentence.audioId)
  const spokenParts = useMemo(() => sentenceWords(round?.parts ?? []), [round])
  const spokenAudioFiles = useMemo(() => spokenParts.flatMap((part) => {
    const audio = audioResources.find((resource) => part.audioIds.includes(resource.id))
    return audio ? [audio.file] : []
  }), [audioResources, spokenParts])
  const playPrompt = useCallback(() => { if (targetAudio?.file) playFile(targetAudio.file) }, [playFile, targetAudio?.file])

  const playSentence = useCallback(() => {
    if (sentenceAudio?.file) {
      playFile(sentenceAudio.file)
      return
    }
    if (spokenAudioFiles.length !== spokenParts.length) {
      return
    }
    if (round.parts.some(({ id }) => id === 'coma')) playCompactSequence(spokenAudioFiles, 320, sentencePauses(round.parts))
    else playCompactSequence(spokenAudioFiles)
  }, [playCompactSequence, playFile, spokenParts.length, sentenceAudio?.file, spokenAudioFiles, round])

  useEffect(() => {
    if (audioAutoplay && step && !sentenceComplete && !finished) playPrompt()
    return () => {
      stop()
      window.clearTimeout(timerRef.current)
    }
  }, [audioAutoplay, finished, playPrompt, sentenceComplete, step, stop])

  useEffect(() => {
    if (sentenceComplete && !finished) {
      playFile(positiveFeedback[roundIndex % positiveFeedback.length].file, playSentence)
    }
  }, [finished, playFile, playSentence, roundIndex, sentenceComplete])

  const moveToNextRound = () => {
    if (roundIndex >= rounds.length - 1) {
      setFinished(true)
      return
    }
    setRoundIndex((index) => index + 1)
    setStepIndex(0)
    setSelected([])
    setAttempts(0)
    setWrongId(undefined)
    setFeedback(undefined)
    setSentenceComplete(false)
  }

  const handleCorrect = (pictogram: Pictogram) => {
    const nextSelected = [...selected, pictogram]
    setSelected(nextSelected)
    setAttempts(0)
    setWrongId(undefined)
    if (stepIndex < round.steps.length - 1) {
      stop()
      setStepIndex((index) => index + 1)
      return
    }

    const positive = positiveFeedback[roundIndex % positiveFeedback.length]
    setFeedback(positive.text)
    setSentenceComplete(true)
  }

  const handleSelect = (pictogram: Pictogram) => {
    if (!step || sentenceComplete) return
    if (pictogram.id === step.correctId) {
      handleCorrect(pictogram)
      return
    }
    const nextAttempts = attempts + 1
    setAttempts(nextAttempts)
    setWrongId(pictogram.id)
    timerRef.current = window.setTimeout(() => setWrongId(undefined), 420)
    const afterSelection = () => nextAttempts >= 2 ? playFile(retryAudioFile, playPrompt) : playFile(wrongFeedbackAudioFile)
    afterSelection()
  }

  const restart = () => {
    setRoundIndex(0)
    setStepIndex(0)
    setSelected([])
    setAttempts(0)
    setWrongId(undefined)
    setFeedback(undefined)
    setSentenceComplete(false)
    setFinished(false)
  }

  if (finished) {
    return (
      <main className="screen sentence-workspace sentence-exercise-screen dictation-screen">
        <ActivityHeader title="Dictado secuenciado" onBack={onExit} />
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

  if (!round || !step || !target) return null

  const boardSlots = round.steps.map((roundStep, index) => ({ role: roundStep.role, pictogram: selected[index] }))

  return (
    <main className="screen sentence-workspace sentence-exercise-screen dictation-screen">
      <ActivityHeader title="Dictado secuenciado" subtitle={`Actividad ${roundIndex + 1} de ${rounds.length}`} onBack={onExit} />
      <ConfettiBurst active={sentenceComplete} />
      <SentenceBoardViewport
        slots={boardSlots}
        activeIndex={sentenceComplete ? undefined : stepIndex}
        ariaLabel="Frase construida"
        showLabels={showLabels}
      />

      {!sentenceComplete ? (
        <>
          {targetAudio ? <AudioButton className="dictation-audio-button" label="Escuchar" ariaLabel="Escuchar palabra otra vez" onClick={playPrompt} /> : <p className="teacher-oral-prompt">{step.role === 'comma' ? 'Coloca la coma.' : `Audio plural pendiente: «${target.label}». Dictado oral del docente.`}</p>}
          <section className={`dictation-options dictation-options--${step.options.length}`} aria-label={`Elige ${roleLabels[step.role].toLowerCase()}`}>
            {step.options.map((pictogram) => (
              <div className="pictogram-card" key={`${round.id}-${stepIndex}-${pictogram.id}`}>
                <button
                  className={`dictation-option ${wrongId === pictogram.id ? 'dictation-option--try-again' : ''}`}
                  type="button"
                  onClick={() => handleSelect(pictogram)}
                  aria-label={pictogram.label}
                >
                  <span className="dictation-option__visual"><DictationImage pictogram={pictogram} /></span>
                  {showLabels && <strong>{pictogram.label}</strong>}
                </button>
                <AudioButton className="pictogram-card__listen" disabled={!audioResources.some((audio) => pictogram.audioIds.includes(audio.id))} label="Escuchar" ariaLabel={`Escuchar ${pictogram.label}`} onClick={() => playFile(audioResources.find((audio) => pictogram.audioIds.includes(audio.id))?.file)} />
              </div>
            ))}
          </section>
        </>
      ) : (
        <section className={round.sentence.sceneImage ? 'dictation-result' : 'dictation-result dictation-result--without-scene'}>
          {round.sentence.sceneImage && <img src={resolveAssetUrl(round.sentence.sceneImage)} alt="" />}
          <p>{feedback}</p>
          <div className="button-row">
            <button className="button" type="button" disabled={!sentenceAudio && spokenAudioFiles.length !== spokenParts.length} onClick={playSentence}>Repetir frase</button>
            <button className="button button--primary" type="button" onClick={moveToNextRound}>
              {roundIndex === rounds.length - 1 ? 'Terminar' : 'Siguiente actividad'}
            </button>
          </div>
        </section>
      )}
      {sentenceComplete && spokenAudioFiles.length !== spokenParts.length && <p className="teacher-oral-prompt">Audio plural pendiente. El docente puede leer la oración completa.</p>}
      <p className={audioMissing ? 'asset-warning' : 'asset-warning asset-warning--hidden'} role="status">
        {audioMissing ? 'Hay un audio pendiente o el navegador ha bloqueado su reproducción.' : ' '}
      </p>
    </main>
  )
}
