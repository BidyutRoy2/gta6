// The deterministic screenshot scenes behind ?shot=cover|street|mission|menu.
// Each one builds the same world from the same seed and then places the
// player, the cars, the police and the mission by hand, so the frame is what
// a real moment of play looks like and the same seed always gives the same
// frame. No wall clock, no unseeded random: the scenes are pure functions
// of the game state they set up.
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

/**
 * Set `game` to the named scene and return the screen to draw over it.
 * Unknown names stage the menu.
 */
export function stageShot(name, game) {
  game.time = 0;
  game.banner = null;
  game.messageT = 0;
  if (name === 'cover') {
    // A police chase at 3 stars: Dash driving, three PD cars closing in,
    // the minimap, the wanted stars and a live mission objective on the HUD.
    startMission(game, 3);
    game.mission.timer = 0; // the chase shot has no countdown
    putPlayerInCar(game, 1400, 1000, 0, 3, 260);
    addWanted(game, 3);
    placePolice(game, [
      { x: 1180, y: 1000, angle: 0, speed: 280 },
      { x: 1400, y: 820, angle: Math.PI / 2, speed: 250 },
      { x: 1620, y: 1120, angle: Math.PI, speed: 240 },
    ]);
    game.player.health = 82;
    game.player.cash = 1450;
    game.banner = null;
    game.message = 'Lose the cops — get back to 0 stars';
    game.messageT = 99;
    centreCamera(game);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'street') {
    // On foot in the city: traffic on the roads, locals on the sidewalks.
    game.player.x = 1090;
    game.player.y = 700;
    game.player.angle = 0;
    game.player.cash = 250;
    game.message = 'Explore Solmar — steal a car with E, or take a courier job';
    game.messageT = 99;
    centreCamera(game);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'mission') {
    // Mission 3 in progress: the waypoint, the timer and the payout all visible.
    startMission(game, 2);
    game.player.x = 2200;
    game.player.y = 1500;
    game.player.angle = Math.PI / 2;
    game.player.hasGun = true;
    game.player.ammo = 24;
    game.player.cash = 650;
    game.mission.timer = 142;
    game.banner = null;
    putPlayerInCar(game, 2200, 1500, Math.PI / 2, 0, 0);
    game.message = 'Collect the package at Harbor Dock 7';
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
