import type { GrooveboxState } from '../audio/types'
import { STEPS } from '../audio/types'
import type { GrooveboxActions } from '../state/useGroovebox'

interface Props {
  state: GrooveboxState
  actions: GrooveboxActions
}

export function DrumSequencer({ state, actions }: Props) {
  return (
    <section className="panel drum-panel">
      <div className="panel-head">
        <h2>Drums</h2>
        <button className="ghost-btn" onClick={actions.clearDrums}>
          Clear
        </button>
      </div>

      <div className="drum-grid">
        {state.drums.map((track) => (
          <div className="drum-row" key={track.id}>
            <button
              className="track-name"
              onClick={() => actions.previewDrum(track.id)}
              title="Click to audition"
            >
              {track.name}
            </button>
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
