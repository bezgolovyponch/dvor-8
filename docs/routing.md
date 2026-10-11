# Routing and the LLM API — carried over, and what it is for here

The previous project solved a harder version of this problem and the working code is carried over rather
than rewritten. This file says what applies to DVOR-8 and what does not.

## What was learned, with the sources

| Finding | Source | Applies here |
|---|---|---|
| free tiers limit **per minute**, and a request ceiling is not a minute's allowance | provider pages, pinned in the previous project's baseline | yes |
| a request bigger than one lane allows must be **split**, not retried | `chunking-strategies` (recursive separators, sliding window) | yes, for a long scan transcript |
| a failure must be classified: a `413` is fixed by shrinking, a `429` by waiting | `elixir-vibe/llm_proxy` and its tests | yes |
| limits are per **project**, not per key (Google) and per **organisation** (Groq) | the providers' own pages | yes |
| a scoring threshold must be visible to the player | a shipped game's mechanic, where it is deliberately hidden | yes — see the arc below |

## What the model is for in DVOR-8, and what it is not

**For:** naming. The device finds shapes in the photograph and cannot say what they are; a model that can
see is shown the photograph and the boxes and names up to eight of them.

**Not for:** deciding what happens. Hits, breaks and score are pure functions in `src/world.js`. A game
whose rules wait on a network call breaks offline; without a key, or with every lane failing, things keep
their numbers and the yard plays exactly the same.

**Not for:** recognising people. The prompt forbids it and the answer can only attach a short name to a
box the device already drew.

## The request shape

One call per photograph, not one per thing and not one per attempt — «ЕЩЁ РАЗ» reuses the names:

```
system:  Before you is a photograph of a yard and a list of rectangles on it: id and position in percent.
         For at most 8 rectangles say what is in it, one or two words.
         Answer only JSON: {"items":[{"id":<an id from the list>,"label":"<name>"}]}.
         Use only ids from the list. If you cannot tell, leave it out. Do not name or describe people.
user:    <the boxes of the shapes the device found> + <the photograph, 288 × 384 JPEG>
```

The answer is addressed by `id`, so it can be checked: an unknown id is dropped, as is a second name for
the same id, a name over 28 characters, and anything past the eighth. Costed at **1,282 tokens** for ten
boxes, of which 300 for the image is a floor, not a published figure.

**Only lanes whose default model reads images are asked** — set to Gemini and Mistral in
`src/recognise.js`. That those two do, with those model names, is from memory and **not verified**: no
provider has been called from this project. A lane that cannot see is never sent the photograph, and a
test asserts it.

**The photograph leaves the device when this runs, and only then.** Without a key nothing is sent.

## The routing sequence — `src/recognise.js`

| Step | Rule | Where it came from |
|---|---|---|
| size | cost the request in tokens before sending; skip a lane that cannot afford it in a third of its minute | per-minute ≠ per-request ceiling |
| cascade | lanes in the carried-over order, first ready lane serves | `createRouter` |
| `413` | halve the list of boxes, largest kept first, ask the same lane again | split, do not retry |
| `429` | cooldown for the provider's `Retry-After` (30 s when absent), try the next lane; the cooled lane is not asked until it clears, across scans | wait, do not rotate back |
| `401` / `403` | no cooldown, next lane; retired after two | a rejected key is not a rate limit |
| deadline | 12 s for the whole scan, then the scan is `local` | a game does not wait a minute for a label |

## What is carried over, and what is not

`src/llm.js` is the previous project's `llm.js`, copied, with one marked change: `createRouter` accepts a
`costOf`, because a scan request is far smaller than the analysis that router was sized for and the
default cost declares Groq unable to carry anything. The provider table, the per-minute spend tracking,
`Retry-After` parsing, cooldown rules and key cleaning are unchanged.

**Not carried over:** chunking with a sliding window (the scan's split is a plain halving), model
discovery through `/models` (the configured default name is used, with the built-in 404 walk), and the
previous project's own tests, which are not in its repository as a runnable file. The twelve routing
checks in `test.mjs` are written for this request and stub the network with the refusals the providers send.

**Not verified:** no provider has been called from this project. Every routing check runs against a
stubbed `fetch`. The first live scan with a real key is the first real evidence.
