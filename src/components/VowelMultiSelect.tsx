import type { VowelSound } from '../domain/activity'

interface Props {
  availableSounds: VowelSound[]
  selectedSounds: VowelSound[]
  onChange: (sounds: VowelSound[]) => void
  minimum?: number
  legend?: string
}

const vowels: VowelSound[] = ['a', 'e', 'i', 'o', 'u']

export function VowelMultiSelect({
  availableSounds,
  selectedSounds,
  onChange,
  minimum = 1,
  legend = 'Vocales para jugar',
}: Props) {
  const toggle = (sound: VowelSound) => {
    if (!availableSounds.includes(sound)) return
    if (selectedSounds.includes(sound)) {
      if (selectedSounds.length <= minimum) return
      onChange(selectedSounds.filter((item) => item !== sound))
    } else {
      onChange(vowels.filter((item) => selectedSounds.includes(item) || item === sound))
    }
  }

  return (
    <fieldset className="field-group vowel-multi-select">
      <legend>{legend}</legend>
      <div className="segmented-control">
        {vowels.map((sound) => (
          <button
            type="button"
            key={sound}
            disabled={!availableSounds.includes(sound)}
            aria-pressed={selectedSounds.includes(sound)}
            className={selectedSounds.includes(sound) ? 'choice choice--selected' : 'choice'}
            onClick={() => toggle(sound)}
          >
            {sound.toUpperCase()}
          </button>
        ))}
      </div>
      <small>Selecciona {minimum === 1 ? 'una o más vocales' : `al menos ${minimum} vocales`}.</small>
    </fieldset>
  )
}
