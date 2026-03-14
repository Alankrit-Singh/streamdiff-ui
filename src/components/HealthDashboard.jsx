import { useState, useEffect, useRef } from 'react'
import { openHealthStream } from '../api/client.js'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, LabelList
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

function ChartCard({ title, collecting, height = 180, children }) {
  return (
    <div style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 4, padding: '12px 16px' }}>
      <div style={{ color: '#8b949e', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
        {title}
        {collecting && <span style={{ color: '#3d444d', marginLeft: 8 }}>(collecting…)</span>}
      </div>
      <ResponsiveContainer width="100%" height={height}>
        {children}
      </ResponsiveContainer>
    </div>
  )
}

export default function HealthDashboard({ conn }) {
  const [statusMap,    setStatusMap]    = useState({})
  const [lagHistory,   setLagHistory]   = useState([])  // per-group lag lines
  const [totalHistory, setTotalHistory] = useState([])  // {time, totalLag, stuckCount}
  const [search,       setSearch]       = useState('')
  const [loading,      setLoading]      = useState(true)
  const esRef       = useRef(null)
  // One chart point per sampling tick — buffer all events for a tick, then commit
  const tickBuffer  = useRef({})   // key -> lag for per-group chart
  const stuckBuffer = useRef({})   // key -> stuck bool for total chart
  const pelBuffer   = useRef({})   // key -> pelCount
  const currentTick = useRef(null)

  useEffect(() => {
    setStatusMap({}); setLagHistory([]); setTotalHistory([]); setLoading(true)
    tickBuffer.current = {}; stuckBuffer.current = {}; pelBuffer.current = {}
    currentTick.current = null
    esRef.current = openHealthStream(conn, onSample)
    return () => esRef.current?.close()
  }, [conn])

  function onSample(sample) {
    setLoading(false)
    const key  = `${sample.stream}/${sample.group}`
    const tick = sample.sampledAt.slice(0, 19)

    setStatusMap(prev => ({ ...prev, [key]: sample }))

    if (tick !== currentTick.current) {
      if (currentTick.current !== null) {
        const committed = { ...tickBuffer.current }
        const time = new Date(currentTick.current).toLocaleTimeString()
        setLagHistory(prev => [...prev.slice(-(MAX_POINTS - 1)), { time, ...committed }])

        const totalLag   = Object.values(tickBuffer.current).reduce((s, v) => s + v, 0)
        const stuckCount = Object.values(stuckBuffer.current).filter(Boolean).length
        setTotalHistory(prev => [...prev.slice(-(MAX_POINTS - 1)), { time, totalLag, stuckCount }])
      }
      currentTick.current = tick
      tickBuffer.current  = {}
      stuckBuffer.current = {}
      pelBuffer.current   = {}
    }

    tickBuffer.current[key]  = sample.lag
    stuckBuffer.current[key] = sample.stuck
    pelBuffer.current[key]   = sample.pelCount
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
      {/* Row 1: Per-group lag lines */}
      {lagHistory.length > 0 && (
        <ChartCard title={`Consumer lag — top ${topKeys.length} by lag`} collecting={lagHistory.length < 2}>
          <LineChart data={lagHistory} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
            <XAxis dataKey="time" stroke="#8b949e" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
            <YAxis stroke="#8b949e" tick={{ fontSize: 9 }} width={50} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
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
        </ChartCard>
      )}

      {/* Row 2: Total lag trend + stuck count side by side */}
      {totalHistory.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <ChartCard title="Total system lag over time" collecting={totalHistory.length < 2}>
            <LineChart data={totalHistory} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
              <XAxis dataKey="time" stroke="#8b949e" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
              <YAxis stroke="#8b949e" tick={{ fontSize: 9 }} width={50} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
              <Tooltip
                contentStyle={{ background: '#1c2128', border: '1px solid #30363d', fontSize: 11 }}
                labelStyle={{ color: '#8b949e' }}
                formatter={v => [v?.toLocaleString(), 'Total Lag']}
              />
              <Line type="monotone" dataKey="totalLag" stroke="#58a6ff" dot={false} strokeWidth={2} />
            </LineChart>
          </ChartCard>

          <ChartCard title="Stuck groups over time" collecting={totalHistory.length < 2}>
            <LineChart data={totalHistory} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
              <XAxis dataKey="time" stroke="#8b949e" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
              <YAxis stroke="#8b949e" tick={{ fontSize: 9 }} width={30} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#1c2128', border: '1px solid #30363d', fontSize: 11 }}
                labelStyle={{ color: '#8b949e' }}
                formatter={v => [v, 'Stuck groups']}
              />
              <Line type="monotone" dataKey="stuckCount" stroke="#f85149" dot={false} strokeWidth={2} />
            </LineChart>
          </ChartCard>
        </div>
      )}

      {/* Row 3: Top 10 streams by pending (PEL) — horizontal bar */}
      {groups.length > 0 && (() => {
        const topPel = [...groups]
          .filter(g => g.pelCount > 0)
          .sort((a, b) => b.pelCount - a.pelCount)
          .slice(0, 10)
          .map(g => ({ name: shortName(`${g.stream}`, 32), pel: g.pelCount, stuck: g.stuck }))
        if (topPel.length === 0) return null
        return (
          <ChartCard title={`Top ${topPel.length} streams by pending messages (PEL)`} height={topPel.length * 28 + 20}>
            <BarChart data={topPel} layout="vertical" margin={{ top: 4, right: 60, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" horizontal={false} />
              <XAxis type="number" stroke="#8b949e" tick={{ fontSize: 9 }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
              <YAxis type="category" dataKey="name" stroke="#8b949e" tick={{ fontSize: 9 }} width={160} />
              <Tooltip
                contentStyle={{ background: '#1c2128', border: '1px solid #30363d', fontSize: 11 }}
                formatter={v => [v?.toLocaleString(), 'Pending']}
              />
              <Bar dataKey="pel" radius={[0, 3, 3, 0]}>
                {topPel.map((entry, i) => (
                  <Cell key={i} fill={entry.stuck ? '#f85149' : '#e3b341'} />
                ))}
                <LabelList dataKey="pel" position="right" style={{ fill: '#8b949e', fontSize: 9 }}
                           formatter={v => v?.toLocaleString()} />
              </Bar>
            </BarChart>
          </ChartCard>
        )
      })()}

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
