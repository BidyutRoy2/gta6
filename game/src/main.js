// SOLMAR boot and the one loop: input is read every frame, the world advances
// in fixed 1/60 s steps, and the renderer paints what is there. The game moves
// between title, play, paused, busted, wasted and complete screens, and saves
// progress to localStorage after every mission.
//
// ?seed=N fixes the city. ?shot=cover|street|mission|menu (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, CAR, CAR_MODELS, CITY, DEFAULT_SEED, PLAYER, SAVE_KEY, STEP, VIEW, WANTED } from './config.js';
import { createRandom } from './random.js';
import { buildCity, resolveBuilding } from './world.js';
import { drivePlayerCar, makeCar, nearestCar, resolveCarCollisions, spawnCars } from './traffic.js';
import { carHitsPeds, scarePeds, spawnPedestrians, updatePedestrians } from './pedestrians.js';
import { updateTraffic } from './traffic.js';
import { addWanted, updatePolice } from './police.js';
import { currentObjective, MISSIONS, missionByIndex, startMission, updateMissions } from './missions.js';
import { initActivities, spawnPackages, tryTaxiPickup, updateActivities } from './activities.js';
import { policeShoot, punch, shoot, updateBullets, updateParticles } from './combat.js';
import { createAudio } from './audio.js';
import { ACTION_CONFIRM, ACTION_INTERACT, ACTION_MUTE, ACTION_PAUSE, ACTION_PUNCH, ACTION_SHOP, ACTION_SHOOT, ACTION_TAXI, createInput } from './input.js';
import { SCREEN_BUSTED, SCREEN_COMPLETE, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WASTED, createRenderer } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : DEFAULT_SEED;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const audio = createAudio();

function createGame() {
  const rng = createRandom(seed);
  const city = buildCity(rng);
  const cars = spawnCars(city, rng);
  const peds = spawnPedestrians(city, rng, 26);
  const packages = spawnPackages(city, rng);
  const game = {
    seed, rng, city, cars, peds, packages,
    time: 0,
    wanted: 0,
    everWanted: 0,
    hiddenT: 0,
    decayT: 0,
    lastCrimeT: -100,
    spawnTimer: 0,
    nearestPolice: Infinity,
    arrestT: 0,
    busted: false,
    bullets: [],
    sparks: [],
    explosions: [],
    policeShots: [],
    mission: null,
    currentObjective: null,
    banner: null,
    message: '',
    messageT: 0,
    shake: 0,
    chime: false,
    thud: false,
    shotFired: false,
    waitProgress: 0,
    chaseProgress: 0,
    missionCompleteAt: 0,
    shopOpen: false,
    nearCar: null,
    nearGarage: false,
    shopItems: [
      { name: 'Full repair', price: 100, desc: 'Health + car fixed', apply: (g) => { g.player.health = 100; if (g.player.car) g.player.car.damage = 0; } },
      { name: 'Pistol ammo x24', price: 50, desc: 'Bullets for the pistol', apply: (g) => { g.player.hasGun = true; g.player.ammo += 24; } },
      { name: 'Gold Pelican Coupe', price: 1500, desc: 'Top speed 380, yours', apply: (g) => { g.spawnShopCar = { name: 'Gold Pelican Coupe', top: 380, color: '#e8b93a', length: 48, width: 24 }; } },
      { name: 'Clinic patch-up', price: 80, desc: 'Health back to 100', apply: (g) => { g.player.health = 100; } },
      { name: 'Sunset Roadster', price: 2200, desc: 'Top speed 360, yours', apply: (g) => { g.spawnShopCar = CAR_MODELS[6]; } },
      { name: 'Vega Phantom', price: 3000, desc: 'Top speed 390, yours', apply: (g) => { g.spawnShopCar = CAR_MODELS[7]; } },
    ],
    spawnShopCar: null,
    stats: { missionsDone: 0, carsStolen: 0, pedsHit: 0, faresDone: 0, racesWon: 0 },
    camera: { x: 360, y: 240 },
    bestCash: 0,
    hasSave: false,
    saveMission: 1,
    player: {
      x: 1000, y: 620, angle: -Math.PI / 2, moving: false, radius: PLAYER.radius,
      health: PLAYER.health, cash: 0, ammo: 0, hasGun: false,
      car: null, punchT: 0, punchAnim: 0, shootT: 0,
    },
  };
  game.addWanted = (stars) => addWanted(game, stars);
  game.saveBest = () => saveGame(game);
  initActivities(game);
  return game;
}

function readSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return null;
    return data;
  } catch {
    return null;
  }
}

function readBestCash() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveGame(game) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      mission: game.mission ? game.mission.index + 1 : game.stats.missionsDone,
      cash: game.player.cash,
      health: game.player.health,
      hasGun: game.player.hasGun,
      ammo: game.player.ammo,
      packages: game.packages.filter((p) => p.collected).map((p) => p.id),
      races: game.stats.racesWon || 0,
    }));
    if (game.player.cash > game.bestCash) {
      game.bestCash = game.player.cash;
      window.localStorage.setItem(BEST_KEY, String(game.bestCash));
    }
  } catch {
    // Storage can be off (private windows): progress then lasts this visit only.
  }
}

function applySave(game, data) {
  if (!data) return;
  game.player.cash = data.cash || 0;
  game.player.health = data.health || PLAYER.health;
  game.player.hasGun = !!data.hasGun;
  game.player.ammo = data.ammo || 0;
  game.stats.missionsDone = Math.max(0, (data.mission || 1) - 1);
  game.stats.racesWon = data.races || 0;
  game.saveMission = Math.min(MISSIONS.length, data.mission || 1);
  if (Array.isArray(data.packages)) {
    for (const pkg of game.packages) {
      if (data.packages.includes(pkg.id)) {
        pkg.collected = true;
        game.packagesCollected += 1;
      }
    }
  }
  game.hasSave = true;
}

function resetPlayerToStart(game) {
  const player = game.player;
  if (player.car) {
    player.car.driver = null;
    player.car.parked = true;
    player.car.speed = 0;
    player.car = null;
  }
  player.x = 1000;
  player.y = 620;
  player.angle = -Math.PI / 2;
  player.health = PLAYER.health;
  game.wanted = 0;
  game.arrestT = 0;
  game.busted = false;
  game.bullets.length = 0;
  game.cars = game.cars.filter((car) => car.driver !== 'police');
  game.camera.x = 360;
  game.camera.y = 240;
}

function enterCar(game) {
  const player = game.player;
  if (player.car) {
    // Step out beside the car.
    const car = player.car;
    car.driver = null;
    car.parked = true;
    car.speed = 0;
    player.car = null;
    player.x = car.x + Math.cos(car.angle + Math.PI / 2) * 34;
    player.y = car.y + Math.sin(car.angle + Math.PI / 2) * 34;
    resolveBuilding(game.city, player);
    player.x = Math.max(PLAYER.radius, Math.min(CITY.width - PLAYER.radius, player.x));
    player.y = Math.max(PLAYER.radius, Math.min(CITY.height - PLAYER.radius, player.y));
    return;
  }
  const car = nearestCar(game.cars, player.x, player.y, 70);
  if (!car) return;
  const wasParked = car.parked || car.driver === 'traffic';
  car.driver = 'player';
  car.parked = false;
  car.speed = 0;
  player.car = car;
  if (wasParked) {
    car.stolenByPlayer = true;
    game.stats.carsStolen += 1;
    game.addWanted(WANTED.heatPerSteal);
    game.message = `Stole a ${car.model.name}. The PD noticed.`;
    game.messageT = 2.5;
    audio.ensure();
  }
}

function updatePlayer(game, input, dt) {
  const player = game.player;
  const move = input.move();
  if (player.car) {
    const car = player.car;
    const throttle = move.y === 0 ? 0 : -move.y; // up (W) is forward
    const steer = move.x;
    drivePlayerCar(car, throttle, steer, dt);
    player.x = car.x;
    player.y = car.y;
    player.angle = car.angle;
    player.moving = Math.abs(car.speed) > 5;
    resolveCarCollisions(game.city, game.cars, (crashed, speed) => {
      if (speed > 140) {
        audio.crash();
        game.shake = 0.3;
        player.health -= 3;
        scarePeds(game.peds, crashed.x, crashed.y, 200);
      }
    });
    resolveBuilding(game.city, car);
    return;
  }
  // On foot.
  const len = Math.hypot(move.x, move.y) || 1;
  const speed = PLAYER.walkSpeed;
  player.moving = move.x !== 0 || move.y !== 0;
  if (player.moving) {
    const nx = player.x + (move.x / len) * speed * dt;
    const ny = player.y + (move.y / len) * speed * dt;
    const body = { x: nx, y: ny, radius: PLAYER.radius };
    if (!resolveBuilding(game.city, body)) {
      player.x = nx;
      player.y = ny;
    } else {
      player.x = body.x;
      player.y = body.y;
    }
    player.angle = Math.atan2(move.y, move.x);
    player.x = Math.max(PLAYER.radius, Math.min(CITY.width - PLAYER.radius, player.x));
    player.y = Math.max(PLAYER.radius, Math.min(CITY.height - PLAYER.radius, player.y));
  }
  if (player.punchT > 0) player.punchT -= dt;
  if (player.punchAnim > 0) player.punchAnim -= dt;
  if (player.shootT > 0) player.shootT -= dt;
}

function updateCamera(game, dt) {
  const px = game.player.car ? game.player.car.x : game.player.x;
  const py = game.player.car ? game.player.car.y : game.player.y;
  const tx = Math.max(0, Math.min(CITY.width - VIEW.width, px - VIEW.width / 2));
  const ty = Math.max(0, Math.min(CITY.height - VIEW.height, py - VIEW.height / 2));
  const k = Math.min(1, 5 * dt);
  game.camera.x += (tx - game.camera.x) * k;
  game.camera.y += (ty - game.camera.y) * k;
}

function stepWorld(game, input, dt) {
  game.time += dt;
  if (game.banner && game.banner.t > 0) game.banner.t -= dt;
  if (game.messageT > 0) game.messageT -= dt;
  if (game.shake > 0) game.shake -= dt;

  // Ambient life runs even on the title screen.
  updateTraffic(game.city, game.cars, game.rng, dt);
  updatePedestrians(game.city, game.peds, game.player, game.player.car, dt);

  const actions = input.takeActions();
  if (actions & ACTION_MUTE) {
    const muted = audio.toggleMute();
    game.message = muted ? 'Sound off' : 'Sound on';
    game.messageT = 1.5;
  }
  if (game.shopOpen) {
    const numbers = input.takeNumbers();
    numbers.forEach((code) => {
      const index = Number(code.slice(5)) - 1;
      const item = game.shopItems[index];
      if (item && game.player.cash >= item.price) {
        game.player.cash -= item.price;
        item.apply(game);
        game.message = `Bought: ${item.name}`;
        game.messageT = 2;
        audio.pickup();
      }
    });
    if (actions & (ACTION_SHOP | ACTION_PAUSE)) game.shopOpen = false;
    return { actions };
  }

  updatePlayer(game, input, dt);

  // Nearby car / garage prompts.
  game.nearCar = game.player.car ? null : nearestCar(game.cars, game.player.x, game.player.y, 70);
  const garage = game.city.places.garage;
  const gp = game.player.car ? game.player.car : game.player;
  game.nearGarage = Math.hypot(gp.x - garage.x, gp.y - garage.y) < 110;

  if (actions & ACTION_INTERACT) enterCar(game);
  if (actions & ACTION_PUNCH) punch(game);
  if (actions & ACTION_SHOP) {
    if (game.nearGarage) {
      game.shopOpen = true;
      audio.ensure();
    }
  }
  if (actions & ACTION_TAXI) tryTaxiPickup(game);
  if (actions & ACTION_SHOOT) {
    const mouse = input.mouse();
    const view = game.view;
    const wx = game.camera.x + ((mouse.x * view.dpr - view.x) / view.scale);
    const wy = game.camera.y + ((mouse.y * view.dpr - view.y) / view.scale);
    shoot(game, wx, wy);
  }

  // Shop car delivery: the bought model parked by the garage.
  if (game.spawnShopCar) {
    const model = game.spawnShopCar;
    game.spawnShopCar = null;
    const garage = game.city.places.garage;
    const car = makeCar(garage.x + 90, garage.y, 0, model, false);
    car.parked = true;
    game.cars.push(car);
    game.message = `Your ${model.name} is parked by the garage.`;
    game.messageT = 3;
  }

  const hitPeds = carHitsPeds(game.cars, game.peds);
  if (hitPeds.length > 0) {
    game.stats.pedsHit += hitPeds.length;
    game.addWanted(WANTED.heatPerPedHit);
    game.message = 'You ran someone over! The PD is coming.';
    game.messageT = 2.5;
    audio.thud();
  }

  updatePolice(game, dt);
  policeShoot(game);
  updateBullets(game, dt);
  updateParticles(game, dt);

  // Slow recovery while the heat is off: the city lets you breathe.
  if (game.wanted === 0 && game.player.health > 0 && game.player.health < PLAYER.health) {
    game.player.health = Math.min(PLAYER.health, game.player.health + 1.5 * dt);
  }

  const missionResult = updateMissions(game, dt);
  game.currentObjective = currentObjective(game);
  updateActivities(game, dt);
  if (missionResult === 'failed') {
    audio.fail();
    game.missionFailed = true;
  }
  if (game.chime) {
    game.chime = false;
    audio.chime();
  }
  if (game.thud) {
    game.thud = false;
    audio.thud();
  }
  if (game.shotFired) {
    game.shotFired = false;
    audio.shot();
  }

  // Engine and siren follow the world.
  const driving = !!game.player.car;
  const speed01 = driving ? Math.abs(game.player.car.speed) / game.player.car.model.top : 0;
  audio.engine(speed01, driving);
  audio.siren(game.wanted > 0);

  updateCamera(game, dt);

  // Health and arrest outcomes.
  if (game.busted) return { actions, busted: true };
  if (game.player.health <= 0) return { actions, wasted: true };
  return { actions };
}

const game = createGame();
// Staged screenshots are pristine: a save from an earlier play session
// must not leak its cash, pistol or collected packages into the frame.
game.bestCash = shot ? 0 : readBestCash();
if (!shot) applySave(game, readSave());
const renderer = createRenderer(canvas);
game.view = { scale: 1, x: 0, y: 0, dpr: 1 };

function syncView() {
  // The renderer owns the canvas transform; mirror its numbers for aiming.
  const ratio = window.devicePixelRatio || 1;
  const scale = Math.min(canvas.width / VIEW.width, canvas.height / VIEW.height);
  game.view = {
    scale,
    x: (canvas.width - VIEW.width * scale) / 2,
    y: (canvas.height - VIEW.height * scale) / 2,
    dpr: ratio,
  };
}
window.addEventListener('resize', syncView);
syncView();

function runShot(name) {
  const scene = stageShot(name, game);
  game.currentObjective = currentObjective(game);
  let painted = 0;
  function paint() {
    syncView();
    renderer.draw(game, scene.screen);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let accumulator = 0;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  function startFresh() {
    game.player.cash = 0;
    game.player.health = PLAYER.health;
    game.player.hasGun = false;
    game.player.ammo = 0;
    game.stats.missionsDone = 0;
    game.stats.faresDone = 0;
    game.stats.racesWon = 0;
    game.packages.forEach((p) => { p.collected = false; });
    game.packagesCollected = 0;
    game.taxi = { state: 'idle', pickup: null, dropoff: null, fare: 0, cooldown: 0 };
    game.race = { state: 'idle', next: 0, timer: 0, cooldown: 0 };
    game.hasSave = false;
    resetPlayerToStart(game);
    startMission(game, 0);
    screen = SCREEN_PLAY;
    announce('Playing. Mission 1: First Delivery.');
    audio.ensure();
    audio.pickup();
  }

  function continueSave() {
    resetPlayerToStart(game);
    startMission(game, Math.min(MISSIONS.length - 1, game.saveMission - 1));
    screen = SCREEN_PLAY;
    announce(`Playing. Mission ${game.saveMission}.`);
    audio.ensure();
  }

  function retryMission() {
    const index = game.mission ? game.mission.index : 0;
    resetPlayerToStart(game);
    startMission(game, index);
    screen = SCREEN_PLAY;
    announce(`Retrying mission ${index + 1}.`);
  }

  function handleActions() {
    // On the play screen the world step owns the action queue; here we only
    // peek for the pause key so a press is never eaten before the step sees it.
    if (screen === SCREEN_PLAY) {
      if (input.peekActions() & ACTION_PAUSE) {
        input.takeActions();
        screen = SCREEN_PAUSED;
        saveGame(game);
        announce('Paused.');
      }
      return;
    }
    const actions = input.takeActions();
    if (screen === SCREEN_TITLE) {
      if (input.takeNewGame()) startFresh();
      else if (actions & ACTION_CONFIRM) {
        if (game.hasSave) continueSave();
        else startFresh();
      }
      return;
    }
    if (screen === SCREEN_BUSTED || screen === SCREEN_WASTED) {
      if (actions & ACTION_CONFIRM) retryMission();
      return;
    }
    if (screen === SCREEN_COMPLETE) {
      if (actions & ACTION_CONFIRM) {
        screen = SCREEN_PLAY;
        game.mission = null;
        game.currentObjective = null;
        game.banner = { text: 'Free roam', sub: 'Solmar is yours. Steal cars, dodge the PD, enjoy the sun.', t: 4 };
      }
      return;
    }
    if (screen === SCREEN_PAUSED) {
      if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
      return;
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      game.time += STEP;
      updateTraffic(game.city, game.cars, game.rng, STEP);
      updatePedestrians(game.city, game.peds, game.player, null, STEP);
      updateCamera(game, STEP);
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    const result = stepWorld(game, input, STEP);
    if (result.busted) {
      screen = SCREEN_BUSTED;
      saveGame(game);
      audio.fail();
      announce('Busted by the Solmar PD.');
    } else if (result.wasted) {
      screen = SCREEN_WASTED;
      saveGame(game);
      audio.fail();
      announce('Wasted.');
    } else if (game.mission && game.mission.done && game.mission.index === MISSIONS.length - 1) {
      screen = SCREEN_COMPLETE;
      saveGame(game);
      audio.chime();
      announce(`${game.mission.def.name} is complete — Solmar is yours.`);
    } else if (game.mission && game.mission.done && game.time - game.missionCompleteAt > 4) {
      // Roll into the next mission on its own.
      const next = game.mission.index + 1;
      if (missionByIndex(next)) startMission(game, next);
    } else if (game.missionFailed) {
      game.missionFailed = false;
      retryMission();
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(game, screen);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      saveGame(game);
      announce('Paused.');
    }
  });

  // A small debug handle for play-testing: the game object, read-only-ish.
  window.__solmar = {
    game,
    version: '0.3.0',
    startMission: (index) => { resetPlayerToStart(game); startMission(game, index); },
    teleport: (x, y) => {
      if (game.player.car) { game.player.car.x = x; game.player.car.y = y; game.player.car.speed = 0; }
      game.player.x = x;
      game.player.y = y;
      updateCamera(game, 1);
    },
    setWanted: (n) => { game.wanted = n; },
    screen: () => screen,
  };

  announce('SOLMAR. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
