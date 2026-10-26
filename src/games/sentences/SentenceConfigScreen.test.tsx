// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { SentenceConfigScreen } from './SentenceConfigScreen'

afterEach(cleanup)
describe('menú docente común',()=>{
 it.each(['Construye tu oración','Dictado secuenciado','Dictado completo','Ordenar frase'])('ofrece tres controles con el mismo significado en %s',(title)=>{
  const start=vi.fn()
  const view=render(<SentenceConfigScreen title={title} available={()=>true} onBack={()=>{}} onStart={start} />)
  const fields=view.container.querySelectorAll('fieldset')
  expect(fields).toHaveLength(3)
  fireEvent.click(fields[0].querySelectorAll('button')[1])
  fireEvent.click(fields[2].querySelectorAll('button')[1])
  fireEvent.click(screen.getByRole('button',{name:'Empezar'}))
  expect(start).toHaveBeenCalledWith({subjectCount:2,complementCount:1,clauseCount:2,roundCount:5})
  expect(screen.getByText(/No es el número de actividades/)).toBeTruthy()
 })
})
