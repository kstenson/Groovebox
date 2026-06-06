import { useGroovebox } from '../state/useGroovebox'
import { Transport } from '../components/Transport'
import { DrumSequencer } from '../components/DrumSequencer'
import { SynthSequencer } from '../components/SynthSequencer'
import { Mixer } from '../components/Mixer'

export function GrooveboxPage() {
  const { state, actions } = useGroovebox()

  return (
    <>
      <Transport state={state} actions={actions} />
      <main className="workspace">
        <div className="sequencers">
          <DrumSequencer state={state} actions={actions} />
          <SynthSequencer state={state} actions={actions} />
        </div>
        <Mixer state={state} actions={actions} />
      </main>
      <footer className="hint">
        Click steps to build a pattern · drag knobs vertically (hold Shift for fine) · click a
        track name or note to audition · everything runs in your browser, nothing is sent anywhere.
      </footer>
    </>
  )
}
