// The wanted system and the Solmar PD: stars rise with crimes, police cars
// spawn and chase, ram, and shoot; outrun them and stay out of sight and the
// heat falls; get cornered on foot and you are busted.
//
// Every unit carries a callsign and a tactic, and the tactic is real: it
// changes where the unit steers. PURSUIT chases the player, RAMMING aims
// for the intercept point, FLANKING cuts in from the side, ROADBLOCK parks
// ahead on the player's road, SEARCHING sweeps the last known position
// while the player is hidden, and the helicopter runs SPOTLIGHT. The HUD
// dispatch panel lists exactly these units, tactics and distances.
import { CITY, DISPATCH, HELI, POLICE, WANTED } from './config.js';
import { spawnPoliceCar } from './traffic.js';
import { say } from './meta.js';

let unitCounter = 0;

export function addWanted(game, stars) {
  game.wanted = Math.min(WANTED.max, game.wanted + stars);
  game.hiddenT = 0;
  game.decayT = 0;
  game.lastCrimeT = game.time;
  if (game.wanted > 0) game.everWanted = Math.max(game.everWanted, game.wanted);
}

/** Give a fresh police car its callsign and starting tactic. */
function assignUnit(car) {
  unitCounter += 1;
  car.unit = DISPATCH.callsigns[(unitCounter - 1) % DISPATCH.callsigns.length];
  if (!car.tactic) car.tactic = 'RESPONDING';
  car.sweepSeed = unitCounter * 2.39996; // golden-angle spread for sweeps
  return car;
}

/**
 * Where a unit steers, by tactic. Returns {x, y, speed} — the point to
 * drive at and how fast. PURSUIT is the old chase; the others bend it.
 */
function tacticTarget(game, car, px, py) {
  const player = game.player;
  const dist = Math.hypot(px - car.x, py - car.y);
  const seen = game.nearestPolice <= 600;
  if (game.wanted > 0 && !seen) {
    // SEARCHING: sweep around the last known position.
    car.tactic = 'SEARCHING';
    const lk = game.lastKnown || { x: px, y: py };
    const sweepR = 160 + (car.sweepSeed % 1) * 140;
    const a = game.time * 0.35 + car.sweepSeed;
    return { x: lk.x + Math.cos(a) * sweepR, y: lk.y + Math.sin(a) * sweepR, speed: 190 };
  }
  if (car.tactic === 'ROADBLOCK') {
    // Park ahead of the player, across their road, and wait.
    const heading = player.car ? player.car.angle : player.angle;
    const bx = Math.max(80, Math.min(CITY.width - 80, px + Math.cos(heading) * DISPATCH.roadblockAhead));
    const by = Math.max(80, Math.min(CITY.height - 80, py + Math.sin(heading) * DISPATCH.roadblockAhead));
    const dBlock = Math.hypot(bx - car.x, by - car.y);
    return { x: bx, y: by, speed: dBlock > 60 ? 320 : 0, facePlayer: true };
  }
  if (player.car && dist < 300 && car.tactic === 'RAMMING') {
    // Aim where the player's car will be, not where it is.
    const lead = 0.45;
    return {
      x: px + Math.cos(player.car.angle) * player.car.speed * lead,
      y: py + Math.sin(player.car.angle) * player.car.speed * lead,
      speed: 340,
    };
  }
  if (player.car && car.tactic === 'FLANKING') {
    // Cut in from the side: a point beside the player's heading.
    const side = car.sweepSeed % 2 < 1 ? 1 : -1;
    const a = player.car.angle + side * (Math.PI / 2);
    return { x: px + Math.cos(a) * 120, y: py + Math.sin(a) * 120, speed: 300 };
  }
  car.tactic = player.car ? (dist < 300 ? 'RAMMING' : 'PURSUIT') : (dist < POLICE.shootRange ? 'FIRING' : 'PURSUIT');
  return { x: px, y: py, speed: dist > 260 ? 320 : dist > 90 ? 240 : 150 };
}

/** Keep the right number of police cars on the road for the current wanted level. */
export function updatePolice(game, dt) {
  const player = game.player;
  const px = player.car ? player.car.x : player.x;
  const py = player.car ? player.car.y : player.y;

  // How near is the nearest cop? That decides whether the player is hidden.
  // The helicopter's spotlight counts as eyes too: lit means seen.
  let nearestPolice = Infinity;
  for (const car of game.cars) {
    if (car.driver !== 'police') continue;
    const d = Math.hypot(car.x - px, car.y - py);
    if (d < nearestPolice) nearestPolice = d;
  }
  const lit = !!(game.heli && Math.hypot(game.heli.spotX - px, game.heli.spotY - py) < HELI.spotRadius);
  game.spotlit = lit;
  game.nearestPolice = nearestPolice;
  if (nearestPolice > 600 && !lit) game.hiddenT = (game.hiddenT || 0) + dt;
  else {
    game.hiddenT = 0;
    game.lastKnown = { x: px, y: py };
  }
  // The wanted state the HUD shows: clear, in sight, or being searched for.
  game.searchState = game.wanted === 0 ? 'clear' : (game.hiddenT > 0.5 ? 'searching' : 'in-sight');
  // Seconds until the next star drops (for the SEARCHING readout).
  game.searchClearIn = game.searchState === 'searching'
    ? Math.max(0, (WANTED.decayQuietSeconds - game.hiddenT) + (WANTED.decayStepSeconds - (game.decayT || 0)))
    : 0;
  game.searchZone = game.searchState === 'searching'
    ? Math.max(60, 420 - game.hiddenT * 30)
    : 0;

  // Spawn up to one police car per star (plus one spare when the heat is high).
  // A fresh response always arrives right after a crime, but once the player
  // has been hidden for a while no new cops are sent: that is what makes
  // losing them possible at all.
  const want = game.wanted === 0 ? 0 : Math.min(POLICE.maxActive, game.wanted + (game.wanted >= 4 ? 1 : 0));
  let active = 0;
  for (const car of game.cars) if (car.driver === 'police') active += 1;
  const freshCrime = game.time - (game.lastCrimeT || -100) < 6;
  if (active < want && game.spawnTimer <= 0 && (freshCrime || (active > 0 && game.hiddenT < 5))) {
    const car = assignUnit(spawnPoliceCar(game.city, game.rng, px, py));
    // At high heat the last unit out sets the roadblock; the rest chase,
    // with every third unit flanking.
    if (game.wanted >= DISPATCH.roadblockMinWanted && active === want - 1) car.tactic = 'ROADBLOCK';
    else if (active % 3 === 2) car.tactic = 'FLANKING';
    game.cars.push(car);
    game.spawnTimer = 2.5;
  }
  game.spawnTimer -= dt;

  // A cop that falls far behind loses the trail and leaves.
  game.cars = game.cars.filter((car) => {
    if (car.driver !== 'police') return true;
    return Math.hypot(car.x - px, car.y - py) < 1600;
  });

  // Wanted decays only while hidden: 7 quiet seconds, then a star per 4.
  if (game.wanted > 0 && game.hiddenT > WANTED.decayQuietSeconds) {
    game.decayT = (game.decayT || 0) + dt;
    if (game.decayT > WANTED.decayStepSeconds) {
      game.wanted -= 1;
      game.decayT = 0;
      game.message = game.wanted === 0 ? 'You lost the cops. Clean.' : `Heat dropping — ${game.wanted} star${game.wanted > 1 ? 's' : ''} left.`;
      game.messageT = 3;
    }
  } else {
    game.decayT = 0;
  }

  // Each police car drives its tactic: steer at the tactic's target, ram
  // on contact, shoot when close on foot.
  for (const car of game.cars) {
    if (car.driver !== 'police') continue;
    if (!car.unit) assignUnit(car);
    const target = tacticTarget(game, car, px, py);
    const targetAngle = Math.atan2(target.y - car.y, target.x - car.x);
    let diff = targetAngle - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.angle += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
    const dist = Math.hypot(px - car.x, py - car.y);
    car.speed += (target.speed - car.speed) * Math.min(1, 1.2 * dt);
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    car.siren = (car.siren + dt) % 1;
    car.distToPlayer = dist;

    if (dist < 46) {
      if (player.car) {
        // A ram: a hard hit with a cooldown, then a shove — not a health drain.
        car.ramT = (car.ramT || 0) - dt;
        if (car.ramT <= 0 && Math.abs(car.speed) > 120) {
          car.ramT = 1.2;
          // Armour plating soaks a fifth of the hit per tier.
          const armour = (player.carUpgrades && player.carUpgrades.armour) || 0;
          player.health -= POLICE.ramDamage * (1 - 0.2 * armour);
          game.shake = 0.25;
          game.message = 'PD rammed you!';
          game.messageT = 1;
        }
        player.car.speed *= 1 - 0.9 * dt;
        const shove = Math.atan2(player.car.y - car.y, player.car.x - car.x);
        player.car.x += Math.cos(shove) * 40 * dt;
        player.car.y += Math.sin(shove) * 40 * dt;
      } else {
        // On foot and cornered: the arrest clock runs.
        game.arrestT += dt;
        game.message = 'Solmar PD has you cornered — RUN!';
        game.messageT = 1;
        if (game.arrestT > WANTED.arrestSeconds) game.busted = true;
      }
    } else if (!player.car) {
      game.arrestT = Math.max(0, game.arrestT - dt * 2);
    }

    // A cop with a clear, close shot at an on-foot player fires.
    if (!player.car && dist < POLICE.shootRange && dist > 60) {
      car.shootT = (car.shootT || 0) - dt;
      if (car.shootT <= 0) {
        car.shootT = POLICE.shootCooldown;
        game.policeShots.push({ x: car.x, y: car.y, tx: px, ty: py });
      }
    }
  }

  // The dispatch list the HUD panel reads: every live unit, nearest first.
  refreshDispatch(game);

  // Remove police cars that fell far behind once the heat is gone.
  if (game.wanted === 0) {
    game.cars = game.cars.filter((car) => car.driver !== 'police');
    game.dispatch = [];
  }
}

/** Rebuild game.dispatch from the live police cars (and the helicopter). */
export function refreshDispatch(game) {
  const player = game.player;
  const px = player.car ? player.car.x : player.x;
  const py = player.car ? player.car.y : player.y;
  game.dispatch = game.cars
    .filter((car) => car.driver === 'police')
    .map((car) => {
      if (!car.unit) assignUnit(car);
      const d = Math.hypot(car.x - px, car.y - py);
      return {
        unit: car.unit,
        tactic: car.tactic || 'PURSUIT',
        metres: Math.max(1, Math.round(d * DISPATCH.metresPerPixel)),
      };
    })
    .sort((a, b) => a.metres - b.metres);
  if (game.heli) {
    game.dispatch.push({
      unit: DISPATCH.airUnit,
      tactic: 'SPOTLIGHT',
      metres: Math.max(1, Math.round(Math.hypot(game.heli.x - px, game.heli.y - py) * DISPATCH.metresPerPixel)),
    });
  }
}

/** The police helicopter: it appears once the heat reaches
 * HELI.spawnWanted and circles the player until the heat drops. It never
 * shoots, rams or arrests. Its spotlight cone tracks the player with a
 * lag — while the lit circle holds you, the heat cannot cool. Kept off
 * game.cars on purpose: the wanted and police counts never see it. */
export function updateHeli(game, dt) {
  const player = game.player;
  const px = player.car ? player.car.x : player.x;
  const py = player.car ? player.car.y : player.y;
  if (game.wanted < HELI.spawnWanted) {
    game.heli = null;
    return;
  }
  if (!game.heli) {
    game.heli = { angle: -0.6, radius: HELI.circleRadius, x: px, y: py, rotor: 0.6, spotX: px, spotY: py };
    game.message = 'AIR UNIT DEPLOYED — Solmar PD helicopter overhead!';
    game.messageT = 3;
    say(game, 'dispatch', 'Air unit deployed. Keep the light on her.', 4);
  }
  const h = game.heli;
  h.angle += HELI.angularSpeed * dt;
  h.rotor = (h.rotor + dt * 14) % (Math.PI * 2);
  h.x = Math.max(60, Math.min(CITY.width - 60, px + Math.cos(h.angle) * h.radius));
  h.y = Math.max(60, Math.min(CITY.height - 60, py + Math.sin(h.angle) * h.radius));
  // The cone chases the player, always a beat behind.
  const k = Math.min(1, HELI.spotLag * dt);
  h.spotX += (px - h.spotX) * k;
  h.spotY += (py - h.spotY) * k;
}
