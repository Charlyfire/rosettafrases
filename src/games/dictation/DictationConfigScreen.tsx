import { useEffect, useMemo, useState } from 'react'
import { ActivityHeader } from '../../components/ActivityHeader'
import { SegmentedControl } from '../../components/SegmentedControl'
import { WrittenWordsControl } from '../../components/WrittenWordsControl'
import type {
  DictationOptionCount,
  DictationRoundCount,
  SentenceStructureType,
  SequentialDictationSettings,
} from '../../domain/activity'
import type { Pictogram } from '../../domain/content'
import type { SentenceDefinition } from '../../domain/sentence'
import { getPlayableSentences } from './dictationRounds'

interface DictationConfigScreenProps {
  pictograms: Pictogram[]
  sentences: SentenceDefinition[]
  onBack: () => void
  onStart: (settings: SequentialDictationSettings) => void
}

const optionCounts: DictationOptionCount[] = [2, 3, 4]

export function DictationConfigScreen({
  pictograms,
  sentences,
  onBack,
  onStart,
}: DictationConfigScreenProps) {
  const [optionCount, setOptionCount] = useState<DictationOptionCount>(2)
  const [actionId, setActionId] = useState('all')
  const [structure, setStructure] = useState<SentenceStructureType>('subject-action')
  const [roundCount, setRoundCount] = useState<DictationRoundCount>(3)
  const [order, setOrder] = useState<'fixed' | 'random'>('fixed')
  const [audioAutoplay, setAudioAutoplay] = useState(true)
  const [showLabels, setShowLabels] = useState(true)
  const structureSentences = useMemo(
    () => sentences.filter((sentence) => sentence.complementIds.length === (
      structure === 'subject-action' ? 0 : structure === 'subject-action-complement' ? 1 : 2
    )),
    [sentences, structure],
  )
  const actions = useMemo(() => {
    const usedActionIds = new Set(structureSentences.map((sentence) => sentence.actionId))
    return pictograms
      .filter((pictogram) => usedActionIds.has(pictogram.id))
      .sort((left, right) => left.label.localeCompare(right.label, 'es'))
  }, [pictograms, structureSentences])
  useEffect(() => {
    if (actionId !== 'all' && !actions.some(({ id }) => id === actionId)) setActionId('all')
  }, [actionId, actions])
  const filteredSentences = useMemo(
    () => actionId === 'all' ? structureSentences : structureSentences.filter((sentence) => sentence.actionId === actionId),
    [actionId, structureSentences],
  )
  const playable = useMemo(
    () => getPlayableSentences(filteredSentences, pictograms, optionCount),
    [filteredSentences, optionCount, pictograms],
  )

  return (
    <main className="screen screen--scrollable">
      <ActivityHeader title="Configurar Dictado secuenciado" subtitle="Construir" onBack={onBack} />
      <form
        className="teacher-panel"
        onSubmit={(event) => {
          event.preventDefault()
          if (playable.length === 0) return
          onStart({ actionId, structure, optionCount, roundCount, order, audioAutoplay, showLabels })
        }}
      >
        <div className="dictation-explanation">
          <strong>Secuencia</strong>
          <span>Personaje → acción → uno o dos complementos, según la estructura → punto final.</span>
        </div>
        <SegmentedControl legend="Estructura" value={structure} options={[
          { value: 'subject-action', label: 'Sujeto + verbo + punto' },
          { value: 'subject-action-complement', label: 'Sujeto + verbo + complemento + punto' },
          { value: 'subject-action-complement-y-complement', label: 'Sujeto + verbo + complemento + y + complemento + punto' },
        ]} onChange={setStructure} />
        <label className="select-field">
          <span>Contenido</span>
          <select value={actionId} onChange={(event) => setActionId(event.target.value)}>
            <option value="all">Todas las acciones</option>
            {actions.map((action) => <option value={action.id} key={action.id}>{action.label}</option>)}
          </select>
        </label>
        <SegmentedControl
          legend="Número de opciones"
          value={optionCount}
          options={optionCounts.map((count) => ({
            value: count,
            label: String(count),
            disabled: getPlayableSentences(filteredSentences, pictograms, count).length === 0,
          }))}
          onChange={setOptionCount}
        />
        <SegmentedControl
          legend="Número de frases"
          value={roundCount}
          options={[
            { value: 3, label: '3' },
            { value: 5, label: '5' },
            { value: 10, label: '10' },
          ]}
          onChange={setRoundCount}
        />
        <SegmentedControl
          legend="Orden"
          value={order}
          options={[{ value: 'fixed', label: 'Fijo' }, { value: 'random', label: 'Aleatorio' }]}
          onChange={setOrder}
        />
        <SegmentedControl
          legend="Audio"
          value={audioAutoplay ? 'automatic' : 'manual'}
          options={[{ value: 'automatic', label: 'Automático' }, { value: 'manual', label: 'Manual' }]}
          onChange={(value) => setAudioAutoplay(value === 'automatic')}
        />
        <WrittenWordsControl value={showLabels} onChange={setShowLabels} />

        <div className="teacher-panel__footer">
          <p>{playable.length} frases disponibles con {optionCount} opciones</p>
          <button className="button button--primary button--large" type="submit" disabled={playable.length === 0}>
            Iniciar dictado
          </button>
        </div>
      </form>
    </main>
  )
}
