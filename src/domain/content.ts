export type ContentCategory =
  | 'global-word'
  | 'noun'
  | 'food'
  | 'drink'
  | 'subject'
  | 'action'
  | 'complement'
  | 'toy'
  | 'character'
  | 'vowel'
  | 'conjunction'
  | 'punctuation'

export interface AudioResource {
  id: string
  kind: 'word' | 'sentence' | 'instruction' | 'feedback' | 'environment'
  file: string
  transcript?: string
}

export interface Pictogram {
  id: string
  label: string
  image: string
  audioIds: string[]
  categories: ContentCategory[]
  tags: string[]
  initialSound?: 'a' | 'e' | 'i' | 'o' | 'u' | string
  availableFromUnit: number
  source?: 'bundled' | 'local'
  grammatical?: {
    role?: Array<'subject' | 'action' | 'complement' | 'conjunction' | 'punctuation'>
    lemma?: string
    displayForm?: string
    gender?: 'feminine' | 'masculine'
    number?: 'singular' | 'plural'
  }
}

export interface LocalContentRecord {
  id: string
  label: string
  imageBlob: Blob
  imageFileName: string
  audioBlob: Blob
  audioFileName: string
  categories: ContentCategory[]
  initialSound?: 'a' | 'e' | 'i' | 'o' | 'u'
  availableFromUnit: number
  createdAt: string
  updatedAt: string
}

export interface LocalContentDraft {
  id?: string
  label: string
  imageBlob: Blob
  imageFileName: string
  audioBlob: Blob
  audioFileName: string
  categories: ContentCategory[]
  initialSound?: 'a' | 'e' | 'i' | 'o' | 'u'
  availableFromUnit: number
  createdAt?: string
}

export interface ContentBank {
  schemaVersion: 1
  pictograms: Pictogram[]
  audio: AudioResource[]
}
