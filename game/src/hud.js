// The HUD: wanted stars and search state, health and cash, the respect
// rank, the district you are in, weapon slots, the police dispatch panel,
// the radio line, the city clock, dialogue portraits, the minimap, the
// garage shop screen and the pause map. All canvas text and shapes —
// no DOM, no images.
import { CITY, FONT, PALETTE, RACE, TAXI, VIEW, WEAPONS } from './config.js';
import { CHARACTERS, currentDistrict, districtAt, rankFor } from './meta.js';
import { MISSIONS } from './missions.js';

const MINI = { w: 196, h: 148, x: 0, y: 0 };

function text(ctx, value, x, y, size, color, align, bold) {
  ctx.font = `${bold ? '700 ' : ''}${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(value, x, y);
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(10, 16, 22, 0.82)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(255, 210, 63, 0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
}

/** "DAY 2 · 18:42" from the city clock. */
export function clockLabel(game) {
  const mins = Math.floor(game.clockMinutes);
  const hh = String(Math.floor(mins / 60) % 24).padStart(2, '0');
  const mm = String(mins % 60).padStart(2, '0');
  return `DAY ${game.day} · ${hh}:${mm}`;
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
  // District tints: the same five districts the pause map names.
  ctx.fillStyle = 'rgba(232,185,58,0.13)';
  ctx.fillRect(mx, my, sx(1600) - mx, sy(1200) - my); // Northgate
  ctx.fillStyle = 'rgba(63,127,184,0.13)';
  ctx.fillRect(sx(1600), my, mx + MINI.w - sx(1600), sy(1200) - my); // Marina Flats
  ctx.fillStyle = 'rgba(176,86,63,0.13)';
  ctx.fillRect(mx, sy(1200), sx(1600) - mx, sy(CITY.oceanY) - sy(1200)); // Old Cannery
  ctx.fillStyle = 'rgba(95,125,138,0.13)';
  ctx.fillRect(sx(1600), sy(1200), mx + MINI.w - sx(1600), sy(CITY.oceanY) - sy(1200)); // Harborfront
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
  // The search zone: while hidden, the PD sweeps a shrinking circle
  // around the last place they saw Dash.
  if (game.searchState === 'searching' && game.lastKnown) {
    ctx.strokeStyle = 'rgba(255, 90, 74, 0.9)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(sx(game.lastKnown.x), sy(game.lastKnown.y), Math.max(6, game.searchZone * scaleX), 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 90, 74, 0.12)';
    ctx.fill();
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
  // The police helicopter, when it is up, as a blue dot.
  if (game.heli) {
    ctx.fillStyle = '#3b82ff';
    ctx.fillRect(sx(game.heli.x) - 2, sy(game.heli.y) - 2, 4, 4);
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

/** The police dispatch panel: every live unit, its tactic, its distance. */
function drawDispatch(ctx, game, x, y) {
  if (!game.dispatch || game.dispatch.length === 0) return y;
  const units = game.dispatch;
  const shown = units.slice(0, 6);
  const h = 34 + shown.length * 18 + (units.length > shown.length ? 16 : 0);
  panel(ctx, x, y, 292, h);
  text(ctx, `SOLMAR PD RESPONSE · ${units.length} UNIT${units.length === 1 ? '' : 'S'} · ${game.wanted}★`, x + 10, y + 8, 13, '#7fb8ff', 'left', true);
  shown.forEach((u, i) => {
    const ly = y + 30 + i * 18;
    text(ctx, u.unit, x + 10, ly, 13, PALETTE.text, 'left', true);
    text(ctx, u.tactic, x + 76, ly, 13, '#ffd23f', 'left', true);
    text(ctx, `${u.metres}m`, x + 282, ly, 13, PALETTE.muted, 'right');
  });
  if (units.length > shown.length) {
    text(ctx, `+${units.length - shown.length} more units`, x + 10, y + 30 + shown.length * 18, 12, PALETTE.muted, 'left');
  }
  return y + h + 8;
}

/** The five weapon slots, bottom-left: key, name, ammo — or the price. */
function drawWeaponSlots(ctx, game) {
  const player = game.player;
  const w = 50;
  const h = 46;
  const gap = 6;
  const x0 = 14;
  const y0 = VIEW.height - h - 14;
  WEAPONS.forEach((weapon, i) => {
    const x = x0 + i * (w + gap);
    const selected = player.weaponSlot === i;
    const owned = player.ownedWeapons[i];
    ctx.fillStyle = selected ? 'rgba(255, 210, 63, 0.28)' : 'rgba(10, 16, 22, 0.82)';
    ctx.fillRect(x, y0, w, h);
    ctx.strokeStyle = selected ? '#ffd23f' : 'rgba(255,255,255,0.35)';
    ctx.lineWidth = selected ? 2 : 1;
    ctx.strokeRect(x, y0, w, h);
    text(ctx, `${i + 1}`, x + 5, y0 + 3, 11, PALETTE.muted, 'left', true);
    text(ctx, weapon.short, x + w / 2, y0 + 14, 12, owned ? PALETTE.text : '#8a8a8a', 'center', true);
    if (i === 0) {
      text(ctx, '—', x + w / 2, y0 + 30, 11, PALETTE.muted, 'center');
    } else if (owned) {
      text(ctx, `${player.ammoByWeapon[i]}`, x + w / 2, y0 + 30, 12, PALETTE.cash, 'center', true);
    } else {
      text(ctx, `$${weapon.price}`, x + w / 2, y0 + 30, 11, '#c96a4a', 'center', true);
    }
  });
}

/** A canvas-drawn portrait for the dialogue box. */
function drawPortrait(ctx, who, x, y, size) {
  const c = CHARACTERS[who] || CHARACTERS.dash;
  ctx.fillStyle = c.accent;
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(x, y + size * 0.62, size, size * 0.38);
  const cx = x + size / 2;
  const cy = y + size * 0.48;
  const r = size * 0.26;
  // Shoulders.
  ctx.fillStyle = c.accent;
  ctx.beginPath();
  ctx.ellipse(cx, y + size * 1.02, size * 0.42, size * 0.3, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  // Face.
  ctx.fillStyle = c.skin;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  // Hair by style.
  ctx.fillStyle = c.hair;
  if (c.hairStyle === 'cap') {
    ctx.beginPath();
    ctx.arc(cx, cy - r * 0.25, r * 1.02, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(cx - r * 1.05, cy - r * 0.32, r * 2.1, r * 0.22);
  } else if (c.hairStyle === 'bob') {
    ctx.beginPath();
    ctx.arc(cx, cy - r * 0.1, r * 1.12, Math.PI * 0.95, Math.PI * 2.05);
    ctx.fill();
    ctx.fillRect(cx - r * 1.12, cy - r * 0.1, r * 0.34, r * 1.3);
    ctx.fillRect(cx + r * 0.78, cy - r * 0.1, r * 0.34, r * 1.3);
  } else if (c.hairStyle === 'headset') {
    ctx.beginPath();
    ctx.arc(cx, cy - r * 0.15, r * 1.05, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#111';
    ctx.lineWidth = size * 0.05;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.18, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
    ctx.fillStyle = '#111';
    ctx.fillRect(cx + r * 0.9, cy + r * 0.5, r * 0.5, size * 0.05);
  } else {
    ctx.beginPath();
    ctx.arc(cx, cy - r * 0.3, r * 1.0, Math.PI, Math.PI * 2);
    ctx.fill();
  }
  // Eyes.
  ctx.fillStyle = '#22262e';
  ctx.beginPath();
  ctx.arc(cx - r * 0.38, cy + r * 0.05, size * 0.035, 0, Math.PI * 2);
  ctx.arc(cx + r * 0.38, cy + r * 0.05, size * 0.035, 0, Math.PI * 2);
  ctx.fill();
}

/** The dialogue box: portrait, name, role, and the line, word-wrapped. */
function drawDialogue(ctx, game) {
  const d = game.meta.dialogue;
  if (!d) return;
  const c = CHARACTERS[d.who] || CHARACTERS.dash;
  const w = 640;
  const h = 84;
  const x = (VIEW.width - w) / 2;
  const y = VIEW.height - 52 - h - 14;
  panel(ctx, x, y, w, h);
  drawPortrait(ctx, d.who, x + 8, y + 8, h - 16);
  text(ctx, c.name, x + h + 8, y + 8, 16, '#ffd23f', 'left', true);
  text(ctx, c.role, x + h + 8, y + 28, 12, PALETTE.muted, 'left');
  // The line, wrapped to the box.
  ctx.font = `15px ${FONT}`;
  const maxW = w - h - 28;
  const words = d.text.split(' ');
  let line = '';
  let ly = y + 48;
  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxW && line) {
      text(ctx, line, x + h + 8, ly, 15, PALETTE.text, 'left');
      line = word;
      ly += 18;
      if (ly > y + h - 20) break;
    } else line = testLine;
  }
  if (line && ly <= y + h - 20) text(ctx, line, x + h + 8, ly, 15, PALETTE.text, 'left');
}

export function drawHud(ctx, game) {
  const player = game.player;
  // Top-left cluster on one backing panel, so nothing ever clips or sits
  // on bright buildings: stars, heat state, health, cash, respect,
  // district, packages.
  const panelH = 196;
  panel(ctx, 8, 8, 300, panelH);
  let starX = 18;
  for (let s = 0; s < 5; s += 1) {
    ctx.font = `700 26px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = s < game.wanted ? '#ffd23f' : 'rgba(255,255,255,0.22)';
    ctx.fillText('★', starX, 14);
    starX += 28;
  }
  if (game.wanted > 0) {
    if (game.searchState === 'searching') {
      const zoneM = Math.round(game.searchZone / 8);
      text(ctx, `SEARCHING — zone ${zoneM}m · clear in ${Math.ceil(game.searchClearIn)}s`, 18, 46, 13, '#ff9a4a', 'left', true);
    } else {
      text(ctx, game.spotlit ? 'WANTED — IN THE LIGHT' : 'WANTED — IN SIGHT', 18, 46, 13, '#ff5a4a', 'left', true);
    }
  } else {
    text(ctx, 'CLEAN', 18, 46, 13, '#5fd67f', 'left', true);
  }
  // Health bar.
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(18, 68, 170, 16);
  ctx.fillStyle = player.health > 50 ? '#5fd67f' : player.health > 25 ? '#ffd23f' : '#ff5a4a';
  ctx.fillRect(18, 68, Math.max(0, 170 * (player.health / 100)), 16);
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 1;
  ctx.strokeRect(18, 68, 170, 16);
  text(ctx, `HP ${Math.max(0, Math.ceil(player.health))}`, 194, 69, 14, PALETTE.text, 'left', true);
  // Cash.
  text(ctx, `$${player.cash}`, 18, 90, 22, PALETTE.cash, 'left', true);
  // Respect: rank name + XP bar to the next rank.
  const rank = rankFor(game.meta.respect);
  text(ctx, rank.current.name.toUpperCase(), 18, 118, 14, '#ffd23f', 'left', true);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(18, 138, 170, 8);
  ctx.fillStyle = '#ffd23f';
  ctx.fillRect(18, 138, 170 * rank.progress, 8);
  text(ctx, rank.next ? `${game.meta.respect}/${rank.next.xp} XP` : `${game.meta.respect} XP`, 194, 134, 12, PALETTE.muted, 'left');
  // District + standing.
  const dist = currentDistrict(game);
  text(ctx, `${dist.name.toUpperCase()} · STANDING ${Math.round(dist.standing)}%`, 18, 152, 13, '#7fb8ff', 'left', true);
  // Packages.
  text(ctx, `Packages ${game.packagesCollected || 0}/10  •  +$100 each`, 18, 174, 14, '#ffd23f', 'left', true);
  // Dispatch panel under the cluster.
  drawDispatch(ctx, game, 8, 8 + panelH + 8);
  // Weapon slots, bottom-left.
  drawWeaponSlots(ctx, game);
  // Radio line + clock, top centre (the radio only speaks in a car).
  if (player.car && game.radioNow) {
    text(ctx, `♪ ${game.radioNow.station.name} — ${game.radioNow.trackName}`, VIEW.width / 2, 16, 15, '#ffd23f', 'center', true);
  }
  text(ctx, clockLabel(game), VIEW.width / 2, 38, 14, PALETTE.text, 'center', true);
  // Speed, bottom-right, only while driving — with the car's condition.
  if (player.car) {
    const mph = Math.round(Math.abs(player.car.speed) * 0.55);
    const condition = Math.max(0, Math.round(100 - (player.car.damage || 0) / 2.2));
    text(ctx, `${mph}`, VIEW.width - 20, VIEW.height - 74, 44, PALETTE.text, 'right', true);
    text(ctx, 'MPH', VIEW.width - 20, VIEW.height - 30, 14, PALETTE.muted, 'right', true);
    text(ctx, `${player.car.model.name} · ${condition}%`, VIEW.width - 20, VIEW.height - 96, 13, PALETTE.muted, 'right');
    if (player.carUpgrades.tune >= 3) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(VIEW.width - 120, VIEW.height - 112, 100, 7);
      ctx.fillStyle = '#7fb8ff';
      ctx.fillRect(VIEW.width - 120, VIEW.height - 112, 100 * player.nitro, 7);
      text(ctx, 'NITRO', VIEW.width - 20, VIEW.height - 128, 11, '#7fb8ff', 'right', true);
    }
  }
  // Minimap.
  drawMinimap(ctx, game);
  // Objective line, bottom centre — never sliding left over the slots.
  const obj = game.currentObjective;
  if (obj) {
    const label = `Mission ${game.mission.def.id} — ${game.mission.def.name}  •  ${obj.step.text}  (${obj.index + 1}/${obj.total})`;
    ctx.font = `600 16px ${FONT}`;
    const w = ctx.measureText(label).width + 28;
    const bx = Math.max((VIEW.width - w) / 2, 296);
    ctx.fillStyle = 'rgba(10, 16, 22, 0.78)';
    ctx.fillRect(bx, VIEW.height - 52, w, 32);
    ctx.fillStyle = PALETTE.waypoint;
    ctx.fillRect(bx, VIEW.height - 52, 4, 32);
    text(ctx, label, bx + 16, VIEW.height - 44, 16, PALETTE.text, 'left');
  }
  // Dialogue, above the objective line.
  drawDialogue(ctx, game);
  // Right-side status stack, under the minimap — timer / payout / taxi /
  // race, one dark backing panel behind the active lines.
  const stack = [];
  if (game.mission && game.mission.timer > 0 && !game.mission.done) {
    const t = Math.max(0, Math.ceil(game.mission.timer));
    const mm = Math.floor(t / 60);
    const ss = String(t % 60).padStart(2, '0');
    const col = t < 30 ? '#ff5a4a' : PALETTE.text;
    stack.push({ value: `⏱ ${mm}:${ss}`, y: 178, size: 20, color: col, bold: true });
    stack.push({ value: `Payout $${game.mission.def.payout}`, y: 202, size: 14, color: PALETTE.cash });
  }
  // Short place names keep the taxi line from running across the frame.
  const shortPlace = { 'The Marlin Club': 'Marlin Club', 'Solmar Garage': 'Garage', 'Stash House': 'Stash House' };
  const shortLabel = (label) => shortPlace[label] || label;
  if (game.taxi && game.taxi.state === 'dropoff' && game.taxi.dropoff) {
    stack.push({ value: `Taxi $${game.taxi.fare} → ${shortLabel(game.taxi.dropoff.label)}`, y: 226, size: 14, color: '#5fd67f' });
  } else if (game.taxi && game.taxi.state === 'pickup' && game.taxi.pickup) {
    stack.push({ value: `Taxi pickup: ${shortLabel(game.taxi.pickup.label)}`, y: 226, size: 14, color: '#5fd67f' });
  }
  if (game.race && game.race.state === 'active') {
    const t = Math.max(0, Math.ceil(game.race.timer));
    const mm = Math.floor(t / 60);
    const ss = String(t % 60).padStart(2, '0');
    const leg = game.race.next < RACE.checkpoints.length
      ? `Checkpoint ${game.race.next + 1}/3`
      : 'Finish: back to the start!';
    stack.push({ value: `🏁 Race ${leg} — ${mm}:${ss}`, y: 250, size: 14, color: '#7fb8ff' });
  }
  if (stack.length > 0) {
    let maxW = 0;
    for (const line of stack) {
      ctx.font = `${line.bold ? '700 ' : ''}${line.size}px ${FONT}`;
      maxW = Math.max(maxW, ctx.measureText(line.value).width);
    }
    const pad = 10;
    const px = VIEW.width - 20 - maxW - pad;
    const py = stack[0].y - 6;
    const ph = (stack[stack.length - 1].y + 19) - py;
    ctx.fillStyle = 'rgba(10, 16, 22, 0.78)';
    ctx.fillRect(px, py, VIEW.width - 20 + pad - px, ph);
    for (const line of stack) {
      text(ctx, line.value, VIEW.width - 20, line.y, line.size, line.color, 'right', line.bold);
    }
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
        const testLine = line ? `${line} ${word}` : word;
        if (ctx.measureText(testLine).width > bw - 60 && line) {
          text(ctx, line, VIEW.width / 2, y, 15, PALETTE.muted, 'center');
          line = word;
          y += 20;
        } else line = testLine;
      }
      if (line) text(ctx, line, VIEW.width / 2, y, 15, PALETTE.muted, 'center');
    }
  }
}

/** One stat bar with a label and a 0..1 fill. */
function statBar(ctx, label, value01, x, y, w, color) {
  text(ctx, label, x, y, 13, PALETTE.muted, 'left', true);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(x + 92, y + 2, w, 10);
  ctx.fillStyle = color;
  ctx.fillRect(x + 92, y + 2, w * Math.max(0, Math.min(1, value01)), 10);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 92, y + 2, w, 10);
}

/** A simple top-down car for the shop's left column. */
function drawShopCar(ctx, car, cx, cy) {
  if (!car) {
    text(ctx, 'No car — steal one and come back', cx, cy, 15, PALETTE.muted, 'center');
    return;
  }
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-Math.PI / 2);
  const l = car.length * 2.4;
  const w = car.width * 2.4;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(-l / 2 + 4, -w / 2 + 5, l, w);
  ctx.fillStyle = car.color;
  ctx.beginPath();
  ctx.roundRect(-l / 2, -w / 2, l, w, 10);
  ctx.fill();
  ctx.fillStyle = '#1d2733';
  ctx.beginPath();
  ctx.roundRect(-l / 2 + l * 0.28, -w / 2 + 6, l * 0.34, w - 12, 6);
  ctx.fill();
  ctx.fillStyle = '#ffe9a8';
  ctx.fillRect(l / 2 - 4, -w / 2 + 4, 4, 7);
  ctx.fillRect(l / 2 - 4, w / 2 - 11, 4, 7);
  ctx.restore();
}

export function drawShop(ctx, game) {
  const items = game.shopItems;
  const player = game.player;
  ctx.fillStyle = 'rgba(6, 10, 14, 0.78)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  const w = 1020;
  const h = 580;
  const x0 = (VIEW.width - w) / 2;
  const y0 = (VIEW.height - h) / 2;
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(x0, y0, w, h);
  ctx.fillStyle = PALETTE.panelEdge;
  ctx.fillRect(x0, y0, w, 3);
  text(ctx, 'SOLMAR GARAGE', VIEW.width / 2, y0 + 18, 30, PALETTE.text, 'center', true);
  text(ctx, `Cash: $${player.cash}`, VIEW.width / 2, y0 + 56, 17, PALETTE.cash, 'center', true);

  // Left column: the car in hand and its stats.
  const lx = x0 + 36;
  let ly = y0 + 110;
  text(ctx, player.car ? player.car.model.name.toUpperCase() : 'ON FOOT', lx, ly, 18, '#ffd23f', 'left', true);
  ly += 30;
  drawShopCar(ctx, player.car, lx + 190, ly + 80);
  ly += 170;
  const car = player.car;
  const top = car ? car.model.top + (car.topBoost || 0) : 0;
  statBar(ctx, 'SPEED', top / 460, lx, ly, 260, '#ff9a4a'); ly += 26;
  statBar(ctx, 'ACCEL', car ? 0.45 + player.carUpgrades.tune * 0.15 : 0, lx, ly, 260, '#ffd23f'); ly += 26;
  statBar(ctx, 'ARMOUR', car ? (100 - (car.damage || 0) / 2.2) / 100 * 0.6 + player.carUpgrades.armour * 0.13 : 0, lx, ly, 260, '#7fb8ff'); ly += 26;
  statBar(ctx, 'HANDLING', car ? 0.5 + player.carUpgrades.tune * 0.1 : 0, lx, ly, 260, '#5fd67f'); ly += 40;
  text(ctx, `Engine tune: tier ${player.carUpgrades.tune}/3${player.carUpgrades.tune >= 3 ? ' · NITRO' : ''}`, lx, ly, 14, PALETTE.text, 'left'); ly += 22;
  text(ctx, `Armour plating: tier ${player.carUpgrades.armour}/3`, lx, ly, 14, PALETTE.text, 'left'); ly += 22;
  text(ctx, `Condition: ${car ? Math.max(0, Math.round(100 - (car.damage || 0) / 2.2)) : 100}%`, lx, ly, 14, PALETTE.text, 'left'); ly += 34;
  text(ctx, 'Upgrades are fitted to every car you take.', lx, ly, 12, PALETTE.muted, 'left');

  // Right column: the catalogue, keys 1–9 then 0.
  const rx = x0 + 480;
  let ry = y0 + 110;
  items.forEach((item, i) => {
    const key = i === 9 ? '0' : `${i + 1}`;
    const isAmmo = !!(item.owned && item.owned(game));
    const maxed = !!(item.tier && item.tier(game) >= item.maxTier);
    const price = isAmmo ? item.ammoPrice : item.price;
    const afford = player.cash >= price && !maxed;
    const label = maxed ? `${key}. ${item.name} — MAX` : `${key}. ${item.name} — $${price}`;
    text(ctx, label, rx, ry, 17, afford ? PALETTE.text : '#7a6a6a', 'left', true);
    const desc = isAmmo ? `Ammo pack +${item.ammoPack}` : item.desc;
    text(ctx, desc, rx + 300, ry + 2, 13, PALETTE.muted, 'left');
    ry += 40;
  });
  text(ctx, 'Press 1–9, 0 to buy · B or Esc to leave', VIEW.width / 2, y0 + h - 36, 15, PALETTE.muted, 'center');
}

/** The pause screen: full map, story checklist, career stats, save panel. */
export function drawPauseMap(ctx, game) {
  ctx.fillStyle = 'rgba(6,10,14,0.82)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  text(ctx, 'SOLMAR — PAUSED', VIEW.width / 2, 18, 30, '#ffd23f', 'center', true);
  text(ctx, clockLabel(game), VIEW.width / 2, 54, 15, PALETTE.muted, 'center');

  // The map, left two-thirds.
  const mx = 30;
  const my = 92;
  const mw = 800;
  const mh = 560;
  const sx = (x) => mx + (x / CITY.width) * mw;
  const sy = (y) => my + (y / CITY.height) * mh;
  panel(ctx, mx - 6, my - 6, mw + 12, mh + 12);
  ctx.fillStyle = '#5d7a52';
  ctx.fillRect(mx, my, mw, mh);
  // District tints + names.
  const quads = [
    { d: 0, x: 0, y: 0, w: 1600, h: 1200 },
    { d: 1, x: 1600, y: 0, w: 1600, h: 1200 },
    { d: 2, x: 0, y: 1200, w: 1600, h: CITY.oceanY - 1200 },
    { d: 3, x: 1600, y: 1200, w: 1600, h: CITY.oceanY - 1200 },
    { d: 4, x: 0, y: CITY.oceanY, w: CITY.width, h: CITY.height - CITY.oceanY },
  ];
  for (const q of quads) {
    const dist = districtAt(game.city, q.x + q.w / 2, q.y + q.h / 2);
    ctx.fillStyle = dist.tint;
    ctx.fillRect(sx(q.x), sy(q.y), sx(q.x + q.w) - sx(q.x), sy(q.y + q.h) - sy(q.y));
  }
  ctx.fillStyle = PALETTE.sea;
  ctx.fillRect(mx, sy(CITY.oceanY + 70), mw, my + mh - sy(CITY.oceanY + 70));
  ctx.strokeStyle = '#3a3f47';
  ctx.lineWidth = 3;
  for (const rx of game.city.lines.vertical) {
    ctx.beginPath(); ctx.moveTo(sx(rx), my); ctx.lineTo(sx(rx), sy(CITY.oceanY)); ctx.stroke();
  }
  for (const ry of game.city.lines.horizontal) {
    ctx.beginPath(); ctx.moveTo(mx, sy(ry)); ctx.lineTo(mx + mw, sy(ry)); ctx.stroke();
  }
  // District names with standing — in each quadrant's top-left corner,
  // clear of the place labels (The Strand keeps its centred name).
  for (const q of quads) {
    const dist = districtAt(game.city, q.x + q.w / 2, q.y + q.h / 2);
    const standing = Math.round(game.meta.districts[dist.id].standing);
    if (dist.id === 'strand') {
      text(ctx, `${dist.name.toUpperCase()} ${standing}%`, sx(q.x + q.w / 2), sy(q.y + q.h / 2) - 8, 15, 'rgba(255,255,255,0.85)', 'center', true);
    } else {
      text(ctx, `${dist.name.toUpperCase()} ${standing}%`, sx(q.x) + 10, sy(q.y) + 8, 15, 'rgba(255,255,255,0.85)', 'left', true);
    }
  }
  // Places.
  for (const key of Object.keys(game.city.places)) {
    const p = game.city.places[key];
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath();
    ctx.arc(sx(p.x), sy(p.y), 4, 0, Math.PI * 2);
    ctx.fill();
    text(ctx, p.label, sx(p.x) + 8, sy(p.y) - 6, 11, 'rgba(255,255,255,0.8)', 'left');
  }
  // Search zone, objective, police, player.
  if (game.searchState === 'searching' && game.lastKnown) {
    ctx.strokeStyle = 'rgba(255, 90, 74, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx(game.lastKnown.x), sy(game.lastKnown.y), Math.max(8, game.searchZone * (mw / CITY.width)), 0, Math.PI * 2);
    ctx.stroke();
  }
  const obj = game.currentObjective;
  if (obj && obj.target) {
    ctx.fillStyle = PALETTE.waypoint;
    ctx.beginPath();
    ctx.arc(sx(obj.target.x), sy(obj.target.y), 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.font = `700 12px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('!', sx(obj.target.x), sy(obj.target.y) - 6);
  }
  for (const car of game.cars) {
    if (car.driver !== 'police') continue;
    ctx.fillStyle = '#3b82ff';
    ctx.fillRect(sx(car.x) - 3, sy(car.y) - 3, 6, 6);
  }
  const px = game.player.car ? game.player.car.x : game.player.x;
  const py = game.player.car ? game.player.car.y : game.player.y;
  ctx.save();
  ctx.translate(sx(px), sy(py));
  ctx.rotate(game.player.angle);
  ctx.fillStyle = PALETTE.waypoint;
  ctx.beginPath();
  ctx.moveTo(9, 0); ctx.lineTo(-6, -6); ctx.lineTo(-6, 6); ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Right panel: story checklist, career stats, save.
  const rx = 872;
  let ry = 92;
  panel(ctx, rx - 10, ry - 6, 386, 572);
  text(ctx, 'STORY — 12 MISSIONS', rx, ry, 17, '#ffd23f', 'left', true);
  ry += 28;
  MISSIONS.forEach((m, i) => {
    const done = game.stats.missionsDone > i;
    const current = game.mission && game.mission.def.id === m.id && !game.mission.done;
    const mark = done ? '✓' : current ? '▶' : '·';
    const col = done ? '#5fd67f' : current ? '#ffd23f' : PALETTE.muted;
    text(ctx, `${mark} ${m.id}. ${m.name}`, rx, ry, 14, col, 'left', current);
    text(ctx, `$${m.payout}`, rx + 366, ry, 14, col, 'right');
    ry += 21;
  });
  ry += 14;
  text(ctx, 'CAREER', rx, ry, 17, '#ffd23f', 'left', true);
  ry += 28;
  const rank = rankFor(game.meta.respect);
  const stats = [
    ['Cash', `$${game.player.cash}`],
    ['Respect', `${rank.current.name} (${game.meta.respect} XP)`],
    ['Missions done', `${game.stats.missionsDone}/12`],
    ['Cars stolen', `${game.stats.carsStolen}`],
    ['Packages', `${game.packagesCollected || 0}/10`],
    ['Races won', `${game.stats.racesWon || 0}`],
    ['Taxi fares', `${game.stats.faresDone || 0}`],
    ['Wanted', `${game.wanted} star${game.wanted === 1 ? '' : 's'}`],
  ];
  for (const [k, v] of stats) {
    text(ctx, k, rx, ry, 14, PALETTE.muted, 'left');
    text(ctx, v, rx + 366, ry, 14, PALETTE.text, 'right', true);
    ry += 21;
  }
  ry += 14;
  text(ctx, 'SAVE', rx, ry, 17, '#ffd23f', 'left', true);
  ry += 28;
  text(ctx, game.hasSave || game.stats.missionsDone > 0 ? `Slot 1 — Mission ${Math.min(12, game.stats.missionsDone + 1)}, $${game.player.cash} (auto-saved)` : 'Slot 1 — new game (auto-saves after each mission)', rx, ry, 13, PALETTE.text, 'left');
  text(ctx, 'Press P or Enter to resume', VIEW.width / 2, VIEW.height - 40, 17, PALETTE.waypoint, 'center', true);
}
