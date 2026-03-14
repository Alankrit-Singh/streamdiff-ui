import { useState, useEffect, useRef } from 'react'
import { openHealthStream } from '../api/client.js'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

const MAX_POINTS   = 30
const CHART_SERIES = 8   // cap lines in the chart to keep it readable
const COLORS = ['#58a6ff', '#3fb950', '#e3b341', '#f85149', '#a371f7', '#79c0ff', '#ffa657', '#f0883e']

function lagColor(lag) {
  if (lag < 100)  return '#3fb950'
  if (lag < 1000) return '#e3b341'
  return '#f85149'
}

function shortName(name, max = 28) {
  if (!name) return ''
  if (name.length <= max) return name
  return '…' + name.slice(-(max - 1))
}

export default function HealthDashboard({ conn }) {
  const [statusMap,   setStatusMap]   = useState({})
  const [lagHistory,  setLagHistory]  = useState([])
  const [search,      setSearch]      = useState('')
  const [loading,     setLoading]     = useState(true)
  const esRef = useRef(null)

  useEffect(() => {
    setStatusMap({}); setLagHistory([]); setLoading(true)
    esRef.current = openHealthStream(conn, onSample)
    return () => esRef.current?.close()
  }, [conn])

  function onSample(sample) {
    setLoading(false)
    const key = `${sample.stream}/${sample.group}`

    setStatusMap(prev => ({ ...prev, [key]: sample }))

    setLagHistory(prev => {
      const point = { time: new Date(sample.sampledAt).toLocaleTimeString() }
      const last  = prev[prev.length - 1] || {}
      const next  = { ...last, ...point, [key]: sample.lag }
      return [...prev.slice(-(MAX_POINTS - 1)), next]
    })
  }

  const groups = Object.values(statusMap)

  // Summary stats
  const totalStreams   = new Set(groups.map(g => g.stream)).size
  const totalConsumers = groups.reduce((s, g) => s + g.consumerCount, 0)
  const totalLag       = groups.reduce((s, g) => s + g.lag, 0)
  const stuckCount     = groups.filter(g => g.stuck).length

  // Filtered groups for the grid
  const filtered = groups.filter(g =>
    !search || g.stream.toLowerCase().includes(search.toLowerCase()) ||
               g.group.toLowerCase().includes(search.toLowerCase())
  )

  // Chart — only top N streams by current lag to avoid an unreadable legend
  const topKeys = [...groups]
    .sort((a, b) => b.lag - a.lag)
    .slice(0, CHART_SERIES)
    .map(g => `${g.stream}/${g.group}`)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Summary bar */}
      {groups.length > 0 && (
        <div style={{ display: 'flex', gap: 16 }}>
          {[
            { label: 'Streams',   value: totalStreams },
            { label: 'Consumers', value: totalConsumers },
            { label: 'Total Lag', value: totalLag.toLocaleString(), color: lagColor(totalLag / Math.max(groups.length, 1)) },
            { label: 'Stuck',     value: stuckCount, color: stuckCount > 0 ? '#f85149' : '#3fb950' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 4, padding: '10px 16px', minWidth: 100 }}>
              <div style={{ color: '#8b949e', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</div>
              <div style={{ color: color || '#c9d1d9', fontSize: 22, fontWeight: 600, lineHeight: 1 }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {loading && groups.length === 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#8b949e', fontSize: 13 }}>
          <span style={{
            display: 'inline-block', width: 14, height: 14, borderRadius: '50%',
            border: '2px solid #30363d', borderTopColor: '#58a6ff',
            animation: 'spin 0.8s linear infinite'
          }} />
          Waiting for first health sample…
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      )}
      {!loading && groups.length === 0 && (
        <div style={{ color: '#8b949e', fontSize: 13 }}>
          No streams found on this connection.
        </div>
      )}

      {/* Lag chart */}
      {lagHistory.length > 1 && (
        <div style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 4, padding: '12px 16px' }}>
          <div style={{ color: '#8b949e', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
            Consumer Lag — top {topKeys.length} by lag
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={lagHistory} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
              <XAxis dataKey="time" stroke="#8b949e" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
              <YAxis stroke="#8b949e" tick={{ fontSize: 9 }} width={40} />
              <Tooltip
                contentStyle={{ background: '#1c2128', border: '1px solid #30363d', fontSize: 11 }}
                labelStyle={{ color: '#8b949e' }}
                formatter={(val, name) => [val?.toLocaleString() ?? '—', shortName(name, 40)]}
              />
              {topKeys.map((key, i) => (
                <Line key={key} type="monotone" dataKey={key}
                      stroke={COLORS[i % COLORS.length]}
                      dot={false} strokeWidth={1.5} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Card grid */}
      {groups.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: '#8b949e', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Groups ({filtered.length})
            </span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter…"
              style={{
                background: '#0d1117', border: '1px solid #30363d', color: '#c9d1d9',
                padding: '4px 8px', borderRadius: 4, fontSize: 11, width: 180
              }}
            />
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 8
          }}>
            {filtered.map(g => {
              const key = `${g.stream}/${g.group}`
              return (
                <div key={key} style={{
                  background: '#161b22',
                  border: `1px solid ${g.stuck ? '#f85149' : '#21262d'}`,
                  borderRadius: 4, padding: '10px 12px',
                  minWidth: 0
                }}>
                  {/* Stream name */}
                  <div title={g.stream} style={{
                    color: '#58a6ff', fontSize: 11, marginBottom: 2,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                  }}>
                    {g.stream}
                  </div>
                  {/* Group name */}
                  <div title={g.group} style={{
                    color: '#8b949e', fontSize: 10, marginBottom: 8,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                  }}>
                    {g.group}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
                    {[
                      { label: 'Lag',       value: g.lag.toLocaleString(),         color: lagColor(g.lag) },
                      { label: 'Pending',   value: g.pelCount.toLocaleString(),     color: '#c9d1d9' },
                      { label: 'Consumers', value: g.consumerCount,                 color: '#c9d1d9' },
                    ].map(({ label, value, color }) => (
                      <div key={label}>
                        <div style={{ color: '#8b949e', fontSize: 9, textTransform: 'uppercase' }}>{label}</div>
                        <div style={{ color, fontSize: 15, fontWeight: 600, lineHeight: 1.2 }}>{value}</div>
                      </div>
                    ))}
                  </div>

                  {g.stuck && (
                    <div style={{ color: '#f85149', fontSize: 10, marginTop: 6 }}>⚠ stuck</div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
