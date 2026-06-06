// Declarative descriptions of the modular synth's modules: what jacks and
// knobs each one has. The audio graph (ModularEngine) and the UI (ModularPage)
// both read from these so they never drift apart.

export type ModuleType = 'vco' | 'lfo' | 'noise' | 'vcf' | 'vca' | 'output'

export type JackKind = 'audioOut' | 'cvOut' | 'audioIn' | 'cvIn'

export const isOutputJack = (k: JackKind) => k === 'audioOut' || k === 'cvOut'

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
    params: [{ id: 'freq', label: 'FREQ', min: 20, max: 2000, default: 110, unit: 'Hz' }],
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
