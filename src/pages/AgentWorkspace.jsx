import React, { useState } from 'react'
import {
  Mic, Users, BarChart3, MapPin, PoundSterling, ShieldAlert, ListChecks,
  Database, Activity, AlertCircle, ExternalLink, RefreshCw, Search, Globe
} from 'lucide-react'
import { Card, SectionHeader, Tag, Confidence, AskWhyButton } from '../components/ui'
import { LONDON_DATASETS } from '../data/londonDatasets'

const agents = [
  { name: 'Idea Interview Agent',        desc: 'Voice intake — captured idea, why, budget, audience hint.', icon: Mic,           status: 'done',    time: '2m ago',  tone: 'peach',    sources: 0 },
  { name: 'Target Audience Agent',       desc: 'Generated 4 audience segments using ward-level demographics.', icon: Users,       status: 'done',    time: '3m ago',  tone: 'lavender', sources: 3 },
  { name: 'Market Data Agent',           desc: 'Analysed business birth/death + footfall signals.',          icon: BarChart3,    status: 'done',    time: '4m ago',  tone: 'sky',      sources: 4 },
  { name: 'Location Intelligence Agent', desc: 'Compared 4 candidate locations on 6 datasets.',              icon: MapPin,       status: 'done',    time: '5m ago',  tone: 'mint',     sources: 6 },
  { name: 'Funding Agent',               desc: 'Cross-matched founder profile against GLA support directory.',icon: PoundSterling,status: 'running', time: 'now',     tone: 'butter',   sources: 2 },
  { name: 'Risk Agent',                  desc: 'Flagged competitor saturation + rent exposure.',             icon: ShieldAlert,  status: 'done',    time: '6m ago',  tone: 'rose',     sources: 3 },
  { name: 'Action Plan Agent',           desc: 'Synthesised 7-day and 90-day plans from upstream agents.',   icon: ListChecks,   status: 'queued',  time: 'queued',  tone: 'peach',    sources: 0 },
]

const log = [
  { text: 'Office-worker demand assumed from business density signals.', conf: 'Medium' },
  { text: 'Rent costs estimated as proxy via VOA floorspace data.',      conf: 'Medium' },
  { text: 'Grant eligibility requires confirmation on provider site.',   conf: 'Low' },
  { text: 'Competitor density requires live validation.',                conf: 'Medium' },
]

const statusPill = {
  done:    'bg-mint-100 border-mint-200 text-ink-800',
  running: 'bg-peach-100 border-peach-200 text-peach-600',
  queued:  'bg-cream-50 border-ink-100 text-ink-500',
}

export default function AgentWorkspace() {
  const [filter, setFilter] = useState('All')
  const filters = ['All', 'Locations', 'Audience', 'Market validation', 'Money & grants']
  const visible = filter === 'All' ? LONDON_DATASETS : LONDON_DATASETS.filter(d => d.used_in.includes(filter))
  const totalCalls = 124 + 42 + 19 + 11

  return (
    <div className="space-y-10">
      {/* Orchestrator */}
      <Card className="relative overflow-hidden !p-8">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full gradient-soft-lavender opacity-50 blur-2xl" />
        <div className="absolute -left-16 -bottom-16 h-48 w-48 rounded-full gradient-soft-peach opacity-40 blur-2xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-3xl gradient-orb shadow-lift">
            <span className="display text-[26px] italic text-white">N</span>
          </span>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Tag kind="Recommended" icon={Activity}>Running</Tag>
              <span className="pill-cream">7 specialist agents</span>
              <a
                href="https://data.london.gov.uk/dataset/"
                target="_blank"
                rel="noreferrer"
                className="pill bg-white hover:bg-cream-50 text-ink-900"
              >
                <Database size={11} className="text-peach-500" />
                Powered by London Datastore <ExternalLink size={10} />
              </a>
            </div>
            <h2 className="mt-3 display text-[36px] leading-tight text-ink-900">
              NemoClaw is reading <span className="italic-accent text-peach-500">London — for you.</span>
            </h2>
            <p className="mt-2 text-[15px] text-ink-500 max-w-[64ch]">
              Every recommendation is anchored to public datasets from <span className="text-ink-900">data.london.gov.uk</span> — workplace zones, census, TfL, business demography, planning, and more.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:w-[440px]">
            <Stat label="Agents"     value="7" />
            <Stat label="Tool calls" value={String(totalCalls)} />
            <Stat label="Datasets"   value={String(LONDON_DATASETS.length)} />
            <Stat label="Run time"   value="6m" />
          </div>
        </div>
      </Card>

      {/* London Datastore — primary feature */}
      <section>
        <SectionHeader
          eyebrow="Intelligence layer"
          title="The London datasets feeding your plan"
          description="Tap any dataset to open it on data.london.gov.uk."
          right={
            <div className="flex items-center gap-2">
              <button className="btn-ghost text-[12.5px]"><RefreshCw size={12} /> Re-pull</button>
              <a
                href="https://data.london.gov.uk/dataset/"
                target="_blank"
                rel="noreferrer"
                className="btn-coral text-[12.5px]"
              >
                Browse Datastore <ExternalLink size={12} />
              </a>
            </div>
          }
        />

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Search size={13} className="text-ink-500" />
          {filters.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors
                ${filter === f
                  ? 'border-ink-900 bg-ink-900 text-cream-50'
                  : 'border-black/[0.06] bg-white text-ink-700 hover:bg-cream-50'}`}
            >
              {f}
            </button>
          ))}
          <span className="ml-auto text-[12px] text-ink-500">{visible.length} dataset{visible.length === 1 ? '' : 's'}</span>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visible.map(d => (
            <a
              key={d.slug}
              href={`https://data.london.gov.uk/dataset/${d.slug}`}
              target="_blank"
              rel="noreferrer"
              className="card relative overflow-hidden !p-5 transition-all hover:shadow-lift"
            >
              <div className={`absolute -right-10 -top-10 h-32 w-32 rounded-full gradient-soft-${d.tone} opacity-60 blur-2xl`} />
              <div className="relative">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className={`grid h-9 w-9 place-items-center rounded-xl gradient-soft-${d.tone}`}>
                      <Database size={14} className="text-ink-900" />
                    </span>
                    <div className="leading-tight">
                      <div className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-ink-500">London Datastore</div>
                      <div className="display text-[17px] leading-tight text-ink-900">{d.name}</div>
                    </div>
                  </div>
                  <ExternalLink size={13} className="mt-1 shrink-0 text-ink-300" />
                </div>
                <p className="mt-3 text-[13px] leading-relaxed text-ink-700">{d.description}</p>
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {d.used_in.map(u => (
                    <span key={u} className="pill-cream">{u}</span>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between text-[11.5px] text-ink-500">
                  <span>{d.publisher} · refresh {d.refresh.toLowerCase()}</span>
                  <span className="font-mono">pulled {d.last_pulled}</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Agent activity */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card className="!p-7">
          <SectionHeader eyebrow="Agent activity" title="Who used what" right={<button className="btn-ghost text-[12.5px]">View raw trace</button>} />
          <div className="relative">
            <div className="absolute left-6 top-2 bottom-2 w-px bg-gradient-to-b from-peach-400 via-cream-200 to-mint-200" />
            <ul className="space-y-3">
              {agents.map(a => {
                const Icon = a.icon
                return (
                  <li key={a.name} className="relative flex items-start gap-4">
                    <div className={`relative z-10 grid h-12 w-12 shrink-0 place-items-center rounded-2xl gradient-soft-${a.tone}`}>
                      <Icon size={16} className="text-ink-900" />
                    </div>
                    <div className="flex-1 card !p-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-semibold text-ink-900">{a.name}</span>
                        <span className={`ml-auto inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${statusPill[a.status]}`}>
                          {a.status === 'done' ? 'Completed' : a.status === 'running' ? 'Running' : 'Queued'}
                        </span>
                        <span className="text-[11px] font-mono text-ink-400">{a.time}</span>
                      </div>
                      <div className="mt-1.5 text-[13px] text-ink-500">{a.desc}</div>
                      {a.sources > 0 && (
                        <div className="mt-2 flex items-center gap-1.5 text-[11.5px] text-ink-500">
                          <Database size={11} className="text-peach-500" />
                          Queried <span className="text-ink-900 font-semibold">{a.sources}</span> London datasets
                        </div>
                      )}
                      {a.status === 'running' && (
                        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-cream-200">
                          <div className="h-full w-1/2 animate-shimmer bg-gradient-to-r from-transparent via-peach-500 to-transparent bg-[length:200%_100%]" />
                        </div>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        </Card>

        {/* Other tools */}
        <Card className="!p-7">
          <SectionHeader eyebrow="Beyond Datastore" title="Other tools used" right={<AskWhyButton />} />
          <ul className="space-y-2">
            {[
              { name: 'Open web search',       hits: 19, icon: Globe,   note: 'Competitor menus, prices, reviews' },
              { name: 'Location scoring model',hits: 1,  icon: BarChart3, note: 'Weighted fit across 6 datasets' },
              { name: 'User voice interview',  hits: 1,  icon: Mic,     note: 'Founder discovery transcript' },
            ].map(s => {
              const Icon = s.icon
              return (
                <li key={s.name} className="flex items-center gap-3 rounded-2xl bg-cream-50 px-4 py-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-ink-700 shadow-soft">
                    <Icon size={13} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-semibold text-ink-900">{s.name}</div>
                    <div className="text-[11.5px] text-ink-500">{s.note}</div>
                  </div>
                  <span className="font-mono text-[12px] text-ink-500">{s.hits} call{s.hits === 1 ? '' : 's'}</span>
                </li>
              )
            })}
          </ul>
          <div className="mt-4 flex items-start gap-2 rounded-2xl bg-butter-100 border border-butter-200 px-4 py-3 text-[12.5px] text-ink-900">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            Some borough-level licensing data isn't yet on the Datastore — Jill cross-checks with local council pages.
          </div>
        </Card>
      </div>

      {/* Confidence log */}
      <Card className="!p-7">
        <SectionHeader
          eyebrow="What we're not sure about"
          title="Open assumptions — voice can refine any of these"
        />
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {log.map(l => (
            <li key={l.text} className="flex items-start gap-3 rounded-2xl bg-cream-50 px-4 py-3">
              <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-butter-100 text-ink-800">
                <AlertCircle size={11} />
              </span>
              <span className="flex-1 text-[13.5px] text-ink-900">{l.text}</span>
              <Confidence level={l.conf} />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl bg-cream-50 px-4 py-3">
      <div className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-ink-500">{label}</div>
      <div className="mt-0.5 display text-[26px] leading-none text-ink-900">{value}</div>
    </div>
  )
}
