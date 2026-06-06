// Minimal music-theory helpers for the synth track.

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

/** Convert a MIDI note number to a frequency in Hz (A4 = 69 = 440Hz). */
export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

/** Human-readable name for a MIDI note, e.g. 60 -> "C4". */
export function midiToName(midi: number): string {
  const name = NOTE_NAMES[((midi % 12) + 12) % 12]
  const octave = Math.floor(midi / 12) - 1
  return `${name}${octave}`
}

export type ScaleName = 'major' | 'minorPentatonic' | 'naturalMinor' | 'dorian'

// Semitone offsets from the root, per scale.
export const SCALES: Record<ScaleName, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  naturalMinor: [0, 2, 3, 5, 7, 8, 10],
  minorPentatonic: [0, 3, 5, 7, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
}

/**
 * Build an ascending list of MIDI notes for a scale, starting at `root`
 * (a MIDI note) and spanning `octaves` octaves. Useful for a piano-roll
 * style column of pitches.
 */
export function buildScale(root: number, scale: ScaleName, octaves: number): number[] {
  const offsets = SCALES[scale]
  const notes: number[] = []
  for (let o = 0; o < octaves; o++) {
    for (const off of offsets) {
      notes.push(root + o * 12 + off)
    }
  }
  // Cap at the octave root above the top so the grid closes nicely.
  notes.push(root + octaves * 12)
  return notes
}
