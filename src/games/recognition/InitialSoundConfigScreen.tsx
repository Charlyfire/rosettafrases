import { useEffect, useMemo, useState } from 'react'
import { ActivityHeader } from '../../components/ActivityHeader'
import { SegmentedControl } from '../../components/SegmentedControl'
import { VowelMultiSelect } from '../../components/VowelMultiSelect'
import { WrittenWordsControl } from '../../components/WrittenWordsControl'
import type {
  InitialSoundSettings, InitialSoundVariant, RecognitionOptionCount,
  RecognitionRoundCount, VowelSound,
} from '../../domain/activity'
import type { Pictogram } from '../../domain/content'
import type { RosettaUnit } from '../../domain/rosetta'
import { buildFindWordsRounds, buildSameSoundRounds, buildVowelChoiceRounds } from './initialSoundRounds'

interface InitialSoundConfigScreenProps {
  pictograms: Pictogram[]
  units: RosettaUnit[]
  onBack: () => void
  onStart: (settings: InitialSoundSettings) => void
}

const variantLabels: Record<InitialSoundVariant, string> = {
  'which-vowel': '¿Por qué empieza?',
  'find-words': 'Busca las palabras que empiezan por…',
  'same-sound': '¿Empiezan igual?',
  'listen-start': 'Escucha cómo empieza',
}

export function InitialSoundConfigScreen({ pictograms, units, onBack, onStart }: InitialSoundConfigScreenProps) {
  const [unit, setUnit] = useState(6)
  const [variant, setVariant] = useState<InitialSoundVariant>('which-vowel')
  const [selectedSounds, setSelectedSounds] = useState<VowelSound[]>(['a'])
  const [optionCount, setOptionCount] = useState<RecognitionOptionCount>(4)
  const [roundCount, setRoundCount] = useState<RecognitionRoundCount>(5)
  const [order, setOrder] = useState<'fixed' | 'random'>('random')
  const [audioAutoplay, setAudioAutoplay] = useState(true)
  const [showVowelSupport, setShowVowelSupport] = useState(true)
  const [feedbackAudio, setFeedbackAudio] = useState(true)
  const [showLabels, setShowLabels] = useState(false)

  const selectedUnit = units.find(({ id }) => id === unit) ?? units[0]
  const initialSounds = selectedUnit?.availableInitialSounds ?? []
  const isolatedSounds = selectedUnit?.availableIsolatedSounds ?? []
  const selectableSounds = variant === 'listen-start' && initialSounds.length === 0 ? isolatedSounds : initialSounds
  const allWords = useMemo(() => pictograms.filter((item) =>
    item.availableFromUnit <= unit && item.initialSound && initialSounds.includes(item.initialSound as VowelSound),
  ), [initialSounds, pictograms, unit])
  const words = useMemo(() => allWords.filter((item) => selectedSounds.includes(item.initialSound as VowelSound)), [allWords, selectedSounds])
  const vowelOptions = useMemo(() => pictograms.filter((item) =>
    item.categories.includes('vowel') && selectedSounds.includes(item.label.toLowerCase() as VowelSound),
  ), [pictograms, selectedSounds])

  useEffect(() => {
    setSelectedSounds((current) => {
      const valid = current.filter((sound) => selectableSounds.includes(sound))
      return valid.length ? valid : selectableSounds.slice(0, 1)
    })
  }, [selectableSounds])

  const roundsAvailable = useMemo(() => {
    if (variant === 'find-words') return Math.min(roundCount, selectedSounds.reduce((total, sound) => total + buildFindWordsRounds(allWords, sound, optionCount, roundCount, 'fixed').length, 0))
    if (variant === 'same-sound') return buildSameSoundRounds(allWords, roundCount, 'fixed', selectedSounds).length
    const models = variant === 'listen-start' && words.length === 0 ? vowelOptions : words
    return buildVowelChoiceRounds(models, vowelOptions, roundCount, 'fixed').length
  }, [allWords, optionCount, roundCount, selectedSounds, variant, vowelOptions, words])

  const unavailable = variant !== 'listen-start' && initialSounds.length === 0

  return (
    <main className="screen screen--scrollable">
      <ActivityHeader title="Configurar Sonido inicial" subtitle={variantLabels[variant]} onBack={onBack} />
      <form className="teacher-panel" onSubmit={(event) => {
        event.preventDefault()
        if (roundsAvailable === 0 || unavailable) return
        onStart({ unit, variant, selectedSounds, optionCount, roundCount, order, audioAutoplay, showVowelSupport, feedbackAudio, showLabels })
      }}>
        <label className="select-field"><span>Unidad Rosetta</span><select value={unit} onChange={(event) => setUnit(Number(event.target.value))}>{units.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}</select></label>
        <label className="select-field"><span>Variante</span><select value={variant} onChange={(event) => setVariant(event.target.value as InitialSoundVariant)}>{(Object.keys(variantLabels) as InitialSoundVariant[]).map((item) => <option value={item} key={item}>{variantLabels[item]}</option>)}</select></label>

        {unavailable && <p className="notice">En esta unidad todavía no se trabajan sonidos al inicio de palabra.</p>}
        {selectableSounds.length > 0 && <VowelMultiSelect availableSounds={selectableSounds} selectedSounds={selectedSounds} onChange={setSelectedSounds} />}
        {variant === 'find-words' && (
          <SegmentedControl legend="Número de imágenes" value={optionCount} options={[{ value: 4, label: '4' }, { value: 6, label: '6' }]} onChange={setOptionCount} />
        )}
        <SegmentedControl legend="Número de rondas" value={roundCount} options={[{ value: 5, label: '5' }, { value: 10, label: '10' }]} onChange={setRoundCount} />
        <SegmentedControl legend="Orden" value={order} options={[{ value: 'fixed', label: 'Fijo' }, { value: 'random', label: 'Aleatorio' }]} onChange={setOrder} />
        <SegmentedControl legend="Audio" value={audioAutoplay ? 'automatic' : 'manual'} options={[{ value: 'automatic', label: 'Automático' }, { value: 'manual', label: 'Manual' }]} onChange={(value) => setAudioAutoplay(value === 'automatic')} />
        {variant === 'find-words' && (
          <SegmentedControl legend="Vocal de apoyo" value={showVowelSupport ? 'show' : 'hide'} options={[{ value: 'show', label: 'Mostrar' }, { value: 'hide', label: 'Ocultar' }]} onChange={(value) => setShowVowelSupport(value === 'show')} />
        )}
        <SegmentedControl legend="Audio de feedback" value={feedbackAudio ? 'yes' : 'no'} options={[{ value: 'yes', label: 'Sí' }, { value: 'no', label: 'No' }]} onChange={(value) => setFeedbackAudio(value === 'yes')} />
        <WrittenWordsControl value={showLabels} onChange={setShowLabels} />
        <div className="teacher-panel__footer"><p>{roundsAvailable} rondas efectivas.</p><button className="button button--primary button--large" type="submit" disabled={roundsAvailable === 0 || unavailable}>Iniciar actividad</button></div>
      </form>
    </main>
  )
}
