import type { DrumTrack, GrooveboxState, MixerSettings } from '../audio/types'
import { STEPS } from '../audio/types'
import { DEFAULT_ASSIGNMENTS } from '../audio/drumSamples'

const defaultMixer = (overrides: Partial<MixerSettings> = {}): MixerSettings => ({
  volume: 0.8,
  pan: 0,
  mute: false,
  delaySend: 0,
  reverbSend: 0,
  ...overrides,
})

const emptyDrumSteps = () => Array<boolean>(STEPS).fill(false)

function drumTrack(id: DrumTrack['id'], name: string, mixer?: Partial<MixerSettings>): DrumTrack {
  return {
    id,
    name,
    steps: emptyDrumSteps(),
    mixer: defaultMixer(mixer),
    // Default to the matching classic sample; falls back to synth until loaded.
    sound: DEFAULT_ASSIGNMENTS[id],
  }
}

export function createInitialState(): GrooveboxState {
  const drums: DrumTrack[] = [
    drumTrack('kick', 'Kick', { volume: 0.9 }),
    drumTrack('snare', 'Snare', { reverbSend: 0.15 }),
    drumTrack('clap', 'Clap', { reverbSend: 0.25 }),
    drumTrack('closedHat', 'Closed Hat', { volume: 0.6 }),
    drumTrack('openHat', 'Open Hat', { volume: 0.55, delaySend: 0.1 }),
  ]

  // A simple starter beat so there's sound on first play.
  const set = (id: DrumTrack['id'], steps: number[]) => {
    const t = drums.find((d) => d.id === id)!
    for (const s of steps) t.steps[s] = true
  }
  set('kick', [0, 4, 8, 12])
  set('snare', [4, 12])
  set('closedHat', [0, 2, 4, 6, 8, 10, 12, 14])
  set('openHat', [14])

  const synthSteps = Array<number>(STEPS).fill(-1)
  // A little bassline hint (MIDI notes); -1 = rest.
  const bass = { 0: 36, 3: 36, 6: 43, 8: 41, 11: 41, 14: 38 } as Record<number, number>
  for (const [i, n] of Object.entries(bass)) synthSteps[Number(i)] = n

  return {
    bpm: 110,
    swing: 0,
    playing: false,
    currentStep: -1,
    drums,
    synth: {
      name: 'Synth',
      steps: synthSteps,
      mixer: defaultMixer({ volume: 0.7, reverbSend: 0.1 }),
      waveform: 'sawtooth',
      cutoff: 1200,
      resonance: 6,
      attack: 0.005,
      decay: 0.15,
      sustain: 0.5,
      release: 0.2,
      octave: 0,
    },
    effects: {
      delayTime: 0.27,
      delayFeedback: 0.35,
      reverbMix: 0.5,
    },
    masterVolume: 0.9,
  }
}
