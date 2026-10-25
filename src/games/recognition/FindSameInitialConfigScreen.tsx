import { useEffect, useMemo, useState } from 'react'
import { ActivityHeader } from '../../components/ActivityHeader'
import { SegmentedControl } from '../../components/SegmentedControl'
import { VowelMultiSelect } from '../../components/VowelMultiSelect'
import { WrittenWordsControl } from '../../components/WrittenWordsControl'
import type { FindSameInitialSettings, RecognitionOptionCount, RecognitionRoundCount, VowelSound } from '../../domain/activity'
import type { Pictogram } from '../../domain/content'
import type { RosettaUnit } from '../../domain/rosetta'
import { buildFindSameInitialRounds } from './findSameInitialRounds'

interface Props {
  pictograms: Pictogram[]
  units: RosettaUnit[]
  onBack: () => void
  onStart: (settings: FindSameInitialSettings) => void
}

export function FindSameInitialConfigScreen({ pictograms, units, onBack, onStart }: Props) {
  const [unit, setUnit] = useState(6)
  const [selectedSounds, setSelectedSounds] = useState<VowelSound[]>(['u'])
  const [optionCount, setOptionCount] = useState<RecognitionOptionCount>(4)
  const [roundCount, setRoundCount] = useState<RecognitionRoundCount>(5)
  const [order, setOrder] = useState<'fixed' | 'random'>('random')
  const [audioAutoplay, setAudioAutoplay] = useState(true)
  const [showVowelSupport, setShowVowelSupport] = useState(false)
  const [showLabels, setShowLabels] = useState(false)
  const selectedUnit = units.find(({ id }) => id === unit)
  const sounds = selectedUnit?.availableInitialSounds ?? []
  const words = useMemo(() => pictograms.filter((item) =>
    item.availableFromUnit <= unit && sounds.includes(item.initialSound as VowelSound),
  ), [pictograms, sounds, unit])

  useEffect(() => {
    setSelectedSounds((current) => {
      const valid = current.filter((sound) => sounds.includes(sound))
      return valid.length ? valid : sounds.slice(0, 1)
    })
  }, [sounds])

  const available = useMemo(() => Math.min(roundCount, selectedSounds.reduce((total, sound) => total + buildFindSameInitialRounds(
    words, sound, optionCount, roundCount, 'fixed',
  ).length, 0)), [optionCount, roundCount, selectedSounds, words])

  return (
    <main className="screen screen--scrollable">
      <ActivityHeader title="Configurar Busca otra que empiece igual" subtitle="Reconocer" onBack={onBack} />
      <form className="teacher-panel" onSubmit={(event) => {
        event.preventDefault()
        if (available === 0) return
        onStart({ unit, selectedSounds, optionCount, roundCount, order, audioAutoplay, showVowelSupport, showLabels })
      }}>
        <label className="select-field"><span>Unidad Rosetta</span><select value={unit} onChange={(event) => setUnit(Number(event.target.value))}>{units.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}</select></label>
        {sounds.length === 0 ? <p className="notice">En esta unidad todavía no se trabajan sonidos al inicio de palabra.</p> : (
          <VowelMultiSelect availableSounds={sounds} selectedSounds={selectedSounds} onChange={setSelectedSounds} />
        )}
        <SegmentedControl legend="Número de opciones" value={optionCount} options={[2, 3, 4, 6].map((value) => ({ value: value as RecognitionOptionCount, label: String(value) }))} onChange={setOptionCount} />
        <SegmentedControl legend="Número de rondas" value={roundCount} options={[{ value: 5, label: '5' }, { value: 10, label: '10' }]} onChange={setRoundCount} />
        <SegmentedControl legend="Orden" value={order} options={[{ value: 'fixed', label: 'Fijo' }, { value: 'random', label: 'Aleatorio' }]} onChange={setOrder} />
        <SegmentedControl legend="Audio" value={audioAutoplay ? 'automatic' : 'manual'} options={[{ value: 'automatic', label: 'Automático' }, { value: 'manual', label: 'Manual' }]} onChange={(value) => setAudioAutoplay(value === 'automatic')} />
        <SegmentedControl legend="Vocal de apoyo" value={showVowelSupport ? 'show' : 'hide'} options={[{ value: 'hide', label: 'Ocultar' }, { value: 'show', label: 'Mostrar' }]} onChange={(value) => setShowVowelSupport(value === 'show')} />
        <WrittenWordsControl value={showLabels} onChange={setShowLabels} />
        <div className="teacher-panel__footer"><p>{available} rondas efectivas.</p><button className="button button--primary button--large" type="submit" disabled={available === 0}>Iniciar actividad</button></div>
      </form>
    </main>
  )
}
