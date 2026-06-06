// Declarative descriptions of the modular synth's modules: what jacks and
// knobs each one has. The audio graph (ModularEngine) and the UI (ModularPage)
// both read from these so they never drift apart.

export type ModuleType =
  | 'vco'
  | 'lfo'
  | 'noise'
  | 'vcf'
  | 'vca'
  | 'output'
  | 'clock'
  | 'env'
  | 'snh'
  | 'mix'
  | 'delay'
  | 'drive'
  | 'atten'
  | 'seq'

export type JackKind = 'audioOut' | 'cvOut' | 'audioIn' | 'cvIn' | 'gateOut' | 'gateIn'

export const isOutputJack = (k: JackKind) =>
  k === 'audioOut' || k === 'cvOut' || k === 'gateOut'

/**
 * Connection grouping. Gate/trigger jacks form their own world (routed
 * logically by the engine's clock); everything else is an audio-rate or
 * control-voltage signal handled by the Web Audio graph. A cable is only
 * valid between jacks of the same group.
 */
export const jackGroup = (k: JackKind): 'gate' | 'signal' =>
  k === 'gateOut' || k === 'gateIn' ? 'gate' : 'signal'

export interface JackDef {
  id: string
  label: string
  kind: JackKind
}

export interface ParamDef {
  id: string
  label: string
  min: number
  max: number
  default: number
  unit?: string
}

export interface ModuleDef {
  type: ModuleType
  name: string
  accent: string
  jacks: JackDef[]
  params: ParamDef[]
  /** Show a waveform selector (VCO / LFO). */
  waveform?: boolean
  removable: boolean
}

export const MODULE_DEFS: Record<ModuleType, ModuleDef> = {
  vco: {
    type: 'vco',
    name: 'VCO',
    accent: '#ff7a3d',
    waveform: true,
    removable: true,
    jacks: [
      { id: 'pitch', label: 'PITCH', kind: 'cvIn' },
      { id: 'out', label: 'OUT', kind: 'audioOut' },
    ],
    params: [{ id: 'freq', label: 'FREQ', min: 0, max: 2000, default: 110, unit: 'Hz' }],
  },
  lfo: {
    type: 'lfo',
    name: 'LFO',
    accent: '#9b6cff',
    waveform: true,
    removable: true,
    jacks: [{ id: 'out', label: 'OUT', kind: 'cvOut' }],
    params: [
      { id: 'rate', label: 'RATE', min: 0.05, max: 30, default: 2, unit: 'Hz' },
      { id: 'depth', label: 'DEPTH', min: 0, max: 2000, default: 300 },
    ],
  },
  noise: {
    type: 'noise',
    name: 'NOISE',
    accent: '#8a8aa3',
    removable: true,
    jacks: [{ id: 'out', label: 'OUT', kind: 'audioOut' }],
    params: [{ id: 'level', label: 'LEVEL', min: 0, max: 1, default: 0.5 }],
  },
  vcf: {
    type: 'vcf',
    name: 'VCF',
    accent: '#36d1c4',
    removable: true,
    jacks: [
      { id: 'in', label: 'IN', kind: 'audioIn' },
      { id: 'cv', label: 'CUT CV', kind: 'cvIn' },
      { id: 'out', label: 'OUT', kind: 'audioOut' },
    ],
    params: [
      { id: 'cutoff', label: 'CUTOFF', min: 40, max: 12000, default: 1200, unit: 'Hz' },
      { id: 'res', label: 'RES', min: 0, max: 25, default: 4 },
    ],
  },
  vca: {
    type: 'vca',
    name: 'VCA',
    accent: '#4cd07d',
    removable: true,
    jacks: [
      { id: 'in', label: 'IN', kind: 'audioIn' },
      { id: 'cv', label: 'GAIN CV', kind: 'cvIn' },
      { id: 'out', label: 'OUT', kind: 'audioOut' },
    ],
    params: [{ id: 'gain', label: 'GAIN', min: 0, max: 1, default: 0.5 }],
  },
  output: {
    type: 'output',
    name: 'OUTPUT',
    accent: '#ffd23d',
    removable: false,
    jacks: [{ id: 'in', label: 'IN', kind: 'audioIn' }],
    params: [{ id: 'level', label: 'LEVEL', min: 0, max: 1, default: 0.8 }],
  },
  clock: {
    type: 'clock',
    name: 'CLOCK',
    accent: '#ff5d9e',
    removable: true,
    jacks: [{ id: 'gate', label: 'GATE', kind: 'gateOut' }],
    params: [{ id: 'rate', label: 'BPM', min: 40, max: 240, default: 120 }],
  },
  env: {
    type: 'env',
    name: 'ENV',
    accent: '#9b6cff',
    removable: true,
    jacks: [
      { id: 'gate', label: 'GATE', kind: 'gateIn' },
      { id: 'out', label: 'OUT', kind: 'cvOut' },
    ],
    params: [
      { id: 'attack', label: 'ATTACK', min: 0.001, max: 1, default: 0.01 },
      { id: 'decay', label: 'DECAY', min: 0.02, max: 2, default: 0.3 },
      { id: 'amount', label: 'AMOUNT', min: 0, max: 1, default: 1 },
    ],
  },
  snh: {
    type: 'snh',
    name: 'S&H',
    accent: '#4cd07d',
    removable: true,
    jacks: [
      { id: 'gate', label: 'TRIG', kind: 'gateIn' },
      { id: 'out', label: 'OUT', kind: 'cvOut' },
    ],
    params: [
      { id: 'range', label: 'RANGE', min: 0, max: 2000, default: 600 },
      { id: 'glide', label: 'GLIDE', min: 0, max: 0.3, default: 0 },
    ],
  },
  mix: {
    type: 'mix',
    name: 'MIXER',
    accent: '#36d1c4',
    removable: true,
    jacks: [
      { id: 'in1', label: 'IN 1', kind: 'audioIn' },
      { id: 'in2', label: 'IN 2', kind: 'audioIn' },
      { id: 'in3', label: 'IN 3', kind: 'audioIn' },
      { id: 'out', label: 'OUT', kind: 'audioOut' },
    ],
    params: [
      { id: 'lvl1', label: 'LVL 1', min: 0, max: 1, default: 0.7 },
      { id: 'lvl2', label: 'LVL 2', min: 0, max: 1, default: 0.7 },
      { id: 'lvl3', label: 'LVL 3', min: 0, max: 1, default: 0.7 },
    ],
  },
  delay: {
    type: 'delay',
    name: 'DELAY',
    accent: '#9b6cff',
    removable: true,
    jacks: [
      { id: 'in', label: 'IN', kind: 'audioIn' },
      { id: 'out', label: 'OUT', kind: 'audioOut' },
    ],
    params: [
      { id: 'time', label: 'TIME', min: 0.02, max: 0.8, default: 0.3, unit: 's' },
      { id: 'fbk', label: 'FBK', min: 0, max: 0.9, default: 0.35 },
      { id: 'mix', label: 'MIX', min: 0, max: 1, default: 0.4 },
    ],
  },
  drive: {
    type: 'drive',
    name: 'DRIVE',
    accent: '#ff7a3d',
    removable: true,
    jacks: [
      { id: 'in', label: 'IN', kind: 'audioIn' },
      { id: 'out', label: 'OUT', kind: 'audioOut' },
    ],
    params: [{ id: 'drive', label: 'DRIVE', min: 1, max: 50, default: 6 }],
  },
  atten: {
    type: 'atten',
    name: 'ATTEN',
    accent: '#8a8aa3',
    removable: true,
    jacks: [
      { id: 'in', label: 'IN', kind: 'audioIn' },
      { id: 'out', label: 'OUT', kind: 'audioOut' },
    ],
    params: [{ id: 'amount', label: 'AMOUNT', min: -1, max: 1, default: 1 }],
  },
  seq: {
    type: 'seq',
    name: 'SEQ',
    accent: '#ffd23d',
    removable: true,
    // The step grid is a custom UI; these jacks are the only patch points.
    jacks: [
      { id: 'clock', label: 'CLOCK', kind: 'gateIn' },
      { id: 'pitch', label: 'PITCH', kind: 'cvOut' },
      { id: 'gate', label: 'GATE', kind: 'gateOut' },
    ],
    params: [],
  },
}

export interface ModuleInstance {
  id: string
  type: ModuleType
}

export interface JackRef {
  moduleId: string
  jack: string
}

export interface Cable {
  id: string
  from: JackRef // an output jack
  to: JackRef // an input jack
}

export const jackKey = (moduleId: string, jack: string) => `${moduleId}:${jack}`
