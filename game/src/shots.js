// The deterministic screenshot scenes behind ?shot=cover|street|mission|menu.
// Each one builds the same world from the same seed and then places the
// player, the cars, the police and the mission by hand, so the frame is what
// a real moment of play looks like and the same seed always gives the same
// frame. No wall clock, no unseeded random: the scenes are pure functions
// of the game state they set up. Every shot shows several systems at once:
// chase + wanted + minimap + mission + taxi fare + packages where they fit.
import { SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { startMission } from './missions.js';
import { addWanted } from './police.js';
import { spawnPoliceCar } from './traffic.js';
import { CAR_MODELS } from './config.js';

function putPlayerInCar(game, x, y, angle, modelIndex, speed) {
  const car = {
    id: 500, x, y, angle, speed,
    model: CAR_MODELS[modelIndex], color: CAR_MODELS[modelIndex].color,
    length: CAR_MODELS[modelIndex].length, width: CAR_MODELS[modelIndex].width,
    radius: 26, police: false, parked: false, driver: 'player',
    axis: 'h', dir: 1, cruise: 0, brake: 0, damage: 0, siren: 0,
    stolenByPlayer: true,
  };
  game.cars.push(car);
  game.player.car = car;
  game.player.x = x;
  game.player.y = y;
  game.player.angle = angle;
  return car;
}

function parkCar(game, x, y, angle, modelIndex) {
  const car = {
    id: 501, x, y, angle, speed: 0,
    model: CAR_MODELS[modelIndex], color: CAR_MODELS[modelIndex].color,
    length: CAR_MODELS[modelIndex].length, width: CAR_MODELS[modelIndex].width,
    radius: 26, police: false, parked: true, driver: null,
    axis: 'h', dir: 1, cruise: 0, brake: 0, damage: 0, siren: 0,
  };
  game.cars.push(car);
  return car;
}

function placePolice(game, spots) {
  for (const spot of spots) {
    const car = spawnPoliceCar(game.city, game.rng, game.player.x, game.player.y);
    car.x = spot.x;
    car.y = spot.y;
    car.angle = spot.angle;
    car.speed = spot.speed;
    game.cars.push(car);
  }
}

function centreCamera(game) {
  const px = game.player.car ? game.player.car.x : game.player.x;
  const py = game.player.car ? game.player.car.y : game.player.y;
  game.camera.x = Math.max(0, Math.min(3200 - 1280, px - 640));
  game.camera.y = Math.max(0, Math.min(2400 - 720, py - 360));
}

/** A staged taxi fare: a waiting passenger, or one already aboard. */
function stageTaxi(game, state, at, fare) {
  if (state === 'pickup') {
    game.taxi.state = 'pickup';
    game.taxi.pickup = { key: at.key, x: at.x, y: at.y, label: at.label };
    game.taxi.dropoff = null;
    game.taxi.fare = 0;
  } else {
    game.taxi.state = 'dropoff';
    game.taxi.pickup = null;
    game.taxi.dropoff = { key: at.key, x: at.x, y: at.y, label: at.label };
    game.taxi.fare = fare;
  }
}

/** Move one uncollected package to a fixed, visible spot in the frame. */
function stagePackage(game, index, x, y) {
  const pkg = game.packages[index];
  if (pkg) {
    pkg.x = x;
    pkg.y = y;
    pkg.collected = false;
  }
}

/**
 * Set `game` to the named scene and return the screen to draw over it.
 * Unknown names stage the menu.
 */
export function stageShot(name, game) {
  game.time = 0;
  game.banner = null;
  game.messageT = 0;
  if (name === 'cover') {
    // Mission 12's finale chase at 3 stars in the new Vega Phantom: Vega's
    // getaway car ahead, three PD cars closing in, the police helicopter
    // overhead, the wanted stars, the minimap, a taxi fare in progress
    // and a hidden package.
    startMission(game, 11);
    game.mission.timer = 0; // the chase shot has no countdown
    // Vega's car, placed ahead of the player so the chase ring is in frame.
    if (game.mission.targetCar) {
      game.mission.targetCar.x = 1150;
      game.mission.targetCar.y = 850;
      game.mission.targetCar.angle = 0;
    }
    putPlayerInCar(game, 1400, 1000, 0, 7, 260);
    addWanted(game, 3);
    placePolice(game, [
      { x: 1180, y: 1000, angle: 0, speed: 280 },
      { x: 1400, y: 820, angle: Math.PI / 2, speed: 250 },
      { x: 1620, y: 1120, angle: Math.PI, speed: 240 },
    ]);
    stageTaxi(game, 'dropoff', { key: 'club', x: 1800, y: 1000, label: 'The Marlin Club' }, 140);
    stagePackage(game, 0, 1400, 1150);
    // The police helicopter overhead: the heat is 3 stars, so it is up
    // and circling — placed by hand so the staged frame always shows it.
    game.heli = {
      angle: -0.6, radius: 280,
      x: 1400 + Math.cos(-0.6) * 280, y: 1000 + Math.sin(-0.6) * 280,
      rotor: 0.6,
    };
    game.player.health = 82;
    game.player.cash = 20850;
    game.banner = null;
    game.message = "Tail Vega's getaway car — stay within range 15s";
    game.messageT = 99;
    centreCamera(game);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'street') {
    // On foot by the Solmar Garage: traffic on the roads, locals on the
    // sidewalks, a parked Vega Phantom, a taxi fare waiting at the
    // garage, a hidden package on the road, and the shop prompt.
    game.player.x = 1040;
    game.player.y = 660;
    game.player.angle = 0;
    game.player.cash = 250;
    game.nearGarage = true; // the shop prompt is computed in the live loop; stage it here
    parkCar(game, 1000, 820, Math.PI / 2, 7);
    stageTaxi(game, 'pickup', { key: 'garage', x: 1000, y: 600, label: 'Solmar Garage' });
    stagePackage(game, 1, 1000, 700);
    game.message = 'Explore Solmar — steal a car with E, hail a taxi fare with T, find the hidden packages';
    game.messageT = 99;
    centreCamera(game);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'race') {
    // Mid-race in the Vega Phantom on the east road: checkpoint 2's blue
    // ring ahead, the race timer running, 143 MPH on the clock. No
    // mission, no taxi — the race is the whole frame.
    putPlayerInCar(game, 2600, 1100, Math.PI / 2, 7, 260);
    game.race = { state: 'active', next: 1, timer: 87, cooldown: 0 };
    game.player.health = 100;
    game.player.cash = 1850;
    game.message = 'Race — hit the blue checkpoint ring, then the next one';
    game.messageT = 99;
    centreCamera(game);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'mission') {
    // Mission 12's vault hold under 4-star heat: the hold-progress bar
    // mid-fill, the $7,500 payout, the pistol, two PD cars closing in —
    // the most dramatic beat in the game. Taxi and race are off, so only
    // timer + payout show top-right.
    startMission(game, 11);
    game.banner = null;
    game.mission.step = 1;
    game.mission.waitT = 5;
    game.waitProgress = 0.5;
    game.mission.heatRaised = true;
    game.wanted = 4;
    game.player.hasGun = true;
    game.player.ammo = 24;
    game.player.cash = 20850;
    game.mission.timer = 212;
    putPlayerInCar(game, 1400, 1470, -Math.PI / 2, 7, 0);
    placePolice(game, [
      { x: 1150, y: 1400, angle: 0, speed: 240 },
      { x: 1650, y: 1400, angle: Math.PI, speed: 240 },
    ]);
    for (let i = 0; i < 6; i += 1) {
      if (game.packages[i]) game.packages[i].collected = true;
    }
    game.packagesCollected = 6;
    stagePackage(game, 6, 950, 1300);
    game.message = 'Corner Vega at the vault — hold 10s';
    game.messageT = 99;
    centreCamera(game);
    return { screen: SCREEN_PLAY };
  }
  // menu: the title screen over the living city.
  game.player.x = 1000;
  game.player.y = 600;
  centreCamera(game);
  return { screen: SCREEN_TITLE };
}
