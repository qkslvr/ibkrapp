// XIRR — money-weighted annualized return over dated cash flows.
//
// Solves for the rate r where the net present value of all flows is zero:
//   Σ  amount_i / (1 + r) ^ (days_i / 365)  =  0
// Sign convention: cash paid INTO the fund (deposits) is negative, the current
// portfolio value is a positive terminal flow. Uses Newton–Raphson with a
// bisection fallback so it converges even on awkward flow shapes.

export interface CashFlow {
  date: string; // ISO date
  amount: number;
}

export function xirr(flows: CashFlow[]): number | null {
  if (flows.length < 2) return null;
  const sorted = [...flows].sort((a, b) => a.date.localeCompare(b.date));
  const hasPos = sorted.some((f) => f.amount > 0);
  const hasNeg = sorted.some((f) => f.amount < 0);
  if (!hasPos || !hasNeg) return null; // need in- and out-flows

  const t0 = new Date(sorted[0].date).getTime();
  const yrs = (d: string) => (new Date(d).getTime() - t0) / (365 * 24 * 60 * 60 * 1000);

  const npv = (r: number) =>
    sorted.reduce((s, f) => s + f.amount / Math.pow(1 + r, yrs(f.date)), 0);
  const dNpv = (r: number) =>
    sorted.reduce((s, f) => {
      const y = yrs(f.date);
      return s - (y * f.amount) / Math.pow(1 + r, y + 1);
    }, 0);

  // Newton–Raphson
  let r = 0.1;
  for (let i = 0; i < 100; i++) {
    const f = npv(r);
    if (Math.abs(f) < 1e-7) return r;
    const df = dNpv(r);
    if (df === 0) break;
    let next = r - f / df;
    if (!Number.isFinite(next)) break;
    if (next <= -0.9999) next = -0.9999;
    if (Math.abs(next - r) < 1e-10) return next;
    r = next;
  }

  // Bisection fallback over a wide bracket
  let lo = -0.9999;
  let hi = 100;
  let flo = npv(lo);
  let fhi = npv(hi);
  if (flo * fhi > 0) return null;
  for (let i = 0; i < 300; i++) {
    const mid = (lo + hi) / 2;
    const fm = npv(mid);
    if (Math.abs(fm) < 1e-7) return mid;
    if (flo * fm < 0) {
      hi = mid;
      fhi = fm;
    } else {
      lo = mid;
      flo = fm;
    }
  }
  return (lo + hi) / 2;
}
