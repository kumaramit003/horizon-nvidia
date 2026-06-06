import React, { useEffect, useRef, useState } from 'react'
import {
  Mic, MicOff, Pause, Sparkles, ArrowRight, CornerDownLeft, Send,
  Database, ExternalLink, Leaf,
} from 'lucide-react'
import { Wordmark, LeafMark, Tagline } from '../components/Brand'
import { api } from '../lib/api'
import { speakWithElevenLabs } from '../lib/voiceApi'

// ─── Visuals ────────────────────────────────────────────────────────────────

function Orb({ state, who = 'flora' }) {
  const grad = who === 'flora' ? 'gradient-orb-flora' : 'gradient-orb-finn'
  return (
    <div className="relative grid place-items-center" style={{ width: 220, height: 220 }}>
      <span className={`absolute inset-0 rounded-full ${grad} opacity-20 blur-3xl animate-breathe`} />
      <span className={`absolute inset-4 rounded-full ${grad} opacity-40 blur-2xl animate-breathe`} style={{ animationDelay: '500ms' }} />
      <span className={`absolute inset-9 rounded-full ${grad} opacity-95 blur-[1px] animate-breathe`} style={{ animationDelay: '200ms' }} />
      <span className={`absolute inset-12 rounded-full ${grad} shadow-[inset_0_8px_30px_rgba(255,255,255,0.45),inset_0_-30px_50px_rgba(27,47,28,0.35)]`} />
      <span className="absolute inset-[68px] rounded-full bg-white/30 backdrop-blur-sm" />

      {state !== 'idle' && (
        <>
          <span className="absolute inset-0 rounded-full border border-sage-300/50 animate-ringOut" />
          <span className="absolute inset-0 rounded-full border border-sage-300/40 animate-ringOut" style={{ animationDelay: '800ms' }} />
        </>
      )}

      <div className="relative flex flex-col items-center text-white">
        <LeafMark size={22} className="opacity-95 drop-shadow" />
        <div className="mt-1.5 text-[9.5px] font-medium uppercase tracking-[0.22em] text-white/90">
          {state === 'thinking' ? (who === 'flora' ? 'Flora thinking' : 'Finn working') :
           state === 'speaking' ? (who === 'flora' ? 'Flora speaking' : 'Finn speaking') :
           state === 'waiting'  ? 'Your turn' :
           who === 'flora' ? 'Flora' : 'Finn'}
        </div>
      </div>
    </div>
  )
}

function GatheredPips({ gathered }) {
  const fields = [
    { key: 'idea', label: 'Idea' },
    { key: 'motivation', label: 'Why' },
    { key: 'customer', label: 'Customer' },
    { key: 'first_version', label: 'Format' },
    { key: 'budget', label: 'Budget' },
    { key: 'location', label: 'Location' },
  ]
  const done = fields.filter(f => gathered?.[f.key]).length
  return (
    <div className="flex items-center gap-3">
      {fields.map(f => (
        <div key={f.key} className="flex flex-col items-center gap-1">
          <span className={`h-2 w-2 rounded-full transition-all duration-500 ${
            gathered?.[f.key] ? 'bg-sage-500 scale-125' : 'bg-ink-200'
          }`} />
          <span className={`text-[9px] font-medium uppercase tracking-wider transition-colors ${
            gathered?.[f.key] ? 'text-sage-600' : 'text-ink-300'
          }`}>{f.label}</span>
        </div>
      ))}
      <span className="ml-2 text-[11px] font-mono text-ink-400">{done}/6</span>
    </div>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function Intake({ onComplete }) {
  const [started, setStarted] = useState(false)
  const [conversation, setConversation] = useState([])
  const [floraMessage, setFloraMessage] = useState('')
  const [floraTyped, setFloraTyped] = useState('')
  const [floraTyping, setFloraTyping] = useState(false)
  const [floraThinking, setFloraThinking] = useState(false)
  const [gathered, setGathered] = useState({})
  const [userInput, setUserInput] = useState('')
  const [analysing, setAnalysing] = useState(false)
  const [pipelineDone, setPipelineDone] = useState(false)
  const [error, setError] = useState(null)
  const [voiceError, setVoiceError] = useState('')
  const inputRef = useRef(null)
  const chatEndRef = useRef(null)
  const spokenMessageRef = useRef(null)

  // ── Flora's opening turn ──
  useEffect(() => {
    if (!started) return
    let cancelled = false
    setFloraThinking(true)
    api.floraChat([])
      .then(res => {
        if (cancelled) return
        setFloraMessage(res.message)
        setGathered(res.gathered || {})
        setFloraThinking(false)
      })
      .catch(err => {
        if (!cancelled) setError(err.message)
      })
    return () => { cancelled = true }
  }, [started])

  // ── Typewriter effect for each new Flora message ──
  useEffect(() => {
    if (!floraMessage || floraThinking) return
    setFloraTyping(true)
    setFloraTyped('')
    let i = 0
    const interval = setInterval(() => {
      i++
      setFloraTyped(floraMessage.slice(0, i))
      if (i >= floraMessage.length) {
        clearInterval(interval)
        setFloraTyping(false)
        setTimeout(() => inputRef.current?.focus(), 100)
      }
    }, 20)
    return () => clearInterval(interval)
  }, [floraMessage, floraThinking])

  // ── Speak each Flora message via ElevenLabs (best-effort, never blocks) ──
  useEffect(() => {
    if (!floraMessage || floraThinking) return
    if (spokenMessageRef.current === floraMessage) return
    spokenMessageRef.current = floraMessage

    const controller = new AbortController()
    let audio
    let audioUrl

    setVoiceError('')
    speakWithElevenLabs({ text: floraMessage, persona: 'flora', signal: controller.signal })
      .then(blob => {
        audioUrl = URL.createObjectURL(blob)
        audio = new Audio(audioUrl)
        return audio.play()
      })
      .catch(err => {
        if (err.name !== 'AbortError') setVoiceError(err.message)
      })

    return () => {
      controller.abort()
      if (audio) audio.pause()
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [floraMessage, floraThinking])

  // ── Scroll chat history ──
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!userInput.trim() || floraTyping || floraThinking) return

    const answer = userInput.trim()
    setUserInput('')

    const updated = [
      ...conversation,
      { speaker: 'flora', text: floraMessage },
      { speaker: 'you', text: answer },
    ]
    setConversation(updated)

    setFloraThinking(true)
    try {
      const res = await api.floraChat(updated)
      setGathered(res.gathered || {})

      if (res.done) {
        const finalConvo = [...updated, { speaker: 'flora', text: res.message }]
        setConversation(finalConvo)
        setFloraMessage(res.message)
        setFloraThinking(false)
        // Small delay so the handoff message renders + plays before pipeline starts
        setTimeout(() => {
          setAnalysing(true)
          onComplete(finalConvo)
            .then(() => setPipelineDone(true))
            .catch(err => setError(err.message || 'Pipeline failed'))
        }, 2500)
      } else {
        setFloraMessage(res.message)
        setFloraThinking(false)
      }
    } catch (err) {
      setError(err.message)
    }
  }

  // ── Error state ──
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mesh">
        <div className="text-center max-w-lg px-6">
          <div className="grid h-16 w-16 mx-auto place-items-center rounded-3xl bg-rose-100">
            <span className="text-rose-500 text-2xl">!</span>
          </div>
          <h2 className="mt-6 display text-[28px] text-forest-500">Something went wrong</h2>
          <p className="mt-3 text-[14px] text-ink-500 leading-relaxed">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-forest-500 px-6 py-3 text-[14px] font-medium text-cream-50 shadow-lift hover:bg-forest-600"
          >
            Start over <ArrowRight size={14} />
          </button>
        </div>
      </div>
    )
  }

  // ── Page shell ──
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-mesh">
      <div className="pointer-events-none absolute inset-0 dot-grid opacity-50" />
      <span className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full gradient-soft-peach opacity-40 blur-3xl animate-floaty" />
      <span className="pointer-events-none absolute -bottom-32 -right-32 h-[28rem] w-[28rem] rounded-full gradient-soft-lavender opacity-40 blur-3xl animate-floaty" style={{ animationDelay: '2s' }} />
      <span className="pointer-events-none absolute top-1/3 -right-20 h-56 w-56 rounded-full gradient-soft-mint opacity-40 blur-3xl animate-floaty" style={{ animationDelay: '4s' }} />

      <header className="relative z-10 mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-3 px-8 pt-8">
        <Wordmark size="lg" />
        <a href="https://data.london.gov.uk/dataset/" target="_blank" rel="noreferrer" className="pill bg-white hover:bg-cream-50">
          <Database size={11} className="text-sage-500" /> Powered by London Datastore <ExternalLink size={10} />
        </a>
      </header>

      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-90px)] max-w-[760px] flex-col items-center justify-center px-6 pb-16 pt-6">
        {!started ? (
          <StartVoice onStart={() => setStarted(true)} />
        ) : pipelineDone ? (
          <Ready />
        ) : analysing ? (
          <>
            <Orb state="thinking" who="finn" />
            <div className="mt-5 text-[11.5px] font-medium uppercase tracking-[0.18em] text-ink-500 text-center">
              Flora &amp; Finn are building your plan
            </div>
            <div className="mt-8 w-full max-w-[640px]"><Analysing /></div>
          </>
        ) : (
          <>
            <Orb
              state={floraThinking ? 'thinking' : floraTyping ? 'speaking' : 'waiting'}
              who="flora"
            />

            <div className="mt-4 text-[11px] font-medium uppercase tracking-[0.18em] text-ink-500">
              {floraThinking ? 'Flora is thinking…' : floraTyping ? 'Flora is speaking' : 'Your turn · type below'}
            </div>

            <div className="mt-4">
              <GatheredPips gathered={gathered} />
            </div>

            {conversation.length > 0 && (
              <div className="mt-5 w-full max-w-[600px] max-h-[200px] overflow-y-auto rounded-2xl bg-white/60 backdrop-blur border border-black/[0.05] px-5 py-4 space-y-3">
                {conversation.map((msg, i) => (
                  <div key={i} className={`text-[13px] ${msg.speaker === 'flora' ? 'text-sage-600' : 'text-forest-500'}`}>
                    <span className="font-semibold text-[10px] uppercase tracking-wider">
                      {msg.speaker === 'flora' ? 'Flora' : 'You'}
                    </span>
                    <p className="mt-0.5">{msg.text}</p>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            )}

            {!floraThinking && (
              <div className="mt-5 w-full max-w-[640px] text-center animate-[fadeIn_0.4s_ease]">
                <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-sage-500 mb-2">Flora</div>
                <p className="display text-[24px] leading-[1.25] text-forest-500">
                  {floraTyped}
                  {floraTyping && <span className="ml-0.5 inline-block h-5 w-[2px] animate-cursor bg-sage-500 align-middle" />}
                </p>
              </div>
            )}

            {voiceError && (
              <div className="mt-4 rounded-full border border-butter-200 bg-butter-100 px-4 py-1.5 text-[11.5px] text-ink-700">
                Voice unavailable: {voiceError}
              </div>
            )}

            {floraThinking && (
              <div className="mt-6 flex items-center gap-2 text-[13px] text-ink-400">
                <span className="inline-flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-sage-400 animate-breathe" />
                  <span className="h-2 w-2 rounded-full bg-sage-400 animate-breathe" style={{ animationDelay: '150ms' }} />
                  <span className="h-2 w-2 rounded-full bg-sage-400 animate-breathe" style={{ animationDelay: '300ms' }} />
                </span>
              </div>
            )}

            {!floraTyping && !floraThinking && (
              <form onSubmit={handleSubmit} className="mt-6 w-full max-w-[560px] animate-[fadeIn_0.4s_ease]">
                <div className="flex items-center gap-3 rounded-2xl border border-sage-200 bg-white px-5 py-3 shadow-soft focus-within:border-sage-400 focus-within:ring-2 focus-within:ring-sage-200 transition-all">
                  <input
                    ref={inputRef}
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="Type your answer…"
                    className="flex-1 bg-transparent text-[15px] text-forest-500 placeholder:text-ink-300 outline-none"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={!userInput.trim()}
                    className="grid h-9 w-9 place-items-center rounded-xl bg-forest-500 text-white transition-all hover:bg-forest-600 disabled:opacity-30"
                  >
                    <Send size={14} />
                  </button>
                </div>
                <div className="mt-2 text-center text-[11px] text-ink-400">
                  Press Enter to send
                </div>
              </form>
            )}

            <Tagline className="mt-10 opacity-80" block />
          </>
        )}
      </main>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
      `}</style>
    </div>
  )
}

// ─── States ────────────────────────────────────────────────────────────────

function StartVoice({ onStart }) {
  return (
    <div className="relative mx-auto flex w-full max-w-[620px] flex-col items-center text-center">
      <span className="pointer-events-none absolute -top-20 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full gradient-soft-peach opacity-50 blur-3xl" />
      <div className="relative grid h-24 w-24 place-items-center rounded-[2rem] gradient-orb-flora shadow-lift">
        <LeafMark size={32} className="opacity-95 drop-shadow" />
        <span className="absolute inset-0 animate-ringOut rounded-[2rem] border border-peach-200/60" />
      </div>

      <div className="relative mt-8 section-eyebrow flex items-center gap-2">
        <Sparkles size={12} className="text-peach-500" />
        Voice discovery
      </div>
      <h1 className="relative mt-3 display text-[52px] leading-[1.04] tracking-tight text-forest-500">
        Start with <span className="italic-accent text-peach-500">Flora.</span>
      </h1>
      <p className="relative mt-4 max-w-[520px] text-[15.5px] leading-relaxed text-ink-500">
        Tap once to begin. Flora will speak the opening intake, then Finn will read London and prepare your dashboard.
      </p>

      <button
        onClick={onStart}
        className="relative mt-9 inline-flex items-center gap-2 rounded-full bg-forest-500 px-7 py-3.5 text-[14.5px] font-medium text-cream-50 shadow-lift transition-all hover:scale-[1.02] hover:bg-forest-600"
      >
        <Mic size={16} />
        Start voice intake
      </button>

      <Tagline block className="relative mt-12" />
    </div>
  )
}

function Analysing() {
  const STEPS = [
    'Flora analysing your conversation',
    'Building your idea profile & clarity score',
    'Finn researching target audience',
    'Validating market signals against London data',
    'Comparing London locations',
    'Estimating costs & matching grants',
    'Drafting your 7-day launch plan',
  ]
  const [stage, setStage] = useState(0)
  useEffect(() => {
    if (stage >= STEPS.length - 1) return
    const delay = stage === 0 ? 4000 : 5000
    const t = setTimeout(() => setStage(s => s + 1), delay)
    return () => clearTimeout(t)
  }, [stage])

  return (
    <div className="text-center">
      <p className="display text-[26px] leading-[1.2] text-forest-500">
        Give me a moment. <span className="italic-accent text-sage-500">Flora &amp; Finn are working for you.</span>
      </p>
      <ul className="mt-8 mx-auto max-w-[480px] space-y-2 text-left">
        {STEPS.map((s, i) => {
          const done = i < stage
          const active = i === stage
          return (
            <li
              key={s}
              className={`flex items-center gap-3 rounded-full border px-4 py-2 text-[13px] transition-all duration-500
                ${done   ? 'border-sage-200 bg-sage-50 text-forest-500 opacity-90' :
                  active ? 'border-sage-300 bg-white text-forest-500 shadow-soft' :
                           'border-transparent bg-transparent text-ink-300'}`}
            >
              <span className={`grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold
                ${done ? 'bg-sage-500 text-white' : active ? 'bg-forest-500 text-white animate-breathe' : 'bg-cream-200 text-ink-400'}`}>
                {done ? '✓' : i + 1}
              </span>
              {s}
              {active && (
                <span className="ml-auto inline-flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-sage-400 animate-breathe" />
                  <span className="h-1.5 w-1.5 rounded-full bg-sage-400 animate-breathe" style={{ animationDelay: '120ms' }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-sage-400 animate-breathe" style={{ animationDelay: '240ms' }} />
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function Ready() {
  return (
    <div className="relative mx-auto w-full max-w-[600px] text-center">
      <span aria-hidden className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-56 w-56 rounded-full gradient-soft-peach opacity-50 blur-3xl" />
      <div className="relative flex flex-col items-center">
        <div className="grid h-20 w-20 place-items-center rounded-3xl gradient-orb-finn shadow-lift">
          <Leaf size={30} className="text-white" />
        </div>
        <h1 className="mt-8 display text-[56px] leading-[1.04] tracking-tight text-forest-500">
          Your plan is <span className="italic-accent text-sage-500">ready.</span>
        </h1>
        <p className="mt-5 max-w-[520px] text-[16px] leading-relaxed text-ink-500">
          Real London data. Real analysis. One dashboard where you can <span className="text-forest-500">see the whole thing.</span>
        </p>
        <div className="mt-6 text-[12px] text-ink-400">Redirecting to your dashboard…</div>
        <Tagline block className="mt-12" />
      </div>
    </div>
  )
}
