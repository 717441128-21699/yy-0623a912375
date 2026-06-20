import { useState } from 'react'
import Header from './components/Header'
import PageThumbnails from './components/PageThumbnails'
import DialogueList from './components/DialogueList'
import LetteringCanvas from './components/LetteringCanvas'
import StylePanel from './components/StylePanel'
import ProgressPanel from './components/ProgressPanel'
import './App.css'

export default function App() {
  const [showProgress, setShowProgress] = useState(false)

  return (
    <div className="app">
      <Header onOpenProgress={() => setShowProgress(true)} />
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
      {showProgress && <ProgressPanel onClose={() => setShowProgress(false)} />}
    </div>
  )
}
