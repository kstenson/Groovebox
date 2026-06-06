import { useMemo, useState } from 'react'
import type { GrooveboxState, OscWaveform } from '../audio/types'
import type { GrooveboxActions } from '../state/useGroovebox'
import { buildScale, midiToName, type ScaleName } from '../theory'
import { Knob } from './Knob'

interface Props {
  state: GrooveboxState
  actions: GrooveboxActions
}

const WAVEFORMS: OscWaveform[] = ['sawtooth', 'square', 'triangle', 'sine']
const SCALE_OPTIONS: { value: ScaleName; label: string }[] = [
  { value: 'minorPentatonic', label: 'Minor Pentatonic' },
  { value: 'naturalMinor', label: 'Natural Minor' },
  { value: 'major', label: 'Major' },
  { value: 'dorian', label: 'Dorian' },
]

export function SynthSequencer({ state, actions }: Props) {
  const synth = state.synth
  const [scale, setScale] = useState<ScaleName>('naturalMinor')
  const [root, setRoot] = useState(36) // C2

  // Notes displayed high -> low so the grid reads like a piano roll.
  const notes = useMemo(
    () => buildScale(root + synth.octave * 12, scale, 2).slice().reverse(),
    [root, scale, synth.octave],
  )

  return (
    <section className="panel synth-panel">
      <div className="panel-head">
        <h2>Synth</h2>
        <div className="synth-scale">
          <select value={root} onChange={(e) => setRoot(Number(e.target.value))} aria-label="Root note">
            {[24, 28, 31, 36, 41, 43, 48].map((m) => (
              <option key={m} value={m}>
                {midiToName(m)}
              </option>
            ))}
          </select>
          <select value={scale} onChange={(e) => setScale(e.target.value as ScaleName)} aria-label="Scale">
            {SCALE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button className="ghost-btn" onClick={actions.clearSynth}>
            Clear
          </button>
        </div>
      </div>

      <div className="piano-roll">
        {notes.map((midi) => (
          <div className="pr-row" key={midi}>
            <button
              className={`pr-note ${midi % 12 === ((root % 12) + 12) % 12 ? 'root' : ''}`}
              onClick={() => actions.previewSynth(midi)}
              title="Audition note"
            >
              {midiToName(midi)}
            </button>
            <div className="steps">
              {synth.steps.map((n, i) => {
                const active = n === midi
                return (
                  <button
                    key={i}
                    className={[
                      'step synth-step',
                      active ? 'on' : '',
                      state.currentStep === i ? 'playhead' : '',
                      i % 4 === 0 ? 'beat' : '',
                    ].join(' ')}
                    onClick={() => {
                      const next = active ? -1 : midi
                      actions.setSynthStep(i, next)
                      if (next >= 0) actions.previewSynth(next)
                    }}
                    aria-label={`${midiToName(midi)} step ${i + 1}`}
                    aria-pressed={active}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="synth-controls">
        <div className="wave-select">
          <span className="ctrl-label">WAVE</span>
          <div className="wave-buttons">
            {WAVEFORMS.map((w) => (
              <button
                key={w}
                className={`wave-btn ${synth.waveform === w ? 'active' : ''}`}
                onClick={() => actions.setSynthParam('waveform', w)}
                title={w}
              >
                {w === 'sawtooth' ? '◺' : w === 'square' ? '⊓' : w === 'triangle' ? '△' : '∿'}
              </button>
            ))}
          </div>
        </div>
        <Knob label="CUTOFF" value={synth.cutoff} min={120} max={8000} format={(v) => `${Math.round(v)}`} onChange={(v) => actions.setSynthParam('cutoff', v)} />
        <Knob label="RESO" value={synth.resonance} min={0.1} max={20} format={(v) => v.toFixed(1)} onChange={(v) => actions.setSynthParam('resonance', v)} />
        <Knob label="ATTACK" value={synth.attack} min={0.001} max={0.5} format={(v) => `${Math.round(v * 1000)}ms`} onChange={(v) => actions.setSynthParam('attack', v)} />
        <Knob label="DECAY" value={synth.decay} min={0.01} max={1} format={(v) => `${Math.round(v * 1000)}ms`} onChange={(v) => actions.setSynthParam('decay', v)} />
        <Knob label="SUSTAIN" value={synth.sustain} min={0} max={1} format={(v) => `${Math.round(v * 100)}`} onChange={(v) => actions.setSynthParam('sustain', v)} />
        <Knob label="RELEASE" value={synth.release} min={0.01} max={1.5} format={(v) => `${Math.round(v * 1000)}ms`} onChange={(v) => actions.setSynthParam('release', v)} />
      </div>
    </section>
  )
}
