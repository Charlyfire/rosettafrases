export type LearningPhase = 'present' | 'recognize' | 'build'
export type ActivityType =
  | 'bits'
  | 'listen-and-find'
  | 'initial-sound'
  | 'find-same-initial'
  | 'intruder'
  | 'sequential-dictation'
  | 'complete-dictation'
  | 'sentence-order'
  | 'scene-sentence'
  | 'sentence-builder'
  | 'vowel-sort'

export interface ActivityDefinition {
  id: string
  type: ActivityType
  title: string
  phase: LearningPhase
  enabled: boolean
  availableFromUnit: number
}

export interface BitsSettings {
  unit: number
  contentType: ContentType
  selectedSounds: VowelSound[]
  quantity: 5 | 6 | 'all'
  order: 'fixed' | 'random'
  playback: 'automatic' | 'manual'
  audioAutoplay: boolean
  showLabel: boolean
  showPersistentSound: boolean
  intervalMs: number
}

export type ContentType =
  | 'initial-sound-words'
  | 'characters'
  | 'actions'
  | 'foods'
  | 'toys'
  | 'vowels'

export type DistractorType = 'any' | 'same-category' | 'similar'

export type VowelSound = 'a' | 'e' | 'i' | 'o' | 'u'
export type RecognitionOptionCount = 2 | 3 | 4 | 6
export type RecognitionRoundCount = 5 | 10

export interface ListenAndFindSettings {
  unit: number
  contentType: ContentType
  selectedSounds: VowelSound[]
  optionCount: RecognitionOptionCount
  roundCount: RecognitionRoundCount
  order: 'fixed' | 'random'
  distractorType: DistractorType
  audioAutoplay: boolean
  allowRepeatAudio: boolean
  feedbackAudio: boolean
  showLabels: boolean
}

export type InitialSoundVariant =
  | 'which-vowel'
  | 'find-words'
  | 'same-sound'
  | 'listen-start'

export interface InitialSoundSettings {
  unit: number
  variant: InitialSoundVariant
  selectedSounds: VowelSound[]
  optionCount: RecognitionOptionCount
  roundCount: RecognitionRoundCount
  order: 'fixed' | 'random'
  audioAutoplay: boolean
  showVowelSupport: boolean
  feedbackAudio: boolean
  showLabels: boolean
}

export interface FindSameInitialSettings {
  unit: number
  selectedSounds: VowelSound[]
  optionCount: RecognitionOptionCount
  roundCount: RecognitionRoundCount
  order: 'fixed' | 'random'
  audioAutoplay: boolean
  showVowelSupport: boolean
  showLabels: boolean
}

export interface VowelSortSettings {
  unit: number
  selectedSounds: VowelSound[]
  imageCount: 4 | 6 | 8
  order: 'fixed' | 'random'
  showLabels: boolean
}

export type IntruderDifficulty = 'clear' | 'mixed'

export interface IntruderSettings {
  unit: number
  selectedSounds: VowelSound[]
  optionCount: RecognitionOptionCount
  roundCount: RecognitionRoundCount
  order: 'fixed' | 'random'
  difficulty: IntruderDifficulty
  showLabels: boolean
}

export type DictationOptionCount = 2 | 3 | 4
export type DictationRoundCount = 3 | 5 | 10
export type SentenceStructureType =
  | 'subject-action'
  | 'subject-action-complement'
  | 'subject-action-complement-y-complement'
  | 'subject-action-complement-y-action-complement'
  | 'subject-action-complement-y-subject-action-complement'

export interface SequentialDictationSettings {
  actionId: 'all' | string
  structure: SentenceStructureType
  optionCount: DictationOptionCount
  roundCount: DictationRoundCount
  order: 'fixed' | 'random'
  audioAutoplay: boolean
  showLabels: boolean
}

export interface SentenceBuilderSettings {
  structure: SentenceStructureType
  rows: 2 | 3
  complementScope: 'compatible' | 'all'
  showLabels: boolean
}

export interface SentenceGameSettings {
  structure: Exclude<SentenceStructureType, 'subject-action-complement-y-complement'>
  optionCount: DictationOptionCount
  roundCount: DictationRoundCount
  order: 'fixed' | 'random'
  showLabels: boolean
}
