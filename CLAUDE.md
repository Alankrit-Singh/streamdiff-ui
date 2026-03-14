# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`streamdiff-ui` is the React frontend for the [streamdiff](https://github.com/mr-alankrit/streamdiff) Spring WebFlux backend. It provides a real-time Redis observability dashboard over REST + Server-Sent Events.

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server at :5173 (proxies /api to localhost:8090)
npm run build        # Production build → dist/
npm run test         # Run all tests (Vitest)
npm run test -- path/to/file.test.ts  # Run a single test file
```

Backend must be running at `localhost:8090` first. Start it from `../streamdiff` with `./run-local.sh`.

## Source layout

```
src/
├── components/
│   ├── ConnectionManager.jsx   add/remove/select named Redis connections
│   ├── StreamExplorer.jsx      stream list (search + pagination), group drill-down, messages, XACK
│   ├── HealthDashboard.jsx     live SSE health grid + lag chart
│   ├── CacheInspector.jsx      pattern scan, key browser, value editor
│   └── PubSubMonitor.jsx       subscribe (SSE) + publish panel
└── api/
    └── client.js               axios wrappers + EventSource helpers
```

`App.jsx` owns the sidebar (`ConnectionManager`) + tab routing (Streams / Health / Cache / PubSub). Active connection name is passed as `conn` prop to each tab component.

## Key behaviours

**ConnectionManager**
- Auto-prefixes `redis://` if the user types just `host:port`
- On connect, `createConnection` POSTs to the backend which validates with a Redis PING before saving

**StreamExplorer**
- Loads up to 1000 streams from `GET /api/connections/{name}/streams?limit=1000`
- Client-side search (filter by name) + pagination (50 per page)
- Shows error state with a Retry button if the API fails

**HealthDashboard**
- Subscribes to `GET /api/connections/{name}/health/stream` (SSE) via `EventSource`
- Cards rendered in a CSS grid (`repeat(auto-fill, minmax(220px, 1fr))`) — one card per stream/group
- Summary bar: total streams, consumers, aggregate lag, stuck count
- Lag chart capped at top 8 groups by current lag (keeps it readable with many streams)
- Closes and reopens the `EventSource` when the active connection changes

**API client (`api/client.js`)**
- All REST calls via `axios` with `baseURL: '/api'` (Vite proxies to `:8090`)
- SSE helpers (`openHealthStream`, `openPubSubStream`) return the raw `EventSource` — callers must call `.close()` in `useEffect` cleanup

## Stack

| | |
|---|---|
| Framework | React 18 |
| Build | Vite |
| Charts | Recharts |
| HTTP | Axios |
| Styling | Inline styles (dark theme, GitHub-inspired palette) |
| Tests | Vitest + React Testing Library |
