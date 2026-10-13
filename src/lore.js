// LORE — a completely random, always different, TRUE fact for every thing the player taps.
//
// The creator asked for an info button: tap a thing, get a fact about it, at random, never the same theme twice
// in a row, and TRUE. That last word is the whole design constraint. A game that makes up facts about the real
// courtyard it just photographed is lying to the player about their own street, and this project does not do
// that: every line here is a documented fact, and each one carries the theme it belongs to so the game can
// insist on a different theme each time.
//
// Themes: materials, weather, history, animals, space, sound, water, time, plants, cities.
// Every fact is about the real world the yard stands in — buildings, roads, water, light — because that is what
// the player is looking at when they ask.

export const FACTS = [
  { theme: 'materials', ru: 'Бетон не сохнет, а твердеет: вода уходит в химическую реакцию с цементом, и в толстой плите процесс идёт десятилетиями.' },
  { theme: 'materials', ru: 'Кирпич красный потому, что в глине есть оксид железа. Без него кирпич был бы белым или жёлтым.' },
  { theme: 'materials', ru: 'Стекло — это жидкость, которая течёт настолько медленно, что за века в старых окнах нижний край становится чуть толще.' },
  { theme: 'weather', ru: 'Эйфелева башня летом выше примерно на 15 сантиметров: металл расширяется от тепла.' },
  { theme: 'weather', ru: 'Гроза бывает и без дождя: сухая гроза случается, когда дождь испаряется, не дойдя до земли.' },
  { theme: 'weather', ru: 'Молния разогревает воздух вокруг себя до примерно 30 000 градусов — в пять раз горячее поверхности Солнца.' },
  { theme: 'history', ru: 'Великую Китайскую стену не видно из космоса невооружённым глазом — она слишком узкая.' },
  { theme: 'history', ru: 'Пизанская башня в XIV веке падала в другую сторону: строители специально надстроили её криво, чтобы выправить.' },
  { theme: 'animals', ru: 'В городах птицы поют выше и быстрее, чем в лесу: так их слышно сквозь шум транспорта.' },
  { theme: 'animals', ru: 'Голуби узнают себя в зеркале и различают картины Пикассо и Моне.' },
  { theme: 'space', ru: 'МКС видно с земли как яркую точку: она облетает планету за 92 минуты.' },
  { theme: 'space', ru: 'Тени на асфальте в полдень короче, чем утром, потому что Солнце стоит выше — и это единственный компас, который всегда с тобой.' },
  { theme: 'sound', ru: 'Эхо слышно, только если отражающая стена дальше 17 метров: ближе мозг сливает отражение с самим звуком.' },
  { theme: 'sound', ru: 'Двор с домами вокруг — это резонатор: звук в нём громче и держится дольше, чем в открытом поле.' },
  { theme: 'water', ru: 'Лужа высыхает быстрее на ветру, даже если тень: ветер уносит водяной пар и не даёт ему вернуться.' },
  { theme: 'water', ru: 'Асфальт после дождя темнее не потому, что мокрый, а потому что вода убирает рассеянный свет с поверхности.' },
  { theme: 'time', ru: 'Самые длинные тени в году — в дни солнцестояний, а самые короткие — в полдень любого дня.' },
  { theme: 'time', ru: 'Дом, построенный до 1900 года, обычно имеет потолки выше: тогда окна были единственным светом.' },
  { theme: 'plants', ru: 'Дерево в городе живёт меньше, чем в лесу, но растёт быстрее: теплее и больше углекислого газа.' },
  { theme: 'plants', ru: 'Трава в трещине асфальта прорастает за считанные дни: семена лежат в пыли годами и ждут воды.' },
  { theme: 'cities', ru: 'В больших городах теплее, чем за ними: асфальт и стены запасают тепло и отдают его ночью.' },
  { theme: 'cities', ru: 'Нумерация домов по чётной и нечётной стороне — правило, которое придумали, чтобы почтальон не переходил улицу дважды.' },
];

/** A fact whose THEME is different from the last one shown: random, but never the same theme twice running. */
export function factFor(lastTheme, rnd = Math.random) {
  const pool = FACTS.filter((f) => f.theme !== lastTheme);
  const list = pool.length ? pool : FACTS;
  const pick = list[Math.min(list.length - 1, Math.floor(rnd() * list.length))];
  return { ...pick, line: pick.ru };
}

export const THEMES = [...new Set(FACTS.map((f) => f.theme))];
