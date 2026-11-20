// Drawing only: the city, the cars, the people, the player and the effects,
// then the HUD, then the menu screens. The camera follows the player and the
// 1280x720 view is scaled to the window. Nothing here changes game state.
import { CITY, CLOCK, FONT, PALETTE, RACE, VIEW } from './config.js';
import { drawHud, drawPauseMap, drawShop } from './hud.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_BUSTED = 'busted';
export const SCREEN_WASTED = 'wasted';
export const SCREEN_COMPLETE = 'complete';

// The minimap sits top-right (x 1066–1270, y 10–166); world-space labels
// keep out of a margin around it, so no ground text ever runs underneath
// it. Shot 3 in v0.2.0 crowded the "Solmar Garage" label against this edge.
const MINI_KEEPOUT = { x: VIEW.width - 230, y: 0, w: 230, h: 180 };
// The top-left HUD cluster and the bottom-centre objective/dialogue zone
// are keepouts too: a place label under the HUD reads as a bug.
const HUD_KEEPOUTS = [
  MINI_KEEPOUT,
  { x: 0, y: 0, w: 330, h: 230 },
  { x: 330, y: VIEW.height - 160, w: VIEW.width - 660, h: 160 },
];

function rectHitsMinimap(x, y, w, h) {
  return x + w > MINI_KEEPOUT.x && x < MINI_KEEPOUT.x + MINI_KEEPOUT.w
    && y + h > MINI_KEEPOUT.y && y < MINI_KEEPOUT.y + MINI_KEEPOUT.h;
}

function rectHitsHud(x, y, w, h) {
  return HUD_KEEPOUTS.some((k) => x + w > k.x && x < k.x + k.w && y + h > k.y && y < k.y + k.h);
}

/** The phase of the city day from the clock: dawn, day, sunset, night. */
export function dayPhase(game) {
  const m = game.clockMinutes;
  if (m >= CLOCK.sunsetStart && m < CLOCK.nightStart) return 'sunset';
  if (m >= CLOCK.nightStart || m < CLOCK.dawnStart) return 'night';
  if (m >= CLOCK.dawnStart && m < CLOCK.dayStart) return 'dawn';
  return 'day';
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0, dpr: 1 };
  // The day phase for the frame being drawn; car headlights read it.
  let framePhase = 'day';

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    view.dpr = ratio;
    canvas.width = Math.round(window.innerWidth * ratio);
    canvas.height = Math.round(window.innerHeight * ratio);
    view.scale = Math.min(canvas.width / VIEW.width, canvas.height / VIEW.height);
    view.x = (canvas.width - VIEW.width * view.scale) / 2;
    view.y = (canvas.height - VIEW.height * view.scale) / 2;
  }

  function text(value, x, y, size, color, align, bold) {
    ctx.font = `${bold ? '700 ' : ''}${size}px ${FONT}`;
    ctx.fillStyle = color;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(value, x, y);
  }

  function worldToScreen(wx, wy, cam) {
    return { x: wx - cam.x, y: wy - cam.y };
  }

  function drawGround(game, cam) {
    const x0 = Math.max(0, cam.x - 40);
    const y0 = Math.max(0, cam.y - 40);
    const x1 = Math.min(CITY.width, cam.x + VIEW.width + 40);
    const y1 = Math.min(CITY.height, cam.y + VIEW.height + 40);
    // Grass blocks.
    ctx.fillStyle = PALETTE.grass;
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    // Ocean and beach at the south edge.
    ctx.fillStyle = PALETTE.sand;
    ctx.fillRect(x0, Math.max(y0, CITY.oceanY), x1 - x0, Math.max(0, y1 - Math.max(y0, CITY.oceanY)));
    ctx.fillStyle = PALETTE.sea;
    ctx.fillRect(x0, Math.max(y0, CITY.oceanY + 70), x1 - x0, Math.max(0, y1 - Math.max(y0, CITY.oceanY + 70)));
    ctx.fillStyle = PALETTE.seaDeep;
    for (let wx = Math.floor(x0 / 90) * 90; wx < x1; wx += 90) {
      ctx.fillRect(wx, CITY.oceanY + 110, 46, 5);
      ctx.fillRect(wx + 30, CITY.oceanY + 160, 46, 5);
    }
    // Roads.
    ctx.fillStyle = PALETTE.road;
    for (const rx of game.city.lines.vertical) {
      if (rx + 48 < x0 || rx - 48 > x1) continue;
      ctx.fillRect(rx - 48, Math.max(y0, 0), 96, Math.min(y1, CITY.oceanY) - Math.max(y0, 0));
    }
    for (const ry of game.city.lines.horizontal) {
      if (ry + 48 < y0 || ry - 48 > y1) continue;
      ctx.fillRect(Math.max(x0, 0), ry - 48, Math.min(x1, CITY.width) - Math.max(x0, 0), 96);
    }
    // Sidewalks: lighter bands at the road edges.
    ctx.fillStyle = PALETTE.sidewalk;
    for (const rx of game.city.lines.vertical) {
      if (rx + 62 < x0 || rx - 62 > x1) continue;
      ctx.fillRect(rx - 62, Math.max(y0, 0), 12, Math.min(y1, CITY.oceanY) - Math.max(y0, 0));
      ctx.fillRect(rx + 50, Math.max(y0, 0), 12, Math.min(y1, CITY.oceanY) - Math.max(y0, 0));
    }
    for (const ry of game.city.lines.horizontal) {
      if (ry + 62 < y0 || ry - 62 > y1) continue;
      ctx.fillRect(Math.max(x0, 0), ry - 62, Math.min(x1, CITY.width) - Math.max(x0, 0), 12);
      ctx.fillRect(Math.max(x0, 0), ry + 50, Math.min(x1, CITY.width) - Math.max(x0, 0), 12);
    }
    // Lane dashes.
    ctx.fillStyle = PALETTE.lane;
    for (const rx of game.city.lines.vertical) {
      if (rx < x0 || rx > x1) continue;
      for (let wy = Math.floor(y0 / 60) * 60; wy < Math.min(y1, CITY.oceanY); wy += 60) {
        ctx.fillRect(rx - 2, wy, 4, 28);
      }
    }
    for (const ry of game.city.lines.horizontal) {
      if (ry < y0 || ry > y1) continue;
      for (let wx = Math.floor(x0 / 60) * 60; wx < x1; wx += 60) {
        ctx.fillRect(wx, ry - 2, 28, 4);
      }
    }
    // Named places: a painted label on the ground — skipped when it would
    // run under the minimap (the minimap already shows the place).
    ctx.font = `700 13px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    for (const key of Object.keys(game.city.places)) {
      const p = game.city.places[key];
      if (p.x < x0 - 80 || p.x > x1 + 80 || p.y < y0 - 30 || p.y > y1 + 30) continue;
      ctx.fillStyle = 'rgba(10,16,22,0.6)';
      const w = ctx.measureText(p.label).width + 14;
      const sx = p.x - cam.x;
      const sy = p.y - cam.y;
      if (rectHitsHud(sx - w / 2, sy - 22, w, 18)) continue;
      ctx.fillRect(p.x - w / 2, p.y - 22, w, 18);
      ctx.fillStyle = '#ffe9a8';
      ctx.fillText(p.label, p.x, p.y - 19);
    }
  }

  function drawBuildings(game, cam) {
    for (const b of game.city.buildings) {
      if (b.x + b.w < cam.x - 20 || b.x > cam.x + VIEW.width + 20) continue;
      if (b.y + b.h < cam.y - 20 || b.y > cam.y + VIEW.height + 20) continue;
      // Wall shadow, then the roof.
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fillRect(b.x + 6, b.y + 8, b.w, b.h);
      ctx.fillStyle = PALETTE.buildingWall;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = b.roof;
      ctx.fillRect(b.x + 5, b.y + 5, b.w - 10, b.h - 10);
      // Windows in rows; taller buildings get more rows. After dark a
      // deterministic subset of windows is lit warm.
      const cols = Math.max(2, Math.floor(b.w / 26));
      const rows = Math.min(b.floors + 1, Math.max(2, Math.floor(b.h / 26)));
      const dark = framePhase === 'night' || framePhase === 'sunset';
      for (let c = 0; c < cols; c += 1) {
        for (let r = 0; r < rows; r += 1) {
          const lit = dark && ((b.x * 7 + b.y * 13 + c * 31 + r * 17) % 5 === 0);
          ctx.fillStyle = lit ? '#ffd98a' : PALETTE.glass;
          ctx.fillRect(b.x + 10 + c * ((b.w - 20) / cols), b.y + 10 + r * ((b.h - 20) / rows), 12, 9);
        }
      }
      if (b.tall) {
        ctx.fillStyle = '#d8c95a';
        ctx.fillRect(b.x + b.w / 2 - 2, b.y + 6, 4, 4);
      }
    }
    // Palms: trunk and a star of fronds.
    for (const palm of game.city.palms) {
      if (palm.x < cam.x - 30 || palm.x > cam.x + VIEW.width + 30) continue;
      if (palm.y < cam.y - 30 || palm.y > cam.y + VIEW.height + 30) continue;
      ctx.strokeStyle = PALETTE.trunk;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(palm.x, palm.y);
      ctx.lineTo(palm.x + palm.lean * 14, palm.y - 16 * palm.size);
      ctx.stroke();
      ctx.fillStyle = PALETTE.palm;
      const topX = palm.x + palm.lean * 14;
      const topY = palm.y - 16 * palm.size;
      for (let f = 0; f < 6; f += 1) {
        const a = (f / 6) * Math.PI * 2 + palm.lean;
        ctx.beginPath();
        ctx.ellipse(topX + Math.cos(a) * 9, topY + Math.sin(a) * 6, 11, 4, a, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Street lamps — with a warm glow pool after dark.
    const dark = framePhase === 'night' || framePhase === 'sunset';
    for (const lamp of game.city.lamps) {
      if (lamp.x < cam.x - 60 || lamp.x > cam.x + VIEW.width + 60) continue;
      if (lamp.y < cam.y - 60 || lamp.y > cam.y + VIEW.height + 60) continue;
      if (dark) {
        ctx.fillStyle = 'rgba(255, 217, 138, 0.10)';
        ctx.beginPath();
        ctx.arc(lamp.x, lamp.y, 52, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 217, 138, 0.14)';
        ctx.beginPath();
        ctx.arc(lamp.x, lamp.y, 26, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#2b2f36';
      ctx.fillRect(lamp.x - 2, lamp.y - 2, 4, 14);
      ctx.fillStyle = '#ffe9a8';
      ctx.beginPath();
      ctx.arc(lamp.x, lamp.y - 4, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawCarShape(car) {
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    const l = car.length;
    const w = car.width;
    // Headlight cone after dark: a soft wedge ahead of the car.
    if (framePhase === 'night' || framePhase === 'sunset') {
      ctx.fillStyle = 'rgba(255, 233, 168, 0.13)';
      ctx.beginPath();
      ctx.moveTo(l / 2, 0);
      ctx.lineTo(l / 2 + 110, -34);
      ctx.lineTo(l / 2 + 110, 34);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(-l / 2 + 3, -w / 2 + 4, l, w);
    ctx.fillStyle = car.color;
    ctx.beginPath();
    ctx.roundRect(-l / 2, -w / 2, l, w, 7);
    ctx.fill();
    // Cabin and glass.
    ctx.fillStyle = '#1d2733';
    ctx.beginPath();
    ctx.roundRect(-l / 2 + l * 0.28, -w / 2 + 4, l * 0.34, w - 8, 4);
    ctx.fill();
    ctx.fillStyle = 'rgba(127,184,201,0.85)';
    ctx.fillRect(-l / 2 + l * 0.32, -w / 2 + 6, l * 0.12, w - 12);
    // Headlights and tail lights.
    ctx.fillStyle = '#ffe9a8';
    ctx.fillRect(l / 2 - 3, -w / 2 + 3, 3, 5);
    ctx.fillRect(l / 2 - 3, w / 2 - 8, 3, 5);
    ctx.fillStyle = '#ff3b30';
    ctx.fillRect(-l / 2, -w / 2 + 3, 3, 5);
    ctx.fillRect(-l / 2, w / 2 - 8, 3, 5);
    if (car.police) {
      // Light bar, alternating red and blue.
      const phase = Math.floor(car.siren * 4) % 2;
      ctx.fillStyle = phase === 0 ? PALETTE.policeLight : PALETTE.policeLight2;
      ctx.fillRect(-6, -w / 2 + 2, 12, 6);
      ctx.fillStyle = phase === 0 ? PALETTE.policeLight2 : PALETTE.policeLight;
      ctx.fillRect(-6, w / 2 - 8, 12, 6);
      ctx.fillStyle = '#f4efe4';
      ctx.font = '700 9px ' + FONT;
      ctx.textAlign = 'center';
      ctx.fillText('PD', 0, -w / 2 - 6);
    }
    ctx.restore();
  }

  function drawPed(ped) {
    const bob = Math.sin(ped.walk) * 2;
    ctx.save();
    ctx.translate(ped.x, ped.y + bob * 0.3);
    if (!ped.alive) {
      ctx.rotate(Math.PI / 2);
      ctx.fillStyle = ped.shirt;
      ctx.beginPath();
      ctx.ellipse(0, 0, 14, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
    // Shadow, legs, body, head.
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, 8, 9, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2b2f36';
    ctx.fillRect(-5, 2, 4, 8);
    ctx.fillRect(1, 2, 4, 8);
    ctx.fillStyle = ped.shirt;
    ctx.beginPath();
    ctx.roundRect(-7, -8, 14, 12, 4);
    ctx.fill();
    ctx.fillStyle = ped.skin;
    ctx.beginPath();
    ctx.arc(0, -13, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(0, -15, 6, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawPlayer(game) {
    const player = game.player;
    if (player.car) return; // the car drawing covers the driver
    const bob = (player.moving ? Math.sin(game.time * 14) * 2 : 0);
    ctx.save();
    ctx.translate(player.x, player.y + bob * 0.3);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 9, 11, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(player.angle + Math.PI / 2);
    // Dana "Dash" Cole: red jacket, dark jeans, cap.
    ctx.fillStyle = '#22262e';
    ctx.fillRect(-6, 2, 5, 9);
    ctx.fillRect(1, 2, 5, 9);
    ctx.fillStyle = PALETTE.player;
    ctx.beginPath();
    ctx.roundRect(-8, -9, 16, 13, 5);
    ctx.fill();
    ctx.fillStyle = PALETTE.playerShirt;
    ctx.fillRect(-3, -9, 6, 13);
    ctx.fillStyle = '#e8b88a';
    ctx.beginPath();
    ctx.arc(0, -14, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c94f42';
    ctx.beginPath();
    ctx.arc(0, -16, 6.5, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-6.5, -17, 13, 3);
    // Pistol in hand when armed; fist out when punching.
    if (player.hasGun) {
      ctx.fillStyle = '#1d2733';
      ctx.fillRect(6, -6, 9, 3);
    }
    if (player.punchAnim > 0) {
      ctx.fillStyle = '#e8b88a';
      ctx.beginPath();
      ctx.arc(14, -4, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawWaypoint(game, cam) {
    const obj = game.currentObjective;
    if (!obj || !obj.target) return;
    const t = obj.target;
    const px = game.player.car ? game.player.car.x : game.player.x;
    const py = game.player.car ? game.player.car.y : game.player.y;
    const d = Math.hypot(t.x - px, t.y - py);
    const pulse = 1 + Math.sin(game.time * 5) * 0.15;
    // Ground ring at the target.
    ctx.strokeStyle = PALETTE.waypoint;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(t.x, t.y, 46 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,210,63,0.18)';
    ctx.beginPath();
    ctx.arc(t.x, t.y, 46 * pulse, 0, Math.PI * 2);
    ctx.fill();
    // Floating diamond above it — below the ring when the target sits near
    // the top edge, so the diamond is never clipped by the frame.
    const bob = Math.sin(game.time * 3) * 5;
    const diamondY = (t.y - cam.y - 58 + bob < 16) ? t.y + 58 - bob : t.y - 58 + bob;
    ctx.save();
    ctx.translate(t.x, diamondY);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = PALETTE.waypoint;
    ctx.fillRect(-11, -11, 22, 22);
    ctx.fillStyle = '#111';
    ctx.fillRect(-6, -6, 12, 12);
    ctx.restore();
    // Edge arrow when the target is off-screen.
    const sp = worldToScreen(t.x, t.y, cam);
    if (sp.x < 30 || sp.x > VIEW.width - 30 || sp.y < 30 || sp.y > VIEW.height - 30) {
      const cx = VIEW.width / 2;
      const cy = VIEW.height / 2;
      const angle = Math.atan2(sp.y - cy, sp.x - cx);
      const ax = cx + Math.cos(angle) * (VIEW.width / 2 - 50);
      const ay = cy + Math.sin(angle) * (VIEW.height / 2 - 50);
      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(angle);
      ctx.fillStyle = PALETTE.waypoint;
      ctx.beginPath();
      ctx.moveTo(16, 0); ctx.lineTo(-10, -11); ctx.lineTo(-10, 11); ctx.closePath();
      ctx.fill();
      ctx.restore();
      text(`${Math.round(d)}m`, ax, ay + 18, 13, PALETTE.waypoint, 'center', true);
    }
  }

  function drawEffects(game) {
    for (const spark of game.sparks) {
      ctx.strokeStyle = '#ffd23f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(spark.x - 8, spark.y);
      ctx.lineTo(spark.x + 8, spark.y);
      ctx.moveTo(spark.x, spark.y - 8);
      ctx.lineTo(spark.x, spark.y + 8);
      ctx.stroke();
    }
    for (const boom of game.explosions) {
      const r = 40 + (0.6 - boom.t) * 90;
      ctx.fillStyle = `rgba(255, ${Math.floor(120 + boom.t * 200)}, 40, ${boom.t})`;
      ctx.beginPath();
      ctx.arc(boom.x, boom.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // Bullets as bright tracer lines.
    ctx.strokeStyle = '#ffe9a8';
    ctx.lineWidth = 3;
    for (const b of game.bullets) {
      ctx.beginPath();
      ctx.moveTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }

  function drawPanel(title, lines, prompt, accent) {
    const w = 660;
    const h = 160 + lines.length * 30;
    const x = (VIEW.width - w) / 2;
    const y = (VIEW.height - h) / 2;
    ctx.fillStyle = PALETTE.panel;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = accent || PALETTE.panelEdge;
    ctx.fillRect(x, y, w, 4);
    text(title, VIEW.width / 2, y + 34, 42, PALETTE.text, 'center', true);
    lines.forEach((line, i) => {
      text(line, VIEW.width / 2, y + 104 + i * 30, 18, PALETTE.muted, 'center');
    });
    text(prompt, VIEW.width / 2, y + h - 44, 19, PALETTE.waypoint, 'center', true);
  }

  function drawActivityMarkers(game, cam) {
    // A floating label over a ring: it drops below the ring when the ring
    // sits near the top edge (never clipped), and it is skipped when it
    // would run under the minimap. Shot 3 in v0.2.0 clipped the TAXI label
    // at the top edge.
    function ringLabel(value, rx, ry, color) {
      // No label for a ring whose centre is off-frame: the ring itself is
      // barely (or not) visible, and the label would float on its own (the
      // title screen used to show a lone "RACE" at the top edge).
      const sx0 = rx - cam.x;
      const sy0 = ry - cam.y;
      if (sx0 < 0 || sx0 > VIEW.width || sy0 < 0 || sy0 > VIEW.height) return;
      ctx.font = `700 14px ${FONT}`;
      const w = ctx.measureText(value).width;
      let ly = ry - 58;
      if (ly - cam.y < 16) ly = ry + 52;
      // Never run off the bottom either.
      if (ly - cam.y > VIEW.height - 24) ly = ry - 58;
      // Clamp horizontally so the label never clips at a frame edge.
      let lx = rx;
      if (lx - cam.x - w / 2 < 8) lx = cam.x + w / 2 + 8;
      if (lx - cam.x + w / 2 > VIEW.width - 8) lx = cam.x + VIEW.width - w / 2 - 8;
      if (rectHitsHud(lx - cam.x - w / 2, ly - cam.y, w, 16)) return;
      text(value, lx, ly, 14, color, 'center', true);
    }

    // Taxi fare markers: a green ring at the waiting passenger, a gold
    // ring at the drop-off.
    const taxi = game.taxi;
    if (taxi) {
      if (taxi.state === 'pickup' && taxi.pickup) {
        const p = taxi.pickup;
        const pulse = 1 + Math.sin(game.time * 5) * 0.15;
        ctx.strokeStyle = '#5fd67f';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 46 * pulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(95, 214, 127, 0.18)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 46 * pulse, 0, Math.PI * 2);
        ctx.fill();
        ringLabel('TAXI', p.x, p.y, '#5fd67f');
      }
      if (taxi.state === 'dropoff' && taxi.dropoff) {
        const p = taxi.dropoff;
        const pulse = 1 + Math.sin(game.time * 5) * 0.15;
        ctx.strokeStyle = PALETTE.waypoint;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 46 * pulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,210,63,0.18)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 46 * pulse, 0, Math.PI * 2);
        ctx.fill();
        ringLabel('DROP-OFF', p.x, p.y, PALETTE.waypoint);
      }
    }
    // Street race: the white start ring is always on the road; the next
    // checkpoint ring only shows mid-race. Once every checkpoint is hit the
    // start ring turns gold — it is the finish line.
    const race = game.race;
    if (race) {
      const s = RACE.start;
      const checkpoints = RACE.checkpoints;
      const pulse = 1 + Math.sin(game.time * 5) * 0.15;
      const isFinish = race.state === 'active' && race.next >= checkpoints.length;
      ctx.strokeStyle = isFinish ? PALETTE.waypoint : '#f4efe4';
      ctx.lineWidth = 4;
      ctx.globalAlpha = race.state === 'active' ? 1 : 0.55;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 46 * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ringLabel(isFinish ? 'FINISH' : 'RACE', s.x, s.y, isFinish ? PALETTE.waypoint : '#f4efe4');
      if (race.state === 'active' && race.next < checkpoints.length) {
        const cp = checkpoints[race.next];
        ctx.strokeStyle = '#7fb8ff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(cp.x, cp.y, 56 * pulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(127, 184, 255, 0.18)';
        ctx.beginPath();
        ctx.arc(cp.x, cp.y, 56 * pulse, 0, Math.PI * 2);
        ctx.fill();
        ringLabel(`CHECKPOINT ${race.next + 1}`, cp.x, cp.y, '#7fb8ff');
      }
    }
    // Hidden packages: small gold crates with a glint.
    if (game.packages) {
      for (const pkg of game.packages) {
        if (pkg.collected) continue;
        if (pkg.x < cam.x - 30 || pkg.x > cam.x + VIEW.width + 30) continue;
        if (pkg.y < cam.y - 30 || pkg.y > cam.y + VIEW.height + 30) continue;
        const glint = 0.6 + Math.sin(game.time * 3 + pkg.id) * 0.4;
        ctx.fillStyle = `rgba(255, 210, 63, ${0.25 + glint * 0.25})`;
        ctx.beginPath();
        ctx.arc(pkg.x, pkg.y, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e8b93a';
        ctx.fillRect(pkg.x - 8, pkg.y - 7, 16, 14);
        ctx.fillStyle = '#8a6a1a';
        ctx.fillRect(pkg.x - 8, pkg.y - 1.5, 16, 3);
        ctx.fillRect(pkg.x - 1.5, pkg.y - 7, 3, 14);
      }
    }
  }

  function drawTitle(game) {
    // The city keeps living behind the title: traffic drives, peds walk.
    const cam = game.camera;
    ctx.save();
    ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    ctx.translate(-cam.x, -cam.y);
    drawGround(game, cam);
    drawBuildings(game, cam);
    drawActivityMarkers(game, cam);
    for (const car of game.cars) drawCarShape(car);
    for (const ped of game.peds) drawPed(ped);
    ctx.restore();
    // Sun-soaked gradient wash over the scene.
    ctx.fillStyle = 'rgba(255, 190, 110, 0.12)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(6, 10, 14, 0.55)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Title block, in view coordinates.
    ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    text('SOLMAR', VIEW.width / 2, 56, 96, '#ffd23f', 'center', true);
    text('A SUN-SOAKED OPEN-WORLD CRIME STORY', VIEW.width / 2, 156, 20, PALETTE.text, 'center', true);
    text('Dana "Dash" Cole • Vega Transport • The Marlin Club • Solmar PD', VIEW.width / 2, 186, 16, PALETTE.muted, 'center');
    const lines = [
      'Twelve missions. Steal cars, lose the cops, take down Harlan Vega.',
      'WASD / arrows to move & drive • E to steal a car • Click to shoot • F to punch',
      '1–5 switch weapons • T taxi fares • B garage shop • R radio • Shift nitro',
      'P pause map • M mute • Street races pay up to $1,450 a race',
    ];
    if (game.hasSave) {
      lines.push(`Save found: Mission ${game.saveMission} · $${game.saveCash || 0} — Enter continues, S starts new`);
    } else {
      lines.push('5 weapon slots · respect ranks · 5 districts · live police dispatch');
      lines.push('Taxi fares, street races and 10 hidden packages fill the city between jobs');
    }
    drawPanel('WELCOME TO SOLMAR', lines, game.hasSave ? 'Enter — continue    S — new game' : 'Press Enter or click to start', '#ffd23f');
  }

  function drawHeli(game) {
    const h = game.heli;
    if (!h) return;
    // The spotlight: a translucent cone from the aircraft to the lit
    // circle on the ground, which tracks the player with a lag.
    const spotX = typeof h.spotX === 'number' ? h.spotX : h.x;
    const spotY = typeof h.spotY === 'number' ? h.spotY : h.y;
    ctx.fillStyle = 'rgba(255, 240, 190, 0.22)';
    ctx.beginPath();
    ctx.moveTo(h.x, h.y);
    const coneA = Math.atan2(spotY - h.y, spotX - h.x);
    const coneSpread = 0.32;
    const coneLen = Math.hypot(spotX - h.x, spotY - h.y) + 40;
    ctx.lineTo(h.x + Math.cos(coneA - coneSpread) * coneLen, h.y + Math.sin(coneA - coneSpread) * coneLen);
    ctx.lineTo(h.x + Math.cos(coneA + coneSpread) * coneLen, h.y + Math.sin(coneA + coneSpread) * coneLen);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 240, 190, 0.28)';
    ctx.beginPath();
    ctx.ellipse(spotX, spotY, 150, 105, 0, 0, Math.PI * 2);
    ctx.fill();
    // Shadow on the ground, offset down-sun from the body.
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(h.x + 28, h.y + 34, 46, 19, 0, 0, Math.PI * 2);
    ctx.fill();
    // Body: a dark PD helicopter, nose along its orbit, white stripe.
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.rotate(h.angle + Math.PI / 2);
    ctx.fillStyle = '#232d3a';
    ctx.beginPath();
    ctx.ellipse(0, 0, 46, 21, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8e8e8';
    ctx.fillRect(-25, -5, 50, 10);
    ctx.fillStyle = '#7fb8c9';
    ctx.beginPath();
    ctx.ellipse(27, 0, 14, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#232d3a';
    ctx.fillRect(-64, -5, 25, 10);
    ctx.fillStyle = '#f4efe4';
    ctx.font = '700 11px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText('PD AIR', 0, -14);
    ctx.restore();
    // Rotor: a spinning bar above the body.
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.rotate(h.rotor || 0);
    ctx.strokeStyle = 'rgba(232,232,232,0.85)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-64, 0);
    ctx.lineTo(64, 0);
    ctx.stroke();
    ctx.restore();
  }

  function drawWorldFrame(game) {
    const cam = game.camera;
    const shakeX = game.shake > 0 ? (Math.sin(game.time * 60) * 4 * game.shake) : 0;
    const shakeY = game.shake > 0 ? (Math.cos(game.time * 47) * 4 * game.shake) : 0;
    ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    ctx.save();
    ctx.translate(-cam.x + shakeX, -cam.y + shakeY);
    drawGround(game, cam);
    drawWaypoint(game, cam);
    drawActivityMarkers(game, cam);
    drawBuildings(game, cam);
    for (const car of game.cars) drawCarShape(car);
    for (const ped of game.peds) drawPed(ped);
    drawPlayer(game);
    drawEffects(game);
    drawHeli(game);
    ctx.restore();
    // The light of the hour: warm day wash, orange sunset, dark blue
    // night, pale dawn. The HUD is drawn after, so it stays readable.
    if (framePhase === 'night') {
      ctx.fillStyle = 'rgba(10, 16, 40, 0.42)';
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    } else if (framePhase === 'sunset') {
      const grad = ctx.createLinearGradient(0, 0, 0, VIEW.height);
      grad.addColorStop(0, 'rgba(255, 140, 60, 0.26)');
      grad.addColorStop(1, 'rgba(255, 140, 60, 0.10)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    } else if (framePhase === 'dawn') {
      ctx.fillStyle = 'rgba(255, 180, 120, 0.08)';
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    } else {
      // Warm sun wash, stronger at the top of the frame.
      const grad = ctx.createLinearGradient(0, 0, 0, VIEW.height);
      grad.addColorStop(0, 'rgba(255, 200, 120, 0.10)');
      grad.addColorStop(1, 'rgba(255, 200, 120, 0.0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    }
    drawHud(ctx, game);
    if (game.shopOpen) drawShop(ctx, game);
  }

  /** Paint one frame for the screen the game is on. */
  function draw(game, screen) {
    framePhase = dayPhase(game);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0b0f14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (screen === SCREEN_TITLE) {
      drawTitle(game);
      return;
    }
    drawWorldFrame(game);
    if (screen === SCREEN_PAUSED) {
      drawPauseMap(ctx, game);
    } else if (screen === SCREEN_BUSTED) {
      ctx.fillStyle = 'rgba(6,10,14,0.6)';
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
      drawPanel('BUSTED', ['Solmar PD took you in. The mission restarts.', `Cash kept: $${game.player.cash}`, 'The Marlin Club is not impressed.'], 'Press Enter to retry the mission');
    } else if (screen === SCREEN_WASTED) {
      ctx.fillStyle = 'rgba(6,10,14,0.6)';
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
      drawPanel('WASTED', ['Dash is down. The clinic patches you up.', `Cash kept: $${game.player.cash}`, 'The city does not wait.'], 'Press Enter to retry the mission');
    } else if (screen === SCREEN_COMPLETE) {
      ctx.fillStyle = 'rgba(6,10,14,0.6)';
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
      drawPanel('SOLMAR LEGEND', ['You cracked the bank, took the ledger off Vega\'s yacht,', 'and brought it home to the Marlin Club.', `Final cash: $${game.player.cash} • All 12 missions complete`, 'Dana "Dash" Cole — legend of Solmar.'], 'Press Enter to keep playing the city');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, resize };
}
