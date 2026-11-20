// The street's memory of Dash: respect ranks, the five districts and how
// much each one rates her, the radio dial, and the people who talk during
// missions. Pure state and small helpers — the HUD draws all of it, the
// missions and activities feed it.
import { CITY, DISTRICTS, RADIO, RANKS, STANDING } from './config.js';

/** Fresh meta state for a new game. */
export function createMeta() {
  const districts = {};
  for (const d of DISTRICTS) districts[d.id] = { standing: STANDING.start };
  return {
    respect: 0, // XP
    districts,
    radio: { station: 0, track: 0, trackT: 0 },
    dialogue: null, // { who, text, t } while a line is on screen
  };
}

/** The rank Dash holds at the current XP, and progress to the next one. */
export function rankFor(xp) {
  let current = RANKS[0];
  let next = null;
  for (let i = 0; i < RANKS.length; i += 1) {
    if (xp >= RANKS[i].xp) {
      current = RANKS[i];
      next = RANKS[i + 1] || null;
    }
  }
  const span = next ? next.xp - current.xp : 1;
  const into = next ? xp - current.xp : span;
  return { current, next, progress: next ? Math.min(1, into / span) : 1 };
}

/** Award respect XP; returns the new rank name when Dash ranks up. */
export function addRespect(game, xp) {
  const before = rankFor(game.meta.respect).current.name;
  game.meta.respect += xp;
  const after = rankFor(game.meta.respect).current.name;
  if (after !== before) {
    game.banner = { text: `Respect: ${after}`, sub: 'The street knows your name now, Dash.', t: 4 };
    game.chime = true;
    return after;
  }
  return null;
}

/** Which district a world point sits in. The beach strip is its own. */
export function districtAt(city, x, y) {
  if (y >= CITY.oceanY) return DISTRICTS[4]; // The Strand
  const east = x >= 1600;
  const south = y >= 1200;
  if (east && south) return DISTRICTS[3]; // Harborfront
  if (east) return DISTRICTS[1]; // Marina Flats
  if (south) return DISTRICTS[2]; // Old Cannery
  return DISTRICTS[0]; // Northgate
}

/** Raise a district's standing (capped at 100). */
export function addStanding(game, districtId, points) {
  const d = game.meta.districts[districtId];
  if (d) d.standing = Math.max(0, Math.min(100, d.standing + points));
}

/** The district the player is in right now, with its standing. */
export function currentDistrict(game) {
  const px = game.player.car ? game.player.car.x : game.player.x;
  const py = game.player.car ? game.player.car.y : game.player.y;
  const d = districtAt(game.city, px, py);
  return { ...d, standing: game.meta.districts[d.id].standing };
}

/** Advance the radio clock; returns the station + track on air. */
export function updateRadio(game, dt) {
  const radio = game.meta.radio;
  radio.trackT += dt;
  const station = RADIO.stations[radio.station];
  if (radio.trackT >= RADIO.trackSeconds) {
    radio.trackT = 0;
    radio.track = (radio.track + 1) % station.tracks.length;
  }
  return { station, trackName: station.tracks[radio.track] };
}

/** Turn the dial to the next station. */
export function nextStation(game) {
  const radio = game.meta.radio;
  radio.station = (radio.station + 1) % RADIO.stations.length;
  radio.track = 0;
  radio.trackT = 0;
  return RADIO.stations[radio.station];
}

// The people who talk. Portraits are drawn in hud.js from these looks:
// skin, hair colour and style, and a signature accessory per person.
export const CHARACTERS = {
  dash: { name: 'Dana "Dash" Cole', role: 'Courier, Vega Transport', skin: '#e8b88a', hair: '#3a2a1c', hairStyle: 'cap', accent: '#e84a5f' },
  vega: { name: 'Harlan Vega', role: 'Owner, Vega Transport', skin: '#c98a5e', hair: '#d8d8d8', hairStyle: 'slick', accent: '#1d2733' },
  mira: { name: 'Mira Solano', role: 'Fixer, The Marlin Club', skin: '#f0c8a0', hair: '#7a2a4a', hairStyle: 'bob', accent: '#3f7fb8' },
  dispatch: { name: 'Solmar PD Dispatch', role: 'Radio', skin: '#8a5a3a', hair: '#22262e', hairStyle: 'headset', accent: '#2b3a4d' },
  club: { name: 'The Marlin Club', role: 'The house', skin: '#e8b88a', hair: '#5a3a1c', hairStyle: 'flat', accent: '#8a5f9e' },
};

/** Put a line of dialogue on screen for a few seconds. */
export function say(game, who, text, seconds = 4) {
  game.meta.dialogue = { who, text, t: seconds };
}

/** Who briefs each mission, and their opening line. */
export function missionSpeaker(missionId) {
  if (missionId === 1 || missionId === 5) return 'vega';
  if (missionId === 8 || missionId === 10 || missionId === 12) return 'mira';
  return 'club';
}

/** Short lines when a step advances or the heat changes. */
export const STEP_LINES = {
  goto: ['On your way, Dash.', 'Keep it clean.', 'The city is watching.'],
  steal: ['Nice wheels. Bring them home.'],
  wanted: ['Make some noise — then vanish.'],
  loseWanted: ['Shake them off.'],
  wait: ['Easy… stay put.', 'Eyes open, Dash.'],
  hold: ['Hold it — almost there!', 'Stay on it!'],
  chase: ['Stay on his tail.', 'Not too close.'],
};

export function stepLine(stepType, seedPick) {
  const lines = STEP_LINES[stepType] || STEP_LINES.goto;
  return lines[Math.abs(seedPick) % lines.length];
}
