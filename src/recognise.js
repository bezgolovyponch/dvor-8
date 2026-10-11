// The routed recogniser: ONE bounded model call per scan, sent down the free-tier cascade.
//
// What it is for: naming things. The local scan already knows every object's kind; the model is asked what
// a person on the balcony would call up to eight of them. What it is not for: deciding anything. Hits,
// breakage and state never wait on this call, and when it fails the scan is simply `local`.
//
// The routing sequence, in the order it is applied (see docs/routing.md for where each rule came from):
//
//   1. size      the request is costed in tokens BEFORE it is sent, and a lane that cannot afford it inside
//                a third of its minute is not asked.
//   2. cascade   lanes are tried roomiest first; the first one that is ready serves.
//   3. 413       the request is too large for this lane: SPLIT it (halve the object list) and ask the same
//                lane again. Retrying the same size cannot work.
//   4. 429       the lane is rate limited: it goes into cooldown for as long as the provider says, and the
//                NEXT lane is tried. The cooled lane is not asked again until the cooldown ends — the router
//                outlives the scan, so the next scan respects it too.
//   5. 401/403   a rejected key is not a rate limit: no cooldown, move on.
//   6. deadline  a game does not wait a minute for a label. When no lane answers in time, the scan is local.

import { PROVIDERS, CHARS_PER_TOKEN, createRouter, configuredProviders, chat } from './llm.js';
import { KINDS } from './state.js';

export const MAX_ITEMS = 8;            // the answer is bounded by construction
export const MAX_LABEL_CHARS = 28;
export const ANSWER_TOKENS = 400;      // eight short labels, with room for the JSON around them
export const MARGIN_TOKENS = 200;      // the estimate is not exact
export const MIN_OBJECTS = 4;          // below this a split is not worth another request
export const SCAN_DEADLINE_MS = 12_000;

const SYSTEM = [
  'Ты смотришь с балкона на обычный двор. Тебе дан список предметов: id, вид, положение.',
  `Выбери не больше ${MAX_ITEMS} предметов и назови каждый так, как сказал бы житель дома: два-три слова, по-русски.`,
  'Отвечай только JSON: {"items":[{"id":"<id из списка>","label":"<название>"}]}.',
  'Используй только id из списка. Людей не называй и не описывай.',
].join(' ');

export function buildMessages(objects) {
  const list = objects.map((o) => ({ id: o.id, kind: KINDS[o.kind]?.label || o.kind, x: o.x, y: o.y }));
  return [
    { role: 'system', content: SYSTEM },
    { role: 'user', content: JSON.stringify(list) },
  ];
}

// What one scan request costs a lane, in tokens. Input and output count against the same allowance.
export function scanCost(messages) {
  const chars = messages.reduce((n, m) => n + m.content.length, 0);
  return Math.ceil(chars / CHARS_PER_TOKEN) + ANSWER_TOKENS + MARGIN_TOKENS;
}

// A lane can afford the scan when the request fits its ceiling AND leaves the minute usable for two more.
export function laneAffords(config, cost) {
  const perMinute = config.tokensPerMinute || config.requestTokenBudget;
  return cost <= Math.min(config.requestTokenBudget, Math.floor(perMinute / 3));
}

// The model's answer is data, not trusted: only ids that exist, one label each, short, at most eight.
export function parseLabels(text, objects) {
  let parsed;
  try {
    parsed = JSON.parse(String(text).replace(/^\s*```(?:json)?/i, '').replace(/```\s*$/, '').trim());
  } catch {
    return [];
  }
  const items = Array.isArray(parsed) ? parsed : parsed?.items;
  if (!Array.isArray(items)) return [];
  const known = new Set(objects.map((o) => o.id));
  const seen = new Set();
  const out = [];
  for (const item of items) {
    if (out.length >= MAX_ITEMS) break;
    const id = item?.id;
    const label = typeof item?.label === 'string' ? item.label.trim() : '';
    if (!known.has(id) || seen.has(id)) continue;
    if (!label || label.length > MAX_LABEL_CHARS) continue;
    seen.add(id);
    out.push({ id, label });
  }
  return out;
}

// One router per set of keys, kept for the session: cooldowns and the minute's spend must outlive a scan.
export function makeRecogniser(keys = {}) {
  if (!configuredProviders(keys).length) return null;
  let cost = 0;
  const router = createRouter(keys, { costOf: () => cost });
  return {
    router,
    async recognise(world, { deadlineMs = SCAN_DEADLINE_MS } = {}) {
      const started = Date.now();
      const tried = [];
      const refused = new Set();
      // The gameplay layer first: when a split drops half the list, it drops the far things, not the ones
      // the player is about to throw at.
      const depth = { yard: 0, near: 1, mid: 2 };
      let objects = world.objects.filter((o) => !o.gone)
        .sort((a, b) => (depth[a.layer] ?? 3) - (depth[b.layer] ?? 3));
      const local = (why) => ({ source: 'local', why, labels: [], tried, tokens: 0 });

      for (;;) {
        const left = deadlineMs - (Date.now() - started);
        if (left <= 0) return local('deadline');
        const messages = buildMessages(objects);
        cost = scanCost(messages);
        const lane = router.providers.find((id) => !refused.has(id) && laneAffords(PROVIDERS[id], cost) && router.ready(id));
        if (!lane) return local(tried.length ? 'no lane answered' : 'no lane ready');
        try {
          const reply = await chat({
            provider: lane, apiKey: keys[lane], model: PROVIDERS[lane].model,
            messages, json: true, retry: false, timeoutMs: left,
          });
          router.spend(lane, cost);
          const labels = parseLabels(reply.text, objects);
          if (!labels.length) {
            tried.push({ lane, status: 'empty' });
            refused.add(lane);
            continue;
          }
          router.succeed(lane, reply.model);
          tried.push({ lane, status: 200 });
          return { source: 'routed', lane, model: reply.model, labels, tried, tokens: cost };
        } catch (error) {
          const status = error?.status ?? 0;
          tried.push({ lane, status });
          if (status === 413 && objects.length > MIN_OBJECTS) {
            objects = objects.slice(0, Math.max(MIN_OBJECTS, Math.ceil(objects.length / 2)));
            continue;
          }
          router.fail(lane, error);
          refused.add(lane);
        }
      }
    },
  };
}
