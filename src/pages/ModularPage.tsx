import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ModularEngine } from '../audio/ModularEngine'
import { Knob } from '../components/Knob'
import { buildScale, midiToFreq } from '../theory'
import {
  MODULE_DEFS,
  isOutputJack,
  jackGroup,
  jackKey,
  type Cable,
  type JackKind,
  type JackRef,
  type ModuleInstance,
  type ModuleType,
} from '../modular/defs'

// Sequencer pitch pool: C minor pentatonic across two octaves (C3 up).
const SEQ_NOTES = buildScale(48, 'minorPentatonic', 2)
const SEQ_LEN = 8
const DEFAULT_SEQ_DEGREES = [0, 2, 1, 3, 0, 4, 2, 5]
const seqFreq = (degree: number) =>
  midiToFreq(SEQ_NOTES[Math.max(0, Math.min(SEQ_NOTES.length - 1, degree))])

interface SeqPattern {
  degrees: number[]
  ons: boolean[]
}
const defaultSeqPattern = (): SeqPattern => ({
  degrees: DEFAULT_SEQ_DEGREES.slice(0, SEQ_LEN),
  ons: Array<boolean>(SEQ_LEN).fill(true),
})

const WAVEFORMS: OscillatorType[] = ['sawtooth', 'square', 'triangle', 'sine']
const WAVE_GLYPH: Record<OscillatorType, string> = {
  sawtooth: '◺',
  square: '⊓',
  triangle: '△',
  sine: '∿',
  custom: '∿',
}

const INITIAL_MODULES: ModuleInstance[] = [
  { id: 'vco1', type: 'vco' },
  { id: 'vcf1', type: 'vcf' },
  { id: 'vca1', type: 'vca' },
  { id: 'lfo1', type: 'lfo' },
  { id: 'out1', type: 'output' },
]

const INITIAL_CABLES: Cable[] = [
  { id: 'c1', from: { moduleId: 'vco1', jack: 'out' }, to: { moduleId: 'vcf1', jack: 'in' } },
  { id: 'c2', from: { moduleId: 'vcf1', jack: 'out' }, to: { moduleId: 'vca1', jack: 'in' } },
  { id: 'c3', from: { moduleId: 'vca1', jack: 'out' }, to: { moduleId: 'out1', jack: 'in' } },
  { id: 'c4', from: { moduleId: 'lfo1', jack: 'out' }, to: { moduleId: 'vcf1', jack: 'cv' } },
]

const defaultParams = (type: ModuleType): Record<string, number> => {
  const out: Record<string, number> = {}
  for (const p of MODULE_DEFS[type].params) out[p.id] = p.default
  return out
}

const jackColor = (kind: JackKind) => {
  if (kind === 'audioOut' || kind === 'audioIn') return '#ff7a3d'
  if (kind === 'gateOut' || kind === 'gateIn') return '#ffd23d'
  return '#36d1c4'
}

type Pos = { x: number; y: number }

export function ModularPage() {
  const engineRef = useRef<ModularEngine | null>(null)
  if (engineRef.current === null) engineRef.current = new ModularEngine()
  const engine = engineRef.current

  const [modules, setModules] = useState<ModuleInstance[]>(INITIAL_MODULES)
  const [cables, setCables] = useState<Cable[]>(INITIAL_CABLES)
  const [running, setRunning] = useState(false)
  const [params, setParams] = useState<Record<string, Record<string, number>>>(() => {
    const out: Record<string, Record<string, number>> = {}
    for (const m of INITIAL_MODULES) out[m.id] = defaultParams(m.type)
    return out
  })
  const [waves, setWaves] = useState<Record<string, OscillatorType>>({
    vco1: 'sawtooth',
    lfo1: 'sine',
  })
  const [seqState, setSeqState] = useState<Record<string, SeqPattern>>({})
  const [currentStep, setCurrentStep] = useState<Record<string, number>>({})

  // Sequencers report their advancing step for the playhead highlight.
  useEffect(() => {
    engine.onSeqStep = (id, step) => setCurrentStep((s) => ({ ...s, [id]: step }))
    return () => {
      engine.onSeqStep = null
    }
  }, [engine])

  // ---- Engine setup mirroring the initial state ----
  // Setup and teardown are symmetric: each mount builds the modules/cables and
  // each unmount disposes them. (A persistent "already set up" guard must NOT
  // be used here — under StrictMode the mount/cleanup/mount cycle would dispose
  // the engine and then skip the rebuild, leaving it silent.)
  useEffect(() => {
    for (const m of INITIAL_MODULES) engine.addModule(m.id, m.type)
    for (const c of INITIAL_CABLES) engine.connect(c.from, c.to)
    return () => engine.dispose()
  }, [engine])

  // ---- Jack position measurement ----
  const rackRef = useRef<HTMLDivElement | null>(null)
  const jackEls = useRef<Map<string, HTMLElement>>(new Map())
  const [positions, setPositions] = useState<Record<string, Pos>>({})
  const [layoutVersion, setLayoutVersion] = useState(0)

  const setJackEl = useCallback(
    (key: string) => (el: HTMLElement | null) => {
      if (el) jackEls.current.set(key, el)
      else jackEls.current.delete(key)
    },
    [],
  )

  useLayoutEffect(() => {
    const inner = rackRef.current
    if (!inner) return
    const base = inner.getBoundingClientRect()
    const next: Record<string, Pos> = {}
    for (const [key, el] of jackEls.current) {
      const r = el.getBoundingClientRect()
      next[key] = { x: r.left - base.left + r.width / 2, y: r.top - base.top + r.height / 2 }
    }
    setPositions(next)
  }, [modules, layoutVersion])

  useEffect(() => {
    const bump = () => setLayoutVersion((v) => v + 1)
    window.addEventListener('resize', bump)
    return () => window.removeEventListener('resize', bump)
  }, [])

  // ---- Cable dragging ----
  const [drag, setDrag] = useState<{ from: JackRef; kind: JackKind } | null>(null)
  const dragRef = useRef<typeof drag>(null)
  dragRef.current = drag
  const [pointer, setPointer] = useState<Pos | null>(null)

  const toLocal = (e: { clientX: number; clientY: number }): Pos | null => {
    const inner = rackRef.current
    if (!inner) return null
    const base = inner.getBoundingClientRect()
    return { x: e.clientX - base.left, y: e.clientY - base.top }
  }

  const onJackDown = (ref: JackRef, kind: JackKind) => (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDrag({ from: ref, kind })
    setPointer(toLocal(e))
  }

  const onJackUp = (ref: JackRef, kind: JackKind) => (e: React.PointerEvent) => {
    e.stopPropagation()
    const a = dragRef.current
    if (!a) return
    const aIsOutput = isOutputJack(a.kind)
    // One end must be an output and the other an input, and both must belong to
    // the same group (gate <-> gate, or signal <-> signal).
    const compatible = aIsOutput !== isOutputJack(kind) && jackGroup(a.kind) === jackGroup(kind)
    if (compatible) {
      const from = aIsOutput ? a.from : ref
      const to = aIsOutput ? ref : a.from
      const dup = cables.some(
        (c) =>
          c.from.moduleId === from.moduleId &&
          c.from.jack === from.jack &&
          c.to.moduleId === to.moduleId &&
          c.to.jack === to.jack,
      )
      if (!dup && engine.connect(from, to)) {
        setCables((cs) => [...cs, { id: `cable-${Date.now()}`, from, to }])
      }
    }
    setDrag(null)
    setPointer(null)
  }

  const onRackMove = (e: React.PointerEvent) => {
    if (dragRef.current) setPointer(toLocal(e))
  }
  const onRackUp = () => {
    setDrag(null)
    setPointer(null)
  }

  // Releasing or cancelling anywhere (even outside the rack) ends a drag,
  // so a half-patched cable can't get stuck following the pointer.
  useEffect(() => {
    const cancel = () => {
      if (dragRef.current) {
        setDrag(null)
        setPointer(null)
      }
    }
    window.addEventListener('pointerup', cancel)
    window.addEventListener('pointercancel', cancel)
    return () => {
      window.removeEventListener('pointerup', cancel)
      window.removeEventListener('pointercancel', cancel)
    }
  }, [])

  const removeCable = (id: string) => {
    const c = cables.find((x) => x.id === id)
    if (!c) return
    engine.disconnect(c.from, c.to)
    setCables((cs) => cs.filter((x) => x.id !== id))
  }

  // ---- Param / module actions ----
  const onParam = (moduleId: string, paramId: string, value: number) => {
    engine.setParam(moduleId, paramId, value)
    setParams((p) => ({ ...p, [moduleId]: { ...p[moduleId], [paramId]: value } }))
  }

  const onWave = (moduleId: string, w: OscillatorType) => {
    engine.setWaveform(moduleId, w)
    setWaves((s) => ({ ...s, [moduleId]: w }))
  }

  const toggleSeqStep = (id: string, i: number) => {
    setSeqState((s) => {
      const pat = s[id]
      if (!pat) return s
      const ons = pat.ons.map((v, idx) => (idx === i ? !v : v))
      engine.setSeqStep(id, i, ons[i], seqFreq(pat.degrees[i]))
      return { ...s, [id]: { ...pat, ons } }
    })
  }

  const setSeqDegree = (id: string, i: number, degree: number) => {
    setSeqState((s) => {
      const pat = s[id]
      if (!pat) return s
      const degrees = pat.degrees.map((v, idx) => (idx === i ? degree : v))
      engine.setSeqStep(id, i, pat.ons[i], seqFreq(degree))
      return { ...s, [id]: { ...pat, degrees } }
    })
  }

  const addCount = useRef(0)
  const addModule = (type: ModuleType) => {
    const id = `${type}-${++addCount.current}-${Date.now().toString(36)}`
    engine.addModule(id, type)
    setParams((p) => ({ ...p, [id]: defaultParams(type) }))
    if (type === 'vco' || type === 'lfo') {
      setWaves((s) => ({ ...s, [id]: type === 'vco' ? 'sawtooth' : 'sine' }))
    }
    if (type === 'seq') {
      const pat = defaultSeqPattern()
      pat.degrees.forEach((deg, i) => engine.setSeqStep(id, i, pat.ons[i], seqFreq(deg)))
      setSeqState((s) => ({ ...s, [id]: pat }))
      setCurrentStep((s) => ({ ...s, [id]: -1 }))
    }
    setModules((m) => [...m.slice(0, -1), { id, type }, m[m.length - 1]]) // keep Output last
    setLayoutVersion((v) => v + 1)
  }

  const removeModule = (id: string) => {
    setCables((cs) => {
      const remaining: Cable[] = []
      for (const c of cs) {
        if (c.from.moduleId === id || c.to.moduleId === id) engine.disconnect(c.from, c.to)
        else remaining.push(c)
      }
      return remaining
    })
    engine.removeModule(id)
    setModules((m) => m.filter((x) => x.id !== id))
    setLayoutVersion((v) => v + 1)
  }

  const togglePower = async () => {
    if (running) {
      await engine.suspend()
      setRunning(false)
    } else {
      await engine.resume()
      setRunning(true)
    }
  }

  // ---- Render ----
  const cablePath = (a: Pos, b: Pos) => {
    const sag = Math.min(140, Math.abs(b.x - a.x) * 0.35 + 40)
    return `M ${a.x} ${a.y} C ${a.x} ${a.y + sag}, ${b.x} ${b.y + sag}, ${b.x} ${b.y}`
  }

  const dragFromPos = drag ? positions[jackKey(drag.from.moduleId, drag.from.jack)] : null

  return (
    <div className="modular">
      <div className="modular-bar">
        <button className={`play-btn ${running ? 'playing' : ''}`} onClick={togglePower}>
          {running ? '◉ Audio On' : '▷ Enable Audio'}
        </button>
        <div className="add-palette">
          <span className="ctrl-label">ADD</span>
          {(
            [
              'vco',
              'lfo',
              'noise',
              'vcf',
              'vca',
              'clock',
              'env',
              'snh',
              'seq',
              'mix',
              'delay',
              'drive',
              'atten',
            ] as ModuleType[]
          ).map((t) => (
            <button key={t} className="ghost-btn" onClick={() => addModule(t)}>
              + {MODULE_DEFS[t].name}
            </button>
          ))}
        </div>
      </div>

      <div className="rack" ref={rackRef} onPointerMove={onRackMove} onPointerUp={onRackUp}>
        <svg className="cable-layer">
          {cables.map((c) => {
            const a = positions[jackKey(c.from.moduleId, c.from.jack)]
            const b = positions[jackKey(c.to.moduleId, c.to.jack)]
            if (!a || !b) return null
            return (
              <path
                key={c.id}
                className="cable"
                d={cablePath(a, b)}
                onClick={() => removeCable(c.id)}
              />
            )
          })}
          {drag && dragFromPos && pointer && (
            <path className="cable pending" d={cablePath(dragFromPos, pointer)} />
          )}
        </svg>

        {modules.map((m) => {
          const def = MODULE_DEFS[m.type]
          return (
            <div
              className={`module ${m.type === 'seq' ? 'seq' : ''}`}
              key={m.id}
              style={{ borderTopColor: def.accent }}
            >
              <div className="module-head" style={{ color: def.accent }}>
                <span>{def.name}</span>
                {def.removable && (
                  <button className="mod-remove" onClick={() => removeModule(m.id)} title="Remove">
                    ✕
                  </button>
                )}
              </div>

              {m.type === 'seq' ? (
                <div className="seq-grid">
                  {(seqState[m.id]?.degrees ?? []).map((degree, i) => {
                    const on = seqState[m.id]?.ons[i] ?? true
                    return (
                      <div
                        className={`seq-step ${currentStep[m.id] === i ? 'playing' : ''}`}
                        key={i}
                      >
                        <input
                          className="seq-pitch"
                          type="range"
                          min={0}
                          max={SEQ_NOTES.length - 1}
                          value={degree}
                          onChange={(e) => setSeqDegree(m.id, i, Number(e.target.value))}
                          aria-label={`Step ${i + 1} pitch`}
                        />
                        <button
                          className={`seq-toggle ${on ? 'on' : ''}`}
                          onClick={() => toggleSeqStep(m.id, i)}
                          aria-label={`Step ${i + 1} ${on ? 'on' : 'off'}`}
                        />
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="module-knobs">
                  {def.params.map((p) => (
                    <Knob
                      key={p.id}
                      label={p.label}
                      color={def.accent}
                      value={params[m.id]?.[p.id] ?? p.default}
                      min={p.min}
                      max={p.max}
                      size={42}
                      format={(v) => (p.unit === 'Hz' ? `${Math.round(v)}` : v.toFixed(2))}
                      onChange={(v) => onParam(m.id, p.id, v)}
                    />
                  ))}
                </div>
              )}

              {def.waveform && (
                <div className="wave-buttons">
                  {WAVEFORMS.map((w) => (
                    <button
                      key={w}
                      className={`wave-btn ${waves[m.id] === w ? 'active' : ''}`}
                      onClick={() => onWave(m.id, w)}
                    >
                      {WAVE_GLYPH[w]}
                    </button>
                  ))}
                </div>
              )}

              <div className="jacks">
                {def.jacks.map((j) => {
                  const ref: JackRef = { moduleId: m.id, jack: j.id }
                  const key = jackKey(m.id, j.id)
                  return (
                    <div className="jack-slot" key={j.id}>
                      <span
                        ref={setJackEl(key)}
                        className={`jack ${isOutputJack(j.kind) ? 'out' : 'in'} ${
                          drag && jackKey(drag.from.moduleId, drag.from.jack) === key ? 'dragging' : ''
                        }`}
                        style={{ borderColor: jackColor(j.kind) }}
                        onPointerDown={onJackDown(ref, j.kind)}
                        onPointerUp={onJackUp(ref, j.kind)}
                      />
                      <span className="jack-label">{j.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <p className="hint">
        Drag a cable from one jack to another to patch (orange = audio, teal = CV, yellow = gate) ·
        click a cable to remove it · melodic patch: CLOCK gate → SEQ clock, SEQ pitch → VCO PITCH
        (turn the VCO FREQ to 0), SEQ gate → ENV gate, ENV out → VCA GAIN CV. Drag a step's slider to
        set its note, click the dot to mute it. Hit <strong>Enable Audio</strong> to hear it.
      </p>
    </div>
  )
}
