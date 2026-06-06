import React from 'react'
import {
  Lightbulb, Users, LineChart, MapPin, PoundSterling,
  ListChecks, Bot, ArrowLeft, Database, ExternalLink
} from 'lucide-react'

const items = [
  { id: 'idea',       label: 'The idea',          icon: Lightbulb },
  { id: 'audience',   label: 'Who buys',          icon: Users },
  { id: 'validation', label: 'Worth doing?',      icon: LineChart },
  { id: 'locations',  label: 'Where',             icon: MapPin },
  { id: 'financials', label: 'Money & grants',    icon: PoundSterling },
  { id: 'plan',       label: 'Your next 7 days',  icon: ListChecks },
  { id: 'agents',     label: 'Behind the scenes', icon: Bot },
]

export default function Sidebar({ active, onChange, onBackToIntake }) {
  return (
    <aside className="flex h-screen w-[252px] shrink-0 flex-col border-r border-black/[0.06] bg-cream-50/80 backdrop-blur-xl">
      <div className="flex items-center gap-2.5 px-5 pt-6 pb-5">
        <span className="grid h-9 w-9 place-items-center rounded-xl gradient-orb shadow-soft">
          <span className="display text-[18px] italic text-white">f</span>
        </span>
        <div className="leading-tight">
          <div className="text-[14px] font-semibold tracking-tight text-ink-900">FounderOS</div>
          <div className="text-[10.5px] font-medium uppercase tracking-[0.18em] text-ink-500">London</div>
        </div>
      </div>

      <div className="px-3 pb-1">
        <button
          onClick={onBackToIntake}
          className="flex w-full items-center gap-2 rounded-2xl border border-dashed border-ink-200 px-3 py-2.5 text-left text-[12.5px] text-ink-700 hover:bg-white"
        >
          <ArrowLeft size={13} /> Back to discovery
        </button>
      </div>

      <div className="px-3 pt-4">
        <div className="rounded-2xl bg-white p-4 shadow-soft">
          <div className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-ink-500">Workspace</div>
          <div className="mt-1 display text-[18px] leading-tight text-ink-900">Halal Healthy Lunch</div>
          <div className="mt-2 flex items-center gap-2 text-[11.5px] text-ink-500">
            <span className="h-1.5 w-1.5 rounded-full bg-peach-400 animate-breathe" />
            Idea stage · last updated 2m ago
          </div>
        </div>
      </div>

      <nav className="mt-4 flex-1 overflow-y-auto px-2.5">
        {items.map(item => {
          const Icon = item.icon
          const isActive = active === item.id
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`group relative my-0.5 flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13.5px] transition-all
                ${isActive
                  ? 'bg-white text-ink-900 shadow-soft'
                  : 'text-ink-700 hover:bg-white/60'}`}
            >
              {isActive && <span className="absolute inset-y-2 -left-1 w-0.5 rounded-r-full bg-peach-500" />}
              <Icon size={15} className={isActive ? 'text-peach-500' : 'text-ink-500'} />
              <span className="flex-1 truncate font-medium">{item.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="border-t border-black/[0.06] p-3 space-y-2">
        <div className="rounded-2xl border border-black/[0.05] bg-white p-3.5">
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-md gradient-soft-lavender">
              <span className="text-[10.5px] font-bold text-lavender-500">N</span>
            </span>
            <div className="text-[12px] font-semibold text-ink-900">NemoClaw</div>
            <span className="ml-auto h-2 w-2 rounded-full bg-mint-300 animate-breathe" />
          </div>
          <div className="mt-1.5 text-[11px] text-ink-500">7 specialist agents · syncing in real time</div>
        </div>
        <a
          href="https://data.london.gov.uk/dataset/"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-2xl border border-black/[0.05] gradient-soft-peach px-3 py-2.5 text-[11.5px] text-ink-900 hover:shadow-soft"
        >
          <Database size={13} className="text-peach-600" />
          <div className="flex-1 leading-tight">
            <div className="font-semibold">Powered by London Datastore</div>
            <div className="text-[10.5px] text-ink-700">12 datasets indexed</div>
          </div>
          <ExternalLink size={11} className="text-ink-700" />
        </a>
      </div>
    </aside>
  )
}
