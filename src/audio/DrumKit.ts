// A tiny standalone drum kit for the pad page. Reuses the synthesized drum
// voices from voices.ts, with its own AudioContext, a master bus, an analyser
// for the scope, and a touch of reverb for body.

import type { DrumVoiceId } from './types'
import { triggerDrum } from './voices'

export class DrumKit {
  private ctx: AudioContext | null = null
  private master!: GainNode
  private analyser!: AnalyserNode
  private reverbSend!: GainNode

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

  play(id: DrumVoiceId) {
    const ctx = this.ensure()
    if (ctx.state === 'suspended') void ctx.resume()
    triggerDrum(id, ctx, this.master, ctx.currentTime)
    triggerDrum(id, ctx, this.reverbSend, ctx.currentTime)
  }

  dispose() {
    this.ctx?.close()
    this.ctx = null
  }
}
