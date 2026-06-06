// A small standalone drum kit for the pad page. It plays either real one-shot
// samples (loaded by URL from the public Strudel / TidalCycles Dirt-Samples
// library, permissive CORS) or the synthesized voices from voices.ts. It owns
// its AudioContext, a master bus, an analyser for the scope, and light reverb.

import type { DrumVoiceId } from './types'
import { triggerDrum } from './voices'

export class DrumKit {
  private ctx: AudioContext | null = null
  private master!: GainNode
  private analyser!: AnalyserNode
  private reverbSend!: GainNode

  private buffers = new Map<string, AudioBuffer>()
  private loading = new Map<string, Promise<boolean>>()

  private ensure(): AudioContext {
    if (this.ctx) return this.ctx
    const ctx = new AudioContext()
    this.ctx = ctx

    this.master = ctx.createGain()
    this.master.gain.value = 0.9
    this.analyser = ctx.createAnalyser()
    this.analyser.fftSize = 1024

    // Light convolution reverb.
    this.reverbSend = ctx.createGain()
    this.reverbSend.gain.value = 0.18
    const convolver = ctx.createConvolver()
    convolver.buffer = this.makeImpulse(ctx, 1.4, 3)
    this.reverbSend.connect(convolver)
    convolver.connect(this.master)

    this.master.connect(this.analyser)
    this.master.connect(ctx.destination)
    return ctx
  }

  private makeImpulse(ctx: AudioContext, duration: number, decay: number): AudioBuffer {
    const rate = ctx.sampleRate
    const length = Math.floor(rate * duration)
    const buf = ctx.createBuffer(2, length, rate)
    for (let c = 0; c < 2; c++) {
      const data = buf.getChannelData(c)
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay)
      }
    }
    return buf
  }

  resume() {
    const ctx = this.ensure()
    if (ctx.state === 'suspended') void ctx.resume()
  }

  peekAnalyser(): AnalyserNode | null {
    return this.ctx ? this.analyser : null
  }

  /** Fetch + decode a sample (cached, idempotent). Resolves true on success. */
  loadSample(url: string): Promise<boolean> {
    if (this.buffers.has(url)) return Promise.resolve(true)
    const inflight = this.loading.get(url)
    if (inflight) return inflight
    const ctx = this.ensure()
    const p = (async () => {
      try {
        const res = await fetch(url)
        if (!res.ok) throw new Error(`${res.status}`)
        const buf = await ctx.decodeAudioData(await res.arrayBuffer())
        this.buffers.set(url, buf)
        return true
      } catch {
        return false
      } finally {
        this.loading.delete(url)
      }
    })()
    this.loading.set(url, p)
    return p
  }

  isLoaded(url: string): boolean {
    return this.buffers.has(url)
  }

  private out(): { ctx: AudioContext; master: GainNode; reverb: GainNode } {
    const ctx = this.ensure()
    if (ctx.state === 'suspended') void ctx.resume()
    return { ctx, master: this.master, reverb: this.reverbSend }
  }

  /** Play a loaded sample. Returns false if it isn't decoded yet. */
  playUrl(url: string): boolean {
    const buffer = this.buffers.get(url)
    if (!buffer) return false
    const { ctx, master, reverb } = this.out()
    const src = ctx.createBufferSource()
    src.buffer = buffer
    src.connect(master)
    src.connect(reverb)
    src.start(ctx.currentTime)
    return true
  }

  playSynth(id: DrumVoiceId) {
    const { ctx, master, reverb } = this.out()
    triggerDrum(id, ctx, master, ctx.currentTime)
    triggerDrum(id, ctx, reverb, ctx.currentTime)
  }

  dispose() {
    this.ctx?.close()
    this.ctx = null
    this.buffers.clear()
    this.loading.clear()
  }
}
