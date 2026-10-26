export interface SentenceClauseDefinition {
  subjectIds: string[]
  actionId: string
  complementIds: string[]
}

export interface SentenceDefinition {
  id: string
  subjectId: string
  actionId: string
  complementIds: string[]
  clauses?: SentenceClauseDefinition[]
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

export interface LocalSceneRecord {
  id: string
  label: string
  clauses: SentenceClauseDefinition[]
  imageBlob: Blob
  imageFileName: string
  audioBlob?: Blob
  audioFileName?: string
  availableFromUnit: number
  createdAt: string
  updatedAt: string
}
