import { useEffect, useMemo, useState } from 'react'
import { ActivityHeader } from '../../components/ActivityHeader'
import { SegmentedControl } from '../../components/SegmentedControl'
import { VowelMultiSelect } from '../../components/VowelMultiSelect'
import { WrittenWordsControl } from '../../components/WrittenWordsControl'
import type { IntruderDifficulty, IntruderSettings, RecognitionOptionCount, RecognitionRoundCount, VowelSound } from '../../domain/activity'
import type { Pictogram } from '../../domain/content'
import type { RosettaUnit } from '../../domain/rosetta'
import { buildIntruderRounds } from './intruderRounds'

interface Props { pictograms: Pictogram[]; units: RosettaUnit[]; onBack: () => void; onStart: (settings: IntruderSettings) => void }

export function IntruderConfigScreen({ pictograms, units, onBack, onStart }: Props) {
  const [unit, setUnit] = useState(6)
  const [selectedSounds, setSelectedSounds] = useState<VowelSound[]>(['u'])
  const [optionCount, setOptionCount] = useState<RecognitionOptionCount>(4)
  const [roundCount, setRoundCount] = useState<RecognitionRoundCount>(5)
  const [order, setOrder] = useState<'fixed' | 'random'>('random')
  const [difficulty, setDifficulty] = useState<IntruderDifficulty>('clear')
  const [showLabels, setShowLabels] = useState(false)
  const availableSounds = units.find(({ id }) => id === unit)?.availableInitialSounds ?? []
  const words = useMemo(() => pictograms.filter((item) =>
    item.availableFromUnit <= unit && availableSounds.includes(item.initialSound as VowelSound)), [availableSounds, pictograms, unit])

  useEffect(() => setSelectedSounds((current) => {
    const valid = current.filter((sound) => availableSounds.includes(sound))
    return valid.length ? valid : availableSounds.slice(0, 1)
  }), [availableSounds])

  const available = useMemo(() => buildIntruderRounds(words, selectedSounds, optionCount, roundCount, 'fixed').length,
    [optionCount, roundCount, selectedSounds, words])

  return <main className="screen screen--scrollable">
    <ActivityHeader title="Configurar Intruso" subtitle="Reconocer" onBack={onBack} />
    <form className="teacher-panel" onSubmit={(event) => { event.preventDefault(); if (available) onStart({ unit, selectedSounds, optionCount, roundCount, order, difficulty, showLabels }) }}>
      <label className="select-field"><span>Unidad Rosetta</span><select value={unit} onChange={(event) => setUnit(Number(event.target.value))}>{units.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
      {availableSounds.length ? <VowelMultiSelect availableSounds={availableSounds} selectedSounds={selectedSounds} onChange={setSelectedSounds} legend="Vocales objetivo" /> : <p className="notice">En esta unidad todavía no se trabajan sonidos al inicio de palabra.</p>}
      <SegmentedControl legend="Número de opciones" value={optionCount} options={([3, 4, 6] as const).map((value) => ({ value: value as RecognitionOptionCount, label: String(value) }))} onChange={setOptionCount} />
      <SegmentedControl legend="Número de rondas" value={roundCount} options={[{ value: 5, label: '5' }, { value: 10, label: '10' }]} onChange={setRoundCount} />
      <SegmentedControl legend="Dificultad" value={difficulty} options={[{ value: 'clear', label: 'Con vocal de apoyo' }, { value: 'mixed', label: 'Sin vocal de apoyo' }]} onChange={setDifficulty} />
      <SegmentedControl legend="Orden" value={order} options={[{ value: 'fixed', label: 'Fijo' }, { value: 'random', label: 'Aleatorio' }]} onChange={setOrder} />
      <WrittenWordsControl value={showLabels} onChange={setShowLabels} />
      <div className="teacher-panel__footer"><p>{available} rondas efectivas.</p><button className="button button--primary button--large" disabled={!available}>Iniciar actividad</button></div>
    </form>
  </main>
}
