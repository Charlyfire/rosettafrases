export interface SentenceDefinition {
  id: string
  subjectId: string
  actionId: string
  complementIds: string[]
  sceneImage?: string
  audioId?: string
  availableFromUnit: number
}

export interface ActionCompatibility {
  actionId: string
  allowedSubjectIds?: string[]
  allowedComplementIds: string[]
  allowWithoutComplement?: boolean
}

export interface SentenceCatalog {
  schemaVersion: 1
  sentences: SentenceDefinition[]
  actionCompatibility: ActionCompatibility[]
}
