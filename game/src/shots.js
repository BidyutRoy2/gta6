// The deterministic screenshot scenes behind ?shot=cover|shootout|garage|
// pause|street|mission|race|menu. Each one builds the same world from the
// same seed and then places the player, the cars, the police and the
// mission by hand, so the frame is what a real moment of play looks like
// and the same seed always gives the same frame. No wall clock, no
// unseeded random: the scenes are pure functions of the game state they
// set up. Every shot shows several systems at once: the four submitted
// frames are cover (sunset 5-star chase with dispatch + spotlight),
// shootout (night, weapon slots, dialogue, search zone), garage (the
// shop screen) and pause (the map + story checklist).
import { SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { startMission } from './missions.js';
import { addWanted, refreshDispatch } from './police.js';
import { spawnPoliceCar } from './traffic.js';
import { grantWeapon } from './combat.js';
import { say, updateRadio } from './meta.js';
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
    if (spot.tactic) car.tactic = spot.tactic;
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

/** Common staging: the radio line, dispatch list and clock the HUD reads. */
function finishStaging(game) {
  game.radioNow = updateRadio(game, 0);
  refreshDispatch(game);
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
    // Mission 12's finale at sunset, 5 stars, in the Vega Phantom: five
    // PD units with tactics on the dispatch panel, the helicopter's
    // spotlight cone on the car, Vega's getaway car ahead, the respect
    // rank, the radio line and the district label — the whole game in
    // one frame.
    game.clockMinutes = 18 * 60 + 35; // 18:35, golden hour
    startMission(game, 11);
    game.mission.timer = 0; // the chase shot has no countdown
    if (game.mission.targetCar) {
      game.mission.targetCar.x = 1150;
      game.mission.targetCar.y = 850;
      game.mission.targetCar.angle = 0;
    }
    const phantom = putPlayerInCar(game, 1400, 1000, 0, 7, 260);
    phantom.damage = 28;
    addWanted(game, 5);
    placePolice(game, [
      { x: 1180, y: 1000, angle: 0, speed: 280, tactic: 'RAMMING' },
      { x: 1400, y: 820, angle: Math.PI / 2, speed: 250, tactic: 'PURSUIT' },
      { x: 1620, y: 1120, angle: Math.PI, speed: 240, tactic: 'FLANKING' },
      { x: 1020, y: 860, angle: 0.4, speed: 260, tactic: 'PURSUIT' },
      { x: 1900, y: 1000, angle: Math.PI, speed: 0, tactic: 'ROADBLOCK' },
    ]);
    // The helicopter overhead, spotlight on the Phantom.
    game.heli = {
      angle: -0.6, radius: 280,
      x: 1400 + Math.cos(-0.6) * 280, y: 1000 + Math.sin(-0.6) * 280,
      rotor: 0.6, spotX: 1400, spotY: 1000,
    };
    game.spotlit = true;
    game.searchState = 'in-sight';
    game.lastKnown = { x: 1400, y: 1000 };
    game.meta.respect = 720; // Shot Caller
    game.meta.districts.northgate.standing = 68;
    game.meta.radio.station = 0;
    game.packagesCollected = 3;
    game.packages.forEach((p, i) => { p.collected = i < 3; });
    game.player.health = 82;
    game.player.cash = 20850;
    grantWeapon(game.player, 1, 24);
    grantWeapon(game.player, 2, 60);
    game.player.weaponSlot = 2;
    game.banner = null;
    say(game, 'dispatch', 'Air unit deployed. Keep the light on her.', 99);
    centreCamera(game);
    finishStaging(game);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'shootout') {
    // Night, on foot, SMG in hand: the weapon slots along the bottom,
    // Mira's briefing in the dialogue box, the PD searching a shrinking
    // zone around the last place they saw Dash, lamp glow and lit
    // windows. Mission 10's yacht job is the objective.
    game.clockMinutes = 22 * 60 + 15; // 22:15, full night
    startMission(game, 9);
    game.banner = null;
    game.player.x = 1000;
    game.player.y = 800;
    game.player.angle = -0.5;
    game.player.cash = 12450;
    game.player.health = 64;
    grantWeapon(game.player, 1, 24);
    grantWeapon(game.player, 2, 132);
    grantWeapon(game.player, 3, 12);
    game.player.weaponSlot = 2; // SMG in hand
    game.player.ammoByWeapon[2] = 87;
    game.wanted = 2;
    game.searchState = 'searching';
    game.hiddenT = 4;
    game.searchZone = 330;
    game.searchClearIn = 9;
    game.lastKnown = { x: 1000, y: 800 };
    game.meta.respect = 460; // Fixer
    game.meta.districts.northgate.standing = 57;
    placePolice(game, [
      { x: 1750, y: 700, angle: Math.PI, speed: 190, tactic: 'SEARCHING' },
      { x: 300, y: 950, angle: 0.3, speed: 190, tactic: 'SEARCHING' },
    ]);
    // A burst just fired: bullets in flight, sparks off a parked car.
    parkCar(game, 1150, 760, 0.2, 0);
    game.bullets.push(
      { x: 1040, y: 780, vx: 700, vy: -120, life: 0.5, damage: 16, fromPolice: false },
      { x: 1075, y: 774, vx: 700, vy: -120, life: 0.5, damage: 16, fromPolice: false },
      { x: 1110, y: 768, vx: 700, vy: -120, life: 0.5, damage: 16, fromPolice: false },
    );
    game.sparks.push({ x: 1148, y: 762, t: 0.4 });
    game.player.shootT = 0.05;
    say(game, 'mira', "The ledger's on Vega's yacht tonight. Go quiet, Dash — the PD is sweeping the block.", 99);
    centreCamera(game);
    finishStaging(game);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'garage') {
    // The garage shop screen: the Sunset Roadster on the lift with its
    // stat bars, tune tier 2 and armour tier 1 fitted, the full
    // catalogue with prices, cash in hand.
    game.clockMinutes = 11 * 60 + 20;
    startMission(game, 7);
    game.banner = null;
    const roadster = putPlayerInCar(game, 1000, 620, 0, 6, 0);
    roadster.damage = 40;
    game.player.carUpgrades.tune = 2;
    game.player.carUpgrades.armour = 1;
    roadster.topBoost = 40;
    roadster.gripBoost = 1.16;
    game.player.cash = 12450;
    game.player.health = 91;
    grantWeapon(game.player, 1, 48);
    grantWeapon(game.player, 2, 120);
    game.shopOpen = true;
    game.meta.respect = 310; // Wheelman
    centreCamera(game);
    finishStaging(game);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'pause') {
    // The pause map mid-story: eleven missions done, mission 12 live,
    // district standing on the map, career stats and the save panel.
    game.clockMinutes = 16 * 60 + 40;
    startMission(game, 11);
    game.banner = null;
    game.stats.missionsDone = 11;
    game.stats.carsStolen = 14;
    game.stats.racesWon = 2;
    game.stats.faresDone = 6;
    game.packagesCollected = 7;
    game.packages.forEach((p, i) => { p.collected = i < 7; });
    game.player.cash = 20850;
    game.player.health = 88;
    game.meta.respect = 845; // Shot Caller
    game.meta.districts.northgate.standing = 62;
    game.meta.districts.marina.standing = 55;
    game.meta.districts.cannery.standing = 71;
    game.meta.districts.harbor.standing = 48;
    game.meta.districts.strand.standing = 66;
    game.hasSave = true;
    game.wanted = 2;
    game.searchState = 'searching';
    game.searchZone = 300;
    game.lastKnown = { x: 1400, y: 1000 };
    putPlayerInCar(game, 1400, 1000, 0, 7, 0);
    placePolice(game, [
      { x: 1750, y: 900, angle: Math.PI, speed: 190, tactic: 'SEARCHING' },
    ]);
    centreCamera(game);
    finishStaging(game);
    return { screen: SCREEN_PAUSED };
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
    finishStaging(game);
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
    finishStaging(game);
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
    grantWeapon(game.player, 1, 24);
    game.player.cash = 20850;
    game.mission.timer = 212;
    putPlayerInCar(game, 1400, 1470, -Math.PI / 2, 7, 0);
    placePolice(game, [
      { x: 1150, y: 1400, angle: 0, speed: 240, tactic: 'PURSUIT' },
      { x: 1650, y: 1400, angle: Math.PI, speed: 240, tactic: 'RAMMING' },
    ]);
    for (let i = 0; i < 6; i += 1) {
      if (game.packages[i]) game.packages[i].collected = true;
    }
    game.packagesCollected = 6;
    stagePackage(game, 6, 950, 1300);
    game.message = 'Corner Vega at the vault — hold 10s';
    game.messageT = 99;
    centreCamera(game);
    finishStaging(game);
    return { screen: SCREEN_PLAY };
  }
  // menu: the title screen over the living city.
  game.player.x = 1000;
  game.player.y = 600;
  centreCamera(game);
  finishStaging(game);
  return { screen: SCREEN_TITLE };
}
