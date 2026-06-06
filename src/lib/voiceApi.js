// ElevenLabs TTS now lives inside the FastAPI backend at /api/voice/tts.
// In dev, Vite proxies /api → http://localhost:8000.
// In Docker, nginx proxies /api → backend:8000.
const BASE = import.meta.env.VITE_API_URL || ''

export async function speakWithElevenLabs({ text, persona = 'finn', signal }) {
  const response = await fetch(`${BASE}/api/voice/tts`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text, persona }),
    signal,
  })

  if (!response.ok) {
    let message = 'TTS request failed'
    try {
      const payload = await response.json()
      message = payload.detail || payload.error || message
    } catch {
      message = await response.text()
    }
    throw new Error(message)
  }

  return response.blob()
}

export async function voiceHealth() {
  const res = await fetch(`${BASE}/api/voice/health`)
  return res.json()
}
