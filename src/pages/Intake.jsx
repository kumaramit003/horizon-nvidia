import React, { useEffect, useState } from 'react'
import { Mic, MicOff, Pause, Sparkles, ArrowRight, CornerDownLeft, Database, ExternalLink } from 'lucide-react'

const CONVERSATION = [
  { speaker: 'jill', text: "Hey — I'm Jill. Before anything, take a breath. What's the idea that's been on your mind?" },
  { speaker: 'you',  text: "I want to open a halal healthy lunch and corporate catering business near Liverpool Street." },
  { speaker: 'jill', text: "I love that. What made you think there's space for it — why this, why now?" },
  { speaker: 'you',  text: "I'm Muslim, I work near there, and I can never find healthy halal lunch. My friends say the same." },
  { speaker: 'jill', text: "That's the best kind of idea — one you needed yourself. How are you imagining the first version?" },
  { speaker: 'you',  text: "Probably a small storefront. But I'm flexible — I don't have a lot of money to start." },
  { speaker: 'jill', text: "Honest answers help me protect you. Roughly what's the budget, and is this full-time or alongside a day job?" },
  { speaker: 'you',  text: "Around £8 to 10k saved. I'd start it on the side and go full-time once I have customers." },
  { speaker: 'jill', text: "Perfect. I have everything I need to start. Give me twelve seconds — I'll come back with a plan you can actually do." },
]

const MOTIVATIONAL = [
  "Every founder started exactly where you are.",
  "There are no bad ideas — only ones that haven't been tested yet.",
  "The first conversation is the hardest. You're doing it.",
  "Speak the way you'd speak to a friend who believes in you.",
  "Clarity isn't a prerequisite. It's the output.",
  "I'll listen for what you don't say.",
  "Tell me what excites you, not what sounds smart.",
  "You're closer than you think.",
  "Now — let me read London for you.",
]

function Orb({ state }) {
  return (
    <div className="relative grid place-items-center" style={{ width: 280, height: 280 }}>
      <span className="absolute inset-0 rounded-full bg-peach-300/20 blur-3xl animate-breathe" />
      <span className="absolute inset-6 rounded-full bg-peach-200/40 blur-2xl animate-breathe" style={{ animationDelay: '500ms' }} />
      <span className="absolute inset-12 rounded-full gradient-orb opacity-95 blur-[1px] animate-breathe" style={{ animationDelay: '200ms' }} />
      <span className="absolute inset-16 rounded-full gradient-orb shadow-[inset_0_8px_30px_rgba(255,255,255,0.5),inset_0_-30px_50px_rgba(224,78,31,0.4)]" />
      <span className="absolute inset-[88px] rounded-full bg-white/30 backdrop-blur-sm" />

      {state !== 'idle' && (
        <>
          <span className="absolute inset-0 rounded-full border border-peach-300/40 animate-ringOut" />
          <span className="absolute inset-0 rounded-full border border-peach-300/30 animate-ringOut" style={{ animationDelay: '800ms' }} />
        </>
      )}

      <div className="relative flex flex-col items-center text-white">
        <Mic size={26} className="drop-shadow" />
        <div className="mt-2 text-[10.5px] font-medium uppercase tracking-[0.22em] text-white/90">
          {state === 'listening' ? 'Listening' : state === 'thinking' ? 'Thinking' : state === 'speaking' ? 'Jill' : 'Tap to begin'}
        </div>
      </div>
    </div>
  )
}

function Waveform({ active }) {
  return (
    <div className="flex h-6 items-end gap-[3px]">
      {Array.from({ length: 22 }).map((_, i) => (
        <span
          key={i}
          className={`w-[3px] rounded-full bg-peach-400 ${active ? 'animate-wave' : 'opacity-30'}`}
          style={{
            height: `${28 + ((i * 19) % 60)}%`,
            animationDelay: `${(i % 11) * 70}ms`,
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
  const [analysing, setAnalysing] = useState(false)
  const [analysisDone, setAnalysisDone] = useState(false)

  useEffect(() => {
    if (turn >= CONVERSATION.length) return
    const msg = CONVERSATION[turn]
    setOrbState(msg.speaker === 'jill' ? 'speaking' : 'listening')
    setTyped('')
    let i = 0
    const speed = msg.speaker === 'jill' ? 26 : 20
    const interval = setInterval(() => {
      i++
      setTyped(msg.text.slice(0, i))
      if (i >= msg.text.length) {
        clearInterval(interval)
        setTimeout(() => {
          if (turn < CONVERSATION.length - 1) {
            setOrbState('thinking')
            setTimeout(() => setTurn(t => t + 1), 550)
          } else {
            setAnalysing(true)
            setOrbState('thinking')
          }
        }, msg.speaker === 'jill' ? 700 : 800)
      }
    }, speed)
    return () => clearInterval(interval)
  }, [turn])

  useEffect(() => {
    if (!analysing) return
    const t = setTimeout(() => setAnalysisDone(true), 4500)
    return () => clearTimeout(t)
  }, [analysing])

  const currentMessage = CONVERSATION[turn]
  const completion = Math.min(100, Math.round(((turn + 1) / CONVERSATION.length) * 100))
  const motivational = MOTIVATIONAL[Math.min(turn, MOTIVATIONAL.length - 1)]

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-mesh">
      {/* faint dot grid */}
      <div className="pointer-events-none absolute inset-0 dot-grid opacity-50" />
      {/* ambient floating shapes */}
      <span className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full gradient-soft-peach opacity-40 blur-3xl animate-floaty" />
      <span className="pointer-events-none absolute -bottom-32 -right-32 h-[28rem] w-[28rem] rounded-full gradient-soft-lavender opacity-40 blur-3xl animate-floaty" style={{ animationDelay: '2s' }} />

      {/* minimal top nav */}
      <header className="relative z-10 mx-auto flex max-w-[1180px] items-center justify-between px-8 pt-7">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl gradient-orb shadow-soft">
            <span className="display text-[18px] italic text-white">f</span>
          </span>
          <div className="leading-tight">
            <div className="text-[14px] font-semibold tracking-tight text-ink-900">FounderOS</div>
            <div className="text-[10.5px] font-medium uppercase tracking-[0.18em] text-ink-500">London</div>
          </div>
        </div>
        <a
          href="https://data.london.gov.uk/dataset/"
          target="_blank"
          rel="noreferrer"
          className="pill bg-white hover:bg-cream-50"
        >
          <Database size={11} className="text-peach-500" /> Powered by London Datastore <ExternalLink size={10} />
        </a>
      </header>

      {/* center stage */}
      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-90px)] max-w-[760px] flex-col items-center justify-center px-6 pb-16 pt-6 text-center">
        {!analysisDone ? (
          <>
            {/* Motivational line — quietly rotates */}
            <div key={turn} className="mb-8 text-[12.5px] font-medium uppercase tracking-[0.22em] text-ink-500 animate-[fadeIn_1s_ease]">
              {motivational}
            </div>

            <Orb state={analysing ? 'thinking' : orbState} />

            <div className="mt-7 flex h-7 items-center gap-3">
              <Waveform active={orbState === 'listening' && !analysing} />
              <span className="text-[11.5px] font-medium uppercase tracking-[0.18em] text-ink-500">
                {analysing
                  ? 'Reading London…'
                  : orbState === 'listening' ? 'You · just speak'
                  : orbState === 'speaking'  ? 'Jill is responding'
                  :                            'Routing your answer'}
              </span>
            </div>

            {/* Current line */}
            <div className="mt-10 max-w-[640px]">
              {!analysing ? (
                <>
                  <div className="text-[10.5px] font-medium uppercase tracking-[0.22em] text-ink-400">
                    {currentMessage?.speaker === 'you' ? 'You' : 'Jill'}
                  </div>
                  <p className="mt-3 display text-[32px] leading-[1.18] text-ink-900">
                    {typed}
                    <span className="ml-0.5 inline-block h-6 w-[2px] animate-cursor bg-peach-500 align-middle" />
                  </p>
                </>
              ) : (
                <Analysing />
              )}
            </div>

            {/* Subtle progress + controls */}
            {!analysing && (
              <>
                <div className="mt-12 flex items-center gap-1.5">
                  {CONVERSATION.map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        i < turn ? 'w-6 bg-peach-500' :
                        i === turn ? 'w-8 bg-peach-400' :
                        'w-1.5 bg-ink-200'
                      }`}
                    />
                  ))}
                </div>
                <div className="mt-2 text-[11.5px] font-mono text-ink-400">{completion}% understood</div>

                <div className="mt-8 flex items-center gap-2">
                  <button className="btn-ghost text-[12.5px]"><Pause size={12} /> Pause</button>
                  <button className="btn-ghost text-[12.5px]"><CornerDownLeft size={12} /> Type instead</button>
                  <button className="btn-ghost text-[12.5px]"><MicOff size={12} /> Mute</button>
                </div>
              </>
            )}
          </>
        ) : (
          <Ready onComplete={onComplete} />
        )}
      </main>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
      `}</style>
    </div>
  )
}

function Analysing() {
  const STEPS = [
    'Listening to your story',
    'Pulling Workplace Zone Statistics',
    'Cross-referencing Census 2021 · Religion by Ward',
    'Scanning London Business Demography',
    'Reading TfL flows for Liverpool Street',
    'Matching GLA Funding Directory',
    'Drafting your plan',
  ]
  const [stage, setStage] = useState(0)
  useEffect(() => {
    if (stage >= STEPS.length - 1) return
    const t = setTimeout(() => setStage(s => s + 1), 520)
    return () => clearTimeout(t)
  }, [stage])

  return (
    <div>
      <p className="display text-[32px] leading-[1.2] text-ink-900">
        Give me twelve seconds. <span className="italic-accent text-peach-500">I'm reading London for you.</span>
      </p>
      <ul className="mt-8 mx-auto max-w-[460px] space-y-2 text-left">
        {STEPS.map((s, i) => {
          const done = i < stage
          const active = i === stage
          return (
            <li
              key={s}
              className={`flex items-center gap-3 rounded-full border px-4 py-2 text-[13px] transition-all duration-500
                ${done   ? 'border-mint-200 bg-mint-100 text-ink-800 opacity-90' :
                  active ? 'border-peach-200 bg-peach-50 text-ink-900 shadow-soft' :
                           'border-transparent bg-transparent text-ink-300'}`}
            >
              <span className={`grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold
                ${done ? 'bg-mint-300 text-white' : active ? 'bg-peach-500 text-white animate-breathe' : 'bg-cream-200 text-ink-400'}`}>
                {done ? '✓' : i + 1}
              </span>
              {s}
              {active && (
                <span className="ml-auto inline-flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-peach-400 animate-breathe" />
                  <span className="h-1.5 w-1.5 rounded-full bg-peach-400 animate-breathe" style={{ animationDelay: '120ms' }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-peach-400 animate-breathe" style={{ animationDelay: '240ms' }} />
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function Ready({ onComplete }) {
  return (
    <div className="relative">
      <span className="absolute -top-20 left-1/2 -translate-x-1/2 h-44 w-44 rounded-full gradient-soft-peach opacity-60 blur-3xl" />
      <div className="relative">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl gradient-orb shadow-lift">
          <Sparkles size={24} className="text-white" />
        </div>
        <h1 className="mt-6 display text-[56px] leading-[1.05] text-ink-900">
          Your plan is <span className="italic-accent text-peach-500">ready.</span>
        </h1>
        <p className="mt-4 max-w-[520px] text-[16px] leading-relaxed text-ink-500 mx-auto">
          Seven sections. Twelve London datasets. One page where you can finally <span className="text-ink-900">see the whole thing.</span>
        </p>
        <button
          onClick={onComplete}
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-ink-900 px-6 py-3.5 text-[14px] font-medium text-cream-50 shadow-lift transition-all hover:scale-[1.02]"
        >
          See my plan <ArrowRight size={15} />
        </button>
        <div className="mt-3 text-[11.5px] text-ink-400">You can keep refining everything with voice.</div>
      </div>
    </div>
  )
}
