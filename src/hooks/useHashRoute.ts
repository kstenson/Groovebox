import { useEffect, useState } from 'react'

/**
 * Minimal hash-based router. Hash routing is used (instead of history/pushState)
 * so the app works on static hosts like GitHub Pages without server rewrites —
 * deep links and refreshes never 404.
 *
 * Returns the current path (e.g. "/", "/groovebox", "/op-1").
 */
export function useHashRoute(): string {
  const [path, setPath] = useState(() => parseHash())

  useEffect(() => {
    const onChange = () => setPath(parseHash())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  return path
}

function parseHash(): string {
  const raw = window.location.hash.replace(/^#/, '')
  if (!raw || raw === '/') return '/'
  return raw.startsWith('/') ? raw : `/${raw}`
}

/** Navigate to a route. */
export function navigate(path: string) {
  window.location.hash = path
}
