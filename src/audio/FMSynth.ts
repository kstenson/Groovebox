// A 2-operator FM synth (one modulator frequency-modulating one carrier),
// the classic recipe behind DX-style electric pianos, bells and mallets.
// Playable and polyphonic with gated note-on/off, mirroring PolySynth's shape.
//
// Four macros:
//   ratio  -> modulator:carrier frequency ratio (harmonic <-> clangorous)
//   depth  -> FM index (how much modulation = brightness/bite)
//   decay  -> amp + modulation-index decay (plucky <-> sustained)
//   fx     -> delay send + feedback

import { midiToFreq } from '../theory'

export interface FMMacros {
  ratio: number // 0..1 -> mapped to a useful ratio range
  depth: number // 0..1
  decay: number // 0..1
  fx: number // 0..1
}

export const DEFAULT_FM_MACROS: FMMacros = { ratio: 0.28, depth: 0.5, decay: 0.4, fx: 0.2 }

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

interface Voice {
  carrier: OscillatorNode
  modulator: OscillatorNode
  modGain: GainNode
  amp: GainNode
  releasing: boolean
}

export class FMSynth {
  private ctx: AudioContext | null = null
  private master!: GainNode
  private analyser!: AnalyserNode
  private delaySend!: GainNode
  private delay!: DelayNode
  private feedback!: GainNode

  private voices = new Map<number, Voice>()
  private macros: FMMacros = { ...DEFAULT_FM_MACROS }

  private ensure(): AudioContext {
    if (this.ctx) return this.ctx
    const ctx = new AudioContext()
    this.ctx = ctx

    this.master = ctx.createGain()
    this.master.gain.value = 0.6
    this.analyser = ctx.createAnalyser()
    this.analyser.fftSize = 1024

    this.delaySend = ctx.createGain()
    this.delaySend.gain.value = 0
    this.delay = ctx.createDelay(1)
    this.delay.delayTime.value = 0.33
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

  resume() {
    const ctx = this.ensure()
    if (ctx.state === 'suspended') void ctx.resume()
  }

  peekAnalyser(): AnalyserNode | null {
    return this.ctx ? this.analyser : null
  }

  setMacros(patch: Partial<FMMacros>) {
    this.macros = { ...this.macros, ...patch }
    this.applyFx()
  }

  private ratioValue(): number {
    // 0..1 -> 0.5 .. 8 with a few integer-ish sweet spots feeling natural.
    return Math.round(lerp(0.5, 8, this.macros.ratio) * 2) / 2
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
    if (this.voices.has(midi)) this.noteOff(midi)

    const now = ctx.currentTime
    const carrierFreq = midiToFreq(midi)
    const ratio = this.ratioValue()
    const decayTime = lerp(0.12, 2.2, this.macros.decay)
    // Modulation index scales the FM depth in Hz relative to the carrier.
    const indexPeak = this.macros.depth * carrierFreq * 6

    const carrier = ctx.createOscillator()
    carrier.type = 'sine'
    carrier.frequency.value = carrierFreq

    const modulator = ctx.createOscillator()
    modulator.type = 'sine'
    modulator.frequency.value = carrierFreq * ratio

    // Modulation-index envelope: bright attack that decays — the FM "bite".
    const modGain = ctx.createGain()
    modGain.gain.setValueAtTime(indexPeak, now)
    modGain.gain.exponentialRampToValueAtTime(Math.max(indexPeak * 0.15, 0.001), now + decayTime)
    modulator.connect(modGain)
    modGain.connect(carrier.frequency)

    // Amplitude envelope: quick attack, decay to a low sustain, hold.
    const amp = ctx.createGain()
    const peak = 0.3
    amp.gain.setValueAtTime(0.0001, now)
    amp.gain.linearRampToValueAtTime(peak, now + 0.005)
    amp.gain.exponentialRampToValueAtTime(Math.max(peak * 0.3, 0.001), now + decayTime)

    carrier.connect(amp)
    amp.connect(this.master)
    amp.connect(this.delaySend)

    carrier.start(now)
    modulator.start(now)
    this.voices.set(midi, { carrier, modulator, modGain, amp, releasing: false })
  }

  noteOff(midi: number) {
    const voice = this.voices.get(midi)
    if (!voice || !this.ctx || voice.releasing) return
    voice.releasing = true
    const now = this.ctx.currentTime
    const release = lerp(0.1, 0.8, this.macros.decay)
    voice.amp.gain.cancelScheduledValues(now)
    voice.amp.gain.setValueAtTime(Math.max(voice.amp.gain.value, 0.0001), now)
    voice.amp.gain.exponentialRampToValueAtTime(0.0001, now + release)
    const stopAt = now + release + 0.03
    voice.carrier.stop(stopAt)
    voice.modulator.stop(stopAt)
    this.voices.delete(midi)
  }

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
