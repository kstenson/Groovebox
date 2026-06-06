import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { DrumKit } from '../audio/DrumKit'
import type { DrumVoiceId } from '../audio/types'
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

export function DrumPadsPage() {
  const kitRef = useRef<DrumKit | null>(null)
  if (kitRef.current === null) kitRef.current = new DrumKit()
  const kit = kitRef.current

  const [flash, setFlash] = useState<Set<DrumVoiceId>>(() => new Set())
  const flashTimers = useRef<Map<DrumVoiceId, number>>(new Map())

  const hit = useCallback(
    (id: DrumVoiceId) => {
      kit.play(id)
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
            <span>A S D F G</span>
          </div>
        </div>

        <div className="pads">
          {PADS.map((pad) => (
            <button
              key={pad.id}
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
          ))}
        </div>

        <p className="hint">
          Tap the pads or hit the A–S–D–F–G keys. Same synthesized voices as the Groovebox, with a
          touch of room reverb.
        </p>
      </div>
    </div>
  )
}
