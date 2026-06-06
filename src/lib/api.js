const BASE = import.meta.env.VITE_API_URL || '/api'
const AUTH_TOKEN_KEY = 'authToken'

async function request(path, options = {}) {
  const token = getAuthToken()
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`API ${res.status}: ${body}`)
  }
  return res.json()
}

export function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

export function setAuthToken(token) {
  localStorage.setItem(AUTH_TOKEN_KEY, token)
}

export function clearAuthToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY)
}

export const api = {
  authConfig() {
    return request('/auth/config')
  },

  googleLogin(credential) {
    return request('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential }),
    })
  },

  me() {
    return request('/auth/me')
  },

  logout() {
    return request('/auth/logout', { method: 'POST' })
  },

  createDiscovery(data) {
    return request('/discoveries', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  listDiscoveries() {
    return request('/discoveries')
  },

  getDiscovery(id) {
    return request(`/discoveries/${id}`)
  },

  getDashboard(id) {
    return request(`/discoveries/${id}/dashboard`)
  },

  // Poll until the idea profile is ready (status 'ready' or 'dashboard_ready').
  // The intake screen waits on this — once Flora's profile lands, the dashboard
  // opens and Finn's sections stream in there. Returns the full discovery doc.
  async waitUntilReady(id, { intervalMs = 1500, timeoutMs = 5 * 60 * 1000, onTick } = {}) {
    const start = Date.now()
    while (true) {
      const doc = await this.getDiscovery(id)
      if (onTick) onTick(doc)
      if (doc.status === 'ready' || doc.status === 'dashboard_ready') return doc
      if (doc.status === 'error' && !(doc.dashboard && doc.dashboard.idea)) {
        throw new Error(doc.error || 'Analysis failed. Please try re-running.')
      }
      if (Date.now() - start > timeoutMs) {
        throw new Error('Analysis is taking longer than expected. Please try again.')
      }
      await new Promise(r => setTimeout(r, intervalMs))
    }
  },

  // Poll a discovery, calling onUpdate(doc) on every tick, until it reaches a
  // terminal state (dashboard_ready / error). Returns a stop() function so the
  // caller can cancel (e.g. on unmount or workspace switch).
  pollDiscovery(id, onUpdate, { intervalMs = 2000, timeoutMs = 15 * 60 * 1000 } = {}) {
    let stopped = false
    const start = Date.now()
    const tick = async () => {
      if (stopped) return
      try {
        const doc = await this.getDiscovery(id)
        if (stopped) return
        onUpdate(doc)
        const done = doc.status === 'dashboard_ready' || doc.status === 'error'
        if (done || Date.now() - start > timeoutMs) return
      } catch (e) {
        if (stopped) return
        console.warn('poll error', e)
      }
      if (!stopped) setTimeout(tick, intervalMs)
    }
    tick()
    return () => { stopped = true }
  },

  // Back-compat: block until everything is done, return the dashboard.
  async waitForDashboard(id, opts = {}) {
    const doc = await this.waitUntilReady(id, opts)
    if (doc.status === 'dashboard_ready') return doc.dashboard || {}
    // Idea ready but Finn still running — return what we have.
    return doc.dashboard || {}
  },

  updateDashboard(id, updates) {
    return request(`/discoveries/${id}/dashboard`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
  },

  rerunDiscovery(id) {
    return request(`/discoveries/${id}/rerun`, { method: 'POST' })
  },

  refineDiscovery(id, command, persona) {
    return request(`/discoveries/${id}/refine`, {
      method: 'POST',
      body: JSON.stringify({ command, persona }),
    })
  },

  // Finn digs deeper on one section (re-runs just that module).
  refineSection(id, section, instruction) {
    return request(`/discoveries/${id}/refine-section`, {
      method: 'POST',
      body: JSON.stringify({ section, instruction }),
    })
  },

  // Finn answers a question about the insights (no mutation).
  askFinn(id, question) {
    return request(`/discoveries/${id}/ask`, {
      method: 'POST',
      body: JSON.stringify({ question }),
    })
  },

  // Record a founder's answer to an open question → re-runs Flora (clarity++).
  answerQuestion(id, question, answer) {
    return request(`/discoveries/${id}/answer`, {
      method: 'POST',
      body: JSON.stringify({ question, answer }),
    })
  },

  floraChat(conversation) {
    return request('/flora/chat', {
      method: 'POST',
      body: JSON.stringify({ conversation }),
    })
  },

  health() {
    return request('/health')
  },
}
