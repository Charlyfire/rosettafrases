export interface RosettaUnit {
  id: number
  level: number
  title: string
  focus: string[]
  availableInitialSounds: Array<'a' | 'e' | 'i' | 'o' | 'u'>
  availableIsolatedSounds: Array<'a' | 'e' | 'i' | 'o' | 'u'>
}

export interface RosettaSequence {
  schemaVersion: 1
  units: RosettaUnit[]
}
