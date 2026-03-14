import { useState, useEffect } from 'react'
import { scanKeys, getKey, setKey, deleteKey } from '../api/client.js'

const PAGE = 50

export default function CacheInspector({ conn }) {
  const [pattern,  setPattern]  = useState('*')
  const [allKeys,  setAllKeys]  = useState([])
  const [search,   setSearch]   = useState('')
  const [page,     setPage]     = useState(1)
  const [selected, setSelected] = useState(null)
  const [keyValue, setKeyValue] = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [editVal,  setEditVal]  = useState('')
  const [editTtl,  setEditTtl]  = useState('')
  const [status,   setStatus]   = useState('')

  // Auto-scan with * when connection changes
  useEffect(() => {
    setAllKeys([]); setSelected(null); setKeyValue(null); setSearch(''); setPage(1)
    runScan('*')
  }, [conn])

  async function runScan(pat) {
    setLoading(true); setError('')
    try { setAllKeys(await scanKeys(conn, pat)) }
    catch (err) { setError(err.response?.data?.message || err.message || 'Scan failed') }
    finally { setLoading(false) }
  }

  async function handleScan(e) {
    e?.preventDefault()
    setPage(1); setSearch('')
    await runScan(pattern)
  }

  async function selectKey(key) {
    setSelected(key); setKeyValue(null); setStatus('')
    const kv = await getKey(conn, key)
    setKeyValue(kv)
    setEditVal(typeof kv.value === 'string' ? kv.value : JSON.stringify(kv.value, null, 2))
    setEditTtl(kv.ttl > 0 ? String(kv.ttl) : '')
  }

  async function handleSave(e) {
    e.preventDefault()
    await setKey(conn, selected, { value: editVal, ttl: editTtl ? Number(editTtl) : null })
    setStatus('Saved'); setTimeout(() => setStatus(''), 2000)
  }

  async function handleDelete() {
    if (!window.confirm(`Delete key "${selected}"?`)) return
    await deleteKey(conn, selected)
    setSelected(null); setKeyValue(null)
    setAllKeys(prev => prev.filter(k => k.key !== selected))
  }

  const typeColor = t => ({
    string: '#58a6ff', hash: '#3fb950', list: '#e3b341',
    set: '#a371f7', zset: '#79c0ff', stream: '#f0883e'
  })[t] || '#8b949e'

  const badge = (type) => ({
    display: 'inline-block', padding: '0 5px', borderRadius: 3,
    fontSize: 10, fontWeight: 600, background: '#21262d', color: typeColor(type),
    flexShrink: 0
  })

  const filtered = allKeys.filter(k =>
    !search || k.key.toLowerCase().includes(search.toLowerCase())
  )
  const totalPages = Math.ceil(filtered.length / PAGE)
  const pageKeys   = filtered.slice((page - 1) * PAGE, page * PAGE)

  const pagerBtn = (disabled) => ({
    background: 'none', border: '1px solid #30363d',
    color: disabled ? '#3d444d' : '#8b949e',
    borderRadius: 3, padding: '3px 8px', fontSize: 11,
    cursor: disabled ? 'default' : 'pointer'
  })

  return (
    <div style={{ display: 'flex', gap: 16, height: '100%' }}>
      {/* Key list */}
      <div style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>

        {/* Scan form */}
        <form onSubmit={handleScan} style={{ display: 'flex', gap: 6 }}>
          <input
            value={pattern}
            onChange={e => setPattern(e.target.value)}
            placeholder="pattern e.g. session:*"
            style={{ flex: 1 }}
          />
          <button type="submit" className="primary" disabled={loading} style={{ flexShrink: 0 }}>
            {loading ? '…' : 'Scan'}
          </button>
        </form>

        {/* Search within results */}
        {allKeys.length > 0 && (
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder={`Filter ${allKeys.length.toLocaleString()} keys…`}
            style={{
              background: '#0d1117', border: '1px solid #30363d',
              color: '#c9d1d9', padding: '5px 8px', borderRadius: 4, fontSize: 11
            }}
          />
        )}

        {error && (
          <div style={{ color: '#f85149', fontSize: 11 }}>⚠ {error}</div>
        )}

        {/* Key list */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {pageKeys.map(k => (
            <div key={k.key}
                 onClick={() => selectKey(k.key)}
                 style={{
                   padding: '6px 10px', cursor: 'pointer', borderRadius: 4,
                   marginBottom: 2, background: selected === k.key ? '#1c2128' : 'none',
                   border: `1px solid ${selected === k.key ? '#58a6ff' : 'transparent'}`
                 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={badge(k.type)}>{k.type}</span>
                <span style={{ fontSize: 11, color: '#c9d1d9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  {k.key}
                </span>
              </div>
              <div style={{ fontSize: 10, color: '#8b949e', marginTop: 2 }}>
                TTL: {k.ttl === -1 ? '∞' : `${k.ttl}s`} · {(k.memoryBytes / 1024).toFixed(1)} KB
              </div>
            </div>
          ))}

          {filtered.length === 0 && !loading && (
            <div style={{ color: '#8b949e', fontSize: 11 }}>
              {search ? 'No matches' : 'No keys found'}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
            <button style={pagerBtn(page <= 1)} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <span style={{ color: '#8b949e', fontSize: 11 }}>{page} / {totalPages}</span>
            <button style={pagerBtn(page >= totalPages)} disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        )}
      </div>

      {/* Key detail */}
      {keyValue ? (
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
            <span style={{ color: '#58a6ff', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 400 }}>{selected}</span>
            <span style={badge(keyValue.type)}>{keyValue.type}</span>
            <span style={{ color: '#8b949e', fontSize: 11 }}>TTL: {keyValue.ttl === -1 ? 'no expire' : `${keyValue.ttl}s`}</span>
          </div>

          {keyValue.type === 'string' ? (
            <form onSubmit={handleSave}>
              <textarea rows={8} value={editVal} onChange={e => setEditVal(e.target.value)} style={{ marginBottom: 8 }} />
              <div style={{ marginBottom: 8 }}>
                <label style={{ color: '#8b949e', fontSize: 11, display: 'block', marginBottom: 4 }}>TTL (seconds, blank = no change)</label>
                <input value={editTtl} onChange={e => setEditTtl(e.target.value)} style={{ width: 120 }} />
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button type="submit" className="primary">Save</button>
                <button type="button" className="danger" onClick={handleDelete}>Delete</button>
                {status && <span style={{ color: '#3fb950', fontSize: 11 }}>{status}</span>}
              </div>
            </form>
          ) : (
            <div>
              <pre style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 4, padding: 12, fontSize: 11, color: '#c9d1d9', overflow: 'auto', maxHeight: 400, margin: 0 }}>
                {JSON.stringify(keyValue.value, null, 2)}
              </pre>
              <div style={{ marginTop: 10 }}>
                <button className="danger" onClick={handleDelete}>Delete key</button>
              </div>
            </div>
          )}
        </div>
      ) : (
        !selected && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b949e', fontSize: 12 }}>
            Select a key to inspect
          </div>
        )
      )}
    </div>
  )
}
