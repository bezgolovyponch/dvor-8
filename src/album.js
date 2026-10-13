// What a player keeps between visits, and what they can show someone. Pure: no storage, no clock, no page.
//
// A yard is cleared in a minute and a best score is not a reason to come back. Three things are kept here
// instead, and none of them can be lost:
//   the ALBUM   every kind of thing ever wrecked. The empty places say what is still out there to find —
//               which sends the player out to photograph somewhere else.
//   the DAYS    how many different days the player has been here. It only ever goes up: a streak that
//               resets would be a punishment for staying away, and the brief rules that out.
//   the RECORDS best score, furthest walked.
// And one thing changes on its own: the made street beyond the yard is built from the date, so it is a
// different street tomorrow.

import { TARGETS } from './objects.js';

export const KINDS = Object.keys(TARGETS);
export const SIGN = {
  car: '🚗', truck: '🚚', bus: '🚌', motorcycle: '🏍', bicycle: '🚲', bench: '🪑', 'potted plant': '🪴', 'fire hydrant': '🧯',
  'stop sign': '🛑', 'parking meter': '🅿', 'traffic light': '🚦', chair: '💺', umbrella: '☂', boat: '⛵', train: '🚆',
  'dining table': '🍽', suitcase: '🧳', backpack: '🎒', 'sports ball': '⚽', skateboard: '🛹', kite: '🪁', bottle: '🍾',
  vase: '🏺', tv: '📺', couch: '🛋', window: '🪟',
};
export const SHARE_MAX = 14;   // things shown in a shared line: the most one yard can hold

export function makeAlbum(saved = null) {
  const a = saved && typeof saved === 'object' ? saved : {};
  const kinds = {};
  for (const k of KINDS) if (a.kinds?.[k] > 0) kinds[k] = Math.floor(a.kinds[k]);
  return {
    kinds, days: Array.isArray(a.days) ? [...new Set(a.days.filter((d) => /^\d{4}-\d\d-\d\d$/.test(d)))] : [],
    best: Number(a.best) || 0, far: Number(a.far) || 0, runs: Number(a.runs) || 0,
  };
}

export const dayKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const dayLabel = (key) => `${key.slice(8)}.${key.slice(5, 7)}`;
// The number today's street is made from: the same all day, another tomorrow.
export function daySeed(key) {
  let h = 2166136261;
  for (const ch of key) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

// The player opened the game today. True the first time on a new day.
export function visit(album, day) {
  if (album.days.includes(day)) return false;
  album.days.push(day);
  return true;
}

// A run is over. `wrecked` is the kind of every thing wrecked in it. Returns what is new, to be shown:
// nothing is ever taken away, so there is no bad news to return.
export function record(album, { wrecked, score, metres }) {
  const fresh = [];
  for (const k of wrecked) {
    if (!SIGN[k]) continue;
    if (!album.kinds[k]) fresh.push(k);
    album.kinds[k] = (album.kinds[k] || 0) + 1;
  }
  const news = { kinds: [...new Set(fresh)], best: score > album.best, far: metres > album.far };
  album.best = Math.max(album.best, score);
  album.far = Math.max(album.far, metres);
  album.runs += 1;
  return news;
}

export const progress = (album) => ({ have: Object.keys(album.kinds).length, of: KINDS.length });

// The line a player sends to someone. It shows what the yard held and what became of it, a thing at a
// time, and gives away nothing else: no picture, no place. `things` is the first yard's, in order:
// [{ kind, gone }].
export function shareText({ things, score, combo, metres, day, url }) {
  const row = things.slice(0, SHARE_MAX).map((t) => (t.gone ? SIGN[t.kind] || '▪' : '⬜')).join('');
  const down = things.filter((t) => t.gone).length;
  // THE TAG IS THE POINT OF SENDING IT. A card that arrives in a family chat says where you were and what you
  // did to it; the tag goes on the picture AND in the text, because a caption is what gets read in the preview.
  return [`Я ЗДЕСЬ · I AM HERE`,
    `ДВОР-8 · ${dayLabel(day)} · ${down}/${things.length}`, row,
    `${score} очков · комбо x${combo}${metres ? ` · ${metres} м по улице` : ''}`,
    `#ЯЗДЕСЬ #IAMHERE`, url].filter(Boolean).join('\n');
}
