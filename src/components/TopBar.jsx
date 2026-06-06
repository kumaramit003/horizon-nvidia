import React from 'react'
import { Activity, Download, Presentation, Search, ChevronRight, Sparkles, Share2, LogOut } from 'lucide-react'
import { AgentBadge } from './Brand'

const pageMeta = {
  idea:       { eyebrow: 'The idea',          title: "What you're really building",       agent: 'flora' },
  audience:   { eyebrow: 'Your audience',     title: "Who's going to buy this",            agent: 'finn' },
  validation: { eyebrow: 'Worth doing?',      title: 'Is this idea worth the risk',        agent: 'finn' },
  locations:  { eyebrow: 'Locations',         title: 'Where in London should you start',   agent: 'finn' },
  financials: { eyebrow: 'Money & grants',    title: 'What it costs, what you can claim',  agent: 'finn' },
  plan:       { eyebrow: 'Your next 7 days',  title: "Let's actually get going",           agent: 'finn' },
  agents:     { eyebrow: 'Flora & Finn',      title: 'How your two advisors figured this out', agent: 'both' },
}

export default function TopBar({ page, recentVoice, user, onSignOut, workspaceName }) {
  const meta = pageMeta[page]
  return (
    <header className="sticky top-0 z-20 border-b border-black/[0.06] bg-cream-100/85 px-9 pt-5 pb-6 backdrop-blur-xl">
      {/* Row 1: breadcrumb (left) + actions (right) */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-0 items-center gap-2 text-[12.5px] text-ink-500">
          <span>Plan</span>
          <ChevronRight size={13} className="text-ink-300" />
          <span className="truncate text-forest-500">{workspaceName || 'Workspace'}</span>
          <ChevronRight size={13} className="text-ink-300" />
          <span className="text-ink-700">{meta.eyebrow}</span>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="hidden xl:flex items-center gap-2 rounded-full border border-black/[0.06] bg-white px-3.5 py-1.5 text-[12px] text-ink-500">
            <Search size={13} />
            <span>Ask Flora or Finn · ⌘K</span>
          </div>
          <button className="btn-ghost text-[12.5px]"><Share2 size={13} /> Share</button>
          <button className="btn-ghost text-[12.5px]"><Download size={13} /> Export</button>
          <button className="btn-forest text-[12.5px]"><Presentation size={13} /> Pitch deck</button>
          {user && (
            <div className="ml-1 flex items-center gap-2 rounded-full border border-black/[0.06] bg-white py-1 pl-1 pr-2 text-[12px] text-forest-500">
              {user.picture ? (
                <img src={user.picture} alt="" className="h-7 w-7 rounded-full" referrerPolicy="no-referrer" />
              ) : (
                <span className="grid h-7 w-7 place-items-center rounded-full bg-sage-100 text-[11px] font-semibold">
                  {(user.name || user.email || '?').slice(0, 1).toUpperCase()}
                </span>
              )}
              <span className="hidden max-w-[140px] truncate xl:inline">{user.name || user.email}</span>
              <button
                onClick={onSignOut}
                className="grid h-7 w-7 place-items-center rounded-full text-ink-500 hover:bg-cream-100 hover:text-forest-500"
                title="Sign out"
              >
                <LogOut size={13} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Row 2: page title (left) + status pills + voice update (right) */}
      <div className="mt-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1">
          <div className="section-eyebrow mb-1.5">{meta.eyebrow}</div>
          <h1 className="display text-[34px] leading-[1.05] tracking-tight text-forest-500">
            {meta.title}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {meta.agent === 'both' ? (
            <>
              <AgentBadge who="flora" status="ready" />
              <AgentBadge who="finn"  status="ready" />
            </>
          ) : (
            <AgentBadge who={meta.agent} status="auto" />
          )}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.06] bg-cream-50 px-2.5 py-1 text-[11px] font-medium text-ink-700">
            <Activity size={11} className="text-sage-500" /> 78% clarity
          </span>
          {recentVoice && (
            <div className="flex max-w-[360px] items-center gap-2 rounded-full border border-sage-200 bg-sage-50 px-3 py-1.5 text-[11.5px] text-forest-500">
              <Sparkles size={11} className="shrink-0 text-sage-500" />
              <span className="truncate">Updated: "{recentVoice}"</span>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
