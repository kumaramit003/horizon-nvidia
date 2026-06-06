import React, { useEffect, useRef, useState } from 'react'
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
  const [voicePrefill, setVoicePrefill] = useState('')
  const [recentVoice, setRecentVoice] = useState(null)

  const [discoveryId, setDiscoveryId] = useState(null)
  const [dashboard, setDashboard] = useState(null)
  const [sections, setSections] = useState({}) // per-section status map
  const [wsStatus, setWsStatus] = useState(null) // overall workspace status
  const [loading, setLoading] = useState(false)
  const pollStopRef = useRef(null)

  // Stop any in-flight poller (on switch / unmount / new workspace).
  const stopPolling = () => {
    if (pollStopRef.current) { pollStopRef.current(); pollStopRef.current = null }
  }

  // Open a workspace into the dashboard, then keep polling while sections
  // are still streaming in from Finn.
  const openWorkspace = (doc) => {
    setDiscoveryId(doc.id)
    sessionStorage.setItem('discoveryId', doc.id)
    setDashboard(doc.dashboard || {})
    setSections(doc.sections || {})
    setWsStatus(doc.status)
    setStage('dashboard')
    stopPolling()
    if (doc.status !== 'dashboard_ready' && doc.status !== 'error') {
      pollStopRef.current = api.pollDiscovery(doc.id, (d) => {
        setDashboard(d.dashboard || {})
        setSections(d.sections || {})
        setWsStatus(d.status)
      })
    }
  }

  useEffect(() => () => stopPolling(), [])

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'v') {
        e.preventDefault()
        setVoicePrefill('')
        setVoiceOpen(v => !v)
      }
    }
    window.addEventListener('keydown', onKey)

    // Global event so any dashboard page (and the VoiceCommandBlock chips)
    // can open the modal with a pre-filled command without prop drilling.
    const onPrefill = (e) => {
      const cmd = (e.detail || '').toString()
      setVoicePrefill(cmd)
      setVoiceOpen(true)
    }
    window.addEventListener('voice-prefill', onPrefill)

    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('voice-prefill', onPrefill)
    }
  }, [])

  // Restore existing session on mount
  useEffect(() => {
    const saved = sessionStorage.getItem('discoveryId')
    if (saved) {
      setLoading(true)
      api.getDiscovery(saved)
        .then(doc => { openWorkspace(doc) })
        .catch(() => {
          sessionStorage.removeItem('discoveryId')
          setDiscoveryId(null)
          setDashboard(null)
          setStage('intake')
        })
        .finally(() => setLoading(false))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

    // Intake keeps its "analysing" animation until Flora's idea profile is
    // ready, then we open the dashboard and Finn's sections stream in there.
    const doc = await api.waitUntilReady(id)
    openWorkspace(doc)
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

  const loadExistingWorkspace = async (id) => {
    setLoading(true)
    try {
      const doc = await api.getDiscovery(id)
      openWorkspace(doc)
    } catch (e) {
      console.warn('Failed to open workspace', e)
    } finally {
      setLoading(false)
    }
  }

  const rerunCurrent = async () => {
    if (!discoveryId) return
    try {
      await api.rerunDiscovery(discoveryId)
      // Immediately reflect the reset section statuses, then stream updates.
      const doc = await api.getDiscovery(discoveryId)
      openWorkspace(doc)
    } catch (e) {
      console.warn('Re-run failed', e)
      throw e
    }
  }

  if (stage === 'intake') {
    return <Intake onComplete={handleIntakeComplete} onOpenWorkspace={loadExistingWorkspace} />
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
            const doc = await api.getDiscovery(newId)
            setPage('idea')
            openWorkspace(doc)
          } catch (e) {
            console.warn('Failed to switch workspace', e)
          } finally {
            setLoading(false)
          }
        }}
        onBackToIntake={() => {
          stopPolling()
          sessionStorage.removeItem('discoveryId')
          setDiscoveryId(null)
          setDashboard(null)
          setSections({})
          setWsStatus(null)
          setStage('intake')
        }}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <TopBar
          page={page}
          recentVoice={recentVoice}
          user={user}
          onSignOut={onSignOut}
          workspaceName={dashboard?.idea?.title || ''}
        />
        <div className="flex-1 overflow-y-auto px-9 py-8">
          <PageComponent
            dashboard={dashboard}
            discoveryId={discoveryId}
            section={sections[page]}
            wsStatus={wsStatus}
            onRerun={rerunCurrent}
          />
          <div className="h-24" />
        </div>
      </main>

      <VoiceFab onClick={() => { setVoicePrefill(''); setVoiceOpen(true) }} />
      <VoiceAssistant
        open={voiceOpen}
        onClose={() => setVoiceOpen(false)}
        prefill={voicePrefill}
        discoveryId={discoveryId}
        onRefineComplete={async (command) => {
          setRecentVoice(command)
          // Refine reset section statuses server-side; re-open + stream.
          if (discoveryId) {
            try {
              const doc = await api.getDiscovery(discoveryId)
              openWorkspace(doc)
            } catch (e) {
              console.warn('Failed to refresh after refine', e)
            }
          }
        }}
      />
    </div>
  )
}
