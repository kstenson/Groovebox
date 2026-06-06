import { useCallback, useRef } from 'react'
import { midiToName } from '../theory'

interface KeyboardProps {
  startMidi: number // MIDI note of the leftmost white key (should be a C)
  octaves: number
  activeNotes: Set<number>
  onNoteOn: (midi: number) => void
  onNoteOff: (midi: number) => void
  /** Optional map of midi -> key label hint (e.g. computer-key bindings). */
  keyHints?: Record<number, string>
}

const WHITE_OFFSETS = [0, 2, 4, 5, 7, 9, 11]
const BLACK_OFFSETS = [1, 3, 6, 8, 10]
// Position (in white-key widths from the octave's left edge) of each black key.
const BLACK_POS: Record<number, number> = { 1: 0.7, 3: 1.7, 6: 3.7, 8: 4.7, 10: 5.7 }

export function Keyboard({
  startMidi,
  octaves,
  activeNotes,
  onNoteOn,
  onNoteOff,
  keyHints,
}: KeyboardProps) {
  const pointerDown = useRef(false)

  const whiteKeys: number[] = []
  const blackKeys: number[] = []
  for (let o = 0; o < octaves; o++) {
    for (const off of WHITE_OFFSETS) whiteKeys.push(startMidi + o * 12 + off)
    for (const off of BLACK_OFFSETS) blackKeys.push(startMidi + o * 12 + off)
  }
  const whitePerOctave = WHITE_OFFSETS.length

  const press = useCallback((midi: number) => onNoteOn(midi), [onNoteOn])
  const release = useCallback((midi: number) => onNoteOff(midi), [onNoteOff])

  const handleDown = useCallback(
    (midi: number) => (e: React.PointerEvent) => {
      e.preventDefault()
      pointerDown.current = true
      press(midi)
    },
    [press],
  )

  const handleUp = useCallback((midi: number) => () => release(midi), [release])
  const handleEnter = useCallback(
    (midi: number) => () => {
      if (pointerDown.current) press(midi)
    },
    [press],
  )
  const handleLeave = useCallback((midi: number) => () => release(midi), [release])

  const endAll = useCallback(() => {
    pointerDown.current = false
  }, [])

  return (
    <div className="keyboard" onPointerUp={endAll} onPointerLeave={endAll} onPointerCancel={endAll}>
      <div className="keys-white">
        {whiteKeys.map((midi) => (
          <button
            key={midi}
            className={`wkey ${activeNotes.has(midi) ? 'active' : ''}`}
            onPointerDown={handleDown(midi)}
            onPointerUp={handleUp(midi)}
            onPointerEnter={handleEnter(midi)}
            onPointerLeave={handleLeave(midi)}
            aria-label={midiToName(midi)}
          >
            {keyHints?.[midi] && <span className="key-hint">{keyHints[midi]}</span>}
            <span className="key-name">{midiToName(midi)}</span>
          </button>
        ))}
      </div>
      <div className="keys-black">
        {blackKeys.map((midi) => {
          const octaveIndex = Math.floor((midi - startMidi) / 12)
          const semitone = ((midi - startMidi) % 12 + 12) % 12
          const left = (octaveIndex * whitePerOctave + BLACK_POS[semitone]) /
            (octaves * whitePerOctave)
          return (
            <button
              key={midi}
              className={`bkey ${activeNotes.has(midi) ? 'active' : ''}`}
              style={{ left: `${left * 100}%`, width: `${(1 / (octaves * whitePerOctave)) * 0.6 * 100}%` }}
              onPointerDown={handleDown(midi)}
              onPointerUp={handleUp(midi)}
              onPointerEnter={handleEnter(midi)}
              onPointerLeave={handleLeave(midi)}
              aria-label={midiToName(midi)}
            >
              {keyHints?.[midi] && <span className="key-hint">{keyHints[midi]}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
