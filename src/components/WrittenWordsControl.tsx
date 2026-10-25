import { SegmentedControl } from './SegmentedControl'

interface Props { value: boolean; onChange: (value: boolean) => void }

export function WrittenWordsControl({ value, onChange }: Props) {
  return <SegmentedControl
    legend="Palabras escritas"
    value={value ? 'show' : 'hide'}
    options={[{ value: 'show', label: 'Mostrar' }, { value: 'hide', label: 'Ocultar' }]}
    onChange={(next) => onChange(next === 'show')}
  />
}
