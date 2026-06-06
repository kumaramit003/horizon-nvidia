import React, { useEffect, useState } from 'react'
import { Mic, X, Sparkles, ArrowRight, Check } from 'lucide-react'
import { LeafMark } from './Brand'

const SCRIPT_PROMPT = "Finn, I only have £5k and I want to avoid a storefront."
const SCRIPT_RESPONSE = "Got it. I'll switch the plan to a lean route: pre-orders, rented kitchen hours, and corporate catering pilots. Liverpool Street stays as a B2B sales target — not a place to sign a lease."

const UPDATES = [
  { page: 'The idea',         detail: 'Direction → lean validation, no storefront yet.' },
  { page: 'Money & grants',   detail: 'Budget set to £5k. Storefront paths flagged out of range.' },
  { page: 'Your next 7 days', detail: '7-day plan rewritten — pre-orders + 2 pop-up partners.' },
  { page: 'Locations',        detail: 'Liverpool Street → B2B target, not a lease.' },
]

const SUGGESTIONS = [
  'Flora, challenge my riskiest assumption',
  'Finn, find grants',
  'Finn, add Canary Wharf',
  'Finn, halve the budget',
]

function Waveform({ active }) {
  return (
    <div className="flex h-9 items-end gap-[3px]">
      {Array.from({ length: 28 }).map((_, i) => (
        <span
          key={i}
          className={`w-[3px] rounded-full bg-sage-400 ${active ? 'animate-wave' : 'opacity-40'}`}
          style={{
            height: `${22 + ((i * 13) % 75)}%`,
            animationDelay: `${(i % 12) * 70}ms`,
            animationDuration: `${800 + (i % 5) * 120}ms`,
          }}
        />
      ))}
    </div>
  )
}

export default function VoiceAssistant({ open, onClose, onAppliedUpdate }) {
  const [phase, setPhase] = useState('listening')
  const [typedTranscript, setTypedTranscript] = useState('')
  const [typedResponse, setTypedResponse] = useState('')

  useEffect(() => {
    if (!open) return
    setPhase('listening')
    setTypedTranscript('')
    setTypedResponse('')
    let i = 0
    const t1 = setInterval(() => {
      i++
      setTypedTranscript(SCRIPT_PROMPT.slice(0, i))
      if (i >= SCRIPT_PROMPT.length) {
        clearInterval(t1)
        setTimeout(() => setPhase('thinking'), 350)
      }
    }, 32)
    return () => clearInterval(t1)
  }, [open])

  useEffect(() => {
    if (phase !== 'thinking') return
    const to = setTimeout(() => setPhase('responding'), 1100)
    return () => clearTimeout(to)
  }, [phase])

  useEffect(() => {
    if (phase !== 'responding') return
    let i = 0
    const t = setInterval(() => {
      i++
      setTypedResponse(SCRIPT_RESPONSE.slice(0, i))
      if (i >= SCRIPT_RESPONSE.length) {
        clearInterval(t)
        setTimeout(() => setPhase('applied'), 350)
      }
    }, 16)
    return () => clearInterval(t)
  }, [phase])

  useEffect(() => {
    if (phase === 'applied' && onAppliedUpdate) onAppliedUpdate(SCRIPT_PROMPT)
  }, [phase, onAppliedUpdate])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-6 sm:items-center sm:justify-center">
      <div className="absolute inset-0 bg-forest-700/30 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-[640px] overflow-hidden rounded-3xl border border-black/[0.06] bg-cream-50 shadow-lift">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full gradient-soft-peach opacity-60 blur-2xl" />
        <div className="pointer-events-none absolute -left-16 -bottom-16 h-48 w-48 rounded-full gradient-soft-mint opacity-50 blur-2xl" />

        <div className="relative flex items-center justify-between px-5 py-4 border-b border-black/[0.04]">
          <div className="flex items-center gap-3">
            <span className="relative grid h-9 w-9 place-items-center rounded-2xl gradient-orb-finn shadow-soft">
              <LeafMark size={15} className="opacity-95" />
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-sage-400 ring-2 ring-cream-50 animate-breathe" />
            </span>
            <div className="leading-tight">
              <div className="text-[14px] font-semibold text-forest-500">Refine with voice</div>
              <div className="text-[11.5px] text-ink-500">Say "Flora" or "Finn" — they'll route it</div>
            </div>
          </div>
          <button className="text-ink-500 hover:text-forest-500" onClick={onClose}>
            <X size={17} />
          </button>
        </div>

        <div className="relative px-5 pt-5">
          <Waveform active={phase === 'listening'} />
        </div>

        <div className="relative px-5 pt-5">
          <div className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-ink-500 mb-1.5">You</div>
          <div className="min-h-[44px] rounded-2xl bg-white px-3.5 py-3 text-[14px] text-forest-500 shadow-soft">
            {typedTranscript}
            {phase === 'listening' && <span className="ml-0.5 inline-block h-4 w-[2px] animate-cursor bg-sage-500 align-middle" />}
          </div>
        </div>

        <div className="relative px-5 pt-4">
          <div className="flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-[0.16em] text-ink-500 mb-1.5">
            <Sparkles size={11} className="text-sage-500" /> Finn
          </div>
          {phase === 'thinking' ? (
            <div className="flex items-center gap-2 rounded-2xl bg-white px-3.5 py-3 text-[13px] text-ink-500 shadow-soft">
              <span className="inline-flex gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-sage-400 animate-breathe" />
                <span className="h-1.5 w-1.5 rounded-full bg-sage-400 animate-breathe" style={{ animationDelay: '120ms' }} />
                <span className="h-1.5 w-1.5 rounded-full bg-sage-400 animate-breathe" style={{ animationDelay: '240ms' }} />
              </span>
              Routing to Action Plan, Money and Location modules…
            </div>
          ) : (
            <div className="rounded-2xl gradient-soft-mint px-3.5 py-3 text-[14px] leading-relaxed text-forest-500">
              {typedResponse}
              {phase === 'responding' && <span className="ml-0.5 inline-block h-4 w-[2px] animate-cursor bg-forest-500 align-middle" />}
            </div>
          )}
        </div>

        <div className="relative px-5 pt-5 pb-5">
          <div className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-ink-500 mb-2">Your plan, updating</div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {UPDATES.map((u, i) => (
              <div
                key={i}
                className={`flex items-start gap-2.5 rounded-2xl border border-black/[0.04] bg-white px-3 py-2.5 shadow-soft transition-all
                  ${phase === 'applied' ? 'opacity-100 translate-y-0' : 'opacity-50 translate-y-1'}`}
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-sage-100 text-forest-500">
                  <Check size={11} />
                </span>
                <div className="min-w-0 leading-tight">
                  <div className="text-[12.5px] font-semibold text-forest-500">{u.page}</div>
                  <div className="mt-0.5 text-[12px] text-ink-500">{u.detail}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map(s => (
                <button key={s} className="rounded-full border border-black/[0.06] bg-white px-3 py-1.5 text-[11.5px] text-forest-500 hover:bg-cream-50">
                  {s}
                </button>
              ))}
            </div>
            <button className="btn-forest text-[12.5px]" onClick={onClose}>
              Apply &amp; close <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function VoiceFab({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="group fixed bottom-6 right-6 z-40 flex items-center gap-2.5 rounded-full bg-forest-500 px-4 py-3 text-[13px] font-medium text-cream-50 shadow-[0_20px_50px_-12px_rgba(27,47,28,0.5)] transition-all hover:scale-[1.02] hover:bg-forest-600"
    >
      <span className="relative grid h-7 w-7 place-items-center rounded-full gradient-orb-finn">
        <LeafMark size={13} className="opacity-95" />
        <span className="absolute inset-0 animate-ringOut rounded-full bg-sage-300/40" />
      </span>
      Talk to Flora &amp; Finn
      <kbd className="ml-1 hidden rounded-md border border-cream-50/20 bg-cream-50/10 px-1.5 py-0.5 font-mono text-[10px] text-cream-50/80 sm:inline">⌘ ⇧ V</kbd>
    </button>
  )
}
