// Writes the audited metric-lever table to JSON, so the audit document cites COMPUTED numbers rather
// than numbers typed by hand. Run it, then quote its output.
//
//   node tools/audit-report.mjs > docs/audit-levers.json

import {
  P, PROFILES, compare, simulateCohort, retention, lifetimeDays, impressionsPerDau,
  CURVE_MEDIAN, CURVE_TOP_QUARTILE, CURVE_INCOHERENT, activeAtDay,
} from './monetisation-model.mjs';

const base = PROFILES.dvor8_stops_as_built;
const out = { generatedFor: 'docs/game-pieces-audit.md', base: 'dvor8_stops_as_built', profiles: {}, levers: [], curves: {} };

for (const [name, p] of Object.entries(PROFILES)) {
  const r = simulateCohort(p, { n: 20000, seed: 8 });
  out.profiles[name] = {
    why: p.why,
    ltv: +r.ltv.toFixed(5), arpdau: +r.arpdau.toFixed(5),
    lifetimeDays: +(r.totalDauDays / r.n).toFixed(3),
    top1pctShare: +r.top1pctShareOfRevenue.toFixed(4),
    impressionsPerDau: +impressionsPerDau({
      sessions: p.sessions, playMinutes: p.playMinutes,
      stopsPerSession: p.stopsPerSession, pacingMinutes: p.pacingMinutes,
    }).toFixed(3),
  };
}

// Every lever that the ACCOUNTING can price, paired on the same seeds.
const levers = {
  'sessions/day 3.75 -> 5.45': { ...base, sessions: 5.45 },
  'session 5.5 -> 8.5 min': { ...base, playMinutes: 8.5 },
  'stops 3 -> 6 (pacing binds at the average)': { ...base, stopsPerSession: 6 },
  'eCPM rewarded 3.05 -> 4.15 (iOS)': { ...base, ecpm: 4.15 },
  'retention median -> top quartile (both ends)': { ...base, d1: 0.2709, d7: 0.075 },
  'ad-only -> ad + a payer layer': { ...base, arppuDay: 39.5, payerShareOfDau: 0.0338 },
};
for (const [name, v] of Object.entries(levers)) {
  const c = compare(base, v, { n: 20000, seeds: [8, 9, 10, 11, 12] });
  out.levers.push({
    lever: name,
    ltvRatio: +c.ltv.ratio.toFixed(4),
    ltvBase: +c.ltv.base.toFixed(5),
    ltvVariant: +c.ltv.variant.toFixed(5),
    t: +c.ltv.t.toFixed(2),
    note: name.startsWith('ad-only')
      ? 'UPPER BOUND ONLY: the payer parameters come from a social-casino filing, not a casual game'
      : name.includes('stops 3 -> 6')
        ? 'small positive, not zero: pacing binds at the AVERAGE session but 1583 of 20000 players run past 9 minutes, where extra stops do buy impressions'
        : '',
  });
}

for (const [name, c] of Object.entries({ median: CURVE_MEDIAN, topQuartile: CURVE_TOP_QUARTILE, incoherent: CURVE_INCOHERENT })) {
  out.curves[name] = {
    ...c,
    beta: +(Math.log(c.d7 / c.d1) / Math.log(7)).toFixed(4),
    lifetimeDays: +lifetimeDays(c).toFixed(3),
    d30: +activeAtDay(30, c).toFixed(5),
    d90: +activeAtDay(90, c).toFixed(5),
    d365: +activeAtDay(365, c).toFixed(5),
  };
}

// The pacing ceiling, per session length: how many ad slots a design can actually reach.
out.pacingCeiling = {};
for (const min of [5.5, 8.5, 21]) {
  out.pacingCeiling[`${min} min session`] = {
    slotsAtThreeMinutePacing: +(min / P.poki_pacing.value).toFixed(2),
    stopsNeededToReachIt: Math.ceil(min / P.poki_pacing.value),
    impressionsPerDau: +impressionsPerDau({
      sessions: P.sessions_day.value, playMinutes: min,
      stopsPerSession: 99, pacingMinutes: P.poki_pacing.value,
    }).toFixed(3),
  };
}

out.estimatesAtLarge = [
  'fill_rate = 1.0 (no published figure)',
  'd1_median interpolated between printed benchmark bands',
  'all design -> parameter links (stops per session, session length)',
  'casual ARPPU $1.55 (an ESTIMATE, not a filing)',
];

console.log(JSON.stringify(out, null, 2));
