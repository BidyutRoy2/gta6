// Pedestrians: Solmar locals walking the sidewalks, crossing at corners, and
// running away from danger — a fast car, a gunshot, or a police chase nearby.
import { CITY, PALETTE } from './config.js';
import { nearestRoad, onRoad } from './world.js';

export function spawnPedestrians(city, rng, count) {
  const peds = [];
  for (let i = 0; i < count; i += 1) {
    const road = nearestRoad(city, 100 + rng() * (CITY.width - 200), 100 + rng() * (CITY.oceanY - 200));
    const offset = 62 + rng() * 10;
    let x;
    let y;
    let axis;
    let dir;
    if (road.axis === 'v') {
      x = road.x + (rng() < 0.5 ? -offset : offset);
      y = road.y;
      axis = 'v';
      dir = rng() < 0.5 ? 1 : -1;
    } else {
      x = road.x;
      y = road.y + (rng() < 0.5 ? -offset : offset);
      axis = 'h';
      dir = rng() < 0.5 ? 1 : -1;
    }
    peds.push({
      x, y, axis, dir,
      speed: 34 + rng() * 26,
      walk: rng() * 10,
      shirt: PALETTE.pedShirts[Math.floor(rng() * PALETTE.pedShirts.length)],
      skin: ['#e8b88a', '#c98a5e', '#8a5a3a', '#f0c8a0'][Math.floor(rng() * 4)],
      fleeing: 0,
      fleeX: 0,
      fleeY: 0,
      alive: true,
      down: 0,
    });
  }
  return peds;
}

/** A scare at (x, y) with radius r sends nearby pedestrians running. */
export function scarePeds(peds, x, y, r) {
  for (const ped of peds) {
    if (!ped.alive) continue;
    const d = Math.hypot(ped.x - x, ped.y - y);
    if (d < r) {
      ped.fleeing = 2.5;
      const away = Math.atan2(ped.y - y, ped.x - x);
      ped.fleeX = Math.cos(away);
      ped.fleeY = Math.sin(away);
    }
  }
}

export function updatePedestrians(city, peds, player, playerCar, dt) {
  for (const ped of peds) {
    if (!ped.alive) {
      ped.down += dt;
      if (ped.down > 6) {
        // A knocked-down local gets up and walks off, shaken.
        ped.alive = true;
        ped.down = 0;
        ped.fleeing = 3;
        ped.fleeX = player ? Math.sign(ped.x - player.x) || 1 : 1;
        ped.fleeY = 0;
      }
      continue;
    }
    if (ped.fleeing > 0) {
      ped.fleeing -= dt;
      ped.x += ped.fleeX * 150 * dt;
      ped.y += ped.fleeY * 150 * dt;
      ped.walk += dt * 11;
    } else {
      ped.walk += dt * 6;
      if (ped.axis === 'h') ped.x += ped.dir * ped.speed * dt;
      else ped.y += ped.dir * ped.speed * dt;
      // Turn around at the map edge or the beach; keep to the sidewalk band.
      if (ped.x < 70 || ped.x > CITY.width - 70) ped.dir *= -1;
      if (ped.y < 70 || ped.y > CITY.oceanY - 70) ped.dir *= -1;
    }
    // A fast car nearby is a scare of its own.
    if (playerCar && Math.abs(playerCar.speed) > 120) {
      const d = Math.hypot(ped.x - playerCar.x, ped.y - playerCar.y);
      if (d < 130 && ped.fleeing <= 0) {
        ped.fleeing = 2;
        const away = Math.atan2(ped.y - playerCar.y, ped.x - playerCar.x);
        ped.fleeX = Math.cos(away);
        ped.fleeY = Math.sin(away);
      }
    }
    ped.x = Math.max(20, Math.min(CITY.width - 20, ped.x));
    ped.y = Math.max(20, Math.min(CITY.height - 20, ped.y));
  }
}

/**
 * A car running a pedestrian over: returns the pedestrians hit this step so
 * the caller can charge the wanted level and play the sound.
 */
export function carHitsPeds(cars, peds) {
  const hit = [];
  for (const car of cars) {
    if (car.driver !== 'player' || Math.abs(car.speed) < 30) continue;
    for (const ped of peds) {
      if (!ped.alive) continue;
      const d = Math.hypot(ped.x - car.x, ped.y - car.y);
      if (d < 30) {
        ped.alive = false;
        ped.down = 0;
        hit.push(ped);
        scarePeds(peds, ped.x, ped.y, 220);
      }
    }
  }
  return hit;
}

export function pedCountAlive(peds) {
  let n = 0;
  for (const ped of peds) if (ped.alive) n += 1;
  return n;
}

export { onRoad };
