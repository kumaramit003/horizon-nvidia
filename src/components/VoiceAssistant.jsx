import React, { useEffect, useRef, useState } from 'react'
import { Mic, X, ArrowLeft, Loader2, AlertTriangle, Send, Check, Volume2, VolumeX, Sparkles } from 'lucide-react'
import { AgentFace } from './AgentFace'
import { api } from '../lib/api'
import { speakWithElevenLabs } from '../lib/voiceApi'
import { createRecorder, transcribe, isRecordingSupported, requestMicPermission } from '../lib/recorder'

const OPENERS = {
  flora: "Hey! What's on your mind about your idea? Tell me, or push back on anything I've assumed.",
  finn: "Ask me anything about your plan — or tell me what to dig into deeper.",
}
const STARTERS = {
  flora: ['Challenge one of your assumptions', 'I want to change direction', 'My budget is different'],
  finn: ['Why is this my top location?', "What's my biggest risk?", 'Dig deeper on competitors'],
}

export default function VoiceAssistant({ open, onClose, prefill, discoveryId, onRefineComplete }) {
  const [agent, setAgent] = useState(null)
  const [messages, setMessages] = useState([])      // { role:'user'|'agent', text }
  const [text, setText] = useState('')
  const [phase, setPhase] = useState('idle')         // idle | recording | transcribing | thinking | applying
  const [proposal, setProposal] = useState(null)     // { change_summary, apply }
  const [speaking, setSpeaking] = useState(false)
  const [errMsg, setErrMsg] = useState('')
  const [micLevel, setMicLevel] = useState(0)
  const recRef = useRef(null)
  const vadAcRef = useRef(null)
  const vadFrameRef = useRef(null)
  const audioRef = useRef(null)
  const threadRef = useRef(null)
  const revealRafRef = useRef(null)
  const msgIdRef = useRef(0)
  const micSupported = isRecordingSupported()

  const reset = () => { setMessages([]); setText(''); setProposal(null); setErrMsg(''); setPhase('idle') }

  // Open + route any prefilled command.
  useEffect(() => {
    if (!open) return
    stopAudio()
    const pf = (prefill && typeof prefill === 'object') ? prefill : (prefill ? { text: prefill } : null)
    if (pf?.text) {
      const who = pf.agent === 'finn' ? 'finn' : 'flora'
      setAgent(who)
      reset()
      // auto-send the seeded message
      setTimeout(() => sendMessage(pf.text, who, []), 60)
    } else if (pf?.agent === 'flora' || pf?.agent === 'finn') {
      // Open straight into a chat with the requested agent (e.g. tapping a face).
      const who = pf.agent
      setAgent(who); reset(); setPhase('thinking')
      sayAsAgent(OPENERS[who], who, () => setPhase('idle'))
    } else {
      setAgent(null); reset()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, prefill])

  useEffect(() => { threadRef.current?.scrollTo({ top: 9e9, behavior: 'smooth' }) }, [messages, phase])

  // ── TTS + synced text reveal ──
  const cancelReveal = () => {
    if (revealRafRef.current) { cancelAnimationFrame(revealRafRef.current); revealRafRef.current = null }
  }
  // Instantly finish revealing whatever is mid-stream (on stop/close).
  const revealAll = () => setMessages(m => m.map(mm => (mm.reveal != null && mm.reveal < (mm.text?.length || 0)) ? { ...mm, reveal: mm.text.length } : mm))
  const stopAudio = () => {
    cancelReveal()
    if (audioRef.current) { try { audioRef.current.pause() } catch {} audioRef.current = null }
    revealAll()
    setSpeaking(false)
  }

  // Add an agent message and speak it, revealing the text in lockstep with the
  // voice so the words appear as she says them — and the face animates to the
  // real audio, not the text. Falls back to plain text if TTS is unavailable.
  const sayAsAgent = async (txt, who, onStart) => {
    stopAudio()
    if (!txt) return
    const id = ++msgIdRef.current
    let started = false
    const show = (animate) => {
      if (started) return
      started = true
      setMessages(m => [...m, { role: 'agent', text: txt, id, reveal: animate ? 0 : txt.length }])
      onStart?.()
    }
    let url, audio
    try {
      const blob = await speakWithElevenLabs({ text: txt, persona: who })
      url = URL.createObjectURL(blob)
      audio = new Audio(url)
      audioRef.current = audio
    } catch {
      show(false)   // no voice — just show the text
      return
    }
    const total = txt.length
    const finish = () => {
      cancelReveal()
      setMessages(m => m.map(mm => mm.id === id ? { ...mm, reveal: total } : mm))
      setSpeaking(false)
      if (url) { URL.revokeObjectURL(url); url = null }
    }
    audio.onplay = () => {
      setSpeaking(true)
      show(true)
      const durMs = (isFinite(audio.duration) && audio.duration > 0) ? audio.duration * 1000 : total * 55
      const t0 = performance.now()
      cancelReveal()
      const step = () => {
        const frac = Math.min(1, (performance.now() - t0) / durMs)
        const n = Math.max(1, Math.floor(frac * total))
        setMessages(m => m.map(mm => mm.id === id ? { ...mm, reveal: n } : mm))
        if (frac < 1) revealRafRef.current = requestAnimationFrame(step)
      }
      revealRafRef.current = requestAnimationFrame(step)
    }
    audio.onended = finish
    audio.onerror = () => { show(true); finish() }
    try {
      await audio.play()
    } catch {
      show(true); finish()   // autoplay blocked — reveal text anyway
    }
  }

  // ── Mic ──
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
      const rec = await createRecorder({ stream }); recRef.current = { rec, stream }
      setPhase('recording')
      const AC = window.AudioContext || window.webkitAudioContext
      const ac = new AC(); vadAcRef.current = ac
      const src = ac.createMediaStreamSource(stream); const an = ac.createAnalyser(); an.fftSize = 256; src.connect(an)
      const data = new Uint8Array(an.frequencyBinCount)
      const tick = () => { an.getByteFrequencyData(data); let s = 0; for (let i = 0; i < data.length; i++) s += data[i]; setMicLevel(Math.min(1, (s / data.length) / 80)); vadFrameRef.current = requestAnimationFrame(tick) }
      vadFrameRef.current = requestAnimationFrame(tick)
    } catch (e) { setErrMsg(e?.message || 'Microphone unavailable') }
  }
  const stopMic = async () => {
    const ref = recRef.current; if (!ref) return
    recRef.current = null; stopVad(); setPhase('transcribing')
    try {
      const blob = await ref.rec.stop(); ref.stream.getTracks().forEach(t => t.stop())
      const t = await transcribe(blob)
      setText(prev => (prev ? `${prev} ${t}` : t)); setPhase('idle')
    } catch (e) { setErrMsg(e?.message || "Couldn't catch that"); setPhase('idle') }
  }

  useEffect(() => {
    if (!open) {
      stopVad(); stopAudio()
      if (recRef.current) { try { recRef.current.rec.cancel() } catch {} ; try { recRef.current.stream.getTracks().forEach(t => t.stop()) } catch {} ; recRef.current = null }
    }
  }, [open])

  // ── Send a chat turn ──
  const sendMessage = async (raw, who = agent, base = messages) => {
    const t = (raw ?? text).trim()
    if (!t || !discoveryId || !who) return
    stopAudio()
    setText(''); setErrMsg(''); setProposal(null)
    const next = [...base, { role: 'user', text: t }]
    setMessages(next)
    setPhase('thinking')
    try {
      const res = await api.chatWithAgent(discoveryId, who, next)
      const reply = res.reply || '…'
      // Keep the thinking dots until she actually starts speaking, then stream
      // the text in sync with her voice.
      await sayAsAgent(reply, who, () => setPhase('idle'))
      if (res.proposes_change && res.apply && res.apply.kind !== 'none') {
        setProposal({ summary: res.change_summary || 'Apply this change', apply: res.apply })
      }
    } catch (e) {
      setErrMsg(e?.message || 'Could not reach the agent'); setPhase('idle')
    }
  }

  const applyProposal = async () => {
    if (!proposal || !discoveryId) return
    setPhase('applying'); setErrMsg('')
    try {
      const { kind, section, command } = proposal.apply
      if (kind === 'section' && section) await api.refineSection(discoveryId, section, command || '')
      else await api.refineDiscovery(discoveryId, command || proposal.summary, agent)
      setMessages(m => [...m, { role: 'system', text: `Applied — your plan is updating.` }])
      setProposal(null); setPhase('idle')
      await onRefineComplete?.(proposal.summary)
    } catch (e) {
      setErrMsg(e?.message || 'Could not apply'); setPhase('idle')
    }
  }

  if (!open) return null
  const thinking = phase === 'thinking'
  const busy = phase === 'transcribing' || phase === 'applying'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-forest-700/30 backdrop-blur-sm" onClick={() => phase !== 'applying' && onClose?.()} />

      <div className="relative z-10 flex max-h-[88vh] w-full max-w-[560px] flex-col overflow-hidden rounded-3xl border border-black/[0.06] bg-cream-50 shadow-lift">
        <div className="pointer-events-none absolute -right-20 -top-24 h-60 w-60 rounded-full gradient-soft-peach opacity-50 blur-2xl" />
        <div className="pointer-events-none absolute -left-16 -bottom-16 h-48 w-48 rounded-full gradient-soft-mint opacity-50 blur-2xl" />

        {/* Header */}
        <div className="relative flex items-center justify-between px-5 pt-4">
          <div className="flex items-center gap-2.5">
            {agent && (
              <button onClick={() => { setAgent(null); reset(); stopAudio() }} className="grid h-7 w-7 place-items-center rounded-lg text-ink-500 hover:bg-cream-100 hover:text-forest-500">
                <ArrowLeft size={16} />
              </button>
            )}
            <div className="leading-tight">
              <div className="text-[15px] font-semibold text-forest-500">
                {!agent ? 'Who do you want to talk to?' : agent === 'flora' ? 'Talking with Flora' : 'Talking with Finn'}
              </div>
              <div className="text-[11.5px] text-ink-500">
                {!agent ? 'Two advisors. Chat, debate, decide together.' : agent === 'flora' ? 'She owns your idea — she may push back.' : 'He owns the research — ask or challenge him.'}
              </div>
            </div>
          </div>
          <button className="text-ink-400 hover:text-forest-500" onClick={() => onClose?.()} disabled={phase === 'applying'}>
            <X size={18} />
          </button>
        </div>

        {!agent ? (
          /* ── Chooser ── */
          <div className="relative grid grid-cols-1 gap-3 px-5 py-6 sm:grid-cols-2">
            {['flora', 'finn'].map(who => (
              <button key={who} onClick={() => { setAgent(who); reset(); setPhase('thinking'); sayAsAgent(OPENERS[who], who, () => setPhase('idle')) }}
                className={`group rounded-3xl border border-black/[0.06] bg-white p-5 text-left transition-all hover:shadow-lift ${who === 'flora' ? 'hover:border-peach-200' : 'hover:border-sage-300'}`}>
                <AgentFace who={who} state="idle" size={88} />
                <div className="mt-3 flex items-center gap-2">
                  <span className="display text-[19px] text-forest-500">{who === 'flora' ? 'Flora' : 'Finn'}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${who === 'flora' ? 'bg-peach-100 text-peach-600' : 'bg-sage-100 text-forest-500'}`}>
                    {who === 'flora' ? 'Discovery' : 'Research'}
                  </span>
                </div>
                <p className="mt-1.5 text-[12.5px] leading-snug text-ink-500">
                  {who === 'flora' ? 'Reshape your idea — she rebuilds the plan once you both agree.' : 'Question or challenge his findings; he can dig deeper.'}
                </p>
              </button>
            ))}
          </div>
        ) : (
          /* ── Chat ── */
          <div className="relative flex min-h-0 flex-1 flex-col">
            {/* agent face strip */}
            <div className="flex items-center gap-3 px-5 pt-3">
              <AgentFace who={agent} state={thinking ? 'thinking' : speaking ? 'speaking' : 'idle'} size={64} />
              <div className="text-[12px] text-ink-500">
                {thinking ? `${agent === 'flora' ? 'Flora' : 'Finn'} is thinking…` : speaking ? 'Speaking…' : 'Listening for you.'}
              </div>
            </div>

            {/* thread */}
            <div ref={threadRef} className="relative mt-2 flex-1 space-y-3 overflow-y-auto px-5 py-3" style={{ minHeight: 180 }}>
              {messages.map((m, i) => (
                m.role === 'system' ? (
                  <div key={i} className="flex items-center justify-center">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-sage-100 px-3 py-1 text-[11.5px] font-medium text-forest-500">
                      <Check size={12} /> {m.text}
                    </span>
                  </div>
                ) : (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-snug ${m.role === 'user' ? 'bg-forest-500 text-cream-50' : 'bg-white text-forest-500 shadow-soft'}`}>
                      {m.reveal != null ? m.text.slice(0, m.reveal) : m.text}
                      {m.reveal != null && m.reveal < m.text.length && (
                        <span className="ml-0.5 inline-block h-3.5 w-[2px] -translate-y-[1px] animate-breathe bg-sage-400 align-middle" />
                      )}
                    </div>
                  </div>
                )
              ))}
              {thinking && (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-white px-3.5 py-3 shadow-soft">
                    <span className="inline-flex gap-1">
                      {[0, 1, 2].map(i => <span key={i} className="h-1.5 w-1.5 rounded-full bg-sage-400 animate-breathe" style={{ animationDelay: `${i * 150}ms` }} />)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* proposal / apply */}
            {proposal && (
              <div className="relative mx-5 mb-2 rounded-2xl border border-peach-200 bg-peach-50 p-3.5">
                <div className="flex items-start gap-2">
                  <Sparkles size={14} className="mt-0.5 shrink-0 text-peach-500" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-peach-600">Proposed change</div>
                    <div className="mt-0.5 text-[13.5px] text-forest-500">{proposal.summary}</div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-end gap-2">
                  <button onClick={() => setProposal(null)} className="btn-ghost text-[12px]">Not yet</button>
                  <button onClick={applyProposal} disabled={phase === 'applying'} className="btn-coral text-[12.5px]">
                    {phase === 'applying' ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Apply &amp; update plan
                  </button>
                </div>
              </div>
            )}

            {/* starters (only before the founder has spoken) */}
            {messages.filter(m => m.role === 'user').length === 0 && !thinking && (
              <div className="relative px-5 pb-1">
                <div className="flex flex-wrap gap-1.5">
                  {STARTERS[agent].map(s => (
                    <button key={s} onClick={() => sendMessage(s)} className="rounded-full border border-black/[0.06] bg-white px-3 py-1.5 text-[11.5px] text-forest-500 hover:bg-cream-50">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {errMsg && (
              <div className="relative mx-5 mb-2 flex items-start gap-2 rounded-xl bg-butter-100 border border-butter-200 px-3 py-2 text-[12px] text-ink-700">
                <AlertTriangle size={12} className="mt-0.5 shrink-0 text-butter-300" /> {errMsg}
              </div>
            )}

            {/* input */}
            <div className="relative border-t border-black/[0.05] px-5 py-3">
              <div className="flex items-end gap-2 rounded-2xl bg-white px-3.5 py-2.5 shadow-soft">
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                  placeholder={`Message ${agent === 'flora' ? 'Flora' : 'Finn'}…`}
                  rows={1}
                  className="flex-1 resize-none bg-transparent text-[14px] leading-snug text-forest-500 placeholder:text-ink-300 outline-none"
                />
                {speaking && (
                  <button onClick={stopAudio} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-cream-100 text-forest-500 hover:bg-cream-200" title="Stop voice">
                    <VolumeX size={14} />
                  </button>
                )}
                {micSupported && (
                  <button onClick={phase === 'recording' ? stopMic : startMic} disabled={busy || thinking}
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${phase === 'recording' ? 'bg-rose-500 text-white hover:bg-rose-600' : 'bg-cream-100 text-forest-500 hover:bg-cream-200'}`}
                    title={phase === 'recording' ? 'Stop & transcribe' : 'Tap to talk'}>
                    {phase === 'transcribing' ? <Loader2 size={14} className="animate-spin" /> : phase === 'recording' ? <span className="h-3.5 w-3.5 rounded-[3px] bg-white" /> : <Mic size={14} />}
                  </button>
                )}
                <button onClick={() => sendMessage()} disabled={!text.trim() || busy || thinking}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-forest-500 text-white hover:bg-forest-600 disabled:opacity-40" title="Send">
                  <Send size={14} />
                </button>
              </div>
            </div>
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
      <span className="relative grid h-7 w-7 place-items-center rounded-full gradient-orb-flora">
        <Mic size={13} className="text-white" />
        <span className="absolute inset-0 animate-ringOut rounded-full bg-peach-300/40" />
      </span>
      Talk to Flora &amp; Finn
      <kbd className="ml-1 hidden rounded-md border border-cream-50/20 bg-cream-50/10 px-1.5 py-0.5 font-mono text-[10px] text-cream-50/80 sm:inline">⌘ ⇧ V</kbd>
    </button>
  )
}
