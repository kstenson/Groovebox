// A tiny standalone drum kit for the pad page. It can play either the
// synthesized voices from voices.ts or real one-shot samples from the public
// Strudel / TidalCycles "Dirt-Samples" library, with its own AudioContext, a
// master bus, an analyser for the scope, and a touch of reverb for body.
//
// Samples are fetched from raw.githubusercontent.com (permissive CORS). If a
// sample fails to load, that pad transparently falls back to its synth voice,
// so the kit still works offline.

import type { DrumVoiceId } from './types'
import { triggerDrum } from './voices'

const DIRT_BASE = 'https://raw.githubusercontent.com/tidalcycles/Dirt-Samples/master'

/** One representative Dirt sample per pad (Strudel's default drum library). */
export const SAMPLE_URLS: Record<DrumVoiceId, string> = {
  kick: `${DIRT_BASE}/bd/BT0A0A7.wav`,
  snare: `${DIRT_BASE}/sd/rytm-00-hard.wav`,
  clap: `${DIRT_BASE}/cp/HANDCLP0.wav`,
  closedHat: `${DIRT_BASE}/hh/000_hh3closedhh.wav`,
  openHat: `${DIRT_BASE}/808oh/OH00.WAV`,
}

export class DrumKit {
  private ctx: AudioContext | null = null
  private master!: GainNode
  private analyser!: AnalyserNode
  private reverbSend!: GainNode

  private samples = new Map<DrumVoiceId, AudioBuffer>()
  private loadPromise: Promise<number> | null = null

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

  /**
   * Fetch and decode the Dirt samples (once). Resolves with the number that
   * loaded successfully; failed pads simply stay on their synth voice.
   */
  loadSamples(): Promise<number> {
    if (this.loadPromise) return this.loadPromise
    const ctx = this.ensure()
    const entries = Object.entries(SAMPLE_URLS) as [DrumVoiceId, string][]
    this.loadPromise = Promise.allSettled(
      entries.map(async ([id, url]) => {
        const res = await fetch(url)
        if (!res.ok) throw new Error(`${res.status} ${url}`)
        const buf = await ctx.decodeAudioData(await res.arrayBuffer())
        this.samples.set(id, buf)
      }),
    ).then((results) => results.filter((r) => r.status === 'fulfilled').length)
    return this.loadPromise
  }

  hasSample(id: DrumVoiceId): boolean {
    return this.samples.has(id)
  }

  play(id: DrumVoiceId, useSample: boolean) {
    const ctx = this.ensure()
    if (ctx.state === 'suspended') void ctx.resume()
    const buffer = this.samples.get(id)
    if (useSample && buffer) {
      const src = ctx.createBufferSource()
      src.buffer = buffer
      src.connect(this.master)
      src.connect(this.reverbSend)
      src.start(ctx.currentTime)
    } else {
      triggerDrum(id, ctx, this.master, ctx.currentTime)
      triggerDrum(id, ctx, this.reverbSend, ctx.currentTime)
    }
  }

  dispose() {
    this.ctx?.close()
    this.ctx = null
    this.samples.clear()
    this.loadPromise = null
  }
}
