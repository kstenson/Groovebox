import type { GrooveboxState } from '../audio/types'
import { STEPS } from '../audio/types'
import type { GrooveboxActions } from '../state/useGroovebox'
import { DRUM_CATALOG, DRUM_CATEGORIES, KITS, SYNTH_OPTION } from '../audio/drumSamples'

interface Props {
  state: GrooveboxState
  actions: GrooveboxActions
}

export function DrumSequencer({ state, actions }: Props) {
  return (
    <section className="panel drum-panel">
      <div className="panel-head">
        <h2>Drums</h2>
        <div className="drum-head-actions">
          <select
            className="kit-select"
            value=""
            onChange={(e) => {
              if (e.target.value) actions.setKit(e.target.value)
            }}
            aria-label="Load drum kit"
          >
            <option value="" disabled>
              Load kit…
            </option>
            {KITS.map((k) => (
              <option key={k.name} value={k.name}>
                {k.name} kit
              </option>
            ))}
          </select>
          <button className="ghost-btn" onClick={actions.clearDrums}>
            Clear
          </button>
        </div>
      </div>

      <div className="drum-grid">
        {state.drums.map((track) => (
          <div className="drum-row" key={track.id}>
            <div className="track-head">
              <button
                className="track-name"
                onClick={() => actions.previewDrum(track.id)}
                title="Click to audition"
              >
                {track.name}
              </button>
              <select
                className="track-sound"
                value={track.sound}
                onChange={(e) => actions.setDrumSound(track.id, e.target.value)}
                aria-label={`${track.name} sound`}
              >
                <option value={SYNTH_OPTION}>Synth</option>
                {DRUM_CATEGORIES.map((cat) => (
                  <optgroup key={cat} label={cat}>
                    {DRUM_CATALOG.filter((s) => s.category === cat).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="steps">
              {track.steps.map((on, i) => (
                <button
                  key={i}
                  className={[
                    'step',
                    on ? 'on' : '',
                    state.currentStep === i ? 'playhead' : '',
                    i % 4 === 0 ? 'beat' : '',
                  ].join(' ')}
                  onClick={() => actions.toggleDrumStep(track.id, i)}
                  aria-label={`${track.name} step ${i + 1}`}
                  aria-pressed={on}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Step ruler */}
        <div className="drum-row ruler">
          <span className="track-name" />
          <div className="steps">
            {Array.from({ length: STEPS }, (_, i) => (
              <span key={i} className={`tick ${state.currentStep === i ? 'on' : ''}`}>
                {i % 4 === 0 ? i / 4 + 1 : ''}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
