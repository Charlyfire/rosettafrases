import { useEffect, useMemo, useState } from 'react'
import { ActivityHeader } from '../../components/ActivityHeader'
import { SegmentedControl } from '../../components/SegmentedControl'
import { VowelMultiSelect } from '../../components/VowelMultiSelect'
import { WrittenWordsControl } from '../../components/WrittenWordsControl'
import type { VowelSortSettings, VowelSound } from '../../domain/activity'
import type { Pictogram } from '../../domain/content'
import type { RosettaUnit } from '../../domain/rosetta'
import { buildVowelSortItems } from './vowelSortItems'

interface Props { pictograms: Pictogram[]; units: RosettaUnit[]; onBack: () => void; onStart: (settings: VowelSortSettings) => void }

export function VowelSortConfigScreen({ pictograms, units, onBack, onStart }: Props) {
  const [unit, setUnit] = useState(6)
  const [selectedSounds, setSelectedSounds] = useState<VowelSound[]>(['u', 'a'])
  const [imageCount, setImageCount] = useState<4 | 6 | 8>(6)
  const [order, setOrder] = useState<'fixed' | 'random'>('random')
  const [showLabels, setShowLabels] = useState(true)
  const selectedUnit = units.find(({ id }) => id === unit)
  const availableSounds = selectedUnit?.availableInitialSounds ?? []
  const sounds = selectedSounds
  const words = useMemo(() => pictograms.filter((item) =>
    item.availableFromUnit <= unit && sounds.includes(item.initialSound as VowelSound),
  ), [pictograms, sounds, unit])
  const itemsAvailable = useMemo(() => buildVowelSortItems(words, sounds, imageCount, 'fixed').length, [imageCount, sounds, words])

  useEffect(() => {
    setSelectedSounds((current) => {
      const valid = current.filter((sound) => availableSounds.includes(sound))
      return valid.length >= 2 ? valid : availableSounds.slice(0, 2)
    })
  }, [availableSounds])
  useEffect(() => {
    if (imageCount < selectedSounds.length) setImageCount(selectedSounds.length <= 4 ? 4 : 6)
  }, [imageCount, selectedSounds.length])

  return (
    <main className="screen screen--scrollable">
      <ActivityHeader title="Configurar Clasificar por vocal" subtitle="Construir" onBack={onBack} />
      <form className="teacher-panel" onSubmit={(event) => { event.preventDefault(); if (itemsAvailable) onStart({ unit, selectedSounds, imageCount, order, showLabels }) }}>
        <label className="select-field"><span>Unidad Rosetta</span><select value={unit} onChange={(event) => setUnit(Number(event.target.value))}>{units.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}</select></label>
        {availableSounds.length < 1 ? <p className="notice">Esta actividad necesita al menos una vocal trabajada al inicio de palabra.</p> : <>
          <VowelMultiSelect availableSounds={availableSounds} selectedSounds={selectedSounds} onChange={setSelectedSounds} minimum={2} />
          <SegmentedControl legend="Número de imágenes" value={imageCount} options={([4, 6, 8] as const).map((value) => ({ value, label: String(value), disabled: value < selectedSounds.length }))} onChange={setImageCount} />
          <SegmentedControl legend="Orden" value={order} options={[{ value: 'fixed', label: 'Fijo' }, { value: 'random', label: 'Aleatorio' }]} onChange={setOrder} />
          <WrittenWordsControl value={showLabels} onChange={setShowLabels} />
        </>}
        <div className="teacher-panel__footer"><p>{itemsAvailable} imágenes disponibles para {sounds.map((sound) => sound.toUpperCase()).join(' · ')}.</p><button className="button button--primary button--large" type="submit" disabled={itemsAvailable === 0}>Iniciar actividad</button></div>
      </form>
    </main>
  )
}
