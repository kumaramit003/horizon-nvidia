import React, { useEffect, useRef, useState } from 'react'
import { Mic, MicOff, X, Sparkles, ArrowRight, Check, Loader2, Send, AlertTriangle } from 'lucide-react'
import { LeafMark } from './Brand'
import { api } from '../lib/api'
import { createRecorder, transcribe, isRecordingSupported, requestMicPermission } from '../lib/recorder'

// Sections that get an "Updated" pulse after a successful refine.
const PLAN_SECTIONS = [
  { page: 'The idea',         hint: 'Idea profile refreshed' },
  { page: 'Who buys',         hint: 'Audience segments updated' },
  { page: 'Worth doing?',     hint: 'Evidence + risks re-scored' },
  { page: 'Locations',        hint: 'Locations re-ranked' },
  { page: 'Money & grants',   hint: 'Bands + grants refreshed' },
  { page: 'Your next 7 days', hint: 'Plan + tasks rewritten' },
]

function Waveform({ active, level = 0 }) {
  return (
    <div className="flex h-9 items-end gap-[3px]">
      {Array.from({ length: 28 }).map((_, i) => {
        const center = 1 - Math.abs(i - 13.5) / 14
        const base = 22 + ((i * 13) % 75)
        const dyn = active ? base + level * 30 * center : base * 0.3
        return (
          <span
            key={i}
            className={`w-[3px] rounded-full bg-sage-400 ${active ? 'animate-wave' : 'opacity-30'}`}
            style={{
              height: `${dyn}%`,
              animationDelay: `${(i % 12) * 70}ms`,
              animationDuration: `${800 + (i % 5) * 120}ms`,
            }}
          />
        )
      })}
    </div>
  )
}

const SUGGESTIONS = [
  'Flora, challenge my riskiest assumption',
  'Finn, find more grants',
  'Finn, compare Canary Wharf and Shoreditch',
  'Finn, halve the budget',
]

export default function VoiceAssistant({ open, onClose, prefill, discoveryId, onRefineComplete }) {
  // phase: idle | recording | transcribing | submitting | done | error
  const [phase, setPhase] = useState('idle')
  const [text, setText] = useState('')
  const [errMsg, setErrMsg] = useState('')
  const [micLevel, setMicLevel] = useState(0)
  const recorderRef = useRef(null)
  const vadAcRef = useRef(null)
  const vadFrameRef = useRef(null)
  const inputRef = useRef(null)
  const micSupported = isRecordingSupported()

  // Reset on open + apply prefill
  useEffect(() => {
    if (!open) return
    setText(prefill || '')
    setPhase('idle')
    setErrMsg('')
    setMicLevel(0)
    setTimeout(() => inputRef.current?.focus(), 50)
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

      // simple level meter
      const AC = window.AudioContext || window.webkitAudioContext
      const ac = new AC()
      vadAcRef.current = ac
      const source = ac.createMediaStreamSource(stream)
      const analyser = ac.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      const data = new Uint8Array(analyser.frequencyBinCount)
      const tick = () => {
        analyser.getByteFrequencyData(data)
        let sum = 0
        for (let i = 0; i < data.length; i++) sum += data[i]
        setMicLevel(Math.min(1, (sum / data.length) / 80))
        vadFrameRef.current = requestAnimationFrame(tick)
      }
      vadFrameRef.current = requestAnimationFrame(tick)
    } catch (e) {
      setErrMsg(e?.message || 'Microphone unavailable')
    }
  }

  const stopMicAndTranscribe = async () => {
    const ref = recorderRef.current
    if (!ref) return
    recorderRef.current = null
    stopVad()
    setPhase('transcribing')
    try {
      const blob = await ref.rec.stop()
      ref.stream.getTracks().forEach(t => t.stop())
      const transcript = await transcribe(blob)
      if (transcript) setText(prev => prev ? `${prev} ${transcript}` : transcript)
      setPhase('idle')
      setTimeout(() => inputRef.current?.focus(), 50)
    } catch (e) {
      setErrMsg(e?.message || 'Transcription failed')
      setPhase('idle')
    }
  }

  const submit = async () => {
    const command = text.trim()
    if (!command) return
    if (!discoveryId) {
      setErrMsg('No workspace selected to refine.')
      setPhase('error')
      return
    }
    setPhase('submitting')
    setErrMsg('')
    try {
      // Heuristic persona routing — if they prefix "Flora," or "Finn,"
      let persona
      const m = command.match(/^(flora|finn)\b/i)
      if (m) persona = m[1].toLowerCase()
      await api.refineDiscovery(discoveryId, command, persona)
      await onRefineComplete?.(command)
      setPhase('done')
      setTimeout(() => onClose?.(), 1200)
    } catch (e) {
      setErrMsg(e?.message || 'Refine failed')
      setPhase('error')
    }
  }

  // Cleanup on close
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

  if (!open) return null

  const busy = phase === 'submitting' || phase === 'transcribing'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-6 sm:items-center sm:justify-center">
      <div className="absolute inset-0 bg-forest-700/30 backdrop-blur-sm" onClick={() => !busy && onClose?.()} />

      <div className="relative z-10 w-full max-w-[640px] overflow-hidden rounded-3xl border border-black/[0.06] bg-cream-50 shadow-lift">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full gradient-soft-peach opacity-60 blur-2xl" />
        <div className="pointer-events-none absolute -left-16 -bottom-16 h-48 w-48 rounded-full gradient-soft-mint opacity-50 blur-2xl" />

        {/* Header */}
        <div className="relative flex items-center justify-between px-5 py-4 border-b border-black/[0.04]">
          <div className="flex items-center gap-3">
            <span className="relative grid h-9 w-9 place-items-center rounded-2xl gradient-orb-finn shadow-soft">
              <LeafMark size={15} className="opacity-95" />
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-sage-400 ring-2 ring-cream-50 animate-breathe" />
            </span>
            <div className="leading-tight">
              <div className="text-[14px] font-semibold text-forest-500">Refine with voice</div>
              <div className="text-[11.5px] text-ink-500">
                {discoveryId ? 'Say "Flora" or "Finn" — they\'ll route it' : 'No workspace selected'}
              </div>
            </div>
          </div>
          <button className="text-ink-500 hover:text-forest-500 disabled:opacity-50" onClick={() => onClose?.()} disabled={busy}>
            <X size={17} />
          </button>
        </div>

        {/* Waveform */}
        <div className="relative px-5 pt-5">
          <Waveform active={phase === 'recording'} level={micLevel} />
        </div>

        {/* Input */}
        <div className="relative px-5 pt-4">
          <div className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-ink-500 mb-1.5">You</div>
          <div className="rounded-2xl bg-white px-3.5 py-3 shadow-soft flex items-start gap-2">
            <textarea
              ref={inputRef}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }
              }}
              placeholder='e.g. "Finn, find grants for a food business under £10k"'
              rows={2}
              disabled={busy}
              className="flex-1 resize-none bg-transparent text-[14px] text-forest-500 placeholder:text-ink-300 outline-none"
            />
            {micSupported && phase !== 'submitting' && (
              <button
                onClick={phase === 'recording' ? stopMicAndTranscribe : startMic}
                disabled={phase === 'transcribing' || phase === 'submitting'}
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl transition-colors
                  ${phase === 'recording' ? 'bg-rose-500 text-white hover:bg-rose-600' : 'bg-cream-100 text-forest-500 hover:bg-cream-200'}`}
                title={phase === 'recording' ? 'Stop & transcribe' : 'Hold to talk'}
              >
                {phase === 'transcribing' ? <Loader2 size={14} className="animate-spin" /> : <Mic size={14} />}
              </button>
            )}
            <button
              onClick={submit}
              disabled={!text.trim() || busy || !discoveryId}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-forest-500 text-white transition-colors hover:bg-forest-600 disabled:opacity-30"
              title="Submit (Enter)"
            >
              {phase === 'submitting' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
          {errMsg && (
            <div className="mt-2 flex items-start gap-2 rounded-xl bg-butter-100 border border-butter-200 px-3 py-2 text-[12px] text-ink-700">
              <AlertTriangle size={12} className="mt-0.5 shrink-0 text-butter-300" />
              <span>{errMsg}</span>
            </div>
          )}
        </div>

        {/* Suggestions */}
        {phase === 'idle' && !errMsg && (
          <div className="relative px-5 pt-3">
            <div className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-ink-500 mb-2">Quick prompts</div>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => setText(s)}
                  className="rounded-full border border-black/[0.06] bg-white px-3 py-1.5 text-[11.5px] text-forest-500 hover:bg-cream-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Submitting / done state — animated section list */}
        {(phase === 'submitting' || phase === 'done') && (
          <div className="relative px-5 pt-4 pb-5">
            <div className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-ink-500 mb-2 flex items-center gap-1.5">
              <Sparkles size={11} className="text-sage-500" />
              {phase === 'done' ? 'Your plan, updated' : 'Updating your plan…'}
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {PLAN_SECTIONS.map((u, i) => (
                <div
                  key={u.page}
                  className={`flex items-start gap-2.5 rounded-2xl border border-black/[0.04] bg-white px-3 py-2.5 shadow-soft transition-all duration-500
                    ${phase === 'done' ? 'opacity-100 translate-y-0' : 'opacity-70 translate-y-1'}`}
                  style={{ transitionDelay: `${i * 80}ms` }}
                >
                  <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full transition-colors
                    ${phase === 'done' ? 'bg-sage-100 text-forest-500' : 'bg-cream-100 text-ink-400'}`}>
                    {phase === 'done' ? <Check size={11} /> : <Loader2 size={11} className="animate-spin" />}
                  </span>
                  <div className="min-w-0 leading-tight">
                    <div className="text-[12.5px] font-semibold text-forest-500">{u.page}</div>
                    <div className="mt-0.5 text-[12px] text-ink-500">{u.hint}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer (idle) */}
        {phase === 'idle' && (
          <div className="relative flex items-center justify-end gap-3 border-t border-black/[0.04] px-5 py-3">
            <button onClick={() => onClose?.()} className="btn-ghost text-[12.5px]">Cancel</button>
            <button
              onClick={submit}
              disabled={!text.trim() || !discoveryId}
              className="btn-forest text-[12.5px]"
            >
              Send to {text.toLowerCase().startsWith('flora') ? 'Flora' : text.toLowerCase().startsWith('finn') ? 'Finn' : 'Flora & Finn'}
              <ArrowRight size={13} />
            </button>
          </div>
        )}
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
