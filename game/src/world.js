// The city of Solmar: a road grid, the blocks between the roads, the buildings
// and palms that fill them, and the collision tests the rest of the game asks.
// Everything is built once from the seeded random, so the same seed always
// builds the same city, and the minimap draws from this same data.
import { CITY, PALETTE } from './config.js';

export function roadLines() {
  const vertical = [];
  const horizontal = [];
  for (let x = CITY.firstRoad; x < CITY.width; x += CITY.roadGap) vertical.push(x);
  for (let y = CITY.firstRoad; y < CITY.oceanY; y += CITY.roadGap) horizontal.push(y);
  return { vertical, horizontal };
}

function pointOnRoad(rng, lines) {
  if (rng() < 0.5) {
    const x = lines.vertical[Math.floor(rng() * lines.vertical.length)];
    const y = 60 + rng() * (CITY.oceanY - 120);
    return { x, y };
  }
  const y = lines.horizontal[Math.floor(rng() * lines.horizontal.length)];
  const x = 60 + rng() * (CITY.width - 120);
  return { x, y };
}

function nearestRoadPoint(x, y, lines) {
  let best = null;
  let bestD = Infinity;
  for (const rx of lines.vertical) {
    const d = Math.abs(x - rx);
    if (d < bestD) { bestD = d; best = { x: rx, y, axis: 'v' }; }
  }
  for (const ry of lines.horizontal) {
    const d = Math.abs(y - ry);
    if (d < bestD) { bestD = d; best = { x, y: ry, axis: 'h' }; }
  }
  return best;
}

export function buildCity(rng) {
  const lines = roadLines();
  const half = CITY.roadWidth / 2 + 14;
  const buildings = [];
  const palms = [];
  const lamps = [];
  const roofs = PALETTE.buildingRoof;

  // One building per block, sometimes two, placed inside the block's inset.
  for (let bx = 0; bx < 7; bx += 1) {
    for (let by = 0; by < 5; by += 1) {
      const x0 = CITY.firstRoad + bx * CITY.roadGap + half;
      const y0 = CITY.firstRoad + by * CITY.roadGap + half;
      const x1 = x0 + CITY.roadGap - 2 * half;
      const y1 = y0 + CITY.roadGap - 2 * half;
      if (y0 > CITY.oceanY - 200) continue;
      const twin = rng() < 0.35;
      const count = twin ? 2 : 1;
      for (let k = 0; k < count; k += 1) {
        const w = 90 + rng() * 110;
        const h = 80 + rng() * 100;
        const px = twin ? x0 + k * ((x1 - x0) / 2) + 8 : x0 + (x1 - x0 - w) / 2;
        const py = y0 + (y1 - y0 - h) / 2;
        buildings.push({
          x: px, y: py, w, h,
          roof: roofs[Math.floor(rng() * roofs.length)],
          floors: 1 + Math.floor(rng() * 4),
          tall: rng() < 0.22,
        });
      }
      // Palms along the block's edges, never on a road.
      const palmCount = 2 + Math.floor(rng() * 3);
      for (let p = 0; p < palmCount; p += 1) {
        palms.push({
          x: x0 + 14 + rng() * (x1 - x0 - 28),
          y: y0 + 14 + rng() * (y1 - y0 - 28),
          lean: (rng() - 0.5) * 0.5,
          size: 0.8 + rng() * 0.5,
        });
      }
    }
  }

  // Street lamps at every intersection corner.
  for (const rx of lines.vertical) {
    for (const ry of lines.horizontal) {
      lamps.push({ x: rx + CITY.roadWidth / 2 + 6, y: ry - CITY.roadWidth / 2 - 6 });
    }
  }
  // A palm-lined beach strip along the ocean.
  for (let x = 80; x < CITY.width; x += 130) {
    palms.push({ x: x + (rng() - 0.5) * 40, y: CITY.oceanY + 24 + rng() * 40, lean: (rng() - 0.5) * 0.4, size: 0.9 + rng() * 0.5 });
  }

  const city = {
    lines, buildings, palms, lamps,
    // Named places the missions point at.
    places: {
      depot: { x: 600, y: 200, label: 'Vega Depot' },
      garage: { x: 1000, y: 600, label: 'Solmar Garage' },
      club: { x: 2200, y: 1000, label: 'The Marlin Club' },
      dock: { x: 2600, y: 1800, label: 'Harbor Dock 7' },
      vault: { x: 1400, y: 1400, label: 'Vega Vault' },
      bank: { x: 1800, y: 600, label: 'Solmar Bank' },
      boat: { x: 2800, y: 2080, label: 'Escape Boat' },
      hospital: { x: 600, y: 1400, label: 'Solmar Clinic' },
      dropA: { x: 2600, y: 600, label: 'Drop: Marina Flats' },
      dropB: { x: 1000, y: 1800, label: 'Drop: Old Cannery' },
    },
  };

  return city;
}

/** True when a circle at (x, y) with radius r touches a building or the map edge. */
export function hitsBuilding(city, x, y, r) {
  if (x < r || y < r || x > CITY.width - r || y > CITY.height - r) return true;
  for (const b of city.buildings) {
    if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return true;
  }
  return false;
}

/** Push a circle out of any building it overlaps; returns true when it moved. */
export function resolveBuilding(city, body) {
  let moved = false;
  for (const b of city.buildings) {
    const cx = Math.max(b.x, Math.min(body.x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(body.y, b.y + b.h));
    const dx = body.x - cx;
    const dy = body.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < body.radius * body.radius) {
      const d = Math.sqrt(d2) || 0.001;
      const push = body.radius - d;
      body.x += (dx / d) * push;
      body.y += (dy / d) * push;
      moved = true;
    }
  }
  body.x = Math.max(body.radius, Math.min(CITY.width - body.radius, body.x));
  body.y = Math.max(body.radius, Math.min(CITY.height - body.radius, body.y));
  return moved;
}

/** True when the point is on a road surface (not sidewalk, not a block). */
export function onRoad(city, x, y) {
  const half = CITY.roadWidth / 2;
  for (const rx of city.lines.vertical) if (Math.abs(x - rx) <= half && y < CITY.oceanY) return true;
  for (const ry of city.lines.horizontal) if (Math.abs(y - ry) <= half) return true;
  return false;
}

export function nearestRoad(city, x, y) {
  return nearestRoadPoint(x, y, city.lines);
}

export function randomRoadPoint(city, rng) {
  return pointOnRoad(rng, city.lines);
}
