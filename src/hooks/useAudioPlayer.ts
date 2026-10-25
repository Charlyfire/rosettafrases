import { useCallback, useEffect, useRef, useState } from 'react'
import { resolveAssetUrl } from '../content/contentRepository'

export function useAudioPlayer() {
  const [audioError, setAudioError] = useState(false)
  const audioRef = useRef<HTMLAudioElement | undefined>(undefined)
  const sequenceTimerRef = useRef<number | undefined>(undefined)
  const sequenceRunRef = useRef(0)

  const stop = useCallback(() => {
    sequenceRunRef.current += 1
    audioRef.current?.pause()
    window.clearTimeout(sequenceTimerRef.current)
  }, [])

  const play = useCallback((file?: string, onEnded?: () => void) => {
    if (!file) {
      setAudioError(true)
      return
    }
    sequenceRunRef.current += 1
    window.clearTimeout(sequenceTimerRef.current)
    audioRef.current?.pause()
    const audio = new Audio(resolveAssetUrl(file))
    audioRef.current = audio
    setAudioError(false)
    audio.addEventListener('error', () => setAudioError(true), { once: true })
    if (onEnded) audio.addEventListener('ended', onEnded, { once: true })
    void audio.play().catch(() => setAudioError(true))
  }, [])

  const playSequence = useCallback((files: string[]) => {
    const playAt = (index: number) => {
      const file = files[index]
      if (!file) return
      play(file, () => {
        if (index < files.length - 1) {
          sequenceTimerRef.current = window.setTimeout(() => playAt(index + 1), 20)
        }
      })
    }
    if (files.length === 0) setAudioError(true)
    else playAt(0)
  }, [play])

  const playCompactSequence = useCallback((files: string[], tailTrimMs = 320) => {
    stop()
    const run = sequenceRunRef.current
    const playAt = (index: number) => {
      if (run !== sequenceRunRef.current) return
      const file = files[index]
      if (!file) return
      const audio = new Audio(resolveAssetUrl(file))
      audioRef.current = audio
      setAudioError(false)
      let advanced = false
      const advance = () => {
        if (advanced || run !== sequenceRunRef.current) return
        advanced = true
        window.clearTimeout(sequenceTimerRef.current)
        if (index < files.length - 1) playAt(index + 1)
      }
      audio.addEventListener('loadedmetadata', () => {
        if (index >= files.length - 1 || !Number.isFinite(audio.duration)) return
        const waitMs = Math.max(180, audio.duration * 1000 - tailTrimMs)
        sequenceTimerRef.current = window.setTimeout(advance, waitMs)
      }, { once: true })
      audio.addEventListener('ended', advance, { once: true })
      audio.addEventListener('error', () => { setAudioError(true); advance() }, { once: true })
      void audio.play().catch(() => setAudioError(true))
    }
    if (files.length === 0) setAudioError(true)
    else playAt(0)
  }, [stop])

  useEffect(() => stop, [stop])

  return { audioError, play, playSequence, playCompactSequence, stop }
}
