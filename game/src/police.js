// The wanted system and the Solmar PD: stars rise with crimes, police cars
// spawn and chase, ram, and shoot; outrun them and stay out of sight and the
// heat falls; get cornered on foot and you are busted.
import { CITY, HELI, POLICE, WANTED } from './config.js';
import { spawnPoliceCar } from './traffic.js';

export function addWanted(game, stars) {
  game.wanted = Math.min(WANTED.max, game.wanted + stars);
  game.hiddenT = 0;
  game.decayT = 0;
  game.lastCrimeT = game.time;
  if (game.wanted > 0) game.everWanted = Math.max(game.everWanted, game.wanted);
}

/** Keep the right number of police cars on the road for the current wanted level. */
export function updatePolice(game, dt) {
  const player = game.player;
  const px = player.car ? player.car.x : player.x;
  const py = player.car ? player.car.y : player.y;

  // How near is the nearest cop? That decides whether the player is hidden.
  let nearestPolice = Infinity;
  for (const car of game.cars) {
    if (car.driver !== 'police') continue;
    const d = Math.hypot(car.x - px, car.y - py);
    if (d < nearestPolice) nearestPolice = d;
  }
  game.nearestPolice = nearestPolice;
  if (nearestPolice > 600) game.hiddenT = (game.hiddenT || 0) + dt;
  else game.hiddenT = 0;

  // Spawn up to one police car per star (plus one spare when the heat is high).
  // A fresh response always arrives right after a crime, but once the player
  // has been hidden for a while no new cops are sent: that is what makes
  // losing them possible at all.
  const want = game.wanted === 0 ? 0 : Math.min(POLICE.maxActive, game.wanted + (game.wanted >= 4 ? 1 : 0));
  let active = 0;
  for (const car of game.cars) if (car.driver === 'police') active += 1;
  const freshCrime = game.time - (game.lastCrimeT || -100) < 6;
  if (active < want && game.spawnTimer <= 0 && (freshCrime || (active > 0 && game.hiddenT < 5))) {
    const car = spawnPoliceCar(game.city, game.rng, px, py);
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

  // Each police car chases: steer at the player, ram on contact, shoot when close on foot.
  for (const car of game.cars) {
    if (car.driver !== 'police') continue;
    const targetAngle = Math.atan2(py - car.y, px - car.x);
    let diff = targetAngle - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.angle += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
    const dist = Math.hypot(px - car.x, py - car.y);
    const wantSpeed = dist > 260 ? 320 : dist > 90 ? 240 : 150;
    car.speed += (wantSpeed - car.speed) * Math.min(1, 1.2 * dt);
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    car.siren = (car.siren + dt) % 1;

    if (dist < 46) {
      if (player.car) {
        // A ram: a hard hit with a cooldown, then a shove — not a health drain.
        car.ramT = (car.ramT || 0) - dt;
        if (car.ramT <= 0 && Math.abs(car.speed) > 120) {
          car.ramT = 1.2;
          player.health -= POLICE.ramDamage;
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

  // Remove police cars that fell far behind once the heat is gone.
  if (game.wanted === 0) {
    game.cars = game.cars.filter((car) => car.driver !== 'police');
  }
}

/** The police helicopter: pure spectacle, no teeth. It appears once the
 * heat reaches HELI.spawnWanted and circles the player until the heat
 * drops; it never shoots, rams or arrests, so it cannot change a mission
 * outcome — it only has to be seen. Kept off game.cars on purpose: the
 * wanted and police counts never see it. */
export function updateHeli(game, dt) {
  const player = game.player;
  const px = player.car ? player.car.x : player.x;
  const py = player.car ? player.car.y : player.y;
  if (game.wanted < HELI.spawnWanted) {
    game.heli = null;
    return;
  }
  if (!game.heli) {
    game.heli = { angle: -0.6, radius: HELI.circleRadius, x: px, y: py, rotor: 0.6 };
  }
  const h = game.heli;
  h.angle += HELI.angularSpeed * dt;
  h.rotor = (h.rotor + dt * 14) % (Math.PI * 2);
  h.x = Math.max(60, Math.min(CITY.width - 60, px + Math.cos(h.angle) * h.radius));
  h.y = Math.max(60, Math.min(CITY.height - 60, py + Math.sin(h.angle) * h.radius));
}
