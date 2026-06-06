import React from 'react'
import { PoundSterling, ChefHat, Truck, Megaphone, ShieldCheck, FileText, Plus, ArrowRight, Pencil, Sparkles } from 'lucide-react'
import { Card, SectionHeader, Tag, Progress, AskWhyButton, VoiceCommandBlock, SourceChip } from '../components/ui'

const bands = [
  { title: 'Lean validation',  range: '£1k – £5k',     subtitle: 'Pre-orders + small pop-ups', tone: 'peach',   tag: 'Recommended', fill: 14 },
  { title: 'Pop-up / market',  range: '£5k – £20k',    subtitle: 'Stall, basic kit, packaging', tone: 'mint',    tag: 'Opportunity', fill: 32 },
  { title: 'Delivery kitchen', range: '£15k – £50k',   subtitle: 'Rented commercial kitchen hours', tone: 'sky', tag: 'Neutral',     fill: 60 },
  { title: 'Small storefront', range: '£50k – £150k+', subtitle: 'Lease, fit-out, staffing',    tone: 'rose',    tag: 'Risk',        fill: 95 },
]

const assumptions = [
  { row: 'Kitchen rental',          range: '£600 / mo',     notes: 'Shared commercial kitchen, 30 hrs/wk',  icon: ChefHat },
  { row: 'Food stock',              range: '£900 / mo',     notes: '30 covers/day × £5 COGS',                icon: PoundSterling },
  { row: 'Packaging',               range: '£180 / mo',     notes: 'Compostable bowls + lids',               icon: FileText },
  { row: 'Staff',                   range: '£0',            notes: 'Founder + helper from month 2',          icon: Sparkles },
  { row: 'Marketing',               range: '£250 / mo',     notes: 'LinkedIn, office partnerships',          icon: Megaphone },
  { row: 'Insurance',               range: '£40 / mo',      notes: 'Public liability + product cover',       icon: ShieldCheck },
  { row: 'Licences',                range: '£190 one-off',  notes: 'Food business registration, hygiene',    icon: FileText },
  { row: 'Delivery / logistics',    range: '£300 / mo',     notes: 'Stuart or local couriers',               icon: Truck },
  { row: 'Website / pre-order',     range: '£80 + £18/mo',  notes: 'Shopify-style storefront',               icon: FileText },
]

const grants = [
  { name: 'Local enterprise advice scheme',           fit: 72, why: '1-to-1 advisor support for early-stage London food businesses.',   notes: 'Likely free, eligibility based on borough', deadline: 'Rolling',           docs: ['Business idea', 'Founder background'], tone: 'mint' },
  { name: 'Small business support programme',         fit: 68, why: 'Cash + mentoring for unregistered or newly-registered businesses.',  notes: 'Borough + revenue thresholds apply',         deadline: 'Next cohort · ~6 wks', docs: ['Business plan', 'Cashflow forecast'], tone: 'peach' },
  { name: 'Food innovation / sustainability support', fit: 61, why: 'Rewards compostable packaging + halal-healthy positioning.',         notes: 'Sustainability angle helpful but optional',  deadline: 'Quarterly',         docs: ['Sustainability statement'], tone: 'lavender' },
  { name: 'Startup loan / business finance support',  fit: 59, why: 'Unsecured £500 – £25,000 with low APR for first-time founders.',     notes: 'Credit check + 3-yr forecast required',      deadline: 'Rolling',           docs: ['Personal SoA', 'Business plan'], tone: 'butter' },
]

export default function Financials({ dashboard }) {
  const _bands = dashboard?.cost_bands?.length ? dashboard.cost_bands : bands
  const _assumptions = dashboard?.monthly_assumptions?.length ? dashboard.monthly_assumptions : assumptions
  const _grants = dashboard?.grants?.length ? dashboard.grants : grants
  const _fundingReadiness = dashboard?.funding_readiness || 54
  return (
    <div className="space-y-10">
      {/* Bands */}
      <section>
        <SectionHeader
          eyebrow="Four ways to start"
          title="Pick the budget shape that fits your life"
          description="Indicative bands — voice your real number and Finn will recalculate."
          right={<AskWhyButton>Change currency</AskWhyButton>}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {bands.map(b => (
            <div key={b.title} className={`card relative overflow-hidden !p-6 ${b.tag === 'Recommended' ? 'ring-2 ring-peach-300' : ''}`}>
              <div className={`absolute -right-10 -top-10 h-32 w-32 rounded-full gradient-soft-${b.tone} opacity-70 blur-2xl`} />
              <div className="relative">
                <Tag kind={b.tag === 'Neutral' ? 'Neutral' : b.tag}>{b.tag === 'Neutral' ? 'Option' : b.tag}</Tag>
                <div className="mt-3 display text-[22px] leading-tight text-ink-900">{b.title}</div>
                <div className="mt-1 font-mono text-[20px] text-peach-500">{b.range}</div>
                <div className="mt-2 text-[13px] text-ink-500">{b.subtitle}</div>
                <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-cream-200">
                  <div className="h-full bg-peach-500" style={{ width: `${b.fill}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr_1fr]">
        {/* Assumptions */}
        <Card className="!p-7">
          <SectionHeader
            eyebrow="Where the money goes"
            title="Monthly estimates you can edit"
            description="Click any row to override — totals recalculate."
            right={<button className="btn-ghost text-[12.5px]"><Plus size={12} /> Add line</button>}
          />
          <div className="overflow-hidden rounded-2xl border border-black/[0.05]">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-cream-50 text-left text-[10.5px] font-medium uppercase tracking-[0.16em] text-ink-500">
                  <th className="px-4 py-3">Line</th>
                  <th className="px-4 py-3">Estimate</th>
                  <th className="px-4 py-3">Notes</th>
                  <th className="px-4 py-3 text-right">Edit</th>
                </tr>
              </thead>
              <tbody>
                {assumptions.map(a => {
                  const Icon = a.icon
                  return (
                    <tr key={a.row} className="border-t border-black/[0.04] hover:bg-cream-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="grid h-7 w-7 place-items-center rounded-xl bg-cream-100 text-ink-700">
                            <Icon size={12} />
                          </span>
                          <span className="text-ink-900">{a.row}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-ink-900">{a.range}</td>
                      <td className="px-4 py-3 text-ink-500">{a.notes}</td>
                      <td className="px-4 py-3 text-right">
                        <button className="btn-ghost !py-1 !px-2 text-[11.5px]"><Pencil size={11} /> Edit</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-black/[0.05] bg-cream-100">
                  <td className="px-4 py-3 font-semibold text-ink-900">Estimated monthly burn</td>
                  <td className="px-4 py-3 font-mono text-peach-500 text-[15px]">£2,288</td>
                  <td className="px-4 py-3 text-ink-500" colSpan={2}>≈ 4 months runway on £10k</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>

        {/* Funding readiness */}
        <Card className="relative overflow-hidden !p-7">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full gradient-soft-butter opacity-60 blur-2xl" />
          <div className="relative">
            <SectionHeader eyebrow="Funding readiness" title="You're 54% ready" right={<AskWhyButton />} />
            <div className="flex items-end gap-2">
              <span className="display text-[64px] leading-none text-ink-900">54</span>
              <span className="mb-2 text-[15px] text-ink-500">/ 100</span>
            </div>
            <div className="mt-3"><Progress value={54} /></div>
            <div className="mt-5">
              <div className="section-eyebrow mb-2">Still missing</div>
              <ul className="space-y-1.5 text-[13px]">
                {[
                  'Business registration status',
                  'Founder background',
                  'Borough',
                  'Trading history',
                  'Social impact angle',
                  'Sustainability angle',
                ].map(m => (
                  <li key={m} className="flex items-center gap-2 rounded-full bg-butter-100 px-3 py-1.5 text-ink-900 w-fit">
                    <span className="h-1.5 w-1.5 rounded-full bg-butter-300" /> {m}
                  </li>
                ))}
              </ul>
            </div>
            <button className="mt-5 btn-coral w-full text-[13px]">
              Complete profile with voice <ArrowRight size={13} />
            </button>
          </div>
        </Card>
      </div>

      {/* Grants */}
      <section>
        <SectionHeader
          eyebrow="Funding & support"
          title="Potentially relevant schemes"
          description="Matched from the GLA Funding & Support directory on the London Datastore."
          right={
            <div className="flex items-center gap-1.5">
              <SourceChip name="GLA Funding & Support Directory" slug="gla-funding-support" small />
              <AskWhyButton>Re-match</AskWhyButton>
            </div>
          }
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {grants.map(g => (
            <div key={g.name} className="card relative overflow-hidden !p-6">
              <div className={`absolute -right-10 -top-10 h-36 w-36 rounded-full gradient-soft-${g.tone} opacity-50 blur-2xl`} />
              <div className="relative">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="display text-[20px] leading-tight text-ink-900">{g.name}</div>
                    <div className="mt-2 flex items-center gap-2">
                      <Tag kind="Opportunity">Potentially relevant</Tag>
                      <span className="pill-cream">Deadline: {g.deadline}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="display text-[36px] leading-none text-peach-500">{g.fit}%</div>
                    <div className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-ink-500">Fit</div>
                  </div>
                </div>
                <p className="mt-4 text-[14px] leading-relaxed text-ink-900">{g.why}</p>
                <div className="mt-3 text-[12.5px] text-ink-500">Eligibility: {g.notes}</div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {g.docs.map(d => <span key={d} className="pill-cream"><FileText size={10} /> {d}</span>)}
                </div>
                <div className="mt-4"><Progress value={g.fit} /></div>
                <div className="mt-4 flex items-center gap-2">
                  <button className="btn-ghost text-[12.5px]">Review</button>
                  <button className="btn-coral text-[12.5px]">Draft application <ArrowRight size={12} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <VoiceCommandBlock
        commands={[
          'Assume I only have £5k.',
          'Find grants for a woman-led food business.',
          'Make this plan work without a shopfront.',
        ]}
      />
    </div>
  )
}
