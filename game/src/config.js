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
// once the heat reaches spawnWanted and leaves when the heat drops.
export const HELI = {
  circleRadius: 280, // how far from the player it circles
  angularSpeed: 0.45, // radians per second around the player
  spawnWanted: 3, // appears once the heat reaches this many stars
};

export const BULLET = { speed: 720, life: 0.9, damage: 34 };

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
