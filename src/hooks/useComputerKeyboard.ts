import { useEffect, useRef } from 'react'

// Computer-keyboard -> semitone offset from the base C (Ableton-style row).
export const KEY_MAP: Record<string, number> = {
  a: 0, w: 1, s: 2, e: 3, d: 4, f: 5, t: 6, g: 7, y: 8, h: 9, u: 10, j: 11, k: 12,
}

interface Options {
  octave: number
  setOctave: (fn: (o: number) => number) => void
  noteOn: (midi: number) => void
  noteOff: (midi: number) => void
}

/**
 * Wires the computer keyboard to a playable synth: the A–K row plays one
 * chromatic octave, Z / X shift the octave. The exact note each physical key
 * triggered is remembered, so changing octave mid-hold can't strand a note.
 */
export function useComputerKeyboard({ octave, setOctave, noteOn, noteOff }: Options) {
  const octaveRef = useRef(octave)
  octaveRef.current = octave

  useEffect(() => {
    const held = new Map<string, number>()
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return
      const key = e.key.toLowerCase()
      if (key === 'z') return setOctave((o) => Math.max(1, o - 1))
      if (key === 'x') return setOctave((o) => Math.min(7, o + 1))
      const off = KEY_MAP[key]
      if (off === undefined || held.has(key)) return
      const midi = 12 * (octaveRef.current + 1) + off
      held.set(key, midi)
      noteOn(midi)
    }
    const onKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      const midi = held.get(key)
      if (midi === undefined) return
      held.delete(key)
      noteOff(midi)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [noteOn, noteOff, setOctave])
}
