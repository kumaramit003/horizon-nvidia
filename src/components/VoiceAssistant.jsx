import React, { useEffect, useRef, useState } from 'react'
import {
  Mic, X, ArrowRight, Loader2, AlertTriangle, PoundSterling, MapPin,
  Users, Search, ShieldAlert, Sparkles, Pencil, Check,
} from 'lucide-react'
import { LeafMark } from './Brand'
import { api } from '../lib/api'
import { createRecorder, transcribe, isRecordingSupported, requestMicPermission } from '../lib/recorder'

// Founder-framed quick changes. The user never needs to know "Flora" vs
// "Finn" — they just say what they want and the backend routes it.
const QUICK_CHANGES = [
  { icon: PoundSterling, label: 'Smaller budget',   cmd: 'I have a smaller budget to start with — rework the plan around that.' },
  { icon: MapPin,        label: 'Cheaper area',      cmd: 'Suggest a cheaper London area with similar demand.' },
  { icon: Users,         label: 'B2B only',          cmd: 'Focus only on B2B customers, drop the rest.' },
  { icon: Search,        label: 'Find funding',      cmd: 'Find funding and grants I could realistically apply for.' },
  { icon: ShieldAlert,   label: 'My biggest risk',   cmd: "What's my single biggest risk, and how do I reduce it?" },
  { icon: Sparkles,      label: 'Go more premium',   cmd: 'Make this idea more premium and higher-end.' },
]

function Waveform({ active, level = 0 }) {
  return (
    <div className="flex h-12 items-end justify-center gap-[3px]">
      {Array.from({ length: 32 }).map((_, i) => {
        const center = 1 - Math.abs(i - 15.5) / 16
        const base = 18 + ((i * 13) % 70)
        const dyn = active ? base + level * 40 * center : base * 0.25
        return (
          <span
            key={i}
            className={`w-[3px] rounded-full bg-peach-400 ${active ? 'animate-wave' : 'opacity-25'}`}
            style={{
              height: `${dyn}%`,
              animationDelay: `${(i % 12) * 60}ms`,
              animationDuration: `${750 + (i % 5) * 110}ms`,
            }}
          />
        )
      })}
    </div>
  )
}

export default function VoiceAssistant({ open, onClose, prefill, discoveryId, onRefineComplete }) {
  // phase: idle | recording | transcribing | sent | error
  const [phase, setPhase] = useState('idle')
  const [text, setText] = useState('')
  const [showType, setShowType] = useState(false)
  const [errMsg, setErrMsg] = useState('')
  const [micLevel, setMicLevel] = useState(0)
  const recorderRef = useRef(null)
  const vadAcRef = useRef(null)
  const vadFrameRef = useRef(null)
  const inputRef = useRef(null)
  const micSupported = isRecordingSupported()

  useEffect(() => {
    if (!open) return
    setText(prefill || '')
    setShowType(!!prefill)
    setPhase('idle')
    setErrMsg('')
    setMicLevel(0)
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
      if (transcript) setText(prev => (prev ? `${prev} ${transcript}` : transcript))
      setShowType(true)
      setPhase('idle')
    } catch (e) {
      setErrMsg(e?.message || "Couldn't catch that — try again")
      setPhase('idle')
    }
  }

  const submit = async (cmdOverride) => {
    const command = (cmdOverride ?? text).trim()
    if (!command) return
    if (!discoveryId) { setErrMsg('Open a workspace first.'); setPhase('error'); return }
    setErrMsg('')
    setText(command)
    try {
      // Fire the refine (returns immediately; pipeline streams in the bg).
      await api.refineDiscovery(discoveryId, command)
      setPhase('sent')
      // Let the dashboard pick up the live re-generation, then close.
      await onRefineComplete?.(command)
      setTimeout(() => onClose?.(), 1600)
    } catch (e) {
      setErrMsg(e?.message || 'Could not apply that change')
      setPhase('error')
    }
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

  if (!open) return null

  const busy = phase === 'transcribing'
  const recording = phase === 'recording'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-forest-700/30 backdrop-blur-sm" onClick={() => phase !== 'sent' && onClose?.()} />

      <div className="relative z-10 w-full max-w-[560px] overflow-hidden rounded-3xl border border-black/[0.06] bg-cream-50 shadow-lift">
        <div className="pointer-events-none absolute -right-20 -top-24 h-60 w-60 rounded-full gradient-soft-peach opacity-60 blur-2xl" />
        <div className="pointer-events-none absolute -left-16 -bottom-16 h-48 w-48 rounded-full gradient-soft-mint opacity-50 blur-2xl" />

        {/* Header */}
        <div className="relative flex items-center justify-between px-6 pt-5">
          <div className="flex items-center gap-3">
            <span className="relative grid h-9 w-9 place-items-center rounded-2xl gradient-orb-flora shadow-soft">
              <LeafMark size={15} className="opacity-95" />
            </span>
            <div className="leading-tight">
              <div className="text-[15px] font-semibold text-forest-500">Change your plan</div>
              <div className="text-[11.5px] text-ink-500">Say what to tweak — your plan reworks itself.</div>
            </div>
          </div>
          <button className="text-ink-400 hover:text-forest-500" onClick={() => onClose?.()} disabled={phase === 'sent'}>
            <X size={18} />
          </button>
        </div>

        {phase === 'sent' ? (
          /* ── Honest "on it" confirmation — no fake checkmarks ── */
          <div className="relative flex flex-col items-center px-6 py-12 text-center">
            <span className="relative grid h-16 w-16 place-items-center rounded-3xl gradient-orb-finn shadow-lift">
              <LeafMark size={24} className="opacity-95" />
              <span className="absolute inset-0 animate-ringOut rounded-3xl border border-sage-300/50" />
            </span>
            <h3 className="mt-5 display text-[26px] leading-tight text-forest-500">On it.</h3>
            <p className="mt-2 max-w-[360px] text-[14px] leading-relaxed text-ink-500">
              Finn is reworking your plan around <span className="text-forest-500">“{text.length > 60 ? text.slice(0, 60) + '…' : text}”</span>.
              Watch the pages refresh as each part lands.
            </p>
          </div>
        ) : (
          <>
            {/* ── Voice hero ── */}
            <div className="relative flex flex-col items-center px-6 pt-6">
              {micSupported ? (
                <button
                  onClick={recording ? stopMicAndTranscribe : startMic}
                  disabled={busy}
                  className={`relative grid h-20 w-20 place-items-center rounded-full shadow-lift transition-all
                    ${recording ? 'bg-rose-500 hover:bg-rose-600 scale-105'
                      : busy ? 'bg-sage-300 cursor-wait'
                      : 'gradient-orb-flora hover:scale-105'}`}
                >
                  {recording && <span className="absolute inset-0 animate-ringOut rounded-full bg-rose-400/40" />}
                  {busy
                    ? <Loader2 size={26} className="text-white animate-spin" />
                    : recording
                      ? <span className="h-5 w-5 rounded-[5px] bg-white" />
                      : <Mic size={26} className="text-white" />}
                </button>
              ) : null}

              <div className="mt-3 h-12 w-full">
                {recording
                  ? <Waveform active level={micLevel} />
                  : <div className="flex h-12 items-center justify-center text-[12.5px] text-ink-500">
                      {busy ? 'Catching that…'
                        : micSupported ? 'Tap the mic and just talk'
                        : 'Type your change below'}
                    </div>}
              </div>
            </div>

            {/* ── Transcript / typed command (shows once there's content or typing) ── */}
            {(text || showType) && (
              <div className="relative px-6 pt-1">
                <div className="rounded-2xl bg-white px-4 py-3 shadow-soft">
                  <textarea
                    ref={inputRef}
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
                    placeholder="e.g. I only have £5k and want to avoid a storefront"
                    rows={2}
                    autoFocus={showType}
                    className="w-full resize-none bg-transparent text-[14.5px] leading-snug text-forest-500 placeholder:text-ink-300 outline-none"
                  />
                </div>
              </div>
            )}

            {/* ── Quick changes (founder-framed, no agent names) ── */}
            <div className="relative px-6 pt-4">
              <div className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-ink-500 mb-2.5">
                Or pick a change
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {QUICK_CHANGES.map(({ icon: Icon, label, cmd }) => {
                  const activeChip = text === cmd
                  return (
                    <button
                      key={label}
                      onClick={() => { setText(cmd); setShowType(true) }}
                      className={`group flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-left text-[12.5px] font-medium transition-all
                        ${activeChip
                          ? 'border-peach-300 bg-peach-50 text-peach-600 shadow-soft'
                          : 'border-black/[0.06] bg-white text-forest-500 hover:bg-cream-50'}`}
                    >
                      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-xl transition-colors
                        ${activeChip ? 'bg-peach-100 text-peach-600' : 'bg-cream-100 text-sage-500 group-hover:bg-cream-200'}`}>
                        {activeChip ? <Check size={14} /> : <Icon size={14} />}
                      </span>
                      <span className="leading-tight">{label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {!text && !showType && (
              <div className="relative px-6 pt-3">
                <button onClick={() => { setShowType(true); setTimeout(() => inputRef.current?.focus(), 50) }} className="btn-text text-ink-400">
                  <Pencil size={12} /> Type it instead
                </button>
              </div>
            )}

            {errMsg && (
              <div className="relative px-6 pt-3">
                <div className="flex items-start gap-2 rounded-xl bg-butter-100 border border-butter-200 px-3 py-2 text-[12px] text-ink-700">
                  <AlertTriangle size={12} className="mt-0.5 shrink-0 text-butter-300" /> {errMsg}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="relative mt-5 flex items-center justify-end gap-3 border-t border-black/[0.05] px-6 py-4">
              <button onClick={() => onClose?.()} className="btn-ghost text-[12.5px]">Cancel</button>
              <button
                onClick={() => submit()}
                disabled={!text.trim() || !discoveryId || busy}
                className="btn-forest text-[13px] disabled:opacity-40"
              >
                Update my plan <ArrowRight size={14} />
              </button>
            </div>
          </>
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
      <span className="relative grid h-7 w-7 place-items-center rounded-full gradient-orb-flora">
        <Mic size={13} className="text-white" />
        <span className="absolute inset-0 animate-ringOut rounded-full bg-peach-300/40" />
      </span>
      Change your plan
      <kbd className="ml-1 hidden rounded-md border border-cream-50/20 bg-cream-50/10 px-1.5 py-0.5 font-mono text-[10px] text-cream-50/80 sm:inline">⌘ ⇧ V</kbd>
    </button>
  )
}
