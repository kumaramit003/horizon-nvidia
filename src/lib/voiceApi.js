const voiceApiBase = import.meta.env.VITE_VOICE_API_URL || ''

export async function speakWithElevenLabs({ text, persona = 'finn', signal }) {
  const response = await fetch(`${voiceApiBase}/api/voice/tts`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text, persona }),
    signal,
  })

  if (!response.ok) {
    let message = 'ElevenLabs request failed'
    try {
      const payload = await response.json()
      message = payload.error || message
    } catch {
      message = await response.text()
    }
    throw new Error(message)
  }

  return response.blob()
}
