import type { SentenceBuilderSettings } from '../../domain/activity'
import type { Pictogram } from '../../domain/content'
import type { ActionCompatibility } from '../../domain/sentence'
import { SentenceConfigScreen } from '../sentences/SentenceConfigScreen'
import { builderChoices } from './builderSession'

interface Props {
  pictograms: Pictogram[]
  compatibility: ActionCompatibility[]
  onBack: () => void
  onStart: (settings: SentenceBuilderSettings) => void
}

export function SentenceBuilderConfigScreen({ pictograms, compatibility, onBack, onStart }: Props) {
  return <SentenceConfigScreen title="Construye tu oración" available={(settings) =>
    builderChoices(pictograms, compatibility, settings).subjects.length >= settings.subjectCount
  } onBack={onBack} onStart={onStart} />
}
