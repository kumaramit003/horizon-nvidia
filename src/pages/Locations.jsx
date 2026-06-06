import React, { useState } from 'react'
import { MapPin, Layers, AlertTriangle, ArrowRight } from 'lucide-react'
import { Card, SectionHeader, Tag, AskWhyButton, VoiceCommandBlock, SourceChip, EmptyPage } from '../components/ui'

const layers = [
  { id: 'customers',  label: 'Customer density', color: '#FF9259' },
  { id: 'competitors',label: 'Competitors',      color: '#FF8A91' },
  { id: 'transport',  label: 'Transport hubs',   color: '#7AABD4' },
  { id: 'opportunity',label: 'Opportunity',      color: '#9DD9AB' },
]

const goodTone = (v) =>
  v === 'High' || v === 'Medium-High' ? 'bg-mint-100 border-mint-200 text-ink-800'
  : v === 'Medium' ? 'bg-butter-100 border-butter-200 text-ink-800'
  : 'bg-rose-100 border-rose-200 text-ink-800'

const badTone = (v) =>
  v === 'High' ? 'bg-rose-100 border-rose-200 text-ink-800'
  : v === 'Medium' ? 'bg-butter-100 border-butter-200 text-ink-800'
  : 'bg-mint-100 border-mint-200 text-ink-800'

const isStrong = (v) => v === 'High' || v === 'Medium-High'

const Blob = ({ x, y, color, size }) => (
  <span className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl"
    style={{ left: `${x}%`, top: `${y}%`, width: size, height: size, background: color }} />
)
const Pin = ({ x, y, label }) => (
  <span className="absolute -translate-x-1/2 -translate-y-1/2 text-[9.5px] font-mono text-sky-300" style={{ left: `${x}%`, top: `${y - 5}%` }}>● {label}</span>
)

function MapPlaceholder({ locations, activeLayers, onToggle }) {
  return (
    <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-black/[0.06] bg-cream-50">
      <div className="absolute inset-0 dot-grid opacity-70" />
      <svg viewBox="0 0 100 60" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
        <path d="M -5 38 C 20 28, 35 50, 55 42 S 90 32, 110 40" fill="none" stroke="#7AABD4" strokeWidth="0.7" opacity="0.5" />
        <path d="M -5 38 C 20 28, 35 50, 55 42 S 90 32, 110 40" fill="none" stroke="#7AABD4" strokeWidth="3" opacity="0.10" />
      </svg>

      {/* Demand/opportunity/transport overlays derived from the real locations */}
      {activeLayers.customers && locations.map(l => (
        <Blob key={`c-${l.id}`} x={l.x} y={l.y} color="rgba(255,146,89,0.30)" size={isStrong(l.demand) ? 170 : 120} />
      ))}
      {activeLayers.competitors && locations.filter(l => l.compete === 'High').map(l => (
        <Blob key={`x-${l.id}`} x={l.x} y={l.y} color="rgba(255,138,145,0.26)" size={120} />
      ))}
      {activeLayers.opportunity && locations.filter(l => l.score >= 65).map(l => (
        <Blob key={`o-${l.id}`} x={l.x} y={l.y} color="rgba(157,217,171,0.28)" size={120} />
      ))}
      {activeLayers.transport && locations.filter(l => isStrong(l.transport)).map(l => (
        <Pin key={`t-${l.id}`} x={l.x} y={l.y} label={l.name.slice(0, 3).toUpperCase()} />
      ))}

      {locations.map(l => (
        <button key={l.id} className="absolute z-10 -translate-x-1/2 -translate-y-1/2" style={{ left: `${l.x}%`, top: `${l.y}%` }}>
          <span className="relative flex h-3.5 w-3.5 items-center justify-center">
            <span className={`absolute h-full w-full animate-ringOut rounded-full ${l.primary ? 'bg-peach-300/50' : 'bg-sky-300/40'}`} />
            <span className={`relative h-2.5 w-2.5 rounded-full ${l.primary ? 'bg-peach-500' : 'bg-sky-300'} ring-2 ring-white shadow-soft`} />
          </span>
          <span className="absolute left-1/2 top-4 -translate-x-1/2 whitespace-nowrap rounded-md border border-black/[0.05] bg-white px-2 py-0.5 text-[10.5px] font-medium text-ink-900 shadow-soft">
            {l.name}
          </span>
        </button>
      ))}

      <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center gap-1.5 rounded-full border border-black/[0.06] bg-white/90 p-1 backdrop-blur">
        {layers.map(l => (
          <button
            key={l.id}
            onClick={() => onToggle(l.id)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors ${activeLayers[l.id] ? 'bg-cream-100 text-ink-900' : 'text-ink-500 hover:bg-cream-50'}`}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: l.color, opacity: activeLayers[l.id] ? 1 : 0.35 }} />
            {l.label}
          </button>
        ))}
      </div>
      <div className="absolute right-3 top-3 pill"><Layers size={11} /> Greater London · stylised</div>
    </div>
  )
}

function deriveGood(loc) {
  const out = []
  if (isStrong(loc.demand)) out.push('Strong customer demand')
  if (isStrong(loc.transport)) out.push('Excellent transport access')
  if (isStrong(loc.b2b)) out.push('High B2B potential')
  if (loc.cost === 'Low' || loc.cost === 'Medium') out.push('Manageable cost base')
  if (loc.compete === 'Low' || loc.compete === 'Medium') out.push('Less crowded market')
  return out.length ? out : ['A balanced all-round option']
}

function deriveWatch(loc) {
  const out = []
  if (loc.compete === 'High') out.push('High competition')
  if (loc.cost === 'High') out.push('Likely high rent / rates')
  if (!isStrong(loc.demand)) out.push('Demand needs validation')
  if (!isStrong(loc.transport)) out.push('Transport access is limited')
  return out.length ? out : ['No major red flags — still validate locally']
}

export default function Locations({ dashboard }) {
  const _locations = dashboard?.locations?.length ? dashboard.locations : []
  const [activeLayers, setActiveLayers] = useState({ customers: true, competitors: true, transport: true, opportunity: false })
  const toggle = id => setActiveLayers(s => ({ ...s, [id]: !s[id] }))

  if (!_locations.length) return <EmptyPage label="location analysis" />

  // Top pick = explicit primary, else highest score.
  const selected = _locations.find(l => l.primary) || [..._locations].sort((a, b) => b.score - a.score)[0]

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card className="!p-7">
          <SectionHeader
            eyebrow="London at a glance"
            title="Where the demand lives"
            description="Layers built from public London Datastore sources."
            right={<AskWhyButton>Data sources</AskWhyButton>}
          />
          <MapPlaceholder locations={_locations} activeLayers={activeLayers} onToggle={toggle} />
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-500">Built from</span>
            <SourceChip name="Workplace Zone Statistics" slug="workplace-zone-statistics" small />
            <SourceChip name="TfL Open Data" slug="tfl-open-data" small />
            <SourceChip name="High Streets Health Check" slug="high-streets-health" small />
            <SourceChip name="London Borough Profiles" slug="borough-profiles" small />
          </div>
        </Card>

        <Card className="relative overflow-hidden !p-7">
          <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full gradient-soft-peach opacity-60 blur-2xl" />
          <div className="relative">
            <Tag kind="Recommended">Top pick</Tag>
            <h3 className="mt-3 display text-[34px] leading-tight text-ink-900">
              {selected.name}
            </h3>
            <div className="mt-2 flex items-end gap-2">
              <span className="display text-[52px] leading-none text-peach-500">{selected.score}</span>
              <span className="mb-2 text-[14px] text-ink-500">/ 100 fit</span>
            </div>

            <div className="mt-5 space-y-3">
              <Block label="What's good" tone="mint" items={deriveGood(selected)} />
              <Block label="Watch out" tone="rose" items={deriveWatch(selected)} />
            </div>

            <div className="mt-5 rounded-2xl border border-peach-200 bg-peach-50 p-4">
              <Tag kind="Recommended">Finn's call</Tag>
              <p className="mt-2 text-[14px] leading-relaxed text-ink-900">
                {selected.reco || `${selected.name} scores ${selected.score}/100 on fit for this business.`}
              </p>
              <button className="mt-3 btn-coral text-[12.5px]">Apply to plan <ArrowRight size={12} /></button>
            </div>
          </div>
        </Card>
      </div>

      {/* Comparison */}
      <Card className="!p-7">
        <SectionHeader
          eyebrow="Locations side by side"
          title={`${_locations.length} area${_locations.length === 1 ? '' : 's'}, one comparison`}
          right={<button className="btn-ghost text-[12.5px]"><MapPin size={12} /> Add area</button>}
        />
        <div className="overflow-hidden rounded-2xl border border-black/[0.05]">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-cream-50 text-left text-[10.5px] font-medium uppercase tracking-[0.16em] text-ink-500">
                <th className="px-4 py-3">Area</th>
                <th className="px-4 py-3">Demand</th>
                <th className="px-4 py-3">Competition</th>
                <th className="px-4 py-3">Transport</th>
                <th className="px-4 py-3">Cost</th>
                <th className="px-4 py-3">B2B</th>
                <th className="px-4 py-3">In short</th>
              </tr>
            </thead>
            <tbody>
              {_locations.map(l => (
                <tr key={l.id} className={`border-t border-black/[0.04] ${l.id === selected.id ? 'bg-peach-50/60' : 'hover:bg-cream-50'}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <MapPin size={13} className={l.id === selected.id ? 'text-peach-500' : 'text-sky-300'} />
                      <span className="font-medium text-ink-900">{l.name}</span>
                      {l.id === selected.id && <Tag kind="Recommended">Top pick</Tag>}
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${goodTone(l.demand)}`}>{l.demand}</span></td>
                  <td className="px-4 py-3"><span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${badTone(l.compete)}`}>{l.compete}</span></td>
                  <td className="px-4 py-3"><span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${goodTone(l.transport)}`}>{l.transport}</span></td>
                  <td className="px-4 py-3"><span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${badTone(l.cost)}`}>{l.cost}</span></td>
                  <td className="px-4 py-3"><span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${goodTone(l.b2b)}`}>{l.b2b}</span></td>
                  <td className="px-4 py-3 text-ink-700">{l.reco}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card className="!p-7">
          <SectionHeader eyebrow="Before you commit" title="Things to validate first" />
          <ul className="space-y-3">
            {[
              'Rent and rates differ massively street-by-street — get quotes from 3 agents before estimating cashflow.',
              'Footfall varies by day and season. Confirm the demand pattern matches your opening hours.',
              `${selected.name} is your top pick, but visit each shortlisted area in person before committing.`,
            ].map((t) => (
              <li key={t} className="flex gap-3 rounded-2xl bg-cream-50 px-4 py-3 text-[14px] text-ink-900">
                <AlertTriangle size={15} className="mt-0.5 shrink-0 text-butter-300" />
                {t}
              </li>
            ))}
          </ul>
        </Card>

        <VoiceCommandBlock
          commands={[
            'Compare with Shoreditch.',
            'Find a lower-cost area with similar demand.',
            'Which area is best for a lean start?',
          ]}
        />
      </div>
    </div>
  )
}

function Block({ label, tone, items }) {
  const dot = tone === 'mint' ? 'bg-mint-300' : 'bg-rose-300'
  return (
    <div className="rounded-2xl bg-cream-50 px-4 py-3.5">
      <div className="section-eyebrow mb-2">{label}</div>
      <ul className="space-y-1.5 text-[13.5px] text-ink-900">
        {items.map(i => (
          <li key={i} className="flex items-start gap-2"><span className={`mt-1.5 h-1.5 w-1.5 rounded-full ${dot}`} />{i}</li>
        ))}
      </ul>
    </div>
  )
}
