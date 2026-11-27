// Every tuning number and colour in one place for Turkey Run — Great Escape.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size. The turkey auto-runs to the
// right while the world scrolls left; the player steers, jumps and ducks.

export const FIELD = { width: 1280, height: 720, groundY: 648 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** Pixels of scroll per metre of distance the turkey covers. */
export const PX_PER_METRE = 12;

/** Distance, in metres, the turkey must cover to escape to the Safe Woods. */
export const ESCAPE_DISTANCE = 2000;

export const PLAYER = {
  width: 64,
  height: 56,
  /** Horizontal band the turkey may roam in (the farmer chases from the left). */
  minX: 90,
  maxX: 560,
  runSpeed: 300,
  jumpSpeed: 780,
  gravity: 2300,
  /** How long a jump can be held for extra height, in seconds. */
  jumpHold: 0.22,
  duckHeight: 30,
  invulnerable: 1.6,
};

/** The farmer: how far behind the turkey he starts, and how the chase works. */
export const FARMER = {
  startGap: 150,
  maxGap: 220,
  /** Gap lost when the turkey stumbles into an obstacle. */
  stumbleLoss: 34,
  /** Gap lost when a falling knife hits the turkey. */
  knifeLoss: 30,
  /** Gap regained per 100 clean metres run. */
  cleanGainPer100m: 9,
  /** Gap regained by a golden feather. */
  featherGain: 70,
  /** The farmer catches the turkey when the gap reaches this. */
  catchGap: 0,
};

export const LIVES = 3;

/** Scroll speed of the world, in pixels per second, by level. */
export const SPEED = { base: 250, perLevel: 22, max: 460 };

/** Seconds of play per level, and the last level: speeds and spawn rates stop growing there. */
export const LEVEL = { seconds: 14, max: 10 };

/** Ground obstacles the turkey jumps over: fences and hay bales. */
export const FENCE = { width: 26, height: 66, interval: 3.1, intervalJitter: 1.4, minInterval: 1.5 };
export const HAY = { width: 66, height: 54, interval: 4.0, intervalJitter: 1.8, minInterval: 2.0 };

/** The oven: a ground obstacle with a flame jet that erupts on a cycle. Jump it while the flame is down. */
export const OVEN = {
  width: 96,
  height: 78,
  interval: 7.5,
  intervalJitter: 2.5,
  minInterval: 4.5,
  /** Seconds the flame stays down before it erupts. */
  flameDown: 1.5,
  /** Seconds the flame stays up. */
  flameUp: 0.9,
};

/** Carving knives that fall from the sky onto a target spot. */
export const KNIFE = {
  width: 30,
  height: 92,
  fallSpeed: 520,
  speedPerLevel: 22,
  interval: 2.7,
  intervalJitter: 1.2,
  minInterval: 1.2,
  /** Seconds a stuck knife stays in the ground before vanishing. */
  stuckTime: 1.1,
};

/** Pickups: corn and pumpkin are points; the golden feather is a shield and a burst away. */
export const CORN = { size: 26, points: 10, interval: 1.5, intervalJitter: 1.0 };
export const PUMPKIN = { size: 34, points: 25, interval: 6.5, intervalJitter: 3.0 };
export const FEATHER = { size: 30, points: 15, interval: 13, intervalJitter: 5, shieldSeconds: 3 };

/** Points for every clean 10 metres, and for dodging a knife that sticks in the ground. */
export const SCORE = { per10m: 1, dodgeKnife: 5, escapeBonus: 500 };

/** Stages of the run, by distance in metres: the farmyard, the barn, then the kitchen. */
export const STAGES = [
  { name: 'Farmyard', from: 0, to: 800 },
  { name: 'The Barn', from: 800, to: 1600 },
  { name: 'The Kitchen', from: 1600, to: ESCAPE_DISTANCE },
];

/** How many moving things can exist at once; the pools are allocated once, at boot. */
export const POOL_SIZE = 96;

/** Autumn palette: burnt orange, harvest gold, barn red, dusk purple. */
export const PALETTE = {
  backdrop: '#1a1210',
  skyTop: '#3d2b4f',
  skyMid: '#b4552d',
  skyLow: '#e8973f',
  sun: '#ffd97a',
  hillFar: '#6b3f2a',
  hillNear: '#4a2c1e',
  ground: '#7a4a22',
  groundTop: '#a06a2e',
  barnWall: '#8c2f24',
  barnWood: '#5e241b',
  kitchenWall: '#3a2f2e',
  kitchenTile: '#6b4a3a',
  player: '#a5683a',
  playerBelly: '#d9a05e',
  tail: ['#a0522d', '#d2691e', '#e8a33c'],
  head: '#e8dcc8',
  beak: '#e8a33c',
  wattle: '#e5534b',
  farmerSkin: '#e8b88a',
  farmerShirt: '#3f6fb5',
  farmerOveralls: '#2f4a6b',
  farmerHat: '#d9b45b',
  ovenBody: '#4a4a52',
  ovenDoor: '#2a2a30',
  flame: ['#ffd23e', '#ff8c1a', '#e5534b'],
  knife: '#d7dce3',
  knifeEdge: '#f2f5f8',
  handle: '#7a4a26',
  fence: '#6b4423',
  hay: '#e8c25a',
  hayDark: '#c99a2e',
  corn: '#f2c94c',
  cornHusk: '#5a8c3a',
  pumpkin: '#e86a1a',
  pumpkinDark: '#c7520f',
  feather: '#ffd23e',
  text: '#fdf3e0',
  muted: '#c9a98a',
  panel: '#241a16',
  panelEdge: '#e8a33c',
  heart: '#e5534b',
  heartEmpty: '#5a3a34',
  danger: '#ff5a3c',
  meterBack: '#3a2a22',
  meterFill: '#e5534b',
  meterSafe: '#5a8c3a',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'turkey-run.best';
