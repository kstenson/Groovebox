// The audio side of the modular synth. Each module owns real Web Audio nodes;
// patch cables map directly onto AudioNode.connect()/disconnect() calls —
// including connecting an output into an AudioParam (control-voltage style
// modulation), which is how an LFO can wobble a filter's cutoff.

import { MODULE_DEFS, jackKey, type JackRef, type ModuleType } from '../modular/defs'

interface EngineModule {
  type: ModuleType
  /** Nodes you call .connect() FROM, keyed by jack id. */
  outputs: Map<string, AudioNode>
  /** Audio inputs you connect TO, keyed by jack id. */
  audioInputs: Map<string, AudioNode>
  /** Control inputs (AudioParams) you connect TO, keyed by jack id. */
  cvInputs: Map<string, AudioParam>
  setParam: (id: string, value: number) => void
  setWaveform?: (w: OscillatorType) => void
  /** Called when a gate/trigger arrives at one of the module's gate inputs. */
  onGate?: (jack: string, time: number, value: number) => void
  /** Sequencer step edit: set a step's on-state and pitch (Hz). */
  setStep?: (index: number, on: boolean, freq: number) => void
  stop: () => void
}

export class ModularEngine {
  private ctx: AudioContext | null = null
  private modules = new Map<string, EngineModule>()
  private noiseBuffer: AudioBuffer | null = null
  /** Logical gate/trigger wiring: source jack key -> target jack refs. */
  private gateTargets = new Map<string, JackRef[]>()
  /** UI notification when a sequencer advances to a new step. */
  onSeqStep: ((moduleId: string, step: number) => void) | null = null

  private ensure(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext()
    return this.ctx
  }

  async resume() {
    const ctx = this.ensure()
    if (ctx.state === 'suspended') await ctx.resume()
  }

  async suspend() {
    if (this.ctx?.state === 'running') await this.ctx.suspend()
  }

  isRunning() {
    return this.ctx?.state === 'running'
  }

  private getNoise(ctx: AudioContext): AudioBuffer {
    if (!this.noiseBuffer) {
      const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
      const data = buf.getChannelData(0)
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
      this.noiseBuffer = buf
    }
    return this.noiseBuffer
  }

  addModule(id: string, type: ModuleType) {
    const ctx = this.ensure()
    if (this.modules.has(id)) return
    const emit = (jack: string, time: number, value = 1) => this.fireGate(id, jack, time, value)
    const notifyStep = (step: number) => this.onSeqStep?.(id, step)
    this.modules.set(id, this.createModule(ctx, type, emit, notifyStep))
  }

  setSeqStep(id: string, index: number, on: boolean, freq: number) {
    this.modules.get(id)?.setStep?.(index, on, freq)
  }

  /** Route a gate pulse from a source jack to every connected gate input. */
  private fireGate(fromId: string, jack: string, time: number, value: number) {
    const targets = this.gateTargets.get(jackKey(fromId, jack))
    if (!targets) return
    for (const t of targets) this.modules.get(t.moduleId)?.onGate?.(t.jack, time, value)
  }

  private jackKindOf(ref: JackRef) {
    const type = this.modules.get(ref.moduleId)?.type
    if (!type) return null
    return MODULE_DEFS[type].jacks.find((j) => j.id === ref.jack)?.kind ?? null
  }

  removeModule(id: string) {
    const m = this.modules.get(id)
    if (!m) return
    m.stop()
    for (const node of m.outputs.values()) node.disconnect()
    for (const node of m.audioInputs.values()) node.disconnect()
    this.modules.delete(id)
  }

  setParam(id: string, param: string, value: number) {
    this.modules.get(id)?.setParam(param, value)
  }

  setWaveform(id: string, w: OscillatorType) {
    this.modules.get(id)?.setWaveform?.(w)
  }

  private resolveDest(ref: JackRef): AudioNode | AudioParam | null {
    const m = this.modules.get(ref.moduleId)
    if (!m) return null
    return m.audioInputs.get(ref.jack) ?? m.cvInputs.get(ref.jack) ?? null
  }

  connect(from: JackRef, to: JackRef): boolean {
    // Gate cables are wired logically, not through the audio graph.
    if (this.jackKindOf(from) === 'gateOut') {
      const key = jackKey(from.moduleId, from.jack)
      const list = this.gateTargets.get(key) ?? []
      list.push(to)
      this.gateTargets.set(key, list)
      return true
    }
    const src = this.modules.get(from.moduleId)?.outputs.get(from.jack)
    const dest = this.resolveDest(to)
    if (!src || !dest) return false
    if (dest instanceof AudioParam) src.connect(dest)
    else src.connect(dest)
    return true
  }

  disconnect(from: JackRef, to: JackRef) {
    if (this.jackKindOf(from) === 'gateOut') {
      const key = jackKey(from.moduleId, from.jack)
      const list = (this.gateTargets.get(key) ?? []).filter(
        (t) => !(t.moduleId === to.moduleId && t.jack === to.jack),
      )
      if (list.length) this.gateTargets.set(key, list)
      else this.gateTargets.delete(key)
      return
    }
    const src = this.modules.get(from.moduleId)?.outputs.get(from.jack)
    const dest = this.resolveDest(to)
    if (!src || !dest) return
    try {
      if (dest instanceof AudioParam) src.disconnect(dest)
      else src.disconnect(dest)
    } catch {
      // Already disconnected — ignore.
    }
  }

  private createModule(
    ctx: AudioContext,
    type: ModuleType,
    emit: (jack: string, time: number, value?: number) => void,
    notifyStep: (step: number) => void,
  ): EngineModule {
    const outputs = new Map<string, AudioNode>()
    const audioInputs = new Map<string, AudioNode>()
    const cvInputs = new Map<string, AudioParam>()
    const set = (now = ctx.currentTime) => now

    switch (type) {
      case 'vco': {
        const osc = ctx.createOscillator()
        osc.type = 'sawtooth'
        osc.frequency.value = 110
        const out = ctx.createGain()
        osc.connect(out)
        osc.start()
        outputs.set('out', out)
        cvInputs.set('pitch', osc.frequency)
        return {
          type,
          outputs,
          audioInputs,
          cvInputs,
          setParam: (id, v) => {
            if (id === 'freq') osc.frequency.setTargetAtTime(v, set(), 0.01)
          },
          setWaveform: (w) => (osc.type = w),
          stop: () => osc.stop(),
        }
      }
      case 'lfo': {
        const osc = ctx.createOscillator()
        osc.type = 'sine'
        osc.frequency.value = 2
        const depth = ctx.createGain()
        depth.gain.value = 300
        osc.connect(depth)
        osc.start()
        outputs.set('out', depth)
        return {
          type,
          outputs,
          audioInputs,
          cvInputs,
          setParam: (id, v) => {
            if (id === 'rate') osc.frequency.setTargetAtTime(v, set(), 0.01)
            if (id === 'depth') depth.gain.setTargetAtTime(v, set(), 0.01)
          },
          setWaveform: (w) => (osc.type = w),
          stop: () => osc.stop(),
        }
      }
      case 'noise': {
        const src = ctx.createBufferSource()
        src.buffer = this.getNoise(ctx)
        src.loop = true
        const out = ctx.createGain()
        out.gain.value = 0.5
        src.connect(out)
        src.start()
        outputs.set('out', out)
        return {
          type,
          outputs,
          audioInputs,
          cvInputs,
          setParam: (id, v) => {
            if (id === 'level') out.gain.setTargetAtTime(v, set(), 0.01)
          },
          stop: () => src.stop(),
        }
      }
      case 'vcf': {
        const filter = ctx.createBiquadFilter()
        filter.type = 'lowpass'
        filter.frequency.value = 1200
        filter.Q.value = 4
        audioInputs.set('in', filter)
        outputs.set('out', filter)
        cvInputs.set('cv', filter.frequency)
        return {
          type,
          outputs,
          audioInputs,
          cvInputs,
          setParam: (id, v) => {
            if (id === 'cutoff') filter.frequency.setTargetAtTime(v, set(), 0.01)
            if (id === 'res') filter.Q.setTargetAtTime(v, set(), 0.01)
          },
          stop: () => {},
        }
      }
      case 'vca': {
        const gain = ctx.createGain()
        gain.gain.value = 0.5
        audioInputs.set('in', gain)
        outputs.set('out', gain)
        cvInputs.set('cv', gain.gain)
        return {
          type,
          outputs,
          audioInputs,
          cvInputs,
          setParam: (id, v) => {
            if (id === 'gain') gain.gain.setTargetAtTime(v, set(), 0.01)
          },
          stop: () => {},
        }
      }
      case 'output': {
        const gain = ctx.createGain()
        gain.gain.value = 0.8
        gain.connect(ctx.destination)
        audioInputs.set('in', gain)
        return {
          type,
          outputs,
          audioInputs,
          cvInputs,
          setParam: (id, v) => {
            if (id === 'level') gain.gain.setTargetAtTime(v, set(), 0.01)
          },
          stop: () => gain.disconnect(),
        }
      }
      case 'clock': {
        // A look-ahead scheduler emits eighth-note gate pulses against the
        // audio clock. It idles while the context is suspended so no backlog
        // of pulses piles up before the user enables audio.
        let bpm = 120
        let nextTime = ctx.currentTime
        const stepDur = () => 60 / bpm / 2
        const tick = () => {
          if (ctx.state !== 'running') {
            nextTime = ctx.currentTime + 0.05
            return
          }
          while (nextTime < ctx.currentTime + 0.1) {
            emit('gate', nextTime, 1)
            nextTime += stepDur()
          }
        }
        const timer = window.setInterval(tick, 25)
        return {
          type,
          outputs,
          audioInputs,
          cvInputs,
          setParam: (id, v) => {
            if (id === 'rate') bpm = v
          },
          stop: () => window.clearInterval(timer),
        }
      }
      case 'env': {
        // AD envelope generator: a ConstantSource whose offset is ramped on
        // each gate, used as a CV source into params (VCA gain, filter cutoff…).
        const cv = ctx.createConstantSource()
        cv.offset.value = 0
        cv.start()
        outputs.set('out', cv)
        let attack = 0.01
        let decay = 0.3
        let amount = 1
        return {
          type,
          outputs,
          audioInputs,
          cvInputs,
          setParam: (id, v) => {
            if (id === 'attack') attack = v
            if (id === 'decay') decay = v
            if (id === 'amount') amount = v
          },
          onGate: (_jack, time) => {
            const t = Math.max(time, ctx.currentTime)
            cv.offset.cancelScheduledValues(t)
            cv.offset.setValueAtTime(0, t)
            cv.offset.linearRampToValueAtTime(amount, t + attack)
            cv.offset.linearRampToValueAtTime(0, t + attack + decay)
          },
          stop: () => cv.stop(),
        }
      }
      case 'snh': {
        // Sample & hold: latch a fresh random value on each trigger.
        const cv = ctx.createConstantSource()
        cv.offset.value = 0
        cv.start()
        outputs.set('out', cv)
        let range = 600
        let glide = 0
        return {
          type,
          outputs,
          audioInputs,
          cvInputs,
          setParam: (id, v) => {
            if (id === 'range') range = v
            if (id === 'glide') glide = v
          },
          onGate: (_jack, time) => {
            const t = Math.max(time, ctx.currentTime)
            const value = Math.random() * range
            if (glide > 0) cv.offset.setTargetAtTime(value, t, glide)
            else cv.offset.setValueAtTime(value, t)
          },
          stop: () => cv.stop(),
        }
      }
      case 'mix': {
        const out = ctx.createGain()
        const makeIn = (level: number) => {
          const g = ctx.createGain()
          g.gain.value = level
          g.connect(out)
          return g
        }
        const g1 = makeIn(0.7)
        const g2 = makeIn(0.7)
        const g3 = makeIn(0.7)
        audioInputs.set('in1', g1)
        audioInputs.set('in2', g2)
        audioInputs.set('in3', g3)
        outputs.set('out', out)
        return {
          type,
          outputs,
          audioInputs,
          cvInputs,
          setParam: (id, v) => {
            if (id === 'lvl1') g1.gain.setTargetAtTime(v, set(), 0.01)
            if (id === 'lvl2') g2.gain.setTargetAtTime(v, set(), 0.01)
            if (id === 'lvl3') g3.gain.setTargetAtTime(v, set(), 0.01)
          },
          stop: () => {},
        }
      }
      case 'delay': {
        const input = ctx.createGain()
        const out = ctx.createGain()
        const delay = ctx.createDelay(1)
        delay.delayTime.value = 0.3
        const fb = ctx.createGain()
        fb.gain.value = 0.35
        const wet = ctx.createGain()
        wet.gain.value = 0.4
        input.connect(out) // dry path
        input.connect(delay)
        delay.connect(fb)
        fb.connect(delay) // feedback loop
        delay.connect(wet)
        wet.connect(out)
        audioInputs.set('in', input)
        outputs.set('out', out)
        return {
          type,
          outputs,
          audioInputs,
          cvInputs,
          setParam: (id, v) => {
            if (id === 'time') delay.delayTime.setTargetAtTime(v, set(), 0.02)
            if (id === 'fbk') fb.gain.setTargetAtTime(v, set(), 0.02)
            if (id === 'mix') wet.gain.setTargetAtTime(v, set(), 0.02)
          },
          stop: () => {},
        }
      }
      case 'drive': {
        const shaper = ctx.createWaveShaper()
        shaper.oversample = '2x'
        const makeCurve = (k: number) => {
          const n = 1024
          const curve = new Float32Array(n)
          for (let i = 0; i < n; i++) {
            const x = (i / (n - 1)) * 2 - 1
            curve[i] = Math.tanh(k * x)
          }
          return curve
        }
        shaper.curve = makeCurve(6)
        audioInputs.set('in', shaper)
        outputs.set('out', shaper)
        return {
          type,
          outputs,
          audioInputs,
          cvInputs,
          setParam: (id, v) => {
            if (id === 'drive') shaper.curve = makeCurve(v)
          },
          stop: () => {},
        }
      }
      case 'atten': {
        // Attenuverter: scale (and optionally invert) any signal or CV.
        const g = ctx.createGain()
        g.gain.value = 1
        audioInputs.set('in', g)
        outputs.set('out', g)
        return {
          type,
          outputs,
          audioInputs,
          cvInputs,
          setParam: (id, v) => {
            if (id === 'amount') g.gain.setTargetAtTime(v, set(), 0.01)
          },
          stop: () => {},
        }
      }
      case 'seq': {
        // Step sequencer: each clock pulse advances one step, latching that
        // step's pitch onto the CV output and firing the gate if it's active.
        const cv = ctx.createConstantSource()
        cv.offset.value = 110
        cv.start()
        outputs.set('pitch', cv)
        const len = 8
        const steps = Array.from({ length: len }, () => ({ on: true, freq: 110 }))
        let cur = -1
        return {
          type,
          outputs,
          audioInputs,
          cvInputs,
          setParam: () => {},
          setStep: (i, on, freq) => {
            if (steps[i]) {
              steps[i].on = on
              steps[i].freq = freq
            }
          },
          onGate: (_jack, time) => {
            cur = (cur + 1) % len
            const step = cur
            const s = steps[step]
            const t = Math.max(time, ctx.currentTime)
            cv.offset.setValueAtTime(s.freq, t)
            if (s.on) emit('gate', t, 1)
            // Move the UI playhead at the moment the step actually sounds,
            // rather than when it was scheduled (up to a look-ahead early).
            window.setTimeout(() => notifyStep(step), Math.max(0, (t - ctx.currentTime) * 1000))
          },
          stop: () => cv.stop(),
        }
      }
    }
  }

  dispose() {
    for (const id of [...this.modules.keys()]) this.removeModule(id)
    this.gateTargets.clear()
    this.ctx?.close()
    this.ctx = null
    this.noiseBuffer = null
  }
}
