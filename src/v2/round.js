export const START_THROWS = 25;
const COMBO_WINDOW = 120;
const MAX_MULT = 8;

export function createRound(throws = START_THROWS) {
  return { throws, score: 0, seen: 0, chain: 0, mult: 1, lastHit: -Infinity, best: 0, over: false, loot: 0 };
}

export function spendThrow(round) {
  if (round.over || round.throws <= 0) return false;
  round.throws -= 1;
  return true;
}

export function registerStrike(round, frame, hitTarget) {
  if (!hitTarget) { round.chain = 0; round.mult = 1; return; }
  round.chain = frame - round.lastHit <= COMBO_WINDOW ? round.chain + 1 : 1;
  round.lastHit = frame;
  round.mult = Math.min(MAX_MULT, round.chain);
  round.best = Math.max(round.best, round.mult);
}

export function tick(round, frame, worldScore) {
  const gained = worldScore - round.seen;
  round.seen = worldScore;
  if (gained > 0) round.score += gained * round.mult;
  if (round.chain && frame - round.lastHit > COMBO_WINDOW) { round.chain = 0; round.mult = 1; }
}

export function addLoot(round, got) {
  round.score += got.value * round.mult;
  round.throws += got.throws;
  round.loot += got.n;
}

export function checkOver(round, busy) {
  if (!round.over && round.throws <= 0 && !busy) round.over = true;
  return round.over;
}
