import { useState, useEffect } from 'react'
import { listConnections, createConnection, deleteConnection } from '../api/client.js'

const s = {
  form:    { padding: '16px', borderBottom: '1px solid #21262d' },
  label:   { color: '#8b949e', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, display: 'block' },
  field:   { marginBottom: 8 },
  actions: { display: 'flex', gap: 6, marginTop: 8 },
  list:    { flex: 1, overflowY: 'auto', padding: '8px 0' },
  item:    (active) => ({
    padding: '8px 16px', cursor: 'pointer',
    background: active ? '#1c2128' : 'none',
    borderLeft: active ? '2px solid #58a6ff' : '2px solid transparent',
    display: 'flex', flexDirection: 'column', gap: 2,
    transition: 'background 0.1s'
  }),
  name:    { color: '#c9d1d9', fontSize: 12 },
  url:     { color: '#8b949e', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  dot:     { display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#3fb950', marginRight: 6 },
  error:   { color: '#f85149', fontSize: 11, marginTop: 4 },
  del:     { marginLeft: 'auto', opacity: 0, fontSize: 11, color: '#8b949e', background: 'none', border: 'none', padding: '0 4px', lineHeight: 1 }
}

export default function ConnectionManager({ active, onSelect }) {
  const [connections, setConnections] = useState([])
  const [name,   setName]   = useState('')
  const [url,    setUrl]    = useState('')
  const [error,  setError]  = useState('')
  const [loading, setLoading] = useState(false)
  const [hovered, setHovered] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    try { setConnections(await listConnections()) }
    catch { /* ignore on initial load */ }
  }

  function normalizeUrl(raw) {
    const trimmed = raw.trim()
    if (!trimmed) return trimmed
    if (/^redis(s)?:\/\//i.test(trimmed)) return trimmed
    return 'redis://' + trimmed
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (!name.trim() || !url.trim()) return
    setLoading(true); setError('')
    try {
      await createConnection({ name: name.trim(), url: normalizeUrl(url) })
      setName(''); setUrl('')
      await load()
    } catch (err) {
      setError(err.response?.data?.message || 'Connection failed')
    } finally { setLoading(false) }
  }

  async function handleDelete(e, connName) {
    e.stopPropagation()
    await deleteConnection(connName)
    if (active === connName) onSelect(null)
    await load()
  }

  return (
    <>
      <form style={s.form} onSubmit={handleAdd}>
        <div style={s.field}>
          <label style={s.label}>Name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="production" />
        </div>
        <div style={s.field}>
          <label style={s.label}>URL</label>
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="redis://host:6379" />
        </div>
        {error && <div style={s.error}>{error}</div>}
        <div style={s.actions}>
          <button type="submit" className="primary" disabled={loading} style={{ flex: 1 }}>
            {loading ? 'Connecting…' : 'Connect'}
          </button>
        </div>
      </form>

      <div style={s.list}>
        {connections.map(c => (
          <div key={c.name}
               style={s.item(c.name === active)}
               onClick={() => onSelect(c.name)}
               onMouseEnter={() => setHovered(c.name)}
               onMouseLeave={() => setHovered(null)}>
            <div style={s.name}>
              <span style={{ ...s.dot, background: '#3fb950' }} />
              {c.name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={s.url}>{c.url}</span>
              {hovered === c.name && (
                <button style={s.del} onClick={e => handleDelete(e, c.name)}>✕</button>
              )}
            </div>
          </div>
        ))}
        {connections.length === 0 && (
          <div style={{ padding: '12px 16px', color: '#8b949e', fontSize: 11 }}>
            No connections yet
          </div>
        )}
      </div>
    </>
  )
}
