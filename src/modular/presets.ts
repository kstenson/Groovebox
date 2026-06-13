// Ready-made modular patches that demonstrate different ways to wire the rack.
// Loading one rebuilds the engine and UI from this description.

import type { JackRef, ModuleType } from './defs'

export interface PatchModule {
  id: string
  type: ModuleType
  /** Non-default parameter values (by param id). */
  params?: Record<string, number>
  /** Oscillator waveform (VCO / LFO). */
  wave?: OscillatorType
  /** Catalog sound id for a SAMPLER module. */
  sampler?: string
  /** Step pattern for a SEQ module. */
  seq?: { degrees: number[]; ons: boolean[] }
}

export interface PatchCable {
  from: JackRef
  to: JackRef
}

export interface Patch {
  name: string
  blurb: string
  modules: PatchModule[]
  cables: PatchCable[]
}

const c = (fm: string, fj: string, tm: string, tj: string): PatchCable => ({
  from: { moduleId: fm, jack: fj },
  to: { moduleId: tm, jack: tj },
})

const all = (degrees: number[]) => ({ degrees, ons: degrees.map(() => true) })
const rhythm = (ons: boolean[]) => ({ degrees: ons.map(() => 0), ons })

export const PATCHES: Patch[] = [
  {
    name: 'Subtractive Drone',
    blurb: 'Classic VCO → filter → amp, with an LFO sweeping the cutoff.',
    modules: [
      { id: 'vco1', type: 'vco', params: { freq: 110 }, wave: 'sawtooth' },
      { id: 'vcf1', type: 'vcf', params: { cutoff: 1200, res: 4 } },
      { id: 'vca1', type: 'vca', params: { gain: 0.5 } },
      { id: 'lfo1', type: 'lfo', params: { rate: 2, depth: 300 }, wave: 'sine' },
      { id: 'out1', type: 'output', params: { level: 0.8 } },
    ],
    cables: [
      c('vco1', 'out', 'vcf1', 'in'),
      c('vcf1', 'out', 'vca1', 'in'),
      c('vca1', 'out', 'out1', 'in'),
      c('lfo1', 'out', 'vcf1', 'cv'),
    ],
  },
  {
    name: 'Acid Sequence',
    blurb: 'A clocked sequence into a high-resonance filter plucked by an envelope — 303 territory.',
    modules: [
      { id: 'clk', type: 'clock', params: { rate: 130 } },
      { id: 'seq1', type: 'seq', seq: all([0, 0, 3, 0, 5, 3, 2, 7]) },
      { id: 'vco1', type: 'vco', params: { freq: 0 }, wave: 'sawtooth' },
      { id: 'env1', type: 'env', params: { attack: 0.005, decay: 0.16, amount: 1 } },
      { id: 'vcf1', type: 'vcf', params: { cutoff: 320, res: 18 } },
      { id: 'vca1', type: 'vca', params: { gain: 0 } },
      { id: 'out1', type: 'output', params: { level: 0.8 } },
    ],
    cables: [
      c('clk', 'gate', 'seq1', 'clock'),
      c('seq1', 'pitch', 'vco1', 'pitch'),
      c('seq1', 'gate', 'env1', 'gate'),
      c('env1', 'out', 'vca1', 'cv'),
      c('env1', 'out', 'vcf1', 'cv'),
      c('vco1', 'out', 'vcf1', 'in'),
      c('vcf1', 'out', 'vca1', 'in'),
      c('vca1', 'out', 'out1', 'in'),
    ],
  },
  {
    name: 'Generative Bleeps',
    blurb: 'Sample & hold feeds random pitches to the oscillator; a slow LFO drifts the filter.',
    modules: [
      { id: 'clk', type: 'clock', params: { rate: 100 } },
      { id: 'snh1', type: 'snh', params: { range: 600, glide: 0 } },
      { id: 'vco1', type: 'vco', params: { freq: 110 }, wave: 'square' },
      { id: 'env1', type: 'env', params: { attack: 0.004, decay: 0.22, amount: 1 } },
      { id: 'vcf1', type: 'vcf', params: { cutoff: 1800, res: 7 } },
      { id: 'vca1', type: 'vca', params: { gain: 0 } },
      { id: 'lfo1', type: 'lfo', params: { rate: 0.3, depth: 1200 }, wave: 'triangle' },
      { id: 'out1', type: 'output', params: { level: 0.8 } },
    ],
    cables: [
      c('clk', 'gate', 'snh1', 'gate'),
      c('snh1', 'out', 'vco1', 'pitch'),
      c('clk', 'gate', 'env1', 'gate'),
      c('env1', 'out', 'vca1', 'cv'),
      c('vco1', 'out', 'vcf1', 'in'),
      c('vcf1', 'out', 'vca1', 'in'),
      c('vca1', 'out', 'out1', 'in'),
      c('lfo1', 'out', 'vcf1', 'cv'),
    ],
  },
  {
    name: 'Fat Detune',
    blurb: 'Two slightly detuned oscillators mixed together for a thick, moving drone.',
    modules: [
      { id: 'vco1', type: 'vco', params: { freq: 110 }, wave: 'sawtooth' },
      { id: 'vco2', type: 'vco', params: { freq: 113 }, wave: 'sawtooth' },
      { id: 'mix1', type: 'mix', params: { lvl1: 0.6, lvl2: 0.6 } },
      { id: 'vcf1', type: 'vcf', params: { cutoff: 1400, res: 3 } },
      { id: 'vca1', type: 'vca', params: { gain: 0.5 } },
      { id: 'lfo1', type: 'lfo', params: { rate: 0.2, depth: 700 }, wave: 'sine' },
      { id: 'out1', type: 'output', params: { level: 0.8 } },
    ],
    cables: [
      c('vco1', 'out', 'mix1', 'in1'),
      c('vco2', 'out', 'mix1', 'in2'),
      c('mix1', 'out', 'vcf1', 'in'),
      c('vcf1', 'out', 'vca1', 'in'),
      c('vca1', 'out', 'out1', 'in'),
      c('lfo1', 'out', 'vcf1', 'cv'),
    ],
  },
  {
    name: 'Sampled Beat',
    blurb: 'Two sequencers clock two samplers (kick + clap) through a mixer and delay.',
    modules: [
      { id: 'clk', type: 'clock', params: { rate: 120 } },
      { id: 'seqK', type: 'seq', seq: rhythm([true, false, true, false, true, false, true, false]) },
      { id: 'seqC', type: 'seq', seq: rhythm([false, false, true, false, false, false, true, false]) },
      { id: 'sampK', type: 'sampler', sampler: 'k_808', params: { gain: 1 } },
      { id: 'sampC', type: 'sampler', sampler: 'c_dt', params: { gain: 0.9 } },
      { id: 'mix1', type: 'mix', params: { lvl1: 0.9, lvl2: 0.8 } },
      { id: 'dly1', type: 'delay', params: { time: 0.27, fbk: 0.3, mix: 0.25 } },
      { id: 'out1', type: 'output', params: { level: 0.9 } },
    ],
    cables: [
      c('clk', 'gate', 'seqK', 'clock'),
      c('clk', 'gate', 'seqC', 'clock'),
      c('seqK', 'gate', 'sampK', 'trig'),
      c('seqC', 'gate', 'sampC', 'trig'),
      c('sampK', 'out', 'mix1', 'in1'),
      c('sampC', 'out', 'mix1', 'in2'),
      c('mix1', 'out', 'dly1', 'in'),
      c('dly1', 'out', 'out1', 'in'),
    ],
  },
  {
    name: 'Filtered Wind',
    blurb: 'Noise through a resonant filter, with slow LFOs breathing the cutoff and volume.',
    modules: [
      { id: 'noi1', type: 'noise', params: { level: 0.5 } },
      { id: 'vcf1', type: 'vcf', params: { cutoff: 700, res: 9 } },
      { id: 'vca1', type: 'vca', params: { gain: 0.5 } },
      { id: 'lfo1', type: 'lfo', params: { rate: 0.15, depth: 600 }, wave: 'sine' },
      { id: 'lfo2', type: 'lfo', params: { rate: 0.08, depth: 0.35 }, wave: 'triangle' },
      { id: 'out1', type: 'output', params: { level: 0.85 } },
    ],
    cables: [
      c('noi1', 'out', 'vcf1', 'in'),
      c('vcf1', 'out', 'vca1', 'in'),
      c('vca1', 'out', 'out1', 'in'),
      c('lfo1', 'out', 'vcf1', 'cv'),
      c('lfo2', 'out', 'vca1', 'cv'),
    ],
  },
]
