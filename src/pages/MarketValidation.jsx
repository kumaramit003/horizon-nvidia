import React from 'react'
import { ShieldAlert, Lightbulb, TrendingUp, Database, ArrowRight, Sparkles } from 'lucide-react'
import { Card, SectionHeader, Confidence, Tag, AskWhyButton, VoiceCommandBlock, SourceChip } from '../components/ui'

const evidence = [
  { signal: 'High office density',      impact: 'Positive',     conf: 'Medium', sourceName: 'Workplace Zone Statistics',     sourceSlug: 'workplace-zone-statistics', tone: 'mint',     icon: TrendingUp },
  { signal: 'High competitor density',  impact: 'Risk',         conf: 'Medium', sourceName: 'Food Business Establishments',  sourceSlug: 'food-business-est',         tone: 'rose',     icon: ShieldAlert },
  { signal: 'Niche positioning',        impact: 'Opportunity',  conf: 'Medium', sourceName: '2021 Census · Religion by Ward',sourceSlug: 'census-2021-religion',      tone: 'lavender', icon: Lightbulb },
  { signal: 'Storefront cost exposure', impact: 'Risk',         conf: 'High',   sourceName: 'VOA Floor Space & Property',    sourceSlug: 'voa-floorspace',            tone: 'butter',   icon: Database },
]

const radarCats = [
  { label: 'Demand',      value: 0.78 },
  { label: 'Competition', value: 0.85 },
  { label: 'Cost',        value: 0.72 },
  { label: 'Location',    value: 0.50 },
  { label: 'Licensing',   value: 0.35 },
  { label: 'Operational', value: 0.55 },
  { label: 'Funding',     value: 0.65 },
]

const experiments = [
  { title: 'Interview 10 office managers',              impact: 'High',   effort: 'Low',    days: '3 days' },
  { title: 'Create a pre-order landing page',           impact: 'Medium', effort: 'Low',    days: '2 days' },
  { title: 'Test 3 menu bundles',                       impact: 'Medium', effort: 'Medium', days: '1 week' },
  { title: 'Run a 2-week corporate lunch pilot',        impact: 'High',   effort: 'High',   days: '2 weeks' },
  { title: 'Compare Liverpool Street vs Canary Wharf',  impact: 'Medium', effort: 'Low',    days: '3 days' },
]

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

export default function MarketValidation() {
  return (
    <div className="space-y-10">
      {/* Summary headline */}
      <Card className="relative overflow-hidden !p-9">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full gradient-soft-peach opacity-50 blur-2xl" />
        <div className="absolute -left-12 -bottom-16 h-48 w-48 rounded-full gradient-soft-mint opacity-40 blur-2xl" />
        <div className="relative">
          <Tag kind="Recommended">Verdict</Tag>
          <h2 className="mt-4 display text-[44px] leading-tight text-ink-900">
            Promising — but you'll have to <span className="italic-accent text-peach-500">earn it.</span>
          </h2>
          <p className="mt-4 max-w-[72ch] text-[16px] leading-relaxed text-ink-500">
            Demand signals around office density and corporate catering are real. The risks are competition and high rent exposure — both fixable if you start with B2B pre-orders before signing any lease.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Tag kind="Opportunity">Office density</Tag>
            <Tag kind="Opportunity">Niche differentiation</Tag>
            <Tag kind="Risk">Competitor saturation</Tag>
            <Tag kind="Risk">High rent exposure</Tag>
            <Tag kind="Missing Info">Live demand</Tag>
          </div>
        </div>
      </Card>

      {/* Stats strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Kpi label="Signals scanned" value="124" tone="cream-50" />
        <Kpi label="Strong positives" value="6"  tone="gradient-soft-mint" />
        <Kpi label="Notable risks"    value="3"  tone="gradient-soft-rose" />
        <Kpi label="Confidence"       value="Medium" sub tone="gradient-soft-butter" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr]">
        {/* Evidence */}
        <Card className="!p-7">
          <SectionHeader
            eyebrow="Evidence"
            title="What Jill has actually seen"
            right={<AskWhyButton>Sources</AskWhyButton>}
          />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {evidence.map(e => {
              const Icon = e.icon
              return (
                <div key={e.signal} className={`rounded-2xl border border-black/[0.05] p-5 gradient-soft-${e.tone}`}>
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/70">
                      <Icon size={15} className="text-ink-900" />
                    </span>
                    <span className="display text-[18px] text-ink-900">{e.signal}</span>
                    <span className={`ml-auto inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium ${impactPill(e.impact)}`}>{e.impact}</span>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-2 text-[12px] text-ink-700">
                    <SourceChip name={e.sourceName} slug={e.sourceSlug} />
                    <Confidence level={e.conf} />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        {/* Risk radar */}
        <Card className="!p-7">
          <SectionHeader eyebrow="Risk shape" title="Seven dimensions" description="Bigger = more concerning." />
          <div className="flex justify-center">
            <RiskRadar cats={radarCats} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12.5px]">
            {radarCats.map(c => (
              <div key={c.label} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-peach-500" />
                <span className="text-ink-700">{c.label}</span>
                <span className="ml-auto font-mono text-ink-500">{Math.round(c.value * 100)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recommendation */}
      <Card className="relative overflow-hidden !p-7">
        <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full gradient-soft-peach opacity-50 blur-2xl" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1">
            <Tag kind="Recommended" icon={Sparkles}>Recommended first wedge</Tag>
            <p className="mt-3 display text-[24px] leading-snug text-ink-900 max-w-[60ch]">
              Start with corporate pre-orders and office catering pilots. Don't sign a lease until <span className="italic-accent text-peach-500">10–20 recurring business customers</span> say yes.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <AskWhyButton />
            <button className="btn-coral text-[13px]">Apply to my plan <ArrowRight size={13} /></button>
          </div>
        </div>
      </Card>

      {/* Experiments + voice */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card className="!p-7">
          <SectionHeader
            eyebrow="Experiments"
            title="The cheapest ways to learn the most"
            right={<AskWhyButton>Re-rank</AskWhyButton>}
          />
          <ul className="space-y-2.5">
            {experiments.map((x, i) => (
              <li key={x.title} className="flex items-center gap-3.5 rounded-2xl bg-cream-50 px-4 py-3">
                <span className="display grid h-8 w-8 place-items-center rounded-full bg-white text-[14px] text-ink-900 shadow-soft">
                  {i + 1}
                </span>
                <span className="flex-1 text-[14px] text-ink-900">{x.title}</span>
                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium ${impactPill(x.impact === 'High' ? 'Opportunity' : 'Neutral')}`}>Impact {x.impact}</span>
                <span className="pill-cream">Effort {x.effort}</span>
                <span className="text-[11.5px] text-ink-500">{x.days}</span>
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
