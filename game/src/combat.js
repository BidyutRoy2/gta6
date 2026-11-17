// Combat: fists and the pistol. Punches hit what is in front of the player;
// bullets fly toward the mouse, hurt peds, police and cars, and draw heat.
// Police gunfire is answered here too, so every shot in the game passes
// through one place.
import { BULLET, PLAYER, POLICE } from './config.js';
import { scarePeds } from './pedestrians.js';

export function punch(game) {
  const player = game.player;
  if (player.punchT > 0) return;
  player.punchT = 0.35;
  player.punchAnim = 0.25;
  const reach = PLAYER.punchRange;
  const fx = Math.cos(player.angle);
  const fy = Math.sin(player.angle);
  let hitSomething = false;
  for (const ped of game.peds) {
    if (!ped.alive) continue;
    const dx = ped.x - player.x;
    const dy = ped.y - player.y;
    const d = Math.hypot(dx, dy);
    if (d < reach + 12) {
      const dot = (dx * fx + dy * fy) / (d || 1);
      if (dot > Math.cos(PLAYER.punchArc)) {
        ped.alive = false;
        ped.down = 0;
        scarePeds(game.peds, ped.x, ped.y, 200);
        game.addWanted(1);
        game.message = 'You hit a local! The PD will hear about that.';
        game.messageT = 2;
        hitSomething = true;
      }
    }
  }
  for (const car of game.cars) {
    if (car.driver !== 'police') continue;
    const d = Math.hypot(car.x - player.x, car.y - player.y);
    if (d < reach + 26) {
      car.damage += PLAYER.punchDamage;
      game.addWanted(1);
      hitSomething = true;
    }
  }
  game.thud = hitSomething;
}

export function shoot(game, targetX, targetY) {
  const player = game.player;
  if (!player.hasGun || player.ammo <= 0 || player.shootT > 0) return;
  if (player.car) return; // no drive-bys: shoot on foot only
  player.ammo -= 1;
  player.shootT = 0.28;
  const angle = Math.atan2(targetY - player.y, targetX - player.x);
  player.angle = angle;
  game.bullets.push({
    x: player.x + Math.cos(angle) * 20,
    y: player.y + Math.sin(angle) * 20,
    vx: Math.cos(angle) * BULLET.speed,
    vy: Math.sin(angle) * BULLET.speed,
    life: BULLET.life,
    fromPolice: false,
  });
  game.shotFired = true;
  game.addWanted(1);
  scarePeds(game.peds, player.x, player.y, 260);
}

/** Police shots fired at the player, resolved the same way as player bullets. */
export function policeShoot(game) {
  for (const shot of game.policeShots) {
    const angle = Math.atan2(shot.ty - shot.y, shot.tx - shot.x);
    game.bullets.push({
      x: shot.x + Math.cos(angle) * 20,
      y: shot.y + Math.sin(angle) * 20,
      vx: Math.cos(angle) * BULLET.speed * 0.85,
      vy: Math.sin(angle) * BULLET.speed * 0.85,
      life: BULLET.life,
      fromPolice: true,
    });
  }
  game.policeShots.length = 0;
}

export function updateBullets(game, dt) {
  const player = game.player;
  for (let i = game.bullets.length - 1; i >= 0; i -= 1) {
    const b = game.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    let dead = b.life <= 0;
    if (!dead && !b.fromPolice) {
      // Player bullets: peds, police cars, the courier.
      for (const ped of game.peds) {
        if (ped.alive && Math.hypot(ped.x - b.x, ped.y - b.y) < 14) {
          ped.alive = false;
          ped.down = 0;
          game.addWanted(1);
          game.sparks.push({ x: b.x, y: b.y, t: 0.3 });
          dead = true;
          break;
        }
      }
      if (!dead) {
        for (const car of game.cars) {
          if (Math.hypot(car.x - b.x, car.y - b.y) < 30) {
            car.damage += BULLET.damage;
            game.sparks.push({ x: b.x, y: b.y, t: 0.3 });
            if (car.driver === 'police') game.addWanted(1);
            if (car.damage > 220) {
              car.driver = null;
              car.parked = true;
              car.speed = 0;
              game.explosions.push({ x: car.x, y: car.y, t: 0.6 });
            }
            dead = true;
            break;
          }
        }
      }
    } else if (!dead && b.fromPolice) {
      if (!player.car && Math.hypot(player.x - b.x, player.y - b.y) < 14) {
        player.health -= POLICE.bulletDamage;
        game.shake = 0.2;
        dead = true;
      } else if (player.car && Math.hypot(player.car.x - b.x, player.car.y - b.y) < 30) {
        player.car.damage += 5;
        player.health -= 2;
        dead = true;
      }
    }
    if (dead) game.bullets.splice(i, 1);
  }
}

export function updateParticles(game, dt) {
  for (let i = game.sparks.length - 1; i >= 0; i -= 1) {
    game.sparks[i].t -= dt;
    if (game.sparks[i].t <= 0) game.sparks.splice(i, 1);
  }
  for (let i = game.explosions.length - 1; i >= 0; i -= 1) {
    game.explosions[i].t -= dt;
    if (game.explosions[i].t <= 0) game.explosions.splice(i, 1);
  }
}
