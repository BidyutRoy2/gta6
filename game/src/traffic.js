// Cars: parked cars to steal, traffic that drives the road grid, the player's
// own driving physics, and car-to-car and car-to-building collisions.
import { CAR, CAR_MODELS, CITY, POLICE_MODEL, TRAFFIC_COUNT } from './config.js';
import { hitsBuilding, onRoad, randomRoadPoint, resolveBuilding } from './world.js';

let nextCarId = 1;

export function makeCar(x, y, angle, model, police) {
  return {
    id: nextCarId,
    x, y, angle, speed: 0,
    model,
    color: police ? POLICE_MODEL.color : model.color,
    length: police ? POLICE_MODEL.length : model.length,
    width: police ? POLICE_MODEL.width : model.width,
    radius: CAR.radius,
    police: !!police,
    parked: false,
    driver: null, // 'player' | 'traffic' | 'police' | null
    // Traffic AI state:
    axis: 'h', dir: 1, cruise: 90,
    brake: 0,
    damage: 0,
    siren: 0,
  };
}

export function spawnCars(city, rng) {
  const cars = [];
  // Parked cars along road edges, angled to the kerb. The first two are
  // fixed so the city always has the new Sunset Roadster and a working
  // Solmar Taxi to steal; the roll is still drawn so the seed stream — and
  // every car after these — stays exactly where it was.
  for (let i = 0; i < 16; i += 1) {
    const p = randomRoadPoint(city, rng);
    const vertical = rng() < 0.5;
    const roll = Math.floor(rng() * CAR_MODELS.length);
    const model = i === 0 ? CAR_MODELS[6] : i === 1 ? CAR_MODELS[1] : CAR_MODELS[roll];
    const x = vertical ? p.x + (rng() < 0.5 ? -34 : 34) : p.x;
    const y = vertical ? p.y : p.y + (rng() < 0.5 ? -34 : 34);
    if (hitsBuilding(city, x, y, 30)) continue;
    const car = makeCar(x, y, vertical ? Math.PI / 2 : 0, model, false);
    car.parked = true;
    cars.push(car);
  }
  // Moving traffic on the roads.
  for (let i = 0; i < TRAFFIC_COUNT; i += 1) {
    const p = randomRoadPoint(city, rng);
    const model = CAR_MODELS[Math.floor(rng() * CAR_MODELS.length)];
    const car = makeCar(p.x, p.y, rng() < 0.5 ? 0 : Math.PI / 2, model, false);
    car.driver = 'traffic';
    car.axis = rng() < 0.5 ? 'h' : 'v';
    car.dir = rng() < 0.5 ? 1 : -1;
    car.cruise = 70 + rng() * 60;
    car.speed = car.cruise;
    cars.push(car);
  }
  return cars;
}

export function spawnPoliceCar(city, rng, nearX, nearY) {
  // Spawn on a road some distance from the player, facing roughly toward them.
  for (let tries = 0; tries < 12; tries += 1) {
    const p = randomRoadPoint(city, rng);
    const dx = p.x - nearX;
    const dy = p.y - nearY;
    const dist = Math.hypot(dx, dy);
    if (dist > 850 && dist < 1400) {
      const car = makeCar(p.x, p.y, Math.atan2(dy, dx), POLICE_MODEL, true);
      car.driver = 'police';
      car.speed = 200;
      return car;
    }
  }
  const p = randomRoadPoint(city, rng);
  const car = makeCar(p.x, p.y, 0, POLICE_MODEL, true);
  car.driver = 'police';
  car.speed = 200;
  return car;
}

/** The car nearest (x, y) within range, ignoring ones already driven. */
export function nearestCar(cars, x, y, range) {
  let best = null;
  let bestD = range;
  for (const car of cars) {
    if (car.driver === 'player') continue;
    const d = Math.hypot(car.x - x, car.y - y);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}

function carOverlaps(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dist = Math.hypot(dx, dy);
  return dist < (a.length + b.length) / 2 - 6 && dist < 70;
}

/** Drive one car with player input: throttle -1..1, steer -1..1.
 * Garage upgrades ride on the car: topBoost (tune), gripBoost (tune),
 * nitroBoost (tier-3 nitro while it burns). */
export function drivePlayerCar(car, throttle, steer, dt) {
  const top = car.model.top + (car.topBoost || 0) + (car.nitroBoost || 0);
  if (throttle > 0) car.speed += CAR.accel * throttle * dt * (car.nitroBoost ? 1.7 : 1);
  else if (throttle < 0) {
    if (car.speed > 5) car.speed -= CAR.brake * dt;
    else car.speed -= CAR.reverseAccel * dt;
  } else {
    car.speed -= car.speed * CAR.drag * dt;
    if (Math.abs(car.speed) < 4) car.speed = 0;
  }
  car.speed = Math.max(-CAR.maxReverse, Math.min(top, car.speed));
  const turnRate = CAR.grip * (car.gripBoost || 1) * Math.min(1, Math.abs(car.speed) / 120);
  car.angle += steer * turnRate * dt * (car.speed >= 0 ? 1 : -1);
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  car.x = nx;
  car.y = ny;
}

/** Traffic cars follow their road; at an intersection they may turn. */
export function updateTraffic(city, cars, rng, dt) {
  for (const car of cars) {
    if (car.driver !== 'traffic') continue;
    const lane = 22;
    if (car.axis === 'h') {
      car.angle = car.dir > 0 ? 0 : Math.PI;
      car.y += (car.dir > 0 ? lane : -lane) * 0; // lane kept by target below
      const targetY = nearestLaneY(city, car.y, car.dir);
      car.y += (targetY - car.y) * Math.min(1, 3 * dt);
      car.x += car.dir * car.speed * dt;
      car.speed += (car.cruise - car.speed) * Math.min(1, dt);
      if (atIntersection(city, car.x, car.y)) maybeTurn(car, city, rng);
    } else {
      car.angle = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      const targetX = nearestLaneX(city, car.x, car.dir);
      car.x += (targetX - car.x) * Math.min(1, 3 * dt);
      car.y += car.dir * car.speed * dt;
      car.speed += (car.cruise - car.speed) * Math.min(1, dt);
      if (atIntersection(city, car.x, car.y)) maybeTurn(car, city, rng);
    }
    // Keep traffic inside the drivable city, off the beach.
    if (car.x < 60) { car.x = 60; car.axis = 'v'; car.dir = 1; }
    if (car.x > CITY.width - 60) { car.x = CITY.width - 60; car.axis = 'v'; car.dir = -1; }
    if (car.y < 60) { car.y = 60; car.axis = 'h'; car.dir = 1; }
    if (car.y > CITY.oceanY - 60) { car.y = CITY.oceanY - 60; car.axis = 'h'; car.dir = -1; }
  }
}

function nearestLaneY(city, y, dir) {
  // Lane centre for a horizontal road: right-hand side of travel.
  let best = y;
  let bestD = Infinity;
  for (const ry of city.lines.horizontal) {
    const laneY = ry + (dir > 0 ? 22 : -22);
    const d = Math.abs(y - laneY);
    if (d < bestD) { bestD = d; best = laneY; }
  }
  return bestD < 200 ? best : y;
}

function nearestLaneX(city, x, dir) {
  let best = x;
  let bestD = Infinity;
  for (const rx of city.lines.vertical) {
    const laneX = rx + (dir > 0 ? -22 : 22);
    const d = Math.abs(x - laneX);
    if (d < bestD) { bestD = d; best = laneX; }
  }
  return bestD < 200 ? best : x;
}

function atIntersection(city, x, y) {
  const half = CITY.roadWidth / 2;
  let onV = false;
  let onH = false;
  for (const rx of city.lines.vertical) if (Math.abs(x - rx) < half) onV = true;
  for (const ry of city.lines.horizontal) if (Math.abs(y - ry) < half) onH = true;
  return onV && onH;
}

function maybeTurn(car, city, rng) {
  // Only decide once per intersection: re-roll only when centred on it.
  const cx = nearestCentre(city.lines.vertical, car.axis === 'h' ? car.x : car.y);
  const cy = nearestCentre(city.lines.horizontal, car.axis === 'h' ? car.y : car.x);
  const along = car.axis === 'h' ? car.x : car.y;
  const centre = car.axis === 'h' ? cx : cy;
  if (Math.abs(along - centre) > 14) return;
  if (rng() < 0.55) return; // most cars go straight
  if (car.axis === 'h') {
    car.axis = 'v';
    car.dir = rng() < 0.5 ? 1 : -1;
  } else {
    car.axis = 'h';
    car.dir = rng() < 0.5 ? 1 : -1;
  }
  // Snap to the crossing centre so the turn looks clean.
  if (car.axis === 'v') car.x = cx;
  else car.y = cy;
}

function nearestCentre(lines, value) {
  let best = lines[0];
  let bestD = Infinity;
  for (const line of lines) {
    const d = Math.abs(value - line);
    if (d < bestD) { bestD = d; best = line; }
  }
  return best;
}

/** Resolve car-vs-building and car-vs-car contact. Returns crash events. */
export function resolveCarCollisions(city, cars, onCrash) {
  for (const car of cars) {
    if (car.driver === 'player' || car.driver === 'police') {
      if (hitsBuilding(city, car.x, car.y, 24)) {
        // Step back along the heading and scrub speed: a wall stop, not a pass-through.
        car.x -= Math.cos(car.angle) * car.speed * (1 / 60);
        car.y -= Math.sin(car.angle) * car.speed * (1 / 60);
        if (Math.abs(car.speed) > 140 && onCrash) onCrash(car, Math.abs(car.speed));
        car.speed *= 0.45;
        resolveBuilding(city, car);
      }
    }
  }
  for (let i = 0; i < cars.length; i += 1) {
    for (let j = i + 1; j < cars.length; j += 1) {
      const a = cars[i];
      const b = cars[j];
      if (a.driver === null && b.driver === null) continue;
      if (!carOverlaps(a, b)) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 1;
      const push = 34 - d / 2;
      const nx = dx / d;
      const ny = dy / d;
      if (a.driver === 'player' && b.driver === 'traffic') {
        b.x += nx * push;
        b.y += ny * push;
        b.speed = Math.max(0, b.speed - 30);
        if (onCrash) onCrash(a, Math.abs(a.speed));
      } else if (b.driver === 'player' && a.driver === 'traffic') {
        a.x -= nx * push;
        a.y -= ny * push;
        a.speed = Math.max(0, a.speed - 30);
        if (onCrash) onCrash(b, Math.abs(b.speed));
      } else {
        a.x -= nx * push * 0.5;
        a.y -= ny * push * 0.5;
        b.x += nx * push * 0.5;
        b.y += ny * push * 0.5;
        const tmp = a.speed;
        a.speed = b.speed * 0.5;
        b.speed = tmp * 0.5;
      }
    }
  }
}

export function carIsOnRoad(city, car) {
  return onRoad(city, car.x, car.y);
}
