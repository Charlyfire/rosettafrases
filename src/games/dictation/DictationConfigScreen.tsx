import type { SequentialDictationSettings } from '../../domain/activity'
import type { Pictogram } from '../../domain/content'
import type { ActionCompatibility, SentenceDefinition } from '../../domain/sentence'
import { SentenceConfigScreen } from '../sentences/SentenceConfigScreen'
import { buildSentencePlans } from '../sentences/sentencePlans'

interface Props {
  pictograms: Pictogram[]
  sentences: SentenceDefinition[]
  compatibility: ActionCompatibility[]
  onBack: () => void
  onStart: (settings: SequentialDictationSettings) => void
}
export function DictationConfigScreen({ pictograms, sentences, compatibility, onBack, onStart }: Props) {
  return <SentenceConfigScreen title="Dictado secuenciado" available={(settings) =>
    buildSentencePlans(sentences, pictograms, compatibility, { ...settings, roundCount: 1 }).length > 0
  } onBack={onBack} onStart={onStart} />
}
