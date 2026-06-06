import { navigate } from '../hooks/useHashRoute'

interface NavItem {
  path: string
  label: string
}

const NAV: NavItem[] = [
  { path: '/', label: 'Home' },
  { path: '/groovebox', label: 'Groovebox' },
  { path: '/op-1', label: 'Cluster Synth' },
  { path: '/fm', label: 'FM Synth' },
  { path: '/pads', label: 'Drum Pads' },
]

export function NavBar({ current }: { current: string }) {
  return (
    <nav className="navbar">
      <button className="nav-brand" onClick={() => navigate('/')}>
        <span className="brand-dot" />
        STUDIO
      </button>
      <div className="nav-links">
        {NAV.filter((n) => n.path !== '/').map((n) => (
          <button
            key={n.path}
            className={`nav-link ${current === n.path ? 'active' : ''}`}
            onClick={() => navigate(n.path)}
          >
            {n.label}
          </button>
        ))}
      </div>
    </nav>
  )
}
