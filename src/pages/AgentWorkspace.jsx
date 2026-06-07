import React, { useState } from 'react'
import {
  Mic, BarChart3, Database, Activity, AlertCircle, ExternalLink,
  RefreshCw, Globe, MessageSquare, Loader2, Check
} from 'lucide-react'
import { Card, SectionHeader, Tag, Confidence, AskWhyButton } from '../components/ui'
import { Tagline } from '../components/Brand'
import { AgentFace } from '../components/AgentFace'
import { DynIcon } from '../lib/icons'

function StatusDot({ status }) {
  if (status === 'processing') return <Loader2 size={13} className="shrink-0 animate-spin text-peach-500" />
  if (status === 'ready') return <Check size={13} className="shrink-0 text-sage-500" />
  return <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ink-200" />
}

// Finn's real research sections — the source of truth for live status.
const FINN_SECTIONS = [
  { key: 'audience',    name: 'Target Audience',   icon: 'Users',         desc: 'Segments, personas & interview questions' },
  { key: 'validation',  name: 'Market Validation', icon: 'BarChart3',     desc: 'Evidence, risk radar & experiments' },
  { key: 'competitors', name: 'Competition',       icon: 'Swords',        desc: 'Rivals, gaps & how you win' },
  { key: 'locations',   name: 'Locations',         icon: 'MapPin',        desc: 'London areas ranked by fit' },
  { key: 'financials',  name: 'Money & Grants',    icon: 'PoundSterling', desc: 'Costs, burn & funding' },
  { key: 'plan',        name: 'Launch Plan',       icon: 'ListChecks',    desc: '7-day sprint & 90-day roadmap' },
]

const livePill = {
  ready:      'bg-sage-100 border-sage-200 text-forest-500',
  processing: 'bg-peach-100 border-peach-200 text-peach-600',
  error:      'bg-rose-100 border-rose-200 text-ink-800',
  pending:    'bg-cream-50 border-ink-100 text-ink-500',
}
const liveLabel = { ready: 'Done', processing: 'Running…', error: 'Retry', pending: 'Queued' }

export default function AgentWorkspace({ dashboard, sections = {}, wsStatus, onRerun }) {
  const log = dashboard?.agent_log?.length ? dashboard.agent_log : []

  // Derive everything from the live section-status map (single source of truth).
  const statusOf = (k) => sections[k] || 'pending'
  const ideaStatus = statusOf('idea')
  const finnDone = FINN_SECTIONS.filter(s => statusOf(s.key) === 'ready').length
  const finnProcessing = FINN_SECTIONS.filter(s => statusOf(s.key) === 'processing').length
  const isAnalysing = finnProcessing > 0 || wsStatus === 'processing'

  const [rerunError, setRerunError] = useState('')
  const handleRerun = async () => {
    if (!onRerun || isAnalysing) return
    setRerunError('')
    try {
      await onRerun()
    } catch (e) {
      setRerunError(e?.message || 'Re-run failed')
    }
  }
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
              <AgentFace
                who="flora"
                state={ideaStatus === 'processing' ? 'thinking' : 'idle'}
                size={80}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="display text-[28px] leading-tight text-forest-500">Flora</h2>
                  <Tag kind="Recommended">Discovery Agent</Tag>
                </div>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-700">
                  Flora ran the voice intake. She listened carefully, asked the deeper questions, gently challenged weak assumptions, and built your <span className="text-forest-500">Idea Profile</span>.
                </p>
              </div>
              <span className={`pill border ${livePill[ideaStatus]}`}>
                <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" /> {ideaStatus === 'ready' ? 'Idle · ready' : ideaStatus === 'processing' ? 'Listening…' : liveLabel[ideaStatus]}
              </span>
            </div>

            <ul className="relative mt-5 space-y-2">
              {[
                { name: 'Voice intake', icon: 'Mic', desc: 'Captured your idea, motivation & constraints' },
                { name: 'Idea profile', icon: 'MessageSquare', desc: 'Clarity score, assumptions & open questions' },
              ].map(m => (
                <li key={m.name} className="flex items-center gap-3 rounded-2xl bg-cream-50 px-3.5 py-2.5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white text-forest-500 shadow-soft">
                    <DynIcon name={m.icon} size={13} />
                  </span>
                  <div className="min-w-0 flex-1 leading-tight">
                    <div className="text-[13px] font-semibold text-forest-500">{m.name}</div>
                    <div className="text-[11.5px] text-ink-500">{m.desc}</div>
                  </div>
                  <StatusDot status={ideaStatus} />
                </li>
              ))}
            </ul>
            <div className="relative mt-4 flex items-center gap-2">
              <button className="btn-ghost text-[12px]"><MessageSquare size={12} /> Resume with Flora</button>
              <span className="text-[11.5px] text-ink-500">Discovery · 1 voice interview</span>
            </div>
          </div>

          {/* Finn — Research & Planning */}
          <div className="card relative overflow-hidden !p-7">
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full gradient-soft-mint opacity-50 blur-3xl" />
            <div className="absolute -left-10 -bottom-10 h-32 w-32 rounded-full gradient-soft-sky opacity-30 blur-2xl" />
            <div className="relative flex items-start gap-4">
              <AgentFace
                who="finn"
                state={isAnalysing ? 'thinking' : 'idle'}
                size={80}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="display text-[28px] leading-tight text-forest-500">Finn</h2>
                  <Tag kind="Opportunity">Research &amp; Planning Agent</Tag>
                </div>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-700">
                  Finn doesn't sugarcoat. He reads London for you, validates the idea against hard datasets, compares locations, surfaces grants, and writes the <span className="text-forest-500">launch plan</span>.
                </p>
              </div>
              <span className={`pill border ${isAnalysing ? 'bg-peach-100 border-peach-200 text-peach-600' : 'bg-sage-100 border-sage-200 text-forest-500'}`}>
                <Activity size={11} className={isAnalysing ? 'animate-pulse' : ''} /> {isAnalysing ? 'Researching…' : 'Ready'}
              </span>
            </div>

            <ul className="relative mt-5 space-y-2">
              {FINN_SECTIONS.map(m => {
                const st = statusOf(m.key)
                return (
                  <li key={m.key} className="flex items-center gap-3 rounded-2xl bg-cream-50 px-3.5 py-2.5">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white text-forest-500 shadow-soft">
                      <DynIcon name={m.icon} size={13} />
                    </span>
                    <div className="min-w-0 flex-1 leading-tight">
                      <div className="text-[13px] font-semibold text-forest-500">{m.name}</div>
                      <div className="text-[11.5px] text-ink-500">{m.desc}</div>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-medium ${livePill[st]}`}>
                      {st === 'processing' && <Loader2 size={9} className="animate-spin" />}
                      {liveLabel[st]}
                    </span>
                  </li>
                )
              })}
            </ul>

            {/* Live progress bar */}
            <div className="relative mt-4">
              <div className="mb-1.5 flex items-center justify-between text-[11.5px]">
                <span className="text-ink-500">{isAnalysing ? 'Analysing…' : 'Analysis complete'}</span>
                <span className="font-mono text-ink-500">{finnDone}/{FINN_SECTIONS.length}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-cream-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sage-300 to-forest-400 transition-all duration-500"
                  style={{ width: `${(finnDone / FINN_SECTIONS.length) * 100}%` }}
                />
              </div>
            </div>

            <div className="relative mt-4 flex items-center gap-2">
              <button
                onClick={handleRerun}
                disabled={isAnalysing}
                className="btn-forest text-[12px] disabled:opacity-50"
                title={rerunError || ''}
              >
                <RefreshCw size={12} className={isAnalysing ? 'animate-spin' : ''} />
                {isAnalysing ? `Analysing… ${finnDone}/${FINN_SECTIONS.length}` : 'Re-run analysis'}
              </button>
              <span className="text-[11.5px] text-ink-500">{FINN_SECTIONS.length} research modules</span>
            </div>
            {rerunError && <div className="relative mt-2 text-[11.5px] text-rose-300">{rerunError}</div>}
          </div>
        </div>
      </section>

      {/* London Datastore — public reference only */}
      <section>
        <SectionHeader
          eyebrow="Finn's intelligence layer"
          title="The London datasets feeding your plan"
          description="Finn draws on open data published by the GLA, ONS, TfL and others — all hosted on the London Datastore."
        />

        <a
          href="https://data.london.gov.uk/dataset/"
          target="_blank"
          rel="noreferrer"
          className="card group relative flex items-start gap-4 overflow-hidden !p-6 transition-all hover:shadow-lift"
        >
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full gradient-soft-sky opacity-50 blur-2xl" />
          <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl gradient-soft-mint">
            <Database size={18} className="text-forest-500" />
          </span>
          <div className="relative min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-ink-500">Reference</div>
                <div className="display text-[22px] leading-tight text-forest-500">London Datastore</div>
              </div>
              <ExternalLink size={15} className="mt-1 shrink-0 text-ink-300 transition-colors group-hover:text-forest-500" />
            </div>
            <p className="mt-2 max-w-[640px] text-[13.5px] leading-relaxed text-ink-600">
              Browse the full catalogue of public London datasets at{' '}
              <span className="font-medium text-forest-500">data.london.gov.uk</span>
              {' '}— the official open-data portal for the Greater London Authority.
            </p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-forest-500">
              <Globe size={13} /> Visit data.london.gov.uk
            </span>
          </div>
        </a>
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
              {[
                { who: 'Flora', name: 'Idea discovery', icon: 'MessageSquare', key: 'idea', desc: 'Built your idea profile from the voice intake.' },
                ...FINN_SECTIONS.map(s => ({ who: 'Finn', name: s.name, icon: s.icon, key: s.key, desc: s.desc })),
              ].map((a, idx) => {
                const isFlora = a.who === 'Flora'
                const st = statusOf(a.key)
                return (
                  <li key={a.key + idx} className="relative flex items-start gap-4">
                    <div className="relative z-10 shrink-0">
                      <AgentFace
                        who={isFlora ? 'flora' : 'finn'}
                        state={st === 'processing' ? 'thinking' : st === 'ready' ? 'happy' : 'idle'}
                        size={52}
                      />
                    </div>
                    <div className="flex-1 card !p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[14px] font-semibold text-forest-500">{a.name}</span>
                        <span className="pill-cream">{a.who}</span>
                        <span className={`ml-auto inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium ${livePill[st]}`}>
                          {st === 'processing' && <Loader2 size={9} className="animate-spin" />}
                          {st === 'ready' ? 'Completed' : liveLabel[st]}
                        </span>
                      </div>
                      <div className="mt-1.5 text-[13px] text-ink-500">{a.desc}</div>
                      {st === 'processing' && (
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
