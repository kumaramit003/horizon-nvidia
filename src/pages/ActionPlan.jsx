import React, { useState } from 'react'
import {
  Check, Calendar, FileText, Mail, Globe, Presentation,
  ClipboardList, MapPin, Sparkles, ArrowRight, Building2
} from 'lucide-react'
import { Card, SectionHeader, Tag, VoiceCommandBlock, AskWhyButton } from '../components/ui'

const days = [
  { d: '01', title: 'Finalise offer and pricing',          status: 'done',  owner: 'You' },
  { d: '02', title: 'Identify 30 target offices',          status: 'doing', owner: 'You + Audience Agent' },
  { d: '03', title: 'Build pre-order landing page',        status: 'todo',  owner: 'Action Plan Agent' },
  { d: '04', title: 'Run 10 customer interviews',          status: 'todo',  owner: 'You' },
  { d: '05', title: 'Test 3 menu bundles',                 status: 'todo',  owner: 'You' },
  { d: '06', title: 'Contact 3 kitchen / pop-up partners', status: 'todo',  owner: 'You' },
  { d: '07', title: 'Review demand · decide next step',    status: 'todo',  owner: 'You + Jill' },
]

const roadmap = [
  { window: '30 days', goal: 'Validate demand',                       tone: 'peach',    detail: ['10–20 customer interviews', 'Landing page live', '5 letters of intent from offices'] },
  { window: '60 days', goal: 'Secure first recurring customers',      tone: 'lavender', detail: ['3 paying corporate accounts', '2-week pop-up tested', 'Unit economics confirmed'] },
  { window: '90 days', goal: 'Pop-up · delivery · or storefront?',    tone: 'mint',     detail: ['Burn-rate aware roadmap', 'Funding application drafted', 'Hiring plan v1'] },
]

const assets = [
  { title: 'Customer interview script',      icon: ClipboardList, tone: 'peach' },
  { title: 'Landing page copy',              icon: Globe,         tone: 'sky' },
  { title: 'Office manager outreach email',  icon: Mail,          tone: 'lavender' },
  { title: 'Grant application draft',        icon: FileText,      tone: 'butter' },
  { title: 'Competitor research table',      icon: Building2,     tone: 'mint' },
  { title: 'Lean business plan',             icon: FileText,      tone: 'rose' },
  { title: 'Pitch deck outline',             icon: Presentation,  tone: 'peach' },
  { title: 'Location shortlist',             icon: MapPin,        tone: 'lavender' },
]

const tasks = [
  { t: 'Validate pricing',                   status: 'in_progress', tag: 'Recommended' },
  { t: 'Find 20 office manager contacts',    status: 'todo',        tag: 'Opportunity' },
  { t: 'Create sample menu',                 status: 'todo',        tag: 'Neutral' },
  { t: 'Estimate unit economics',            status: 'in_progress', tag: 'Recommended' },
  { t: 'Research kitchen rental options',    status: 'todo',        tag: 'Neutral' },
]

const statusPill = {
  done:  'bg-mint-100 border-mint-200 text-ink-800',
  doing: 'bg-peach-100 border-peach-200 text-peach-600',
  todo:  'bg-cream-50 border-ink-100 text-ink-500',
}

export default function ActionPlan({ dashboard }) {
  const [checked, setChecked] = useState({})

  return (
    <div className="space-y-10">
      {/* Hero */}
      <Card className="relative overflow-hidden !p-8">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full gradient-soft-peach opacity-50 blur-2xl" />
        <div className="absolute -left-12 -bottom-12 h-40 w-40 rounded-full gradient-soft-mint opacity-40 blur-2xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1">
            <Tag kind="Recommended">7-day validation sprint</Tag>
            <h2 className="mt-4 display text-[40px] leading-tight text-ink-900">
              One week, seven steps, <span className="italic-accent text-peach-500">one decision.</span>
            </h2>
            <p className="mt-3 max-w-[60ch] text-[15.5px] text-ink-500">
              By day 7 you'll know whether to keep building or pivot. No lease signed, no team hired — just enough done to find out.
            </p>
          </div>
          <button className="btn-coral text-[14px] !px-5 !py-3"><Sparkles size={14} /> Re-plan with voice</button>
        </div>
      </Card>

      {/* 7-day timeline */}
      <section>
        <SectionHeader eyebrow="Day by day" title="Your week, end to end" right={<AskWhyButton>Why this order?</AskWhyButton>} />
        <div className="relative">
          <div className="absolute left-6 top-3 bottom-3 w-px bg-gradient-to-b from-peach-400 via-cream-200 to-mint-200" />
          <ol className="space-y-3">
            {days.map(d => (
              <li key={d.d} className="relative flex items-start gap-4">
                <div className={`relative z-10 grid h-12 w-12 shrink-0 place-items-center rounded-2xl shadow-soft
                  ${d.status === 'done' ? 'bg-mint-100' : d.status === 'doing' ? 'bg-peach-100' : 'bg-white'}`}
                >
                  <span className="display text-[16px] text-ink-900">{d.d}</span>
                </div>
                <div className="flex-1 card !p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-[15px] font-medium text-ink-900">{d.title}</span>
                    <span className={`ml-auto inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${statusPill[d.status]}`}>
                      {d.status === 'done' ? 'Done' : d.status === 'doing' ? 'In progress' : 'Up next'}
                    </span>
                  </div>
                  <div className="mt-1 text-[12.5px] text-ink-500">With: {d.owner}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Roadmap */}
      <section>
        <SectionHeader eyebrow="30 / 60 / 90" title="What 'good' looks like further out" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {roadmap.map(r => (
            <div key={r.window} className={`card relative overflow-hidden !p-6`}>
              <div className={`absolute -right-10 -top-10 h-32 w-32 rounded-full gradient-soft-${r.tone} opacity-70 blur-2xl`} />
              <div className="relative">
                <div className="flex items-center gap-2">
                  <Calendar size={13} className="text-ink-500" />
                  <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-500">{r.window}</span>
                </div>
                <div className="mt-2 display text-[22px] leading-tight text-ink-900">{r.goal}</div>
                <ul className="mt-4 space-y-2 text-[13.5px] text-ink-900">
                  {r.detail.map(d => (
                    <li key={d} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-peach-400" /> {d}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr_1fr]">
        {/* Assets */}
        <Card className="!p-7">
          <SectionHeader
            eyebrow="Generated assets"
            title="Ready to download or edit"
            right={<button className="btn-ghost text-[12.5px]"><Sparkles size={12} /> Generate new</button>}
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {assets.map(a => {
              const Icon = a.icon
              return (
                <button key={a.title} className={`group relative overflow-hidden rounded-2xl border border-black/[0.05] gradient-soft-${a.tone} p-4 text-left hover:shadow-lift transition-all`}>
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/70">
                    <Icon size={15} className="text-ink-900" />
                  </span>
                  <div className="mt-4 text-[13px] font-semibold text-ink-900">{a.title}</div>
                  <div className="mt-3 inline-flex items-center gap-1 text-[11.5px] text-ink-700 group-hover:text-ink-900">
                    Open <ArrowRight size={11} />
                  </div>
                </button>
              )
            })}
          </div>
        </Card>

        {/* Tasks */}
        <Card className="!p-7">
          <SectionHeader eyebrow="Priority tasks" title="This week" right={<button className="btn-ghost text-[12.5px]">+ Task</button>} />
          <ul className="space-y-2">
            {tasks.map(t => {
              const id = t.t
              const isChecked = checked[id] ?? t.status !== 'todo'
              return (
                <li key={id} className="flex items-center gap-3 rounded-2xl bg-cream-50 px-4 py-3">
                  <button
                    onClick={() => setChecked(c => ({ ...c, [id]: !isChecked }))}
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border ${isChecked ? 'border-mint-200 bg-mint-100 text-ink-900' : 'border-ink-200 bg-white text-transparent'}`}
                  >
                    <Check size={12} />
                  </button>
                  <span className={`flex-1 text-[13.5px] ${isChecked ? 'text-ink-500 line-through' : 'text-ink-900'}`}>{t.t}</span>
                  {t.status === 'in_progress' && <Tag kind="Recommended">In progress</Tag>}
                </li>
              )
            })}
          </ul>
        </Card>
      </div>

      <VoiceCommandBlock
        commands={[
          'Make this realistic for evenings and weekends.',
          'Create an outreach email for office managers.',
          'Turn this into a 2-week sprint.',
        ]}
      />
    </div>
  )
}
