import React, { useState } from 'react'
import {
  Mic, BarChart3, Database, Activity, AlertCircle, ExternalLink,
  RefreshCw, Search, Globe, MessageSquare
} from 'lucide-react'
import { Card, SectionHeader, Tag, Confidence, AskWhyButton } from '../components/ui'
import { LeafMark, Tagline } from '../components/Brand'
import { LONDON_DATASETS } from '../data/londonDatasets'
import { DynIcon } from '../lib/icons'
import { resolveDataset } from '../lib/datasets'

const statusPill = {
  done:    'bg-sage-100 border-sage-200 text-forest-500',
  running: 'bg-peach-100 border-peach-200 text-peach-600',
  queued:  'bg-cream-50 border-ink-100 text-ink-500',
}

export default function AgentWorkspace({ dashboard, onRerun }) {
  const floraModules = dashboard?.flora_modules?.length ? dashboard.flora_modules : []
  const finnModules = dashboard?.finn_modules?.length ? dashboard.finn_modules : []
  const log = dashboard?.agent_log?.length ? dashboard.agent_log : []

  const [rerunning, setRerunning] = useState(false)
  const [rerunError, setRerunError] = useState('')
  const handleRerun = async () => {
    if (!onRerun || rerunning) return
    setRerunError('')
    setRerunning(true)
    try {
      await onRerun()
    } catch (e) {
      setRerunError(e?.message || 'Re-run failed')
    } finally {
      setRerunning(false)
    }
  }
  const [filter, setFilter] = useState('All')
  const filters = ['All', 'Locations', 'Audience', 'Market validation', 'Money & grants']
  const visible = filter === 'All' ? LONDON_DATASETS : LONDON_DATASETS.filter(d => d.used_in.includes(filter))

  return (
    <div className="space-y-10">
      {/* The two agents hero */}
      <section>
        <Tagline className="mb-3" />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Flora — Discovery */}
          <div className="card relative overflow-hidden !p-7">
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full gradient-soft-peach opacity-50 blur-3xl" />
            <div className="absolute -left-10 -bottom-10 h-32 w-32 rounded-full gradient-soft-lavender opacity-30 blur-2xl" />
            <div className="relative flex items-start gap-4">
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-3xl gradient-orb-flora shadow-lift">
                <MessageSquare size={20} className="text-white" />
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="display text-[28px] leading-tight text-forest-500">Flora</h2>
                  <Tag kind="Recommended">Discovery Agent</Tag>
                </div>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-700">
                  Flora ran the voice intake. She listened carefully, asked the deeper questions, gently challenged weak assumptions, and built your <span className="text-forest-500">Idea Profile</span>.
                </p>
              </div>
              <span className="pill bg-peach-100 border-peach-200 text-peach-600">
                <span className="h-1.5 w-1.5 rounded-full bg-peach-500" /> Idle · ready
              </span>
            </div>

            <ul className="relative mt-5 space-y-2">
              {floraModules.map(m => {
                return (
                  <li key={m.name} className="flex items-center gap-3 rounded-2xl bg-cream-50 px-3.5 py-2.5">
                    <span className="grid h-8 w-8 place-items-center rounded-xl bg-white text-forest-500 shadow-soft">
                      <DynIcon name={m.icon} size={13} />
                    </span>
                    <div className="flex-1 leading-tight">
                      <div className="text-[13px] font-semibold text-forest-500">{m.name}</div>
                      <div className="text-[11.5px] text-ink-500">{m.desc}</div>
                    </div>
                    <span className="text-[10.5px] font-mono text-ink-400">{m.time}</span>
                  </li>
                )
              })}
            </ul>
            <div className="relative mt-4 flex items-center gap-2">
              <button className="btn-ghost text-[12px]"><MessageSquare size={12} /> Resume with Flora</button>
              <span className="text-[11.5px] text-ink-500">{floraModules.length} module{floraModules.length === 1 ? '' : 's'} · 1 voice interview</span>
            </div>
          </div>

          {/* Finn — Research & Planning */}
          <div className="card relative overflow-hidden !p-7">
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full gradient-soft-mint opacity-50 blur-3xl" />
            <div className="absolute -left-10 -bottom-10 h-32 w-32 rounded-full gradient-soft-sky opacity-30 blur-2xl" />
            <div className="relative flex items-start gap-4">
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-3xl gradient-orb-finn shadow-lift">
                <LeafMark size={22} className="opacity-95" />
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="display text-[28px] leading-tight text-forest-500">Finn</h2>
                  <Tag kind="Opportunity">Research &amp; Planning Agent</Tag>
                </div>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-700">
                  Finn doesn't sugarcoat. He reads London for you, validates the idea against hard datasets, compares locations, surfaces grants, and writes the <span className="text-forest-500">launch plan</span>.
                </p>
              </div>
              <span className="pill bg-sage-100 border-sage-200 text-forest-500">
                <Activity size={11} /> Researching
              </span>
            </div>

            <ul className="relative mt-5 space-y-2">
              {finnModules.slice(0, 4).map(m => {
                return (
                  <li key={m.name} className="flex items-center gap-3 rounded-2xl bg-cream-50 px-3.5 py-2.5">
                    <span className="grid h-8 w-8 place-items-center rounded-xl bg-white text-forest-500 shadow-soft">
                      <DynIcon name={m.icon} size={13} />
                    </span>
                    <div className="flex-1 leading-tight">
                      <div className="text-[13px] font-semibold text-forest-500">{m.name}</div>
                      <div className="text-[11.5px] text-ink-500">{m.desc}</div>
                    </div>
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10.5px] font-medium ${statusPill[m.status]}`}>
                      {m.status === 'done' ? 'Done' : m.status === 'running' ? 'Running' : 'Queued'}
                    </span>
                  </li>
                )
              })}
            </ul>
            {finnModules.length > 4 && (
              <div className="relative mt-3 text-[11.5px] text-ink-500">
                + {finnModules.length - 4} more module{finnModules.length - 4 === 1 ? '' : 's'}: {finnModules.slice(4).map(m => m.name).join(' · ')}
              </div>
            )}
            <div className="relative mt-3 flex items-center gap-2">
              <button
                onClick={handleRerun}
                disabled={rerunning}
                className="btn-ghost text-[12px] disabled:opacity-60"
                title={rerunError || ''}
              >
                <RefreshCw size={12} className={rerunning ? 'animate-spin' : ''} />
                {rerunning ? 'Re-running Finn…' : 'Re-run analysis'}
              </button>
              <span className="text-[11.5px] text-ink-500">{finnModules.length} module{finnModules.length === 1 ? '' : 's'} · {LONDON_DATASETS.length} datasets</span>
            </div>
          </div>
        </div>
      </section>

      {/* London Datastore — Flora's intelligence layer */}
      <section>
        <SectionHeader
          eyebrow="Finn's intelligence layer"
          title="The London datasets feeding your plan"
          description="All anchored to public sources on data.london.gov.uk."
          right={
            <div className="flex items-center gap-2">
              <button className="btn-ghost text-[12.5px]"><RefreshCw size={12} /> Re-pull</button>
              <a
                href="https://data.london.gov.uk/dataset/"
                target="_blank"
                rel="noreferrer"
                className="btn-forest text-[12.5px]"
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
                  ? 'border-forest-500 bg-forest-500 text-cream-50'
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
              href={resolveDataset(d.slug, d.name).url}
              target="_blank"
              rel="noreferrer"
              className="card relative overflow-hidden !p-5 transition-all hover:shadow-lift"
            >
              <div className={`absolute -right-10 -top-10 h-32 w-32 rounded-full gradient-soft-${d.tone} opacity-60 blur-2xl`} />
              <div className="relative">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className={`grid h-9 w-9 place-items-center rounded-xl gradient-soft-${d.tone}`}>
                      <Database size={14} className="text-forest-500" />
                    </span>
                    <div className="leading-tight">
                      <div className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-ink-500">London Datastore</div>
                      <div className="display text-[17px] leading-tight text-forest-500">{d.name}</div>
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

      {/* Activity timeline */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card className="!p-7">
          <SectionHeader
            eyebrow="Activity"
            title="What Flora & Finn actually did"
            right={<button className="btn-ghost text-[12.5px]">View raw trace</button>}
          />
          <div className="relative">
            <div className="absolute left-6 top-2 bottom-2 w-px bg-gradient-to-b from-peach-400 via-cream-200 to-forest-400" />
            <ul className="space-y-3">
              {[...floraModules.map(m => ({ ...m, who: 'Flora' })), ...finnModules.map(m => ({ ...m, who: 'Finn' }))].map((a, idx) => {
                const isFlora = a.who === 'Flora'
                return (
                  <li key={a.name + idx} className="relative flex items-start gap-4">
                    <div className={`relative z-10 grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${isFlora ? 'gradient-orb-flora' : 'gradient-orb-finn'}`}>
                      <DynIcon name={a.icon} size={16} className="text-white" />
                    </div>
                    <div className="flex-1 card !p-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-semibold text-forest-500">{a.name}</span>
                        <span className="pill-cream">{a.who}</span>
                        <span className={`ml-auto inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${statusPill[a.status]}`}>
                          {a.status === 'done' ? 'Completed' : a.status === 'running' ? 'Running' : 'Queued'}
                        </span>
                        <span className="text-[11px] font-mono text-ink-400">{a.time}</span>
                      </div>
                      <div className="mt-1.5 text-[13px] text-ink-500">{a.desc}</div>
                      {a.sources > 0 && (
                        <div className="mt-2 flex items-center gap-1.5 text-[11.5px] text-ink-500">
                          <Database size={11} className="text-sage-500" />
                          Queried <span className="text-forest-500 font-semibold">{a.sources}</span> London datasets
                        </div>
                      )}
                      {a.status === 'running' && (
                        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-cream-200">
                          <div className="h-full w-1/2 animate-shimmer bg-gradient-to-r from-transparent via-sage-500 to-transparent bg-[length:200%_100%]" />
                        </div>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        </Card>

        {/* Tools beyond datastore */}
        <Card className="!p-7">
          <SectionHeader eyebrow="Beyond Datastore" title="Other tools used" right={<AskWhyButton />} />
          <ul className="space-y-2">
            {[
              { name: 'Open web search',        hits: 19, icon: Globe,    note: 'Competitor menus, prices, reviews' },
              { name: 'Location scoring model', hits: 1,  icon: BarChart3,note: 'Weighted fit across 6 datasets' },
              { name: 'Voice intake (Flora)',   hits: 1,  icon: Mic,      note: 'Founder discovery transcript' },
            ].map(s => {
              const Icon = s.icon
              return (
                <li key={s.name} className="flex items-center gap-3 rounded-2xl bg-cream-50 px-4 py-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-forest-500 shadow-soft">
                    <Icon size={13} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-semibold text-forest-500">{s.name}</div>
                    <div className="text-[11.5px] text-ink-500">{s.note}</div>
                  </div>
                  <span className="font-mono text-[12px] text-ink-500">{s.hits} call{s.hits === 1 ? '' : 's'}</span>
                </li>
              )
            })}
          </ul>
          <div className="mt-4 flex items-start gap-2 rounded-2xl bg-peach-100 border border-peach-200 px-4 py-3 text-[12.5px] text-forest-500">
            <AlertCircle size={14} className="mt-0.5 shrink-0 text-peach-500" />
            Some borough-level licensing data isn't yet on the Datastore — Finn cross-checks council pages.
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
              <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-peach-100 text-peach-600">
                <AlertCircle size={11} />
              </span>
              <span className="flex-1 text-[13.5px] text-forest-500">{l.text}</span>
              <div className="flex items-center gap-1.5">
                <span className="pill-cream">{l.who}</span>
                <Confidence level={l.conf} />
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
