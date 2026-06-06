import React from 'react'
import { Activity, Download, Presentation, Search, ChevronRight, Sparkles, Share2 } from 'lucide-react'
import { AgentBadge, Tagline } from './Brand'

const pageMeta = {
  idea:       { eyebrow: 'The idea',          title: "What you're really building",       agent: 'flora' },
  audience:   { eyebrow: 'Your audience',     title: "Who's going to buy this",            agent: 'finn' },
  validation: { eyebrow: 'Worth doing?',      title: 'Is this idea worth the risk',        agent: 'finn' },
  locations:  { eyebrow: 'Locations',         title: 'Where in London should you start',   agent: 'finn' },
  financials: { eyebrow: 'Money & grants',    title: 'What it costs, what you can claim',  agent: 'finn' },
  plan:       { eyebrow: 'Your next 7 days',  title: "Let's actually get going",           agent: 'finn' },
  agents:     { eyebrow: 'Flora & Finn',      title: 'How your two advisors figured this out', agent: 'both' },
}

export default function TopBar({ page, recentVoice }) {
  const meta = pageMeta[page]
  return (
    <header className="sticky top-0 z-20 border-b border-black/[0.06] bg-cream-100/85 px-9 py-5 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-[12.5px] text-ink-500">
          <span>Plan</span>
          <ChevronRight size={13} className="text-ink-300" />
          <span className="text-forest-500">Halal Healthy Lunch &amp; Catering</span>
          <ChevronRight size={13} className="text-ink-300" />
          <span className="text-ink-700">{meta.eyebrow}</span>
        </div>

        {meta.agent === 'both' ? (
          <div className="ml-1 flex items-center gap-1.5">
            <AgentBadge who="flora" status="ready" />
            <AgentBadge who="finn"  status="ready" />
          </div>
        ) : (
          <AgentBadge who={meta.agent} status="auto" />
        )}

        <span className="ml-1 pill-cream">
          <Activity size={11} className="text-sage-500" /> Validation in progress · clarity 78%
        </span>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2 rounded-full border border-black/[0.06] bg-white px-3.5 py-1.5 text-[12px] text-ink-500">
            <Search size={13} />
            <span>Ask Flora or Finn · ⌘K</span>
          </div>
          <button className="btn-ghost text-[12.5px]"><Share2 size={13} /> Share</button>
          <button className="btn-ghost text-[12.5px]"><Download size={13} /> Export</button>
          <button className="btn-forest text-[12.5px]"><Presentation size={13} /> Pitch deck</button>
        </div>
      </div>

      <div className="mt-4 flex items-end gap-5">
        <div>
          <div className="section-eyebrow mb-1.5">{meta.eyebrow}</div>
          <h1 className="display text-[34px] leading-[1.05] text-forest-500">{meta.title}</h1>
        </div>
        {recentVoice ? (
          <div className="mb-1 ml-auto hidden lg:flex max-w-[460px] items-start gap-2 rounded-full border border-sage-200 bg-sage-50 px-3.5 py-2 text-[12px] text-forest-500">
            <Sparkles size={12} className="mt-0.5 shrink-0 text-sage-500" />
            <span className="truncate">Updated via voice: "{recentVoice}"</span>
          </div>
        ) : (
          <Tagline className="mb-1.5 ml-auto hidden lg:inline-flex" />
        )}
      </div>
    </header>
  )
}
