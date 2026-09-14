// EPS-momentum scoring. Given a stock's quarterly EPS history (most-recent
// first), measure trailing-12-month (TTM) EPS growth over 2/4/6/8-quarter
// horizons and score each against its threshold. TTM smooths out quarterly
// seasonality so the 2Q/6Q windows aren't distorted by comparing different
// fiscal quarters.

export const THRESHOLDS = { q2: 10, q4: 40, q6: 60, q8: 100 } as const;

export interface MomentumScore {
  q2: number | null; // TTM EPS growth over the last 2 / 4 / 6 / 8 quarters, %
  q4: number | null;
  q6: number | null;
  q8: number | null;
  pass2: boolean;
  pass4: boolean;
  pass6: boolean;
  pass8: boolean;
  score: number; // number of thresholds met, 0–4
  quartersAvailable: number;
}

/** @param eps quarterly EPS, most-recent quarter first. */
export function computeMomentum(eps: number[]): MomentumScore | null {
  if (!eps || eps.length < 6) return null; // need at least the 2Q window (6 quarters)

  // TTM ending `k` quarters ago = sum of eps[k .. k+3].
  const ttm = (k: number): number | null => {
    if (k + 4 > eps.length) return null;
    let sum = 0;
    for (let i = k; i < k + 4; i++) sum += eps[i];
    return sum;
  };

  const now = ttm(0);
  if (now == null) return null;

  const growth = (quartersAgo: number): number | null => {
    const past = ttm(quartersAgo);
    if (past == null || past === 0) return null;
    return ((now - past) / Math.abs(past)) * 100;
  };

  const q2 = growth(2);
  const q4 = growth(4);
  const q6 = growth(6);
  const q8 = growth(8);

  const met = (v: number | null, t: number) => v != null && v > t;
  const pass2 = met(q2, THRESHOLDS.q2);
  const pass4 = met(q4, THRESHOLDS.q4);
  const pass6 = met(q6, THRESHOLDS.q6);
  const pass8 = met(q8, THRESHOLDS.q8);

  return {
    q2, q4, q6, q8,
    pass2, pass4, pass6, pass8,
    score: [pass2, pass4, pass6, pass8].filter(Boolean).length,
    quartersAvailable: eps.length,
  };
}
