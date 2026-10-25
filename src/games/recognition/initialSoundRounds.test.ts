import { describe, expect, it } from 'vitest'
import type { Pictogram } from '../../domain/content'
import { buildFindWordsRounds, buildSameSoundRounds, buildVowelChoiceRounds } from './initialSoundRounds'

const word = (id: string, sound: string): Pictogram => ({
  id, label: id, image: `images/${id}.png`, audioIds: [`word-${id}`],
  categories: ['global-word'], tags: [], initialSound: sound, availableFromUnit: 6,
})
const vowel = (sound: string): Pictogram => ({
  id: `vowel-${sound}`, label: sound.toUpperCase(), image: `images/letra ${sound}.png`,
  audioIds: [`vowel-audio-${sound}`], categories: ['vowel'], tags: [], availableFromUnit: 5,
})
const words = [word('abeja', 'a'), word('agua', 'a'), word('oso', 'o'), word('ola', 'o'), word('uvas', 'u')]

describe('variantes de sonido inicial', () => {
  it('crea opciones de vocal limitadas a las disponibles', () => {
    const rounds = buildVowelChoiceRounds(words, [vowel('a'), vowel('u')], 5, 'fixed')
    expect(rounds).toHaveLength(3)
    rounds.forEach((round) => expect(round.options.map(({ id }) => id)).not.toContain('vowel-o'))
  })

  it('crea una ronda con varias respuestas correctas', () => {
    const [round] = buildFindWordsRounds(words, 'a', 4, 5, 'fixed')
    expect(round.correctIds).toHaveLength(2)
    expect(round.options).toHaveLength(4)
  })

  it('alterna parejas que empiezan igual y diferente', () => {
    const rounds = buildSameSoundRounds(words, 4, 'fixed')
    expect(rounds.map(({ correctAnswer }) => correctAnswer)).toEqual(['yes', 'no', 'yes', 'no'])
  })
})
