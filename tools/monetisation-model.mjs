// The monetisation testbed. Pure: no canvas, no network, no clock, no randomness that is not seeded.
//
// WHY THIS EXISTS
// ---------------
// The previous attempt searched for a published formula that maps game design to revenue and did not
// find one. That was the wrong object. The ACCOUNTING is published, exact, and checkable:
//
//     ARPDAU = ad term + IAP term
//     LTV    = ARPDAU x Lifetime
//     Lifetime = sum over days of the retention curve
//
// Those are identities, not theories. A testbed built on identities can be VERIFIED against a public
// company's filed numbers, which is what tools/monetisation-check.mjs does. What CANNOT be verified is
// the causal claim that a design change moves a parameter; that is why every input below carries a
// provenance tag and the design-to-parameter links are marked ESTIMATE.
//
// PROVENANCE TAGS (every constant carries one; nothing is untagged)
//   FILED     - a public company's disclosed financial metric (audited-quality)
//   PEER      - a peer-reviewed paper's measured value
//   VENDOR    - an analytics or ad vendor's own aggregate network data with stated methodology
//   PLATFORM  - a game platform's own published operational data
//   DOCS      - a platform's or vendor's published definition or formula
//   ESTIMATE  - an assumption with no source. Every ESTIMATE is listed in ESTIMATES below and is
//               the first thing a future run should replace.
//
// This file is the MODEL. tools/monetisation-check.mjs is the VALIDATION. They are separate on
// purpose: a model that validates itself proves nothing.

// ---------------------------------------------------------------------------------------------
// 1. Constants, each with its provenance
// ---------------------------------------------------------------------------------------------

/** Every external input, with where it came from. Read `tag` before trusting `value`. */
export const P = {
  // --- retention, from an analytics vendor covering 11,600 games and 1.48B MAU, CY2024 ---
  d1_top25:      { value: 0.2709, tag: 'VENDOR', src: 'GameAnalytics Benchmarks 2025, p.5: top 25% D1 26.48-27.69%' },
  d1_median:     { value: 0.11,   tag: 'ESTIMATE', src: 'between VENDOR bottom-25% (10-11.5%) and top-25%; no median printed' },
  d7_median:     { value: 0.0368, tag: 'VENDOR', src: 'GameAnalytics Benchmarks 2025: median 50% D7 3.42-3.94%' },
  d7_top25:      { value: 0.075,  tag: 'VENDOR', src: 'GameAnalytics Benchmarks 2025: top 25% D7 7-8%' },

  // --- session shape ---
  sessions_day:  { value: 3.75,   tag: 'VENDOR', src: 'GameAnalytics 2025: NA/Oceania 3.75 sessions/day' },
  min_casual:    { value: 5.5,    tag: 'VENDOR', src: 'GameAnalytics 2025: casual session length 5-6 min' },
  min_top25:     { value: 8.5,    tag: 'VENDOR', src: 'GameAnalytics 2025: top 25% session length 8-9 min' },

  // --- ad side, from an ad network's own aggregate (100k+ apps, 70+ networks, 200B+ views) ---
  ecpm_rewarded_android: { value: 3.05, tag: 'VENDOR', src: 'Appodeal eCPM Report 2025 (Q4 2024), chart reading (approx)' },
  ecpm_rewarded_ios:     { value: 4.15, tag: 'VENDOR', src: 'Appodeal eCPM Report 2025, chart reading (approx)' },
  ecpm_interstitial_android: { value: 1.70, tag: 'VENDOR', src: 'Appodeal eCPM Report 2025, chart reading (approx)' },
  ecpm_interstitial_ios:     { value: 2.25, tag: 'VENDOR', src: 'Appodeal eCPM Report 2025, chart reading (approx)' },
  fill_rate:     { value: 1.0,    tag: 'ESTIMATE', src: 'no published figure found; SDK-mediated portals generally fill near 100%. MUST BE REPLACED.' },

  // --- the ad-side formula itself ---
  arpdau_ad_form: { value: '(eCPM/1000) * fill_rate * impressions_per_DAU', tag: 'DOCS',
                    src: 'RevenueFlex vendor guide, printed verbatim (vendor-tier authority)' },

  // --- payer side ---
  // cr_mau is a MONTHLY conversion over the whole monthly base. It is NOT interchangeable with the
  // daily payer share that the published ARPDAU identity needs; converting between them by /30 is a
  // modelling step and the Huuuge regression in tools/monetisation-check.mjs measures how wrong it is.
  cr_mau:        { value: 0.0146, tag: 'PEER', src: 'Moreira, Ramos, Barros & Ramalho 2021, IEEE CoG: CR_MAU 1.46% -> 1.92%' },
  cr_mau_after:  { value: 0.0192, tag: 'PEER', src: 'same paper, post-intervention' },
  arppu_day:     { value: 39.5,   tag: 'FILED', src: 'Huuuge Inc. HY2021: daily ARPPU USD 39.5 (group, H1 2021)' },
  arppu_day_casual: { value: 1.55, tag: 'ESTIMATE', src: 'no published casual ARPPU found; ~1/25 of the filed social-casino figure. MUST BE REPLACED.' },
  // The daily payer share is the quantity the identity actually needs: DPU/DAU.
  payer_share_dau_social_casino: { value: 26100 / 773200, tag: 'FILED', src: 'Huuuge HY2021: DPU 26.1k / DAU 773.2k = 0.0338' },
  payer_share_dau_casual:        { value: 0.0146 / 30,   tag: 'ESTIMATE',
    src: 'peer-reviewed MONTHLY CR_MAU 1.46% divided by 30. The Huuuge regression shows this route ' +
         'understates the filed payer share by ~18x, so treat it as a floor, not a value.' },

  // --- filed ground truth for validation ---
  huuuge: {
    dau:   { value: 773200, tag: 'FILED', src: 'Huuuge Inc. HY2021 KPI table (H1 2021)' },
    mau:   { value: 3511400, tag: 'FILED', src: 'Huuuge Inc. HY2021 KPI table' },
    arpdau:{ value: 1.40,  tag: 'FILED', src: 'Huuuge Inc. HY2021 KPI table' },
    arppu: { value: 39.5,  tag: 'FILED', src: 'Huuuge Inc. HY2021, daily average revenue per paying user' },
    mp_conversion: { value: 0.057, tag: 'FILED', src: 'Huuuge Inc. HY2021, monthly conversion' },
  },

  // --- ad pacing, the design-side constraint on impressions ---
  poki_pacing:   { value: 3.0, tag: 'DOCS', src: 'CrazyGames ad guide: "max 1 every 3 minutes"; Poki uses commercialBreak() at natural stops' },

  // --- web platform data, the closest published analogue for a browser game ---
  cg_min_per_play:      { value: 21, tag: 'PLATFORM', src: 'CrazyGames puzzle guide: 21 min average play time' },
  cg_impressions_play:  { value: 8.9, tag: 'PLATFORM', src: 'CrazyGames puzzle guide: 8.9 impressions per play' },
  cg_impressions_rewarded: { value: 4.2, tag: 'PLATFORM', src: 'CrazyGames puzzle guide: half from rewarded' },

  // --- reward schedule evidence (the only mechanic->outcome effect size verified) ---
  reward_pref_eta2p: { value: 0.205, tag: 'PEER', src: 'Nagle et al. 2014 IJSG: preference-matched reward, enjoyment partial eta2 = .205' },
  reward_schedule_eta2p: { value: 0.004, tag: 'PEER', src: 'same: variable-ratio vs fixed-ratio NOT significant, partial eta2 = .004' },
};

/** Every value above tagged ESTIMATE, so a later run knows exactly what to go and find. */
export const ESTIMATES = [
  'd1_median — no median D1 is printed in the benchmark report; interpolated between printed bands',
  'fill_rate — no published figure; set to 1.0 and it materially moves the ad term. HIGHEST PRIORITY to replace.',
  'all design->parameter links in designProfile() — these encode DVOR-8 choices, not measurements',
];

// ---------------------------------------------------------------------------------------------
// 2. Deterministic randomness — the model must replay exactly under test
// ---------------------------------------------------------------------------------------------

/** mulberry32, the same generator the game uses, so a seed means the same thing everywhere. */
export function rng(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box-Muller, so engagement parameters can carry honest spread rather than being point values. */
function gauss(next) {
  let u = 0, v = 0;
  while (u === 0) u = next();
  while (v === 0) v = next();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// ---------------------------------------------------------------------------------------------
// 3. The core identities
// ---------------------------------------------------------------------------------------------

/**
 * A retention curve as a power law, which is the form the published source prints:
 * Google Play's LTV whitepaper gives `y = a * x^b` for retention and `Y = c*Ln(x) + b` as a
 * bottoms-up variant. r(1) = a by construction, so `a` IS day-1 retention and `b` is the single
 * decay parameter. This is the piece that lets D1 and D7 pin the whole curve.
 */
export function retention(day, { d1, d7 }) {
  if (day < 1) return 0;
  const b = Math.log(d7 / d1) / Math.log(7);   // because d7 = d1 * 7^b
  return d1 * Math.pow(day, b);
}

/** Lifetime in days = the area under the retention curve. Exact for a power law. */
export function lifetimeDays({ d1, d7 }, horizon = 3650) {
  const b = Math.log(d7 / d1) / Math.log(7);
  if (Math.abs(b + 1) < 1e-9) return d1 * Math.log(horizon + 1);
  return (d1 / (b + 1)) * (Math.pow(horizon + 1, b + 1) - 1);
}

/**
 * Impressions per DAU, and the design lever that bounds it.
 *
 * The ad-side formula is published (RevenueFlex). The DESIGN decides how many natural stops a
 * session contains, and the platform's pacing rule caps how many of them may carry an ad. So:
 *
 *     impressions_per_DAU = sessions x min(stops_per_session, play_minutes / pacing_minutes)
 *
 * `stops_per_session` is the only free design variable here, and it is bounded above by wall-clock
 * time and the pacing rule — not by ambition. This is where "place the monetisation element where
 * it is supposed to go" becomes a number.
 */
export function impressionsPerDau({ sessions, playMinutes, stopsPerSession, pacingMinutes }) {
  const byTime = playMinutes / pacingMinutes;
  const adSlots = Math.min(stopsPerSession, byTime);
  return sessions * adSlots;
}

/** The published ad-side decomposition, verbatim in structure. */
export function arpdauAds({ impressionsPerDau, ecpm, fillRate = 1 }) {
  return (ecpm / 1000) * fillRate * impressionsPerDau;
}

/**
 * The IAP-side term.
 *
 * THERE IS NO SINGLE CORRECT DECOMPOSITION. The monetisation strategy decides the form, and any form
 * is valid provided its UNITS and its BASE are consistent — the per-payer figure and the payer share
 * must be measured over the same period and against the same population. The one thing that is always
 * wrong is mixing them, which is the error an earlier revision of this file made.
 *
 * Three internally consistent forms, and when each applies:
 *
 *   daily    ARPDAU = ARPPU_daily   x (DPU / DAU)            <- daily actives, daily payers
 *   monthly  ARPDAU = ARPPU_monthly x (MPU / MAU) / 30       <- monthly actives, monthly payers
 *   blended  ARPDAU = ARPPU_period  x conversion_period / days_in_period
 *
 * The filing behind the earlier confusion, Huuuge H1-2021 (DAU 773.2k, MAU 3,511.4k, DPU 26.1k,
 * ARPDAU $1.40, ARPPU_daily $39.50, monthly conversion 5.7%), is consistent under BOTH:
 *   daily:   $39.5 x (26,100 / 773,200)                       = $1.33  vs filed $1.40
 *   monthly: ($39.5 x 30) x (200,150 / 3,511,400) / 30        = $1.33  vs filed $1.40
 * They agree to the cent because the conversion and the payer counts are themselves related. So the
 * filing does not privilege one form; it only rules out the mixed form, which gave $0.0025.
 */
export function arpdauIapDaily({ arppuDay, dpu, dau }) {
  return arppuDay * (dpu / dau);
}

export function arpdauIapMonthly({ arppuMonth, mpu, mau, daysPerMonth = 30 }) {
  return (arppuMonth * (mpu / mau)) / daysPerMonth;
}

export function arpdauIapBlended({ arppuPeriod, conversionPeriod, daysInPeriod = 30 }) {
  return (arppuPeriod * conversionPeriod) / daysInPeriod;
}

/** Kept as the plain product, for callers already holding a consistent pair. */
export function arpdauIap({ arppuDay, payerShareOfDau }) {
  return arppuDay * payerShareOfDau;
}

/** The modelling step of turning a monthly conversion into a daily payer share. Valid ONLY when
 *  the monthly figure is genuinely a share of monthly actives AND the ARPPU is genuinely daily. */
export function payerShareFromMonthly(monthlyConversion, daysPerMonth = 30) {
  return monthlyConversion / daysPerMonth;
}

export function arpdau(cfg) {
  return arpdauAds(cfg) + arpdauIap(cfg);
}

/** The published top-down identity. */
export function ltv(arpdauValue, lifetime) {
  return arpdauValue * lifetime;
}

// ---------------------------------------------------------------------------------------------
// 4. Monte Carlo over a player base
// ---------------------------------------------------------------------------------------------

/**
 * One simulated cohort. Every player draws their engagement from the published distributions, so
 * the OUTPUT is a distribution rather than a point estimate. Seeded, therefore reproducible.
 *
 * `spread` is an ESTIMATE: the reports give band edges, not standard deviations, so spread is set
 * to cover roughly the printed top-25% / median gap.
 */
export function simulateCohort(cfg, { n = 20000, seed = 8 } = {}) {
  const next = rng(seed);
  const { d1, d7, sessions, playMinutes, ecpm, fillRate, arppuDay, payerShareOfDau } = cfg;
  const days = cfg.horizon ?? 730;

  let downloaders = 0, dauDays = 0, revenue = 0, adRevenue = 0, iapRevenue = 0, payers = 0;
  const perPlayer = [];

  for (let i = 0; i < n; i += 1) {
    downloaders += 1;
    // Engagement varies per player. The spread is an ESTIMATE, declared as such.
    const k = Math.exp(gauss(next) * (cfg.spread ?? 0.35));
    const playerD1 = Math.min(0.95, d1 * k);
    const playerD7 = Math.min(playerD1, d7 * k);
    const playerSessions = Math.max(0.2, sessions * k);
    const playerMinutes = Math.max(0.5, playMinutes * k);

    let playerRevenue = 0, playerAd = 0, playerIap = 0;
    const isPayer = next() < payerShareOfDau;            // drawn once per player, not per day
    if (isPayer) payers += 1;

    const impPerDay = impressionsPerDau({
      sessions: playerSessions, playMinutes: playerMinutes,
      stopsPerSession: cfg.stopsPerSession, pacingMinutes: cfg.pacingMinutes,
    });
    const adPerDay = arpdauAds({ impressionsPerDau: impPerDay, ecpm, fillRate });
    const iapPerDay = isPayer ? arppuDay : 0;

    for (let day = 1; day <= days; day += 1) {
      const alive = playerD1 === 0 ? 0 : Math.min(1, retention(day, { d1: playerD1, d7: playerD7 }));
      if (alive <= 0) break;
      dauDays += alive;
      playerAd += adPerDay * alive;
      playerIap += iapPerDay * alive;
    }
    playerRevenue = playerAd + playerIap;
    adRevenue += playerAd; iapRevenue += playerIap; revenue += playerRevenue;
    perPlayer.push(playerRevenue);
  }

  perPlayer.sort((a, b) => a - b);
  const q = (p) => perPlayer[Math.min(perPlayer.length - 1, Math.floor(p * perPlayer.length))];

  return {
    n, revenue, adRevenue, iapRevenue, payers,
    totalDauDays: dauDays,          // the lifetime sum; LTV x n / ARPDAU must equal it
    avgDau: dauDays / days,
    arpdau: revenue / dauDays,
    arpdauAds: adRevenue / dauDays,
    arpdauIap: iapRevenue / dauDays,
    ltv: revenue / downloaders,
    payerShare: payers / downloaders,
    p50: q(0.50), p90: q(0.90), p99: q(0.99),
    top1pctShareOfRevenue: (() => {
      const top = perPlayer.slice(Math.floor(0.99 * perPlayer.length));
      const sum = top.reduce((a, b) => a + b, 0);
      return revenue > 0 ? sum / revenue : 0;
    })(),
  };
}

// ---------------------------------------------------------------------------------------------
// 5. Design profiles — the ONLY place DVOR-8 enters, and every link here is an ESTIMATE
// ---------------------------------------------------------------------------------------------

/**
 * A design profile says how many natural stops a session contains and how long it is. Nothing
 * here is measured. These are the levers a design change would move, and they are the reason the
 * testbed is useful: it shows what a lever is WORTH under published prices, which is a different
 * question from whether the lever works.
 *
 * `stopsPerSession` is the design variable. For DVOR-8 the counting is:
 *   one yard cleared            -> 1 stop (the yard's end)
 *   arriving at a new yard      -> 1 stop (street.js extend)
 *   the album / card moment     -> 1 stop
 *   restart                     -> deliberately NOT a stop (see constraints.md P6: the clean yard
 *                                  must stay one action away)
 */
export const PROFILES = {
  dvor8_as_built: {
    why: 'DVOR-8 today: no ads, no IAP, no paid layer at all',
    stopsPerSession: 0, playMinutes: P.min_casual.value, sessions: P.sessions_day.value,
    d1: P.d1_median.value, d7: P.d7_median.value,
    ecpm: P.ecpm_rewarded_android.value, fillRate: P.fill_rate.value,
    arppuDay: P.arpu_day?.value ?? P.arppu_day, monthlyConversion: 0,
    pacingMinutes: P.poki_pacing.value,
  },
  dvor8_stops_as_built: {
    why: 'the three natural stops DVOR-8 already has, moneted by ads only',
    stopsPerSession: 3, playMinutes: P.min_casual.value, sessions: P.sessions_day.value,
    d1: P.d1_median.value, d7: P.d7_median.value,
    ecpm: P.ecpm_rewarded_android.value, fillRate: P.fill_rate.value,
    arppuDay: P.arppu_day, monthlyConversion: 0,
    pacingMinutes: P.poki_pacing.value,
  },
  dvor8_strong_retention: {
    why: 'same stops, but a top-quartile retention curve — what "worth coming back to" is worth',
    stopsPerSession: 3, playMinutes: P.min_top25.value, sessions: P.sessions_day.value,
    d1: P.d1_top25.value, d7: P.d7_top25.value,
    ecpm: P.ecpm_rewarded_android.value, fillRate: P.fill_rate.value,
    arppuDay: P.arppu_day.value, payerShareOfDau: 0,
    pacingMinutes: P.poki_pacing.value,
  },
  dvor8_overstuffed: {
    why: 'the failure mode: 8 ad slots attempted per session against a 3-minute pacing rule',
    stopsPerSession: 8, playMinutes: P.min_casual.value, sessions: P.sessions_day.value,
    d1: P.d1_median.value, d7: P.d7_median.value,
    ecpm: P.ecpm_rewarded_android.value, fillRate: P.fill_rate.value,
    arppuDay: P.arppu_day.value, payerShareOfDau: 0,
    pacingMinutes: P.poki_pacing.value,
  },
  dvor8_web_puzzle: {
    why: 'the closest published web analogue: CrazyGames puzzle, 21 min per play, 8.9 impressions',
    stopsPerSession: P.cg_impressions_play.value, playMinutes: P.cg_min_per_play.value,
    sessions: P.sessions_day.value, d1: P.d1_median.value, d7: P.d7_median.value,
    ecpm: P.ecpm_rewarded_android.value, fillRate: P.fill_rate.value,
    arppuDay: P.arppu_day.value, payerShareOfDau: 0,
    pacingMinutes: P.poki_pacing.value,
  },
};

// ---------------------------------------------------------------------------------------------
// 6. Regression harness
// ---------------------------------------------------------------------------------------------

/**
 * Compare two profiles on the SAME seeds. Paired sampling, because the difference between two
 * designs is smaller than the spread between players, and unpaired runs would drown it.
 */
export function compare(base, variant, { n = 20000, seeds = [8, 9, 10, 11, 12] } = {}) {
  const a = seeds.map((s) => simulateCohort(base, { n, seed: s }));
  const b = seeds.map((s) => simulateCohort(variant, { n, seed: s }));
  const mean = (xs, f) => xs.reduce((t, x) => t + f(x), 0) / xs.length;
  const sd = (xs, f) => {
    const m = mean(xs, f);
    return Math.sqrt(xs.reduce((t, x) => t + (f(x) - m) ** 2, 0) / (xs.length - 1));
  };
  const metric = (f) => {
    const ma = mean(a, f), mb = mean(b, f);
    const sa = sd(a, f), sb = sd(b, f);
    const diff = mb - ma;
    // Welch, on the between-seed spread. With 5 seeds this is indicative, not decisive.
    const se = Math.sqrt((sa * sa) / a.length + (sb * sb) / b.length);
    return { base: ma, variant: mb, diff, ratio: ma === 0 ? Infinity : mb / ma, t: se === 0 ? 0 : diff / se, se };
  };
  return {
    ltv: metric((x) => x.ltv),
    arpdau: metric((x) => x.arpdau),
    lifetime: metric((x) => x.avgDau),
    payerShare: metric((x) => x.payerShare),
    top1pct: metric((x) => x.top1pctShareOfRevenue),
    runs: { a, b },
  };
}

export default {
  P, ESTIMATES, rng, retention, lifetimeDays, impressionsPerDau,
  arpdauAds, arpdauIap, arpdau, ltv, simulateCohort, PROFILES, compare,
};
