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
import { api } from './lib/api'
import AuthGate from './components/AuthGate'

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
  return (
    <AuthGate>
      {({ user, onSignOut }) => <AuthedApp user={user} onSignOut={onSignOut} />}
    </AuthGate>
  )
}

function AuthedApp({ user, onSignOut }) {
  const [stage, setStage] = useState('intake') // intake | dashboard
  const [page, setPage] = useState('idea')
  const [voiceOpen, setVoiceOpen] = useState(false)
  const [recentVoice, setRecentVoice] = useState(null)

  const [discoveryId, setDiscoveryId] = useState(null)
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(false)

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

  // Restore existing session on mount
  useEffect(() => {
    const saved = sessionStorage.getItem('discoveryId')
    if (saved) {
      setDiscoveryId(saved)
      setLoading(true)
      api.getDashboard(saved)
        .then(data => {
          setDashboard(data)
          setStage('dashboard')
        })
        .catch(() => {
          sessionStorage.removeItem('discoveryId')
          setDiscoveryId(null)
          setDashboard(null)
          setStage('intake')
        })
        .finally(() => setLoading(false))
    }
  }, [])

  const handleIntakeComplete = async (conversation) => {
    const workspaceName = conversation
      .filter(t => t.speaker !== 'flora')
      .map(t => t.text)
      .join(' ')
      .slice(0, 80)

    const { id } = await api.createDiscovery({
      workspace_name: workspaceName || 'New Discovery',
      intake: { conversation },
    })

    setDiscoveryId(id)
    sessionStorage.setItem('discoveryId', id)

    const data = await api.getDashboard(id)
    setDashboard(data)
    setStage('dashboard')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mesh">
        <div className="text-center">
          <div className="inline-flex h-12 w-12 animate-breathe items-center justify-center rounded-full gradient-orb-finn">
            <span className="text-white text-lg">F</span>
          </div>
          <p className="mt-4 text-sm text-ink-500">Loading your workspace...</p>
        </div>
      </div>
    )
  }

  if (stage === 'intake') {
    return <Intake onComplete={handleIntakeComplete} />
  }

  const PageComponent = pages[page]

  return (
    <div className="relative flex min-h-screen w-full bg-cream-100 text-ink-900">
      <Sidebar
        active={page}
        onChange={setPage}
        discoveryId={discoveryId}
        onSwitchWorkspace={async (newId) => {
          setLoading(true)
          try {
            const data = await api.getDashboard(newId)
            setDiscoveryId(newId)
            sessionStorage.setItem('discoveryId', newId)
            setDashboard(data)
            setPage('idea')
          } catch (e) {
            console.warn('Failed to switch workspace', e)
          } finally {
            setLoading(false)
          }
        }}
        onBackToIntake={() => {
          sessionStorage.removeItem('discoveryId')
          setDiscoveryId(null)
          setDashboard(null)
          setStage('intake')
        }}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <TopBar page={page} recentVoice={recentVoice} user={user} onSignOut={onSignOut} />
        <div className="flex-1 overflow-y-auto px-9 py-8">
          <PageComponent dashboard={dashboard} discoveryId={discoveryId} />
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
