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

## What the LLM is for in DVOR-8, and what it is not

**For:** naming what the scan sees. The scan produces a list of what is in the frame — a bin, a bench, a
pram — and a model is asked to name the things a local recogniser would miss: an unfamiliar object, a
sign's text, a shape that could be two things. That is a short, bounded request with a small answer.

**Not for:** deciding what happens. Damage, destruction and state are pure functions in `src/state.js`
with no model involved, because a game whose physics depends on a network call is a game that breaks
offline. The scan falls back to the local recogniser and the game stays playable.

**Not for:** recognising people. DVOR-8 has residents. A system that identifies people from a camera is a
different and worse product, and the `scan.js` interface only ever returns object kinds.

## The request shape

One call per scan, not one per object:

```
system:  You look at an ordinary yard from a balcony. You are given a list of objects: id, kind, position.
         Choose at most 8 and name each the way a resident would, two or three words.
         Answer only JSON: {"items":[{"id":"<an id from the list>","label":"<name>"}]}.
         Use only ids from the list. Do not name or describe people.
user:    <the local pass's list: id, kind, x, y>
```

The answer is addressed by `id` rather than by position, so it can be checked: an id that is not in the
list is dropped, as is a second label for the same id, a label over 28 characters, and anything past the
eighth item. Measured for the 32-object yard: **1,527 tokens** per scan (input at 2 characters per token,
plus 400 for the answer and a 200 margin). That is inside a third of every lane's minute, Groq's 8,000
included, and a test asserts it.

## The routing sequence — `src/recognise.js`

| Step | Rule | Where it came from |
|---|---|---|
| size | cost the request in tokens before sending; skip a lane that cannot afford it in a third of its minute | per-minute ≠ per-request ceiling |
| cascade | lanes in the carried-over order, first ready lane serves | `createRouter` |
| `413` | halve the object list, gameplay layer kept first, ask the same lane again | split, do not retry |
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
previous project's own tests, which are not in its repository as a runnable file. The eleven routing
checks in `test.mjs` are written for this request and stub the network with the refusals the providers send.

**Not verified:** no provider has been called from this project. Every routing check runs against a
stubbed `fetch`. The first live scan with a real key is the first real evidence.
