// Side activities, free-roam and always on: taxi fares for a driver in a
// Solmar Taxi, ten hidden packages stashed around the city, and street
// races from the white ring on the north road. All pay cash, all show on
// the HUD and the minimap, and all run on the game's seeded RNG — no wall
// clock, no Math.random.
import { PACKAGES, RACE, TAXI } from './config.js';
import { hitsBuilding, randomRoadPoint } from './world.js';

// Taxi stands: named places a fare can start or end at.
const TAXI_STANDS = ['depot', 'garage', 'club', 'dock', 'hospital', 'bank', 'dropA', 'dropB', 'vault'];

/** Ten hidden packages on the sidewalk bands, placed once from the seed. */
export function spawnPackages(city, rng) {
  const packages = [];
  for (let i = 0; i < PACKAGES.count; i += 1) {
    let x = 0;
    let y = 0;
    let ok = false;
    for (let tries = 0; tries < 12 && !ok; tries += 1) {
      const p = randomRoadPoint(city, rng);
      const off = 62 + rng() * 10; // on the sidewalk, never on a road
      const side = rng() < 0.5 ? -off : off;
      const vertical = rng() < 0.5;
      x = vertical ? p.x + side : p.x;
      y = vertical ? p.y : p.y + side;
      ok = !hitsBuilding(city, x, y, 24);
    }
    packages.push({ id: i, x, y, collected: false });
  }
  return packages;
}

export function initActivities(game) {
  game.taxi = {
    state: 'idle', // 'idle' | 'pickup' | 'dropoff'
    pickup: null,
    dropoff: null,
    fare: 0,
    cooldown: 0,
  };
  game.packagesCollected = 0;
  // Street race: 'idle' | 'active'. next counts checkpoints reached (0-3);
  // after the third the start ring is the finish line.
  game.race = { state: 'idle', next: 0, timer: 0, cooldown: 0 };
}

function pickStand(game, excludeKey) {
  const keys = TAXI_STANDS.filter((k) => k !== excludeKey);
  const key = keys[Math.floor(game.rng() * keys.length)];
  const place = game.city.places[key];
  return { key, x: place.x, y: place.y, label: place.label };
}

export function updateActivities(game, dt) {
  const player = game.player;
  const inTaxi = !!player.car && player.car.model.name === 'Solmar Taxi';
  const px = player.car ? player.car.x : player.x;
  const py = player.car ? player.car.y : player.y;

  // A fare only lives while Dash is driving a taxi.
  if (!inTaxi && game.taxi.state !== 'idle') {
    game.taxi.state = 'idle';
    game.taxi.pickup = null;
    game.taxi.dropoff = null;
    game.taxi.fare = 0;
    game.message = 'Fare lost — you left the taxi.';
    game.messageT = 2;
  }

  // A new fare appears a few seconds after the last one ends.
  if (inTaxi && game.taxi.state === 'idle') {
    game.taxi.cooldown -= dt;
    if (game.taxi.cooldown <= 0) {
      game.taxi.pickup = pickStand(game, null);
      game.taxi.state = 'pickup';
      game.message = `Taxi fare waiting at ${game.taxi.pickup.label} — drive there, press T`;
      game.messageT = 3;
    }
  }

  // Dropping the passenger off pays the fare.
  if (inTaxi && game.taxi.state === 'dropoff' && game.taxi.dropoff) {
    const d = Math.hypot(px - game.taxi.dropoff.x, py - game.taxi.dropoff.y);
    if (d < TAXI.dropoffRadius) {
      const fare = game.taxi.fare;
      player.cash += fare;
      game.stats.faresDone = (game.stats.faresDone || 0) + 1;
      game.taxi.state = 'idle';
      game.taxi.pickup = null;
      game.taxi.dropoff = null;
      game.taxi.fare = 0;
      game.taxi.cooldown = 5;
      game.chime = true;
      game.message = `Fare complete! +$${fare}`;
      game.messageT = 3;
      game.saveBest();
    }
  }

  // Hidden packages: walk or drive over one to pocket $100.
  for (const pkg of game.packages) {
    if (pkg.collected) continue;
    if (Math.hypot(pkg.x - px, pkg.y - py) < PACKAGES.collectRadius) {
      pkg.collected = true;
      game.packagesCollected += 1;
      player.cash += PACKAGES.value;
      game.chime = true;
      game.message = `Hidden package found! +$${PACKAGES.value} (${game.packagesCollected}/${PACKAGES.count})`;
      game.messageT = 3;
      game.saveBest();
    }
  }

  updateRace(game, dt, px, py);
}

/**
 * Street races. Driving through the white start ring in free roam (no
 * mission running) starts the clock: three checkpoints around the city,
 * $150 each, then back to the start for a $1,000 win. The timer is the
 * only judge — miss it and the race is over.
 */
function updateRace(game, dt, px, py) {
  const race = game.race;
  if (!race) return;
  const inCar = !!game.player.car;
  const missionRunning = !!(game.mission && !game.mission.done);

  if (race.state === 'idle') {
    if (race.cooldown > 0) race.cooldown -= dt;
    // A race never starts mid-mission: the start ring is on the road, and
    // a mission drive through it must not hijack the mission.
    if (inCar && !missionRunning && race.cooldown <= 0) {
      const d = Math.hypot(px - RACE.start.x, py - RACE.start.y);
      if (d < RACE.startRadius) {
        race.state = 'active';
        race.next = 0;
        race.timer = RACE.timer;
        game.message = `Street race! Hit all 3 checkpoints, then the start line — $${RACE.perCheckpoint} each, $${RACE.finishBonus} to win.`;
        game.messageT = 4;
        game.chime = true;
      }
    }
    return;
  }

  race.timer -= dt;
  if (race.timer <= 0) {
    race.state = 'idle';
    race.next = 0;
    race.timer = 0;
    race.cooldown = RACE.cooldown;
    game.message = 'Race failed — out of time. Drive through the start ring to try again.';
    game.messageT = 3;
    return;
  }
  const target = race.next < RACE.checkpoints.length
    ? RACE.checkpoints[race.next]
    : RACE.start;
  const d = Math.hypot(px - target.x, py - target.y);
  if (d < RACE.cpRadius) {
    if (race.next < RACE.checkpoints.length) {
      race.next += 1;
      game.player.cash += RACE.perCheckpoint;
      game.chime = true;
      game.message = race.next < RACE.checkpoints.length
        ? `Checkpoint ${race.next}/3! +$${RACE.perCheckpoint} — next one is marked.`
        : `All checkpoints! +$${RACE.perCheckpoint} — race back to the start line!`;
      game.messageT = 3;
      game.saveBest();
    } else {
      race.state = 'idle';
      race.next = 0;
      race.timer = 0;
      race.cooldown = RACE.cooldown;
      game.player.cash += RACE.finishBonus;
      game.stats.racesWon = (game.stats.racesWon || 0) + 1;
      game.banner = { text: 'Street race won!', sub: `+$${RACE.finishBonus} — ${game.stats.racesWon} race${game.stats.racesWon === 1 ? '' : 's'} won`, t: 5 };
      game.chime = true;
      game.saveBest();
    }
  }
}

/** Pick up the waiting passenger: T, in a taxi, near the pickup marker. */
export function tryTaxiPickup(game) {
  const taxi = game.taxi;
  const player = game.player;
  if (taxi.state !== 'pickup' || !taxi.pickup) return false;
  if (!player.car || player.car.model.name !== 'Solmar Taxi') return false;
  const d = Math.hypot(player.car.x - taxi.pickup.x, player.car.y - taxi.pickup.y);
  if (d > TAXI.pickupRadius) return false;
  taxi.dropoff = pickStand(game, taxi.pickup.key);
  const dist = Math.hypot(taxi.dropoff.x - taxi.pickup.x, taxi.dropoff.y - taxi.pickup.y);
  taxi.fare = Math.min(TAXI.fareMax, TAXI.fareBase + Math.round(dist * TAXI.farePerMetre));
  taxi.state = 'dropoff';
  game.message = `Passenger aboard — take them to ${taxi.dropoff.label} for $${taxi.fare}`;
  game.messageT = 3;
  game.chime = true;
  return true;
}
