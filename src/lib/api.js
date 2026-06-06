const BASE = import.meta.env.VITE_API_URL || '/api'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`API ${res.status}: ${body}`)
  }
  return res.json()
}

export const api = {
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

  updateDashboard(id, updates) {
    return request(`/discoveries/${id}/dashboard`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
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
