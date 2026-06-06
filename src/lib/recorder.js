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

// Prompt for mic permission early. Resolves with a stream the caller can
// keep open across multiple recordings, OR throws if denied.
export async function requestMicPermission() {
  if (!isRecordingSupported()) throw new Error('Microphone not supported in this browser')
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  return stream
}

export async function createRecorder({ stream: existingStream } = {}) {
  if (!isRecordingSupported()) throw new Error('Microphone not supported in this browser')

  const stream = existingStream || await navigator.mediaDevices.getUserMedia({ audio: true })
  const mimeType = pickMime()
  const options = mimeType ? { mimeType } : undefined
  const recorder = new MediaRecorder(stream, options)
  const chunks = []

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data)
  }

  recorder.start(250) // gather data every 250ms

  return {
    stream,
    stop() {
      return new Promise((resolve) => {
        recorder.onstop = () => {
          // Only stop the underlying stream tracks if we own this stream.
          if (!existingStream) stream.getTracks().forEach(t => t.stop())
          const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })
          resolve(blob)
        }
        recorder.stop()
      })
    },
    cancel() {
      if (!existingStream) stream.getTracks().forEach(t => t.stop())
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
