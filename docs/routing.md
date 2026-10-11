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
system:  You name the objects visible in a low-resolution frame of a courtyard, seen from above.
         Answer with a JSON array of at most 8 items. Each item is {"kind": "<one of the known kinds>",
         "label": "<what a person would call it>", "x": <0-100>, "y": <0-100>}.
         If you cannot tell what something is, leave it out. Do not guess a person's identity.
user:    <the local recogniser's list, plus the frame's dominant colours>
```

Bounded by construction: at most eight items, each with a short label, so the answer fits any free tier's
per-minute allowance and the request is small enough to be one call. The numbers come from the previous
project's `logBudget`, which subtracts the instructions, the answer and a margin from the lane's allowance.

## What is NOT carried over

The previous project's five-provider cascade, its per-minute spend tracking and its chunking are **not
included in this MVP**. `src/scan.js` has the seam where the routed recogniser plugs in — `makeScan` takes
an async `recognise` function and records `source` as `'routed'` or `'local'` — and that is deliberate: the
seam exists, the implementation does not, because shipping a routing layer before the game has a
recogniser to route would be building the second floor first.

**If you port it:** take `llm.js` and the fourteen mirror tests from
`github.com/bezgolovyponch/partner-sim`, which are the checked version. Do not rewrite them from this file.
