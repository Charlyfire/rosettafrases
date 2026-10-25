import type { ContentType, VowelSound } from '../domain/activity'
import type { Pictogram } from '../domain/content'

export const contentTypeLabels: Record<ContentType, string> = {
  'initial-sound-words': 'Palabras que empiezan por…',
  characters: 'Personajes',
  actions: 'Acciones',
  foods: 'Alimentos',
  toys: 'Juguetes',
  vowels: 'Vocales',
}

export const selectContent = (
  pictograms: Pictogram[],
  contentType: ContentType,
  unit: number,
  initialSound?: VowelSound,
) => pictograms.filter((pictogram) => {
  if (pictogram.availableFromUnit > unit) return false
  if (contentType === 'initial-sound-words') {
    return Boolean(initialSound) && pictogram.initialSound === initialSound && !pictogram.categories.includes('vowel')
  }
  if (contentType === 'characters') return pictogram.categories.includes('character')
  if (contentType === 'actions') return pictogram.categories.includes('action')
  if (contentType === 'foods') return pictogram.categories.includes('food')
  if (contentType === 'toys') return pictogram.categories.includes('toy')
  return pictogram.categories.includes('vowel')
})

export const sharesCategory = (left: Pictogram, right: Pictogram) =>
  left.categories.some((category) => right.categories.includes(category))

export const sharesTag = (left: Pictogram, right: Pictogram) =>
  left.tags.some((tag) => right.tags.includes(tag))
