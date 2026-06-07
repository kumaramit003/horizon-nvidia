import React, { useEffect, useRef, useState } from 'react'
import { ChevronDown, Plus, Check, Loader2, Trash2 } from 'lucide-react'
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
  onDelete,
}) {
  const [open, setOpen] = useState(false)
  const [workspaces, setWorkspaces] = useState([])
  const [loading, setLoading] = useState(false)
  const [confirmId, setConfirmId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const ref = useRef(null)

  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
        setConfirmId(null)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

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
  useEffect(() => { refresh() }, [currentId])

  const handleDelete = async (id) => {
    if (!onDelete) return
    setDeletingId(id)
    try {
      await onDelete(id)
      setWorkspaces(ws => ws.filter(w => w.id !== id))
      setConfirmId(null)
    } catch (e) {
      console.warn('Failed to delete workspace', e)
    } finally {
      setDeletingId(null)
    }
  }

  const current = workspaces.find(w => w.id === currentId)
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
        <div className="mt-3 flex min-w-0 flex-col items-start gap-1.5">
          {activeAgent === 'flora' ? (
            <AgentBadge who="flora" status="discovering" compact />
          ) : activeAgent === 'finn' ? (
            <AgentBadge who="finn" status="researching" compact />
          ) : (
            <>
              <AgentBadge who="flora" status="ready" compact />
              <AgentBadge who="finn" status="ready" compact />
            </>
          )}
        </div>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-black/[0.06] bg-white shadow-lift">
          <button
            onClick={() => { setOpen(false); setConfirmId(null); onNew?.() }}
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
            const confirming = confirmId === w.id
            const deleting = deletingId === w.id
            return (
              <div
                key={w.id}
                className={`flex items-center gap-1 px-2 py-1 ${isCurrent ? 'bg-cream-50' : ''}`}
              >
                {confirming ? (
                  <div className="flex flex-1 items-center justify-between gap-2 px-2 py-1.5">
                    <span className="text-[12px] text-ink-600">Delete this workspace?</span>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => handleDelete(w.id)}
                        disabled={deleting}
                        className="rounded-lg bg-red-500 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-red-600 disabled:opacity-50"
                      >
                        {deleting ? '…' : 'Delete'}
                      </button>
                      <button
                        onClick={() => setConfirmId(null)}
                        disabled={deleting}
                        className="rounded-lg px-2 py-1 text-[11px] text-ink-500 hover:bg-cream-100"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => { setOpen(false); setConfirmId(null); if (!isCurrent) onSwitch?.(w.id) }}
                      className={`flex min-w-0 flex-1 items-start gap-2 rounded-xl px-2 py-2 text-left text-[13px] transition-colors hover:bg-cream-50`}
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
                    <button
                      onClick={() => setConfirmId(w.id)}
                      title="Delete workspace"
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-300 transition-colors hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 size={13} />
                    </button>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
