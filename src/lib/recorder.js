// Browser microphone recorder built on MediaRecorder. Records webm/opus
// (the universal Chrome/Edge/Safari default) and posts to /api/voice/stt.

export function isRecordingSupported() {
  return (
    typeof navigator !== 'undefined'
    && !!navigator.mediaDevices
    && !!navigator.mediaDevices.getUserMedia
    && typeof window.MediaRecorder !== 'undefined'
  )
}

const PREFERRED_MIMES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  '',
]

function pickMime() {
  for (const m of PREFERRED_MIMES) {
    if (m === '' || (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m))) {
      return m
    }
  }
  return ''
}

export async function createRecorder() {
  if (!isRecordingSupported()) throw new Error('Microphone not supported in this browser')

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const mimeType = pickMime()
  const options = mimeType ? { mimeType } : undefined
  const recorder = new MediaRecorder(stream, options)
  const chunks = []

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data)
  }

  recorder.start(250) // gather data every 250ms

  return {
    stop() {
      return new Promise((resolve) => {
        recorder.onstop = () => {
          stream.getTracks().forEach(t => t.stop())
          const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })
          resolve(blob)
        }
        recorder.stop()
      })
    },
    cancel() {
      stream.getTracks().forEach(t => t.stop())
      try { recorder.stop() } catch {}
    },
    get mimeType() { return recorder.mimeType },
  }
}

const BASE = import.meta.env.VITE_API_URL || ''

export async function transcribe(blob) {
  const form = new FormData()
  const ext = (blob.type || '').includes('mp4') ? 'mp4' : 'webm'
  form.append('file', blob, `audio.${ext}`)
  const res = await fetch(`${BASE}/api/voice/stt`, { method: 'POST', body: form })
  if (!res.ok) {
    let msg = `STT failed (${res.status})`
    try {
      const body = await res.json()
      msg = body.detail || body.error || msg
    } catch { /* ignore */ }
    throw new Error(msg)
  }
  const { text } = await res.json()
  return (text || '').trim()
}
