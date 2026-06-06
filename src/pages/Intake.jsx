import React, { useEffect, useState } from 'react'
import {
  Mic, MicOff, Pause, Sparkles, Check, ArrowRight,
  CornerDownLeft, Heart, Building2, MapPin, PoundSterling, Users, Quote,
  Database, ExternalLink
} from 'lucide-react'
import { Tag } from '../components/ui'

const CONVERSATION = [
  {
    speaker: 'jill',
    text: "Hi — I'm Jill. Tell me the idea you've been thinking about. In your own words, no jargon.",
  },
  {
    speaker: 'you',
    text: "I want to open a halal healthy lunch and corporate catering business near Liverpool Street for office workers.",
  },
  {
    speaker: 'jill',
    text: "Love that. Why this idea, why now — what made you think there's room for it?",
  },
  {
    speaker: 'you',
    text: "I'm Muslim, I work near there, and I can never find healthy halal lunch options. My friends keep saying the same thing.",
  },
  {
    speaker: 'jill',
    text: "Got it — that's a real, personal pain. Have you imagined how the first version looks? Storefront, pop-up, or delivery?",
  },
  {
    speaker: 'you',
    text: "Honestly, probably a small storefront. But I'm flexible — I don't have a lot of money to start.",
  },
  {
    speaker: 'jill',
    text: "Helpful. Roughly what's the budget — and is this full-time for you, or alongside the day job?",
  },
  {
    speaker: 'you',
    text: "Around £8 to 10k saved. I'd start it on the side and go full-time once I have customers.",
  },
]

const PROFILE_PROGRESS = [
  { at: 1, field: 'Idea',         value: 'Halal healthy lunch + corporate catering', icon: Sparkles },
  { at: 1, field: 'Area',         value: 'Near Liverpool Street, London',            icon: MapPin },
  { at: 3, field: 'Why',          value: 'Personal pain — no halal healthy options', icon: Heart },
  { at: 5, field: 'First version',value: 'Open to pop-up or delivery first',         icon: Building2 },
  { at: 7, field: 'Budget',       value: '~£8–10k, side-project to full-time',       icon: PoundSterling },
  { at: 7, field: 'Audience hint',value: 'Office workers · Muslim professionals',    icon: Users },
]

const QUESTIONS_LEFT = [
  'How will you measure if it’s working in the first 30 days?',
  'Do you already have anyone who would buy from you?',
  'What part of running this feels exciting? What part feels scary?',
]

const SIGNALS = [
  { title: 'Personal pain validated',          tone: 'mint',    note: 'You are the user — that lowers risk.' },
  { title: 'Niche differentiation',            tone: 'lavender',note: 'Halal + healthy is underserved in the area.' },
  { title: 'Cost-sensitive launch',            tone: 'butter',  note: '£10k pushes you toward pop-up or delivery first.' },
  { title: 'Office-heavy patch',               tone: 'sky',     note: 'B2B catering is likely your fastest wedge.' },
]

function VoiceOrb({ state }) {
  return (
    <div className="relative grid h-44 w-44 place-items-center">
      <span className="absolute inset-0 rounded-full gradient-orb opacity-90 blur-[2px] animate-breathe" />
      <span className="absolute inset-0 rounded-full bg-peach-300/40 animate-ringOut" />
      <span className="absolute inset-3 rounded-full gradient-orb shadow-[inset_0_4px_20px_rgba(255,255,255,0.45),inset_0_-20px_30px_rgba(224,78,31,0.35)]" />
      <span className="absolute inset-8 rounded-full bg-white/30 backdrop-blur-sm" />
      <div className="relative flex flex-col items-center">
        <Mic size={22} className="text-white drop-shadow" />
        <div className="mt-1 text-[11px] font-medium text-white/90 tracking-wide uppercase">
          {state === 'listening' ? 'Listening' : state === 'thinking' ? 'Thinking' : 'Speaking'}
        </div>
      </div>
    </div>
  )
}

function Waveform({ active = true }) {
  return (
    <div className="flex h-7 items-end gap-[3px]">
      {Array.from({ length: 18 }).map((_, i) => (
        <span
          key={i}
          className={`w-[3px] rounded-full bg-peach-400 ${active ? 'animate-wave' : 'opacity-40'}`}
          style={{
            height: `${30 + ((i * 17) % 65)}%`,
            animationDelay: `${(i % 9) * 70}ms`,
            animationDuration: `${800 + (i % 5) * 120}ms`,
          }}
        />
      ))}
    </div>
  )
}

export default function Intake({ onComplete }) {
  const [turn, setTurn] = useState(0)
  const [typed, setTyped] = useState('')
  const [orbState, setOrbState] = useState('listening')

  // step through conversation
  useEffect(() => {
    if (turn >= CONVERSATION.length) return
    const msg = CONVERSATION[turn]
    setOrbState(msg.speaker === 'jill' ? 'speaking' : 'listening')
    setTyped('')
    let i = 0
    const speed = msg.speaker === 'jill' ? 22 : 18
    const interval = setInterval(() => {
      i++
      setTyped(msg.text.slice(0, i))
      if (i >= msg.text.length) {
        clearInterval(interval)
        const next = setTimeout(() => {
          if (turn < CONVERSATION.length - 1) {
            setOrbState('thinking')
            setTimeout(() => setTurn(t => t + 1), 600)
          } else {
            setOrbState('thinking')
          }
        }, msg.speaker === 'jill' ? 700 : 900)
        return () => clearTimeout(next)
      }
    }, speed)
    return () => clearInterval(interval)
  }, [turn])

  const visibleMessages = CONVERSATION.slice(0, turn)
  const currentMessage = CONVERSATION[turn]
  const profileShown = PROFILE_PROGRESS.filter(p => p.at <= turn)
  const completionPct = Math.min(100, Math.round(((turn + 1) / CONVERSATION.length) * 100))

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-mesh">
      {/* nav */}
      <header className="relative z-10 mx-auto flex max-w-[1240px] items-center justify-between px-8 pt-8">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl gradient-orb shadow-soft">
            <span className="display text-[18px] italic text-white">f</span>
          </span>
          <div className="leading-tight">
            <div className="text-[14px] font-semibold tracking-tight text-ink-900">FounderOS</div>
            <div className="text-[10.5px] font-medium uppercase tracking-[0.18em] text-ink-500">London</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://data.london.gov.uk/dataset/"
            target="_blank"
            rel="noreferrer"
            className="pill bg-white hover:bg-cream-50"
          >
            <Database size={11} className="text-peach-500" /> Powered by London Datastore <ExternalLink size={10} />
          </a>
          <span className="pill"><span className="h-1.5 w-1.5 rounded-full bg-mint-300" /> Step 1 of 2 · Discovery</span>
          <button className="btn-ghost text-[12.5px]">Skip to plan <ArrowRight size={12} /></button>
        </div>
      </header>

      <div className="relative z-10 mx-auto grid max-w-[1240px] grid-cols-1 gap-8 px-8 pt-12 pb-16 lg:grid-cols-[1.15fr_1fr]">
        {/* Left — conversation */}
        <section>
          <div className="max-w-[520px]">
            <div className="section-eyebrow mb-3">Let's start a conversation</div>
            <h1 className="display text-[56px] leading-[1.05] text-ink-900">
              Tell me about the idea — <span className="italic-accent text-peach-500">I'll ask the rest.</span>
            </h1>
            <p className="mt-4 text-[15.5px] leading-relaxed text-ink-500">
              I'm Jill. I'll ask a few open questions, listen, and quietly build a profile of you and your idea on the right. No forms.
            </p>
          </div>

          {/* Orb + transcript */}
          <div className="mt-10 flex items-start gap-6">
            <VoiceOrb state={orbState} />
            <div className="flex-1 pt-2">
              <div className="flex items-center gap-3 text-[12px] text-ink-500">
                <Waveform active={orbState === 'listening'} />
                <span>{orbState === 'listening' ? 'You · speak naturally' : orbState === 'speaking' ? 'Jill is responding…' : 'Working on it…'}</span>
              </div>
              <div className="mt-3 rounded-2xl bg-white p-4 shadow-soft">
                <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-500">
                  {currentMessage?.speaker === 'you' ? 'You' : 'Jill'}
                </div>
                <p className="mt-1 text-[15.5px] leading-relaxed text-ink-900">
                  {typed}
                  <span className="ml-0.5 inline-block h-4 w-[2px] animate-cursor bg-peach-500 align-middle" />
                </p>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <button className="btn-coral text-[12.5px]"><Pause size={12} /> Pause</button>
                <button className="btn-ghost text-[12.5px]">Type instead <CornerDownLeft size={12} /></button>
                <button className="btn-ghost text-[12.5px]"><MicOff size={12} /> Mute</button>
              </div>
            </div>
          </div>

          {/* History */}
          <div className="mt-10">
            <div className="section-eyebrow mb-3">Conversation so far</div>
            <div className="space-y-3">
              {visibleMessages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.speaker === 'you' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed shadow-soft
                    ${m.speaker === 'you'
                      ? 'rounded-br-md bg-ink-900 text-cream-50'
                      : 'rounded-bl-md bg-white text-ink-900 border border-black/[0.04]'}`}
                  >
                    <div className={`mb-0.5 text-[10.5px] font-medium uppercase tracking-[0.16em] ${m.speaker === 'you' ? 'text-cream-300' : 'text-ink-500'}`}>
                      {m.speaker === 'you' ? 'You' : 'Jill'}
                    </div>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {turn >= CONVERSATION.length - 1 && (
            <div className="mt-8 rounded-3xl border border-black/[0.05] bg-white p-5 shadow-soft">
              <div className="flex items-center gap-2">
                <Database size={13} className="text-peach-500" />
                <div className="section-eyebrow">Next, Jill will pull from</div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {[
                  'Workplace Zone Statistics',
                  '2021 Census · Religion by Ward',
                  'London Business Demography',
                  'TfL Open Data',
                  'High Streets Health Check',
                  'GLA Funding Directory',
                  'VOA Floor Space',
                  '+ 5 more',
                ].map(d => (
                  <span key={d} className="pill-cream">{d}</span>
                ))}
              </div>
              <button onClick={onComplete} className="mt-5 btn-coral text-[14px] !px-5 !py-3">
                <Sparkles size={14} /> Build my business plan
              </button>
              <div className="mt-2 text-[12px] text-ink-500">~12 seconds to analyse, 7 sections to read.</div>
            </div>
          )}
        </section>

        {/* Right — building profile */}
        <aside className="lg:sticky lg:top-8 lg:self-start">
          <div className="card relative overflow-hidden">
            <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full gradient-soft-peach opacity-50 blur-2xl" />
            <div className="relative">
              <div className="flex items-center justify-between">
                <div className="section-eyebrow">Building a picture of you</div>
                <span className="pill"><span className="h-1.5 w-1.5 rounded-full bg-peach-500 animate-breathe" /> Live</span>
              </div>
              <h3 className="mt-2 display text-[28px] leading-tight text-ink-900">
                Founder profile <span className="italic-accent text-ink-500">draft</span>
              </h3>

              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between text-[12.5px] text-ink-500">
                  <span>Clarity so far</span>
                  <span className="font-mono text-ink-700">{completionPct}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-cream-200">
                  <div className="h-full rounded-full bg-gradient-to-r from-peach-400 to-peach-500 transition-all duration-700"
                    style={{ width: `${completionPct}%` }} />
                </div>
              </div>

              <ul className="mt-5 space-y-2.5">
                {PROFILE_PROGRESS.map((p, idx) => {
                  const Icon = p.icon
                  const filled = p.at <= turn
                  return (
                    <li
                      key={p.field + idx}
                      className={`flex items-start gap-3 rounded-2xl border p-3 transition-all
                        ${filled
                          ? 'border-black/[0.05] bg-cream-50'
                          : 'border-dashed border-ink-200 bg-white/40'}`}
                    >
                      <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl
                        ${filled ? 'gradient-soft-peach text-ink-900' : 'bg-cream-200 text-ink-300'}`}>
                        <Icon size={14} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className={`text-[10.5px] font-medium uppercase tracking-[0.16em] ${filled ? 'text-ink-500' : 'text-ink-300'}`}>
                          {p.field}
                        </div>
                        <div className={`mt-0.5 truncate text-[13.5px] ${filled ? 'text-ink-900' : 'text-ink-300'}`}>
                          {filled ? p.value : 'Coming up…'}
                        </div>
                      </div>
                      {filled && <Check size={14} className="mt-1 shrink-0 text-mint-300" />}
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>

          <div className="mt-5 card">
            <div className="section-eyebrow mb-2">Early signals Jill is picking up</div>
            <div className="grid grid-cols-1 gap-2">
              {SIGNALS.slice(0, Math.min(SIGNALS.length, Math.max(1, turn))).map(s => (
                <div key={s.title} className={`rounded-2xl border border-black/[0.04] p-3.5 gradient-soft-${s.tone}`}>
                  <div className="flex items-center gap-2">
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-white/70">
                      <Check size={11} className="text-ink-900" />
                    </span>
                    <div className="text-[13px] font-semibold text-ink-900">{s.title}</div>
                  </div>
                  <div className="mt-1.5 text-[12.5px] leading-relaxed text-ink-700">{s.note}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 card">
            <div className="flex items-center gap-2">
              <Quote size={13} className="text-peach-500" />
              <div className="section-eyebrow">Questions Jill still wants to ask</div>
            </div>
            <ul className="mt-3 space-y-2">
              {QUESTIONS_LEFT.map((q, i) => (
                <li key={q} className="flex items-start gap-2.5 text-[13.5px] text-ink-700">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-peach-300" />
                  {q}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}
