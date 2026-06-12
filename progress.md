# IBKR Dashboard - Build Progress

> Living document to track development progress. Check off items as completed.

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Create environment file
cp .env.local.example .env.local   # or create manually (see below)

# 3. Fill in your credentials in .env.local
IBKR_GATEWAY_URL=https://localhost:5000/v1/api
IBKR_ACCOUNT_ID=<your account ID>
FINNHUB_API_KEY=<your Finnhub key>

# 4. Start IBKR Gateway (see instructions below)

# 5. Run development server
npm run dev
```

> **Note:** The app works without the gateway. All IBKR routes fall back to mock data automatically when the gateway is unreachable.

---

## Environment Setup

### `.env.local` Configuration

```env
# IBKR Client Portal Gateway (run locally or via Docker)
IBKR_GATEWAY_URL=https://localhost:5000/v1/api

# Your IBKR account number
IBKR_ACCOUNT_ID=

# Finnhub API key (free tier works — get at finnhub.io)
FINNHUB_API_KEY=
```

---

## IBKR Gateway Setup

### Option 1: Client Portal Gateway (Recommended for Development)

```bash
# 1. Download Client Portal Gateway
# https://www.interactivebrokers.com/en/trading/ib-api.php

# 2. Extract and navigate to folder
cd clientportal.gw

# 3. Start gateway
./bin/run.sh root/conf.yaml

# 4. Open browser and authenticate
# https://localhost:5000

# 5. Gateway runs on https://localhost:5000/v1/api/
```

### Option 2: Docker (Recommended for Production)

```bash
docker run -d \
  --name ibkr-gateway \
  -p 5000:5000 \
  -e IBEAM_ACCOUNT=your_username \
  -e IBEAM_PASSWORD=your_password \
  voyz/ibeam
```

### Important Notes
- IBKR does **not** have a simple API key — the gateway must be running and logged in
- Sessions expire every ~24 hours; re-authenticate via `https://localhost:5000`
- Self-signed TLS cert is handled automatically (`rejectUnauthorized: false` in client)

---

## Progress Tracking

### Phase 0: Project Initialization
- [x] Initialize Next.js project with App Router
- [x] Setup Tailwind CSS v4
- [x] Install and configure Shadcn/ui
- [x] Setup project structure
- [x] Configure ESLint
- [x] Setup Git repository
- [x] Create `.env.local` with Finnhub key and gateway URL

### Phase 1: Design System & Components
- [x] Define color palette (dark theme, OKLCh color space)
- [x] Setup typography scale (Geist Sans / Geist Mono)
- [x] Build core components:
  - [x] MetricCard
  - [x] ChangeIndicator (green/red)
  - [x] LoadingSkeleton (Shadcn)
  - [x] Badge (Shadcn)
  - [x] Tooltip (Shadcn)
- [x] Build layout components:
  - [x] Sidebar navigation
  - [x] Header (search, IBKR status badge, account)
  - [x] Dashboard layout
- [x] Build chart components:
  - [x] AreaChart (portfolio performance)
  - [x] DonutChart (sector allocation)
- [x] Build table components:
  - [x] DataTable (sortable, filterable)
  - [x] TransactionRow

### Phase 2: IBKR API Integration ✅ Complete
- [x] IBKR Gateway API client (`src/lib/ibkr/client.ts`)
- [x] Auth status check (`checkAuth()`)
- [x] Account summary (`getAccountSummary()`)
- [x] Positions (`getPositions()`)
- [x] Trades/transactions (`getTrades()`)
- [x] Data transformation layer (`src/lib/ibkr/transform.ts`)
  - [x] `transformAccountSummary()` — maps raw IBKR summary → `PortfolioSummary`
  - [x] `transformPositions()` — maps raw positions + Finnhub data → `Position[]`
  - [x] `transformTrade()` — maps raw trades → `Transaction`
- [x] Mock data fallback when gateway is offline
- [x] IBKR connection status badge in header

### Phase 3: Market Data Integration ✅ Complete (Finnhub)
- [x] Finnhub API client (`src/lib/finnhub/client.ts`)
- [x] Real-time quotes (`getQuote`)
- [x] Company profiles (`getCompanyProfile`)
- [x] Fundamentals / financial metrics (`getBasicFinancials`)
- [x] Analyst recommendations + price targets (`getRecommendations`, `getPriceTarget`)
- [x] Historical OHLCV candle data (`getCandleData`)
- [x] Company news (`getNews`)
- [x] Dividend history (`getDividends`)

### Phase 4: API Routes ✅ Complete
- [x] `GET /api/ibkr/auth` — gateway auth status
- [x] `GET /api/ibkr/account` — portfolio summary (IBKR, falls back to mock)
- [x] `GET /api/ibkr/positions` — positions enriched with Finnhub quotes + sectors
- [x] `GET /api/transactions` — trade history (IBKR, falls back to mock)
- [x] `GET /api/market/quote/[symbol]` — real-time price + 52W range
- [x] `GET /api/market/profile/[symbol]` — company name, sector, logo
- [x] `GET /api/market/fundamentals/[symbol]` — P/E, margins, ROE, dividends
- [x] `GET /api/market/history/[symbol]` — candle data by timeframe
- [x] `GET /api/market/news/[symbol]` — recent headlines
- [x] `GET /api/market/analysts/[symbol]` — buy/hold/sell counts + price targets

### Phase 5: TanStack Query Hooks ✅ Complete
- [x] `useIBKRAuth` — polls `/api/ibkr/auth` every 60s
- [x] `usePortfolioSummary` — account metrics, refetches every 60s
- [x] `usePositions` — positions, refetches every 60s
- [x] `useTransactions` — trade history, refetches every 5min
- [x] `useStockQuote` — live price, refetches every 30s
- [x] `useStockProfile` — company info, stale after 1hr
- [x] `useStockFundamentals` — financials + dividends, stale after 1hr
- [x] `useStockHistory` — OHLCV candle data, stale after 5min
- [x] `useStockAnalysts` — ratings + targets, stale after 1hr

### Phase 6: Dashboard Page ✅ Complete
- [x] Hero metrics (live from `usePortfolioSummary`)
- [x] Performance chart (mock data — Phase 2 work)
- [x] Holdings table (live from `usePositions`)
- [x] Sector allocation (derived dynamically from live positions)
- [x] Top movers (derived dynamically from live positions — day change %)
- [x] Dividends widget (mock — Phase 2 work)
- [x] Risk metrics widget (mock — Phase 2 work)
- [x] Recent activity (live from `useTransactions`)
- [x] Skeleton loading states

### Phase 7: Stock Detail Page ✅ Complete
- [x] Live price + change from `useStockQuote`
- [x] Position card from `usePositions`
- [x] Overview tab: price stats (open/close/52W range bar)
- [x] Fundamentals tab: valuation, profitability, dividends (all live)
- [x] Analysis tab: analyst ratings + price targets (live from `useStockAnalysts`)
- [x] Transactions tab: filtered from `useTransactions`
- [x] Skeleton loaders on all data sections
- [ ] Price chart (TradingView integration — future work)
- [ ] News feed (API route exists, UI not wired yet)
- [ ] Related stocks

### Phase 8: Transactions Page ✅ Complete
- [x] Live data from `useTransactions` hook
- [x] Summary cards (total bought/sold/dividends)
- [x] Type filter (BUY / SELL / DIVIDEND / TRANSFER)
- [x] Symbol search
- [x] Sortable by date
- [x] Loading state
- [ ] Date range filter
- [ ] Export to CSV (functional)

### Phase 9: Performance Analytics Page
- [x] UI complete with mock data
- [ ] Wire to real data (needs historical portfolio value storage — Phase 2)

### Phase 10: Income / Dividends Page
- [x] UI complete with mock data
- [ ] Wire to real dividend data from Finnhub

### Phase 11: Watchlist
- [x] UI complete (add/remove, price alerts UI)
- [ ] Persist watchlist (no database yet)

### Phase 12: Settings & Polish
- [x] Settings page UI
- [x] IBKR connection status badge in header (green live / grey cached)
- [x] Refresh button invalidates all React Query caches
- [ ] Loading states on all pages
- [ ] Error boundaries
- [ ] Mobile responsiveness audit

---

## Bug Fixes
- [x] Hydration mismatch in `PerformanceChart` — replaced `Math.random()` in mock data with deterministic `Math.cos()` (Feb 19, 2026)
- [x] TypeScript parse error — interface property key `10DayAverageTradingVolume` must be quoted (Feb 19, 2026)

---

## API Routes (Actual Implementation)

```
src/app/api/
├── ibkr/
│   ├── auth/route.ts              GET  → { connected: boolean }
│   ├── account/route.ts           GET  → PortfolioSummary
│   └── positions/route.ts         GET  → Position[] (enriched with Finnhub)
├── transactions/route.ts          GET  → Transaction[] (?days=90)
└── market/
    ├── quote/[symbol]/route.ts    GET  → StockQuote
    ├── profile/[symbol]/route.ts  GET  → FinnhubProfile
    ├── fundamentals/[symbol]/route.ts GET → { fundamentals, dividend }
    ├── history/[symbol]/route.ts  GET  → PerformanceDataPoint[] (?timeframe=1M)
    ├── news/[symbol]/route.ts     GET  → FinnhubNewsItem[]
    └── analysts/[symbol]/route.ts GET  → AnalystRating
```

---

## Project Structure (Current)

```
ibkrapp/
├── src/
│   ├── app/
│   │   ├── (dashboard)/
│   │   │   ├── page.tsx              # Dashboard (client, live hooks)
│   │   │   ├── stock/[symbol]/page.tsx  # Stock detail (live hooks)
│   │   │   ├── transactions/page.tsx    # Transactions (live hook)
│   │   │   ├── performance/page.tsx     # Analytics (mock)
│   │   │   ├── income/page.tsx          # Dividends (mock)
│   │   │   ├── watchlist/page.tsx       # Watchlist (mock)
│   │   │   └── settings/page.tsx        # Settings (UI)
│   │   └── api/                         # All API routes (see above)
│   ├── components/
│   │   ├── layout/header.tsx            # Header with IBKR status badge
│   │   ├── layout/sidebar.tsx
│   │   ├── dashboard/                   # All dashboard widgets
│   │   ├── providers/query-provider.tsx
│   │   └── ui/                          # Shadcn components
│   ├── hooks/                           # All TanStack Query hooks
│   ├── lib/
│   │   ├── ibkr/client.ts               # IBKR gateway client
│   │   ├── ibkr/transform.ts            # Raw → typed data transforms
│   │   ├── finnhub/client.ts            # Finnhub REST client
│   │   ├── mock-data.ts                 # Deterministic mock data (fallback)
│   │   └── utils.ts
│   └── types/index.ts                   # All TypeScript interfaces
├── .env.local                           # Secrets (gitignored)
└── package.json
```

---

## Commands Reference

```bash
npm run dev      # Start dev server (http://localhost:3000)
npm run build    # Production build (type-checks)
npm run lint     # Run ESLint
```

---

## Useful Links

- [IBKR Client Portal API Docs](https://interactivebrokers.github.io/cpwebapi/)
- [Finnhub API Docs](https://finnhub.io/docs/api)
- [Shadcn/ui Components](https://ui.shadcn.com/)
- [Recharts Documentation](https://recharts.org/)
- [TanStack Query v5](https://tanstack.com/query/latest)

---

## What's Working Now

Run `npm run dev` → http://localhost:3000

| Page | Route | Data Source |
|------|-------|-------------|
| Dashboard | `/` | Live (IBKR + Finnhub) with mock fallback |
| Stock Detail | `/stock/AAPL` | Live (Finnhub quotes + fundamentals) |
| Transactions | `/transactions` | Live (IBKR trades) with mock fallback |
| Performance | `/performance` | Mock data |
| Income | `/income` | Mock data |
| Watchlist | `/watchlist` | Mock data |
| Settings | `/settings` | UI only |

**IBKR Live mode:** Start gateway → log in at `https://localhost:5000` → set `IBKR_ACCOUNT_ID` in `.env.local` → restart dev server → header shows green "IBKR Live" badge.

---

## Notes & Decisions

| Date | Decision | Reason |
|------|----------|--------|
| Feb 19, 2026 | Chose Finnhub for market data | Good free tier, covers quotes/fundamentals/analyst ratings/news/candles |
| Feb 19, 2026 | All IBKR routes fall back to mock data | Dev works without gateway; no broken UI |
| Feb 19, 2026 | `params` in route handlers is `Promise<{}>` in Next.js 16 | Must `await params` before destructuring |
| Feb 19, 2026 | Mock data uses `Math.cos` instead of `Math.random` | Fixes hydration mismatch (server vs client render) |

---

## Next Steps

1. **TradingView chart** on stock detail page (candle data API route already exists)
2. **News feed UI** on stock detail page (API route already exists)
3. **Performance page** — wire to real historical data (requires storing daily portfolio snapshots)
4. **Income page** — wire to Finnhub dividend data
5. **Date range filter** on transactions page

---

*Last Updated: February 19, 2026*
