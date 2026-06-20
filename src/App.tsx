import Header from './components/Header'
import PageThumbnails from './components/PageThumbnails'
import DialogueList from './components/DialogueList'
import LetteringCanvas from './components/LetteringCanvas'
import StylePanel from './components/StylePanel'
import './App.css'

export default function App() {
  return (
    <div className="app">
      <Header />
      <div className="main-content">
        <PageThumbnails />
        <aside className="left-panel">
          <DialogueList />
        </aside>
        <main className="center-panel">
          <LetteringCanvas />
        </main>
        <aside className="right-panel">
          <StylePanel />
        </aside>
      </div>
    </div>
  )
}
