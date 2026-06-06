import { useHashRoute } from './hooks/useHashRoute'
import { NavBar } from './components/NavBar'
import { HomePage } from './pages/HomePage'
import { GrooveboxPage } from './pages/GrooveboxPage'
import { SynthPage } from './pages/SynthPage'
import { FMSynthPage } from './pages/FMSynthPage'
import { DrumPadsPage } from './pages/DrumPadsPage'
import { ModularPage } from './pages/ModularPage'

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
    case '/fm':
      page = <FMSynthPage key="fm" />
      break
    case '/pads':
      page = <DrumPadsPage key="pads" />
      break
    case '/modular':
      page = <ModularPage key="modular" />
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
