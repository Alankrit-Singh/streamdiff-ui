import { useState, useEffect, useRef } from 'react'
import { openPubSubStream, publishMessage } from '../api/client.js'

export default function PubSubMonitor({ conn }) {
  const [channel,   setChannel]   = useState('')
  const [subscribed, setSubscribed] = useState(false)
  const [messages,  setMessages]  = useState([])
  const [pubChan,   setPubChan]   = useState('')
  const [pubMsg,    setPubMsg]    = useState('')
  const [pubStatus, setPubStatus] = useState('')
  const esRef  = useRef(null)
  const listRef = useRef(null)

  useEffect(() => () => esRef.current?.close(), [conn])
  useEffect(() => { listRef.current?.scrollTo(0, listRef.current.scrollHeight) }, [messages])

  function handleSubscribe(e) {
    e.preventDefault()
    if (!channel.trim()) return
    esRef.current?.close()
    setMessages([])
    setSubscribed(true)
    esRef.current = openPubSubStream(conn, channel.trim(), msg => {
      setMessages(prev => [...prev, msg])
    })
  }

  function handleUnsubscribe() {
    esRef.current?.close(); esRef.current = null
    setSubscribed(false)
  }

  async function handlePublish(e) {
    e.preventDefault()
    if (!pubChan.trim() || !pubMsg.trim()) return
    const res = await publishMessage(conn, pubChan.trim(), pubMsg.trim())
    setPubStatus(`Delivered to ${res.receivers} subscriber(s)`)
    setPubMsg('')
    setTimeout(() => setPubStatus(''), 3000)
  }

  const s = {
    layout:  { display: 'flex', gap: 16 },
    heading: { color: '#8b949e', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 },
    card:    { background: '#161b22', border: '1px solid #21262d', borderRadius: 4, padding: 12 }
  }

  return (
    <div style={s.layout}>
      {/* Subscribe panel */}
      <div style={{ flex: 1 }}>
        <div style={s.heading}>Subscribe</div>
        <div style={s.card}>
          <form onSubmit={subscribed ? undefined : handleSubscribe}
                style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            <input value={channel} onChange={e => setChannel(e.target.value)}
                   placeholder="channel-name" disabled={subscribed} />
            {subscribed ? (
              <button type="button" onClick={handleUnsubscribe} style={{ flexShrink: 0 }}>Unsubscribe</button>
            ) : (
              <button type="submit" className="primary" style={{ flexShrink: 0 }}>Subscribe</button>
            )}
          </form>

          {subscribed && (
            <div style={{ color: '#3fb950', fontSize: 11, marginBottom: 8 }}>
              ⬤ Listening on <strong>{channel}</strong>
            </div>
          )}

          <div ref={listRef} style={{ height: 300, overflowY: 'auto' }}>
            {messages.map((m, i) => (
              <div key={i} style={{ padding: '4px 0', borderBottom: '1px solid #21262d', fontSize: 11 }}>
                <span style={{ color: '#8b949e', marginRight: 10 }}>
                  {new Date(m.receivedAt).toLocaleTimeString()}
                </span>
                <span style={{ color: '#58a6ff', marginRight: 10 }}>{m.channel}</span>
                <span style={{ color: '#c9d1d9' }}>{m.message}</span>
              </div>
            ))}
            {messages.length === 0 && (
              <div style={{ color: '#8b949e', marginTop: 20, textAlign: 'center' }}>
                {subscribed ? 'Waiting for messages…' : 'Subscribe to a channel to see messages'}
              </div>
            )}
          </div>

          {messages.length > 0 && (
            <div style={{ marginTop: 6, color: '#8b949e', fontSize: 11 }}>
              {messages.length} message{messages.length !== 1 ? 's' : ''} received
            </div>
          )}
        </div>
      </div>

      {/* Publish panel */}
      <div style={{ width: 300, flexShrink: 0 }}>
        <div style={s.heading}>Publish</div>
        <div style={s.card}>
          <form onSubmit={handlePublish}>
            <div style={{ marginBottom: 8 }}>
              <label style={{ color: '#8b949e', fontSize: 11, display: 'block', marginBottom: 4 }}>Channel</label>
              <input value={pubChan} onChange={e => setPubChan(e.target.value)} placeholder="channel-name" />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={{ color: '#8b949e', fontSize: 11, display: 'block', marginBottom: 4 }}>Message</label>
              <textarea rows={4} value={pubMsg} onChange={e => setPubMsg(e.target.value)} placeholder='{"event": "test"}' />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button type="submit" className="primary">Publish</button>
              {pubStatus && <span style={{ color: '#3fb950', fontSize: 11 }}>{pubStatus}</span>}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
