// What the world did today, as lines short enough to fly over a yard. Pure: no network, no storage.
//
// The headlines are not the game's. They are the «In the news» box of Wikipedia's front page: a handful
// of events a day, chosen by its editors, served to any page that asks, with no key and no account
// (docs/style.md, F21). main.js asks once a day and keeps the answer. When there is no network nothing is
// invented in its place: the sky carries the yard's own news, which the game does know.

import { plain } from './font.js';

export const LINE_MAX = 150;   // letters in one line: under half a minute over the yard, and few headlines are cut
export const LINES_MAX = 8;
export const SOURCE = 'Википедия, «Текущие события»';
export const feedUrl = (day, lang = 'ru') => `https://${lang}.wikipedia.org/api/rest_v1/feed/featured/${day.replace(/-/g, '/')}`;

const ENTITY = { amp: '&', quot: '"', nbsp: ' ', lt: '<', gt: '>', laquo: '«', raquo: '»', mdash: '—', ndash: '–', '#160': ' ', '#39': "'" };

// One story, as the feed gives it (HTML), to one line of capitals.
export function headline(story) {
  const text = String(story)
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&([a-z]+|#\d+);/g, (all, name) => ENTITY[name] ?? ' ')
    .replace(/\s*\((?:на илл[^)]*|на фото[^)]*|pictured[^)]*)\)/gi, '')   // «(pictured)» points at a picture that is not here
    .replace(/\s+/g, ' ').trim().replace(/\.$/, '');
  const line = plain(text);
  if (line.length <= LINE_MAX) return line;
  const cut = line.slice(0, LINE_MAX - 3), space = cut.lastIndexOf(' ');
  return `${cut.slice(0, space > LINE_MAX / 2 ? space : cut.length).replace(/[ ,;:-]+$/, '')}...`;
}

// The feed, as lines. Anything that is not a feed gives no lines, and the caller falls back.
export function headlines(feed) {
  const news = Array.isArray(feed?.news) ? feed.news : [];
  return news.map((n) => headline(n?.story ?? '')).filter((line) => line.length > 8).slice(0, LINES_MAX);
}

// The yard's own news, for when the world's is not to be had. Every line is a fact the game holds.
export function yardNews({ day, days, have, of, best, far }) {
  return [
    `ДВОР-8 · ${day.slice(8)}.${day.slice(5, 7)} · ДЕНЬ ${Math.max(1, days)} ВО ДВОРЕ`,
    `В АЛЬБОМЕ ${have} ИЗ ${of} · ОСТАЛЬНОЕ СТОИТ В ДРУГИХ ДВОРАХ`,
    best ? `РЕКОРД ДВОРА ${best} ОЧКОВ${far ? ` · ДАЛЬШЕ ВСЕГО УШЛИ НА ${far} М` : ''}` : 'РЕКОРДА ЕЩЁ НЕТ · ДВОР СТОИТ ЦЕЛЫЙ',
    'НОВОСТЕЙ МИРА СЕЙЧАС НЕТ: НЕТ СЕТИ',
  ].map(plain);
}
