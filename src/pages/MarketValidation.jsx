import React from 'react'
import { Card, SectionHeader, Confidence, Tag, AskWhyButton, VoiceCommandBlock, SourceChip, EmptyPage, SectionLoading } from '../components/ui'
import { DynIcon } from '../lib/icons'

function RiskRadar({ cats }) {
  const size = 300, cx = size / 2, cy = size / 2, R = 110
  const n = cats.length
  const angle = i => (Math.PI * 2 * i) / n - Math.PI / 2
  const point = (i, r) => [cx + Math.cos(angle(i)) * r, cy + Math.sin(angle(i)) * r]
  const grid = [0.25, 0.5, 0.75, 1].map(s =>
    Array.from({ length: n }, (_, i) => point(i, R * s).join(',')).join(' ')
  )
  const dataPoly = cats.map((c, i) => point(i, R * c.value).join(',')).join(' ')

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[340px]">
      <defs>
        <radialGradient id="radarFill2" cx="50%" cy="50%" r="50%">
          <stop offset="0%"  stopColor="#FF9259" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#FFD659" stopOpacity="0.10" />
        </radialGradient>
      </defs>
      {grid.map((g, i) => (
        <polygon key={i} points={g} fill="none" stroke="rgba(24,22,18,0.07)" strokeWidth="1" />
      ))}
      {cats.map((c, i) => {
        const [x, y] = point(i, R)
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(24,22,18,0.05)" />
      })}
      <polygon points={dataPoly} fill="url(#radarFill2)" stroke="#FF6B3D" strokeWidth="1.75" />
      {cats.map((c, i) => {
        const [x, y] = point(i, R * c.value)
        return <circle key={i} cx={x} cy={y} r="3.5" fill="#FF6B3D" stroke="white" strokeWidth="1.5" />
      })}
      {cats.map((c, i) => {
        const [x, y] = point(i, R + 24)
        return (
          <text
            key={i} x={x} y={y}
            textAnchor={x > cx + 4 ? 'start' : x < cx - 4 ? 'end' : 'middle'}
            dominantBaseline="middle"
            fontSize="11.5" fill="#6B655B" fontFamily="Inter"
            fontWeight="500"
          >
            {c.label}
          </text>
        )
      })}
    </svg>
  )
}

const impactPill = (k) =>
  k === 'Positive' || k === 'Opportunity' ? 'bg-mint-100 border-mint-200 text-ink-800'
  : k === 'Risk' ? 'bg-rose-100 border-rose-200 text-ink-800'
  : 'bg-cream-50 border-ink-100 text-ink-700'

const impactTagKind = (impact) =>
  impact === 'Positive' || impact === 'Opportunity' ? 'Opportunity'
  : impact === 'Risk' ? 'Risk'
  : 'Neutral'

export default function MarketValidation({ dashboard, section }) {
  const _evidence = dashboard?.evidence?.length ? dashboard.evidence : []
  const _radar = dashboard?.radar?.length ? dashboard.radar : []
  const _experiments = dashboard?.experiments?.length ? dashboard.experiments : []
  const _verdict = dashboard?.validation_verdict || ''
  const _verdictDesc = dashboard?.validation_description || ''

  const hasAny = _evidence.length || _radar.length || _experiments.length || _verdict
  if (!hasAny) {
    if (section === 'processing' || section === 'pending') return <SectionLoading label="whether it's worth doing" />
    return <EmptyPage label="market validation" />
  }

  // Derive the headline stats + tag row from the real evidence so nothing is
  // hardcoded to a specific business idea.
  const positives = _evidence.filter(e => e.impact === 'Positive' || e.impact === 'Opportunity')
  const risks = _evidence.filter(e => e.impact === 'Risk')
  const avgRadar = _radar.length ? _radar.reduce((s, c) => s + c.value, 0) / _radar.length : 0
  const overallConf = avgRadar >= 0.66 ? 'Low' : avgRadar >= 0.4 ? 'Medium' : 'High'

  return (
    <div className="space-y-10">
      {/* Summary headline */}
      <Card className="relative overflow-hidden !p-9">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full gradient-soft-peach opacity-50 blur-2xl" />
        <div className="absolute -left-12 -bottom-16 h-48 w-48 rounded-full gradient-soft-mint opacity-40 blur-2xl" />
        <div className="relative">
          <Tag kind="Recommended">Verdict</Tag>
          <h2 className="mt-4 display text-[44px] leading-tight text-ink-900">
            {_verdict.includes('—') ? <>{_verdict.split('—')[0]}— <span className="italic-accent text-peach-500">{_verdict.split('—').slice(1).join('—')}</span></> : (_verdict || 'Validation summary')}
          </h2>
          {_verdictDesc && (
            <p className="mt-4 max-w-[72ch] text-[16px] leading-relaxed text-ink-500">
              {_verdictDesc}
            </p>
          )}
          {_evidence.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {_evidence.slice(0, 6).map(e => (
                <Tag key={e.signal} kind={impactTagKind(e.impact)}>{e.signal}</Tag>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Stats strip — derived from the real evidence */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Kpi label="Signals analysed" value={String(_evidence.length)} tone="cream-50" />
        <Kpi label="Strong positives" value={String(positives.length)}  tone="gradient-soft-mint" />
        <Kpi label="Notable risks"    value={String(risks.length)}  tone="gradient-soft-rose" />
        <Kpi label="Confidence"       value={overallConf} sub tone="gradient-soft-butter" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr]">
        {/* Evidence */}
        <Card className="!p-7">
          <SectionHeader
            eyebrow="Evidence"
            title="What Finn has actually seen"
            right={<AskWhyButton>Sources</AskWhyButton>}
          />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {_evidence.map(e => {
              // Backend uses snake_case (source_name / source_slug); tolerate
              // both so older docs keep rendering.
              const sourceName = e.source_name || e.sourceName
              const sourceSlug = e.source_slug || e.sourceSlug
              return (
                <div key={e.signal} className={`rounded-2xl border border-black/[0.05] p-5 gradient-soft-${e.tone}`}>
                  <div className="flex items-start gap-2.5">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/70">
                      <DynIcon name={e.icon} size={15} className="text-ink-900" />
                    </span>
                    <span className="display min-w-0 flex-1 text-[16px] leading-snug text-ink-900">{e.signal}</span>
                    <span className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium ${impactPill(e.impact)}`}>{e.impact}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[12px] text-ink-700">
                    <SourceChip name={sourceName} slug={sourceSlug} />
                    <Confidence level={e.conf} />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        {/* Risk radar */}
        <Card className="!p-7">
          <SectionHeader eyebrow="Risk shape" title={`${_radar.length} dimension${_radar.length === 1 ? '' : 's'}`} description="Bigger = more concerning." />
          <div className="flex justify-center">
            <RiskRadar cats={_radar} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12.5px]">
            {_radar.map(c => (
              <div key={c.label} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-peach-500" />
                <span className="text-ink-700">{c.label}</span>
                <span className="ml-auto font-mono text-ink-500">{Math.round(c.value * 100)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Experiments + voice */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card className="!p-7">
          <SectionHeader
            eyebrow="Experiments"
            title="The cheapest ways to learn the most"
            right={<AskWhyButton>Re-rank</AskWhyButton>}
          />
          <ul className="space-y-2.5">
            {_experiments.map((x, i) => (
              <li key={x.title} className="flex items-start gap-3.5 rounded-2xl bg-cream-50 px-4 py-3">
                <span className="display grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-[14px] text-ink-900 shadow-soft">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] leading-snug text-ink-900">{x.title}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium ${impactPill(x.impact === 'High' ? 'Opportunity' : 'Neutral')}`}>Impact {x.impact}</span>
                    <span className="pill-cream">Effort {x.effort}</span>
                    {x.days && <span className="pill-cream">{x.days}</span>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <VoiceCommandBlock
          commands={[
            'How do I reduce competition risk?',
            'What is the riskiest assumption?',
            'Make this idea more defensible.',
          ]}
        />
      </div>
    </div>
  )
}

function Kpi({ label, value, sub, tone = 'cream-50' }) {
  const cls = tone.startsWith('gradient') ? tone : `bg-${tone}`
  return (
    <div className={`rounded-2xl border border-black/[0.05] p-5 ${cls}`}>
      <div className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-ink-500">{label}</div>
      <div className="mt-1 display text-[40px] leading-none text-ink-900">{value}</div>
    </div>
  )
}
