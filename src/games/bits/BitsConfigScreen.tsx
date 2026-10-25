import { useEffect, useMemo, useState } from 'react'
import { ActivityHeader } from '../../components/ActivityHeader'
import { SegmentedControl } from '../../components/SegmentedControl'
import { VowelMultiSelect } from '../../components/VowelMultiSelect'
import { contentTypeLabels, selectContent } from '../../content/contentFilters'
import type { BitsSettings, ContentType, VowelSound } from '../../domain/activity'
import type { Pictogram } from '../../domain/content'
import type { RosettaUnit } from '../../domain/rosetta'

interface BitsConfigScreenProps {
  pictograms: Pictogram[]
  units: RosettaUnit[]
  onBack: () => void
  onStart: (settings: BitsSettings) => void
}

const contentTypes: ContentType[] = [
  'initial-sound-words', 'characters', 'actions', 'foods', 'toys', 'vowels',
]

export function BitsConfigScreen({ pictograms, units, onBack, onStart }: BitsConfigScreenProps) {
  const [unit, setUnit] = useState(6)
  const [contentType, setContentType] = useState<ContentType>('initial-sound-words')
  const [selectedSounds, setSelectedSounds] = useState<VowelSound[]>(['a'])
  const [quantity, setQuantity] = useState<5 | 6 | 'all'>(5)
  const [order, setOrder] = useState<'fixed' | 'random'>('fixed')
  const [playback, setPlayback] = useState<'automatic' | 'manual'>('automatic')
  const [audioAutoplay, setAudioAutoplay] = useState(true)
  const [showLabel, setShowLabel] = useState(true)
  const [showPersistentSound, setShowPersistentSound] = useState(true)
  const [intervalMs, setIntervalMs] = useState<2000 | 2500 | 3000>(2500)

  const selectedUnit = units.find((item) => item.id === unit) ?? units[0]
  const availableSounds = selectedUnit?.availableInitialSounds ?? []
  const availableIsolatedSounds = selectedUnit?.availableIsolatedSounds ?? []

  useEffect(() => {
    setSelectedSounds((current) => {
      const valid = current.filter((sound) => availableSounds.includes(sound))
      return valid.length > 0 ? valid : availableSounds.slice(0, 1)
    })
  }, [availableSounds])

  const available = useMemo(() => (
    contentType === 'initial-sound-words'
      ? selectedSounds.flatMap((sound) => selectContent(pictograms, contentType, unit, sound))
      : selectContent(pictograms, contentType, unit)
  ).filter((item) => contentType !== 'vowels' || availableIsolatedSounds.includes(item.label.toLowerCase() as VowelSound)),
  [availableIsolatedSounds, contentType, pictograms, selectedSounds, unit])

  const phonologyUnavailable = contentType === 'initial-sound-words' && availableSounds.length === 0
  const canStart = available.length > 0 && !phonologyUnavailable

  return (
    <main className="screen screen--scrollable">
      <ActivityHeader title="Configurar Bits" subtitle={contentTypeLabels[contentType]} onBack={onBack} />
      <form
        className="teacher-panel"
        onSubmit={(event) => {
          event.preventDefault()
          if (!canStart) return
          onStart({
            unit, contentType, selectedSounds, quantity, order, playback, audioAutoplay,
            showLabel, showPersistentSound, intervalMs,
          })
        }}
      >
        <label className="select-field">
          <span>Unidad Rosetta</span>
          <select value={unit} onChange={(event) => setUnit(Number(event.target.value))}>
            {units.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}
          </select>
        </label>
        <label className="select-field">
          <span>Tipo de contenido</span>
          <select value={contentType} onChange={(event) => setContentType(event.target.value as ContentType)}>
            {contentTypes.map((type) => <option value={type} key={type}>{contentTypeLabels[type]}</option>)}
          </select>
        </label>

        {contentType === 'initial-sound-words' && (availableSounds.length === 0 ? (
          <p className="notice">Las palabras por sonido inicial comienzan en la Unidad 6.</p>
        ) : (
          <VowelMultiSelect availableSounds={availableSounds} selectedSounds={selectedSounds} onChange={setSelectedSounds} />
        ))}

        <SegmentedControl
          legend="Cantidad"
          value={quantity}
          options={[
            { value: 5, label: '5', disabled: available.length < 5 },
            { value: 6, label: '6', disabled: available.length < 6 },
            { value: 'all', label: `Todas (${available.length})` },
          ]}
          onChange={setQuantity}
        />
        <SegmentedControl legend="Orden" value={order} options={[{ value: 'fixed', label: 'Fijo' }, { value: 'random', label: 'Aleatorio' }]} onChange={setOrder} />
        <SegmentedControl legend="Avance" value={playback} options={[{ value: 'automatic', label: 'Automático' }, { value: 'manual', label: 'Manual' }]} onChange={setPlayback} />
        {playback === 'automatic' && (
          <SegmentedControl
            legend="Duración por tarjeta"
            value={intervalMs}
            options={[{ value: 2000, label: '2 s' }, { value: 2500, label: '2,5 s' }, { value: 3000, label: '3 s' }]}
            onChange={setIntervalMs}
          />
        )}
        <SegmentedControl legend="Nombre escrito" value={showLabel ? 'show' : 'hide'} options={[{ value: 'show', label: 'Mostrar' }, { value: 'hide', label: 'Ocultar' }]} onChange={(value) => setShowLabel(value === 'show')} />
        <SegmentedControl legend="Audio al mostrar" value={audioAutoplay ? 'automatic' : 'manual'} options={[{ value: 'automatic', label: 'Sí' }, { value: 'manual', label: 'No' }]} onChange={(value) => setAudioAutoplay(value === 'automatic')} />

        {contentType === 'initial-sound-words' && (
          <div className="switch-row">
            <div><strong>Vocal de referencia</strong><span>Mantener su ilustración visible durante la presentación</span></div>
            <button className={showPersistentSound ? 'toggle toggle--on' : 'toggle'} type="button" role="switch" aria-checked={showPersistentSound} onClick={() => setShowPersistentSound((value) => !value)}><span /></button>
          </div>
        )}

        <div className="teacher-panel__footer">
          <p>{available.length} contenidos disponibles.</p>
          <button className="button button--primary button--large" type="submit" disabled={!canStart}>Iniciar presentación</button>
        </div>
      </form>
    </main>
  )
}
