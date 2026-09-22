// The multi-screen screener: a registry of momentum/value setups the user can
// pick from a dropdown. Each screen is a pure predicate over a ScreenStock plus
// the "highlight" columns that explain why a name matched. Growth is measured
// point-to-point on single quarters (latest reported quarter vs the quarter N
// quarters earlier), per the fund's spec.

export interface ScreenStock {
  symbol: string;
  company: string;
  country: string | null;
  // live-ish snapshot (Finviz)
  price: number | null;
  marketCap: number | null; // dollars
  pe: number | null; // current trailing P/E
  // quarterly history, most-recent-first (from Finnhub, derived)
  rev: (number | null)[];
  profit: (number | null)[];
  pm: (number | null)[]; // profit margin %, per quarter
  peSeries: (number | null)[]; // trailing P/E, per quarter
  // rolling price levels (price-history store, Finviz-distance fallback)
  low30: number | null;
  low60: number | null;
  high52w: number | null;
}

export type Fmt = "mult" | "pct" | "belowpct" | "money" | "price";

export interface ScreenMetric {
  key: string;
  label: string;
  hint?: string;
  fmt: Fmt;
  value: (s: ScreenStock) => number | null;
}

export interface Screen {
  id: string;
  name: string; // thematic
  tagline: string; // one-liner shown under the dropdown
  rule: string; // the precise definition
  metrics: ScreenMetric[]; // highlight columns (besides the common ones)
  defaultSort: string; // a metric key
  match: (s: ScreenStock) => boolean;
}

// ── helpers ──────────────────────────────────────────────────────────────────
/** Multiple of series[0] over series[n] (latest vs n quarters ago), or null. */
function mult(series: (number | null)[], n: number): number | null {
  const now = series[0];
  const past = series[n];
  if (now == null || past == null || past <= 0) return null;
  return now / past;
}
const grew = (series: (number | null)[], n: number, x: number): boolean => {
  const m = mult(series, n);
  return m != null && m >= x;
};
/** Average of the first n non-null, positive values. */
function avgPos(series: (number | null)[], n: number): number | null {
  const xs = series.slice(0, n).filter((v): v is number => v != null && v > 0);
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}
function avgAny(series: (number | null)[], n: number): number | null {
  const xs = series.slice(0, n).filter((v): v is number => v != null);
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}
/** current P/E as a % of its own trailing-N-quarter average (null if unusable). */
function peVsAvg(s: ScreenStock, n: number): number | null {
  const cur = s.pe ?? s.peSeries[0];
  const avg = avgPos(s.peSeries, n);
  if (cur == null || cur <= 0 || avg == null || avg <= 0) return null;
  return (cur / avg) * 100;
}
/** price as a multiple of a rolling low. */
const runup = (s: ScreenStock, low: number | null): number | null =>
  s.price != null && low != null && low > 0 ? s.price / low : null;
/** % the price sits below its 52-week high (negative). */
const belowHigh = (s: ScreenStock): number | null =>
  s.price != null && s.high52w != null && s.high52w > 0 ? (s.price / s.high52w - 1) * 100 : null;

// metric builders
const mRev = (n: number, label: string): ScreenMetric =>
  ({ key: `rev${n}`, label, fmt: "mult", value: (s) => mult(s.rev, n) });
const mProfit = (n: number, label: string): ScreenMetric =>
  ({ key: `prof${n}`, label, fmt: "mult", value: (s) => mult(s.profit, n) });

// ── the screens ──────────────────────────────────────────────────────────────
export const SCREENS: Screen[] = [
  {
    id: "twin-turbo",
    name: "Twin Turbo",
    tagline: "Revenue and profit both doubled over the last 3 quarters",
    rule: "Latest-quarter revenue ≥ 2× the quarter 3Q ago AND net profit ≥ 2× the quarter 3Q ago.",
    metrics: [mRev(3, "Rev 3Q"), mProfit(3, "Profit 3Q")],
    defaultSort: "rev3",
    match: (s) => grew(s.rev, 3, 2) && grew(s.profit, 3, 2),
  },
  {
    id: "fast-break",
    name: "Fast Break",
    tagline: "Quick 2-quarter acceleration in both revenue and profit",
    rule: "Latest-quarter revenue ≥ 1.5× the quarter 2Q ago AND net profit ≥ 1.25× the quarter 2Q ago.",
    metrics: [mRev(2, "Rev 2Q"), mProfit(2, "Profit 2Q")],
    defaultSort: "rev2",
    match: (s) => grew(s.rev, 2, 1.5) && grew(s.profit, 2, 1.25),
  },
  {
    id: "phoenix-60",
    name: "Phoenix 60",
    tagline: "Market cap up 1.5× off its 60-day low",
    rule: "Current price ≥ 1.5× the lowest close of the last 60 days.",
    metrics: [
      { key: "run60", label: "Off 60d low", fmt: "mult", value: (s) => runup(s, s.low60) },
      { key: "low60", label: "60d low", fmt: "price", value: (s) => s.low60 },
    ],
    defaultSort: "run60",
    match: (s) => runup(s, s.low60) != null && (runup(s, s.low60) as number) >= 1.5,
  },
  {
    id: "phoenix-30",
    name: "Phoenix 30",
    tagline: "Market cap up 1.3× off its 30-day low",
    rule: "Current price ≥ 1.3× the lowest close of the last 30 days.",
    metrics: [
      { key: "run30", label: "Off 30d low", fmt: "mult", value: (s) => runup(s, s.low30) },
      { key: "low30", label: "30d low", fmt: "price", value: (s) => s.low30 },
    ],
    defaultSort: "run30",
    match: (s) => runup(s, s.low30) != null && (runup(s, s.low30) as number) >= 1.3,
  },
  {
    id: "topline-3q",
    name: "Top-Line Rocket",
    tagline: "Revenue doubled over the last 3 quarters",
    rule: "Latest-quarter revenue ≥ 2× the quarter 3Q ago.",
    metrics: [mRev(3, "Rev 3Q")],
    defaultSort: "rev3",
    match: (s) => grew(s.rev, 3, 2),
  },
  {
    id: "topline-2q",
    name: "Top-Line Sprint",
    tagline: "Revenue up 1.5× over the last 2 quarters",
    rule: "Latest-quarter revenue ≥ 1.5× the quarter 2Q ago.",
    metrics: [mRev(2, "Rev 2Q")],
    defaultSort: "rev2",
    match: (s) => grew(s.rev, 2, 1.5),
  },
  {
    id: "wounded-compounder",
    name: "Wounded Compounder",
    tagline: "High-margin business trading 30%+ below its 52-week high",
    rule: "Average profit margin over the last 4 quarters > 25% AND price ≥ 30% below the 52-week high.",
    metrics: [
      { key: "pm4", label: "Margin 4Q", hint: ">25%", fmt: "pct", value: (s) => avgAny(s.pm, 4) },
      { key: "below", label: "Off 52w hi", fmt: "belowpct", value: belowHigh },
    ],
    defaultSort: "below",
    match: (s) => {
      const m = avgAny(s.pm, 4);
      const b = belowHigh(s);
      return m != null && m > 25 && b != null && b <= -30;
    },
  },
  {
    id: "deep-value-8q",
    name: "Deep Value Compounder",
    tagline: "8-quarter doubling of revenue & profit, at a fraction of its usual P/E",
    rule: "Revenue ≥ 2× and net profit ≥ 2× vs 8 quarters ago, AND current P/E < 30% of its 8-quarter average P/E.",
    metrics: [
      mRev(8, "Rev 8Q"),
      mProfit(8, "Profit 8Q"),
      { key: "pe8", label: "P/E vs avg", hint: "<30%", fmt: "pct", value: (s) => peVsAvg(s, 8) },
    ],
    defaultSort: "pe8",
    match: (s) => {
      const r = peVsAvg(s, 8);
      return grew(s.rev, 8, 2) && grew(s.profit, 8, 2) && r != null && r < 30;
    },
  },
  {
    id: "deep-value-4q",
    name: "Value Growth Sprint",
    tagline: "Revenue & profit doubled YoY, at a fraction of its usual P/E",
    rule: "Revenue ≥ 2× and net profit ≥ 2× vs 4 quarters ago, AND current P/E < 30% of its 4-quarter average P/E.",
    metrics: [
      mRev(4, "Rev 4Q"),
      mProfit(4, "Profit 4Q"),
      { key: "pe4", label: "P/E vs avg", hint: "<30%", fmt: "pct", value: (s) => peVsAvg(s, 4) },
    ],
    defaultSort: "pe4",
    match: (s) => {
      const r = peVsAvg(s, 4);
      return grew(s.rev, 4, 2) && grew(s.profit, 4, 2) && r != null && r < 30;
    },
  },
];

export const getScreen = (id: string): Screen | undefined => SCREENS.find((s) => s.id === id);
export const DEFAULT_SCREEN = SCREENS[0].id;
