import type { GrooveboxState, MixerSettings } from '../audio/types'
import type { GrooveboxActions } from '../state/useGroovebox'
import { Knob } from './Knob'

interface Props {
  state: GrooveboxState
  actions: GrooveboxActions
}

interface StripProps {
  name: string
  mixer: MixerSettings
  onChange: (patch: Partial<MixerSettings>) => void
}

function ChannelStrip({ name, mixer, onChange }: StripProps) {
  return (
    <div className={`strip ${mixer.mute ? 'muted' : ''}`}>
      <span className="strip-name">{name}</span>
      <input
        className="fader"
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={mixer.volume}
        onChange={(e) => onChange({ volume: Number(e.target.value) })}
        aria-label={`${name} volume`}
      />
      <Knob label="PAN" value={mixer.pan} min={-1} max={1} format={(v) => (Math.abs(v) < 0.05 ? 'C' : v < 0 ? `L${Math.round(-v * 100)}` : `R${Math.round(v * 100)}`)} onChange={(v) => onChange({ pan: v })} size={36} />
      <Knob label="DLY" value={mixer.delaySend} min={0} max={1} format={(v) => `${Math.round(v * 100)}`} onChange={(v) => onChange({ delaySend: v })} size={36} />
      <Knob label="REV" value={mixer.reverbSend} min={0} max={1} format={(v) => `${Math.round(v * 100)}`} onChange={(v) => onChange({ reverbSend: v })} size={36} />
      <button
        className={`mute-btn ${mixer.mute ? 'active' : ''}`}
        onClick={() => onChange({ mute: !mixer.mute })}
      >
        {mixer.mute ? 'MUTED' : 'MUTE'}
      </button>
    </div>
  )
}

export function Mixer({ state, actions }: Props) {
  return (
    <section className="panel mixer-panel">
      <div className="panel-head">
        <h2>Mixer &amp; FX</h2>
      </div>

      <div className="mixer-body">
        <div className="strips">
          {state.drums.map((d) => (
            <ChannelStrip
              key={d.id}
              name={d.name}
              mixer={d.mixer}
              onChange={(patch) => actions.setDrumMixer(d.id, patch)}
            />
          ))}
          <ChannelStrip name="Synth" mixer={state.synth.mixer} onChange={actions.setSynthMixer} />
        </div>

        <div className="fx-rack">
          <h3>Delay</h3>
          <div className="fx-knobs">
            <Knob label="TIME" value={state.effects.delayTime} min={0.05} max={0.8} format={(v) => `${Math.round(v * 1000)}ms`} onChange={(v) => actions.setEffect({ delayTime: v })} />
            <Knob label="FDBK" value={state.effects.delayFeedback} min={0} max={0.9} format={(v) => `${Math.round(v * 100)}`} onChange={(v) => actions.setEffect({ delayFeedback: v })} />
          </div>
          <h3>Reverb</h3>
          <div className="fx-knobs">
            <Knob label="MIX" value={state.effects.reverbMix} min={0} max={1} format={(v) => `${Math.round(v * 100)}`} onChange={(v) => actions.setEffect({ reverbMix: v })} />
          </div>
        </div>
      </div>
    </section>
  )
}
