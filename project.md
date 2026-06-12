# IBKR Portfolio Dashboard

## Project Overview

A sophisticated, real-time investment management dashboard for monitoring and analyzing US equity positions through Interactive Brokers (IBKR). The dashboard provides comprehensive portfolio analytics, individual stock insights, and performance tracking with a modern dark-themed UI.

---

## Tech Stack (Implemented)

| Layer | Technology | Notes |
|-------|------------|-------|
| Frontend | Next.js 16 (App Router) + React 19 | Turbopack for dev builds |
| Styling | Tailwind CSS v4 + Shadcn/ui (Radix) | OKLCh color space, dark-first |
| Charts | Recharts | Area + donut charts |
| State / Data | TanStack Query v5 | Per-query stale times, auto-refetch |
| IBKR Integration | IBKR Client Portal Gateway | Local gateway at `localhost:5000` |
| Market Data | Finnhub REST API | Quotes, fundamentals, news, analyst ratings |
| Language | TypeScript 5 | Strict types throughout |
| Icons | lucide-react | |

---

## How Authentication Works

IBKR does **not** offer a simple API key. Their Client Portal API requires:

1. Run the Client Portal Gateway locally (or via Docker)
2. Log in once via browser at `https://localhost:5000`
3. The gateway maintains a session (re-auth every ~24h)
4. This app calls `localhost:5000` — no credentials stored in the app

Finnhub market data uses a standard API key stored in `.env.local`.

---

## Data Sources

| Data | Source | Auth |
|------|---------|------|
| Positions, account value, cash | IBKR Gateway | Session (gateway login) |
| Transaction / trade history | IBKR Gateway | Session |
| Real-time stock quotes | Finnhub | API key |
| Company info (name, sector, logo) | Finnhub | API key |
| Fundamentals (P/E, margins, ROE, etc.) | Finnhub | API key |
| Analyst ratings + price targets | Finnhub | API key |
| Historical price data (charts) | Finnhub | API key |
| Company news | Finnhub | API key |
| Dividend history | Finnhub | API key |

---

## Design Philosophy

- **Dark-first** — trading apps thrive in dark mode; OKLCh color space for precise semantic colors
- **Information density** — every component earns its place; no decorative clutter
- **Graceful degradation** — all IBKR routes fall back to mock data when gateway is offline; app always renders
- **Type safety** — all data flows through TypeScript interfaces from `src/types/index.ts`
- **Server-side secrets** — all API keys used only in Next.js API routes, never exposed to the browser

### Color Palette
- Green (positive/gains): `oklch(0.72 0.19 145)`
- Red (negative/losses): `oklch(0.65 0.22 25)`
- Purple/primary: `oklch(0.7 0.15 250)`
- Muted foreground: `oklch(~0.5 0 0)`

---

## Pages & Current Status

### 1. Dashboard (`/`)
**Status: Live data ✅**

- Hero metrics: total value, total return, day change, cash — from IBKR account summary
- Holdings table: live positions enriched with Finnhub sector/name data
- Sector allocation: dynamically derived from live positions
- Top movers: dynamically derived from live day-change data
- Recent activity: live from IBKR trade history
- Performance chart: mock data (needs historical storage)
- Dividends widget: mock data
- Risk metrics widget: mock data

### 2. Stock Detail (`/stock/[symbol]`)
**Status: Live data ✅**

- Price header: real-time from Finnhub quote
- Position card: from IBKR positions (if owned)
- Overview tab: price stats, 52W range bar
- Fundamentals tab: P/E, margins, ROE, dividends — from Finnhub
- Analysis tab: analyst buy/hold/sell counts + price targets — from Finnhub
- Transactions tab: filtered from IBKR trades
- All sections show skeleton loaders while fetching
- External links: Yahoo Finance, TradingView
- **Pending:** price chart (API route exists), news feed (API route exists)

### 3. Transactions (`/transactions`)
**Status: Live data ✅**

- Pulls from IBKR trade history (falls back to mock)
- Summary cards: total bought, sold, dividends
- Filterable by type (BUY/SELL/DIVIDEND/TRANSFER) and symbol search
- **Pending:** date range filter, CSV export

### 4. Performance Analytics (`/performance`)
**Status: Mock UI ⚠️**

- Full analytics UI built (returns, benchmark comparison, attribution, risk metrics)
- Needs historical portfolio value storage to show real data

### 5. Income / Dividends (`/income`)
**Status: Mock UI ⚠️**

- Full UI built (income calendar, by-stock table, trend chart)
- Finnhub dividend API ready; UI not yet wired

### 6. Watchlist (`/watchlist`)
**Status: Mock UI ⚠️**

- UI complete: add/remove stocks, price alerts setup
- No persistence (no database); prices not live yet

### 7. Settings (`/settings`)
**Status: UI only ⚠️**

- IBKR connection display, display preferences, notification settings

---

## Architecture

### Data Flow

```
Browser
  └─ TanStack Query Hook (usePositions, useStockQuote, etc.)
       └─ Next.js API Route (server-side)
            ├─ IBKR Gateway (localhost:5000) — portfolio data
            │    └─ Falls back to mock-data.ts if unreachable
            └─ Finnhub API — market data
```

### Key Files

```
src/
├── types/index.ts                  All TypeScript interfaces
├── lib/
│   ├── mock-data.ts                Deterministic fallback data
│   ├── ibkr/client.ts              IBKR gateway HTTP client
│   ├── ibkr/transform.ts           Raw IBKR → typed models
│   └── finnhub/client.ts           Finnhub REST client (typed)
├── hooks/                          TanStack Query hooks (client)
│   ├── useIBKRAuth.ts
│   ├── usePortfolioSummary.ts
│   ├── usePositions.ts
│   ├── useTransactions.ts
│   ├── useStockQuote.ts
│   ├── useStockProfile.ts
│   ├── useStockFundamentals.ts
│   ├── useStockHistory.ts
│   └── useStockAnalysts.ts
└── app/api/                        Server-side route handlers
    ├── ibkr/auth/route.ts
    ├── ibkr/account/route.ts
    ├── ibkr/positions/route.ts
    ├── transactions/route.ts
    └── market/
        ├── quote/[symbol]/route.ts
        ├── profile/[symbol]/route.ts
        ├── fundamentals/[symbol]/route.ts
        ├── history/[symbol]/route.ts
        ├── news/[symbol]/route.ts
        └── analysts/[symbol]/route.ts
```

### Cache / Refresh Strategy

| Data | Stale Time | Refetch Interval |
|------|-----------|------------------|
| IBKR auth status | 30s | 60s |
| Portfolio summary | 30s | 60s |
| Positions | 30s | 60s |
| Transactions | 60s | 5min |
| Stock quote | 30s | 30s |
| Stock history | 5min | — |
| Fundamentals | 1hr | — |
| Analyst ratings | 1hr | — |
| Company profile | 1hr | — |

---

## API Routes Reference

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/ibkr/auth` | `{ connected: boolean }` |
| GET | `/api/ibkr/account` | `PortfolioSummary` |
| GET | `/api/ibkr/positions` | `Position[]` enriched with Finnhub |
| GET | `/api/transactions?days=90` | `Transaction[]` |
| GET | `/api/market/quote/[symbol]` | `StockQuote` |
| GET | `/api/market/profile/[symbol]` | `FinnhubProfile` |
| GET | `/api/market/fundamentals/[symbol]` | `{ fundamentals, dividend }` |
| GET | `/api/market/history/[symbol]?timeframe=1M` | `PerformanceDataPoint[]` |
| GET | `/api/market/news/[symbol]` | `FinnhubNewsItem[]` |
| GET | `/api/market/analysts/[symbol]` | `AnalystRating` |

---

## Remaining Work

### Phase 2 (Near-term)
- [ ] TradingView / Lightweight Charts on stock detail page
- [ ] News feed UI on stock detail (API route exists)
- [ ] Date range filter on transactions page
- [ ] CSV export for transactions

### Phase 3 (Medium-term)
- [ ] Historical portfolio value storage (daily snapshots → Performance page)
- [ ] Income page wired to live Finnhub dividend data
- [ ] Watchlist with live prices
- [ ] Mobile responsiveness audit

### Phase 4 (Future)
- [ ] AI-powered portfolio insights
- [ ] Tax-loss harvesting suggestions
- [ ] Push notifications / price alerts (functional)
- [ ] PWA setup

---

## Security Considerations

- IBKR gateway credentials never touch this app — auth is done in the browser directly against the gateway
- Finnhub API key is server-only (in API routes, never sent to browser)
- `.env.local` is gitignored
- Gateway uses self-signed TLS cert; `rejectUnauthorized: false` is intentional and documented
- No sensitive data logged

---

## Known Issues / Gotchas

| Issue | Resolution |
|-------|-----------|
| IBKR session expires every ~24h | Re-authenticate at `https://localhost:5000` |
| Finnhub free tier: 60 API calls/min | Stale times + caching keep us well under |
| `params` in Next.js 16 route handlers is a `Promise` | Must `await params` before destructuring |
| Interface property keys starting with digits must be quoted | e.g. `"10DayAverageTradingVolume"` not `10DayAverageTradingVolume` |
| `Math.random()` in mock data causes hydration mismatch | Use deterministic `Math.sin`/`Math.cos` instead |

---

*Last Updated: February 19, 2026*
