import { useEffect, useState } from 'react'
import type { Pictogram } from '../domain/content'
import { readClassroom } from './classroomRepository'

interface Props {
  eligible: Pictogram[]
  /** Optional restriction for activities that only accept particular initial sounds. */
  sounds?: string[]
}

/** Counts only. Never sends or logs names, photos or recordings. */
export function ClassroomParticipationNotice({ eligible, sounds }: Props) {
  const [classSize, setClassSize] = useState<number | null>(null)
  const [active, setActive] = useState(false)
  useEffect(() => {
    let mounted = true
    void readClassroom().then(({ pupils, mode }) => {
      if (mounted) {
        setActive(mode === 'class')
        setClassSize(pupils.length)
      }
    }).catch(() => {
      if (mounted) setClassSize(null)
    })
    return () => { mounted = false }
  }, [])
  if (!active || classSize === null) return null
  const candidates = eligible.filter((item) =>
    item.tags.includes('classroom') && (!sounds || sounds.includes(item.initialSound ?? '')))
  const included = new Set(candidates.map(({ id }) => id)).size
  const excluded = Math.max(0, classSize - included)
  return <p className="config-help" role="status">
    Mi clase: {included} de {classSize} alumnos disponibles en esta actividad.
    {excluded > 0 ? ` ${excluded} no participarán con la configuración elegida (por fotografía pendiente, sonido inicial u otros requisitos).` : ''}
    {included === 0 ? ' Selecciona otra configuración o revisa Mi clase antes de empezar.' : ''}
  </p>
}
