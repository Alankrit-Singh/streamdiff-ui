import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

// ── Connections ──────────────────────────────────────────────────────────
export const listConnections  = ()           => api.get('/connections').then(r => r.data)
export const createConnection = (req)        => api.post('/connections', req).then(r => r.data)
export const deleteConnection = (name)       => api.delete(`/connections/${name}`)

// ── Streams ───────────────────────────────────────────────────────────────
export const listStreams   = (conn, limit = 200) => api.get(`/connections/${conn}/streams`, { params: { limit } }).then(r => r.data)
export const listGroups   = (conn, stream)      => api.get(`/connections/${conn}/streams/${stream}/groups`).then(r => r.data)
export const browseMessages = (conn, stream, params) =>
  api.get(`/connections/${conn}/streams/${stream}/messages`, { params }).then(r => r.data)
export const listPending  = (conn, stream, group, count = 100) =>
  api.get(`/connections/${conn}/streams/${stream}/pending`, { params: { group, count } }).then(r => r.data)
export const ackMessages  = (conn, stream, group, ids) =>
  api.post(`/connections/${conn}/streams/${stream}/ack`, { group, ids }).then(r => r.data)

// ── Cache ─────────────────────────────────────────────────────────────────
export const scanKeys   = (conn, pattern = '*', limit = 200) =>
  api.get(`/connections/${conn}/keys`, { params: { pattern, limit } }).then(r => r.data)
export const getKey     = (conn, key)            => api.get(`/connections/${conn}/keys/${encodeURIComponent(key)}`).then(r => r.data)
export const setKey     = (conn, key, req)       => api.put(`/connections/${conn}/keys/${encodeURIComponent(key)}`, req).then(r => r.data)
export const deleteKey  = (conn, key)            => api.delete(`/connections/${conn}/keys/${encodeURIComponent(key)}`)

// ── PubSub ────────────────────────────────────────────────────────────────
export const publishMessage = (conn, channel, message) =>
  api.post(`/connections/${conn}/pubsub/publish`, { channel, message }).then(r => r.data)

// ── Alerts ────────────────────────────────────────────────────────────────
export const configureAlert = (conn, config)     => api.post(`/connections/${conn}/alerts`, config).then(r => r.data)
export const getAlert       = (conn)             => api.get(`/connections/${conn}/alerts`).then(r => r.data)
export const deleteAlert    = (conn)             => api.delete(`/connections/${conn}/alerts`)

// ── SSE helpers ───────────────────────────────────────────────────────────
export const openHealthStream = (conn, onSample) => {
  const es = new EventSource(`/api/connections/${conn}/health/stream`)
  es.addEventListener('health', e => onSample(JSON.parse(e.data)))
  es.onerror = () => es.close()
  return es
}

export const openPubSubStream = (conn, channel, onMessage) => {
  const es = new EventSource(`/api/connections/${conn}/pubsub/subscribe?channel=${encodeURIComponent(channel)}`)
  es.addEventListener('message', e => onMessage(JSON.parse(e.data)))
  es.onerror = () => es.close()
  return es
}
