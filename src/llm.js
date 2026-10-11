// CARRIED OVER from github.com/bezgolovyponch/partner-sim, llm.js — the checked version, copied rather than
// rewritten. Two changes only, both marked DVOR-8 below: createRouter takes an optional `costOf`, because a
// scan request is a fraction of the size of the analysis this router was sized for, and without it the
// smallest lane (Groq) is declared unable to carry a request it carries easily.
//
// One client, several providers that all speak the OpenAI chat-completions protocol. Everything
// downstream reads this config, so this is the only place that knows an endpoint, a model name
// and its limits.
//
// THE LIMIT THAT MATTERS is not how much text a model can read, it is how many tokens the
// provider allows IN ONE REQUEST per minute. Groq's free tier allows 8,000 tokens per minute for
// this model and returns 413 when a single request exceeds it, so a 24,000-character
// correspondence (~8,500 tokens) is refused before the model ever sees it. Every provider
// therefore declares `requestTokenBudget` — the tokens one request may occupy — and the
// analyzers size their prompts against it instead of hoping.

// Tokens are roughly three characters of Russian text. Used only for budgeting, never for a claim.
// Cyrillic is denser than English in most tokenisers: a measured sample of this project's own
// fixture text runs at about 2 characters per token, against roughly 4 for English. Budgeting at 3
// under-counted by a third and produced "Request too large" on the constrained provider, so the
// estimate is deliberately pessimistic. It is used only for budgeting, never for a claim.
export const CHARS_PER_TOKEN = 2;

// Providers are ordered by how roomy their free tier is.
//
// The key format is NOT checked for a prefix. Google's documentation distinguishes standard keys
// (which start with AIza) from AUTHORIZATION keys bound to a service account — new keys created in
// AI Studio are authorization keys, and their format differs. A prefix requirement therefore
// rejects valid keys, which is worse than no check at all: the provider is the only authority. Several keys can be live at once, and the
// router below moves between them, so one provider's rate limit is no longer a dead end.
//
// Model names are NOT hardcoded as the source of truth: every provider here exposes an
// OpenAI-compatible /models endpoint, and the app asks for the list. Hardcoded names rot — Google
// already retired one I had written down, and a wrong name fails as 404 with no way forward.
// The default lane is the one with the largest ANALYSIS budget, measured rather than assumed: Gemini
// 49,666 characters, OpenRouter 13,666, Cerebras and Mistral 7,000, Groq none. Cerebras was the default
// on the strength of "1M tokens/day" from a tracking repository; the budget that governs is the one a
// request can use, and Gemini's is seven times larger.
export const PROVIDER = 'gemini';

export const PROVIDERS = {
  cerebras: {
    label: 'CEREBRAS (щедрый бесплатный уровень)',
    url: 'https://api.cerebras.ai/v1/chat/completions',
    modelsUrl: 'https://api.cerebras.ai/v1/models',
    model: 'gpt-oss-120b',
    preferred: ['gpt-oss-120b', 'llama-3.3-70b', 'qwen-3-32b'],
    needsKey: true,
    // 1,000,000 tokens/day and 60,000 tokens/minute on the free tier: no chunking needed for a
    // normal correspondence, and no per-request ceiling worth worrying about.
    // Cerebras publishes a generous free tier; the exact per-minute figure is not on a page I could
    // verify, so this is a conservative floor rather than a claim.
    requestTokenBudget: 30_000,
    tokensPerMinute: 30_000,
    requestsPerMinute: 30,
    outputTokenReserve: 4_000,
    maxChars: Infinity,
    chunkChars: 60_000,
    history: 0,
    hint: 'Ключ бесплатно: cloud.cerebras.ai. Самый щедрый лимит из бесплатных — миллион токенов в день.',
  },
  gemini: {
    label: 'GEMINI (бесплатный ключ Google)',
    url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    modelsUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/models',
    // Retired names are removed as they are discovered: gemini-2.5-flash-lite answered
    // "no longer available" one turn after being listed. The live /models endpoint is the source of
    // truth and these are only the fallback when discovery fails.
    model: 'gemini-2.5-flash',
    preferred: ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.0-flash'],
    needsKey: true,
    // Google: limits are PER PROJECT, not per API key, and the per-model numbers are published only in
    // AI Studio. This is a floor chosen to stay well inside any free-tier allowance.
    requestTokenBudget: 100_000,
    tokensPerMinute: 100_000,
    requestsPerMinute: 10,
    outputTokenReserve: 6_000,
    maxChars: Infinity,
    chunkChars: 120_000,
    history: 0,
    hint: 'Ключ: aistudio.google.com/api-keys. Читает всю переписку целиком.',
  },
  openrouter: {
    label: 'OPENROUTER (много бесплатных моделей)',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    modelsUrl: 'https://openrouter.ai/api/v1/models',
    model: 'openai/gpt-oss-120b:free',
    preferred: ['openai/gpt-oss-120b:free', 'z-ai/glm-4.5-air:free', 'qwen/qwen3-next-80b-a3b-instruct:free', 'meta-llama/llama-3.3-70b-instruct:free'],
    needsKey: true,
    // 20 requests/minute and 50/day on the free tier. Enough for several analyses, and one more
    // lane when another provider is rate limited.
    // OpenRouter's published free tier: 20 requests per minute, 50 per day.
    requestTokenBudget: 40_000,
    tokensPerMinute: 40_000,
    requestsPerMinute: 20,
    requestsPerDay: 50,
    outputTokenReserve: 4_000,
    maxChars: Infinity,
    chunkChars: 40_000,
    history: 0,
    hint: 'Ключ: openrouter.ai/keys. У бесплатных моделей суффикс :free. 50 запросов в день.',
  },
  mistral: {
    label: 'MISTRAL (бесплатный эксперимент)',
    url: 'https://api.mistral.ai/v1/chat/completions',
    modelsUrl: 'https://api.mistral.ai/v1/models',
    model: 'mistral-small-latest',
    preferred: ['mistral-small-latest', 'open-mistral-nemo', 'ministral-8b-latest'],
    needsKey: true,
    requestTokenBudget: 30_000,
    tokensPerMinute: 30_000,
    requestsPerMinute: 5,
    outputTokenReserve: 4_000,
    maxChars: Infinity,
    chunkChars: 30_000,
    history: 0,
    hint: 'Ключ: console.mistral.ai. У бесплатного уровня ограничение по числу запросов в секунду.',
  },
  groq: {
    label: 'GROQ (очень маленький лимит)',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    modelsUrl: 'https://api.groq.com/openai/v1/models',
    model: 'openai/gpt-oss-120b',
    preferred: ['openai/gpt-oss-120b', 'llama-3.3-70b-versatile', 'llama-3.1-8b-instant'],
    needsKey: true,
    // VERIFIED from Groq's own rate-limit table, Free plan, openai/gpt-oss-120b:
    //   RPM 30 · RPD 1,000 · TPM 8,000 · TPD 200,000
    // and the page states limits apply at the ORGANISATION level. That last point is why rotating model
    // slugs inside this provider does not buy throughput — the minute is shared.
    requestTokenBudget: 8_000,   // TPM: one request may not exceed the minute's whole allowance
    tokensPerMinute: 8_000,
    requestsPerMinute: 30,
    requestsPerDay: 1_000,
    dailyTokenBudget: 200_000,
    outputTokenReserve: 1_500,
    maxChars: Infinity,
    chunkChars: 5_000,
    history: 11,
    extra: { reasoning_effort: 'low' },
    hint: 'Ключ: console.groq.com/keys. Лимит 8000 токенов в минуту — годится как запасной, не как основной.',
  },
};

// Which providers the player has a key for, in order of how much room they have.
export function configuredProviders(keys = {}) {
  return Object.entries(PROVIDERS)
    .filter(([id, config]) => config.needsKey ? Boolean((keys[id] || '').trim()) : true)
    .map(([id]) => id);
}

// How many requests one lane should be able to serve inside a minute. One is not enough: at one, every
// request exhausts the minute and a multi-chunk analysis rotates providers for every chunk. Three leaves
// room for a retry.
export const REQUESTS_PER_LANE_PER_MINUTE = 3;

// The characters of correspondence a provider can take in ONE request, leaving room for the
// instructions and the answer. This is the number the analyzers must respect.
export function logBudget(config) {
  // The provider counts INPUT AND OUTPUT against the same allowance, so the reply needs its own
  // reservation. The previous version reserved a flat 1,200 tokens for "instructions and the answer"
  // and set maxChars independently of it, so a full-size log plus the instructions left a negative
  // allowance for the reply — which the provider refused as "Request too large".
  const instructions = 2_000;                        // both passes' instructions, measured
  const answer = config.outputTokenReserve || 4_000;  // room for the reply, per provider
  const margin = 500;                                // the estimate is not exact
  // A request CEILING and a per-minute ALLOWANCE are different numbers, and this function treated the
  // first as the second. Sizing every request to fill the minute means only ONE request per lane per
  // minute, so a multi-chunk analysis rotates providers for every chunk. Each request is sized to a
  // fraction of the minute instead, which keeps a lane usable for several calls.
  const perRequest = config.requestTokenBudget;
  const perMinute = config.tokensPerMinute || perRequest;
  const usable = Math.min(perRequest, Math.floor(perMinute / REQUESTS_PER_LANE_PER_MINUTE));
  const forLog = usable - instructions - answer - margin;
  // Zero means this lane cannot carry the analyzer at all: its whole allowance is smaller than the
  // instructions plus a reply. A floor here would send a request that cannot fit, which is the
  // failure this function exists to prevent.
  return forLog <= 0 ? 0 : Math.floor(forLog * CHARS_PER_TOKEN);
}

// One request's cost on a lane, in tokens, at the chunk size that lane would actually be sent.
export function requestCost(config, chunkChars) {
  const budget = logBudget(config);
  if (!budget) return Infinity;
  const chars = Math.min(chunkChars || budget, budget);
  return Math.round(chars / CHARS_PER_TOKEN) + 2_000 + (config.outputTokenReserve || 4_000) + 500;
}

// Which lanes a given set of keys can actually run an analysis on, and the size each can carry. This
// exists because an error message naming two providers by hand told a player with Cerebras and Mistral
// keys to go and get a Gemini key, when both of the keys they already had were sufficient.
export function analysisLanes(keys) {
  const out = [];
  for (const [id, config] of Object.entries(PROVIDERS)) {
    if (!(keys[id] || '').trim()) continue;
    const budget = logBudget(config);
    out.push({
      id,
      label: config.label,
      usable: budget > 0,
      budget,
      reason: budget > 0 ? null : 'the whole per-minute allowance is smaller than the instructions plus a reply',
    });
  }
  return out;
}

// The message a player gets when nothing they hold can run the analysis, naming what they have and what
// would work, rather than two lane names written into the source.
export function noLaneMessage(keys) {
  const held = analysisLanes(keys).filter((l) => l.usable);
  const usable = Object.keys(PROVIDERS).filter((id) => logBudget(PROVIDERS[id]) > 0);
  if (!held.length) {
    return `Ни один из твоих ключей не может выполнить разбор: ${usable.map((id) => PROVIDERS[id].label).join(', ')} — подойдёт любой из них.`;
  }
  return `Доступные сервисы не ответили: ${held.map((l) => l.label).join(', ')}.`;
}

// Whether a lane can carry an analysis of this size, and why not when it cannot.
// The budget for a CHAT TURN. A conversation sends one small call at a time, so the request ceiling
// governs and the per-minute division does not apply. Using the analysis budget here disabled a lane
// that works perfectly well for chat.
export function chatLogBudget(config) {
  const perRequest = config.requestTokenBudget;
  const forLog = perRequest - 1_200 - (config.outputTokenReserve || 1_500) - 400;
  return forLog <= 0 ? 0 : Math.floor(forLog * CHARS_PER_TOKEN);
}

export function laneCapacity(config, logChars) {
  const budget = logBudget(config);
  if (!budget) return { usable: false, budget: 0, reason: 'allowance smaller than the instructions plus a reply' };
  return { usable: true, budget, excerpted: logChars > budget };
}

// The free provider answers 402 while its per-address cooldown runs; others use 429.
// 402 was the old free provider's cooldown; 429 is a rate limit everywhere.
const BUSY = [402, 429];

// ADOPTED from llm_proxy @ 4e004475. Every constant and rule below is taken from that project's
// implementation and its own test file, which is stored at game1-sources/llm_proxy/.
//
// Retry-After is either delta-seconds or an HTTP date (RFC 9110). The upstream test
// "parses seconds and HTTP dates with an explicit clock" asserts: "3" is 3,000 ms; an HTTP date is the
// difference from now; a date in the past is 0; and "garbage", "-1", "1.5" and an overflow value are
// nil rather than guesses. An earlier version of this file never parsed the header at all, so a lane
// that told us exactly when to come back was retried too early.
const COOLDOWN_MAX_MS = 31 * 24 * 60 * 60 * 1000;
export function parseRetryAfter(value, now = Date.now()) {
  if (value == null) return null;
  const text = String(Array.isArray(value) ? value[0] : value).trim();
  if (text === '') return null;
  if (/^\d+$/.test(text)) {
    const seconds = Number(text);
    if (!Number.isFinite(seconds) || seconds * 1000 > COOLDOWN_MAX_MS) return null;
    return seconds * 1000;
  }
  // The date form is matched explicitly rather than handed to Date.parse. The upstream implementation
  // uses a strict HTTP-date parser, and this is why it matters: Date.parse("-1") and Date.parse("1.5")
  // both return a valid timestamp for this year, so a malformed header would silently become a wait of
  // months. Its test asserts nil for exactly those two values.
  const HTTP_DATE = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4} \d{2}:\d{2}:\d{2} GMT$/;
  if (!HTTP_DATE.test(text)) return null;
  const at = Date.parse(text);
  if (Number.isNaN(at)) return null;
  return Math.max(0, at - now);
}

// ADOPTED from cooldown.ex: valid_duration? requires an integer in (0, 31 days]. Zero is NOT a
// cooldown — the upstream test "Retry-After zero does not persist a cooldown" asserts exactly that, and
// storing zero would block a lane that just told us to try again.
export function validCooldown(ms) {
  return Number.isInteger(ms) && ms > 0 && ms <= COOLDOWN_MAX_MS;
}

// ADOPTED from rate_limit.ex: only a 429 carries a cooldown, and its length depends on the KIND. A
// throttle is the per-minute window and clears quickly; a quota is the day's allowance. The upstream
// test "ordinary API 429 has a short model cooldown and leaves other models usable" asserts 30,000 ms
// for the default throttle.
export const THROTTLE_COOLDOWN_MS = 30_000;
export const QUOTA_COOLDOWN_MS = 15 * 60_000;
const RETRY_EVERY_MS = 3000;
// Backoff with full jitter, as the retrieved fallback strategy specifies: attempt N waits a random
// duration from [0, base * 2^(N-1)). A fixed interval synchronises retries across passes, so every
// chunk of an analysis retries at the same moment and hits the provider together.
const backoffMs = (attempt) => Math.floor(Math.random() * Math.min(30_000, RETRY_EVERY_MS * 2 ** attempt));
// Generous: a long analysis on a slow connection is fine, hanging forever is not.
const REQUEST_TIMEOUT_MS = 90_000;
// When the provider says "too many requests", waiting quietly is the wrong answer: the queue is
// already the problem, and retrying makes it worse. So the short retry window applies only to a
// brief per-minute limit; a long one is reported immediately with what to do about it.
const MAX_WAIT_MS = 20_000;

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status; // 0 means the request never reached the server
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// `plain` drops the optional parameters, for providers that reject one of them.
// A key is a token, not prose: printable ASCII only. A pasted key often carries an invisible
// passenger, and the browser then refuses to put it in a header with "String contains non
// ISO-8859-1 code point" — a message that reads like a network fault and sent me chasing CORS and
// proxies while the real problem sat in the input field.
//
// The two cases are not the same thing, so they are treated differently:
//   INVISIBLE (whitespace, zero-width, byte-order mark) - remove silently, the key is intact.
//   VISIBLE but not ASCII (a Cyrillic letter, a typographic quote) - refuse and say what it is.
// Stripping a visible character would leave a plausible-looking key that Google then rejects,
// which trades a clear error for a confusing one: the mangled key would simply be wrong.
// Code points that never carry meaning in a key: ASCII whitespace and control characters, the
// Latin-1 supplement (a non-breaking space lives there), and the usual invisible punctuation.
// Tested by code point rather than by a global regex: a /g regex keeps lastIndex between calls,
// so alternating .test() calls silently skip matches.
const isInvisible = (char) => {
  const code = char.charCodeAt(0);
  return code <= 0x20 || (code >= 0x7F && code <= 0xA0) ||
    (code >= 0x200B && code <= 0x200F) || code === 0x2028 || code === 0x2029 ||
    code === 0x202F || code === 0x2060 || code === 0xFEFF;
};

export function cleanKey(rawKey) {
  const original = String(rawKey || '');
  const stripped = [...original].filter((char) => !isInvisible(char)).join('');
  const visible = [...stripped].filter((char) => char.charCodeAt(0) > 126);
  return {
    key: [...stripped].filter((char) => char.charCodeAt(0) <= 126).join(''),
    changed: stripped !== original,
    removed: [...new Set([...original].filter(isInvisible))].slice(0, 4),
    // Anything visible outside ASCII: the key cannot be trusted, and guessing which letter was
    // meant is not this code's job.
    foreign: [...new Set(visible)].slice(0, 4),
  };
}

// ---------------------------------------------------------------------------------------------
// ROUTING
//
// One provider's rate limit used to end the run. With several keys configured the work is spread
// across them instead: each chunk of a multi-pass analysis goes to a different lane, and a lane
// that returns 429 goes into cooldown while the others carry on.
//
// Two rules keep this honest:
//   - Which provider is tried first is decided by which providers are configured, not at random.
//   - A failure is recorded per provider, so one dead key does not stall every chunk.
// ---------------------------------------------------------------------------------------------

// How long a provider sits out after a rate limit or a hard failure. A minute is enough for a
// per-minute limit to clear, and short enough that a player does not give up.
const COOLDOWN_MS = 60_000;

/** Creates a router over the providers the player has keys for. */
export function createRouter(keys = {}, options = {}) {   // DVOR-8: options.costOf
  const available = configuredProviders(keys);
  if (!available.length) {
    throw new Error('нет ни одного ключа: вставь ключ хотя бы одного сервиса, лучше Cerebras или Gemini.');
  }
  const cooldown = new Map(); // provider -> timestamp until which it is skipped
  const authFailures = new Map(); // provider -> consecutive rejected-key count
  const retired = new Set();      // providers removed for the session because the key is wrong
  const health = new Map();   // provider -> { ok, failed, lastError, served }
  // Tokens spent per lane inside the current minute. A per-minute allowance is not a per-request one:
  // two large requests in the same minute exceed it even when each fits on its own.
  const spent = new Map();    // provider -> { tokens, since }
  const order = [...available];
  let cursor = 0;

  // Pacing can be compressed for tests. The code path is identical; only the length of a "minute" to
  // wait out changes, so a cascade test exercises waiting without spending the wall time.
  const MINUTE = Math.max(50, Number(globalThis.__DSH_MINUTE_MS__) || 60_000);
  const spentNow = (id) => {
    const record = spent.get(id);
    if (!record || Date.now() - record.since >= MINUTE) return 0;
    return record.tokens;
  };
  // What one more request on this lane would cost, so readiness is a real affordability question
  // rather than a fraction of the ceiling.
  // One formula, used by the router and by anything that needs to know what a request costs. It was
  // duplicated here before, and a duplicated cost formula is a silent way for the pacing to drift.
  // DVOR-8: the caller may state what its own request costs. The default is the analysis cost, unchanged.
  const costOf = (id) => {
    if (!PROVIDERS[id]) return Infinity;
    if (options.costOf) return options.costOf(id, PROVIDERS[id]);
    return requestCost(PROVIDERS[id], logBudget(PROVIDERS[id]));
  };
  const minuteRoom = (id) => (PROVIDERS[id]?.tokensPerMinute || PROVIDERS[id]?.requestTokenBudget || 0);
  const usedRequests = new Map();  // provider -> { count, since } for the per-minute request cap
  const ready = (id) => {
    if ((cooldown.get(id) || 0) > Date.now()) return false;
    if (retired.has(id)) return false;   // a rejected key, not a temporary limit
    const config = PROVIDERS[id];
    if (!config) return false;
    if (costOf(id) === Infinity) return false;         // cannot carry an analysis
    if (spentNow(id) + costOf(id) > minuteRoom(id)) return false;
    const used = usedRequests.get(id);
    const perMinute = config.requestsPerMinute || Infinity;
    if (used && Date.now() - used.since < MINUTE && used.count >= perMinute) return false;
    return true;
  };
  // When nothing is ready, the run is not over: the lane is waiting out its minute. The caller is told
  // how long, so it can wait rather than report a failure that has no cause.
  const waitFor = () => {
    const now = Date.now();
    let soonest = Infinity;
    for (const id of order) {
      const until = cooldown.get(id) || 0;
      if (until > now) soonest = Math.min(soonest, until - now);
      const used = usedRequests.get(id);
      if (used && now - used.since < MINUTE && used.count >= (PROVIDERS[id]?.requestsPerMinute || Infinity)) {
        soonest = Math.min(soonest, MINUTE - (now - used.since));
      }
      const record = spent.get(id);
      if (record && now - record.since < MINUTE) soonest = Math.min(soonest, MINUTE - (now - record.since));
    }
    return Number.isFinite(soonest) ? Math.max(250, soonest) : 0;
  };
  const live = () => order.filter(ready);

  return {
    providers: order,
    // The next lane: round-robin so consecutive chunks do not hammer one provider, skipping any
    // that is in cooldown.
    next() {
      const candidates = live();
      if (!candidates.length) return null;
      // A cascade rather than round-robin: the lanes are already ordered roomiest first, so the first
      // live one is the best choice. Round-robin sent consecutive passes to the same provider and
      // consumed its minute twice.
      const chosen = candidates[0];
      cursor += 1;
      return chosen;
    },
    // Called when a lane answers, with what the request cost, so the next pick can avoid a lane that
    // has already used its minute.
    spend(id, tokens) {
      const record = spent.get(id);
      if (!record || Date.now() - record.since >= MINUTE) spent.set(id, { tokens: tokens || 0, since: Date.now() });
      else record.tokens += tokens || 0;
      const used = usedRequests.get(id);
      if (!used || Date.now() - used.since >= MINUTE) usedRequests.set(id, { count: 1, since: Date.now() });
      else used.count += 1;
    },
    // How long until some lane can serve again. Zero means one is ready now.
    waitFor,
    ready,
    costOf,
    spentNow,
    succeed(id, servedName) {
      cooldown.delete(id);
      const state = health.get(id) || { ok: 0, failed: 0, lastError: null };
      state.ok += 1;
      if (servedName) state.served = servedName;
      health.set(id, state);
    },
    // How many rejected keys before a lane is retired for the session. No timer is used, because a
    // timer would say "come back later" when the truth is "this key is wrong".
    fail(id, error) {
      const state = health.get(id) || { ok: 0, failed: 0, lastError: null };
      state.failed += 1;
      state.lastError = error;
      health.set(id, state);
      // ADOPTED from the upstream test "authentication and billing errors do not create temporary
      // cooldowns", and "insufficient API credits remain an error without an invented reset". This file
      // used to cooldown on 401, 402 AND 403, which is precisely what that test forbids: a rejected key
      // is not a rate limit, and blocking the lane on it hides the real problem behind a timer.
      // A key the provider keeps rejecting is removed from the rotation after two attempts, without a
      // timed cooldown. One attempt may be a transient 401; two is a wrong key.
      if ([401, 403].includes(error?.status)) {
        const count = (authFailures.get(id) || 0) + 1;
        authFailures.set(id, count);
        if (count >= 2) retired.add(id);
        return;
      }
      // A 402 is insufficient credit, which the upstream test treats as a real error rather than a
      // temporary limit: "insufficient API credits remain an error without an invented reset".
      if (error?.status === 402) { retired.add(id); return; }
      if (error?.status !== 429) return;
      // The hint from the provider wins over our own default, which is what the upstream test
      // "explicit retry hint takes precedence over provider fallback" asserts.
      const hinted = parseRetryAfter(error.retryAfter);
      const kind = error.quota ? QUOTA_COOLDOWN_MS : THROTTLE_COOLDOWN_MS;
      const duration = hinted == null ? kind : hinted;
      // Zero or malformed means no cooldown is persisted; the lane stays available.
      if (!validCooldown(duration)) return;
      const until = Date.now() + duration;
      // ADOPTED from "ordinary API failures do not clear or shorten an existing quota block": a later,
      // shorter limit must not release a lane that is still inside a longer block.
      if (until > (cooldown.get(id) || 0)) cooldown.set(id, until);
    },
    health: () => Object.fromEntries(health),
    cooldownSeconds(id) {
      const until = cooldown.get(id) || 0;
      return Math.max(0, Math.ceil((until - Date.now()) / 1000));
    },
    // Whether any lane is usable right now, so the caller can say something true when none is.
    stuck: () => live().length === 0,
  };
}

// Asks a provider which models it actually offers. Hardcoded names rot — Google retired one I had
// written down — so the list is read rather than assumed. Returns [] when the attempt fails, which
// simply means the configured default is used.
export async function listModels(provider, apiKey) {
  const config = PROVIDERS[provider];
  if (!config?.modelsUrl) return [];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(config.modelsUrl, {
      method: 'GET',
      headers: { ...(config.needsKey && { Authorization: `Bearer ${cleanKey(apiKey).key}` }) },
      signal: controller.signal,
    });
    if (!response.ok) return [];
    const body = await response.json();
    const raw = Array.isArray(body) ? body : body.data || body.models || [];
    return raw.map((item) => item.id || item.name || item.model).filter((id) => typeof id === 'string' && id);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

// Candidate model names for a provider, best first. Returning a LIST rather than one choice is the
// point: a provider retires names without warning, Google already retired one mid-project, and a
// single 404 used to end the whole feature with "модель не найдена".
export function modelCandidates(provider, discovered = [], configured) {
  const config = PROVIDERS[provider];
  // An explicit choice from the player is tried first, then the documented defaults.
  const out = [];
  const push = (name) => { if (name && !out.includes(name)) out.push(name); };
  if (configured) push(configured);
  const list = (discovered || []).filter((id) => !/embed|image|vision|whisper|tts|audio|rerank|moderation|dall|stable/i.test(id));
  // Names the provider actually reported, preferred ones first.
  for (const preferred of config.preferred || []) if (list.includes(preferred)) push(preferred);
  for (const preferred of config.preferred || []) {
    const stem = preferred.replace(/:(free|latest)$/, '');
    const hit = list.find((id) => id.includes(stem));
    if (hit) push(hit);
  }
  // Then anything sizeable the provider listed, largest first.
  const scored = list
    .map((id) => {
      const size = Number((id.match(/(\d+)b(?![a-z])/i) || [])[1] || 0);
      return { id, score: size + (/free/i.test(id) ? 1 : 0) + (/instruct|chat/i.test(id) ? 1 : 0) };
    })
    .sort((a, b) => b.score - a.score);
  for (const item of scored) push(item.id);
  // Finally the documented defaults, which are correct for the common case and cost nothing to try.
  for (const preferred of config.preferred || []) push(preferred);
  push(config.model);
  return out;
}

// The single best name, kept for callers that only want one.
export function pickModel(provider, discovered = [], configured) {
  return modelCandidates(provider, discovered, configured)[0];
}

// The project-details shapes, repeated from the form's own check so this module can be used alone.
function checkKeyShape(rawKey) {
  const key = String(rawKey || '').trim();
  if (!key) return { ok: false, message: 'вставь ключ Gemini.' };
  if (key.startsWith('projects/') || /^\d{9,}$/.test(key) || key.startsWith('gen-lang-')) {
    return { ok: false, message: 'это данные проекта, а не ключ. Нажми значок копирования в строке ключа.' };
  }
  if (key.length < 20) return { ok: false, message: 'ключ слишком короткий: скопировалась только часть.' };
  return { ok: true };
}

// What to tell the player, or null when the key is usable.
export function keyProblem(rawKey) {
  const shape = checkKeyShape(rawKey);
  if (!shape.ok) return shape.message;
  const cleaned = cleanKey(rawKey);
  if (cleaned.foreign.length) {
    const shown = cleaned.foreign.map((char) => `«${char}»`).join(', ');
    return `в ключе есть посторонние символы: ${shown}. Скорее всего при копировании попал текст из другого шрифта. ` +
      'Скопируй ключ значком копирования в строке ключа, не выделяя его мышью.';
  }
  return null;
}

async function request({ provider, apiKey, model, messages, json, timeoutMs }, plain = false) {
  const config = PROVIDERS[provider];
  // A request that never settles looks exactly like an app that does nothing, so every call has
  // a deadline. The reason is reported rather than swallowed.
  const deadline = Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : REQUEST_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), deadline);
  try {
    return await fetch(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.needsKey && { Authorization: `Bearer ${apiKey}` }),
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        ...(!plain && config.extra),
        ...(!plain && json && { response_format: { type: 'json_object' } }),
      }),
      signal: controller.signal,
    });
  } catch (error) {
    // Three different failures used to collapse into one misleading message. Keep them apart.
    if (error.name === 'AbortError') {
      throw new ApiError(0, `запрос не ответил за ${Math.round(deadline / 1000)} с`);
    }
    if (/non ISO-8859-1|Failed to read the 'headers'/i.test(error.message)) {
      throw new ApiError(0, 'в ключе есть символ, который нельзя отправить. Скопируй ключ заново значком копирования.');
    }
    // A genuine network failure: the browser could not make the connection at all.
    throw new ApiError(0, error.message);
  } finally {
    clearTimeout(timer);
  }
}

// Can the browser reach the provider at all, with no key involved? A GET to the API root answers
// with an auth error when the network and DNS are fine, which separates "no internet" from
// "bad key" — the distinction the old message collapsed.
export async function reachable(provider) {
  const config = PROVIDERS[provider];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(config.url.replace('/chat/completions', '/models'), {
      method: 'GET',
      signal: controller.signal,
    });
    // Any HTTP answer at all means the request travelled. 401 and 403 are successes here.
    return { ok: true, status: response.status };
  } catch (error) {
    return { ok: false, status: 0, detail: error.name === 'AbortError' ? 'нет ответа за 15 с' : error.message };
  } finally {
    clearTimeout(timer);
  }
}

// Streams one chat completion. Calls onText with each text delta, and onWait(secondsLeft)
// while it is waiting out a rate limit (onWait(0) when the wait ends).
// Resolves with { text, finish, model }; finish is "stop", "length" or "content_filter".
export async function chat({ provider, apiKey, model, messages, json = false, onText, onWait, onKeyCleaned, timeoutMs, retry = true }) {
  // Never send a header the browser cannot encode.
  const cleaned = cleanKey(apiKey);
  apiKey = cleaned.key;
  if (cleaned.foreign.length) {
    throw new ApiError(0, `в ключе есть посторонние символы: ${cleaned.foreign.map((c) => `«${c}»`).join(', ')}. Скопируй ключ значком копирования.`);
  }
  if (cleaned.changed) onKeyCleaned?.(cleaned.removed);
  let response;
  let servedName = null;
  for (let waited = 0; ; waited += RETRY_EVERY_MS) {
    response = await request({ provider, apiKey, model, messages, json, timeoutMs });
    // A key check must fail fast: waiting out a rate limit to learn "this key works but you are
    // limited" is worse than being told immediately.
    if (!retry) break;
    if (!BUSY.includes(response.status) || waited >= MAX_WAIT_MS) break;
    onWait?.(Math.ceil((MAX_WAIT_MS - waited) / 1000));
    await sleep(RETRY_EVERY_MS);
  }
  onWait?.(0);

  // A 400 can mean an optional parameter was refused or JSON mode failed validation.
  // The prompts ask for the right output anyway, so try once more without the extras.
  if (response.status === 400) response = await request({ provider, apiKey, model, messages, json, timeoutMs }, true);

  // A 404 means this account cannot use that model name. Walk the candidate list: the provider's own
  // reported models first, then the documented defaults. Retrying a 404 is not guessing — the names
  // come from the provider's own catalogue — and it turns "модель не найдена" into a request that
  // succeeds on the next name.
  if (response.status === 404) {
    const tried = new Set([model]);
    for (const candidate of (PROVIDERS[provider].preferred || []).concat([PROVIDERS[provider].model])) {
      if (tried.has(candidate)) continue;
      tried.add(candidate);
      response = await request({ provider, apiKey, model: candidate, messages, json, timeoutMs });
      if (response.status !== 404) {
        servedName = candidate;
        break;
      }
    }
  }

  // Some providers answer 200 with an error object in the body. Routing on the status code alone
  // would treat that as success and return an empty reply, so the body is checked as well.
  if (response.ok) {
    try {
      const peek = await response.clone().text();
      const parsed = JSON.parse(peek);
      const body = Array.isArray(parsed) ? parsed[0] : parsed;
      if (body?.error && !body?.choices) {
        const detail = body.error.message || body.error.detail || JSON.stringify(body.error).slice(0, 160);
        throw new ApiError(response.status === 200 ? 502 : response.status, detail);
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      // Not JSON, or not an error body: a normal stream continues below.
    }
  }
  if (!response.ok) {
    // The message has to say something in every case. Cerebras returned a body this code could not
    // read, so the provider was reported with an EMPTY error and the run looked inexplicable: the
    // screenshot shows "cerebras: | groq: ...". Every shape is now tried, and the raw body is kept as
    // a last resort, truncated.
    let message = response.statusText || `HTTP ${response.status}`;
    let raw = '';
    try {
      raw = await response.text();
      let parsed = null;
      try { parsed = JSON.parse(raw); } catch { /* not JSON */ }
      if (parsed) {
        const body = Array.isArray(parsed) ? parsed[0] : parsed;
        const error = body?.error || body || {};
        const detail = error.message || error.detail || error.error || body?.message || body?.detail;
        if (typeof detail === 'string' && detail) message = detail;
        else if (typeof error === 'string' && error) message = error;
        const quota = (error.details || []).find((d) => /quota/i.test(d['@type'] || ''));
        if (quota) {
          message += ` (${quota.quotaMetric || quota.quotaId || ''}${quota.quotaValue ? ` limit ${quota.quotaValue}` : ''})`;
        }
      } else if (raw.trim()) {
        // Not JSON: keep the text, because a proxy or gateway explains itself in prose.
        message = raw.trim().slice(0, 200);
      }
    } catch {
      // Reading the body failed entirely; the status text is all there is, and it is non-empty.
    }
    const apiError = new ApiError(response.status, message);
    // ADOPTED: the provider's own Retry-After is carried on the error, because the router prefers that
    // hint over its own default — the upstream test "explicit retry hint takes precedence over provider
    // fallback". Read here, where the headers are still in hand.
    apiError.retryAfter = response.headers?.get?.('retry-after') || null;
    throw apiError;
  }

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  let text = '';
  let reasoning = 0; // characters the model spent thinking, counting against its budget
  let finish = null;
  let servedBy = servedName || model;

  // One data line. A server-sent-events stream delivers complete lines, but the LAST line often
  // has no trailing newline, so the tail of the stream has to be flushed after the loop ends.
  // Dropping it was silently losing the end of every Google answer, which produced an empty reply
  // and then an error about invalid JSON — pointing at the model instead of at this parser.
  const take = (line) => {
    if (!line.startsWith('data:')) return;
    const data = line.slice(5).trim();
    if (!data || data === '[DONE]') return;
    let chunk;
    try {
      chunk = JSON.parse(data);
    } catch {
      return; // a partial line is not an error: the rest arrives with the next read
    }
    if (chunk.model) servedBy = chunk.model;
    const choice = chunk.choices?.[0];
    if (!choice) return;
    // Reasoning models stream their thinking in a separate field; only content is the reply.
    if (choice.delta?.content) {
      text += choice.delta.content;
      onText?.(choice.delta.content);
    }
    const thought = choice.delta?.reasoning || choice.delta?.reasoning_content;
    if (thought) reasoning += thought.length;
    if (choice.finish_reason) finish = choice.finish_reason;
  };

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) take(line);
  }
  // Flush whatever the stream left behind.
  if (buffer.trim()) take(buffer);

  return { text, finish, reasoning, model: servedBy };
}

export function errorText(error) {
  if (!(error instanceof ApiError)) return 'Ошибка: ' + error.message;
  if (error.status === 0) {
    // Three different failures reach this branch, and they need different advice.
    if (/не ответил за/.test(error.message)) {
      return `${error.message}: Google не ответил вовремя. Это не отказ ключа — нажми кнопку ещё раз, ` +
        'иногда первый запрос к бесплатной модели идёт долго. Если повторится, нажми «ПРОВЕРИТЬ СВЯЗЬ».';
    }
    if (/посторонние символы|нельзя отправить/.test(error.message)) {
      return 'Ключ не отправлен: ' + error.message;
    }
    return `Запрос не ушёл: ${error.message}. Это сбой браузера или сети, а не отказ ключа. ` +
      'Нажми «ПРОВЕРИТЬ СВЯЗЬ» — она отдельно проверяет, доходит ли запрос до Google.';
  }
  if (error.status === 401) return 'Ключ не принят. Проверь, что скопирован сам ключ, а не данные проекта.';
  // Google's two most confusing refusals, made actionable.
  if (/missing or invalid authorization header/i.test(error.message)) {
    return 'Google не увидел ключ: вставь его в поле ещё раз и нажми «ПРОВЕРИТЬ КЛЮЧ».';
  }
  if (/api key not valid|api_key_invalid/i.test(error.message)) {
    return 'Google отклонил ключ. Открой aistudio.google.com/api-keys и проверь колонку Key Type: ' +
      'если ключ помечен Unrestricted, нажми на метку → «Add restrictions» → «Restrict to Gemini API only», ' +
      'либо создай новый ключ кнопкой Create API key и вставь его.';
  }
  if (error.status === 403) return 'У этого ключа нет доступа к модели: ' + error.message;
  if (error.status === 404) return 'Модель не найдена. Проверь название модели.';
  if (error.status === 413) return 'Запрос больше лимита модели. Сократи описание или начни ситуацию заново.';
  if (BUSY.includes(error.status)) {
    // Google returns the quota that was hit in the message, so pass it through and explain only
    // what the player can act on.
    return 'Google отклонил запрос по лимиту: ' + error.message + '. ' +
      'Лимиты считаются на проект, а не на ключ, поэтому несколько ключей одного проекта делят одну квоту. ' +
      'Дневная квота сбрасывается в полночь по Тихоокеанскому времени; свои лимиты видно на aistudio.google.com/rate-limit. ' +
      'Повторять сразу бессмысленно — это только увеличивает очередь.';
  }
  return `Ошибка API ${error.status}: ${error.message}`;
}
