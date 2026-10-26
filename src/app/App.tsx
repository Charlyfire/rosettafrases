import { useCallback, useEffect, useState } from 'react'
import { loadAppContent } from '../content/contentRepository'
import { ContentManagerScreen } from '../content/ContentManagerScreen'
import { selectContent } from '../content/contentFilters'
import type {
  ActivityDefinition,
  BitsSettings,
  FindSameInitialSettings,
  InitialSoundSettings,
  IntruderSettings,
  LearningPhase,
  ListenAndFindSettings,
  SentenceBuilderSettings,
  SentenceGameSettings,
  SequentialDictationSettings,
  VowelSortSettings,
  VowelSound,
} from '../domain/activity'
import type { ContentBank, LocalContentRecord } from '../domain/content'
import type { RosettaSequence } from '../domain/rosetta'
import type { ActionCompatibility, SentenceDefinition, LocalSceneRecord } from '../domain/sentence'
import { BitsConfigScreen } from '../games/bits/BitsConfigScreen'
import { BitsPlayer } from '../games/bits/BitsPlayer'
import { ListenConfigScreen } from '../games/recognition/ListenConfigScreen'
import { InitialSoundConfigScreen } from '../games/recognition/InitialSoundConfigScreen'
import { RecognitionPlayer } from '../games/recognition/RecognitionPlayer'
import { InitialSoundPlayer } from '../games/recognition/InitialSoundPlayer'
import { DictationConfigScreen } from '../games/dictation/DictationConfigScreen'
import { DictationPlayer } from '../games/dictation/DictationPlayer'
import { buildDictationRounds } from '../games/dictation/dictationRounds'
import { buildListenAndFindRounds } from '../games/recognition/recognitionRounds'
import { buildFindWordsRounds, buildSameSoundRounds, buildVowelChoiceRounds } from '../games/recognition/initialSoundRounds'
import { SentenceBuilderConfigScreen } from '../games/sentence-builder/SentenceBuilderConfigScreen'
import { SentenceBuilderPlayer } from '../games/sentence-builder/SentenceBuilderPlayer'
import { FindSameInitialConfigScreen } from '../games/recognition/FindSameInitialConfigScreen'
import { FindSameInitialPlayer } from '../games/recognition/FindSameInitialPlayer'
import { buildFindSameInitialRounds } from '../games/recognition/findSameInitialRounds'
import { VowelSortConfigScreen } from '../games/vowel-sort/VowelSortConfigScreen'
import { VowelSortPlayer } from '../games/vowel-sort/VowelSortPlayer'
import { buildVowelSortItems } from '../games/vowel-sort/vowelSortItems'
import { IntruderConfigScreen } from '../games/recognition/IntruderConfigScreen'
import { IntruderPlayer } from '../games/recognition/IntruderPlayer'
import { buildIntruderRounds } from '../games/recognition/intruderRounds'
import { SentenceGameConfigScreen } from '../games/sentence-games/SentenceGameConfigScreen'
import { SentenceGamePlayer } from '../games/sentence-games/SentenceGamePlayer'
import { buildSentenceGameRounds, type SentenceGameMode } from '../games/sentence-games/sentenceGameRounds'

type View =
  | 'home'
  | 'bits-config'
  | 'bits-player'
  | 'content-manager'
  | 'listen-config'
  | 'listen-player'
  | 'initial-config'
  | 'initial-player'
  | 'find-same-config'
  | 'find-same-player'
  | 'intruder-config'
  | 'intruder-player'
  | 'dictation-config'
  | 'dictation-player'
  | 'sentence-builder-config'
  | 'sentence-builder-player'
  | 'vowel-sort-config'
  | 'vowel-sort-player'
  | 'complete-dictation-config'
  | 'complete-dictation-player'
  | 'sentence-order-config'
  | 'sentence-order-player'
  | 'scene-sentence-config'
  | 'scene-sentence-player'
type AppData = {
  content: ContentBank
  activities: ActivityDefinition[]
  sequence: RosettaSequence
  sentences: SentenceDefinition[]
  actionCompatibility: ActionCompatibility[]
  localRecords: LocalContentRecord[]
  localScenes:LocalSceneRecord[]
  localRules:ActionCompatibility[]
  bundledPictograms:ContentBank['pictograms']
  baseCompatibility:ActionCompatibility[]
}

const phaseLabels: Record<LearningPhase, { title: string; description: string }> = {
  present: { title: 'Presentar', description: 'Observar y escuchar el contenido.' },
  recognize: { title: 'Reconocer', description: 'Identificar entre varias opciones.' },
  build: { title: 'Construir', description: 'Organizar y producir estructuras.' },
}

const interleave = <T,>(groups: T[][], limit: number): T[] => {
  const result: T[] = []
  for (let index = 0; result.length < limit; index += 1) {
    let added = false
    groups.forEach((group) => {
      if (group[index] && result.length < limit) {
        result.push(group[index])
        added = true
      }
    })
    if (!added) break
  }
  return result
}

export function App() {
  const [data, setData] = useState<AppData | null>(null)
  const [view, setView] = useState<View>('home')
  const [settings, setSettings] = useState<BitsSettings | null>(null)
  const [listenSettings, setListenSettings] = useState<ListenAndFindSettings | null>(null)
  const [initialSettings, setInitialSettings] = useState<InitialSoundSettings | null>(null)
  const [findSameSettings, setFindSameSettings] = useState<FindSameInitialSettings | null>(null)
  const [intruderSettings, setIntruderSettings] = useState<IntruderSettings | null>(null)
  const [dictationSettings, setDictationSettings] = useState<SequentialDictationSettings | null>(null)
  const [sentenceBuilderSettings, setSentenceBuilderSettings] = useState<SentenceBuilderSettings | null>(null)
  const [vowelSortSettings, setVowelSortSettings] = useState<VowelSortSettings | null>(null)
  const [sentenceGameSettings, setSentenceGameSettings] = useState<SentenceGameSettings | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refreshData = useCallback(async () => {
    const nextData = await loadAppContent()
    setData(nextData)
  }, [])

  useEffect(() => {
    refreshData().catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : 'No se pudo cargar el contenido.')
    })
  }, [refreshData])

  if (error) {
    return <main className="status-screen"><h1>Rosetta Digital</h1><p>{error}</p></main>
  }
  if (!data) {
    return <main className="status-screen"><h1>Rosetta Digital</h1><p>Cargando contenido…</p></main>
  }

  if (view === 'bits-config') {
    return (
      <BitsConfigScreen
        pictograms={data.content.pictograms}
        units={data.sequence.units}
        onBack={() => setView('home')}
        onStart={(nextSettings) => {
          setSettings(nextSettings)
          setView('bits-player')
        }}
      />
    )
  }

  if (view === 'content-manager') {
    return (
      <ContentManagerScreen
        bundledPictograms={data.bundledPictograms}
        pictograms={data.content.pictograms}
        localScenes={data.localScenes}
        localRules={data.localRules}
        compatibility={data.actionCompatibility}
        baseCompatibility={data.baseCompatibility}
        localRecords={data.localRecords}
        onBack={() => setView('home')}
        onChanged={refreshData}
      />
    )
  }

  if (view === 'listen-config') {
    return (
      <ListenConfigScreen
        pictograms={data.content.pictograms}
        units={data.sequence.units}
        onBack={() => setView('home')}
        onStart={(nextSettings) => {
          setListenSettings(nextSettings)
          setView('listen-player')
        }}
      />
    )
  }

  if (view === 'initial-config') {
    return (
      <InitialSoundConfigScreen
        pictograms={data.content.pictograms}
        units={data.sequence.units}
        onBack={() => setView('home')}
        onStart={(nextSettings) => {
          setInitialSettings(nextSettings)
          setView('initial-player')
        }}
      />
    )
  }

  if (view === 'find-same-config') {
    return <FindSameInitialConfigScreen pictograms={data.content.pictograms} units={data.sequence.units} onBack={() => setView('home')} onStart={(nextSettings) => { setFindSameSettings(nextSettings); setView('find-same-player') }} />
  }

  if (view === 'intruder-config') {
    return <IntruderConfigScreen pictograms={data.content.pictograms} units={data.sequence.units} onBack={() => setView('home')} onStart={(nextSettings) => { setIntruderSettings(nextSettings); setView('intruder-player') }} />
  }

  if (view === 'vowel-sort-config') {
    return <VowelSortConfigScreen pictograms={data.content.pictograms} units={data.sequence.units} onBack={() => setView('home')} onStart={(nextSettings) => { setVowelSortSettings(nextSettings); setView('vowel-sort-player') }} />
  }

  if (view === 'complete-dictation-config' || view === 'sentence-order-config' || view === 'scene-sentence-config') {
    const mode: SentenceGameMode = view === 'complete-dictation-config' ? 'complete-dictation' : view === 'sentence-order-config' ? 'sentence-order' : 'scene-sentence'
    return <SentenceGameConfigScreen mode={mode} pictograms={data.content.pictograms} sentences={data.sentences} compatibility={data.actionCompatibility} onBack={() => setView('home')} onStart={(nextSettings) => {
      setSentenceGameSettings(nextSettings)
      setView(mode === 'complete-dictation' ? 'complete-dictation-player' : mode === 'sentence-order' ? 'sentence-order-player' : 'scene-sentence-player')
    }} />
  }

  if (view === 'dictation-config') {
    return (
      <DictationConfigScreen
        pictograms={data.content.pictograms}
        sentences={data.sentences}
        compatibility={data.actionCompatibility}
        onBack={() => setView('home')}
        onStart={(nextSettings) => {
          setDictationSettings(nextSettings)
          setView('dictation-player')
        }}
      />
    )
  }

  if (view === 'sentence-builder-config') {
    return (
      <SentenceBuilderConfigScreen
        pictograms={data.content.pictograms}
        compatibility={data.actionCompatibility}
        onBack={() => setView('home')}
        onStart={(nextSettings) => {
          setSentenceBuilderSettings(nextSettings)
          setView('sentence-builder-player')
        }}
      />
    )
  }

  if (view === 'bits-player' && settings) {
    const unit = data.sequence.units.find(({ id }) => id === settings.unit)
    const pictograms = (settings.contentType === 'initial-sound-words'
      ? settings.selectedSounds.flatMap((sound) => selectContent(data.content.pictograms, settings.contentType, settings.unit, sound))
      : selectContent(data.content.pictograms, settings.contentType, settings.unit)).filter((item) => settings.contentType !== 'vowels' ||
      (unit?.availableIsolatedSounds ?? []).includes(item.label.toLowerCase() as VowelSound))
    return (
      <BitsPlayer
        pictograms={pictograms}
        audioResources={data.content.audio}
        settings={settings}
        onExit={() => setView('bits-config')}
      />
    )
  }

  if (view === 'listen-player' && listenSettings) {
    const candidates = listenSettings.contentType === 'initial-sound-words'
      ? listenSettings.selectedSounds.flatMap((sound) => selectContent(data.content.pictograms, listenSettings.contentType, listenSettings.unit, sound))
      : selectContent(data.content.pictograms, listenSettings.contentType, listenSettings.unit)
    const distractorPool = data.content.pictograms.filter((pictogram) =>
      pictogram.availableFromUnit <= listenSettings.unit && !pictogram.categories.includes('vowel'))
    const rounds = buildListenAndFindRounds(
      candidates,
      listenSettings.optionCount,
      listenSettings.roundCount,
      listenSettings.order,
      distractorPool,
      listenSettings.distractorType,
    )
    return (
      <RecognitionPlayer
        mode="listen-and-find"
        rounds={rounds}
        audioResources={data.content.audio}
        audioAutoplay={listenSettings.audioAutoplay}
        allowRepeatAudio={listenSettings.allowRepeatAudio}
        feedbackAudio={listenSettings.feedbackAudio}
        showLabels={listenSettings.showLabels}
        onExit={() => setView('listen-config')}
      />
    )
  }

  if (view === 'initial-player' && initialSettings) {
    const unit = data.sequence.units.find(({ id }) => id === initialSettings.unit)
    const allowedSounds = (unit?.availableInitialSounds ?? []).filter((sound) => initialSettings.selectedSounds.includes(sound))
    const isolatedSounds = unit?.availableIsolatedSounds ?? []
    const words = data.content.pictograms.filter((pictogram) =>
      pictogram.availableFromUnit <= initialSettings.unit &&
      allowedSounds.includes(pictogram.initialSound as VowelSound),
    )
    const vowelOptions = data.content.pictograms.filter((pictogram) =>
      pictogram.categories.includes('vowel') && isolatedSounds.includes(pictogram.label.toLowerCase() as VowelSound) &&
      initialSettings.selectedSounds.includes(pictogram.label.toLowerCase() as VowelSound))
    const allUnitWords = data.content.pictograms.filter((pictogram) => pictogram.availableFromUnit <= initialSettings.unit && (unit?.availableInitialSounds ?? []).includes(pictogram.initialSound as VowelSound))
    const rounds = initialSettings.variant === 'find-words'
      ? interleave(initialSettings.selectedSounds.map((sound) => buildFindWordsRounds(allUnitWords, sound, initialSettings.optionCount, initialSettings.roundCount, initialSettings.order)), initialSettings.roundCount)
      : initialSettings.variant === 'same-sound'
        ? buildSameSoundRounds(allUnitWords, initialSettings.roundCount, initialSettings.order, initialSettings.selectedSounds)
        : buildVowelChoiceRounds(
            initialSettings.variant === 'listen-start' && words.length === 0 ? vowelOptions : words,
            vowelOptions,
            initialSettings.roundCount,
            initialSettings.order,
          )
    return (
      <InitialSoundPlayer
        variant={initialSettings.variant}
        rounds={rounds}
        audioResources={data.content.audio}
        audioAutoplay={initialSettings.audioAutoplay}
        showVowelSupport={initialSettings.showVowelSupport}
        feedbackAudio={initialSettings.feedbackAudio}
        showLabels={initialSettings.showLabels}
        onExit={() => setView('initial-config')}
      />
    )
  }

  if (view === 'find-same-player' && findSameSettings) {
    const unit = data.sequence.units.find(({ id }) => id === findSameSettings.unit)
    const allowedSounds = unit?.availableInitialSounds ?? []
    const words = data.content.pictograms.filter((pictogram) =>
      pictogram.availableFromUnit <= findSameSettings.unit && allowedSounds.includes(pictogram.initialSound as VowelSound))
    const rounds = interleave(findSameSettings.selectedSounds.map((sound) => buildFindSameInitialRounds(words, sound, findSameSettings.optionCount, findSameSettings.roundCount, findSameSettings.order)), findSameSettings.roundCount)
    return <FindSameInitialPlayer rounds={rounds} audioResources={data.content.audio} audioAutoplay={findSameSettings.audioAutoplay} showVowelSupport={findSameSettings.showVowelSupport} showLabels={findSameSettings.showLabels} onExit={() => setView('find-same-config')} />
  }

  if (view === 'vowel-sort-player' && vowelSortSettings) {
    const sounds = vowelSortSettings.selectedSounds
    const words = data.content.pictograms.filter((pictogram) =>
      pictogram.availableFromUnit <= vowelSortSettings.unit && sounds.includes(pictogram.initialSound as VowelSound))
    const items = buildVowelSortItems(words, sounds, vowelSortSettings.imageCount, vowelSortSettings.order)
    return <VowelSortPlayer items={items} sounds={sounds} audioResources={data.content.audio} showLabels={vowelSortSettings.showLabels} onExit={() => setView('vowel-sort-config')} />
  }

  if (view === 'intruder-player' && intruderSettings) {
    const availableSounds = data.sequence.units.find(({ id }) => id === intruderSettings.unit)?.availableInitialSounds ?? []
    const words = data.content.pictograms.filter((item) => item.availableFromUnit <= intruderSettings.unit && availableSounds.includes(item.initialSound as VowelSound))
    const rounds = buildIntruderRounds(words, intruderSettings.selectedSounds, intruderSettings.optionCount, intruderSettings.roundCount, intruderSettings.order)
    return <IntruderPlayer rounds={rounds} difficulty={intruderSettings.difficulty} showLabels={intruderSettings.showLabels} onExit={() => setView('intruder-config')} />
  }

  if ((view === 'complete-dictation-player' || view === 'sentence-order-player' || view === 'scene-sentence-player') && sentenceGameSettings) {
    const mode: SentenceGameMode = view === 'complete-dictation-player' ? 'complete-dictation' : view === 'sentence-order-player' ? 'sentence-order' : 'scene-sentence'
    const rounds = buildSentenceGameRounds(data.sentences, data.content.pictograms, sentenceGameSettings, mode, data.actionCompatibility)
    return <SentenceGamePlayer mode={mode} rounds={rounds} audioResources={data.content.audio} showLabels={false} onExit={() => setView(mode === 'complete-dictation' ? 'complete-dictation-config' : mode === 'sentence-order' ? 'sentence-order-config' : 'scene-sentence-config')} />
  }


  if (view === 'dictation-player' && dictationSettings) {
    const rounds = buildDictationRounds(data.sentences, data.content.pictograms, data.actionCompatibility, dictationSettings)
    return (
      <DictationPlayer
        rounds={rounds}
        audioResources={data.content.audio}
        audioAutoplay={true}
        showLabels={false}
        onExit={() => setView('dictation-config')}
      />
    )
  }

  if (view === 'sentence-builder-player' && sentenceBuilderSettings) {
    return (
      <SentenceBuilderPlayer
        pictograms={data.content.pictograms}
        audioResources={data.content.audio}
        sentences={data.sentences}
        compatibility={data.actionCompatibility}
        settings={sentenceBuilderSettings}
        onExit={() => setView('sentence-builder-config')}
      />
    )
  }

  return (
    <main className="home-screen">
      <header className="home-header">
        <div>
          <span className="eyebrow">Modo docente</span>
          <h1>Rosetta Digital</h1>
          <p>Selecciona un bloque para preparar la actividad.</p>
        </div>
        <div className="home-actions">
          <button className="button" type="button" onClick={() => setView('content-manager')}>
            Banco de contenidos
          </button>
          <button
            className="button"
            type="button"
            onClick={() => void document.documentElement.requestFullscreen?.()}
          >
            Pantalla completa
          </button>
        </div>
      </header>
      <div className="phase-grid">
        {(Object.keys(phaseLabels) as LearningPhase[]).map((phase, phaseIndex) => (
          <section className={`phase-card phase-card--${phaseIndex + 1}`} key={phase}>
            <div className="phase-card__heading">
              <span>{phaseIndex + 1}</span>
              <div>
                <h2>{phaseLabels[phase].title}</h2>
                <p>{phaseLabels[phase].description}</p>
              </div>
            </div>
            <div className="activity-list">
              {data.activities.filter((activity) => activity.phase === phase).map((activity) => (
                <button
                  className="activity-card"
                  type="button"
                  key={activity.id}
                  disabled={!activity.enabled}
                  onClick={() => {
                    if (activity.type === 'bits') setView('bits-config')
                    if (activity.type === 'listen-and-find') setView('listen-config')
                    if (activity.type === 'initial-sound') setView('initial-config')
                    if (activity.type === 'find-same-initial') setView('find-same-config')
                    if (activity.type === 'intruder') setView('intruder-config')
                    if (activity.type === 'sequential-dictation') setView('dictation-config')
                    if (activity.type === 'sentence-builder') setView('sentence-builder-config')
                    if (activity.type === 'vowel-sort') setView('vowel-sort-config')
                    if (activity.type === 'complete-dictation') setView('complete-dictation-config')
                    if (activity.type === 'sentence-order') setView('sentence-order-config')
                    if (activity.type === 'scene-sentence') setView('scene-sentence-config')
                  }}
                >
                  <span>{activity.title}</span>
                  <small>{activity.enabled ? 'Configurar' : 'No disponible en este MVP'}</small>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  )
}
