import { useCallback, useEffect, useRef, useState } from 'react'
import { PolySynth, DEFAULT_MACROS, type SynthMacros } from '../audio/PolySynth'
import { Knob } from '../components/Knob'
import { Keyboard } from '../components/Keyboard'

// OP-1's four signature encoder colours.
const COLORS = {
  blue: '#3da5ff',
  green: '#4cd07d',
  white: '#f2f2f5',
  orange: '#ff7a3d',
}

// Computer-keyboard -> semitone offset from the base C (Ableton-style row).
const KEY_MAP: Record<string, number> = {
  a: 0, w: 1, s: 2, e: 3, d: 4, f: 5, t: 6, g: 7, y: 8, h: 9, u: 10, j: 11, k: 12,
}

export function SynthPage() {
  const synthRef = useRef<PolySynth | null>(null)
  if (synthRef.current === null) synthRef.current = new PolySynth()
  const synth = synthRef.current

  const [macros, setMacros] = useState<SynthMacros>({ ...DEFAULT_MACROS })
  const [octave, setOctave] = useState(4)
  const [active, setActive] = useState<Set<number>>(() => new Set())

  const octaveRef = useRef(octave)
  octaveRef.current = octave
  const baseMidi = 12 * (octave + 1) // C of the current octave (C4 = 60)

  const noteOn = useCallback(
    (midi: number) => {
      synth.noteOn(midi)
      setActive((prev) => {
        if (prev.has(midi)) return prev
        const next = new Set(prev)
        next.add(midi)
        return next
      })
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
    (patch: Partial<SynthMacros>) => {
      synth.setMacros(patch)
      setMacros((m) => ({ ...m, ...patch }))
    },
    [synth],
  )

  // Computer-keyboard playing.
  useEffect(() => {
    // Remember the exact note each key triggered, so changing octave while a
    // key is held can't leave a note stuck on.
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
  }, [noteOn, noteOff])

  // Clean up audio when leaving the page.
  useEffect(() => () => synth.dispose(), [synth])

  // Oscilloscope on the "screen".
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  useEffect(() => {
    let raf = 0
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const draw = () => {
      raf = requestAnimationFrame(draw)
      const { width, height } = canvas
      ctx.clearRect(0, 0, width, height)
      const analyser = synth.peekAnalyser()

      // Subtle grid.
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, height / 2)
      ctx.lineTo(width, height / 2)
      ctx.stroke()

      if (!analyser) return
      const buf = new Uint8Array(analyser.fftSize)
      analyser.getByteTimeDomainData(buf)

      const grad = ctx.createLinearGradient(0, 0, width, 0)
      grad.addColorStop(0, COLORS.blue)
      grad.addColorStop(0.5, COLORS.green)
      grad.addColorStop(1, COLORS.orange)
      ctx.strokeStyle = grad
      ctx.lineWidth = 2.5
      ctx.beginPath()
      for (let i = 0; i < buf.length; i++) {
        const x = (i / (buf.length - 1)) * width
        const y = (buf[i] / 255) * height
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [synth])

  const keyHints: Record<number, string> = {}
  for (const [key, off] of Object.entries(KEY_MAP)) keyHints[baseMidi + off] = key.toUpperCase()

  return (
    <div className="op1">
      <div className="op1-body">
        <div className="op1-top">
          <div className="op1-screen">
            <canvas ref={canvasRef} width={640} height={220} />
            <div className="op1-screen-label">
              <span>SYNTH · CLUSTER</span>
              <span>OCT {octave}</span>
            </div>
          </div>
        </div>

        <div className="op1-encoders">
          <Knob label="SPREAD" color={COLORS.blue} value={macros.spread} min={0} max={1} format={(v) => `${Math.round(v * 100)}`} onChange={(v) => setMacro({ spread: v })} size={64} />
          <Knob label="CUTOFF" color={COLORS.green} value={macros.cutoff} min={0} max={1} format={(v) => `${Math.round(v * 100)}`} onChange={(v) => setMacro({ cutoff: v })} size={64} />
          <Knob label="ENV" color={COLORS.white} value={macros.env} min={0} max={1} format={(v) => `${Math.round(v * 100)}`} onChange={(v) => setMacro({ env: v })} size={64} />
          <Knob label="FX" color={COLORS.orange} value={macros.fx} min={0} max={1} format={(v) => `${Math.round(v * 100)}`} onChange={(v) => setMacro({ fx: v })} size={64} />
        </div>

        <div className="op1-octave">
          <button className="ghost-btn" onClick={() => setOctave((o) => Math.max(1, o - 1))}>
            – OCT
          </button>
          <span>Octave {octave}</span>
          <button className="ghost-btn" onClick={() => setOctave((o) => Math.min(7, o + 1))}>
            OCT +
          </button>
        </div>

        <Keyboard
          startMidi={baseMidi}
          octaves={2}
          activeNotes={active}
          onNoteOn={noteOn}
          onNoteOff={noteOff}
          keyHints={keyHints}
        />

        <p className="hint">
          Play with your mouse or computer keys (A–K row) · Z / X shift octave · the four coloured
          encoders shape the sound, just like an OP-1.
        </p>
      </div>
    </div>
  )
}
