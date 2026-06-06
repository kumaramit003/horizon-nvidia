import { createServer } from 'node:http'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

loadEnv()

const port = Number(process.env.VOICE_API_PORT || 8787)
const modelId = process.env.ELEVENLABS_MODEL_ID || 'eleven_flash_v2_5'

const voices = {
  finn: process.env.ELEVENLABS_VOICE_ID_FINN,
  flora: process.env.ELEVENLABS_VOICE_ID_FLORA,
}

const server = createServer(async (req, res) => {
  setCors(res)

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.method === 'GET' && req.url === '/api/voice/health') {
    sendJson(res, 200, {
      ok: true,
      hasApiKey: isConfigured(process.env.ELEVENLABS_API_KEY),
      voices: {
        finn: isConfigured(voices.finn),
        flora: isConfigured(voices.flora),
      },
      modelId,
    })
    return
  }

  if (req.method === 'POST' && req.url === '/api/voice/tts') {
    try {
      const body = await readJson(req)
      const persona = body.persona === 'flora' ? 'flora' : 'finn'
      const text = String(body.text || '').trim()
      const voiceId = voices[persona]

      if (!isConfigured(process.env.ELEVENLABS_API_KEY)) {
        sendJson(res, 500, { error: 'Missing ELEVENLABS_API_KEY in .env' })
        return
      }

      if (!isConfigured(voiceId)) {
        sendJson(res, 500, { error: `Missing ELEVENLABS_VOICE_ID_${persona.toUpperCase()} in .env` })
        return
      }

      if (!text) {
        sendJson(res, 400, { error: 'Missing text' })
        return
      }

      const elevenRes = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/stream?output_format=mp3_44100_128`,
        {
          method: 'POST',
          headers: {
            accept: 'audio/mpeg',
            'content-type': 'application/json',
            'xi-api-key': process.env.ELEVENLABS_API_KEY,
          },
          body: JSON.stringify({
            text,
            model_id: modelId,
            voice_settings: {
              stability: persona === 'flora' ? 0.48 : 0.58,
              similarity_boost: 0.78,
              style: persona === 'flora' ? 0.22 : 0.1,
              use_speaker_boost: true,
            },
          }),
        },
      )

      if (!elevenRes.ok) {
        const message = await elevenRes.text()
        sendJson(res, elevenRes.status, { error: message || 'ElevenLabs request failed' })
        return
      }

      const audio = Buffer.from(await elevenRes.arrayBuffer())
      res.writeHead(200, {
        'content-type': 'audio/mpeg',
        'content-length': audio.length,
        'cache-control': 'no-store',
      })
      res.end(audio)
    } catch (error) {
      sendJson(res, 500, { error: error instanceof Error ? error.message : 'Voice API failed' })
    }
    return
  }

  sendJson(res, 404, { error: 'Not found' })
})

server.listen(port, () => {
  console.log(`ElevenLabs voice API listening on http://localhost:${port}`)
})

function loadEnv() {
  const file = resolve(process.cwd(), '.env')
  if (!existsSync(file)) return

  const lines = readFileSync(file, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const equals = trimmed.indexOf('=')
    if (equals === -1) continue

    const key = trimmed.slice(0, equals).trim()
    let value = trimmed.slice(equals + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    if (!process.env[key]) process.env[key] = value
  }
}

function setCors(res) {
  res.setHeader('access-control-allow-origin', '*')
  res.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS')
  res.setHeader('access-control-allow-headers', 'content-type')
}

function isConfigured(value) {
  return Boolean(value && !value.startsWith('replace_with_'))
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'content-type': 'application/json',
    'cache-control': 'no-store',
  })
  res.end(JSON.stringify(payload))
}

function readJson(req) {
  return new Promise((resolveJson, reject) => {
    let raw = ''
    req.setEncoding('utf8')
    req.on('data', chunk => {
      raw += chunk
      if (raw.length > 20_000) {
        reject(new Error('Request body too large'))
        req.destroy()
      }
    })
    req.on('end', () => {
      try {
        resolveJson(raw ? JSON.parse(raw) : {})
      } catch {
        reject(new Error('Invalid JSON body'))
      }
    })
    req.on('error', reject)
  })
}
