// The HUD: wanted stars, health and cash, speed, the objective line, the
// minimap (drawn from the same city data as the world), banners, and the
// garage shop. All of it is canvas text and shapes — no DOM, no images.
import { CITY, FONT, PALETTE, RACE, TAXI, VIEW } from './config.js';

const MINI = { w: 196, h: 148, x: 0, y: 0 };

function text(ctx, value, x, y, size, color, align, bold) {
  ctx.font = `${bold ? '700 ' : ''}${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(value, x, y);
}

export function drawMinimap(ctx, game) {
  const mx = VIEW.width - MINI.w - 14;
  const my = 14;
  const scaleX = MINI.w / CITY.width;
  const scaleY = MINI.h / CITY.height;
  const sx = (x) => mx + x * scaleX;
  const sy = (y) => my + y * scaleY;

  ctx.fillStyle = 'rgba(10, 16, 22, 0.85)';
  ctx.fillRect(mx - 4, my - 4, MINI.w + 8, MINI.h + 8);
  ctx.fillStyle = '#5d7a52';
  ctx.fillRect(mx, my, MINI.w, MINI.h);
  ctx.fillStyle = PALETTE.sea;
  ctx.fillRect(mx, sy(CITY.oceanY), MINI.w, MINI.h - (sy(CITY.oceanY) - my));
  ctx.strokeStyle = '#3a3f47';
  ctx.lineWidth = 2;
  for (const rx of game.city.lines.vertical) {
    ctx.beginPath(); ctx.moveTo(sx(rx), my); ctx.lineTo(sx(rx), sy(CITY.oceanY)); ctx.stroke();
  }
  for (const ry of game.city.lines.horizontal) {
    ctx.beginPath(); ctx.moveTo(mx, sy(ry)); ctx.lineTo(mx + MINI.w, sy(ry)); ctx.stroke();
  }
  // The mission marker, pulsing.
  const obj = game.currentObjective;
  if (obj && obj.target) {
    const pulse = 3 + Math.sin(game.time * 5) * 1.5;
    ctx.fillStyle = PALETTE.waypoint;
    ctx.beginPath();
    ctx.arc(sx(obj.target.x), sy(obj.target.y), pulse + 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.font = `700 11px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('!', sx(obj.target.x), sy(obj.target.y) - 5.5);
  }
  // Taxi fare markers: green pickup, gold drop-off.
  if (game.taxi) {
    if (game.taxi.state === 'pickup' && game.taxi.pickup) {
      ctx.fillStyle = '#5fd67f';
      ctx.beginPath();
      ctx.arc(sx(game.taxi.pickup.x), sy(game.taxi.pickup.y), 4, 0, Math.PI * 2);
      ctx.fill();
    }
    if (game.taxi.state === 'dropoff' && game.taxi.dropoff) {
      ctx.fillStyle = PALETTE.waypoint;
      ctx.beginPath();
      ctx.arc(sx(game.taxi.dropoff.x), sy(game.taxi.dropoff.y), 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Hidden packages as small gold dots.
  if (game.packages) {
    ctx.fillStyle = '#ffd23f';
    for (const pkg of game.packages) {
      if (!pkg.collected) ctx.fillRect(sx(pkg.x) - 1.5, sy(pkg.y) - 1.5, 3, 3);
    }
  }
  // Street race: the start ring as a white dot, checkpoints cyan — the
  // next one pulsing, finished ones dimmed.
  if (game.race) {
    ctx.fillStyle = '#f4efe4';
    ctx.fillRect(sx(RACE.start.x) - 2, sy(RACE.start.y) - 2, 4, 4);
    RACE.checkpoints.forEach((cp, i) => {
      const isNext = game.race.state === 'active' && game.race.next === i;
      const done = game.race.state === 'active' && game.race.next > i;
      ctx.fillStyle = done ? 'rgba(127,184,255,0.4)' : '#7fb8ff';
      const r = isNext ? 3.5 : 2.5;
      ctx.beginPath();
      ctx.arc(sx(cp.x), sy(cp.y), r, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  // Police as blue dots, traffic as white, the player as a gold arrow.
  for (const car of game.cars) {
    if (car.driver === 'player') continue;
    ctx.fillStyle = car.driver === 'police' ? '#3b82ff' : '#e8e8e8';
    ctx.fillRect(sx(car.x) - 1.5, sy(car.y) - 1.5, 3, 3);
  }
  const px = game.player.car ? game.player.car.x : game.player.x;
  const py = game.player.car ? game.player.car.y : game.player.y;
  ctx.save();
  ctx.translate(sx(px), sy(py));
  ctx.rotate(game.player.angle);
  ctx.fillStyle = PALETTE.waypoint;
  ctx.beginPath();
  ctx.moveTo(6, 0); ctx.lineTo(-4, -4); ctx.lineTo(-4, 4); ctx.closePath();
  ctx.fill();
  ctx.restore();
  // North tick and the city name.
  text(ctx, 'SOLMAR', mx + 4, my + MINI.h - 16, 10, 'rgba(255,255,255,0.75)', 'left', true);
  return { x: mx, y: my, w: MINI.w, h: MINI.h };
}

export function drawHud(ctx, game) {
  const player = game.player;
  // Top-left: wanted stars, health bar, cash.
  let starX = 18;
  for (let s = 0; s < 5; s += 1) {
    ctx.font = `700 26px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = s < game.wanted ? '#ffd23f' : 'rgba(255,255,255,0.22)';
    ctx.fillText('★', starX, 14);
    starX += 28;
  }
  if (game.wanted > 0) text(ctx, 'WANTED', 18, 44, 13, '#ff5a4a', 'left', true);
  // Health bar.
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(18, 66, 170, 16);
  ctx.fillStyle = player.health > 50 ? '#5fd67f' : player.health > 25 ? '#ffd23f' : '#ff5a4a';
  ctx.fillRect(18, 66, Math.max(0, 170 * (player.health / 100)), 16);
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 1;
  ctx.strokeRect(18, 66, 170, 16);
  text(ctx, `HP ${Math.max(0, Math.ceil(player.health))}`, 194, 67, 14, PALETTE.text, 'left', true);
  // Cash, ammo and the hidden-package count.
  text(ctx, `$${player.cash}`, 18, 90, 22, PALETTE.cash, 'left', true);
  if (player.hasGun) text(ctx, `Ammo ${player.ammo}`, 18, 116, 15, PALETTE.text, 'left');
  text(ctx, `Packages ${game.packagesCollected || 0}/10  •  +$100 each`, 18, 140, 14, '#ffd23f', 'left', true);
  // Speed, bottom-right, only while driving.
  if (player.car) {
    const mph = Math.round(Math.abs(player.car.speed) * 0.55);
    text(ctx, `${mph}`, VIEW.width - 20, VIEW.height - 74, 44, PALETTE.text, 'right', true);
    text(ctx, 'MPH', VIEW.width - 20, VIEW.height - 30, 14, PALETTE.muted, 'right', true);
    text(ctx, player.car.model.name, VIEW.width - 20, VIEW.height - 96, 13, PALETTE.muted, 'right');
  }
  // Minimap.
  drawMinimap(ctx, game);
  // Objective line, bottom centre.
  const obj = game.currentObjective;
  if (obj) {
    const label = `Mission ${game.mission.def.id} — ${game.mission.def.name}  •  ${obj.step.text}  (${obj.index + 1}/${obj.total})`;
    ctx.font = `600 16px ${FONT}`;
    const w = ctx.measureText(label).width + 28;
    ctx.fillStyle = 'rgba(10, 16, 22, 0.78)';
    ctx.fillRect((VIEW.width - w) / 2, VIEW.height - 52, w, 32);
    ctx.fillStyle = PALETTE.waypoint;
    ctx.fillRect((VIEW.width - w) / 2, VIEW.height - 52, 4, 32);
    text(ctx, label, (VIEW.width - w) / 2 + 16, VIEW.height - 44, 16, PALETTE.text, 'left');
  }
  // Mission timer, under the minimap.
  if (game.mission && game.mission.timer > 0 && !game.mission.done) {
    const t = Math.max(0, Math.ceil(game.mission.timer));
    const mm = Math.floor(t / 60);
    const ss = String(t % 60).padStart(2, '0');
    const col = t < 30 ? '#ff5a4a' : PALETTE.text;
    text(ctx, `⏱ ${mm}:${ss}`, VIEW.width - 20, 178, 20, col, 'right', true);
    text(ctx, `Payout $${game.mission.def.payout}`, VIEW.width - 20, 202, 14, PALETTE.cash, 'right', true);
  }
  // Taxi fare status, under the mission timer.
  if (game.taxi && game.taxi.state === 'dropoff' && game.taxi.dropoff) {
    text(ctx, `Taxi fare $${game.taxi.fare} → ${game.taxi.dropoff.label}`, VIEW.width - 20, 226, 14, '#5fd67f', 'right', true);
  } else if (game.taxi && game.taxi.state === 'pickup' && game.taxi.pickup) {
    text(ctx, `Taxi: fare waiting at ${game.taxi.pickup.label}`, VIEW.width - 20, 226, 14, '#5fd67f', 'right', true);
  }
  // Street race status, under the taxi line.
  if (game.race && game.race.state === 'active') {
    const t = Math.max(0, Math.ceil(game.race.timer));
    const mm = Math.floor(t / 60);
    const ss = String(t % 60).padStart(2, '0');
    const leg = game.race.next < RACE.checkpoints.length
      ? `Checkpoint ${game.race.next + 1}/3`
      : 'Finish: back to the start!';
    text(ctx, `🏁 Race ${leg} — ${mm}:${ss}`, VIEW.width - 20, 250, 14, '#7fb8ff', 'right', true);
  }
  // Progress bars for wait / chase steps.
  if (game.waitProgress > 0) {
    const w = 260;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect((VIEW.width - w) / 2, VIEW.height - 96, w, 14);
    ctx.fillStyle = PALETTE.waypoint;
    ctx.fillRect((VIEW.width - w) / 2, VIEW.height - 96, w * game.waitProgress, 14);
  }
  if (game.chaseProgress > 0) {
    const w = 260;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect((VIEW.width - w) / 2, VIEW.height - 96, w, 14);
    ctx.fillStyle = '#7fb8ff';
    ctx.fillRect((VIEW.width - w) / 2, VIEW.height - 96, w * game.chaseProgress, 14);
    text(ctx, 'Stay close to the courier…', VIEW.width / 2, VIEW.height - 120, 14, '#7fb8ff', 'center', true);
  }
  // Transient message line.
  if (game.messageT > 0 && game.message) {
    text(ctx, game.message, VIEW.width / 2, 64, 16, PALETTE.text, 'center', true);
  }
  // Steal prompt.
  if (game.nearCar && !player.car) {
    text(ctx, 'Press E to steal this car', VIEW.width / 2, VIEW.height - 140, 17, PALETTE.waypoint, 'center', true);
  }
  if (game.nearGarage && !game.shopOpen) {
    text(ctx, 'Press B for the garage shop', VIEW.width / 2, VIEW.height - 140, 17, PALETTE.waypoint, 'center', true);
  }
  // Taxi pickup prompt, in a taxi near the waiting fare.
  if (game.taxi && game.taxi.state === 'pickup' && game.taxi.pickup && player.car && player.car.model.name === 'Solmar Taxi') {
    const d = Math.hypot(player.car.x - game.taxi.pickup.x, player.car.y - game.taxi.pickup.y);
    if (d < TAXI.pickupRadius) {
      text(ctx, 'Press T to pick up the fare', VIEW.width / 2, VIEW.height - 140, 17, '#5fd67f', 'center', true);
    }
  }
  // Banner, centre screen.
  if (game.banner && game.banner.t > 0) {
    ctx.fillStyle = PALETTE.panel;
    const bw = 640;
    ctx.fillRect((VIEW.width - bw) / 2, 150, bw, 110);
    ctx.fillStyle = PALETTE.panelEdge;
    ctx.fillRect((VIEW.width - bw) / 2, 150, bw, 3);
    text(ctx, game.banner.text, VIEW.width / 2, 168, 30, PALETTE.text, 'center', true);
    if (game.banner.sub) {
      ctx.font = `15px ${FONT}`;
      const words = game.banner.sub.split(' ');
      let line = '';
      let y = 210;
      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > bw - 60 && line) {
          text(ctx, line, VIEW.width / 2, y, 15, PALETTE.muted, 'center');
          line = word;
          y += 20;
        } else line = test;
      }
      if (line) text(ctx, line, VIEW.width / 2, y, 15, PALETTE.muted, 'center');
    }
  }
}

export function drawShop(ctx, game) {
  const items = game.shopItems;
  ctx.fillStyle = 'rgba(6, 10, 14, 0.72)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.fillStyle = PALETTE.panel;
  const w = 560;
  const h = 180 + items.length * 36;
  ctx.fillRect((VIEW.width - w) / 2, (VIEW.height - h) / 2, w, h);
  ctx.fillStyle = PALETTE.panelEdge;
  ctx.fillRect((VIEW.width - w) / 2, (VIEW.height - h) / 2, w, 3);
  const x0 = (VIEW.width - w) / 2 + 36;
  let y = (VIEW.height - h) / 2 + 30;
  text(ctx, 'SOLMAR GARAGE', VIEW.width / 2, y, 28, PALETTE.text, 'center', true);
  y += 46;
  text(ctx, `Cash: $${game.player.cash}`, VIEW.width / 2, y, 16, PALETTE.cash, 'center', true);
  y += 40;
  items.forEach((item, i) => {
    const afford = game.player.cash >= item.price;
    text(ctx, `${i + 1}. ${item.name} — $${item.price}`, x0, y, 18, afford ? PALETTE.text : '#7a6a6a', 'left', true);
    text(ctx, item.desc, x0 + 340, y + 2, 13, PALETTE.muted, 'left');
    y += 36;
  });
  y += 12;
  text(ctx, `Press 1–${items.length} to buy, B or Esc to leave`, VIEW.width / 2, y, 15, PALETTE.muted, 'center');
}
