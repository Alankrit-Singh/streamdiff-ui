import { useState, useEffect } from 'react'
import { listStreams, listGroups, browseMessages, ackMessages } from '../api/client.js'

const PAGE = 50

export default function StreamExplorer({ conn }) {
  const [allStreams, setAllStreams] = useState([])
  const [page,      setPage]      = useState(1)
  const [search,    setSearch]    = useState('')
  const [selected,  setSelected]  = useState(null)
  const [groups,    setGroups]    = useState([])
  const [messages,  setMessages]  = useState([])
  const [view,      setView]      = useState('groups')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [selGroup,  setSelGroup]  = useState(null)
  const [ackIds,    setAckIds]    = useState('')
  const [ackStatus, setAckStatus] = useState('')

  useEffect(() => {
    setAllStreams([]); setSelected(null); setSearch(''); setPage(1); setError('')
    loadStreams()
  }, [conn])

  async function loadStreams() {
    setLoading(true); setError('')
    try {
      const data = await listStreams(conn, 1000)
      setAllStreams(data)
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Failed to load streams')
    } finally {
      setLoading(false)
    }
  }

  async function selectStream(s) {
    setSelected(s.name); setGroups([]); setMessages([]); setView('groups')
    const [g, m] = await Promise.all([
      listGroups(conn, s.name),
      browseMessages(conn, s.name, {})
    ])
    setGroups(g); setMessages(m)
  }

  async function handleAck(e) {
    e.preventDefault()
    if (!selGroup || !ackIds.trim()) return
    const ids = ackIds.split(/[\s,]+/).filter(Boolean)
    const res = await ackMessages(conn, selected, selGroup, ids)
    setAckStatus(`Acknowledged: ${res.acknowledged}`)
    setAckIds('')
    setTimeout(() => setAckStatus(''), 3000)
  }

  const filtered = allStreams.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase())
  )
  const totalPages = Math.ceil(filtered.length / PAGE)
  const pageStreams = filtered.slice((page - 1) * PAGE, page * PAGE)

  const healthColor = h => ({ green: '#3fb950', amber: '#e3b341', red: '#f85149' })[h] || '#8b949e'

  const s = {
    layout:  { display: 'flex', gap: 16, height: '100%', minHeight: 0 },
    sidebar: { width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 },
    search:  {
      width: '100%', boxSizing: 'border-box',
      background: '#0d1117', border: '1px solid #30363d', color: '#c9d1d9',
      padding: '6px 10px', borderRadius: 4, fontSize: 12
    },
    list:    { flex: 1, overflowY: 'auto', minHeight: 0 },
    card:    (active) => ({
      padding: '8px 12px', borderRadius: 4, marginBottom: 4, cursor: 'pointer',
      background: active ? '#1c2128' : '#161b22',
      border: `1px solid ${active ? '#58a6ff' : '#21262d'}`
    }),
    heading: { color: '#8b949e', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 },
    pager:   { display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 },
    pagerBtn:(disabled) => ({
      background: 'none', border: '1px solid #30363d', color: disabled ? '#3d444d' : '#8b949e',
      borderRadius: 3, padding: '3px 8px', fontSize: 11, cursor: disabled ? 'default' : 'pointer'
    }),
    panel:   { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' },
    tabs:    { display: 'flex', borderBottom: '1px solid #21262d', marginBottom: 12, flexShrink: 0 },
    tab:     (active) => ({
      padding: '6px 16px', cursor: 'pointer', fontSize: 12, background: 'none', border: 'none',
      color: active ? '#c9d1d9' : '#8b949e',
      borderBottom: active ? '2px solid #58a6ff' : '2px solid transparent'
    })
  }

  return (
    <div style={s.layout}>
      {/* Stream list */}
      <div style={s.sidebar}>
        <div style={s.heading}>
          Streams {loading && '…'} {allStreams.length > 0 && !loading && `(${filtered.length})`}
        </div>

        <input
          style={s.search}
          placeholder="Filter streams…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
        />

        {error && (
          <div style={{ color: '#f85149', fontSize: 11, padding: '6px 0' }}>
            ⚠ {error} <button style={{ background: 'none', border: 'none', color: '#58a6ff', cursor: 'pointer', fontSize: 11 }} onClick={loadStreams}>Retry</button>
          </div>
        )}

        <div style={s.list}>
          {pageStreams.map(st => (
            <div key={st.name} style={s.card(selected === st.name)} onClick={() => selectStream(st)}>
              <div style={{ color: '#c9d1d9', fontSize: 12, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {st.name}
              </div>
              <div style={{ color: '#8b949e', fontSize: 11 }}>
                {st.length.toLocaleString()} msgs · {st.groups} group{st.groups !== 1 ? 's' : ''}
              </div>
            </div>
          ))}
          {filtered.length === 0 && !loading && (
            <div style={{ color: '#8b949e', fontSize: 11 }}>{search ? 'No matches' : 'No streams found'}</div>
          )}
        </div>

        {totalPages > 1 && (
          <div style={s.pager}>
            <button style={s.pagerBtn(page <= 1)} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <span style={{ color: '#8b949e', fontSize: 11 }}>{page} / {totalPages}</span>
            <button style={s.pagerBtn(page >= totalPages)} disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selected ? (
        <div style={s.panel}>
          <div style={{ marginBottom: 10, color: '#58a6ff', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {selected}
          </div>
          <div style={s.tabs}>
            <button style={s.tab(view === 'groups')}   onClick={() => setView('groups')}>Groups</button>
            <button style={s.tab(view === 'messages')} onClick={() => setView('messages')}>Messages</button>
            <button style={s.tab(view === 'ack')}      onClick={() => setView('ack')}>XACK</button>
          </div>

          <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
            {view === 'groups' && (
              <table>
                <thead><tr>
                  <th>Group</th><th>Last Delivered</th><th>Pending</th><th>Consumers</th><th>Health</th>
                </tr></thead>
                <tbody>
                  {groups.map(g => (
                    <tr key={g.name}>
                      <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</td>
                      <td className="tag-muted" style={{ fontSize: 11 }}>{g.lastDeliveredId}</td>
                      <td>{g.pelCount}</td>
                      <td>{g.consumers}</td>
                      <td style={{ color: healthColor(g.health) }}>⬤ {g.health}</td>
                    </tr>
                  ))}
                  {groups.length === 0 && <tr><td colSpan={5} style={{ color: '#8b949e' }}>No groups</td></tr>}
                </tbody>
              </table>
            )}

            {view === 'messages' && (
              <div>
                {messages.map(m => (
                  <div key={m.id} style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 4, padding: '8px 12px', marginBottom: 6 }}>
                    <div style={{ color: '#58a6ff', fontSize: 11, marginBottom: 4 }}>{m.id}</div>
                    <pre style={{ color: '#c9d1d9', fontSize: 11, whiteSpace: 'pre-wrap', margin: 0 }}>
                      {JSON.stringify(m.body, null, 2)}
                    </pre>
                  </div>
                ))}
                {messages.length === 0 && <div style={{ color: '#8b949e' }}>No messages</div>}
              </div>
            )}

            {view === 'ack' && (
              <form onSubmit={handleAck} style={{ maxWidth: 400 }}>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ color: '#8b949e', fontSize: 11, display: 'block', marginBottom: 4 }}>Consumer Group</label>
                  <select value={selGroup || ''} onChange={e => setSelGroup(e.target.value)}
                    style={{ width: '100%', background: '#0d1117', border: '1px solid #30363d', color: '#c9d1d9', padding: '6px 10px', borderRadius: 4 }}>
                    <option value="">Select group…</option>
                    {groups.map(g => <option key={g.name} value={g.name}>{g.name}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ color: '#8b949e', fontSize: 11, display: 'block', marginBottom: 4 }}>Message IDs (comma or space separated)</label>
                  <textarea rows={3} value={ackIds} onChange={e => setAckIds(e.target.value)} placeholder="1700000000000-0, 1700000000001-0" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button type="submit" className="primary">Acknowledge</button>
                  {ackStatus && <span style={{ color: '#3fb950', fontSize: 11 }}>{ackStatus}</span>}
                </div>
              </form>
            )}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b949e', fontSize: 12 }}>
          Select a stream to inspect
        </div>
      )}
    </div>
  )
}
