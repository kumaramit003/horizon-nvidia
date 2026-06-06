import React, { useState } from 'react'
import { MapPin, Layers, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react'
import { Card, SectionHeader, Tag, AskWhyButton, VoiceCommandBlock, SourceChip } from '../components/ui'

const locations = [
  { id: 'liverpool', name: 'Liverpool Street', demand: 'High',        compete: 'High',   transport: 'High', cost: 'High',   b2b: 'High',   reco: 'Best for office catering',  score: 78, x: 60, y: 42, primary: true },
  { id: 'canary',    name: 'Canary Wharf',     demand: 'High',        compete: 'Medium', transport: 'High', cost: 'High',   b2b: 'High',   reco: 'Strong corporate market',    score: 74, x: 78, y: 64 },
  { id: 'white',     name: 'Whitechapel',      demand: 'Medium',      compete: 'Medium', transport: 'High', cost: 'Medium', b2b: 'Medium', reco: 'Good for halal niche',       score: 66, x: 67, y: 47 },
  { id: 'stratford', name: 'Stratford',        demand: 'Medium-High', compete: 'Medium', transport: 'High', cost: 'Medium', b2b: 'Medium', reco: 'Good test market',           score: 64, x: 86, y: 30 },
]

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

function MapPlaceholder({ activeLayers, onToggle }) {
  return (
    <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-black/[0.06] bg-cream-50">
      <div className="absolute inset-0 dot-grid opacity-70" />
      <svg viewBox="0 0 100 60" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
        <path d="M -5 38 C 20 28, 35 50, 55 42 S 90 32, 110 40" fill="none" stroke="#7AABD4" strokeWidth="0.7" opacity="0.5" />
        <path d="M -5 38 C 20 28, 35 50, 55 42 S 90 32, 110 40" fill="none" stroke="#7AABD4" strokeWidth="3" opacity="0.10" />
      </svg>

      {activeLayers.customers && (
        <>
          <Blob x={60} y={42} color="rgba(255,146,89,0.32)" size={170} />
          <Blob x={78} y={62} color="rgba(255,146,89,0.28)" size={140} />
          <Blob x={86} y={30} color="rgba(255,146,89,0.20)" size={110} />
        </>
      )}
      {activeLayers.competitors && (
        <>
          <Blob x={58} y={40} color="rgba(255,138,145,0.28)" size={130} />
          <Blob x={76} y={62} color="rgba(255,138,145,0.22)" size={100} />
        </>
      )}
      {activeLayers.opportunity && <Blob x={67} y={47} color="rgba(157,217,171,0.30)" size={130} />}
      {activeLayers.transport && (
        <>
          <Pin x={60} y={42} label="LST" />
          <Pin x={78} y={62} label="CWF" />
          <Pin x={67} y={47} label="WCH" />
          <Pin x={86} y={30} label="STR" />
        </>
      )}

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

const Blob = ({ x, y, color, size }) => (
  <span className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl"
    style={{ left: `${x}%`, top: `${y}%`, width: size, height: size, background: color }} />
)
const Pin = ({ x, y, label }) => (
  <span className="absolute -translate-x-1/2 -translate-y-1/2 text-[9.5px] font-mono text-sky-300" style={{ left: `${x}%`, top: `${y - 5}%` }}>● {label}</span>
)

export default function Locations({ dashboard }) {
  const _locations = dashboard?.locations?.length ? dashboard.locations : locations
  const [activeLayers, setActiveLayers] = useState({ customers: true, competitors: true, transport: true, opportunity: false })
  const toggle = id => setActiveLayers(s => ({ ...s, [id]: !s[id] }))
  const selected = locations[0]

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
          <MapPlaceholder activeLayers={activeLayers} onToggle={toggle} />
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
              <Block label="What's good" tone="mint" items={[
                'Strong office density',
                'Excellent transport access',
                'High B2B catering potential',
              ]} />
              <Block label="Watch out" tone="rose" items={[
                'High competition',
                'Likely high rent',
                'Less weekend / family demand',
              ]} />
            </div>

            <div className="mt-5 rounded-2xl border border-peach-200 bg-peach-50 p-4">
              <Tag kind="Recommended">Finn's call</Tag>
              <p className="mt-2 text-[14px] leading-relaxed text-ink-900">
                Target Liverpool Street for B2B sales — but operate from a <span className="italic-accent text-peach-500">lower-cost kitchen or pop-up</span> before ever opening a storefront.
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
          title="Four areas, one comparison"
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
              {locations.map(l => (
                <tr key={l.id} className={`border-t border-black/[0.04] ${l.primary ? 'bg-peach-50/60' : 'hover:bg-cream-50'}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <MapPin size={13} className={l.primary ? 'text-peach-500' : 'text-sky-300'} />
                      <span className="font-medium text-ink-900">{l.name}</span>
                      {l.primary && <Tag kind="Recommended">Top pick</Tag>}
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
              'Liverpool Street weekend footfall drops sharply. Plan revenue for Mon–Fri at first.',
              'Stratford gives you the most price flexibility — useful for a cheaper pilot kitchen.',
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
            'What if I target weekend families?',
            'Find a lower-cost area with similar demand.',
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
