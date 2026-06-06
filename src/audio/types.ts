// Shared audio/sequencer types.

export const STEPS = 16

export type DrumVoiceId = 'kick' | 'snare' | 'clap' | 'closedHat' | 'openHat'

export type OscWaveform = 'sawtooth' | 'square' | 'triangle' | 'sine'

/** Per-track mixer settings, applied imperatively to the audio graph. */
export interface MixerSettings {
  volume: number // 0..1
  pan: number // -1..1
  mute: boolean
  delaySend: number // 0..1
  reverbSend: number // 0..1
}

export interface DrumTrack {
  id: DrumVoiceId
  name: string
  steps: boolean[] // length STEPS
  mixer: MixerSettings
  /** Catalog sound id to play, or 'synth' for the built-in synthesized voice. */
  sound: string
}

export interface SynthTrack {
  name: string
  /** -1 means no note on that step; otherwise a MIDI note number. */
  steps: number[] // length STEPS
  mixer: MixerSettings
  waveform: OscWaveform
  cutoff: number // Hz
  resonance: number // Q
  attack: number // seconds
  decay: number // seconds
  sustain: number // 0..1
  release: number // seconds
  octave: number // base octave offset
}

export interface EffectSettings {
  delayTime: number // seconds
  delayFeedback: number // 0..0.95
  reverbMix: number // 0..1 (wet level of the reverb return)
}

export interface GrooveboxState {
  bpm: number
  swing: number // 0..0.6 (fraction of a 16th note that off-beats are delayed)
  playing: boolean
  currentStep: number
  drums: DrumTrack[]
  synth: SynthTrack
  effects: EffectSettings
  masterVolume: number // 0..1
}
