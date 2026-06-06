import type { CSSProperties } from 'react'
import { navigate } from '../hooks/useHashRoute'

interface Instrument {
  path: string
  name: string
  tagline: string
  accent: string
  glyph: string
}

const INSTRUMENTS: Instrument[] = [
  {
    path: '/groovebox',
    name: 'Groovebox',
    tagline: 'Drum machine · synth sequencer · mixer & FX',
    accent: '#36d1c4',
    glyph: '▦',
  },
  {
    path: '/op-1',
    name: 'Cluster Synth',
    tagline: 'OP-1 inspired playable poly-synth · four colour macros',
    accent: '#ff7a3d',
    glyph: '◍',
  },
  {
    path: '/fm',
    name: 'FM Synth',
    tagline: '2-operator FM · bells, electric pianos & mallets',
    accent: '#ff5d9e',
    glyph: '✺',
  },
  {
    path: '/pads',
    name: 'Drum Pads',
    tagline: 'MPC-style pads · play the kit by hand',
    accent: '#ffd23d',
    glyph: '⊞',
  },
  {
    path: '/modular',
    name: 'Modular',
    tagline: 'Patchable Eurorack-style rack · drag virtual cables',
    accent: '#9b6cff',
    glyph: '⧉',
  },
]

export function HomePage() {
  return (
    <div className="home">
      <div className="home-hero">
        <h1>STUDIO</h1>
        <p>A pocket studio in your browser. Pick an instrument — everything runs locally.</p>
      </div>
      <div className="instrument-grid">
        {INSTRUMENTS.map((inst) => (
          <button
            key={inst.path}
            className="instrument-card"
            style={{ '--card-accent': inst.accent } as CSSProperties}
            onClick={() => navigate(inst.path)}
          >
            <span className="card-glyph">{inst.glyph}</span>
            <span className="card-name">{inst.name}</span>
            <span className="card-tag">{inst.tagline}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
