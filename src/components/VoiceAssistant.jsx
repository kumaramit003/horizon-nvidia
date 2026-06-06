import React, { useEffect, useRef, useState } from 'react'
import {
  Mic, X, ArrowRight, ArrowLeft, Loader2, AlertTriangle, MessageSquare,
  Sparkles, Search, HelpCircle, Users, LineChart, Swords, MapPin,
  PoundSterling, ListChecks, Send,
} from 'lucide-react'
import { AgentFace } from './AgentFace'
import { api } from '../lib/api'
import { createRecorder, transcribe, isRecordingSupported, requestMicPermission } from '../lib/recorder'

// Areas Finn can dig deeper on (maps to a backend section key).
const FINN_AREAS = [
  { key: 'audience',    label: 'Who buys',         icon: Users },
  { key: 'validation',  label: 'Worth doing?',     icon: LineChart },
  { key: 'competitors', label: 'Competition',      icon: Swords },
  { key: 'locations',   label: 'Where',            icon: MapPin },
  { key: 'financials',  label: 'Money & grants',   icon: PoundSterling },
  { key: 'plan',        label: 'Next 7 days',      icon: ListChecks },
]

const FLORA_IDEAS = [
  'I have a smaller budget than I said.',
  'Actually, I want to avoid a physical storefront.',
  'Focus on B2B customers, not consumers.',
  'My real target customer is different — let me explain.',
]

const FINN_QUESTIONS = [
  'Why is this my top location?',
  "What's my single biggest risk?",
  'Which grant should I apply for first?',
  'How do I beat my main competitor?',
]

function Waveform({ active, level = 0 }) {
  return (
    <div className="flex h-10 items-end justify-center gap-[3px]">
      {Array.from({ length: 26 }).map((_, i) => {
        const center = 1 - Math.abs(i - 12.5) / 13
        const base = 20 + ((i * 13) % 65)
        const dyn = active ? base + level * 40 * center : base * 0.25
        return (
          <span key={i} className={`w-[3px] rounded-full bg-sage-400 ${active ? 'animate-wave' : 'opacity-25'}`}
            style={{ height: `${dyn}%`, animationDelay: `${(i % 11) * 60}ms`, animationDuration: `${750 + (i % 5) * 110}ms` }} />
        )
      })}
    </div>
  )
}

const looksLikeQuestion = (t) =>
  /\?\s*$/.test(t) || /^(why|how|what|which|who|when|where|is|are|should|can|could|do|does)\b/i.test(t.trim())

export default function VoiceAssistant({ open, onClose, prefill, discoveryId, onRefineComplete }) {
  const [agent, setAgent] = useState(null)        // null | 'flora' | 'finn'
  const [finnMode, setFinnMode] = useState('ask') // 'ask' | 'deeper'
  const [area, setArea] = useState('competitors')
  const [text, setText] = useState('')
  const [phase, setPhase] = useState('idle')      // idle | recording | transcribing | sending | answered | sent | error
  const [answer, setAnswer] = useState('')
  const [errMsg, setErrMsg] = useState('')
  const [micLevel, setMicLevel] = useState(0)
  const recorderRef = useRef(null)
  const vadAcRef = useRef(null)
  const vadFrameRef = useRef(null)
  const micSupported = isRecordingSupported()

  // Reset + smart-route any prefilled command.
  useEffect(() => {
    if (!open) return
    setPhase('idle'); setErrMsg(''); setAnswer(''); setMicLevel(0)
    if (prefill) {
      setText(prefill)
      if (looksLikeQuestion(prefill)) { setAgent('finn'); setFinnMode('ask') }
      else { setAgent('flora') }
    } else {
      setText(''); setAgent(null)
    }
  }, [open, prefill])

  const stopVad = () => {
    if (vadFrameRef.current) { cancelAnimationFrame(vadFrameRef.current); vadFrameRef.current = null }
    if (vadAcRef.current) { vadAcRef.current.close().catch(() => {}); vadAcRef.current = null }
    setMicLevel(0)
  }

  const startMic = async () => {
    if (!micSupported || phase !== 'idle') return
    setErrMsg('')
    try {
      const stream = await requestMicPermission()
      const rec = await createRecorder({ stream })
      recorderRef.current = { rec, stream }
      setPhase('recording')
      const AC = window.AudioContext || window.webkitAudioContext
      const ac = new AC(); vadAcRef.current = ac
      const source = ac.createMediaStreamSource(stream)
      const analyser = ac.createAnalyser(); analyser.fftSize = 256
      source.connect(analyser)
      const data = new Uint8Array(analyser.frequencyBinCount)
      const tick = () => {
        analyser.getByteFrequencyData(data)
        let sum = 0; for (let i = 0; i < data.length; i++) sum += data[i]
        setMicLevel(Math.min(1, (sum / data.length) / 80))
        vadFrameRef.current = requestAnimationFrame(tick)
      }
      vadFrameRef.current = requestAnimationFrame(tick)
    } catch (e) { setErrMsg(e?.message || 'Microphone unavailable') }
  }

  const stopMic = async () => {
    const ref = recorderRef.current
    if (!ref) return
    recorderRef.current = null; stopVad(); setPhase('transcribing')
    try {
      const blob = await ref.rec.stop()
      ref.stream.getTracks().forEach(t => t.stop())
      const t = await transcribe(blob)
      if (t) setText(prev => (prev ? `${prev} ${t}` : t))
      setPhase('idle')
    } catch (e) { setErrMsg(e?.message || "Couldn't catch that"); setPhase('idle') }
  }

  useEffect(() => {
    if (!open) {
      stopVad()
      if (recorderRef.current) {
        try { recorderRef.current.rec.cancel() } catch {}
        try { recorderRef.current.stream.getTracks().forEach(t => t.stop()) } catch {}
        recorderRef.current = null
      }
    }
  }, [open])

  // ── Actions ──
  const submitFloraUpdate = async () => {
    const cmd = text.trim()
    if (!cmd || !discoveryId) return
    setPhase('sending'); setErrMsg('')
    try {
      await api.refineDiscovery(discoveryId, cmd, 'flora')
      setPhase('sent')
      await onRefineComplete?.(cmd)
      setTimeout(() => onClose?.(), 1500)
    } catch (e) { setErrMsg(e?.message || 'Could not update'); setPhase('error') }
  }

  const submitFinnDeeper = async () => {
    if (!discoveryId) return
    setPhase('sending'); setErrMsg('')
    try {
      await api.refineSection(discoveryId, area, text.trim())
      setPhase('sent')
      await onRefineComplete?.(`Finn: dig deeper on ${area}`)
      setTimeout(() => onClose?.(), 1500)
    } catch (e) { setErrMsg(e?.message || 'Could not start'); setPhase('error') }
  }

  const submitFinnAsk = async () => {
    const q = text.trim()
    if (!q || !discoveryId) return
    setPhase('sending'); setErrMsg(''); setAnswer('')
    try {
      const { answer } = await api.askFinn(discoveryId, q)
      setAnswer(answer || "Finn didn't have an answer for that.")
      setPhase('answered')
    } catch (e) { setErrMsg(e?.message || 'Finn could not answer'); setPhase('error') }
  }

  if (!open) return null
  const busy = phase === 'transcribing' || phase === 'sending'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-forest-700/30 backdrop-blur-sm" onClick={() => phase !== 'sending' && onClose?.()} />

      <div className="relative z-10 w-full max-w-[580px] overflow-hidden rounded-3xl border border-black/[0.06] bg-cream-50 shadow-lift">
        <div className="pointer-events-none absolute -right-20 -top-24 h-60 w-60 rounded-full gradient-soft-peach opacity-50 blur-2xl" />
        <div className="pointer-events-none absolute -left-16 -bottom-16 h-48 w-48 rounded-full gradient-soft-mint opacity-50 blur-2xl" />

        {/* Header */}
        <div className="relative flex items-center justify-between px-6 pt-5">
          <div className="flex items-center gap-2.5">
            {agent && phase !== 'sent' && (
              <button onClick={() => { setAgent(null); setText(''); setAnswer(''); setPhase('idle') }} className="grid h-7 w-7 place-items-center rounded-lg text-ink-500 hover:bg-cream-100 hover:text-forest-500">
                <ArrowLeft size={16} />
              </button>
            )}
            <div className="leading-tight">
              <div className="text-[15px] font-semibold text-forest-500">
                {!agent ? 'Who do you want to talk to?' : agent === 'flora' ? 'Update your idea with Flora' : 'Work with Finn'}
              </div>
              <div className="text-[11.5px] text-ink-500">
                {!agent ? 'Two advisors, two jobs.' : agent === 'flora' ? 'Changes the idea — the whole plan rebuilds.' : 'Dig deeper or ask about the findings.'}
              </div>
            </div>
          </div>
          <button className="text-ink-400 hover:text-forest-500" onClick={() => onClose?.()} disabled={phase === 'sending'}>
            <X size={18} />
          </button>
        </div>

        {/* ── Sent confirmation ── */}
        {phase === 'sent' ? (
          <div className="relative flex flex-col items-center px-6 py-10 text-center">
            <AgentFace who={agent === 'flora' ? 'flora' : 'finn'} state="happy" size={96} />
            <h3 className="mt-4 display text-[24px] leading-tight text-forest-500">On it.</h3>
            <p className="mt-2 max-w-[360px] text-[13.5px] leading-relaxed text-ink-500">
              {agent === 'flora'
                ? 'Flora is updating your idea — the plan is rebuilding now. Watch the pages refresh.'
                : `Finn is re-researching ${FINN_AREAS.find(a => a.key === area)?.label || 'that area'}. It'll refresh in a moment.`}
            </p>
          </div>
        ) : !agent ? (
          /* ── Agent chooser ── */
          <div className="relative grid grid-cols-1 gap-3 px-6 py-6 sm:grid-cols-2">
            <button
              onClick={() => { setAgent('flora'); setPhase('idle') }}
              className="group rounded-3xl border border-black/[0.06] bg-white p-5 text-left transition-all hover:border-peach-200 hover:shadow-lift"
            >
              <AgentFace who="flora" state="idle" size={84} />
              <div className="mt-3 flex items-center gap-2">
                <span className="display text-[19px] text-forest-500">Flora</span>
                <span className="rounded-full bg-peach-100 px-2 py-0.5 text-[10px] font-medium text-peach-600">Discovery</span>
              </div>
              <p className="mt-1.5 text-[12.5px] leading-snug text-ink-500">
                Update your idea, add detail, or change direction. She rebuilds the whole plan.
              </p>
            </button>
            <button
              onClick={() => { setAgent('finn'); setFinnMode('ask'); setPhase('idle') }}
              className="group rounded-3xl border border-black/[0.06] bg-white p-5 text-left transition-all hover:border-sage-300 hover:shadow-lift"
            >
              <AgentFace who="finn" state="idle" size={84} />
              <div className="mt-3 flex items-center gap-2">
                <span className="display text-[19px] text-forest-500">Finn</span>
                <span className="rounded-full bg-sage-100 px-2 py-0.5 text-[10px] font-medium text-forest-500">Research</span>
              </div>
              <p className="mt-1.5 text-[12.5px] leading-snug text-ink-500">
                Dig deeper on an area, add context, or ask about anything he found.
              </p>
            </button>
          </div>
        ) : agent === 'flora' ? (
          /* ── Flora: update the idea ── */
          <div className="relative px-6 pb-6 pt-4">
            <MicTextInput
              text={text} setText={setText} phase={phase}
              micSupported={micSupported} micLevel={micLevel}
              onStart={startMic} onStop={stopMic}
              placeholder="e.g. I actually have £5k and want to start with pop-ups"
            />
            <ChipRow title="Common updates" chips={FLORA_IDEAS} onPick={setText} />
            {errMsg && <ErrorNote msg={errMsg} />}
            <div className="mt-5 flex items-center justify-end gap-3">
              <button onClick={() => onClose?.()} className="btn-ghost text-[12.5px]">Cancel</button>
              <button onClick={submitFloraUpdate} disabled={!text.trim() || busy || !discoveryId} className="btn-coral text-[13px] disabled:opacity-40">
                {phase === 'sending' ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                Update my idea
              </button>
            </div>
          </div>
        ) : (
          /* ── Finn: deeper / ask ── */
          <div className="relative px-6 pb-6 pt-4">
            <div className="mb-4 inline-flex rounded-full border border-black/[0.06] bg-white p-1">
              <button onClick={() => { setFinnMode('ask'); setAnswer(''); setPhase('idle') }}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-colors ${finnMode === 'ask' ? 'bg-forest-500 text-cream-50' : 'text-ink-600 hover:bg-cream-50'}`}>
                <HelpCircle size={13} /> Ask a question
              </button>
              <button onClick={() => { setFinnMode('deeper'); setAnswer(''); setPhase('idle') }}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-colors ${finnMode === 'deeper' ? 'bg-forest-500 text-cream-50' : 'text-ink-600 hover:bg-cream-50'}`}>
                <Search size={13} /> Dig deeper
              </button>
            </div>

            {finnMode === 'deeper' ? (
              <>
                <div className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-ink-500 mb-2">Which area?</div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {FINN_AREAS.map(({ key, label, icon: Icon }) => (
                    <button key={key} onClick={() => setArea(key)}
                      className={`flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-left text-[12.5px] font-medium transition-all ${area === key ? 'border-sage-300 bg-sage-50 text-forest-500 shadow-soft' : 'border-black/[0.06] bg-white text-forest-500 hover:bg-cream-50'}`}>
                      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-xl ${area === key ? 'bg-sage-100 text-forest-500' : 'bg-cream-100 text-sage-500'}`}>
                        <Icon size={14} />
                      </span>
                      {label}
                    </button>
                  ))}
                </div>
                <div className="mt-3">
                  <MicTextInput
                    text={text} setText={setText} phase={phase}
                    micSupported={micSupported} micLevel={micLevel}
                    onStart={startMic} onStop={stopMic}
                    placeholder="What should Finn look into? (optional) e.g. find more delivery-only rivals"
                    rows={2}
                  />
                </div>
                {errMsg && <ErrorNote msg={errMsg} />}
                <div className="mt-4 flex items-center justify-end gap-3">
                  <button onClick={() => onClose?.()} className="btn-ghost text-[12.5px]">Cancel</button>
                  <button onClick={submitFinnDeeper} disabled={busy || !discoveryId} className="btn-forest text-[13px] disabled:opacity-40">
                    {phase === 'sending' ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                    Dig deeper on {FINN_AREAS.find(a => a.key === area)?.label}
                  </button>
                </div>
              </>
            ) : (
              <>
                <MicTextInput
                  text={text} setText={setText} phase={phase}
                  micSupported={micSupported} micLevel={micLevel}
                  onStart={startMic} onStop={stopMic}
                  placeholder="Ask Finn anything about your plan…"
                  onEnter={submitFinnAsk}
                />
                {answer ? (
                  <div className="mt-4 rounded-2xl border border-sage-200 bg-sage-50 p-4">
                    <div className="flex items-center gap-2 text-[10.5px] font-medium uppercase tracking-[0.16em] text-forest-500 mb-1.5">
                      <MessageSquare size={11} /> Finn
                    </div>
                    <p className="text-[14px] leading-relaxed text-forest-500">{answer}</p>
                  </div>
                ) : (
                  <ChipRow title="Popular questions" chips={FINN_QUESTIONS} onPick={setText} />
                )}
                {errMsg && <ErrorNote msg={errMsg} />}
                <div className="mt-4 flex items-center justify-end gap-3">
                  <button onClick={() => onClose?.()} className="btn-ghost text-[12.5px]">Close</button>
                  <button onClick={submitFinnAsk} disabled={!text.trim() || busy || !discoveryId} className="btn-forest text-[13px] disabled:opacity-40">
                    {phase === 'sending' ? <Loader2 size={14} className="animate-spin" /> : answer ? <Send size={14} /> : <HelpCircle size={14} />}
                    {answer ? 'Ask another' : 'Ask Finn'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Shared mic + textarea input.
function MicTextInput({ text, setText, phase, micSupported, micLevel, onStart, onStop, placeholder, rows = 2, onEnter }) {
  const recording = phase === 'recording'
  const transcribing = phase === 'transcribing'
  return (
    <div className="rounded-2xl bg-white px-3.5 py-3 shadow-soft">
      <div className="flex items-start gap-2">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (onEnter && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onEnter() } }}
          placeholder={placeholder}
          rows={rows}
          className="flex-1 resize-none bg-transparent text-[14px] leading-snug text-forest-500 placeholder:text-ink-300 outline-none"
        />
        {micSupported && (
          <button
            onClick={recording ? onStop : onStart}
            disabled={transcribing}
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl transition-colors ${recording ? 'bg-rose-500 text-white hover:bg-rose-600' : 'bg-cream-100 text-forest-500 hover:bg-cream-200'}`}
            title={recording ? 'Stop & transcribe' : 'Tap to talk'}
          >
            {transcribing ? <Loader2 size={14} className="animate-spin" /> : recording ? <span className="h-3.5 w-3.5 rounded-[3px] bg-white" /> : <Mic size={14} />}
          </button>
        )}
      </div>
      {recording && <div className="mt-2"><Waveform active level={micLevel} /></div>}
    </div>
  )
}

function ChipRow({ title, chips, onPick }) {
  return (
    <div className="mt-3">
      <div className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-ink-500 mb-2">{title}</div>
      <div className="flex flex-wrap gap-1.5">
        {chips.map(c => (
          <button key={c} onClick={() => onPick(c)} className="rounded-full border border-black/[0.06] bg-white px-3 py-1.5 text-[11.5px] text-forest-500 hover:bg-cream-50">
            {c}
          </button>
        ))}
      </div>
    </div>
  )
}

function ErrorNote({ msg }) {
  return (
    <div className="mt-3 flex items-start gap-2 rounded-xl bg-butter-100 border border-butter-200 px-3 py-2 text-[12px] text-ink-700">
      <AlertTriangle size={12} className="mt-0.5 shrink-0 text-butter-300" /> {msg}
    </div>
  )
}

export function VoiceFab({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="group fixed bottom-6 right-6 z-40 flex items-center gap-2.5 rounded-full bg-forest-500 px-4 py-3 text-[13px] font-medium text-cream-50 shadow-[0_20px_50px_-12px_rgba(27,47,28,0.5)] transition-all hover:scale-[1.02] hover:bg-forest-600"
    >
      <span className="relative grid h-7 w-7 place-items-center rounded-full gradient-orb-flora">
        <Mic size={13} className="text-white" />
        <span className="absolute inset-0 animate-ringOut rounded-full bg-peach-300/40" />
      </span>
      Talk to Flora &amp; Finn
      <kbd className="ml-1 hidden rounded-md border border-cream-50/20 bg-cream-50/10 px-1.5 py-0.5 font-mono text-[10px] text-cream-50/80 sm:inline">⌘ ⇧ V</kbd>
    </button>
  )
}
