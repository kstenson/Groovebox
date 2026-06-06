import { useCallback, useEffect, useRef, useState } from 'react'
import { FMSynth, DEFAULT_FM_MACROS, type FMMacros } from '../audio/FMSynth'
import { Knob } from '../components/Knob'
import { Keyboard } from '../components/Keyboard'
import { Scope } from '../components/Scope'
import { KEY_MAP, useComputerKeyboard } from '../hooks/useComputerKeyboard'

const COLORS = {
  pink: '#ff5d9e',
  yellow: '#ffd23d',
  cyan: '#36d1c4',
  purple: '#9b6cff',
}

export function FMSynthPage() {
  const synthRef = useRef<FMSynth | null>(null)
  if (synthRef.current === null) synthRef.current = new FMSynth()
  const synth = synthRef.current

  const [macros, setMacros] = useState<FMMacros>({ ...DEFAULT_FM_MACROS })
  const [octave, setOctave] = useState(4)
  const [active, setActive] = useState<Set<number>>(() => new Set())

  const baseMidi = 12 * (octave + 1)

  const noteOn = useCallback(
    (midi: number) => {
      synth.noteOn(midi)
      setActive((prev) => (prev.has(midi) ? prev : new Set(prev).add(midi)))
    },
    [synth],
  )
  const noteOff = useCallback(
    (midi: number) => {
      synth.noteOff(midi)
      setActive((prev) => {
        if (!prev.has(midi)) return prev
        const next = new Set(prev)
        next.delete(midi)
        return next
      })
    },
    [synth],
  )

  const setMacro = useCallback(
    (patch: Partial<FMMacros>) => {
      synth.setMacros(patch)
      setMacros((m) => ({ ...m, ...patch }))
    },
    [synth],
  )

  useComputerKeyboard({ octave, setOctave, noteOn, noteOff })
  useEffect(() => () => synth.dispose(), [synth])

  const getAnalyser = useCallback(() => synth.peekAnalyser(), [synth])

  const keyHints: Record<number, string> = {}
  for (const [key, off] of Object.entries(KEY_MAP)) keyHints[baseMidi + off] = key.toUpperCase()

  return (
    <div className="op1">
      <div className="op1-body fm-body">
        <div className="op1-screen">
          <Scope getAnalyser={getAnalyser} colors={[COLORS.pink, COLORS.yellow, COLORS.cyan]} />
          <div className="op1-screen-label">
            <span>FM · 2-OP</span>
            <span>OCT {octave}</span>
          </div>
        </div>

        <div className="op1-encoders">
          <Knob label="RATIO" color={COLORS.pink} value={macros.ratio} min={0} max={1} format={(v) => `${Math.round(v * 100)}`} onChange={(v) => setMacro({ ratio: v })} size={64} />
          <Knob label="FM" color={COLORS.yellow} value={macros.depth} min={0} max={1} format={(v) => `${Math.round(v * 100)}`} onChange={(v) => setMacro({ depth: v })} size={64} />
          <Knob label="DECAY" color={COLORS.cyan} value={macros.decay} min={0} max={1} format={(v) => `${Math.round(v * 100)}`} onChange={(v) => setMacro({ decay: v })} size={64} />
          <Knob label="FX" color={COLORS.purple} value={macros.fx} min={0} max={1} format={(v) => `${Math.round(v * 100)}`} onChange={(v) => setMacro({ fx: v })} size={64} />
        </div>

        <div className="op1-octave">
          <button className="ghost-btn" onClick={() => setOctave((o) => Math.max(1, o - 1))}>– OCT</button>
          <span>Octave {octave}</span>
          <button className="ghost-btn" onClick={() => setOctave((o) => Math.min(7, o + 1))}>OCT +</button>
        </div>

        <Keyboard startMidi={baseMidi} octaves={2} activeNotes={active} onNoteOn={noteOn} onNoteOff={noteOff} keyHints={keyHints} />

        <p className="hint">
          A 2-operator FM voice — bells, electric pianos, mallets. Crank FM for bite, RATIO for
          harmonic colour, DECAY for pluck vs. sustain. Play with mouse or the A–K keys.
        </p>
      </div>
    </div>
  )
}
