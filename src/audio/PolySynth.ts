// A small, self-contained polyphonic synth used by the OP-1-inspired page.
// Unlike the groovebox's fire-and-forget step voices, this one is *playable*:
// notes are gated (noteOn / noteOff) so they sustain while a key is held.
//
// The instrument exposes four macro parameters, mirroring the OP-1's
// signature four coloured encoders:
//   blue   -> spread (detune width of a stacked-saw "cluster")
//   green  -> filter cutoff (brightness)
//   white  -> envelope morph (plucky <-> pad)
//   orange -> fx (delay send + feedback)

import { midiToFreq } from '../theory'

export interface SynthMacros {
  spread: number // 0..1
  cutoff: number // 0..1
  env: number // 0..1
  fx: number // 0..1
}

export const DEFAULT_MACROS: SynthMacros = { spread: 0.35, cutoff: 0.6, env: 0.3, fx: 0.25 }

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

interface Voice {
  oscillators: OscillatorNode[]
  filter: BiquadFilterNode
  amp: GainNode
  releasing: boolean
}

export class PolySynth {
  private ctx: AudioContext | null = null
  private master!: GainNode
  private delaySend!: GainNode
  private delay!: DelayNode
  private feedback!: GainNode
  private analyser!: AnalyserNode

  private voices = new Map<number, Voice>()
  private macros: SynthMacros = { ...DEFAULT_MACROS }

  /** Created lazily after a user gesture (browser autoplay policy). */
  private ensure(): AudioContext {
    if (this.ctx) return this.ctx
    const ctx = new AudioContext()
    this.ctx = ctx

    this.master = ctx.createGain()
    this.master.gain.value = 0.7

    this.analyser = ctx.createAnalyser()
    this.analyser.fftSize = 1024

    // FX: feedback delay tapped from a send bus.
    this.delaySend = ctx.createGain()
    this.delaySend.gain.value = 0
    this.delay = ctx.createDelay(1)
    this.delay.delayTime.value = 0.3
    this.feedback = ctx.createGain()
    this.feedback.gain.value = 0.3
    this.delaySend.connect(this.delay)
    this.delay.connect(this.feedback)
    this.feedback.connect(this.delay)
    this.delay.connect(this.master)

    this.master.connect(this.analyser)
    this.master.connect(ctx.destination)

    this.applyFx()
    return ctx
  }

  /** Resume the context (call from a click/keypress handler). */
  resume() {
    const ctx = this.ensure()
    if (ctx.state === 'suspended') void ctx.resume()
  }

  getAnalyser(): AnalyserNode {
    this.ensure()
    return this.analyser
  }

  /** Analyser if the audio graph exists yet, else null (no context created). */
  peekAnalyser(): AnalyserNode | null {
    return this.ctx ? this.analyser : null
  }

  setMacros(patch: Partial<SynthMacros>) {
    this.macros = { ...this.macros, ...patch }
    if (!this.ctx) return
    // Live-update sounding voices' filters and the FX bus.
    const cutoff = this.cutoffHz()
    const now = this.ctx.currentTime
    for (const v of this.voices.values()) {
      v.filter.frequency.setTargetAtTime(cutoff, now, 0.02)
    }
    this.applyFx()
  }

  private cutoffHz(): number {
    // Exponential feel across the useful range.
    return 180 * Math.pow(9000 / 180, this.macros.cutoff)
  }

  private applyFx() {
    if (!this.ctx) return
    const now = this.ctx.currentTime
    this.delaySend.gain.setTargetAtTime(this.macros.fx * 0.5, now, 0.02)
    this.feedback.gain.setTargetAtTime(0.2 + this.macros.fx * 0.45, now, 0.02)
  }

  noteOn(midi: number) {
    const ctx = this.ensure()
    if (ctx.state === 'suspended') void ctx.resume()

    // Retrigger: release any existing voice on this note first.
    if (this.voices.has(midi)) this.noteOff(midi)

    const now = ctx.currentTime
    const freq = midiToFreq(midi)
    const spreadCents = this.macros.spread * 28
    const attack = lerp(0.004, 0.5, this.macros.env)

    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = this.cutoffHz()
    filter.Q.value = 6

    const amp = ctx.createGain()
    amp.gain.setValueAtTime(0.0001, now)
    amp.gain.linearRampToValueAtTime(0.25, now + attack)

    // Three detuned saws stacked for the OP-1 "cluster" character.
    const detunes = [-spreadCents, 0, spreadCents]
    const oscillators = detunes.map((cents) => {
      const osc = ctx.createOscillator()
      osc.type = 'sawtooth'
      osc.frequency.value = freq
      osc.detune.value = cents
      osc.connect(filter)
      osc.start(now)
      return osc
    })

    filter.connect(amp)
    amp.connect(this.master)
    amp.connect(this.delaySend)

    this.voices.set(midi, { oscillators, filter, amp, releasing: false })
  }

  noteOff(midi: number) {
    const voice = this.voices.get(midi)
    if (!voice || !this.ctx || voice.releasing) return
    voice.releasing = true

    const now = this.ctx.currentTime
    const release = lerp(0.08, 1.4, this.macros.env)
    voice.amp.gain.cancelScheduledValues(now)
    voice.amp.gain.setValueAtTime(Math.max(voice.amp.gain.value, 0.0001), now)
    voice.amp.gain.exponentialRampToValueAtTime(0.0001, now + release)

    const stopAt = now + release + 0.03
    for (const osc of voice.oscillators) osc.stop(stopAt)
    this.voices.delete(midi)
  }

  /** Stop everything immediately (used on unmount). */
  allOff() {
    for (const midi of [...this.voices.keys()]) this.noteOff(midi)
  }

  dispose() {
    this.allOff()
    this.ctx?.close()
    this.ctx = null
    this.voices.clear()
  }
}
