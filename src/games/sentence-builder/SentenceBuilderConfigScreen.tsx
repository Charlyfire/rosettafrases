import { useMemo, useState } from 'react'
import { ActivityHeader } from '../../components/ActivityHeader'
import { SegmentedControl } from '../../components/SegmentedControl'
import { WrittenWordsControl } from '../../components/WrittenWordsControl'
import type { SentenceBuilderSettings, SentenceStructureType } from '../../domain/activity'
import type { SentenceDefinition } from '../../domain/sentence'

interface SentenceBuilderConfigScreenProps {
  sentences: SentenceDefinition[]
  onBack: () => void
  onStart: (settings: SentenceBuilderSettings) => void
}

export function SentenceBuilderConfigScreen({ sentences, onBack, onStart }: SentenceBuilderConfigScreenProps) {
  const [structure, setStructure] = useState<SentenceStructureType>('subject-action')
  const [rows, setRows] = useState<2 | 3>(2)
  const [complementScope, setComplementScope] = useState<'compatible' | 'all'>('all')
  const [showLabels, setShowLabels] = useState(true)
  const available = useMemo(() => sentences.filter((sentence) =>
    sentence.complementIds.length === (
      structure === 'subject-action' ? 0 : structure === 'subject-action-complement' ? 1 : structure === 'subject-action-complement-y-complement' ? 2 : 1
    ),
  ).length, [sentences, structure])

  return (
    <main className="screen screen--scrollable">
      <ActivityHeader title="Configurar Construye tu oración" subtitle="Construir" onBack={onBack} />
      <form className="teacher-panel" onSubmit={(event) => { event.preventDefault(); onStart({ structure, rows, complementScope, showLabels }) }}>
        <div className="dictation-explanation">
          <strong>Elección libre guiada</strong>
          <span>El banco mostrará primero sujetos, después acciones y, cuando corresponda, complementos.</span>
        </div>
        <SegmentedControl legend="Estructura" value={structure} options={[
          { value: 'subject-action', label: 'Sujeto + verbo + punto' },
          { value: 'subject-action-complement', label: 'Sujeto + verbo + complemento + punto' },
          { value: 'subject-action-complement-y-complement', label: 'Sujeto + verbo + complemento + y + complemento + punto' },
          { value: 'subject-action-complement-y-action-complement', label: 'Sujeto + verbo + complemento + y + verbo + complemento + punto' },
          { value: 'subject-action-complement-y-subject-action-complement', label: 'Sujeto + verbo + complemento + y + sujeto + verbo + complemento + punto' },
        ]} onChange={setStructure} />
        <SegmentedControl legend="Filas de pictogramas" value={rows} options={[
          { value: 2, label: '2 filas · 12 dibujos' },
          { value: 3, label: '3 filas · 18 dibujos' },
        ]} onChange={setRows} />
        <WrittenWordsControl value={showLabels} onChange={setShowLabels} />
        {structure !== 'subject-action' && <SegmentedControl legend="Complementos" value={complementScope} options={[
          { value: 'all', label: 'Todo el banco · incompatibles desactivados' },
          { value: 'compatible', label: 'Solo compatibles' },
        ]} onChange={setComplementScope} />}
        <div className="teacher-panel__footer">
          <p>{available} combinaciones compatibles registradas.</p>
          <button className="button button--primary button--large" type="submit" disabled={available === 0}>Iniciar actividad</button>
        </div>
      </form>
    </main>
  )
}
