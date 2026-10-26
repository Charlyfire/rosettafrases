import type { SentenceGameSettings } from '../../domain/activity'
import type { Pictogram } from '../../domain/content'
import type { ActionCompatibility, SentenceDefinition } from '../../domain/sentence'
import { SentenceConfigScreen } from '../sentences/SentenceConfigScreen'
import { buildSentencePlans } from '../sentences/sentencePlans'
import type { SentenceGameMode } from './sentenceGameRounds'

interface Props {
  mode: SentenceGameMode
  pictograms: Pictogram[]
  sentences: SentenceDefinition[]
  compatibility: ActionCompatibility[]
  onBack: () => void
  onStart: (settings: SentenceGameSettings) => void
}
const titles: Record<SentenceGameMode, string> = {
  'complete-dictation': 'Dictado completo', 'sentence-order': 'Ordenar frase', 'scene-sentence': 'Construir frase a partir de imagen',
}
export function SentenceGameConfigScreen({ mode, pictograms, sentences, compatibility, onBack, onStart }: Props) {
  return <SentenceConfigScreen title={titles[mode]} scene={mode === 'scene-sentence'} available={(settings) =>
    buildSentencePlans(sentences, pictograms, compatibility, { ...settings, roundCount: 1 }, mode === 'scene-sentence').length > 0
  } onBack={onBack} onStart={onStart} />
}
