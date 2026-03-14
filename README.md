# streamdiff-ui

> The frontend for [streamdiff](https://github.com/mr-alankrit/streamdiff) — a real-time Redis observability dashboard built with React.

Connect any Redis endpoint from the browser. No config, no restarts. Watch your streams, cache, and consumer health update live.

---

![streamdiff UI preview](./docs/preview.png)

---

## Overview

`streamdiff-ui` is the React frontend that pairs with the [streamdiff backend](https://github.com/mr-alankrit/streamdiff). It consumes the REST API for data actions and a Server-Sent Events stream for live updates — meaning the dashboard reacts to Redis in real time without any polling.

---

## Screens

### Connection Manager

The entry point of the app. No hardcoded URLs, no environment variables needed — just paste your Redis endpoint and connect.

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│   streamdiff                                         │
│                                                      │
│   Connect to Redis                                   │
│                                                      │
│   Name         [ production                       ]  │
│   URL          [ redis://10.0.1.42:6379           ]  │
│   Password     [ ••••••••••••••  (optional)       ]  │
│                                                      │
│               [ Test connection ]  [ Connect → ]     │
│                                                      │
│   ─────────────────────────────────────────────────  │
│   Saved connections                                  │
│                                                      │
│   ● production    redis://10.0.1.42   connected      │
│   ● staging       redis://10.0.2.11   connected      │
│   ○ local         redis://localhost   idle            │
│                                                      │
└──────────────────────────────────────────────────────┘
```

- Live PING validation before saving — tells you exactly what failed (auth, unreachable, timeout)
- Saved connections persist in local storage
- Switch connections without leaving the page

---

### Health Dashboard

The main view after connecting. One screen, everything you need to know about your Redis instance right now.

```
┌─────────────────────────────────────────────────────────────────────┐
│  streamdiff   production ▾          ○ live    Last updated: 2s ago  │
├──────────────┬──────────────┬──────────────┬────────────────────────┤
│  Streams     │  Total msgs  │  Consumers   │  Lag (all groups)      │
│  12          │  1.4M        │  38 active   │  142 pending           │
├──────────────┴──────────────┴──────────────┴────────────────────────┤
│                                                                     │
│  Stream health                                          [search...] │
│                                                                     │
│  ticket-events         ████████████░░░  92% healthy   lag: 0       │
│  chat-messages         ████████████████  100% healthy  lag: 0       │
│  email-outbound        ████████░░░░░░░░  50% ⚠ stuck   lag: 342    │
│  telephony-events      ████████████████  100% healthy  lag: 0       │
│  audit-log             ███░░░░░░░░░░░░░  18% ✖ stale   lag: 1,204  │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  Throughput (messages/sec)              last 30 minutes             │
│                                                                     │
│  800 ┤                    ╭──╮                                      │
│  600 ┤          ╭────╮   ╭╯  ╰──╮                                  │
│  400 ┤    ╭─────╯    ╰───╯      ╰────────                          │
│  200 ┤────╯                                                         │
│      └──────────────────────────────────────────────────────────── │
└─────────────────────────────────────────────────────────────────────┘
```

- Summary cards — stream count, total messages, active consumers, total lag
- Per-stream health bar — processed vs pending vs stuck, colour-coded
- Live throughput chart — messages/sec, 5-min and 30-min rolling windows
- All data pushed via SSE — no refresh needed

---

### Stream Detail

Click any stream to drill into it.

```
┌─────────────────────────────────────────────────────────────────────┐
│  ← Back    ticket-events                     12,847 messages total  │
├──────────────────────────────┬──────────────────────────────────────┤
│  Consumer groups             │  Throughput                          │
│                              │                                      │
│  ● notification-processor    │   ╭──╮    ╭──╮                      │
│    lag: 0   consumers: 4     │───╯  ╰────╯  ╰────                  │
│                              │                                      │
│  ⚠ email-dispatcher          │  Producers (write rate)             │
│    lag: 342  consumers: 2    │  service-cloud-api    84/sec         │
│    oldest pending: 8m 14s    │  ticket-worker        12/sec         │
│                              │                                      │
│  ● audit-consumer            │                                      │
│    lag: 0   consumers: 1     │                                      │
├──────────────────────────────┴──────────────────────────────────────┤
│  Messages                                [ID range ▾]  [search...] │
│                                                                     │
│  1741952521000-0   2m ago   { "ticketId": "TK-8821", "event": ...  │
│  1741952519000-0   2m ago   { "ticketId": "TK-8820", "event": ...  │
│  1741952518000-0   3m ago   { "ticketId": "TK-8819", "event": ...  │
│                                                          [ Load more]│
└─────────────────────────────────────────────────────────────────────┘
```

- Consumer group panel — lag, consumer count, oldest pending message age
- Producer panel — which services are writing, at what rate
- Message list — paginated, searchable by ID range or field value
- Click any message → opens message inspector

---

### Message Inspector

Click any message to see the full payload, edit it, or manage its acknowledgement state.

```
┌──────────────────────────────────────────────────────┐
│  Message  1741952521000-0              [ ✕ Close ]   │
│                                                      │
│  Stream       ticket-events                          │
│  Timestamp    2025-03-14 10:42:01.000                │
│  Status       PENDING  (email-dispatcher)            │
│                                                      │
│  Payload                         [ Edit ]  [ Copy ]  │
│  ┌────────────────────────────────────────────────┐  │
│  │ {                                              │  │
│  │   "ticketId":   "TK-8821",                    │  │
│  │   "event":      "CREATED",                    │  │
│  │   "tenantId":   "acme-corp",                  │  │
│  │   "priority":   "HIGH",                       │  │
│  │   "assignedTo": "agent-42",                   │  │
│  │   "createdAt":  "2025-03-14T10:42:01Z"        │  │
│  │ }                                             │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  [ Acknowledge ]   [ Re-queue ]   [ Delete ]         │
└──────────────────────────────────────────────────────┘
```

- JSON syntax highlighting
- Inline editing — modify any field value and save back to the stream
- Acknowledge, re-queue, or delete directly from the inspector

---

### Cache Inspector

```
┌─────────────────────────────────────────────────────────────────────┐
│  Cache inspector                    [Pattern: session:*          ]  │
├──────────────────┬──────────────────────────────────────────────────┤
│  Namespace       │  Keys                                            │
│  summary         │                                                  │
│                  │  Key                    Type    TTL    Size      │
│  session:*  41K  │  session:usr-8821       hash    14m    2.1kb     │
│  tenant:*   12K  │  session:usr-8820       hash    28m    1.8kb     │
│  cache:*     8K  │  session:usr-8819       hash    expired  —      │
│  lock:*      2K  │  session:usr-8818       hash    2m     2.4kb     │
│  other       5K  │  session:usr-8817       hash    52m    1.9kb     │
│                  │                                    [ Load more ] │
├──────────────────┴──────────────────────────────────────────────────┤
│  Memory usage by namespace                                          │
│  session:*  ████████████████░░░░░  62%   128MB                     │
│  tenant:*   ████████░░░░░░░░░░░░░  31%    64MB                     │
│  other      ███░░░░░░░░░░░░░░░░░░   7%    14MB                     │
└─────────────────────────────────────────────────────────────────────┘
```

- Namespace summary panel — key count per prefix
- Key table — type, TTL, memory size, searchable by glob pattern
- Memory usage breakdown by namespace
- Click any key → opens value inspector with edit support

---

### Pub/Sub Monitor

```
┌──────────────────────────────────────────────────────┐
│  Pub/Sub monitor                                     │
│                                                      │
│  Subscribe   [ notifications.*              ] [ + ]  │
│                                                      │
│  Active subscriptions                                │
│  ● notifications.*          38 messages              │
│  ● audit-events             12 messages              │
│                                                      │
│  Live feed                                           │
│  ─────────────────────────────────────────────────  │
│  10:42:03  notifications.email   { "to": "user@.. } │
│  10:42:01  notifications.push    { "userId": "88.. } │
│  10:41:58  notifications.sms     { "phone": "+91.. } │
│  10:41:55  audit-events          { "action": "LOG.. } │
│                                                      │
│  Publish a message                                   │
│  Channel  [ notifications.test              ]        │
│  Payload  [ { "test": true }                ]        │
│                          [ Publish ]                 │
└──────────────────────────────────────────────────────┘
```

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | React 18 |
| Language | TypeScript |
| Routing | React Router v6 |
| Charts | Recharts |
| Live updates | EventSource (SSE) |
| HTTP client | Axios |
| Styling | Tailwind CSS |
| Icons | Lucide React |
| State | Zustand |
| Build | Vite |
| Tests | Vitest + React Testing Library |

---

## Getting started

```bash
# Install dependencies
npm install

# Start dev server (proxies API to localhost:8080)
npm run dev

# Build for production
npm run build
```

The dev server proxies all `/api` requests to the streamdiff backend at `localhost:8080`. Make sure the backend is running first — see [streamdiff](https://github.com/mr-alankrit/streamdiff) for backend setup.

---

## Project structure

```
src/
├── components/
│   ├── connection/          # Connection manager, saved connections list
│   ├── dashboard/           # Health dashboard, summary cards, throughput chart
│   ├── streams/             # Stream list, stream detail, consumer group panel
│   ├── messages/            # Message browser, message inspector, editor
│   ├── cache/               # Key browser, namespace summary, value inspector
│   ├── pubsub/              # Channel subscriptions, live feed, publish form
│   └── shared/              # Buttons, badges, JSON viewer, status indicators
├── hooks/
│   ├── useSSE.ts            # Server-Sent Events subscription hook
│   ├── useConnection.ts     # Active connection state
│   └── useHealthStream.ts   # Live health data per connection
├── api/
│   ├── connections.ts       # Connection CRUD
│   ├── streams.ts           # Stream explorer API calls
│   ├── cache.ts             # Cache inspector API calls
│   └── pubsub.ts            # Pub/Sub API calls
├── store/
│   └── connections.ts       # Zustand store for saved connections
└── types/
    └── index.ts             # Shared TypeScript interfaces
```

---

## Live updates

The dashboard uses **Server-Sent Events** (not WebSockets, not polling) for live data. A custom `useSSE` hook manages the `EventSource` connection lifecycle:

```typescript
// Health data arrives as a push from the backend every 5s
const { data, status } = useSSE<HealthSnapshot>(
  `/api/connections/${connectionName}/health/stream`
);
```

When you switch connections, the old SSE connection is closed and a new one is opened automatically. No stale data, no memory leaks.

---

## Roadmap

### v0.1 — Core views
- [x] Connection manager with live validation
- [x] Health dashboard with SSE live updates
- [x] Stream list + consumer group detail
- [x] Message browser + JSON viewer
- [ ] Message editor + acknowledge from UI

### v0.2 — Cache + Pub/Sub
- [ ] Cache key browser with pattern search
- [ ] TTL manager
- [ ] Pub/Sub live monitor
- [ ] Webhook alert configuration UI

### v0.3 — Polish
- [ ] Dark mode
- [ ] Multi-connection side-by-side layout
- [ ] Keyboard shortcuts
- [ ] Export stream data as JSON/CSV

---

## Related

- **[streamdiff](https://github.com/mr-alankrit/streamdiff)** — the Spring WebFlux backend this UI connects to

---

## License

MIT