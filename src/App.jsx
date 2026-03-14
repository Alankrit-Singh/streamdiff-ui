import { useState } from 'react'
import ConnectionManager from './components/ConnectionManager.jsx'
import StreamExplorer    from './components/StreamExplorer.jsx'
import HealthDashboard   from './components/HealthDashboard.jsx'
import CacheInspector    from './components/CacheInspector.jsx'
import PubSubMonitor     from './components/PubSubMonitor.jsx'

const TABS = ['Streams', 'Health', 'Cache', 'PubSub']

const styles = {
  app:    { display: 'flex', height: '100vh', overflow: 'hidden' },
  sidebar: {
    width: 240, background: '#161b22', borderRight: '1px solid #21262d',
    display: 'flex', flexDirection: 'column', flexShrink: 0
  },
  logo: { padding: '16px 20px', borderBottom: '1px solid #21262d', color: '#58a6ff', fontSize: 15, fontWeight: 600, letterSpacing: '-0.02em' },
  main:  { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  nav:   { display: 'flex', borderBottom: '1px solid #21262d', background: '#0d1117' },
  navTab: (active) => ({
    padding: '10px 20px', cursor: 'pointer', fontSize: 12,
    color: active ? '#c9d1d9' : '#8b949e',
    borderBottom: active ? '2px solid #58a6ff' : '2px solid transparent',
    background: 'none', border: 'none', borderBottom: active ? '2px solid #58a6ff' : '2px solid transparent'
  }),
  content: { flex: 1, overflow: 'auto', padding: '12px 20px 20px' },
  placeholder: { color: '#8b949e', marginTop: 40, textAlign: 'center' }
}

export default function App() {
  const [activeConn, setActiveConn] = useState(null)
  const [activeTab,  setActiveTab]  = useState('Streams')

  return (
    <div style={styles.app}>
      <aside style={styles.sidebar}>
        <div style={styles.logo}>streamdiff</div>
        <ConnectionManager active={activeConn} onSelect={setActiveConn} />
      </aside>

      <main style={styles.main}>
        <nav style={styles.nav}>
          {TABS.map(tab => (
            <button key={tab} style={styles.navTab(tab === activeTab)}
                    onClick={() => setActiveTab(tab)}>
              {tab}
            </button>
          ))}
        </nav>

        <div style={styles.content}>
          {!activeConn ? (
            <p style={styles.placeholder}>Select or add a connection to get started</p>
          ) : (
            <>
              {activeTab === 'Streams' && <StreamExplorer conn={activeConn} />}
              {activeTab === 'Health'  && <HealthDashboard conn={activeConn} />}
              {activeTab === 'Cache'   && <CacheInspector conn={activeConn} />}
              {activeTab === 'PubSub'  && <PubSubMonitor conn={activeConn} />}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
