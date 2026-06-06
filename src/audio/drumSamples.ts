// A curated catalog of classic drum-machine one-shots from the public Strudel /
// TidalCycles Dirt-Samples library. Each pad on the Drum Pads page can be
// assigned any of these (or its built-in synth voice).

import type { DrumVoiceId } from './types'

const BASE = 'https://raw.githubusercontent.com/tidalcycles/Dirt-Samples/master'

export type DrumCategory = 'Kick' | 'Snare' | 'Clap' | 'Closed Hat' | 'Open Hat' | 'Perc'

export interface DrumSound {
  id: string
  label: string
  category: DrumCategory
  url: string
}

export const DRUM_CATALOG: DrumSound[] = [
  { id: 'k_808', label: '808 Kick', category: 'Kick', url: `${BASE}/808bd/BD0000.WAV` },
  { id: 'k_808_boom', label: '808 Kick (boom)', category: 'Kick', url: `${BASE}/808bd/BD0075.WAV` },
  { id: 'k_909', label: '909 Kick', category: 'Kick', url: `${BASE}/909/BT0A0A7.WAV` },
  { id: 'k_dirt', label: 'Dirt Kick', category: 'Kick', url: `${BASE}/bd/BT0A0A7.wav` },

  { id: 's_808', label: '808 Snare', category: 'Snare', url: `${BASE}/808sd/SD0000.WAV` },
  { id: 's_808_snap', label: '808 Snare (snap)', category: 'Snare', url: `${BASE}/808sd/SD0050.WAV` },
  { id: 's_dirt', label: 'Dirt Snare', category: 'Snare', url: `${BASE}/sd/rytm-00-hard.wav` },

  { id: 'c_808', label: '808 Clap', category: 'Clap', url: `${BASE}/808/CP.WAV` },
  { id: 'c_dirt', label: 'Dirt Clap', category: 'Clap', url: `${BASE}/cp/HANDCLP0.wav` },

  { id: 'hc_808', label: '808 CH', category: 'Closed Hat', url: `${BASE}/808/CH.WAV` },
  { id: 'hc_dirt', label: 'Dirt CH', category: 'Closed Hat', url: `${BASE}/hh/000_hh3closedhh.wav` },

  { id: 'ho_808', label: '808 OH', category: 'Open Hat', url: `${BASE}/808oh/OH00.WAV` },
  { id: 'ho_808_long', label: '808 OH (long)', category: 'Open Hat', url: `${BASE}/808oh/OH75.WAV` },

  { id: 'p_cowbell', label: '808 Cowbell', category: 'Perc', url: `${BASE}/808/CB.WAV` },
  { id: 'p_rimshot', label: '808 Rimshot', category: 'Perc', url: `${BASE}/808/RS.WAV` },
  { id: 'p_clave', label: '808 Clave', category: 'Perc', url: `${BASE}/808/CL.WAV` },
  { id: 'p_maracas', label: '808 Maracas', category: 'Perc', url: `${BASE}/808/MA.WAV` },
]

export const DRUM_CATEGORIES: DrumCategory[] = [
  'Kick',
  'Snare',
  'Clap',
  'Closed Hat',
  'Open Hat',
  'Perc',
]

/** A pad assignment is either a catalog sound id or the pad's synth voice. */
export const SYNTH_OPTION = 'synth'

export const soundById = (id: string): DrumSound | undefined =>
  DRUM_CATALOG.find((s) => s.id === id)

/** Sensible classic-808 default sound per pad. */
export const DEFAULT_ASSIGNMENTS: Record<DrumVoiceId, string> = {
  kick: 'k_808',
  snare: 's_808',
  clap: 'c_808',
  closedHat: 'hc_808',
  openHat: 'ho_808',
}
