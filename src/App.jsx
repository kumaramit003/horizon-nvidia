import React, { useEffect, useState } from 'react'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import VoiceAssistant, { VoiceFab } from './components/VoiceAssistant'

import Intake from './pages/Intake'
import IdeaProfile from './pages/IdeaProfile'
import TargetAudience from './pages/TargetAudience'
import MarketValidation from './pages/MarketValidation'
import Locations from './pages/Locations'
import Financials from './pages/Financials'
import ActionPlan from './pages/ActionPlan'
import AgentWorkspace from './pages/AgentWorkspace'

const pages = {
  idea: IdeaProfile,
  audience: TargetAudience,
  validation: MarketValidation,
  locations: Locations,
  financials: Financials,
  plan: ActionPlan,
  agents: AgentWorkspace,
}

export default function App() {
  const [stage, setStage] = useState('intake') // intake | dashboard
  const [page, setPage] = useState('idea')
  const [voiceOpen, setVoiceOpen] = useState(false)
  const [recentVoice, setRecentVoice] = useState(null)

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'v') {
        e.preventDefault()
        setVoiceOpen(v => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (stage === 'intake') {
    return <Intake onComplete={() => setStage('dashboard')} />
  }

  const PageComponent = pages[page]

  return (
    <div className="relative flex min-h-screen w-full bg-cream-100 text-ink-900">
      <Sidebar active={page} onChange={setPage} onBackToIntake={() => setStage('intake')} />

      <main className="flex min-w-0 flex-1 flex-col">
        <TopBar page={page} recentVoice={recentVoice} />
        <div className="flex-1 overflow-y-auto px-9 py-8">
          <PageComponent />
          <div className="h-24" />
        </div>
      </main>

      <VoiceFab onClick={() => setVoiceOpen(true)} />
      <VoiceAssistant
        open={voiceOpen}
        onClose={() => setVoiceOpen(false)}
        onAppliedUpdate={(t) => setRecentVoice(t)}
      />
    </div>
  )
}
