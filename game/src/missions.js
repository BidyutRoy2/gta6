// The story: eight missions for Dana "Dash" Cole, courier driver for Vega
// Transport, pulled into The Marlin Club and out the other side with a heist.
// Each mission is a list of steps; the updater watches the world and advances
// them, pays out on completion, and fails a mission when its timer runs out.
import { CAR_MODELS } from './config.js';

export const MISSIONS = [
  {
    id: 1, name: 'First Delivery', payout: 250, timer: 150,
    briefing: 'Vega Transport, day one. Pick up the parcel at the Vega Depot and drop it at Marina Flats. Drive safe — the city is watching.',
    steps: [
      { type: 'goto', place: 'depot', text: 'Pick up the parcel at the Vega Depot' },
      { type: 'goto', place: 'dropA', text: 'Deliver the parcel to Marina Flats' },
    ],
  },
  {
    id: 2, name: 'Hot Wheels', payout: 400, timer: 0,
    briefing: 'Your van died. The Marlin Club needs wheels, fast. Steal any parked car on the street — walk up and press E — then bring it to the Solmar Garage.',
    steps: [
      { type: 'steal', text: 'Steal a car (walk up to one and press E)' },
      { type: 'goto', place: 'garage', needCar: true, text: 'Drive the stolen car to the Solmar Garage' },
    ],
  },
  {
    id: 3, name: 'The Marlin Job', payout: 600, timer: 180,
    briefing: 'The Club trusts you now. Collect the package at Harbor Dock 7 and bring it to The Marlin Club. A pistol is in the glovebox — yours to keep.',
    steps: [
      { type: 'goto', place: 'dock', text: 'Collect the package at Harbor Dock 7' },
      { type: 'goto', place: 'club', text: 'Deliver the package to The Marlin Club' },
    ],
  },
  {
    id: 4, name: 'Heat Wave', payout: 800, timer: 0,
    briefing: 'Solmar PD is on the Club\'s tail and they have your plate. Get to 3 stars — steal, speed, make noise — then lose them completely. No heat, no job.',
    steps: [
      { type: 'wanted', level: 3, text: 'Raise your wanted level to 3 stars' },
      { type: 'loseWanted', text: 'Lose the cops — get back to 0 stars' },
    ],
  },
  {
    id: 5, name: 'Harbor Lights', payout: 900, timer: 200,
    briefing: 'A midnight run along the harbor. Pick up at the Old Cannery and deliver to the dock before the tide turns. The clock is real this time.',
    steps: [
      { type: 'goto', place: 'dropB', text: 'Pick up the cargo at the Old Cannery' },
      { type: 'goto', place: 'dock', needCar: false, text: 'Deliver the cargo to Harbor Dock 7' },
    ],
  },
  {
    id: 6, name: 'The Vega Vault', payout: 1200, timer: 0,
    briefing: 'Harlan Vega keeps his money under his own office. Get eyes on the vault — stand in the marked zone and stay 15 seconds — then report back to the Club. Quiet. No heat above 1 star.',
    steps: [
      { type: 'wait', place: 'vault', seconds: 15, text: 'Recon the Vega Vault — stay in the zone 15s' },
      { type: 'goto', place: 'club', text: 'Report back to The Marlin Club' },
    ],
  },
  {
    id: 7, name: 'Double Cross', payout: 1500, timer: 240,
    briefing: 'Vega\'s courier is running the same route with your cut in the trunk. Tail him — stay close for 20 seconds without spooking him — then take the drop where he stops.',
    steps: [
      { type: 'chase', seconds: 20, text: 'Tail Vega\'s courier — stay within range 20s' },
      { type: 'goto', place: 'dropA', text: 'Grab the drop at Marina Flats' },
    ],
  },
  {
    id: 8, name: 'The Solmar Heist', payout: 5000, timer: 300,
    briefing: 'This is it. Crack the Solmar Bank, take Vega\'s money, and run for the escape boat on the south beach. The whole PD will be coming. Make it count, Dash.',
    steps: [
      { type: 'goto', place: 'bank', text: 'Reach the Solmar Bank' },
      { type: 'hold', place: 'bank', seconds: 10, text: 'Crack the vault — hold position 10s' },
      { type: 'goto', place: 'boat', text: 'Escape to the boat on the south beach!' },
    ],
  },
];

export function missionByIndex(index) {
  return MISSIONS[index] || null;
}

export function startMission(game, index) {
  const def = MISSIONS[index];
  if (!def) return false;
  game.mission = {
    index, def,
    step: 0,
    timer: def.timer,
    waitT: 0,
    chaseT: 0,
    targetCar: null,
    done: false,
  };
  game.banner = { text: `Mission ${def.id}: ${def.name}`, sub: def.briefing, t: 5 };
  game.message = def.steps[0].text;
  game.messageT = 4;
  if (def.id === 3) {
    game.player.hasGun = true;
    game.player.ammo = Math.max(game.player.ammo, 24);
  }
  if (def.id === 7) {
    // Vega's courier: a grey van driving the north loop.
    const car = {
      id: 9001, x: 600, y: 200, angle: 0, speed: 120,
      model: CAR_MODELS[2], color: '#5a5f66', length: 60, width: 28,
      radius: 26, police: false, parked: false, driver: 'courier',
      axis: 'h', dir: 1, cruise: 120, brake: 0, damage: 0, siren: 0,
    };
    game.cars.push(car);
    game.mission.targetCar = car;
  }
  return true;
}

function stepTarget(game, step) {
  if (step.place) {
    const place = game.city.places[step.place];
    return { x: place.x, y: place.y, label: place.label };
  }
  if (step.type === 'chase' && game.mission.targetCar) {
    const car = game.mission.targetCar;
    return { x: car.x, y: car.y, label: "Vega's Courier" };
  }
  return null;
}

export function currentObjective(game) {
  if (!game.mission || game.mission.done) return null;
  const step = game.mission.def.steps[game.mission.step];
  if (!step) return null;
  return { step, target: stepTarget(game, step), index: game.mission.step, total: game.mission.def.steps.length };
}

function advanceStep(game) {
  game.mission.step += 1;
  game.mission.waitT = 0;
  game.mission.chaseT = 0;
  const next = game.mission.def.steps[game.mission.step];
  if (next) {
    game.message = next.text;
    game.messageT = 4;
    game.chime = true;
  }
}

function completeMission(game) {
  const def = game.mission.def;
  game.player.cash += def.payout;
  game.mission.done = true;
  game.stats.missionsDone += 1;
  game.banner = { text: `Mission complete: ${def.name}`, sub: `Paid $${def.payout} — total cash $${game.player.cash}`, t: 5 };
  game.chime = true;
  game.saveBest();
  if (game.mission.targetCar) {
    game.cars = game.cars.filter((c) => c !== game.mission.targetCar);
    game.mission.targetCar = null;
  }
  // Next mission starts when the player presses Enter, or auto-starts after the banner.
  game.missionCompleteAt = game.time;
}

/** Advance the active mission one step. Returns 'complete' | 'failed' | null. */
export function updateMissions(game, dt) {
  const m = game.mission;
  if (!m || m.done) return null;
  const player = game.player;
  const px = player.car ? player.car.x : player.x;
  const py = player.car ? player.car.y : player.y;

  if (m.timer > 0) {
    m.timer -= dt;
    if (m.timer <= 0) {
      game.banner = { text: 'Mission failed', sub: 'Out of time. Press Enter to retry.', t: 4 };
      return 'failed';
    }
  }

  const step = m.def.steps[m.step];
  if (!step) {
    completeMission(game);
    return 'complete';
  }

  if (step.type === 'goto') {
    const place = game.city.places[step.place];
    const d = Math.hypot(px - place.x, py - place.y);
    if (d < 70 && (!step.needCar || player.car)) {
      if (step.needCar && !player.car) {
        game.message = 'You need the car for this drop-off.';
        game.messageT = 1.5;
      } else {
        advanceStep(game);
        if (m.step >= m.def.steps.length) {
          completeMission(game);
          return 'complete';
        }
      }
    }
  } else if (step.type === 'steal') {
    if (player.car && player.car.stolenByPlayer) {
      advanceStep(game);
    }
  } else if (step.type === 'wanted') {
    if (game.wanted >= step.level) advanceStep(game);
  } else if (step.type === 'loseWanted') {
    if (game.wanted === 0) {
      completeMission(game);
      return 'complete';
    }
  } else if (step.type === 'wait' || step.type === 'hold') {
    const place = game.city.places[step.place];
    const d = Math.hypot(px - place.x, py - place.y);
    if (d < 80) {
      m.waitT += dt;
      game.waitProgress = m.waitT / step.seconds;
      if (step.type === 'hold' && m.waitT >= 2 && !m.heistHeat) {
        m.heistHeat = true;
        game.addWanted(4);
        game.message = 'Alarm tripped! The whole PD is coming!';
        game.messageT = 3;
      }
      if (m.waitT >= step.seconds) {
        game.waitProgress = 0;
        advanceStep(game);
        if (m.step >= m.def.steps.length) {
          completeMission(game);
          return 'complete';
        }
      }
    } else {
      m.waitT = Math.max(0, m.waitT - dt * 2);
      game.waitProgress = m.waitT / step.seconds;
    }
  } else if (step.type === 'chase') {
    const car = m.targetCar;
    if (car) {
      // The courier drives the north loop at a steady cruise.
      car.x += Math.cos(car.angle) * car.speed * dt;
      car.y += Math.sin(car.angle) * car.speed * dt;
      const route = [
        { x: 600, y: 200 }, { x: 2600, y: 200 }, { x: 2600, y: 600 }, { x: 600, y: 600 },
      ];
      const node = route[m.routeNode || 0];
      const targetAngle = Math.atan2(node.y - car.y, node.x - car.x);
      let diff = targetAngle - car.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      car.angle += Math.max(-1.6 * dt, Math.min(1.6 * dt, diff));
      if (Math.hypot(node.x - car.x, node.y - car.y) < 60) m.routeNode = ((m.routeNode || 0) + 1) % route.length;
      const d = Math.hypot(px - car.x, py - car.y);
      if (d < 170) {
        m.chaseT += dt;
        game.chaseProgress = m.chaseT / step.seconds;
        if (m.chaseT >= step.seconds) {
          game.chaseProgress = 0;
          car.speed = 0;
          car.driver = 'parked-courier';
          advanceStep(game);
        }
      } else {
        game.chaseProgress = m.chaseT / step.seconds;
      }
    }
  }
  return null;
}
