import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { DrumKit } from '../audio/DrumKit'
import type { DrumVoiceId } from '../audio/types'
import {
  DEFAULT_ASSIGNMENTS,
  DRUM_CATALOG,
  DRUM_CATEGORIES,
  KITS,
  SYNTH_OPTION,
  kitByName,
  soundById,
} from '../audio/drumSamples'
import { Scope } from '../components/Scope'

interface Pad {
  id: DrumVoiceId
  name: string
  key: string
  color: string
}

const PADS: Pad[] = [
  { id: 'kick', name: 'Kick', key: 'a', color: '#ff7a3d' },
  { id: 'snare', name: 'Snare', key: 's', color: '#ff5d9e' },
  { id: 'clap', name: 'Clap', key: 'd', color: '#ffd23d' },
  { id: 'closedHat', name: 'CH', key: 'f', color: '#36d1c4' },
  { id: 'openHat', name: 'OH', key: 'g', color: '#4cd07d' },
]

type Status = 'loading' | 'ready'

export function DrumPadsPage() {
  const kitRef = useRef<DrumKit | null>(null)
  if (kitRef.current === null) kitRef.current = new DrumKit()
  const kit = kitRef.current

  const [flash, setFlash] = useState<Set<DrumVoiceId>>(() => new Set())
  const flashTimers = useRef<Map<DrumVoiceId, number>>(new Map())
  const [assignments, setAssignments] = useState<Record<DrumVoiceId, string>>(DEFAULT_ASSIGNMENTS)
  const [status, setStatus] = useState<Status>('loading')

  // Keep a ref so the keydown/hit handlers always see current assignments.
  const assignRef = useRef(assignments)
  assignRef.current = assignments

  // Preload the default sounds on mount.
  useEffect(() => {
    let cancelled = false
    const urls = Object.values(DEFAULT_ASSIGNMENTS)
      .map((id) => soundById(id)?.url)
      .filter((u): u is string => !!u)
    Promise.all(urls.map((u) => kit.loadSample(u))).then(() => {
      if (!cancelled) setStatus('ready')
    })
    return () => {
      cancelled = true
    }
  }, [kit])

  const hit = useCallback(
    (id: DrumVoiceId) => {
      const assignment = assignRef.current[id]
      const sound = assignment === SYNTH_OPTION ? undefined : soundById(assignment)
      // Use the sample if it's decoded; otherwise fall back to the synth voice.
      if (!sound || !kit.playUrl(sound.url)) kit.playSynth(id)

      setFlash((prev) => new Set(prev).add(id))
      const timers = flashTimers.current
      if (timers.has(id)) window.clearTimeout(timers.get(id))
      timers.set(
        id,
        window.setTimeout(() => {
          setFlash((prev) => {
            const next = new Set(prev)
            next.delete(id)
            return next
          })
        }, 120),
      )
    },
    [kit],
  )

  const assignSound = useCallback(
    (padId: DrumVoiceId, soundId: string) => {
      setAssignments((a) => ({ ...a, [padId]: soundId }))
      const sound = soundById(soundId)
      if (sound) void kit.loadSample(sound.url) // warm the cache
    },
    [kit],
  )

  const applyKit = useCallback(
    (name: string) => {
      const k = kitByName(name)
      if (!k) return
      setAssignments((a) => ({ ...a, ...k.sounds }))
      for (const id of Object.values(k.sounds)) {
        const s = soundById(id)
        if (s) void kit.loadSample(s.url)
      }
    },
    [kit],
  )

  // Computer-key triggers.
  useEffect(() => {
    const byKey = new Map(PADS.map((p) => [p.key, p.id]))
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey) return
      const id = byKey.get(e.key.toLowerCase())
      if (id) hit(id)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [hit])

  useEffect(() => {
    const timers = flashTimers.current
    return () => {
      for (const t of timers.values()) window.clearTimeout(t)
      kit.dispose()
    }
  }, [kit])

  const getAnalyser = useCallback(() => kit.peekAnalyser(), [kit])

  return (
    <div className="op1">
      <div className="op1-body pads-body">
        <div className="op1-screen">
          <Scope getAnalyser={getAnalyser} colors={['#ff7a3d', '#ffd23d', '#36d1c4']} />
          <div className="op1-screen-label">
            <span>DRUM PADS</span>
            <span>{status === 'loading' ? 'LOADING…' : 'CLASSIC KIT'}</span>
          </div>
        </div>

        <div className="op1-octave">
          <span>Kit</span>
          <select
            className="kit-select"
            value=""
            onChange={(e) => {
              if (e.target.value) applyKit(e.target.value)
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
        </div>

        <div className="pads">
          {PADS.map((pad) => (
            <div className="pad-cell" key={pad.id}>
              <button
                className={`pad ${flash.has(pad.id) ? 'hit' : ''}`}
                style={{ '--pad-color': pad.color } as CSSProperties}
                onPointerDown={(e) => {
                  e.preventDefault()
                  hit(pad.id)
                }}
              >
                <span className="pad-key">{pad.key.toUpperCase()}</span>
                <span className="pad-name">{pad.name}</span>
              </button>
              <select
                className="pad-select"
                value={assignments[pad.id]}
                onChange={(e) => assignSound(pad.id, e.target.value)}
                aria-label={`${pad.name} sound`}
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
          ))}
        </div>

        <p className="hint">
          Tap the pads or hit the A–S–D–F–G keys. Pick a classic drum sound for each pad from the
          dropdown (808 / 909 / Dirt one-shots, loaded from the web) — choose <strong>Synth</strong>{' '}
          for the built-in synthesized voice. Pads fall back to synth if a sample can't be fetched.
        </p>
      </div>
    </div>
  )
}
