// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { SentenceBuilderPlayer } from './SentenceBuilderPlayer'
import { SentenceGamePlayer } from '../sentence-games/SentenceGamePlayer'
import { DictationPlayer } from '../dictation/DictationPlayer'
import type { AudioResource, Pictogram } from '../../domain/content'
import type { SentencePart } from '../dictation/dictationRounds'

const audio = vi.hoisted(() => ({ audioError: false, play: vi.fn(), playCompactSequence: vi.fn(), stop: vi.fn() }))
vi.mock('../../hooks/useAudioPlayer', () => ({ useAudioPlayer: () => audio }))
const roles: SentencePart[] = ['subject', 'action', 'complement', 'conjunction', 'complement', 'punctuation']
const ids = ['papa', 'come', 'arroz', 'y', 'pan', 'punto']
const parts: Pictogram[] = ids.map((id, index) => ({ id, label: id, image: `${id}.png`, audioIds: [id], categories: [roles[index]], tags: [], availableFromUnit: 1 }))
const resources: AudioResource[] = [...ids.map((id) => ({ id, file: `${id}.mp3`, kind: 'word' as const })), { id: 'full', file: 'full.mp3', kind: 'sentence' }]
const sentence = { id: 'sentence', subjectId: 'papa', actionId: 'come', complementIds: ['arroz', 'pan'], availableFromUnit: 1 }
const spokenFiles = ids.filter((id) => id !== 'punto').map((id) => `${id}.mp3`)
const exit = vi.fn()
const chooseAll = () => ids.forEach((id) => fireEvent.click(screen.getByRole('button', { name: id })))

afterEach(cleanup)
beforeEach(() => vi.clearAllMocks())

describe('tarjetas y lectura de oraciones', () => {
  it('escuchar una tarjeta no la coloca; tocar el dibujo y colocar el punto no los lee', () => {
    const view = render(<SentenceBuilderPlayer pictograms={parts} audioResources={resources} sentences={[]} compatibility={[{ actionId: 'come', allowedComplementIds: ['arroz', 'pan'] }]} settings={{ subjectCount: 1, complementCount: 2, roundCount: 1 }} onExit={exit} />)
    // Previews remain available even before it is that role’s turn.
    fireEvent.click(screen.getByRole('button', { name: 'Escuchar come' }))
    expect(audio.play).toHaveBeenLastCalledWith('come.mp3')
    expect(view.container.querySelectorAll('.sentence-board img')).toHaveLength(0)
    audio.play.mockClear()
    chooseAll()
    expect(view.container.querySelectorAll('.sentence-board img')).toHaveLength(6)
    expect(audio.play).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Escuchar la frase completa' }))
    expect(audio.playCompactSequence).toHaveBeenCalledWith(spokenFiles)
  })

  it('oculta los incompatibles por defecto y permite mostrarlos sin hacerlos seleccionables', () => {
    const water: Pictogram = { ...parts[2], id: 'agua', label: 'agua' }
    const cook: Pictogram = { ...parts[1], id: 'cocina', label: 'cocina' }
    render(<SentenceBuilderPlayer pictograms={[...parts, water, cook]} audioResources={resources} sentences={[]} compatibility={[
      { actionId: 'come', allowedComplementIds: ['arroz', 'pan'] },
      { actionId: 'cocina', allowedComplementIds: ['arroz', 'agua'] },
    ]} settings={{ subjectCount: 1, complementCount: 2, roundCount: 1 }} onExit={exit} />)
    expect(screen.queryByRole('button', { name: 'agua' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'papa' }))
    fireEvent.click(screen.getByRole('button', { name: 'come' }))
    expect(screen.getByRole('button', { name: 'arroz' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'agua' })).toBeNull()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Ocultar complementos incompatibles' }))
    expect((screen.getByRole('button', { name: 'agua' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Ocultar complementos incompatibles' }))
    expect(screen.queryByRole('button', { name: 'agua' })).toBeNull()
  })

  it('actualiza el banco para el verbo del segundo sujeto sin heredar el primero', () => {
    const extra: Pictogram[] = [
      { ...parts[0], id: 'mama', label: 'mama' },
      { ...parts[1], id: 'bebe', label: 'bebe' },
      { ...parts[2], id: 'agua', label: 'agua' },
    ]
    render(<SentenceBuilderPlayer pictograms={[...parts, ...extra]} audioResources={resources} sentences={[]} compatibility={[
      { actionId: 'come', allowedComplementIds: ['arroz', 'pan'] },
      { actionId: 'bebe', allowedComplementIds: ['agua'] },
    ]} settings={{ subjectCount: 2, complementCount: 1, roundCount: 1 }} onExit={exit} />)
    for (const name of ['papa', 'come', 'arroz', 'y', 'mama']) fireEvent.click(screen.getByRole('button', { name }))
    expect(screen.queryByRole('button', { name: 'arroz' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'bebe' }))
    expect(screen.getByRole('button', { name: 'agua' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'arroz' })).toBeNull()
  })

  it('no muestra alimentos con un verbo sin complementos', () => {
    const run: Pictogram = { ...parts[1], id: 'corre', label: 'corre' }
    const view = render(<SentenceBuilderPlayer pictograms={[...parts, run]} audioResources={resources} sentences={[]} compatibility={[
      { actionId: 'corre', allowWithoutComplement: true, allowedComplementIds: [] },
    ]} settings={{ subjectCount: 1, complementCount: 0, roundCount: 1 }} onExit={exit} />)
    fireEvent.click(screen.getByRole('button', { name: 'papa' }))
    fireEvent.click(screen.getByRole('button', { name: 'corre' }))
    expect(view.container.querySelector('.sentence-bank--complements')).toBeNull()
    expect(screen.queryByRole('button', { name: 'arroz' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'punto' }))
    expect(screen.getByRole('button', { name: 'Escuchar la frase completa' })).toBeTruthy()
  })

  it('permite sustituir una tarjeta intermedia y cancelar el cambio sin borrar las demás', () => {
    const extra: Pictogram = { ...parts[2], id: 'fruta', label: 'fruta' }
    const view = render(<SentenceBuilderPlayer pictograms={[...parts, extra]} audioResources={resources} sentences={[]} compatibility={[{ actionId: 'come', allowedComplementIds: ['arroz', 'pan', 'fruta'] }]} settings={{ subjectCount: 1, complementCount: 2, roundCount: 1 }} onExit={exit} />)
    chooseAll()
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar complemento: arroz' }))
    expect((screen.getByRole('button', { name: 'pan' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'fruta' }))
    expect(view.container.querySelectorAll('.sentence-board img')).toHaveLength(6)
    expect(screen.getByRole('button', { name: 'Cambiar complemento: fruta' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Cambiar complemento: pan' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar acción: come' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar cambio' }))
    expect(screen.getByRole('button', { name: 'Escuchar la frase completa' })).toBeTruthy()
    expect(view.container.querySelectorAll('.sentence-board img')).toHaveLength(6)
    expect(audio.play).not.toHaveBeenCalled()
  })

  it('al cambiar el verbo solo vacía complementos incompatibles y permite reparar los huecos', () => {
    const extra: Pictogram[] = [
      { ...parts[1], id: 'corta', label: 'corta' },
      { ...parts[2], id: 'fruta', label: 'fruta' },
    ]
    const view = render(<SentenceBuilderPlayer pictograms={[...parts, ...extra]} audioResources={resources} sentences={[]} compatibility={[
      { actionId: 'come', allowedComplementIds: ['arroz', 'pan'] },
      { actionId: 'corta', allowedComplementIds: ['pan', 'fruta'] },
    ]} settings={{ subjectCount: 1, complementCount: 2, roundCount: 1 }} onExit={exit} />)
    chooseAll()
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar acción: come' }))
    fireEvent.click(screen.getByRole('button', { name: 'corta' }))
    expect(view.container.querySelectorAll('.sentence-board img')).toHaveLength(5)
    expect(screen.getByRole('button', { name: 'Cambiar complemento: pan' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Cambiar final: punto' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Escuchar la frase completa' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'fruta' }))
    expect(screen.getByRole('button', { name: 'Escuchar la frase completa' })).toBeTruthy()
    expect(view.container.querySelectorAll('.sentence-board img')).toHaveLength(6)
  })

  it('filtra por categoría respetando el verbo, restablece la categoría al cambiarlo y no coloca al escuchar', () => {
    const food: Pictogram = { ...parts[2], categories: ['complement', 'food'] }
    const water: Pictogram = { ...parts[2], id: 'agua', label: 'agua', categories: ['complement', 'food', 'drink'] }
    const toy: Pictogram = { ...parts[2], id: 'juguete', label: 'juguete', categories: ['complement', 'toy'] }
    const buy: Pictogram = { ...parts[1], id: 'compra', label: 'compra' }
    const view = render(<SentenceBuilderPlayer pictograms={[...parts.filter(({ id }) => id !== 'arroz'), food, water, toy, buy]} audioResources={resources} sentences={[]} compatibility={[
      { actionId: 'come', allowedComplementIds: ['arroz', 'pan'] },
      { actionId: 'compra', allowedComplementIds: ['arroz', 'pan', 'agua', 'juguete'] },
    ]} settings={{ subjectCount: 1, complementCount: 1, roundCount: 1 }} onExit={exit} />)
    for (const name of ['papa', 'compra']) fireEvent.click(screen.getByRole('button', { name }))
    fireEvent.click(screen.getByRole('button', { name: 'Bebidas' }))
    expect(screen.queryByRole('button', { name: 'arroz' })).toBeNull()
    expect(screen.getByRole('button', { name: 'agua' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Escuchar agua' }))
    expect(view.container.querySelectorAll('.sentence-board img')).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: 'Objetos' }))
    expect(screen.getByRole('button', { name: 'juguete' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar acción: compra' }))
    fireEvent.click(screen.getByRole('button', { name: 'come' }))
    expect(screen.queryByRole('button', { name: 'agua' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'juguete' })).toBeNull()
    expect(screen.getByRole('button', { name: 'arroz' })).toBeTruthy()
  })

  it('lee el MP3 completo sin añadir el audio de punto', () => {
    render(<SentenceBuilderPlayer pictograms={parts} audioResources={resources} sentences={[{ ...sentence, audioId: 'full' }]} compatibility={[{ actionId: 'come', allowedComplementIds: ['arroz', 'pan'] }]} settings={{ subjectCount: 1, complementCount: 2, roundCount: 1 }} onExit={exit} />)
    chooseAll()
    fireEvent.click(screen.getByRole('button', { name: 'Escuchar la frase completa' }))
    expect(audio.play).toHaveBeenCalledExactlyOnceWith('full.mp3')
    expect(audio.playCompactSequence).not.toHaveBeenCalled()
  })

  it.each([false, true])('ordenar frase mantiene el punto obligatorio y silencioso (MP3 completo: %s)', (full) => {
    const view = render(<SentenceGamePlayer mode="sentence-order" rounds={[{ id: 'r', sentence, parts, roles, options: parts, audioId: full ? 'full' : undefined }]} audioResources={resources} showLabels={false} onExit={exit} />)
    fireEvent.click(screen.getByRole('button', { name: 'Escuchar papa' }))
    expect(view.container.querySelectorAll('.sentence-board img')).toHaveLength(0)
    ids.slice(0, -1).forEach((id) => fireEvent.click(screen.getByRole('button', { name: id })))
    expect(screen.queryByRole('button', { name: 'Leer la frase completa' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'punto' }))
    audio.play.mockClear()
    fireEvent.click(screen.getByRole('button', { name: 'Leer la frase completa' }))
    if (full) expect(audio.play).toHaveBeenCalledExactlyOnceWith('full.mp3')
    else expect(audio.playCompactSequence).toHaveBeenCalledWith(spokenFiles)
  })

  it.each([false, true])('dictado secuenciado no añade punto a la lectura (MP3 completo: %s)', (full) => {
    render(<DictationPlayer rounds={[{ id: 'r', sentence: { ...sentence, audioId: full ? 'full' : undefined }, parts, steps: parts.map((part, index) => ({ role: roles[index], correctId: part.id, options: [part] })) }]} audioResources={resources} audioAutoplay={false} showLabels={false} onExit={exit} />)
    chooseAll()
    // Completing the round must not have its final reading stopped by prompt cleanup.
    expect(audio.play.mock.invocationCallOrder.at(-1)).toBeGreaterThan(audio.stop.mock.invocationCallOrder.at(-1) ?? 0)
    audio.play.mockClear()
    fireEvent.click(screen.getByRole('button', { name: 'Repetir frase' }))
    if (full) expect(audio.play).toHaveBeenCalledExactlyOnceWith('full.mp3')
    else expect(audio.playCompactSequence).toHaveBeenCalledWith(spokenFiles)
  })
})
