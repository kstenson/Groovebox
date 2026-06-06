import { useHashRoute } from './hooks/useHashRoute'
import { NavBar } from './components/NavBar'
import { HomePage } from './pages/HomePage'
import { GrooveboxPage } from './pages/GrooveboxPage'
import { SynthPage } from './pages/SynthPage'

export default function App() {
  const route = useHashRoute()

  // Keying pages by route ensures each instrument fully mounts/unmounts when
  // navigating, so its AudioContext is created on entry and torn down on exit.
  let page
  switch (route) {
    case '/groovebox':
      page = <GrooveboxPage key="groovebox" />
      break
    case '/op-1':
      page = <SynthPage key="op-1" />
      break
    default:
      page = <HomePage key="home" />
  }

  return (
    <div className="app">
      <NavBar current={route} />
      {page}
    </div>
  )
}
