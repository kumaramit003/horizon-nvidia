import React, { useState, useEffect } from 'react'
import { Plus, ArrowRight, Trash2, FileText } from 'lucide-react'
import { Card, SectionHeader, Tag, Progress, AskWhyButton, VoiceCommandBlock, SourceChip, EmptyPage, SectionLoading } from '../components/ui'
import { DynIcon } from '../lib/icons'

// Best-effort monthly burn: sum the first £-amount of any row that reads
// "/ mo" (i.e. recurring). One-off costs are ignored.
function estimateMonthlyBurn(rows) {
  let total = 0
  let counted = 0
  for (const r of rows) {
    const range = (r.range || '')
    if (!/\/\s*mo/i.test(range)) continue
    const m = range.replace(/,/g, '').match(/£\s*(\d+(?:\.\d+)?)/)
    if (m) { total += parseFloat(m[1]); counted++ }
  }
  return counted ? total : null
}

export default function Financials({ dashboard, section }) {
  const _bands = dashboard?.cost_bands?.length ? dashboard.cost_bands : []
  const _assumptions = dashboard?.monthly_assumptions?.length ? dashboard.monthly_assumptions : []
  const _grants = dashboard?.grants?.length ? dashboard.grants : []
  const _fundingReadiness = dashboard?.funding_readiness ?? 0

  const hasAny = _bands.length || _assumptions.length || _grants.length
  if (!hasAny) {
    if (section === 'processing' || section === 'pending') return <SectionLoading label="money & grants" />
    return <EmptyPage label="financial analysis" />
  }

  return (
    <div className="space-y-10">
      {/* Bands */}
      <section>
        <SectionHeader
          eyebrow={`${_bands.length} way${_bands.length === 1 ? '' : 's'} to start`}
          title="Pick the budget shape that fits your life"
          description="Indicative bands — voice your real number and Finn will recalculate."
          right={<AskWhyButton>Change currency</AskWhyButton>}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {_bands.map(b => (
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
        {/* Assumptions — editable */}
        <AssumptionsTable initial={_assumptions} />

        {/* Funding readiness */}
        <Card className="relative overflow-hidden !p-7">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full gradient-soft-butter opacity-60 blur-2xl" />
          <div className="relative">
            <SectionHeader eyebrow="Funding readiness" title={`You're ${_fundingReadiness}% ready`} right={<AskWhyButton />} />
            <div className="flex items-end gap-2">
              <span className="display text-[64px] leading-none text-ink-900">{_fundingReadiness}</span>
              <span className="mb-2 text-[15px] text-ink-500">/ 100</span>
            </div>
            <div className="mt-3"><Progress value={_fundingReadiness} /></div>
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
          {_grants.map(g => (
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

// Editable monthly-cost table. Seeds from Finn's estimates, lets the founder
// override any cell, add or delete rows, and recomputes the monthly burn live.
function AssumptionsTable({ initial }) {
  const seed = () => (initial || []).map((a, i) => ({
    id: `${i}-${a.row || 'row'}`,
    row: a.row || '',
    range: a.range || '',
    notes: a.notes || '',
    icon: a.icon || 'PoundSterling',
  }))
  const [rows, setRows] = useState(seed)

  // Re-seed when Finn regenerates this section (new dashboard data).
  useEffect(() => { setRows(seed()) /* eslint-disable-next-line */ }, [JSON.stringify(initial)])

  const update = (id, field, value) =>
    setRows(rs => rs.map(r => (r.id === id ? { ...r, [field]: value } : r)))
  const remove = (id) => setRows(rs => rs.filter(r => r.id !== id))
  const add = () =>
    setRows(rs => [...rs, { id: `new-${Date.now()}`, row: '', range: '', notes: '', icon: 'Plus' }])

  const burn = estimateMonthlyBurn(rows)

  return (
    <Card className="!p-7">
      <SectionHeader
        eyebrow="Where the money goes"
        title="Monthly estimates you can edit"
        description="Edit any cell — the monthly burn recalculates as you type."
        right={<button onClick={add} className="btn-ghost text-[12.5px]"><Plus size={12} /> Add line</button>}
      />
      <div className="overflow-hidden rounded-2xl border border-black/[0.05]">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-cream-50 text-left text-[10.5px] font-medium uppercase tracking-[0.16em] text-ink-500">
              <th className="px-4 py-3">Line</th>
              <th className="px-4 py-3 w-[140px]">Estimate</th>
              <th className="px-4 py-3">Notes</th>
              <th className="px-3 py-3 w-[44px]"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t border-black/[0.04] hover:bg-cream-50/60">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-cream-100 text-ink-700">
                      <DynIcon name={r.icon} size={12} />
                    </span>
                    <input
                      value={r.row}
                      onChange={e => update(r.id, 'row', e.target.value)}
                      placeholder="Cost item"
                      className="w-full min-w-0 bg-transparent text-ink-900 outline-none placeholder:text-ink-300 focus:bg-white focus:rounded-md focus:px-1.5 focus:py-0.5"
                    />
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <input
                    value={r.range}
                    onChange={e => update(r.id, 'range', e.target.value)}
                    placeholder="£X / mo"
                    className="w-full min-w-0 bg-transparent font-mono text-ink-900 outline-none placeholder:text-ink-300 focus:bg-white focus:rounded-md focus:px-1.5 focus:py-0.5"
                  />
                </td>
                <td className="px-4 py-2.5">
                  <input
                    value={r.notes}
                    onChange={e => update(r.id, 'notes', e.target.value)}
                    placeholder="Note"
                    className="w-full min-w-0 bg-transparent text-ink-500 outline-none placeholder:text-ink-300 focus:bg-white focus:rounded-md focus:px-1.5 focus:py-0.5"
                  />
                </td>
                <td className="px-3 py-2.5 text-right">
                  <button
                    onClick={() => remove(r.id)}
                    className="grid h-7 w-7 place-items-center rounded-lg text-ink-400 hover:bg-rose-100 hover:text-rose-300"
                    title="Remove line"
                  >
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-[13px] text-ink-400">No lines yet — add one.</td></tr>
            )}
          </tbody>
          {burn != null && (
            <tfoot>
              <tr className="border-t border-black/[0.05] bg-cream-100">
                <td className="px-4 py-3 font-semibold text-ink-900">Estimated monthly burn</td>
                <td className="px-4 py-3 font-mono text-peach-500 text-[15px]">£{burn.toLocaleString()}</td>
                <td className="px-4 py-3 text-ink-500" colSpan={2}>Recurring monthly costs only</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </Card>
  )
}
