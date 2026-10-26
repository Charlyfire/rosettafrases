import { useEffect, useRef } from 'react'
import { SentenceStructureBoard, type SentenceStructureBoardProps } from './SentenceStructureBoard'

export function SentenceBoardViewport(props: SentenceStructureBoardProps) {
  const viewport = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const board = viewport.current
    const active = board?.querySelector('.sentence-board__slot--active')
    if (!board || !active) return
    const bounds = board.getBoundingClientRect()
    const target = active.getBoundingClientRect()
    if (target.right > bounds.right) board.scrollLeft += target.right - bounds.right + 8
    else if (target.left < bounds.left) board.scrollLeft -= bounds.left - target.left + 8
  }, [props.activeIndex])
  return <div className={`sentence-workspace__board ${props.showLabels ? '' : 'sentence-workspace__board--pictures'}`} ref={viewport}>
    <SentenceStructureBoard {...props} />
  </div>
}
