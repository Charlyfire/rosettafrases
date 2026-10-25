interface Option<T extends string | number> {
  value: T
  label: string
  disabled?: boolean
}

interface SegmentedControlProps<T extends string | number> {
  legend: string
  value: T
  options: Option<T>[]
  onChange: (value: T) => void
}

export function SegmentedControl<T extends string | number>({
  legend,
  value,
  options,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <fieldset className="field-group">
      <legend>{legend}</legend>
      <div className="segmented-control">
        {options.map((option) => (
          <button
            className={value === option.value ? 'choice choice--selected' : 'choice'}
            type="button"
            key={option.value}
            aria-pressed={value === option.value}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  )
}
