import { useMemo, useState } from 'react'
import { ActivityHeader } from '../../components/ActivityHeader'
import { SegmentedControl } from '../../components/SegmentedControl'
import type { SentenceBuilderSettings } from '../../domain/activity'

interface Props {
  title: string
  available: (settings: SentenceBuilderSettings) => boolean
  onBack: () => void
  onStart: (settings: SentenceBuilderSettings) => void
  scene?: boolean
}

export function SentenceConfigScreen({ title, available, onBack, onStart, scene = false }: Props) {
  const [subjectCount, setSubjectCount] = useState<1 | 2>(1)
  const [complementCount, setComplementCount] = useState<0 | 1 | 2 | 3>(1)
  const [clauseCount, setClauseCount] = useState<1 | 2>(1)
  const settings = { subjectCount, complementCount, clauseCount, roundCount: 5 }
  const ready = available(settings)
  const sceneChoices = useMemo(() => {
    if (!scene) return undefined
    const choices:SentenceBuilderSettings[] = []
    for (const subjects of [1,2] as const) for (const complements of [0,1,2,3] as const) for (const clauses of [1,2] as const) {
      const candidate = {subjectCount:subjects,complementCount:complements,clauseCount:clauses,roundCount:5}
      if (available(candidate)) choices.push(candidate)
    }
    return choices
  },[available,scene])
  const canChoose = (field:'subjectCount'|'complementCount'|'clauseCount',value:number) => sceneChoices
    ? sceneChoices.some((choice)=>choice[field]===value)
    : available({...settings,[field]:value})
  return <main className="screen screen--scrollable builder-config-screen">
    <ActivityHeader title="Prepara las oraciones" subtitle={title} onBack={onBack} />
    <form className="teacher-panel builder-config" onSubmit={(event) => { event.preventDefault(); if (ready) onStart(settings) }}>
      <SegmentedControl legend="1. ¿Cuántos sujetos?" value={subjectCount} options={([1, 2] as const).map((value) => ({ value, label: String(value), disabled: !canChoose('subjectCount',value) }))} onChange={setSubjectCount} />
      <p className="builder-config__help">Personajes que comparten el verbo de cada frase: «Mamá y Papá beben agua» tiene dos sujetos.</p>
      <SegmentedControl legend="2. ¿Cuántos complementos?" value={complementCount} options={([0, 1, 2, 3] as const).map((value) => ({ value, label: String(value), disabled: !canChoose('complementCount',value) }))} onChange={setComplementCount} />
      <p className="builder-config__help">Complementos de cada verbo: «Mamá come pan y arroz» tiene dos complementos.</p>
      <SegmentedControl legend="3. ¿Cuántas frases?" value={clauseCount} options={([1, 2] as const).map((value) => ({ value, label: String(value), disabled: !canChoose('clauseCount',value) }))} onChange={setClauseCount} />
      <p className="builder-config__help">Frases enlazadas en la misma oración: «Mamá come pan y Papá bebe agua» tiene dos frases. No es el número de actividades de la sesión.</p>
      {subjectCount === 2 && <p className="config-help">Los verbos van en plural. Si falta su grabación, se indicará «Audio plural pendiente» para que el docente los lea.</p>}
      {scene && <p className="config-help">Solo se ofrecen estructuras con una escena registrada; no se añaden personajes que no aparecen en la imagen.</p>}
      {!ready && <p className="config-help" role="status">No hay recursos para esta combinación. Ajusta sujetos, complementos o frases para seleccionar una estructura disponible.</p>}
      <div className="teacher-panel__footer">
        <p>{subjectCount} {subjectCount === 1 ? 'sujeto' : 'sujetos'} por frase · {complementCount} {complementCount === 1 ? 'complemento' : 'complementos'} por verbo · {clauseCount} {clauseCount === 1 ? 'frase' : 'frases enlazadas'}</p>
        <button className="button button--primary button--large" type="submit" disabled={!ready}>Empezar</button>
      </div>
    </form>
  </main>
}
