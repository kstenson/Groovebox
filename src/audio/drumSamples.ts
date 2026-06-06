// A curated catalog of classic drum-machine one-shots from the public Strudel /
// TidalCycles Dirt-Samples library, plus named "kits" that map a full set of
// sounds onto the five pads/tracks. Each pad/track can also be assigned an
// individual sound, or its built-in synth voice.

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
  // --- Kicks ---
  { id: 'k_808', label: '808 Kick', category: 'Kick', url: `${BASE}/808bd/BD0000.WAV` },
  { id: 'k_808_boom', label: '808 Kick (boom)', category: 'Kick', url: `${BASE}/808bd/BD0075.WAV` },
  { id: 'k_909', label: '909 Kick', category: 'Kick', url: `${BASE}/909/BT0A0A7.WAV` },
  { id: 'k_dt', label: 'Drumtraks Kick', category: 'Kick', url: `${BASE}/drumtraks/006_DT%20Kick.wav` },
  { id: 'k_house', label: 'House Kick', category: 'Kick', url: `${BASE}/house/000_BD.wav` },
  { id: 'k_dr55', label: 'DR-55 Kick', category: 'Kick', url: `${BASE}/dr55/001_DR55%20kick.wav` },
  { id: 'k_club', label: 'Club Kick', category: 'Kick', url: `${BASE}/clubkick/1.wav` },
  { id: 'k_dirt', label: 'Dirt Kick', category: 'Kick', url: `${BASE}/bd/BT0A0A7.wav` },

  // --- Snares ---
  { id: 's_808', label: '808 Snare', category: 'Snare', url: `${BASE}/808sd/SD0000.WAV` },
  { id: 's_808_snap', label: '808 Snare (snap)', category: 'Snare', url: `${BASE}/808sd/SD0050.WAV` },
  { id: 's_dt', label: 'Drumtraks Snare', category: 'Snare', url: `${BASE}/drumtraks/009_DT%20Snare.wav` },
  { id: 's_house', label: 'House Snare', category: 'Snare', url: `${BASE}/house/007_SN.wav` },
  { id: 's_dr55', label: 'DR-55 Snare', category: 'Snare', url: `${BASE}/dr55/003_DR55%20snare.wav` },
  { id: 's_dirt', label: 'Dirt Snare', category: 'Snare', url: `${BASE}/sd/rytm-00-hard.wav` },

  // --- Claps ---
  { id: 'c_808', label: '808 Clap', category: 'Clap', url: `${BASE}/808/CP.WAV` },
  { id: 'c_dt', label: 'Drumtraks Clap', category: 'Clap', url: `${BASE}/drumtraks/001_DT%20Claps.wav` },
  { id: 'c_real', label: 'Real Clap', category: 'Clap', url: `${BASE}/realclaps/1.wav` },
  { id: 'c_dirt', label: 'Dirt Clap', category: 'Clap', url: `${BASE}/cp/HANDCLP0.wav` },

  // --- Closed hats ---
  { id: 'hc_808', label: '808 CH', category: 'Closed Hat', url: `${BASE}/808/CH.WAV` },
  { id: 'hc_dt', label: 'Drumtraks CH', category: 'Closed Hat', url: `${BASE}/drumtraks/004_DT%20Hat%20Closed.wav` },
  { id: 'hc_house', label: 'House CH', category: 'Closed Hat', url: `${BASE}/house/003_HH.wav` },
  { id: 'hc_dr55', label: 'DR-55 Hat', category: 'Closed Hat', url: `${BASE}/dr55/000_DR55%20hi%20hat.wav` },
  { id: 'hc_dirt', label: 'Dirt CH', category: 'Closed Hat', url: `${BASE}/hh/000_hh3closedhh.wav` },

  // --- Open hats ---
  { id: 'ho_808', label: '808 OH', category: 'Open Hat', url: `${BASE}/808oh/OH00.WAV` },
  { id: 'ho_808_long', label: '808 OH (long)', category: 'Open Hat', url: `${BASE}/808oh/OH75.WAV` },
  { id: 'ho_dt', label: 'Drumtraks OH', category: 'Open Hat', url: `${BASE}/drumtraks/005_DT%20Hat%20Open.wav` },
  { id: 'ho_house', label: 'House OH', category: 'Open Hat', url: `${BASE}/house/004_OH.wav` },
  { id: 'ho_dirt', label: 'Dirt OH', category: 'Open Hat', url: `${BASE}/hh/007_hh3openhh.wav` },

  // --- Perc ---
  { id: 'p_cowbell', label: '808 Cowbell', category: 'Perc', url: `${BASE}/808/CB.WAV` },
  { id: 'p_rimshot', label: '808 Rimshot', category: 'Perc', url: `${BASE}/808/RS.WAV` },
  { id: 'p_clave', label: '808 Clave', category: 'Perc', url: `${BASE}/808/CL.WAV` },
  { id: 'p_maracas', label: '808 Maracas', category: 'Perc', url: `${BASE}/808/MA.WAV` },
  { id: 'p_dt_cowbell', label: 'Drumtraks Cowbell', category: 'Perc', url: `${BASE}/drumtraks/002_DT%20Cowbell.wav` },
]

export const DRUM_CATEGORIES: DrumCategory[] = [
  'Kick',
  'Snare',
  'Clap',
  'Closed Hat',
  'Open Hat',
  'Perc',
]

/** A pad/track assignment is either a catalog sound id or its synth voice. */
export const SYNTH_OPTION = 'synth'

export const soundById = (id: string): DrumSound | undefined =>
  DRUM_CATALOG.find((s) => s.id === id)

/** A full kit: one catalog sound per pad/track. */
export interface Kit {
  name: string
  sounds: Record<DrumVoiceId, string>
}

export const KITS: Kit[] = [
  {
    name: '808',
    sounds: { kick: 'k_808', snare: 's_808', clap: 'c_808', closedHat: 'hc_808', openHat: 'ho_808' },
  },
  {
    name: 'Drumtraks',
    sounds: { kick: 'k_dt', snare: 's_dt', clap: 'c_dt', closedHat: 'hc_dt', openHat: 'ho_dt' },
  },
  {
    name: 'House',
    sounds: {
      kick: 'k_house',
      snare: 's_house',
      clap: 'c_real',
      closedHat: 'hc_house',
      openHat: 'ho_house',
    },
  },
  {
    name: 'DR-55',
    sounds: {
      kick: 'k_dr55',
      snare: 's_dr55',
      clap: 'c_real',
      closedHat: 'hc_dr55',
      openHat: 'ho_dirt',
    },
  },
  {
    name: 'Dirt',
    sounds: {
      kick: 'k_dirt',
      snare: 's_dirt',
      clap: 'c_dirt',
      closedHat: 'hc_dirt',
      openHat: 'ho_dirt',
    },
  },
]

export const kitByName = (name: string): Kit | undefined => KITS.find((k) => k.name === name)

/** Default per-pad/track sound (the classic 808 kit). */
export const DEFAULT_ASSIGNMENTS: Record<DrumVoiceId, string> = KITS[0].sounds
