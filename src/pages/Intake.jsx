import React, { useEffect, useRef, useState } from 'react'
import {
  Mic, MicOff, Pause, Sparkles, ArrowRight, CornerDownLeft, Send,
  Database, ExternalLink, Leaf, StopCircle, Loader2,
} from 'lucide-react'
import { Wordmark, LeafMark, Tagline } from '../components/Brand'
import { api } from '../lib/api'
import { speakWithElevenLabs } from '../lib/voiceApi'
import { createRecorder, transcribe, isRecordingSupported, requestMicPermission } from '../lib/recorder'

// ─── Visuals ────────────────────────────────────────────────────────────────

function Orb({ state, who = 'flora' }) {
  const grad = state === 'listening' ? 'gradient-orb-listening' : (who === 'flora' ? 'gradient-orb-flora' : 'gradient-orb-finn')
  return (
    <div className="relative grid place-items-center" style={{ width: 220, height: 220 }}>
      <span className={`absolute inset-0 rounded-full ${grad} opacity-20 blur-3xl animate-breathe`} />
      <span className={`absolute inset-4 rounded-full ${grad} opacity-40 blur-2xl animate-breathe`} style={{ animationDelay: '500ms' }} />
      <span className={`absolute inset-9 rounded-full ${grad} opacity-95 blur-[1px] animate-breathe`} style={{ animationDelay: '200ms' }} />
      <span className={`absolute inset-12 rounded-full ${grad} shadow-[inset_0_8px_30px_rgba(255,255,255,0.45),inset_0_-30px_50px_rgba(27,47,28,0.35)]`} />
      <span className="absolute inset-[68px] rounded-full bg-white/30 backdrop-blur-sm" />

      {state !== 'idle' && (
        <>
          <span className={`absolute inset-0 rounded-full border ${state === 'listening' ? 'border-peach-300/60' : 'border-sage-300/50'} animate-ringOut`} />
          <span className={`absolute inset-0 rounded-full border ${state === 'listening' ? 'border-peach-300/50' : 'border-sage-300/40'} animate-ringOut`} style={{ animationDelay: '800ms' }} />
        </>
      )}

      <div className="relative flex flex-col items-center text-white">
        {state === 'listening'
          ? <Mic size={22} className="opacity-95 drop-shadow" />
          : <LeafMark size={22} className="opacity-95 drop-shadow" />}
        <div className="mt-1.5 text-[9.5px] font-medium uppercase tracking-[0.22em] text-white/90">
          {state === 'thinking' ? (who === 'flora' ? 'Flora thinking' : 'Finn working') :
           state === 'speaking' ? (who === 'flora' ? 'Flora speaking' : 'Finn speaking') :
           state === 'listening' ? 'Listening' :
           state === 'waiting'  ? 'Your turn' :
           who === 'flora' ? 'Flora' : 'Finn'}
        </div>
      </div>
    </div>
  )
}

// Compact audio-reactive waveform shown under the orb while listening.
// `silenceProgress` (0..1) fades the bars as we approach auto-stop, giving
// a quiet visual cue that Flora is about to take the turn.
function ListeningBars({ level = 0, silenceProgress = 0 }) {
  const bars = 9
  const fade = 1 - silenceProgress * 0.65 // 1.0 → 0.35 at full silence
  return (
    <div className="mt-4 flex h-8 items-center gap-[3px]" style={{ opacity: fade }}>
      {Array.from({ length: bars }).map((_, i) => {
        const centerWeight = 1 - Math.abs(i - (bars - 1) / 2) / ((bars - 1) / 2) * 0.4
        const minH = 14
        const maxH = 28
        const h = minH + Math.max(0, Math.min(1, level)) * (maxH - minH) * centerWeight
        return (
          <span
            key={i}
            className="w-[3.5px] rounded-full bg-forest-500 transition-[height] duration-100 ease-out"
            style={{ height: `${h}px`, opacity: 0.45 + centerWeight * 0.55 }}
          />
        )
      })}
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

// Short verbal stalls Flora speaks while the LLM is generating her real reply.
// All phrases trail off ("…") so they feel like she's mid-thought, not blocked.
const STALLS = [
  "Mmm…",
  "Hmm…",
  "Okay, so…",
  "Right, so…",
  "Mmhm…",
  "Hmm, let me see…",
  "Okay, walking with you on this…",
  "So, thinking…",
  "Mmm, okay…",
  "Right, thinking out loud…",
]

function pickStall() {
  return STALLS[Math.floor(Math.random() * STALLS.length)]
}

// Static opener — skips a slow LLM cold-start on page load. From the second
// turn onwards the live LLM takes over.
const FLORA_OPENER = "Hey, I'm Flora — so happy you're here! Tell me, what's the idea that's been rattling around in your head?"

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
  const [handingOff, setHandingOff] = useState(false)
  const [error, setError] = useState(null)
  const [voiceError, setVoiceError] = useState('')
  const [micState, setMicState] = useState('idle') // idle | recording | transcribing
  const [micError, setMicError] = useState('')
  const [floraStall, setFloraStall] = useState('') // verbal filler while thinking
  const [micLevel, setMicLevel] = useState(0) // 0..1, drives the waveform bars
  const [silenceProgress, setSilenceProgress] = useState(0) // 0..1 toward auto-stop
  const [floraAudioPlaying, setFloraAudioPlaying] = useState(false)
  const inputRef = useRef(null)
  const chatEndRef = useRef(null)
  const spokenMessageRef = useRef(null)
  const recorderRef = useRef(null)
  const stallControllerRef = useRef(null)
  const stallAudioRef = useRef(null)
  const micStreamRef = useRef(null)
  const vadFrameRef = useRef(null)
  const vadAcRef = useRef(null)
  const micSupported = isRecordingSupported()

  // ── Stall audio: short verbal filler while Flora is thinking ──
  const stopStall = () => {
    if (stallControllerRef.current) {
      stallControllerRef.current.abort()
      stallControllerRef.current = null
    }
    if (stallAudioRef.current) {
      stallAudioRef.current.pause()
      stallAudioRef.current = null
    }
  }

  const playStall = async () => {
    stopStall()
    const text = pickStall()
    setFloraStall(text)
    const controller = new AbortController()
    stallControllerRef.current = controller
    try {
      const blob = await speakWithElevenLabs({ text, persona: 'flora', signal: controller.signal })
      if (controller.signal.aborted) return
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      stallAudioRef.current = audio
      audio.onended = () => {
        URL.revokeObjectURL(url)
        if (stallAudioRef.current === audio) stallAudioRef.current = null
      }
      audio.play().catch(() => {})
    } catch (err) {
      // best-effort — silent stalls don't break the flow
      if (err?.name !== 'AbortError') console.warn('Stall TTS failed', err)
    }
  }

  // ── Flora's opening turn — static so it shows up instantly ──
  useEffect(() => {
    if (!started) return
    setFloraThinking(false)
    setFloraMessage(FLORA_OPENER)
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

    // Real reply is ready — kill any stall audio still in flight
    stopStall()
    setFloraStall('')

    const controller = new AbortController()
    let audio
    let audioUrl

    setVoiceError('')
    setFloraAudioPlaying(true)
    speakWithElevenLabs({ text: floraMessage, persona: 'flora', signal: controller.signal })
      .then(blob => {
        audioUrl = URL.createObjectURL(blob)
        audio = new Audio(audioUrl)
        audio.onended = () => setFloraAudioPlaying(false)
        audio.onerror = () => setFloraAudioPlaying(false)
        return audio.play()
      })
      .catch(err => {
        setFloraAudioPlaying(false)
        if (err.name !== 'AbortError') setVoiceError(err.message)
      })

    return () => {
      controller.abort()
      if (audio) audio.pause()
      if (audioUrl) URL.revokeObjectURL(audioUrl)
      setFloraAudioPlaying(false)
    }
  }, [floraMessage, floraThinking])

  // ── Scroll chat history ──
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation])

  const submitAnswer = async (answerText) => {
    const answer = answerText.trim()
    if (!answer || floraTyping || floraThinking) return
    setUserInput('')

    const updated = [
      ...conversation,
      { speaker: 'flora', text: floraMessage },
      { speaker: 'you', text: answer },
    ]
    setConversation(updated)

    setFloraThinking(true)
    playStall() // fire-and-forget verbal filler while we wait

    try {
      const res = await api.floraChat(updated)
      setGathered(res.gathered || {})

      if (res.done) {
        // Lock the conversation IMMEDIATELY — no more auto-listen, no more
        // Flora chat calls. The handoff is irreversible from this point.
        setHandingOff(true)
        cancelListening()
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

  const handleSubmit = (e) => {
    e.preventDefault()
    return submitAnswer(userInput)
  }

  // ── Microphone: auto-listen on Flora's turn end, VAD-based auto-stop ──
  const stopVadLoop = () => {
    if (vadFrameRef.current) {
      cancelAnimationFrame(vadFrameRef.current)
      vadFrameRef.current = null
    }
    if (vadAcRef.current) {
      vadAcRef.current.close().catch(() => {})
      vadAcRef.current = null
    }
    setMicLevel(0)
    setSilenceProgress(0)
  }

  const startListening = async () => {
    if (!micSupported) return
    if (floraTyping || floraThinking || floraAudioPlaying) return
    if (micState !== 'idle') return

    setMicError('')
    try {
      const stream = micStreamRef.current || await requestMicPermission()
      micStreamRef.current = stream

      const rec = await createRecorder({ stream })
      recorderRef.current = rec
      setMicState('recording')

      // VAD: build an analyser on the shared stream
      const AC = window.AudioContext || window.webkitAudioContext
      const ac = new AC()
      const source = ac.createMediaStreamSource(stream)
      const analyser = ac.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.7
      source.connect(analyser)
      vadAcRef.current = ac

      const data = new Uint8Array(analyser.frequencyBinCount)
      const SILENCE_THRESHOLD = 14      // avg byte freq below this = silence
      const MIN_SPEECH_MS = 350         // need at least this much voiced audio before counting silence
      const SILENCE_TO_STOP_MS = 2000   // 2s of silence → Flora takes the turn
      const HARD_STOP_MS = 45000        // 45s upper bound

      let spokeAt = 0
      let silenceAt = 0
      const startTs = performance.now()

      const tick = () => {
        analyser.getByteFrequencyData(data)
        let sum = 0
        for (let i = 0; i < data.length; i++) sum += data[i]
        const avg = sum / data.length
        setMicLevel(Math.min(1, avg / 80))

        const now = performance.now()
        if (avg > SILENCE_THRESHOLD) {
          if (!spokeAt) spokeAt = now
          silenceAt = 0
          setSilenceProgress(0)
        } else if (spokeAt && (now - spokeAt) > MIN_SPEECH_MS) {
          if (!silenceAt) silenceAt = now
          const elapsed = now - silenceAt
          setSilenceProgress(Math.min(1, elapsed / SILENCE_TO_STOP_MS))
          if (elapsed > SILENCE_TO_STOP_MS) {
            finishListening()
            return
          }
        }
        if (now - startTs > HARD_STOP_MS) {
          finishListening()
          return
        }
        vadFrameRef.current = requestAnimationFrame(tick)
      }
      vadFrameRef.current = requestAnimationFrame(tick)
    } catch (err) {
      setMicError(err?.message || 'Microphone unavailable')
      setMicState('idle')
    }
  }

  const finishListening = async () => {
    const rec = recorderRef.current
    if (!rec) return
    recorderRef.current = null
    stopVadLoop()
    setMicState('transcribing')
    try {
      const blob = await rec.stop()
      const text = await transcribe(blob)
      setMicState('idle')
      if (text) {
        setUserInput(text)
        await submitAnswer(text)
      }
    } catch (err) {
      setMicState('idle')
      setMicError(err?.message || 'Transcription failed')
    }
  }

  const cancelListening = () => {
    const rec = recorderRef.current
    recorderRef.current = null
    stopVadLoop()
    setMicState('idle')
    if (rec) rec.cancel()
  }

  // Auto-start listening once Flora has finished her turn (no audio, no
  // typewriter, no thinking, not already recording, not handing off).
  useEffect(() => {
    if (!started) return
    if (handingOff || analysing || pipelineDone) return
    if (!micSupported) return
    if (floraTyping || floraThinking || floraAudioPlaying) return
    if (micState !== 'idle') return
    if (!floraMessage) return
    // Small grace period so the tail of Flora's audio doesn't trigger VAD
    const t = setTimeout(() => { startListening() }, 350)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, floraMessage, floraTyping, floraThinking, floraAudioPlaying, handingOff, analysing, pipelineDone])

  // Cleanup on unmount
  useEffect(() => () => {
    stopVadLoop()
    if (recorderRef.current) recorderRef.current.cancel()
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop())
      micStreamRef.current = null
    }
  }, [])

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
            <div
              onClick={micState === 'recording' ? finishListening : undefined}
              className={micState === 'recording' ? 'cursor-pointer' : ''}
              title={micState === 'recording' ? 'Tap to stop and send' : ''}
            >
              <Orb
                state={
                  floraThinking ? 'thinking'
                  : floraTyping ? 'speaking'
                  : micState === 'recording' ? 'listening'
                  : micState === 'transcribing' ? 'thinking'
                  : 'waiting'
                }
                who="flora"
              />
            </div>

            <div className="mt-4 text-[11px] font-medium uppercase tracking-[0.18em] text-ink-500">
              {floraThinking ? 'Flora is thinking…'
                : floraTyping ? 'Flora is speaking'
                : micState === 'recording'
                  ? (silenceProgress > 0.4 ? 'Okay, taking your turn…' : 'Listening · just speak')
                : micState === 'transcribing' ? 'Catching that…'
                : 'Your turn'}
            </div>

            {/* Audio-reactive bars below the orb when listening */}
            {micState === 'recording' && (
              <ListeningBars level={micLevel} silenceProgress={silenceProgress} />
            )}

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
              <div className="mt-5 flex flex-col items-center gap-2.5 animate-[fadeIn_0.3s_ease]">
                {floraStall && (
                  <div className="text-center">
                    <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-sage-500 mb-1.5">Flora</div>
                    <p className="display italic text-[19px] leading-snug text-forest-500/70">
                      {floraStall}
                    </p>
                  </div>
                )}
                <span className="inline-flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-sage-400 animate-breathe" />
                  <span className="h-1.5 w-1.5 rounded-full bg-sage-400 animate-breathe" style={{ animationDelay: '150ms' }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-sage-400 animate-breathe" style={{ animationDelay: '300ms' }} />
                </span>
              </div>
            )}

            {!floraTyping && !floraThinking && (
              <div className="mt-6 w-full max-w-[560px] animate-[fadeIn_0.4s_ease] flex flex-col items-center">
                {micError && (
                  <div className="mt-1 rounded-full border border-butter-200 bg-butter-100 px-4 py-1.5 text-[11.5px] text-ink-700">
                    {micError}
                  </div>
                )}

                {/* Voice is the primary interaction — no button. The orb above
                    is the listening visual, the bars are audio-reactive, and
                    tapping the orb stops recording. Text input is a discreet
                    fallback for testing / unsupported browsers. */}
                <details className="mt-4 w-full text-[11.5px] text-ink-400">
                  <summary className="cursor-pointer text-center hover:text-ink-600 select-none">
                    Or type instead
                  </summary>
                  <form onSubmit={handleSubmit} className="mt-3">
                    <div className="flex items-center gap-3 rounded-2xl border border-sage-200 bg-white px-5 py-3 shadow-soft focus-within:border-sage-400 focus-within:ring-2 focus-within:ring-sage-200 transition-all">
                      <input
                        ref={inputRef}
                        type="text"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        placeholder="Type your answer…"
                        className="flex-1 bg-transparent text-[15px] text-forest-500 placeholder:text-ink-300 outline-none"
                      />
                      <button
                        type="submit"
                        disabled={!userInput.trim() || micState !== 'idle'}
                        className="grid h-9 w-9 place-items-center rounded-xl bg-forest-500 text-white transition-all hover:bg-forest-600 disabled:opacity-30"
                      >
                        <Send size={14} />
                      </button>
                    </div>
                  </form>
                </details>
              </div>
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
  const FINAL_MESSAGES = [
    'Finn is putting it all together…',
    'Cross-checking the London datasets…',
    'Almost there — sharpening the plan…',
    'Finn is double-checking the numbers…',
  ]
  const [stage, setStage] = useState(0)
  const [finalMsg, setFinalMsg] = useState(0)

  useEffect(() => {
    if (stage >= STEPS.length - 1) return
    const delay = stage === 0 ? 4000 : 5000
    const t = setTimeout(() => setStage(s => s + 1), delay)
    return () => clearTimeout(t)
  }, [stage])

  // After the steps finish, rotate a friendly "still working" message so the
  // UI doesn't look frozen if the backend is still crunching.
  useEffect(() => {
    if (stage < STEPS.length - 1) return
    const t = setInterval(() => {
      setFinalMsg(m => (m + 1) % FINAL_MESSAGES.length)
    }, 4500)
    return () => clearInterval(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage])

  const atEnd = stage >= STEPS.length - 1

  return (
    <div className="text-center">
      <p className="display text-[26px] leading-[1.2] text-forest-500">
        Give me a moment. <span className="italic-accent text-sage-500">Flora &amp; Finn are working for you.</span>
      </p>
      <ul className="mt-8 mx-auto max-w-[480px] space-y-2 text-left">
        {STEPS.map((s, i) => {
          const done = i < stage || (atEnd && i === stage)
          const active = i === stage && !atEnd
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
      {atEnd && (
        <div className="mt-6 flex flex-col items-center gap-2.5 animate-[fadeIn_0.5s_ease]">
          <span className="inline-flex gap-1">
            <span className="h-2 w-2 rounded-full bg-sage-400 animate-breathe" />
            <span className="h-2 w-2 rounded-full bg-sage-400 animate-breathe" style={{ animationDelay: '150ms' }} />
            <span className="h-2 w-2 rounded-full bg-sage-400 animate-breathe" style={{ animationDelay: '300ms' }} />
          </span>
          <div key={finalMsg} className="text-[13px] text-forest-500 animate-[fadeIn_0.5s_ease]">
            {FINAL_MESSAGES[finalMsg]}
          </div>
          <div className="text-[11px] text-ink-400">This can take up to a minute on longer conversations.</div>
        </div>
      )}
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
