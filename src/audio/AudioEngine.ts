// The audio engine is intentionally framework-agnostic: it owns the
// AudioContext, the mixer/effects graph, and a sample-accurate look-ahead
// scheduler (the "two clocks" pattern — a coarse setInterval that schedules
// events precisely against AudioContext.currentTime). React state is the
// source of truth for the *pattern*; the engine reads it each step through a
// getState() callback, and mixer/effect parameter changes are pushed in
// imperatively so they respond without waiting for the next step.

import type { DrumTrack, GrooveboxState, MixerSettings } from './types'
import { STEPS } from './types'
import { triggerDrum, triggerSynth } from './voices'
import { soundById } from './drumSamples'

const LOOKAHEAD_MS = 25 // how often the scheduler wakes up
const SCHEDULE_AHEAD = 0.1 // seconds of audio scheduled into the future

/** One mixer channel: voices -> pan -> volume -> master, with FX sends. */
class Channel {
  readonly input: GainNode
  private readonly panner: StereoPannerNode
  private readonly volume: GainNode
  private readonly delaySend: GainNode
  private readonly reverbSend: GainNode

  constructor(ctx: AudioContext, master: AudioNode, delayBus: AudioNode, reverbBus: AudioNode) {
    this.input = ctx.createGain()
    this.panner = ctx.createStereoPanner()
    this.volume = ctx.createGain()
    this.delaySend = ctx.createGain()
    this.reverbSend = ctx.createGain()

    this.delaySend.gain.value = 0
    this.reverbSend.gain.value = 0

    this.input.connect(this.panner)
    this.panner.connect(this.volume)
    this.volume.connect(master)

    // Post-fader sends.
    this.volume.connect(this.delaySend).connect(delayBus)
    this.volume.connect(this.reverbSend).connect(reverbBus)
  }

  apply(m: MixerSettings) {
    const now = this.input.context.currentTime
    const vol = m.mute ? 0 : m.volume
    this.volume.gain.setTargetAtTime(vol, now, 0.01)
    this.panner.pan.setTargetAtTime(m.pan, now, 0.01)
    this.delaySend.gain.setTargetAtTime(m.delaySend, now, 0.01)
    this.reverbSend.gain.setTargetAtTime(m.reverbSend, now, 0.01)
  }
}

export class AudioEngine {
  private ctx: AudioContext | null = null
  private master!: GainNode
  private channels = new Map<string, Channel>()

  // Loaded drum samples, keyed by URL.
  private samples = new Map<string, AudioBuffer>()
  private sampleLoading = new Map<string, Promise<boolean>>()

  // Effects buses
  private delayBus!: GainNode
  private delayNode!: DelayNode
  private delayFeedback!: GainNode
  private reverbBus!: GainNode
  private reverbReturn!: GainNode

  // Scheduler state
  private timer: number | null = null
  private nextStepTime = 0
  private currentStep = 0

  getState: () => GrooveboxState = () => {
    throw new Error('AudioEngine.getState not set')
  }
  onStep: (step: number) => void = () => {}

  /** Lazily create the context (must follow a user gesture) and graph. */
  private ensureContext(): AudioContext {
    if (this.ctx) return this.ctx
    const ctx = new AudioContext()
    this.ctx = ctx

    this.master = ctx.createGain()
    this.master.gain.value = 0.9
    this.master.connect(ctx.destination)

    // Feedback delay
    this.delayBus = ctx.createGain()
    this.delayNode = ctx.createDelay(2)
    this.delayNode.delayTime.value = 0.25
    this.delayFeedback = ctx.createGain()
    this.delayFeedback.gain.value = 0.35
    this.delayBus.connect(this.delayNode)
    this.delayNode.connect(this.delayFeedback)
    this.delayFeedback.connect(this.delayNode) // feedback loop
    this.delayNode.connect(this.master)

    // Convolution reverb with a synthetic impulse response.
    this.reverbBus = ctx.createGain()
    const convolver = ctx.createConvolver()
    convolver.buffer = this.makeImpulse(ctx, 2.2, 2.5)
    this.reverbReturn = ctx.createGain()
    this.reverbReturn.gain.value = 0.5
    this.reverbBus.connect(convolver)
    convolver.connect(this.reverbReturn)
    this.reverbReturn.connect(this.master)

    // One channel per track id.
    const state = this.getState()
    for (const d of state.drums) this.makeChannel(d.id)
    this.makeChannel('synth')

    this.applyAllParams(state)
    return ctx
  }

  private makeChannel(id: string) {
    const ch = new Channel(this.ctx!, this.master, this.delayBus, this.reverbBus)
    this.channels.set(id, ch)
    return ch
  }

  private makeImpulse(ctx: AudioContext, duration: number, decay: number): AudioBuffer {
    const rate = ctx.sampleRate
    const length = Math.floor(rate * duration)
    const impulse = ctx.createBuffer(2, length, rate)
    for (let c = 0; c < 2; c++) {
      const data = impulse.getChannelData(c)
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay)
      }
    }
    return impulse
  }

  // ---- Imperative parameter setters (called from React on change) ----

  applyAllParams(state: GrooveboxState) {
    if (!this.ctx) return
    this.setMasterVolume(state.masterVolume)
    for (const d of state.drums) this.channels.get(d.id)?.apply(d.mixer)
    this.channels.get('synth')?.apply(state.synth.mixer)
    this.setEffects(state.effects)
  }

  setMasterVolume(v: number) {
    if (!this.ctx) return
    this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.01)
  }

  setChannelMixer(id: string, m: MixerSettings) {
    this.channels.get(id)?.apply(m)
  }

  setEffects(fx: GrooveboxState['effects']) {
    if (!this.ctx) return
    const now = this.ctx.currentTime
    this.delayNode.delayTime.setTargetAtTime(fx.delayTime, now, 0.02)
    this.delayFeedback.gain.setTargetAtTime(fx.delayFeedback, now, 0.02)
    this.reverbReturn.gain.setTargetAtTime(fx.reverbMix, now, 0.02)
  }

  // ---- Transport ----

  async start() {
    const ctx = this.ensureContext()
    if (ctx.state === 'suspended') await ctx.resume()
    this.applyAllParams(this.getState())
    this.currentStep = 0
    this.nextStepTime = ctx.currentTime + 0.05
    if (this.timer === null) {
      this.timer = window.setInterval(() => this.scheduler(), LOOKAHEAD_MS)
    }
  }

  stop() {
    if (this.timer !== null) {
      clearInterval(this.timer)
      this.timer = null
    }
    this.onStep(-1)
  }

  /** Duration of one 16th-note step in seconds, given the current BPM. */
  private stepDuration(bpm: number): number {
    return 60 / bpm / 4
  }

  private scheduler() {
    const ctx = this.ctx!
    while (this.nextStepTime < ctx.currentTime + SCHEDULE_AHEAD) {
      this.scheduleStep(this.currentStep, this.nextStepTime)
      this.advance()
    }
  }

  private advance() {
    // The grid advances uniformly; swing is applied per-step in scheduleStep
    // as a one-shot push of off-beats, so the underlying tempo stays steady.
    const base = this.stepDuration(this.getState().bpm)
    this.nextStepTime += base
    this.currentStep = (this.currentStep + 1) % STEPS
  }

  private scheduleStep(step: number, time: number) {
    const state = this.getState()
    const base = this.stepDuration(state.bpm)
    const swung = step % 2 === 1 ? time + base * state.swing : time

    // Drums
    for (const track of state.drums) {
      if (track.steps[step]) {
        const ch = this.channels.get(track.id)
        if (ch) this.playDrum(track, ch.input, swung)
      }
    }

    // Synth
    const note = state.synth.steps[step]
    if (note >= 0) {
      const ch = this.channels.get('synth')
      if (ch) {
        triggerSynth(this.ctx!, ch.input, swung, note, base * 0.9, {
          waveform: state.synth.waveform,
          cutoff: state.synth.cutoff,
          resonance: state.synth.resonance,
          attack: state.synth.attack,
          decay: state.synth.decay,
          sustain: state.synth.sustain,
          release: state.synth.release,
        })
      }
    }

    // Notify UI slightly before the step actually sounds.
    const delayMs = Math.max(0, (swung - this.ctx!.currentTime) * 1000)
    window.setTimeout(() => this.onStep(step), delayMs)
  }

  /** Audition a single note immediately (for the keyboard / pad presses). */
  previewSynth(midi: number) {
    const ctx = this.ensureContext()
    if (ctx.state === 'suspended') void ctx.resume()
    const ch = this.channels.get('synth')
    if (!ch) return
    const s = this.getState().synth
    triggerSynth(ctx, ch.input, ctx.currentTime, midi, 0.25, {
      waveform: s.waveform,
      cutoff: s.cutoff,
      resonance: s.resonance,
      attack: s.attack,
      decay: s.decay,
      sustain: s.sustain,
      release: s.release,
    })
  }

  previewDrum(id: GrooveboxState['drums'][number]['id']) {
    const ctx = this.ensureContext()
    if (ctx.state === 'suspended') void ctx.resume()
    const ch = this.channels.get(id)
    const track = this.getState().drums.find((d) => d.id === id)
    if (ch && track) this.playDrum(track, ch.input, ctx.currentTime)
  }

  /** Play a drum track: its assigned sample if loaded, else the synth voice. */
  private playDrum(track: DrumTrack, dest: AudioNode, time: number) {
    const sound = track.sound && track.sound !== 'synth' ? soundById(track.sound) : undefined
    const buffer = sound ? this.samples.get(sound.url) : undefined
    if (buffer) {
      const src = this.ctx!.createBufferSource()
      src.buffer = buffer
      src.connect(dest)
      src.start(time)
      return
    }
    triggerDrum(track.id, this.ctx!, dest, time)
  }

  /** Fetch + decode a drum sample (cached, idempotent). */
  loadSample(url: string): Promise<boolean> {
    if (this.samples.has(url)) return Promise.resolve(true)
    const inflight = this.sampleLoading.get(url)
    if (inflight) return inflight
    const ctx = this.ensureContext()
    const p = (async () => {
      try {
        const res = await fetch(url)
        if (!res.ok) throw new Error(`${res.status}`)
        const buf = await ctx.decodeAudioData(await res.arrayBuffer())
        this.samples.set(url, buf)
        return true
      } catch {
        return false
      } finally {
        this.sampleLoading.delete(url)
      }
    })()
    this.sampleLoading.set(url, p)
    return p
  }

  dispose() {
    this.stop()
    this.ctx?.close()
    this.ctx = null
    this.channels.clear()
    this.samples.clear()
    this.sampleLoading.clear()
  }
}
