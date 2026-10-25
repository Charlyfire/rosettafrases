import type { VowelSound } from '../../domain/activity'

export const initialSoundInstructionFiles: Record<VowelSound, string> = {
  a: 'audio/words/Cuál empieza por A.mp3',
  e: 'audio/words/Cuál empieza por E.mp3',
  i: 'audio/words/Cuál empieza por I .mp3',
  o: 'audio/words/Cuál empieza por O.mp3',
  u: 'audio/words/Cuál empieza por U.mp3',
}

export const findWordsInstructionFiles: Record<VowelSound, string> = {
  a: 'audio/words/Busca las palabras que empiezan por A.mp3',
  e: 'audio/words/Busca las palabras que empiezan por E.mp3',
  i: 'audio/words/Busca las palabras que empiezan por I.mp3',
  o: 'audio/words/Busca las palabras que empiezan por O.mp3',
  u: 'audio/words/Busca las palabras que empiezan por U.mp3',
}

export const retryAudioFile = 'audio/words/escucha otra vez.mp3'
export const wrongFeedbackAudioFile = 'audio/words/casi intentalo otra vez.mp3'
export const listenHowItStartsAudioFile = 'audio/words/Escucha cómo empieza.mp3'
export const sameSoundInstructionAudioFile = 'audio/words/empiezan igual_.mp3'

export const positiveFeedback = [
  { text: 'Muy bien', file: 'audio/words/Muy bien .mp3' },
  { text: 'Eso es', file: 'audio/words/eso es.mp3' },
  { text: 'Correcto', file: 'audio/words/Correcto.mp3' },
  { text: 'Bien hecho', file: 'audio/words/Bien Hecho.mp3' },
] as const
