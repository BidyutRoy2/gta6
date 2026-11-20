// SOLMAR tuning: every number and colour the game uses lives here, so a
// balance change is one edit, never a hunt through the simulation.

export const VIEW = { width: 1280, height: 720 };

export const CITY = {
  width: 3200,
  height: 2400,
  roadGap: 400, // distance between road centrelines
  roadWidth: 96,
  firstRoad: 200,
  oceanY: 2160, // below this line the map is beach and sea
};

export const STEP = 1 / 60;

export const PLAYER = {
  walkSpeed: 210,
  runSpeed: 300,
  radius: 13,
  health: 100,
  punchDamage: 25,
  punchRange: 42,
  punchArc: 1.1,
};

export const CAR = {
  accel: 300,
  brake: 520,
  reverseAccel: 180,
  maxReverse: 90,
  drag: 0.55,
  grip: 2.6,
  radius: 26,
};

export const CAR_MODELS = [
  { name: 'Marlin Sedan', top: 300, color: '#c94f42', length: 52, width: 26 },
  { name: 'Solmar Taxi', top: 270, color: '#e8b93a', length: 50, width: 26 },
  { name: 'Vega Van', top: 230, color: '#7d8a96', length: 60, width: 28 },
  { name: 'Pelican Coupe', top: 340, color: '#3f7fb8', length: 48, width: 24 },
  { name: 'Dune Pickup', top: 280, color: '#5d8a4a', length: 56, width: 27 },
  { name: 'Harbor Cruiser', top: 250, color: '#8a5f9e', length: 54, width: 27 },
  { name: 'Sunset Roadster', top: 360, color: '#e07b39', length: 50, width: 25 },
  { name: 'Vega Phantom', top: 390, color: '#e8e8e8', length: 50, width: 25 },
];

export const POLICE_MODEL = { name: 'Solmar PD Interceptor', top: 330, color: '#2b3a4d', length: 52, width: 26 };

export const TRAFFIC_COUNT = 14;
export const PED_COUNT = 26;

export const WANTED = {
  max: 5,
  decayQuietSeconds: 7, // no police near: wanted starts falling
  decayStepSeconds: 4, // one star per this many quiet seconds
  arrestSeconds: 2.2, // police beside a slow on-foot player: busted
  heatPerSteal: 1,
  heatPerPedHit: 1,
  heatPerShot: 1,
  heatPerCopHurt: 1,
};

export const POLICE = {
  maxActive: 5,
  spawnDistance: 700,
  ramDamage: 8,
  bulletDamage: 6,
  shootRange: 320,
  shootCooldown: 1.4,
};

// The police helicopter: pure spectacle, no teeth. It circles the player
// once the heat reaches spawnWanted and leaves when the heat drops. Its
// spotlight is the one real effect: while the cone is on you, you are
// seen — hiding does not cool the heat.
export const HELI = {
  circleRadius: 280, // how far from the player it circles
  angularSpeed: 0.45, // radians per second around the player
  spawnWanted: 3, // appears once the heat reaches this many stars
  spotRadius: 150, // the lit circle on the ground
  spotLag: 1.4, // how fast the cone chases the player (per second)
};

export const BULLET = { speed: 720, life: 0.9, damage: 34 };

// The arsenal: five slots, bought at the Solmar Garage. Slot 1 is fists
// (the punch), slot 2 is the pistol the Marlin Club hands over in mission
// 3; the rest are locked until bought. Damage is per bullet; the shotgun
// fires `pellets` spread bullets per shell.
export const WEAPONS = [
  { id: 'fists', name: 'Fists', short: 'FISTS', damage: 0, pellets: 1, cooldown: 0.35, price: 0, ammoPack: 0, ammoPrice: 0 },
  { id: 'pistol', name: 'Pistol', short: 'PISTOL', damage: 34, pellets: 1, cooldown: 0.28, price: 0, ammoPack: 24, ammoPrice: 50 },
  { id: 'smg', name: 'SMG', short: 'SMG', damage: 16, pellets: 1, cooldown: 0.09, price: 900, ammoPack: 60, ammoPrice: 90 },
  { id: 'shotgun', name: 'Shotgun', short: '12G', damage: 13, pellets: 5, cooldown: 0.8, price: 1600, ammoPack: 12, ammoPrice: 110 },
  { id: 'rifle', name: 'Rifle', short: 'RIFLE', damage: 62, pellets: 1, cooldown: 0.5, price: 3200, ammoPack: 20, ammoPrice: 160 },
];

// Respect: the street's memory of Dash. XP comes from missions, races,
// packages, fares and stolen cars; the rank name and bar sit in the HUD.
export const RANKS = [
  { name: 'Errand Runner', xp: 0 },
  { name: 'Hustler', xp: 100 },
  { name: 'Wheelman', xp: 250 },
  { name: 'Fixer', xp: 450 },
  { name: 'Shot Caller', xp: 700 },
  { name: 'Tide Boss', xp: 1000 },
];

export const RESPECT = {
  mission: 60,
  raceWin: 40,
  checkpoint: 10,
  package: 15,
  fare: 10,
  steal: 5,
};

// The five districts of Solmar. Standing is how much the district rates
// Dash (0–100, starts neutral); work done in a district raises it.
export const DISTRICTS = [
  { id: 'northgate', name: 'Northgate', tint: 'rgba(232,185,58,0.10)' },
  { id: 'marina', name: 'Marina Flats', tint: 'rgba(63,127,184,0.10)' },
  { id: 'cannery', name: 'Old Cannery', tint: 'rgba(176,86,63,0.10)' },
  { id: 'harbor', name: 'Harborfront', tint: 'rgba(95,125,138,0.10)' },
  { id: 'strand', name: 'The Strand', tint: 'rgba(227,205,154,0.12)' },
];

export const STANDING = { start: 50, mission: 4, package: 3, fare: 2, raceWin: 3 };

// Radio: three stations, synthesised live like every other sound here.
// Tracks rotate; the HUD line names station and track, R switches.
export const RADIO = {
  stations: [
    {
      name: 'SOLMAR FM 98.6', wave: 'sawtooth', tempo: 112, root: 220,
      scale: [0, 3, 5, 7, 10, 12],
      tracks: ['Neon Tide — Palm Static', 'Dash Cole — Golden Hour Run', 'Vega Nights — Marina Lights'],
    },
    {
      name: 'RADIO MARLIN 99.1', wave: 'square', tempo: 96, root: 196,
      scale: [0, 2, 4, 7, 9, 12],
      tracks: ['Kip Sorrento — Arepa Lights', 'La Marea — Dockside', 'Club Marlin — Last Tide'],
    },
    {
      name: 'HARBOR 101.3', wave: 'triangle', tempo: 84, root: 174,
      scale: [0, 2, 3, 7, 8, 12],
      tracks: ['Old Cannery — Slow Water', 'Strandline — Beach Radio', 'Night Ferry — South Beach'],
    },
  ],
  trackSeconds: 32,
};

// The city clock: minutes since midnight. One real second is one city
// minute, so a full day runs about 24 minutes of play.
export const CLOCK = {
  startMinutes: 10 * 60, // 10:00 on day 1
  minutesPerSecond: 1,
  dawnStart: 5.5 * 60,
  dayStart: 6.5 * 60,
  sunsetStart: 17 * 60,
  nightStart: 19.5 * 60,
};

// Police dispatch: unit callsigns and the tactics each unit can be given.
// A tactic is not a label — it changes where the unit steers.
export const DISPATCH = {
  callsigns: ['PD-1', 'PD-2', 'PD-3', 'PD-4', 'PD-5', 'PD-6'],
  airUnit: 'AIR-1',
  metresPerPixel: 1 / 8, // distances on the panel are in metres
  roadblockMinWanted: 4,
  roadblockAhead: 520, // how far ahead of the player the block sits
};

// Side activities: taxi fares and hidden packages.
export const TAXI = {
  pickupRadius: 90,
  dropoffRadius: 90,
  fareBase: 60,
  farePerMetre: 1 / 25, // +$1 per 25px of trip, capped below
  fareMax: 200,
};

export const PACKAGES = {
  count: 10,
  value: 100,
  collectRadius: 42,
};

// Street races: a white start ring on the north road, three checkpoint
// rings around the city, back to the start. Free roam only — a race never
// starts while a mission is running.
export const RACE = {
  start: { x: 1000, y: 200, label: 'Race Start' },
  checkpoints: [
    { x: 2600, y: 200, label: 'Checkpoint 1' },
    { x: 2600, y: 1400, label: 'Checkpoint 2' },
    { x: 1000, y: 1400, label: 'Checkpoint 3' },
  ],
  startRadius: 60,
  cpRadius: 70,
  perCheckpoint: 150,
  finishBonus: 1000,
  timer: 100,
  cooldown: 8,
};

export const PALETTE = {
  grass: '#7fae62',
  sand: '#e3cd9a',
  sea: '#2f7fa8',
  seaDeep: '#256b92',
  road: '#3a3f47',
  roadEdge: '#565d68',
  lane: '#d8c95a',
  sidewalk: '#b9b2a4',
  buildingRoof: ['#b0563f', '#c97e4a', '#8a6f5c', '#5f7d8a', '#a34a5e', '#6d8a5f'],
  buildingWall: '#e8ddc9',
  glass: '#7fb8c9',
  palm: '#3f7a3a',
  trunk: '#7a5a3a',
  player: '#e84a5f',
  playerShirt: '#f2f2f2',
  pedShirts: ['#e8b93a', '#4a90c9', '#7fb069', '#c96a4a', '#9b7fb8', '#e8e8e8'],
  police: '#2b3a4d',
  policeLight: '#ff3b30',
  policeLight2: '#3b82ff',
  waypoint: '#ffd23f',
  text: '#f4efe4',
  muted: '#b8b2a4',
  panel: 'rgba(12, 18, 26, 0.88)',
  panelEdge: '#ffd23f',
  danger: '#ff5a4a',
  cash: '#7fd67f',
  sky: '#ffd9a0',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export const SAVE_KEY = 'solmar.save.v1';
export const BEST_KEY = 'solmar.best.v1';
export const DEFAULT_SEED = 20261117;
