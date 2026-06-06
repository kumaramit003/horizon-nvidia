import React from 'react'
import { Swords, ShieldCheck, TrendingUp, Trophy, Target } from 'lucide-react'
import { Card, SectionHeader, Tag, AskWhyButton, VoiceCommandBlock, SourceChip, EmptyPage, SectionLoading } from '../components/ui'

// Heuristic cell tone — good signals green, weak signals red, middle amber.
const cellTone = (v) => {
  const s = String(v || '').toLowerCase()
  if (['yes', 'high', 'strong', 'fast', 'good', '✓'].some(k => s.includes(k))) return 'bg-mint-100 text-ink-800 border-mint-200'
  if (['no', 'low', 'weak', 'slow', 'poor', '✗'].some(k => s.includes(k))) return 'bg-rose-100 text-ink-800 border-rose-200'
  return 'bg-butter-100 text-ink-800 border-butter-200'
}

const levelTag = (lvl) => (lvl === 'Low' ? 'Opportunity' : lvl === 'High' ? 'Risk' : 'Neutral')

export default function Competitors({ dashboard, section }) {
  const summary = dashboard?.competition_summary || ''
  const level = dashboard?.competition_level || ''
  const score = dashboard?.openness_score ?? null
  const competitors = dashboard?.competitors || []
  const edges = dashboard?.your_edges || []
  const matrix = dashboard?.matrix || null

  const hasAny = summary || competitors.length || edges.length || matrix
  if (!hasAny) {
    if (section === 'processing' || section === 'pending') return <SectionLoading label="the competition" />
    return <EmptyPage label="competitor analysis" />
  }

  const clearRunway = (score ?? 0) >= 65 || level === 'Low'

  return (
    <div className="space-y-10">
      {/* Hero — openness score framed positively */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card className="relative overflow-hidden !p-8">
          <div className={`absolute -right-16 -top-16 h-48 w-48 rounded-full ${clearRunway ? 'gradient-soft-mint' : 'gradient-soft-rose'} opacity-60 blur-2xl`} />
          <div className="relative">
            <div className="flex items-center gap-2">
              {level && <Tag kind={levelTag(level)}>{level} competition</Tag>}
              <Tag kind="Insight">Competitive landscape</Tag>
            </div>
            <h2 className="mt-4 display text-[38px] leading-tight text-ink-900">
              {clearRunway
                ? <>There's <span className="italic-accent text-mint-300">room to run.</span></>
                : <>It's crowded — <span className="italic-accent text-peach-500">so you need an edge.</span></>}
            </h2>
            {summary && <p className="mt-3 max-w-[62ch] text-[15.5px] leading-relaxed text-ink-500">{summary}</p>}
          </div>
        </Card>

        {score != null && (
          <Card className="relative overflow-hidden !p-7">
            <div className="absolute -right-8 -top-8 h-36 w-36 rounded-full gradient-soft-mint opacity-60 blur-2xl" />
            <div className="relative">
              <div className="section-eyebrow flex items-center gap-1.5">
                <Trophy size={12} className="text-mint-300" /> Market openness
              </div>
              <div className="mt-2 flex items-end gap-2">
                <span className="display text-[64px] leading-none text-ink-900">{score}</span>
                <span className="mb-2 text-[14px] text-ink-500">/ 100</span>
              </div>
              <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-cream-200">
                <div className="h-full rounded-full bg-gradient-to-r from-mint-200 to-mint-300" style={{ width: `${Math.max(4, Math.min(100, score))}%` }} />
              </div>
              <p className="mt-3 text-[12.5px] leading-snug text-ink-500">
                Higher means more whitespace — fewer players doing exactly what you'd do.
              </p>
            </div>
          </Card>
        )}
      </div>

      {/* Competitors or "clear field" */}
      <section>
        <SectionHeader
          eyebrow="Who you're up against"
          title={competitors.length ? `${competitors.length} player${competitors.length === 1 ? '' : 's'} to know` : 'No direct competitors found'}
          description={competitors.length ? 'Direct and indirect — with where each one leaves a gap.' : "Finn couldn't find anyone doing exactly this — that's your opening."}
          right={<AskWhyButton question="Who are my main competitors and how did you find them?">How found?</AskWhyButton>}
        />
        {competitors.length ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {competitors.map(c => (
              <div key={c.name} className="card relative overflow-hidden !p-5">
                <div className={`absolute -right-10 -top-10 h-28 w-28 rounded-full gradient-soft-${c.tone || 'sky'} opacity-50 blur-2xl`} />
                <div className="relative">
                  <div className="flex items-start gap-2">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-cream-100 text-ink-700">
                      <Swords size={15} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="display text-[18px] leading-tight text-ink-900">{c.name}</div>
                      <div className="mt-0.5 text-[12px] text-ink-500">{c.what}</div>
                    </div>
                    <Tag kind={c.kind === 'Direct' ? 'Risk' : 'Neutral'}>{c.kind}</Tag>
                  </div>
                  <div className="mt-4 space-y-2">
                    <Line icon={ShieldCheck} tone="text-sage-500" label="Their edge" value={c.edge} />
                    <Line icon={Target} tone="text-peach-500" label="Their gap" value={c.gap} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card className="!p-8 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-3xl gradient-soft-mint">
              <Trophy size={22} className="text-mint-300" />
            </div>
            <h3 className="mt-4 display text-[24px] text-forest-500">Clear field</h3>
            <p className="mt-2 mx-auto max-w-[420px] text-[14px] text-ink-500">
              No one is doing exactly this in your patch. That's rare — move fast and own the category before others notice.
            </p>
          </Card>
        )}
      </section>

      {/* Comparison matrix */}
      {matrix?.dimensions?.length > 0 && matrix?.players?.length > 0 && (
        <Card className="!p-7">
          <SectionHeader
            eyebrow="Side by side"
            title="How you stack up"
            description="You against the field, across the dimensions that matter for this idea."
          />
          <div className="overflow-x-auto rounded-2xl border border-black/[0.05]">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-cream-50 text-left text-[10.5px] font-medium uppercase tracking-[0.16em] text-ink-500">
                  <th className="px-4 py-3">Player</th>
                  {matrix.dimensions.map(d => <th key={d} className="px-4 py-3 whitespace-nowrap">{d}</th>)}
                </tr>
              </thead>
              <tbody>
                {matrix.players.map(p => (
                  <tr key={p.name} className={`border-t border-black/[0.04] ${p.you ? 'bg-peach-50/60' : 'hover:bg-cream-50'}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {p.you && <span className="grid h-5 w-5 place-items-center rounded-full bg-peach-500 text-[10px] font-bold text-white">★</span>}
                        <span className={`font-medium ${p.you ? 'text-peach-600' : 'text-ink-900'}`}>{p.name}</span>
                      </div>
                    </td>
                    {(p.cells || []).map((cell, i) => (
                      <td key={i} className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${cellTone(cell)}`}>{cell}</span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Your edges + voice */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card className="!p-7">
          <SectionHeader eyebrow="Your unfair advantages" title="How you win" />
          {edges.length ? (
            <ul className="space-y-2.5">
              {edges.map((e, i) => (
                <li key={i} className="flex items-start gap-3 rounded-2xl bg-cream-50 px-4 py-3">
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-mint-100 text-mint-300">
                    <TrendingUp size={14} />
                  </span>
                  <span className="text-[14px] leading-snug text-ink-900">{e}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[14px] text-ink-500">Finn is still working out your differentiators.</p>
          )}
        </Card>

        <VoiceCommandBlock
          commands={[
            'How do I beat the biggest competitor?',
            'What can I do that they cannot copy?',
            'Find more competitors I might be missing.',
          ]}
        />
      </div>
    </div>
  )
}

function Line({ icon: Icon, tone, label, value }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-2 rounded-xl bg-cream-50 px-3 py-2">
      <Icon size={13} className={`mt-0.5 shrink-0 ${tone}`} />
      <div className="min-w-0">
        <span className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-ink-500">{label}: </span>
        <span className="text-[13px] text-ink-900">{value}</span>
      </div>
    </div>
  )
}
