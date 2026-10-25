import { useMemo, useState } from 'react'
import { ActivityHeader } from '../../components/ActivityHeader'
import { SegmentedControl } from '../../components/SegmentedControl'
import { WrittenWordsControl } from '../../components/WrittenWordsControl'
import type { DictationOptionCount, DictationRoundCount, SentenceGameSettings } from '../../domain/activity'
import type { Pictogram } from '../../domain/content'
import type { SentenceDefinition } from '../../domain/sentence'
import { buildSentenceGameRounds, type SentenceGameMode } from './sentenceGameRounds'

interface Props {
  mode: SentenceGameMode
  pictograms: Pictogram[]
  sentences: SentenceDefinition[]
  onBack: () => void
  onStart: (settings: SentenceGameSettings) => void
}

const titles: Record<SentenceGameMode, string> = {
  'complete-dictation': 'Dictado completo',
  'sentence-order': 'Ordenar frase',
  'scene-sentence': 'Construir frase a partir de imagen',
}

export function SentenceGameConfigScreen({ mode, pictograms, sentences, onBack, onStart }: Props) {
  const [structure, setStructure] = useState<SentenceGameSettings['structure']>('subject-action')
  const [optionCount, setOptionCount] = useState<DictationOptionCount>(2)
  const [roundCount, setRoundCount] = useState<DictationRoundCount>(3)
  const [order, setOrder] = useState<'fixed' | 'random'>('random')
  const [showLabels, setShowLabels] = useState(true)
  const settings = { structure, optionCount, roundCount, order, showLabels }
  const rounds = useMemo(() => buildSentenceGameRounds(sentences, pictograms, settings, mode), [mode, optionCount, order, pictograms, roundCount, sentences, structure])

  return <main className="screen screen--scrollable">
    <ActivityHeader title={`Configurar ${titles[mode]}`} subtitle="Construir" onBack={onBack} />
    <form className="teacher-panel" onSubmit={(event) => { event.preventDefault(); if (rounds.length) onStart(settings) }}>
      <SegmentedControl legend="Estructura" value={structure} options={[
        { value: 'subject-action', label: 'Sujeto + verbo + punto' },
        { value: 'subject-action-complement', label: 'Sujeto + verbo + complemento + punto' },
        ...(mode === 'complete-dictation' ? [
          { value: 'subject-action-complement-y-action-complement' as const, label: 'Sujeto + verbo + complemento + y + verbo + complemento + punto' },
          { value: 'subject-action-complement-y-subject-action-complement' as const, label: 'Sujeto + verbo + complemento + y + sujeto + verbo + complemento + punto' },
        ] : []),
      ]} onChange={setStructure} />
      {mode !== 'sentence-order' && <SegmentedControl legend="Opciones por parte" value={optionCount} options={([2, 3, 4] as const).map((value) => ({ value, label: String(value) }))} onChange={setOptionCount} />}
      <SegmentedControl legend="Número de frases" value={roundCount} options={([3, 5, 10] as const).map((value) => ({ value, label: String(value) }))} onChange={setRoundCount} />
      <SegmentedControl legend="Orden" value={order} options={[{ value: 'fixed', label: 'Fijo' }, { value: 'random', label: 'Aleatorio' }]} onChange={setOrder} />
      <WrittenWordsControl value={showLabels} onChange={setShowLabels} />
      {mode === 'complete-dictation' && <p className="config-help">Si una frase no tiene MP3 completo, la pantalla quedará preparada para que el docente la dicte oralmente.</p>}
      {mode === 'scene-sentence' && <p className="config-help">Solo se utilizan escenas con PNG registrado en el banco.</p>}
      <div className="teacher-panel__footer"><p>{rounds.length} frases disponibles.</p><button className="button button--primary button--large" disabled={!rounds.length}>Iniciar actividad</button></div>
    </form>
  </main>
}
