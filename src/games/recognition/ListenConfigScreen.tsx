import { useEffect, useMemo, useState } from 'react'
import { ActivityHeader } from '../../components/ActivityHeader'
import { SegmentedControl } from '../../components/SegmentedControl'
import { VowelMultiSelect } from '../../components/VowelMultiSelect'
import { WrittenWordsControl } from '../../components/WrittenWordsControl'
import { contentTypeLabels, selectContent } from '../../content/contentFilters'
import type {
  ContentType, DistractorType, ListenAndFindSettings, RecognitionOptionCount,
  RecognitionRoundCount, VowelSound,
} from '../../domain/activity'
import type { Pictogram } from '../../domain/content'
import type { RosettaUnit } from '../../domain/rosetta'
import { buildListenAndFindRounds } from './recognitionRounds'

interface ListenConfigScreenProps {
  pictograms: Pictogram[]
  units: RosettaUnit[]
  onBack: () => void
  onStart: (settings: ListenAndFindSettings) => void
}

const contentTypes: ContentType[] = ['initial-sound-words', 'characters', 'actions', 'foods', 'toys']
const optionCounts: RecognitionOptionCount[] = [2, 3, 4, 6]

export function ListenConfigScreen({ pictograms, units, onBack, onStart }: ListenConfigScreenProps) {
  const [unit, setUnit] = useState(6)
  const [contentType, setContentType] = useState<ContentType>('initial-sound-words')
  const [selectedSounds, setSelectedSounds] = useState<VowelSound[]>(['a'])
  const [optionCount, setOptionCount] = useState<RecognitionOptionCount>(2)
  const [roundCount, setRoundCount] = useState<RecognitionRoundCount>(5)
  const [order, setOrder] = useState<'fixed' | 'random'>('random')
  const [distractorType, setDistractorType] = useState<DistractorType>('same-category')
  const [audioAutoplay, setAudioAutoplay] = useState(true)
  const [allowRepeatAudio, setAllowRepeatAudio] = useState(true)
  const [feedbackAudio, setFeedbackAudio] = useState(true)
  const [showLabels, setShowLabels] = useState(false)

  const selectedUnit = units.find(({ id }) => id === unit) ?? units[0]
  const availableSounds = selectedUnit?.availableInitialSounds ?? []
  useEffect(() => {
    setSelectedSounds((current) => {
      const valid = current.filter((sound) => availableSounds.includes(sound))
      return valid.length ? valid : availableSounds.slice(0, 1)
    })
  }, [availableSounds])

  const targets = useMemo(() => contentType === 'initial-sound-words'
    ? selectedSounds.flatMap((sound) => selectContent(pictograms, contentType, unit, sound))
    : selectContent(pictograms, contentType, unit), [contentType, pictograms, selectedSounds, unit])
  const distractorPool = useMemo(
    () => pictograms.filter((item) => item.availableFromUnit <= unit && !item.categories.includes('vowel')),
    [pictograms, unit],
  )
  const hasSimilarMetadata = targets.some((item) => item.tags.length > 0)
  const effectiveDistractorType = distractorType === 'similar' && !hasSimilarMetadata ? 'same-category' : distractorType
  const possibleRounds = useMemo(() => buildListenAndFindRounds(
    targets, optionCount, roundCount, 'fixed', distractorPool, effectiveDistractorType,
  ), [distractorPool, effectiveDistractorType, optionCount, roundCount, targets])

  useEffect(() => {
    if (distractorType === 'similar' && !hasSimilarMetadata) setDistractorType('same-category')
  }, [distractorType, hasSimilarMetadata])

  return (
    <main className="screen screen--scrollable">
      <ActivityHeader title="Configurar Escucha y encuentra" subtitle="Reconocer" onBack={onBack} />
      <form className="teacher-panel" onSubmit={(event) => {
        event.preventDefault()
        if (possibleRounds.length === 0) return
        onStart({
          unit, contentType, selectedSounds, optionCount, roundCount, order, distractorType,
          audioAutoplay, allowRepeatAudio, feedbackAudio, showLabels,
        })
      }}>
        <label className="select-field"><span>Unidad Rosetta</span><select value={unit} onChange={(event) => setUnit(Number(event.target.value))}>{units.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}</select></label>
        <label className="select-field"><span>Categoría</span><select value={contentType} onChange={(event) => setContentType(event.target.value as ContentType)}>{contentTypes.map((type) => <option value={type} key={type}>{contentTypeLabels[type]}</option>)}</select></label>

        {contentType === 'initial-sound-words' && (availableSounds.length === 0 ? <p className="notice">Las palabras por sonido inicial comienzan en la Unidad 6.</p> : (
          <VowelMultiSelect availableSounds={availableSounds} selectedSounds={selectedSounds} onChange={setSelectedSounds} />
        ))}
        <SegmentedControl legend="Número de opciones" value={optionCount} options={optionCounts.map((count) => ({ value: count, label: String(count), disabled: buildListenAndFindRounds(targets, count, 1, 'fixed', distractorPool, effectiveDistractorType).length === 0 }))} onChange={setOptionCount} />
        <SegmentedControl legend="Número de rondas" value={roundCount} options={[{ value: 5, label: '5' }, { value: 10, label: '10' }]} onChange={setRoundCount} />
        <SegmentedControl legend="Orden" value={order} options={[{ value: 'fixed', label: 'Fijo' }, { value: 'random', label: 'Aleatorio' }]} onChange={setOrder} />
        <SegmentedControl legend="Distractores" value={distractorType} options={[
          { value: 'any', label: 'Cualquiera' },
          { value: 'same-category', label: 'Misma categoría' },
          { value: 'similar', label: 'Parecidos', disabled: !hasSimilarMetadata },
        ]} onChange={setDistractorType} />
        {!hasSimilarMetadata && <p className="config-help">«Parecidos» se activará cuando el banco incluya etiquetas de semejanza.</p>}
        <SegmentedControl legend="Audio de palabra" value={audioAutoplay ? 'automatic' : 'manual'} options={[{ value: 'automatic', label: 'Automático' }, { value: 'manual', label: 'Manual' }]} onChange={(value) => setAudioAutoplay(value === 'automatic')} />
        <SegmentedControl legend="Botón repetir" value={allowRepeatAudio ? 'yes' : 'no'} options={[{ value: 'yes', label: 'Mostrar' }, { value: 'no', label: 'Ocultar' }]} onChange={(value) => setAllowRepeatAudio(value === 'yes')} />
        <SegmentedControl legend="Audio de feedback" value={feedbackAudio ? 'yes' : 'no'} options={[{ value: 'yes', label: 'Sí' }, { value: 'no', label: 'No' }]} onChange={(value) => setFeedbackAudio(value === 'yes')} />
        <WrittenWordsControl value={showLabels} onChange={setShowLabels} />
        <div className="teacher-panel__footer"><p>{possibleRounds.length} rondas efectivas.</p><button className="button button--primary button--large" type="submit" disabled={possibleRounds.length === 0}>Iniciar actividad</button></div>
      </form>
    </main>
  )
}
