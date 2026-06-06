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

  // Poll a discovery until its pipeline reaches a terminal state. The pipeline
  // now runs in the background (creation returns instantly), so the UI waits
  // here instead of on one long-blocking HTTP request.
  async waitForDashboard(id, { intervalMs = 3000, timeoutMs = 15 * 60 * 1000, onTick } = {}) {
    const start = Date.now()
    while (true) {
      const doc = await this.getDiscovery(id)
      const status = doc.status
      if (onTick) onTick(doc)
      if (status === 'dashboard_ready') return doc.dashboard || {}
      if (status === 'error') {
        throw new Error(doc.error || 'Analysis failed. Please try re-running.')
      }
      if (Date.now() - start > timeoutMs) {
        throw new Error('Analysis is taking longer than expected. Please try again.')
      }
      await new Promise(r => setTimeout(r, intervalMs))
    }
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
