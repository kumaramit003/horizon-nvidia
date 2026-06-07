import React from 'react'
import {
  Lightbulb, Users, LineChart, MapPin, PoundSterling,
  ListChecks, Leaf, ArrowLeft, Swords, PanelLeftClose
} from 'lucide-react'
import { Wordmark } from './Brand'
import WorkspaceSwitcher from './WorkspaceSwitcher'

const items = [
  { id: 'idea',        label: 'The idea',          icon: Lightbulb,     agent: 'flora' },
  { id: 'audience',    label: 'Who buys',          icon: Users,         agent: 'finn' },
  { id: 'validation',  label: 'Worth doing?',      icon: LineChart,     agent: 'finn' },
  { id: 'competitors', label: 'Competition',       icon: Swords,        agent: 'finn' },
  { id: 'locations',   label: 'Where',             icon: MapPin,        agent: 'finn' },
  { id: 'financials',  label: 'Money & grants',    icon: PoundSterling, agent: 'finn' },
  { id: 'plan',        label: 'Your next 7 days',  icon: ListChecks,    agent: 'finn' },
  { id: 'agents',      label: 'Flora & Finn',      icon: Leaf,          agent: 'both' },
]

export default function Sidebar({ active, onChange, onBackToIntake, discoveryId, onSwitchWorkspace, onDeleteWorkspace, onCollapse }) {
  const activeAgent = items.find(i => i.id === active)?.agent

  return (
    <aside className="flex h-screen w-[260px] shrink-0 flex-col border-r border-black/[0.06] bg-cream-50/80 backdrop-blur-xl">
      <div className="flex items-center justify-between px-5 pt-6 pb-5">
        <Wordmark size="md" />
        {onCollapse && (
          <button
            onClick={onCollapse}
            title="Hide menu"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-ink-400 transition-colors hover:bg-white hover:text-forest-500"
          >
            <PanelLeftClose size={15} />
          </button>
        )}
      </div>

      <div className="px-3 pb-1">
        <button
          onClick={onBackToIntake}
          className="flex w-full items-center gap-2 rounded-2xl border border-dashed border-sage-200 px-3 py-2.5 text-left text-[12.5px] text-forest-500 hover:bg-white"
        >
          <ArrowLeft size={13} /> Back to discovery with Flora
        </button>
      </div>

      <div className="px-3 pt-4">
        <WorkspaceSwitcher
          currentId={discoveryId}
          activeAgent={activeAgent}
          onSwitch={onSwitchWorkspace}
          onNew={onBackToIntake}
          onDelete={onDeleteWorkspace}
        />
      </div>

      <nav className="mt-4 flex-1 overflow-y-auto px-2.5">
        {items.map(item => {
          const Icon = item.icon
          const isActive = active === item.id
          const dotClass = item.agent === 'flora' ? 'bg-peach-400' : item.agent === 'finn' ? 'bg-forest-400' : 'bg-gradient-to-r from-peach-400 to-forest-400'
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`group relative my-0.5 flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13.5px] transition-all
                ${isActive
                  ? 'bg-white text-forest-500 shadow-soft'
                  : 'text-ink-700 hover:bg-white/60'}`}
            >
              {isActive && <span className="absolute inset-y-2 -left-1 w-0.5 rounded-r-full bg-sage-500" />}
              <Icon size={15} className={isActive ? 'text-sage-500' : 'text-ink-500'} />
              <span className="flex-1 truncate font-medium">{item.label}</span>
              <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} title={item.agent} />
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
