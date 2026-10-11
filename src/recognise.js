// Naming the things in the photograph: ONE bounded model call per yard, sent down the free-tier cascade.
//
// The local pass (src/segment.js) finds shapes and cannot name them. With a key, the photograph and the
// boxes of the shapes go to a model that can see, and it says what each one is. What it is not for:
// deciding anything. Hits, breakage and score never wait on this call; when it fails, things keep numbers.
//
// THE PHOTOGRAPH LEAVES THE DEVICE when this runs, and only then — to the one provider whose key was
// entered. The page says so next to the key fields.
//
// Only lanes whose default model reads images are asked. Which those are is NOT VERIFIED from here: no
// provider has been called from this project.
//
// The routing sequence, in the order it is applied (docs/routing.md):
//
//   1. size      the request is costed in tokens BEFORE it is sent; a lane that cannot afford it is skipped
//   2. cascade   the first ready lane that can see serves
//   3. 413       too large for this lane: SPLIT (halve the list of boxes) and ask the same lane again
//   4. 429       rate limited: cooldown for as long as the provider says, try the NEXT lane; the cooled
//                lane is not asked again until it clears — the router outlives the yard
//   5. 401/403   a rejected key is not a rate limit: no cooldown, move on
//   6. deadline  a game does not wait a minute for a name

import { PROVIDERS, CHARS_PER_TOKEN, createRouter, configuredProviders, chat } from './llm.js';

export const MAX_ITEMS = 8;            // the answer is bounded by construction
export const MAX_LABEL_CHARS = 28;
export const ANSWER_TOKENS = 400;      // eight short labels, with room for the JSON around them
export const MARGIN_TOKENS = 200;      // the estimate is not exact
export const MIN_OBJECTS = 4;          // below this a split is not worth another request
export const SCAN_DEADLINE_MS = 12_000;
export const IMAGE_TOKENS = 300;       // a FLOOR for one small image, not a published figure
export const VISION = ['gemini', 'mistral'];

const SYSTEM = [
  'Перед тобой фотография двора и список прямоугольников на ней: id и положение в процентах от ширины и высоты.',
  `Для не более чем ${MAX_ITEMS} прямоугольников скажи, что в нём находится: одно-два слова, по-русски, как сказал бы житель дома.`,
  'Отвечай только JSON: {"items":[{"id":<id из списка>,"label":"<название>"}]}.',
  'Используй только id из списка. Если не видно, что это, пропусти. Людей не называй и не описывай.',
].join(' ');

export function buildMessages(world, regions, imageUrl) {
  const pct = (v, of) => Math.round((v / of) * 100);
  const list = regions.map((r) => ({ id: r.id, x: pct(r.x, world.w), y: pct(r.y, world.h), w: pct(r.w, world.w), h: pct(r.h, world.h) }));
  return [
    { role: 'system', content: SYSTEM },
    { role: 'user', content: [{ type: 'text', text: JSON.stringify(list) }, { type: 'image_url', image_url: { url: imageUrl } }] },
  ];
}

// What one scan request costs a lane, in tokens. Input and output count against the same allowance.
export function scanCost(messages) {
  const chars = messages[0].content.length + messages[1].content[0].text.length;
  return Math.ceil(chars / CHARS_PER_TOKEN) + IMAGE_TOKENS + ANSWER_TOKENS + MARGIN_TOKENS;
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
    const id = Number(item?.id);   // the ids are numbers; a model may send them back as text
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
    async recognise(world, imageUrl, { deadlineMs = SCAN_DEADLINE_MS } = {}) {
      const started = Date.now();
      const tried = [];
      const refused = new Set();
      // The largest first: when a split drops half the list, it keeps the things most worth naming.
      let objects = world.regions.filter((o) => !o.gone).sort((a, b) => b.area - a.area);
      const local = (why) => ({ source: 'local', why, labels: [], tried, tokens: 0 });
      if (!imageUrl) return local('no image');

      for (;;) {
        const left = deadlineMs - (Date.now() - started);
        if (left <= 0) return local('deadline');
        const messages = buildMessages(world, objects, imageUrl);
        cost = scanCost(messages);
        const lane = router.providers.find((id) => VISION.includes(id) && !refused.has(id) && laneAffords(PROVIDERS[id], cost) && router.ready(id));
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
