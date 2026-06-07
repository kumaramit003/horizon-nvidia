import React, { useEffect, useRef, useState } from 'react'
import {
  Mic, MicOff, Pause, Sparkles, ArrowRight, CornerDownLeft, Send,
  Database, ExternalLink, Leaf, StopCircle, Loader2, RotateCcw, Trash2,
} from 'lucide-react'
import { Wordmark, LeafMark, Tagline } from '../components/Brand'
import { AgentFace } from '../components/AgentFace'
import GardenProgress from '../components/GardenProgress'
import { api } from '../lib/api'
import { speakWithElevenLabs } from '../lib/voiceApi'
import { createRecorder, transcribe, isRecordingSupported, requestMicPermission } from '../lib/recorder'

// ─── Visuals ────────────────────────────────────────────────────────────────

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

// Shown while the mic is armed but you haven't started talking yet — a calm
// breathing dot trio so you know Flora is ready and waiting for you to begin.
function ReadyPulse() {
  return (
    <div className="mt-4 flex h-8 items-center justify-center gap-1.5">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="h-2 w-2 rounded-full bg-sage-400 animate-breathe"
          style={{ animationDelay: `${i * 200}ms` }}
        />
      ))}
    </div>
  )
}

// A living tree that grows as Flora understands more of the idea. Each of the
// six things she's listening for becomes a leaf that buds in; the trunk and
// glow grow with progress. Replaces the old row of pips under Flora.
const TREE_FIELDS = [
  { key: 'idea',          label: 'Idea',     x: 110, y: 170, lx: 130, anchor: 'start' },
  { key: 'motivation',    label: 'Why',      x: 74,  y: 150, lx: 60,  anchor: 'end' },
  { key: 'customer',      label: 'Customer', x: 146, y: 148, lx: 162, anchor: 'start' },
  { key: 'first_version', label: 'Format',   x: 86,  y: 114, lx: 70,  anchor: 'end' },
  { key: 'budget',        label: 'Budget',   x: 142, y: 110, lx: 160, anchor: 'start' },
  { key: 'location',      label: 'Location', x: 110, y: 84,  lx: 110, anchor: 'middle' },
]

export function GrowingTree({ gathered, active = true }) {
  const done = TREE_FIELDS.filter(f => gathered?.[f.key]).length
  const progress = done / TREE_FIELDS.length
  const trunkScale = 0.4 + 0.6 * progress
  const sunlight = 0.35 + progress * 0.65 // sun brightens as Flora understands more

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 220 320" width="240" height="350" style={{ overflow: 'visible' }}>
        {/* Sun — top right; grows brighter as the idea gets enough light */}
        <g
          className="animate-[sunPulse_4s_ease-in-out_infinite]"
          style={{ transformOrigin: '178px 38px', opacity: sunlight }}
        >
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
            <line
              key={deg}
              x1="178" y1="38"
              x2={178 + Math.cos((deg * Math.PI) / 180) * 18}
              y2={38 + Math.sin((deg * Math.PI) / 180) * 18}
              stroke="#FFD659"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="animate-[sunRay_3s_ease-in-out_infinite]"
              style={{ animationDelay: `${i * 120}ms`, opacity: 0.4 + progress * 0.5 }}
            />
          ))}
          <circle cx="178" cy="38" r="14" fill="#FFD659" />
          <circle cx="178" cy="38" r="9" fill="#FFE99A" opacity="0.85" />
        </g>

        {/* Watering can — centred above the trunk; spout pours straight down */}
        {active && done < 6 && (
          <g transform="translate(88, 10)">
            <g
              className="animate-[canPour_2.8s_ease-in-out_infinite]"
              style={{ transformOrigin: '28px 22px' }}
            >
              <path d="M6 14 L38 14 L34 36 C34 39 30 40 22 40 C14 40 10 39 10 36 Z" fill="#8FBF7E" />
              <rect x="12" y="8" width="18" height="7" rx="3" fill="#6E8B6A" />
              <path d="M6 18 C-2 16 -2 28 4 30" stroke="#6E8B6A" strokeWidth="3" fill="none" strokeLinecap="round" />
              {/* spout points down toward trunk at x=110 */}
              <path d="M22 36 L22 50" stroke="#6E8B6A" strokeWidth="3.5" strokeLinecap="round" />
              <circle cx="22" cy="52" r="4" fill="#6E8B6A" />
              <circle cx="20" cy="51" r="0.8" fill="#A8D8F0" />
              <circle cx="22" cy="50" r="0.8" fill="#A8D8F0" />
              <circle cx="24" cy="51" r="0.8" fill="#A8D8F0" />
              <g transform="translate(22, 54)">
                {[0, 1, 2, 3, 4].map(i => (
                  <ellipse
                    key={i}
                    cx={-4 + i * 2}
                    cy={0}
                    rx="2.5"
                    ry="4"
                    fill="#7FD8E8"
                    opacity="0.8"
                    className="animate-[waterFallTree_1.3s_ease-in_infinite]"
                    style={{ animationDelay: `${i * 180}ms` }}
                  />
                ))}
              </g>
            </g>
          </g>
        )}

        {/* Tree — sways gently; watered from the can above */}
        <g
          className="animate-[treeSway_6s_ease-in-out_infinite]"
          style={{ transformOrigin: '110px 292px' }}
        >
          <circle cx="110" cy="120" r="78" fill="#9DE3A6"
            style={{ opacity: 0.06 + progress * 0.20, transition: 'opacity 900ms ease', filter: 'blur(14px)' }} />

          <ellipse cx="110" cy="296" rx="78" ry="16" fill="#E7DFCE" opacity="0.7" />
          <ellipse cx="110" cy="292" rx="60" ry="11" fill="#CFE3C2" opacity="0.6" />

          <g style={{ transform: `scaleY(${trunkScale})`, transformOrigin: '110px 292px', transition: 'transform 900ms cubic-bezier(.2,.7,.2,1)' }}>
            <path d="M104 292 C104 250 100 210 110 176 C120 210 116 250 116 292 Z" fill="#A07E5C" />
            <path d="M110 230 C120 222 128 224 134 214" stroke="#A07E5C" strokeWidth="4" fill="none" strokeLinecap="round" />
            <path d="M110 250 C100 244 92 246 86 236" stroke="#A07E5C" strokeWidth="4" fill="none" strokeLinecap="round" />
          </g>

          <g className="animate-[sproutSway_5s_ease-in-out_infinite]" style={{ transformOrigin: '110px 200px' }}>
            {TREE_FIELDS.map((f, i) => {
              const on = i < done
              return (
                <g key={f.key} style={{
                  transform: on ? 'scale(1)' : 'scale(0)',
                  transformOrigin: `${f.x}px ${f.y}px`,
                  transition: `transform 650ms cubic-bezier(.34,1.56,.64,1) ${i * 60}ms, opacity 500ms ease ${i * 60}ms`,
                  opacity: on ? 1 : 0,
                }}>
                  <circle cx={f.x} cy={f.y} r="26" fill={i % 2 ? '#7DCC93' : '#8FBF7E'} />
                  <circle cx={f.x - 7} cy={f.y - 7} r="9" fill="#A6DBA8" opacity="0.6" />
                </g>
              )
            })}
            {done === 0 && (
              <g style={{ transformOrigin: '110px 176px' }} className="animate-breathe">
                <path d="M110 176 C103 170 96 172 92 164 C101 161 109 166 110 176 Z" fill="#8FBF7E" />
              </g>
            )}
          </g>

          {TREE_FIELDS.map((f, i) => i < done && (
            <text key={f.key} x={f.lx} y={f.y + 3} textAnchor={f.anchor}
              fontSize="10" fontWeight="600" fill="#5BAE78"
              style={{ fontFamily: 'Inter, sans-serif', opacity: 0, animation: 'fadeIn 500ms ease forwards', animationDelay: `${i * 60 + 200}ms` }}>
              {f.label}
            </text>
          ))}
        </g>
      </svg>
      <div className="mt-1 text-center">
        <div className="font-mono text-[12px] text-sage-600">{done}/6</div>
        <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-400">
          {done === 0 ? 'A seed in the sun — tell Flora your idea'
            : done < 3 ? 'Watering & growing'
            : done < 6 ? 'Good light — keep going'
            : 'Fully rooted — ready for Finn'}
        </div>
      </div>
    </div>
  )
}

// Static opener — skips a slow LLM cold-start on page load. From the second
// turn onwards the live LLM takes over.
const FLORA_OPENER = "Hey, I'm Flora — so happy you're here! Tell me, what's the idea that's been rattling around in your head?"

// ─── Page ───────────────────────────────────────────────────────────────────

export default function Intake({ onComplete, onOpenWorkspace, onDeleteWorkspace }) {
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
  const [micLevel, setMicLevel] = useState(0) // 0..1, drives the waveform bars
  const [silenceProgress, setSilenceProgress] = useState(0) // 0..1 toward auto-stop
  const [speechHeard, setSpeechHeard] = useState(false) // armed & waiting vs. actually hearing you
  const [floraAudioPlaying, setFloraAudioPlaying] = useState(false)
  const inputRef = useRef(null)
  const chatEndRef = useRef(null)
  const spokenMessageRef = useRef(null)
  const recorderRef = useRef(null)
  const micStreamRef = useRef(null)
  const vadFrameRef = useRef(null)
  const vadAcRef = useRef(null)
  const micSupported = isRecordingSupported()

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
    setSpeechHeard(false)
    try {
      const stream = micStreamRef.current || await requestMicPermission()
      micStreamRef.current = stream

      // Analyser first — we listen for real speech BEFORE we start recording,
      // so background music / clatter during silence never gets transcribed.
      const AC = window.AudioContext || window.webkitAudioContext
      const ac = new AC()
      const source = ac.createMediaStreamSource(stream)
      const analyser = ac.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.7
      source.connect(analyser)
      vadAcRef.current = ac

      setMicState('recording') // "armed" — UI shows "ready when you are"

      const data = new Uint8Array(analyser.frequencyBinCount)
      const SPEECH_THRESHOLD = 24       // sustained energy above this = real speech
      const SPEECH_CONFIRM_MS = 220     // must stay voiced this long to count (ignores clatter)
      const SILENCE_THRESHOLD = 14      // below this once speaking = silence
      const SILENCE_TO_STOP_MS = 1800   // silence after speech → take the turn
      const HARD_STOP_MS = 45000        // upper bound once speaking

      let recStarted = false
      let voicedMs = 0
      let speakingAt = 0
      let silenceAt = 0
      let lastTs = performance.now()

      const tick = async () => {
        analyser.getByteFrequencyData(data)
        let sum = 0
        for (let i = 0; i < data.length; i++) sum += data[i]
        const avg = sum / data.length
        const now = performance.now()
        const dt = now - lastTs
        lastTs = now
        setMicLevel(Math.min(1, avg / 80))

        if (!recStarted) {
          // ── Waiting for you to actually start talking ──
          if (avg > SPEECH_THRESHOLD) {
            voicedMs += dt
            // Begin capturing at the very onset so the first word isn't clipped,
            // but stay "unconfirmed" until we've heard enough sustained voice.
            if (!recorderRef.current) {
              try {
                recorderRef.current = await createRecorder({ stream })
              } catch (err) {
                setMicError(err?.message || 'Microphone unavailable')
                stopVadLoop(); setMicState('idle'); return
              }
            }
          } else {
            voicedMs = Math.max(0, voicedMs - dt * 0.6)
            // A transient clatter that never became real speech — throw the
            // provisional capture away and keep waiting.
            if (voicedMs === 0 && recorderRef.current) {
              try { recorderRef.current.cancel() } catch {}
              recorderRef.current = null
            }
          }
          if (voicedMs >= SPEECH_CONFIRM_MS && recorderRef.current) {
            recStarted = true
            speakingAt = now
            setSpeechHeard(true)
          }
          // Otherwise: keep waiting calmly — we never transcribe until you talk.
        } else {
          // ── You're speaking — watch for a natural pause to take the turn ──
          if (avg > SILENCE_THRESHOLD) {
            silenceAt = 0
            setSilenceProgress(0)
          } else {
            if (!silenceAt) silenceAt = now
            const elapsed = now - silenceAt
            setSilenceProgress(Math.min(1, elapsed / SILENCE_TO_STOP_MS))
            if (elapsed > SILENCE_TO_STOP_MS) { finishListening(true); return }
          }
          if (now - speakingAt > HARD_STOP_MS) { finishListening(true); return }
        }
        vadFrameRef.current = requestAnimationFrame(tick)
      }
      vadFrameRef.current = requestAnimationFrame(tick)
    } catch (err) {
      setMicError(err?.message || 'Microphone unavailable')
      setMicState('idle')
    }
  }

  const finishListening = async (spoke = true) => {
    const rec = recorderRef.current
    recorderRef.current = null
    stopVadLoop()
    setSpeechHeard(false)
    // Only transcribe if we actually captured speech; otherwise discard so
    // background noise never becomes a fake answer.
    if (!rec || !spoke) {
      setMicState('idle')
      if (rec) { try { rec.cancel() } catch {} }
      return
    }
    setMicState('transcribing')
    try {
      const blob = await rec.stop()
      const text = await transcribe(blob)
      setMicState('idle')
      if (text && text.trim()) {
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
    setSpeechHeard(false)
    setMicState('idle')
    if (rec) rec.cancel()
  }

  // Exit the discovery and return to the start screen.
  const restart = () => {
    cancelListening()
    setStarted(false)
    setConversation([])
    setFloraMessage('')
    setFloraTyped('')
    setFloraTyping(false)
    setFloraThinking(false)
    setGathered({})
    setUserInput('')
    setAnalysing(false)
    setPipelineDone(false)
    setHandingOff(false)
    setError(null)
    spokenMessageRef.current = null
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
        <div className="flex items-center gap-2">
          {started && !pipelineDone && (
            <button
              onClick={restart}
              title="Exit and start a fresh idea"
              className="pill bg-white hover:bg-cream-50"
            >
              <RotateCcw size={11} className="text-ink-500" /> Start over
            </button>
          )}
          <a href="https://data.london.gov.uk/dataset/" target="_blank" rel="noreferrer" className="pill bg-white hover:bg-cream-50">
            <Database size={11} className="text-sage-500" /> Powered by London Datastore <ExternalLink size={10} />
          </a>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-90px)] max-w-[760px] flex-col items-center justify-center px-6 pb-16 pt-6">
        {!started ? (
          <StartVoice
            onStart={() => setStarted(true)}
            onOpenWorkspace={onOpenWorkspace}
            onDeleteWorkspace={onDeleteWorkspace}
          />
        ) : pipelineDone ? (
          <Ready />
        ) : analysing ? (
          <div className="w-full max-w-[680px]"><Analysing /></div>
        ) : (
          <>
            {/* Living tree on the right — grows as Flora understands more. */}
            <div className="pointer-events-none fixed right-6 top-1/2 z-10 hidden -translate-y-1/2 xl:block 2xl:right-16">
              <GrowingTree gathered={gathered} />
            </div>

            <div
              onClick={micState === 'recording' && speechHeard ? () => finishListening(true) : undefined}
              className={micState === 'recording' && speechHeard ? 'cursor-pointer' : ''}
              title={micState === 'recording' && speechHeard ? 'Tap to stop and send' : ''}
            >
              <AgentFace
                size={210}
                who="flora"
                state={
                  floraThinking ? 'thinking'
                  : floraTyping ? 'speaking'
                  : micState === 'recording' ? 'listening'
                  : micState === 'transcribing' ? 'thinking'
                  : 'idle'
                }
              />
            </div>

            <div className="mt-4 text-[11px] font-medium uppercase tracking-[0.18em] text-ink-500">
              {floraThinking ? 'Flora is thinking…'
                : floraTyping ? 'Flora is speaking'
                : micState === 'recording'
                  ? (!speechHeard ? 'Ready when you are — just start talking'
                     : silenceProgress > 0.4 ? 'Okay, taking your turn…'
                     : 'Listening · I can hear you')
                : micState === 'transcribing' ? 'Catching that…'
                : 'Your turn'}
            </div>

            {/* Audio-reactive bars below the orb once you actually start talking;
                a gentle ready-pulse while waiting for you to begin. */}
            {micState === 'recording' && (
              speechHeard
                ? <ListeningBars level={micLevel} silenceProgress={silenceProgress} />
                : <ReadyPulse />
            )}

            {/* Growing tree lives on the right — see fixed panel below */}

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

function StartVoice({ onStart, onOpenWorkspace, onDeleteWorkspace }) {
  const [workspaces, setWorkspaces] = useState([])
  const [loadingList, setLoadingList] = useState(true)
  const [confirmId, setConfirmId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    let cancelled = false
    api.listDiscoveries()
      .then(list => { if (!cancelled) setWorkspaces(Array.isArray(list) ? list : []) })
      .catch(() => { if (!cancelled) setWorkspaces([]) })
      .finally(() => { if (!cancelled) setLoadingList(false) })
    return () => { cancelled = true }
  }, [])

  const fmtTime = (iso) => {
    if (!iso) return ''
    const ms = Date.now() - new Date(iso).getTime()
    const m = Math.round(ms / 60000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.round(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.round(h / 24)}d ago`
  }

  const statusLabel = (s) =>
    s === 'dashboard_ready' ? 'Ready' :
    s === 'processing' ? 'Working…' :
    s === 'error' ? 'Errored' : s

  return (
    <div className="relative mx-auto flex w-full max-w-[620px] flex-col items-center text-center">
      <span className="pointer-events-none absolute -top-16 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full gradient-soft-peach opacity-50 blur-3xl" />
      <div className="relative">
        <AgentFace who="flora" state="happy" size={132} />
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
        Start a new idea
      </button>

      {/* Existing workspaces */}
      {(loadingList || workspaces.length > 0) && (
        <div className="relative mt-10 w-full max-w-[520px]">
          <div className="section-eyebrow mb-3 flex items-center justify-center gap-2 text-ink-500">
            <span className="h-px w-8 bg-ink-200" />
            Or pick up where you left off
            <span className="h-px w-8 bg-ink-200" />
          </div>

          {loadingList ? (
            <div className="flex items-center justify-center gap-2 py-4 text-[12px] text-ink-400">
              <Loader2 size={12} className="animate-spin" /> Loading…
            </div>
          ) : (
            <div className="space-y-2">
              {workspaces.slice(0, 6).map(w => {
                const confirming = confirmId === w.id
                const deleting = deletingId === w.id
                return (
                  <div
                    key={w.id}
                    className="flex items-center gap-1 rounded-2xl border border-black/[0.06] bg-white pr-2 transition-all hover:shadow-soft hover:border-sage-300"
                  >
                    {confirming ? (
                      <div className="flex flex-1 items-center justify-between gap-2 px-4 py-3">
                        <span className="text-[12.5px] text-ink-600">Delete this workspace?</span>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <button
                            onClick={async () => {
                              if (!onDeleteWorkspace) return
                              setDeletingId(w.id)
                              try {
                                await onDeleteWorkspace(w.id)
                                setWorkspaces(ws => ws.filter(x => x.id !== w.id))
                                setConfirmId(null)
                              } catch (e) {
                                console.warn('Delete failed', e)
                              } finally {
                                setDeletingId(null)
                              }
                            }}
                            disabled={deleting}
                            className="rounded-lg bg-red-500 px-3 py-1.5 text-[11.5px] font-medium text-white hover:bg-red-600 disabled:opacity-50"
                          >
                            {deleting ? 'Deleting…' : 'Delete'}
                          </button>
                          <button
                            onClick={() => setConfirmId(null)}
                            disabled={deleting}
                            className="rounded-lg px-2.5 py-1.5 text-[11.5px] text-ink-500 hover:bg-cream-100"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => onOpenWorkspace?.(w.id)}
                          className="group flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left"
                        >
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl gradient-orb-flora shadow-soft">
                            <LeafMark size={14} className="opacity-95" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[13.5px] font-medium text-forest-500">
                              {(w.workspace_name || 'Untitled workspace').slice(0, 80)}
                            </div>
                            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-ink-400">
                              <span>{statusLabel(w.status)}</span>
                              <span>·</span>
                              <span>{fmtTime(w.created_at)}</span>
                            </div>
                          </div>
                          <ArrowRight size={14} className="shrink-0 text-ink-300 group-hover:text-forest-500" />
                        </button>
                        {onDeleteWorkspace && (
                          <button
                            onClick={() => setConfirmId(w.id)}
                            title="Delete workspace"
                            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-ink-300 transition-colors hover:bg-red-50 hover:text-red-500"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      <Tagline block className="relative mt-12" />
    </div>
  )
}

function Analysing() {
  const STEPS = [
    'Idea profile',
    'Who buys',
    'Worth doing?',
    'Competition',
    'Where to launch',
    'Money & grants',
    'Your 7-day plan',
  ]
  return <GardenProgress steps={STEPS} intervalMs={2600} />
}

function Ready() {
  return (
    <div className="relative mx-auto w-full max-w-[600px] text-center">
      <span aria-hidden className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-56 w-56 rounded-full gradient-soft-peach opacity-50 blur-3xl" />
      <div className="relative flex flex-col items-center">
        <AgentFace who="finn" state="happy" size={120} />
        <h1 className="mt-6 display text-[56px] leading-[1.04] tracking-tight text-forest-500">
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
