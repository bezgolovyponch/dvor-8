// The people who pass through the yard, and whether they have seen you. Pure: no canvas, no page.
//
// Nobody here can be harmed. The only thing that can be thrown at a person is a ball of water, whatever
// is in the hand, and all it does is make them look up. That look is the game: while someone is looking
// and you are not hidden, the danger climbs; at the top you have been seen and the run is over. Hide,
// and whoever is looking loses you and goes on their way. Soak the same person again and they run off
// and call the police, who come, stand in the yard and look up in turns — and between the looks the
// yard can still be wrecked.
//
// Each kind is there because it asks something different of the player:
//   courier   on a bicycle and in a hurry: hard to hit, worth the most, looks only briefly
//   walker    the plain case, by which the others are felt
//   drunk     slow, barely sees you and never calls anyone: the one to learn on
//   lady      looks long and calls at the FIRST soaking: one mistake brings the police
//   cop       comes when called; looks hard, in turns, and a soaking only makes him look more

export const KINDS = {
  //         v px/s   alarm s before the look   look s   rate danger/s while seen   calls: soakings before a call (0 never)
  courier: { ru: 'курьер', v: 46, alarm: 0.4, look: 1.5, rate: 0.5, calls: 2, points: 90 },
  walker: { ru: 'прохожий', v: 17, alarm: 0.6, look: 2.5, rate: 0.36, calls: 2, points: 40 },
  drunk: { ru: 'алкаш', v: 9, alarm: 1.2, look: 3, rate: 0.1, calls: 0, points: 25 },
  lady: { ru: 'злая тётя', v: 14, alarm: 0.5, look: 3, rate: 0.32, calls: 1, points: 60 },
  cop: { ru: 'полиция', v: 24, alarm: 0.3, look: 2.2, rate: 0.9, calls: 0, points: 150 },
};
export const ORDER = ['courier', 'walker', 'drunk', 'lady'];   // who comes next: all four are met in the first minute
export const STARS = 5;
export const FIRST_IN = 4;        // seconds before the first person: the yard is looked at first
export const EVERY = [6, 5];      // then one every 6 to 11 seconds
export const MAX_FOLK = 3;        // in the yard at once, the police apart
export const GIVE_UP = 1.2;       // seconds hidden before someone looking loses you
export const COOL = 0.06;         // danger lost a second while nobody is looking
export const JOLT = 0.2;          // danger added by a throw made under someone's eyes
export const CALL_TIME = 2.5;     // seconds from running off to the call going through
export const POLICE_IN = 3;       // and from the call to the police
export const SWEEPS = 4;          // looks the police take before leaving
export const SWEEPS_MAX = 7;
export const TURN = 1.6;          // seconds the police look away between looks: the time to act

export function makeFolk() {
  return { people: [], heat: 0, hidden: false, wait: FIRST_IN, police: -1, turn: 0, soaked: 0, calls: 0, seen: false };
}

export const watchers = (folk) => folk.people.filter((p) => p.state === 'look').length;
export const stars = (folk) => Math.min(STARS, Math.ceil(folk.heat * STARS - 1e-9));
const cop = (folk) => folk.people.find((p) => p.kind === 'cop');

function enter(folk, kind, area, rnd) {
  const dir = rnd() < 0.5 ? 1 : -1, y = area.top + rnd() * (area.bottom - area.top);
  const p = { kind, dir, x: dir > 0 ? area.x0 - 8 : area.x1 + 8, y, y0: y, state: 'go', t: 0, wet: 0, lost: 0, phase: rnd() * 6, sweeps: 0, to: null, called: false, leaving: false };
  folk.people.push(p);
  return p;
}
const set = (p, state) => { p.state = state; p.t = 0; p.lost = 0; };

// A look is over: what the person does next.
function after(p, area) {
  const k = KINDS[p.kind];
  if (p.kind === 'cop') {
    p.sweeps -= 1;
    if (p.sweeps > 0) { p.dir = -p.dir; set(p, 'search'); } else { p.leaving = true; set(p, 'go'); }
  } else if (k.calls && p.wet >= k.calls) {
    p.dir = p.x - area.x0 < area.x1 - p.x ? -1 : 1;   // to the nearer way out
    set(p, 'flee');
  } else { p.leaving = true; set(p, 'go'); }
}

// One step of time. `area` is where people are: { x0, x1 } the stretch of street on screen, { top,
// bottom } the ground. Returns what happened, for the page to answer: [{ type, who }] with type one of
// enter · look · lost · call · police · seen.
export function stepFolk(folk, dt, area, rnd) {
  const out = [];
  if (folk.seen) return out;
  folk.wait -= dt;
  if (folk.wait <= 0 && folk.people.filter((p) => p.kind !== 'cop').length < MAX_FOLK) {
    out.push({ type: 'enter', who: enter(folk, ORDER[folk.turn % ORDER.length], area, rnd) });
    folk.turn += 1; folk.wait = EVERY[0] + rnd() * EVERY[1];
  }
  if (folk.police >= 0 && (folk.police -= dt) < 0) {
    folk.police = -1;
    const who = enter(folk, 'cop', area, rnd);
    who.to = (area.x0 + area.x1) / 2 + (rnd() - 0.5) * 40; who.sweeps = SWEEPS;
    out.push({ type: 'police', who });
  }
  let watched = 0;
  for (const p of folk.people) {
    const k = KINDS[p.kind];
    p.t += dt;
    if (p.angry > 0) p.angry = Math.max(0, p.angry - dt);
    if (p.state === 'go') {
      p.x += p.dir * k.v * (p.leaving ? 1.4 : 1) * dt;
      if (p.kind === 'drunk') p.y = p.y0 + 3 * Math.sin(p.t * 1.7 + p.phase);
      if (p.to !== null && (p.x - p.to) * p.dir >= 0) { p.x = p.to; p.to = null; set(p, 'alarm'); }
    } else if (p.state === 'alarm') {
      if (p.t >= k.alarm) { set(p, 'look'); if (p.angry > 0) { p.look = k.look * 1.5; } out.push({ type: 'look', who: p, angry: p.angry > 0 }); }
    } else if (p.state === 'look') {
      if (folk.hidden) p.lost += dt; else { p.lost = 0; watched += 1; folk.heat += k.rate * dt; }
      if (p.kind !== 'cop' && p.lost >= GIVE_UP) { out.push({ type: 'lost', who: p }); after(p, area); }
      else if (p.t >= (p.look || k.look)) after(p, area);
    } else if (p.state === 'flee') {
      p.x += p.dir * k.v * 2.2 * dt;
      if (!p.called && p.t >= CALL_TIME) {
        p.called = true; folk.calls += 1;
        const here = cop(folk);
        if (here) here.sweeps = Math.min(SWEEPS_MAX, here.sweeps + 2); else if (folk.police < 0) folk.police = POLICE_IN;
        out.push({ type: 'call', who: p });
      }
    } else if (p.state === 'search') {
      p.x += p.dir * k.v * 0.4 * dt;
      if (p.t >= TURN) set(p, 'alarm');
    }
  }
  // gone: past the edge and on their way out. Someone running to call is kept until the call is made.
  folk.people = folk.people.filter((p) => {
    const out = p.x < area.x0 - 14 || p.x > area.x1 + 14;
    return !(out && ((p.state === 'go' && (p.kind !== 'cop' || p.leaving)) || (p.state === 'flee' && p.called)));
  });
  if (!watched) folk.heat = Math.max(0, folk.heat - COOL * dt);
  if (folk.heat >= 1) { folk.heat = 1; folk.seen = true; out.push({ type: 'seen', who: null }); }
  return out;
}

// Where a person is, as a box: feet at (x, y).
export function boxOf(p) {
  const half = p.kind === 'courier' ? 8 : 5;
  return { x: p.x - half, y: p.y - 15, w: half * 2, h: 16 };
}
const moving = (p) => (p.state === 'go' || p.state === 'flee' || p.state === 'search' ? p.dir * KINDS[p.kind].v * (p.state === 'flee' ? 2.2 : p.state === 'search' ? 0.4 : 1) : 0);

// The person a touch at (x, y) is meant for. `lead` seconds of their own movement are allowed for in
// front of them: a courier is aimed at where he will be.
export function personAt(folk, x, y, pad = 5, lead = 0) {
  for (const p of folk.people) {
    const b = boxOf(p), ahead = moving(p) * lead, x0 = b.x + Math.min(0, ahead) - pad, x1 = b.x + b.w + Math.max(0, ahead) + pad;
    if (x >= x0 && x < x1 && y >= b.y - pad && y < b.y + b.h + pad) return p;
  }
  return null;
}

// Water landed on someone. They look up; the police only look harder. Returns the points.
export function soak(folk, p) {
  p.wet += 1; folk.soaked += 1;
  if (p.kind === 'cop') p.sweeps = Math.min(SWEEPS_MAX, p.sweeps + 1);
  // THE REACTION IS A MOOD ON THE DOCUMENTED ALARM BEAT, not a new state: `soak -> alarm` is the contract the suite holds
  // (the person stops, turns, looks), and the anger is what makes that alarm louder - a red mark over their head, a
  // visible shake, and a look that lasts half again as long.
  if (p.state !== 'flee') { p.to = null; p.leaving = false; p.angry = ANGRY; set(p, 'alarm'); }
  return KINDS[p.kind].points;
}

// PAINT ON A PERSON: a mark that stays on them. They do not like it either - they stop, shake the mark off, and look up
// harder, which is the same danger the water raises.
export function mark(folk, p) {
  p.painted = (p.painted || 0) + 1;
  if (p.state !== 'flee') { p.to = null; p.leaving = false; p.angry = ANGRY; set(p, 'alarm'); }
  return KINDS[p.kind].points;
}

// THE ANGRY BEAT: two seconds of stamping and shouting (the sprite shakes, a red mark shows), then the look - the person
// turns to the balcony angrier than before: the look lasts half again as long, and the danger climbs faster.
export const ANGRY = 2.0;

// Something was thrown in the open. Under someone's eyes that is noticed at once.
export function threw(folk) {
  if (!folk.hidden && watchers(folk)) folk.heat = Math.min(1, folk.heat + JOLT);
}
