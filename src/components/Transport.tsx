import type { GrooveboxState } from '../audio/types'
import type { GrooveboxActions } from '../state/useGroovebox'
import { Knob } from './Knob'

interface Props {
  state: GrooveboxState
  actions: GrooveboxActions
}

export function Transport({ state, actions }: Props) {
  return (
    <header className="transport">
      <div className="brand">
        <span className="brand-dot" />
        <h1>GROOVEBOX</h1>
      </div>

      <button
        className={`play-btn ${state.playing ? 'playing' : ''}`}
        onClick={actions.togglePlay}
        aria-label={state.playing ? 'Stop' : 'Play'}
      >
        {state.playing ? '■ Stop' : '► Play'}
      </button>

      <div className="bpm">
        <label htmlFor="bpm">TEMPO</label>
        <input
          id="bpm"
          type="range"
          min={60}
          max={180}
          value={state.bpm}
          onChange={(e) => actions.setBpm(Number(e.target.value))}
        />
        <span className="bpm-value">{state.bpm} BPM</span>
      </div>

      <Knob
        label="SWING"
        value={state.swing}
        min={0}
        max={0.6}
        format={(v) => `${Math.round((v / 0.6) * 100)}%`}
        onChange={actions.setSwing}
      />

      <Knob
        label="MASTER"
        value={state.masterVolume}
        min={0}
        max={1}
        format={(v) => `${Math.round(v * 100)}`}
        onChange={actions.setMasterVolume}
      />
    </header>
  )
}
