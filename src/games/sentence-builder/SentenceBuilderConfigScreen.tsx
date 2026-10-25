import { useState } from 'react'
import { ActivityHeader } from '../../components/ActivityHeader'
import { SegmentedControl } from '../../components/SegmentedControl'
import type { SentenceBuilderSettings } from '../../domain/activity'
import type { Pictogram } from '../../domain/content'
import type { ActionCompatibility } from '../../domain/sentence'
import { builderChoices } from './builderSession'

interface SentenceBuilderConfigScreenProps {
  pictograms: Pictogram[]
  compatibility: ActionCompatibility[]
  onBack: () => void
  onStart: (settings: SentenceBuilderSettings) => void
}

export function SentenceBuilderConfigScreen({ pictograms, compatibility, onBack, onStart }: SentenceBuilderConfigScreenProps) {
  const [subjectCount, setSubjectCount] = useState<1 | 2>(1)
  const [complementCount, setComplementCount] = useState<0 | 1 | 2 | 3>(2)
  const [roundCount, setRoundCount] = useState(5)
  const settings = { subjectCount, complementCount, roundCount }
  const choices = builderChoices(pictograms, compatibility, settings)

  return (
    <main className="screen screen--scrollable builder-config-screen">
      <ActivityHeader title="Prepara las oraciones" subtitle="Construye tu oración" onBack={onBack} />
      <form className="teacher-panel builder-config" onSubmit={(event) => {
        event.preventDefault()
        if (choices.subjects.length >= subjectCount) onStart(settings)
      }}>
        <SegmentedControl legend="1. ¿Cuántos sujetos?" value={subjectCount} options={([1, 2] as const).map((count) => ({ value: count, label: String(count), disabled: choices.subjects.length < count }))} onChange={setSubjectCount} />
        <p className="builder-config__help">Sujetos dentro de cada oración. Con dos: «Papá come arroz y Mamá bebe agua».</p>
        <SegmentedControl legend="2. ¿Cuántos complementos?" value={complementCount} options={([0, 1, 2, 3] as const).map((count) => ({ value: count, label: String(count), disabled: builderChoices(pictograms, compatibility, { ...settings, complementCount: count }).subjects.length === 0 }))} onChange={setComplementCount} />
        <p className="builder-config__help">Complementos por sujeto. La «y» y el punto los coloca el alumno.</p>
        <SegmentedControl legend="3. ¿Cuántas frases?" value={roundCount} options={[1, 3, 5, 10].map((count) => ({ value: count, label: String(count) }))} onChange={setRoundCount} />
        <p className="builder-config__help">Total de oraciones que se construirán durante la sesión.</p>
        <div className="teacher-panel__footer">
          <p>{subjectCount} {subjectCount === 1 ? 'sujeto' : 'sujetos'} · {complementCount} {complementCount === 1 ? 'complemento' : 'complementos'} por sujeto · {roundCount} {roundCount === 1 ? 'frase' : 'frases'}</p>
          <button className="button button--primary button--large" type="submit" disabled={choices.subjects.length < subjectCount}>Empezar</button>
        </div>
      </form>
    </main>
  )
}
