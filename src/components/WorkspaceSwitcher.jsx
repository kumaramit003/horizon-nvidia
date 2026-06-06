import React, { useEffect, useRef, useState } from 'react'
import { ChevronDown, Plus, Check, Loader2 } from 'lucide-react'
import { AgentBadge } from './Brand'
import { api } from '../lib/api'

const statusLabel = {
  processing: 'Working…',
  dashboard_ready: 'Ready',
  error: 'Errored',
  intake_complete: 'Discovery done',
}

function shortName(w, max = 80) {
  const raw = (w?.workspace_name || 'Untitled workspace').replace(/\s+/g, ' ').trim()
  return raw.length > max ? raw.slice(0, max).trim() + '…' : raw
}

function timeAgo(iso) {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  const m = Math.round(ms / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.round(h / 24)}d ago`
}

export default function WorkspaceSwitcher({
  currentId,
  activeAgent,
  onSwitch,
  onNew,
}) {
  const [open, setOpen] = useState(false)
  const [workspaces, setWorkspaces] = useState([])
  const [loading, setLoading] = useState(false)
  const ref = useRef(null)

  // Close on outside click
  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  // Load list when opened
  const refresh = async () => {
    setLoading(true)
    try {
      const list = await api.listDiscoveries()
      setWorkspaces(Array.isArray(list) ? list : [])
    } catch (e) {
      console.warn('Failed to list workspaces', e)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    if (open) refresh()
  }, [open])
  useEffect(() => { refresh() }, [currentId]) // refresh when active workspace changes

  const current = workspaces.find(w => w.id === currentId)
  // Title in the small sidebar card is space-constrained — keep it tight.
  const title = current ? shortName(current, 34) : (currentId ? 'Loading…' : 'No workspace')

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full rounded-2xl bg-white p-4 text-left shadow-soft transition-colors hover:bg-cream-50"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-ink-500">Workspace</div>
            <div className="mt-1 display text-[16px] leading-tight text-forest-500 truncate">{title}</div>
          </div>
          <ChevronDown size={14} className={`mt-1 shrink-0 text-ink-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
        <div className="mt-3 flex items-center gap-2">
          {activeAgent === 'flora' ? (
            <AgentBadge who="flora" status="discovering" />
          ) : activeAgent === 'finn' ? (
            <AgentBadge who="finn" status="researching" />
          ) : (
            <>
              <AgentBadge who="flora" status="ready" />
              <AgentBadge who="finn" status="ready" />
            </>
          )}
        </div>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-black/[0.06] bg-white shadow-lift">
          <button
            onClick={() => { setOpen(false); onNew?.() }}
            className="flex w-full items-center gap-2 border-b border-black/[0.05] px-4 py-3 text-left text-[13px] font-medium text-forest-500 hover:bg-cream-50"
          >
            <span className="grid h-7 w-7 place-items-center rounded-full bg-sage-100 text-sage-600">
              <Plus size={14} />
            </span>
            New workspace
          </button>

          {loading && (
            <div className="flex items-center justify-center gap-2 py-4 text-[12px] text-ink-500">
              <Loader2 size={12} className="animate-spin" /> Loading…
            </div>
          )}

          {!loading && workspaces.length === 0 && (
            <div className="px-4 py-4 text-[12.5px] text-ink-500">
              No saved workspaces yet.
            </div>
          )}

          {workspaces.map(w => {
            const isCurrent = w.id === currentId
            return (
              <button
                key={w.id}
                onClick={() => { setOpen(false); if (!isCurrent) onSwitch?.(w.id) }}
                className={`flex w-full items-start gap-2 px-4 py-2.5 text-left text-[13px] transition-colors
                  ${isCurrent ? 'bg-cream-50' : 'hover:bg-cream-50'}`}
              >
                <div className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center">
                  {isCurrent
                    ? <Check size={13} className="text-sage-500" />
                    : <span className="h-1.5 w-1.5 rounded-full bg-ink-200" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`truncate ${isCurrent ? 'font-medium text-forest-500' : 'text-ink-700'}`}>
                    {shortName(w)}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-ink-400">
                    <span>{statusLabel[w.status] || w.status}</span>
                    <span>·</span>
                    <span>{timeAgo(w.created_at)}</span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
