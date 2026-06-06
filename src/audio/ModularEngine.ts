// The audio side of the modular synth. Each module owns real Web Audio nodes;
// patch cables map directly onto AudioNode.connect()/disconnect() calls —
// including connecting an output into an AudioParam (control-voltage style
// modulation), which is how an LFO can wobble a filter's cutoff.

import type { JackRef, ModuleType } from '../modular/defs'

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
  stop: () => void
}

export class ModularEngine {
  private ctx: AudioContext | null = null
  private modules = new Map<string, EngineModule>()
  private noiseBuffer: AudioBuffer | null = null

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
    this.modules.set(id, this.createModule(ctx, type))
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
    const src = this.modules.get(from.moduleId)?.outputs.get(from.jack)
    const dest = this.resolveDest(to)
    if (!src || !dest) return false
    if (dest instanceof AudioParam) src.connect(dest)
    else src.connect(dest)
    return true
  }

  disconnect(from: JackRef, to: JackRef) {
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

  private createModule(ctx: AudioContext, type: ModuleType): EngineModule {
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
    }
  }

  dispose() {
    for (const id of [...this.modules.keys()]) this.removeModule(id)
    this.ctx?.close()
    this.ctx = null
  }
}
