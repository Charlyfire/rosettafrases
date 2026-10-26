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
 it('permite llegar a una escena que necesita cambiar sujetos y frases a la vez',()=>{
  const view=render(<SentenceConfigScreen title="Escenas" scene available={(settings)=>settings.subjectCount===2 && settings.clauseCount===2 && settings.complementCount===1} onBack={()=>{}} onStart={()=>{}} />)
  const fields=view.container.querySelectorAll('fieldset')
  expect((fields[0].querySelectorAll('button')[1] as HTMLButtonElement).disabled).toBe(false)
  fireEvent.click(fields[0].querySelectorAll('button')[1])
  expect((screen.getByRole('button',{name:'Empezar'}) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.click(fields[2].querySelectorAll('button')[1])
  expect((screen.getByRole('button',{name:'Empezar'}) as HTMLButtonElement).disabled).toBe(false)
 })

})
